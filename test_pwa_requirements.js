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

// 4. Hilangkan teks "mingguan · rp100.000 / minggu"
assert(!html.includes('mingguan · rp100.000 / minggu'), 'Card subtitle "mingguan · rp100.000 / minggu" must be removed');

// 5. Service worker version bump
assert(sw.includes("CACHE_NAME = 'tabungan-v3'"), 'Service worker cache must be bumped to v3');

console.log('ALL PWA CHECKS PASSED (5/5)');
