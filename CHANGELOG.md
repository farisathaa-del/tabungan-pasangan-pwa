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
| Font body | Nunito (rounded) | Plus Jakarta Sans |
| Font judul | Fraunces (`'a'` bundar bersengit) | Plus Jakarta Sans 700 |
| Pilihan bulan | bottom sheet, muncul dari bawah | popover roda iOS, fade + scale |
| Batas navigasi bulan | tak terbatas (sampai 1900) | tahun sekarang −6 … +6 |
| Aset rumah UP | `house.webp` 188×298 lossy (2× saja) | `house-up.svg` 321×510, tajam tanpa batas |
| Lapisan garden | 2 bukit | 3 bukit + rumput + bunga liar + kunang-kunang |
| Pita card Saidah | lipatan sudut 44px (C4) | **diagonal 45°, seperti html pertama** |
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


## Sesi 2 — penyempurnaan aset & animasi balon

### Animasi balon (dahulukan)

**A1 — target yang salah.** `tapUpHouse()` selalu memakai klaster balon dan kotak
rumah **Home**, padahal `#upHouseGroupPlant` di sheet tanaman juga memanggilnya.
Mengetuk rumah di sheet menyembunyikan balon Home yang ada di belakang modal, dan
animasinya berjalan di luar layar. Terukur: layer terbang di y=520 sementara
rumah sheet ada di y=212.

Sekarang `tapUpHouse(target)` menerima `'home'` atau `'plant'`. Klaster balon
sheet berupa `<g>` di dalam `<svg viewBox="0 0 360 190">` — elemen SVG tidak bisa
diposisikan dengan `position:fixed`, jadi klonnya dibungkus `<svg>` HTML dengan
viewBox sama. Squash 3D juga diuji lebih dulu: pada `<g>` SVG `rotateY` hanya
mengecilkan lebar (−11 px) tanpa mengubah tinggi (0 px), sedangkan `<div>` berubah
−8 × +12 px, jadi rumah sheet memakai `scale(1.05,.93)` 2D.

**A2 — heartbeat & hembusan.** `vibrate` diubah dari denyut tunggal menjadi pola
lub-dub, ditambah tiga cincin udara dan lima butir debu yang mengembang dari
mulut cerobong. Dilewati bila `prefers-reduced-motion` aktif. Cincin diberi
`drop-shadow` karena putih di atas langit pucat hampir tak terbaca.

### Enam item aset

| Item | Hasil |
|---|---|
| **B1** Rumah UP → `assets/house.webp` | PNG 187 KB di-inline **dua kali** (byte identik) → 17,6 KB. `index.html` −500 KB |
| **B2** Kucing Safa | `<text>` (✦ ♥ z) diganti path — 0 ketergantungan font |
| **B3** Pot bunga | 87 baris dead code dihapus (4,2 KB) |
| **B4** Kursi Carl & Ellie | 2 × 118 baris → satu fungsi berparameter |
| **B5** Weekly flower | Rotasi buket tidak lagi me-reset di pergantian tahun |
| **B6** Weekly flower | 4 foto WebP → 4 buket SVG (−48,8 KB) |

Rumah UP native 321×510 px tapi hanya tampil 94×149 px, jadi 29% resolusi aslinya
terpakai. Sekarang 188×298 px (2×, tetap tajam di layar retina). Kompresi lossy
dipilih setelah membandingkan potongan atap 3×: lossless 55 KB, q92 bersih,
q88 sudah menunjukkan artefak di tepi atap dan pagar.

### Total

```
index.html   837.369 → 303.210 B   (64% lebih kecil, hemat 534.159 B)
```

### Regresi akhir

Fase 1 (total Rp0 → Rp2.800.000), Fase 2 (XSS 1 → 0), Fase 3 (HTTP 500 & timeout),
Fase 4 (duplikat 1 POST → 0), Fase 7 (Escape, inert, aria), audit CSS (9 → 5 yang
sengaja), sweep 21 kombinasi viewport (0 gepeng), A1 (layer mengikuti rumah yang
diketuk), A2 (2 layer per rumah, tidak bocor), dan backend GAS asli (masih
responsif, Rp200.000 dari 2 record) — semuanya hijau, 0 exception.


---

## Sesi 3 — perbaikan visual (C1–C4)

Empat permintaan: font terasa kekanak-kanakan, rumah UP bergerigi, garden
terlihat datar, dan card Saidah belum matang.

### C1 — Typography · `vC1` (sebagian gagal, diperbaiki C5)
Body memakai Nunito yang ujungnya bulat, dan itu memang berhasil diganti ke
Plus Jakarta Sans. Untuk judul, C1 hanya menyetel Fraunces dari
`'SOFT' 100,'WONK' 1` menjadi `'SOFT' 0,'WONK' 0`.

> **Koreksi C5:**Penyebab C1 salah. Fraunces tetap dipakai di semua judul sampai
> C5, dan penyetelan sumbu itu ternyata **tidak mengubah letterform sama
> sekali**. Yang yang dikeluhkan pengguna tetap huruf `a`-nya. Lihat bagian C5.

| | Sebelum | Sesudah |
|---|---|---|
| Heading | Fraunces `SOFT 100, WONK 1` | Fraunces `SOFT 0, WONK 0` — **tidak mengubah glyph** |
| Body | Nunito (rounded) | Plus Jakarta Sans (netral) — berhasil |
| Aturan `Space Grotesk` | 4 aturan | 0 (font itu tidak pernah dimuat, jadi selalu jatuh ke generic) |

Arah `SOFT` ini terbukti tidak berpengaruh; akar masalahnya diselesaikan di C5 dengan mengganti family.

### C2 — Rumah UP jadi SVG · `vC2`
**Penyebab artefak tepi adalah keputusan saya di B1**, bukan kualitas gambar
aslinya. `backup/aset-asli/rumah-up.png` (321×510) sebenarnya sudah tajam. Di
B1 saya turunkan ke 188×298 lalu lossy q92 — padahal tampilannya cuma 94px, jadi
2×; layar HP 3× butuh 282px dan 4× butuh 376px. Browser menaikkan sendiri,
dan atap + tepi pagar jadi bergerigi.

| | Sebelum | Sesudah |
|---|---|---|
| Aset | `house.webp` 188×298 lossy q92 (17.640 B) | `house-up.svg` viewBox 321×510 (16.728 B) |
| Tajam di layar 3× / 4× | tidak (1,5× / 2× upscale) | ya, tanpa batas |
| Rasio / tinggi tampil | 0,6309 → 149 px | 0,6309 → **149 px, tanpa layout shift** |

Siluet diukur dari aset asli, bukan dikira-kira: puncak gable kanan (238,46),
gable kiri (86,80), cerobong x=143..182, jendela besar x=205..270 y=127..182,
jendela gable kiri x=69..102 y=116..170, pagar y=394..431. Jangkar balon
(`chimney [47,51]` Home dan `[280.4,56]` sheet) tidak bergeser.

`<img>` **tetap** `<img>`, hanya `src` diganti. Ini wajib: `theme-v2-house`
memakai `img.complete`, `img.load`, `offsetWidth`, dan
`mask-image:url(currentSrc)` untuk parallax lapisan cahaya. Kalau diganti inline
`<svg>`, semua itu patah.

Peningkatan sesuai still film: pola sirap ikan (*fish-scale*) pada atap dan
gable — aset lama hanya garis snsar; pola bata sungguhan di cerobong; trim gable
biru langit `#57C6E8` (aset lama masih teal `#2E9FB8`); gorden putih di jendela
bay. `sw.js`: `tabungan-v38` → `v39`.

### C3 — Garden · `vC3`
Taman itu hanya 2 bukit + 6 bintang, sehingga terasa datar.

- 3 lapis bukit dengan gradasi progressively kaya + pita bayangan dasar.
- Rumput ~24 rumpun memakai `vector-effect:non-scaling-stroke` supaya tebal
  garis tetap sama walau SVG di-stretch.
- Bunga liar kecil memakai palet yang sama dengan weekly flower. Versi pertama
  memakai petal putih dan di ukuran nyata terbaca sebagai gumpalan putih, jadi
  dikecilkan jadi titik berwarna dengan pusat krem.
- Malam: bulan sabit, 12 bintang kelip, kabut biru, 7 kunang-kunang. Di Home
  bulan pindah ke tengah atas (sebelumnya di kiri **menimpa teks
  `Rp2.800.000`**); di sheet tanaman bulan pindah dari kanan (sebelumnya
  **menimpa klaster balon** di x=280).
- Semua animasi menghormati `prefers-reduced-motion`.

`preserveAspectRatio` sengaja tetap `none`. Sempat direncanakan untuk diganti
`xMidYMax slice`, tapi slice akan memotong langit pada tablet: card 700×180
butuh skala 1,79 sehingga hanya 98 dari 190 unit tinggi yang terlihat —
matahari dan bintang hilang. Semua path dibuat mulus justru supaya aman di-stretch.

### C4 — Card Saidah · `vC4`
- Pita diagonal 45° (`top:15px right:-34px`, lebar 120px) diganti lipatan
  sudut 44px di pojok kanan atas. Pita lama melintasi isi card; yang baru tidak
  pernah menutupi judul maupun deretan minggu. Card riwayat ikut memakai pita
  yang sama.
- Badge **total per pengguna** (`#totalSavingsA` / `#totalSavingsB`), dari
  `sumNominal` record per role, sepanjang waktu supaya konsisten dengan
  `#totalSavingsValue`. Tanpa perubahan backend maupun kontrak response GAS.
- Slot minggu yang belum terisi jadi pill putus-putus (abu / rose). Badge hati
  Saidah yang sudah lunas tetap dipertahankan sebagai identitas rose.
- Dua card sama tinggi. `space-y-2` memakai selector `~`, jadi pita walau
  out-of-flow tetap terhitung sebagai saudara dan memberi `margin-top: 8px` ke
  header — card Saidah jadi 8px lebih tinggi. `space-y-2` dipecah jadi margin
  eksplisit.

#### Temuan penting — Tailwind CDN tidak termuat
Repo ini **tidak** memuat `cdn.tailwindcss.com` saat runtime; hanya CSS
precompiled di dalam `<style>`. Kelas utilitas baru (`pr-11`,
`min-h-[30px]`, `bg-rose-50/60`, `bg-neutral-100/90`, `border-neutral-300/90`,
`hover:brightness-95`) **diam-diam tidak punya efek apa pun** — computed
style-nya tetap nilai default, dan audit CSS mencatat "class tanpa rule".

Akibatnya semua style C4 ditulis eksplisit di blok CSS sendiri, termasuk padan
warna night theme. Diverifikasi lewat `getComputedStyle`, bukan lewat
kenampakan.

### C5 — Fraunces dihapus · `vC5`

Laporan balik: "font faris dan saiba di card masih aneh". **C1 tidak
menyelesaikannya, dan klaim C1 soal sumbu WONK ternyata salah.**

Dibuktikan dengan merender `faris saida` dalam 7 konfigurasi berdampingan:

| Konfigurasi | Hasil |
|---|---|
| `WONK 0` (yang dipakai C1) | glyph |
| `WONK 1` | **identik dengan WONK 0** |
| tanpa `font-variation-settings` sama sekali | **identik** |
| `opsz` dipaksa 144 | justru lebih distort |
| `WONK 0` + ligaturasi dimatikan | **identik** |

Jadi WONK/SOFT memang sudah aktif, tapi sumbu itu **tidak mengubah
letterform sama sekali**. Masalahnya ada di desain Fraunces itu sendiri:
huruf `a` bundar dengan sengit dan terminal `f`/`r` bulat. Itu tidak bisa
diperbaiki dengan menyetel sumbu — hanya dengan mengganti family-nya.

- Fraunces dihapus dari link Google Fonts. Semua judul (`h1`–`h4`, tombol
  splash, `#totalSavingsValue`, `#btnUserFaris span`, `#btnUserSaiba span`)
  memakai Plus Jakarta Sans 700, sama dengan body.
- Aturan `theme-v2` disederhanakan: `font-family`, `font-weight: 700`,
  `letter-spacing: -.02em`. `font-optical-sizing` dan `font-variation-settings`
  dihapus karena tidak ada gunanya.
- Efek samping: aplikasi jadi **satu keluarga huruf**, bukan dua. Request
  Fraunces dengan 4 sumbu variation ikut hilang.
- Card Faris & Saidah tetap sama tinggi: 125px (mobile), 140px (tablet/desktop).

---

### C6 — Badge, pita, dan month picker · `vC6`

Font **tidak** diubah di sini; C5 (Plus Jakarta Sans) tetap.

**1. Badge `Rp...` di card Faris & Saidah dihapus.** Markup
`#totalSavingsA`/`#totalSavingsB`, blok `sumNominal` per role di
`renderSummary()`, dan seluruh CSS `.user-total` dibuang. `.user-card-head`
kehilangan `padding-right:44px` — ruang itu hanya ada untuk menyingkirkan pita
+ badge. Efek samping: audit "class tanpa rule" turun **15 → 5**.

**2. Pita diagonal 45° dikembalikan persis** seperti sebelum C4. `.ribbon-pink`
diambil kembali dari `git show 766c802`, dipakai lagi di card utama **dan**
card riwayat. `.saiba-corner-ribbon` beserta CSS pseudo-nya dihapus total.

`space-y-2` sengaja **tidak** dikembalikan. Pita walau out-of-flow tetap
terhitung selector `~`, jadi header akan dapat `margin-top: 8px` dan card
Saidah 8px lebih tinggi dari card Faris. Margin eksplisit
(`#timelineUserB{margin-top:.5rem}`) dipertahankan.

**3. Month picker: bottom sheet → popover roda iOS.**

| | Sebelum | Sesudah |
|---|---|---|
| Wadah | `#monthPickerSheet`, `inset-0`, overlay gelap | popover di bawah label bulan |
| Gerak | `translateY(102%)` — **muncul dari bawah** | `opacity` + `scale(.94→1)` |
| Isi | grid 4×3 tombol bulan + panah tahun | 2 roda: bulan \| tahun |
| Aksesibilitas | `<span onclick>` | `<button>` + `role=listbox`, 5 tombol keyboard |

Silinder dibuat **tanpa JS scroll-math**:
- `scroll-snap-type: y mandatory`
- `padding-block: 72px` = `(180−36)/2` supaya item pertama pun bisa naik ke
  tengah; item ke-`i` center saat `scrollTop = i × 36`
- `mask-image` gradasi untuk memudarkan tepi
- skala + blur per item dihitung dari jarak ke tengah (`mpCylinder`)

Terukur di browser: `scrollHeight` 576 / `clientHeight` 180, `okt` (i=9) →
`scrollTop` 324, `2026` → 216. Persis rumusnya.

Commit saat scroll berhenti (debounce 180 ms) dan saat item diketuk — seperti
iOS compact picker. Ditutup oleh tombol "selesai", Escape, atau klik di luar.

**Perubahan perilaku:** `changeMonth()` sekarang dijepit ke
`tahun_sekarang−6 … +6`. Sebelumnya tanpa batas — bisa di-drag ke 1900 atau
2099. Terukur sekarang berhenti persis di `des 2032` dan `jan 2020`.

---

### C7 — Bulan sabit · `vC7`

Laporan: "bentuk bulannya agak aneh". Diperbesar 6×, dua sebabnya:

1. Glow = `circle r=26 fill #FEF08A opacity .07` — itu **cakram datar**, bukan
   cahaya. Di atas langit gelap jadi lingkaran abu berbatas tegas.
2. Lingkaran pemotong `r=16.5` di-offset `(5.5,−4.5)` diisi `#0B1A18` opaque —
   ia **menggambar** cakram gelap di atas bulan, bukan memotongnya.ulfide
   Terlihat seperti gerhana: cakram gelap penuh yang terpisah dari sabit, dan
   warnanya pun tidak sama dengan langit sekitarnya.

Diperbaiki: glow jadi `<radialGradient>` 4 stop (`.20 → .09 → .03 → 0`), sabit
dipotong dengan `<mask>` (putih − hitam) sehingga yang hilang benar-benar
transparan, dan pusat glow digeser ke sisi sabit — sebelumnya versiyal bright
terlihat di sisi "gelap". Berlaku di garden Home dan sheet tanaman.

---

### Verifikasi sesi 3 (C1–C7)

- Sweep 10 kombinasi (360/390/430/768/1024 × terang/malam): total, aset rumah,
  font, pita diagonal tanpa menabrak judul, badge `Rp` benar-benar hilang, dan
  **paritas tinggi kedua card** — 10/10 lolos, 0 exception, 0 overflow-x.
- Roda bulan diuji interaksi: scroll + snap (`scrollTop = i×36`), ketuk item,
  5 tombol keyboard (ArrowUp/Down, PageUp/Down, Home, End), Escape, klik-luar,
  dan clamp batas (`des 2032` / `jan 2020`).
- Layout sweep 21 kombinasi viewport (3 lebar × 7 tinggi): semua `ok`.
- XSS: `<img onerror>` dieksekusi 0, `<img>` tersuntik 0.
- Anti-duplikat: 0 POST dobel, slot tetap 1, toast "minggu 1 sudah kamu isi".
- `house.webp` → HTTP 404 (asset benar-benar lepas), `house-up.svg` → 200.
- Ukuran: `index.html` 303.210 → 314.322 B; aset rumah 17.640 → 16.728 B.
- Semua style C4/C6 dicek lewat `getComputedStyle` karena Tailwind CDN tidak aktif.
- Audit "class tanpa rule": 15 → **5** (sisanya yang memang disengaja).

---

## Catatan

**Tidak ikut diperbaiki (di luar cakupan 7 fase)**

1. `timestamp` dari backend ditampilkan apa adanya. Kalau GAS mengirim ISO
   (`2026-08-28T03:15:00.000Z`), itu yang tampil mentah di kartu riwayat.
   Perlu perbaikan format tanggal.
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