# **Urudo \- Aplikasi Urunan Order**

**Urudo** (Urunan Order) adalah aplikasi web modern yang dirancang untuk menyederhanakan dan mengotomatiskan proses pemesanan makanan atau minuman secara kolektif di lingkungan kerja, komunitas, atau pertemanan. Aplikasi ini adalah evolusi dari proses manual yang seringkali merepotkan, mulai dari pencatatan di grup WhatsApp hingga penggunaan spreadsheet yang rentan terhadap kesalahan.

## **Latar Belakang**

Proyek ini lahir dari pengalaman nyata dalam mengelola pesanan grup yang semakin kompleks:

1. **Awal Mula**: Pencatatan manual di grup WhatsApp.  
2. **Evolusi**: Beralih ke Google Sheets untuk mengurangi tumpang tindih data.  
3. **Kompleksitas**: Penambahan fitur perhitungan diskon, biaya layanan, dan tracking pembayaran secara manual di Sheets.  
4. **Solusi**: **Urudo**, sebuah sistem terpusat yang mengotomatiskan seluruh alur kerja, membuatnya lebih cepat, akurat, dan transparan bagi semua orang.

## **Fitur Utama**

Aplikasi ini memiliki fitur yang dirancang untuk dua peran utama: **PIC (Person In Charge)** dan **Peserta**.

### **Fitur untuk PIC (Pembuat Order)**

* **Buat Order Baru**: Membuat sesi order baru dengan judul, nama toko, dan batas waktu pemesanan.  
* **Manajemen Menu Dinamis**: Menambahkan daftar menu beserta harganya untuk setiap order.  
* **Parameter Biaya Lanjutan**: Mengatur parameter perhitungan seperti diskon (%), maksimum diskon (Rp), syarat minimum order, dan biaya tambahan (layanan/pengiriman).  
* **Manajemen Status Order**: Menutup order (mengunci pesanan) atau membatalkan order.  
* **Tracking Pembayaran**: Setelah order ditutup, PIC dapat menandai status pembayaran setiap peserta (Lunas / Belum Lunas).

### **Fitur untuk Peserta**

* **Dashboard Interaktif**: Melihat daftar order yang sedang aktif dan riwayat order yang pernah diikuti.  
* **Bergabung dengan Order**: Memilih item dari menu yang tersedia dan menentukan kuantitas pesanan.  
* **Update Pesanan Real-time**: Mengubah atau menghapus pesanan sendiri selama order masih terbuka.  
* **Kalkulasi Harga Transparan**: Melihat estimasi harga final secara otomatis setelah memperhitungkan diskon dan biaya tambahan secara proporsional.  
* **Update Instan**: Semua perubahan (pesanan baru, edit, hapus) akan langsung terlihat oleh semua peserta lain secara *real-time* tanpa perlu me-refresh halaman.

### **Fitur Umum**

* **Autentikasi Pengguna**: Sistem registrasi dan login yang aman.  
* **Progressive Web App (PWA)**: Aplikasi dapat diinstal di perangkat (desktop atau mobile) untuk akses yang lebih cepat dan pengalaman seperti aplikasi *native*.

## **Tumpukan Teknologi (Tech Stack)**

Proyek ini dibangun menggunakan tumpukan teknologi modern dengan arsitektur "Supabase-first".

### **Frontend (/frontend/my-group-order-app-ui)**

* **Framework**: Angular 18 (dengan arsitektur Standalone Components)  
* **Bahasa**: TypeScript  
* **Styling**: Tailwind CSS  
* **Fitur Lanjutan**: Angular PWA (@angular/pwa) untuk fungsionalitas instalasi dan *offline*.

### **Backend (/backend/my-group-order-app-api & Supabase)**

* **Platform Utama**: **Supabase**  
  * **Database**: PostgreSQL  
  * **Autentikasi**: Supabase Auth (manajemen pengguna & JWT)  
  * **API**: API instan (PostgREST) untuk operasi CRUD dasar.  
  * **Real-time**: Supabase Realtime Subscriptions.  
* **Server Logika Khusus**: **Express.js** (saat ini sebagai *placeholder*)  
  * **Tujuan**: Dirancang untuk menangani logika bisnis kompleks di masa depan (misalnya, kalkulasi harga final, notifikasi, integrasi pihak ketiga).  
  * **ORM**: Prisma untuk komunikasi antara server Express dan database Supabase.

### **Deployment**

* **Frontend**: Dideploy sebagai **Static Site** di **Render**.

## **Struktur Proyek**

Proyek ini menggunakan struktur *monorepo* sederhana:

.  
├── backend/  
│   └── my-group-order-app-api/   \# Server Express.js (logika khusus)  
└── frontend/  
    └── my-group-order-app-ui/    \# Aplikasi utama Angular

## **Setup & Instalasi Lokal**

Untuk menjalankan proyek ini di mesin lokal Anda, ikuti langkah-langkah berikut:

### **Prasyarat**

* [Node.js](https://nodejs.org/) (versi LTS direkomendasikan)  
* [Angular CLI](https://angular.dev/tools/cli) (npm install \-g @angular/cli)  
* Akun [Supabase](https://supabase.com/) (tingkat gratis sudah cukup)

### **1\. Clone Repository**

git clone \[https://github.com/\](https://github.com/)\[USERNAME\_ANDA\]/\[NAMA\_REPO\_ANDA\].git  
cd \[NAMA\_REPO\_ANDA\]

### **2\. Konfigurasi Backend (Supabase)**

Aplikasi ini memerlukan proyek Supabase untuk berfungsi.

1. Buat proyek baru di dashboard Supabase.  
2. Gunakan **SQL Editor** untuk membuat tabel-tabel yang diperlukan (lihat skrip di folder /database\_schema \- *Anda bisa membuat folder ini dan menambahkan file SQL*).  
3. Konfigurasikan **Row Level Security (RLS)** dan **Triggers** sesuai dengan kebutuhan fitur.

### **3\. Konfigurasi Frontend**

1. Masuk ke direktori frontend:  
   cd frontend/my-group-order-app-ui

2. Instal semua dependensi:  
   npm install

3. **Konfigurasi Environment**:  
   * Buat salinan dari file src/environments/environment.ts.example (jika ada) atau buat file baru bernama src/environments/environment.ts.  
   * Isi file tersebut dengan kunci API dari dashboard Supabase Anda:  
     // src/environments/environment.ts  
     export const environment \= {  
       production: false,  
       supabase: {  
         url: 'URL\_PROYEK\_SUPABASE\_ANDA',  
         key: 'KUNCI\_ANON\_PUBLIC\_ANDA'  
       }  
     };

### **4\. Jalankan Aplikasi**

Setelah semua konfigurasi selesai, jalankan server pengembangan Angular:

\# Dari dalam folder frontend/my-group-order-app-ui  
ng serve

Buka http://localhost:4200 di browser Anda.

## **Deployment ke Produksi (Render)**

Frontend aplikasi ini dirancang untuk dideploy sebagai *Static Site* di Render.

1. Pastikan semua kode sudah di-*push* ke repository GitHub Anda.  
2. Di dashboard Render, buat **New Static Site** dan hubungkan ke repository Anda.  
3. Gunakan konfigurasi berikut:  
   * **Root Directory**: frontend/my-group-order-app-ui  
   * **Build Command**: node set-env.js && ng build  
   * **Publish Directory**: dist/my-group-order-app-ui/browser  
4. Pergi ke menu **Environment** dan tambahkan *environment variables* berikut:  
   * SUPABASE\_URL: Isi dengan URL proyek Supabase Anda.  
   * SUPABASE\_KEY: Isi dengan kunci anon (public) Supabase Anda.  
5. Simpan dan picu *deployment*.