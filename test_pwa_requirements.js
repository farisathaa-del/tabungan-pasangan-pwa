const fs = require('fs');
const assert = require('assert');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(__dirname, 'sw.js'), 'utf8');

// 1. Text landing page: kembali ke English "track ours saving."
assert(html.includes('track') && html.includes('ours saving.'), 'Landing page must contain "track" and "ours saving."');
assert(!html.includes('pantau') && !html.includes('tabungan kita.'), 'Landing page must NOT contain "pantau" or "tabungan kita."');

// 2. Tidak fix/scrollable: fit 1 layar iPhone tanpa scroll/zoom
assert(html.includes('id="tabViewHome" class="flex-1 overflow-hidden'), 'tabViewHome must have overflow-hidden to prevent 1-screen scrolling');
assert(html.includes('user-scalable=no'), 'Viewport meta must disable user scaling');
assert(html.includes('gesturestart') && html.includes('gesturechange') && html.includes('gestureend'), 'Gesture events must be prevented');
assert(html.includes('touchend') && html.includes('lastTouchEnd'), 'Double-tap zoom on touchend must be prevented');

// 3. Garis hitam & notch alignment
assert(html.includes('header {') && html.includes('calc(env(safe-area-inset-top) + 0.25rem)'), 'Header must sit right below notch');
assert(html.includes('id="themeColorMeta" content="#FAFAFC"'), 'themeColorMeta must be #FAFAFC to prevent top black bar');
assert(html.includes('body class="bg-[#FAFAFC]'), 'body background must be #FAFAFC');
assert(!html.includes('min-h-screen'), 'body must not have min-h-screen (causes 100vh overflow on iOS)');

// 4. Hilangkan teks "mingguan · rp100.000 / minggu"
assert(!html.includes('mingguan · rp100.000 / minggu'), 'Card subtitle "mingguan · rp100.000 / minggu" must be removed');

// 5. Drawer sheet safe area & no submerged buttons
assert(html.includes('.sheet-content {') && html.includes('calc(env(safe-area-inset-bottom)'), 'Sheet content must have safe area bottom padding');
assert(html.includes('id="uploadSheet"') && html.includes('class="sheet-content bg-white'), 'Upload sheet must include .sheet-content');
assert(html.includes('id="detailSheet"') && html.includes('class="sheet-content bg-white'), 'Detail sheet must include .sheet-content');
assert(html.includes('id="koreksiSheet"') && html.includes('class="sheet-content bg-white'), 'Koreksi sheet must include .sheet-content');

// 6. Service worker version bump
assert(sw.includes("CACHE_NAME = 'tabungan-v8'"), 'Service worker cache must be bumped to v8');

// 7. Plant visual & drawer integration
assert(html.includes('id="plantSheet"') && html.includes('class="sheet-content bg-white'), 'Plant sheet must exist with safe area');
assert(html.includes('id="plantSvgMini"'), 'Mini plant SVG container must exist');
assert(html.includes('openPlantSheet()'), 'openPlantSheet trigger must exist');
assert(html.includes('renderPlantVisuals()'), 'renderPlantVisuals function must exist');

// 8. Logo PWA & explicit user select check
assert(html.includes('./icons/icon-192.png'), 'PWA logo icon must be integrated');
assert(!html.includes('onclick="enterAppWithDefault()"'), 'Automatic enter on click anywhere/logo must be removed');

// 9. Saiba personalized styling & History avatars
assert(html.includes('bg-rose-50/70'), 'Saiba card must have soft rose styling');
assert(html.includes("item.user === 'A' ? 'F' : 'S'"), 'History list must show F and S avatars');

// 10. Strict JS syntax compilation check (prevent uncaught runtime breaks)
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
assert(scriptMatch, 'Script tag must exist in index.html');
assert.doesNotThrow(() => {
  new Function(scriptMatch[1]);
}, 'JavaScript inside index.html must have valid syntax without duplicates or compilation errors');

console.log('ALL PWA CHECKS PASSED (10/10)');