<?php
/**
 * BAS Super Owner — CSV Export API
 * GET ?project=all&from=&to=&status=
 */
require_once __DIR__ . '/../config.php';

$owner = requireOwnerAuth();
$db = getDB();

$project = $_GET['project'] ?? 'all';
$from    = $_GET['from'] ?? '';
$to      = $_GET['to'] ?? '';
$status  = $_GET['status'] ?? '';

header('Content-Type: text/csv; charset=UTF-8');
header('Content-Disposition: attachment; filename="bas_export_' . $project . '_' . date('Ymd_His') . '.csv"');

$output = fopen('php://output', 'w');
fprintf($output, chr(0xEF) . chr(0xBB) . chr(0xBF)); // BOM for Excel

fputcsv($output, ['Project', 'ID', 'Nama', 'WhatsApp', 'Alamat', 'Kota', 'Status', 'Catatan Korlap', 'Tgl Daftar']);

$tables = [
    'driver' => ['candidates' => 'drv_candidates', 'locations' => 'drv_locations'],
    'kurir'  => ['candidates' => 'krr_candidates', 'locations' => 'krr_locations'],
    'daily_worker' => ['candidates' => 'dw_candidates', 'locations' => 'dw_locations'],
];

$projects = $project === 'all' ? array_keys($tables) : [$project];

foreach ($projects as $proj) {
    if (!isset($tables[$proj])) continue;
    $t = $tables[$proj];

    $where = [];
    $params = [];

    if ($from) { $where[] = "c.created_at >= ?"; $params[] = $from . ' 00:00:00'; }
    if ($to)   { $where[] = "c.created_at <= ?"; $params[] = $to . ' 23:59:59'; }
    if ($status) { $where[] = "c.status = ?"; $params[] = $status; }

    $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    $stmt = $db->prepare("
        SELECT c.id, c.name, c.whatsapp, c.address, COALESCE(l.name, '-') AS city,
               c.status, c.korlap_notes, c.created_at
        FROM {$t['candidates']} c
        LEFT JOIN {$t['locations']} l ON c.location_id = l.id
        {$whereClause}
        ORDER BY c.created_at DESC
    ");
    $stmt->execute($params);

    while ($row = $stmt->fetch()) {
        fputcsv($output, [
            ucfirst(str_replace('_', ' ', $proj)),
            $row['id'],
            $row['name'],
            $row['whatsapp'],
            $row['address'],
            $row['city'],
            $row['status'],
            $row['korlap_notes'] ?? '-',
            $row['created_at']
        ]);
    }
}

fclose($output);
exit;
