<?php
/**
 * BAS — Attendance + Rekening API v3
 * Fresh rewrite to bypass server opcache
 */
require_once __DIR__ . '/../config.php';

$action = $_GET['action'] ?? '';
$SYNC_TOKEN = 'bas-sync-2026';

// ── HELPER: Resolve user_id → ops_id ──
function resolveOpsId($db, $userId) {
    // Priority 1: NIK match (importrange is source of truth — get latest synced)
    try {
        $s = $db->prepare("SELECT i.ops_id FROM dw_importrange i INNER JOIN dw_candidates c ON TRIM(c.nik) = TRIM(i.nik) WHERE c.user_id = ? AND TRIM(i.nik) != '' ORDER BY i.last_synced_at DESC LIMIT 1");
        $s->execute([$userId]);
        $v = $s->fetchColumn();
        if ($v) return $v;
    } catch (\Exception $e) {}
    // Priority 2: given_id fallback
    try {
        $s = $db->prepare("SELECT given_id FROM dw_candidates WHERE user_id = ? AND given_id IS NOT NULL AND given_id != '' LIMIT 1");
        $s->execute([$userId]);
        $v = $s->fetchColumn();
        if ($v) return $v;
    } catch (\Exception $e) {}
    return null;
}

// ── Stats ──
if ($action === 'stats') {
    $db = getDB();
    $att = (int) $db->query("SELECT COUNT(*) FROM dw_attendance")->fetchColumn();
    $rek = 0;
    try { $rek = (int) $db->query("SELECT COUNT(*) FROM dw_rekening_changes")->fetchColumn(); } catch(\Exception $e) {}
    $linked = (int) $db->query("SELECT COUNT(*) FROM dw_attendance WHERE user_id IS NOT NULL")->fetchColumn();
    $months = $db->query("SELECT DATE_FORMAT(date,'%Y-%m') as m, COUNT(*) as c FROM dw_attendance GROUP BY m ORDER BY m DESC LIMIT 5")->fetchAll();
    jsonResponse(['attendance_total'=>$att,'attendance_linked'=>$linked,'rekening_changes'=>$rek,'recent_months'=>$months]);
}

// ── Debug ──
if ($action === 'debug_user') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (($data['token'] ?? '') !== $SYNC_TOKEN) jsonResponse(['error'=>'Invalid token'], 403);
    $opsId = trim($data['ops_id'] ?? '');
    $db = getDB();
    $r = ['ops_id'=>$opsId, 'api_version'=>'v3'];
    
    $s = $db->prepare("SELECT ops_id, nama, nik, station FROM dw_importrange WHERE LOWER(ops_id) = LOWER(?)");
    $s->execute([$opsId]); $r['importrange'] = $s->fetch() ?: 'NOT FOUND';
    
    $s = $db->prepare("SELECT COUNT(*) FROM dw_attendance WHERE LOWER(ops_id) = LOWER(?)");
    $s->execute([$opsId]); $r['attendance_count'] = (int)$s->fetchColumn();
    
    $s = $db->prepare("SELECT date, shifting, station FROM dw_attendance WHERE LOWER(ops_id) = LOWER(?) ORDER BY date DESC LIMIT 3");
    $s->execute([$opsId]); $r['attendance_sample'] = $s->fetchAll();
    
    if (is_array($r['importrange']) && !empty($r['importrange']['nik'])) {
        $nik = $r['importrange']['nik'];
        // Check ALL importrange rows with this NIK
        $s = $db->prepare("SELECT ops_id, nama FROM dw_importrange WHERE TRIM(nik) = TRIM(?)");
        $s->execute([$nik]); $r['all_importrange_by_nik'] = $s->fetchAll();
        
        $s = $db->prepare("SELECT id, user_id, given_id, nik FROM dw_candidates WHERE TRIM(nik) = TRIM(?)");
        $s->execute([$nik]); $r['candidate'] = $s->fetch() ?: 'NO CANDIDATE';
        if (is_array($r['candidate']) && !empty($r['candidate']['user_id'])) {
            $uid = $r['candidate']['user_id'];
            $s = $db->prepare("SELECT id, name, phone FROM dw_users WHERE id = ?");
            $s->execute([$uid]); $r['user'] = $s->fetch() ?: 'NOT FOUND';
            $r['resolveOpsId_result'] = resolveOpsId($db, $uid);
            $s = $db->prepare("SELECT id, given_id, nik FROM dw_candidates WHERE user_id = ?");
            $s->execute([$uid]); $r['all_candidates'] = $s->fetchAll();
        }
    }
    jsonResponse($r);
}

// ── Relink ──
if ($action === 'relink') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (($data['token'] ?? '') !== $SYNC_TOKEN) jsonResponse(['error'=>'Invalid token'], 403);
    $db = getDB();
    $s = $db->prepare("UPDATE dw_candidates c INNER JOIN dw_importrange i ON TRIM(c.nik) = TRIM(i.nik) SET c.given_id = i.ops_id WHERE TRIM(c.nik) != '' AND TRIM(i.nik) != '' AND (c.given_id IS NULL OR c.given_id = '' OR c.given_id != i.ops_id)");
    $s->execute();
    jsonResponse(['ok'=>true,'updated'=>$s->rowCount()]);
}

// ── Sync Absensi ──
if ($action === 'sync_absensi' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (($data['token'] ?? '') !== $SYNC_TOKEN) jsonResponse(['error'=>'Invalid token'], 403);
    $rows = $data['rows'] ?? [];
    if (empty($rows)) jsonResponse(['error'=>'No rows'], 400);
    $db = getDB();
    $db->exec("CREATE TABLE IF NOT EXISTS dw_attendance (
        id INT AUTO_INCREMENT PRIMARY KEY, ops_id VARCHAR(20) NOT NULL,
        candidate_id INT DEFAULT NULL, user_id INT DEFAULT NULL,
        name VARCHAR(100) NOT NULL, status VARCHAR(20) DEFAULT 'DONE',
        station VARCHAR(100), shifting VARCHAR(50), date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_ops_date (ops_id, date),
        INDEX idx_user_date (user_id, date), INDEX idx_date (date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $mapping = [];
    try {
        $ms = $db->query("SELECT i.ops_id, c.id as cid, c.user_id FROM dw_importrange i JOIN dw_candidates c ON TRIM(c.nik)=TRIM(i.nik) WHERE TRIM(i.nik)!=''");
        while ($m = $ms->fetch()) $mapping[strtolower($m['ops_id'])] = ['candidate_id'=>$m['cid'],'user_id'=>$m['user_id']];
    } catch (\Exception $e) {}
    $stmt = $db->prepare("INSERT INTO dw_attendance (ops_id,candidate_id,user_id,name,status,station,shifting,date) VALUES (?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),status=VALUES(status),station=VALUES(station),shifting=VALUES(shifting),candidate_id=VALUES(candidate_id),user_id=VALUES(user_id)");
    $synced = 0;
    foreach ($rows as $r) {
        $oid = trim($r['ops_id'] ?? ''); if (!$oid) continue;
        $dt = $r['date'] ?? '';
        if (preg_match('/[a-zA-Z]/', $dt)) $dt = parseIndoDate($dt);
        if (!$dt || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $dt)) continue;
        $mp = $mapping[strtolower($oid)] ?? ['candidate_id'=>null,'user_id'=>null];
        try { $stmt->execute([$oid,$mp['candidate_id'],$mp['user_id'],trim($r['name']??''),trim($r['status']??'DONE'),trim($r['station']??''),trim($r['shifting']??''),$dt]); $synced++; } catch (\Exception $e) {}
    }
    jsonResponse(['ok'=>true,'synced'=>$synced,'total'=>count($rows),'synced_at'=>date('Y-m-d H:i:s')]);
}

// ── History ──
if ($action === 'history') {
    if (empty($_SESSION['user_id'])) jsonResponse(['error'=>'Not authenticated'], 401);
    $uid = $_SESSION['user_id'];
    $month = $_GET['month'] ?? date('Y-m');
    $db = getDB();
    $opsId = resolveOpsId($db, $uid);
    if (!$opsId) { jsonResponse(['attendance'=>[],'ops_id'=>null,'message'=>'OPS ID belum terhubung']); return; }
    $s = $db->prepare("SELECT date, shifting, station, status FROM dw_attendance WHERE LOWER(ops_id) = LOWER(?) AND date LIKE ? ORDER BY date ASC");
    $s->execute([$opsId, $month.'%']);
    jsonResponse(['attendance'=>$s->fetchAll(),'ops_id'=>$opsId]);
}

// ── Summary ──
if ($action === 'summary') {
    if (empty($_SESSION['user_id'])) jsonResponse(['error'=>'Not authenticated'], 401);
    $uid = $_SESSION['user_id'];
    $month = $_GET['month'] ?? date('Y-m');
    $db = getDB();
    $opsId = resolveOpsId($db, $uid);
    if (!$opsId) { jsonResponse(['p1'=>0,'p2'=>0,'total'=>0]); return; }
    $s = $db->prepare("SELECT SUM(CASE WHEN DAY(date)<=15 THEN 1 ELSE 0 END) as p1, SUM(CASE WHEN DAY(date)>15 THEN 1 ELSE 0 END) as p2, COUNT(*) as total FROM dw_attendance WHERE LOWER(ops_id)=LOWER(?) AND date LIKE ?");
    $s->execute([$opsId, $month.'%']);
    $sum = $s->fetch();
    jsonResponse(['p1'=>(int)($sum['p1']??0),'p2'=>(int)($sum['p2']??0),'total'=>(int)($sum['total']??0),'ops_id'=>$opsId]);
}

// ── Sync Ganti Rekening ──
if ($action === 'sync_gantirek' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (($data['token'] ?? '') !== $SYNC_TOKEN) jsonResponse(['error'=>'Invalid token'], 403);
    $rows = $data['rows'] ?? [];
    if (empty($rows)) jsonResponse(['error'=>'No rows'], 400);
    $db = getDB();
    $db->exec("CREATE TABLE IF NOT EXISTS dw_rekening_changes (
        id INT AUTO_INCREMENT PRIMARY KEY, ops_id VARCHAR(20) NOT NULL,
        candidate_id INT DEFAULT NULL, user_id INT DEFAULT NULL,
        nama VARCHAR(100), email VARCHAR(100), penempatan VARCHAR(100),
        rekening_baru VARCHAR(30), nama_rekening VARCHAR(100), bank_baru VARCHAR(50),
        foto_buku_rek TEXT DEFAULT NULL, tgl_ajuan DATETIME,
        status VARCHAR(30) DEFAULT 'Menunggu Verifikasi', tgl_proses DATE DEFAULT NULL,
        source_sheet VARCHAR(200) DEFAULT NULL,
        synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_ops_tgl (ops_id, tgl_ajuan), INDEX idx_user (user_id), INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $mapping = [];
    try {
        $ms = $db->query("SELECT i.ops_id, c.id as cid, c.user_id FROM dw_importrange i JOIN dw_candidates c ON TRIM(c.nik)=TRIM(i.nik) WHERE TRIM(i.nik)!=''");
        while ($m = $ms->fetch()) $mapping[strtolower($m['ops_id'])] = ['candidate_id'=>$m['cid'],'user_id'=>$m['user_id']];
    } catch (\Exception $e) {}
    $stmt = $db->prepare("INSERT INTO dw_rekening_changes (ops_id,candidate_id,user_id,nama,email,penempatan,rekening_baru,nama_rekening,bank_baru,foto_buku_rek,tgl_ajuan,source_sheet) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE nama=VALUES(nama),email=VALUES(email),penempatan=VALUES(penempatan),rekening_baru=VALUES(rekening_baru),nama_rekening=VALUES(nama_rekening),bank_baru=VALUES(bank_baru),foto_buku_rek=VALUES(foto_buku_rek),candidate_id=VALUES(candidate_id),user_id=VALUES(user_id),source_sheet=VALUES(source_sheet)");
    $synced = 0;
    $src = $data['source_sheet'] ?? '';
    foreach ($rows as $r) {
        $oid = trim($r['ops_id'] ?? ''); if (!$oid) continue;
        $tgl = $r['tgl_ajuan'] ?? ''; if (!$tgl) continue;
        $mp = $mapping[strtolower($oid)] ?? ['candidate_id'=>null,'user_id'=>null];
        try { $stmt->execute([$oid,$mp['candidate_id'],$mp['user_id'],trim($r['nama']??''),trim($r['email']??''),trim($r['penempatan']??''),trim($r['rekening_baru']??''),trim($r['nama_rekening']??''),trim($r['bank_baru']??''),trim($r['foto_buku_rek']??''),$tgl,$src]); $synced++; } catch (\Exception $e) {}
    }
    jsonResponse(['ok'=>true,'synced'=>$synced,'total'=>count($rows),'synced_at'=>date('Y-m-d H:i:s')]);
}

// ── Rekening Status ──
if ($action === 'rekening_status') {
    if (empty($_SESSION['user_id'])) jsonResponse(['error'=>'Not authenticated'], 401);
    $uid = $_SESSION['user_id'];
    $db = getDB();
    $opsId = resolveOpsId($db, $uid);
    if (!$opsId) { jsonResponse(['request'=>null,'ops_id'=>null]); return; }
    try {
        $s = $db->prepare("SELECT bank_baru, rekening_baru, nama_rekening, tgl_ajuan, status FROM dw_rekening_changes WHERE LOWER(ops_id)=LOWER(?) ORDER BY tgl_ajuan DESC LIMIT 1");
        $s->execute([$opsId]);
        $req = $s->fetch();
        if ($req) {
            jsonResponse(['request'=>['bank'=>$req['bank_baru'],'rekening'=>$req['rekening_baru'],'atas_nama'=>$req['nama_rekening'],'tgl_ajuan'=>$req['tgl_ajuan'],'status'=>$req['status']],'ops_id'=>$opsId]);
        } else {
            jsonResponse(['request'=>null,'ops_id'=>$opsId]);
        }
    } catch (\Exception $e) { jsonResponse(['request'=>null,'ops_id'=>$opsId]); }
    return;
}

jsonResponse(['error'=>'Invalid action'], 400);

// ── Parse Indonesian date ──
function parseIndoDate($raw) {
    $b = ['januari'=>'01','februari'=>'02','maret'=>'03','april'=>'04','mei'=>'05','juni'=>'06','juli'=>'07','agustus'=>'08','september'=>'09','oktober'=>'10','november'=>'11','desember'=>'12'];
    $raw = trim(str_replace(',','',$raw));
    $p = preg_split('/\s+/', $raw);
    if (count($p) >= 3) {
        $y=$p[count($p)-1]; $m=$b[strtolower($p[count($p)-2])]??null; $d=str_pad($p[count($p)-3],2,'0',STR_PAD_LEFT);
        if ($m && is_numeric($y) && is_numeric($d)) return "$y-$m-$d";
    }
    return null;
}
