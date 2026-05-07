<?php
/**
 * BAS Super Owner — Unified Statistics API
 * GET ?action=overview    — Total stats across all projects
 * GET ?action=trend       — 30-day registration trend
 * GET ?action=comparison  — Project comparison metrics
 * GET ?action=top_cities  — Top cities by applicant count
 */
require_once __DIR__ . '/../config.php';

$owner = requireOwnerAuth();
$db = getDB();
$action = $_GET['action'] ?? 'overview';

switch ($action) {

    case 'overview':
        // Total per project
        $drv = $db->query('SELECT COUNT(*) AS cnt FROM drv_candidates')->fetch()['cnt'];
        $kur = $db->query('SELECT COUNT(*) AS cnt FROM kur_candidates')->fetch()['cnt'];
        $dw  = $db->query('SELECT COUNT(*) AS cnt FROM dw_candidates')->fetch()['cnt'];
        $total = $drv + $kur + $dw;

        // Today's registrations
        $drvToday = $db->query("SELECT COUNT(*) AS cnt FROM drv_candidates WHERE DATE(created_at) = CURDATE()")->fetch()['cnt'];
        $kurToday = $db->query("SELECT COUNT(*) AS cnt FROM kur_candidates WHERE DATE(created_at) = CURDATE()")->fetch()['cnt'];
        $dwToday  = $db->query("SELECT COUNT(*) AS cnt FROM dw_candidates WHERE DATE(created_at) = CURDATE()")->fetch()['cnt'];

        // Status breakdown (all projects combined)
        $statusQuery = "
            SELECT status, SUM(cnt) AS total FROM (
                SELECT status, COUNT(*) AS cnt FROM drv_candidates GROUP BY status
                UNION ALL
                SELECT status, COUNT(*) AS cnt FROM kur_candidates GROUP BY status
                UNION ALL
                SELECT status, COUNT(*) AS cnt FROM dw_candidates GROUP BY status
            ) combined GROUP BY status
        ";
        $byStatus = [];
        foreach ($db->query($statusQuery)->fetchAll() as $row) {
            $byStatus[$row['status']] = intval($row['total']);
        }

        // Pass rate
        $lulus = $byStatus['Lulus'] ?? 0;
        $tidakLulus = $byStatus['Tidak Lulus'] ?? 0;
        $completed = $lulus + $tidakLulus;
        $passRate = $completed > 0 ? round(($lulus / $completed) * 100, 1) : 0;

        jsonResponse([
            'total' => intval($total),
            'driver' => intval($drv),
            'kurir' => intval($kur),
            'daily_worker' => intval($dw),
            'today' => [
                'driver' => intval($drvToday),
                'kurir' => intval($kurToday),
                'daily_worker' => intval($dwToday),
                'total' => intval($drvToday) + intval($kurToday) + intval($dwToday)
            ],
            'by_status' => $byStatus,
            'pass_rate' => $passRate,
            'lulus' => $lulus,
            'tidak_lulus' => $tidakLulus
        ]);
        break;

    case 'trend':
        $days = intval($_GET['days'] ?? 30);
        $days = min($days, 90);

        $trendQuery = function($table) use ($db, $days) {
            $stmt = $db->prepare("
                SELECT DATE(created_at) AS date, COUNT(*) AS cnt
                FROM {$table}
                WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
                GROUP BY DATE(created_at)
                ORDER BY date
            ");
            $stmt->execute([$days]);
            return $stmt->fetchAll();
        };

        jsonResponse([
            'driver' => $trendQuery('drv_candidates'),
            'kurir' => $trendQuery('kur_candidates'),
            'daily_worker' => $trendQuery('dw_candidates'),
            'days' => $days
        ]);
        break;

    case 'comparison':
        $compare = function($table) use ($db) {
            $total = $db->query("SELECT COUNT(*) AS cnt FROM {$table}")->fetch()['cnt'];
            $stmt = $db->query("SELECT status, COUNT(*) AS cnt FROM {$table} GROUP BY status");
            $statuses = [];
            while ($row = $stmt->fetch()) $statuses[$row['status']] = intval($row['cnt']);

            $lulus = $statuses['Lulus'] ?? 0;
            $tidakLulus = $statuses['Tidak Lulus'] ?? 0;
            $completed = $lulus + $tidakLulus;

            $thisMonth = $db->query("SELECT COUNT(*) AS cnt FROM {$table} WHERE MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())")->fetch()['cnt'];
            $lastMonth = $db->query("SELECT COUNT(*) AS cnt FROM {$table} WHERE MONTH(created_at) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) AND YEAR(created_at) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))")->fetch()['cnt'];

            return [
                'total' => intval($total),
                'statuses' => $statuses,
                'pass_rate' => $completed > 0 ? round(($lulus / $completed) * 100, 1) : 0,
                'this_month' => intval($thisMonth),
                'last_month' => intval($lastMonth),
                'trend' => intval($thisMonth) - intval($lastMonth)
            ];
        };

        jsonResponse([
            'driver' => $compare('drv_candidates'),
            'kurir' => $compare('kur_candidates'),
            'daily_worker' => $compare('dw_candidates')
        ]);
        break;

    case 'top_cities':
        $limit = intval($_GET['limit'] ?? 10);
        $stmt = $db->prepare("
            SELECT city, SUM(cnt) AS total FROM (
                SELECT COALESCE(l.name, 'Unknown') AS city, COUNT(*) AS cnt
                FROM drv_candidates c LEFT JOIN drv_locations l ON c.location_id = l.id GROUP BY l.name
                UNION ALL
                SELECT COALESCE(l.name, 'Unknown') AS city, COUNT(*) AS cnt
                FROM kur_candidates c LEFT JOIN kur_locations l ON c.location_id = l.id GROUP BY l.name
                UNION ALL
                SELECT COALESCE(l.name, 'Unknown') AS city, COUNT(*) AS cnt
                FROM dw_candidates c LEFT JOIN dw_locations l ON c.location_id = l.id GROUP BY l.name
            ) combined GROUP BY city ORDER BY total DESC LIMIT ?
        ");
        $stmt->execute([$limit]);
        jsonResponse($stmt->fetchAll());
        break;

    default:
        jsonResponse(['error' => 'Invalid action. Use: overview, trend, comparison, top_cities'], 400);
}
