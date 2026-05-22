<?php
// Migration: fix swapped month/day in kalsul_rekening.timestamp_gas
// Old parser treated GAS mm/dd/yyyy as dd/mm/yyyy, swapping month and day
$TOKEN = 'bas2026';
if (($_GET['token'] ?? '') !== $TOKEN) { die('Token salah'); }
header('Content-Type: text/plain; charset=utf-8');

$dry = ($_GET['dry'] ?? '1') === '1'; // dry run by default

$pdo = new PDO('mysql:host=46.250.232.197;dbname=super-bas.com;charset=utf8mb4', 'owner', 'Asik123asik', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
]);

echo $dry ? "=== DRY RUN (add &dry=0 to execute) ===\n\n" : "=== EXECUTING FIX ===\n\n";

// Get ALL records — they all went through the old parser
$stmt = $pdo->query("SELECT id, timestamp_gas FROM kalsul_rekening WHERE timestamp_gas IS NOT NULL ORDER BY id");
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

$fixed = 0;
$skipped = 0;
$errors = 0;
$unchanged = 0;

$updateStmt = $pdo->prepare("UPDATE kalsul_rekening SET timestamp_gas = :new_ts WHERE id = :id");

foreach ($rows as $r) {
    $ts = $r['timestamp_gas'];
    // Parse existing: YYYY-MM-DD HH:MM:SS
    if (!preg_match('/^(\d{4})-(\d{2})-(\d{2}) (\d{2}:\d{2}:\d{2})$/', $ts, $m)) {
        $skipped++;
        continue;
    }
    
    $year = (int)$m[1];
    $oldMonth = (int)$m[2];
    $oldDay = (int)$m[3];
    $time = $m[4];
    
    // Swap month <-> day
    $newMonth = $oldDay;
    $newDay = $oldMonth;
    
    // Validate the swapped date
    if ($newMonth < 1 || $newMonth > 12 || $newDay < 1 || $newDay > 31) {
        // Swapped date invalid — the original was probably correct, or both values <=12 and same
        if ($oldMonth === $oldDay) {
            $unchanged++;
            continue; // Same value, no need to swap
        }
        // Only the original is valid, skip
        $skipped++;
        continue;
    }
    
    // Check if swapped date is a real date
    if (!checkdate($newMonth, $newDay, $year)) {
        $skipped++;
        continue;
    }
    
    // If month == day, swapping doesn't change anything
    if ($oldMonth === $oldDay) {
        $unchanged++;
        continue;
    }
    
    $newTs = sprintf('%04d-%02d-%02d %s', $year, $newMonth, $newDay, $time);
    
    if ($dry) {
        if ($fixed < 30) { // Show first 30 changes
            echo "id={$r['id']}: [$ts] → [$newTs]\n";
        }
    } else {
        $updateStmt->execute([':new_ts' => $newTs, ':id' => $r['id']]);
    }
    $fixed++;
}

echo "\n=== SUMMARY ===\n";
echo "Total records: " . count($rows) . "\n";
echo "Fixed (swapped month/day): $fixed\n";
echo "Unchanged (month=day): $unchanged\n";
echo "Skipped (invalid swap or no match): $skipped\n";

if ($dry) {
    echo "\nThis was a DRY RUN. Add &dry=0 to URL to execute the fix.\n";
} else {
    echo "\nDone! $fixed records updated.\n";
}
