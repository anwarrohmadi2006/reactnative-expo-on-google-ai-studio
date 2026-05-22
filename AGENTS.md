# 🤖 INSTRUKSI CORE (SYSTEM AGENT GUIDELINES)
*Dokumen ini adalah pedoman mutlak untuk agen Google AI Studio yang beroperasi di *workspace* ini. Wajib dipelajari dan ditaati pada setiap inisiasi sesi atau saat "Remix".*

---

## 1. KONTEKS WORKSPACE & INFRASTRUKTUR
- **Lingkungan Eksekusi:** Container Cloud (Google AI Studio Sandbox). Bersifat *stateless* dan *ephemeral* (dapat tertidur/hibernasi jika ditinggalkan).
- **Tumpukan Teknologi (Tech Stack):** React Native (Expo SDK 55) untuk target Web & Mobile.
- **Port Wajib (Harga Mati):** Infrastruktur sistem (Nginx) HANYA merutekan koneksi keluar-masuk pada HOST `0.0.0.0` dan PORT `3000`. Dilarang keras menggunakan port lain (misal: 3001, 8080).
- **Preview Iframe Boundaries:** Pratinjau layar (Live Preview) dirender menggunakan Iframe di peramban. Jika Web-App membutuhkan akses fitur *hardware* (seperti kamera, mikrofon, geolokasi), WAJIB daftarkan propertinya di dalam konfigurasi `metadata.json` (array `requestFramePermissions`) agar sistem mem-bypass proteksi Iframe.

---

## 2. STANDAR OPERASIONAL PROSEDUR (SOP) SAAT "REMIX" ATAU CONTAINER-WAKEUP
Jika interaksi pertama dari pengguna meminta *"menyalakan server"*, *"melihat pratinjau"*, atau aplikasi sedang memperlihatkan kondisi mati/blank:
1. **Tunda Kodifikasi UI:** JANGAN mengubah kode logika (seperti `App.js` / komponen) apa pun terlebih dahulu. Fokus utamakan hidupnya infrastruktur.
2. **Jalankan Patch & Setup Otomatis:** Eksekusi perintah setup di root workspace:
   `node setup-gstudio.cjs`
   (Ini akan otomatis menjalankan `npm install`, mem-patch polyfill fetch read-only, membypass CORS middleware Expo CLI, memperbaiki biner gambar rusak, dan membersihkan folder cache `.expo`).
3. **Start Asinkron:** Jalankan skrip *development* secara *background* (agar tidak memblokir perintah lain): 
   `npm run dev`
4. **Ekstraksi Dynamic Tunnel:** Anda WAJIB mendapatkan URL Ngrok aktif melalui skrip pinger:
   `npx node -e "const http = require('http'); http.get('http://127.0.0.1:4040/api/tunnels', res => { let data = ''; res.on('data', chunk => data += chunk); res.on('end', () => console.log(data)); });"`
5. **Publikasi URL Real-Time:** Ekstrak _response_ pada langkah 4 dan tampilkan URL berawalan `exp:///..` (untuk tes di Expo Go Mobile) serta `https://...` (untuk tes *Open in New Tab*) secara rapi dan profesional kepada pengguna. 

---

## 3. ATURAN EMAS REKAYASA KODE (HARD RULES)
- **Hanya NPM (Strictly NPM):** WAJIB HANYA menggunakan `npm` untuk semua instalasi (*backend runner* di-hardcode khusus NPM). JANGAN PERNAH gunakan `yarn`, `pnpm`, atau `bun`.
- **Eksekusi Alat Berkas Terurut:** Dilarang keras melakukan _blind edit_ (menulis ulang buta). Selalu jalankan `view_file` pada target sebelum menggunakan `edit_file` atau `multi_edit_file` untuk menghindari *TargetContent not found*.
- **Pecah Skala Berkas (Modularitas):** Ingat *Token Limits* (batas baca wajar Anda). Jangan melahirkan *file* raksasa melebihi ratusan baris. Selalu pecah *(extract)* setiap UI, tombol, dan _screen_ baru ke dalam folder seperti `/src/components/*` dan `/src/screens/*`.
- **Abaikan WebSocket HMR:** *Hot Module Replacement* (HMR) dimatikan (`DISABLE_HMR=true`) di lingkungan ini agar preview tidak terus menerus _crash_ selagi Anda menulis setengah jalan. Abaikan semua pesan *error* konsol tentang WebSocket (seperti `[vite] failed to connect...`). JANGAN BUANG WAKTU menyesuaikan konfigurasi `.config` untuk memperbaikinya.

---

## 4. KEAMANAN & ARSITEKTUR DATA
- **Paradigma Data Asli (No Mock Data):** Agen Google AI tidak boleh menggunakan baris-baris data *dummy statis/palsu* ketika diminta merakit _dashboard/UI_, melainkan wajib membangun integrasi sistem yang riil (OAUTH asli, API Asli, Storage DB seperti Firebase/Turso, atau State lokal jika sekadar Todo). Gunakan Mock Data HANYA JIKA pengguna secara spesifik berpesan: _"Gunakan dummy/mock data saja"_.
- **Sistem Pengelola Rahasia (.env.example):** Jika mendapati/menambahkan kunci rahasia (*Environment Variables/API keys*), Anda WAJIB mendeklarasikannya di `.env.example`. Jangan pernah merakit komponen formulir input (*Input Field*) di dalam kode UI HANYA JIKA Tujuannya untuk menangkap API Key.
- **Arsitektur Sisi Server Rahasia:** Jika pengguna meminta integrasi Layanan AI (Cth: Gemini, OpenAI, Stripe) yang memerlukan autentikasi API Key (*Secret Key*), pindahkan alur integrasinya dari Klien (*Client-Side*) menjadi sistem sisi peladen (*Server-Side/Fullstack Express HTTP*). Dilarang terekspos menggunakan proksi seperti `EXPO_PUBLIC_` karena sangat rawan pencurian _token_. 

---

## 5. MANUVER VISUAL & UX (DESAIN KRIYAWAN)
- **Fokus Tampilan-Tunggal (Scope Discipline):** Apabila permintaan pengguna sangat elementer *(seperti: "bikin jam", "todolist")*, jaga arsitekturnya dalam *Single-View / Single-Screen layout*. Jangan repot-repot mensimulasi Sistem Drawer Navigation/Sidebar kecuali diminta spesifik.
- **Craftsmanship / Seni Desain:** Jauhi gaya "AI Slop" (Kaku, seperti data server bertebaran, logging dummy online di UI, dsb). Gunakan utilitas *Tailwind CSS* untuk meramu aplikasi dengan jarak elemen/ruang napas mumpuni (*generous negative space*). Kombinasikan dengan estetika *Lucide React* (`lucide-react`) pada Ikon-ikon aplikasi.

---

## 6. PENANGANAN ERROR KHUSUS (EDGE CASES) SAAT REMIX/CLONE
Jika di awal turn/proses Remix terdapat laporan dari log Terminal / *Browser* merah:
1. **Error Biner Metro (unsupported file type: undefined):** Segera deteksi file aset gambar mana (contoh `.png` / `.jpg`) yang disebut rusak oleh *bundler*. Lakukan *download* ulang dari URL fallback atau timpa gambarnya dengan data biner kosong yang valid melalui perintah *node filesystem*, lalu kosongkan `.expo` dan *restart* dev-server. Jangan biarkan *crash* menggantung!
2. **Error Layar Putih (Cannot set property fetch of #<Window>):** Bug injeksi polyfill primitif. Segera cari skrip file di dalam `node_modules/whatwg-fetch/` atau `cross-fetch/`, temukan baris asignment global (`g.fetch = fetch` / `self.fetch = fetch`), lalu bungkus (Patch) dengan blok mutlak `try { global.fetch = fetch; } catch(e) {}`. Selesai me-*patch*, muat ulang halaman.
