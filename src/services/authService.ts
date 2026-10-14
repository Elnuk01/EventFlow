import { User } from '@supabase/supabase-js';
import { AuthUser } from '../types';
import {
  supabase,
  getSupabase,
  isSupabaseConfigured,
  getOAuthRedirectUrl,
  PRODUCTION_OAUTH_REDIRECT_URL,
} from './supabaseClient';

const AUTH_USER_KEY = 'eventflow_auth_current_user_v1';
const REGISTERED_USERS_KEY = 'eventflow_registered_users_v1';

class AuthService {
  private currentUser: AuthUser | null = null;
  private inMemoryRegisteredUsers: AuthUser[] = [];
  private listeners: Set<(user: AuthUser | null) => void> = new Set();
  private userListListeners: Set<(users: AuthUser[]) => void> = new Set();
  private isRestoringSession: boolean = false;

  constructor() {
    this.init();
  }

  private async init() {
    if (typeof window === 'undefined') return;

    // 1. Initial cached local user for instant UI rendering without flash
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

    // 2. Real Supabase Session Restoration
    const client = this.getClient();
    if (isSupabaseConfigured() && client) {
      this.isRestoringSession = true;
      try {
        const { data: { session }, error } = await client.auth.getSession();
        if (!error && session?.user) {
          const mappedUser = this.mapSupabaseUserToAuthUser(session.user);
          this.currentUser = mappedUser;
          this.persistUser(mappedUser);
          this.notify();
          this.safelySyncProfileToDatabase(session.user, mappedUser);
        } else if (this.currentUser?.authProvider === 'google' && !session?.user) {
          // If stored user was from Google but the Supabase session is expired or revoked,
          // clear the expired session so unauthorized access is safely revoked
          this.currentUser = null;
          this.persistUser(null);
          this.notify();
        }

        // Listen for live auth state changes (sign-in, token refresh, sign-out)
        client.auth.onAuthStateChange(async (event, session) => {
          if (session?.user) {
            const mappedUser = this.mapSupabaseUserToAuthUser(session.user);
            this.currentUser = mappedUser;
            this.persistUser(mappedUser);
            this.notify();
            this.safelySyncProfileToDatabase(session.user, mappedUser);
          } else if (event === 'SIGNED_OUT') {
            this.currentUser = null;
            this.persistUser(null);
            this.notify();
          }
        });
      } catch (err) {
        console.warn('Supabase auth session restoration error:', err);
      } finally {
        this.isRestoringSession = false;
      }
    }
  }

  public getClient() {
    return supabase || getSupabase();
  }

  public reinitializeSupabase() {
    return this.init();
  }

  public getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  public isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  public isRestoring(): boolean {
    return this.isRestoringSession;
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
   * Real Supabase Google OAuth sign in flow.
   * Invokes supabase.auth.signInWithOAuth with Google provider and redirect URL.
   */
  public async signInWithGoogle(customRedirectUrl?: string): Promise<{ success: boolean; error?: string }> {
    const client = this.getClient();
    if (!isSupabaseConfigured() || !client) {
      return {
        success: false,
        error:
          'Supabase project is not configured. Please define VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables or connect your Supabase project credentials.',
      };
    }

    try {
      const redirectUrl = customRedirectUrl || getOAuthRedirectUrl();
      const { data, error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // If Supabase returns an explicit OAuth redirect URL in data
      if (data?.url && typeof window !== 'undefined') {
        window.location.assign(data.url);
      }

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to initiate Google sign-in.';
      return { success: false, error: msg };
    }
  }

  /**
   * Handles OAuth callback from Supabase at /auth/callback or root.
   * Exchanges authorization code for session, handles PKCE/tokens, maps user, and sets session.
   */
  public async handleAuthCallback(): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
    const client = this.getClient();
    if (!isSupabaseConfigured() || !client) {
      return {
        success: false,
        error:
          'Supabase is not configured for OAuth callback processing. Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
      };
    }

    try {
      if (typeof window === 'undefined') {
        return { success: false, error: 'Cannot process callback on server.' };
      }

      const params = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const code = params.get('code');
      const errorParam =
        params.get('error_description') ||
        params.get('error') ||
        hashParams.get('error_description') ||
        hashParams.get('error');

      if (errorParam) {
        return { success: false, error: errorParam };
      }

      // 1. Check if Supabase's detectSessionInUrl already successfully resolved the session
      const { data: immediateCheck } = await client.auth.getSession();
      if (immediateCheck.session?.user) {
        const authUser = this.mapSupabaseUserToAuthUser(immediateCheck.session.user);
        this.currentUser = authUser;
        this.persistUser(authUser);
        this.notify();
        this.safelySyncProfileToDatabase(immediateCheck.session.user, authUser);
        return { success: true, user: authUser };
      }

      // 2. If PKCE authorization code exists in URL query, exchange it for session
      if (code) {
        const { data, error } = await client.auth.exchangeCodeForSession(code);
        if (error) {
          // If code was already exchanged by background handler, check if session is active
          const { data: retryCheck } = await client.auth.getSession();
          if (retryCheck.session?.user) {
            const authUser = this.mapSupabaseUserToAuthUser(retryCheck.session.user);
            this.currentUser = authUser;
            this.persistUser(authUser);
            this.notify();
            this.safelySyncProfileToDatabase(retryCheck.session.user, authUser);
            return { success: true, user: authUser };
          }
          return { success: false, error: error.message };
        }
        if (data.session?.user) {
          const authUser = this.mapSupabaseUserToAuthUser(data.session.user);
          this.currentUser = authUser;
          this.persistUser(authUser);
          this.notify();
          this.safelySyncProfileToDatabase(data.session.user, authUser);
          return { success: true, user: authUser };
        }
      }

      // 3. Check current session if implicit tokens were in hash or after exchange
      const { data: { session }, error: sessionError } = await client.auth.getSession();
      if (sessionError) {
        return { success: false, error: sessionError.message };
      }

      if (session?.user) {
        const authUser = this.mapSupabaseUserToAuthUser(session.user);
        this.currentUser = authUser;
        this.persistUser(authUser);
        this.notify();
        this.safelySyncProfileToDatabase(session.user, authUser);
        return { success: true, user: authUser };
      }

      // 4. Brief listener wait for async Supabase exchange resolution
      const sessionUser = await new Promise<User | null>((resolve) => {
        const timeout = setTimeout(() => resolve(null), 1200);
        const { data: authListener } = client.auth.onAuthStateChange((_event, s) => {
          if (s?.user) {
            clearTimeout(timeout);
            authListener.subscription.unsubscribe();
            resolve(s.user);
          }
        });
      });

      if (sessionUser) {
        const authUser = this.mapSupabaseUserToAuthUser(sessionUser);
        this.currentUser = authUser;
        this.persistUser(authUser);
        this.notify();
        this.safelySyncProfileToDatabase(sessionUser, authUser);
        return { success: true, user: authUser };
      }

      return {
        success: false,
        error: 'No active session found after Google authentication. Please try signing in again.',
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error processing authentication callback.';
      return { success: false, error: msg };
    }
  }

  /**
   * Maps Supabase User to EventFlow AuthUser and registers in local directory.
   * Handles first-time account creation vs returning-user login.
   */
  public mapSupabaseUserToAuthUser(supabaseUser: User): AuthUser {
    const meta = supabaseUser.user_metadata || {};
    const email = (supabaseUser.email || '').toLowerCase();
    const fullName =
      meta.full_name ||
      meta.name ||
      (email.includes('@')
        ? email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
        : 'Google User');

    const avatar =
      meta.avatar_url ||
      meta.picture ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=059669&color=fff`;

    const nowIso = new Date().toISOString();

    // Check if user already exists in registered directory to preserve organization/role
    const registered = this.getRegisteredUsers();
    const existing = registered.find((u) => u.email.toLowerCase() === email.toLowerCase());

    const authUser: AuthUser = {
      id: supabaseUser.id,
      name: fullName,
      email,
      organization: existing?.organization || meta.organization || 'EventFlow Productions',
      role: existing?.role || (meta.role as 'director' | 'producer' | 'operator' | 'speaker') || 'director',
      avatar,
      authProvider: 'google',
      createdAt: existing?.createdAt || supabaseUser.created_at || nowIso,
      lastLoginAt: nowIso,
    };

    this.saveRegisteredUser(authUser);
    return authUser;
  }

  /**
   * Safely attempts to update/create a user profile in Supabase database ('profiles' table)
   * only if the table exists and RLS permits, without breaking if the application uses standard auth.users.
   */
  private async safelySyncProfileToDatabase(supabaseUser: User, authUser: AuthUser): Promise<void> {
    const client = this.getClient();
    if (!client) return;
    try {
      await client
        .from('profiles')
        .upsert(
          {
            id: supabaseUser.id,
            email: authUser.email,
            name: authUser.name,
            avatar: authUser.avatar,
            organization: authUser.organization,
            role: authUser.role,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        )
        .then(
          () => {},
          () => {
            // Silently ignore if profiles table does not exist
          }
        );
    } catch {
      // ignore
    }
  }

  /**
   * Fallback for direct Google profile login when in local demo/offline mode
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

    const registered = this.getRegisteredUsers();
    const existingIndex = registered.findIndex(
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

  public async logout(): Promise<void> {
    const client = this.getClient();
    if (isSupabaseConfigured() && client) {
      try {
        await client.auth.signOut();
      } catch (err) {
        console.warn('Error signing out of Supabase:', err);
      }
    }
    this.currentUser = null;
    this.persistUser(null);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem('eventflow_view');
      } catch {
        // ignore
      }
    }
    this.notify();
  }

  private persistUser(user: AuthUser | null) {
    try {
      if (user) {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(AUTH_USER_KEY);
      }
    } catch {
      // ignore
    }
  }

  public getRegisteredUsers(): AuthUser[] {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(REGISTERED_USERS_KEY);
        if (stored) {
          const parsed: AuthUser[] = JSON.parse(stored);
          this.inMemoryRegisteredUsers = parsed;
          return parsed;
        }
      }
      return this.inMemoryRegisteredUsers;
    } catch {
      return this.inMemoryRegisteredUsers;
    }
  }

  public saveRegisteredUser(user: AuthUser) {
    try {
      const all = [...this.getRegisteredUsers()];
      const existingIdx = all.findIndex((u) => u.email.toLowerCase() === user.email.toLowerCase());
      if (existingIdx >= 0) {
        all[existingIdx] = user;
      } else {
        all.push(user);
      }
      this.inMemoryRegisteredUsers = all;
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(all));
      }
      this.notifyUsersChanged();
    } catch {
      // ignore
    }
  }

  public deleteRegisteredUser(userId: string) {
    try {
      const all = this.getRegisteredUsers().filter((u) => u.id !== userId);
      this.inMemoryRegisteredUsers = all;
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(all));
      }
      this.notifyUsersChanged();
    } catch {
      // ignore
    }
  }

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
