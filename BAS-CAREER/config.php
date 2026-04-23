<?php
/**
 * BAS Recruitment System — Configuration
 * ========================================
 * EDIT the database credentials below to match your cPanel MySQL settings.
 */

// ── Database Credentials ────────────────────────────
// HOSTING (Rumahweb cPanel):
//   1. Login cPanel → MySQL Databases
//   2. Buat database baru, misal: supy7197_bascareer
//   3. Buat user MySQL, misal: supy7197_basuser
//   4. Assign user ke database (ALL PRIVILEGES)
//   5. Ganti nilai di bawah sesuai yang dibuat di cPanel
//   6. Import database_final.sql via phpMyAdmin
// ─────────────────────────────────────────────────────
define('DB_HOST', 'localhost');
define('DB_NAME', 'supy7197_bascareer');   // Database di cPanel
define('DB_USER', 'supy7197_bascareer');   // User MySQL di cPanel
define('DB_PASS', 'Barokah@123');          // Password MySQL

// ── Upload Settings ─────────────────────────────────
define('UPLOAD_DIR', __DIR__ . '/uploads/');
define('MAX_FILE_SIZE', 2 * 1024 * 1024); // 2MB
define('ALLOWED_EXTENSIONS', ['jpg', 'jpeg', 'png', 'pdf']);
define('ALLOWED_MIME_TYPES', [
    'image/jpeg',
    'image/png',
    'application/pdf'
]);

// ── Watermark Text ──────────────────────────────────
define('WATERMARK_TEXT', 'FOR BAS RECRUITMENT ONLY');

// ── Session & Security ──────────────────────────────
define('SESSION_LIFETIME', 3600 * 8); // 8 hours

// ── CORS & Headers ──────────────────────────────────
header('Content-Type: application/json; charset=UTF-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');

// ── Start Session ───────────────────────────────────
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.gc_maxlifetime', SESSION_LIFETIME);
    session_set_cookie_params(SESSION_LIFETIME);
    session_start();
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
function jsonResponse($data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function requireAuth(): array {
    if (empty($_SESSION['admin_id'])) {
        jsonResponse(['error' => 'Unauthorized'], 401);
    }
    return [
        'id'   => $_SESSION['admin_id'],
        'name' => $_SESSION['admin_name'],
        'role' => $_SESSION['admin_role'],
        'location_id' => $_SESSION['admin_location_id'] ?? null
    ];
}

function requireOwner(): array {
    $admin = requireAuth();
    if ($admin['role'] !== 'owner') {
        jsonResponse(['error' => 'Forbidden'], 403);
    }
    return $admin;
}

function requireUser(): array {
    if (empty($_SESSION['user_id'])) {
        jsonResponse(['error' => 'Unauthorized'], 401);
    }
    return [
        'id'   => $_SESSION['user_id'],
        'name' => $_SESSION['user_name'],
        'role' => $_SESSION['user_role'] ?? 'user'
    ];
}

// Ensure upload directory exists
if (!is_dir(UPLOAD_DIR)) {
    mkdir(UPLOAD_DIR, 0755, true);
}
