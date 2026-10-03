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
assert(sw.includes("CACHE_NAME = 'tabungan-v20'"), 'Service worker cache must be bumped to v20');

// 7. Plant visual & drawer integration
assert(html.includes('id="plantSheet"') && html.includes('class="sheet-content bg-white'), 'Plant sheet must exist with safe area');
assert(html.includes('id="plantSvgMini"'), 'Mini plant SVG container must exist');
assert(html.includes('openPlantSheet()'), 'openPlantSheet trigger must exist');
assert(html.includes('renderPlantVisuals()'), 'renderPlantVisuals function must exist');

// 8. PWA icon in head & tracking line illustration check
assert(html.includes('./icons/icon-192.png'), 'PWA logo icon must be integrated in head/manifest');
assert(html.includes('animate-pulse'), 'Lock screen must have pulsing tracking graphic');
assert(!html.includes('onclick="enterAppWithDefault()"'), 'Automatic enter on click anywhere/logo must be removed');

// 9. Saiba personalized styling & History avatars
assert(html.includes('bg-rose-50/70'), 'Saiba card must have soft rose styling');
assert(html.includes("item.user === 'A' ? 'F' : 'S'"), 'History list must show F and S avatars');

// 10. Safa the digital cat mascot & alive garden terrarium integration
assert(html.includes('id="safaContainer"'), 'Safa container must exist');
assert(html.includes('id="safaSvgMini"'), 'Safa mini SVG must exist');
assert(html.includes('id="safaBubbleMini"'), 'Safa speech bubble must exist');
assert(html.includes('id="safaModalIcon"'), 'Safa modal icon must exist in plant drawer');
assert(html.includes('function getSafaStatus()'), 'getSafaStatus logic must exist');
assert(html.includes('function tapSafaMeow()'), 'tapSafaMeow interactive function must exist');
assert(html.includes('safaOrbitMini') && html.includes('safa-orbit-mini'), 'Safa orbit mini CSS keyframes and class must exist');
assert(html.includes('safaOrbitLarge') && html.includes('safa-orbit-large'), 'Safa orbit large CSS keyframes and class must exist');
assert(html.includes('safaTailWag') && html.includes('safa-tail-wag'), 'Safa tail wag animation must exist');

// 11. Keseluruhan Card Total Terkumpul menjadi Taman Asri
assert(html.includes('bg-gradient-to-b from-emerald-50/90 via-emerald-100/50 to-emerald-200/40'), 'Home card must be full garden background');
assert(html.includes('text-emerald-950') && html.includes('text-emerald-800/80'), 'Home card balance text must have high contrast on green lawn');

// 12. Detail Sheet: Panggung Taman Hijau Panorama dengan Tanaman & Kucing Safa
assert(html.includes('id="safaSvgLarge"'), 'Detail sheet must contain large Safa SVG in garden');
assert(html.includes('id="safaDetailBubble"'), 'Detail sheet must contain interactive Safa speech bubble');
assert(html.includes('function tapSafaDetailMeow()'), 'tapSafaDetailMeow function must exist');
assert(html.includes('viewBox="0 0 360 190"'), 'Detail sheet must feature panoramic garden backdrop');

// 13. Orbit pot 3D & unclipped speech bubble checks
assert(!html.includes('onclick="openPlantSheet()" class="relative overflow-hidden rounded-3xl'), 'Home card must not clip overflow so bubble is unclipped');
assert(html.includes('calc(-50% + 38px)'), 'safaOrbitMini must use exact calc(-50% + 38px) trajectory around pot');
assert(html.includes('Bayangan kontak tanah tegas langsung di bawah pot'), 'renderPlantSvg must provide ground contact shadow');

// 14. Strict JS syntax compilation check (prevent uncaught runtime breaks)
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
assert(scriptMatch, 'Script tag must exist in index.html');
assert.doesNotThrow(() => {
  new Function(scriptMatch[1]);
}, 'JavaScript inside index.html must have valid syntax without duplicates or compilation errors');

// 15. Background Music: Adele - Lovesong
assert(html.includes('id="btnMusicToggle"'), 'Music toggle button must exist');
assert(html.includes('id="bgMusic"') && html.includes('adele-lovesong.mp3'), 'Audio element for Adele - Lovesong must exist');
assert(html.includes('function toggleMusic()') && html.includes('function playMusicOnGesture()'), 'Music toggle and gesture trigger must exist');

// 16. Lock screen header: Basmalah & dot on left, "tabungan berdua" removed
assert(!html.includes('tabungan berdua'), '"tabungan berdua" label must be removed from lock screen');
assert(html.includes('بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ'), 'Basmalah must exist on lock screen header');

console.log('ALL PWA CHECKS PASSED (16/16)');