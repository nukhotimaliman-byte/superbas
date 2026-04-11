<?php
/**
 * BAS Recruitment — Chat Database Setup
 * Run once: https://super-bas.com/driver/api/setup-chat.php
 */
require_once __DIR__ . '/../config.php';
header('Content-Type: text/plain; charset=utf-8');

$db = getDB();
echo "=== BAS Chat — Database Setup ===\n\n";

// chat_messages table
try {
    $db->exec("CREATE TABLE IF NOT EXISTS chat_messages (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        candidate_id  INT NOT NULL,
        sender_type   ENUM('user','admin') NOT NULL,
        sender_id     INT NOT NULL,
        sender_name   VARCHAR(100) NOT NULL DEFAULT '',
        message_type  ENUM('text','image','file','location') DEFAULT 'text',
        message       TEXT,
        file_path     VARCHAR(255) DEFAULT NULL,
        file_name     VARCHAR(255) DEFAULT NULL,
        file_size     INT DEFAULT 0,
        file_mime     VARCHAR(100) DEFAULT NULL,
        latitude      DECIMAL(10,7) DEFAULT NULL,
        longitude     DECIMAL(10,7) DEFAULT NULL,
        is_read       TINYINT DEFAULT 0,
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_candidate (candidate_id, created_at),
        INDEX idx_unread (candidate_id, sender_type, is_read),
        INDEX idx_poll (id, candidate_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    echo "✅ chat_messages table ready\n";
} catch (Exception $e) {
    echo "❌ chat_messages: " . $e->getMessage() . "\n";
}

// chat_templates table (custom templates)
try {
    $db->exec("CREATE TABLE IF NOT EXISTS chat_templates (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        admin_id   INT NOT NULL,
        title      VARCHAR(100) NOT NULL,
        message    TEXT NOT NULL,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_admin (admin_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    echo "✅ chat_templates table ready\n";

    // Insert defaults if empty
    $count = $db->query("SELECT COUNT(*) FROM chat_templates")->fetchColumn();
    if ($count == 0) {
        $defaults = [
            ['Jadwal Test Drive', 'Jadwal test drive Anda telah ditentukan. Silakan datang pada waktu yang telah dijadwalkan.'],
            ['Selamat Lulus', 'Selamat! Anda dinyatakan lulus seleksi. Silakan tunggu informasi selanjutnya.'],
            ['Lengkapi Berkas', 'Mohon segera lengkapi berkas yang diperlukan melalui tab Berkas di aplikasi.'],
            ['Konfirmasi Kehadiran', 'Apakah Anda bisa hadir pada jadwal yang telah ditentukan? Mohon konfirmasi.'],
            ['Info Lokasi', 'Berikut lokasi yang perlu Anda datangi. Silakan cek peta yang terlampir.'],
        ];
        $stmt = $db->prepare("INSERT INTO chat_templates (admin_id, title, message, sort_order) VALUES (0, ?, ?, ?)");
        foreach ($defaults as $i => $t) {
            $stmt->execute([$t[0], $t[1], $i]);
        }
        echo "✅ Default templates inserted (" . count($defaults) . ")\n";
    }
} catch (Exception $e) {
    echo "❌ chat_templates: " . $e->getMessage() . "\n";
}

// Create chat uploads directory
$chatUploadDir = __DIR__ . '/../uploads/chat/';
if (!is_dir($chatUploadDir)) {
    mkdir($chatUploadDir, 0755, true);
    echo "✅ uploads/chat/ directory created\n";
} else {
    echo "✅ uploads/chat/ directory exists\n";
}

echo "\n=== Setup Complete ===\n";
echo "Delete this file after running.\n";
