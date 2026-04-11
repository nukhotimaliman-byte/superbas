<?php
/**
 * BAS Recruitment System — Configuration
 */

// Suppress PHP errors from corrupting JSON output
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(0);
ob_start(); // Capture any stray output

// ── Database Credentials ────────────────────────────
// HOSTING (Rumahweb cPanel):
//   1. Login cPanel → MySQL Databases
//   2. Buat database baru, misal: supy7197_bascareer
//   3. Buat user MySQL, misal: supy7197_basuser
//   4. Assign user ke database (ALL PRIVILEGES)
//   5. Ganti nilai di bawah sesuai yang dibuat di cPanel
//   6. Import database_final.sql via phpMyAdmin
// ─────────────────────────────────────────────────────
define('DB_HOST', '46.250.232.197');  // IP VPS Contabo
define('DB_NAME', 'super-bas.com');   // Database di VPS
define('DB_USER', 'owner');           // User MySQL di VPS
define('DB_PASS', 'Asik123asik');     // Password MySQL

// ── Web Push (VAPID) ────────────────────────────────
define('VAPID_SUBJECT',     'mailto:admin@super-bas.com');
define('VAPID_PUBLIC_KEY',  'BCWLxgd1u7FVL1uNJ5w1N6GU_M6w5tUHSnhCtphcNZAJwKA0MvwzMo99DkbC6bGYZEde7dIuHIaBdy0rMFgtgqo');
define('VAPID_PRIVATE_KEY', '4Zw77W_n1_iv4J1bWCIZkDVNM53AVQv4Ofg8EMt4eJU');
define('VAPID_PEM', <<<'PEM'
-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQg4Zw77W/n1/iv4J1b
WCIZkDVNM53AVQv4Ofg8EMt4eJWhRANCAAQli8YHdbuxVS9bjSecNTehlPzOsObV
B0p4QraYXDWQCcCgNDL8MzKPfQ5GwumxmGRHXu3SLhyGgXctKzBYLYKq
-----END PRIVATE KEY-----
PEM);

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
// Allow localhost dev to fetch from production VPS
$_origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$_allowed = [
    'http://localhost:8080', 'http://localhost:3000',
    'http://127.0.0.1:8080', 'http://127.0.0.1:3000',
    'https://super-bas.com', 'https://www.super-bas.com'
];
if (in_array($_origin, $_allowed) || substr($_origin, 0, 16) === 'http://localhost' || substr($_origin, 0, 18) === 'http://127.0.0.1') {
    header("Access-Control-Allow-Origin: {$_origin}");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
}
header('Content-Type: application/json; charset=UTF-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');

// ── Start Session ───────────────────────────────────
if (session_status() === PHP_SESSION_NONE) {
    session_name('BAS_DRIVER_SESS');
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
function jsonResponse($data, int $code = 200): void {
    if (ob_get_level()) ob_clean(); // Clear any stray output
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
