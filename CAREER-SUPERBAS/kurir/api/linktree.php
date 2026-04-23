<?php
/**
 * Linktree API V2 — CRUD with Grouping + SVG Icons
 * Public GET for beranda, Owner-only for modifications
 */
require_once __DIR__ . '/../config.php';

// Token-based auth fallback (when PHP session expired but admin cached in browser)
function requireLinktreeAuth() {
    // Try PHP session first
    if (!empty($_SESSION['admin_id']) && ($_SESSION['admin_role'] ?? '') === 'owner') {
        return;
    }
    // Fallback: check admin token from header
    $token = $_SERVER['HTTP_X_ADMIN_TOKEN'] ?? '';
    if ($token === 'bas-owner-2026') {
        return;
    }
    jsonResponse(['error' => 'Unauthorized'], 401);
}

$action = $_GET['action'] ?? '';
$TABLE  = 'krr_linktree';

// ── Public: get active links (for beranda) ──
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'list') {
    // Demo fallback data with groups (used when DB unreachable)
    $DEMO_LINKS = [
        // Standalone links (no group)
        ['id'=>1, 'title'=>'Tutorial Pendaftaran',  'url'=>'https://youtube.com',         'icon'=>'📹', 'icon_key'=>'youtube',    'description'=>'Video panduan lengkap cara mendaftar',   'group_name'=>null, 'group_order'=>0],
        ['id'=>2, 'title'=>'Cek Persyaratan',       'url'=>'#',                           'icon'=>'📋', 'icon_key'=>'clipboard',  'description'=>'Daftar dokumen yang perlu disiapkan',    'group_name'=>null, 'group_order'=>0],
        ['id'=>3, 'title'=>'Hubungi Admin',          'url'=>'https://wa.me/6281234567890', 'icon'=>'💬', 'icon_key'=>'whatsapp',   'description'=>'Chat langsung via WhatsApp',             'group_name'=>null, 'group_order'=>0],
        ['id'=>4, 'title'=>'Lokasi Interview',       'url'=>'https://maps.google.com',     'icon'=>'📍', 'icon_key'=>'map-pin',    'description'=>'Lihat peta lokasi rekrutmen',            'group_name'=>null, 'group_order'=>0],
        // Group: Jawa Barat
        ['id'=>5, 'title'=>'Grup WA Bandung',        'url'=>'https://chat.whatsapp.com/abc', 'icon'=>'💬', 'icon_key'=>'whatsapp', 'description'=>'Gabung grup info loker Bandung',         'group_name'=>'Jawa Barat',  'group_order'=>1],
        ['id'=>6, 'title'=>'Grup WA Bekasi',         'url'=>'https://chat.whatsapp.com/def', 'icon'=>'💬', 'icon_key'=>'whatsapp', 'description'=>'Gabung grup info loker Bekasi',          'group_name'=>'Jawa Barat',  'group_order'=>1],
        ['id'=>7, 'title'=>'Grup WA Depok',          'url'=>'https://chat.whatsapp.com/ghi', 'icon'=>'💬', 'icon_key'=>'whatsapp', 'description'=>'Gabung grup info loker Depok',           'group_name'=>'Jawa Barat',  'group_order'=>1],
        // Group: DKI Jakarta
        ['id'=>8, 'title'=>'Grup WA Jakarta Timur',  'url'=>'https://chat.whatsapp.com/jkl', 'icon'=>'💬', 'icon_key'=>'whatsapp', 'description'=>'Gabung grup info loker Jaktim',          'group_name'=>'DKI Jakarta', 'group_order'=>2],
        ['id'=>9, 'title'=>'Grup WA Jakarta Barat',  'url'=>'https://chat.whatsapp.com/mno', 'icon'=>'💬', 'icon_key'=>'whatsapp', 'description'=>'Gabung grup info loker Jakbar',          'group_name'=>'DKI Jakarta', 'group_order'=>2],
        // Group: Social Media
        ['id'=>10,'title'=>'Instagram BAS',          'url'=>'https://instagram.com/bas',      'icon'=>'📸', 'icon_key'=>'instagram','description'=>'Follow untuk update terbaru',            'group_name'=>'Social Media', 'group_order'=>3],
        ['id'=>11,'title'=>'TikTok BAS',             'url'=>'https://tiktok.com/@bas',        'icon'=>'🎵', 'icon_key'=>'tiktok',  'description'=>'Konten seru seputar driver BAS',         'group_name'=>'Social Media', 'group_order'=>3],
    ];
    try {
        $pdo = @(new PDO('mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4', DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]));
        $stmt = $pdo->query("SELECT id, title, url, icon, icon_key, description, group_name, group_order FROM {$TABLE} WHERE is_active = 1 ORDER BY group_order, group_name, sort_order, id");
        $links = $stmt->fetchAll(PDO::FETCH_ASSOC);
        jsonResponse(['ok' => true, 'links' => count($links) > 0 ? $links : $DEMO_LINKS]);
    } catch (Throwable $e) {
        jsonResponse(['ok' => true, 'links' => $DEMO_LINKS]);
    }
}

$pdo = getDB();

// ── All links for admin ──
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'all') {
    requireLinktreeAuth();
    try {
        $stmt = $pdo->query("SELECT * FROM {$TABLE} ORDER BY group_order, group_name, sort_order, id");
        jsonResponse(['ok' => true, 'links' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    } catch (Exception $e) {
        jsonResponse(['ok' => false, 'error' => $e->getMessage()], 500);
    }
}

// ── List distinct groups ──
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'groups') {
    requireLinktreeAuth();
    try {
        $stmt = $pdo->query("SELECT DISTINCT group_name, MIN(group_order) as group_order FROM {$TABLE} WHERE group_name IS NOT NULL AND group_name != '' GROUP BY group_name ORDER BY group_order, group_name");
        jsonResponse(['ok' => true, 'groups' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    } catch (Exception $e) {
        jsonResponse(['ok' => false, 'error' => $e->getMessage()], 500);
    }
}

// ── All modifications require auth ──
requireLinktreeAuth();

$input = json_decode(file_get_contents('php://input'), true) ?: [];

switch ($action) {

    // ── ADD link ──
    case 'add':
        $title      = trim($input['title'] ?? '');
        $url        = trim($input['url'] ?? '');
        $icon       = trim($input['icon'] ?? '🔗');
        $icon_key   = trim($input['icon_key'] ?? 'link');
        $desc       = trim($input['description'] ?? '');
        $group_name = trim($input['group_name'] ?? '') ?: null;
        $group_order= intval($input['group_order'] ?? 0);

        if (!$title || !$url) {
            jsonResponse(['ok' => false, 'error' => 'Judul dan URL wajib diisi']);
        }

        // Auto sort_order
        $stmt = $pdo->query("SELECT COALESCE(MAX(sort_order),0)+1 FROM {$TABLE}");
        $order = $stmt->fetchColumn();

        // If group exists, inherit its group_order
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

    // ── UPDATE link ──
    case 'update':
        $id         = intval($input['id'] ?? 0);
        $title      = trim($input['title'] ?? '');
        $url        = trim($input['url'] ?? '');
        $icon       = trim($input['icon'] ?? '🔗');
        $icon_key   = trim($input['icon_key'] ?? 'link');
        $desc       = trim($input['description'] ?? '');
        $group_name = trim($input['group_name'] ?? '') ?: null;
        $group_order= intval($input['group_order'] ?? 0);

        if (!$id || !$title || !$url) {
            jsonResponse(['ok' => false, 'error' => 'ID, judul, dan URL wajib']);
        }

        $stmt = $pdo->prepare("UPDATE {$TABLE} SET title=?, url=?, icon=?, icon_key=?, description=?, group_name=?, group_order=? WHERE id=?");
        $stmt->execute([$title, $url, $icon, $icon_key, $desc, $group_name, $group_order, $id]);

        jsonResponse(['ok' => true, 'message' => 'Link berhasil diperbarui']);
        break;

    // ── DELETE link ──
    case 'delete':
        $id = intval($input['id'] ?? 0);
        if (!$id) jsonResponse(['ok' => false, 'error' => 'ID wajib']);

        $stmt = $pdo->prepare("DELETE FROM {$TABLE} WHERE id = ?");
        $stmt->execute([$id]);

        jsonResponse(['ok' => true, 'message' => 'Link berhasil dihapus']);
        break;

    // ── TOGGLE active ──
    case 'toggle':
        $id = intval($input['id'] ?? 0);
        if (!$id) jsonResponse(['ok' => false, 'error' => 'ID wajib']);

        $stmt = $pdo->prepare("UPDATE {$TABLE} SET is_active = NOT is_active WHERE id = ?");
        $stmt->execute([$id]);

        jsonResponse(['ok' => true, 'message' => 'Status link diperbarui']);
        break;

    // ── REORDER links (batch) ──
    case 'reorder':
        $items = $input['items'] ?? [];
        if (empty($items)) jsonResponse(['ok' => false, 'error' => 'Data kosong']);

        $stmt = $pdo->prepare("UPDATE {$TABLE} SET sort_order = ? WHERE id = ?");
        foreach ($items as $item) {
            $stmt->execute([intval($item['sort_order']), intval($item['id'])]);
        }

        jsonResponse(['ok' => true, 'message' => 'Urutan berhasil diperbarui']);
        break;

    // ── REORDER groups ──
    case 'reorder-groups':
        $groups = $input['groups'] ?? [];
        if (empty($groups)) jsonResponse(['ok' => false, 'error' => 'Data kosong']);

        $stmt = $pdo->prepare("UPDATE {$TABLE} SET group_order = ? WHERE group_name = ?");
        foreach ($groups as $g) {
            $stmt->execute([intval($g['group_order']), $g['group_name']]);
        }

        jsonResponse(['ok' => true, 'message' => 'Urutan grup berhasil diperbarui']);
        break;

    // ── RENAME group ──
    case 'rename-group':
        $old_name = trim($input['old_name'] ?? '');
        $new_name = trim($input['new_name'] ?? '');
        if (!$old_name || !$new_name) jsonResponse(['ok' => false, 'error' => 'Nama lama dan baru wajib']);

        $stmt = $pdo->prepare("UPDATE {$TABLE} SET group_name = ? WHERE group_name = ?");
        $stmt->execute([$new_name, $old_name]);

        jsonResponse(['ok' => true, 'message' => 'Grup berhasil diubah nama']);
        break;

    // ── DELETE group (ungroup links, don't delete them) ──
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
