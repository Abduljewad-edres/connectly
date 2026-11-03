import assert from 'assert';
import LiveSpace from '../models/LiveSpace.js';
import Report from '../models/Report.js';
import Notification from '../models/Notification.js';

console.log('--- Testing Phase 4: Connectly Live Spaces Models & Schemas ---');

// 1. Verify Topics & Statuses
console.log('1. Verifying LiveSpace Topics & Statuses...');
const topics = LiveSpace.schema.path('topic').enumValues;
const requiredTopics = ['general', 'tech', 'culture', 'education', 'business', 'music', 'social', 'languages', 'careers'];
for (const t of requiredTopics) {
  assert.ok(topics.includes(t), `Topic '${t}' should be supported`);
}
console.log('   ✓ Supported 9 discussion topics:', topics.join(', '));

const statuses = LiveSpace.schema.path('status').enumValues;
assert.deepStrictEqual(statuses, ['scheduled', 'live', 'ended']);
console.log('   ✓ Verified room statuses: scheduled, live, ended');

// 2. Verify Participant Roles
console.log('\n2. Verifying Participant Roles...');
const participantSchema = LiveSpace.schema.path('participants').schema;
const roles = participantSchema.path('role').enumValues;
assert.deepStrictEqual(roles, ['host', 'co_host', 'speaker', 'listener']);
console.log('   ✓ Verified participant roles: host, co_host, speaker, listener');

// 3. Verify Report & Notification Integration
console.log('\n3. Verifying Report & Notification Models...');
const reportTargetTypes = Report.schema.path('targetType').enumValues;
assert.ok(reportTargetTypes.includes('space'), "Report model must include 'space' targetType");
console.log('   ✓ Report model supports reporting live spaces for moderation');

const notificationTypes = Notification.schema.path('type').enumValues;
assert.ok(notificationTypes.includes('live_space'), "Notification model must include 'live_space' type");
console.log('   ✓ Notification model supports follower live space alerts');

// 4. Verify LiveSpace Validation & Indexes
console.log('\n4. Verifying Schema Validation & Performance Indexes...');
const testSpace = new LiveSpace({
  title: 'Global Tech & Cultural Exchange',
  description: 'Discussing multilingual social networks and AI.',
  topic: 'tech',
  host: '64b1f2e34567890123456789',
  participants: [
    {
      user: '64b1f2e34567890123456789',
      role: 'host',
      isMuted: false
    }
  ]
});

const err = testSpace.validateSync();
assert.strictEqual(err, undefined);
assert.strictEqual(testSpace.status, 'live');
assert.strictEqual(testSpace.isPrivate, false);
assert.strictEqual(testSpace.participants[0].role, 'host');
assert.strictEqual(testSpace.participants[0].isMuted, false);

const indexes = LiveSpace.schema.indexes();
assert.ok(indexes.length >= 3, 'LiveSpace has required indexes');
console.log('   ✓ LiveSpace schema validation and indexes verified');

console.log('\n--- All Phase 4 Live Spaces Unit Tests Passed Successfully! ---');

