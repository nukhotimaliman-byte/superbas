<?php
/* Data KalSul — Employees API v2 */
require_once __DIR__ . '/config.php';
$user = requireAuth();

$action = $_GET['action'] ?? 'list';
$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

// Korlap station filter
$korlapStation = ($user['role'] === 'korlap' && !empty($user['station'])) ? $user['station'] : null;

switch ($action) {

// ── List datasets (for subtabs) ──
case 'datasets':
    $sql = 'SELECT * FROM kalsul_datasets';
    $params = [];
    if ($korlapStation) {
        $sql .= ' WHERE station = :st';
        $params[':st'] = $korlapStation;
    }
    $sql .= ' ORDER BY bulan DESC, periode DESC, station ASC';
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    jsonSuccess(['datasets' => $stmt->fetchAll()]);
    break;

// ── List employees ──
case 'list':
    $datasetId = (int)($_GET['dataset_id'] ?? 0);
    $search = trim($_GET['search'] ?? '');
    $sortBy = $_GET['sort_by'] ?? 'id';
    $sortDir = strtoupper($_GET['sort_dir'] ?? 'ASC') === 'DESC' ? 'DESC' : 'ASC';
    $rekFilter = $_GET['rek_status'] ?? '';
    $page = max(1, (int)($_GET['page'] ?? 1));
    $perPage = min(100, max(1, (int)($_GET['per_page'] ?? 50)));
    $offset = ($page - 1) * $perPage;

    $where = [];
    $params = [];

    if ($datasetId > 0) {
        $where[] = 'e.dataset_id = :did';
        $params[':did'] = $datasetId;
    }
    if ($search !== '') {
        $where[] = '(e.nama LIKE :s1 OR e.ops_id LIKE :s2)';
        $params[':s1'] = "%$search%";
        $params[':s2'] = "%$search%";
    }
    if ($korlapStation) {
        $where[] = 'e.station = :kst';
        $params[':kst'] = $korlapStation;
    }

    $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    // Allowed sort columns
    $allowedSort = ['id','ops_id','nama','station','hk','status'];
    $sortCol = in_array($sortBy, $allowedSort) ? "e.$sortBy" : 'e.id';

    // Count
    $countStmt = $db->prepare("SELECT COUNT(*) FROM kalsul_employees e $whereSql");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    // Fetch employees
    $sql = "SELECT e.* FROM kalsul_employees e $whereSql ORDER BY $sortCol $sortDir LIMIT :lim OFFSET :off";
    $stmt = $db->prepare($sql);
    foreach ($params as $k => $v) $stmt->bindValue($k, $v);
    $stmt->bindValue(':lim', $perPage, PDO::PARAM_INT);
    $stmt->bindValue(':off', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $employees = $stmt->fetchAll();

    // Enrich with latest rekening data
    $opsIds = array_column($employees, 'ops_id');
    $rekMap = [];
    $pergantianMap = [];

    if (!empty($opsIds)) {
        // Get latest rekening per ops_id
        $placeholders = implode(',', array_fill(0, count($opsIds), '?'));
        $rekStmt = $db->prepare("
            SELECT r1.* FROM kalsul_rekening r1
            INNER JOIN (
                SELECT ops_id, MAX(COALESCE(timestamp_gas, created_at)) as max_ts
                FROM kalsul_rekening GROUP BY ops_id
            ) r2 ON r1.ops_id = r2.ops_id AND COALESCE(r1.timestamp_gas, r1.created_at) = r2.max_ts
            WHERE r1.ops_id IN ($placeholders)
            GROUP BY r1.ops_id
        ");
        $rekStmt->execute($opsIds);
        foreach ($rekStmt->fetchAll() as $r) {
            $rekMap[$r['ops_id']] = $r;
        }

        // Check pergantian rek
        $pergStmt = $db->prepare("
            SELECT ops_id, COUNT(*) as cnt FROM kalsul_rekening
            WHERE source='link_pergantian_rek' AND ops_id IN ($placeholders)
            GROUP BY ops_id
        ");
        $pergStmt->execute($opsIds);
        foreach ($pergStmt->fetchAll() as $p) {
            $pergantianMap[$p['ops_id']] = (int)$p['cnt'];
        }
    }

    // Build result with rek_status
    $result = [];
    foreach ($employees as $emp) {
        $rek = $rekMap[$emp['ops_id']] ?? null;

        if (!$rek || empty($rek['no_rek'])) {
            $rekStatus = 'kosong';
        } else {
            // Fuzzy match nama vs atas_nama
            $namaClean = mb_strtoupper(trim($emp['nama']));
            $atasNamaClean = mb_strtoupper(trim($rek['atas_nama'] ?? ''));
            if ($atasNamaClean === '') {
                $rekStatus = 'kosong';
            } else {
                similar_text($namaClean, $atasNamaClean, $pct);
                $rekStatus = ($pct >= 80) ? 'done' : 'abnormal';
            }
        }

        // Clean no_rek (digits only)
        $noRekClean = $rek ? preg_replace('/[^0-9]/', '', $rek['no_rek'] ?? '') : '';
        $digitCount = strlen($noRekClean);

        $emp['rek_status'] = $rekStatus;
        $emp['rek_tanggal'] = $rek['timestamp_gas'] ?? $rek['created_at'] ?? null;
        $emp['no_rek'] = $noRekClean;
        $emp['rek_digit_count'] = $digitCount;
        $emp['bank'] = $rek['bank'] ?? '';
        $emp['atas_nama'] = $rek['atas_nama'] ?? '';
        $emp['no_hp'] = $rek['no_hp'] ?? '';
        $emp['nik'] = $rek['nik'] ?? '';
        $emp['alamat'] = $rek['alamat'] ?? '';
        $emp['has_pergantian'] = ($pergantianMap[$emp['ops_id']] ?? 0) > 0;
        $emp['pergantian_count'] = $pergantianMap[$emp['ops_id']] ?? 0;

        // Filter by rek_status
        if ($rekFilter !== '' && $rekStatus !== $rekFilter) continue;

        $result[] = $emp;
    }

    $filteredTotal = ($rekFilter !== '') ? count($result) : $total;

    jsonSuccess([
        'employees' => $result,
        'pagination' => [
            'total' => $filteredTotal,
            'page' => $page,
            'per_page' => $perPage,
            'total_pages' => (int)ceil($filteredTotal / $perPage),
        ],
    ]);
    break;

// ── Rekening history ──
case 'rekening_history':
    $opsId = trim($_GET['ops_id'] ?? '');
    if ($opsId === '') jsonError('ops_id required');

    $stmt = $db->prepare('SELECT * FROM kalsul_rekening WHERE ops_id = :oid ORDER BY COALESCE(timestamp_gas, created_at) DESC');
    $stmt->execute([':oid' => $opsId]);
    $rows = $stmt->fetchAll();

    // Clean no_rek
    foreach ($rows as &$r) {
        $r['no_rek'] = preg_replace('/[^0-9]/', '', $r['no_rek'] ?? '');
        $r['rek_digit_count'] = strlen($r['no_rek']);
    }

    jsonSuccess(['history' => $rows]);
    break;

// ── Get single ──
case 'get':
    $id = (int)($_GET['id'] ?? 0);
    if ($id <= 0) jsonError('Invalid ID');
    $stmt = $db->prepare('SELECT * FROM kalsul_employees WHERE id = :id LIMIT 1');
    $stmt->execute([':id' => $id]);
    $emp = $stmt->fetch();
    if (!$emp) jsonError('Not found', 404);
    jsonSuccess($emp);
    break;

// ── Stations ──
case 'stations':
    $stmt = $db->query("SELECT DISTINCT station FROM kalsul_employees WHERE station != '' ORDER BY station ASC");
    jsonSuccess(['stations' => $stmt->fetchAll(PDO::FETCH_COLUMN)]);
    break;

default:
    // PUT = update
    if ($method === 'PUT') {
        $body = getJsonBody();
        $id = (int)($body['id'] ?? 0);
        if ($id <= 0) jsonError('Invalid ID');

        $allowed = ['ops_id','nama','station','hk','status'];
        $sets = []; $params = [':id' => $id];
        foreach ($allowed as $f) {
            if (array_key_exists($f, $body)) {
                $sets[] = "`$f` = :$f";
                $params[":$f"] = trim((string)$body[$f]);
            }
        }
        if (empty($sets)) jsonError('No fields');
        $db->prepare('UPDATE kalsul_employees SET ' . implode(',', $sets) . ' WHERE id = :id')->execute($params);
        jsonSuccess(['updated' => $id]);
    }

    // DELETE
    if ($method === 'DELETE') {
        $body = getJsonBody();
        $id = (int)($body['id'] ?? 0);
        if ($id <= 0) jsonError('Invalid ID');
        $db->prepare('DELETE FROM kalsul_employees WHERE id = :id')->execute([':id' => $id]);
        jsonSuccess(['deleted' => $id]);
    }

    jsonError('Invalid action', 400);
}
