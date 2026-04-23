<?php
/**
 * BAS Deploy — Linktree V2 Update
 * 1. Upload file ini + superbas-linktree-v2.zip ke public_html/
 * 2. Buka: https://super-bas.com/deploy-linktree-v2.php?token=bas2026
 * 3. Hapus kedua file setelah selesai!
 */

$TOKEN = 'bas2026';
if (($_GET['token'] ?? '') !== $TOKEN) { die('❌ Token salah'); }

header('Content-Type: text/plain; charset=utf-8');
echo "=== BAS Deploy — Linktree V2 ===\n\n";

$zipPath = __DIR__ . '/superbas-linktree-v2.zip';

if (!file_exists($zipPath)) {
    die("❌ Upload superbas-linktree-v2.zip ke public_html/ dulu!\n");
}

echo "📦 ZIP found: " . round(filesize($zipPath)/1024) . " KB\n";

$zip = new ZipArchive;
$res = $zip->open($zipPath);
if ($res !== TRUE) {
    die("❌ Gagal buka ZIP, error code: $res\n");
}

echo "📂 Files: " . $zip->numFiles . "\n\n";

$success = 0;
$errors = 0;

for ($i = 0; $i < $zip->numFiles; $i++) {
    $name = $zip->getNameIndex($i);
    if (substr($name, -1) === '/') continue;
    
    $destPath = __DIR__ . '/' . $name;
    $destDir = dirname($destPath);
    
    if (!is_dir($destDir)) {
        mkdir($destDir, 0755, true);
    }
    
    $content = $zip->getFromIndex($i);
    if ($content === false) {
        echo "❌ FAIL: $name\n";
        $errors++;
        continue;
    }
    
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
echo "⚠️  HAPUS deploy-linktree-v2.php dan superbas-linktree-v2.zip dari server!\n";
