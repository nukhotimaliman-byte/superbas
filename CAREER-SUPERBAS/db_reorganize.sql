-- ============================================================
-- MASTER SQL: Reorganisasi Database super-bas.com
-- Jalankan di phpMyAdmin sebelum deploy kode baru
-- ============================================================

-- ┌─────────────────────────────────────────────────────┐
-- │  PHASE 1: RENAME DRIVER TABLES → drv_ prefix       │
-- └─────────────────────────────────────────────────────┘

RENAME TABLE `admins`             TO `drv_admins`;
RENAME TABLE `audit_logs`         TO `drv_audit_logs`;
RENAME TABLE `blacklists`         TO `drv_blacklists`;
RENAME TABLE `candidates`         TO `drv_candidates`;
RENAME TABLE `chat_messages`      TO `drv_chat_messages`;
RENAME TABLE `chat_templates`     TO `drv_chat_templates`;
RENAME TABLE `documents`          TO `drv_documents`;
RENAME TABLE `dropdown_options`   TO `drv_dropdown_options`;
RENAME TABLE `location_history`   TO `drv_location_history`;
RENAME TABLE `locations`          TO `drv_locations`;
RENAME TABLE `notifications`      TO `drv_notifications`;
RENAME TABLE `push_subscriptions` TO `drv_push_subscriptions`;
RENAME TABLE `track_requests`     TO `drv_track_requests`;
RENAME TABLE `users`              TO `drv_users`;

-- ┌─────────────────────────────────────────────────────┐
-- │  PHASE 2: CREATE KURIR TABLES → krr_ prefix        │
-- │  (Buat baru dari struktur driver)                   │
-- └─────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS `krr_admins`             LIKE `drv_admins`;
CREATE TABLE IF NOT EXISTS `krr_audit_logs`         LIKE `drv_audit_logs`;
CREATE TABLE IF NOT EXISTS `krr_blacklists`         LIKE `drv_blacklists`;
CREATE TABLE IF NOT EXISTS `krr_candidates`         LIKE `drv_candidates`;
CREATE TABLE IF NOT EXISTS `krr_chat_messages`      LIKE `drv_chat_messages`;
CREATE TABLE IF NOT EXISTS `krr_chat_templates`     LIKE `drv_chat_templates`;
CREATE TABLE IF NOT EXISTS `krr_documents`          LIKE `drv_documents`;
CREATE TABLE IF NOT EXISTS `krr_dropdown_options`    LIKE `drv_dropdown_options`;
CREATE TABLE IF NOT EXISTS `krr_locations`          LIKE `drv_locations`;
CREATE TABLE IF NOT EXISTS `krr_notifications`      LIKE `drv_notifications`;
CREATE TABLE IF NOT EXISTS `krr_push_subscriptions` LIKE `drv_push_subscriptions`;
CREATE TABLE IF NOT EXISTS `krr_track_requests`     LIKE `drv_track_requests`;
CREATE TABLE IF NOT EXISTS `krr_users`              LIKE `drv_users`;

-- Seed dropdown options kurir dari driver
INSERT INTO `krr_dropdown_options` (`category`, `value`, `label`, `sort_order`)
SELECT `category`, `value`, `label`, `sort_order`
FROM `drv_dropdown_options`
WHERE NOT EXISTS (SELECT 1 FROM `krr_dropdown_options` LIMIT 1);

-- Seed owner account kurir (password sama dengan owner driver)
INSERT INTO `krr_admins` (`username`, `password`, `name`, `role`, `location_id`)
SELECT 'owner_kurir', `password`, 'Owner Kurir', 'owner', NULL
FROM `drv_admins` WHERE `role` = 'owner' LIMIT 1
ON DUPLICATE KEY UPDATE `name` = 'Owner Kurir';

-- ┌─────────────────────────────────────────────────────┐
-- │  PHASE 3: RENAME/CREATE DW TABLES → dw_ prefix     │
-- └─────────────────────────────────────────────────────┘

-- Tabel yang sudah ada dengan suffix _dw → rename ke prefix dw_
RENAME TABLE `candidates_dw` TO `dw_candidates`;
RENAME TABLE `users_dw`      TO `dw_users`;

-- Tabel yang sudah ada tanpa prefix → rename
RENAME TABLE `absensi_foto`  TO `dw_absensi_foto`;
RENAME TABLE `payroll`       TO `dw_payroll`;

-- Buat tabel admin DW terpisah (sebelumnya sharing dari driver)
CREATE TABLE IF NOT EXISTS `dw_admins` LIKE `drv_admins`;

-- Seed owner DW (password sama dengan owner driver)
INSERT INTO `dw_admins` (`username`, `password`, `name`, `role`, `location_id`)
SELECT 'owner_dw', `password`, 'Owner DW', 'owner', NULL
FROM `drv_admins` WHERE `role` = 'owner' LIMIT 1
ON DUPLICATE KEY UPDATE `name` = 'Owner DW';

-- Buat tabel blacklist DW terpisah
CREATE TABLE IF NOT EXISTS `dw_blacklists` LIKE `drv_blacklists`;

-- Copy existing blacklists ke DW (supaya data tidak hilang)
INSERT IGNORE INTO `dw_blacklists`
SELECT * FROM `drv_blacklists`;

-- ┌─────────────────────────────────────────────────────┐
-- │  PHASE 4: Hapus tabel lama jika ada duplikat        │
-- └─────────────────────────────────────────────────────┘

-- Cek: jika ada payroll_dw (dari migration lama), drop
-- DROP TABLE IF EXISTS `payroll_dw`;

-- ┌─────────────────────────────────────────────────────┐
-- │  DONE! Struktur database final:                     │
-- │                                                     │
-- │  drv_admins, drv_audit_logs, drv_blacklists,        │
-- │  drv_candidates, drv_chat_messages,                 │
-- │  drv_chat_templates, drv_documents,                 │
-- │  drv_dropdown_options, drv_location_history,        │
-- │  drv_locations, drv_notifications,                  │
-- │  drv_push_subscriptions, drv_track_requests,        │
-- │  drv_users                                          │
-- │                                                     │
-- │  krr_admins, krr_audit_logs, krr_blacklists,        │
-- │  krr_candidates, krr_chat_messages,                 │
-- │  krr_chat_templates, krr_documents,                 │
-- │  krr_dropdown_options, krr_locations,               │
-- │  krr_notifications, krr_push_subscriptions,         │
-- │  krr_track_requests, krr_users                      │
-- │                                                     │
-- │  dw_absensi_foto, dw_admins, dw_blacklists,         │
-- │  dw_candidates, dw_payroll, dw_users                │
-- └─────────────────────────────────────────────────────┘
