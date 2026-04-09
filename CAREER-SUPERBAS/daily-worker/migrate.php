<?php
require_once __DIR__ . '/api/config.php';

echo "<h2>Migrasi Database Daily Worker</h2>";

try {
    $pdo = new PDO('mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4', DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);
    echo "<p>✅ Terhubung ke database: " . DB_NAME . "</p>";

    // 1. Table users (for login candidate)
    $sql_users = "
    CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(100) NOT NULL,
        nik VARCHAR(16) UNIQUE,
        email VARCHAR(100),
        phone VARCHAR(20),
        role ENUM('user') DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ";
    $pdo->exec($sql_users);
    echo "<p>✅ Tabel users berhasil dicek/dibuat.</p>";

    // 2. Table admins (for owner/korlap)
    $sql_admins = "
    CREATE TABLE IF NOT EXISTS admins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(100) NOT NULL,
        role ENUM('owner', 'korlap', 'korlap_interview', 'korlap_td') NOT NULL,
        location_name VARCHAR(100),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ";
    $pdo->exec($sql_admins);
    
    // Create default owner if not exists
    $stmt = $pdo->query("SELECT id FROM admins WHERE username='owner'");
    if($stmt->rowCount() == 0) {
        // Password is 'alim123'
        $pdo->exec("INSERT INTO admins (username, password, name, role) VALUES ('owner', '" . password_hash('alim123', PASSWORD_DEFAULT) . "', 'Super Owner', 'owner')");
        echo "<p>✅ Akun default owner berhasil dibuat. (Password: alim123)</p>";
    }
    
    echo "<p>✅ Tabel admins berhasil dicek/dibuat.</p>";

    // 3. Table candidates_dw (The exact fields user requested)
    $sql_candidates = "
    CREATE TABLE IF NOT EXISTS candidates_dw (
        id INT AUTO_INCREMENT PRIMARY KEY,
        given_id VARCHAR(20) UNIQUE DEFAULT NULL,
        user_id INT NOT NULL,
        nama VARCHAR(150),
        nik VARCHAR(16),
        nomor_telepon VARCHAR(20),
        gender ENUM('Laki-laki', 'Perempuan'),
        bank VARCHAR(50),
        norek VARCHAR(50),
        atas_nama VARCHAR(150),
        alamat TEXT,
        kota VARCHAR(100),
        tanggal_lahir DATE,
        referensi VARCHAR(100),
        station VARCHAR(100),
        ktp_path VARCHAR(255),
        signature_path TEXT,
        status ENUM('Belum Pemberkasan', 'Sudah Pemberkasan', 'Menunggu Interview', 'Jadwal Interview', 'Lulus', 'Tidak Lulus') DEFAULT 'Belum Pemberkasan',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ";
    $pdo->exec($sql_candidates);
    echo "<p>✅ Tabel candidates_dw berhasil dicek/dibuat dengan kolom sesuai permintaan.</p>";

    // 4. Table payroll_dw (For Mass Payroll Upload)
    $sql_payroll = "
    CREATE TABLE IF NOT EXISTS payroll_dw (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nik VARCHAR(16) NOT NULL,
        period VARCHAR(50) NOT NULL,
        pendapatan_dasar DECIMAL(12,2) DEFAULT 0,
        lembur DECIMAL(12,2) DEFAULT 0,
        potongan DECIMAL(12,2) DEFAULT 0,
        thp DECIMAL(12,2) DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_nik (nik),
        INDEX idx_period (period)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ";
    $pdo->exec($sql_payroll);
    echo "<p>✅ Tabel payroll_dw berhasil dicek/dibuat.</p>";

    echo "<hr><p>🎉 Migrasi selesai! Silakan buka halaman login untuk tes.</p>";

} catch (PDOException $e) {
    die("<p>❌ Error Database: " . $e->getMessage() . "</p><p>Panduan: Pastikan database " . DB_NAME . " sudah dibuat di phpMyAdmin.</p>");
}
?>
