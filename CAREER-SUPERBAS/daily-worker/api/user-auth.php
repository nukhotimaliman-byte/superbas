<?php
/**
 * BAS Daily Worker — User Auth API (Terpisah dari Driver)
 * 
 * Menggunakan tabel users_dw sendiri, TIDAK terhubung dengan tabel Driver.
 * 
 * POST ?action=register        — Create DW account
 * POST ?action=login            — Login DW user (username OR NIK + password)
 * POST ?action=forgot-password  — Reset password via NIK + email
 * GET  ?action=check            — Check session
 * POST ?action=logout           — Logout
 */
require_once __DIR__ . '/config.php';

$action = $_GET['action'] ?? $_POST['action'] ?? '';

// Auto-create users_dw table if not exists
function ensureDwUsersTable(PDO $db): void {
    static $checked = false;
    if ($checked) return;
    $db->exec("CREATE TABLE IF NOT EXISTS users_dw (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nik VARCHAR(16) NOT NULL,
        username VARCHAR(50) NOT NULL,
        password VARCHAR(255) NOT NULL,
        plain_password VARCHAR(100) DEFAULT NULL,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) DEFAULT NULL,
        phone VARCHAR(20) DEFAULT NULL,
        google_id VARCHAR(100) DEFAULT NULL,
        picture TEXT DEFAULT NULL,
        is_blacklisted TINYINT(1) DEFAULT 0,
        is_deleted TINYINT(1) DEFAULT 0,
        last_login DATETIME DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_nik (nik),
        UNIQUE KEY uk_username (username)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $checked = true;
}

switch ($action) {

    // ═══════════════════════════════════════════
    // REGISTER (DW-specific)
    // ═══════════════════════════════════════════
    case 'register':
        $data = json_decode(file_get_contents('php://input'), true);
        $nik      = trim($data['nik'] ?? '');
        $username = strtoupper(trim($data['username'] ?? ''));
        $name     = trim($data['name'] ?? $data['nama'] ?? '');
        $email    = trim($data['email'] ?? '');
        $phone    = trim($data['phone'] ?? $data['telepon'] ?? $data['wa'] ?? '');
        $password = $data['password'] ?? $nik; // Default: NIK as password
        $station  = trim($data['station'] ?? '');

        if (!$nik || !$username || !$name || !$email || !$phone) {
            jsonResponse(['error' => 'Semua field wajib diisi'], 400);
        }
        if (!preg_match('/^[0-9]{16}$/', $nik)) {
            jsonResponse(['error' => 'NIK harus 16 digit angka'], 400);
        }
        if (strlen($username) < 3 || strlen($username) > 50) {
            jsonResponse(['error' => 'Username harus 3-50 karakter'], 400);
        }
        if (!preg_match('/^[A-Z0-9_\-]+$/', $username)) {
            jsonResponse(['error' => 'Username hanya boleh huruf, angka, underscore, dan strip'], 400);
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            jsonResponse(['error' => 'Format email tidak valid'], 400);
        }
        if (!preg_match('/^[0-9]{10,15}$/', $phone)) {
            jsonResponse(['error' => 'No. telepon harus 10-15 digit angka'], 400);
        }

        $db = getDB();
        ensureDwUsersTable($db);

        // Blacklist check
        $stmt = $db->prepare('SELECT reason FROM blacklists WHERE nik = ?');
        $stmt->execute([$nik]);
        if ($reason = $stmt->fetchColumn()) {
            jsonResponse(['error' => 'NIK telah diblacklist.' . ($reason ? ' Alasan: ' . $reason : '')], 403);
        }

        // Check duplicate NIK in DW users
        $stmt = $db->prepare('SELECT id FROM users_dw WHERE nik = ?');
        $stmt->execute([$nik]);
        if ($stmt->fetch()) { jsonResponse(['error' => 'NIK sudah terdaftar. Silakan login.'], 400); }

        // Check duplicate username in DW users
        $stmt = $db->prepare('SELECT id FROM users_dw WHERE username = ?');
        $stmt->execute([$username]);
        if ($stmt->fetch()) { jsonResponse(['error' => 'Username sudah digunakan'], 400); }

        // Check duplicate email in DW users
        if ($email) {
            $stmt = $db->prepare('SELECT id FROM users_dw WHERE email = ?');
            $stmt->execute([$email]);
            if ($stmt->fetch()) { jsonResponse(['error' => 'Email sudah terdaftar'], 400); }
        }

        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $db->prepare('INSERT INTO users_dw (nik, username, password, plain_password, name, email, phone) VALUES (?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([$nik, $username, $hashedPassword, $password, $name, $email, $phone]);
        $userId = $db->lastInsertId();

        // Auto-create candidate record
        $stmt = $db->prepare('INSERT INTO candidates_dw (user_id, nik, nama, nomor_telepon, station, status) VALUES (?, ?, ?, ?, ?, ?)');
        $stmt->execute([$userId, $nik, $name, $phone, $station, 'Belum Pemberkasan']);

        $_SESSION['user_id']   = $userId;
        $_SESSION['user_name'] = $name;
        $_SESSION['user_role'] = 'user';

        jsonResponse([
            'success' => true,
            'user' => [
                'id'      => (int) $userId,
                'name'    => $name,
                'nik'     => $nik,
                'opsId'   => $username,
                'station' => $station,
                'role'    => 'user'
            ]
        ], 201);
        break;

    // ═══════════════════════════════════════════
    // LOGIN (DW-specific: username OR NIK + password)
    // ═══════════════════════════════════════════
    case 'login':
        $data = json_decode(file_get_contents('php://input'), true);
        $identifier = strtoupper(trim($data['username'] ?? $data['opsId'] ?? ''));
        $password   = $data['password'] ?? $data['nik'] ?? '';

        if (!$identifier || !$password) {
            jsonResponse(['error' => 'Username/NIK dan password wajib diisi'], 400);
        }

        $db = getDB();
        ensureDwUsersTable($db);

        // Check DW users table only (NOT driver admins/users)
        $stmt = $db->prepare('
            SELECT u.id, u.nik, u.username, u.password, u.name, u.email, u.phone,
                   u.picture, u.is_blacklisted, u.is_deleted,
                   c.given_id AS ops_id, c.station, c.jabatan, c.status AS cand_status
            FROM users_dw u
            LEFT JOIN candidates_dw c ON c.user_id = u.id
            WHERE (u.username = ? OR u.nik = ?)
            LIMIT 1
        ');
        $stmt->execute([$identifier, $identifier]);
        $user = $stmt->fetch();

        if (!$user) {
            jsonResponse(['error' => 'Akun tidak ditemukan'], 401);
        }

        if ($user['is_deleted']) {
            jsonResponse(['error' => 'Akun telah dihapus'], 403);
        }

        if ($user['is_blacklisted']) {
            // Also check blacklist table
            $stmt = $db->prepare('SELECT id FROM blacklists WHERE nik = ?');
            $stmt->execute([$user['nik']]);
            if ($stmt->fetch()) {
                jsonResponse(['error' => 'Akses Ditolak. NIK ini telah diblacklist.'], 403);
            }
        }

        if (!password_verify($password, $user['password']) && $user['nik'] !== $password) {
            jsonResponse(['error' => 'Password atau NIK salah'], 401);
        }

        $db->prepare('UPDATE users_dw SET last_login = NOW() WHERE id = ?')->execute([$user['id']]);

        $_SESSION['user_id']   = $user['id'];
        $_SESSION['user_name'] = $user['name'];
        $_SESSION['user_role'] = 'user';

        jsonResponse([
            'success' => true,
            'user' => [
                'id'       => (int) $user['id'],
                'name'     => $user['name'],
                'nik'      => $user['nik'],
                'opsId'    => $user['ops_id'] ?: $user['username'],
                'email'    => $user['email'],
                'phone'    => $user['phone'],
                'station'  => $user['station'] ?? '',
                'position' => $user['jabatan'] ?? 'Daily Worker',
                'status'   => $user['cand_status'] ?? 'Aktif',
                'role'     => 'user',
                'picture'  => $user['picture'],
                'source'   => 'sql'
            ]
        ]);
        break;

    // ═══════════════════════════════════════════
    // FORGOT PASSWORD (DW-specific)
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
        ensureDwUsersTable($db);

        $stmt = $db->prepare('SELECT id, username FROM users_dw WHERE nik = ? AND email = ?');
        $stmt->execute([$nik, $email]);
        $user = $stmt->fetch();

        if (!$user) {
            jsonResponse(['error' => 'NIK dan email tidak cocok atau tidak terdaftar'], 404);
        }

        $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
        $db->prepare('UPDATE users_dw SET password = ?, plain_password = ? WHERE id = ?')
           ->execute([$hashedPassword, $newPassword, $user['id']]);

        jsonResponse([
            'success'  => true,
            'message'  => 'Password berhasil direset',
            'username' => $user['username']
        ]);
        break;

    // ═══════════════════════════════════════════
    // CHECK SESSION
    // ═══════════════════════════════════════════
    case 'check':
        if (!empty($_SESSION['user_id'])) {
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
