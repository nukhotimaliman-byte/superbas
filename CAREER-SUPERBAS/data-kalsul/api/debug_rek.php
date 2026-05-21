<?php
/* Fix station column size */
$TOKEN = 'bas2026';
if (($_GET['token'] ?? '') !== $TOKEN) { die('Token salah'); }

header('Content-Type: text/plain; charset=utf-8');

$pdo = new PDO('mysql:host=46.250.232.197;dbname=super-bas.com;charset=utf8mb4', 'owner', 'Asik123asik', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
]);

$alters = [
    "ALTER TABLE kalsul_employees MODIFY station VARCHAR(500)",
    "ALTER TABLE kalsul_datasets MODIFY station VARCHAR(500)",
];

foreach ($alters as $sql) {
    try {
        $pdo->exec($sql);
        echo "OK: $sql\n";
    } catch (Exception $e) {
        echo "SKIP: $sql — " . $e->getMessage() . "\n";
    }
}

echo "\nDone!";
