import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  Download,
  Copy,
  Check,
  Search,
  Trash2,
  Mail,
  ShieldCheck,
  Calendar,
  Building,
} from 'lucide-react';
import { authService } from '../../services/authService';
import { AuthUser } from '../../types';

interface RegisteredUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RegisteredUsersModal: React.FC<RegisteredUsersModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [users, setUsers] = useState<AuthUser[]>(() => authService.getRegisteredUsers());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedAll, setCopiedAll] = useState<boolean>(false);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    return authService.subscribeToRegisteredUsers((updatedList) => {
      setUsers(updatedList);
    });
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.organization.toLowerCase().includes(q)
    );
  });

  const handleCopyAllEmails = () => {
    const emailList = users.map((u) => u.email).filter(Boolean).join(', ');
    navigator.clipboard.writeText(emailList);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const handleCopySingleEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const handleDeleteUser = (id: string, name: string) => {
    if (confirm(`Remove ${name} from registered users?`)) {
      authService.deleteRegisteredUser(id);
    }
  };

  const googleCount = users.filter((u) => u.authProvider === 'google').length;
  const emailCount = users.filter((u) => u.authProvider !== 'google').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div
        className="w-full max-w-4xl bg-neutral-950 border border-neutral-800 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="p-5 sm:p-6 border-b border-neutral-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Users size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>Registered Users Directory</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-neutral-900 text-emerald-400 border border-neutral-800">
                  {users.length} Total
                </span>
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                All names and email addresses of everyone registered for EventFlow
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyAllEmails}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-xs text-neutral-200 hover:text-white transition-colors cursor-pointer"
              title="Copy comma-separated list of all email addresses"
            >
              {copiedAll ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copiedAll ? 'Copied All!' : 'Copy All Emails'}</span>
            </button>

            <button
              onClick={() => authService.downloadUsersCSV()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-md cursor-pointer"
              title="Download entire directory as CSV"
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-900 cursor-pointer transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="px-6 py-3 bg-neutral-900/40 border-b border-neutral-800/80 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-4 text-neutral-400">
            <div>
              <span className="text-neutral-500">Google Sign-ins:</span>{' '}
              <strong className="text-white font-mono">{googleCount}</strong>
            </div>
            <div>
              <span className="text-neutral-500">Email Sign-ups:</span>{' '}
              <strong className="text-white font-mono">{emailCount}</strong>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder="Search name, email, org..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* User List Table */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-neutral-500 space-y-2">
              <Users size={32} className="mx-auto opacity-30" />
              <p className="text-sm">No registered users found matching "{searchQuery}"</p>
            </div>
          ) : (
            <div className="border border-neutral-800 rounded-2xl overflow-hidden bg-neutral-950">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-900/80 border-b border-neutral-800 text-[11px] font-mono uppercase tracking-wider text-neutral-400">
                  <tr>
                    <th className="px-4 py-3">User &amp; Organization</th>
                    <th className="px-4 py-3">Email Address</th>
                    <th className="px-4 py-3">Provider</th>
                    <th className="px-4 py-3">Registered Date</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-neutral-900/30 transition-colors">
                      {/* Name & Org */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          {u.avatar ? (
                            <img
                              src={u.avatar}
                              alt={u.name}
                              className="w-7 h-7 rounded-full object-cover border border-neutral-700 shrink-0"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs shrink-0 border border-emerald-500/30">
                              {u.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-white flex items-center gap-1.5">
                              <span>{u.name}</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-900 text-neutral-400 border border-neutral-800 capitalize">
                                {u.role || 'Director'}
                              </span>
                            </div>
                            <div className="text-[11px] text-neutral-400 flex items-center gap-1 mt-0.5">
                              <Building size={11} className="text-neutral-500 shrink-0" />
                              <span className="truncate max-w-[160px]">{u.organization || 'Event Team'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3.5 font-mono text-neutral-300">
                        <div className="flex items-center gap-1.5">
                          <Mail size={12} className="text-neutral-500 shrink-0" />
                          <span className="select-all">{u.email}</span>
                          <button
                            onClick={() => handleCopySingleEmail(u.email)}
                            className="p-1 rounded text-neutral-500 hover:text-emerald-400 cursor-pointer transition-colors"
                            title="Copy email address"
                          >
                            {copiedEmail === u.email ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          </button>
                        </div>
                      </td>

                      {/* Provider */}
                      <td className="px-4 py-3.5">
                        {u.authProvider === 'google' ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-semibold font-mono">
                            <svg className="w-3 h-3" viewBox="0 0 24 24">
                              <path
                                fill="#4285F4"
                                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.04h3.88c2.28-2.09 3.66-5.17 3.66-9.14z"
                              />
                              <path
                                fill="#34A853"
                                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.04c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.26 21.36 7.33 24 12 24z"
                              />
                              <path
                                fill="#FBBC05"
                                d="M5.28 14.28c-.25-.72-.38-1.49-.38-2.28s.13-1.56.38-2.28V6.59H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.41l4.03-3.13z"
                              />
                              <path
                                fill="#EA4335"
                                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.59l4.03 3.13c.95-2.83 3.6-4.97 6.72-4.97z"
                              />
                            </svg>
                            <span>Google</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 text-[10px] font-semibold font-mono">
                            <Mail size={10} />
                            <span>Email</span>
                          </div>
                        )}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3.5 text-neutral-400 font-mono text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={11} className="text-neutral-500" />
                          <span>
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Active'}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => handleDeleteUser(u.id, u.name)}
                          className="p-1 rounded text-neutral-500 hover:text-rose-400 hover:bg-rose-950/40 cursor-pointer transition-colors"
                          title="Delete user"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950/80 flex items-center justify-between text-xs text-neutral-400">
          <span>
            Showing <strong className="text-white font-mono">{filteredUsers.length}</strong> of{' '}
            <strong className="text-white font-mono">{users.length}</strong> registered accounts
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 text-xs font-semibold cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
