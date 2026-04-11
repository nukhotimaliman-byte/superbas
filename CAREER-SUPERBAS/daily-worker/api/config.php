<?php
/**
 * Database Configuration — BAS SUPERBAS V10
 * 
 * INSTRUKSI:
 * 1. Login ke cPanel → MySQL Databases
 * 2. Buat database baru, misal: supy7197_bas
 * 3. Buat user baru, misal: supy7197_basuser 
 * 4. Assign user ke database dengan ALL PRIVILEGES
 * 5. Update nilai di bawah ini
 */

define('DB_HOST', '46.250.232.197'); // Sesuai VPS Contabo
define('DB_NAME', 'dailyworker_db'); // Database khusus Daily Worker
define('DB_USER', 'owner');
define('DB_PASS', 'Asik123asik');

define('UPLOAD_DIR', __DIR__ . '/uploads/absen/');
// Upload tuning — kecil tapi tetap tajam untuk selfie absen.
// Target ~150-200KB per foto. Resolusi 800px cukup untuk wajah + watermark.
define('MAX_PHOTO_SIZE', 2500 * 1024);       // Max input base64 (2.5MB)
define('PHOTO_MAX_DIMENSION', 800);           // Resize max 800px (was 960)
define('PHOTO_JPEG_QUALITY', 75);             // Start quality (was 82)
define('PHOTO_MIN_JPEG_QUALITY', 60);         // Minimum quality (was 68)
define('PHOTO_TARGET_BYTES', 200 * 1024);     // Target 200KB (was 350KB)
define('PHOTO_LIST_DEFAULT_LIMIT', 24);
define('PHOTO_LIST_MAX_LIMIT', 60);

// Allowed origins for CORS
define('ALLOWED_ORIGINS', [
    'https://super-bas.com',
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'http://localhost:8000',
]);

// ── Session & Security ──────────────────────────────
define('SESSION_LIFETIME', 3600 * 8); // 8 hours

if (session_status() === PHP_SESSION_NONE) {
    session_name('BAS_DW_SESS');
    @ini_set('session.gc_maxlifetime', SESSION_LIFETIME);
    @session_set_cookie_params([
        'lifetime' => SESSION_LIFETIME,
        'path'     => '/',           // Covers entire domain
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    @session_start();
}

// ── PDO Connection ──────────────────────────────────
function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        try {
            $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database connection failed']);
            exit;
        }
    }
    return $pdo;
}

// ── Helpers ─────────────────────────────────────────
if (!function_exists('jsonResponse')) {
    function jsonResponse($data, int $code = 200): void {
        http_response_code($code);
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit;
    }
}
