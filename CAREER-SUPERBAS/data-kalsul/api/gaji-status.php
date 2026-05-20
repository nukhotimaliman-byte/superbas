<?php
/**
 * Data Kalsul - Gaji Status API
 * GET  ?action=summary  – overall completion %
 * GET  (default)        – count of filled
 * POST ?action=sync     – sync from GAS
 */

require_once __DIR__ . '/config.php';

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

// POST sync from GAS (token-based, no session needed)
if ($method === 'POST' && $action === 'sync') {
    $body = getJsonBody();
    $token = $body['token'] ?? '';
    
    if ($token !== 'kalsul-sync-2026') {
        jsonError('Invalid sync token', 403);
    }
    
    $data = $body['data'] ?? [];
    if (empty($data)) jsonError('No data provided');
    
    $db = getDB();
    $updated = 0;
    $skipped = 0;
    
    $stmt = $db->prepare('UPDATE kalsul_employees SET gaji_link_filled = :filled WHERE ops_id = :ops_id');
    
    foreach ($data as $item) {
        $opsId = trim($item['ops_id'] ?? '');
        if (!$opsId) { $skipped++; continue; }
        
        $filled = !empty($item['filled']) ? 1 : 0;
        $stmt->execute([':filled' => $filled, ':ops_id' => $opsId]);
        
        if ($stmt->rowCount() > 0) {
            $updated++;
        } else {
            $skipped++;
        }
    }
    
    jsonSuccess(['updated' => $updated, 'skipped' => $skipped]);
}

// GET endpoints require auth
if (empty($_SESSION['kalsul_admin_id'])) {
    jsonError('Unauthorized', 401);
}

$db = getDB();

// Get employees for GAS pull
if ($action === 'employees') {
    $token = $_GET['token'] ?? '';
    if ($token !== 'kalsul-sync-2026') {
        jsonError('Invalid token', 403);
    }
    
    $stmt = $db->query('SELECT ops_id, nama FROM kalsul_employees ORDER BY ops_id ASC');
    $employees = $stmt->fetchAll();
    
    http_response_code(200);
    echo json_encode(['employees' => $employees], JSON_UNESCAPED_UNICODE);
    exit;
}

// Default: count filled
$total = (int)$db->query('SELECT COUNT(*) FROM kalsul_employees')->fetchColumn();
$filled = (int)$db->query('SELECT COUNT(*) FROM kalsul_employees WHERE gaji_link_filled = 1')->fetchColumn();

http_response_code(200);
echo json_encode([
    'total'   => $total,
    'filled'  => $filled,
    'unfilled' => $total - $filled,
    'percentage' => $total > 0 ? round(($filled / $total) * 100) : 0,
], JSON_UNESCAPED_UNICODE);
exit;
