<?php
/* Debug: test datasets + employees API response */
require_once __DIR__ . '/config.php';
session_name('BAS_KALSUL_SESS');
session_start();

header('Content-Type: application/json');

$db = getDB();

// Datasets
$datasets = $db->query('SELECT * FROM kalsul_datasets ORDER BY id DESC LIMIT 5')->fetchAll();

// Employees count
$empCount = (int)$db->query('SELECT COUNT(*) FROM kalsul_employees')->fetchColumn();

// Sample employees
$emps = $db->query('SELECT id, ops_id, nama, station, dataset_id FROM kalsul_employees LIMIT 5')->fetchAll();

echo json_encode([
    'session_id' => $_SESSION['kalsul_admin_id'] ?? null,
    'datasets' => $datasets,
    'employee_count' => $empCount,
    'employee_sample' => $emps,
], JSON_PRETTY_PRINT);
