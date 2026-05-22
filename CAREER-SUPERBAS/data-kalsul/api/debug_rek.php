<?php
$TOKEN = 'bas2026';
if (($_GET['token'] ?? '') !== $TOKEN) { die('Token salah'); }
header('Content-Type: text/plain; charset=utf-8');

$pdo = new PDO('mysql:host=46.250.232.197;dbname=super-bas.com;charset=utf8mb4', 'owner', 'Asik123asik', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
]);

// Show timestamp_gas across multiple recent records from BOTH sources
echo "=== LINK GAJI (last 10) ===\n";
$stmt = $pdo->query("SELECT id, ops_id, timestamp_gas, created_at, atas_nama FROM kalsul_rekening WHERE source='link_gaji' ORDER BY id DESC LIMIT 10");
foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
    $diff = strtotime($r['timestamp_gas']) - strtotime($r['created_at']);
    echo "id={$r['id']} | ops={$r['ops_id']} | timestamp_gas=[{$r['timestamp_gas']}] | created=[{$r['created_at']}] | diff={$diff}s | nama={$r['atas_nama']}\n";
}

echo "\n=== LINK PERGANTIAN REK (last 10) ===\n";
$stmt = $pdo->query("SELECT id, ops_id, timestamp_gas, created_at, atas_nama FROM kalsul_rekening WHERE source='link_pergantian_rek' ORDER BY id DESC LIMIT 10");
foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
    $diff = strtotime($r['timestamp_gas']) - strtotime($r['created_at']);
    echo "id={$r['id']} | ops={$r['ops_id']} | timestamp_gas=[{$r['timestamp_gas']}] | created=[{$r['created_at']}] | diff={$diff}s | nama={$r['atas_nama']}\n";
}

// Also check for any dates that look wrong (year not 2025/2026, or in future)
echo "\n=== SUSPICIOUS DATES ===\n";
$stmt = $pdo->query("SELECT id, ops_id, timestamp_gas, source FROM kalsul_rekening WHERE timestamp_gas < '2024-01-01' OR timestamp_gas > NOW() + INTERVAL 1 DAY OR MONTH(timestamp_gas) > 12 LIMIT 20");
$bad = $stmt->fetchAll(PDO::FETCH_ASSOC);
if (empty($bad)) {
    echo "None found (all dates in valid range)\n";
} else {
    foreach ($bad as $r) {
        echo "BAD: id={$r['id']} | ops={$r['ops_id']} | timestamp_gas=[{$r['timestamp_gas']}] | source={$r['source']}\n";
    }
}

// Check parseTimestamp function by testing various formats
echo "\n=== PARSE TEST ===\n";
function parseTimestamp($val) {
    if (empty($val)) return date('Y-m-d H:i:s');
    if (preg_match('/^\d{4}-\d{2}-\d{2}/', $val)) return substr($val, 0, 19);
    // dd/MM/yyyy HH:mm:ss
    if (preg_match('#^(\d{1,2})/(\d{1,2})/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})#', $val, $m)) {
        return sprintf('%04d-%02d-%02d %02d:%02d:%02d', $m[3], $m[2], $m[1], $m[4], $m[5], $m[6]);
    }
    if (preg_match('#^(\d{1,2})/(\d{1,2})/(\d{4})#', $val, $m)) {
        return sprintf('%04d-%02d-%02d 00:00:00', $m[3], $m[2], $m[1]);
    }
    $ts = strtotime($val);
    if ($ts !== false) return date('Y-m-d H:i:s', $ts);
    return date('Y-m-d H:i:s');
}

$tests = [
    '5/20/2026 9:02:15',       // US format mm/dd/yyyy (GAS default?)
    '20/5/2026 9:02:15',       // EU format dd/mm/yyyy  
    '05/20/2026 09:02:15',     // US padded
    '2026-05-20 09:02:15',     // MySQL format
    'Tue May 20 2026 09:02:15 GMT+0700',  // JS toString
];
foreach ($tests as $t) {
    $parsed = parseTimestamp($t);
    echo "Input: [$t] → Parsed: [$parsed]\n";
}
