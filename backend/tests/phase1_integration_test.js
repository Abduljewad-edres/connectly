import express from 'express';
import assert from 'assert';
import translationRoutes from '../routes/translationRoutes.js';
import userRoutes from '../routes/userRoutes.js';

async function runIntegrationTests() {
  console.log('--- Phase 1: Connectly Multilingual Bridge Integration Test ---');

  const app = express();
  app.use(express.json());
  app.use('/api/translations', translationRoutes);

  const server = app.listen(0, async () => {
    const port = server.address().port;
    const baseUrl = `http://localhost:${port}/api/translations`;
    console.log(`Integration test server running on port ${port}`);

    try {
      // 1. GET /api/translations/languages
      console.log('1. Testing GET /api/translations/languages...');
      const langRes = await fetch(`${baseUrl}/languages`);
      assert.strictEqual(langRes.status, 200);
      const langData = await langRes.json();
      assert.strictEqual(langData.success, true);
      assert.strictEqual(langData.languages.length, 4);
      console.log('   ✓ Retrieved supported languages (en, ar, om, am)');

      // 2. POST /api/translations/detect
      console.log('2. Testing POST /api/translations/detect...');
      const detectRes = await fetch(`${baseUrl}/detect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'مرحباً بالجميع' })
      });
      const detectData = await detectRes.json();
      assert.strictEqual(detectData.detectedLanguage, 'ar');
      console.log('   ✓ Detected Arabic text correctly');

      const detectAmRes = await fetch(`${baseUrl}/detect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'እንኳን ደስ አላችሁ' })
      });
      const detectAmData = await detectAmRes.json();
      assert.strictEqual(detectAmData.detectedLanguage, 'am');
      console.log('   ✓ Detected Amharic text correctly');

      // 3. POST /api/translations/translate
      console.log('3. Testing POST /api/translations/translate...');
      const transRes = await fetch(`${baseUrl}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'Welcome to Connectly',
          targetLang: 'om'
        })
      });
      assert.strictEqual(transRes.status, 200);
      const transData = await transRes.json();
      assert.strictEqual(transData.success, true);
      assert.strictEqual(transData.targetLanguage, 'om');
      assert.ok(transData.translatedText, 'Has translated text');
      console.log('   ✓ Translation result for "Welcome to Connectly":', transData.translatedText);

      // 4. POST /api/translations/batch
      console.log('4. Testing POST /api/translations/batch...');
      const batchRes = await fetch(`${baseUrl}/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetLang: 'ar',
          items: [
            { id: 'comment_1', text: 'Hello' },
            { id: 'comment_2', text: 'Thank you' },
            { id: 'comment_3', text: 'Congratulations' }
          ]
        })
      });
      assert.strictEqual(batchRes.status, 200);
      const batchData = await batchRes.json();
      assert.strictEqual(batchData.success, true);
      assert.strictEqual(batchData.translations.length, 3);
      assert.strictEqual(batchData.translations[0].translatedText, 'مرحباً');
      assert.strictEqual(batchData.translations[1].translatedText, 'شكراً لك');
      assert.ok(batchData.translations[2].translatedText.includes('تهانينا'));
      console.log('   ✓ Batch translation returned 3 translated comments accurately');

      console.log('\n--- All Integration Tests Passed Successfully! ---');
    } catch (err) {
      console.error('Integration test failed:', err);
      process.exit(1);
    } finally {
      server.close();
      process.exit(0);
    }
  });
}

runIntegrationTests();

