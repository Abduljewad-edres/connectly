import express from 'express';
import assert from 'assert';
import discoveryRoutes from '../routes/discoveryRoutes.js';
import Event from '../models/Event.js';

async function runPhase3IntegrationTests() {
  console.log('--- Phase 3: Connectly Local Discovery API & Integration Test ---\n');

  const app = express();
  app.use(express.json());
  app.use('/api/discovery', discoveryRoutes);

  const server = app.listen(0, async () => {
    const port = server.address().port;
    const baseUrl = `http://localhost:${port}/api/discovery`;

    try {
      // 1. GET /api/discovery/locations
      console.log('1. Testing GET /api/discovery/locations...');
      const locRes = await fetch(`${baseUrl}/locations`);
      assert.strictEqual(locRes.status, 200);
      const locData = await locRes.json();
      assert.strictEqual(locData.success, true);
      assert.ok(locData.curated.length > 5);
      console.log('   ✓ Locations catalogue returned successfully with curated hubs');

      // 2. GET /api/discovery/feed (public / guest access)
      console.log('\n2. Testing GET /api/discovery/feed (Guest/Public mode)...');
      const feedRes = await fetch(`${baseUrl}/feed?country=Ethiopia&city=Addis+Ababa`);
      assert.strictEqual(feedRes.status, 200);
      const feedData = await feedRes.json();
      assert.strictEqual(feedData.success, true);
      assert.strictEqual(feedData.currentLocation.country, 'Ethiopia');
      assert.strictEqual(feedData.currentLocation.city, 'Addis Ababa');
      assert.ok(Array.isArray(feedData.feed.events));
      assert.ok(Array.isArray(feedData.feed.posts));
      assert.ok(Array.isArray(feedData.feed.communities));
      console.log('   ✓ Feed returned localized events, posts, and communities structure');

      // 3. GET /api/discovery/events
      console.log('\n3. Testing GET /api/discovery/events query...');
      const eventsRes = await fetch(`${baseUrl}/events?category=tech&timeframe=upcoming`);
      assert.strictEqual(eventsRes.status, 200);
      const eventsData = await eventsRes.json();
      assert.strictEqual(eventsData.success, true);
      assert.ok(Array.isArray(eventsData.events));
      assert.strictEqual(eventsData.pagination.page, 1);
      console.log('   ✓ Discovery events filtered by category & timeframe');

      // 4. Test Security: Protected Routes reject unauthenticated calls with 401
      console.log('\n4. Testing Route Security & Auth Guards...');
      
      const unauthEventPost = await fetch(`${baseUrl}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Tech Summit' })
      });
      assert.strictEqual(unauthEventPost.status, 401);
      console.log('   ✓ POST /api/discovery/events rejects unauthenticated calls (401)');

      const unauthAttend = await fetch(`${baseUrl}/events/64b1f2e34567890123456789/attend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'going' })
      });
      assert.strictEqual(unauthAttend.status, 401);
      console.log('   ✓ POST /api/discovery/events/:id/attend rejects unauthenticated calls (401)');

      const unauthPrefs = await fetch(`${baseUrl}/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationDiscovery: { enabled: true } })
      });
      assert.strictEqual(unauthPrefs.status, 401);
      console.log('   ✓ PUT /api/discovery/preferences rejects unauthenticated calls (401)');

      // 5. Schema Validation on Event Model
      console.log('\n5. Testing Event Validation Constraints...');
      const validEvent = new Event({
        title: 'Addis Ababa Global Culture Fest',
        description: 'Celebrating cultural heritage, music, art and technology.',
        category: 'cultural',
        creator: '64b1f2e34567890123456789',
        startDate: new Date(Date.now() + 86400000),
        locationType: 'in_person',
        location: {
          country: 'Ethiopia',
          city: 'Addis Ababa',
          venue: 'Millennium Hall'
        }
      });
      const err = validEvent.validateSync();
      assert.strictEqual(err, undefined);
      assert.strictEqual(validEvent.location.city, 'Addis Ababa');
      assert.strictEqual(validEvent.category, 'cultural');
      console.log('   ✓ Valid event passes all schema constraints');

      console.log('\n=============================================================');
      console.log('✓ ALL PHASE 3 LOCAL DISCOVERY INTEGRATION TESTS PASSED!');
      console.log('=============================================================\n');
    } catch (e) {
      console.error('Phase 3 Integration test failure:', e);
      process.exitCode = 1;
    } finally {
      server.close();
    }
  });
}

runPhase3IntegrationTests();

