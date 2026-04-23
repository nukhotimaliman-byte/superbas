<?php
/**
 * BAS Daily Worker — Database Setup
 * Run once to create all required tables.
 * Access: GET /api/setup.php?key=BAS2026
 */
require_once __DIR__ . '/../config.php';

$key = $_GET['key'] ?? '';
if ($key !== 'BAS2026') {
    jsonResponse(['error' => 'Invalid setup key. Use ?key=BAS2026'], 403);
}

$db = getDB();
$results = [];

$tables = [
    'dw_users' => "CREATE TABLE IF NOT EXISTS dw_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150),
        nik VARCHAR(16) NOT NULL,
        password VARCHAR(255),
        google_id VARCHAR(100),
        picture TEXT,
        phone VARCHAR(20),
        provinsi VARCHAR(100),
        kabupaten VARCHAR(100),
        kecamatan VARCHAR(100),
        kelurahan VARCHAR(100),
        is_active TINYINT(1) DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_nik (nik),
        UNIQUE KEY unique_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

    'dw_admins' => "CREATE TABLE IF NOT EXISTS dw_admins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(100) NOT NULL,
        role ENUM('owner','korlap','admin') DEFAULT 'admin',
        location_id INT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_username (username)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

    'dw_locations' => "CREATE TABLE IF NOT EXISTS dw_locations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        address TEXT,
        maps_link VARCHAR(500),
        is_active TINYINT(1) DEFAULT 1
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

    'dw_candidates' => "CREATE TABLE IF NOT EXISTS dw_candidates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        candidate_id VARCHAR(20),
        given_id VARCHAR(20),
        nik VARCHAR(16),
        name VARCHAR(100) NOT NULL,
        whatsapp VARCHAR(20),
        address TEXT,
        provinsi VARCHAR(100),
        kabupaten VARCHAR(100),
        kecamatan VARCHAR(100),
        kelurahan VARCHAR(100),
        tempat_lahir VARCHAR(100),
        tanggal_lahir DATE,
        pendidikan_terakhir VARCHAR(50),
        posisi_dilamar VARCHAR(100),
        pengalaman_kerja TEXT,
        keahlian TEXT,
        pernah_kerja_spx VARCHAR(10),
        surat_sehat VARCHAR(20),
        paklaring VARCHAR(20),
        status VARCHAR(50) DEFAULT 'Belum Pemberkasan',
        location_id INT,
        jadwal_interview DATE,
        interview_location VARCHAR(100),
        test_drive_date DATE,
        test_drive_time VARCHAR(10),
        emergency_name VARCHAR(100),
        emergency_phone VARCHAR(20),
        emergency_relation VARCHAR(50),
        bank_name VARCHAR(50),
        bank_account_no VARCHAR(30),
        bank_account_name VARCHAR(100),
        referensi TEXT,
        korlap_notes TEXT,
        signature_data LONGTEXT,
        photo_data LONGTEXT,
        track_requested TINYINT(1) DEFAULT 0,
        last_latitude DOUBLE,
        last_longitude DOUBLE,
        last_accuracy FLOAT,
        last_location_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user (user_id),
        INDEX idx_nik (nik),
        INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

    'dw_documents' => "CREATE TABLE IF NOT EXISTS dw_documents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        candidate_id INT NOT NULL,
        doc_type VARCHAR(30) NOT NULL,
        file_path VARCHAR(255),
        original_name VARCHAR(255),
        file_size INT,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_doc (candidate_id, doc_type),
        INDEX idx_candidate (candidate_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

    'dw_chat_messages' => "CREATE TABLE IF NOT EXISTS dw_chat_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        candidate_id INT NOT NULL,
        sender_type ENUM('user','admin') NOT NULL,
        sender_id INT,
        sender_name VARCHAR(100),
        message_type ENUM('text','image','file','location') DEFAULT 'text',
        message TEXT,
        file_path VARCHAR(255),
        file_name VARCHAR(255),
        file_size INT,
        file_mime VARCHAR(100),
        latitude DOUBLE,
        longitude DOUBLE,
        is_read TINYINT(1) DEFAULT 0,
        reply_to_id INT,
        reply_preview TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_candidate (candidate_id),
        INDEX idx_read (candidate_id, sender_type, is_read)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

    'dw_chat_templates' => "CREATE TABLE IF NOT EXISTS dw_chat_templates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        admin_id INT DEFAULT 0,
        title VARCHAR(100),
        message TEXT,
        sort_order INT DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

    'dw_push_subscriptions' => "CREATE TABLE IF NOT EXISTS dw_push_subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        admin_id INT,
        endpoint TEXT NOT NULL,
        p256dh VARCHAR(255),
        auth_key VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user (user_id),
        INDEX idx_admin (admin_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

    'dw_blacklist' => "CREATE TABLE IF NOT EXISTS dw_blacklist (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nik VARCHAR(16) NOT NULL,
        name VARCHAR(100),
        reason TEXT,
        blacklisted_by VARCHAR(100),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_nik (nik)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

    'dw_settings' => "CREATE TABLE IF NOT EXISTS dw_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(50) NOT NULL,
        setting_value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_key (setting_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

    'dw_track_requests' => "CREATE TABLE IF NOT EXISTS dw_track_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        candidate_id INT NOT NULL,
        candidate_name VARCHAR(100) DEFAULT '',
        candidate_nik VARCHAR(20) DEFAULT '',
        status ENUM('pending','received','cancelled') DEFAULT 'pending',
        requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        received_at DATETIME DEFAULT NULL,
        latitude DOUBLE DEFAULT NULL,
        longitude DOUBLE DEFAULT NULL,
        accuracy FLOAT DEFAULT NULL,
        INDEX idx_status (status),
        INDEX idx_candidate (candidate_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
];

foreach ($tables as $name => $sql) {
    try {
        $db->exec($sql);
        $results[] = "✅ $name";
    } catch (PDOException $e) {
        $results[] = "❌ $name: " . $e->getMessage();
    }
}

// Insert default admin
try {
    $hash = password_hash('admin123', PASSWORD_DEFAULT);
    $db->exec("INSERT IGNORE INTO dw_admins (username, password, name, role) VALUES ('owner', '$hash', 'Owner BAS', 'owner')");
    $results[] = "✅ Default admin (owner/admin123)";
} catch (PDOException $e) {
    $results[] = "⚠ Admin exists";
}

// Insert default locations
try {
    $db->exec("INSERT IGNORE INTO dw_locations (name, address, maps_link) VALUES 
        ('Makobas', 'Jl. Raya Bekasi KM.28', 'https://maps.google.com'),
        ('Mess Cileungsi', 'Cileungsi, Bogor', 'https://maps.google.com'),
        ('Cibitung', 'Cibitung, Bekasi', 'https://maps.google.com'),
        ('Cakung 2', 'Cakung, Jakarta Timur', 'https://maps.google.com')
    ");
    $results[] = "✅ Default locations";
} catch (PDOException $e) {
    $results[] = "⚠ Locations exist";
}

jsonResponse([
    'success' => true,
    'message' => 'Daily Worker database setup complete!',
    'results' => $results
]);
