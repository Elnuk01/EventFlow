import { AuthUser } from '../types';

const AUTH_USER_KEY = 'eventflow_auth_current_user_v1';
const REGISTERED_USERS_KEY = 'eventflow_registered_users_v1';

class AuthService {
  private currentUser: AuthUser | null = null;
  private listeners: Set<(user: AuthUser | null) => void> = new Set();
  private userListListeners: Set<(users: AuthUser[]) => void> = new Set();

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(AUTH_USER_KEY);
      if (stored) {
        this.currentUser = JSON.parse(stored);
      } else {
        this.currentUser = null;
      }
    } catch {
      this.currentUser = null;
    }

    // Ensure database exists and seed admin owner record if empty
    try {
      const registered = this.getRegisteredUsers();
      if (registered.length === 0) {
        const initialOwner: AuthUser = {
          id: 'admin-owner-google',
          name: 'Adekunle Olaomo',
          email: 'adekunleolaomo@gmail.com',
          organization: 'EventFlow Productions',
          role: 'director',
          avatar: 'https://ui-avatars.com/api/?name=Adekunle+Olaomo&background=059669&color=fff',
          authProvider: 'google',
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        };
        this.saveRegisteredUser(initialOwner);
      }
    } catch {
      // ignore
    }
  }

  public getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  public isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  public subscribe(callback: (user: AuthUser | null) => void): () => void {
    this.listeners.add(callback);
    callback(this.currentUser);
    return () => {
      this.listeners.delete(callback);
    };
  }

  public subscribeToRegisteredUsers(callback: (users: AuthUser[]) => void): () => void {
    this.userListListeners.add(callback);
    callback(this.getRegisteredUsers());
    return () => {
      this.userListListeners.delete(callback);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => cb(this.currentUser));
  }

  private notifyUsersChanged() {
    const list = this.getRegisteredUsers();
    this.userListListeners.forEach((cb) => cb(list));
  }

  /**
   * Authenticate or register an account with Google
   */
  public loginWithGoogle(profile?: {
    email?: string;
    name?: string;
    picture?: string;
    organization?: string;
  }): { success: boolean; user: AuthUser } {
    const email = (profile?.email?.trim() || 'adekunleolaomo@gmail.com').toLowerCase();
    const name =
      profile?.name?.trim() ||
      (email.includes('@')
        ? email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
        : 'Google User');

    // Check if user already exists
    const registered = this.getRegisteredUsers();
    let existingIndex = registered.findIndex(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );

    const nowIso = new Date().toISOString();
    let finalUser: AuthUser;

    if (existingIndex >= 0) {
      finalUser = {
        ...registered[existingIndex],
        name: profile?.name?.trim() || registered[existingIndex].name,
        avatar: profile?.picture || registered[existingIndex].avatar,
        lastLoginAt: nowIso,
      };
      registered[existingIndex] = finalUser;
      try {
        localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(registered));
      } catch {
        // ignore
      }
    } else {
      finalUser = {
        id: `google-${Date.now()}`,
        name,
        email,
        organization: profile?.organization?.trim() || 'Live Production Team',
        role: 'director',
        avatar:
          profile?.picture ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=059669&color=fff`,
        authProvider: 'google',
        createdAt: nowIso,
        lastLoginAt: nowIso,
      };
      this.saveRegisteredUser(finalUser);
    }

    this.currentUser = finalUser;
    this.persistUser(finalUser);
    this.notify();
    this.notifyUsersChanged();
    return { success: true, user: finalUser };
  }

  /**
   * Email/Password sign in
   */
  public login(email: string, password?: string): { success: boolean; user?: AuthUser; error?: string } {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid email address' };
    }
    if (!password || password.length < 4) {
      return { success: false, error: 'Password must be at least 4 characters' };
    }

    // Check registered users
    const registered = this.getRegisteredUsers();
    const registeredFound = registered.find(
      (u) => u.email.toLowerCase() === cleanEmail
    );

    const nowIso = new Date().toISOString();

    if (registeredFound) {
      const updatedUser: AuthUser = {
        ...registeredFound,
        lastLoginAt: nowIso,
      };
      this.currentUser = updatedUser;
      this.persistUser(updatedUser);
      this.notify();
      return { success: true, user: updatedUser };
    }

    // Automatically register user session for new valid email
    const name = cleanEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const newUser: AuthUser = {
      id: `user-${Date.now()}`,
      name,
      email: cleanEmail,
      organization: 'Live Production Team',
      role: 'director',
      authProvider: 'email',
      createdAt: nowIso,
      lastLoginAt: nowIso,
    };
    this.saveRegisteredUser(newUser);
    this.currentUser = newUser;
    this.persistUser(newUser);
    this.notify();
    this.notifyUsersChanged();
    return { success: true, user: newUser };
  }

  /**
   * Create new account with email
   */
  public signup(data: {
    name: string;
    email: string;
    organization?: string;
    password?: string;
    role?: 'director' | 'producer' | 'operator' | 'speaker';
  }): { success: boolean; user?: AuthUser; error?: string } {
    if (!data.name.trim()) {
      return { success: false, error: 'Please enter your full name' };
    }
    if (!data.email.trim() || !data.email.includes('@')) {
      return { success: false, error: 'Please enter a valid email address' };
    }
    if (data.password && data.password.length < 4) {
      return { success: false, error: 'Password must be at least 4 characters' };
    }

    const cleanEmail = data.email.trim().toLowerCase();
    const registered = this.getRegisteredUsers();
    const existing = registered.find((u) => u.email.toLowerCase() === cleanEmail);

    const nowIso = new Date().toISOString();

    if (existing) {
      const updatedUser: AuthUser = {
        ...existing,
        name: data.name.trim(),
        organization: data.organization?.trim() || existing.organization,
        lastLoginAt: nowIso,
      };
      this.currentUser = updatedUser;
      this.persistUser(updatedUser);
      this.notify();
      this.notifyUsersChanged();
      return { success: true, user: updatedUser };
    }

    const newUser: AuthUser = {
      id: `user-${Date.now()}`,
      name: data.name.trim(),
      email: cleanEmail,
      organization: data.organization?.trim() || 'My Production Organization',
      role: data.role || 'director',
      authProvider: 'email',
      createdAt: nowIso,
      lastLoginAt: nowIso,
    };

    this.saveRegisteredUser(newUser);
    this.currentUser = newUser;
    this.persistUser(newUser);
    this.notify();
    this.notifyUsersChanged();
    return { success: true, user: newUser };
  }

  public logout() {
    this.currentUser = null;
    try {
      localStorage.removeItem(AUTH_USER_KEY);
    } catch {
      // ignore
    }
    this.notify();
  }

  private persistUser(user: AuthUser) {
    try {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    } catch {
      // ignore
    }
  }

  /**
   * Returns all registered users
   */
  public getRegisteredUsers(): AuthUser[] {
    try {
      const stored = localStorage.getItem(REGISTERED_USERS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  public saveRegisteredUser(user: AuthUser) {
    try {
      const all = this.getRegisteredUsers();
      const existingIdx = all.findIndex((u) => u.email.toLowerCase() === user.email.toLowerCase());
      if (existingIdx >= 0) {
        all[existingIdx] = user;
      } else {
        all.push(user);
      }
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(all));
      this.notifyUsersChanged();
    } catch {
      // ignore
    }
  }

  public deleteRegisteredUser(userId: string) {
    try {
      const all = this.getRegisteredUsers().filter((u) => u.id !== userId);
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(all));
      this.notifyUsersChanged();
    } catch {
      // ignore
    }
  }

  /**
   * Generates a CSV file content with all registered users
   */
  public exportUsersAsCSV(): string {
    const users = this.getRegisteredUsers();
    const headers = ['Full Name', 'Email Address', 'Sign-up Provider', 'Organization', 'Role', 'Registered Date'];
    const rows = users.map((u) => [
      `"${(u.name || '').replace(/"/g, '""')}"`,
      `"${(u.email || '').replace(/"/g, '""')}"`,
      `"${(u.authProvider || 'email').toUpperCase()}"`,
      `"${(u.organization || '').replace(/"/g, '""')}"`,
      `"${(u.role || 'director').toUpperCase()}"`,
      `"${u.createdAt ? new Date(u.createdAt).toLocaleString() : new Date().toLocaleString()}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  /**
   * Triggers immediate browser download of all registered users as a CSV
   */
  public downloadUsersCSV(): void {
    if (typeof window === 'undefined') return;
    const csvContent = this.exportUsersAsCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `eventflow_registered_users_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export const authService = new AuthService();
