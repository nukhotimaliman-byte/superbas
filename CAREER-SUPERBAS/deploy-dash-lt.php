<?php
/**
 * BAS Deploy — Dashboard Linktree Update
 * Combined uploader + extractor
 * Usage:
 *   1. Upload this file to public_html/
 *   2. POST the zip: curl -F "zipfile=@dash-linktree-update.zip" "https://super-bas.com/deploy-dash-lt.php?token=bas2026"
 *   3. Or GET to extract if zip is already uploaded: https://super-bas.com/deploy-dash-lt.php?token=bas2026&extract=1
 */

$TOKEN = 'bas2026';
if (($_GET['token'] ?? '') !== $TOKEN) { die('❌ Token salah'); }

header('Content-Type: text/plain; charset=utf-8');
$zipPath = __DIR__ . '/dash-linktree-update.zip';

// Step 1: Handle upload
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['zipfile'])) {
    if (move_uploaded_file($_FILES['zipfile']['tmp_name'], $zipPath)) {
        echo "✅ Upload OK: " . round(filesize($zipPath)/1024) . " KB\n\n";
    } else {
        die("❌ Upload gagal\n");
    }
}

// Step 2: Extract
if (!file_exists($zipPath)) {
    die("❌ ZIP tidak ditemukan. Upload dulu via POST.\n");
}

echo "=== Extracting Dashboard Linktree Update ===\n\n";

$zip = new ZipArchive;
if ($zip->open($zipPath) !== TRUE) {
    die("❌ Gagal buka ZIP\n");
}

$success = 0;
$errors = 0;

for ($i = 0; $i < $zip->numFiles; $i++) {
    $name = $zip->getNameIndex($i);
    if (substr($name, -1) === '/') continue;
    
    $destPath = __DIR__ . '/' . $name;
    $destDir = dirname($destPath);
    
    if (!is_dir($destDir)) mkdir($destDir, 0755, true);
    
    // Backup
    if (file_exists($destPath)) {
        copy($destPath, $destPath . '.bak-' . date('Ymd-His'));
    }
    
    $content = $zip->getFromIndex($i);
    if ($content === false) { echo "❌ $name\n"; $errors++; continue; }
    
    $written = file_put_contents($destPath, $content);
    if ($written === false) { echo "❌ WRITE: $name\n"; $errors++; }
    else { echo "✅ $name ($written bytes)\n"; $success++; }
}

$zip->close();
@unlink($zipPath);

echo "\n=== Done: $success OK, $errors errors ===\n";
echo "⚠️  HAPUS deploy-dash-lt.php dari server!\n";
