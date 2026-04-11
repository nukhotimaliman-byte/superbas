<?php
/**
 * BAS Recruitment — Locations API (Owner Only for Write)
 * GET  /api/locations.php — Get all locations
 * POST /api/locations.php — Create new location
 * DELETE /api/locations.php — Delete location
 */
require_once __DIR__ . '/../config.php';

$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

if ($method === 'GET') {
    // Public/Admin can get locations
    $stmt = $db->query('SELECT id, name, address, maps_link FROM locations ORDER BY id');
    jsonResponse(['locations' => $stmt->fetchAll()]);
}

// ── Owner Only from here ──
$admin = requireOwner();

if ($method === 'PUT') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = intval($data['id'] ?? 0);
    $maps_link = trim($data['maps_link'] ?? '');

    if (!$id) {
        jsonResponse(['error' => 'ID lokasi wajib diisi'], 400);
    }

    $stmt = $db->prepare('UPDATE locations SET maps_link = ? WHERE id = ?');
    $stmt->execute([$maps_link, $id]);
    jsonResponse(['success' => true, 'message' => 'Link Maps lokasi berhasil diperbarui']);
}

if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $name = trim($data['name'] ?? '');
    $address = trim($data['address'] ?? '');
    $maps_link = trim($data['maps_link'] ?? '');

    if (!$name || !$address) {
        jsonResponse(['error' => 'Nama lokasi dan alamat wajib diisi'], 400);
    }

    $stmt = $db->prepare('INSERT INTO locations (name, address, maps_link) VALUES (?, ?, ?)');
    $stmt->execute([$name, $address, $maps_link]);
    jsonResponse(['success' => true, 'message' => 'Lokasi berhasil ditambahkan', 'id' => $db->lastInsertId()]);
}

if ($method === 'DELETE') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = intval($data['id'] ?? 0);
    if (!$id) jsonResponse(['error' => 'ID tidak valid'], 400);

    // Check if used by candidates
    $stmt = $db->prepare('SELECT COUNT(*) FROM candidates WHERE location_id = ?');
    $stmt->execute([$id]);
    if ($stmt->fetchColumn() > 0) {
        jsonResponse(['error' => 'Tidak dapat menghapus lokasi karena sedang digunakan oleh kandidat'], 400);
    }

    $stmt = $db->prepare('DELETE FROM locations WHERE id = ?');
    $stmt->execute([$id]);
    jsonResponse(['success' => true, 'message' => 'Lokasi berhasil dihapus']);
}

jsonResponse(['error' => 'Method not allowed'], 405);
