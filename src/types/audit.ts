export type AuthEventType = 'registration' | 'login_success' | 'logout' | 'login_failure';

export type AuthProviderType = 'google' | 'email' | 'oauth' | 'saml';

export type AuthErrorCategory =
  | 'invalid_credentials'
  | 'user_not_found'
  | 'access_denied'
  | 'oauth_cancelled'
  | 'oauth_exchange_failed'
  | 'session_expired'
  | 'rate_limited'
  | 'network_error'
  | 'unknown_failure';

export interface AuthAuditLogEntry {
  id: string;
  user_id?: string | null;
  user_email?: string | null;
  event_type: AuthEventType;
  provider?: AuthProviderType | null;
  occurred_at: string;
  correlation_id?: string | null;
  error_category?: AuthErrorCategory | null;
  client_platform?: string | null;
  synced_to_db?: boolean;
}

export interface LogAuthEventParams {
  event_type: AuthEventType;
  provider?: AuthProviderType | null;
  user_id?: string | null;
  user_email?: string | null;
  correlation_id?: string | null;
  error_category?: AuthErrorCategory | null;
  client_platform?: string | null;
}
