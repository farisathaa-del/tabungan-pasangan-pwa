#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build deploy/index.html — satu file HTML mandiri untuk Google Apps Script HtmlService.

HtmlService hanya menyajikan SATU file HTML; semua path relatif akan 404.
Build ini membungkus ikon, manifest, dan SVG rumah sebagai data URI sehingga
index.html benar-benar bisa berdiri sendiri.

Jalankan:  python3 build-deploy.py
"""
import base64, io, json, os, re, sys
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC   = os.path.join(ROOT, 'index.html')
OUT   = os.path.join(ROOT, 'deploy', 'index.html')
DEPLOY_DIR = os.path.join(ROOT, 'deploy')

def data_uri(path, mime, fmt=None, quality=82):
    if fmt:                       # gambar raster -> re-encode (hemat besar)
        im = Image.open(path)
        b = io.BytesIO()
        im.convert('RGB').save(b, fmt, quality=quality, optimize=True, progressive=True)
        raw = b.getvalue()
    else:                         # teks/svg -> baca mentah
        raw = open(path, 'rb').read()
    return 'data:%s;base64,%s' % (mime, base64.b64encode(raw).decode())

def kb(n): return '%6.1f KB' % (n/1024)

# ---------- 1. ikon ----------
icons = {}
for name, size in [('180',180), ('192',192), ('512',512), ('1024',1024)]:
    icons[name] = data_uri(os.path.join(ROOT,'icons','icon-%s.png'%name), 'image/jpeg', 'JPEG')
print('ikon (PNG -> JPEG q82):')
for n,u in icons.items():
    print('   icon-%-5s %s' % (n, kb(len(u))))

# ---------- 2. manifest ----------
manifest = json.load(io.open(os.path.join(ROOT,'manifest.json'), encoding='utf-8'))
manifest['icons'] = [
  {"src": icons['192'], "sizes":"192x192","type":"image/jpeg","purpose":"any"},
]
manifest_uri = 'data:application/manifest+json;base64,' + \
    base64.b64encode(json.dumps(manifest, ensure_ascii=False, separators=(',',':')).encode()).decode()
print('   manifest.json       ', kb(len(manifest_uri)))

# ---------- 3. SVG rumah ----------
house_uri = data_uri(os.path.join(ROOT,'assets','house-up.svg'), 'image/svg+xml')
print('   house-up.svg        ', kb(len(house_uri)))

# ---------- 4. rakit HTML ----------
html = io.open(SRC, encoding='utf-8').read()
n = 0

# manifest -> data URI
old = '<link rel="manifest" href="./manifest.json">'
if old in html:
    html = html.replace(old, '<link rel="manifest" href="%s">' % manifest_uri); n += 1

# ikon -> data URI
for m in set(re.findall(r'href="\./icons/(icon-\d+\.png)"', html)):
    key = m.replace('icon-','').replace('.png','')
    html = html.replace('href="./icons/%s"' % m, 'href="%s"' % icons[key]); n += 1

# rumah -> data URI (2 tempat)
html = html.replace('src="assets/house-up.svg"', 'src="%s"' % house_uri)
html = html.replace('href="assets/house-up.svg"', 'href="%s"' % house_uri)
n += 2

# service worker: tidak bisa jalan di HtmlService -> dimatikan total
sw_anchor = "    function initServiceWorker() {\n      if (!('serviceWorker' in navigator)) return;"
sw_block_new = ("    function initServiceWorker() {\n"
  "      /* Build deploy: service worker dimatikan. HtmlService menyajikan satu\n"
  "         file HTML saja, jadi ./sw.js pasti 404 dan tidak ada gunanya. */\n"
  "      if (window.__TABUNGAN_NO_SW__) return;\n"
  "      if (!('serviceWorker' in navigator)) return;")
assert sw_anchor in html, 'anchor initServiceWorker tidak ditemukan'
html = html.replace(sw_anchor, sw_block_new); n += 1
# tandai flag-nya di <head>
html = html.replace('<head>', '<head>\n  <script>window.__TABUNGAN_NO_SW__=true;</script>', 1); n += 1

# audio: <source> statis dibuang, src diset JS dari AUDIO_BASE_URL
old_audio = '<audio id="bgMusic" loop preload="none">\n    <source src="./audio/married-life.mp3" type="audio/mpeg">\n  </audio>'
if old_audio in html:
    html = html.replace(old_audio,
      '<!-- src dipasang oleh JS dari AUDIO_BASE_URL; lihat deploy/README.md -->\n'
      '  <audio id="bgMusic" loop preload="none"></audio>'); n += 1

# konfigurasi URL audio
old_songs = "    const SONG_META = {\n      married: { file: './audio/married-life.mp3',"
new_songs = ("    /* === KONFIGURASI AUDIO (build deploy) ===\n"
 "       Isi dengan URL folder tempat 3 file mp3 di-host, TANPA garis miring di akhir.\n"
 "       Contoh: 'https://cdn.example.com/tabungan-audio'\n"
 "       Kosongkan = memakai path relatif './audio/' (hanya jalan di dev lokal,\n"
 "       di Google Apps Script akan 404). */\n"
 "    const AUDIO_BASE_URL = '';\n"
 "    const audioUrl = (f) => (AUDIO_BASE_URL ? AUDIO_BASE_URL.replace(/\\/+$/,'') + '/' + f.split('/').pop() : f);\n\n"
 "    const SONG_META = {\n      married: { file: './audio/married-life.mp3',")
assert old_songs in html, 'blok SONG_META tidak ditemukan'
html = html.replace(old_songs, new_songs); n += 1
# call site asli: audio.src = meta.file  (index.html:2513)
before = html.count("audio.src = meta.file;")
html = html.replace("audio.src = meta.file;", "audio.src = audioUrl(meta.file);")
assert before == 1, 'call site audio.src = meta.file: %d' % before
n += 1

# audio gagal load -> beri tahu, jangan diam (P1-6 spirit: umumnya diam = bug)
old_err = "      audio.volume = 0.45;"
new_err = """      audio.volume = 0.45;
        /* Pesta: kalau file audio tidak termuat (mis. AUDIO_BASE_URL belum
           diisi atau hosting mati), diam saja akan bikin pengguna mengira
           tombolnya rusak. Beri tahu sekali saja. */
        audio.addEventListener('error', function () {
          if (!audio.dataset.errored) {
            audio.dataset.errored = '1';
            if (typeof showToast === 'function') {
              showToast('musik tidak dapat dimuat — cek AUDIO_BASE_URL');
            }
            updateMusicUI(false);
          }
        });"""
assert html.count(old_err) >= 1
html = html.replace(old_err, new_err, 1); n += 1
html = html.replace("audio.src = audioUrl(meta.file);",
                    "delete audio.dataset.errored;\n      audio.src = audioUrl(meta.file);")

io.open(OUT,'w',encoding='utf-8').write(html)
src_sz, out_sz = os.path.getsize(SRC), os.path.getsize(OUT)
print('\n%d transformasi diterapkan' % n)
print('  index.html (dev)  ', kb(src_sz))
print('  deploy/index.html ', kb(out_sz), ' (+%.1f KB inlined)' % ((out_sz-src_sz)/1024))
print('\n->', OUT)
