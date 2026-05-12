<?php
/**
 * BAS — Attendance & Importrange Database Setup
 * Run once: https://super-bas.com/daily-worker/api/setup-attendance.php
 */
require_once __DIR__ . '/../config.php';
header('Content-Type: text/plain; charset=utf-8');

$db = getDB();
echo "=== BAS Attendance — Database Setup ===\n\n";

// ── dw_importrange (Karyawan from Google Sheet) ──
try {
    $db->exec("CREATE TABLE IF NOT EXISTS dw_importrange (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        ops_id        VARCHAR(20) NOT NULL UNIQUE,
        nama_lengkap  VARCHAR(100) NOT NULL,
        nik           VARCHAR(20) DEFAULT NULL,
        status_kerja  VARCHAR(50) DEFAULT 'AKTIF',
        station       VARCHAR(100) DEFAULT NULL,
        wa            VARCHAR(20) DEFAULT NULL,
        bank          VARCHAR(50) DEFAULT NULL,
        rekening      VARCHAR(30) DEFAULT NULL,
        atas_nama     VARCHAR(100) DEFAULT NULL,
        join_date     DATE DEFAULT NULL,
        candidate_id  INT DEFAULT NULL,
        user_id       INT DEFAULT NULL,
        synced_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_nik (nik),
        INDEX idx_candidate (candidate_id),
        INDEX idx_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    echo "✅ dw_importrange table ready\n";
} catch (Exception $e) {
    echo "❌ dw_importrange: " . $e->getMessage() . "\n";
}

// ── dw_attendance (Absensi from Google Sheet) ──
try {
    $db->exec("CREATE TABLE IF NOT EXISTS dw_attendance (
        id           INT AUTO_INCREMENT PRIMARY KEY,
        ops_id       VARCHAR(20) NOT NULL,
        candidate_id INT DEFAULT NULL,
        user_id      INT DEFAULT NULL,
        name         VARCHAR(100) NOT NULL,
        status       VARCHAR(20) DEFAULT 'DONE',
        station      VARCHAR(100),
        shifting     VARCHAR(50),
        date         DATE NOT NULL,
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_ops_date (ops_id, date),
        INDEX idx_user_date (user_id, date),
        INDEX idx_candidate_date (candidate_id, date),
        INDEX idx_date (date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    echo "✅ dw_attendance table ready\n";
} catch (Exception $e) {
    echo "❌ dw_attendance: " . $e->getMessage() . "\n";
}

// ── dw_rekening_changes (Ganti Rekening from Google Sheet) ──
try {
    $db->exec("CREATE TABLE IF NOT EXISTS dw_rekening_changes (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        ops_id          VARCHAR(20) NOT NULL,
        candidate_id    INT DEFAULT NULL,
        user_id         INT DEFAULT NULL,
        nama            VARCHAR(100),
        email           VARCHAR(100),
        penempatan      VARCHAR(100),
        rekening_baru   VARCHAR(30),
        nama_rekening   VARCHAR(100),
        bank_baru       VARCHAR(50),
        foto_buku_rek   TEXT DEFAULT NULL,
        tgl_ajuan       DATETIME,
        status          VARCHAR(30) DEFAULT 'Menunggu Verifikasi',
        tgl_proses      DATE DEFAULT NULL,
        source_sheet    VARCHAR(200) DEFAULT NULL,
        synced_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_ops_tgl (ops_id, tgl_ajuan),
        INDEX idx_user (user_id),
        INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    echo "✅ dw_rekening_changes table ready\n";
} catch (Exception $e) {
    echo "❌ dw_rekening_changes: " . $e->getMessage() . "\n";
}

echo "\n=== Setup Complete ===\n";
echo "Now run the GAS sync to populate data.\n";
