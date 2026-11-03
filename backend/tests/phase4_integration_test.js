import express from 'express';
import assert from 'assert';
import liveSpaceRoutes from '../routes/liveSpaceRoutes.js';

async function runPhase4IntegrationTests() {
  console.log('--- Phase 4: Connectly Live Spaces API & Integration Test ---\n');

  const app = express();
  app.use(express.json());
  app.use('/api/spaces', liveSpaceRoutes);

  const server = app.listen(0, async () => {
    const port = server.address().port;
    const baseUrl = `http://localhost:${port}/api/spaces`;

    try {
      // 1. GET /api/spaces (Public feed)
      console.log('1. Testing GET /api/spaces (Public discovery)...');
      const listRes = await fetch(`${baseUrl}?topic=tech&status=all`);
      assert.strictEqual(listRes.status, 200);
      const listData = await listRes.json();
      assert.strictEqual(listData.success, true);
      assert.ok(Array.isArray(listData.spaces));
      assert.strictEqual(listData.pagination.page, 1);
      console.log('   ✓ Retrieved live audio spaces listing with pagination');

      // 2. Auth Protection Guards
      console.log('\n2. Testing Route Security & Auth Guards...');

      const unauthCreate = await fetch(`${baseUrl}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Audio Room' })
      });
      assert.strictEqual(unauthCreate.status, 401);
      console.log('   ✓ POST /api/spaces rejects unauthenticated room creation (401)');

      const unauthJoin = await fetch(`${baseUrl}/64b1f2e34567890123456789/join`, {
        method: 'POST'
      });
      assert.strictEqual(unauthJoin.status, 401);
      console.log('   ✓ POST /api/spaces/:id/join rejects unauthenticated calls (401)');

      const unauthLeave = await fetch(`${baseUrl}/64b1f2e34567890123456789/leave`, {
        method: 'POST'
      });
      assert.strictEqual(unauthLeave.status, 401);
      console.log('   ✓ POST /api/spaces/:id/leave rejects unauthenticated calls (401)');

      const unauthRole = await fetch(`${baseUrl}/64b1f2e34567890123456789/participants/123/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'speaker' })
      });
      assert.strictEqual(unauthRole.status, 401);
      console.log('   ✓ PATCH /api/spaces/:id/participants/:target/role rejects unauthenticated calls (401)');

      const unauthEnd = await fetch(`${baseUrl}/64b1f2e34567890123456789/end`, {
        method: 'POST'
      });
      assert.strictEqual(unauthEnd.status, 401);
      console.log('   ✓ POST /api/spaces/:id/end rejects unauthenticated calls (401)');

      const unauthReport = await fetch(`${baseUrl}/64b1f2e34567890123456789/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'spam' })
      });
      assert.strictEqual(unauthReport.status, 401);
      console.log('   ✓ POST /api/spaces/:id/report rejects unauthenticated calls (401)');

      console.log('\n=============================================================');
      console.log('✓ ALL PHASE 4 LIVE SPACES INTEGRATION TESTS PASSED!');
      console.log('=============================================================\n');
    } catch (e) {
      console.error('Phase 4 Integration test failure:', e);
      process.exitCode = 1;
    } finally {
      server.close();
    }
  });
}

runPhase4IntegrationTests();

