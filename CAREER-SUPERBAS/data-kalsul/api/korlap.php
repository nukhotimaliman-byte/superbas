<?php
/* Data KalSul — Korlap Management API */
require_once __DIR__ . '/config.php';
$user = requireAdmin(); // Only owner/admin

$action = $_GET['action'] ?? 'list';
$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

switch ($action) {

case 'list':
    $stmt = $db->query("SELECT id, username, name, role, station, created_at FROM kalsul_admins WHERE role = 'korlap' ORDER BY name ASC");
    jsonSuccess(['korlaps' => $stmt->fetchAll()]);
    break;

case 'create':
    if ($method !== 'POST') jsonError('Method not allowed', 405);
    $body = getJsonBody();
    $username = trim($body['username'] ?? '');
    $password = $body['password'] ?? '';
    $name = trim($body['name'] ?? '');
    $station = trim($body['station'] ?? '');

    if ($username === '' || $password === '' || $name === '') jsonError('Username, password, dan nama harus diisi');
    if (strlen($password) < 6) jsonError('Password minimal 6 karakter');

    // Check unique
    $check = $db->prepare("SELECT id FROM kalsul_admins WHERE username = :u LIMIT 1");
    $check->execute([':u' => $username]);
    if ($check->fetch()) jsonError('Username sudah digunakan');

    $stmt = $db->prepare("INSERT INTO kalsul_admins (username, password_hash, name, role, station) VALUES (:u, :p, :n, 'korlap', :s)");
    $stmt->execute([':u' => $username, ':p' => password_hash($password, PASSWORD_DEFAULT), ':n' => $name, ':s' => $station]);

    jsonSuccess(['id' => (int)$db->lastInsertId(), 'message' => 'Korlap berhasil ditambahkan']);
    break;

case 'update':
    if ($method !== 'PUT') jsonError('Method not allowed', 405);
    $body = getJsonBody();
    $id = (int)($body['id'] ?? 0);
    if ($id <= 0) jsonError('Invalid ID');

    // Verify it's a korlap
    $check = $db->prepare("SELECT id, role FROM kalsul_admins WHERE id = :id LIMIT 1");
    $check->execute([':id' => $id]);
    $existing = $check->fetch();
    if (!$existing) jsonError('Korlap not found', 404);
    if ($existing['role'] !== 'korlap') jsonError('Hanya bisa edit akun korlap');

    $sets = []; $params = [':id' => $id];
    if (isset($body['name']) && trim($body['name']) !== '') {
        $sets[] = 'name = :n'; $params[':n'] = trim($body['name']);
    }
    if (isset($body['station'])) {
        $sets[] = 'station = :s'; $params[':s'] = trim($body['station']);
    }
    if (!empty($body['password'])) {
        if (strlen($body['password']) < 6) jsonError('Password minimal 6 karakter');
        $sets[] = 'password_hash = :p'; $params[':p'] = password_hash($body['password'], PASSWORD_DEFAULT);
    }
    if (empty($sets)) jsonError('Tidak ada data yang diubah');

    $db->prepare('UPDATE kalsul_admins SET ' . implode(',', $sets) . ' WHERE id = :id')->execute($params);
    jsonSuccess(['message' => 'Korlap berhasil diupdate']);
    break;

case 'delete':
    if ($method !== 'DELETE') jsonError('Method not allowed', 405);
    $body = getJsonBody();
    $id = (int)($body['id'] ?? 0);
    if ($id <= 0) jsonError('Invalid ID');

    $check = $db->prepare("SELECT role FROM kalsul_admins WHERE id = :id LIMIT 1");
    $check->execute([':id' => $id]);
    $existing = $check->fetch();
    if (!$existing) jsonError('Not found', 404);
    if ($existing['role'] !== 'korlap') jsonError('Hanya bisa hapus akun korlap');

    $db->prepare("DELETE FROM kalsul_admins WHERE id = :id")->execute([':id' => $id]);
    jsonSuccess(['message' => 'Korlap berhasil dihapus']);
    break;

default: jsonError('Invalid action', 400);
}
