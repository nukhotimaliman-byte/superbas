<?php
/**
 * BAS Recruitment — Blacklist API (Owner + Korlap)
 * GET  /api/blacklist.php — Get all blacklisted NIKs (owner + korlap)
 * POST /api/blacklist.php — Add NIK to blacklist (owner + korlap)
 * DELETE /api/blacklist.php — Remove NIK from blacklist (owner only)
 */
require_once __DIR__ . '/../config.php';

$admin = requireAuth();
$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // Owner + korlap can view blacklist
    $allowedRoles = ['owner', 'korlap', 'korlap_interview', 'korlap_td'];
    if (!in_array($admin['role'], $allowedRoles)) {
        jsonResponse(['error' => 'Forbidden'], 403);
    }
    $stmt = $db->query('
        SELECT b.id, b.nik, b.reason, b.created_at,
               a.name AS creator_name,
               c.name AS candidate_name
        FROM dw_blacklists b
        LEFT JOIN dw_admins a ON b.created_by = a.id
        LEFT JOIN dw_candidates c ON c.nik = b.nik
        ORDER BY b.created_at DESC
    ');
    jsonResponse(['blacklists' => $stmt->fetchAll()]);
}

if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $nik = trim($data['nik'] ?? '');
    $reason = trim($data['reason'] ?? '');

    if (!$nik || strlen($nik) !== 16 || !is_numeric($nik)) {
        jsonResponse(['error' => 'NIK harus berisi 16 digit angka'], 400);
    }
    if (!$reason) {
        jsonResponse(['error' => 'Alasan blacklist wajib diisi'], 400);
    }

    // Korlap & owner can blacklist
    $allowedRoles = ['owner', 'korlap', 'korlap_interview', 'korlap_td'];
    if (!in_array($admin['role'], $allowedRoles)) {
        jsonResponse(['error' => 'Akses ditolak'], 403);
    }

    try {
        $stmt = $db->prepare('INSERT INTO dw_blacklists (nik, reason, created_by) VALUES (?, ?, ?)');
        $stmt->execute([$nik, $reason, $admin['id']]);
        jsonResponse(['success' => true, 'message' => 'NIK berhasil diblacklist.']);
    } catch (PDOException $e) {
        if ($e->getCode() == 23000) {
            jsonResponse(['error' => 'NIK ini sudah ada di daftar blacklist'], 400);
        }
        jsonResponse(['error' => 'Gagal memproses data'], 500);
    }
}

if ($method === 'DELETE') {
    if ($admin['role'] !== 'owner') jsonResponse(['error' => 'Forbidden'], 403);
    $data = json_decode(file_get_contents('php://input'), true);
    $id = intval($data['id'] ?? 0);
    if (!$id) jsonResponse(['error' => 'ID tidak valid'], 400);

    $stmt = $db->prepare('DELETE FROM dw_blacklists WHERE id = ?');
    $stmt->execute([$id]);
    jsonResponse(['success' => true, 'message' => 'Blacklist berhasil dicabut']);
}

jsonResponse(['error' => 'Method not allowed'], 405);
