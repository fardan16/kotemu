# KoTemu (Kopi & Temu Kota Palu)
### Sistem Informasi Geografis Pemetaan Sebaran Kafe di Kota Palu Berbasis Web

🌐 **Website Live (Vercel):** [https://kotemu.vercel.app/](https://kotemu.vercel.app/)  
💻 **Repository GitHub:** [https://github.com/fardan16/kotemu](https://github.com/fardan16/kotemu)  
🎥 **Video Presentasi (YouTube):** [https://youtu.be/BrCg3tjuK_U](https://youtu.be/BrCg3tjuK_U)

**KoTemu** adalah aplikasi Web GIS interaktif yang dikembangkan untuk memetakan dan mengelola persebaran lokasi kafe serta kedai kopi di seluruh wilayah Kota Palu. Sistem ini menggabungkan visualisasi spasial berbasis citra satelit dan peta jalan, fitur navigasi rute terdekat, analisis kepadatan (heatmap), sistem pemesanan menu dengan pencetakan struk digital, serta manajemen data kasir terintegrasi.

Aplikasi ini dibangun menggunakan pendekatan **Software Development Life Cycle (SDLC) Model Waterfall**, menerapkan **3 Unsur Spasial GIS (Point, Line, dan Polygon Batas Wilayah)**, serta mendukung penyimpanan data lokal (*Local Storage*) dan sinkronisasi awan (*Firebase Cloud Firestore*).

---

## 👥 Tim Pengembang (Kelompok 5)

Proyek ini disusun dan dikembangkan untuk memenuhi Tugas Proyek Mata Kuliah **Rekayasa Perangkat Lunak (Kelas C)**, Program Studi S1 Teknik Informatika, Universitas Tadulako:

| No | Nama Mahasiswa | NIM | Peran Utama |
|:--:|---|:--:|---|
| 1 | **Muhammad Zakiyullah** | F5512530107 | Koordinator Proyek & Analisis Kebutuhan |
| 2 | **Fardan Yudhistira** | F5512520080 | Perancangan Sistem, Basis Data & Arsitektur |
| 3 | **Hasan Aqsah** | F5512520093 | Desain Antarmuka, Ragam Dialog & Pengujian |

**Dosen Pengampu:** Dr. Deny Wiria Nugraha, S.T., M.Eng.  
**Instansi:** Jurusan Teknologi Informasi, Fakultas Teknik, Universitas Tadulako (2026)

---

## 🚀 Fitur Utama Sistem

1. **Peta Spasial & Layer Citra Satelit**
   - Mendukung peralihan tampilan antara **Peta Citra Satelit Resolusi Tinggi** (Esri World Imagery) dan **Peta Vektor Jalan** (OpenStreetMap).
   - Menampilkan batas administratif wilayah Kota Palu menggunakan poligon spasial presisi.

2. **Pemetaan 30 Titik Kafe Lapangan (Point)**
   - Marker interaktif pada 30 lokasi kafe hasil observasi lapangan di berbagai kecamatan Kota Palu.
   - Pop-up informatif menampilkan nama kafe, foto dokumentasi nyata, alamat, jam operasional, rentang harga, dan tautan navigasi.

3. **Navigasi & Kalkulasi Rute Berkendara (Line)**
   - Penentuan rute perjalanan dari lokasi pengguna ke kafe tujuan atau antar-kafe secara langsung.
   - Menggunakan integrasi OSRM (Open Source Routing Machine) API untuk menghitung jarak tempuh (km) dan perkiraan waktu perjalanan.

4. **Visualisasi Kepadatan Kafe (Heatmap)**
   - Lapisan visualisasi densitas untuk menganalisis kawasan dengan konsentrasi kafe tertinggi di Kota Palu (seperti koridor Palu Timur dan Palu Selatan).

5. **Pemesanan Menu Mandiri & Struk Digital**
   - Katalog menu makanan dan minuman tiap kafe.
   - Keranjang belanja interaktif (*Cart*) dengan kalkulasi otomatis subtotal dan total biaya.
   - Fitur cetak struk pemesanan digital (*digital receipt*).

6. **Panel Manajemen Data Kasir (CRUD)**
   - Dashboard kasir untuk menambah, mengubah, dan menghapus data menu serta mencatat transaksi.
   - Fitur rekapitulasi data penjualan harian.

7. **Integrasi Basis Data Dual-Mode**
   - Penyimpanan data lokal (*Local Storage*) untuk akses cepat luring.
   - Opsi sinkronisasi ke basis data awan **Firebase Cloud Firestore**.

---

## 🛠️ Teknologi yang Digunakan

- **Frontend:** HTML5, CSS3 (Modern Responsive Theme), JavaScript (ES6+)
- **Map & Spatial Engine:** Leaflet.js v1.9.4, Leaflet Heatmap Plugin
- **Tile Layer:** Esri World Imagery, Esri Labels & OpenStreetMap
- **Routing Engine:** OSRM (Open Source Routing Machine) API
- **Database:** Local Storage API & Firebase Cloud Firestore SDK v8
- **Icon & UI Assets:** Lucide Icons & Font Awesome

---

## 📂 Struktur Direktori Proyek

```
program/
├── assets/
│   ├── css/
│   │   └── style.css            # Desain styling antarmuka & responsivitas
│   ├── images/
│   │   ├── cafes/               # Dokumentasi foto 30 kafe hasil observasi
│   │   └── logo.svg             # Logo aplikasi KoTemu
│   └── js/
│       ├── app.js               # Logika utama aplikasi & event handler
│       ├── cafes-data.js        # Data array 30 kafe & menu lokal
│       ├── cafes-data.json      # Dataset kafe dalam format JSON
│       ├── firebase-config.js   # Konfigurasi koneksi Firebase Firestore
│       ├── leaflet-heat.js      # Library visualisasi heatmap sebaran
│       ├── routing-service.js   # Modul layanan kalkulasi rute OSRM
│       └── spatial-data.js      # Data koordinat poligon batas Kota Palu
├── index.html                   # Halaman antarmuka utama sistem
├── package.json                 # Konfigurasi dependensi proyek
├── seed-firebase.js             # Skrip bantuan sinkronisasi basis data
└── README.md                    # Dokumentasi teknis proyek
```

---

## 💻 Panduan Menjalankan Aplikasi

Aplikasi KoTemu dirancang agar dapat dijalankan dengan mudah tanpa memerlukan konfigurasi lingkungan (*environment setup*) yang rumit:

### 1. Menjalankan Langsung via Browser (Rekomendasi)
- Buka folder proyek `program/`.
- Klik ganda (atau klik kanan -> *Open with*) pada file `index.html` menggunakan browser modern (Google Chrome, Microsoft Edge, atau Mozilla Firefox).
- Seluruh fitur peta, navigasi, pencarian kafe, dan keranjang belanja dapat langsung digunakan.

### 2. Menjalankan via Local Web Server (Opsional)
Jika ingin menggunakan local server:
```bash
# Menggunakan npx serve
npx serve .

# Atau menggunakan Python built-in HTTP server
python -m http.server 8000
```
Buka peramban di alamat `http://localhost:3000` atau `http://localhost:8000`.

### 3. Sinkronisasi Basis Data Firebase (Opsional)
- Untuk menyinkronkan data lokal ke Firebase Firestore, buka aplikasi di browser.
- Klik badge status database di pojok atas atau navigasi ke panel data.
- Klik tombol **"Mulai Sinkronisasi ke Firebase"**.

---

## 📍 Daftar 30 Titik Kafe Hasil Observasi

Berikut daftar 30 kafe di Kota Palu yang terdata dalam sistem:

| No | Nama Kafe | Kecamatan / Lokasi | Latitude | Longitude |
|:--:|---|---|:--:|:--:|
| 1 | BRKH TINOMBALA | Palu Timur | -0.884131 | 119.872875 |
| 2 | RENJANA | Palu Timur | -0.865165 | 119.877363 |
| 3 | KORIRU JUANDA | Palu Selatan | -0.897537 | 119.885908 |
| 4 | TEXT JUANDA | Palu Selatan | -0.896805 | 119.877120 |
| 5 | SEPERTIGA JUANDA | Palu Selatan | -0.896876 | 119.878733 |
| 6 | SIN TONDO | Mantikulore | -0.848909 | 119.891983 |
| 7 | ITAKI SUPRAPTO | Palu Barat | -0.885848 | 119.875478 |
| 8 | SENCO | Palu Timur | -0.897264 | 119.880552 |
| 9 | SEPERTIGA IMAM BONJOL | Palu Barat | -0.894684 | 119.856160 |
| 10 | KENNA | Palu Selatan | -0.897892 | 119.871042 |
| 11 | SEARAH | Palu Selatan | -0.897482 | 119.869901 |
| 12 | CIRCEL | Palu Selatan | -0.898326 | 119.872230 |
| 13 | CAPTAIN COFFE | Palu Selatan | -0.896970 | 119.884620 |
| 14 | KORIRU GAJAH MADA | Palu Barat | -0.898279 | 119.863594 |
| 15 | KOPI KENANGAN | Palu Barat (Palu Grand Mall) | -0.901903 | 119.858200 |
| 16 | KOMAR TONDO | Mantikulore | -0.838652 | 119.883286 |
| 17 | KOMAR ANOA | Palu Selatan | -0.911456 | 119.878361 |
| 18 | KOMAR GAJAH MADA | Palu Barat | -0.897948 | 119.862778 |
| 19 | ROW COFFE | Tatanga | -0.919854 | 119.864986 |
| 20 | ARUMI | Mantikulore | -0.852748 | 119.907346 |
| 21 | STQ SPACE CAFE | Mantikulore | -0.871133 | 119.887797 |
| 22 | KOMOKOPI? | Palu Selatan | -0.909082 | 119.875759 |
| 23 | NGOPIPES | Palu Timur | -0.886804 | 119.872607 |
| 24 | KOTA BARU COFFEE | Palu Timur | -0.896961 | 119.874432 |
| 25 | KOPIIN | Palu Timur | -0.899147 | 119.874345 |
| 26 | TOMORO COFFEE | Palu Barat | -0.893264 | 119.855404 |
| 27 | KOPI AROBI AHMAD YANI | Palu Timur | -0.888489 | 119.872543 |
| 28 | RBLV COFFEE | Palu Timur | -0.892008 | 119.877354 |
| 29 | KOPI AROBI SAMRAT | Palu Timur | -0.882410 | 119.871889 |
| 30 | KOPI SEGARRR | Palu Timur | -0.871916 | 119.877393 |

---

*Hak Cipta © 2026 Kelompok 5 - Rekayasa Perangkat Lunak TI C, Universitas Tadulako.*
