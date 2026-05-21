<?php
require_once __DIR__ . '/config.php';
$db = getDB();
$admins = $db->query('SELECT id, username, name, role, station FROM kalsul_admins')->fetchAll();
$datasets = $db->query('SELECT id, station, bulan, periode, total_employees FROM kalsul_datasets')->fetchAll();

header('Content-Type: application/json');
echo json_encode(['admins' => $admins, 'datasets' => $datasets], JSON_PRETTY_PRINT);
