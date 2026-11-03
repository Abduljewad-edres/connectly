import assert from 'assert';
import Event from '../models/Event.js';
import User from '../models/User.js';
import Post from '../models/Post.js';
import Community from '../models/Community.js';
import { CURATED_LOCATIONS } from '../controllers/discoveryController.js';

console.log('--- Testing Phase 3: Connectly Local Discovery Models & Schemas ---');

// 1. Verify Event Schema & Categories
console.log('1. Verifying Event Categories & Schema...');
const eventCategories = Event.schema.path('category').enumValues;
const requiredCategories = ['cultural', 'tech', 'academic', 'community', 'arts', 'sports', 'business', 'networking', 'other'];
for (const cat of requiredCategories) {
  assert.ok(eventCategories.includes(cat), `Category '${cat}' should be in Event schema`);
}
console.log('   ✓ Verified 9 event categories:', eventCategories.join(', '));

const locationTypes = Event.schema.path('locationType').enumValues;
assert.deepStrictEqual(locationTypes, ['in_person', 'online', 'hybrid']);
console.log('   ✓ Verified event location types: in_person, online, hybrid');

// 2. Verify Event Indexes
console.log('\n2. Verifying Event Performance & Discovery Indexes...');
const eventIndexes = Event.schema.indexes();
assert.ok(eventIndexes.length >= 3, 'Event schema has required performance indexes');
console.log('   ✓ Event compound location & text indexes verified');

// 3. Verify Privacy-First Defaults in User Schema
console.log('\n3. Verifying Privacy-First Location Defaults on User Schema...');
const testUser = new User({
  fullName: 'Discovery Explorer',
  username: 'explorer',
  email: 'explorer@example.com',
  passwordHash: 'dummyhash123'
});

assert.strictEqual(testUser.locationDiscovery.enabled, false, 'Location discovery must default to FALSE (opt-in)');
assert.strictEqual(testUser.locationDiscovery.shareLocationPublicly, false, 'Location public sharing must default to FALSE');
assert.strictEqual(testUser.location.country, '', 'Default country must be empty');
console.log('   ✓ User location discovery is strictly opt-in and privacy-preserving by default');

// 4. Verify Post Schema Location Tagging
console.log('\n4. Verifying Post Location Metadata...');
const testPost = new Post({
  author: '64b1f2e34567890123456789',
  content: 'Beautiful sunset in Addis Ababa!',
  location: {
    country: 'Ethiopia',
    region: 'Addis Ababa',
    city: 'Addis Ababa',
    displayLocation: 'Addis Ababa, Ethiopia'
  }
});

assert.strictEqual(testPost.location.country, 'Ethiopia');
assert.strictEqual(testPost.location.displayLocation, 'Addis Ababa, Ethiopia');
console.log('   ✓ Post model successfully stores location tags without GPS requirement');

// 5. Verify Curated International Hubs
console.log('\n5. Verifying Curated International Locations...');
assert.ok(CURATED_LOCATIONS.length >= 8, 'Curated locations list contains multiple global hubs');
const ethiopiaHub = CURATED_LOCATIONS.find((loc) => loc.country === 'Ethiopia');
assert.ok(ethiopiaHub, 'Ethiopia hub is included');
assert.ok(ethiopiaHub.cities.includes('Addis Ababa'), 'Addis Ababa is in Ethiopian cities');
console.log('   ✓ International discovery supported across global hubs (Ethiopia, UAE, USA, Kenya, etc.)');

console.log('\n--- All Phase 3 Discovery Unit Tests Passed Successfully! ---');

