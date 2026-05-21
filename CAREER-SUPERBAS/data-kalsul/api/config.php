<?php
/**
 * Data Kalsul - API Configuration
 * Database connection, session, CORS, helpers
 */

// ── Error reporting (disable display in production) ──
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

// ── CORS ──
$allowed_origins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://super-bas.com',
    'https://www.super-bas.com',
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins, true)) {
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Access-Control-Max-Age: 86400');
}

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ── Content type ──
header('Content-Type: application/json; charset=utf-8');

// ── Session ──
session_name('BAS_KALSUL_SESS');
session_set_cookie_params([
    'lifetime' => 86400,
    'path'     => '/',
    'domain'   => '',
    'secure'   => isset($_SERVER['HTTPS']),
    'httponly'  => true,
    'samesite'  => 'Lax',
]);
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// ── Database ──
define('DB_HOST', '46.250.232.197');
define('DB_NAME', 'super-bas.com');
define('DB_USER', 'owner');
define('DB_PASS', 'Asik123asik');
define('DB_CHARSET', 'utf8mb4');

/**
 * Get PDO database connection (singleton).
 */
function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            jsonError('Database connection failed', 500);
        }
    }
    return $pdo;
}

// ── Helper functions ──

/**
 * Send a JSON success response and exit.
 */
function jsonSuccess($data = null, int $code = 200): void {
    http_response_code($code);
    $response = ['success' => true];
    if ($data !== null) {
        $response['data'] = $data;
    }
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Send a JSON error response and exit.
 */
function jsonError(string $message, int $code = 400): void {
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'error'   => $message,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Require authenticated session or die.
 */
function requireAuth(): array {
    if (empty($_SESSION['kalsul_admin_id'])) {
        jsonError('Unauthorized – please login', 401);
    }
    return [
        'id'       => $_SESSION['kalsul_admin_id'],
        'username' => $_SESSION['kalsul_admin_name'] ?? '',
        'role'     => $_SESSION['kalsul_admin_role'] ?? 'admin',
        'station'  => $_SESSION['kalsul_admin_station'] ?? null,
    ];
}

/**
 * Get request method.
 */
function getMethod(): string {
    return strtoupper($_SERVER['REQUEST_METHOD']);
}

/**
 * Get JSON body from POST/PUT request.
 */
function getJsonBody(): array {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        return [];
    }
    return $data;
}

/**
 * Sanitize a string input.
 */
function sanitize(?string $value): ?string {
    if ($value === null) return null;
    return trim(htmlspecialchars($value, ENT_QUOTES, 'UTF-8'));
}
