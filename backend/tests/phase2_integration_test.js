import express from 'express';
import assert from 'assert';
import opportunityRoutes from '../routes/opportunityRoutes.js';
import Opportunity from '../models/Opportunity.js';
import Report from '../models/Report.js';

async function runPhase2IntegrationTests() {
  console.log('--- Phase 2: Connectly Opportunities Integration & API Test ---\n');

  // 1. Verify Model Constraints & Integration with Report
  console.log('1. Testing Opportunity & Report Models...');
  const reportSchemaTypes = Report.schema.path('targetType').enumValues;
  assert.ok(reportSchemaTypes.includes('opportunity'), "Report schema must include 'opportunity' targetType");
  console.log('   ✓ Report targetType includes "opportunity"');

  const oppCategories = Opportunity.schema.path('category').enumValues;
  assert.strictEqual(oppCategories.length, 7, 'Opportunity should have 7 categories');
  console.log('   ✓ Opportunity has all 7 required categories: ' + oppCategories.join(', '));

  // 2. Setup Express test app with Opportunity routes
  console.log('\n2. Testing Express Route Wiring & Security Middleware...');
  const app = express();
  app.use(express.json());
  app.use('/api/opportunities', opportunityRoutes);

  const server = app.listen(0, async () => {
    const port = server.address().port;
    const baseUrl = `http://localhost:${port}/api/opportunities`;

    try {
      // 3. Test Unauthorized Access on Protected Endpoints
      console.log('   - Testing POST /api/opportunities without token...');
      const unauthPostRes = await fetch(`${baseUrl}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Software Engineer' })
      });
      assert.strictEqual(unauthPostRes.status, 401, 'Should reject unauthenticated creation with 401');
      console.log('   ✓ 401 Unauthorized correctly returned when creating opportunity without token');

      console.log('   - Testing GET /api/opportunities/saved without token...');
      const unauthSavedRes = await fetch(`${baseUrl}/saved`);
      assert.strictEqual(unauthSavedRes.status, 401, 'Should reject unauthenticated saved items query with 401');
      console.log('   ✓ 401 Unauthorized correctly returned when accessing saved opportunities without token');

      console.log('   - Testing PATCH /api/opportunities/123/moderate without token...');
      const unauthModRes = await fetch(`${baseUrl}/123/moderate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' })
      });
      assert.strictEqual(unauthModRes.status, 401, 'Should reject unauthenticated moderation with 401');
      console.log('   ✓ 401 Unauthorized correctly returned for moderation endpoint');

      console.log('\n3. Testing Opportunity Schema Validation:');
      const testOpp = new Opportunity({
        title: 'Lead Full-Stack Developer',
        organizationName: 'Connectly Global',
        category: 'job',
        workType: 'remote',
        location: 'Worldwide',
        description: 'Building world-class multilingual social networking features.',
        publisher: '64b1f2e34567890123456789',
        applicationDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      const validationError = testOpp.validateSync();
      assert.strictEqual(validationError, undefined, 'Valid opportunity should pass schema validation');
      assert.strictEqual(testOpp.status, 'active', 'Default status should be active');
      assert.strictEqual(testOpp.workType, 'remote');
      assert.strictEqual(testOpp.savedBy.length, 0);
      assert.strictEqual(testOpp.viewsCount, 0);
      console.log('   ✓ Schema validation passed with all default fields correctly assigned');

      console.log('\n========================================================');
      console.log('✓ ALL PHASE 2 OPPORTUNITIES INTEGRATION TESTS PASSED!');
      console.log('========================================================\n');
    } catch (err) {
      console.error('Test assertion failed:', err);
      process.exitCode = 1;
    } finally {
      server.close();
    }
  });
}

runPhase2IntegrationTests();
