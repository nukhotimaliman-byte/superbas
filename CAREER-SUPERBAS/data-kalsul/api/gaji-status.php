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
                    ':ts' => $row['timestamp'] ?? date('Y-m-d H:i:s'),
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
                    ':ts' => $row['timestamp'] ?? date('Y-m-d H:i:s'),
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
        $total = (int)$db->query('SELECT COUNT(DISTINCT ops_id) FROM kalsul_employees')->fetchColumn();
        $withRek = (int)$db->query("SELECT COUNT(DISTINCT e.ops_id) FROM kalsul_employees e INNER JOIN kalsul_rekening r ON e.ops_id = r.ops_id WHERE r.no_rek != ''")->fetchColumn();
        $pergantian = (int)$db->query("SELECT COUNT(DISTINCT ops_id) FROM kalsul_rekening WHERE source = 'link_pergantian_rek'")->fetchColumn();

        echo json_encode([
            'total_employees' => $total,
            'with_rekening' => $withRek,
            'without_rekening' => $total - $withRek,
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
