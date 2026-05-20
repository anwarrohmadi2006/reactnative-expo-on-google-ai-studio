# Menjalankan Expo React Native SDK 55 di Google AI Studio

Panduan komprehensif ini mendokumentasikan cara mengatasi berbagai tantangan dan batasan saat menjalankan Expo React Native (terutama versi SDK 55) dalam lingkungan cloud/iFrame di Google AI Studio. 

## URL Publik Anda (Scan di Expo Go)
Berdasarkan log tunneling ngrok, URL Anda yang saat ini telah aktif dan dapat Anda scan langsung menggunakan kamera atau aplikasi **Expo Go** adalah:

👉 **`exp://mbe6t78-anonymous-3000.exp.direct:80`**

*(Atau buka langsung Web Preview di sebelah kanan)*.

---

## Rangkuman Kesalahan (Error) & Solusinya

Berikut merupakan error logs yang umum ditemui saat melakukan instalasi serta solusi yang diterapkan:

### 1. DevTools Crash (Server Timeout / Blank Putih)
- **Problem**: Saat pertama di-setup, server sering stuck atau gagal memuat web. Error sering terjadi di server background jika React Native DevTools mencoba meluncurkan debugger GUI, yang tidak didukung oleh lingkungan AI Studio.
- **Penyelesaian**: Non-aktifkan DevTools dengan memberikan Environment Variables:
  ```bash
  CI=1 EXPO_NO_DEVTOOLS=1 npx expo start --web
  ```

### 2. Error Web: "Uncaught TypeError: Cannot set property fetch of #<Window> which has only a getter"
- **Problem**: Lingkungan Live Preview AI Studio berjalan di dalam iframe sandbox keamanan tingkat tinggi (strict mode yang membekukan Window objects). Secara bawaan, Expo Web memuat polyfill HTTP jadul seperti `whatwg-fetch` yang mencoba menimpa (override) fungsi `window.fetch`. Karena `window.fetch` bersifat _read-only_ (getter), hal ini memicu error _fatal_ yang membuat aplikasi crash (layar putih).
- **Penyelesaian**: Kami memodifikasi file bawaan di dalam folder instalasi.
  Bypass `g.fetch = fetch` di dalam file `/nama-app/node_modules/whatwg-fetch/fetch.js` dengan _try-catch_, sehingga polyfill tidak lagi memicu error tersebut:
  ```javascript
  try { g.fetch = fetch } catch (e) {}
  ```

### 3. Error Auth Web: "Unauthorized request from https://ais-dev-... This may happen because of a conflicting browser extension..."
- **Problem**: Sistem Middleware dari `@expo/cli` (file `CorsMiddleware.js`) tidak mengenali host URL acak dari proxy AI Studio (karena domain URL berubah-ubah di ngrok/proxy). Ini memicu pesan _Unauthorized request_.
- **Penyelesaian**: Kami mengubah skrip inti dari Expo Dev Server:
  Patch di `/nama-app/node_modules/expo/node_modules/@expo/cli/build/src/start/server/middleware/CorsMiddleware.js`.
  Mengubah pemeriksaan logika yang menge-block request seperti ini:
  ```javascript
  // Diubah menjadi
  if (false) {
  ```
  Hal ini mengizinkan domain preview AI Studio memuat resource Expo Web Server dengan mulus.

### 4. Gagal Push Commit ke GitHub (Nested Git)
- **Problem**: Seringkali pengguna gagal saat menekan tombol ekspor "Push to GitHub" ke repo personal mereka. Pesan tidak begitu jelas (Failed to push commit to github).
- **Penyelesaian**: Secara bawaan, perintah `create-expo-app nama-app` secara otomatis menginisiasi repositori git di dalam folder `/nama-app/` (`/nama-app/.git`). Hal ini bertentangan dengan sistem Git indukan di _root workspace_ AI Studio (Menciptakan konflik _Nested Git Repository_).
  Tindakan koreksi adalah menghapus folder tersebut menggunakan terminal:
  ```bash
  rm -rf nama-app/.git
  ```

### 5. Tidak Bisa Scan Barcode `exp://` (Aplikasi Expo Go di HP)
- **Problem**: Karena Server berjalan di Cloud virtual AI Studio (Bukan terhubung pada jaringan router WiFi/MNC di rumah Anda), jika Anda menggunakan default (LAN URL), koneksi di Smartphone akan _Time Out_.
- **Penyelesaian**: Menggunakan fitur Tunnel dari Ngrok. Kami menginstal `@expo/ngrok` ke proyek dan memodifikasi _Startup command_ dengan menyertakan argumen `--tunnel`:
  ```bash
  npx expo start --tunnel --web
  ```

---

## 🛠️ System Prompt Komprehensif (Bisa Di-Copy Paste)

Jika Anda ingin mendirikan proyek Expo SDK 55 baru di AI Studio, sertakan **System Prompt** / Instruksi berikut secara harfiah kepada Agen AI:

```markdown
Kamu adalah pakar Expo React Native. Instruksi ini bersifat mutlak dan harfiah. 
Eksekusi instalasi dan atasi setiap bug bawaan (AI Studio environment) secara berurutan:

1. INISIASI PROYEK EXPO:
   - Bikin proyek baru: `npx create-expo-app@latest my-app --template default@sdk-55 --yes`
   - Update `package.json` di ROOT AI Studio (bukan yang di my-app), ubah script `dev` menjadi:
     `"dev": "cd my-app && CI=1 EXPO_NO_DEVTOOLS=1 HOST=0.0.0.0 PORT=3000 npx expo start --web --tunnel --port 3000 #"`

2. DEPENDENCIES & CLEAN GIT:
   - Install dependencies tambahan ngrok: `npx npm install -D @expo/ngrok --prefix my-app`
   - Wajib hapus file Git bawaan agar github push AI Studio tidak gagal: `rm -rf my-app/.git`

3. PATCH ERROR KRONIS AI STUDIO:
   - (A) Patch Fetch Window (Untuk layer putih "Cannot set property fetch..."): 
     Jalankan script bash perbaikan polyfill: 
     `npx node -e "const fs = require('fs'); const file = 'my-app/node_modules/whatwg-fetch/fetch.js'; let content = fs.readFileSync(file, 'utf8'); content = content.replace('g.fetch = fetch', 'try { g.fetch = fetch } catch (e) {}'); fs.writeFileSync(file, content);"`
   - (B) Patch CORS Expo (Untuk red screen "Unauthorized request..."): 
     Jalankan script bash untuk buka akses middleware:
     `npx node -e "const fs = require('fs'); const file = 'my-app/node_modules/expo/node_modules/@expo/cli/build/src/start/server/middleware/CorsMiddleware.js'; let content = fs.readFileSync(file, 'utf8'); content = content.replace('if (!isSameOrigin && !isAllowedHost) {', 'if (false) {'); fs.writeFileSync(file, content);"`

4. RESTART DEV SERVER DAN TAMPILAN
   - Setelah sukses patch code di atas, restart dev server platform
   - Ambil URL Publik hasil tunnel lewat API Ngrok internal (port 4040): 
     `npx node -e "const http = require('http'); http.get('http://127.0.0.1:4040/api/tunnels', res => { let data = ''; res.on('data', chunk => data += chunk); res.on('end', () => console.log(data)); });"`
   - Respon dengan menyajikan link Expo Go yaitu `exp://<ID>.exp.direct:80`
   - Jangan tampilkan asumsi salah seolah instalasi berhasil jika Web Preview masih mati. Pastikan semua patch di apply.
```
