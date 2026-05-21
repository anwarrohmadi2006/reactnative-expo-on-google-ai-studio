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

## Langkah 2: "The Magic Prompt" (Prompt Super Komprehensif)

Segera setelah repositori selesai dimuat ke *workspace* Anda, **COPY DAN PASTE PROMPT DI BAWAH INI** secara utuh ke dalam kotak _chat_ (kolom interaksi dengan Agen AI). 

Prompt ini adalah perintah rekayasa balik (*Execute-First migration*) yang memaksa Agen AI untuk memvaksinasi proyek Anda dari semua _error_ bawaan Cloud Container.

### 📋 COPY PROMPT INI:

> "Saya baru saja meng-clone repositori Expo React Native ini dari GitHub. Jangan jalankan npm start atau dev script apa pun dulu! Lakukan rutinitas inisiasi mutlak berikut secara berurutan:
> 
> 1. Aktifkan skill `github-import-migration` dan pastikan konfigurasi `package.json` dieksekusi agar berjalan murni pada HOST `0.0.0.0` dan PORT `3000`. Jangan gunakan port lain.
> 2. Lacak file `whatwg-fetch/fetch.js` dan `cross-fetch/dist/browser-polyfill.js` di dalam direktori `node_modules`. Patch setiap baris penugasan `g.fetch = fetch` atau `self.fetch = fetch` agar dibungkus dengan `try { ... } catch (e) {}` untuk menghindari error `Uncaught TypeError: Cannot set property fetch of #<Window>`.
> 3. Gambar `react-logo.png` dan `tutorial-web.png` di folder `assets/images` biasanya rusak saat cloning. Tolong timpa/replace file-file gambar tersebut dengan dummy data transparan/standar via node script untuk menghindari error `unsupported file type: undefined` di Metro Bundler, atau download ulang versi aslinya.
> 4. Hapus folder cache `.expo` secara rekursif jika ada.
> 5. Setelah instalasi dependensi beres, nyalakan server latar belakang secara asinkron (misalnya `npx expo start --web --tunnel --port 3000`).
> 6. Terakhir, tampilkan URL publik Ngrok (exp://... dan https://...) yang berhasil diekstrak."

---

## Mengapa Prompt Tersebut Sangat Penting? (Anatomi Solusi)

Prompt di atas bukanlah sekadar kalimat biasa, ini adalah *blueprint* untuk mencegah penyakit-penyakit kronis pada sistem kontainer AI Studio:

1. **Host 0.0.0.0 & Port 3000:** Memastikan rute API tembus melalui nginx Proxy dari arsitektur Docker/Cloud Run milik Google. Infrastruktur hanya membuka port 3000.
2. **Obat Layar Putih (Patch Polyfill):** Lingkungan Iframe AI Studio membatasi obyek `window.fetch` menjadi properti yang hanya bisa dibaca (_read-only_). Usaha `cross-fetch` untuk memodifikasinya saat inisiasi Klien akan membuat aplikasi _React_ Anda berhenti total secara tiba-tiba (_Crash Uncaught TypeError_). Pembungkusan `try/catch` membiarkan error ini *lewat* tanpa membunuh sistem.
3. **Mengatasi Kasus Gambar Transmisi Rusak:** Transisi aset gambar ber-ekstensi `.png` saat di-clone ke _ephemeral system_ Google bisa mengubah magic number *header binary* di dalam file-nya. Metro bundler (*React Native bundler*) akan mogok bekerja dan mengeluhkan format file yang tak dikenali. Node script pada prompt ini akan merestorasi atau nge-_bypass_ file yang cacat tersebut dengan segera.
4. **Pembasmian Cache Hantu:** File meta di `.expo/` sering kali menyimpan pengaturan *port* lawas hasil *clone* Anda dari komputer lama. Menghapusnya adalah keharusan (Clear Cache).
5. **Ekstraksi URL Tunnel Real-Time:** Menyelamatkan Anda dari batasan fungsi API Iframe. Dengan disediakannya link Ngrok eksternal, Anda bisa menekan tombol **"Buka di Tab Baru"**, terbebas dari *sandbox constraints*, dan OAUTH/Login/Database akan bekerja 100% mulus.

Dengan mengikuti panduan *Magic Blueprint* ini, repositori expo apa pun yang Anda tarik dari penjuru GitHub akan dapat dinikmati seketika tanpa pusing!
