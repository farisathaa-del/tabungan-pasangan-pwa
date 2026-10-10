# Deploy ke Google Apps Script (HtmlService)

Berkas yang perlu Anda unggah ke project GAS:

```
deploy/index.html     <- satu-satunya berkas yang diunggah
```

`Code.js` tetap seperti yang sekarang, cukup arahkan ke `index`:

```js
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Tabungan')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
```

---

## Kenapa harus pakai `deploy/index.html`, bukan `index.html`

`HtmlService` hanya menyajikan **satu berkas HTML**. Semua path relatif akan 404.
Berkas `index.html` di root repo masih memakai path relatif:

| Referensi | Status kalau diunggah apa adanya |
|---|---|
| `manifest.json` | 404 |
| `icons/icon-180.png`, `icon-192.png` | 404 |
| `assets/house-up.svg` (**rumah UP**) | 404 |
| `audio/*.mp3` (10,8 MB) | 404 |

`deploy/index.html` sudahmembuat semua aset kecil itu jadi **data URI**, jadi berdiri sendiri.

---

## Satu langkah yang belum selesai: musik

Musik tidak ikut ter-inline (10,8 MB jadi 14,4 MB base64 — tidak masuk akal).
Isi dulu satu baris di `deploy/index.html`:

```js
const AUDIO_BASE_URL = '';
```

ganti dengan URL folder tempat 3 file mp3 Anda di-host, **tanpa garis miring di akhir**:

```js
const AUDIO_BASE_URL = 'https://cdn.example.com/tabungan-audio';
```

Isi foldernya harus persis:

```
married-life.mp3
adele-lovesong.mp3
harry-styles-roses.mp3
```

Kalau `AUDIO_BASE_URL` masih kosong, musik tidak akan berbunyi dan aplikasi
menampilkan toast **"musik tidak dapat dimuat — cek AUDIO_BASE_URL"** (bukan diam
diam). Setelah diisi, **jalankan ulang build**:

```bash
python3 build-deploy.py
```

---

## Yang berubah di build deploy

| | |
|---|---|
| Ikon | PNG 1.011 KB → JPEG q82 **127 KB**, di-inline sebagai data URI |
| `manifest.json` | di-inline, cukup ikon 192 (di HtmlService tanpa service worker, manifest tidak bisa dipakai untuk install) |
| `assets/house-up.svg` | di-inline di 2 tempat |
| Service worker | dimatikan (`window.__TABUNGAN_NO_SW__`). `./sw.js` pasti 404, dan `cache.addAll` yang atomik bisa membuat SW gagal diam-diam |
| `<audio>` | `<source>` statis dibuang, `src` diset JS dari `AUDIO_BASE_URL` + `preload="none"` (tidak ada yang terunduh sebelum dipilih) |
| Audio gagal load | toast, bukan kotak kosong |

Berkas: **312,8 KB → 387,8 KB**.

---

## Verifikasi

Sudah diuji dengan server yang meniru GAS (hanya melayani `/`, semua path lain
diblokir 404):

```
HTTP >= 400        : TIDAK ADA
request gagal      : TIDAK ADA
error / console    : TIDAK ADA
rumah UP (data URI): termuat
data backend nyata : Rp300.000, 3 kartu riwayat  (cocok dengan curl langsung)
```

---

## Batasan HtmlService yang perlu diketahui

- **Tidak ada offline.** Service worker tidak bisa jalan.
- **Tidak bisa di-install** ke home screen.
- **Endpoint `/exec` dan ID deployment adalah kunci** — siapa pun yang tahu URL
  itu bisa membaca *dan menulis* data, dan `driveFileId` di balasan API
  memberi akses ke bukti transfer. Bukti transfer sekarang publik
  (sudah diuji: `curl` tanpa auth → HTTP 200). Perbaiki permission-nya di
  `Code.js`.
- **`config.namaB` masih `"saiba <3"`** — perbaiki di `Code.js`, tidak di frontend.
- Body HTML ini masih memakai nama "faris"/"saiba" secara hardcode (18 tempat),
  sementara `config.namaA`/`namaB` belum dipakai sama sekali.

---

## Kalau nanti pindah ke hosting statis

`index.html` + `sw.js` + `manifest.json` + `icons/` + `audio/` bisa langsung
dihosting apa adanya — tanpa perlu build, dan service worker pun aktif.