<?php
$TOKEN = 'bas2026';
if (($_GET['token'] ?? '') !== $TOKEN) { die('Token salah'); }
header('Content-Type: text/plain; charset=utf-8');

$pdo = new PDO('mysql:host=46.250.232.197;dbname=super-bas.com;charset=utf8mb4', 'owner', 'Asik123asik', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
]);

// Pick a specific OPS ID from the screenshot that showed wrong date
$ops = $_GET['ops'] ?? '1689810';
$stmt = $pdo->prepare("SELECT id, ops_id, timestamp_gas, source, no_rek, atas_nama, created_at FROM kalsul_rekening WHERE ops_id LIKE :ops ORDER BY id DESC LIMIT 5");
$stmt->execute([':ops' => "%$ops%"]);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "Results for ops_id containing '$ops':\n\n";
foreach ($rows as $r) {
    echo "id={$r['id']} | timestamp_gas=[{$r['timestamp_gas']}] | created=[{$r['created_at']}] | source={$r['source']} | norek={$r['no_rek']} | nama={$r['atas_nama']}\n";
    
    // Show how JS would parse it
    $ts = $r['timestamp_gas'];
    echo "  → PHP strtotime: " . date('d M Y H:i', strtotime($ts)) . "\n";
    echo "  → JS new Date('$ts') → needs .replace(' ','T') → new Date('{$ts}') \n";
    echo "  → JS with T: new Date('" . str_replace(' ', 'T', $ts) . "')\n\n";
}

// Check MySQL timezone
$tz = $pdo->query("SELECT @@global.time_zone, @@session.time_zone")->fetch(PDO::FETCH_ASSOC);
echo "\nMySQL timezone: global={$tz['@@global.time_zone']}, session={$tz['@@session.time_zone']}\n";
echo "PHP timezone: " . date_default_timezone_get() . "\n";
echo "PHP date now: " . date('Y-m-d H:i:s') . "\n";
