<?php
/* Data KalSul — Auth API v2 */
require_once __DIR__ . '/config.php';

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

switch ($action) {
    case 'login':
        if ($method !== 'POST') jsonError('Method not allowed', 405);
        $body = getJsonBody();
        $username = trim($body['username'] ?? '');
        $password = $body['password'] ?? '';
        if ($username === '' || $password === '') jsonError('Username dan password harus diisi');

        $db = getDB();
        $stmt = $db->prepare('SELECT id, username, password_hash, name, role, station FROM kalsul_admins WHERE username = :u LIMIT 1');
        $stmt->execute([':u' => $username]);
        $admin = $stmt->fetch();
        if (!$admin || !password_verify($password, $admin['password_hash'])) jsonError('Username atau password salah', 401);

        $_SESSION['kalsul_admin_id'] = (int)$admin['id'];
        $_SESSION['kalsul_admin_name'] = $admin['name'];
        $_SESSION['kalsul_admin_role'] = $admin['role'];
        $_SESSION['kalsul_admin_station'] = $admin['station'];

        jsonSuccess(['user' => [
            'id' => (int)$admin['id'], 'name' => $admin['name'],
            'role' => $admin['role'], 'station' => $admin['station'],
        ]]);
        break;

    case 'logout':
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $p = session_get_cookie_params();
            setcookie(session_name(), '', time()-42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
        }
        session_destroy();
        jsonSuccess(['message' => 'Logged out']);
        break;

    case 'me':
        if (empty($_SESSION['kalsul_admin_id'])) jsonError('Unauthorized', 401);
        jsonSuccess(['user' => [
            'id' => $_SESSION['kalsul_admin_id'],
            'name' => $_SESSION['kalsul_admin_name'] ?? 'Admin',
            'role' => $_SESSION['kalsul_admin_role'] ?? 'admin',
            'station' => $_SESSION['kalsul_admin_station'] ?? null,
        ]]);
        break;

    default: jsonError('Invalid auth action', 400);
}
