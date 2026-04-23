<?php
// Temporary upload receiver — HAPUS SETELAH DEPLOY!
$TOKEN = 'bas2026';
if (($_GET['token'] ?? '') !== $TOKEN) { die('❌ Token salah'); }

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['zipfile'])) {
    $dest = __DIR__ . '/superbas-v3.9.zip';
    if (move_uploaded_file($_FILES['zipfile']['tmp_name'], $dest)) {
        echo "✅ Upload berhasil: " . round(filesize($dest)/1024) . " KB\n";
    } else {
        http_response_code(500);
        echo "❌ Gagal simpan file\n";
    }
} else {
    echo "POST zipfile field required\n";
}
