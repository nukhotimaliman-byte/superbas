<?php
/**
 * Data Kalsul - Gaji Status API
 * GET ?action=summary   – overall summary of bank info completeness
 * GET ?action=detail    – per-station breakdown
 * GET ?action=missing   – employees missing bank/rekening data
 */

require_once __DIR__ . '/config.php';
requireAuth();

if (getMethod() !== 'GET') {
    jsonError('Method not allowed', 405);
}

$action = $_GET['action'] ?? 'summary';
$db = getDB();

switch ($action) {

    // ── Overall summary ──
    case 'summary':
        $total = (int)$db->query('SELECT COUNT(*) FROM kalsul_employees')->fetchColumn();

        $complete = (int)$db->query(
            "SELECT COUNT(*) FROM kalsul_employees WHERE no_rek IS NOT NULL AND no_rek != '' AND bank IS NOT NULL AND bank != ''"
        )->fetchColumn();

        $incomplete = $total - $complete;

        // Percentage
        $pct = ($total > 0) ? round(($complete / $total) * 100, 1) : 0;

        jsonSuccess([
            'total_employees'      => $total,
            'data_complete'        => $complete,
            'data_incomplete'      => $incomplete,
            'completion_percent'   => $pct,
        ]);
        break;

    // ── Per-station breakdown ──
    case 'detail':
        $sql = "
            SELECT 
                COALESCE(station, 'Unknown') AS station,
                COUNT(*) AS total,
                SUM(CASE WHEN no_rek IS NOT NULL AND no_rek != '' AND bank IS NOT NULL AND bank != '' THEN 1 ELSE 0 END) AS complete,
                SUM(CASE WHEN no_rek IS NULL OR no_rek = '' OR bank IS NULL OR bank = '' THEN 1 ELSE 0 END) AS incomplete
            FROM kalsul_employees
            GROUP BY station
            ORDER BY station ASC
        ";
        $rows = $db->query($sql)->fetchAll();

        // Add percentage
        foreach ($rows as &$row) {
            $row['total']      = (int)$row['total'];
            $row['complete']   = (int)$row['complete'];
            $row['incomplete'] = (int)$row['incomplete'];
            $row['percent']    = ($row['total'] > 0) ? round(($row['complete'] / $row['total']) * 100, 1) : 0;
        }
        unset($row);

        jsonSuccess($rows);
        break;

    // ── Employees with missing bank data ──
    case 'missing':
        $page  = max(1, (int)($_GET['page'] ?? 1));
        $limit = min(100, max(1, (int)($_GET['limit'] ?? 20)));
        $offset = ($page - 1) * $limit;
        $station = trim($_GET['station'] ?? '');

        $where = "WHERE (no_rek IS NULL OR no_rek = '' OR bank IS NULL OR bank = '')";
        $params = [];

        if ($station !== '') {
            $where .= ' AND station = :station';
            $params[':station'] = $station;
        }

        // Count
        $countStmt = $db->prepare("SELECT COUNT(*) FROM kalsul_employees $where");
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        // Fetch
        $sql = "SELECT id, no, ops_id, nama, station, status, no_rek, bank, atas_nama, no_hp FROM kalsul_employees $where ORDER BY station ASC, nama ASC LIMIT :limit OFFSET :offset";
        $stmt = $db->prepare($sql);
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        jsonSuccess([
            'employees'   => $stmt->fetchAll(),
            'total'       => $total,
            'page'        => $page,
            'limit'       => $limit,
            'total_pages' => (int)ceil($total / $limit),
        ]);
        break;

    default:
        jsonError('Invalid gaji-status action', 400);
}
