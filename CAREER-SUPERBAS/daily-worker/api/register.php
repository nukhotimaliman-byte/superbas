<?php
/**
 * BAS Daily Worker — Registration Endpoint
 * 
 * Endpoint khusus untuk pendaftaran Daily Worker.
 * Menggunakan tabel terpisah (users_dw) agar tidak konflik dengan Driver portal.
 * Dipanggil oleh login.html saat Daftar Akun.
 */
require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');

// CORS
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, ALLOWED_ORIGINS)) {
    header("Access-Control-Allow-Origin: $origin");
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    jsonResponse(['error' => 'Invalid JSON body'], 400);
}

// Map fields from login.html payload
$username = strtoupper(trim($input['username'] ?? ''));
$nik      = trim($input['nik'] ?? '');
$name     = trim($input['nama'] ?? $input['name'] ?? '');
$email    = trim($input['email'] ?? '');
$phone    = trim($input['telepon'] ?? $input['wa'] ?? $input['phone'] ?? '');
$station  = trim($input['station'] ?? '');

// Use NIK as password
$password = $nik;

// Validate
if (!$username || strlen($username) < 3) {
    jsonResponse(['error' => 'Username minimal 3 karakter'], 400);
}
if (!preg_match('/^[A-Z0-9_\-]+$/', $username)) {
    jsonResponse(['error' => 'Username hanya boleh huruf, angka, underscore, dan strip'], 400);
}
if (!preg_match('/^[0-9]{16}$/', $nik)) {
    jsonResponse(['error' => 'NIK harus 16 digit angka'], 400);
}
if (!$name) {
    jsonResponse(['error' => 'Nama lengkap wajib diisi'], 400);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonResponse(['error' => 'Format email tidak valid'], 400);
}
if (!preg_match('/^[0-9]{10,15}$/', $phone)) {
    jsonResponse(['error' => 'No. telepon harus 10-15 digit angka'], 400);
}

try {
    $db = getDB();

    // Ensure users_dw table exists (DW-specific users table)
    $db->exec("CREATE TABLE IF NOT EXISTS users_dw (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nik VARCHAR(16) NOT NULL UNIQUE,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        plain_password VARCHAR(100) DEFAULT NULL,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) DEFAULT NULL,
        phone VARCHAR(20) DEFAULT NULL,
        is_blacklisted TINYINT(1) DEFAULT 0,
        is_deleted TINYINT(1) DEFAULT 0,
        last_login DATETIME DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_nik (nik),
        UNIQUE KEY uk_username (username)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // Check blacklist
    $stmt = $db->prepare('SELECT reason FROM blacklists WHERE nik = ?');
    $stmt->execute([$nik]);
    if ($reason = $stmt->fetchColumn()) {
        jsonResponse(['error' => 'NIK ini telah diblacklist.' . ($reason ? ' Alasan: ' . $reason : '')], 403);
    }

    // Check duplicate NIK (within DW users only)
    $stmt = $db->prepare('SELECT id FROM users_dw WHERE nik = ?');
    $stmt->execute([$nik]);
    if ($stmt->fetch()) {
        jsonResponse(['error' => 'NIK sudah terdaftar di Daily Worker. Silakan login.'], 400);
    }

    // Check duplicate username (within DW users only)
    $stmt = $db->prepare('SELECT id FROM users_dw WHERE username = ?');
    $stmt->execute([$username]);
    if ($stmt->fetch()) {
        jsonResponse(['error' => 'Username sudah digunakan'], 400);
    }

    // Check duplicate email (within DW users only)
    if ($email) {
        $stmt = $db->prepare('SELECT id FROM users_dw WHERE email = ?');
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            jsonResponse(['error' => 'Email sudah terdaftar'], 400);
        }
    }

    // Create DW user
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $db->prepare('INSERT INTO users_dw (nik, username, password, plain_password, name, email, phone) VALUES (?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([$nik, $username, $hashedPassword, $password, $name, $email, $phone]);
    $userId = $db->lastInsertId();

    // Create candidate record with station
    $stmt = $db->prepare('INSERT INTO candidates_dw (user_id, nik, nama, nomor_telepon, station, status) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->execute([$userId, $nik, $name, $phone, $station, 'Belum Pemberkasan']);

    // Auto-login session
    $_SESSION['user_id']   = $userId;
    $_SESSION['user_name'] = $name;
    $_SESSION['user_role'] = 'user';

    jsonResponse([
        'success' => true,
        'user' => [
            'id'      => (int) $userId,
            'name'    => $name,
            'nik'     => $nik,
            'opsId'   => $username,
            'station' => $station,
            'role'    => 'user'
        ]
    ], 201);

} catch (PDOException $e) {
    error_log('[BAS DW Register] DB Error: ' . $e->getMessage());
    jsonResponse(['error' => 'Database error: ' . $e->getMessage()], 500);
} catch (Exception $e) {
    error_log('[BAS DW Register] Error: ' . $e->getMessage());
    jsonResponse(['error' => 'Terjadi kesalahan server.'], 500);
}
