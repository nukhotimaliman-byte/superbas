<?php
/**
 * BAS GitHub Deploy v4.0
 * Pulls latest from GitHub and extracts to server
 * URL: https://super-bas.com/deploy.php?token=bas2026
 */

$TOKEN = 'bas2026';
if (($_GET['token'] ?? '') !== $TOKEN) { die('Token salah'); }

header('Content-Type: text/plain; charset=utf-8');
echo "=== BAS GitHub Deploy v4.0 ===\n\n";

$repo = 'nukhotimaliman-byte/superbas';
$branch = 'main';
$subdir = 'CAREER-SUPERBAS/';
$destDir = __DIR__ . '/';

// Download ZIP from GitHub
$zipUrl = "https://github.com/$repo/archive/refs/heads/$branch.zip";
$zipPath = sys_get_temp_dir() . '/superbas-deploy-' . time() . '.zip';

echo "Downloading from GitHub...\n";
echo "URL: $zipUrl\n";

$ch = curl_init($zipUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_USERAGENT, 'BAS-Deploy/4.0');
curl_setopt($ch, CURLOPT_TIMEOUT, 120);
$data = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode !== 200 || !$data) {
    die("FAIL: Download failed (HTTP $httpCode)\n");
}

file_put_contents($zipPath, $data);
$sizeKB = round(strlen($data) / 1024);
echo "ZIP downloaded: {$sizeKB} KB\n\n";

// Extract
$zip = new ZipArchive;
if ($zip->open($zipPath) !== TRUE) {
    unlink($zipPath);
    die("FAIL: Cannot open ZIP\n");
}

// GitHub ZIP has a prefix folder like "superbas-main/"
$prefix = '';
for ($i = 0; $i < $zip->numFiles; $i++) {
    $name = $zip->getNameIndex($i);
    if (strpos($name, $subdir) !== false) {
        $prefix = explode($subdir, $name)[0] . $subdir;
        break;
    }
}

if (!$prefix) {
    $zip->close();
    unlink($zipPath);
    die("FAIL: Could not find '$subdir' in ZIP\n");
}

echo "Prefix: $prefix\n";
echo "Entries: {$zip->numFiles}\n\n";

$success = 0;
$errors = 0;
$skipped = 0;

// Skip these files/dirs during deploy
$skipPatterns = [
    'deploy.php',
    'raw-deploy.php',
    '.git/',
    'node_modules/',
    '.env',
    'uploads/',
    'config.php',
];

for ($i = 0; $i < $zip->numFiles; $i++) {
    $name = $zip->getNameIndex($i);
    
    // Only extract files under our subdir
    if (strpos($name, $prefix) !== 0) continue;
    
    // Get relative path
    $relPath = substr($name, strlen($prefix));
    if (!$relPath || substr($relPath, -1) === '/') continue;
    
    // Skip protected files
    $skip = false;
    foreach ($skipPatterns as $pattern) {
        if (strpos($relPath, $pattern) !== false) { $skip = true; break; }
    }
    if ($skip) { $skipped++; continue; }
    
    $destPath = $destDir . $relPath;
    $dir = dirname($destPath);
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    
    $content = $zip->getFromIndex($i);
    if ($content === false) { echo "FAIL: $relPath\n"; $errors++; continue; }
    
    $written = file_put_contents($destPath, $content);
    if ($written === false) { echo "WRITE FAIL: $relPath\n"; $errors++; }
    else { echo "OK: $relPath\n"; $success++; }
}

$zip->close();
unlink($zipPath);

echo "\n=== Done: $success deployed, $errors errors, $skipped skipped ===\n";
echo "Site: https://super-bas.com\n";
