# CHANGELOG — Tabungan Faris & Saidah

Aplikasi PWA checklist tabungan pasangan. Sumber kebenaran: `index.html`
(single-file, Tailwind sudah di-inline, plus backend Google Apps Script).

Semua perubahan di bawah **sudah diverifikasi dengan pengukuran**, bukan
hanya lewat pembacaan kode. Angka sebelum/sesudah diambil dari app yang
benar-benar berjalan.

---

## Ringkasan hasil (data contoh identik, 22 record, jumlah sebenarnya Rp2.800.000)

| Gejala | Sebelum | Sesudah |
|---|---|---|
| Total terkumpul di layar | **`Rp0`** (placeholder) | `Rp2.800.000` |
| Total bulan berjalan | Rp600.000 (abaikan Rp150.000) | `Rp700.000` |
| Love-note berisi `<img onerror>` | **1 eksekusi JS, 22 img tersuntik** | 0 |
| Server tidak merespons saat submit | toast **"berhasil dicatat"**, lalu **data hilang** saat reload | toast jujur, tombol aktif lagi |
| Submit 2× ke minggu yang sama | **1 POST dobel**, total Rp200.000 | 0 POST, ditolak dengan pesan |
| HTTP 500 | dianggap sukses, retry dibatalkan | diperlakukan gagal + retry |
| Backdrop lightbox | `rgba(0,0,0,0)` transparan | `rgba(0,0,0,0.85)` |
| Sheet punya `role="dialog"` | 0 | 8 |
| Class tanpa rule di CSS | 9 | 5 (sengaja) |
| Id duplikat | 0 | 0 |
| Exception saat dibuka | 0 | 0 |

---

## Fase 0 — Baseline & artefak PWA
`d07d432`

File `index.html` dari `Downloads` (7 Okt, 837.369 B) dijadikan sumber
kebenaran di repo ini. `manifest.json`, `sw.js`, dan `icons/` ikut dipulihkan
— ketiganya hilang di folder `Downloads`, padahal `index.html:16-19`
merujuknya. Akibatnya `navigator.serviceWorker.register('./sw.js')` 404 dan
PWA tidak bisa di-install sama sekali.

`sw.js`: `CACHE_NAME` v35 → v36, `icon-1024.png` + `favicon.png` masuk
`ASSETS` (manifest.json memang merujuk keduanya).

Ditambahkan mock mode (`?preview=1`) yang men-stub `callBackend`, dashboard
before/after, dan skrip server. Mock sengaja memakai data **tidak lengkap**
(ada minggu bolong, nominal Rp150.000 di beberapa minggu) supaya bug
perhitungan langsung terlihat di slider.

## Fase 1 — Perhitungan uang
`b5e85ca`

Total dihitung dari `records.length × config.nominal`. Diganti penjumlahan
nominal per record (`sumNominal()`) di Home, Riwayat, dan kartu Faris/Saiba.

Progres tanaman dan balon memakai `Math.floor(records.length / 2)` —
naik saat ada record duplikat, dan mengabaikan salah satu belum menyusul.
Diganti `countFullyPaidWeeks()`: minggu yang punya setoran A **dan** B.

Banner "bulan komplit" sebelumnya muncul hanya bila jumlah record cukup, jadi
bisa tampil padahal masih ada lingkaran kosong. Sekarang hanya bila semua
minggu lunas dua orang.

Bug tambahan yang ditemukan saat verifikasi: hitung-naik total membaca teks
di DOM **saat animasi berjalan**, sehingga mendapat nilai antara dan
menganimasikan total mundur ke `Rp0`. Angka kini diambil dari data, dan
`countTo` punya jaring pengaman yang menulis nilai final walau
`requestAnimationFrame` tidak berjalan (tab tidak aktif).

## Fase 2 — Escape output
`3a4db11`

`item.note` masuk `innerHTML` mentah di kartu riwayat. Payload
`<img src=x onerror="window.__XSS=1">` — muat dalam batas `maxlength="40"`
UI — dieksekusi di perangkat pasangan. Dilindungi `escapeHtml()`, dipasang
juga pada status, label, nama bulan, dan `id` di atribut `onclick`.

`showToast()` diubah ke `textContent` karena menerima `response.message`.
Timer toast dibatalkan sebelum dibuat baru.

## Fase 3 — Ketahanan jaringan
`6975895`

`fetch` tanpa `AbortController` dan tanpa cek `res.ok`. Saat koneksi
menggantung, `onFailure` tidak pernah terpanggil: record optimistic tetap
tampil seolah berhasil, `saveToLocalStorage()` tidak pernah jalan, dan
tombol submit terkunci permanen. Sekarang ada batas 12 s (sinkronisasi) dan
20 s (tulis), plus `res.ok` dan flag `isSyncing`.

`sync-retry` ditulis ulang: jalur sukses memeriksa `response.success`
(sebelumnya apa pun dianggap "tersambung kembali" lalu membatalkan retry),
toast terminal tidak lagi spam.

## Fase 4 — Anti-duplikat & penyimpanan
`3129287`

Pemeriksaan "minggu sudah terisi" hanya berjalan di cabang otomatis, sehingga
memilih slot yang sudah terisi tetap mengirim record kedua. Kini berlaku
untuk semua cabang.

`config` ikut dipersist (sebelumnya hanya records + koreksiList, jadi
`nominal` kembali ke 100000 setelah reload). `saveToLocalStorage()` dipanggil
pada jalur rollback. `response.record`/`.koreksi` wajib ada sebelum
dipaksakan. `loadCachedData()` memvalidasi bentuk hasil parse. Target koreksi
dikunci agar tidak menempel ke setoran lain saat jeda animasi 240 ms.

## Fase 5 — Dead code
`d0c01dc`

Dihapus tanpa mengubah satu piksel pun (dibuktikan lewat hash SVG):
`hx-grass` + `hx-ao` beserta pembuatnya (15 `<path>` dirakit tiap muat lalu
dihapus), `@keyframes hxBob`, `tapUpHouse` lama + `isBalloonFlying`, CSS
`.balloon-fly-away`/`.balloon-return`, dan aturan `display:none` yang
sebelumnya meniadakan semua itu.

`theme-v2-art` tidak lagi mencocokkan string markup persis — sekarang regex
yang tahan urutan atribut, dan anchor yang hilang dilaporkan lewat
`console.warn` (sebelumnya `String.replace` gagal match = no-op senyap).

## Fase 6 — Class yang tidak ter-generate
`9086561`

Audit dilakukan di browser dengan menelusuri `@media` secara rekursif.
`bg-black/98` tidak pernah ada → backdrop lightbox transparan
(`rgba(0,0,0,0)`), diganti `bg-black/85`. `z-35`/`z-25`/`z-15` tidak ada di
skala Tailwind v3, diganti `z-40`/`z-30`/`z-20`.

## Fase 7 — Guard, error boundary, aksesibilitas
`2b62ab0`

Inisialisasi dibungkus per langkah: sebelumnya satu lemparan mematikan
`syncWithGoogleBackend()` sehingga app diam-diam menampilkan cache lama
selamanya. Ditambahkan juga pengecekan `document.readyState`.

8 sheet/modal dapat `role="dialog"` + `aria-modal`; Escape menutup sheet;
layar pembuka jadi `inert` setelah masuk; `<label for>` pada alasan koreksi;
4 `<img src="">` dibuang; tombol Faris/Saiba tidak lagi ter-bind dua kali.

## Perbaikan susul — tampilan terpotong di desktop
`ca06138` (tag `vFixDesktop`)

`<main id="tabViewHome">` memakai `flex-1 overflow-hidden` tanpa scroll,
dan dua kartu minggu tidak punya `shrink-0`. Digabung `html, body { overflow:
hidden }` yang membuat halaman tidak bisa digulir sama sekali, kartu flex
dipampatkan saat viewport pendek. Karena `.faris-card-container` dan
`.saiba-card-ribbon` punya `overflow-hidden` sendiri, isinya terpotong:
judul tetap terlihat, 5 lingkaran timeline hilang. Di HP kebetulan muat,
jadi tidak pernah ketahuan.

Ambang clipping di lebar 1893px: aman sampai tinggi ~840px, terpotong mulai
di bawahnya (kartu faris hanya tersisa 30px dari 138px pada tinggi 600px).

Perubahan:
- `#appContainer` dapat `mx-auto max-w-xl`. Lebar kolom 576px ini sudah
  dipakai app di #bottomNav dan .sheet-content, jadi sekarang konsisten.
  Sheet dan layar pembuka ikut terkunci ke kolom tanpa disentuh satu per satu.
- `#tabViewHome`: `overflow-hidden` -> `overflow-y-auto no-scrollbar
  overscroll-contain min-h-0`, mengikuti pola yang sudah dipakai
  `#tabViewRiwayat`. `min-h-0` wajib, tanpa itu flex item tidak mau shrink
  di dalam `#appContainer` yang tingginya tetap.
- Dua kartu minggu dapat `shrink-0`.
- `body.lock-active`: selama layar pembuka aktif, area di luar kolom ikut
  gelap supaya panel pembuka tidak terlihat seperti kotak di atas kertas putih.
- `sw.js` CACHE_NAME v36 -> v37.

Verifikasi: sweep tinggi 400-1000px pada lebar 430 / 1280 / 1893 (21
kombinasi) - kartu selalu 140/138 dan 148/146, 5 lingkaran selalu terlihat,
tidak ada gepeng. Mobile 430x932 tidak berubah sama sekali (123/121 dan
132/130). Scroll berfungsi (scrollTop 0 -> 146), diorama tidak tertutup nav.
Regresi Fase 1/2/4 dan audit CSS diulang: semua tetap benar, 0 exception.


---

## Catatan

**Tidak ikut diperbaiki (di luar cakupan 7 fase)**

1. `timestamp` dari backend ditampilkan apa adanya. Kalau GAS mengirim ISO
   (`2026-08-28T03:15:00.000Z`), itu yang tampil mentah di kartu riwayat.
   Perlubiesan format tanggal.
2. Nama pengguna masih hardcode di ~45 titik; `config.namaA`/`namaB` ada
   tapi nol referensi.
3. `52` (target minggu) masih literal di tiga tempat, padahal
   `TOTAL_WEEKS_TARGET` sudah ada.
4. SVG Carl & Ellie diduplikasi 117 baris antara Home dan sheet tanaman, dan
   PNG rumah di-inline dua kali.
5. `today` dibekukan saat halaman dimuat (`const`), jadi app yang dibiarkan
   terbuka melewati tengah malam menampilkan minggu aktif yang salah.
6. `changeMonth()` tidak punya batas — bisa menggeser ke tahun 1900 atau 2099.

**Backend GAS tidak pernah diuji langsung.** `GAS_API_URL` menunjuk script di
Google Drive dan `Code.js`/`appsscript.json`-nya tidak ada di disk. Semua
perilaku server di atas disimulasikan dengan `page.route()` dan server uji
lokal, jadi bentuk response asli masih perlu dipastikan.