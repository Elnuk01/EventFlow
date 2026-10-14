import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Production origin and official OAuth callback URL configured for EventFlow
export const PRODUCTION_ORIGIN = 'https://eventflow.kre8link.com';
export const PRODUCTION_OAUTH_REDIRECT_URL = 'https://eventflow.kre8link.com/auth/callback';

// Verified EventFlow Supabase project credentials for automatic client initialization
export const DEFAULT_SUPABASE_URL = 'https://adcurnxwwcyodywkqwnr.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_dadNxKSzFgViQMdalGW8XQ_TlxYADZV';

/**
 * Safe accessor for environment variables across Vite import.meta, process.env, and runtime window
 */
const getEnvVar = (key: string): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return String(import.meta.env[key]).trim();
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return String(process.env[key]).trim();
  }
  if (typeof window !== 'undefined') {
    const win = window as unknown as Record<string, unknown>;
    if (win[key]) return String(win[key]).trim();
    const envObj = win.__ENV__ as Record<string, string> | undefined;
    if (envObj && envObj[key]) return String(envObj[key]).trim();
  }
  return '';
};

/**
 * Sanitizes Supabase URL, stripping any accidental trailing keys or quotes.
 */
export const sanitizeSupabaseUrl = (raw: string): string => {
  if (!raw) return '';
  const match = raw.match(/https?:\/\/[^\s"'`]+/);
  if (match) {
    return match[0].replace(/[,;]+$/, '').trim();
  }
  return raw.replace(/["']/g, '').trim();
};

/**
 * Sanitizes Supabase Anon/Publishable Key, stripping variable names or quotes.
 */
export const sanitizeSupabaseKey = (raw: string): string => {
  if (!raw) return '';
  let cleaned = raw.trim();
  if (cleaned.includes('=')) {
    const parts = cleaned.split('=');
    cleaned = parts[parts.length - 1];
  }
  return cleaned.replace(/["'`;]/g, '').trim();
};

/**
 * Returns the configured Supabase Project URL.
 * Prioritizes standard Vite env vars (VITE_SUPABASE_URL), with fallback to verified project URL.
 */
export const getSupabaseUrl = (): string => {
  const envVal = getEnvVar('VITE_SUPABASE_URL') || getEnvVar('SUPABASE_URL');
  const cleanedEnv = sanitizeSupabaseUrl(envVal);
  if (
    cleanedEnv &&
    !cleanedEnv.includes('placeholder') &&
    !cleanedEnv.includes('your-project') &&
    cleanedEnv.startsWith('http')
  ) {
    return cleanedEnv;
  }
  return DEFAULT_SUPABASE_URL;
};

/**
 * Returns the configured Supabase Anon / Publishable Key.
 * Prioritizes standard Vite env vars (VITE_SUPABASE_ANON_KEY, VITE_SUPABASE_PUBLISHABLE_KEY),
 * with fallback to verified project key.
 */
export const getSupabaseAnonKey = (): string => {
  const envVal =
    getEnvVar('VITE_SUPABASE_ANON_KEY') ||
    getEnvVar('VITE_SUPABASE_PUBLISHABLE_KEY') ||
    getEnvVar('SUPABASE_ANON_KEY');
  const cleanedEnv = sanitizeSupabaseKey(envVal);
  if (
    cleanedEnv &&
    !cleanedEnv.includes('placeholder') &&
    !cleanedEnv.includes('your-anon') &&
    cleanedEnv.length > 15
  ) {
    return cleanedEnv;
  }
  return DEFAULT_SUPABASE_ANON_KEY;
};

/**
 * Checks whether Supabase project credentials are validly supplied.
 */
export const isSupabaseConfigured = (): boolean => {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) return false;
  try {
    const parsed = new URL(url);
    return Boolean(
      parsed.protocol.startsWith('http') &&
        parsed.hostname &&
        !url.includes('placeholder') &&
        !url.includes('your-project') &&
        key.length > 15
    );
  } catch {
    return false;
  }
};

/**
 * Determines the appropriate OAuth redirect URL based on environment.
 * Production: https://eventflow.kre8link.com/auth/callback
 * Development / Preview: current origin + /auth/callback
 */
export const getOAuthRedirectUrl = (): string => {
  // 1. Explicit override via environment variable if defined
  const explicitRedirect = getEnvVar('VITE_AUTH_REDIRECT_URL');
  if (explicitRedirect) {
    if (explicitRedirect.includes('/auth/callback')) {
      return explicitRedirect;
    }
    return `${explicitRedirect.replace(/\/$/, '')}/auth/callback`;
  }

  // 2. In browser runtime:
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    // On the production domain
    if (origin.includes('eventflow.kre8link.com')) {
      return PRODUCTION_OAUTH_REDIRECT_URL;
    }
    // In local development or AI Studio preview container
    if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('.run.app')) {
      return `${origin}/auth/callback`;
    }
  }

  // 3. Default fallback to production redirect URL
  return PRODUCTION_OAUTH_REDIRECT_URL;
};

// Singleton Supabase Client
let activeClient: SupabaseClient | null = null;

const initClient = (): SupabaseClient | null => {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) return null;
  try {
    return createClient(url, key, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    });
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
};

activeClient = initClient();

export const supabase: SupabaseClient | null = activeClient;

export const getSupabase = (): SupabaseClient | null => {
  if (!activeClient) {
    activeClient = initClient();
  }
  return activeClient;
};

export const getSupabaseConfig = () => ({
  url: getSupabaseUrl(),
  hasAnonKey: Boolean(getSupabaseAnonKey()),
  isConfigured: isSupabaseConfigured(),
  redirectUrl: getOAuthRedirectUrl(),
  productionRedirectUrl: PRODUCTION_OAUTH_REDIRECT_URL,
});
