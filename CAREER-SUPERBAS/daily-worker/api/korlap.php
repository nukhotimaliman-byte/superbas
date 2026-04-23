<?php
/**
 * BAS Recruitment — Korlap Management API (Owner only)
 * GET    ?action=list           — List all korlap accounts
 * POST   ?action=create         — Create new korlap
 * PUT    ?action=update         — Update korlap (inline edit)
 * DELETE ?action=delete&id=X    — Delete korlap
 */
require_once __DIR__ . '/../config.php';

$admin = requireAuth();
if ($admin['role'] !== 'owner') {
    jsonResponse(['error' => 'Forbidden — Owner only'], 403);
}

$db = getDB();
$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

switch ($action) {

    // ═══ LIST ALL KORLAP ═══════════════════════
    case 'list':
        $stmt = $db->query("
            SELECT a.id, a.username, a.name, a.role, a.location_id, a.plain_password,
                   l.name AS location_name
            FROM dw_admins a
            LEFT JOIN dw_locations l ON a.location_id = l.id
            WHERE a.role IN ('korlap','korlap_interview','korlap_td')
            ORDER BY a.id DESC
        ");
        $korlaps = $stmt->fetchAll();

        // Also get dw_locations for dropdowns
        $locations = $db->query('SELECT id, name FROM dw_locations ORDER BY id')->fetchAll();

        jsonResponse(['korlaps' => $korlaps,'locations' => $locations]);
        break;

    // ═══ CREATE KORLAP ═════════════════════════
    case 'create':
        if ($method !== 'POST') jsonResponse(['error' => 'POST required'], 405);

        $data = json_decode(file_get_contents('php://input'), true);
        $username   = trim($data['username'] ?? '');
        $name       = trim($data['name'] ?? '');
        $password   = $data['password'] ?? '';
        $role       = $data['role'] ?? '';
        $locationId = intval($data['location_id'] ?? 0);

        if (!$username || !$name || !$password || !$role) {
            jsonResponse(['error' => 'Semua field wajib diisi'], 400);
        }

        $validRoles = ['korlap_interview', 'korlap_td'];
        if (!in_array($role, $validRoles)) {
            jsonResponse(['error' => 'Role tidak valid'], 400);
        }

        if (strlen($username) < 3 || !preg_match('/^[a-zA-Z0-9_]+$/', $username)) {
            jsonResponse(['error' => 'Username minimal 3 karakter (huruf, angka, _)'], 400);
        }

        if (strlen($password) < 6) {
            jsonResponse(['error' => 'Password minimal 6 karakter'], 400);
        }

        // Check unique username
        $stmt = $db->prepare('SELECT id FROM dw_admins WHERE username = ?');
        $stmt->execute([$username]);
        if ($stmt->fetch()) {
            jsonResponse(['error' => 'Username sudah digunakan'], 400);
        }

        $stmt = $db->prepare('SELECT id FROM dw_users WHERE username = ?');
        $stmt->execute([$username]);
        if ($stmt->fetch()) {
            jsonResponse(['error' => 'Username sudah digunakan'], 400);
        }

        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $db->prepare('INSERT INTO dw_admins (username, password, plain_password, name, role, location_id) VALUES (?, ?, ?, ?, ?, ?)');
        $stmt->execute([$username, $hashedPassword, $password, $name, $role, $locationId ?: null]);

        jsonResponse(['success' => true, 'message' => 'Akun korlap berhasil dibuat', 'id' => $db->lastInsertId()], 201);
        break;

    // ═══ UPDATE KORLAP (inline edit) ═══════════
    case 'update':
        if ($method !== 'PUT') jsonResponse(['error' => 'PUT required'], 405);

        $data = json_decode(file_get_contents('php://input'), true);
        $id = intval($data['id'] ?? 0);
        if (!$id) jsonResponse(['error' => 'ID required'], 400);

        // Check exists and not owner
        $stmt = $db->prepare('SELECT role FROM dw_admins WHERE id = ?');
        $stmt->execute([$id]);
        $existing = $stmt->fetch();
        if (!$existing) jsonResponse(['error' => 'Akun tidak ditemukan'], 404);
        if ($existing['role'] === 'owner') jsonResponse(['error' => 'Tidak bisa mengubah akun owner'], 403);

        $updates = [];
        $params = [];

        // Name
        if (isset($data['name']) && trim($data['name'])) {
            $updates[] = 'name = ?';
            $params[] = trim($data['name']);
        }

        // Username
        if (isset($data['username']) && trim($data['username'])) {
            $newUsername = trim($data['username']);
            // Check unique
            $check = $db->prepare('SELECT id FROM dw_admins WHERE username = ? AND id != ?');
            $check->execute([$newUsername, $id]);
            if ($check->fetch()) {
                jsonResponse(['error' => 'Username sudah digunakan'], 400);
            }
            $updates[] = 'username = ?';
            $params[] = $newUsername;
        }

        // Role
        if (isset($data['role'])) {
            $validRoles = ['korlap_interview', 'korlap_td'];
            if (!in_array($data['role'], $validRoles)) {
                jsonResponse(['error' => 'Role tidak valid'], 400);
            }
            $updates[] = 'role = ?';
            $params[] = $data['role'];
        }

        // Location
        if (array_key_exists('location_id', $data)) {
            $updates[] = 'location_id = ?';
            $params[] = $data['location_id'] ? intval($data['location_id']) : null;
        }

        // Password
        if (isset($data['password']) && $data['password'] !== '') {
            if (strlen($data['password']) < 6) {
                jsonResponse(['error' => 'Password minimal 6 karakter'], 400);
            }
            $updates[] = 'password = ?, plain_password = ?';
            $params[] = password_hash($data['password'], PASSWORD_DEFAULT);
            $params[] = $data['password'];
        }

        if (empty($updates)) {
            jsonResponse(['error' => 'Tidak ada perubahan'], 400);
        }

        $params[] = $id;
        $db->prepare('UPDATE dw_admins SET ' . implode(', ', $updates) . ' WHERE id = ?')->execute($params);

        jsonResponse(['success' => true, 'message' => 'Akun korlap berhasil diperbarui']);
        break;

    // ═══ DELETE KORLAP ═════════════════════════
    case 'delete':
        if ($method !== 'DELETE') jsonResponse(['error' => 'DELETE required'], 405);

        $id = intval($_GET['id'] ?? 0);
        if (!$id) jsonResponse(['error' => 'ID required'], 400);

        $stmt = $db->prepare('SELECT role FROM dw_admins WHERE id = ?');
        $stmt->execute([$id]);
        $existing = $stmt->fetch();
        if (!$existing) jsonResponse(['error' => 'Akun tidak ditemukan'], 404);
        if ($existing['role'] === 'owner') jsonResponse(['error' => 'Tidak bisa menghapus akun owner'], 403);

        $db->prepare('DELETE FROM dw_admins WHERE id = ?')->execute([$id]);
        jsonResponse(['success' => true, 'message' => 'Akun korlap berhasil dihapus']);
        break;

    default:
        jsonResponse(['error' => 'Invalid action'], 400);
}
