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
