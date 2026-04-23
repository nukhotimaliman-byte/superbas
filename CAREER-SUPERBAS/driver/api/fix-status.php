<?php
/**
 * Fix: Ubah kolom status dari ENUM ke VARCHAR
 * Jalankan sekali: super-bas.com/driver/api/fix-status.php
 * HAPUS FILE INI SETELAH SELESAI!
 */
require_once __DIR__ . '/../config.php';
header('Content-Type: application/json');

$db = getDB();

try {
    // Ubah kolom status dari ENUM ke VARCHAR(50) agar fleksibel
    $db->exec("ALTER TABLE drv_candidates MODIFY COLUMN status VARCHAR(50) DEFAULT 'Belum Pemberkasan'");
    echo json_encode([
        'success' => true, 
        'message' => 'Kolom status berhasil diubah ke VARCHAR(50). Semua status sekarang bisa digunakan.'
    ], JSON_PRETTY_PRINT);
} catch (PDOException $e) {
    echo json_encode([
        'error' => $e->getMessage()
    ], JSON_PRETTY_PRINT);
}
