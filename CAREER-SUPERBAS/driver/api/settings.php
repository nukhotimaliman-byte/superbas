<?php
/**
 * Settings API — CRUD for dynamic dropdown options
 * Owner-only access for modifications, public GET for reading
 */
require_once __DIR__ . '/../config.php';

$pdo = getDB();

// ── Public endpoint: get all options (no auth needed) ──
if ($_SERVER['REQUEST_METHOD'] === 'GET' && ($_GET['action'] ?? '') === 'options') {
    try {
        $stmt = $pdo->query("SELECT * FROM dropdown_options ORDER BY category, sort_order, id");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $grouped = [];
        foreach ($rows as $r) {
            $grouped[$r['category']][] = $r;
        }
        jsonResponse(['ok' => true, 'options' => $grouped]);
    } catch (Exception $e) {
        jsonResponse(['ok' => false, 'error' => $e->getMessage()], 500);
    }
}

// ── All other actions require owner auth ──
if (empty($_SESSION['admin_id'])) {
    jsonResponse(['ok' => false, 'error' => 'Unauthorized'], 401);
}

// Check role
$stmt = $pdo->prepare("SELECT role FROM admins WHERE id = ?");
$stmt->execute([$_SESSION['admin_id']]);
$admin = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$admin || $admin['role'] !== 'owner') {
    jsonResponse(['ok' => false, 'error' => 'Hanya Owner yang bisa mengubah pengaturan'], 403);
}

$action = $_GET['action'] ?? '';
$input  = json_decode(file_get_contents('php://input'), true) ?: [];

switch ($action) {

    // ── ADD option ──
    case 'add':
        $cat   = trim($input['category'] ?? '');
        $label = trim($input['label'] ?? '');
        $value = trim($input['value'] ?? $label);
        $color = trim($input['color'] ?? '');
        $order = intval($input['sort_order'] ?? 0);

        if (!$cat || !$label) {
            jsonResponse(['ok' => false, 'error' => 'Kategori dan label wajib diisi']);
        }

        // Auto sort_order: put at end if not specified
        if ($order === 0) {
            $stmt = $pdo->prepare("SELECT COALESCE(MAX(sort_order),0)+1 FROM dropdown_options WHERE category = ?");
            $stmt->execute([$cat]);
            $order = $stmt->fetchColumn();
        }

        $stmt = $pdo->prepare("INSERT INTO dropdown_options (category, label, value, color, sort_order) VALUES (?,?,?,?,?)");
        $stmt->execute([$cat, $label, $value, $color, $order]);

        jsonResponse(['ok' => true, 'id' => $pdo->lastInsertId(), 'message' => 'Opsi berhasil ditambahkan']);
        break;

    // ── UPDATE option ──
    case 'update':
        $id    = intval($input['id'] ?? 0);
        $label = trim($input['label'] ?? '');
        $value = trim($input['value'] ?? $label);
        $color = trim($input['color'] ?? '');
        $order = intval($input['sort_order'] ?? 0);

        if (!$id || !$label) {
            jsonResponse(['ok' => false, 'error' => 'ID dan label wajib diisi']);
        }

        $stmt = $pdo->prepare("UPDATE dropdown_options SET label=?, value=?, color=?, sort_order=? WHERE id=?");
        $stmt->execute([$label, $value, $color, $order, $id]);

        jsonResponse(['ok' => true, 'message' => 'Opsi berhasil diperbarui']);
        break;

    // ── DELETE option ──
    case 'delete':
        $id = intval($input['id'] ?? 0);
        if (!$id) {
            jsonResponse(['ok' => false, 'error' => 'ID wajib']);
        }

        $stmt = $pdo->prepare("DELETE FROM dropdown_options WHERE id = ?");
        $stmt->execute([$id]);

        jsonResponse(['ok' => true, 'message' => 'Opsi berhasil dihapus']);
        break;

    // ── REORDER (batch update sort_order) ──
    case 'reorder':
        $items = $input['items'] ?? [];
        if (empty($items)) {
            jsonResponse(['ok' => false, 'error' => 'Data kosong']);
        }

        $stmt = $pdo->prepare("UPDATE dropdown_options SET sort_order = ? WHERE id = ?");
        foreach ($items as $item) {
            $stmt->execute([intval($item['sort_order']), intval($item['id'])]);
        }

        jsonResponse(['ok' => true, 'message' => 'Urutan berhasil diperbarui']);
        break;

    default:
        jsonResponse(['ok' => false, 'error' => 'Action tidak valid']);
}
