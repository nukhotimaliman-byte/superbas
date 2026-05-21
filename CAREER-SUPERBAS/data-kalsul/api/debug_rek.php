<?php
/* Quick debug: compare ops_id format between employees and rekening */
require_once __DIR__ . '/config.php';
$db = getDB();

// Get sample employees ops_id
$emp = $db->query("SELECT ops_id FROM kalsul_employees LIMIT 5")->fetchAll(PDO::FETCH_COLUMN);

// Get sample rekening ops_id
$rek = $db->query("SELECT DISTINCT ops_id FROM kalsul_rekening LIMIT 5")->fetchAll(PDO::FETCH_COLUMN);

// Count matches
$matchCount = $db->query("
    SELECT COUNT(DISTINCT e.ops_id) as matched
    FROM kalsul_employees e
    INNER JOIN kalsul_rekening r ON e.ops_id = r.ops_id
")->fetchColumn();

$totalEmp = $db->query("SELECT COUNT(*) FROM kalsul_employees")->fetchColumn();
$totalRek = $db->query("SELECT COUNT(DISTINCT ops_id) FROM kalsul_rekening")->fetchColumn();

header('Content-Type: application/json');
echo json_encode([
    'employee_sample' => $emp,
    'rekening_sample' => $rek,
    'total_employees' => $totalEmp,
    'total_unique_rekening_ops' => $totalRek,
    'matched_ops_ids' => $matchCount,
], JSON_PRETTY_PRINT);
