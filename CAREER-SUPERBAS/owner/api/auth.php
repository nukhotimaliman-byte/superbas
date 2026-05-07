<?php
/**
 * BAS Super Owner — Auth API
 * POST ?action=login   — { username, password }
 * POST ?action=logout
 * GET  ?action=check   — Verify session
 */
require_once __DIR__ . '/../config.php';

$action = $_GET['action'] ?? '';

switch ($action) {

    case 'login':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            jsonResponse(['error' => 'Method not allowed'], 405);
        }
        $input = json_decode(file_get_contents('php://input'), true);
        $username = trim($input['username'] ?? '');
        $password = $input['password'] ?? '';

        if (!$username || !$password) {
            jsonResponse(['error' => 'Username dan password harus diisi'], 400);
        }

        $db = getDB();

        // Check in drv_admins for owner role
        $stmt = $db->prepare('SELECT id, name, username, password, role FROM drv_admins WHERE username = ? AND role = ? LIMIT 1');
        $stmt->execute([$username, 'owner']);
        $admin = $stmt->fetch();

        if (!$admin) {
            jsonResponse(['error' => 'Username tidak ditemukan atau bukan owner'], 401);
        }

        // Verify password (support both hashed and plain)
        $valid = false;
        if (password_verify($password, $admin['password'])) {
            $valid = true;
        } elseif ($admin['password'] === $password) {
            $valid = true;
            // Upgrade to hashed password
            $hashed = password_hash($password, PASSWORD_DEFAULT);
            $db->prepare('UPDATE drv_admins SET password = ? WHERE id = ?')->execute([$hashed, $admin['id']]);
        }

        if (!$valid) {
            jsonResponse(['error' => 'Password salah'], 401);
        }

        $_SESSION['owner_id'] = $admin['id'];
        $_SESSION['owner_name'] = $admin['name'];
        $_SESSION['owner_role'] = $admin['role'];

        jsonResponse([
            'success' => true,
            'name' => $admin['name'],
            'role' => $admin['role']
        ]);
        break;

    case 'logout':
        session_destroy();
        jsonResponse(['success' => true]);
        break;

    case 'check':
        if (!empty($_SESSION['owner_id'])) {
            jsonResponse([
                'logged_in' => true,
                'name' => $_SESSION['owner_name'],
                'role' => $_SESSION['owner_role']
            ]);
        } else {
            jsonResponse(['logged_in' => false]);
        }
        break;

    default:
        jsonResponse(['error' => 'Invalid action'], 400);
}
