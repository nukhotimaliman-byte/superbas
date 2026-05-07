<?php
/**
 * BAS Super Owner — Candidates API
 * GET  ?project=all&status=&search=&page=1&limit=50&sort=created_at&order=desc
 * PUT  ?action=update_status  — { id, project, status }
 * PUT  ?action=update_notes   — { id, project, notes }
 * PUT  ?action=bookmark       — { id, project, bookmarked }
 * GET  ?action=duplicates     — Find duplicate candidates
 * GET  ?action=detail         — { id, project } — Full detail with documents
 */
require_once __DIR__ . '/../config.php';

$owner = requireOwnerAuth();
$db = getDB();
$action = $_GET['action'] ?? 'list';

// Table mapping
$tables = [
    'driver' => ['candidates' => 'drv_candidates', 'locations' => 'drv_locations'],
    'kurir'  => ['candidates' => 'krr_candidates', 'locations' => 'krr_locations'],
    'daily_worker' => ['candidates' => 'dw_candidates', 'locations' => 'dw_locations'],
];

switch ($action) {

    case 'list':
        $project = $_GET['project'] ?? 'all';
        $status  = $_GET['status'] ?? '';
        $search  = $_GET['search'] ?? '';
        $city    = $_GET['city'] ?? '';
        $page    = max(1, intval($_GET['page'] ?? 1));
        $limit   = min(100, max(10, intval($_GET['limit'] ?? 50)));
        $sort    = $_GET['sort'] ?? 'created_at';
        $order   = strtoupper($_GET['order'] ?? 'DESC') === 'ASC' ? 'ASC' : 'DESC';
        $offset  = ($page - 1) * $limit;

        $allowedSort = ['created_at', 'name', 'status', 'whatsapp'];
        if (!in_array($sort, $allowedSort)) $sort = 'created_at';

        $buildQuery = function($projectKey, $tbl, $locTbl) use ($status, $search, $city, $sort, $order) {
            $where = [];
            $params = [];

            if ($status) {
                $where[] = "c.status = ?";
                $params[] = $status;
            }
            if ($search) {
                $where[] = "(c.name LIKE ? OR c.whatsapp LIKE ? OR c.address LIKE ?)";
                $s = "%{$search}%";
                $params[] = $s; $params[] = $s; $params[] = $s;
            }
            if ($city) {
                $where[] = "l.name = ?";
                $params[] = $city;
            }

            $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';

            $sql = "SELECT '{$projectKey}' AS project, c.id, c.name, c.whatsapp, c.address, c.status,
                    COALESCE(l.name, '-') AS city, c.created_at, c.korlap_notes
                    FROM {$tbl} c LEFT JOIN {$locTbl} l ON c.location_id = l.id
                    {$whereClause}";

            return ['sql' => $sql, 'params' => $params];
        };

        if ($project === 'all') {
            $unions = [];
            $allParams = [];
            foreach ($tables as $key => $t) {
                $q = $buildQuery($key, $t['candidates'], $t['locations']);
                $unions[] = "({$q['sql']})";
                $allParams = array_merge($allParams, $q['params']);
            }
            $countSql = "SELECT COUNT(*) AS total FROM (" . implode(' UNION ALL ', $unions) . ") u";
            $dataSql = implode(' UNION ALL ', $unions) . " ORDER BY {$sort} {$order} LIMIT {$limit} OFFSET {$offset}";

            $countStmt = $db->prepare($countSql);
            $countStmt->execute($allParams);
            $total = $countStmt->fetch()['total'];

            $dataStmt = $db->prepare($dataSql);
            $dataStmt->execute($allParams);
            $rows = $dataStmt->fetchAll();
        } else {
            if (!isset($tables[$project])) jsonResponse(['error' => 'Invalid project'], 400);
            $t = $tables[$project];
            $q = $buildQuery($project, $t['candidates'], $t['locations']);

            $countSql = "SELECT COUNT(*) AS total FROM ({$q['sql']}) u";
            $dataSql = "{$q['sql']} ORDER BY {$sort} {$order} LIMIT {$limit} OFFSET {$offset}";

            $countStmt = $db->prepare($countSql);
            $countStmt->execute($q['params']);
            $total = $countStmt->fetch()['total'];

            $dataStmt = $db->prepare($dataSql);
            $dataStmt->execute($q['params']);
            $rows = $dataStmt->fetchAll();
        }

        jsonResponse([
            'data' => $rows,
            'total' => intval($total),
            'page' => $page,
            'limit' => $limit,
            'pages' => ceil($total / $limit)
        ]);
        break;

    case 'detail':
        $project = $_GET['project'] ?? '';
        $id = intval($_GET['id'] ?? 0);
        if (!isset($tables[$project]) || !$id) jsonResponse(['error' => 'Invalid parameters'], 400);

        $t = $tables[$project];
        $stmt = $db->prepare("SELECT c.*, COALESCE(l.name, '-') AS city FROM {$t['candidates']} c LEFT JOIN {$t['locations']} l ON c.location_id = l.id WHERE c.id = ?");
        $stmt->execute([$id]);
        $candidate = $stmt->fetch();

        if (!$candidate) jsonResponse(['error' => 'Candidate not found'], 404);

        $candidate['project'] = $project;
        jsonResponse($candidate);
        break;

    case 'update_status':
        if ($_SERVER['REQUEST_METHOD'] !== 'PUT') jsonResponse(['error' => 'Method not allowed'], 405);
        $input = json_decode(file_get_contents('php://input'), true);
        $project = $input['project'] ?? '';
        $id = intval($input['id'] ?? 0);
        $newStatus = $input['status'] ?? '';

        if (!isset($tables[$project]) || !$id || !$newStatus) {
            jsonResponse(['error' => 'Invalid parameters'], 400);
        }

        $validStatuses = ['Baru', 'Proses', 'Interview', 'Test Drive', 'Lulus', 'Tidak Lulus', 'Blacklist'];
        if (!in_array($newStatus, $validStatuses)) jsonResponse(['error' => 'Invalid status'], 400);

        $tbl = $tables[$project]['candidates'];
        $stmt = $db->prepare("UPDATE {$tbl} SET status = ?, updated_at = NOW() WHERE id = ?");
        $stmt->execute([$newStatus, $id]);

        jsonResponse(['success' => true, 'message' => 'Status updated']);
        break;

    case 'update_notes':
        if ($_SERVER['REQUEST_METHOD'] !== 'PUT') jsonResponse(['error' => 'Method not allowed'], 405);
        $input = json_decode(file_get_contents('php://input'), true);
        $project = $input['project'] ?? '';
        $id = intval($input['id'] ?? 0);
        $notes = $input['notes'] ?? '';

        if (!isset($tables[$project]) || !$id) jsonResponse(['error' => 'Invalid parameters'], 400);

        $tbl = $tables[$project]['candidates'];
        $stmt = $db->prepare("UPDATE {$tbl} SET korlap_notes = ?, updated_at = NOW() WHERE id = ?");
        $stmt->execute([$notes, $id]);

        jsonResponse(['success' => true, 'message' => 'Notes updated']);
        break;

    case 'duplicates':
        $dupeQuery = "
            SELECT whatsapp, GROUP_CONCAT(DISTINCT project) AS projects, COUNT(*) AS count FROM (
                SELECT whatsapp, 'driver' AS project FROM drv_candidates WHERE whatsapp IS NOT NULL AND whatsapp != ''
                UNION ALL
                SELECT whatsapp, 'kurir' FROM krr_candidates WHERE whatsapp IS NOT NULL AND whatsapp != ''
                UNION ALL
                SELECT whatsapp, 'daily_worker' FROM dw_candidates WHERE whatsapp IS NOT NULL AND whatsapp != ''
            ) all_wa
            GROUP BY whatsapp
            HAVING COUNT(DISTINCT project) > 1
            ORDER BY count DESC
            LIMIT 100
        ";
        $dupes = $db->query($dupeQuery)->fetchAll();
        jsonResponse(['duplicates' => $dupes, 'total' => count($dupes)]);
        break;

    case 'locations':
        $project = $_GET['project'] ?? 'all';
        $locations = [];

        if ($project === 'all' || $project === 'driver') {
            foreach ($db->query('SELECT id, name FROM drv_locations ORDER BY name')->fetchAll() as $r) {
                $locations[] = ['id' => $r['id'], 'name' => $r['name'], 'project' => 'driver'];
            }
        }
        if ($project === 'all' || $project === 'kurir') {
            foreach ($db->query('SELECT id, name FROM krr_locations ORDER BY name')->fetchAll() as $r) {
                $locations[] = ['id' => $r['id'], 'name' => $r['name'], 'project' => 'kurir'];
            }
        }
        if ($project === 'all' || $project === 'daily_worker') {
            foreach ($db->query('SELECT id, name FROM dw_locations ORDER BY name')->fetchAll() as $r) {
                $locations[] = ['id' => $r['id'], 'name' => $r['name'], 'project' => 'daily_worker'];
            }
        }

        // Unique city names
        $unique = [];
        foreach ($locations as $l) {
            if (!in_array($l['name'], $unique)) $unique[] = $l['name'];
        }
        sort($unique);

        jsonResponse(['locations' => $locations, 'cities' => $unique]);
        break;

    default:
        jsonResponse(['error' => 'Invalid action'], 400);
}
