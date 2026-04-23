<?php
/**
 * BAS Kurir Patch Deploy v1.0
 * Upload file-file yang berubah langsung ke server tanpa ZIP
 * 
 * Usage: POST file + path field ke endpoint ini
 * GET: tampilkan info
 */
$TOKEN = 'bas2026';
if (($_GET['token'] ?? '') !== $TOKEN) { die('❌ Token salah'); }

header('Content-Type: text/plain; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo "=== BAS Patch Deploy ===\n";
    echo "POST: file=<file>, path=<relative_path>\n";
    echo "Status: Ready\n";
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $path = trim($_POST['path'] ?? '');
    if (!$path || !isset($_FILES['file'])) {
        http_response_code(400);
        die("❌ Missing 'path' or 'file'\n");
    }

    // Security: prevent path traversal
    $path = str_replace('..', '', $path);
    $path = ltrim($path, '/');
    
    $destPath = __DIR__ . '/' . $path;
    $destDir = dirname($destPath);
    
    if (!is_dir($destDir)) {
        mkdir($destDir, 0755, true);
    }
    
    if (move_uploaded_file($_FILES['file']['tmp_name'], $destPath)) {
        echo "✅ " . $path . " (" . round(filesize($destPath)/1024, 1) . " KB)\n";
    } else {
        http_response_code(500);
        echo "❌ Gagal simpan: " . $path . "\n";
    }
}
