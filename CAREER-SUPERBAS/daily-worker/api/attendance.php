<?php
/**
 * BAS — Attendance API
 *
 * Actions:
 *   POST ?action=sync_absensi     → Bulk upsert attendance data from GAS
 *   GET  ?action=history          → User attendance history (by month)
 *   GET  ?action=summary          → P1/P2 summary for user
 */
require_once __DIR__ . '/../config.php';

$action = $_GET['action'] ?? '';
$SYNC_TOKEN = 'bas-sync-2026';

// Quick stats (no auth needed)
if ($action === 'stats') {
    $db = getDB();
    $att = (int) $db->query("SELECT COUNT(*) FROM dw_attendance")->fetchColumn();
    $rek = 0;
    try { $rek = (int) $db->query("SELECT COUNT(*) FROM dw_rekening_changes")->fetchColumn(); } catch(Exception $e) {}
    $linked = (int) $db->query("SELECT COUNT(*) FROM dw_attendance WHERE user_id IS NOT NULL")->fetchColumn();
    $months = $db->query("SELECT DATE_FORMAT(date,'%Y-%m') as m, COUNT(*) as c FROM dw_attendance GROUP BY m ORDER BY m DESC LIMIT 5")->fetchAll();
    jsonResponse([
        'attendance_total' => $att,
        'attendance_linked' => $linked,
        'rekening_changes' => $rek,
        'recent_months' => $months
    ]);
}

// ═══════════════════════════════════════════════════
// SYNC ABSENSI (from GAS)
// ═══════════════════════════════════════════════════
if ($action === 'sync_absensi' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (($data['token'] ?? '') !== $SYNC_TOKEN)
        jsonResponse(['error' => 'Invalid token'], 403);

    $rows = $data['rows'] ?? [];
    if (empty($rows)) jsonResponse(['error' => 'No rows'], 400);

    $db = getDB();

    // Ensure table exists
    $db->exec("CREATE TABLE IF NOT EXISTS dw_attendance (
        id           INT AUTO_INCREMENT PRIMARY KEY,
        ops_id       VARCHAR(20) NOT NULL,
        candidate_id INT DEFAULT NULL,
        user_id      INT DEFAULT NULL,
        name         VARCHAR(100) NOT NULL,
        status       VARCHAR(20) DEFAULT 'DONE',
        station      VARCHAR(100),
        shifting     VARCHAR(50),
        date         DATE NOT NULL,
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_ops_date (ops_id, date),
        INDEX idx_user_date (user_id, date),
        INDEX idx_candidate_date (candidate_id, date),
        INDEX idx_date (date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // Pre-load ops_id → user_id mapping from existing dw_importrange
    $mapping = [];
    try {
        $mapStmt = $db->query("
            SELECT i.ops_id, c.id as candidate_id, c.user_id 
            FROM dw_importrange i
            JOIN dw_candidates c ON c.nik = i.nik 
            WHERE i.nik IS NOT NULL AND i.nik != ''
        ");
        while ($m = $mapStmt->fetch()) {
            $mapping[$m['ops_id']] = [
                'candidate_id' => $m['candidate_id'], 
                'user_id' => $m['user_id']
            ];
        }
    } catch (Exception $e) {
        // dw_candidates might not exist yet
    }

    $stmt = $db->prepare("INSERT INTO dw_attendance 
        (ops_id, candidate_id, user_id, name, status, station, shifting, date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
            name=VALUES(name), status=VALUES(status), station=VALUES(station),
            shifting=VALUES(shifting), candidate_id=VALUES(candidate_id), user_id=VALUES(user_id)");

    $synced = 0;
    $errors = 0;
    foreach ($rows as $r) {
        $opsId = trim($r['ops_id'] ?? '');
        if (!$opsId) continue;

        $date = $r['date'] ?? '';
        // If date is still in Indonesian format, parse it
        if (preg_match('/[a-zA-Z]/', $date)) {
            $date = parseIndonesianDate($date);
        }
        if (!$date || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) continue;

        $map = $mapping[$opsId] ?? ['candidate_id' => null, 'user_id' => null];

        try {
            $stmt->execute([
                $opsId,
                $map['candidate_id'],
                $map['user_id'],
                trim($r['name'] ?? ''),
                trim($r['status'] ?? 'DONE'),
                trim($r['station'] ?? ''),
                trim($r['shifting'] ?? ''),
                $date
            ]);
            $synced++;
        } catch (Exception $e) {
            $errors++;
        }
    }

    jsonResponse([
        'ok' => true, 
        'synced' => $synced, 
        'errors' => $errors,
        'total' => count($rows),
        'synced_at' => date('Y-m-d H:i:s')
    ]);
}

// ═══════════════════════════════════════════════════
// HISTORY — User attendance by month
// ═══════════════════════════════════════════════════
if ($action === 'history') {
    if (empty($_SESSION['user_id']))
        jsonResponse(['error' => 'Not authenticated'], 401);

    $userId = $_SESSION['user_id'];
    $month = $_GET['month'] ?? date('Y-m');

    $db = getDB();
    $opsId = findOpsId($db, $userId);

    if (!$opsId) {
        jsonResponse(['attendance' => [], 'ops_id' => null, 'message' => 'OPS ID belum terhubung']);
        return;
    }

    $stmt = $db->prepare("
        SELECT date, shifting, station, status 
        FROM dw_attendance 
        WHERE ops_id = ? AND date LIKE ?
        ORDER BY date ASC
    ");
    $stmt->execute([$opsId, $month . '%']);
    $attendance = $stmt->fetchAll();

    jsonResponse(['attendance' => $attendance, 'ops_id' => $opsId]);
}

// ═══════════════════════════════════════════════════
// SUMMARY — P1/P2 count
// ═══════════════════════════════════════════════════
if ($action === 'summary') {
    if (empty($_SESSION['user_id']))
        jsonResponse(['error' => 'Not authenticated'], 401);

    $userId = $_SESSION['user_id'];
    $month = $_GET['month'] ?? date('Y-m');

    $db = getDB();
    $opsId = findOpsId($db, $userId);

    if (!$opsId) {
        jsonResponse(['p1' => 0, 'p2' => 0, 'total' => 0]);
        return;
    }

    $stmt = $db->prepare("
        SELECT 
            SUM(CASE WHEN DAY(date) <= 15 THEN 1 ELSE 0 END) as p1,
            SUM(CASE WHEN DAY(date) > 15 THEN 1 ELSE 0 END) as p2,
            COUNT(*) as total
        FROM dw_attendance
        WHERE ops_id = ? AND date LIKE ?
    ");
    $stmt->execute([$opsId, $month . '%']);
    $sum = $stmt->fetch();

    jsonResponse([
        'p1' => (int)($sum['p1'] ?? 0),
        'p2' => (int)($sum['p2'] ?? 0),
        'total' => (int)($sum['total'] ?? 0),
        'ops_id' => $opsId
    ]);
}

// ═══════════════════════════════════════════════════
// SYNC GANTI REKENING (from GAS)
// ═══════════════════════════════════════════════════
if ($action === 'sync_gantirek' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (($data['token'] ?? '') !== $SYNC_TOKEN)
        jsonResponse(['error' => 'Invalid token'], 403);

    $rows = $data['rows'] ?? [];
    if (empty($rows)) jsonResponse(['error' => 'No rows'], 400);

    $db = getDB();

    // Ensure table exists
    $db->exec("CREATE TABLE IF NOT EXISTS dw_rekening_changes (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        ops_id          VARCHAR(20) NOT NULL,
        candidate_id    INT DEFAULT NULL,
        user_id         INT DEFAULT NULL,
        nama            VARCHAR(100),
        email           VARCHAR(100),
        penempatan      VARCHAR(100),
        rekening_baru   VARCHAR(30),
        nama_rekening   VARCHAR(100),
        bank_baru       VARCHAR(50),
        foto_buku_rek   TEXT DEFAULT NULL,
        tgl_ajuan       DATETIME,
        status          VARCHAR(30) DEFAULT 'Menunggu Verifikasi',
        tgl_proses      DATE DEFAULT NULL,
        source_sheet    VARCHAR(200) DEFAULT NULL,
        synced_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_ops_tgl (ops_id, tgl_ajuan),
        INDEX idx_user (user_id),
        INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // Pre-load mapping
    $mapping = [];
    try {
        $mapStmt = $db->query("
            SELECT i.ops_id, c.id as candidate_id, c.user_id 
            FROM dw_importrange i
            JOIN dw_candidates c ON c.nik = i.nik 
            WHERE i.nik IS NOT NULL AND i.nik != ''
        ");
        while ($m = $mapStmt->fetch()) {
            $mapping[$m['ops_id']] = ['candidate_id' => $m['candidate_id'], 'user_id' => $m['user_id']];
        }
    } catch (Exception $e) {}

    $stmt = $db->prepare("INSERT INTO dw_rekening_changes 
        (ops_id, candidate_id, user_id, nama, email, penempatan, rekening_baru, nama_rekening, bank_baru, foto_buku_rek, tgl_ajuan, source_sheet)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
            nama=VALUES(nama), email=VALUES(email), penempatan=VALUES(penempatan),
            rekening_baru=VALUES(rekening_baru), nama_rekening=VALUES(nama_rekening),
            bank_baru=VALUES(bank_baru), foto_buku_rek=VALUES(foto_buku_rek),
            candidate_id=VALUES(candidate_id), user_id=VALUES(user_id),
            source_sheet=VALUES(source_sheet)");

    $synced = 0;
    $sourceSheet = $data['source_sheet'] ?? '';
    foreach ($rows as $r) {
        $opsId = trim($r['ops_id'] ?? '');
        if (!$opsId) continue;

        $tglAjuan = $r['tgl_ajuan'] ?? '';
        if (!$tglAjuan) continue;

        $map = $mapping[$opsId] ?? ['candidate_id' => null, 'user_id' => null];

        try {
            $stmt->execute([
                $opsId,
                $map['candidate_id'],
                $map['user_id'],
                trim($r['nama'] ?? ''),
                trim($r['email'] ?? ''),
                trim($r['penempatan'] ?? ''),
                trim($r['rekening_baru'] ?? ''),
                trim($r['nama_rekening'] ?? ''),
                trim($r['bank_baru'] ?? ''),
                trim($r['foto_buku_rek'] ?? ''),
                $tglAjuan,
                $sourceSheet
            ]);
            $synced++;
        } catch (Exception $e) {}
    }

    jsonResponse(['ok' => true, 'synced' => $synced, 'total' => count($rows), 'synced_at' => date('Y-m-d H:i:s')]);
}

// ═══════════════════════════════════════════════════
// REKENING STATUS — User's bank change request
// ═══════════════════════════════════════════════════
if ($action === 'rekening_status') {
    if (empty($_SESSION['user_id']))
        jsonResponse(['error' => 'Not authenticated'], 401);

    $userId = $_SESSION['user_id'];
    $db = getDB();
    $opsId = findOpsId($db, $userId);

    if (!$opsId) {
        jsonResponse(['request' => null, 'ops_id' => null]);
        return;
    }

    // Get latest rekening change request
    try {
        $stmt = $db->prepare("
            SELECT bank_baru, rekening_baru, nama_rekening, tgl_ajuan, status, penempatan
            FROM dw_rekening_changes
            WHERE ops_id = ?
            ORDER BY tgl_ajuan DESC
            LIMIT 1
        ");
        $stmt->execute([$opsId]);
        $req = $stmt->fetch();

        if ($req) {
            jsonResponse([
                'request' => [
                    'bank' => $req['bank_baru'],
                    'rekening' => $req['rekening_baru'],
                    'atas_nama' => $req['nama_rekening'],
                    'tgl_ajuan' => $req['tgl_ajuan'],
                    'status' => $req['status']
                ],
                'ops_id' => $opsId
            ]);
        } else {
            jsonResponse(['request' => null, 'ops_id' => $opsId]);
        }
    } catch (Exception $e) {
        jsonResponse(['request' => null, 'ops_id' => $opsId]);
    }
    return;
}

jsonResponse(['error' => 'Invalid action'], 400);

// ═══════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════

/**
 * Find ops_id for a user via dw_importrange + dw_candidates NIK matching
 */
function findOpsId($db, $userId) {
    // Method 1: Direct — candidate.given_id (already linked by importrange sync)
    try {
        $stmt = $db->prepare("
            SELECT c.given_id FROM dw_candidates c 
            WHERE c.user_id = ? AND c.given_id IS NOT NULL AND c.given_id != ''
            LIMIT 1
        ");
        $stmt->execute([$userId]);
        $opsId = $stmt->fetchColumn();
        if ($opsId) return $opsId;
    } catch (Exception $e) {}

    // Method 2: Via NIK match — candidate.nik = importrange.nik
    try {
        $stmt = $db->prepare("
            SELECT i.ops_id FROM dw_importrange i
            JOIN dw_candidates c ON c.nik = i.nik
            WHERE c.user_id = ? AND i.nik IS NOT NULL AND i.nik != ''
            LIMIT 1
        ");
        $stmt->execute([$userId]);
        $opsId = $stmt->fetchColumn();
        if ($opsId) return $opsId;
    } catch (Exception $e) {}

    return null;
}

/**
 * Parse Indonesian date "Minggu, 01 Februari 2026" → "2026-02-01"
 */
function parseIndonesianDate($raw) {
    $bulan = [
        'januari'=>'01','februari'=>'02','maret'=>'03','april'=>'04',
        'mei'=>'05','juni'=>'06','juli'=>'07','agustus'=>'08',
        'september'=>'09','oktober'=>'10','november'=>'11','desember'=>'12'
    ];
    $raw = trim(str_replace(',', '', $raw));
    $parts = preg_split('/\s+/', $raw);
    if (count($parts) >= 3) {
        $yyyy = $parts[count($parts) - 1];
        $mm = $bulan[strtolower($parts[count($parts) - 2])] ?? null;
        $dd = str_pad($parts[count($parts) - 3], 2, '0', STR_PAD_LEFT);
        if ($mm && is_numeric($yyyy) && is_numeric($dd)) {
            return "$yyyy-$mm-$dd";
        }
    }
    return null;
}
