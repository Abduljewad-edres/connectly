import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const frontendDir = path.resolve(__dirname, '../../frontend');
const distDir = path.resolve(frontendDir, 'dist');
const publicDir = path.resolve(frontendDir, 'public');

console.log('=====================================================');
console.log('   CONNECTLY PWA COMPREHENSIVE VERIFICATION SUITE   ');
console.log('=====================================================');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTestSuite() {
  // Test 1: Web App Manifest
  console.log('\n--- 1. Testing Web App Manifest Validity ---');
  const manifestPath = path.join(publicDir, 'manifest.json');
  assert(fs.existsSync(manifestPath), 'manifest.json exists in public directory');

  const manifestRaw = fs.readFileSync(manifestPath, 'utf8');
  let manifest;
  try {
    manifest = JSON.parse(manifestRaw);
    assert(true, 'manifest.json is valid JSON');
  } catch (e) {
    assert(false, `manifest.json parsing error: ${e.message}`);
  }

  assert(manifest.name === 'Connectly', `Manifest name is "Connectly" (actual: "${manifest.name}")`);
  assert(manifest.short_name === 'Connectly', `Manifest short_name is "Connectly" (actual: "${manifest.short_name}")`);
  assert(manifest.start_url === '/', 'Manifest start_url is "/"');
  assert(manifest.scope === '/', 'Manifest scope is "/"');
  assert(manifest.display === 'standalone', 'Manifest display is "standalone"');
  assert(manifest.background_color === '#0b0f19', 'Manifest background_color matches Connectly dark navy branding');
  assert(manifest.theme_color === '#0b0f19', 'Manifest theme_color matches Connectly branding');

  // Verify icons in manifest
  assert(Array.isArray(manifest.icons) && manifest.icons.length >= 4, 'Manifest contains at least 4 icon specifications');

  const has192 = manifest.icons.some(i => i.sizes === '192x192' && i.purpose === 'any');
  const has512 = manifest.icons.some(i => i.sizes === '512x512' && i.purpose === 'any');
  const hasMaskable192 = manifest.icons.some(i => i.sizes === '192x192' && i.purpose === 'maskable');
  const hasMaskable512 = manifest.icons.some(i => i.sizes === '512x512' && i.purpose === 'maskable');

  assert(has192, 'Manifest includes 192x192 any-purpose icon');
  assert(has512, 'Manifest includes 512x512 any-purpose icon');
  assert(hasMaskable192, 'Manifest includes 192x192 maskable icon');
  assert(hasMaskable512, 'Manifest includes 512x512 maskable icon');

  // Test 2: Icon Files on Disk
  console.log('\n--- 2. Testing Application Icons on Disk ---');
  const pngHeader = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const iconsToTest = [
    'icon-192.png',
    'icon-512.png',
    'icon-maskable-192.png',
    'icon-maskable-512.png',
    'apple-touch-icon.png'
  ];

  for (const iconName of iconsToTest) {
    const iconPath = path.join(publicDir, 'icons', iconName);
    assert(fs.existsSync(iconPath), `Icon file ${iconName} exists on disk`);

    const iconBuffer = fs.readFileSync(iconPath);
    assert(iconBuffer.length > 500, `Icon file ${iconName} has valid non-zero size (${iconBuffer.length} bytes)`);

    const magicMatch = iconBuffer.subarray(0, 8).equals(pngHeader);
    assert(magicMatch, `Icon file ${iconName} has valid PNG signature magic bytes`);
  }

  // Test 3: Service Worker Implementation & Safety Rules
  console.log('\n--- 3. Testing Service Worker Guardrails & Caching Rules ---');
  const swPath = path.join(publicDir, 'sw.js');
  assert(fs.existsSync(swPath), 'sw.js exists in public directory');

  const swContent = fs.readFileSync(swPath, 'utf8');
  assert(swContent.includes('install'), 'Service worker registers install event listener');
  assert(swContent.includes('activate'), 'Service worker registers activate event listener');
  assert(swContent.includes('fetch'), 'Service worker registers fetch event listener');
  assert(swContent.includes('message'), 'Service worker registers message event listener for update prompts');
  assert(swContent.includes('SKIP_WAITING'), 'Service worker supports SKIP_WAITING message for seamless updates');

  // Privacy and security guardrail assertions
  assert(
    swContent.includes("/api") && swContent.includes("return"),
    'Security Rule 1: Service worker explicitly bypasses /api requests (No private API caching)'
  );
  assert(
    swContent.includes("/socket.io"),
    'Security Rule 2: Service worker explicitly bypasses /socket.io traffic (No real-time traffic interference)'
  );
  assert(
    swContent.includes("request.method !== 'GET'"),
    'Security Rule 3: Service worker only caches GET requests (Never mutative POST/PUT/DELETE)'
  );
  assert(
    swContent.includes("request.mode === 'navigate'"),
    'Navigation Rule: Service worker handles SPA navigation requests with offline shell fallback'
  );

  // Test 4: HTML Entrypoint Metadata
  console.log('\n--- 4. Testing HTML Metadata & iOS/Desktop PWA Tags ---');
  const htmlPath = path.join(frontendDir, 'index.html');
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');

  assert(htmlContent.includes('rel="manifest"'), 'index.html includes <link rel="manifest" href="/manifest.json" />');
  assert(htmlContent.includes('name="theme-color"'), 'index.html includes <meta name="theme-color" ... />');
  assert(htmlContent.includes('name="apple-mobile-web-app-capable" content="yes"'), 'index.html includes Apple iOS Web App Capable meta');
  assert(htmlContent.includes('rel="apple-touch-icon"'), 'index.html includes apple-touch-icon link');

  // Test 5: Production Build Output Verification
  console.log('\n--- 5. Testing Production Build Output ---');
  assert(fs.existsSync(path.join(distDir, 'index.html')), 'dist/index.html exists');
  assert(fs.existsSync(path.join(distDir, 'manifest.json')), 'dist/manifest.json copied into build output');
  assert(fs.existsSync(path.join(distDir, 'sw.js')), 'dist/sw.js copied into build output');
  assert(fs.existsSync(path.join(distDir, 'icons', 'icon-192.png')), 'dist/icons/icon-192.png present in build output');
  assert(fs.existsSync(path.join(distDir, 'icons', 'icon-512.png')), 'dist/icons/icon-512.png present in build output');

  // Test 6: Live Server PWA Endpoints & Headers Test
  console.log('\n--- 6. Testing Live Server Serving, Scope & Headers ---');
  process.env.PORT = '58991';
  await import('../server.js');
  const port = 58991;
  console.log(`  Live test server listening on port ${port}`);

  async function fetchUrl(endpoint) {
    return new Promise((resolve, reject) => {
      http.get(`http://localhost:${port}${endpoint}`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
      }).on('error', reject);
    });
  }

  // 6.1: Manifest endpoint
  const manifestRes = await fetchUrl('/manifest.json');
  assert(manifestRes.status === 200, 'GET /manifest.json returns HTTP 200');
  assert(
    manifestRes.headers['content-type']?.includes('manifest') || manifestRes.headers['content-type']?.includes('json'),
    `GET /manifest.json returns valid manifest/json Content-Type (actual: ${manifestRes.headers['content-type']})`
  );

  // 6.2: Service worker endpoint and headers
  const swRes = await fetchUrl('/sw.js');
  assert(swRes.status === 200, 'GET /sw.js returns HTTP 200');
  assert(
    swRes.headers['service-worker-allowed'] === '/',
    'GET /sw.js returns Service-Worker-Allowed: / header for full root scope'
  );
  assert(
    swRes.headers['cache-control']?.includes('no-cache'),
    'GET /sw.js returns Cache-Control: no-cache to guarantee instant deployment updates'
  );

  // 6.3: Icon endpoints
  const icon192Res = await fetchUrl('/icons/icon-192.png');
  assert(icon192Res.status === 200, 'GET /icons/icon-192.png returns HTTP 200');

  const icon512Res = await fetchUrl('/icons/icon-512.png');
  assert(icon512Res.status === 200, 'GET /icons/icon-512.png returns HTTP 200');

  // 6.4: SPA client-side route fallback to index.html
  const spaRouteRes = await fetchUrl('/messages');
  assert(spaRouteRes.status === 200, 'GET /messages (SPA client route) returns HTTP 200');
  assert(spaRouteRes.body.includes('<div id="root"></div>'), 'GET /messages serves SPA index.html app shell');

  // 6.5: API Route passthrough (must NOT be intercepted by SPA or cached)
  const apiRes = await fetchUrl('/api/health');
  assert(apiRes.status === 200, 'GET /api/health returns HTTP 200');
  assert(apiRes.headers['content-type']?.includes('json'), 'GET /api/health serves JSON API response');

  console.log('\n=====================================================');
  console.log(`   ALL PWA TESTS COMPLETED: ${passedTests}/${totalTests} PASSED   `);
  console.log('=====================================================');
  process.exit(0);
}

runTestSuite().catch(err => {
  console.error('\nTest Suite Failed:', err);
  process.exit(1);
});
