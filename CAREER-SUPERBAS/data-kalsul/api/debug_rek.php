<?php
$TOKEN = 'bas2026';
if (($_GET['token'] ?? '') !== $TOKEN) { die('Token salah'); }
header('Content-Type: text/plain; charset=utf-8');

$pdo = new PDO('mysql:host=46.250.232.197;dbname=super-bas.com;charset=utf8mb4', 'owner', 'Asik123asik', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
]);

// Show latest 15 records with raw timestamp
$stmt = $pdo->query("SELECT id, ops_id, timestamp_gas, source, no_rek, atas_nama, created_at FROM kalsul_rekening ORDER BY id DESC LIMIT 15");
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "=== RAW kalsul_rekening (latest 15) ===\n\n";
foreach ($rows as $r) {
    echo "id={$r['id']} | ops={$r['ops_id']} | timestamp_gas=[{$r['timestamp_gas']}] | created=[{$r['created_at']}] | source={$r['source']}\n";
}

// Also check column type
echo "\n=== COLUMN INFO ===\n";
$cols = $pdo->query("SHOW COLUMNS FROM kalsul_rekening LIKE 'timestamp_gas'")->fetch(PDO::FETCH_ASSOC);
echo "timestamp_gas type: {$cols['Type']}\n";
