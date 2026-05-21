<?php
/* Debug: show actual data stored in kalsul_rekening */
require_once __DIR__ . '/config.php';
$db = getDB();

// Sample rekening rows
$rek = $db->query("SELECT * FROM kalsul_rekening ORDER BY id DESC LIMIT 5")->fetchAll();

// Employee ops_id formats
$emp = $db->query("SELECT ops_id, nama FROM kalsul_employees LIMIT 5")->fetchAll();

// Headers from rekening table
$cols = $db->query("SHOW COLUMNS FROM kalsul_rekening")->fetchAll(PDO::FETCH_COLUMN);

header('Content-Type: application/json');
echo json_encode([
    'rekening_columns' => $cols,
    'rekening_sample' => $rek,
    'employee_sample' => $emp,
], JSON_PRETTY_PRINT);
