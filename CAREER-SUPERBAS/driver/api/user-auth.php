<?php
/**
 * BAS Recruitment — Unified User Auth API
 * POST ?action=register        — Create account (NIK + username + email + password)
 * POST ?action=login            — Login (username OR NIK + password, checks admins then users)
 * POST ?action=google           — Login/Register via Google ID token
 * POST ?action=google-complete  — Complete Google registration (NIK + username + password)
 * POST ?action=forgot-password  — Reset password via NIK + email
 * GET  ?action=check            — Check session
 * POST ?action=logout           — Logout
 */
require_once __DIR__ . '/../config.php';

$action = $_GET['action'] ?? $_POST['action'] ?? '';

switch ($action) {

    // ═══════════════════════════════════════════
    // REGISTER
    // ═══════════════════════════════════════════
    case 'register':
        $data = json_decode(file_get_contents('php://input'), true);
        $nik      = trim($data['nik'] ?? '');
        $username = trim($data['username'] ?? '');
        $name     = trim($data['name'] ?? '');
        $email    = trim($data['email'] ?? '');
        $phone    = trim($data['phone'] ?? '');
        $password = $data['password'] ?? '';
        $address   = trim($data['address'] ?? '');
        $provinsi  = trim($data['provinsi'] ?? '');
        $kabupaten = trim($data['kabupaten'] ?? '');
        $kecamatan = trim($data['kecamatan'] ?? '');
        $kelurahan = trim($data['kelurahan'] ?? '');

        if (!$nik || !$username || !$name || !$email || !$phone || !$password) {
            jsonResponse(['error' => 'Semua field wajib diisi'], 400);
        }

        if (!preg_match('/^[0-9]{16}$/', $nik)) {
            jsonResponse(['error' => 'NIK harus 16 digit angka'], 400);
        }

        if (strlen($username) < 3 || strlen($username) > 50) {
            jsonResponse(['error' => 'Username harus 3-50 karakter'], 400);
        }

        if (!preg_match('/^[a-zA-Z0-9_]+$/', $username)) {
            jsonResponse(['error' => 'Username hanya boleh huruf, angka, dan underscore'], 400);
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            jsonResponse(['error' => 'Format email tidak valid'], 400);
        }

        if (strlen($password) < 6) {
            jsonResponse(['error' => 'Password minimal 6 karakter'], 400);
        }

        if (!preg_match('/^[0-9]{10,15}$/', $phone)) {
            jsonResponse(['error' => 'No. telepon harus 10-15 digit angka'], 400);
        }

        $db = getDB();

        $stmt = $db->prepare('SELECT reason FROM blacklists WHERE nik = ?');
        $stmt->execute([$nik]);
        if ($reason = $stmt->fetchColumn()) {
            jsonResponse(['error' => 'Pendaftaran Ditolak. NIK ini telah diblacklist. ' . ($reason ? 'Alasan: ' . $reason : '')], 403);
        }

        $stmt = $db->prepare('SELECT id FROM users WHERE nik = ?');
        $stmt->execute([$nik]);
        if ($stmt->fetch()) { jsonResponse(['error' => 'NIK sudah terdaftar'], 400); }

        $stmt = $db->prepare('SELECT id FROM users WHERE username = ?');
        $stmt->execute([$username]);
        if ($stmt->fetch()) { jsonResponse(['error' => 'Username sudah digunakan'], 400); }

        $stmt = $db->prepare('SELECT id FROM admins WHERE username = ?');
        $stmt->execute([$username]);
        if ($stmt->fetch()) { jsonResponse(['error' => 'Username sudah digunakan'], 400); }

        $stmt = $db->prepare('SELECT id FROM users WHERE email = ?');
        $stmt->execute([$email]);
        if ($stmt->fetch()) { jsonResponse(['error' => 'Email sudah terdaftar'], 400); }

        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $db->prepare('INSERT INTO users (nik, username, password, plain_password, name, email, phone) VALUES (?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([$nik, $username, $hashedPassword, $password, $name, $email, $phone]);
        $userId = $db->lastInsertId();

        // Auto-create candidate record with address
        $stmt = $db->prepare('INSERT INTO candidates (user_id, nik, name, whatsapp, address, provinsi, kabupaten, kecamatan, kelurahan, location_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([$userId, $nik, $name, $phone, $address, $provinsi, $kabupaten, $kecamatan, $kelurahan, null, 'Belum Pemberkasan']);

        $_SESSION['user_id']   = $userId;
        $_SESSION['user_name'] = $name;
        $_SESSION['user_role'] = 'user';

        jsonResponse([
            'success' => true,
            'user' => ['id' => $userId, 'name' => $name, 'role' => 'user']
        ], 201);
        break;

    // ═══════════════════════════════════════════
    // LOGIN (username OR NIK + password)
    // ═══════════════════════════════════════════
    case 'login':
        $data = json_decode(file_get_contents('php://input'), true);
        $identifier = trim($data['username'] ?? '');
        $password   = $data['password'] ?? '';

        if (!$identifier || !$password) {
            jsonResponse(['error' => 'Username/NIK dan password wajib diisi'], 400);
        }

        $db = getDB();

        // 1. Check admins table (username only)
        $stmt = $db->prepare('SELECT id, username, password, name, role, location_id FROM admins WHERE username = ?');
        $stmt->execute([$identifier]);
        $admin = $stmt->fetch();

        if ($admin && password_verify($password, $admin['password'])) {
            unset($_SESSION['user_id'], $_SESSION['user_name'], $_SESSION['user_role']);

            $_SESSION['admin_id']          = $admin['id'];
            $_SESSION['admin_name']        = $admin['name'];
            $_SESSION['admin_role']        = $admin['role'];
            $_SESSION['admin_location_id'] = $admin['location_id'];

            jsonResponse([
                'success' => true,
                'user' => [
                    'id'          => $admin['id'],
                    'name'        => $admin['name'],
                    'role'        => $admin['role'],
                    'location_id' => $admin['location_id']
                ]
            ]);
            break;
        }

        // 2. Check users table (username OR NIK)
        $stmt = $db->prepare('SELECT id, nik, username, password, name, picture, is_deleted FROM users WHERE username = ? OR nik = ?');
        $stmt->execute([$identifier, $identifier]);
        $user = $stmt->fetch();

        if ($user && $user['is_deleted']) {
            jsonResponse(['error' => 'Akun tidak ditemukan atau telah dihapus'], 403);
        }

        if ($user) {
            // Check blacklist just in case it was blacklisted after creation
            $stmt = $db->prepare('SELECT id FROM blacklists WHERE nik = ?');
            $stmt->execute([$user['nik']]);
            if ($stmt->fetch()) {
                jsonResponse(['error' => 'Akses Ditolak. NIK ini telah diblacklist.'], 403);
            }
        }

        if ($user && password_verify($password, $user['password'])) {
            $db->prepare('UPDATE users SET last_login = NOW() WHERE id = ?')->execute([$user['id']]);

            unset($_SESSION['admin_id'], $_SESSION['admin_name'], $_SESSION['admin_role'], $_SESSION['admin_location_id']);

            $_SESSION['user_id']   = $user['id'];
            $_SESSION['user_name'] = $user['name'];
            $_SESSION['user_role'] = 'user';

            jsonResponse([
                'success' => true,
                'user' => [
                    'id'      => $user['id'],
                    'name'    => $user['name'],
                    'role'    => 'user',
                    'picture' => $user['picture']
                ]
            ]);
            break;
        }

        jsonResponse(['error' => 'Username/NIK atau password salah'], 401);
        break;

    // ═══════════════════════════════════════════
    // FORGOT PASSWORD (verify NIK + email → set new password)
    // ═══════════════════════════════════════════
    case 'forgot-password':
        $data = json_decode(file_get_contents('php://input'), true);
        $nik         = trim($data['nik'] ?? '');
        $email       = trim($data['email'] ?? '');
        $newPassword = $data['new_password'] ?? '';

        if (!$nik || !$email || !$newPassword) {
            jsonResponse(['error' => 'NIK, email, dan password baru wajib diisi'], 400);
        }

        if (!preg_match('/^[0-9]{16}$/', $nik)) {
            jsonResponse(['error' => 'NIK harus 16 digit angka'], 400);
        }

        if (strlen($newPassword) < 6) {
            jsonResponse(['error' => 'Password baru minimal 6 karakter'], 400);
        }

        $db = getDB();

        // Find user by NIK AND email (both must match)
        $stmt = $db->prepare('SELECT id, username FROM users WHERE nik = ? AND email = ?');
        $stmt->execute([$nik, $email]);
        $user = $stmt->fetch();

        if (!$user) {
            jsonResponse(['error' => 'NIK dan email tidak cocok atau tidak terdaftar'], 404);
        }

        // Update password
        $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
        $db->prepare('UPDATE users SET password = ?, plain_password = ? WHERE id = ?')->execute([$hashedPassword, $newPassword, $user['id']]);

        jsonResponse([
            'success'  => true,
            'message'  => 'Password berhasil direset',
            'username' => $user['username']
        ]);
        break;

    // ═══════════════════════════════════════════
    // GOOGLE SIGN-IN
    // ═══════════════════════════════════════════
    case 'google':
        $data = json_decode(file_get_contents('php://input'), true);
        $credential = $data['credential'] ?? '';

        if (!$credential) {
            jsonResponse(['error' => 'Token Google tidak valid'], 400);
        }

        $verifyUrl = 'https://oauth2.googleapis.com/tokeninfo?id_token=' . urlencode($credential);
        $ch = curl_init($verifyUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200 || !$response) {
            jsonResponse(['error' => 'Verifikasi Google gagal'], 401);
        }

        $googleUser = json_decode($response, true);
        $googleId = $googleUser['sub'] ?? '';
        $email    = $googleUser['email'] ?? '';
        $name     = $googleUser['name'] ?? '';
        $picture  = $googleUser['picture'] ?? '';

        if (!$googleId || !$email) {
            jsonResponse(['error' => 'Data Google tidak lengkap'], 400);
        }

        $db = getDB();

        // Existing google_id user → login
        $stmt = $db->prepare('SELECT id, name, picture FROM users WHERE google_id = ?');
        $stmt->execute([$googleId]);
        $existing = $stmt->fetch();

        if ($existing) {
            $db->prepare('UPDATE users SET name = ?, email = ?, picture = ?, last_login = NOW() WHERE id = ?')
               ->execute([$name, $email, $picture, $existing['id']]);

            unset($_SESSION['admin_id'], $_SESSION['admin_name'], $_SESSION['admin_role'], $_SESSION['admin_location_id']);
            $_SESSION['user_id']   = $existing['id'];
            $_SESSION['user_name'] = $name;
            $_SESSION['user_role'] = 'user';

            jsonResponse([
                'success' => true,
                'user' => ['id' => $existing['id'], 'name' => $name, 'role' => 'user', 'picture' => $picture]
            ]);
            break;
        }

        // Existing email user → link google
        $stmt = $db->prepare('SELECT id FROM users WHERE email = ?');
        $stmt->execute([$email]);
        $emailUser = $stmt->fetch();

        if ($emailUser) {
            $db->prepare('UPDATE users SET google_id = ?, picture = ?, last_login = NOW() WHERE id = ?')
               ->execute([$googleId, $picture, $emailUser['id']]);

            unset($_SESSION['admin_id'], $_SESSION['admin_name'], $_SESSION['admin_role'], $_SESSION['admin_location_id']);
            $_SESSION['user_id']   = $emailUser['id'];
            $_SESSION['user_name'] = $name;
            $_SESSION['user_role'] = 'user';

            jsonResponse([
                'success' => true,
                'user' => ['id' => $emailUser['id'], 'name' => $name, 'role' => 'user', 'picture' => $picture]
            ]);
            break;
        }

        // New user → needs NIK
        jsonResponse([
            'success'    => false,
            'needsNik'   => true,
            'googleData' => [
                'google_id' => $googleId,
                'email'     => $email,
                'name'      => $name,
                'picture'   => $picture
            ]
        ]);
        break;

    // ═══════════════════════════════════════════
    // GOOGLE COMPLETE REGISTRATION
    // ═══════════════════════════════════════════
    case 'google-complete':
        $data = json_decode(file_get_contents('php://input'), true);
        $nik       = trim($data['nik'] ?? '');
        $username  = trim($data['username'] ?? '');
        $password  = $data['password'] ?? '';
        $phone     = trim($data['phone'] ?? '');
        $googleId  = $data['google_id'] ?? '';
        $email     = $data['email'] ?? '';
        $name      = $data['name'] ?? '';
        $picture   = $data['picture'] ?? '';

        if (!$nik || !$username || !$password || !$phone || !$googleId || !$email) {
            jsonResponse(['error' => 'Semua field wajib diisi'], 400);
        }

        if (!preg_match('/^[0-9]{16}$/', $nik)) {
            jsonResponse(['error' => 'NIK harus 16 digit angka'], 400);
        }

        if (!preg_match('/^[a-zA-Z0-9_]{3,50}$/', $username)) {
            jsonResponse(['error' => 'Username harus 3-50 karakter (huruf, angka, _)'], 400);
        }

        if (strlen($password) < 6) {
            jsonResponse(['error' => 'Password minimal 6 karakter'], 400);
        }

        if (!preg_match('/^[0-9]{10,15}$/', $phone)) {
            jsonResponse(['error' => 'No. telepon harus 10-15 digit angka'], 400);
        }

        $db = getDB();

        $stmt = $db->prepare('SELECT reason FROM blacklists WHERE nik = ?');
        $stmt->execute([$nik]);
        if ($reason = $stmt->fetchColumn()) {
            jsonResponse(['error' => 'Pendaftaran Ditolak. NIK ini telah diblacklist. ' . ($reason ? 'Alasan: ' . $reason : '')], 403);
        }

        $stmt = $db->prepare('SELECT id FROM users WHERE nik = ?');
        $stmt->execute([$nik]);
        if ($stmt->fetch()) { jsonResponse(['error' => 'NIK sudah terdaftar'], 400); }

        $stmt = $db->prepare('SELECT id FROM users WHERE username = ?');
        $stmt->execute([$username]);
        if ($stmt->fetch()) { jsonResponse(['error' => 'Username sudah digunakan'], 400); }

        $stmt = $db->prepare('SELECT id FROM admins WHERE username = ?');
        $stmt->execute([$username]);
        if ($stmt->fetch()) { jsonResponse(['error' => 'Username sudah digunakan'], 400); }

        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $db->prepare('INSERT INTO users (nik, username, password, plain_password, name, email, phone, google_id, picture) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([$nik, $username, $hashedPassword, $password, $name, $email, $phone, $googleId, $picture]);
        $userId = $db->lastInsertId();

        // Auto-create candidate record so user appears in admin dashboard
        $stmt = $db->prepare('INSERT INTO candidates (user_id, nik, name, whatsapp, location_id, status) VALUES (?, ?, ?, ?, ?, ?)');
        $stmt->execute([$userId, $nik, $name, $phone, null, 'Belum Pemberkasan']);

        unset($_SESSION['admin_id'], $_SESSION['admin_name'], $_SESSION['admin_role'], $_SESSION['admin_location_id']);
        $_SESSION['user_id']   = $userId;
        $_SESSION['user_name'] = $name;
        $_SESSION['user_role'] = 'user';

        jsonResponse([
            'success' => true,
            'user' => ['id' => $userId, 'name' => $name, 'role' => 'user', 'picture' => $picture]
        ], 201);
        break;

    // ═══════════════════════════════════════════
    // CHECK SESSION
    // ═══════════════════════════════════════════
    case 'check':
        if (!empty($_SESSION['admin_id'])) {
            jsonResponse([
                'authenticated' => true,
                'user' => [
                    'id'          => $_SESSION['admin_id'],
                    'name'        => $_SESSION['admin_name'],
                    'role'        => $_SESSION['admin_role'],
                    'location_id' => $_SESSION['admin_location_id'] ?? null
                ]
            ]);
        } elseif (!empty($_SESSION['user_id'])) {
            jsonResponse([
                'authenticated' => true,
                'user' => [
                    'id'   => $_SESSION['user_id'],
                    'name' => $_SESSION['user_name'],
                    'role' => $_SESSION['user_role'] ?? 'user'
                ]
            ]);
        } else {
            jsonResponse(['authenticated' => false]);
        }
        break;

    // ═══════════════════════════════════════════
    // LOGOUT
    // ═══════════════════════════════════════════
    case 'logout':
        session_destroy();
        jsonResponse(['success' => true]);
        break;

    default:
        jsonResponse(['error' => 'Invalid action'], 400);
}
