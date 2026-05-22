<?php
// Migration: fix swapped month/day using SINGLE batch SQL query
$TOKEN = 'bas2026';
if (($_GET['token'] ?? '') !== $TOKEN) { die('Token salah'); }
header('Content-Type: text/plain; charset=utf-8');
set_time_limit(120);

$pdo = new PDO('mysql:host=46.250.232.197;dbname=super-bas.com;charset=utf8mb4', 'owner', 'Asik123asik', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
]);

$dry = ($_GET['dry'] ?? '1') === '1';

// Count before
$before = $pdo->query("SELECT COUNT(*) FROM kalsul_rekening WHERE timestamp_gas IS NOT NULL")->fetchColumn();
echo "Total records with timestamp: $before\n\n";

// Show some examples of what will change
echo "=== SAMPLE BEFORE FIX ===\n";
$sample = $pdo->query("
    SELECT id, ops_id, timestamp_gas, source,
           MONTH(timestamp_gas) as m, DAY(timestamp_gas) as d
    FROM kalsul_rekening 
    WHERE MONTH(timestamp_gas) != DAY(timestamp_gas)
      AND DAY(timestamp_gas) <= 12
    ORDER BY id DESC LIMIT 10
")->fetchAll(PDO::FETCH_ASSOC);
foreach ($sample as $r) {
    $swapped = sprintf('%s-%02d-%02d %s', 
        substr($r['timestamp_gas'], 0, 4),
        $r['d'], $r['m'],
        substr($r['timestamp_gas'], 11)
    );
    echo "id={$r['id']} ops={$r['ops_id']} [{$r['timestamp_gas']}] → [$swapped] ({$r['source']})\n";
}

if ($dry) {
    // Count how many would be affected
    $wouldFix = $pdo->query("
        SELECT COUNT(*) FROM kalsul_rekening 
        WHERE timestamp_gas IS NOT NULL 
          AND MONTH(timestamp_gas) != DAY(timestamp_gas)
          AND DAY(timestamp_gas) <= 12
    ")->fetchColumn();
    
    $same = $pdo->query("
        SELECT COUNT(*) FROM kalsul_rekening 
        WHERE timestamp_gas IS NOT NULL 
          AND MONTH(timestamp_gas) = DAY(timestamp_gas)
    ")->fetchColumn();
    
    $cantSwap = $pdo->query("
        SELECT COUNT(*) FROM kalsul_rekening 
        WHERE timestamp_gas IS NOT NULL 
          AND MONTH(timestamp_gas) != DAY(timestamp_gas)
          AND DAY(timestamp_gas) > 12
    ")->fetchColumn();
    
    echo "\n=== DRY RUN SUMMARY ===\n";
    echo "Will swap month/day: $wouldFix\n";
    echo "Same month=day (no change needed): $same\n";
    echo "Cannot swap (day>12, would be invalid month): $cantSwap\n";
    echo "\nAdd &dry=0 to execute.\n";
} else {
    echo "\n=== EXECUTING BATCH FIX ===\n";
    
    // Single SQL: swap month and day where day <= 12 (valid as new month)
    $sql = "
        UPDATE kalsul_rekening 
        SET timestamp_gas = CONCAT(
            YEAR(timestamp_gas), '-',
            LPAD(DAY(timestamp_gas), 2, '0'), '-',
            LPAD(MONTH(timestamp_gas), 2, '0'), ' ',
            TIME(timestamp_gas)
        )
        WHERE timestamp_gas IS NOT NULL
          AND MONTH(timestamp_gas) != DAY(timestamp_gas)
          AND DAY(timestamp_gas) <= 12
    ";
    
    $affected = $pdo->exec($sql);
    echo "Updated: $affected records\n";
    
    // Verify
    echo "\n=== SAMPLE AFTER FIX ===\n";
    $sample2 = $pdo->query("
        SELECT id, ops_id, timestamp_gas, source 
        FROM kalsul_rekening ORDER BY id DESC LIMIT 10
    ")->fetchAll(PDO::FETCH_ASSOC);
    foreach ($sample2 as $r) {
        echo "id={$r['id']} ops={$r['ops_id']} [{$r['timestamp_gas']}] ({$r['source']})\n";
    }
    
    echo "\nDone!\n";
}
