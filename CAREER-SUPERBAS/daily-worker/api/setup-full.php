<?php
/**
 * BAS Daily Worker — Full Database Setup
 * 
 * Jalankan SEKALI via browser:
 *   https://super-bas.com/daily-worker/api/setup-full.php
 * 
 * HAPUS file ini setelah selesai!
 */
require_once __DIR__ . '/config.php';

ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: text/html; charset=utf-8');

echo '<html><head><title>BAS DW Setup</title><style>
body{font-family:sans-serif;max-width:800px;margin:40px auto;background:#1a1a2e;color:#eee;padding:20px}
.ok{color:#4ade80}.fail{color:#f87171}.warn{color:#fbbf24}
pre{background:#0d0d1a;padding:12px;border-radius:8px;overflow-x:auto}
</style></head><body>';
echo '<h1>🔧 BAS Daily Worker — Database Setup</h1>';

try {
    $pdo = new PDO(
        'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
        DB_USER, DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    echo '<p class="ok">✅ Database connected: ' . DB_NAME . '</p>';
} catch (PDOException $e) {
    die('<p class="fail">❌ DB connection failed: ' . $e->getMessage() . '</p></body></html>');
}

$results = [];

// Helper function
function runSQL($pdo, $name, $sql) {
    global $results;
    try {
        $pdo->exec($sql);
        $results[] = ['ok', $name];
        echo "<p class='ok'>✅ {$name}</p>";
    } catch (PDOException $e) {
        $results[] = ['fail', $name, $e->getMessage()];
        echo "<p class='fail'>❌ {$name}: {$e->getMessage()}</p>";
    }
}

// ═══════════════════════════════════════════════════════
// 1. USERS table — shared with Driver portal
// ═══════════════════════════════════════════════════════
echo '<h2>1. Users Table</h2>';

// Check if users table exists and add missing columns
$usersExists = $pdo->query("SHOW TABLES LIKE 'users'")->rowCount() > 0;

if (!$usersExists) {
    runSQL($pdo, 'Create users table', "
        CREATE TABLE users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nik VARCHAR(16) DEFAULT NULL,
            username VARCHAR(50) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            plain_password VARCHAR(100) DEFAULT NULL,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(100) DEFAULT NULL,
            phone VARCHAR(20) DEFAULT NULL,
            google_id VARCHAR(100) DEFAULT NULL,
            picture TEXT DEFAULT NULL,
            is_blacklisted TINYINT(1) DEFAULT 0,
            is_deleted TINYINT(1) DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_login DATETIME DEFAULT NULL,
            UNIQUE KEY uk_nik (nik),
            UNIQUE KEY uk_email (email),
            UNIQUE KEY uk_google (google_id),
            INDEX idx_username (username),
            INDEX idx_nik (nik)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
} else {
    echo '<p class="ok">✅ users table already exists</p>';
    // Add missing columns safely
    $cols = $pdo->query('SHOW COLUMNS FROM users')->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('nik', $cols)) {
        runSQL($pdo, 'Add nik column to users', "ALTER TABLE users ADD COLUMN nik VARCHAR(16) DEFAULT NULL AFTER id, ADD UNIQUE KEY uk_nik (nik)");
    }
    if (!in_array('is_deleted', $cols)) {
        runSQL($pdo, 'Add is_deleted column to users', "ALTER TABLE users ADD COLUMN is_deleted TINYINT(1) DEFAULT 0 AFTER is_blacklisted");
    }
    if (!in_array('plain_password', $cols)) {
        runSQL($pdo, 'Add plain_password column to users', "ALTER TABLE users ADD COLUMN plain_password VARCHAR(100) DEFAULT NULL AFTER password");
    }
    if (!in_array('phone', $cols)) {
        runSQL($pdo, 'Add phone column to users', "ALTER TABLE users ADD COLUMN phone VARCHAR(20) DEFAULT NULL AFTER email");
    }
}

// ═══════════════════════════════════════════════════════
// 2. ADMINS table — shared with Driver portal
// ═══════════════════════════════════════════════════════
echo '<h2>2. Admins Table</h2>';

$adminsExists = $pdo->query("SHOW TABLES LIKE 'admins'")->rowCount() > 0;

if (!$adminsExists) {
    runSQL($pdo, 'Create admins table', "
        CREATE TABLE admins (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(50) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            name VARCHAR(100) NOT NULL,
            role ENUM('owner','korlap','korlap_interview','korlap_td') DEFAULT 'korlap',
            location_id INT DEFAULT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_role (role)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    // Create default owner account
    $ownerPw = password_hash('owner123', PASSWORD_DEFAULT);
    runSQL($pdo, 'Create default owner account', "
        INSERT INTO admins (username, password, name, role) 
        VALUES ('owner', '{$ownerPw}', 'Owner', 'owner')
    ");
    echo '<p class="warn">⚠️ Default owner: username=<b>owner</b>, password=<b>owner123</b> — Ganti segera!</p>';
} else {
    echo '<p class="ok">✅ admins table already exists</p>';
}

// ═══════════════════════════════════════════════════════
// 3. BLACKLISTS table
// ═══════════════════════════════════════════════════════
echo '<h2>3. Blacklists Table</h2>';

$blExists = $pdo->query("SHOW TABLES LIKE 'blacklists'")->rowCount() > 0;

if (!$blExists) {
    runSQL($pdo, 'Create blacklists table', "
        CREATE TABLE blacklists (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nik VARCHAR(16) NOT NULL UNIQUE,
            name VARCHAR(100) DEFAULT NULL,
            reason TEXT DEFAULT NULL,
            created_by VARCHAR(100) DEFAULT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_nik (nik)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
} else {
    echo '<p class="ok">✅ blacklists table already exists</p>';
}

// ═══════════════════════════════════════════════════════
// 4. CANDIDATES_DW table — Daily Worker candidates
// ═══════════════════════════════════════════════════════
echo '<h2>4. Candidates DW Table</h2>';

$cdwExists = $pdo->query("SHOW TABLES LIKE 'candidates_dw'")->rowCount() > 0;

if (!$cdwExists) {
    runSQL($pdo, 'Create candidates_dw table', "
        CREATE TABLE candidates_dw (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT DEFAULT NULL,
            ops_id VARCHAR(20) DEFAULT NULL COMMENT 'ID Operasional diterbitkan oleh Owner',
            nik VARCHAR(16) DEFAULT NULL,
            nama VARCHAR(100) NOT NULL,
            nomor_telepon VARCHAR(20) DEFAULT NULL,
            email VARCHAR(100) DEFAULT NULL,
            alamat TEXT DEFAULT NULL,
            tempat_lahir VARCHAR(100) DEFAULT NULL,
            tanggal_lahir DATE DEFAULT NULL,
            station VARCHAR(50) DEFAULT NULL,
            jabatan VARCHAR(50) DEFAULT NULL,
            status VARCHAR(30) DEFAULT 'Belum Pemberkasan',
            tanggal_masuk DATE DEFAULT NULL,
            tanggal_keluar DATE DEFAULT NULL,
            gaji_pokok DECIMAL(12,0) DEFAULT 0,
            catatan TEXT DEFAULT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uk_ops_id (ops_id),
            INDEX idx_user_id (user_id),
            INDEX idx_nik (nik),
            INDEX idx_status (status),
            INDEX idx_station (station),
            CONSTRAINT fk_cdw_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
} else {
    echo '<p class="ok">✅ candidates_dw table already exists</p>';
}

// ═══════════════════════════════════════════════════════
// 5. ABSENSI_FOTO table — Photo attendance
// ═══════════════════════════════════════════════════════
echo '<h2>5. Absensi Foto Table</h2>';

$afExists = $pdo->query("SHOW TABLES LIKE 'absensi_foto'")->rowCount() > 0;

if (!$afExists) {
    runSQL($pdo, 'Create absensi_foto table', "
        CREATE TABLE absensi_foto (
            id INT AUTO_INCREMENT PRIMARY KEY,
            ops_id VARCHAR(20) NOT NULL,
            nama VARCHAR(100) NOT NULL,
            tipe ENUM('MASUK','KELUAR') NOT NULL,
            foto_path VARCHAR(255) NOT NULL,
            status ENUM('PENDING','DITERIMA','DITOLAK') NOT NULL DEFAULT 'PENDING',
            latitude DECIMAL(10,7) DEFAULT NULL,
            longitude DECIMAL(10,7) DEFAULT NULL,
            alamat VARCHAR(255) DEFAULT NULL,
            station VARCHAR(50) DEFAULT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_ops (ops_id),
            INDEX idx_date (created_at),
            INDEX idx_tipe (tipe),
            INDEX idx_status (status),
            INDEX idx_station (station)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
} else {
    echo '<p class="ok">✅ absensi_foto table already exists</p>';
}

// ═══════════════════════════════════════════════════════
// 6. PAYROLL table
// ═══════════════════════════════════════════════════════
echo '<h2>6. Payroll Table</h2>';

$prExists = $pdo->query("SHOW TABLES LIKE 'payroll'")->rowCount() > 0;

if (!$prExists) {
    runSQL($pdo, 'Create payroll table', "
        CREATE TABLE payroll (
            id INT AUTO_INCREMENT PRIMARY KEY,
            ops_id VARCHAR(20) NOT NULL,
            nama VARCHAR(100) NOT NULL,
            periode VARCHAR(20) NOT NULL COMMENT 'Format: 2026-04',
            hari_kerja INT DEFAULT 0,
            gaji_pokok DECIMAL(12,0) DEFAULT 0,
            tunjangan DECIMAL(12,0) DEFAULT 0,
            potongan DECIMAL(12,0) DEFAULT 0,
            total_gaji DECIMAL(12,0) DEFAULT 0,
            catatan TEXT DEFAULT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_ops (ops_id),
            INDEX idx_periode (periode),
            UNIQUE KEY uk_ops_periode (ops_id, periode)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
} else {
    echo '<p class="ok">✅ payroll table already exists</p>';
}

// ═══════════════════════════════════════════════════════
// 7. LOCATIONS table (if not exists from Driver)
// ═══════════════════════════════════════════════════════
echo '<h2>7. Locations Table</h2>';

$locExists = $pdo->query("SHOW TABLES LIKE 'locations'")->rowCount() > 0;

if (!$locExists) {
    runSQL($pdo, 'Create locations table', "
        CREATE TABLE locations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            address VARCHAR(255) DEFAULT NULL,
            maps_link VARCHAR(500) DEFAULT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
} else {
    echo '<p class="ok">✅ locations table already exists</p>';
}

// ═══════════════════════════════════════════════════════
// 8. Upload directory
// ═══════════════════════════════════════════════════════
echo '<h2>8. Upload Directory</h2>';

$uploadDir = __DIR__ . '/uploads/absen/';
if (!is_dir($uploadDir)) {
    if (@mkdir($uploadDir, 0755, true)) {
        echo '<p class="ok">✅ Upload directory created: ' . $uploadDir . '</p>';
    } else {
        echo '<p class="warn">⚠️ Could not create upload dir. Create manually: ' . $uploadDir . '</p>';
    }
} else {
    echo '<p class="ok">✅ Upload directory exists</p>';
}

// ═══════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════
echo '<hr>';
$tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
echo '<h2>📋 All Tables in Database</h2>';
echo '<pre>' . implode("\n", $tables) . '</pre>';

$okCount = count(array_filter($results, fn($r) => $r[0] === 'ok'));
$failCount = count(array_filter($results, fn($r) => $r[0] === 'fail'));
echo '<h2>🎉 Setup Complete!</h2>';
echo "<p class='ok'>✅ Success: {$okCount}</p>";
if ($failCount > 0) echo "<p class='fail'>❌ Failures: {$failCount}</p>";
echo '<p class="warn">⚠️ <strong>HAPUS file setup-full.php ini dari server setelah selesai!</strong></p>';
echo '</body></html>';
