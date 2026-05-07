<?php
/**
 * BAS Git Deploy v4.0
 * Pull langsung dari GitHub ke hosting
 * URL: https://super-bas.com/git-deploy.php?token=bas2026
 */

$TOKEN = 'bas2026';
if (($_GET['token'] ?? '') !== $TOKEN) { die('❌ Token salah'); }

header('Content-Type: text/plain; charset=utf-8');
echo "=== BAS Git Deploy v4.0 ===\n\n";

$repoZip = 'https://github.com/nukhotimaliman-byte/superbas/archive/refs/heads/main.zip';
$tmpZip  = __DIR__ . '/github-main.zip';

// Download from GitHub
echo "📥 Downloading from GitHub...\n";
$ch = curl_init($repoZip);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$data = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode !== 200 || !$data) {
    die("❌ Download gagal (HTTP $httpCode)\n");
}

file_put_contents($tmpZip, $data);
echo "✅ Downloaded: " . round(filesize($tmpZip)/1024) . " KB\n\n";

// Extract
$zip = new ZipArchive;
if ($zip->open($tmpZip) !== TRUE) {
    die("❌ Gagal buka ZIP\n");
}

$prefix = 'superbas-main/CAREER-SUPERBAS/';
$success = 0;

for ($i = 0; $i < $zip->numFiles; $i++) {
    $name = $zip->getNameIndex($i);
    
    // Only extract CAREER-SUPERBAS files
    if (strpos($name, $prefix) !== 0) continue;
    
    $relativePath = substr($name, strlen($prefix));
    if (empty($relativePath) || substr($relativePath, -1) === '/') continue;
    
    // Skip PHP deploy scripts and dev files
    if (preg_match('/\.(php|sql|zip|md)$/i', $relativePath)) continue;
    if (strpos($relativePath, '.serena') !== false) continue;
    if (strpos($relativePath, '.git') !== false) continue;
    
    $destPath = __DIR__ . '/' . $relativePath;
    $destDir  = dirname($destPath);
    
    if (!is_dir($destDir)) mkdir($destDir, 0755, true);
    
    $content = $zip->getFromIndex($i);
    if ($content === false) {
        echo "❌ FAIL: $relativePath\n";
        continue;
    }
    
    file_put_contents($destPath, $content);
    echo "✅ $relativePath\n";
    $success++;
}

$zip->close();
unlink($tmpZip);

echo "\n=== Done: $success files deployed ===\n";
echo "🌐 Site: https://super-bas.com\n";
