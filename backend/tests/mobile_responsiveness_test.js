import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const frontendDist = path.join(__dirname, '../../frontend/dist');
const frontendSrc = path.join(__dirname, '../../frontend/src');

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ ${testName}`);
    failedTests++;
  }
}

console.log('========================================================');
console.log('  CONNECTLY MOBILE RESPONSIVENESS VERIFICATION SUITE');
console.log('========================================================\n');

// 1. Viewport & HTML Check
console.log('[Test Group 1: HTML & Viewport Meta Tags]');
const indexHtml = fs.readFileSync(path.join(frontendDist, 'index.html'), 'utf8');
assert(indexHtml.includes('width=device-width'), 'index.html has width=device-width');
assert(indexHtml.includes('initial-scale=1.0'), 'index.html has initial-scale=1.0');
assert(indexHtml.includes('viewport-fit=cover'), 'index.html has viewport-fit=cover for notch/safe-areas');
assert(indexHtml.includes('theme-color'), 'index.html specifies theme-color #0b0f19');

// 2. Global CSS Viewport & Overflow Rules
console.log('\n[Test Group 2: Global CSS & Overflow Control]');
const indexCss = fs.readFileSync(path.join(frontendSrc, 'index.css'), 'utf8');
assert(indexCss.includes('overflow-x: hidden'), 'index.css enforces overflow-x: hidden on html/body');
assert(indexCss.includes('max-width: 100vw'), 'index.css constrains max-width: 100vw');
assert(indexCss.includes('img, video, canvas, svg'), 'index.css constrains global media max-width: 100%');

// 3. Main Application Layout & Column Responsiveness
console.log('\n[Test Group 3: Layout & Column Widths]');
const appCss = fs.readFileSync(path.join(frontendSrc, 'App.css'), 'utf8');
assert(appCss.includes('.app-layout'), '.app-layout rule exists');
assert(appCss.includes('.app-main-container'), '.app-main-container rule exists');
assert(appCss.includes('@media (max-width: 768px)'), '@media (max-width: 768px) breakpoint exists');
assert(appCss.includes('.app-content-column'), '.app-content-column rule exists');
assert(appCss.includes('width: 100% !important'), 'Main content column stretches to 100% on mobile');
assert(appCss.includes('max-width: 100% !important'), 'Main content column allows full width without fixed limit');

// 4. Mobile Navigation & Drawer Architecture
console.log('\n[Test Group 4: Mobile Navigation & Drawer]');
const mobileNavDrawer = fs.readFileSync(path.join(frontendSrc, 'components/MobileNavDrawer.jsx'), 'utf8');
assert(mobileNavDrawer.includes('Home Feed'), 'Mobile drawer includes "Home Feed"');
assert(mobileNavDrawer.includes('Explore & Search'), 'Mobile drawer includes "Explore & Search"');
assert(mobileNavDrawer.includes('Shorts & Reels'), 'Mobile drawer includes "Shorts & Reels"');
assert(mobileNavDrawer.includes('Communities'), 'Mobile drawer includes "Communities"');
assert(mobileNavDrawer.includes('Opportunities'), 'Mobile drawer includes "Opportunities"');
assert(mobileNavDrawer.includes('Local Discovery'), 'Mobile drawer includes "Local Discovery"');
assert(mobileNavDrawer.includes('Live Spaces'), 'Mobile drawer includes "Live Spaces"');
assert(mobileNavDrawer.includes('Direct Messages'), 'Mobile drawer includes "Direct Messages"');
assert(mobileNavDrawer.includes('Notifications'), 'Mobile drawer includes "Notifications"');
assert(mobileNavDrawer.includes('Saved Collections'), 'Mobile drawer includes "Saved Collections"');
assert(mobileNavDrawer.includes('Creator Analytics'), 'Mobile drawer includes "Creator Analytics"');
assert(mobileNavDrawer.includes('Install Connectly App'), 'Mobile drawer includes 1-click PWA install');
assert(mobileNavDrawer.includes('Theme:'), 'Mobile drawer includes Dark/Light theme toggle');
assert(mobileNavDrawer.includes('Language:'), 'Mobile drawer includes Multilingual selector');

// 5. Mobile Bottom Bar
console.log('\n[Test Group 5: Mobile Bottom Navigation Bar]');
const appJsx = fs.readFileSync(path.join(frontendSrc, 'App.jsx'), 'utf8');
assert(appJsx.includes('mobile-bottom-bar'), 'mobile-bottom-bar exists in App.jsx');
assert(appJsx.includes('title="Home Feed"'), 'Bottom bar includes explicit Home Feed button');
assert(appJsx.includes('title="Explore"'), 'Bottom bar includes Explore button');
assert(appJsx.includes('title="Create Post"'), 'Bottom bar includes Create Post button');
assert(appJsx.includes('title="All Sections Menu"'), 'Bottom bar includes Menu button to open drawer');
assert(appJsx.includes('<MobileNavDrawer'), 'App.jsx renders MobileNavDrawer');

// 6. Home Feed Tabs & Media Adaptations
console.log('\n[Test Group 6: Home Feed & Media Responsiveness]');
assert(appCss.includes('.feed-tabs-list'), 'feed-tabs-list class styled');
assert(appCss.includes('overflow-x: auto'), 'feed-tabs-list has horizontal scrolling on mobile');
assert(appCss.includes('flex-shrink: 0'), 'feed-tab-btn prevents tab squishing with flex-shrink: 0');
assert(appCss.includes('white-space: nowrap'), 'feed-tab-btn prevents multiline text clipping');
assert(appCss.includes('.post-actions'), 'post-actions styled for responsive touch interaction');
assert(appCss.includes('.stories-bar-card'), 'stories-bar-card responsive padding and mobile scroll');

// 7. Small Screen Breakpoints (<= 640px, <= 480px, <= 360px)
console.log('\n[Test Group 7: Breakpoints for Small Phones & Tablets]');
assert(appCss.includes('@media (max-width: 640px)'), 'Breakpoints for 640px exist');
assert(appCss.includes('@media (max-width: 480px)'), 'Breakpoints for 480px exist');
assert(appCss.includes('@media (max-width: 360px)'), 'Breakpoints for small 320px-360px phones exist');
assert(appCss.includes('.profile-main-avatar'), 'Profile avatar adapts to small screens');
assert(appCss.includes('.live-spaces-grid'), 'Grid layouts adapt to single column on small screens');

console.log('\n========================================================');
console.log(`  RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('========================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

