import {
  PRODUCTION_OAUTH_REDIRECT_URL,
  getOAuthRedirectUrl,
  isSupabaseConfigured,
} from '../services/supabaseClient';
import { authService } from '../services/authService';
import { User } from '@supabase/supabase-js';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

console.log('--- RUNNING SUPABASE GOOGLE AUTH TEST SUITE ---\n');

// 1. Production OAuth Redirect URL
{
  assert(
    PRODUCTION_OAUTH_REDIRECT_URL === 'https://eventflow.kre8link.com/auth/callback',
    `Production redirect URL matches https://eventflow.kre8link.com/auth/callback (got ${PRODUCTION_OAUTH_REDIRECT_URL})`
  );
  const defaultRedirect = getOAuthRedirectUrl();
  assert(
    defaultRedirect === 'https://eventflow.kre8link.com/auth/callback',
    `Default getOAuthRedirectUrl() returns production URL in server/build context (got ${defaultRedirect})`
  );
}

// 2. Configuration verification
{
  // When no env vars are injected, isSupabaseConfigured should safely return false without throwing
  const isConfigured = isSupabaseConfigured();
  assert(typeof isConfigured === 'boolean', `isSupabaseConfigured returns boolean (got ${isConfigured})`);
}

// 3. User mapping for first-time Google sign-in
{
  const mockSupabaseUser: User = {
    id: 'google-usr-test-12345',
    app_metadata: { provider: 'google' },
    user_metadata: {
      full_name: 'Adekunle Olaomo',
      name: 'Adekunle Olaomo',
      avatar_url: 'https://lh3.googleusercontent.com/a/test-avatar',
      email: 'adekunleolaomo@gmail.com',
    },
    aud: 'authenticated',
    created_at: '2026-10-14T10:00:00Z',
    email: 'adekunleolaomo@gmail.com',
    role: 'authenticated',
    updated_at: '2026-10-14T10:00:00Z',
  };

  const mapped = authService.mapSupabaseUserToAuthUser(mockSupabaseUser);
  assert(mapped.id === 'google-usr-test-12345', `Mapped user has correct Supabase ID (got ${mapped.id})`);
  assert(mapped.name === 'Adekunle Olaomo', `Mapped user has correct Google name (got ${mapped.name})`);
  assert(mapped.email === 'adekunleolaomo@gmail.com', `Mapped user has lowercase email (got ${mapped.email})`);
  assert(mapped.authProvider === 'google', `Mapped user provider is google (got ${mapped.authProvider})`);
  assert(Boolean(mapped.avatar?.includes('test-avatar')), `Mapped user has Google avatar URL (got ${mapped.avatar})`);
  assert(mapped.role === 'director', `Mapped user default role is director (got ${mapped.role})`);
}

// 4. Returning user preserves customized metadata
{
  const returningUser: User = {
    id: 'google-usr-test-12345',
    app_metadata: { provider: 'google' },
    user_metadata: {
      full_name: 'Adekunle Olaomo (Updated)',
      avatar_url: 'https://lh3.googleusercontent.com/a/new-avatar',
      email: 'adekunleolaomo@gmail.com',
    },
    aud: 'authenticated',
    created_at: '2026-10-14T10:00:00Z',
    email: 'adekunleolaomo@gmail.com',
    role: 'authenticated',
    updated_at: '2026-10-14T11:00:00Z',
  };

  const mappedReturning = authService.mapSupabaseUserToAuthUser(returningUser);
  assert(
    mappedReturning.organization === 'EventFlow Productions',
    `Returning user preserves organization (got ${mappedReturning.organization})`
  );
  assert(mappedReturning.role === 'director', `Returning user preserves role (got ${mappedReturning.role})`);
}

// 5. User CSV export includes Google users
{
  const csv = authService.exportUsersAsCSV();
  assert(csv.includes('Full Name,Email Address'), 'CSV headers exist');
  assert(csv.includes('GOOGLE'), 'CSV includes Google provider');
  assert(csv.includes('adekunleolaomo@gmail.com'), 'CSV includes user email');
}

console.log('--- ALL AUTH TEST CASES PASSED SUCCESSFULLY! ---');
