-- ============================================
-- Data Kalsul - Database Schema
-- Database: super-bas.com
-- ============================================

-- Admin users table
CREATE TABLE IF NOT EXISTS `kalsul_admins` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(100) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default admin user (password: admin123)
INSERT INTO `kalsul_admins` (`username`, `password`, `full_name`)
VALUES ('admin', '$2y$10$YBSbGe6XO3.Dkm/FjJfDNOGKRMgDJhJqLqKBb6bJgmfRiE1J3JX6', 'Administrator')
ON DUPLICATE KEY UPDATE `username` = `username`;

-- Employees table
CREATE TABLE IF NOT EXISTS `kalsul_employees` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `no` INT DEFAULT NULL,
  `ops_id` VARCHAR(50) DEFAULT NULL,
  `nama` VARCHAR(150) NOT NULL,
  `station` VARCHAR(100) DEFAULT NULL,
  `status` VARCHAR(50) DEFAULT 'Daily Worker',
  `no_rek` VARCHAR(50) DEFAULT NULL,
  `bank` VARCHAR(50) DEFAULT NULL,
  `atas_nama` VARCHAR(150) DEFAULT NULL,
  `no_hp` VARCHAR(30) DEFAULT NULL,
  `nik` VARCHAR(30) DEFAULT NULL,
  `alamat` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ops_id` (`ops_id`),
  KEY `idx_station` (`station`),
  KEY `idx_nama` (`nama`),
  KEY `idx_nik` (`nik`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Upload history table
CREATE TABLE IF NOT EXISTS `kalsul_uploads` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `filename` VARCHAR(255) NOT NULL,
  `uploaded_by` INT UNSIGNED DEFAULT NULL,
  `rows_imported` INT UNSIGNED DEFAULT 0,
  `rows_updated` INT UNSIGNED DEFAULT 0,
  `rows_failed` INT UNSIGNED DEFAULT 0,
  `status` ENUM('success','partial','failed') NOT NULL DEFAULT 'success',
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_uploaded_by` (`uploaded_by`),
  CONSTRAINT `fk_uploads_admin` FOREIGN KEY (`uploaded_by`) REFERENCES `kalsul_admins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
