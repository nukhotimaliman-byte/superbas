# 🚀 BAS Career — Panduan Setup & Deployment

## Struktur Proyek

```
BAS-CAREER/
├── index.html              ← Landing page
├── login.html              ← Portal login (admin + user)
├── daftar.html             ← Dashboard kandidat (setelah login)
├── admin.html              ← Dashboard admin (korlap + owner)
├── owner.html              ← Dashboard analytics owner
├── config.php              ← Konfigurasi database (EDIT INI!)
├── .htaccess               ← Security headers & upload protection
├── database_final.sql      ← Schema database definitif
├── api/
│   ├── auth.php            ← Login admin (legacy, redirect ke user-auth)
│   ├── user-auth.php       ← Login/register/Google SSO
│   ├── admin.php           ← CRUD kandidat (admin)
│   ├── candidates.php      ← Register & pemberkasan (user)
│   ├── documents.php       ← Upload dokumen + watermark
│   ├── import-export.php   ← Import/export Excel (owner)
│   ├── korlap.php          ← Manage akun korlap (owner)
│   └── owner.php           ← Analytics & CSV export (owner)
├── js/
│   ├── admin.js            ← Logic dashboard admin
│   ├── ml-engine.js        ← ML prediction engine
│   └── theme.js            ← Dark mode toggle
├── css/
│   └── dashboard.css       ← Styles admin dashboard
├── uploads/                ← Folder upload dokumen (auto-created)
└── assets/                 ← Assets tambahan
```

---

## Step-by-Step Deployment ke Rumahweb

### 1. Setup Database di cPanel

1. Login **cPanel** → `https://super-bas.com:2083` (atau via Clientzone → Masuk Panel)
2. Cari **MySQL® Databases**
3. **Buat Database Baru**:
   - Nama: `bascareer` → akan jadi `supy7197_bascareer`
4. **Buat User MySQL**:
   - Username: `basuser` → akan jadi `supy7197_basuser`
   - Password: **buat password kuat** (simpan password ini!)
5. **Assign User ke Database**:
   - Pilih user `supy7197_basuser` dan database `supy7197_bascareer`
   - Centang **ALL PRIVILEGES** → klik **Make Changes**

### 2. Import Schema Database

1. Di cPanel, buka **phpMyAdmin**
2. Pilih database `supy7197_bascareer` di sidebar kiri
3. Klik tab **Import**
4. Pilih file `database_final.sql` dari komputer
5. Klik **Go** — semua 6 tabel akan dibuat

### 3. Update Config

Edit file `config.php`, ganti credentials:

```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'supy7197_bascareer');   // ← Nama database dari step 1
define('DB_USER', 'supy7197_basuser');     // ← User MySQL dari step 1
define('DB_PASS', 'PASSWORD_KUAT_ANDA');   // ← Password dari step 1
```

### 4. Upload Files ke Hosting

1. Di cPanel, buka **File Manager** 
2. Navigasi ke folder subdomain `bas-career.my.id` (biasanya di `public_html/bas-career.my.id/`)
3. Upload **semua file** dari folder `BAS-CAREER/`
4. Pastikan folder `uploads/` memiliki permission **755**

### 5. Test

1. Buka `http://bas-career.my.id.super-bas.com/`
2. Klik login → username: `owner`, password: `alim123`
3. Dashboard admin harus muncul

---

## Akun Default

| Username | Password | Role | Akses |
|----------|----------|------|-------|
| `owner` | `alim123` | Owner | Full akses, bisa manage korlap, import/export, edit semua data |

> ⚠️ **Ganti password owner** setelah deploy melalui dashboard admin!

---

## Cara Menambah Akun Korlap

1. Login sebagai **owner**
2. Buka menu **Korlap Management** di sidebar
3. Isi form: Username, Nama, Password, Role (Interview/Test Drive), Lokasi
4. Klik **Buat Akun**

---

## Struktur Database (6 Tabel)

| Tabel | Fungsi |
|-------|--------|
| `locations` | 4 titik rekrutmen |
| `admins` | Akun admin (owner + korlap) |
| `users` | Akun login kandidat/driver |
| `candidates` | Data lengkap kandidat |
| `documents` | Upload dokumen (KTP, SIM, dll) |
| `audit_logs` | Log perubahan oleh admin |

### Kolom Standar Kandidat (Bahasa Indonesia)

| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| `tempat_lahir` | VARCHAR(100) | Tempat lahir |
| `tanggal_lahir` | DATE | Tanggal lahir |
| `pendidikan_terakhir` | VARCHAR(50) | Pendidikan terakhir |
| `pernah_kerja_spx` | ENUM('Ya','Tidak') | Pernah kerja di SPX |
| `surat_sehat` | ENUM('Ada','Tidak Ada') | Status surat sehat |
| `paklaring` | ENUM('Ada','Tidak Ada') | Status paklaring |

### Status Kandidat (8 tahap)

```
Belum Pemberkasan → Sudah Pemberkasan → Menunggu Test Drive → Jadwal Test Drive → Hadir/Tidak Hadir → Lulus/Tidak Lulus
```

---

## Troubleshooting

### Database connection failed
- Cek `config.php` — pastikan DB_NAME, DB_USER, DB_PASS sesuai cPanel
- cPanel biasanya prefix nama: `supy7197_namadb`, bukan `namadb` saja

### 500 Internal Server Error
- Cek **Error Log** di cPanel → Metrics → Errors
- Pastikan PHP version ≥ 7.4 (cPanel → MultiPHP Manager)

### Upload gagal
- Pastikan folder `uploads/` permission **755**
- Max upload size di `.htaccess` dan `php.ini` minimal **2MB**

### Login gagal
- Jalankan di phpMyAdmin:
  ```sql
  SELECT username, role FROM admins;
  ```
- Jika tabel kosong, re-import `database_final.sql`
