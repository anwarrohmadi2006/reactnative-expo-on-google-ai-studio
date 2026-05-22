# Panduan Mutlak: Clone & Eksekusi Langsung dari GitHub ke Google AI Studio

Jika Anda melakukan *clone* atau mengimpor repositori ini secara langsung dari GitHub ke dalam Google AI Studio Build, aplikasi *React Native / Expo* ini **TIDAK AKAN LANGSUNG BERJALAN BEGITU SAJA**. 

Infrastruktur Cloud AI Studio memiliki aturan ketat terkait Port, Host, Iframe Sandbox, dan *hot module reloading* yang sangat berbeda dengan environment lokal komputer Anda (seperti localhost:8080 dsb). Selain itu, sering ada _bug_ disrupsi aset biner (gambar) saat _unpacking_ container.

Agar aplikasi clone ini bisa *"Langsung Embed"* dan berjalan mulus tanpa masalah panjang lebar, ikuti panduan pamungkas ini.

---

## Langkah 1: Proses Import/Clone

Lantaran antarmuka (UI) AI Studio mungkin tidak menampilkan tombol langsung untuk "Connect Repository", jalur paling mutlak dan dijamin berhasil adalah melalui interaksi agen (Chat) atau unggah berkas (ZIP).

**Opsi A: Melalui Perintah Chat (Git Clone)**
1. Buka halaman AI Studio Build dan buatlah **Aplikasi Kosong** (atau cukup ketik *prompt* permulaan seperti *"Buat web proyek kosong"*).
2. Setelah jendela editor (Workspace) terbuka, kirim *prompt* ke agen: *"Tolong bersihkan direktori saat ini, lalu lakukan `git clone [URL_GITHUB_ANDA]` ke folder root."*
3. Tunggu hingga agen selesai mengunduh *source code* Anda.

**Opsi B: Melalui Upload ZIP / Drag-and-Drop (Alternatif Cepat)**
1. Unduh (Download) repo GitHub Anda sebagai file `.zip`.
2. Buka Workspace AI Studio Build, lalu **tarik file ZIP tersebut** (Drag & Drop) dari desktop ke panel *File Explorer* (sebelah kiri).
3. Beri *prompt* pada agen: *"Tolong ekstrak file ZIP ini, keluarkan isinya ke direktori utama (root), lalu hapus zip-nya."*

**PERINGATAN SEBELUM MELANJUTKAN:**
Setelah *source code* mendarat di Workspace, **JANGAN MENYALAKAN SERVER TERLEBIH DAHULU!** (Jika Anda langsung menyuruh agen menjalankan `npm start`, aplikasinya dipastikan akan *crash* atau menampilkan layar putih selamanya). Lanjutkan ke **Langkah 2** di bawah ini.

---

## Langkah 2: "The Magic Prompt" (Prompt Super Mudah & Otomatis)

Segera setelah repositori selesai dimuat ke *workspace* Anda, **COPY DAN PASTE PROMPT DI BAWAH INI** secara utuh ke dalam kotak _chat_ (kolom interaksi dengan Agen AI). 

Karena kami telah merakit skrip pemulihan dan penyiapan otomatis di dalam repositori ini, Agen AI baru Anda tidak perlu melakukan penambalan secara manual. Anda cukup menyuruhnya menjalankan perintah dev terpadu.

### 📋 COPY PROMPT INI:

> "Saya baru saja meng-clone repositori Expo React Native ini. Tolong jalankan perintah dev server dengan mengetik:
> `npm run dev`
> 
> Perintah ini secara otomatis akan mengeksekusi skrip `setup-gstudio.cjs` yang akan memeriksa dependensi, mengunduh `@expo/ngrok`, memindai dan memperbaiki semua gambar biner yang rusak (seperti `expo-logo.png`), menambal polyfill fetch & CORS, serta menyalakan Metro server secara aman dengan tunnel Ngrok di PORT `3000` dan HOST `0.0.0.0`.
> 
> Setelah Metro bundler selesai membundel dan tunnel Ngrok aktif, tolong berikan saya URL ngrok-nya (exp://... dan https://...) untuk pratinjau aplikasi."

---

## Mengapa Prosedur Ini Sangat Penting? (Anatomi Solusi Otomatis)

Pematuhan skrip otomatis ini membebaskan Anda dari berbagai penyakit kronis pada sistem kontainer AI Studio:

1. **Host 0.0.0.0 & Port 3000:** Memastikan rute proxy internal dari Docker Google AI Studio dapat diakses dari luar.
2. **Scan & Perbaikan Gambar Biner Rekursif:** Skrip otomatis mendeteksi file gambar `.png` yang rusak secara rekursif dan menambalnya dengan gambar transparan 1x1 valid agar Metro bundler tidak crash dengan error `unsupported file type`.
3. **Obat Layar Putih (Patch Polyfill):** Menambal berkas `whatwg-fetch` dan `cross-fetch` agar aman dari properti read-only `window.fetch` di dalam sandbox iframe.
4. **Bypass CORS:** Menambal middleware CORS `@expo/cli` secara instan agar mengizinkan request dari URL proxy Google AI Studio.

4. **Pembasmian Cache Hantu:** File meta di `.expo/` sering kali menyimpan pengaturan *port* lawas hasil *clone* Anda dari komputer lama. Menghapusnya adalah keharusan (Clear Cache).
5. **Ekstraksi URL Tunnel Real-Time:** Menyelamatkan Anda dari batasan fungsi API Iframe. Dengan disediakannya link Ngrok eksternal, Anda bisa menekan tombol **"Buka di Tab Baru"**, terbebas dari *sandbox constraints*, dan OAUTH/Login/Database akan bekerja 100% mulus.

Dengan mengikuti panduan *Magic Blueprint* ini, repositori expo apa pun yang Anda tarik dari penjuru GitHub akan dapat dinikmati seketika tanpa pusing!
