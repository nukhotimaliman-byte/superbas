<?php
$TOKEN = 'bas2026';
if (($_GET['token'] ?? '') !== $TOKEN) { die('Token salah'); }
header('Content-Type: text/plain; charset=utf-8');

$pdo = new PDO('mysql:host=46.250.232.197;dbname=super-bas.com;charset=utf8mb4', 'owner', 'Asik123asik', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
]);

$ops = $_GET['ops'] ?? '1851978';
$stmt = $pdo->prepare("SELECT id, ops_id, timestamp_gas, source, no_rek, atas_nama FROM kalsul_rekening WHERE ops_id LIKE :ops ORDER BY id DESC LIMIT 10");
$stmt->execute([':ops' => "%$ops%"]);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "Results for ops_id containing '$ops':\n\n";
foreach ($rows as $r) {
    echo "id={$r['id']} | ops_id={$r['ops_id']} | timestamp_gas={$r['timestamp_gas']} | source={$r['source']} | norek={$r['no_rek']} | nama={$r['atas_nama']}\n";
}
if (empty($rows)) echo "No results found.\n";
