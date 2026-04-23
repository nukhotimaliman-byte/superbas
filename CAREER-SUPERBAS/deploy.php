<?php
/**
 * BAS Auto-Deploy v3.9
 * 1. Upload file ini ke public_html/deploy.php
 * 2. Buka: https://super-bas.com/deploy.php?token=bas2026
 * 3. Hapus file ini setelah selesai!
 */

$TOKEN = 'bas2026';
if (($_GET['token'] ?? '') !== $TOKEN) { die('❌ Token salah'); }

header('Content-Type: text/plain; charset=utf-8');
echo "=== BAS Deploy v3.9 ===\n\n";

$zipPath = __DIR__ . '/superbas-v3.9.zip';

if (!file_exists($zipPath)) {
    die("❌ Upload superbas-v3.9.zip ke public_html/ dulu!\n");
}

echo "📦 ZIP found: " . round(filesize($zipPath)/1024) . " KB\n";

$zip = new ZipArchive;
$res = $zip->open($zipPath);
if ($res !== TRUE) {
    die("❌ Gagal buka ZIP, error code: $res\n");
}

echo "📂 Entries: " . $zip->numFiles . "\n\n";

$success = 0;
$errors = 0;

for ($i = 0; $i < $zip->numFiles; $i++) {
    $name = $zip->getNameIndex($i);
    
    // Skip directories
    if (substr($name, -1) === '/') continue;
    
    $destPath = __DIR__ . '/' . $name;
    $destDir = dirname($destPath);
    
    // Create directory if needed
    if (!is_dir($destDir)) {
        mkdir($destDir, 0755, true);
    }
    
    // Extract file content
    $content = $zip->getFromIndex($i);
    if ($content === false) {
        echo "❌ FAIL: $name\n";
        $errors++;
        continue;
    }
    
    // Write file
    $written = file_put_contents($destPath, $content);
    if ($written === false) {
        echo "❌ WRITE FAIL: $name\n";
        $errors++;
    } else {
        echo "✅ $name ($written bytes)\n";
        $success++;
    }
}

$zip->close();

echo "\n=== Done: $success OK, $errors errors ===\n";
echo "⚠️  HAPUS deploy.php dan superbas-v3.9.zip dari server!\n";
