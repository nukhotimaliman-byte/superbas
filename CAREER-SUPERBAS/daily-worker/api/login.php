<?php
/**
 * BAS Daily Worker — SQL Login Endpoint
 * 
 * Mengautentikasi user DW menggunakan username + NIK (password).
 * Menggunakan tabel users_dw (terpisah dari Driver portal).
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

$opsId = strtoupper(trim($input['opsId'] ?? ''));
$nik   = trim($input['nik'] ?? '');

if (!$opsId || !$nik) {
    jsonResponse(['error' => 'OPS ID dan NIK wajib diisi'], 400);
}

try {
    $db = getDB();

    // Ensure users_dw table exists
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // Search in DW users table (username OR NIK)
    $stmt = $db->prepare('
        SELECT u.id, u.nik, u.username, u.password, u.name, u.email, u.phone, 
               u.is_blacklisted, u.is_deleted,
               c.given_id AS ops_id, c.station, c.jabatan, c.status AS cand_status
        FROM users_dw u
        LEFT JOIN candidates_dw c ON c.user_id = u.id
        WHERE (u.username = ? OR u.nik = ?)
        LIMIT 1
    ');
    $stmt->execute([$opsId, $opsId]);
    $user = $stmt->fetch();

    if (!$user) {
        jsonResponse(['error' => 'Akun tidak ditemukan di Daily Worker'], 401);
    }

    if ($user['is_deleted']) {
        jsonResponse(['error' => 'Akun telah dihapus'], 403);
    }

    if ($user['is_blacklisted']) {
        jsonResponse(['error' => 'Akses ditolak. Akun telah diblacklist.'], 403);
    }

    // Verify password (NIK = password)
    if (!password_verify($nik, $user['password']) && $user['nik'] !== $nik) {
        jsonResponse(['error' => 'NIK tidak cocok'], 401);
    }

    // Update last login
    $db->prepare('UPDATE users_dw SET last_login = NOW() WHERE id = ?')->execute([$user['id']]);

    // Set session
    $_SESSION['user_id']   = $user['id'];
    $_SESSION['user_name'] = $user['name'];
    $_SESSION['user_role'] = 'user';

    jsonResponse([
        'success' => true,
        'user' => [
            'id'       => (int) $user['id'],
            'opsId'    => $user['ops_id'] ?: $user['username'],
            'name'     => $user['name'],
            'nik'      => $user['nik'],
            'email'    => $user['email'],
            'phone'    => $user['phone'],
            'station'  => $user['station'] ?? '',
            'position' => $user['jabatan'] ?? 'Daily Worker',
            'status'   => $user['cand_status'] ?? 'Aktif',
            'source'   => 'sql'
        ]
    ]);

} catch (PDOException $e) {
    error_log('[BAS DW Login] DB Error: ' . $e->getMessage());
    jsonResponse(['error' => 'Database error: ' . $e->getMessage()], 500);
} catch (Exception $e) {
    error_log('[BAS DW Login] Error: ' . $e->getMessage());
    jsonResponse(['error' => 'Server error'], 500);
}
