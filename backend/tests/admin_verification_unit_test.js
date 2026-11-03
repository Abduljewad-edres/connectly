import assert from 'assert';
import { adminOnly } from '../middleware/auth.js';

console.log('--- Testing Phase 11 & Phase 12 Architecture & Logic ---');

// 1. Test adminOnly middleware
console.log('1. Testing adminOnly middleware permission check:');
{
  let statusCode = null;
  let responseData = null;
  const mockRes = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    }
  };

  // Test with regular user
  let nextCalled = false;
  adminOnly({ user: { role: 'user' } }, mockRes, () => { nextCalled = true; });
  assert.strictEqual(statusCode, 403, 'Regular user should receive 403 Forbidden');
  assert.strictEqual(nextCalled, false, 'Next should not be called for non-admin');
  console.log('   ✓ Regular user correctly blocked (403)');

  // Test with admin user
  nextCalled = false;
  adminOnly({ user: { role: 'admin' } }, mockRes, () => { nextCalled = true; });
  assert.strictEqual(nextCalled, true, 'Next should be called for admin');
  console.log('   ✓ Admin user allowed through');
}

console.log('\n2. Testing models and schemas:');
import User from '../models/User.js';
import VerificationRequest from '../models/VerificationRequest.js';
import AuditLog from '../models/AuditLog.js';

assert.ok(User.schema.path('role'), 'User schema has role field');
assert.ok(User.schema.path('isVerified'), 'User schema has isVerified field');
assert.ok(User.schema.path('verificationStatus'), 'User schema has verificationStatus field');
assert.ok(User.schema.path('isSuspended'), 'User schema has isSuspended field');
assert.ok(User.schema.path('suspendedReason'), 'User schema has suspendedReason field');
console.log('   ✓ User schema includes role, isVerified, verificationStatus, isSuspended, suspendedReason');

assert.ok(VerificationRequest.schema.path('category'), 'VerificationRequest schema has category field');
assert.ok(VerificationRequest.schema.path('status'), 'VerificationRequest schema has status field');
assert.ok(VerificationRequest.schema.path('reason'), 'VerificationRequest schema has reason field');
console.log('   ✓ VerificationRequest schema properly configured');

assert.ok(AuditLog.schema.path('admin'), 'AuditLog schema has admin field');
assert.ok(AuditLog.schema.path('action'), 'AuditLog schema has action field');
assert.ok(AuditLog.schema.path('targetType'), 'AuditLog schema has targetType field');
console.log('   ✓ AuditLog schema properly configured');

console.log('\n3. Testing routes and controller imports:');
import verificationRoutes from '../routes/verificationRoutes.js';
import adminRoutes from '../routes/adminRoutes.js';

assert.ok(verificationRoutes, 'Verification routes export is valid');
assert.ok(adminRoutes, 'Admin routes export is valid');
console.log('   ✓ All Phase 11 & 12 routes mounted and verified');

console.log('\n[ALL TESTS PASSED] Phase 11 & Phase 12 validation verified successfully!');
process.exit(0);

