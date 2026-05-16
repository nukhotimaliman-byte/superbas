<?php
/**
 * Site Config API — dw_config key-value store
 * Manages Link Gaji & Link Ganti Rekening settings
 * 
 * GET  ?action=get_links          → Public: returns link_gaji + link_gantirek
 * GET  ?action=get&key=...        → Public: returns single config value
 * POST ?action=set                → Owner-only: set config key
 * GET  ?action=setup              → Create table + seed initial data
 */

require_once __DIR__ . '/../config.php';

$action = $_GET['action'] ?? 'get_links';

// ═══════════════════════════════════════
// SETUP — Create table + seed
// ═══════════════════════════════════════
if ($action === 'setup') {
    try {
        $db = getDB();
        $db->exec("CREATE TABLE IF NOT EXISTS dw_config (
            id INT AUTO_INCREMENT PRIMARY KEY,
            config_key VARCHAR(100) NOT NULL,
            config_value TEXT,
            sort_order INT DEFAULT 0,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uk_config_key (config_key)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        
        // Seed initial link_gaji if not exists
        $s = $db->prepare("SELECT id FROM dw_config WHERE config_key = 'link_gaji'");
        $s->execute();
        if (!$s->fetch()) {
            $initialGaji = json_encode([
                [
                    'area' => 'Kalimantan & Sulawesi',
                    'link' => 'https://linktr.ee/REGISTRASI_BAS',
                    'desc' => 'Linktree BAS Registrasi — Semua station area KalSul',
                    'sort' => 1
                ]
            ], JSON_UNESCAPED_UNICODE);
            $s = $db->prepare("INSERT INTO dw_config (config_key, config_value) VALUES ('link_gaji', ?)");
            $s->execute([$initialGaji]);
        }
        
        // Seed empty link_gantirek if not exists
        $s = $db->prepare("SELECT id FROM dw_config WHERE config_key = 'link_gantirek'");
        $s->execute();
        if (!$s->fetch()) {
            $s = $db->prepare("INSERT INTO dw_config (config_key, config_value) VALUES ('link_gantirek', '[]')");
            $s->execute();
        }
        
        jsonResponse(['success' => true, 'message' => 'Config table created and seeded']);
    } catch(Exception $e) {
        jsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
    }
}

// ═══════════════════════════════════════
// GET LINKS — Public endpoint for user dashboard
// ═══════════════════════════════════════
if ($action === 'get_links') {
    try {
        $db = getDB();
        $s = $db->prepare("SELECT config_key, config_value FROM dw_config WHERE config_key IN ('link_gaji', 'link_gantirek')");
        $s->execute();
        $rows = $s->fetchAll();
        
        $result = ['link_gaji' => [], 'link_gantirek' => []];
        foreach ($rows as $row) {
            $val = json_decode($row['config_value'], true);
            if (is_array($val)) {
                usort($val, function($a, $b) {
                    return ($a['sort'] ?? 99) - ($b['sort'] ?? 99);
                });
                $result[$row['config_key']] = $val;
            }
        }
        
        jsonResponse(['success' => true, 'data' => $result]);
    } catch(Exception $e) {
        jsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
    }
}

// ═══════════════════════════════════════
// GET — Single config key
// ═══════════════════════════════════════
if ($action === 'get') {
    $key = $_GET['key'] ?? '';
    if (!$key) jsonResponse(['error' => 'Missing key'], 400);
    
    try {
        $db = getDB();
        $s = $db->prepare("SELECT config_value FROM dw_config WHERE config_key = ?");
        $s->execute([$key]);
        $row = $s->fetch();
        
        if (!$row) jsonResponse(['success' => true, 'value' => null]);
        
        $val = json_decode($row['config_value'], true);
        jsonResponse(['success' => true, 'value' => $val !== null ? $val : $row['config_value']]);
    } catch(Exception $e) {
        jsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
    }
}

// ═══════════════════════════════════════
// SET — Owner-only: update config
// ═══════════════════════════════════════
if ($action === 'set') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonResponse(['error' => 'POST required'], 405);
    
    // Owner auth via session
    $admin = requireOwner();
    
    $data = json_decode(file_get_contents('php://input'), true);
    $key = $data['key'] ?? '';
    $value = $data['value'] ?? null;
    
    if (!$key) jsonResponse(['error' => 'Missing key'], 400);
    if ($value === null) jsonResponse(['error' => 'Missing value'], 400);
    
    // Only allow specific keys
    $allowedKeys = ['link_gaji', 'link_gantirek'];
    if (!in_array($key, $allowedKeys)) jsonResponse(['error' => 'Key not allowed'], 400);
    
    try {
        $db = getDB();
        $jsonValue = is_string($value) ? $value : json_encode($value, JSON_UNESCAPED_UNICODE);
        
        $s = $db->prepare("INSERT INTO dw_config (config_key, config_value) VALUES (?, ?) 
                           ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)");
        $s->execute([$key, $jsonValue]);
        
        jsonResponse(['success' => true, 'message' => "Config '$key' updated"]);
    } catch(Exception $e) {
        jsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
    }
}

jsonResponse(['error' => 'Unknown action'], 400);
