-- Migration script for new features

-- 1. Add referensi to candidates
ALTER TABLE `candidates` ADD COLUMN `referensi` VARCHAR(150) DEFAULT NULL COMMENT 'Siapa yang mengajak / referensi loker' AFTER `address`;

-- 2. Add is_deleted to users
ALTER TABLE `users` ADD COLUMN `is_deleted` TINYINT(1) DEFAULT 0 AFTER `picture`;

-- 3. Add is_deleted to candidates
ALTER TABLE `candidates` ADD COLUMN `is_deleted` TINYINT(1) DEFAULT 0 AFTER `interview_location`;

-- 4. Create blacklists table
CREATE TABLE IF NOT EXISTS `blacklists` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nik` VARCHAR(16) NOT NULL UNIQUE,
  `reason` TEXT,
  `created_by` INT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`created_by`) REFERENCES `admins`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Add plain_password to users
ALTER TABLE `users` ADD COLUMN `plain_password` VARCHAR(255) DEFAULT NULL;

-- 6. Add plain_password to admins
ALTER TABLE `admins` ADD COLUMN `plain_password` VARCHAR(255) DEFAULT NULL;

-- 7. Add emergency contact info to candidates
ALTER TABLE `candidates` ADD COLUMN `emergency_name` VARCHAR(150) DEFAULT NULL AFTER `whatsapp`;
ALTER TABLE `candidates` ADD COLUMN `emergency_phone` VARCHAR(20) DEFAULT NULL AFTER `emergency_name`;
ALTER TABLE `candidates` ADD COLUMN `emergency_relation` VARCHAR(50) DEFAULT NULL AFTER `emergency_phone`;

-- ─────────────────────────────────────────────────────────────────────
-- 8. FIX LOKASI: Sync location_id dari interview_location (teks bebas)
--
-- MASALAH: location_id DEFAULT 1 (Makobas), tapi kandidat lama
-- mendaftar via form dengan interview_location berupa teks bebas
-- (Cibitung, Cakung 2, Mess Cileungsi, dll).
-- Akibatnya semua kandidat tampil "Makobas" di dashboard.
--
-- SOLUSI: Update location_id berdasarkan nilai interview_location,
-- sesuaikan dengan data di tabel locations.
-- Jalankan SEKALI di phpMyAdmin → Tab SQL → Execute
-- ─────────────────────────────────────────────────────────────────────

-- Step 1: Ubah DEFAULT location_id ke NULL (supaya kandidat baru
-- tanpa lokasi tidak otomatis ter-assign ke Makobas)
ALTER TABLE `candidates` MODIFY COLUMN `location_id` INT DEFAULT NULL;

-- Step 2: Set NULL dulu untuk kandidat yang interview_location-nya
-- tidak cocok dengan location_id yang ada (hindari data salah)
UPDATE `candidates`
SET `location_id` = NULL
WHERE `location_id` = 1
  AND `interview_location` IS NOT NULL
  AND `interview_location` != ''
  AND `interview_location` NOT LIKE '%Makobas%';

-- Step 3: Sync location_id dari interview_location untuk semua
-- nilai yang dikenali (case-insensitive match ke nama lokasi)
UPDATE `candidates` c
JOIN `locations` l ON LOWER(TRIM(c.interview_location)) = LOWER(TRIM(l.name))
SET c.location_id = l.id
WHERE c.interview_location IS NOT NULL AND c.interview_location != '';

-- Step 4: Kandidat dengan interview_location NULL dan location_id NULL
-- biarkan NULL (Owner bisa assign manual via dashboard)

-- Verifikasi hasil (jalankan SELECT ini untuk cek):
-- SELECT c.id, c.name, c.interview_location, c.location_id, l.name AS location_name
-- FROM candidates c
-- LEFT JOIN locations l ON c.location_id = l.id
-- ORDER BY c.id;

-- ─────────────────────────────────────────────────────────────────────
-- 9. FIX ARMADA DEFAULT: Ubah DEFAULT armada_type dari 'CDD' ke NULL
--
-- MASALAH: armada_type DEFAULT 'CDD' menyebabkan kandidat baru
-- otomatis ter-assign 'CDD' meski belum mengisi form.
--
-- Jalankan SEKALI di phpMyAdmin → Tab SQL → Execute
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE `candidates`
  MODIFY COLUMN `armada_type` ENUM('CDD', 'Wingbox', 'Bigmama') DEFAULT NULL;

-- ─────────────────────────────────────────────────────────────────────
-- 10. ADD test_drive_time: Jam Test Drive terpisah dari tanggal
--
-- Kolom ini digunakan oleh Korlap & Owner untuk menetapkan
-- jam test drive kandidat lewat inline edit di tabel admin.
-- Jalankan SEKALI di phpMyAdmin → Tab SQL → Execute
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE `candidates`
  ADD COLUMN `test_drive_time` TIME DEFAULT NULL
  AFTER `test_drive_date`;

-- ─────────────────────────────────────────────────────────────────────
-- 11. ADD phone: Nomor telepon / WhatsApp user
--
-- Kolom ini diisi saat registrasi akun dan juga digunakan
-- sebagai nomor WhatsApp default pada tabel candidates.
-- Jalankan SEKALI di phpMyAdmin → Tab SQL → Execute
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE `users`
  ADD COLUMN `phone` VARCHAR(20) DEFAULT NULL
  AFTER `email`;
