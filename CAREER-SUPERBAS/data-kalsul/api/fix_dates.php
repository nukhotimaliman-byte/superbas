<?php
// Smart fix: use created_at as anchor to determine correct timestamp_gas
// GAS timestamp is WIB (UTC+7), created_at is UTC, diff ~5 hours
$TOKEN = 'bas2026';
if (($_GET['token'] ?? '') !== $TOKEN) { die('Token salah'); }
header('Content-Type: text/plain; charset=utf-8');
set_time_limit(120);

$pdo = new PDO('mysql:host=46.250.232.197;dbname=super-bas.com;charset=utf8mb4', 'owner', 'Asik123asik', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
]);

$dry = ($_GET['dry'] ?? '1') === '1';

// Check specific OPS first
$ops = $_GET['ops'] ?? '1841517';
echo "=== CHECK OPS $ops ===\n";
$stmt = $pdo->prepare("SELECT id, timestamp_gas, created_at, source FROM kalsul_rekening WHERE ops_id LIKE :ops ORDER BY id DESC");
$stmt->execute([':ops' => "%$ops%"]);
foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
    $gas = $r['timestamp_gas'];
    $created = $r['created_at'];
    // What the correct date should be (created_at + 7 hours = WIB)
    $correctApprox = date('Y-m-d', strtotime($created . ' +7 hours'));
    $gasDate = substr($gas, 0, 10);
    $match = ($gasDate === $correctApprox || $gasDate === date('Y-m-d', strtotime($correctApprox . ' +1 day')) || $gasDate === date('Y-m-d', strtotime($correctApprox . ' -1 day')));
    $flag = $match ? 'OK' : 'WRONG';
    echo "id={$r['id']} gas=[$gas] created=[$created] should≈[$correctApprox] → $flag ({$r['source']})\n";
}

echo "\n=== SMART FIX: use created_at as anchor ===\n";

// Find records where timestamp_gas date is WAY off from created_at+7h
// A wrong record: timestamp_gas month/day are swapped, so date could be months off
$stmt = $pdo->query("
    SELECT id, timestamp_gas, created_at,
           MONTH(timestamp_gas) as gas_m, DAY(timestamp_gas) as gas_d,
           DATE(DATE_ADD(created_at, INTERVAL 7 HOUR)) as correct_date
    FROM kalsul_rekening 
    WHERE timestamp_gas IS NOT NULL
      AND MONTH(timestamp_gas) != DAY(timestamp_gas)
      AND DAY(timestamp_gas) <= 12
");

$needFix = 0;
$alreadyOk = 0;
$fixIds = [];

foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
    $gasDate = substr($r['timestamp_gas'], 0, 10);
    $correctDate = $r['correct_date'];
    
    // Check if current date is within 1 day of correct
    $diffDays = abs((strtotime($gasDate) - strtotime($correctDate)) / 86400);
    
    if ($diffDays <= 1) {
        $alreadyOk++;
        continue;
    }
    
    // Try swapping month/day and see if it gets closer
    $swappedDate = sprintf('%s-%02d-%02d', substr($r['timestamp_gas'], 0, 4), $r['gas_d'], $r['gas_m']);
    $diffSwapped = abs((strtotime($swappedDate) - strtotime($correctDate)) / 86400);
    
    if ($diffSwapped < $diffDays) {
        $needFix++;
        $fixIds[] = $r['id'];
    } else {
        $alreadyOk++;
    }
}

echo "Already correct: $alreadyOk\n";
echo "Need swap: $needFix\n";

if ($dry) {
    echo "\nDRY RUN — add &dry=0 to execute\n";
    echo "First 10 IDs to fix: " . implode(', ', array_slice($fixIds, 0, 10)) . "\n";
} else {
    if (!empty($fixIds)) {
        // Batch update in chunks
        $chunks = array_chunk($fixIds, 500);
        $total = 0;
        foreach ($chunks as $chunk) {
            $ids = implode(',', $chunk);
            $sql = "
                UPDATE kalsul_rekening 
                SET timestamp_gas = CONCAT(
                    YEAR(timestamp_gas), '-',
                    LPAD(DAY(timestamp_gas), 2, '0'), '-',
                    LPAD(MONTH(timestamp_gas), 2, '0'), ' ',
                    TIME(timestamp_gas)
                )
                WHERE id IN ($ids)
            ";
            $total += $pdo->exec($sql);
        }
        echo "\nFixed: $total records\n";
    }
    
    // Verify OPS
    echo "\n=== VERIFY OPS $ops AFTER FIX ===\n";
    $stmt = $pdo->prepare("SELECT id, timestamp_gas, created_at, source FROM kalsul_rekening WHERE ops_id LIKE :ops ORDER BY id DESC LIMIT 5");
    $stmt->execute([':ops' => "%$ops%"]);
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
        echo "id={$r['id']} gas=[{$r['timestamp_gas']}] created=[{$r['created_at']}] ({$r['source']})\n";
    }
    echo "\nDone!\n";
}
