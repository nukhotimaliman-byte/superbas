<?php
/* Data KalSul — Gaji Status / Rekening Sync API v2 */
ini_set('display_errors', 1);
error_reporting(E_ALL);

// CORS for GAS
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

// DB connection function (inline to avoid config issues)
function getDB2(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $pdo = new PDO('mysql:host=46.250.232.197;dbname=super-bas.com;charset=utf8mb4', 'owner', 'Asik123asik', [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    }
    return $pdo;
}

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

// Helper: parse any timestamp format to MySQL datetime
// GAS sends mm/dd/yyyy (US format), NOT dd/mm/yyyy
function parseTimestamp($val) {
    if (empty($val)) return date('Y-m-d H:i:s');
    $val = trim($val);
    // Already MySQL format (2026-05-20 ...)
    if (preg_match('/^\d{4}-\d{2}-\d{2}/', $val)) return substr($val, 0, 19);
    
    // Slash format: could be mm/dd/yyyy or dd/mm/yyyy
    if (preg_match('#^(\d{1,2})/(\d{1,2})/(\d{4})(?:\s+(\d{1,2}):(\d{2}):(\d{2}))?#', $val, $m)) {
        $a = (int)$m[1]; // first number
        $b = (int)$m[2]; // second number
        $year = (int)$m[3];
        $h = (int)($m[4] ?? 0);
        $min = (int)($m[5] ?? 0);
        $sec = (int)($m[6] ?? 0);
        
        // Auto-detect: GAS uses mm/dd/yyyy (US format)
        // If first > 12, it must be day (dd/mm/yyyy) 
        // If second > 12, it must be day (mm/dd/yyyy) — this is GAS format
        // If both <= 12, assume mm/dd/yyyy (GAS default)
        if ($a > 12) {
            // dd/mm/yyyy
            $month = $b;
            $day = $a;
        } else {
            // mm/dd/yyyy (GAS default)
            $month = $a;
            $day = $b;
        }
        
        return sprintf('%04d-%02d-%02d %02d:%02d:%02d', $year, $month, $day, $h, $min, $sec);
    }
    
    // Try PHP strtotime (handles most English formats)
    $ts = strtotime($val);
    if ($ts !== false) return date('Y-m-d H:i:s', $ts);
    return date('Y-m-d H:i:s');
}

// ── POST sync from GAS (token-based) ──
if ($method === 'POST' && $action === 'sync') {
    try {
        $raw = file_get_contents('php://input');
        $body = json_decode($raw, true);

        if (!$body) {
            echo json_encode(['error' => 'Invalid JSON', 'raw_length' => strlen($raw), 'json_error' => json_last_error_msg()]);
            exit;
        }

        if (($body['token'] ?? '') !== 'kalsul-sync-2026') {
            http_response_code(403);
            echo json_encode(['error' => 'Invalid token', 'got' => substr($body['token'] ?? '', 0, 10)]);
            exit;
        }

        $db = getDB2();
        $inserted = 0;

        // Process Link Gaji
        $gajiData = $body['link_gaji'] ?? [];
        if (!empty($gajiData)) {
            $gajiStmt = $db->prepare("INSERT INTO kalsul_rekening (ops_id, source, timestamp_gas, email, nama_sesuai_ktp, nik, lokasi_kerja, tanggal_lahir, alamat, no_hp, no_rek, atas_nama, bank) VALUES (:oid, 'link_gaji', :ts, :email, :nama, :nik, :lok, :tgl, :alamat, :hp, :rek, :atas, :bank)");

            foreach ($gajiData as $row) {
                $opsId = trim($row['ops_id'] ?? '');
                if ($opsId === '') continue;
                $noRek = preg_replace('/[^0-9]/', '', $row['no_rek'] ?? '');
                $gajiStmt->execute([
                    ':oid' => $opsId,
                    ':ts' => parseTimestamp($row['timestamp'] ?? ''),
                    ':email' => mb_substr(trim($row['email'] ?? ''), 0, 100),
                    ':nama' => mb_substr(trim($row['nama_ktp'] ?? ''), 0, 100),
                    ':nik' => mb_substr(trim($row['nik'] ?? ''), 0, 20),
                    ':lok' => mb_substr(trim($row['lokasi_kerja'] ?? ''), 0, 100),
                    ':tgl' => mb_substr(trim($row['tgl_lahir'] ?? ''), 0, 30),
                    ':alamat' => trim($row['alamat'] ?? ''),
                    ':hp' => mb_substr(trim($row['no_hp'] ?? ''), 0, 30),
                    ':rek' => mb_substr($noRek, 0, 50),
                    ':atas' => mb_substr(trim($row['atas_nama'] ?? ''), 0, 100),
                    ':bank' => mb_substr(trim($row['bank'] ?? ''), 0, 100),
                ]);
                $inserted++;
            }
        }

        // Process Link Pergantian Rekening
        $pergData = $body['link_pergantian_rek'] ?? [];
        if (!empty($pergData)) {
            $pergStmt = $db->prepare("INSERT INTO kalsul_rekening (ops_id, source, timestamp_gas, email, nama_sesuai_ktp, penempatan, no_rek, atas_nama, bank) VALUES (:oid, 'link_pergantian_rek', :ts, :email, :nama, :pen, :rek, :atas, :bank)");

            foreach ($pergData as $row) {
                $opsId = trim($row['ops_id'] ?? '');
                if ($opsId === '') continue;
                $noRek = preg_replace('/[^0-9]/', '', $row['no_rek'] ?? '');
                $pergStmt->execute([
                    ':oid' => $opsId,
                    ':ts' => parseTimestamp($row['timestamp'] ?? ''),
                    ':email' => mb_substr(trim($row['email'] ?? ''), 0, 100),
                    ':nama' => mb_substr(trim($row['nama'] ?? ''), 0, 100),
                    ':pen' => mb_substr(trim($row['penempatan'] ?? ''), 0, 100),
                    ':rek' => mb_substr($noRek, 0, 50),
                    ':atas' => mb_substr(trim($row['atas_nama'] ?? ''), 0, 100),
                    ':bank' => mb_substr(trim($row['bank'] ?? ''), 0, 100),
                ]);
                $inserted++;
            }
        }

        echo json_encode(['inserted' => $inserted]);
        exit;

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage(), 'line' => $e->getLine()]);
        exit;
    }
}

// ── GET endpoints ──
try {
    require_once __DIR__ . '/config.php';
} catch (Exception $e) {}

if ($action === 'summary') {
    try {
        $db = getDB2();

        // Get all employees
        $employees = $db->query('SELECT ops_id, nama FROM kalsul_employees')->fetchAll();
        $total = count($employees);

        // Get latest rekening per ops_id
        $rekMap = [];
        $rekRows = $db->query("
            SELECT r1.ops_id, r1.no_rek, r1.atas_nama FROM kalsul_rekening r1
            INNER JOIN (
                SELECT ops_id, MAX(COALESCE(timestamp_gas, created_at)) as max_ts
                FROM kalsul_rekening GROUP BY ops_id
            ) r2 ON r1.ops_id = r2.ops_id AND COALESCE(r1.timestamp_gas, r1.created_at) = r2.max_ts
            GROUP BY r1.ops_id
        ")->fetchAll();
        foreach ($rekRows as $r) {
            $rekMap[$r['ops_id']] = $r;
        }

        // Count pergantian
        $pergantian = (int)$db->query("SELECT COUNT(DISTINCT ops_id) FROM kalsul_rekening WHERE source = 'link_pergantian_rek'")->fetchColumn();

        // Compute stats per employee
        $done = 0; $kosong = 0; $abnormal = 0;
        foreach ($employees as $emp) {
            $opsNum = preg_replace('/^ops/i', '', $emp['ops_id']);
            $rek = $rekMap[$emp['ops_id']] ?? $rekMap[$opsNum] ?? null;

            if (!$rek || empty(trim($rek['no_rek'] ?? ''))) {
                $kosong++;
            } else {
                $namaClean = mb_strtoupper(trim($emp['nama']));
                $atasNama = mb_strtoupper(trim($rek['atas_nama'] ?? ''));
                if ($atasNama === '') {
                    $kosong++;
                } else {
                    similar_text($namaClean, $atasNama, $pct);
                    if ($pct >= 80) { $done++; } else { $abnormal++; }
                }
            }
        }

        // Datasets count
        $datasets = (int)$db->query('SELECT COUNT(*) FROM kalsul_datasets')->fetchColumn();

        echo json_encode([
            'total_employees' => $total,
            'total_datasets' => $datasets,
            'done' => $done,
            'kosong' => $kosong,
            'abnormal' => $abnormal,
            'with_rekening' => $done + $abnormal,
            'without_rekening' => $kosong,
            'pergantian_count' => $pergantian,
        ]);
    } catch (Exception $e) {
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}

// Auth required for other actions
if (function_exists('requireAuth')) {
    $user = requireAuth();
}
$db = getDB2();
$total = (int)$db->query('SELECT COUNT(*) FROM kalsul_employees')->fetchColumn();
$datasets = (int)$db->query('SELECT COUNT(*) FROM kalsul_datasets')->fetchColumn();
echo json_encode(['total_employees' => $total, 'total_datasets' => $datasets]);
