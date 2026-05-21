<?php
/**
 * Data KalSul — Server Init v2.0
 * URL: https://super-bas.com/data-kalsul/kalsul-init.php?token=bas2026
 * HAPUS SETELAH SETUP!
 */
$TOKEN = 'bas2026';
if (($_GET['token'] ?? '') !== $TOKEN) { die('Token salah'); }

header('Content-Type: text/plain; charset=utf-8');
echo "=== Data KalSul Setup v2.0 ===\n\n";

// Step 1: Create config.php
$configPath = __DIR__ . '/api/config.php';
$configContent = <<<'PHP'
<?php
ini_set('display_errors', 0);
error_reporting(0);

// CORS
$_origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$_allowed = ['http://localhost:5173','http://localhost:3000','https://super-bas.com','https://www.super-bas.com'];
if (in_array($_origin, $_allowed) || substr($_origin, 0, 16) === 'http://localhost') {
    header("Access-Control-Allow-Origin: {$_origin}");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
}
header('Content-Type: application/json; charset=UTF-8');

// Session
if (session_status() === PHP_SESSION_NONE) {
    session_name('BAS_KALSUL_SESS');
    @ini_set('session.gc_maxlifetime', 86400 * 365);
    @session_set_cookie_params(['lifetime'=>86400*365,'path'=>'/','httponly'=>true,'samesite'=>'Lax']);
    @session_start();
}

// DB
define('DB_HOST', '46.250.232.197');
define('DB_NAME', 'super-bas.com');
define('DB_USER', 'owner');
define('DB_PASS', 'Asik123asik');

function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        try {
            $pdo = new PDO('mysql:host='.DB_HOST.';dbname='.DB_NAME.';charset=utf8mb4', DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
        } catch (PDOException $e) { jsonError('Database connection failed', 500); }
    }
    return $pdo;
}

function jsonSuccess($data = [], int $code = 200): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function jsonError(string $msg, int $code = 400): void {
    http_response_code($code);
    echo json_encode(['error' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

function getJsonBody(): array {
    return json_decode(file_get_contents('php://input'), true) ?: [];
}

function requireAuth(): array {
    if (empty($_SESSION['kalsul_admin_id'])) jsonError('Unauthorized', 401);
    return [
        'id' => $_SESSION['kalsul_admin_id'],
        'name' => $_SESSION['kalsul_admin_name'],
        'role' => $_SESSION['kalsul_admin_role'],
        'station' => $_SESSION['kalsul_admin_station'] ?? null,
    ];
}

function requireAdmin(): array {
    $u = requireAuth();
    if ($u['role'] === 'korlap') jsonError('Forbidden', 403);
    return $u;
}
PHP;

if (file_put_contents($configPath, $configContent)) {
    echo "✅ config.php created\n";
} else {
    echo "❌ Failed to create config.php\n";
}

// Step 2: DB
echo "\nRunning DB setup...\n";
try {
    $pdo = new PDO('mysql:host=46.250.232.197;dbname=super-bas.com;charset=utf8mb4', 'owner', 'Asik123asik', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);

    $pdo->exec("CREATE TABLE IF NOT EXISTS kalsul_admins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(100) NOT NULL,
        role ENUM('owner','admin','korlap') DEFAULT 'admin',
        station VARCHAR(100) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    echo "✅ kalsul_admins\n";

    $pdo->exec("CREATE TABLE IF NOT EXISTS kalsul_datasets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        station VARCHAR(100) NOT NULL,
        bulan DATE NOT NULL,
        periode ENUM('P1','P2') NOT NULL,
        admin_id INT NOT NULL,
        total_employees INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_dataset (station, bulan, periode)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    echo "✅ kalsul_datasets\n";

    $pdo->exec("CREATE TABLE IF NOT EXISTS kalsul_employees (
        id INT AUTO_INCREMENT PRIMARY KEY,
        dataset_id INT,
        ops_id VARCHAR(50) NOT NULL,
        nama VARCHAR(100) NOT NULL,
        station VARCHAR(100) DEFAULT '',
        hk INT DEFAULT 0,
        status VARCHAR(50) DEFAULT 'Daily Worker',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_dataset (dataset_id),
        INDEX idx_ops_id (ops_id),
        INDEX idx_station (station)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    echo "✅ kalsul_employees\n";

    $pdo->exec("CREATE TABLE IF NOT EXISTS kalsul_rekening (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ops_id VARCHAR(50) NOT NULL,
        source ENUM('link_gaji','link_pergantian_rek') NOT NULL,
        timestamp_gas DATETIME,
        email VARCHAR(100),
        no_rek VARCHAR(50),
        bank VARCHAR(100),
        atas_nama VARCHAR(100),
        no_hp VARCHAR(30),
        nik VARCHAR(20),
        alamat TEXT,
        lokasi_kerja VARCHAR(100),
        tanggal_lahir VARCHAR(30),
        nama_sesuai_ktp VARCHAR(100),
        penempatan VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_ops_id (ops_id),
        INDEX idx_source (source),
        INDEX idx_timestamp (timestamp_gas)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    echo "✅ kalsul_rekening\n";

    $pdo->exec("CREATE TABLE IF NOT EXISTS kalsul_uploads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        admin_id INT NOT NULL,
        dataset_id INT,
        filename VARCHAR(255) NOT NULL,
        total_rows INT DEFAULT 0,
        imported_rows INT DEFAULT 0,
        skipped_rows INT DEFAULT 0,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    echo "✅ kalsul_uploads\n";

    // Alter existing tables safely
    $alters = [
        "ALTER TABLE kalsul_admins ADD COLUMN station VARCHAR(100) DEFAULT NULL",
        "ALTER TABLE kalsul_admins MODIFY role ENUM('owner','admin','korlap') DEFAULT 'admin'",
        "ALTER TABLE kalsul_employees ADD COLUMN dataset_id INT AFTER id",
        "ALTER TABLE kalsul_employees ADD COLUMN hk INT DEFAULT 0 AFTER station",
    ];
    foreach ($alters as $sql) {
        try { $pdo->exec($sql); echo "✅ ALTER OK\n"; }
        catch (PDOException $e) {
            if (strpos($e->getMessage(), 'Duplicate') !== false) echo "ℹ Already exists\n";
            else echo "⚠ " . $e->getMessage() . "\n";
        }
    }

    // Default admin
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM kalsul_admins WHERE username='admin'");
    $stmt->execute();
    if ($stmt->fetchColumn() == 0) {
        $stmt = $pdo->prepare("INSERT INTO kalsul_admins (username,password_hash,name,role) VALUES ('admin',?,'Administrator','owner')");
        $stmt->execute([password_hash('admin123', PASSWORD_DEFAULT)]);
        echo "✅ Default admin created\n";
    } else { echo "ℹ Admin exists\n"; }

    echo "\n✅ DB setup complete!\n";
} catch (PDOException $e) { echo "❌ DB error: " . $e->getMessage() . "\n"; }

echo "\n=== Setup v2.0 Complete ===\n";
echo "URL: https://super-bas.com/data-kalsul/\n";
