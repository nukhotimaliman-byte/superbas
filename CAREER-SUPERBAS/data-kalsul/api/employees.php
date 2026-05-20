<?php
/**
 * Data Kalsul - Employees API
 * GET    ?action=list&page=1&per_page=25&search=&station=  – paginated list
 * GET    ?action=get&id=123                                 – single employee
 * PUT    (body: {id, ...fields})                            – update employee
 * DELETE (body: {id})                                       – delete employee
 */

require_once __DIR__ . '/config.php';

// Require auth for all endpoints
if (empty($_SESSION['kalsul_admin_id'])) {
    jsonError('Unauthorized', 401);
}

$action = $_GET['action'] ?? 'list';
$method = $_SERVER['REQUEST_METHOD'];

switch ($action) {

    case 'list':
    default:
        if ($method !== 'GET' && $action !== 'list') {
            jsonError('Invalid action', 400);
        }
        
        $page     = max(1, (int)($_GET['page'] ?? 1));
        $per_page = min(100, max(1, (int)($_GET['per_page'] ?? 25)));
        $search   = trim($_GET['search'] ?? '');
        $station  = trim($_GET['station'] ?? '');
        $offset   = ($page - 1) * $per_page;

        $db = getDB();
        $where  = [];
        $params = [];

        if ($search !== '') {
            $where[] = '(nama LIKE :s1 OR ops_id LIKE :s2)';
            $params[':s1'] = "%$search%";
            $params[':s2'] = "%$search%";
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
        $sql = "SELECT * FROM kalsul_employees $whereSql ORDER BY id ASC LIMIT :lim OFFSET :off";
        $stmt = $db->prepare($sql);
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v);
        }
        $stmt->bindValue(':lim', $per_page, PDO::PARAM_INT);
        $stmt->bindValue(':off', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll();

        http_response_code(200);
        echo json_encode([
            'employees'  => $rows,
            'pagination' => [
                'total'       => $total,
                'page'        => $page,
                'per_page'    => $per_page,
                'total_pages' => (int)ceil($total / $per_page),
            ],
        ], JSON_UNESCAPED_UNICODE);
        exit;

    case 'get':
        $id = (int)($_GET['id'] ?? 0);
        if ($id <= 0) jsonError('Invalid employee ID');

        $db = getDB();
        $stmt = $db->prepare('SELECT * FROM kalsul_employees WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $id]);
        $emp = $stmt->fetch();

        if (!$emp) jsonError('Employee not found', 404);

        http_response_code(200);
        echo json_encode($emp, JSON_UNESCAPED_UNICODE);
        exit;
}

// PUT — Update
if ($method === 'PUT') {
    $body = getJsonBody();
    $id = (int)($body['id'] ?? 0);
    if ($id <= 0) jsonError('Invalid employee ID');

    $allowed = ['ops_id', 'nama', 'station', 'hk', 'status', 'no_rek', 'bank', 'atas_nama', 'no_hp', 'nik', 'alamat'];
    $sets   = [];
    $params = [':id' => $id];

    foreach ($allowed as $field) {
        if (array_key_exists($field, $body)) {
            $sets[] = "`$field` = :$field";
            $params[":$field"] = trim((string)$body[$field]);
        }
    }

    if (empty($sets)) jsonError('No valid fields to update');

    $db = getDB();
    $sql = 'UPDATE kalsul_employees SET ' . implode(', ', $sets) . ' WHERE id = :id';
    $stmt = $db->prepare($sql);
    $stmt->execute($params);

    jsonSuccess(['updated' => $id]);
}

// DELETE
if ($method === 'DELETE') {
    $body = getJsonBody();
    $id = (int)($body['id'] ?? 0);
    if ($id <= 0) jsonError('Invalid employee ID');

    $db = getDB();
    $stmt = $db->prepare('DELETE FROM kalsul_employees WHERE id = :id');
    $stmt->execute([':id' => $id]);

    jsonSuccess(['deleted' => $id]);
}
