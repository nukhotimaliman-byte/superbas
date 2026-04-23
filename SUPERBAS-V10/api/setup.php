<?php
/**
 * Setup Script — Jalankan SEKALI via browser
 * URL: https://super-bas.com/api/setup.php
 * 
 * Setelah berhasil, HAPUS file ini dari server!
 */

require_once __DIR__ . '/config.php';

header('Content-Type: text/html; charset=utf-8');
echo '<h2>BAS — Setup Database Absen Foto</h2>';

// 1. Create uploads directory
if (!is_dir(UPLOAD_DIR)) {
    if (mkdir(UPLOAD_DIR, 0755, true)) {
        echo '<p>✅ Folder uploads dibuat: ' . UPLOAD_DIR . '</p>';
    } else {
        echo '<p>❌ Gagal buat folder uploads. Buat manual via File Manager.</p>';
    }
} else {
    echo '<p>✅ Folder uploads sudah ada.</p>';
}

// 2. Connect to database
try {
    $pdo = new PDO(
        'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
        DB_USER, DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    echo '<p>✅ Koneksi database berhasil.</p>';
} catch (PDOException $e) {
    die('<p>❌ Koneksi database gagal: ' . $e->getMessage() . '</p>
         <p>Pastikan DB_NAME, DB_USER, DB_PASS di config.php sudah benar.</p>');
}

// 3. Create table
$sql = "
CREATE TABLE IF NOT EXISTS absensi_foto (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ops_id VARCHAR(20) NOT NULL,
    nama VARCHAR(100) NOT NULL,
    tipe ENUM('MASUK','KELUAR') NOT NULL,
    foto_path VARCHAR(255) NOT NULL,
    latitude DECIMAL(10,7) DEFAULT NULL,
    longitude DECIMAL(10,7) DEFAULT NULL,
    alamat VARCHAR(255) DEFAULT NULL,
    station VARCHAR(50) DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ops (ops_id),
    INDEX idx_date (created_at),
    INDEX idx_tipe (tipe)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
";

try {
    $pdo->exec($sql);
    echo '<p>✅ Tabel <strong>absensi_foto</strong> berhasil dibuat.</p>';
} catch (PDOException $e) {
    echo '<p>❌ Gagal buat tabel: ' . $e->getMessage() . '</p>';
}

echo '<hr>';
echo '<p>🎉 <strong>Setup selesai!</strong></p>';
echo '<p>⚠️ <strong>HAPUS file setup.php ini dari server setelah selesai!</strong></p>';
echo '<p>API endpoint: <code>https://super-bas.com/api/absen-foto.php</code></p>';
?>
