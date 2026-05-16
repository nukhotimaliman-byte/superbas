<?php
/**
 * BAS Shared Linktree API — Owner Command Center
 * Shared table 'bas_linktree' serves all projects (DW, Driver, Kurir)
 * CRUD, grouping, toggle, reorder
 */
require_once __DIR__ . '/../config.php';

$action = $_GET['action'] ?? '';
$TABLE  = 'bas_linktree';

// ── Public: get active links (for all project beranda) ──
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'list') {
    try {
        $pdo = getDB();

        // Auto-create table if not exists
        $pdo->exec("CREATE TABLE IF NOT EXISTS `{$TABLE}` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `title` VARCHAR(255) NOT NULL,
            `url` TEXT NOT NULL,
            `icon` VARCHAR(10) DEFAULT '🔗',
            `icon_key` VARCHAR(50) DEFAULT 'link',
            `description` TEXT,
            `group_name` VARCHAR(100) DEFAULT NULL,
            `group_order` INT DEFAULT 0,
            `sort_order` INT DEFAULT 0,
            `is_active` TINYINT(1) DEFAULT 1,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        $stmt = $pdo->query("SELECT id, title, url, icon, icon_key, description, group_name, group_order 
                             FROM {$TABLE} WHERE is_active = 1 
                             ORDER BY group_order, group_name, sort_order, id");
        $links = $stmt->fetchAll(PDO::FETCH_ASSOC);
        jsonResponse(['ok' => true, 'links' => $links]);
    } catch (Throwable $e) {
        jsonResponse(['ok' => true, 'links' => []]);
    }
}

// ── All modifications require owner auth ──
$owner = requireOwnerAuth();
$pdo   = getDB();

// Auto-create table
$pdo->exec("CREATE TABLE IF NOT EXISTS `{$TABLE}` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `title` VARCHAR(255) NOT NULL,
    `url` TEXT NOT NULL,
    `icon` VARCHAR(10) DEFAULT '🔗',
    `icon_key` VARCHAR(50) DEFAULT 'link',
    `description` TEXT,
    `group_name` VARCHAR(100) DEFAULT NULL,
    `group_order` INT DEFAULT 0,
    `sort_order` INT DEFAULT 0,
    `is_active` TINYINT(1) DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

// ── All links for admin ──
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'all') {
    $stmt = $pdo->query("SELECT * FROM {$TABLE} ORDER BY group_order, group_name, sort_order, id");
    jsonResponse(['ok' => true, 'links' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
}

// ── Groups ──
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'groups') {
    $stmt = $pdo->query("SELECT DISTINCT group_name, MIN(group_order) as group_order 
                         FROM {$TABLE} WHERE group_name IS NOT NULL AND group_name != '' 
                         GROUP BY group_name ORDER BY group_order, group_name");
    jsonResponse(['ok' => true, 'groups' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
}

$input = json_decode(file_get_contents('php://input'), true) ?: [];

switch ($action) {

    // ── ADD ──
    case 'add':
        $title      = trim($input['title'] ?? '');
        $url        = trim($input['url'] ?? '');
        $icon       = trim($input['icon'] ?? '🔗');
        $icon_key   = trim($input['icon_key'] ?? 'link');
        $desc       = trim($input['description'] ?? '');
        $group_name = trim($input['group_name'] ?? '') ?: null;
        $group_order= intval($input['group_order'] ?? 0);

        if (!$title || !$url) jsonResponse(['ok' => false, 'error' => 'Judul dan URL wajib diisi']);

        $stmt = $pdo->query("SELECT COALESCE(MAX(sort_order),0)+1 FROM {$TABLE}");
        $order = $stmt->fetchColumn();

        if ($group_name && $group_order === 0) {
            $stmt = $pdo->prepare("SELECT MIN(group_order) FROM {$TABLE} WHERE group_name = ?");
            $stmt->execute([$group_name]);
            $existing = $stmt->fetchColumn();
            if ($existing !== false) $group_order = intval($existing);
        }

        $stmt = $pdo->prepare("INSERT INTO {$TABLE} (title, url, icon, icon_key, description, group_name, group_order, sort_order) VALUES (?,?,?,?,?,?,?,?)");
        $stmt->execute([$title, $url, $icon, $icon_key, $desc, $group_name, $group_order, $order]);
        jsonResponse(['ok' => true, 'id' => $pdo->lastInsertId(), 'message' => 'Link berhasil ditambahkan']);
        break;

    // ── UPDATE ──
    case 'update':
        $id         = intval($input['id'] ?? 0);
        $title      = trim($input['title'] ?? '');
        $url        = trim($input['url'] ?? '');
        $icon       = trim($input['icon'] ?? '🔗');
        $icon_key   = trim($input['icon_key'] ?? 'link');
        $desc       = trim($input['description'] ?? '');
        $group_name = trim($input['group_name'] ?? '') ?: null;
        $group_order= intval($input['group_order'] ?? 0);

        if (!$id || !$title || !$url) jsonResponse(['ok' => false, 'error' => 'ID, judul, dan URL wajib']);

        $stmt = $pdo->prepare("UPDATE {$TABLE} SET title=?, url=?, icon=?, icon_key=?, description=?, group_name=?, group_order=? WHERE id=?");
        $stmt->execute([$title, $url, $icon, $icon_key, $desc, $group_name, $group_order, $id]);
        jsonResponse(['ok' => true, 'message' => 'Link berhasil diperbarui']);
        break;

    // ── DELETE ──
    case 'delete':
        $id = intval($input['id'] ?? 0);
        if (!$id) jsonResponse(['ok' => false, 'error' => 'ID wajib']);
        $stmt = $pdo->prepare("DELETE FROM {$TABLE} WHERE id = ?");
        $stmt->execute([$id]);
        jsonResponse(['ok' => true, 'message' => 'Link berhasil dihapus']);
        break;

    // ── TOGGLE ──
    case 'toggle':
        $id = intval($input['id'] ?? 0);
        if (!$id) jsonResponse(['ok' => false, 'error' => 'ID wajib']);
        $stmt = $pdo->prepare("UPDATE {$TABLE} SET is_active = NOT is_active WHERE id = ?");
        $stmt->execute([$id]);
        jsonResponse(['ok' => true, 'message' => 'Status link diperbarui']);
        break;

    // ── RENAME GROUP ──
    case 'rename-group':
        $old = trim($input['old_name'] ?? '');
        $new = trim($input['new_name'] ?? '');
        if (!$old || !$new) jsonResponse(['ok' => false, 'error' => 'Nama lama dan baru wajib']);
        $stmt = $pdo->prepare("UPDATE {$TABLE} SET group_name = ? WHERE group_name = ?");
        $stmt->execute([$new, $old]);
        jsonResponse(['ok' => true, 'message' => 'Grup berhasil diubah nama']);
        break;

    // ── DELETE GROUP (ungroup, don't delete) ──
    case 'delete-group':
        $name = trim($input['group_name'] ?? '');
        if (!$name) jsonResponse(['ok' => false, 'error' => 'Nama grup wajib']);
        $stmt = $pdo->prepare("UPDATE {$TABLE} SET group_name = NULL, group_order = 0 WHERE group_name = ?");
        $stmt->execute([$name]);
        jsonResponse(['ok' => true, 'message' => 'Grup dihapus, link menjadi standalone']);
        break;

    default:
        jsonResponse(['ok' => false, 'error' => 'Action tidak valid']);
}
