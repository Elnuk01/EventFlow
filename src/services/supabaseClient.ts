import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Production URL configured for EventFlow
export const PRODUCTION_ORIGIN = 'https://eventflow.kre8link.com';
export const PRODUCTION_OAUTH_REDIRECT_URL = 'https://eventflow.kre8link.com/auth/callback';

// Environment variables for Supabase (Vite client-side environment variables)
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

const supabaseUrl =
  getEnvVar('VITE_SUPABASE_URL') ||
  getEnvVar('SUPABASE_URL') ||
  '';

const supabaseAnonKey =
  getEnvVar('VITE_SUPABASE_ANON_KEY') ||
  getEnvVar('VITE_SUPABASE_PUBLISHABLE_KEY') ||
  getEnvVar('SUPABASE_ANON_KEY') ||
  '';

/**
 * Checks whether Supabase project credentials are validly supplied.
 */
export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
      supabaseAnonKey &&
      !supabaseUrl.includes('placeholder') &&
      !supabaseUrl.includes('your-project') &&
      supabaseUrl.startsWith('http')
  );
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
    return explicitRedirect;
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

/**
 * Singleton Supabase client instance initialized with PKCE flow for OAuth security.
 * The anon key is safe for client-side use; service role keys are strictly excluded.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    })
  : null;

export const getSupabaseConfig = () => ({
  url: supabaseUrl,
  hasAnonKey: Boolean(supabaseAnonKey),
  isConfigured: isSupabaseConfigured(),
  redirectUrl: getOAuthRedirectUrl(),
  productionRedirectUrl: PRODUCTION_OAUTH_REDIRECT_URL,
});
