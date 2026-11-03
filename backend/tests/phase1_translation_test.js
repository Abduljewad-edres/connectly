import assert from 'assert';
import {
  detectLanguage,
  SUPPORTED_LANGUAGES,
  translateContent
} from '../services/translationService.js';

async function runTests() {
  console.log('--- Testing Phase 1: Connectly Multilingual Bridge ---');

  // Test 1: Supported Languages
  console.log('1. Verifying Supported Languages...');
  assert.strictEqual(SUPPORTED_LANGUAGES.length, 4, 'Should support 4 languages');
  const codes = SUPPORTED_LANGUAGES.map((l) => l.code);
  assert.ok(codes.includes('en'), 'Supports English');
  assert.ok(codes.includes('ar'), 'Supports Arabic');
  assert.ok(codes.includes('om'), 'Supports Afaan Oromoo');
  assert.ok(codes.includes('am'), 'Supports Amharic');
  const arLang = SUPPORTED_LANGUAGES.find((l) => l.code === 'ar');
  assert.strictEqual(arLang.direction, 'rtl', 'Arabic must have rtl direction');
  console.log('   ✓ Supported languages verified: en, ar (rtl), om, am');

  // Test 2: Language Detection
  console.log('2. Verifying Language Detection...');
  const arSample = 'مرحباً بكم في كونيكتلي';
  const amSample = 'እንኳን ወደ ኮኔክትሊ በደህና መጡ';
  const omSample = 'Akkam jirtu obboleewwan koo, baga nagaan dhuftan';
  const enSample = 'Welcome to Connectly social media platform';

  assert.strictEqual(detectLanguage(arSample), 'ar', 'Detects Arabic');
  assert.strictEqual(detectLanguage(amSample), 'am', 'Detects Amharic');
  assert.strictEqual(detectLanguage(omSample), 'om', 'Detects Afaan Oromoo');
  assert.strictEqual(detectLanguage(enSample), 'en', 'Detects English');
  console.log('   ✓ Script & language detection working accurately for all 4 languages');

  // Test 3: Same Language Pass-Through
  console.log('3. Testing Same Language Pass-Through...');
  const sameResult = await translateContent({
    text: 'Hello world',
    targetLang: 'en',
    sourceLang: 'en'
  });
  assert.strictEqual(sameResult.translatedText, 'Hello world');
  assert.strictEqual(sameResult.provider, 'same-language');
  console.log('   ✓ Same-language requests pass through without redundant computation');

  // Test 4: Multilingual Translation Fallback & Dictionary Engine
  console.log('4. Testing Multilingual Bridge Engine...');
  const helloAr = await translateContent({ text: 'Hello', targetLang: 'ar' });
  console.log('   "Hello" -> Arabic:', helloAr.translatedText);
  assert.strictEqual(helloAr.translatedText, 'مرحباً');
  assert.strictEqual(helloAr.targetLanguage, 'ar');

  const helloOm = await translateContent({ text: 'Hello', targetLang: 'om' });
  console.log('   "Hello" -> Afaan Oromoo:', helloOm.translatedText);
  assert.strictEqual(helloOm.translatedText, 'Akkam');
  assert.strictEqual(helloOm.targetLanguage, 'om');

  const helloAm = await translateContent({ text: 'Hello', targetLang: 'am' });
  console.log('   "Hello" -> Amharic:', helloAm.translatedText);
  assert.strictEqual(helloAm.translatedText, 'ሰላም');
  assert.strictEqual(helloAm.targetLanguage, 'am');

  const connectAr = await translateContent({ text: 'Connect share belong', targetLang: 'ar' });
  console.log('   "Connect share belong" -> Arabic:', connectAr.translatedText);
  assert.ok(connectAr.translatedText.includes('تواصل'), 'Arabic tagline contains تواصل');

  const connectOm = await translateContent({ text: 'Connect share belong', targetLang: 'om' });
  console.log('   "Connect share belong" -> Afaan Oromoo:', connectOm.translatedText);
  assert.ok(connectOm.translatedText.includes('Waliin'), 'Afaan Oromoo tagline contains Waliin');

  const connectAm = await translateContent({ text: 'Connect share belong', targetLang: 'am' });
  console.log('   "Connect share belong" -> Amharic:', connectAm.translatedText);
  assert.ok(connectAm.translatedText.includes('ተገናኙ'), 'Amharic tagline contains ተገናኙ');

  console.log('\n--- All Phase 1 Backend Service Unit Tests Passed Successfully! ---');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});

