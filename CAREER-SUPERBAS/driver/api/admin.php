<?php
/**
 * BAS Driver — Admin API v3.3 (Schema-Verified)
 * 
 * Known DB schema (from debug 2026-04-09):
 *   candidates: id, given_id, candidate_id, user_id, name, nik, whatsapp, email, address,
 *               provinsi, kabupaten, kecamatan, kelurahan,
 *               referensi, tempat_lahir, tanggal_lahir, pendidikan_terakhir, pernah_kerja_spx,
 *               surat_sehat, paklaring, armada_type, sim_type, location_id, status,
 *               test_drive_date, jadwal_interview, test_drive_time, korlap_notes,
 *               is_deleted, created_at, emergency_name, emergency_phone, emergency_relation,
 *               interview_location, photo_data, signature_data
 *   users:      id, username, password, plain_password, name, email, phone, google_id,
 *               picture, is_blacklisted, created_at, last_login
 *   locations:  id, name, address, maps_link
 */
require_once __DIR__ . '/../config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $admin = requireAuth();
    $db    = getDB();

    // ── Return Locations ──────────────────────────────────────────────
    if (isset($_GET['locations'])) {
        try {
            $stmt = $db->query('SELECT id, name, address, maps_link FROM locations ORDER BY id');
            jsonResponse(['locations' => $stmt->fetchAll()]);
        } catch (PDOException $e) {
            jsonResponse(['locations' => [], 'error' => $e->getMessage()]);
        }
    }

    // ── Return Audit Trail ────────────────────────────────────────────
    if (isset($_GET['audit'])) {
        $cid = intval($_GET['audit']);
        try {
            $stmt = $db->prepare('SELECT admin_name, action, old_value, new_value, notes, created_at FROM audit_logs WHERE candidate_id = ? ORDER BY created_at DESC');
            $stmt->execute([$cid]);
            jsonResponse(['audit' => $stmt->fetchAll()]);
        } catch (PDOException $e) {
            jsonResponse(['audit' => []]);
        }
    }

    // ── Single Candidate Detail ───────────────────────────────────────
    if (isset($_GET['id'])) {
        try {
            $stmt = $db->prepare("
                SELECT c.id, c.given_id, c.candidate_id, c.user_id,
                       c.name, c.nik, c.whatsapp, c.email, c.address,
                       c.provinsi, c.kabupaten, c.kecamatan, c.kelurahan,
                       c.referensi, c.tempat_lahir, c.tanggal_lahir,
                       c.pendidikan_terakhir, c.pernah_kerja_spx,
                       c.surat_sehat, c.paklaring,
                       c.armada_type, c.sim_type, c.location_id,
                       c.status, c.test_drive_date, c.jadwal_interview,
                       c.test_drive_time, c.korlap_notes,
                       c.is_deleted, c.created_at,
                       c.emergency_name, c.emergency_phone, c.emergency_relation,
                       c.bank_name, c.bank_account_no, c.bank_account_name,
                       c.interview_location,
                       u.id          AS user_id,
                       u.username    AS user_username,
                       u.plain_password AS user_password,
                       u.created_at  AS user_created_at,
                       COALESCE(l.name,'')      AS location_name,
                       COALESCE(l.name,'')      AS display_location,
                       COALESCE(l.maps_link,'') AS maps_link
                FROM candidates c
                LEFT JOIN locations l ON c.location_id = l.id
                LEFT JOIN users     u ON c.user_id = u.id
                WHERE c.id = ?
            ");
            $stmt->execute([intval($_GET['id'])]);
            $candidate = $stmt->fetch();
            if (!$candidate) jsonResponse(['error' => 'Kandidat tidak ditemukan'], 404);

            // Documents
            try {
                $ds = $db->prepare('SELECT id, doc_type, file_path, original_name, file_size, uploaded_at FROM documents WHERE candidate_id = ?');
                $ds->execute([$candidate['id']]);
                $docs = $ds->fetchAll();
            } catch (PDOException $e) { $docs = []; }

            jsonResponse(['candidate' => $candidate, 'documents' => $docs]);
        } catch (PDOException $e) {
            jsonResponse(['error' => 'Detail error: ' . $e->getMessage()], 500);
        }
    }

    // ── List Candidates (MAIN) ────────────────────────────────────────
    $where  = [];
    $params = [];

    if (!empty($_GET['location_id'])) {
        $where[]  = 'c.location_id = ?';
        $params[] = intval($_GET['location_id']);
    }
    if (!empty($_GET['status'])) {
        $where[]  = 'c.status = ?';
        $params[] = trim($_GET['status']);
    }
    if (!empty($_GET['search'])) {
        $s        = '%' . trim($_GET['search']) . '%';
        $where[]  = '(c.name LIKE ? OR c.whatsapp LIKE ?)';
        $params[] = $s;
        $params[] = $s;
    }

    $whereSQL = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

    try {
        // Explicitly list columns — EXCLUDE photo_data and signature_data (BLOB)
        $stmt = $db->prepare("
            SELECT c.id, c.given_id, c.candidate_id, c.user_id,
                   c.name, c.nik, c.whatsapp, c.email, c.address,
                   c.provinsi, c.kabupaten, c.kecamatan, c.kelurahan,
                   c.referensi, c.tempat_lahir, c.tanggal_lahir,
                   c.pendidikan_terakhir, c.pernah_kerja_spx,
                   c.surat_sehat, c.paklaring,
                   c.armada_type, c.sim_type, c.location_id,
                   c.status, c.test_drive_date, c.jadwal_interview,
                   c.test_drive_time, c.korlap_notes,
                   c.is_deleted, c.created_at,
                   c.emergency_name, c.emergency_phone, c.emergency_relation,
                   c.bank_name, c.bank_account_no, c.bank_account_name,
                   c.interview_location,
                   u.id             AS user_id,
                   u.username       AS user_username,
                   u.plain_password AS user_password,
                   u.created_at    AS user_created_at,
                   COALESCE(l.name,'')      AS location_name,
                   COALESCE(l.name,'')      AS display_location,
                   COALESCE(l.maps_link,'') AS maps_link
            FROM candidates c
            LEFT JOIN locations l ON c.location_id = l.id
            LEFT JOIN users     u ON c.user_id = u.id
            {$whereSQL}
            ORDER BY c.created_at DESC
        ");
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (PDOException $e) {
        jsonResponse(['error' => 'Query error: ' . $e->getMessage(), 'candidates' => []], 500);
        exit;
    }

    // Merge display helpers
    foreach ($rows as &$r) {
        if (empty($r['name'])  && !empty($r['user_name']))  $r['name']  = $r['user_name'];
        if (empty($r['email']) && !empty($r['user_email'])) $r['email'] = $r['user_email'];
        // Security: hide plain_password from non-owner
        if ($admin['role'] !== 'owner') {
            $r['user_password'] = null;
        }
    }
    unset($r);

    jsonResponse(['candidates' => $rows, 'total' => count($rows)]);

} elseif ($method === 'PUT') {
    // ── Update Candidate ──────────────────────────────────────────────
    $admin = requireAuth();
    $data  = json_decode(file_get_contents('php://input'), true) ?: [];

    $candidateId = intval($data['candidate_id'] ?? 0);
    if (!$candidateId) jsonResponse(['error' => 'Candidate ID required'], 400);

    $db = getDB();

    // All editable fields on candidates table
    $allowed = [
        'given_id','name','nik','whatsapp','email','address',
        'provinsi','kabupaten','kecamatan','kelurahan',
        'referensi','tempat_lahir','tanggal_lahir',
        'pendidikan_terakhir','pernah_kerja_spx',
        'surat_sehat','paklaring',
        'armada_type','sim_type','location_id',
        'status','test_drive_date','test_drive_time',
        'jadwal_interview','korlap_notes',
        'emergency_name','emergency_phone','emergency_relation',
        'bank_name','bank_account_no','bank_account_name',
        'interview_location','is_deleted',
        'user_username'
    ];

    // Korlap can only update these
    $korlapOnly = ['status','test_drive_date','test_drive_time','korlap_notes'];

    $isOwner = ($admin['role'] === 'owner');

    // Support TWO formats:
    // Format A (inline editor): { candidate_id, field, value }
    // Format B (batch):         { candidate_id, fieldName1: val, fieldName2: val, ... }
    $updates = [];
    if (isset($data['field']) && array_key_exists('value', $data)) {
        // Format A — single field edit from spreadsheet UI
        $updates[$data['field']] = $data['value'];
    } else {
        // Format B — multiple fields
        foreach ($data as $k => $v) {
            if ($k !== 'candidate_id') $updates[$k] = $v;
        }
    }

    $sets = [];
    $vals = [];

    foreach ($allowed as $field) {
        if (!array_key_exists($field, $updates)) continue;
        if (!$isOwner && !in_array($field, $korlapOnly)) continue;
        $sets[] = "`{$field}` = ?";
        $vals[] = $updates[$field];
    }

    if (empty($sets)) jsonResponse(['error' => 'No valid fields to update'], 400);

    $vals[] = $candidateId;

    try {
        // Get old values for audit
        $old = $db->prepare('SELECT * FROM candidates WHERE id = ?');
        $old->execute([$candidateId]);
        $oldRow = $old->fetch();

        $stmt = $db->prepare('UPDATE candidates SET ' . implode(', ', $sets) . ' WHERE id = ?');
        $stmt->execute($vals);

        // Audit log
        try {
            $changed = [];
            foreach ($allowed as $f) {
                if (array_key_exists($f, $updates) && ($isOwner || in_array($f, $korlapOnly))) {
                    $changed[$f] = ['from' => ($oldRow[$f] ?? ''), 'to' => $updates[$f]];
                }
            }
            $log = $db->prepare('INSERT INTO audit_logs (candidate_id, admin_name, action, old_value, new_value) VALUES (?,?,?,?,?)');
            $log->execute([$candidateId, $admin['name'], 'update', json_encode($oldRow ? array_intersect_key($oldRow, $updates) : []), json_encode($changed)]);
        } catch (PDOException $e) {} // audit_logs might not exist

        jsonResponse(['success' => true, 'updated' => count($sets)]);
    } catch (PDOException $e) {
        jsonResponse(['error' => 'Update error: ' . $e->getMessage()], 500);
    }

} elseif ($method === 'POST') {
    // ── POST actions ─────────────────────────────────────────────────
    $admin = requireAuth();
    $data  = json_decode(file_get_contents('php://input'), true) ?: [];
    $action = $data['action'] ?? $_GET['action'] ?? '';
    $db = getDB();

    // ── Blacklist ────
    if ($action === 'blacklist') {
        $nik    = trim($data['nik']    ?? '');
        $name   = trim($data['name']   ?? '');
        $reason = trim($data['reason'] ?? '');
        if (!$nik) jsonResponse(['error' => 'NIK required'], 400);

        try {
            $stmt = $db->prepare('INSERT INTO blacklists (nik, name, reason, created_by) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE reason=VALUES(reason), updated_at=NOW()');
            $stmt->execute([$nik, $name, $reason, $admin['name']]);
            jsonResponse(['success' => true]);
        } catch (PDOException $e) {
            jsonResponse(['error' => $e->getMessage()], 500);
        }
    }

    // ── Create Korlap ────
    if ($action === 'create_korlap') {
        if ($admin['role'] !== 'owner') jsonResponse(['error' => 'Forbidden'], 403);
        $username = trim($data['username'] ?? '');
        $password = $data['password'] ?? '';
        $name     = trim($data['name'] ?? '');
        $locId    = intval($data['location_id'] ?? 0);
        $role     = $data['role'] ?? 'korlap';

        if (!$username || !$password || !$name) jsonResponse(['error' => 'Missing fields'], 400);

        try {
            $hash = password_hash($password, PASSWORD_DEFAULT);
            $stmt = $db->prepare('INSERT INTO admins (username, password, name, role, location_id) VALUES (?,?,?,?,?)');
            $stmt->execute([$username, $hash, $name, $role, $locId ?: null]);
            jsonResponse(['success' => true, 'id' => $db->lastInsertId()]);
        } catch (PDOException $e) {
            jsonResponse(['error' => $e->getMessage()], 500);
        }
    }

    // ── Reset User Password ────
    if ($action === 'reset_password') {
        if ($admin['role'] !== 'owner') jsonResponse(['error' => 'Forbidden'], 403);
        $candidateId = intval($data['candidate_id'] ?? 0);
        if (!$candidateId) jsonResponse(['error' => 'Candidate ID required'], 400);

        try {
            $c = $db->prepare('SELECT user_id FROM candidates WHERE id = ?');
            $c->execute([$candidateId]);
            $row = $c->fetch();
            if (!$row || !$row['user_id']) jsonResponse(['error' => 'No user linked'], 400);

            $newPw   = $data['new_password'] ?? 'bas' . rand(1000, 9999);
            $hash    = password_hash($newPw, PASSWORD_DEFAULT);
            $stmt    = $db->prepare('UPDATE users SET password = ?, plain_password = ? WHERE id = ?');
            $stmt->execute([$hash, $newPw, $row['user_id']]);

            jsonResponse(['success' => true, 'new_password' => $newPw]);
        } catch (PDOException $e) {
            jsonResponse(['error' => $e->getMessage()], 500);
        }
    }

    // ── Delete Korlap ────
    if ($action === 'delete_korlap') {
        if ($admin['role'] !== 'owner') jsonResponse(['error' => 'Forbidden'], 403);
        $kid = intval($data['id'] ?? 0);
        if (!$kid) jsonResponse(['error' => 'ID required'], 400);

        try {
            $db->prepare('DELETE FROM admins WHERE id = ? AND role != ?')->execute([$kid, 'owner']);
            jsonResponse(['success' => true]);
        } catch (PDOException $e) {
            jsonResponse(['error' => $e->getMessage()], 500);
        }
    }

    // ── List Korlaps ────
    if ($action === 'list_korlaps') {
        try {
            $stmt = $db->query("SELECT id, username, name, role, location_id, created_at FROM admins WHERE role != 'owner' ORDER BY id");
            jsonResponse(['korlaps' => $stmt->fetchAll()]);
        } catch (PDOException $e) {
            jsonResponse(['korlaps' => []]);
        }
    }

    // ── List Blacklists ────
    if ($action === 'list_blacklists') {
        try {
            $stmt = $db->query('SELECT id, nik, name, reason, created_by, created_at FROM blacklists ORDER BY created_at DESC');
            jsonResponse(['blacklists' => $stmt->fetchAll()]);
        } catch (PDOException $e) {
            jsonResponse(['blacklists' => []]);
        }
    }

    // ── Delete Blacklist ────
    if ($action === 'delete_blacklist') {
        $bid = intval($data['id'] ?? 0);
        if (!$bid) jsonResponse(['error' => 'ID required'], 400);
        try {
            $db->prepare('DELETE FROM blacklists WHERE id = ?')->execute([$bid]);
            jsonResponse(['success' => true]);
        } catch (PDOException $e) {
            jsonResponse(['error' => $e->getMessage()], 500);
        }
    }

    // ── Create/Update Location ────
    if ($action === 'create_location' || $action === 'update_location') {
        if ($admin['role'] !== 'owner') jsonResponse(['error' => 'Forbidden'], 403);
        $lname = trim($data['name'] ?? '');
        $laddr = trim($data['address'] ?? '');
        $lmap  = trim($data['maps_link'] ?? '');
        if (!$lname) jsonResponse(['error' => 'Name required'], 400);

        try {
            if ($action === 'create_location') {
                $stmt = $db->prepare('INSERT INTO locations (name, address, maps_link) VALUES (?,?,?)');
                $stmt->execute([$lname, $laddr, $lmap]);
                jsonResponse(['success' => true, 'id' => $db->lastInsertId()]);
            } else {
                $lid = intval($data['id'] ?? 0);
                if (!$lid) jsonResponse(['error' => 'ID required'], 400);
                $stmt = $db->prepare('UPDATE locations SET name=?, address=?, maps_link=? WHERE id=?');
                $stmt->execute([$lname, $laddr, $lmap, $lid]);
                jsonResponse(['success' => true]);
            }
        } catch (PDOException $e) {
            jsonResponse(['error' => $e->getMessage()], 500);
        }
    }

    // ── Delete Location ────
    if ($action === 'delete_location') {
        if ($admin['role'] !== 'owner') jsonResponse(['error' => 'Forbidden'], 403);
        $lid = intval($data['id'] ?? 0);
        if (!$lid) jsonResponse(['error' => 'ID required'], 400);
        try {
            $db->prepare('DELETE FROM locations WHERE id = ?')->execute([$lid]);
            jsonResponse(['success' => true]);
        } catch (PDOException $e) {
            jsonResponse(['error' => $e->getMessage()], 500);
        }
    }

    jsonResponse(['error' => 'Unknown action'], 400);

} elseif ($method === 'DELETE') {
    // ── Delete Candidate (owner only) ────────────────────────────────
    $admin = requireAuth();
    if ($admin['role'] !== 'owner') jsonResponse(['error' => 'Forbidden'], 403);

    $data = json_decode(file_get_contents('php://input'), true) ?: [];
    $id   = intval($data['id'] ?? $_GET['id'] ?? 0);
    if (!$id) jsonResponse(['error' => 'ID required'], 400);

    $db = getDB();
    try {
        $db->prepare('UPDATE candidates SET is_deleted = 1 WHERE id = ?')->execute([$id]);
        jsonResponse(['success' => true]);
    } catch (PDOException $e) {
        jsonResponse(['error' => $e->getMessage()], 500);
    }

} else {
    jsonResponse(['error' => 'Method not allowed'], 405);
}
