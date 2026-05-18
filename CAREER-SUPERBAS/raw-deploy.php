<?php
/**
 * BAS Raw Deploy v5.0
 * Downloads individual files directly from GitHub raw (bypasses archive cache)
 * URL: https://super-bas.com/raw-deploy.php?token=bas2026
 */

$TOKEN = 'bas2026';
if (($_GET['token'] ?? '') !== $TOKEN) { die('Token salah'); }

header('Content-Type: text/plain; charset=utf-8');
echo "=== BAS Raw Deploy v5.0 ===\n\n";

$base = 'https://raw.githubusercontent.com/nukhotimaliman-byte/superbas/main/CAREER-SUPERBAS/';

$files = [
    'deploy.php',
    'index.html',
    'lp2-style.css',
    'lp2.html',
    '.htaccess',
    'BAS.svg',
    'map.svg',
    'favicon-bas.png',
    'gallery/warehouse.png',
    'gallery/courier.png',
    'gallery/team.png',
    'gallery/sorting.png',
    'gallery/avatars/hendra.png',
    'gallery/avatars/sugianto.png',
    'gallery/avatars/ridwan.png',
    'gallery/avatars/darmawan.png',
    'gallery/avatars/agus.png',
];

$success = 0;
$errors = 0;

foreach ($files as $file) {
    $url = $base . $file . '?t=' . time(); // cache bust
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_USERAGENT, 'BAS-Deploy/5.0');
    $data = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode !== 200 || !$data) {
        echo "FAIL: $file (HTTP $httpCode)\n";
        $errors++;
        continue;
    }
    
    $destPath = __DIR__ . '/' . $file;
    $destDir = dirname($destPath);
    if (!is_dir($destDir)) mkdir($destDir, 0755, true);
    
    $written = file_put_contents($destPath, $data);
    $kb = round(strlen($data) / 1024, 1);
    echo "OK: $file ({$kb} KB)\n";
    $success++;
}

echo "\n=== Done: $success OK, $errors errors ===\n";
echo "Site: https://super-bas.com\n";
echo "\nHAPUS raw-deploy.php setelah selesai!\n";
