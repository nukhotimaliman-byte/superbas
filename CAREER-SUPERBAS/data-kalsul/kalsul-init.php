<?php
/**
 * Data KalSul — Setup Config
 * Creates config.php from template + runs SQL setup
 * URL: https://super-bas.com/data-kalsul/setup-config.php?token=bas2026
 * 
 * HAPUS FILE INI SETELAH SETUP!
 */

$TOKEN = 'bas2026';
if (($_GET['token'] ?? '') !== $TOKEN) { die('Token salah'); }

header('Content-Type: text/plain; charset=utf-8');
echo "=== Data KalSul Setup ===\n\n";

// Step 1: Create config.php
$configPath = __DIR__ . '/api/config.php';
$configContent = <<<'PHP'
<?php
/**
 * Data KalSul — Configuration
 */

ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(0);
ob_start();

// ── Database Credentials ────────────────────────────
define('DB_HOST', '46.250.232.197');
define('DB_NAME', 'super-bas.com');
define('DB_USER', 'owner');
define('DB_PASS', 'Asik123asik');

// ── Session ─────────────────────────────────────────
define('SESSION_LIFETIME', 3600 * 24 * 365);

// ── CORS ────────────────────────────────────────────
$_origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$_allowed = [
    'http://localhost:5173', 'http://localhost:3000',
    'https://super-bas.com', 'https://www.super-bas.com'
];
if (in_array($_origin, $_allowed) || substr($_origin, 0, 16) === 'http://localhost') {
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
    session_name('BAS_KALSUL_SESS');
    @ini_set('session.gc_maxlifetime', SESSION_LIFETIME);
    @session_set_cookie_params([
        'lifetime' => SESSION_LIFETIME,
        'path'     => '/',
        'httponly'  => true,
        'samesite'  => 'Lax'
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
function jsonSuccess($data = [], int $code = 200): void {
    if (ob_get_level()) ob_clean();
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function jsonError(string $msg, int $code = 400): void {
    if (ob_get_level()) ob_clean();
    http_response_code($code);
    echo json_encode(['error' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

function requireAuth(): array {
    if (empty($_SESSION['kalsul_admin_id'])) {
        jsonError('Unauthorized', 401);
    }
    return [
        'id'   => $_SESSION['kalsul_admin_id'],
        'name' => $_SESSION['kalsul_admin_name'],
        'role' => $_SESSION['kalsul_admin_role'],
    ];
}

function getJsonBody(): array {
    $raw = file_get_contents('php://input');
    return json_decode($raw, true) ?: [];
}

function sanitize($val): string {
    return htmlspecialchars(trim((string)$val), ENT_QUOTES, 'UTF-8');
}
PHP;

if (file_put_contents($configPath, $configContent)) {
    echo "✅ config.php created\n";
} else {
    echo "❌ Failed to create config.php\n";
}

// Step 2: Run SQL setup
echo "\nRunning SQL setup...\n";
try {
    $dsn = 'mysql:host=46.250.232.197;dbname=super-bas.com;charset=utf8mb4';
    $pdo = new PDO($dsn, 'owner', 'Asik123asik', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
    
    // Create tables
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS kalsul_admins (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            name VARCHAR(100) NOT NULL,
            role ENUM('owner','admin') DEFAULT 'admin',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");
    echo "✅ Table kalsul_admins created\n";
    
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS kalsul_employees (
            id INT AUTO_INCREMENT PRIMARY KEY,
            ops_id VARCHAR(50) UNIQUE NOT NULL,
            nama VARCHAR(100) NOT NULL,
            station VARCHAR(100) DEFAULT '',
            status VARCHAR(50) DEFAULT 'Daily Worker',
            no_rek VARCHAR(50) DEFAULT '',
            bank VARCHAR(50) DEFAULT '',
            atas_nama VARCHAR(100) DEFAULT '',
            no_hp VARCHAR(30) DEFAULT '',
            nik VARCHAR(20) DEFAULT '',
            alamat TEXT,
            gaji_link_filled TINYINT(1) DEFAULT 0,
            region ENUM('kalimantan','sulawesi') DEFAULT 'kalimantan',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_station (station),
            INDEX idx_region (region),
            INDEX idx_ops_id (ops_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");
    echo "✅ Table kalsul_employees created\n";
    
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS kalsul_uploads (
            id INT AUTO_INCREMENT PRIMARY KEY,
            admin_id INT NOT NULL,
            filename VARCHAR(255) NOT NULL,
            total_rows INT DEFAULT 0,
            imported_rows INT DEFAULT 0,
            skipped_rows INT DEFAULT 0,
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (admin_id) REFERENCES kalsul_admins(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");
    echo "✅ Table kalsul_uploads created\n";
    
    // Insert default admin (if not exists)
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM kalsul_admins WHERE username = 'admin'");
    $stmt->execute();
    if ($stmt->fetchColumn() == 0) {
        $hash = password_hash('admin123', PASSWORD_DEFAULT);
        $stmt = $pdo->prepare("INSERT INTO kalsul_admins (username, password_hash, name, role) VALUES ('admin', ?, 'Administrator', 'owner')");
        $stmt->execute([$hash]);
        echo "✅ Default admin created (admin/admin123)\n";
    } else {
        echo "ℹ Admin user already exists\n";
    }
    
    echo "\n✅ Database setup complete!\n";
    
} catch (PDOException $e) {
    echo "❌ Database error: " . $e->getMessage() . "\n";
}

echo "\n=== Setup Complete ===\n";
echo "⚠ HAPUS FILE INI SETELAH SETUP: setup-config.php\n";
echo "URL: https://super-bas.com/data-kalsul/\n";
