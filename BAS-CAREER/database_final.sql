-- ============================================================
-- BAS DRIVER RECRUITMENT SYSTEM
-- Database Schema Final (MySQL 5.7+ / MariaDB 10.3+)
-- Hosting: super-bas.com (Rumahweb)
-- ============================================================
-- DEPLOYMENT:
-- 1. Login phpMyAdmin di Rumahweb
-- 2. Buat database baru via cPanel → MySQL Databases
-- 3. Buat user MySQL & assign ke database tersebut
-- 4. Pilih database → Tab "SQL" → paste seluruh file ini → Execute
-- 5. Update config.php dengan credentials yang sesuai
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. LOCATIONS (Titik Rekrutmen)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `locations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `address` VARCHAR(500) DEFAULT NULL,
  `maps_link` VARCHAR(500) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `locations` (`id`, `name`, `address`, `maps_link`) VALUES
(1, 'Makobas',        'Makobas, Jakarta',           'https://maps.app.goo.gl/CNLprpUsF4iX89qB9'),
(2, 'Mess Cileungsi', 'Mess Cileungsi, Bogor',      'https://maps.app.goo.gl/hMBBQQyCRXnNBFRY7'),
(3, 'Cibitung',       'Cibitung, Bekasi',           'https://maps.app.goo.gl/UgpD7DnWYEMCr8nE7?g_st=aw'),
(4, 'Cakung 2',       'Cakung 2, Jakarta Timur',    'https://maps.app.goo.gl/oocTLzBGgKu91rxJ9?g_st=aw')
ON DUPLICATE KEY UPDATE name=VALUES(name), address=VALUES(address), maps_link=VALUES(maps_link);


-- ─────────────────────────────────────────────
-- 2. ADMINS (Owner + Korlap)
-- Roles:
--   korlap_interview = Korlap bagian interview / pemberkasan
--   korlap_td        = Korlap bagian test drive
--   owner            = Full access
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `admins` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `plain_password` VARCHAR(255) DEFAULT NULL,
  `name` VARCHAR(100) NOT NULL,
  `role` ENUM('korlap_interview','korlap_td','owner') NOT NULL DEFAULT 'korlap_interview',
  `location_id` INT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default owner account (password: alim123)
INSERT INTO `admins` (`username`, `password`, `plain_password`, `name`, `role`, `location_id`) VALUES
('owner', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'alim123', 'Owner BAS', 'owner', NULL)
ON DUPLICATE KEY UPDATE name=VALUES(name);


-- ─────────────────────────────────────────────
-- 3. USERS (Akun Login Kandidat / Driver)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nik` CHAR(16) DEFAULT NULL UNIQUE,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `plain_password` VARCHAR(255) DEFAULT NULL,
  `name` VARCHAR(150) NOT NULL DEFAULT '',
  `email` VARCHAR(255) NOT NULL DEFAULT '',
  `phone` VARCHAR(20) DEFAULT NULL,
  `google_id` VARCHAR(255) DEFAULT NULL UNIQUE,
  `picture` VARCHAR(500) DEFAULT NULL,
  `is_deleted` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `last_login` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────────
-- 4. CANDIDATES (Data Kandidat Rekrutmen)
--
-- KOLOM STANDAR (Bahasa Indonesia):
--   tempat_lahir, tanggal_lahir, pendidikan_terakhir,
--   pernah_kerja_spx, surat_sehat, paklaring
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `candidates` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `given_id` VARCHAR(50) DEFAULT NULL,
  `candidate_id` VARCHAR(20) DEFAULT NULL UNIQUE COMMENT 'ID dari admin (BAS-XXXX)',
  `user_id` INT DEFAULT NULL,
  `name` VARCHAR(150) NOT NULL,
  `nik` VARCHAR(16) DEFAULT NULL,
  `whatsapp` VARCHAR(20) NOT NULL DEFAULT '',
  `emergency_name` VARCHAR(150) DEFAULT NULL COMMENT 'Nama Kontak Darurat',
  `emergency_phone` VARCHAR(20) DEFAULT NULL COMMENT 'Nomor Kontak Darurat',
  `emergency_relation` VARCHAR(50) DEFAULT NULL COMMENT 'Hubungan Kontak Darurat',
  `email` VARCHAR(255) DEFAULT NULL,
  `address` TEXT,
  `referensi` VARCHAR(150) DEFAULT NULL COMMENT 'Siapa yang mengajak / referensi loker',
  `tempat_lahir` VARCHAR(100) DEFAULT NULL COMMENT 'Tempat Lahir',
  `tanggal_lahir` DATE DEFAULT NULL COMMENT 'Tanggal Lahir',
  `pendidikan_terakhir` VARCHAR(50) DEFAULT NULL COMMENT 'Pendidikan Terakhir',
  `pernah_kerja_spx` ENUM('Ya','Tidak') DEFAULT NULL COMMENT 'Pernah bekerja di SPX?',
  `surat_sehat` ENUM('Ada','Tidak Ada') DEFAULT NULL COMMENT 'Surat Keterangan Sehat',
  `paklaring` ENUM('Ada','Tidak Ada') DEFAULT NULL COMMENT 'Paklaring',
  `armada_type` ENUM('CDD', 'Wingbox', 'Bigmama') DEFAULT NULL,
  `sim_type` VARCHAR(20) NOT NULL DEFAULT '',
  `location_id` INT DEFAULT 1,
  `status` ENUM(
    'Belum Pemberkasan',
    'Sudah Pemberkasan',
    'Menunggu Test Drive',
    'Jadwal Test Drive',
    'Hadir',
    'Tidak Hadir',
    'Lulus',
    'Tidak Lulus'
  ) NOT NULL DEFAULT 'Belum Pemberkasan',
  `test_drive_date` DATE DEFAULT NULL,
  `jadwal_interview` DATETIME DEFAULT NULL,
  `test_drive_time` TIME DEFAULT NULL,
  `korlap_notes` TEXT,
  `signature_data` LONGTEXT,
  `photo_data` LONGTEXT,
  `interview_location` VARCHAR(50) DEFAULT NULL COMMENT 'Lokasi interview pilihan user',
  `is_deleted` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_whatsapp` (`whatsapp`),
  INDEX `idx_status` (`status`),
  INDEX `idx_location` (`location_id`),
  INDEX `idx_user` (`user_id`),
  INDEX `idx_candidate_id` (`candidate_id`),
  INDEX `idx_nik` (`nik`),
  FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────────
-- 5. DOCUMENTS (Upload Dokumen Kandidat)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `documents` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `candidate_id` INT NOT NULL,
  `doc_type` ENUM('KTP', 'SIM', 'SKCK', 'Surat Sehat', 'Paklaring', 'Pas Photo') NOT NULL,
  `file_path` VARCHAR(500) NOT NULL,
  `original_name` VARCHAR(255) DEFAULT NULL,
  `file_size` INT DEFAULT 0,
  `uploaded_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`candidate_id`) REFERENCES `candidates`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────────
-- 6. AUDIT_LOGS (Riwayat Perubahan)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `candidate_id` INT NOT NULL,
  `admin_id` INT NOT NULL,
  `admin_name` VARCHAR(100) NOT NULL,
  `action` VARCHAR(255) NOT NULL,
  `old_value` VARCHAR(255) DEFAULT NULL,
  `new_value` VARCHAR(255) DEFAULT NULL,
  `notes` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_candidate_audit` (`candidate_id`),
  FOREIGN KEY (`candidate_id`) REFERENCES `candidates`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`admin_id`) REFERENCES `admins`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- 7. BLACKLISTS (Nol-Toleransi NIK)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `blacklists` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nik` VARCHAR(16) NOT NULL UNIQUE,
  `reason` TEXT,
  `created_by` INT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`created_by`) REFERENCES `admins`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
