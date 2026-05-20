<?php
/**
 * Data Kalsul - Employees API
 * GET    ?action=list&page=1&limit=20&search=&station=  – paginated list
 * GET    ?action=get&id=123                              – single employee
 * PUT    ?action=update&id=123                           – update employee
 * DELETE ?action=delete&id=123                           – delete employee
 * GET    ?action=stations                                – distinct stations
 */

require_once __DIR__ . '/config.php';
requireAuth();

$action = $_GET['action'] ?? 'list';
$method = getMethod();

switch ($action) {

    // ── List employees (paginated, searchable, filterable) ──
    case 'list':
        if ($method !== 'GET') jsonError('Method not allowed', 405);

        $page   = max(1, (int)($_GET['page'] ?? 1));
        $limit  = min(100, max(1, (int)($_GET['limit'] ?? 20)));
        $search = trim($_GET['search'] ?? '');
        $station = trim($_GET['station'] ?? '');
        $offset = ($page - 1) * $limit;

        $db = getDB();
        $where  = [];
        $params = [];

        if ($search !== '') {
            $where[] = '(nama LIKE :s OR ops_id LIKE :s2 OR nik LIKE :s3 OR no_hp LIKE :s4)';
            $params[':s']  = "%$search%";
            $params[':s2'] = "%$search%";
            $params[':s3'] = "%$search%";
            $params[':s4'] = "%$search%";
        }

        if ($station !== '') {
            $where[] = 'station = :station';
            $params[':station'] = $station;
        }

        $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

        // Count total
        $countStmt = $db->prepare("SELECT COUNT(*) FROM kalsul_employees $whereSql");
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        // Fetch rows
        $sql = "SELECT * FROM kalsul_employees $whereSql ORDER BY `no` ASC, id ASC LIMIT :limit OFFSET :offset";
        $stmt = $db->prepare($sql);
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll();

        jsonSuccess([
            'employees'   => $rows,
            'total'       => $total,
            'page'        => $page,
            'limit'       => $limit,
            'total_pages' => (int)ceil($total / $limit),
        ]);
        break;

    // ── Get single employee ──
    case 'get':
        if ($method !== 'GET') jsonError('Method not allowed', 405);

        $id = (int)($_GET['id'] ?? 0);
        if ($id <= 0) jsonError('Invalid employee ID');

        $db = getDB();
        $stmt = $db->prepare('SELECT * FROM kalsul_employees WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $id]);
        $emp = $stmt->fetch();

        if (!$emp) jsonError('Employee not found', 404);

        jsonSuccess($emp);
        break;

    // ── Update employee ──
    case 'update':
        if ($method !== 'PUT') jsonError('Method not allowed', 405);

        $id = (int)($_GET['id'] ?? 0);
        if ($id <= 0) jsonError('Invalid employee ID');

        $body = getJsonBody();
        if (empty($body)) jsonError('No data provided');

        $allowed = ['no', 'ops_id', 'nama', 'station', 'status', 'no_rek', 'bank', 'atas_nama', 'no_hp', 'nik', 'alamat'];
        $sets   = [];
        $params = [':id' => $id];

        foreach ($allowed as $field) {
            if (array_key_exists($field, $body)) {
                $sets[] = "`$field` = :$field";
                $params[":$field"] = ($field === 'no') ? (int)$body[$field] : sanitize($body[$field]);
            }
        }

        if (empty($sets)) jsonError('No valid fields to update');

        $db = getDB();

        // Check exists
        $check = $db->prepare('SELECT id FROM kalsul_employees WHERE id = :id LIMIT 1');
        $check->execute([':id' => $id]);
        if (!$check->fetch()) jsonError('Employee not found', 404);

        $sql = 'UPDATE kalsul_employees SET ' . implode(', ', $sets) . ' WHERE id = :id';
        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        // Return updated record
        $stmt = $db->prepare('SELECT * FROM kalsul_employees WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $id]);

        jsonSuccess($stmt->fetch());
        break;

    // ── Delete employee ──
    case 'delete':
        if ($method !== 'DELETE') jsonError('Method not allowed', 405);

        $id = (int)($_GET['id'] ?? 0);
        if ($id <= 0) jsonError('Invalid employee ID');

        $db = getDB();

        $check = $db->prepare('SELECT id FROM kalsul_employees WHERE id = :id LIMIT 1');
        $check->execute([':id' => $id]);
        if (!$check->fetch()) jsonError('Employee not found', 404);

        $stmt = $db->prepare('DELETE FROM kalsul_employees WHERE id = :id');
        $stmt->execute([':id' => $id]);

        jsonSuccess(['deleted' => $id]);
        break;

    // ── Get distinct stations ──
    case 'stations':
        if ($method !== 'GET') jsonError('Method not allowed', 405);

        $db = getDB();
        $stmt = $db->query('SELECT DISTINCT station FROM kalsul_employees WHERE station IS NOT NULL AND station != "" ORDER BY station ASC');
        $stations = $stmt->fetchAll(PDO::FETCH_COLUMN);

        jsonSuccess($stations);
        break;

    default:
        jsonError('Invalid employees action', 400);
}
