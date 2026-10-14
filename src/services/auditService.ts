import { getSupabase, isSupabaseConfigured } from './supabaseClient';
import {
  AuthAuditLogEntry,
  AuthEventType,
  AuthErrorCategory,
  AuthProviderType,
  LogAuthEventParams,
} from '../types/audit';

const LOCAL_AUDIT_LOGS_KEY = 'eventflow_auth_audit_logs_v1';
const MAX_LOCAL_LOGS = 250;
const DEDUPLICATION_WINDOW_MS = 60000; // 60 seconds
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_FAILURES_PER_WINDOW = 5;

// Strict whitelist of allowable error categories for failed logins
const ALLOWED_ERROR_CATEGORIES: Set<AuthErrorCategory> = new Set([
  'invalid_credentials',
  'user_not_found',
  'access_denied',
  'oauth_cancelled',
  'oauth_exchange_failed',
  'session_expired',
  'rate_limited',
  'network_error',
  'unknown_failure',
]);

class AuditService {
  private recentEvents: Map<string, number> = new Map();
  private failureLogTimestamps: number[] = [];
  private listeners: Set<(logs: AuthAuditLogEntry[]) => void> = new Set();
  private inMemoryLogs: AuthAuditLogEntry[] = [];

  constructor() {
    this.inMemoryLogs = this.loadLocalLogs();
  }

  /**
   * Sanitizes and normalizes error messages into allowed high-level error categories.
   * Completely strips any accidental passwords, tokens, or URL parameters.
   */
  public sanitizeErrorCategory(rawError?: string | null): AuthErrorCategory {
    if (!rawError) return 'unknown_failure';
    const lower = rawError.toLowerCase();

    if (lower.includes('access_denied') || lower.includes('cancelled') || lower.includes('canceled')) {
      return 'oauth_cancelled';
    }
    if (lower.includes('invalid') || lower.includes('wrong') || lower.includes('credential') || lower.includes('password')) {
      return 'invalid_credentials';
    }
    if (lower.includes('user not found') || lower.includes('no user')) {
      return 'user_not_found';
    }
    if (lower.includes('exchange') || lower.includes('code') || lower.includes('pkce') || lower.includes('token')) {
      return 'oauth_exchange_failed';
    }
    if (lower.includes('network') || lower.includes('fetch') || lower.includes('offline') || lower.includes('connection')) {
      return 'network_error';
    }
    if (lower.includes('expired') || lower.includes('timeout')) {
      return 'session_expired';
    }
    if (lower.includes('rate') || lower.includes('too many')) {
      return 'rate_limited';
    }

    return 'unknown_failure';
  }

  /**
   * Generates a unique, non-sensitive correlation ID for request tracing.
   */
  public generateCorrelationId(prefix: string = 'req'): string {
    const timeHex = Date.now().toString(16);
    const rand = Math.random().toString(36).substring(2, 8);
    return `${prefix}-${timeHex}-${rand}`;
  }

  /**
   * Detects client platform summary without capturing invasive hardware/telemetry data.
   */
  private getClientPlatformSummary(): string {
    if (typeof window === 'undefined') return 'Server Runtime';
    const ua = navigator.userAgent;
    let os = 'Unknown OS';
    if (ua.includes('Win')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

    let browser = 'Browser';
    if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Edge')) browser = 'Edge';

    return `${os} / ${browser}`;
  }

  /**
   * Main audit logging function.
   * Records authentication events into Supabase PostgreSQL database public.auth_audit_logs,
   * with local immutable fallback when offline or before SQL migration is applied.
   */
  public async logEvent(params: LogAuthEventParams): Promise<{ success: boolean; id?: string; error?: string }> {
    const {
      event_type,
      provider = 'google',
      user_id = null,
      user_email = null,
      correlation_id = this.generateCorrelationId('auth'),
      error_category = null,
      client_platform = this.getClientPlatformSummary(),
    } = params;

    // 1. Validate event_type
    const validEventTypes: AuthEventType[] = ['registration', 'login_success', 'logout', 'login_failure'];
    if (!validEventTypes.includes(event_type)) {
      console.warn(`[AuditService] Invalid event type ignored: ${event_type}`);
      return { success: false, error: 'Invalid event type' };
    }

    // 2. Rate-limit failure logging to prevent client-side denial of service
    if (event_type === 'login_failure') {
      const now = Date.now();
      this.failureLogTimestamps = this.failureLogTimestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
      if (this.failureLogTimestamps.length >= MAX_FAILURES_PER_WINDOW) {
        console.warn('[AuditService] Failure logging rate limit exceeded.');
        return { success: false, error: 'Rate limit exceeded' };
      }
      this.failureLogTimestamps.push(now);
    }

    // 3. De-duplicate identical events within the de-duplication window
    // (e.g., duplicate OAuth callback processing or React StrictMode double invocations)
    const dedupKey = `${event_type}:${user_id || user_email || 'anon'}`;
    const now = Date.now();
    const lastOccurred = this.recentEvents.get(dedupKey);
    if (lastOccurred && now - lastOccurred < DEDUPLICATION_WINDOW_MS && event_type !== 'login_failure') {
      // Event already recorded recently, return success without duplicate record
      return { success: true };
    }
    this.recentEvents.set(dedupKey, now);

    // 4. Sanitize error category if failed attempt
    let sanitizedError: AuthErrorCategory | null = null;
    if (event_type === 'login_failure') {
      sanitizedError = error_category && ALLOWED_ERROR_CATEGORIES.has(error_category)
        ? error_category
        : this.sanitizeErrorCategory(error_category);
    }

    // 5. Sanitize email (strip any accidental query params or whitespace)
    const sanitizedEmail = user_email ? user_email.trim().toLowerCase().split('?')[0] : null;

    // Construct standardized audit entry
    const auditEntry: AuthAuditLogEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      user_id: user_id || null,
      user_email: sanitizedEmail,
      event_type,
      provider: (provider as AuthProviderType) || 'google',
      occurred_at: new Date().toISOString(),
      correlation_id,
      error_category: sanitizedError,
      client_platform,
      synced_to_db: false,
    };

    // 6. Attempt writing to Supabase
    let dbSuccess = false;
    const client = getSupabase();

    if (isSupabaseConfigured() && client) {
      try {
        // Preferred Method A: Execute secure RPC function log_auth_event
        const { data: rpcData, error: rpcError } = await client.rpc('log_auth_event', {
          p_event_type: event_type,
          p_provider: auditEntry.provider,
          p_user_id: auditEntry.user_id,
          p_user_email: auditEntry.user_email,
          p_correlation_id: auditEntry.correlation_id,
          p_error_category: auditEntry.error_category,
          p_client_platform: auditEntry.client_platform,
        });

        if (!rpcError && rpcData?.success) {
          dbSuccess = true;
          if (rpcData.id) {
            auditEntry.id = rpcData.id;
          }
        } else {
          // Fallback Method B: Direct table insert into public.auth_audit_logs
          const { data: insertData, error: insertError } = await client
            .from('auth_audit_logs')
            .insert({
              user_id: auditEntry.user_id,
              user_email: auditEntry.user_email,
              event_type: auditEntry.event_type,
              provider: auditEntry.provider,
              occurred_at: auditEntry.occurred_at,
              correlation_id: auditEntry.correlation_id,
              error_category: auditEntry.error_category,
              client_platform: auditEntry.client_platform,
            })
            .select('id')
            .single();

          if (!insertError && insertData?.id) {
            dbSuccess = true;
            auditEntry.id = insertData.id;
          }
        }
      } catch (err) {
        // Table or RPC may not be migrated yet or offline; fallback to local storage
        console.warn('[AuditService] Supabase audit write deferred:', err);
      }
    }

    auditEntry.synced_to_db = dbSuccess;

    // 7. Save to local audit logs store
    this.saveLocalLog(auditEntry);
    this.notify();

    return { success: true, id: auditEntry.id };
  }

  /**
   * Retrieves all audit logs for authorized administrative review.
   * Merges server-side database logs from Supabase with local pending entries.
   */
  public async getAuditLogs(): Promise<AuthAuditLogEntry[]> {
    const client = getSupabase();
    if (isSupabaseConfigured() && client) {
      try {
        const { data, error } = await client
          .from('auth_audit_logs')
          .select('*')
          .order('occurred_at', { ascending: false })
          .limit(200);

        if (!error && Array.isArray(data) && data.length > 0) {
          // Map DB logs
          const dbLogs: AuthAuditLogEntry[] = data.map((row) => ({
            id: row.id,
            user_id: row.user_id,
            user_email: row.user_email,
            event_type: row.event_type,
            provider: row.provider,
            occurred_at: row.occurred_at,
            correlation_id: row.correlation_id,
            error_category: row.error_category,
            client_platform: row.client_platform,
            synced_to_db: true,
          }));

          // Merge any unsynced local logs
          const unsynced = this.inMemoryLogs.filter((l) => !l.synced_to_db);
          const combined = [...unsynced, ...dbLogs];
          combined.sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
          return combined;
        }
      } catch {
        // Fall back to local logs if query fails or table does not exist
      }
    }

    return this.inMemoryLogs;
  }

  /**
   * Synchronizes any locally recorded pending audit logs to Supabase database.
   */
  public async syncPendingLogsToDatabase(): Promise<{ syncedCount: number; error?: string }> {
    const client = getSupabase();
    if (!isSupabaseConfigured() || !client) {
      return { syncedCount: 0, error: 'Supabase client not configured.' };
    }

    const pending = this.inMemoryLogs.filter((l) => !l.synced_to_db);
    if (pending.length === 0) {
      return { syncedCount: 0 };
    }

    let count = 0;
    for (const item of pending) {
      try {
        const { error } = await client.from('auth_audit_logs').insert({
          user_id: item.user_id,
          user_email: item.user_email,
          event_type: item.event_type,
          provider: item.provider,
          occurred_at: item.occurred_at,
          correlation_id: item.correlation_id,
          error_category: item.error_category,
          client_platform: item.client_platform,
        });
        if (!error) {
          item.synced_to_db = true;
          count++;
        }
      } catch {
        // Stop on error
        break;
      }
    }

    this.persistLocalLogs();
    this.notify();
    return { syncedCount: count };
  }

  /**
   * Checks whether public.auth_audit_logs table exists and is accessible in Supabase.
   */
  public async checkDatabaseTableStatus(): Promise<{ exists: boolean; message: string }> {
    const client = getSupabase();
    if (!isSupabaseConfigured() || !client) {
      return {
        exists: false,
        message: 'Supabase client not initialized.',
      };
    }

    try {
      const { error } = await client.from('auth_audit_logs').select('id').limit(1);
      if (error) {
        if (error.message.includes('Could not find') || error.code === '42P01') {
          return {
            exists: false,
            message: "Table 'public.auth_audit_logs' not found in schema cache. Apply SQL migration.",
          };
        }
        if (error.message.includes('row-level security') || error.message.includes('policy')) {
          return {
            exists: true,
            message: 'Table exists; protected by Row Level Security (RLS).',
          };
        }
        return {
          exists: false,
          message: error.message,
        };
      }
      return {
        exists: true,
        message: 'Connected to public.auth_audit_logs (RLS active).',
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown database error';
      return { exists: false, message: msg };
    }
  }

  /**
   * Subscribes to live audit log updates.
   */
  public subscribe(callback: (logs: AuthAuditLogEntry[]) => void): () => void {
    this.listeners.add(callback);
    callback(this.inMemoryLogs);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => cb(this.inMemoryLogs));
  }

  private loadLocalLogs(): AuthAuditLogEntry[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(LOCAL_AUDIT_LOGS_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // ignore
    }
    return [];
  }

  private saveLocalLog(entry: AuthAuditLogEntry) {
    this.inMemoryLogs.unshift(entry);
    if (this.inMemoryLogs.length > MAX_LOCAL_LOGS) {
      this.inMemoryLogs = this.inMemoryLogs.slice(0, MAX_LOCAL_LOGS);
    }
    this.persistLocalLogs();
  }

  private persistLocalLogs() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(LOCAL_AUDIT_LOGS_KEY, JSON.stringify(this.inMemoryLogs));
    } catch {
      // ignore
    }
  }

  /**
   * Clears in-memory and local storage logs.
   */
  public clearLocalLogs() {
    this.inMemoryLogs = [];
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(LOCAL_AUDIT_LOGS_KEY);
      } catch {
        // ignore
      }
    }
    this.notify();
  }

  /**
   * Formats the audit logs as a downloadable CSV.
   */
  public exportLogsAsCSV(logsToExport?: AuthAuditLogEntry[]): string {
    const list = logsToExport || this.inMemoryLogs;
    const headers = [
      'ID',
      'Event Type',
      'Provider',
      'User Email',
      'User ID',
      'Occurred At (ISO)',
      'Occurred At (Local)',
      'Correlation ID',
      'Error Category',
      'Client Platform',
      'Synced to DB',
    ];

    const rows = list.map((l) => [
      `"${(l.id || '').replace(/"/g, '""')}"`,
      `"${(l.event_type || '').toUpperCase()}"`,
      `"${(l.provider || '').toUpperCase()}"`,
      `"${(l.user_email || 'anonymous').replace(/"/g, '""')}"`,
      `"${(l.user_id || '').replace(/"/g, '""')}"`,
      `"${l.occurred_at}"`,
      `"${new Date(l.occurred_at).toLocaleString()}"`,
      `"${(l.correlation_id || '').replace(/"/g, '""')}"`,
      `"${(l.error_category || 'none').replace(/"/g, '""')}"`,
      `"${(l.client_platform || '').replace(/"/g, '""')}"`,
      `"${l.synced_to_db ? 'YES' : 'NO'}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}

export const auditService = new AuditService();
