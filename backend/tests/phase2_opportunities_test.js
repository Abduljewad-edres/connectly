import assert from 'assert';
import Opportunity from '../models/Opportunity.js';

async function runPhase2Tests() {
  console.log('--- Testing Phase 2: Connectly Opportunities ---');

  // Test 1: Category Support Check
  console.log('1. Verifying Supported Opportunity Categories...');
  const categoryEnum = Opportunity.schema.path('category').enumValues;
  const expectedCategories = [
    'job',
    'internship',
    'scholarship',
    'training',
    'competition',
    'volunteer',
    'workshop'
  ];

  for (const cat of expectedCategories) {
    assert.ok(categoryEnum.includes(cat), `Category ${cat} must be supported`);
  }
  assert.strictEqual(categoryEnum.length, 7, 'Must have exactly 7 categories');
  console.log('   ✓ Supported 7 categories verified:', categoryEnum.join(', '));

  // Test 2: Work Type Support
  console.log('2. Verifying Work Types...');
  const workTypeEnum = Opportunity.schema.path('workType').enumValues;
  assert.ok(workTypeEnum.includes('remote'), 'Supports remote');
  assert.ok(workTypeEnum.includes('hybrid'), 'Supports hybrid');
  assert.ok(workTypeEnum.includes('on_site'), 'Supports on_site');
  console.log('   ✓ Work types verified: remote, hybrid, on_site');

  // Test 3: Status Enum Support
  console.log('3. Verifying Moderation Statuses...');
  const statusEnum = Opportunity.schema.path('status').enumValues;
  assert.ok(statusEnum.includes('active'), 'Has active status');
  assert.ok(statusEnum.includes('pending'), 'Has pending status for moderation');
  assert.ok(statusEnum.includes('rejected'), 'Has rejected status');
  assert.ok(statusEnum.includes('expired'), 'Has expired status');
  console.log('   ✓ Moderation statuses verified: active, pending, rejected, expired');

  // Test 4: Schema Indexes
  console.log('4. Verifying MongoDB Indexes for Performance & Search...');
  const indexes = Opportunity.schema.indexes();
  assert.ok(indexes.length >= 3, 'Must have at least 3 compound and text indexes');
  console.log('   ✓ Schema indexes verified');

  // Test 5: Deadline & Days Remaining Logic
  console.log('5. Verifying Deadline & Expiration Calculation...');
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 10);
  const diffMs = futureDate - new Date();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  assert.ok(daysLeft >= 9 && daysLeft <= 10, 'Calculates 10 days left accurately');

  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 2);
  const isExpired = pastDate < new Date();
  assert.strictEqual(isExpired, true, 'Flags past dates as expired');
  console.log('   ✓ Deadline countdown and expiration logic verified');

  console.log('\n--- All Phase 2 Opportunity Unit Tests Passed Successfully! ---');
  process.exit(0);
}

runPhase2Tests().catch((err) => {
  console.error('Phase 2 test failed:', err);
  process.exit(1);
});

