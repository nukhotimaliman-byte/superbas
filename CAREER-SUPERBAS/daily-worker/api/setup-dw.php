<?php
/**
 * BAS Daily Worker — Database Setup untuk dailyworker_db
 * Jalankan sekali untuk membuat semua tabel yang dibutuhkan.
 * HAPUS FILE INI SETELAH SELESAI!
 */
require_once __DIR__ . '/config.php';

echo "<!DOCTYPE html><html><head><title>BAS DW Setup</title></head><body style='font-family:monospace;padding:20px;'>";
echo "<h1>🔧 BAS Daily Worker — Database Setup</h1>";

try {
    $db = getDB();
    echo "<p>✅ Database connected: <b>" . DB_NAME . "</b></p>";
} catch (Exception $e) {
    echo "<p>❌ Database connection failed: " . $e->getMessage() . "</p></body></html>";
    exit;
}

$success = 0;
$errors = [];

// 1. users_dw
echo "<h2>1. Users DW Table</h2>";
try {
    $db->exec("CREATE TABLE IF NOT EXISTS users_dw (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nik VARCHAR(16) NOT NULL,
        username VARCHAR(50) NOT NULL,
        password VARCHAR(255) NOT NULL,
        plain_password VARCHAR(100) DEFAULT NULL,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) DEFAULT NULL,
        phone VARCHAR(20) DEFAULT NULL,
        google_id VARCHAR(100) DEFAULT NULL,
        picture TEXT DEFAULT NULL,
        is_blacklisted TINYINT(1) DEFAULT 0,
        is_deleted TINYINT(1) DEFAULT 0,
        last_login DATETIME DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_nik (nik),
        UNIQUE KEY uk_username (username)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    echo "<p>✅ users_dw table ready</p>";
    $success++;
} catch (Exception $e) { echo "<p>❌ " . $e->getMessage() . "</p>"; $errors[] = $e->getMessage(); }

// 2. admins (DW-specific admins)
echo "<h2>2. Admins Table</h2>";
try {
    $db->exec("CREATE TABLE IF NOT EXISTS admins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(100) NOT NULL,
        role ENUM('owner','korlap','korlap_interview','korlap_td') NOT NULL DEFAULT 'korlap',
        location_id INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    
    // Insert default owner if not exists
    $stmt = $db->prepare('SELECT id FROM admins WHERE username = ?');
    $stmt->execute(['owner']);
    if (!$stmt->fetch()) {
        $hash = password_hash('owner123', PASSWORD_DEFAULT);
        $db->prepare('INSERT INTO admins (username, password, name, role) VALUES (?, ?, ?, ?)')
           ->execute(['owner', $hash, 'Owner DW', 'owner']);
        echo "<p>✅ Default owner account created (owner / owner123)</p>";
    }
    echo "<p>✅ admins table ready</p>";
    $success++;
} catch (Exception $e) { echo "<p>❌ " . $e->getMessage() . "</p>"; $errors[] = $e->getMessage(); }

// 3. blacklists
echo "<h2>3. Blacklists Table</h2>";
try {
    $db->exec("CREATE TABLE IF NOT EXISTS blacklists (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nik VARCHAR(16) NOT NULL UNIQUE,
        name VARCHAR(100) DEFAULT NULL,
        reason TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    echo "<p>✅ blacklists table ready</p>";
    $success++;
} catch (Exception $e) { echo "<p>❌ " . $e->getMessage() . "</p>"; $errors[] = $e->getMessage(); }

// 4. candidates_dw
echo "<h2>4. Candidates DW Table</h2>";
try {
    $db->exec("CREATE TABLE IF NOT EXISTS candidates_dw (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT DEFAULT NULL,
        given_id VARCHAR(20) DEFAULT NULL,
        nik VARCHAR(16) DEFAULT NULL,
        nama VARCHAR(100) DEFAULT NULL,
        nomor_telepon VARCHAR(20) DEFAULT NULL,
        gender VARCHAR(20) DEFAULT NULL,
        bank VARCHAR(50) DEFAULT NULL,
        norek VARCHAR(30) DEFAULT NULL,
        atas_nama VARCHAR(100) DEFAULT NULL,
        alamat TEXT DEFAULT NULL,
        kota VARCHAR(50) DEFAULT NULL,
        tanggal_lahir DATE DEFAULT NULL,
        referensi VARCHAR(100) DEFAULT NULL,
        station VARCHAR(100) DEFAULT NULL,
        jabatan VARCHAR(50) DEFAULT 'Daily Worker',
        ktp_path VARCHAR(255) DEFAULT NULL,
        signature_path TEXT DEFAULT NULL,
        status VARCHAR(50) DEFAULT 'Belum Pemberkasan',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    echo "<p>✅ candidates_dw table ready</p>";
    $success++;
} catch (Exception $e) { echo "<p>❌ " . $e->getMessage() . "</p>"; $errors[] = $e->getMessage(); }

// 5. absensi_foto
echo "<h2>5. Absensi Foto Table</h2>";
try {
    $db->exec("CREATE TABLE IF NOT EXISTS absensi_foto (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        ops_id VARCHAR(20) DEFAULT NULL,
        nama VARCHAR(100) DEFAULT NULL,
        station VARCHAR(100) DEFAULT NULL,
        foto_path VARCHAR(255) NOT NULL,
        latitude DECIMAL(10,7) DEFAULT NULL,
        longitude DECIMAL(10,7) DEFAULT NULL,
        alamat_lokasi TEXT DEFAULT NULL,
        jenis ENUM('masuk','pulang') DEFAULT 'masuk',
        tanggal DATE NOT NULL,
        jam TIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_date (user_id, tanggal),
        INDEX idx_date (tanggal)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    echo "<p>✅ absensi_foto table ready</p>";
    $success++;
} catch (Exception $e) { echo "<p>❌ " . $e->getMessage() . "</p>"; $errors[] = $e->getMessage(); }

// 6. payroll
echo "<h2>6. Payroll Table</h2>";
try {
    $db->exec("CREATE TABLE IF NOT EXISTS payroll (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        ops_id VARCHAR(20) DEFAULT NULL,
        nama VARCHAR(100) DEFAULT NULL,
        period VARCHAR(7) NOT NULL,
        hari_kerja INT DEFAULT 0,
        pendapatan_dasar DECIMAL(12,2) DEFAULT 0,
        lembur DECIMAL(12,2) DEFAULT 0,
        potongan DECIMAL(12,2) DEFAULT 0,
        thp DECIMAL(12,2) DEFAULT 0,
        catatan TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user (user_id),
        INDEX idx_period (period)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    echo "<p>✅ payroll table ready</p>";
    $success++;
} catch (Exception $e) { echo "<p>❌ " . $e->getMessage() . "</p>"; $errors[] = $e->getMessage(); }

// 7. documents
echo "<h2>7. Documents Table</h2>";
try {
    $db->exec("CREATE TABLE IF NOT EXISTS documents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        doc_type VARCHAR(50) NOT NULL,
        file_path VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    echo "<p>✅ documents table ready</p>";
    $success++;
} catch (Exception $e) { echo "<p>❌ " . $e->getMessage() . "</p>"; $errors[] = $e->getMessage(); }

// 8. Upload Directory
echo "<h2>8. Upload Directory</h2>";
$uploadDir = __DIR__ . '/uploads/absen/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
    echo "<p>✅ Upload directory created</p>";
} else {
    echo "<p>✅ Upload directory exists</p>";
}

// Summary
echo "<h2>📋 All Tables in Database</h2>";
$tables = $db->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
echo "<pre>" . implode("  ", $tables) . "</pre>";

echo "<h2>🎉 Setup Complete!</h2>";
echo "<p>✅ Success: $success tables</p>";
if ($errors) {
    echo "<p>❌ Errors: " . count($errors) . "</p>";
    foreach ($errors as $err) echo "<p style='color:red;'>$err</p>";
}
echo "<p>⚠️ <b>HAPUS file setup-dw.php ini dari server setelah selesai!</b></p>";
echo "</body></html>";
