import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  UserPlus,
  LogOut,
  Search,
  RefreshCw,
  FileSpreadsheet,
  Copy,
  Check,
  Clock,
  Cloud,
  HardDrive,
  Database,
  ArrowRight,
  Filter,
  CheckCircle2,
  XCircle,
  Laptop,
} from 'lucide-react';
import { AuthAuditLogEntry, AuthEventType } from '../../types';

interface AuditLogsViewProps {
  logs: AuthAuditLogEntry[];
  isLoading: boolean;
  tableStatus: { exists: boolean; message: string } | null;
  onRefresh: () => Promise<void>;
  onSyncPending: () => Promise<void>;
  onExportCSV: () => void;
  onNavigateToSqlMigration: () => void;
  isSyncing: boolean;
  syncNotice: string | null;
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({
  logs,
  isLoading,
  tableStatus,
  onRefresh,
  onSyncPending,
  onExportCSV,
  onNavigateToSqlMigration,
  isSyncing,
  syncNotice,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuthAuditLogEntry | null>(null);

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (log.user_email && log.user_email.toLowerCase().includes(q)) ||
      (log.user_id && log.user_id.toLowerCase().includes(q)) ||
      (log.correlation_id && log.correlation_id.toLowerCase().includes(q)) ||
      (log.error_category && log.error_category.toLowerCase().includes(q)) ||
      log.event_type.toLowerCase().includes(q);

    const matchesEvent = eventFilter === 'all' || log.event_type === eventFilter;
    const matchesProvider = providerFilter === 'all' || log.provider === providerFilter;

    return matchesSearch && matchesEvent && matchesProvider;
  });

  // Calculate metrics
  const totalEvents = logs.length;
  const totalLogins = logs.filter((l) => l.event_type === 'login_success').length;
  const totalRegistrations = logs.filter((l) => l.event_type === 'registration').length;
  const totalLogouts = logs.filter((l) => l.event_type === 'logout').length;
  const totalFailures = logs.filter((l) => l.event_type === 'login_failure').length;
  const pendingSyncCount = logs.filter((l) => !l.synced_to_db).length;

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getEventBadge = (type: AuthEventType) => {
    switch (type) {
      case 'registration':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <UserPlus size={12} />
            <span>Registration</span>
          </span>
        );
      case 'login_success':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 size={12} />
            <span>Login Success</span>
          </span>
        );
      case 'logout':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <LogOut size={12} />
            <span>Logout</span>
          </span>
        );
      case 'login_failure':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle size={12} />
            <span>Login Failure</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-neutral-800 text-neutral-400 border border-neutral-700">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Sync Notice Alert if available */}
      {syncNotice && (
        <div className="p-3.5 rounded-2xl bg-neutral-900 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
            <span>{syncNotice}</span>
          </div>
        </div>
      )}

      {/* Header with Title, Database Status & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>Authentication Audit Logs</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-neutral-900 text-emerald-400 border border-neutral-800">
                {logs.length} Recorded
              </span>
            </h2>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Immutable security log recording account registrations, confirmed logins, secure sign-outs, and sanitized failure attempts.
          </p>

          {/* Database status banner */}
          <div className="mt-2.5 flex items-center gap-2 flex-wrap">
            {tableStatus?.exists ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Supabase Table Connected (RLS Active)</span>
              </span>
            ) : (
              <button
                onClick={onNavigateToSqlMigration}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-colors cursor-pointer"
                title="Click to view and copy the SQL migration"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span>Supabase Table Migration Pending · Run SQL Migration</span>
                <ArrowRight size={11} />
              </button>
            )}

            {pendingSyncCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-neutral-800 text-neutral-400 border border-neutral-700">
                <HardDrive size={10} />
                <span>{pendingSyncCount} cached locally</span>
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {pendingSyncCount > 0 && tableStatus?.exists && (
            <button
              onClick={onSyncPending}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              title="Sync pending local audit logs to Supabase database"
            >
              <Cloud size={14} className={isSyncing ? 'animate-pulse' : ''} />
              <span>{isSyncing ? 'Syncing...' : `Sync ${pendingSyncCount} to Cloud`}</span>
            </button>
          )}

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh logs from Supabase"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-emerald-400' : ''} />
            <span>Refresh</span>
          </button>

          <button
            onClick={onExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 text-xs font-semibold transition-colors cursor-pointer"
            title="Download CSV export of authentication audit logs"
          >
            <FileSpreadsheet size={14} className="text-emerald-400" />
            <span>Export Audit CSV</span>
          </button>

          <button
            onClick={onNavigateToSqlMigration}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 text-xs font-semibold transition-colors cursor-pointer"
            title="View Supabase SQL Migration Script"
          >
            <Database size={14} className="text-cyan-400" />
            <span>SQL Script</span>
          </button>
        </div>
      </div>

      {/* 5 Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span>Total Events</span>
            <ShieldAlert size={15} className="text-neutral-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">{totalEvents}</div>
          <div className="text-[10px] text-neutral-400 mt-1">Audit log records</div>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
          <div className="flex items-center justify-between text-emerald-400 text-xs mb-1">
            <span>Successful Logins</span>
            <ShieldCheck size={15} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">{totalLogins}</div>
          <div className="text-[10px] text-neutral-400 mt-1">Confirmed sign-ins</div>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
          <div className="flex items-center justify-between text-sky-400 text-xs mb-1">
            <span>Registrations</span>
            <UserPlus size={15} className="text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-sky-400">{totalRegistrations}</div>
          <div className="text-[10px] text-neutral-400 mt-1">New accounts created</div>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
          <div className="flex items-center justify-between text-amber-400 text-xs mb-1">
            <span>Logouts</span>
            <LogOut size={15} className="text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">{totalLogouts}</div>
          <div className="text-[10px] text-neutral-400 mt-1">Secure session closes</div>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-rose-400 text-xs mb-1">
            <span>Failed Attempts</span>
            <AlertTriangle size={15} className="text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400">{totalFailures}</div>
          <div className="text-[10px] text-neutral-400 mt-1">Captured failures</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-neutral-900/40 border border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Search audit logs by email, ID, correlation ID, or error category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Filter size={13} className="text-neutral-500" />
            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">All Events ({totalEvents})</option>
              <option value="login_success">Login Success ({totalLogins})</option>
              <option value="registration">Registration ({totalRegistrations})</option>
              <option value="logout">Logout ({totalLogouts})</option>
              <option value="login_failure">Login Failure ({totalFailures})</option>
            </select>
          </div>

          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="all">All Providers</option>
            <option value="google">Google OAuth</option>
            <option value="email">Email</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-950 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-neutral-800/80 bg-neutral-900/50 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4">User / Account</th>
                <th className="py-3 px-4">Provider</th>
                <th className="py-3 px-4">Status / Error Category</th>
                <th className="py-3 px-4">Correlation ID</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4 text-center">Storage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-850">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-500">
                    <div className="max-w-sm mx-auto space-y-2">
                      <ShieldAlert size={28} className="mx-auto text-neutral-600 opacity-60" />
                      <p className="text-sm font-semibold text-neutral-400">No audit events match your filter</p>
                      <p className="text-xs text-neutral-500">
                        {logs.length === 0
                          ? 'Audit events will appear here automatically when accounts register, sign in, or log out.'
                          : 'Try adjusting your search query or event filter.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const occurredDate = new Date(log.occurred_at);
                  const isRecent = Date.now() - occurredDate.getTime() < 120000;

                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-neutral-900/50 transition-colors cursor-pointer group"
                    >
                      {/* Event Type */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getEventBadge(log.event_type)}
                          {isRecent && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" title="Just now" />
                          )}
                        </div>
                      </td>

                      {/* User Email & ID */}
                      <td className="py-3 px-4">
                        <div className="max-w-xs truncate">
                          {log.user_email ? (
                            <span className="font-medium text-white group-hover:text-emerald-400 transition-colors">
                              {log.user_email}
                            </span>
                          ) : (
                            <span className="text-neutral-500 italic">anonymous / unauthenticated</span>
                          )}
                          {log.user_id && (
                            <div className="text-[10px] font-mono text-neutral-500 truncate" title={log.user_id}>
                              ID: {log.user_id.substring(0, 12)}...
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Provider */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono font-medium bg-neutral-900 text-neutral-300 border border-neutral-800 uppercase">
                          {log.provider === 'google' ? 'Google OAuth' : log.provider || 'System'}
                        </span>
                      </td>

                      {/* Status / Error Category */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {log.event_type === 'login_failure' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-rose-400">
                            <AlertTriangle size={11} />
                            <span>{log.error_category || 'unknown_failure'}</span>
                          </span>
                        ) : (
                          <span className="text-neutral-400 text-[11px]">Completed</span>
                        )}
                      </td>

                      {/* Correlation ID */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <code className="text-[11px] font-mono text-neutral-400">
                            {log.correlation_id ? log.correlation_id.substring(0, 16) : '—'}
                          </code>
                          {log.correlation_id && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyText(log.correlation_id!, `corr-${log.id}`);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 text-neutral-500 hover:text-white transition-opacity cursor-pointer"
                              title="Copy Correlation ID"
                            >
                              {copiedId === `corr-${log.id}` ? (
                                <Check size={11} className="text-emerald-400" />
                              ) : (
                                <Copy size={11} />
                              )}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Timestamp */}
                      <td className="py-3 px-4 whitespace-nowrap text-neutral-400" title={log.occurred_at}>
                        <div className="flex items-center gap-1.5">
                          <Clock size={12} className="text-neutral-500" />
                          <span>{occurredDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                          <span className="text-[10px] text-neutral-500">
                            {occurredDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </td>

                      {/* Storage */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {log.synced_to_db ? (
                          <span className="inline-flex p-1 rounded-md bg-emerald-500/10 text-emerald-400" title="Synchronized to Supabase public.auth_audit_logs">
                            <Cloud size={13} />
                          </span>
                        ) : (
                          <span className="inline-flex p-1 rounded-md bg-neutral-800 text-neutral-400" title="Stored locally / Pending cloud synchronization">
                            <HardDrive size={13} />
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Audit Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div
            className="w-full max-w-lg bg-neutral-950 border border-neutral-800 rounded-3xl p-6 shadow-2xl relative space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <ShieldAlert size={18} className="text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Audit Event Details</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-neutral-900">
                <span className="text-neutral-400">Event Type:</span>
                <div>{getEventBadge(selectedLog.event_type)}</div>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-neutral-900">
                <span className="text-neutral-400">User Email:</span>
                <span className="font-mono text-white">{selectedLog.user_email || 'anonymous'}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-neutral-900">
                <span className="text-neutral-400">User ID:</span>
                <span className="font-mono text-[11px] text-neutral-300">{selectedLog.user_id || 'None'}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-neutral-900">
                <span className="text-neutral-400">Provider:</span>
                <span className="font-mono text-neutral-300 uppercase">{selectedLog.provider || 'None'}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-neutral-900">
                <span className="text-neutral-400">Occurred At:</span>
                <span className="font-mono text-neutral-300">{selectedLog.occurred_at}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-neutral-900">
                <span className="text-neutral-400">Correlation ID:</span>
                <span className="font-mono text-emerald-400">{selectedLog.correlation_id || 'None'}</span>
              </div>

              {selectedLog.error_category && (
                <div className="flex justify-between items-center py-1 border-b border-neutral-900">
                  <span className="text-neutral-400">Sanitized Error:</span>
                  <span className="font-mono text-rose-400">{selectedLog.error_category}</span>
                </div>
              )}

              <div className="flex justify-between items-center py-1 border-b border-neutral-900">
                <span className="text-neutral-400">Client Platform:</span>
                <div className="flex items-center gap-1.5 text-neutral-300">
                  <Laptop size={12} className="text-neutral-500" />
                  <span>{selectedLog.client_platform || 'Web Browser'}</span>
                </div>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="text-neutral-400">Database Persistence:</span>
                <span className={selectedLog.synced_to_db ? 'text-emerald-400' : 'text-amber-400'}>
                  {selectedLog.synced_to_db ? 'Synced to Supabase public.auth_audit_logs' : 'Queued in browser storage'}
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
