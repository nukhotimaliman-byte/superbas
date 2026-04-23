<?php
/**
 * BAS Recruitment — Legacy Auth API
 * @deprecated Use /api/user-auth.php instead (supports NIK login, Google SSO, forgot password)
 * POST /api/auth.php?action=login   — Login (admin only)
 * POST /api/auth.php?action=logout  — Logout
 * GET  /api/auth.php?action=check    — Check session
 */
require_once __DIR__ . '/../config.php';

$action = $_GET['action'] ?? $_POST['action'] ?? '';

switch ($action) {
    case 'login':
        $data = json_decode(file_get_contents('php://input'), true);
        $username = trim($data['username'] ?? '');
        $password = $data['password'] ?? '';

        if (!$username || !$password) {
            jsonResponse(['error' => 'Username dan password wajib diisi'], 400);
        }

        $db = getDB();
        $stmt = $db->prepare('SELECT id, username, password, name, role, location_id FROM krr_admins WHERE username = ?');
        $stmt->execute([$username]);
        $admin = $stmt->fetch();

        if (!$admin || !password_verify($password, $admin['password'])) {
            jsonResponse(['error' => 'Username atau password salah'], 401);
        }

        $_SESSION['admin_id'] = $admin['id'];
        $_SESSION['admin_name'] = $admin['name'];
        $_SESSION['admin_role'] = $admin['role'];
        $_SESSION['admin_location_id'] = $admin['location_id'];

        jsonResponse([
            'success' => true,
            'admin' => [
                'id'   => $admin['id'],
                'name' => $admin['name'],
                'role' => $admin['role'],
                'location_id' => $admin['location_id']
            ]
        ]);
        break;

    case 'logout':
        session_destroy();
        jsonResponse(['success' => true]);
        break;

    case 'check':
        if (!empty($_SESSION['admin_id'])) {
            jsonResponse([
                'authenticated' => true,
                'admin' => [
                    'id'   => $_SESSION['admin_id'],
                    'name' => $_SESSION['admin_name'],
                    'role' => $_SESSION['admin_role'],
                    'location_id' => $_SESSION['admin_location_id'] ?? null
                ]
            ]);
        } else {
            jsonResponse(['authenticated' => false]);
        }
        break;

    default:
        jsonResponse(['error' => 'Invalid action'], 400);
}
