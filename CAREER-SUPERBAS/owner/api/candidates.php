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

        // Check if a table exists
        $tableExists = function($tableName) use ($db) {
            try {
                $db->query("SELECT 1 FROM {$tableName} LIMIT 1");
                return true;
            } catch (Exception $e) { return false; }
        };

        $buildQuery = function($projectKey, $tbl, $locTbl) use ($status, $search, $city, $db, $tableExists) {
            $where = [];
            $params = [];
            $hasLocTable = $tableExists($locTbl);

            if ($status) {
                $where[] = "c.status = ?";
                $params[] = $status;
            }
            if ($search) {
                $where[] = "(c.name LIKE ? OR c.whatsapp LIKE ? OR c.address LIKE ?)";
                $s = "%{$search}%";
                $params[] = $s; $params[] = $s; $params[] = $s;
            }
            if ($city && $hasLocTable) {
                $where[] = "l.name = ?";
                $params[] = $city;
            } elseif ($city) {
                $where[] = "c.kabupaten LIKE ?";
                $params[] = "%{$city}%";
            }

            $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';

            if ($hasLocTable) {
                $sql = "SELECT '{$projectKey}' AS project, c.id, c.name, c.whatsapp, c.address, c.status,
                        COALESCE(l.name, COALESCE(c.kabupaten, '-')) AS city, c.created_at, c.korlap_notes
                        FROM {$tbl} c LEFT JOIN {$locTbl} l ON c.location_id = l.id
                        {$whereClause}";
            } else {
                $sql = "SELECT '{$projectKey}' AS project, c.id, c.name, c.whatsapp, c.address, c.status,
                        COALESCE(c.kabupaten, '-') AS city, c.created_at, c.korlap_notes
                        FROM {$tbl} c
                        {$whereClause}";
            }

            return ['sql' => $sql, 'params' => $params];
        };

        $allRows = [];
        $total = 0;

        $projectsToQuery = ($project === 'all') ? $tables : [$project => $tables[$project] ?? null];
        if ($project !== 'all' && !isset($tables[$project])) {
            jsonResponse(['error' => 'Invalid project'], 400);
        }

        foreach ($projectsToQuery as $key => $t) {
            if (!$t) continue;
            try {
                $q = $buildQuery($key, $t['candidates'], $t['locations']);

                $countStmt = $db->prepare("SELECT COUNT(*) AS cnt FROM ({$q['sql']}) u");
                $countStmt->execute($q['params']);
                $total += intval($countStmt->fetch()['cnt']);

                $dataStmt = $db->prepare("{$q['sql']} ORDER BY {$sort} {$order}");
                $dataStmt->execute($q['params']);
                $allRows = array_merge($allRows, $dataStmt->fetchAll());
            } catch (Exception $e) {
                // Table missing, skip
            }
        }

        // Sort merged results
        usort($allRows, function($a, $b) use ($sort, $order) {
            $va = $a[$sort] ?? '';
            $vb = $b[$sort] ?? '';
            $cmp = strcmp($va, $vb);
            return $order === 'DESC' ? -$cmp : $cmp;
        });

        // Paginate
        $rows = array_slice($allRows, $offset, $limit);

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
        $allWa = [];
        foreach (['drv_candidates' => 'driver', 'krr_candidates' => 'kurir', 'dw_candidates' => 'daily_worker'] as $tbl => $proj) {
            try {
                $rows = $db->query("SELECT whatsapp FROM {$tbl} WHERE whatsapp IS NOT NULL AND whatsapp != ''")->fetchAll();
                foreach ($rows as $r) {
                    $wa = $r['whatsapp'];
                    if (!isset($allWa[$wa])) $allWa[$wa] = [];
                    if (!in_array($proj, $allWa[$wa])) $allWa[$wa][] = $proj;
                }
            } catch (Exception $e) { /* skip */ }
        }
        $dupes = [];
        foreach ($allWa as $wa => $projects) {
            if (count($projects) > 1) {
                $dupes[] = ['whatsapp' => $wa, 'projects' => implode(',', $projects), 'count' => count($projects)];
            }
        }
        usort($dupes, fn($a, $b) => $b['count'] - $a['count']);
        jsonResponse(['duplicates' => array_slice($dupes, 0, 100), 'total' => count($dupes)]);
        break;

    case 'locations':
        $project = $_GET['project'] ?? 'all';
        $locations = [];

        $locTables = [
            'driver' => 'drv_locations',
            'kurir' => 'krr_locations',
            'daily_worker' => 'dw_locations',
        ];

        foreach ($locTables as $proj => $tbl) {
            if ($project !== 'all' && $project !== $proj) continue;
            try {
                foreach ($db->query("SELECT id, name FROM {$tbl} ORDER BY name")->fetchAll() as $r) {
                    $locations[] = ['id' => $r['id'], 'name' => $r['name'], 'project' => $proj];
                }
            } catch (Exception $e) { /* table missing */ }
        }

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
