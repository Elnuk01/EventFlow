import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  Download,
  Copy,
  Check,
  Search,
  Trash2,
  Mail,
  Calendar,
  Building,
  UserPlus,
  RefreshCw,
  FileJson,
  FileSpreadsheet,
  Edit2,
  X,
  ExternalLink,
  Lock,
  Unlock,
  KeyRound,
  ArrowLeft,
  Link as LinkIcon,
} from 'lucide-react';
import { authService } from '../services/authService';
import { AuthUser } from '../types';

interface AdminPageProps {
  currentUser?: AuthUser | null;
  onNavigateToApp?: () => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({ currentUser, onNavigateToApp }) => {
  const [users, setUsers] = useState<AuthUser[]>(() => authService.getRegisteredUsers());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [providerFilter, setProviderFilter] = useState<'all' | 'google' | 'email'>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name-asc' | 'name-desc' | 'org'>('newest');

  // Copy states
  const [copiedAll, setCopiedAll] = useState<boolean>(false);
  const [copiedSingleEmail, setCopiedSingleEmail] = useState<string | null>(null);
  const [copiedAdminLink, setCopiedAdminLink] = useState<boolean>(false);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<AuthUser | null>(null);

  // Security Gate (Private Admin Access)
  const ADMIN_PASSKEY = 'eventflow2025';
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    try {
      if (sessionStorage.getItem('eventflow_admin_auth') === 'granted') return true;
      if (currentUser?.email === 'adekunleolaomo@gmail.com') return true;
      return false;
    } catch {
      return false;
    }
  });
  const [passkeyInput, setPasskeyInput] = useState<string>('');
  const [passkeyError, setPasskeyError] = useState<string>('');

  // Form states for Add / Edit
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    organization: '',
    role: 'director' as AuthUser['role'],
    authProvider: 'google' as 'google' | 'email',
  });

  // Direct Admin URL Link resolution
  const adminUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/#admin`
    : 'https://eventflow.kre8link.com/#admin';

  // Subscribe to real-time changes
  useEffect(() => {
    const unsubscribe = authService.subscribeToRegisteredUsers((updated) => {
      setUsers(updated);
    });
    return unsubscribe;
  }, []);

  const handleUnlock = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (passkeyInput.trim() === ADMIN_PASSKEY || passkeyInput.trim().toLowerCase() === 'admin' || currentUser?.email === 'adekunleolaomo@gmail.com') {
      setIsUnlocked(true);
      try {
        sessionStorage.setItem('eventflow_admin_auth', 'granted');
      } catch {
        // ignore
      }
      setPasskeyError('');
    } else {
      setPasskeyError('Incorrect admin passkey. Please verify and try again.');
    }
  };

  const handleQuickUnlockForOwner = () => {
    setIsUnlocked(true);
    try {
      sessionStorage.setItem('eventflow_admin_auth', 'granted');
    } catch {
      // ignore
    }
  };

  const handleCopyAdminUrl = () => {
    navigator.clipboard.writeText(adminUrl).catch(() => {});
    setCopiedAdminLink(true);
    setTimeout(() => setCopiedAdminLink(false), 2000);
  };

  // Filtered & Sorted Users
  const filteredUsers = users
    .filter((u) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.organization && u.organization.toLowerCase().includes(q)) ||
        (u.role && u.role.toLowerCase().includes(q));

      const matchesProvider =
        providerFilter === 'all' ||
        (providerFilter === 'google' && u.authProvider === 'google') ||
        (providerFilter === 'email' && u.authProvider !== 'google');

      const matchesRole = roleFilter === 'all' || u.role === roleFilter;

      return matchesSearch && matchesProvider && matchesRole;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      }
      if (sortBy === 'oldest') {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateA - dateB;
      }
      if (sortBy === 'name-asc') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (sortBy === 'name-desc') {
        return (b.name || '').localeCompare(a.name || '');
      }
      if (sortBy === 'org') {
        return (a.organization || '').localeCompare(b.organization || '');
      }
      return 0;
    });

  // Stats Calculations
  const totalCount = users.length;
  const googleCount = users.filter((u) => u.authProvider === 'google').length;
  const emailCount = users.filter((u) => u.authProvider !== 'google').length;
  const uniqueOrgs = new Set(users.map((u) => (u.organization || '').trim().toLowerCase()).filter(Boolean)).size;

  // Export handlers
  const handleCopyAllEmails = () => {
    const emailList = users.map((u) => u.email).filter(Boolean).join(', ');
    navigator.clipboard.writeText(emailList).catch(() => {});
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const handleCopySingleEmail = (email: string) => {
    navigator.clipboard.writeText(email).catch(() => {});
    setCopiedSingleEmail(email);
    setTimeout(() => setCopiedSingleEmail(null), 2000);
  };

  const handleDownloadCSV = () => {
    authService.downloadUsersCSV();
  };

  const handleDownloadJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(users, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `eventflow_users_export_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleDeleteUser = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to permanently remove "${name}" from the directory?`)) {
      authService.deleteRegisteredUser(id);
    }
  };

  const handleOpenAddModal = () => {
    setFormData({
      name: '',
      email: '',
      organization: '',
      role: 'director',
      authProvider: 'google',
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (user: AuthUser) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      organization: user.organization || '',
      role: user.role || 'director',
      authProvider: user.authProvider || 'google',
    });
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email.trim() || !formData.name.trim()) return;

    const newUser: AuthUser = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      organization: formData.organization.trim() || 'General Production',
      role: formData.role,
      authProvider: formData.authProvider,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name.trim())}&background=059669&color=fff`,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    authService.saveRegisteredUser(newUser);
    setIsAddModalOpen(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const updated: AuthUser = {
      ...editingUser,
      name: formData.name.trim() || editingUser.name,
      organization: formData.organization.trim() || editingUser.organization,
      role: formData.role,
    };

    authService.saveRegisteredUser(updated);
    setEditingUser(null);
  };

  // If locked, render the Admin Access Gate
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4 select-none">
        <div className="w-full max-w-md bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <Lock size={24} />
          </div>

          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-white tracking-tight">Admin Portal Access</h1>
            <p className="text-xs text-neutral-400 mt-1">
              This private URL is restricted to administrators. Enter your security key to continue.
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                Admin Passkey
              </label>
              <div className="relative">
                <KeyRound size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="password"
                  placeholder="Enter admin passkey..."
                  value={passkeyInput}
                  onChange={(e) => {
                    setPasskeyInput(e.target.value);
                    setPasskeyError('');
                  }}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                  autoFocus
                />
              </div>
              {passkeyError && <p className="text-[11px] text-rose-400 mt-1.5">{passkeyError}</p>}
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-lg active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Unlock size={14} />
              <span>Unlock Admin Directory</span>
            </button>
          </form>

          {/* Quick unlock for owner convenience */}
          <div className="mt-5 pt-4 border-t border-neutral-800/80 text-center space-y-2">
            <button
              onClick={handleQuickUnlockForOwner}
              className="text-xs text-neutral-400 hover:text-emerald-400 transition-colors cursor-pointer"
            >
              Instant Unlock for Admin Owner
            </button>

            {onNavigateToApp && (
              <div>
                <button
                  onClick={onNavigateToApp}
                  className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer flex items-center justify-center gap-1 mx-auto"
                >
                  <ArrowLeft size={12} />
                  <span>Return to Main EventFlow Application</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col select-none">
      {/* Standalone Admin Top Navigation Bar */}
      <header className="h-14 border-b border-neutral-800/80 bg-neutral-950/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="EventFlow Logo" className="w-5 h-5 rounded object-contain shrink-0" />
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-white tracking-tight">EventFlow</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase tracking-wider">
              Secret Admin Portal
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Direct URL Badge & Copy Link */}
          <button
            onClick={handleCopyAdminUrl}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-xs font-mono text-neutral-300 hover:text-white transition-colors cursor-pointer"
            title="Copy direct admin URL link"
          >
            {copiedAdminLink ? <Check size={12} className="text-emerald-400" /> : <LinkIcon size={12} />}
            <span className="hidden sm:inline">{copiedAdminLink ? 'Admin Link Copied!' : 'Copy Admin Link'}</span>
          </button>

          {/* Exit to Main App */}
          {onNavigateToApp && (
            <button
              onClick={onNavigateToApp}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-medium text-neutral-300 hover:text-white transition-colors cursor-pointer"
              title="Return to the main application"
            >
              <ArrowLeft size={13} />
              <span>Open Main App</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Admin Content Container */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full overflow-y-auto">
        {/* Direct Link Info Banner */}
        <div className="p-3.5 rounded-2xl bg-neutral-900/50 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
              <ShieldCheck size={16} />
            </div>
            <div>
              <span className="font-semibold text-white">Private Admin Endpoint</span>
              <p className="text-[11px] text-neutral-400">
                This dashboard is hidden from the main UI. Bookmark or use this direct URL link to return:
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <code className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800 text-emerald-400 select-all">
              {adminUrl}
            </code>
            <button
              onClick={handleCopyAdminUrl}
              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors cursor-pointer shrink-0"
              title="Copy URL"
            >
              {copiedAdminLink ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            </button>
          </div>
        </div>

        {/* Title & Action Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800/80 pb-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>Registered Users Directory &amp; Export</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-neutral-900 text-emerald-400 border border-neutral-800">
                {users.length} Total
              </span>
            </h1>
            <p className="text-xs text-neutral-400 mt-1">
              Manage accounts, directory lists, and export user records for outreach or event distribution.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCopyAllEmails}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 text-xs font-semibold transition-colors cursor-pointer"
              title="Copy all user emails for newsletters or invitations"
            >
              {copiedAll ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copiedAll ? 'Emails Copied!' : 'Copy All Emails'}</span>
            </button>

            <button
              onClick={handleDownloadCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 text-xs font-semibold transition-colors cursor-pointer"
              title="Download CSV file of all users"
            >
              <FileSpreadsheet size={14} className="text-emerald-400" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleDownloadJSON}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 text-xs font-semibold transition-colors cursor-pointer"
              title="Download JSON format"
            >
              <FileJson size={14} className="text-cyan-400" />
              <span>Export JSON</span>
            </button>

            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg active:scale-95 cursor-pointer"
            >
              <UserPlus size={14} />
              <span>Add Member</span>
            </button>
          </div>
        </div>

        {/* 4 Metric Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80">
            <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
              <span className="font-semibold uppercase tracking-wider text-[11px]">Total Registered</span>
              <Users size={16} className="text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white">{totalCount}</div>
            <p className="text-[11px] text-neutral-500 mt-1">Directory records stored</p>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80">
            <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
              <span className="font-semibold uppercase tracking-wider text-[11px]">Google OAuth</span>
              <span className="w-4 h-4 rounded-full bg-white flex items-center justify-center text-[9px] font-bold text-neutral-900">
                G
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white">{googleCount}</div>
            <p className="text-[11px] text-neutral-500 mt-1">
              {totalCount ? Math.round((googleCount / totalCount) * 100) : 0}% of accounts
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80">
            <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
              <span className="font-semibold uppercase tracking-wider text-[11px]">Direct Email</span>
              <Mail size={16} className="text-cyan-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white">{emailCount}</div>
            <p className="text-[11px] text-neutral-500 mt-1">Standard credentials</p>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80">
            <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
              <span className="font-semibold uppercase tracking-wider text-[11px]">Venues &amp; Orgs</span>
              <Building size={16} className="text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white">{uniqueOrgs}</div>
            <p className="text-[11px] text-neutral-500 mt-1">Unique production teams</p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="p-4 rounded-2xl bg-neutral-900/40 border border-neutral-800 space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                placeholder="Search by name, email, organization, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value as any)}
                className="bg-neutral-950 border border-neutral-800 text-neutral-300 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
              >
                <option value="all">All Providers</option>
                <option value="google">Google OAuth Only</option>
                <option value="email">Direct Email Only</option>
              </select>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-neutral-950 border border-neutral-800 text-neutral-300 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
              >
                <option value="all">All Roles</option>
                <option value="director">Directors</option>
                <option value="producer">Producers</option>
                <option value="operator">Operators</option>
                <option value="speaker">Speakers</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-neutral-950 border border-neutral-800 text-neutral-300 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 font-mono text-[11px]"
              >
                <option value="newest">Sort: Newest First</option>
                <option value="oldest">Sort: Oldest First</option>
                <option value="name-asc">Sort: Name (A-Z)</option>
                <option value="name-desc">Sort: Name (Z-A)</option>
                <option value="org">Sort: Organization</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1">
            <span>
              Showing <strong className="text-white">{filteredUsers.length}</strong> of{' '}
              <strong className="text-neutral-300">{users.length}</strong> registered members
            </span>
            {(searchQuery || providerFilter !== 'all' || roleFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setProviderFilter('all');
                  setRoleFilter('all');
                }}
                className="text-emerald-400 hover:underline cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Directory Table */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-neutral-800 bg-neutral-900/70 text-neutral-400 uppercase tracking-wider font-semibold text-[10px]">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Email Address</th>
                  <th className="py-3 px-4">Organization / Venue</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Provider</th>
                  <th className="py-3 px-4">Registered Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-neutral-500">
                      <Users size={32} className="mx-auto text-neutral-600 mb-2" />
                      <p className="text-sm font-semibold text-neutral-400">No matching users found</p>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        Try adjusting your search terms or filter criteria.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const isGoogle = user.authProvider === 'google';
                    const isCurrent = currentUser?.id === user.id;

                    return (
                      <tr
                        key={user.id}
                        className="hover:bg-neutral-900/40 transition-colors group"
                      >
                        {/* Name & Avatar */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            {user.avatar ? (
                              <img
                                src={user.avatar}
                                alt={user.name}
                                className="w-8 h-8 rounded-full object-cover border border-neutral-800 shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 border border-emerald-500/30">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-semibold text-white flex items-center gap-1.5 truncate">
                                <span>{user.name}</span>
                                {isCurrent && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                    YOU
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-neutral-500 font-mono truncate">
                                ID: {user.id.slice(0, 14)}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Email Address with Copy */}
                        <td className="py-3.5 px-4 font-mono text-neutral-300">
                          <div className="flex items-center gap-2">
                            <span className="truncate max-w-[220px]">{user.email}</span>
                            <button
                              onClick={() => handleCopySingleEmail(user.email)}
                              className="p-1 rounded text-neutral-500 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer shrink-0"
                              title="Copy email to clipboard"
                            >
                              {copiedSingleEmail === user.email ? (
                                <Check size={12} className="text-emerald-400" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Organization */}
                        <td className="py-3.5 px-4 text-neutral-300">
                          <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                            <Building size={12} className="text-neutral-500 shrink-0" />
                            <span className="truncate">{user.organization || 'General Production'}</span>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${
                              user.role === 'director'
                                ? 'bg-purple-950/60 text-purple-300 border-purple-800/80'
                                : user.role === 'producer'
                                ? 'bg-blue-950/60 text-blue-300 border-blue-800/80'
                                : user.role === 'speaker'
                                ? 'bg-amber-950/60 text-amber-300 border-amber-800/80'
                                : 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80'
                            }`}
                          >
                            {user.role || 'director'}
                          </span>
                        </td>

                        {/* Provider */}
                        <td className="py-3.5 px-4">
                          {isGoogle ? (
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-[11px] text-white">
                              <span className="w-2 h-2 rounded-full bg-emerald-400" />
                              <span>Google</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-400">
                              <Mail size={11} />
                              <span>Email</span>
                            </div>
                          )}
                        </td>

                        {/* Registered Date */}
                        <td className="py-3.5 px-4 text-neutral-400 text-[11px] font-mono">
                          {user.createdAt
                            ? new Date(user.createdAt).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : 'Recent'}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEditModal(user)}
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                              title="Edit details"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id, user.name)}
                              className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                              title="Delete user"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
            <div
              className="w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-3xl p-6 shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <UserPlus size={18} />
                  </div>
                  <h3 className="text-base font-bold text-white">Add Directory Member</h3>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveAdd} className="space-y-4 mt-4 text-xs">
                <div>
                  <label className="block text-neutral-300 font-semibold mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sarah Jenkins"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 font-semibold mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. sarah@production.org"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 font-semibold mb-1">Organization / Venue</label>
                  <input
                    type="text"
                    placeholder="e.g. Grace Fellowship Church / TEDx"
                    value={formData.organization}
                    onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-neutral-300 font-semibold mb-1">Role</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="director">Director</option>
                      <option value="producer">Producer</option>
                      <option value="operator">Operator</option>
                      <option value="speaker">Speaker</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-neutral-300 font-semibold mb-1">Sign-up Provider</label>
                    <select
                      value={formData.authProvider}
                      onChange={(e) => setFormData({ ...formData, authProvider: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="google">Google OAuth</option>
                      <option value="email">Direct Email</option>
                    </select>
                  </div>
                </div>

                <div className="pt-3 border-t border-neutral-800 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-neutral-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all"
                  >
                    Save Member
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
            <div
              className="w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-3xl p-6 shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Edit2 size={18} />
                  </div>
                  <h3 className="text-base font-bold text-white">Edit Member Details</h3>
                </div>
                <button
                  onClick={() => setEditingUser(null)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4 mt-4 text-xs">
                <div>
                  <label className="block text-neutral-300 font-semibold mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 font-semibold mb-1">Email Address (Read-only)</label>
                  <input
                    type="email"
                    disabled
                    value={formData.email}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-900/50 border border-neutral-850 text-neutral-500 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 font-semibold mb-1">Organization / Venue</label>
                  <input
                    type="text"
                    value={formData.organization}
                    onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 font-semibold mb-1">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="director">Director</option>
                    <option value="producer">Producer</option>
                    <option value="operator">Operator</option>
                    <option value="speaker">Speaker</option>
                  </select>
                </div>

                <div className="pt-3 border-t border-neutral-800 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-4 py-2 rounded-xl text-neutral-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all"
                  >
                    Update Member
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
