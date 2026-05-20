<?php
/**
 * DATA KALSUL — Deploy Script
 * Uploads built files + API to super-bas.com/data-kalsul/
 * 
 * Usage: php deploy-kalsul.php
 */

$SERVER_URL = 'https://super-bas.com/patch-deploy.php?token=bas2026';

echo "=== Data KalSul Deploy ===\n\n";

// Files to deploy
$files = [];

// 1. Built frontend files (from dist/)
$distDir = __DIR__ . '/data-kalsul/dist';
if (!is_dir($distDir)) {
    die("ERROR: dist/ folder not found. Run 'npm run build' first.\n");
}
scanFiles($distDir, $distDir, 'data-kalsul', $files);

// 2. API files
$apiDir = __DIR__ . '/data-kalsul/api';
if (is_dir($apiDir)) {
    scanFiles($apiDir, $apiDir, 'data-kalsul/api', $files);
}

// 3. .htaccess
$htaccess = __DIR__ . '/data-kalsul/.htaccess';
if (file_exists($htaccess)) {
    $files[] = ['local' => $htaccess, 'remote' => 'data-kalsul/.htaccess'];
}

// 4. setup.sql (for reference on server)
$setupSql = __DIR__ . '/data-kalsul/setup.sql';
if (file_exists($setupSql)) {
    $files[] = ['local' => $setupSql, 'remote' => 'data-kalsul/setup.sql'];
}

echo "Total files to deploy: " . count($files) . "\n\n";

$success = 0;
$errors = 0;

foreach ($files as $file) {
    echo "Uploading: {$file['remote']}... ";
    
    $ch = curl_init($SERVER_URL);
    $cFile = new CURLFile($file['local']);
    
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, [
        'file' => $cFile,
        'path' => $file['remote']
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode === 200) {
        echo "OK\n";
        $success++;
    } else {
        echo "FAIL (HTTP $httpCode) $response\n";
        $errors++;
    }
}

echo "\n=== Deploy Complete: $success OK, $errors errors ===\n";
echo "URL: https://super-bas.com/data-kalsul/\n";

// ── Helpers ─────────────────────────────────────────
function scanFiles($dir, $baseDir, $prefix, &$files) {
    $items = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS),
        RecursiveIteratorIterator::LEAVES_ONLY
    );
    
    foreach ($items as $item) {
        if ($item->isFile()) {
            $relativePath = str_replace('\\', '/', substr($item->getPathname(), strlen($baseDir) + 1));
            $files[] = [
                'local' => $item->getPathname(),
                'remote' => $prefix . '/' . $relativePath
            ];
        }
    }
}
