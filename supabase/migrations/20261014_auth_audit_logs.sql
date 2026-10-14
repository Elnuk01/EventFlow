-- ==============================================================================
-- EVENTFLOW: PRODUCTION AUTHENTICATION AUDIT LOGGING SCHEMA & RLS POLICIES
-- Target Supabase Project: https://adcurnxwwcyodywkqwnr.supabase.co
-- Migration File: supabase/migrations/20261014_auth_audit_logs.sql
-- ==============================================================================

-- 1. Ensure pgcrypto / uuid extension exists
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Optional: Bootstrap public.profiles if not existing yet (for role checks)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  name text,
  organization text DEFAULT 'EventFlow Productions',
  role text DEFAULT 'director',
  avatar text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Public profiles are viewable by authenticated users'
  ) THEN
    CREATE POLICY "Public profiles are viewable by authenticated users"
      ON public.profiles FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert/update their own profile'
  ) THEN
    CREATE POLICY "Users can insert/update their own profile"
      ON public.profiles FOR ALL TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- 3. Create public.auth_audit_logs table
CREATE TABLE IF NOT EXISTS public.auth_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text,
  event_type text NOT NULL CHECK (event_type IN ('registration', 'login_success', 'logout', 'login_failure')),
  provider text CHECK (provider IN ('google', 'email', 'oauth', 'saml') OR provider IS NULL),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  correlation_id text,
  error_category text CHECK (
    error_category IN (
      'invalid_credentials',
      'user_not_found',
      'access_denied',
      'oauth_cancelled',
      'oauth_exchange_failed',
      'session_expired',
      'rate_limited',
      'network_error',
      'unknown_failure'
    ) OR error_category IS NULL
  ),
  client_platform text
);

-- 4. Create optimal indexes for audit querying and analytics
CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_occurred_at
  ON public.auth_audit_logs (occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_event_type
  ON public.auth_audit_logs (event_type);

CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_user_id
  ON public.auth_audit_logs (user_id);

CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_correlation_id
  ON public.auth_audit_logs (correlation_id);

CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_provider
  ON public.auth_audit_logs (provider);

-- 5. Helper function to check if the current caller is an authorized admin or staff
CREATE OR REPLACE FUNCTION public.is_admin_or_staff()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_email text;
  user_role text;
BEGIN
  -- 1. App Owner / Designated Director
  current_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  IF current_email = 'adekunleolaomo@gmail.com' THEN
    RETURN true;
  END IF;

  -- 2. Check JWT app_metadata for admin role
  IF coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('admin', 'staff', 'director') THEN
    RETURN true;
  END IF;

  -- 3. Check public.profiles for director, admin, or staff
  IF auth.uid() IS NOT NULL THEN
    SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
    IF user_role IN ('admin', 'staff', 'director') THEN
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$$;

-- 6. Enable Row Level Security (RLS) on public.auth_audit_logs
ALTER TABLE public.auth_audit_logs ENABLE ROW LEVEL SECURITY;

-- Remove any old policies to avoid collisions
DROP POLICY IF EXISTS "Admins and authorized staff can view audit logs" ON public.auth_audit_logs;
DROP POLICY IF EXISTS "Authenticated users can insert own login and logout audit events" ON public.auth_audit_logs;

-- Read policy: ONLY authorized administrators and staff can view logs
CREATE POLICY "Admins and authorized staff can view audit logs"
  ON public.auth_audit_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin_or_staff());

-- Insert policy: Authenticated users can insert their own confirmed login_success or logout events
CREATE POLICY "Authenticated users can insert own login and logout audit events"
  ON public.auth_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (user_id = auth.uid() OR user_id IS NULL)
    AND event_type IN ('login_success', 'logout')
  );

-- STRICT IMMUTABILITY: No UPDATE or DELETE policies are granted!
-- Audit logs can never be altered or deleted by any user or administrator through the API.

-- 7. Trusted SECURITY DEFINER RPC function for recording audit events
-- Supports registration, login_success, logout, and sanitized login_failure
CREATE OR REPLACE FUNCTION public.log_auth_event(
  p_event_type text,
  p_provider text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_user_email text DEFAULT NULL,
  p_correlation_id text DEFAULT NULL,
  p_error_category text DEFAULT NULL,
  p_client_platform text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_user_email text;
  v_sanitized_error text;
  v_new_id uuid;
BEGIN
  -- Validate event_type constraint
  IF p_event_type NOT IN ('registration', 'login_success', 'logout', 'login_failure') THEN
    RAISE EXCEPTION 'Invalid event_type: %', p_event_type;
  END IF;

  -- Sanitize error category to strict allowed enum
  IF p_event_type = 'login_failure' THEN
    IF p_error_category IN (
      'invalid_credentials',
      'user_not_found',
      'access_denied',
      'oauth_cancelled',
      'oauth_exchange_failed',
      'session_expired',
      'rate_limited',
      'network_error',
      'unknown_failure'
    ) THEN
      v_sanitized_error := p_error_category;
    ELSE
      v_sanitized_error := 'unknown_failure';
    END IF;
  ELSE
    v_sanitized_error := NULL;
  END IF;

  -- Bind authenticated user_id if present
  IF auth.uid() IS NOT NULL THEN
    v_user_id := auth.uid();
  ELSE
    v_user_id := p_user_id;
  END IF;

  -- Normalize email if provided (strip whitespace and lowercase)
  IF p_user_email IS NOT NULL AND length(trim(p_user_email)) > 0 THEN
    v_user_email := lower(trim(p_user_email));
  ELSE
    v_user_email := lower(coalesce(auth.jwt() ->> 'email', ''));
    IF v_user_email = '' THEN
      v_user_email := NULL;
    END IF;
  END IF;

  -- Insert audit log record
  INSERT INTO public.auth_audit_logs (
    user_id,
    user_email,
    event_type,
    provider,
    occurred_at,
    correlation_id,
    error_category,
    client_platform
  ) VALUES (
    v_user_id,
    v_user_email,
    p_event_type,
    coalesce(p_provider, 'google'),
    now(),
    p_correlation_id,
    v_sanitized_error,
    p_client_platform
  ) RETURNING id INTO v_new_id;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_new_id,
    'event_type', p_event_type,
    'occurred_at', now()
  );
END;
$$;

-- Grant execution to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION public.log_auth_event TO anon, authenticated;

-- 8. Secure Database Trigger for first-time account registration in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user_registration_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_provider text;
  v_corr_id text;
BEGIN
  -- Determine provider from Supabase auth metadata
  v_provider := coalesce(
    NEW.raw_app_meta_data ->> 'provider',
    NEW.app_metadata ->> 'provider',
    'google'
  );

  v_corr_id := 'reg-' || substr(md5(NEW.id::text || coalesce(NEW.created_at, now())::text), 1, 16);

  -- Idempotent insert: only insert if registration event does not already exist for this user
  INSERT INTO public.auth_audit_logs (
    user_id,
    user_email,
    event_type,
    provider,
    occurred_at,
    correlation_id,
    error_category,
    client_platform
  )
  SELECT
    NEW.id,
    lower(coalesce(NEW.email, '')),
    'registration',
    v_provider,
    coalesce(NEW.created_at, now()),
    v_corr_id,
    NULL,
    'auth.users database trigger'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.auth_audit_logs
    WHERE user_id = NEW.id AND event_type = 'registration'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_audit ON auth.users;
CREATE TRIGGER on_auth_user_created_audit
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_registration_audit();
