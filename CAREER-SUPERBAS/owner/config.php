<?php
/**
 * BAS Super Owner — Configuration
 * Shared database connection for all projects
 */

ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(0);
ob_start();

// ── Database ────────────────────────────────────────
define('DB_HOST', '46.250.232.197');
define('DB_NAME', 'super-bas.com');
define('DB_USER', 'owner');
define('DB_PASS', 'Asik123asik');

// ── Session ─────────────────────────────────────────
define('SESSION_LIFETIME', 3600 * 24 * 30); // 30 days

// ── CORS ────────────────────────────────────────────
$_origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$_allowed = [
    'http://localhost:8080', 'http://localhost:3000',
    'http://127.0.0.1:8080', 'http://127.0.0.1:3000',
    'https://super-bas.com', 'https://www.super-bas.com'
];
if (in_array($_origin, $_allowed) || strpos($_origin, 'http://localhost') === 0 || strpos($_origin, 'http://127.0.0.1') === 0) {
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
    session_name('BAS_OWNER_SESS');
    @ini_set('session.gc_maxlifetime', SESSION_LIFETIME);
    @session_set_cookie_params([
        'lifetime' => SESSION_LIFETIME,
        'path'     => '/',
        'httponly'  => true,
        'samesite'  => 'Lax'
    ]);
    @session_start();

    if (isset($_COOKIE['BAS_OWNER_SESS'])) {
        setcookie('BAS_OWNER_SESS', session_id(), [
            'expires'  => time() + SESSION_LIFETIME,
            'path'     => '/',
            'httponly'  => true,
            'samesite'  => 'Lax'
        ]);
    }
}

// ── PDO ─────────────────────────────────────────────
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
    if (ob_get_level()) ob_clean();
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function requireOwnerAuth(): array {
    if (empty($_SESSION['owner_id'])) {
        jsonResponse(['error' => 'Unauthorized'], 401);
    }
    return [
        'id'   => $_SESSION['owner_id'],
        'name' => $_SESSION['owner_name'],
        'role' => $_SESSION['owner_role']
    ];
}

// ── Settings Helper ─────────────────────────────────
define('SETTINGS_FILE', __DIR__ . '/data/settings.json');

function getSettings(): array {
    if (!file_exists(SETTINGS_FILE)) return getDefaultSettings();
    $data = json_decode(file_get_contents(SETTINGS_FILE), true);
    return is_array($data) ? array_merge(getDefaultSettings(), $data) : getDefaultSettings();
}

function saveSettings(array $settings): bool {
    $dir = dirname(SETTINGS_FILE);
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    return file_put_contents(SETTINGS_FILE, json_encode($settings, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) !== false;
}

function getDefaultSettings(): array {
    return [
        'maintenance' => [
            'enabled' => false,
            'message' => 'Website sedang dalam perbaikan sistem.',
            'estimate' => ''
        ],
        'landing_stats' => [
            'auto_count' => false,
            'total_pelamar' => '45.762',
            'kota_aktif' => '200',
            'persen_gratis' => '100'
        ],
        'social_media' => [
            ['platform' => 'instagram', 'url' => '#', 'label' => 'Instagram'],
            ['platform' => 'tiktok', 'url' => '#', 'label' => 'TikTok'],
            ['platform' => 'linkedin', 'url' => '#', 'label' => 'LinkedIn']
        ],
        'faq' => [],
        'testimonials' => [],
        'gallery' => []
    ];
}
