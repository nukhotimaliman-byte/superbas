<?php
/**
 * BAS Recruitment — Admin/Korlap API
 * GET    /api/admin.php                    — List candidates (filterable)
 * GET    /api/admin.php?id=X               — Single candidate detail
 * PUT    /api/admin.php                     — Update candidate status/notes
 * GET    /api/admin.php?audit=candidate_id  — Get audit trail
 * GET    /api/admin.php?locations=1         — Get all locations
 */
require_once __DIR__ . '/../config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $admin = requireAuth();
    $db = getDB();

    // ── Return Locations ────────────────────────
    if (isset($_GET['locations'])) {
        $stmt = $db->query('SELECT id, name, address, maps_link FROM locations ORDER BY id');
        jsonResponse(['locations' => $stmt->fetchAll()]);
    }

    // ── Return Audit Trail ──────────────────────
    if (isset($_GET['audit'])) {
        $candidateId = intval($_GET['audit']);
        $stmt = $db->prepare('
            SELECT admin_name, action, old_value, new_value, notes, created_at
            FROM audit_logs
            WHERE candidate_id = ?
            ORDER BY created_at DESC
        ');
        $stmt->execute([$candidateId]);
        jsonResponse(['audit' => $stmt->fetchAll()]);
    }

    // ── Single Candidate Detail ─────────────────
    if (isset($_GET['id'])) {
        $stmt = $db->prepare('
            SELECT c.*, l.name AS location_name, l.maps_link,
                   u.username AS user_username,
                   u.created_at AS user_created_at,
                   COALESCE(NULLIF(l.name, \'\'), NULLIF(c.interview_location, \'\')) AS display_location
            FROM candidates c
            LEFT JOIN locations l ON c.location_id = l.id
            LEFT JOIN users u ON c.user_id = u.id
            WHERE c.id = ?
        ');
        $stmt->execute([intval($_GET['id'])]);
        $candidate = $stmt->fetch();

        if (!$candidate) jsonResponse(['error' => 'Kandidat tidak ditemukan'], 404);

        // Get documents
        $stmt = $db->prepare('SELECT id, doc_type, file_path, original_name, file_size, uploaded_at FROM documents WHERE candidate_id = ?');
        $stmt->execute([$candidate['id']]);
        $docs = $stmt->fetchAll();

        jsonResponse(['candidate' => $candidate, 'documents' => $docs]);
    }

    // ── List Candidates ─────────────────────────
    $where = ['c.is_deleted = 0'];
    $params = [];


    // Korlap sees ALL candidates (same view as owner)
    // Edit restrictions are enforced in the PUT handler

    // Filter by location
    if (isset($_GET['location_id']) && $_GET['location_id'] !== '') {
        $where[] = 'c.location_id = ?';
        $params[] = intval($_GET['location_id']);
    }

    // Filter by status
    if (isset($_GET['status']) && $_GET['status'] !== '') {
        $where[] = 'c.status = ?';
        $params[] = $_GET['status'];
    }

    // Search by name or WA
    if (isset($_GET['search']) && $_GET['search'] !== '') {
        $search = '%' . $_GET['search'] . '%';
        $where[] = '(c.name LIKE ? OR c.whatsapp LIKE ?)';
        $params[] = $search;
        $params[] = $search;
    }

    $whereSQL = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

    $stmt = $db->prepare("
        SELECT c.*, l.name AS location_name,
        u.username AS user_username,
        u.created_at AS user_created_at,
        u.email AS user_email,
        u.name AS user_name,
        u.plain_password AS user_password,
        COALESCE(NULLIF(c.name, ''), u.name) AS display_name,
        COALESCE(NULLIF(c.email, ''), u.email) AS display_email,
        COALESCE(NULLIF(l.name, ''), NULLIF(c.interview_location, '')) AS display_location,
        (SELECT COUNT(*) FROM documents d WHERE d.candidate_id = c.id) AS doc_count
        FROM candidates c
        LEFT JOIN locations l ON c.location_id = l.id
        LEFT JOIN users u ON c.user_id = u.id
        {$whereSQL}
        ORDER BY c.created_at DESC
    ");
    $stmt->execute($params);
    $candidates = $stmt->fetchAll();

    // Merge display names into main fields for frontend
    foreach ($candidates as &$c) {
        if (empty($c['name']) && !empty($c['user_name'])) $c['name'] = $c['user_name'];
        if (empty($c['email']) && !empty($c['user_email'])) $c['email'] = $c['user_email'];
        if (empty($c['jadwal_interview']) && !empty($c['test_drive_date'])) {
            $c['jadwal_interview'] = $c['test_drive_date'] . ' ' . ($c['test_drive_time'] ?: '09:00:00');
        }
        // Security: hide plain password from non-owner roles
        if ($admin['role'] !== 'owner') {
            unset($c['user_password']);
        }
    }

    jsonResponse(['candidates' => $candidates, 'total' => count($candidates)]);

} elseif ($method === 'PUT') {
    // ── Update Candidate ────────────────────────
    $admin = requireAuth();
    $data = json_decode(file_get_contents('php://input'), true);

    $candidateId = intval($data['candidate_id'] ?? 0);
    if (!$candidateId) jsonResponse(['error' => 'Candidate ID required'], 400);

    $db = getDB();

    // ── Field Inline Edit ───────────────────────
    if (isset($data['field'])) {
        $field = $data['field'];
        $value = $data['value'] ?? '';

        // Korlap can only edit: status, test_drive_date, test_drive_time
        $korlapEditableFields = ['status', 'test_drive_date', 'test_drive_time'];
        if ($admin['role'] !== 'owner' && !in_array($field, $korlapEditableFields)) {
            jsonResponse(['error' => 'Hanya owner yang bisa mengedit field ini'], 403);
        }
        // Korlap: restrict which statuses they can set
        if ($admin['role'] !== 'owner' && $field === 'status') {
            $korlapAllowed = ['Sudah Pemberkasan', 'Menunggu Test Drive', 'Jadwal Test Drive', 'Hadir', 'Tidak Hadir', 'Lulus', 'Tidak Lulus'];
            if (!in_array($value, $korlapAllowed)) {
                jsonResponse(['error' => 'Status tidak valid untuk korlap'], 403);
            }
        }

        // Special: User account date (update users table)
        if ($field === 'user_created_at') {
            $cStmt = $db->prepare('SELECT user_id FROM candidates WHERE id = ?');
            $cStmt->execute([$candidateId]);
            $cRow = $cStmt->fetch();
            if (!$cRow || !$cRow['user_id']) {
                jsonResponse(['error' => 'Kandidat belum punya akun'], 400);
            }
            $db->prepare('UPDATE users SET created_at = ? WHERE id = ?')->execute([$value, $cRow['user_id']]);
            jsonResponse(['success' => true, 'message' => 'Tanggal akun diperbarui']);
        }

        // Special: User account fields (update users table)
        if ($field === 'user_username' || $field === 'user_password') {
            $cStmt = $db->prepare('SELECT user_id, nik, name FROM candidates WHERE id = ?');
            $cStmt->execute([$candidateId]);
            $cRow = $cStmt->fetch();
            if (!$cRow) jsonResponse(['error' => 'Kandidat tidak ditemukan'], 404);

            $userId = $cRow['user_id'];

            // Auto-create user account if none exists
            if (!$userId) {
                if ($field === 'user_username') {
                    // Will create account below in the user_username handler
                    $userId = null;
                } else {
                    jsonResponse(['error' => 'Set username terlebih dahulu untuk membuat akun'], 400);
                }
            }

            if ($field === 'user_username') {
                if (strlen($value) < 3) jsonResponse(['error' => 'Username minimal 3 karakter'], 400);
                // Check uniqueness
                $chk = $db->prepare('SELECT id FROM users WHERE username = ?' . ($userId ? ' AND id != ?' : ''));
                $chk->execute($userId ? [$value, $userId] : [$value]);
                if ($chk->fetch()) jsonResponse(['error' => 'Username sudah digunakan'], 400);
                $chk2 = $db->prepare('SELECT id FROM admins WHERE username = ?');
                $chk2->execute([$value]);
                if ($chk2->fetch()) jsonResponse(['error' => 'Username sudah digunakan'], 400);

                if (!$userId) {
                    // Create new user account with candidate data
                    $defaultPw = password_hash('password123', PASSWORD_DEFAULT);
                    $candidateNik = $cRow['nik'] ?: ('0000000000000000');
                    $candidateName = $cRow['name'] ?: 'User';
                    $db->prepare('INSERT INTO users (nik, username, password, plain_password, name, email) VALUES (?, ?, ?, ?, ?, ?)')
                       ->execute([$candidateNik, $value, $defaultPw, 'password123', $candidateName, '']);
                    $userId = $db->lastInsertId();
                    $db->prepare('UPDATE candidates SET user_id = ? WHERE id = ?')->execute([$userId, $candidateId]);

                    $auditStmt = $db->prepare('INSERT INTO audit_logs (candidate_id, admin_id, admin_name, action, old_value, new_value) VALUES (?, ?, ?, ?, ?, ?)');
                    $auditStmt->execute([$candidateId, $admin['id'], $admin['name'], 'Akun user dibuat', '-', $value . ' (pw: password123)']);
                    jsonResponse(['success' => true, 'message' => 'Akun user berhasil dibuat dengan password default: password123']);
                } else {
                    $old = $db->prepare('SELECT username FROM users WHERE id = ?');
                    $old->execute([$userId]);
                    $oldRow = $old->fetch();
                    $db->prepare('UPDATE users SET username = ? WHERE id = ?')->execute([$value, $userId]);

                    $auditStmt = $db->prepare('INSERT INTO audit_logs (candidate_id, admin_id, admin_name, action, old_value, new_value) VALUES (?, ?, ?, ?, ?, ?)');
                    $auditStmt->execute([$candidateId, $admin['id'], $admin['name'], 'Username diubah', $oldRow['username'] ?? '-', $value]);
                    jsonResponse(['success' => true, 'message' => 'Username berhasil diperbarui']);
                }
            }

            if ($field === 'user_password') {
                if (strlen($value) < 6) jsonResponse(['error' => 'Password minimal 6 karakter'], 400);
                $hashed = password_hash($value, PASSWORD_DEFAULT);
                $db->prepare('UPDATE users SET password = ?, plain_password = ? WHERE id = ?')->execute([$hashed, $value, $userId]);

                $auditStmt = $db->prepare('INSERT INTO audit_logs (candidate_id, admin_id, admin_name, action, old_value, new_value) VALUES (?, ?, ?, ?, ?, ?)');
                $auditStmt->execute([$candidateId, $admin['id'], $admin['name'], 'Password user direset oleh Owner', '****', '(diperbarui)']);
                jsonResponse(['success' => true, 'message' => 'Password user berhasil direset']);
            }
        }

        $allowedFields = [
            'given_id'           => 'ID Kandidat',
            'name'               => 'Nama',
            'nik'                => 'NIK',
            'whatsapp'           => 'WhatsApp',
            'email'              => 'Email',
            'sim_type'           => 'Jenis SIM',
            'armada_type'        => 'Armada',
            'status'             => 'Status',
            'tempat_lahir'       => 'Tempat Lahir',
            'tanggal_lahir'      => 'Tanggal Lahir',
            'address'            => 'Alamat',
            'pendidikan_terakhir'=> 'Pendidikan',
            'pernah_kerja_spx'   => 'Pernah Kerja SPX',
            'surat_sehat'        => 'Surat Sehat',
            'paklaring'          => 'Paklaring',
            'location_id'        => 'Lokasi',
            'test_drive_date'    => 'Tgl Test Drive',   // editable oleh korlap & owner
            'test_drive_time'    => 'Jam Test Drive',   // editable oleh korlap & owner
            // jadwal_interview deprecated — gunakan test_drive_date + test_drive_time
            'referensi'          => 'Referensi',
            'emergency_name'     => 'Nama Kontak Darurat',
            'emergency_phone'    => 'HP Kontak Darurat',
            'emergency_relation' => 'Hubungan Kontak Darurat',
        ];

        if (!isset($allowedFields[$field])) {
            jsonResponse(['error' => 'Field tidak valid'], 400);
        }

        $colStmt = $db->prepare("SELECT `{$field}` FROM candidates WHERE id = ?");
        $colStmt->execute([$candidateId]);
        $colRow = $colStmt->fetch();
        if (!$colRow) jsonResponse(['error' => 'Kandidat tidak ditemukan'], 404);
        $oldValue = $colRow[$field] ?? '-';

        $displayNew = $value ?: '-';
        $displayOld = $oldValue ?: '-';
        if ($field === 'location_id') {
            $locStmt = $db->prepare('SELECT name FROM locations WHERE id = ?');
            if ($oldValue) { $locStmt->execute([$oldValue]); $lr = $locStmt->fetch(); $displayOld = $lr['name'] ?? $oldValue; }
            if ($value)    { $locStmt->execute([$value]);    $lr = $locStmt->fetch(); $displayNew = $lr['name'] ?? $value; }
        }

        $updStmt = $db->prepare("UPDATE candidates SET `{$field}` = ? WHERE id = ?");
        $updStmt->execute([$value !== '' ? $value : null, $candidateId]);

        $auditStmt = $db->prepare('INSERT INTO audit_logs (candidate_id, admin_id, admin_name, action, old_value, new_value) VALUES (?, ?, ?, ?, ?, ?)');
        $auditStmt->execute([
            $candidateId, $admin['id'], $admin['name'],
            $allowedFields[$field] . ' diubah',
            mb_substr($displayOld, 0, 100),
            mb_substr($displayNew, 0, 100)
        ]);

        jsonResponse(['success' => true, 'message' => $allowedFields[$field] . ' berhasil diperbarui']);
    }

    // Get current data
    $stmt = $db->prepare('SELECT status, test_drive_date, korlap_notes FROM candidates WHERE id = ?');
    $stmt->execute([$candidateId]);
    $current = $stmt->fetch();
    if (!$current) jsonResponse(['error' => 'Kandidat tidak ditemukan'], 404);

    $updates = [];
    $params = [];
    $auditEntries = [];

    // Status change — hanya korlap dan owner
    if (isset($data['status']) && $data['status'] !== $current['status']) {
        $allowedRoles = ['owner', 'korlap', 'korlap_interview', 'korlap_td'];
        if (!in_array($admin['role'], $allowedRoles)) {
            jsonResponse(['error' => 'Tidak memiliki izin untuk mengubah status'], 403);
        }
        $validStatuses = ['Belum Pemberkasan', 'Sudah Pemberkasan', 'Menunggu Test Drive', 'Jadwal Test Drive', 'Hadir', 'Tidak Hadir', 'Lulus', 'Tidak Lulus'];
        if (!in_array($data['status'], $validStatuses)) {
            jsonResponse(['error' => 'Status tidak valid'], 400);
        }
        $updates[] = 'status = ?';
        $params[] = $data['status'];
        $auditEntries[] = [
            'action' => 'Status diubah',
            'old' => $current['status'],
            'new' => $data['status']
        ];
    }

    // Test drive date
    if (isset($data['test_drive_date'])) {
        $updates[] = 'test_drive_date = ?';
        $params[] = $data['test_drive_date'] ?: null;
        $auditEntries[] = [
            'action' => 'Jadwal Test Drive diubah',
            'old' => $current['test_drive_date'] ?? '-',
            'new' => $data['test_drive_date'] ?: '-'
        ];
    }

    // Korlap notes
    if (isset($data['korlap_notes'])) {
        $updates[] = 'korlap_notes = ?';
        $params[] = $data['korlap_notes'];
        $auditEntries[] = [
            'action' => 'Catatan diperbarui',
            'old' => mb_substr($current['korlap_notes'] ?? '', 0, 100),
            'new' => mb_substr($data['korlap_notes'], 0, 100)
        ];
    }

    if (empty($updates)) {
        jsonResponse(['error' => 'Tidak ada perubahan'], 400);
    }

    // Update candidate
    $params[] = $candidateId;
    $stmt = $db->prepare('UPDATE candidates SET ' . implode(', ', $updates) . ' WHERE id = ?');
    $stmt->execute($params);

    // Write audit logs
    foreach ($auditEntries as $entry) {
        $stmt = $db->prepare('INSERT INTO audit_logs (candidate_id, admin_id, admin_name, action, old_value, new_value) VALUES (?, ?, ?, ?, ?, ?)');
        $stmt->execute([$candidateId, $admin['id'], $admin['name'], $entry['action'], $entry['old'], $entry['new']]);
    }

    jsonResponse(['success' => true, 'message' => 'Data kandidat berhasil diperbarui']);

} elseif ($method === 'DELETE') {
    // ── Delete Candidates (Owner Only) ──────────
    $admin = requireOwner();
    $data = json_decode(file_get_contents('php://input'), true);
    $ids = $data['ids'] ?? [];

    if (empty($ids) || !is_array($ids)) {
        jsonResponse(['error' => 'ID tidak valid'], 400);
    }

    // Sanitize IDs
    $ids = array_map('intval', $ids);
    $ids = array_filter($ids, fn($id) => $id > 0);
    if (empty($ids)) jsonResponse(['error' => 'ID tidak valid'], 400);

    $db = getDB();
    $placeholders = implode(',', array_fill(0, count($ids), '?'));

    // Soft Delete: Get user_ids first to soft delete them too
    $stmtUserIds = $db->prepare("SELECT user_id FROM candidates WHERE id IN ($placeholders) AND user_id IS NOT NULL");
    $stmtUserIds->execute($ids);
    $userIds = $stmtUserIds->fetchAll(PDO::FETCH_COLUMN);
    
    // Soft delete candidates
    $stmt = $db->prepare("UPDATE candidates SET is_deleted = 1 WHERE id IN ($placeholders)");
    $stmt->execute($ids);
    $deleted = $stmt->rowCount();

    // Soft delete linked users to prevent them from logging in
    if (!empty($userIds)) {
        $userPlaceholders = implode(',', array_fill(0, count($userIds), '?'));
        $db->prepare("UPDATE users SET is_deleted = 1 WHERE id IN ($userPlaceholders)")->execute($userIds);
    }

    jsonResponse(['success' => true, 'message' => "$deleted kandidat berhasil dihapus secara soft-delete"]);

} elseif ($method === 'PATCH') {
    // ── Bulk Status Update (Admin / Owner) ──────
    $admin = requireAuth();
    $data  = json_decode(file_get_contents('php://input'), true);
    $ids   = $data['ids'] ?? [];
    $newStatus = trim($data['status'] ?? '');

    $validStatuses = [
        'Belum Pemberkasan','Sudah Pemberkasan','Menunggu Test Drive',
        'Jadwal Test Drive','Hadir','Tidak Hadir','Lulus','Tidak Lulus'
    ];

    if (empty($ids) || !is_array($ids)) jsonResponse(['error' => 'ID tidak valid'], 400);
    if (!in_array($newStatus, $validStatuses)) jsonResponse(['error' => 'Status tidak valid'], 400);

    // Role check: only owner and korlap can bulk-change status
    $allowedRoles = ['owner', 'korlap', 'korlap_interview', 'korlap_td'];
    if (!in_array($admin['role'], $allowedRoles)) {
        jsonResponse(['error' => 'Tidak memiliki izin untuk mengubah status massal'], 403);
    }

    $ids = array_filter(array_map('intval', $ids), fn($id) => $id > 0);
    if (empty($ids)) jsonResponse(['error' => 'ID tidak valid'], 400);


    $db = getDB();
    $placeholders = implode(',', array_fill(0, count($ids), '?'));

    // Get old statuses for audit
    $stmt = $db->prepare("SELECT id, status, name FROM candidates WHERE id IN ($placeholders)");
    $stmt->execute($ids);
    $oldRows = $stmt->fetchAll();

    // Bulk update
    $upd = $db->prepare("UPDATE candidates SET status = ? WHERE id IN ($placeholders)");
    $upd->execute(array_merge([$newStatus], $ids));
    $updated = $upd->rowCount();

    // Audit log each candidate
    $auditStmt = $db->prepare(
        'INSERT INTO audit_logs (candidate_id, admin_id, admin_name, action, old_value, new_value) VALUES (?, ?, ?, ?, ?, ?)'
    );
    foreach ($oldRows as $row) {
        $auditStmt->execute([$row['id'], $admin['id'], $admin['name'], 'Bulk Status Update', $row['status'], $newStatus]);
    }

    jsonResponse(['success' => true, 'message' => "$updated kandidat berhasil diubah statusnya ke \"$newStatus\""]);

} else {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

