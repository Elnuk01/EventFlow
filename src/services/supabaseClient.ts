import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Production URL configured for EventFlow
export const PRODUCTION_ORIGIN = 'https://eventflow.kre8link.com';
export const PRODUCTION_OAUTH_REDIRECT_URL = 'https://eventflow.kre8link.com/auth/callback';

export const STORAGE_URL_KEY = 'eventflow_supabase_url_v1';
export const STORAGE_KEY_KEY = 'eventflow_supabase_anon_key_v1';

// Environment variables helper for Supabase
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
 * Sanitizes Supabase URL, handling accidental pasting of multiple keys or trailing tokens.
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
 * Sanitizes Supabase Anon/Publishable Key, stripping quotes or variable name prefixes.
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
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_URL_KEY);
      const cleanedStored = sanitizeSupabaseUrl(stored || '');
      if (cleanedStored && cleanedStored.startsWith('http')) return cleanedStored;
    } catch {
      // ignore
    }
  }
  return '';
};

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
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_KEY);
      const cleanedStored = sanitizeSupabaseKey(stored || '');
      if (cleanedStored && cleanedStored.length > 15) return cleanedStored;
    } catch {
      // ignore
    }
  }
  return '';
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
 * Development / Preview: current origin + /auth/callback (or production redirect if configured)
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

let activeClient: SupabaseClient | null = null;
export let supabase: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient | null => {
  if (activeClient) return activeClient;
  if (!isSupabaseConfigured()) return null;
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  try {
    activeClient = createClient(url, key, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    });
    supabase = activeClient;
    return activeClient;
  } catch (err) {
    console.error('Error creating Supabase client:', err);
    return null;
  }
};

export const setSupabaseCredentials = (url: string, anonKey: string): boolean => {
  const cleanUrl = sanitizeSupabaseUrl(url);
  const cleanKey = sanitizeSupabaseKey(anonKey);
  if (!cleanUrl.startsWith('http') || cleanKey.length < 15) {
    return false;
  }
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_URL_KEY, cleanUrl);
      localStorage.setItem(STORAGE_KEY_KEY, cleanKey);
    } catch {
      // ignore
    }
  }
  try {
    activeClient = createClient(cleanUrl, cleanKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    });
    supabase = activeClient;
    return true;
  } catch (err) {
    console.error('Error creating client with provided credentials:', err);
    return false;
  }
};

export const clearSupabaseCredentials = (): void => {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_URL_KEY);
      localStorage.removeItem(STORAGE_KEY_KEY);
    } catch {
      // ignore
    }
  }
  activeClient = null;
  supabase = null;
};

if (isSupabaseConfigured()) {
  supabase = getSupabase();
}

export const getSupabaseConfig = () => ({
  url: getSupabaseUrl(),
  hasAnonKey: Boolean(getSupabaseAnonKey()),
  isConfigured: isSupabaseConfigured(),
  redirectUrl: getOAuthRedirectUrl(),
  productionRedirectUrl: PRODUCTION_OAUTH_REDIRECT_URL,
});
