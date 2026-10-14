import fs from 'fs';
import path from 'path';
import { auditService } from '../services/auditService';
import { AuthEventType, AuthErrorCategory } from '../types/audit';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
}

async function runAuditTests() {
  console.log('\n--- RUNNING PRODUCTION AUTHENTICATION AUDIT LOGGING TEST SUITE ---\n');

  // Clear any existing local test state
  auditService.clearLocalLogs();

  // =========================================================================
  // TEST 1: Registration Event Logging
  // =========================================================================
  const regResult = await auditService.logEvent({
    event_type: 'registration',
    provider: 'google',
    user_id: 'usr-test-reg-uuid-1234',
    user_email: 'firsttime.director@eventflow.app',
    correlation_id: 'corr-reg-101',
  });

  assert(regResult.success === true, 'Registration event logged successfully');
  assert(Boolean(regResult.id), 'Registration event returns valid ID');

  const logsAfterReg = await auditService.getAuditLogs();
  const regEntry = logsAfterReg.find((l) => l.event_type === 'registration');
  assert(Boolean(regEntry), 'Registration entry exists in audit store');
  assert(regEntry?.provider === 'google', 'Registration provider is Google');
  assert(regEntry?.user_email === 'firsttime.director@eventflow.app', 'Registration email matches');
  assert(Boolean(regEntry?.occurred_at), 'Registration timestamp is generated');

  // =========================================================================
  // TEST 2: Successful Login Logging
  // =========================================================================
  const loginResult = await auditService.logEvent({
    event_type: 'login_success',
    provider: 'google',
    user_id: 'usr-test-reg-uuid-1234',
    user_email: 'firsttime.director@eventflow.app',
    correlation_id: 'corr-login-202',
  });

  assert(loginResult.success === true, 'Login success event logged successfully');
  const logsAfterLogin = await auditService.getAuditLogs();
  const loginEntry = logsAfterLogin.find((l) => l.event_type === 'login_success');
  assert(Boolean(loginEntry), 'Login success entry exists in audit store');
  assert(loginEntry?.correlation_id === 'corr-login-202', 'Login correlation ID preserved');

  // =========================================================================
  // TEST 3: Logout Logging
  // =========================================================================
  const logoutResult = await auditService.logEvent({
    event_type: 'logout',
    provider: 'google',
    user_id: 'usr-test-reg-uuid-1234',
    user_email: 'firsttime.director@eventflow.app',
    correlation_id: 'corr-logout-303',
  });

  assert(logoutResult.success === true, 'Logout event logged successfully');
  const logsAfterLogout = await auditService.getAuditLogs();
  const logoutEntry = logsAfterLogout.find((l) => l.event_type === 'logout');
  assert(Boolean(logoutEntry), 'Logout entry exists in audit store');
  assert(logoutEntry?.event_type === 'logout', 'Event type is logout');

  // =========================================================================
  // TEST 4: Failed Login Logging (Sanitized without credentials)
  // =========================================================================
  const failResult = await auditService.logEvent({
    event_type: 'login_failure',
    provider: 'email',
    user_email: 'unauthorized.user@test.org',
    error_category: 'invalid_credentials',
    correlation_id: 'corr-fail-404',
  });

  assert(failResult.success === true, 'Failed login attempt logged successfully');
  const logsAfterFail = await auditService.getAuditLogs();
  const failEntry = logsAfterFail.find((l) => l.event_type === 'login_failure');
  assert(Boolean(failEntry), 'Failure entry exists in audit store');
  assert(failEntry?.error_category === 'invalid_credentials', 'Error category sanitized to invalid_credentials');
  assert(!('password' in (failEntry as any)), 'No password field in audit log');

  // =========================================================================
  // TEST 5: Error Category Sanitization
  // =========================================================================
  assert(
    auditService.sanitizeErrorCategory('Access denied by Google auth: access_denied') === 'oauth_cancelled',
    'Maps access_denied to oauth_cancelled'
  );
  assert(
    auditService.sanitizeErrorCategory('Invalid login credentials provided: wrong password secret123') ===
      'invalid_credentials',
    'Maps password errors to invalid_credentials without capturing password'
  );
  assert(
    auditService.sanitizeErrorCategory('Failed to exchange authorization code for session') === 'oauth_exchange_failed',
    'Maps code exchange errors to oauth_exchange_failed'
  );
  assert(
    auditService.sanitizeErrorCategory('NetworkError when attempting to fetch resource') === 'network_error',
    'Maps network errors to network_error'
  );
  assert(
    auditService.sanitizeErrorCategory('Random unmapped error xyz') === 'unknown_failure',
    'Maps unknown strings safely to unknown_failure'
  );

  // =========================================================================
  // TEST 6: Event De-duplication Protection
  // =========================================================================
  const countBeforeDedup = (await auditService.getAuditLogs()).length;
  // Trigger duplicate login_success for the same user within dedup window
  await auditService.logEvent({
    event_type: 'login_success',
    provider: 'google',
    user_id: 'usr-test-reg-uuid-1234',
    user_email: 'firsttime.director@eventflow.app',
  });
  const countAfterDedup = (await auditService.getAuditLogs()).length;
  assert(
    countBeforeDedup === countAfterDedup,
    `Duplicate login_success within 60s is de-duplicated (before: ${countBeforeDedup}, after: ${countAfterDedup})`
  );

  // =========================================================================
  // TEST 7: CSV Export Formatting
  // =========================================================================
  const allLogs = await auditService.getAuditLogs();
  const csv = auditService.exportLogsAsCSV(allLogs);
  assert(csv.includes('Event Type'), 'CSV header includes Event Type');
  assert(csv.includes('Correlation ID'), 'CSV header includes Correlation ID');
  assert(csv.includes('Error Category'), 'CSV header includes Error Category');
  assert(csv.includes('REGISTRATION'), 'CSV includes REGISTRATION record');
  assert(csv.includes('LOGIN_SUCCESS'), 'CSV includes LOGIN_SUCCESS record');
  assert(csv.includes('LOGOUT'), 'CSV includes LOGOUT record');
  assert(csv.includes('LOGIN_FAILURE'), 'CSV includes LOGIN_FAILURE record');

  // =========================================================================
  // TEST 8: SQL Migration Script Verification
  // =========================================================================
  const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/20261014_auth_audit_logs.sql');
  assert(fs.existsSync(migrationPath), 'SQL migration file exists at supabase/migrations/20261014_auth_audit_logs.sql');

  const migrationContent = fs.readFileSync(migrationPath, 'utf-8');
  assert(migrationContent.includes('CREATE TABLE IF NOT EXISTS public.auth_audit_logs'), 'SQL defines public.auth_audit_logs');
  assert(migrationContent.includes('ALTER TABLE public.auth_audit_logs ENABLE ROW LEVEL SECURITY'), 'SQL enables RLS');
  assert(migrationContent.includes('is_admin_or_staff()'), 'SQL implements is_admin_or_staff authorization function');
  assert(migrationContent.includes('CREATE TRIGGER on_auth_user_created_audit'), 'SQL registers automatic trigger on auth.users');
  assert(migrationContent.includes('CREATE OR REPLACE FUNCTION public.log_auth_event'), 'SQL implements trusted log_auth_event RPC function');
  assert(!migrationContent.includes('CREATE POLICY') || !migrationContent.includes('FOR UPDATE'), 'Immutability verified: No UPDATE policy');
  assert(!migrationContent.includes('CREATE POLICY') || !migrationContent.includes('FOR DELETE'), 'Immutability verified: No DELETE policy');

  console.log('\n--- ALL AUDIT LOGGING TESTS PASSED SUCCESSFULLY! ---\n');
}

runAuditTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
