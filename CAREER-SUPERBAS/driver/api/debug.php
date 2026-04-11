<?php
/**
 * Independent Debug — Does NOT require config.php
 * Upload to: public_html/driver/api/debug.php
 * Access:    https://super-bas.com/driver/api/debug.php
 * DELETE THIS FILE AFTER DEBUGGING!
 */
ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: text/plain; charset=UTF-8');

echo "=== BAS Server Debug ===\n";
echo "PHP Version: " . phpversion() . "\n";
echo "Server: " . ($_SERVER['SERVER_SOFTWARE'] ?? 'unknown') . "\n";
echo "Document Root: " . ($_SERVER['DOCUMENT_ROOT'] ?? 'unknown') . "\n";
echo "Script Path: " . __FILE__ . "\n";
echo "str_starts_with exists: " . (function_exists('str_starts_with') ? 'YES' : 'NO (PHP < 8.0!)') . "\n\n";

// Test DB connection with hardcoded credentials
echo "=== Database Test ===\n";
try {
    $dsn = 'mysql:host=46.250.232.197;dbname=super-bas.com;charset=utf8mb4';
    $pdo = new PDO($dsn, 'owner', 'Asik123asik', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    echo "DB Connection: OK\n";

    // Count candidates
    $count = $pdo->query('SELECT COUNT(*) FROM candidates')->fetchColumn();
    echo "Candidates count: {$count}\n";

    // Show candidate columns
    $cols = $pdo->query('SHOW COLUMNS FROM candidates')->fetchAll(PDO::FETCH_COLUMN);
    echo "Candidates columns: " . implode(', ', $cols) . "\n\n";

    // Show users columns
    try {
        $ucols = $pdo->query('SHOW COLUMNS FROM users')->fetchAll(PDO::FETCH_COLUMN);
        echo "Users columns: " . implode(', ', $ucols) . "\n\n";
    } catch(Exception $e) {
        echo "Users table error: " . $e->getMessage() . "\n\n";
    }

    // Show locations
    try {
        $locs = $pdo->query('SELECT id, name FROM locations ORDER BY id')->fetchAll();
        echo "Locations: " . json_encode($locs) . "\n\n";
    } catch(Exception $e) {
        echo "Locations error: " . $e->getMessage() . "\n\n";
    }

    // Test the exact query from admin.php
    echo "=== Testing admin.php query ===\n";
    try {
        $stmt = $pdo->query("
            SELECT c.*,
                   COALESCE(l.name,'') AS location_name,
                   COALESCE(l.name,'') AS display_location
            FROM candidates c
            LEFT JOIN locations l ON c.location_id = l.id
            ORDER BY c.created_at DESC
            LIMIT 3
        ");
        $rows = $stmt->fetchAll();
        echo "Query OK, returned " . count($rows) . " rows\n";
        if (!empty($rows)) {
            echo "First row keys: " . implode(', ', array_keys($rows[0])) . "\n";
            echo "First row name: " . ($rows[0]['name'] ?? 'NULL') . "\n";
        }
    } catch(Exception $e) {
        echo "Query ERROR: " . $e->getMessage() . "\n";
    }

    // Test config.php loading
    echo "\n=== Testing config.php ===\n";
    try {
        ob_start();
        // Don't actually include it (would redefine constants), just check if it exists
        $configPath = __DIR__ . '/../config.php';
        echo "Config path: {$configPath}\n";
        echo "Config exists: " . (file_exists($configPath) ? 'YES' : 'NO') . "\n";
        echo "Config readable: " . (is_readable($configPath) ? 'YES' : 'NO') . "\n";
        echo "Config size: " . filesize($configPath) . " bytes\n";
        // Show first few lines to check syntax
        $lines = file($configPath);
        echo "Config lines: " . count($lines) . "\n";
        echo "Line 50 content: " . trim($lines[49] ?? '(missing)') . "\n";
        ob_end_clean();
    } catch(Exception $e) {
        ob_end_clean();
        echo "Config test error: " . $e->getMessage() . "\n";
    }

} catch(PDOException $e) {
    echo "DB Connection FAILED: " . $e->getMessage() . "\n";
}

echo "\n=== Session Test ===\n";
session_start();
echo "Session ID: " . session_id() . "\n";
echo "admin_id in session: " . ($_SESSION['admin_id'] ?? 'NOT SET') . "\n";
echo "admin_role in session: " . ($_SESSION['admin_role'] ?? 'NOT SET') . "\n";
