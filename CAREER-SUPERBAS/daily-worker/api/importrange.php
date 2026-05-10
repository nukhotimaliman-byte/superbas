<?php
/**
 * BAS Daily Worker — IMPORTRANGE API
 * Sync data from Google Sheets (KARYAWAN) to MySQL (dw_importrange table)
 * 
 * Endpoints:
 *   POST /api/importrange.php?action=sync    — Bulk sync all rows from Sheets
 *   POST /api/importrange.php?action=upsert  — Insert or update a single row (on-edit)
 *   GET  /api/importrange.php?action=list     — List all importrange data
 *   GET  /api/importrange.php?action=stats    — Get sync statistics
 *   GET  /api/importrange.php?action=setup&key=BAS2026 — Create/recreate the table
 */
require_once __DIR__ . '/../config.php';

// ── Security: API Key for Google Apps Script ────────
define('IMPORTRANGE_API_KEY', 'BAS-DW-IMPORTRANGE-2026');

$action = $_GET['action'] ?? $_POST['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

// ── Parse input for POST requests ───────────────────
$input = [];
if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    
    // Verify API Key for write operations
    $apiKey = $input['api_key'] ?? $_POST['api_key'] ?? $_SERVER['HTTP_X_API_KEY'] ?? '';
    
    if ($apiKey !== IMPORTRANGE_API_KEY) {
        jsonResponse(['error' => 'Invalid API key'], 403);
    }
}

// ── Route Actions ───────────────────────────────────
switch ($action) {
    case 'setup':
        handleSetup();
        break;
    case 'sync':
        if ($method !== 'POST') jsonResponse(['error' => 'POST required'], 405);
        handleSync($input);
        break;
    case 'upsert':
        if ($method !== 'POST') jsonResponse(['error' => 'POST required'], 405);
        handleUpsert($input);
        break;
    case 'list':
        handleList();
        break;
    case 'stats':
        handleStats();
        break;
    default:
        jsonResponse(['error' => 'Invalid action. Use: setup, sync, upsert, list, stats'], 400);
}

// ═══════════════════════════════════════════════════════
// AUTO-LINK: Match NIK between importrange → dw_users
// ═══════════════════════════════════════════════════════

/**
 * Link OPS ID to dw_users table by matching NIK.
 * Called automatically after every sync/upsert.
 * 
 * @param PDO $db Database connection
 * @param string|null $nik If provided, only link this specific NIK
 * @return int Number of users linked
 */
function linkOpsIdToUsers($db, $nik = null) {
    try {
        if ($nik) {
            // Link specific NIK only (for upsert - faster)
            $stmt = $db->prepare("
                UPDATE dw_candidates c 
                JOIN dw_importrange i ON c.nik = i.nik 
                SET c.given_id = i.ops_id 
                WHERE c.nik = :nik 
                AND (c.given_id IS NULL OR c.given_id = '')
            ");
            $stmt->execute([':nik' => $nik]);
            return $stmt->rowCount();
        } else {
            // Link ALL unlinked candidates (for full sync)
            $stmt = $db->query("
                UPDATE dw_candidates c 
                JOIN dw_importrange i ON c.nik = i.nik 
                SET c.given_id = i.ops_id 
                WHERE c.given_id IS NULL OR c.given_id = ''
            ");
            return $stmt->rowCount();
        }
    } catch (PDOException $e) {
        error_log("linkOpsIdToUsers error: " . $e->getMessage());
        return 0;
    }
}

// No need to alter dw_candidates — given_id column already exists


// ═══════════════════════════════════════════════════════
// HANDLER FUNCTIONS
// ═══════════════════════════════════════════════════════

/**
 * Create/recreate the dw_importrange table
 */
function handleSetup() {
    $key = $_GET['key'] ?? '';
    if ($key !== 'BAS2026') {
        jsonResponse(['error' => 'Invalid setup key. Use ?action=setup&key=BAS2026'], 403);
    }
    
    $db = getDB();
    $results = [];
    
    // Drop old table and recreate with new structure
    try {
        $db->exec("DROP TABLE IF EXISTS dw_importrange");
        $results[] = "Dropped old dw_importrange table";
    } catch (PDOException $e) {
        $results[] = "Note: " . $e->getMessage();
    }
    
    try {
        $db->exec("CREATE TABLE dw_importrange (
            id INT AUTO_INCREMENT PRIMARY KEY,
            ops_id VARCHAR(20) NOT NULL COMMENT 'ID Operasional (Kolom A)',
            nama VARCHAR(150) NOT NULL DEFAULT '' COMMENT 'Nama karyawan (Kolom B)',
            nik VARCHAR(20) DEFAULT NULL COMMENT 'NIK 16 digit (Kolom C)',
            status VARCHAR(50) DEFAULT 'DAILY WORKER' COMMENT 'Status karyawan (Kolom D)',
            station VARCHAR(100) DEFAULT NULL COMMENT 'Lokasi DC (Kolom F)',
            wa VARCHAR(20) DEFAULT NULL COMMENT 'Nomor WhatsApp (Kolom G)',
            bank VARCHAR(100) DEFAULT NULL COMMENT 'Nama bank (Kolom H)',
            rekening VARCHAR(50) DEFAULT NULL COMMENT 'Nomor rekening (Kolom I)',
            atas_nama VARCHAR(100) DEFAULT NULL COMMENT 'Atas nama rekening (Kolom J)',
            join_date VARCHAR(20) DEFAULT NULL COMMENT 'Tanggal join (Kolom K)',
            status_gaji VARCHAR(50) DEFAULT 'Belum isi link gaji' COMMENT 'Status pengisian form gaji (Kolom L)',
            sheet_row INT DEFAULT NULL COMMENT 'Nomor baris di spreadsheet',
            last_synced_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_ops_id (ops_id),
            INDEX idx_nama (nama),
            INDEX idx_nik (nik),
            INDEX idx_station (station),
            INDEX idx_status_gaji (status_gaji)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Data Karyawan DW dari Google Sheets (Sheet KARYAWAN)'");
        
        $results[] = "Created new dw_importrange table";
    } catch (PDOException $e) {
        jsonResponse(['error' => 'Failed to create table: ' . $e->getMessage()], 500);
    }
    
    jsonResponse([
        'success' => true,
        'message' => 'Table dw_importrange recreated successfully!',
        'results' => $results
    ]);
}

/**
 * Bulk sync: Insert/update all rows from Sheets
 */
function handleSync($input) {
    $rows = $input['rows'] ?? [];
    
    if (empty($rows)) {
        jsonResponse(['error' => 'No rows provided'], 400);
    }
    
    $db = getDB();
    $inserted = 0;
    $updated  = 0;
    $errors   = [];
    
    $db->beginTransaction();
    
    try {
        $stmt = $db->prepare("INSERT INTO dw_importrange 
            (ops_id, nama, nik, status, station, wa, bank, rekening, atas_nama, join_date, status_gaji, sheet_row)
            VALUES 
            (:ops_id, :nama, :nik, :status, :station, :wa, :bank, :rekening, :atas_nama, :join_date, :status_gaji, :sheet_row)
            ON DUPLICATE KEY UPDATE
                nama = VALUES(nama),
                nik = VALUES(nik),
                status = VALUES(status),
                station = VALUES(station),
                wa = VALUES(wa),
                bank = VALUES(bank),
                rekening = VALUES(rekening),
                atas_nama = VALUES(atas_nama),
                join_date = VALUES(join_date),
                status_gaji = VALUES(status_gaji),
                sheet_row = VALUES(sheet_row),
                last_synced_at = NOW()
        ");
        
        foreach ($rows as $i => $row) {
            $opsId = trim($row['ops_id'] ?? '');
            if (empty($opsId)) continue;
            
            try {
                $stmt->execute([
                    ':ops_id'      => $opsId,
                    ':nama'        => trim($row['nama'] ?? ''),
                    ':nik'         => trim($row['nik'] ?? '') ?: null,
                    ':status'      => trim($row['status'] ?? 'DAILY WORKER'),
                    ':station'     => trim($row['station'] ?? '') ?: null,
                    ':wa'          => trim($row['wa'] ?? '') ?: null,
                    ':bank'        => trim($row['bank'] ?? '') ?: null,
                    ':rekening'    => trim($row['rekening'] ?? '') ?: null,
                    ':atas_nama'   => trim($row['atas_nama'] ?? '') ?: null,
                    ':join_date'   => trim($row['join_date'] ?? '') ?: null,
                    ':status_gaji' => (!empty(trim($row['rekening'] ?? '')) && trim($row['rekening'] ?? '') !== '0')
                                        ? 'Sudah isi link gaji' 
                                        : trim($row['status_gaji'] ?? 'Belum isi link gaji'),
                    ':sheet_row'   => $i + 2
                ]);
                
                if ($stmt->rowCount() === 1) {
                    $inserted++;
                } else {
                    $updated++;
                }
            } catch (PDOException $e) {
                $errors[] = "Row $i ($opsId): " . $e->getMessage();
            }
        }
        
        $db->commit();
        
        // Auto-link: Update dw_users with OPS ID based on NIK match
        $linked = linkOpsIdToUsers($db);
        
        jsonResponse([
            'success'  => true,
            'message'  => "Sync completed!",
            'inserted' => $inserted,
            'updated'  => $updated,
            'total'    => count($rows),
            'linked_users' => $linked,
            'errors'   => $errors,
            'synced_at' => date('Y-m-d H:i:s')
        ]);
        
    } catch (Exception $e) {
        $db->rollBack();
        jsonResponse(['error' => 'Sync failed: ' . $e->getMessage()], 500);
    }
}

/**
 * Upsert: Insert or update a single row (triggered on edit)
 */
function handleUpsert($input) {
    $opsId = trim($input['ops_id'] ?? '');
    
    if (empty($opsId)) {
        jsonResponse(['error' => 'ops_id is required'], 400);
    }
    
    $db = getDB();
    
    try {
        $stmt = $db->prepare("INSERT INTO dw_importrange 
            (ops_id, nama, nik, status, station, wa, bank, rekening, atas_nama, join_date, status_gaji, sheet_row)
            VALUES 
            (:ops_id, :nama, :nik, :status, :station, :wa, :bank, :rekening, :atas_nama, :join_date, :status_gaji, :sheet_row)
            ON DUPLICATE KEY UPDATE
                nama = VALUES(nama),
                nik = VALUES(nik),
                status = VALUES(status),
                station = VALUES(station),
                wa = VALUES(wa),
                bank = VALUES(bank),
                rekening = VALUES(rekening),
                atas_nama = VALUES(atas_nama),
                join_date = VALUES(join_date),
                status_gaji = VALUES(status_gaji),
                sheet_row = VALUES(sheet_row),
                last_synced_at = NOW()
        ");
        
        $stmt->execute([
            ':ops_id'      => $opsId,
            ':nama'        => trim($input['nama'] ?? ''),
            ':nik'         => trim($input['nik'] ?? '') ?: null,
            ':status'      => trim($input['status'] ?? 'DAILY WORKER'),
            ':station'     => trim($input['station'] ?? '') ?: null,
            ':wa'          => trim($input['wa'] ?? '') ?: null,
            ':bank'        => trim($input['bank'] ?? '') ?: null,
            ':rekening'    => trim($input['rekening'] ?? '') ?: null,
            ':atas_nama'   => trim($input['atas_nama'] ?? '') ?: null,
            ':join_date'   => trim($input['join_date'] ?? '') ?: null,
            ':status_gaji' => (!empty(trim($input['rekening'] ?? '')) && trim($input['rekening'] ?? '') !== '0')
                                        ? 'Sudah isi link gaji'
                                        : trim($input['status_gaji'] ?? 'Belum isi link gaji'),
            ':sheet_row'   => $input['sheet_row'] ?? null
        ]);
        
        $isNew = $stmt->rowCount() === 1;
        
        // Auto-link this specific NIK
        $nik = trim($input['nik'] ?? '');
        $linked = 0;
        if ($nik) {
            $linked = linkOpsIdToUsers($db, $nik);
        }
        
        jsonResponse([
            'success' => true,
            'action'  => $isNew ? 'inserted' : 'updated',
            'ops_id'  => $opsId,
            'linked_users' => $linked,
            'synced_at' => date('Y-m-d H:i:s')
        ]);
        
    } catch (PDOException $e) {
        jsonResponse(['error' => 'Upsert failed: ' . $e->getMessage()], 500);
    }
}

/**
 * List all importrange data
 */
function handleList() {
    $db = getDB();
    
    $station = $_GET['station'] ?? '';
    $status_gaji = $_GET['status_gaji'] ?? '';
    $search = $_GET['search'] ?? '';
    $page   = max(1, intval($_GET['page'] ?? 1));
    $limit  = min(100, max(10, intval($_GET['limit'] ?? 50)));
    $offset = ($page - 1) * $limit;
    
    $where  = [];
    $params = [];
    
    if ($station) {
        $where[]  = "station LIKE :station";
        $params[':station'] = "%$station%";
    }
    if ($status_gaji) {
        $where[]  = "status_gaji LIKE :status_gaji";
        $params[':status_gaji'] = "%$status_gaji%";
    }
    if ($search) {
        $where[]  = "(ops_id LIKE :s1 OR nama LIKE :s2 OR nik LIKE :s3 OR wa LIKE :s4)";
        $params[':s1'] = "%$search%";
        $params[':s2'] = "%$search%";
        $params[':s3'] = "%$search%";
        $params[':s4'] = "%$search%";
    }
    
    $whereSQL = $where ? 'WHERE ' . implode(' AND ', $where) : '';
    
    $countStmt = $db->prepare("SELECT COUNT(*) FROM dw_importrange $whereSQL");
    $countStmt->execute($params);
    $total = $countStmt->fetchColumn();
    
    $stmt = $db->prepare("SELECT * FROM dw_importrange $whereSQL ORDER BY last_synced_at DESC LIMIT $limit OFFSET $offset");
    $stmt->execute($params);
    $rows = $stmt->fetchAll();
    
    jsonResponse([
        'success' => true,
        'data'    => $rows,
        'total'   => (int) $total,
        'page'    => $page,
        'limit'   => $limit,
        'pages'   => ceil($total / $limit)
    ]);
}

/**
 * Get sync statistics
 */
function handleStats() {
    $db = getDB();
    
    $stats = [];
    
    $stats['total_records'] = (int) $db->query("SELECT COUNT(*) FROM dw_importrange")->fetchColumn();
    
    // By station
    $stmt = $db->query("SELECT station, COUNT(*) as total FROM dw_importrange WHERE station IS NOT NULL GROUP BY station ORDER BY total DESC");
    $stats['by_station'] = $stmt->fetchAll();
    
    // By status_gaji
    $stmt = $db->query("SELECT status_gaji, COUNT(*) as total FROM dw_importrange GROUP BY status_gaji ORDER BY total DESC");
    $stats['by_status_gaji'] = $stmt->fetchAll();
    
    // Data completeness
    $stats['with_nik'] = (int) $db->query("SELECT COUNT(*) FROM dw_importrange WHERE nik IS NOT NULL AND nik != ''")->fetchColumn();
    $stats['with_bank'] = (int) $db->query("SELECT COUNT(*) FROM dw_importrange WHERE bank IS NOT NULL AND bank != ''")->fetchColumn();
    $stats['with_wa'] = (int) $db->query("SELECT COUNT(*) FROM dw_importrange WHERE wa IS NOT NULL AND wa != ''")->fetchColumn();
    
    // Last sync time
    $stats['last_sync'] = $db->query("SELECT MAX(last_synced_at) FROM dw_importrange")->fetchColumn();
    
    jsonResponse([
        'success' => true,
        'stats'   => $stats
    ]);
}
