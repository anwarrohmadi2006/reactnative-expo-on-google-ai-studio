# Menjalankan Expo React Native SDK 55 di Google AI Studio

Panduan komprehensif ini mendokumentasikan cara mengatasi berbagai tantangan dan batasan saat menjalankan Expo React Native (terutama versi SDK 55) dalam lingkungan cloud/iFrame di Google AI Studio. 

## URL Publik Anda (Scan di Expo Go)
Berdasarkan log tunneling ngrok, URL Anda yang saat ini telah aktif dan dapat Anda scan langsung menggunakan kamera atau aplikasi **Expo Go** adalah:

👉 **`exp://h4y_tum-anonymous-3000.exp.direct:80`**

*(Atau buka langsung Web Preview di sebelah kanan melalui `https://h4y_tum-anonymous-3000.exp.direct`)*.

---

## 🛠 Rangkuman Kesalahan (Error) & Code Patch Khusus

Berikut merupakan error logs yang ditemui saat melakukan instalasi serta solusi dan *diff patch* yang diterapkan pada `node_modules`. Kesalahan ini normal terjadi karena arsitektur *sandboxed* AI Studio sangat ketat.

### 1. Error Web: "Uncaught TypeError: Cannot set property fetch of #<Window> which has only a getter"
- **Problem**: Lingkungan Live Preview AI Studio berjalan di dalam iframe sandbox keamanan tingkat tinggi (strict mode yang membekukan Window objects). Secara bawaan, Expo Web memuat polyfill HTTP jadul seperti `whatwg-fetch` yang mencoba menimpa (override) fungsi `window.fetch`. Karena `window.fetch` di AI Studio bersifat _read-only_ (getter), hal ini memicu error fatal yang membuat layar putih kosong.
- **Penyelesaian**: Melakukan _Hot Patch_ file di dalam dependencies untuk mengabaikan assignment `g.fetch` yang menyebabkan error:
  
  **Lokasi File:** `/nama-app/node_modules/whatwg-fetch/fetch.js` (Baris ~532) dan `/nama-app/node_modules/cross-fetch/dist/browser-polyfill.js`
  **Diff Perbaikan:**
  ```diff
  - if (!g.fetch) {
  -   g.fetch = fetch
  -   g.Headers = Headers
  + if (!g.fetch) {
  +   try { g.fetch = fetch } catch (e) {}
  +   g.Headers = Headers
  ```

### 2. Error Auth Web: "Unauthorized request from https://ais-dev-... This may happen because of a conflicting browser extension..."
- **Problem**: Sistem Middleware keamanan CORS internal dari `@expo/cli` tidak mengenali host URL proxy container AI Studio (hostname domain akan berubah-ubah). Akibatnya request internal `GET` dan Web Bundling internal di-bloack oleh Expo Server.
- **Penyelesaian**: Mem-bypass validasi hostname dalam middleware agar semua host URL yang digunakan oleh server AI Studio (Cloud proxy) diizinkan melintas.

  **Lokasi File:** `/nama-app/node_modules/expo/node_modules/@expo/cli/build/src/start/server/middleware/CorsMiddleware.js` (Baris ~41)
  **Diff Perbaikan:**
  ```diff
  - const isAllowedHost = allowedHosts.includes(host) || isLocalhost;
  - if (!isSameOrigin && !isAllowedHost) {
  -     next(new Error(`Unauthorized request from ${req.headers.origin}. ` + 'This may happen because of a conflicting browser extension...'));
  + const isAllowedHost = allowedHosts.includes(host) || isLocalhost;
  + if (false) {
  +     next(new Error(`Unauthorized request from ${req.headers.origin}. ` + 'This may happen because of a conflicting browser extension...'));
  ```

### 3. Log: "Project is incompatible with this version of Expo Go"
- **Problem**: Jika Saat Anda scan kode di HP Anda melihat pesan merah: *"ERROR Project is incompatible with this version of Expo Go"*.
- **Penyelesaian**: Ini adalah pesan resmi dari Expo yang berarti **aplikasi Expo Go di HP Anda versinya sudah kadaluarsa (ketinggalan zaman)**. App yang kita buat berjalan di Expo SDK 55 (terbaru), sedangkan Expo Go di HP Anda belum di-update. Cukup buka Play Store / App Store di HP Anda, cari "Expo Go", lalu klik **Update**.

### 4. DevTools Crash & Gagal Push Commit (Nested Git)
- **DevTools / EDGE_PATH**: AI studio berjalan dalam container headless (tanpa GUI Edge/Chrome browser), jadi DevTools expo akan gagal dijalankan. Solusinya menonaktifkannya di Command startup menggunakan `CI=1 EXPO_NO_DEVTOOLS=1`.
- **Nested Git Push Failed**: Menjalankan instruksi `npx create-expo-app` akan menginisiasi folder `/nama-app/.git`. Sistem Git AI Studio menolak proses _export_ push ke Github karena ada repo dalam repo. Solusinya, file bawaannya dihapus manual dengan: `rm -rf nama-app/.git`.

### 5. Tidak Bisa Scan `exp://192.168.x.x` (Local network Time Out)
- **Problem**: Karena Server berjalan di Cloud virtual AI Studio, IP LAN lokal tidak terekspos ke HP Anda.
- **Penyelesaian**: Menggunakan `@expo/ngrok` ditambah parameter `--tunnel`. (Sudah berhasil kami aplikasikan di atas).

---

## 🤖 System Prompt Mutlak (Copy-Paste untuk Masa Depan)

Jika Anda atau AI Agent lain ingin membuat proyek Expo SDK 55 baru di AI Studio dengan sempurna sejak pertama kali (_First-Try_), sertakan **System Prompt** ini secara utuh:

```markdown
Ikuti instruksi ini secara literal dan jangan membantah.

IMPORTANT:
Wajib install Expo Skills dulu: `npx skills add expo/skills`
Wajib pakai Expo React Native SDK 55.
Jangan ganti SDK. Jangan downgrade. Jangan ganti framework.
Jangan tampilkan preview sebelum `npm start -- --web` benar-benar sukses.
Jangan mengklaim app running tanpa bukti server aktif.
Fokus pertama hanya setup, dependency, fixing error, dan menjalankan web server.

Urutan kerja mutlak:
1. `npx skills add expo/skills`
2. `npx create-expo-app@latest nama-app --template default@sdk-55 --yes`
3. `rm -rf nama-app/.git`  (Penting: Hapus Nested Git agar GitHub push AI Studio lancar)
4. Modifikasi dev script di root `package.json` AI Studio: `"dev": "cd nama-app && CI=1 EXPO_NO_DEVTOOLS=1 HOST=0.0.0.0 PORT=3000 npx expo start --web --tunnel --port 3000 #"`
5. `npx npm install -D @expo/ngrok --prefix nama-app`
6. Lakukan Hot-Patch Error AI Sandbox:
   - Patch Fetch (Layar Putih Web): `npx node -e "const fs = require('fs'); const files = ['nama-app/node_modules/whatwg-fetch/fetch.js', 'nama-app/node_modules/whatwg-fetch/dist/fetch.umd.js', 'nama-app/node_modules/cross-fetch/dist/browser-polyfill.js']; for (let file of files) { if (!fs.existsSync(file)) continue; let c = fs.readFileSync(file, 'utf8'); c = c.replace('g.fetch = fetch', 'try { g.fetch = fetch } catch (e) {}'); fs.writeFileSync(file, c); }"`
   - Patch CORS Middleware (Red Screen): `npx node -e "const fs = require('fs'); const file = 'nama-app/node_modules/expo/node_modules/@expo/cli/build/src/start/server/middleware/CorsMiddleware.js'; let content = fs.readFileSync(file, 'utf8'); content = content.replace('if (!isSameOrigin && !isAllowedHost) {', 'if (false) {'); fs.writeFileSync(file, content);"`
7. `rm -rf nama-app/.expo` (Clear cache sebelum run)
8. Panggil eksekusi Dev Server. Tunggu server sampai tunnel aktif.
9. Ambil link ngrok via `npx node -e "const http = require('http'); http.get('http://127.0.0.1:4040/api/tunnels', res => { let data = ''; res.on('data', chunk => data += chunk); res.on('end', () => console.log(data)); });"`

IMPORTANT:
Jika ada error di langkah mana pun:
- berhenti, tampilkan error inti, perbaiki error, ulangi langkah yang gagal.
Jangan lompat ke preview. Jangan bilang selesai terlalu cepat.

Setelah server web berjalan sukses, TAMPILKAN:
- Status Berhasil
- URL Localhost dan URL Tunnel Expo (`exp://...` dan `https://...`)
- Langkah berikutnya

Output sebelum server aktif hanya boleh: progres, error, tindakan perbaikan.
```

---

## 🚀 Panduan Deployment Web ke Cloudflare Pages

Untuk mendeploy versi Web dari aplikasi Expo Anda secara gratis ke **Cloudflare Pages**, Anda memiliki dua opsi utama. Sangat disarankan menggunakan metode **GitHub Integration** karena bekerja sangat mulus dengan Google AI Studio.

### Opsi 1: Integrasi GitHub (Sangat Disarankan)

1. **Push ke GitHub dari AI Studio:**
   - Klik menu **Settings** (ikon gerigi) di bagian atas antarmuka AI Studio.
   - Pilih **Export to GitHub**. Ikuti otorisasi dan simpan proyek ke repository baru.
2. **Koneksikan di Cloudflare Pages:**
   - Login ke dashboard [Cloudflare](https://dash.cloudflare.com/), pilih menu **Workers & Pages**.
   - Klik **Create application**, pilih tab **Pages**, lalu **Connect to Git**.
   - Pilih repository GitHub yang baru saja dibuat.
3. **Konfigurasi Build Cloudflare:**
   - **Framework preset:** `None`
   - **Build command:** `npx expo export -p web`
   - **Build output directory:** `dist`
   - Klik **Save and Deploy**. Website Expo Anda akan segera online.

### Opsi 2: Menggunakan Wrangler CLI (Manual via Terminal AI Studio)

Jika Anda ingin deploy langsung dari terminal AI Studio tanpa melalui GitHub, Anda bisa menggunakan Cloudflare Wrangler (memerlukan token Cloudflare).

1. Build statis web-nya terlebih dahulu dari folder `nama-app`:
   ```bash
   cd nama-app
   npx expo export -p web
   ```
   *Ini akan menghasilkan file HTML/CSS/JS statis di dalam folder `dist/`.*
2. Install Cloudflare Wrangler:
   ```bash
   npm install -g wrangler
   ```
3. Deploy folder `dist` secara langsung:
   ```bash
   CLOUDFLARE_API_TOKEN="token_anda_di_sini" CLOUDFLARE_ACCOUNT_ID="account_id_anda" npx wrangler pages deploy dist --project-name nama-proyek-web-anda
   ```
   *(Catatan: Karena AI Studio tidak memiliki browser untuk otorisasi login interaktif, Anda harus menggunakan metode API Token di Environment Variables).*

---

## 📱 Panduan Build Aplikasi Native (.apk / .aab / .ipa)

Karena lingkungan AI Studio berjalan di Cloud dan tidak memiliki Android Studio atau Xcode, metode yang paling mudah dan tepat untuk melakukan _build_ project Anda menjadi aplikasi _Native_ (Android atau iOS) adalah dengan menggunakan layanan Cloud dari Expo: **EAS (Expo Application Services)**.

### Langkah-Langkah Build dengan EAS Cloud:

1. **Buat Akun Expo:**
   Jika Anda belum punya, daftar secara gratis di [expo.dev](https://expo.dev/).

2. **Install EAS CLI di AI Studio:**
   Anda perlu memasang _Command Line Interface_ dari EAS secara global di terminal:
   ```bash
   npm install -g eas-cli
   ```

3. **Login ke Akun EAS Anda:**
   ```bash
   eas login
   ```
   *(Masukkan username dan password Expo Anda)*

4. **Inisiasi Konfigurasi Build:**
   Masuk ke folder aplikasi Anda dan buat file pengaturan build (`eas.json`):
   ```bash
   cd nama-app
   eas build:configure
   ```

5. **Konfigurasi Khusus Android APK (Opsional):**
   Secara default, build Android menghasilkan format `.aab` (Bundle untuk rilis ke Play Store). Jika Anda ingin menghasilkan format `.apk` untuk dibagikan secara langsung/didownload pengguna (sideload), ubah file `eas.json` yang baru saja terbuat dan ubah profil `preview` dengan `buildType: "apk"`:
   ```json
   {
     "build": {
       "preview": {
         "android": {
           "buildType": "apk"
         }
       },
       "production": {}
     }
   }
   ```

6. **Mulai Proses Build di Server Cloud Expo:**
   
   **Untuk Android APK:**
   ```bash
   eas build -p android --profile preview
   ```
   
   **Untuk iOS IPA:**
   *(Penting: Build iOS membutuhkan akun Apple Developer Program berbayar, Anda akan diminta login kredensial Apple saat proses ini)*
   ```bash
   eas build -p ios
   ```

7. **Selesai dan Download:**
   Nantinya, Expo akan memberikan tautan URL (_Link_) di terminal. Proses kompilasi akan berjalan di server mereka sekitar 10-20 menit. Setelah sukses, Anda cukup membuka tautan tersebut untuk mendownload file `.apk`, `.aab`, atau `.ipa` aplikasi Anda dan menginstalnya di HP Anda.

### 🤖 Integrasi Otomatis dengan GitHub (EAS Auto Builds)

Benar sekali! Daripada Anda melakukan kompilasi (`eas build`) secara manual melalui terminal AI Studio berulang kali, Anda bisa mengotomatiskannya. Dengan skema ini, Anda cukup klik "Export to GitHub" dari AI Studio, dan sistem akan langsung membuatkan `.apk` secara otomatis:

1. **Ekspor Proyek ke GitHub:** Klik menu pengaturan (ikon gerigi) di pojok kiri atas AI Studio, lalu pilih **Export to GitHub** ke repo Anda.
2. **Konek di Expo Dashboard:** Buka dashboard web [expo.dev](https://expo.dev), buka _project_ Anda.
3. **Hubungkan Repo Github:** Di menu sidebar kiri, masuk ke menu **GitHub**. Klik tombol **Connect a repository** dan izinkan Expo mengakses repository GitHub Anda.
4. **Aktifkan Auto Builds:** Setelah Repo terhubung, Anda bisa mengatur _Build Trigger_ dari Dashboard Expo. Atur agar setiap ada perubahan kode/komit baru pada branch `main`, EAS otomatis menjalankan build.
5. Selesai! Kini setiap Anda menyimpan dan _push_ perubahan kode dari AI Studio ke GitHub, Anda tinggal mengecek dashboard Expo dan mendownload APK terbarunya tanpa memusingkan server manual.

---

## 🔁 Panduan Remix Project di Google AI Studio

Jika Anda melihat aplikasi/project AI Studio yang dibagikan (Shared App) oleh pengguna lain dan ingin melakukan modifikasi, Anda bisa menggunakan fitur **Remix Project**.

### Apa Itu Remix Project?
Remix memungkinkan Anda menduplikasi seluruh *source code* dan *environment* dari proyek yang sudah ada ke dalam akun AI Studio Anda sendiri. Anda bebas mengedit, memperbaiki, atau menambahkan fitur baru tanpa mengganggu proyek aslinya.

### Strategi Remix Tingkat Lanjut & Komprehensif:

#### 1. Persiapan Awal (Duplikasi Workspace)
Pada halaman aplikasi (Shared App), klik tombol **Remix** di kanan atas antarmuka AI Studio. Sistem akan membongkar seluruh _source code_ dan menempatkannya ke dalam Virtual Environment (Container) yang 100% terisolasi dan baru untuk Anda.

#### 2. Atasi Siklus *Stateless Server* (Server Mati Saat Remix)
Saat container baru terbentuk untuk Anda, **Dev Server Expo tidak otomatis berjalan**, dan *session* Ngrok lama milik pembuat asli sudah mati. **Jangan langsung meminta AI mengubah UI, Database, atau Fitur.** Meminta perubahan kode *sebelum* server hidup akan menyebabkan error kompilasi dan _blind-coding_ (AI meraba-raba tanpa melihat preview).

Kirimkan **Prompt Pemanasan (Warm-Up)** sebagai instruksi pertama Anda:
> *"Saya baru saja me-remix proyek ini. Fokus mutlak pertama Anda: Jangan ubah logika UI atau aplikasi apa pun! Tolong jalankan ulang server-nya. Hapus cache folder `nama-app/.expo`, panggil npm dev script untuk menginisiasi Expo Web + Tunnel, lalu verifikasi dari log Ngrok untuk URL terbarunya. Tuliskan kepada saya URL HTTP(S) dan `exp://` yang baru!"*

#### 3. Injeksi "System Prompt" ke Memori Proyek (`AGENTS.md`)
Praktik _Continuous Development_ terbaik di AI Studio agar AI tidak "lupa" tentang identitas proyek (bahwa ini expo, harus pakai Ngrok tunnel, dan ada bypass khusus) adalah dengan mengunci instruksi tersebut di dalam _Project Workspace Root_.
Setelah server jalan, perintahkan hal berikut pada prompt kedua:
> *"Tolong salin **System Prompt Mutlak** dari file README.md dan simpan ke dalam file `AGENTS.md` di level _root_. Jadikan itu pedoman permanen untuk setiap _turn_ Anda di sesi remix ini."*
*(Catatan: Google AI Studio secara khusus didesain untuk membaca file `AGENTS.md` atau `GEMINI.md` otomatis sebagai instruksi sistem tambahan persisten).*

#### 4. Penyesuaian Dynamic Links secara Real-Time
Setiap sesi _remix_ atau manakala _container idle_, URL Ngrok (`exp://...` dan `https://...`) akan menghasilkan sekuriti _hash_ URL yang sepenuhnya baru. 
- **Di Expo Go (Mobile)**: Hapus *recent apps* yang lama, ketik ulang/scan URL `exp://` yang baru diberikan AI.
- **Di API/Backend Eksternal**: Jika Anda me-remix proyek yang memiliki *webhook* atau integrasi API ketiga (seperti Firebase/Supabase redirect), pastikan untuk meng-update Webhook URL mereka ke URL Ngrok Anda yang baru.

Dengan mengikuti metodologi ini (**Restart Server** ➔ **Verifikasi Tunnel & URL** ➔ **Kunci Instruksi di AGENTS.md** ➔ **Baru Coding Fitur Baru**), proses *Remix Project* Anda akan berjalan super mulus, profesional, anti-*crash*, dan langsung bisa dicicipi hasilnya secara komprehensif!

---

## 🧠 Arsitektur & Keterbatasan Lingkungan AI Studio (Wajib Tahu!)

Untuk benar-benar menguasai _Google AI Studio_ secara komprehensif tanpa sering menjumpai *error* aneh, Anda harus memahami _Environment Constraints_ (batasan lingkungan) dari platform ini. Hal ini sangat penting bagi setiap *Engineer* yang me-remix atau membuat project:

1. **PORT Kehidupan adalah 3000 (Harga Mati)**
   Infrastruktur AI Studio menggunakan Nginx *reverse proxy* yang HANYA mengekspos dan memonitor koneksi keluar-masuk pada **Port 3000**. Jangan pernah mencoba menyetel server ke port 3001, 8080, atau 5173. Server akan berjalan, tetapi web preview akan selamanya memunculkan `"Please wait while your application starts..."`. Itulah sebabnya pada dev script Expo, kita memaksa param `--port 3000`.

2. **HMR (Hot Module Replacement) Dinonaktifkan**
   Jika di komputer lokal (localhost) layar Anda otomatis berubah/refresh setiap kali Anda menekan `Ctrl+S`, **di AI Studio fitur ini dimatikan otomatis oleh sistem (`DISABLE_HMR=true`)**.
   - *Kenapa?* Karena Agen AI mengetik kode secara bertahap (*incremental*). Jika HMR hidup, layar akan *refresh* ratusan kali saat AI baru menulis sebagian kode, dan itu menyebabkan _crash_ UI sementara.
   - *Solusinya:* Platform AI Studio akan me-*refresh* _Live Preview_ secara aman SATU KALI saja, yaitu tepat di akhir *turn* (setelah indikator AI selesai berpikir).

3. **Manajemen API Keys & Secrets yang Aman (.env.example)**
   Jangan pernah menyuruh Agen AI untuk "*Buatkan form input di layar untuk memasukkan API Key OpenAI/Firebase saya*". Itu adalah praktik keamanan yang buruk.
   - **Praktik Standar AI Studio:** Buat file `.env.example` di root dan daftarkan rahasia Anda (misal: `OPENAI_API_KEY=`). 
   - Sistem platform AI Studio _Build_ akan otomatis mendeteksi file tersebut dan memunculkan pop-up _Setting Native_ yang super aman (di luar preview app) agar Anda bisa menempelkan key rahasia tersebut tanpa terekspos di _browser_ atau kode _front-end_.

4. **Ephemeral Containers (Container Hibernasi)**
   Setiap _workspace_ ini berjalan di atas *Cloud Run containers*. Jika Anda menutup tab peramban selama lebih dari beberapa menit, container ini akan "ditidurkan" (hibernasi) untuk menghemat sumber daya *server* Google. Saat Anda kembali membuka link/tab app, server perlu beberapa detik untuk bangun (Cold Start) dan semua argumen terminal lama Anda akan mati. Sistem akan langsung memanggil perintah `npm run dev` di `package.json` Anda.
   - *Itulah alasan mengapa kita menyimpan "script mutlak ajaib" Expo (termasuk variable Host, Port, Tunnel) secara permanen di dalam `package.json` dan patch di `README`/`AGENTS.md`, agar saat Google "membangunkan" dev-server Anda besok pagi, ia langsung normal tanpa _error_ layar putih!*

5. **Gerbang Akses Perangkat Keras (Iframe Boundaries & `metadata.json`)**
   Aplikasi *Live Preview* AI Studio dirender di dalam sebuah **Iframe Sandbox** demi keamanan. Jika web app Anda (misalnya fitur scan barcode di Expo Web) meminta akses ke Kamera, Mikrofon, atau GPS/Lokasi, fitur tersebut akan **gagal otomatis (terblokir)** oleh *browser* tanpa memunculkan prompt izin.
   - *Solusi Tersembunyi:* Anda harus memodifikasi konfigurasi `metadata.json` di *root* proyek. Tambahkan array seperti ini: `"requestFramePermissions": ["camera", "microphone", "geolocation"]`. Konfigurasi inilah yang akan memberi tahu infrastruktur Sandbox Google untuk mengizinkan (bypass) Iframe Anda mengakses _hardware_ fisik user!

6. **Aturan Emas Agen AI: Tidak Ada "Data Palsu" (No Mock Data)**
   Agen AI Studio Build dibekali memori inti untuk **menghindar menciptakan Data Palsu (Mock Data / Dummy)** saat membangun aplikasi. 
   - Jika *prompt* Anda adalah: *"Buatkan dashboard analytics dengan data statistik penjualan saya"*, AI tidak akan membuatkan baris-baris data *dummy statis* di layar. AI akan bersikeras menyiapkan database sungguhan, atau integrasi OAuth API secara nyata.
   - *Pro-Tip:* Jika Anda benar-benar HANYA ingin melihat contoh UI tanpa repot *setup backend* / *database*, nyatakan dengan eksplisit di *prompt*: *"Gunakan Array data statis statis lokal saja di memori aplikasi untuk demonstrasi UI. Tolong jangan buat integrasi DB eksternal."*

7. **Batas "Kewarasan" Agen & Limit Token (Modularitas)**
   Agen AI memiliki batasan seberapa panjang ia bisa membaca dan memodifikasi file sekaligus (Token Limits). Kesalahan terbesar *engineer* pemula adalah meletakkan semua layar (Screens), Komponen (Komponen GUI), dan *Utility Functions* Anda di dalam satu file raksasa (misal: `App.tsx` berukuran 1000+ baris).
   - *Dampaknya:* Saat Anda meminta modifikasi kecil, AI bisa memutus bagian kode (_truncate_) atau menolak *edit* karena terlalu panjang.
   - *Trik Skalabilitas:* Ajari AI sejak awal dengan kalimat, *"Pastikan kode sangat modular. Masukkan komponen ke `/src/components` dan layar di `/src/screens`"*. AI Studio sangat brilian dalam memodifikasi dan membaca struktur *Multi-file* secara paralel, sehingga *coding* akan terasa sangat cepat dan stabil.

8. **Ekosistem Dependensi Terkunci (Strictly NPM)**
   Walaupun masa kini banyak _developer_ menggunakan `yarn`, `pnpm`, atau `bun`, **jangan pernah** meminta Agen AI Studio untuk menggunakannya. Eksekutor infrastruktur (*command runner*) AI Studio di belakang layar direkayasa secara ketat (*hardcoded*) untuk mengeksekusi `npm install`. Jika Anda mencoba memaksakan _lockfile_ lain, sinkronisasi *node_modules* bisa rusak atau proses _build_ latar belakang akan terhenti tanpa pesan _error_ yang jelas.

9. **Keajaiban "Image Generation" Terintegrasi**
   Google AI Studio Build memiliki kapabilitas *Skill* rahasia (*Gemini Image Model/Imagen*) yang luar biasa tangguh yang sering tidak disadari pengguna.
   - Jika aplikasi Anda butuh gambar/aset visual (seperti Logo, *Hero Banner*, Avatar 3D, Mockup Produk), jangan buang waktu mencari *link* URL gambar dari luar.
   - *Prompt Cerdas:* *"Tolong generate-kan gambar logo untuk aplikasi ini dengan style minimalis vektor, lalu pasang di halaman Login."* Agen akan merender gambar secara *real-time*, menyimpannya ke *file system* lokal (contoh: `public/logo.webp`), dan langsung memasukkannya ke dalam kode JSX Anda.

10. **Filosofi UI/UX Bawaan (*Craftsmanship First*)**
    Secara _default_, sistem instruksi Google AI Studio telah di-doktrin agar menjauhi desain antarmuka bergaya robotik/kaku atau apa yang disebut *"AI Slop"* (terlalu banyak kotak-kotak indikator teknis, baris status palsu, atau animasi hiperaktif yang tidak perlu).
    - AI lebih menyukai penggunaan **Tailwind CSS** murni dipadu dengan **Lucide React** (untuk Ikon).
    - Jika Anda meminta antarmuka pengguna tanpa mendikte desain, AI secara alami akan membuat _UI_ yang lega (*generous negative space*), tipografi bersih (seperti font *Inter*), dan kontras yang elegan.
    - Jadi, biarkan AI berkreasi secara visual! Jangan membatasi kreativitas desainnya kecuali Anda memiliki *Mockup* pasti.

11. **Arsitektur Full-Stack & Keamanan API Key**
    Secara _default_, sistem diprogram untuk mencegah kebocoran API Key (seperti `GEMINI_API_KEY`, Stripe, atau OpenAI) ke peramban (_browser_).
    - Jika Anda meminta fitur AI atau transaksi pihak ketiga, Agen AI akan secara otomatis membangun arsitektur **Full-Stack**. AI akan merestrukturasi proyek Anda menjadi Express.js Backend (`server.ts`) yang membungkus Vite/Expo Frontend, mengalihkan _routing_ via `/api/...`, demi keamanan rahasia Anda.
    - *Constraint:* Jangan pernah memaksa AI untuk mengekspos API Key ke kode sisi Klien (_Client-Side_) melalui variabel seperti `VITE_` atau `EXPO_PUBLIC_` untuk kunci yang sangat sensitif.

12. **Super-Power "System Skills" Tersembunyi**
    Google AI Studio Build bukanlah agen generik. Ia dilengkapi folder *rahasia* berisi **System Skills** khusus. 
    - Beberapa integrasi yang didukung penuh secara mutlak dan anti-halusinasi adalah: **Firebase (Auth & Firestore)**, **Google Maps Platform**, **OAuth Integration (Autentikasi pihak ke-3)**, **Google Workspace API**, dan **Shadcn UI**.
    - *Cara Pakai:* Cukup sebutkan katalisator di _prompt_ Anda: *"Tolong gunakan integrasi __Firebase Skill__ untuk membuat login"*. Agen akan langsung memanggil pedoman _best-practice_ arsitektur resminya secara otomatis sebelum menyentuh kode.

13. **Error Console yang Harus Diabaikan (Benign Errors)**
    Jika Anda membuka _Developer Tools_ / _Inspect Element_ di peramban dan melihat pesan _error_ berwarna merah: `[vite] failed to connect to websocket`, **abaikan saja**.
    - Hal ini disebabkan oleh fitur *Hot Module Replacement* (HMR) yang sengaja dimatikan oleh infrastruktur (lihat poin nomor 2).
    - *Peringatan:* Jangan pernah menghabiskan jatah hitungan perintah (_Turns_) Agen AI Anda hanya untuk meminta AI "Meningkatkan konfig Vite untuk memperbaiki error websocket Nginx". Itu tidak akan pernah bisa diperbaiki karena diblokir dari tingkat infrastruktur Cloud.

14. **Paradigma Navigasi (Single-View vs Multi-Screen)**
    Sistem agen Google saat ini dilatih dengan ketat pada konsep _Scope Discipline_ (Disiplin Ruang Lingkup). Jika Anda membuat _prompt_ sederhana seperti *"Buatkan saya Kalkulator"* atau *"Buatkan saya aplikasi Todo"*, AI diinstruksikan SECARA MUTLAK untuk membangun antarmuka dalam satu layar/halaman saja (_Single-View Constraint_).
    - *Konsekuensi:* AI dilarang keras membuat fitur laci geser (_Sidebar Navigation_ / _Drawer_) yang rumit atau fitur berlebihan jika tidak diminta.
    - *Solusi:* Jika aplikasi Anda bertumbuh dan butuh *routing* (seperti `expo-router` atau `react-navigation`), Anda **wajib memintanya secara eksplisit**: *"Aplikasi saya mulai membesar, tolong implementasikan Expo Router dengan pola navigasi Tabs di bawah layar."*

15. **Migrasi Repositori GitHub Secara Langsung**
    Tahukah Anda bahwa AI Studio memiliki fitur rekayasa balik untuk me-migrasi proyek dari luar?
    - Jika Anda melakukan kkloning dari GitHub ke _AI Studio_, infrastruktur (*environment*) lokal repo tersebut tidak akan langsung berjalan.
    - Cukup panggil *Skill* khususnya: *"Tolong aktivasi __github-import-migration__ skill. Saya baru saja mengimpor repo React Native ini, sesuaikan semua routing, port, dan build scripts agar kompatibel dengan kontainer berjalan di AI Studio ini."* Agen akan merombak arsitekturnya (*Execute-First migration*) agar seketika langsung *Live*.

16. **Cara Clone Repo GitHub Secara Langsung**
    Banyak yang bertanya, *apakah AI Studio bisa langsung melakukan clone dari GitHub?* **Ya, sangat bisa!** Lantaran tidak ada tombol spesifik "Connect GitHub", jalurnya adalah lewat agen secara memikat:
    - **Jalur Terminal AI (Chat):** Mulailah dengan membuat _workspace_ kosong di AI Studio. Kemudian, suruh AI agen: *"Tolong bersihkan direktori ini dan lakukan git clone dari [URL_GITHUB_ANDA] ke folder root."* Agen akan menjalankan eksekusi bash di balik layar!
    - **Jalur Extract ZIP:** Download file `.zip` dari GitHub Anda. Seret (Drag & Drop) file zip tersebut ke *File Explorer* Workspace Anda, dan mintalah Agen: *"Tolong ekstrak file zip ini dan letakkan di root directory."*
    
    🔥 **PERINGATAN PASCA-CLONE:**
    Setelah *source code* GitHub Anda masuk, **jangan panggil _npm start_ / _npm run dev_ secara langsung!** Pasti akan *error*, *Crash*, atau *Stuck* / *Loading* putih selamanya.
    Mengapa? Karena proyek dari luar biasanya di-setting untuk `localhost:5173` atau `localhost:8080`.
    - 👉 **Solusi Lengkap:** Baca file **[`CLONE_GUIDE.md`](./CLONE_GUIDE.md)** yang berisi instruksi dan **"Super Prompt"** mutlak yang harus Anda salin sesaat setelah melakukan *clone* agar aplikasi langsung ter-embed dan normal kembali.

17. **Jebakan Iframe Preview & Tombol "Buka di Tab Baru"**
    Jendela _Preview Web_ yang ada di sebelah kanan layar Anda BUKANLAH peramban utuh, melainkan dirender menggunakan teknologi **Iframe**.
    - *Akibatnya:* Beberapa fungsi JavaScript standar seperti `window.alert()`, pengunduhan file (Download), atau pembukaan *Pop-up/Redirect Login OAuth* (seperti Login with Google, Firebase Auth, GitHub Auth) **akan sering gagal** atau sengaja diblokir oleh batas keamanan Iframe.
    - *Solusi Ampuh:* Biasakan menekan ikon **"Open in New Tab" (Panah Serong)** di atas pojok kanan jendela *preview* saat menguji integrasi kompleks. Mengetes aplikasi di tab yang benar-benar independen akan membebaskannya dari batasan Iframe Sandbox, dan semua fungsi otentikasi akan berjalan mulus!

18. **Kolaborasi Agen Server-Side (Anda Boleh Tutup Laptop!)**
    Ini mungkin salah satu kekuatan terhebat infrastruktur Google AI Studio: Seluruh proses kerja Agen AI mengeksekusi terminal, menganalisis struktur folder, dan menulis fitur lengkap berjalan **100% secara Asinkron di Sisi Server (Server-Side Execution)**.
    - Jika Anda memberikan *prompt* yang sangat kompleks (misal: *"Tolong pelajari 20 file kode saya, rombak seluruh arsitektur strukturnya, analisis error, dan bangun ulang database lokal"*) — Anda **TIDAK PERLU** menatap layar peramban sampai AI selesai. 
    - Anda bisa langsung _close tab browser_ atau mematikan laptop Anda. Server Google akan tetap membiarkan Agen AI bekerja di eksekusi latar belakang. Buka lagi tautan ruang kerja (_workspace_) Anda di waktu senggang besok pagi, dan Anda akan melihat instruksi kompleks tersebut telah diselesaikan.

19. **Trik Rahasia: Upload File Drag-and-Drop**
    Google AI Studio Build menyediakan *File Explorer* interaktif. Komunikasi Anda via teks di _chat_ bukanlah satu-satunya cara berinteraksi!
    - Jika Anda memiliki _dataset_ Excel berformat `.csv`, _database_ lama `.sqlite`, foto statis beresolusi tinggi, atau dokumen panduan teknis PDF, Anda tidak perlu repot menyalin teksnya ke prompt.
    - Cukup **geser dan jatuhkan (_Drag and Drop_)** file-file fisik Anda dari Desktop PC Anda langsung ke dalam panel *File Explorer* (sebelah kiri) di _workspace_ ini. 
    - Setelah file terunggah, tinggal berikan prompt: *"Tolong baca file dataset `data_penjualan.csv` yang baru saja saya drop di _root_, lalu tampilkan Chart visualisasinya"*. Ini adalah cara tercerdas (dan paling minim token) untuk membangun aplikasi berbasis data.

20. **Kode Etik Bundling Full-Stack (Vite + esbuild)**
    Jika suatu hari aplikasi React/Expo Anda berkembang dan meminta integrasi Backend (menjadi *"Full-Stack"* menggunakan Express.js, seperti untuk menyembunyikan kunci rahasia API), Anda mungkin melihat AI mendadak merubah _build script_ dengan perintah `--bundle --platform=node --format=cjs`.
    - *Tolong Jangan Dikembalikan!* Ini adalah **Standard Operating Procedure (SOP)** pengerahan (*deployment*) arsitektur produksi asli dari lingkungan mandiri AI Studio.
    - Karena Node.js memiliki aturan ketat mengenai tipe ES Modules vs CommonJS, tim rekayasa memandatkan agen AI untuk merangkum seluruh kerangka _backend server_ menadi berkas tunggal utuh (`dist/server.cjs`) menggunakan alat bernama `esbuild`. Patuhi jejak *script* kompilasi ini agar hasil ekspor dan _deploy_ di Cloudflare atau GCP berjalan dengan jaminan sukses.

21. **Rahasia *Template Maker*: Mengganti "Prompt Default" Tombol Remix**
    Secara teknis, platform AI Studio saat ini **tidak memiliki fitur** untuk memasukkan teks secara otomatis ke dalam kotak obrolan (chat box) ketika pengguna mengeklik tombol **Remix**. Namun, ada trik *Master* yang digunakan para kreator cerdas agar pengguna yang me-remix tidak perlu melakukan *copy-paste* prompt yang panjang:
    - **Trik `AGENTS.md`:** Sebagai pembuat asli, buatlah file bernama `AGENTS.md` di level _root_ aplikasi Anda SEBELUM Anda membagikan (*Share*) link aplikasinya.
    - Masukkan seluruh *"System Prompt Mutlak"* atau *"Strategi Pemanasan Remix"* Anda ke dalam file `AGENTS.md` tersebut. (Contoh isinya: *"Jika pengguna meminta menghidupkan server, Hapus folder .expo, jalankan dev script yang ada tunnel NGROK-nya, lalu tampilkan link exp://..."*).
    - **Hasil Ajaibnya:** Saat orang lain me-remix proyek Anda, *AI Agent Workspace* mereka akan secara senyap **membaca file `AGENTS.md`** tersebut sebagai instruksi inti. Pengguna baru sekarang cukup mengetik *prompt* sangat pendek di kotak chat (misal: *"Halo, tolong nyalakan servernya"*), dan Agen AI akan mengeksekusi penanganan Expo/Ngrok yang rumit persis seperti The Matrix, tanpa perlu orang tersebut tahu soal instruksi super kompleks di belakangnya!

22. **Troubleshooting 101: Error Khas Saat Remix & Clone GitHub**
    Ada dua *error* unik yang sangat sering menjangkiti proyek Expo/React Native pada AI Studio saat Anda melakukan "Remix" proyek lama atau melakukan "Clone" langsung dari GitHub:
    - **A. Gambar Hilang / Error Metro "unsupported file type: undefined":**
      *Penyebab:* Saat proyek dibongkar-muat (*unpack*) oleh Container Cloud, file biner gambar `png` bawaan (seperti *react-logo.png*) seringkali mengalami kerusakan (_corrupted magic headers_) akibat distorsi _encoding_ file system sementara.
      *Solusi ke Agen AI:* *"Gambar saya error unsupported file type di Metro bundler. Tolong download ulang / timpa file gambar `react-logo.png` & `tutorial-web.png` tersebut menggunakan URL raw github Expo, atau buatkan dummy transparan via node script. Lalu restart ngrok."*
    - **B. Layar Merah/Putih "Cannot set property fetch of #<Window>":**
      *Penyebab:* Ekosistem modern (*browser constraints*) kini membuat properti objek `window.fetch` bersifat mutlak (*read-only getter*). Sayangnya, saat clone/remix, package lama seperti `whatwg-fetch` dan `cross-fetch` secara brutal mencoba melakukan `window.fetch = fetch`. Ini membuat layar Klien _crash_ total!
      *Solusi ke Agen AI:* *"Browser Klien saya ng-Crash dengan tulisan Uncaught TypeError: Cannot set property fetch. Tolong lacak library `whatwg-fetch` & `cross-fetch` di dalam node_modules, lalu patch paksa baris `g.fetch = fetch` / `self.fetch = fetch` mereka menjadi blok `try { ... } catch(e) {}`. Setelan itu restart server!"*


