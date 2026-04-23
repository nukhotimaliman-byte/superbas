<?php
/**
 * BAS Recruitment — Owner / Analytics API
 * GET /api/owner.php?action=analytics — Dashboard analytics (korlap + owner)
 * GET /api/owner.php?action=export    — CSV export (owner only)
 */
require_once __DIR__ . '/../config.php';

$admin = requireAuth();  // Both korlap and owner can access analytics
$db = getDB();
$action = $_GET['action'] ?? '';

switch ($action) {

    case 'analytics':
        // Total dw_candidates
        $total = $db->query('SELECT COUNT(*) AS cnt FROM dw_candidates')->fetch()['cnt'];

        // By status
        $stmt = $db->query('SELECT status, COUNT(*) AS cnt FROM dw_candidates GROUP BY status');
        $byStatus = [];
        while ($row = $stmt->fetch()) {
            $byStatus[$row['status']] = intval($row['cnt']);
        }

        // By location
        $stmt = $db->query('
            SELECT l.name AS location_name, c.status, COUNT(*) AS cnt
            FROM dw_candidates c
            LEFT JOIN dw_locations l ON c.location_id = l.id
            GROUP BY l.name, c.status
            ORDER BY l.name
        ');
        $byLocation = [];
        while ($row = $stmt->fetch()) {
            $loc = $row['location_name'];
            if (!isset($byLocation[$loc])) $byLocation[$loc] = ['total' => 0, 'statuses' => []];
            $byLocation[$loc]['statuses'][$row['status']] = intval($row['cnt']);
            $byLocation[$loc]['total'] += intval($row['cnt']);
        }

        // By armada type
        $stmt = $db->query('SELECT armada_type, COUNT(*) AS cnt FROM dw_candidates GROUP BY armada_type');
        $byArmada = [];
        while ($row = $stmt->fetch()) {
            $byArmada[$row['armada_type']] = intval($row['cnt']);
        }

        // Pass/fail rates
        $lulus = $byStatus['Lulus'] ?? 0;
        $tidakLulus = $byStatus['Tidak Lulus'] ?? 0;
        $completed = $lulus + $tidakLulus;
        $passRate = $completed > 0 ? round(($lulus / $completed) * 100, 1) : 0;

        // Recent registrations (last 7 days)
        $stmt = $db->query("SELECT DATE(created_at) AS date, COUNT(*) AS cnt FROM dw_candidates WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) GROUP BY DATE(created_at) ORDER BY date");
        $recent = $stmt->fetchAll();

        jsonResponse([
            'total' => intval($total),
            'by_status' => $byStatus,
            'by_location' => $byLocation,
            'by_armada' => $byArmada,
            'pass_rate' => $passRate,
            'lulus' => $lulus,
            'tidak_lulus' => $tidakLulus,
            'recent_registrations' => $recent
        ]);
        break;

    case 'export':
        // Owner only
        if ($admin['role'] !== 'owner') { jsonResponse(['error' => 'Forbidden'], 403); }
        // CSV Export
        header('Content-Type: text/csv; charset=UTF-8');
        header('Content-Disposition: attachment; filename="bas_recruitment_' . date('Ymd_His') . '.csv"');

        $output = fopen('php://output', 'w');
        // BOM for Excel
        fprintf($output, chr(0xEF) . chr(0xBB) . chr(0xBF));

        // Header row
        fputcsv($output, ['ID', 'Nama', 'WhatsApp', 'Alamat', 'Tipe Armada', 'Tipe SIM', 'Lokasi', 'Status', 'Tgl Test Drive', 'Catatan Korlap', 'Tgl Daftar']);

        $stmt = $db->query('
            SELECT c.id, c.name, c.whatsapp, c.address, c.armada_type, c.sim_type,
                   l.name AS location_name, c.status, c.test_drive_date, c.korlap_notes, c.created_at
            FROM dw_candidates c
            LEFT JOIN dw_locations l ON c.location_id = l.id
            ORDER BY c.created_at DESC
        ');

        while ($row = $stmt->fetch()) {
            fputcsv($output, [
                $row['id'],
                $row['name'],
                $row['whatsapp'],
                $row['address'],
                $row['armada_type'],
                $row['sim_type'],
                $row['location_name'],
                $row['status'],
                $row['test_drive_date'] ?? '-',
                $row['korlap_notes'] ?? '-',
                $row['created_at']
            ]);
        }

        fclose($output);
        exit;

    default:
        jsonResponse(['error' => 'Invalid action. Use analytics or export.'], 400);
}
