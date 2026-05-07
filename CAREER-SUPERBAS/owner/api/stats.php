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

// Safe count helper — returns 0 if table doesn't exist
function safeCount($db, $table, $where = '') {
    try {
        $sql = "SELECT COUNT(*) AS cnt FROM {$table}" . ($where ? " WHERE {$where}" : '');
        return intval($db->query($sql)->fetch()['cnt']);
    } catch (Exception $e) { return 0; }
}

function safeQuery($db, $sql, $params = []) {
    try {
        if ($params) {
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            return $stmt->fetchAll();
        }
        return $db->query($sql)->fetchAll();
    } catch (Exception $e) { return []; }
}

switch ($action) {

    case 'overview':
        $drv = safeCount($db, 'drv_candidates');
        $kur = safeCount($db, 'krr_candidates');
        $dw  = safeCount($db, 'dw_candidates');
        $total = $drv + $kur + $dw;

        $drvToday = safeCount($db, 'drv_candidates', 'DATE(created_at) = CURDATE()');
        $kurToday = safeCount($db, 'krr_candidates', 'DATE(created_at) = CURDATE()');
        $dwToday  = safeCount($db, 'dw_candidates',  'DATE(created_at) = CURDATE()');

        // Status breakdown - query each table individually
        $byStatus = [];
        foreach (['drv_candidates', 'krr_candidates', 'dw_candidates'] as $tbl) {
            $rows = safeQuery($db, "SELECT status, COUNT(*) AS cnt FROM {$tbl} GROUP BY status");
            foreach ($rows as $row) {
                $s = $row['status'] ?? 'Unknown';
                $byStatus[$s] = ($byStatus[$s] ?? 0) + intval($row['cnt']);
            }
        }

        $lulus = $byStatus['Lulus'] ?? 0;
        $tidakLulus = $byStatus['Tidak Lulus'] ?? 0;
        $completed = $lulus + $tidakLulus;
        $passRate = $completed > 0 ? round(($lulus / $completed) * 100, 1) : 0;

        jsonResponse([
            'total' => $total,
            'driver' => $drv,
            'kurir' => $kur,
            'daily_worker' => $dw,
            'today' => [
                'driver' => $drvToday,
                'kurir' => $kurToday,
                'daily_worker' => $dwToday,
                'total' => $drvToday + $kurToday + $dwToday
            ],
            'by_status' => $byStatus,
            'pass_rate' => $passRate,
            'lulus' => $lulus,
            'tidak_lulus' => $tidakLulus
        ]);
        break;

    case 'trend':
        $from = $_GET['from'] ?? null;
        $to   = $_GET['to'] ?? null;
        $days = min(intval($_GET['days'] ?? 30), 90);

        $trendQuery = function($table) use ($db, $from, $to, $days) {
            if ($from && $to) {
                return safeQuery($db, "
                    SELECT DATE(created_at) AS date, COUNT(*) AS cnt
                    FROM {$table}
                    WHERE DATE(created_at) >= ? AND DATE(created_at) <= ?
                    GROUP BY DATE(created_at) ORDER BY date
                ", [$from, $to]);
            }
            return safeQuery($db, "
                SELECT DATE(created_at) AS date, COUNT(*) AS cnt
                FROM {$table}
                WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
                GROUP BY DATE(created_at) ORDER BY date
            ", [$days]);
        };

        jsonResponse([
            'driver' => $trendQuery('drv_candidates'),
            'kurir' => $trendQuery('krr_candidates'),
            'daily_worker' => $trendQuery('dw_candidates'),
            'days' => $days
        ]);
        break;

    case 'comparison':
        $compare = function($table) use ($db) {
            $total = safeCount($db, $table);
            $statusRows = safeQuery($db, "SELECT status, COUNT(*) AS cnt FROM {$table} GROUP BY status");
            $statuses = [];
            foreach ($statusRows as $row) $statuses[$row['status']] = intval($row['cnt']);

            $lulus = $statuses['Lulus'] ?? 0;
            $tidakLulus = $statuses['Tidak Lulus'] ?? 0;
            $completed = $lulus + $tidakLulus;

            $thisMonth = safeCount($db, $table, 'MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())');
            $lastMonth = safeCount($db, $table, 'MONTH(created_at) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) AND YEAR(created_at) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))');

            return [
                'total' => $total,
                'statuses' => $statuses,
                'pass_rate' => $completed > 0 ? round(($lulus / $completed) * 100, 1) : 0,
                'this_month' => $thisMonth,
                'last_month' => $lastMonth,
                'trend' => $thisMonth - $lastMonth
            ];
        };
        jsonResponse([
            'driver' => $compare('drv_candidates'),
            'kurir' => $compare('krr_candidates'),
            'daily_worker' => $compare('dw_candidates')
        ]);
        break;

    case 'top_cities':
        $limit = intval($_GET['limit'] ?? 10);
        $cityMap = [];
        $tables = ['drv_candidates', 'krr_candidates', 'dw_candidates'];
        foreach ($tables as $tbl) {
            try {
                // First check if kabupaten column exists
                $cols = $db->query("SHOW COLUMNS FROM {$tbl} LIKE 'kabupaten'")->fetchAll();
                if (empty($cols)) continue;

                $stmt = $db->query("SELECT kabupaten, COUNT(*) AS cnt FROM {$tbl} WHERE kabupaten IS NOT NULL AND kabupaten != '' GROUP BY kabupaten ORDER BY cnt DESC");
                $rows = $stmt->fetchAll();
                foreach ($rows as $row) {
                    $city = trim($row['kabupaten']);
                    if ($city !== '') {
                        $cityMap[$city] = ($cityMap[$city] ?? 0) + intval($row['cnt']);
                    }
                }
            } catch (Exception $e) {
                // Table or column missing, skip
                continue;
            }
        }

        arsort($cityMap);
        $result = [];
        $i = 0;
        foreach ($cityMap as $city => $total) {
            if ($i >= $limit) break;
            $result[] = ['city' => $city, 'total' => $total];
            $i++;
        }
        jsonResponse($result);
        break;

    default:
        jsonResponse(['error' => 'Invalid action'], 400);
}
