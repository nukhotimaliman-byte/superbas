<?php
/**
 * Data Kalsul - Authentication API
 * POST ?action=login   – login
 * POST ?action=logout  – logout
 * GET  ?action=me      – session check
 */

require_once __DIR__ . '/config.php';

$action = $_GET['action'] ?? '';
$method = getMethod();

switch ($action) {

    // ── Login ──
    case 'login':
        if ($method !== 'POST') jsonError('Method not allowed', 405);

        $body = getJsonBody();
        $username = trim($body['username'] ?? '');
        $password = $body['password'] ?? '';

        if ($username === '' || $password === '') {
            jsonError('Username and password are required');
        }

        $db = getDB();
        $stmt = $db->prepare('SELECT id, username, password, full_name FROM kalsul_admins WHERE username = :u LIMIT 1');
        $stmt->execute([':u' => $username]);
        $admin = $stmt->fetch();

        if (!$admin || !password_verify($password, $admin['password'])) {
            jsonError('Invalid username or password', 401);
        }

        // Set session
        $_SESSION['admin_id']       = (int)$admin['id'];
        $_SESSION['admin_username'] = $admin['username'];
        $_SESSION['admin_name']     = $admin['full_name'];

        jsonSuccess([
            'id'        => (int)$admin['id'],
            'username'  => $admin['username'],
            'full_name' => $admin['full_name'],
        ]);
        break;

    // ── Logout ──
    case 'logout':
        if ($method !== 'POST') jsonError('Method not allowed', 405);

        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $p = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000,
                $p['path'], $p['domain'], $p['secure'], $p['httponly']
            );
        }
        session_destroy();

        jsonSuccess(null, 200);
        break;

    // ── Session check ──
    case 'me':
        if ($method !== 'GET') jsonError('Method not allowed', 405);

        $admin = requireAuth();

        jsonSuccess([
            'id'        => $admin['id'],
            'username'  => $admin['username'],
            'full_name' => $_SESSION['admin_name'] ?? '',
        ]);
        break;

    default:
        jsonError('Invalid auth action', 400);
}
