<?php
/**
 * API Absen Foto — BAS SUPERBAS V10
 * Endpoint: use the current host deployment URL for this file.
 */

require_once __DIR__ . '/config.php';

// ── CORS ──
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, ALLOWED_ORIGINS)) {
    header("Access-Control-Allow-Origin: $origin");
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ── DB Connection ──
function getDB() {
    static $pdo = null;
    if (!$pdo) {
        $pdo = new PDO(
            'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
            DB_USER, DB_PASS,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]
        );

        ensurePhotoAttendanceSchema($pdo);
    }
    return $pdo;
}

function jsonResponse($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function jsonError($msg, $code = 400) {
    jsonResponse(['error' => $msg], $code);
}

function getBaseUrl() {
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['SERVER_PORT'] ?? '') === '443');
    $scheme = $https ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    return $scheme . '://' . $host;
}

function getUploadUrl($filename = '') {
    $basePath = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? '/api/absen-foto.php'), '/\\');
    $url = getBaseUrl() . $basePath . '/uploads/absen/';
    return $filename ? $url . rawurlencode($filename) : $url;
}

function ensurePhotoAttendanceSchema(PDO $pdo) {
    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM absensi_foto LIKE 'status'");
        if (!$stmt->fetch()) {
            $pdo->exec("ALTER TABLE absensi_foto ADD COLUMN status ENUM('PENDING', 'DITERIMA', 'DITOLAK') NOT NULL DEFAULT 'PENDING' AFTER foto_path");
        }

        $indexes = [
            'idx_status' => "ALTER TABLE absensi_foto ADD INDEX idx_status (status)",
            'idx_station' => "ALTER TABLE absensi_foto ADD INDEX idx_station (station)",
            'idx_date_station' => "ALTER TABLE absensi_foto ADD INDEX idx_date_station (created_at, station)",
            'idx_date_status' => "ALTER TABLE absensi_foto ADD INDEX idx_date_status (created_at, status)"
        ];

        foreach ($indexes as $name => $sql) {
            $idxStmt = $pdo->prepare("SHOW INDEX FROM absensi_foto WHERE Key_name = ?");
            $idxStmt->execute([$name]);
            if (!$idxStmt->fetch()) {
                $pdo->exec($sql);
            }
        }
    } catch (Exception $e) {
    }
}

function sanitizeIdList($rawIds) {
    $ids = array_values(array_filter(array_map(static function ($id) {
        $value = (int) trim((string) $id);
        return $value > 0 ? $value : null;
    }, (array) $rawIds)));

    return array_values(array_unique($ids));
}

function clampInt($value, $min, $max) {
    $number = (int) $value;
    if ($number < $min) return $min;
    if ($number > $max) return $max;
    return $number;
}

function optimizePhotoToJpeg($imageData, $filepath) {
    $img = @imagecreatefromstring($imageData);
    if (!$img) {
        return false;
    }

    $width = imagesx($img);
    $height = imagesy($img);
    $maxDim = PHOTO_MAX_DIMENSION;
    $targetBytes = PHOTO_TARGET_BYTES;

    $dest = $img;
    if ($width > $maxDim || $height > $maxDim) {
        $ratio = min($maxDim / $width, $maxDim / $height);
        $newWidth = max(1, (int) round($width * $ratio));
        $newHeight = max(1, (int) round($height * $ratio));
        $resized = imagecreatetruecolor($newWidth, $newHeight);
        imagecopyresampled($resized, $img, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
        imagedestroy($img);
        $dest = $resized;
        $width = $newWidth;
        $height = $newHeight;
    }

    $quality = PHOTO_JPEG_QUALITY;
    $minQuality = PHOTO_MIN_JPEG_QUALITY;
    $bestBinary = null;
    $bestQuality = $quality;

    while ($quality >= $minQuality) {
        ob_start();
        imagejpeg($dest, null, $quality);
        $binary = ob_get_clean();
        if ($binary === false) {
            break;
        }

        $bestBinary = $binary;
        $bestQuality = $quality;

        if (strlen($binary) <= $targetBytes) {
            break;
        }

        $quality -= 4;
    }

    if ($bestBinary === null) {
        imagedestroy($dest);
        return false;
    }

    $written = file_put_contents($filepath, $bestBinary);
    imagedestroy($dest);

    if ($written === false) {
        return false;
    }

    return [
        'width' => $width,
        'height' => $height,
        'quality' => $bestQuality,
        'bytes' => $written
    ];
}

// ── Route ──
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) jsonError('Invalid JSON body');
    
    $action = $input['action'] ?? '';
    
    switch ($action) {
        case 'checkin':
        case 'checkout':
            handlePhotoUpload($input, $action === 'checkin' ? 'MASUK' : 'KELUAR');
            break;
        case 'update-status':
            handleUpdateStatus($input);
            break;
        case 'delete':
            handleDelete($input);
            break;
        default:
            jsonError('Unknown action: ' . $action);
    }
} elseif ($method === 'GET') {
    $action = $_GET['action'] ?? '';
    
    switch ($action) {
        case 'my-logs':
            handleMyLogs();
            break;
        case 'all-logs':
            handleAllLogs();
            break;
        case 'photo':
            handleServePhoto();
            break;
        case 'download-zip':
            handleDownloadZip();
            break;
        default:
            jsonResponse(['status' => 'OK', 'service' => 'BAS Absen Foto API']);
    }
} else {
    jsonError('Method not allowed', 405);
}

// ═══════════════════════════════════════════════
//  HANDLERS
// ═══════════════════════════════════════════════

function handlePhotoUpload($data, $tipe) {
    // Validate required fields
    $required = ['ops_id', 'nama', 'foto'];
    foreach ($required as $field) {
        if (empty($data[$field])) jsonError("Field '$field' wajib diisi");
    }
    
    $opsId   = trim($data['ops_id']);
    $nama    = trim($data['nama']);
    $foto64  = $data['foto']; // base64 string
    $lat     = $data['latitude'] ?? null;
    $lng     = $data['longitude'] ?? null;
    $alamat  = $data['alamat'] ?? null;
    $station = $data['station'] ?? null;
    
    // Validate base64 size
    if (strlen($foto64) > MAX_PHOTO_SIZE) {
        jsonError('Foto terlalu besar. Ambil ulang dengan jaringan stabil dan jarak kamera normal.');
    }
    
    // Check duplicate: same user, same type, within last 5 minutes
    $db = getDB();
    $dup = $db->prepare("
        SELECT id FROM absensi_foto 
        WHERE ops_id = ? AND tipe = ? AND created_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE)
        LIMIT 1
    ");
    $dup->execute([$opsId, $tipe]);
    if ($dup->fetch()) {
        jsonError('Anda sudah absen ' . strtolower($tipe) . ' dalam 5 menit terakhir');
    }
    
    // Decode base64 and save as file
    $base64Clean = preg_replace('/^data:image\/\w+;base64,/', '', $foto64);
    $imageData = base64_decode($base64Clean);
    if (!$imageData) jsonError('Format foto tidak valid');
    
    // Ensure upload dir exists
    if (!is_dir(UPLOAD_DIR)) {
        mkdir(UPLOAD_DIR, 0755, true);
    }
    
    // Generate filename: YYYYMMDD_HHMMSS_OPSID_TYPE.jpg
    $filename = date('Ymd_His') . '_' . $opsId . '_' . $tipe . '.jpg';
    $filepath = UPLOAD_DIR . $filename;
    
    $meta = optimizePhotoToJpeg($imageData, $filepath);
    if (!$meta) {
        jsonError('Foto tidak valid atau gagal diproses');
    }
    
    // Insert into database
    $stmt = $db->prepare("
        INSERT INTO absensi_foto (ops_id, nama, tipe, foto_path, latitude, longitude, alamat, station)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([$opsId, $nama, $tipe, $filename, $lat, $lng, $alamat, $station]);
    
    jsonResponse([
        'success' => true,
        'message' => 'Absen ' . strtolower($tipe) . ' berhasil!',
        'id' => $db->lastInsertId(),
        'timestamp' => date('Y-m-d H:i:s'),
        'foto_url' => getUploadUrl($filename),
        'compression' => [
            'bytes' => $meta['bytes'],
            'kilobytes' => round($meta['bytes'] / 1024, 1),
            'width' => $meta['width'],
            'height' => $meta['height'],
            'quality' => $meta['quality']
        ]
    ]);
}

function handleMyLogs() {
    $opsId = $_GET['ops_id'] ?? '';
    if (!$opsId) jsonError('ops_id required');
    
    $date = $_GET['date'] ?? date('Y-m-d');
    
    $db = getDB();
    $stmt = $db->prepare("
        SELECT id, ops_id, nama, tipe, foto_path, latitude, longitude, alamat, station, created_at, status
        FROM absensi_foto
        WHERE ops_id = ? AND DATE(created_at) = ?
        ORDER BY created_at DESC
    ");
    $stmt->execute([$opsId, $date]);
    $rows = $stmt->fetchAll();
    
    // Add full photo URL
    foreach ($rows as &$row) {
        $row['foto_url'] = getUploadUrl($row['foto_path']);
    }
    
    jsonResponse($rows);
}

function handleAllLogs() {
    $date = $_GET['date'] ?? date('Y-m-d');
    $station = $_GET['station'] ?? '';
    $search = $_GET['search'] ?? '';
    $status = strtoupper(trim($_GET['status'] ?? ''));
    $page = max(1, (int)($_GET['page'] ?? 1));
    $limit = clampInt($_GET['limit'] ?? PHOTO_LIST_DEFAULT_LIMIT, 1, PHOTO_LIST_MAX_LIMIT);
    $offset = ($page - 1) * $limit;
    
    $db = getDB();
    $where = "DATE(created_at) = ?";
    $params = [$date];
    
    if ($station) {
        $where .= " AND station = ?";
        $params[] = $station;
    }
    if ($search) {
        $where .= " AND (nama LIKE ? OR ops_id LIKE ?)";
        $params[] = "%$search%";
        $params[] = "%$search%";
    }
    if ($status && in_array($status, ['PENDING', 'DITERIMA', 'DITOLAK'], true)) {
        $where .= " AND status = ?";
        $params[] = $status;
    }
    
    // Count total
    $countStmt = $db->prepare("SELECT COUNT(*) FROM absensi_foto WHERE $where");
    $countStmt->execute($params);
    $total = $countStmt->fetchColumn();

    $summaryStmt = $db->prepare("
        SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN tipe = 'MASUK' THEN 1 ELSE 0 END) AS masuk,
            SUM(CASE WHEN tipe = 'KELUAR' THEN 1 ELSE 0 END) AS keluar,
            COUNT(DISTINCT ops_id) AS karyawan,
            SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending,
            SUM(CASE WHEN status = 'DITERIMA' THEN 1 ELSE 0 END) AS diterima,
            SUM(CASE WHEN status = 'DITOLAK' THEN 1 ELSE 0 END) AS ditolak
        FROM absensi_foto
        WHERE $where
    ");
    $summaryStmt->execute($params);
    $summary = $summaryStmt->fetch() ?: [];

    $stationStmt = $db->prepare("
        SELECT DISTINCT station
        FROM absensi_foto
        WHERE DATE(created_at) = ? AND station IS NOT NULL AND station <> ''
        ORDER BY station ASC
    ");
    $stationStmt->execute([$date]);
    $stations = array_values(array_filter(array_map('trim', $stationStmt->fetchAll(PDO::FETCH_COLUMN))));
    
    // Fetch rows
    $stmt = $db->prepare("
        SELECT id, ops_id, nama, tipe, foto_path, latitude, longitude, alamat, station, created_at, status
        FROM absensi_foto
        WHERE $where
        ORDER BY created_at DESC
        LIMIT $limit OFFSET $offset
    ");
    $stmt->execute($params);
    $rows = $stmt->fetchAll();
    
    foreach ($rows as &$row) {
        $row['foto_url'] = getUploadUrl($row['foto_path']);
    }
    
    jsonResponse([
        'data' => $rows,
        'total' => (int)$total,
        'page' => $page,
        'pages' => max(1, (int) ceil(((int) $total) / $limit)),
        'limit' => $limit,
        'summary' => [
            'total' => (int) ($summary['total'] ?? 0),
            'masuk' => (int) ($summary['masuk'] ?? 0),
            'keluar' => (int) ($summary['keluar'] ?? 0),
            'karyawan' => (int) ($summary['karyawan'] ?? 0),
            'pending' => (int) ($summary['pending'] ?? 0),
            'diterima' => (int) ($summary['diterima'] ?? 0),
            'ditolak' => (int) ($summary['ditolak'] ?? 0)
        ],
        'filters' => [
            'stations' => $stations,
            'status' => $status,
            'station' => $station,
            'search' => $search
        ]
    ]);
}

function handleServePhoto() {
    $file = basename($_GET['file'] ?? '');
    if (!$file) jsonError('file required');
    
    $path = UPLOAD_DIR . $file;
    if (!file_exists($path)) {
        http_response_code(404);
        echo 'File not found';
        exit;
    }
    
    header('Content-Type: image/jpeg');
    header('Cache-Control: public, max-age=86400');
    readfile($path);
    exit;
}

function handleUpdateStatus($data) {
    if (empty($data['ids']) || empty($data['status'])) jsonError('Missing ids or status');
    $ids = sanitizeIdList($data['ids']);
    $status = $data['status'];
    if (!in_array($status, ['PENDING', 'DITERIMA', 'DITOLAK'])) jsonError('Invalid status');
    if (!$ids) jsonError('ID tidak valid');
    
    $db = getDB();
    $inKey = str_repeat('?,', count($ids) - 1) . '?';
    $params = array_merge([$status], $ids);
    
    $stmt = $db->prepare("UPDATE absensi_foto SET status = ? WHERE id IN ($inKey)");
    $stmt->execute($params);
    
    jsonResponse(['success' => true, 'updated' => $stmt->rowCount()]);
}

function handleDelete($data) {
    if (empty($data['ids'])) jsonError('Missing ids');
    $ids = sanitizeIdList($data['ids']);
    if (!$ids) jsonError('ID tidak valid');
    $db = getDB();
    $inKey = str_repeat('?,', count($ids) - 1) . '?';
    
    // Get file paths to delete
    $stmt = $db->prepare("SELECT foto_path FROM absensi_foto WHERE id IN ($inKey)");
    $stmt->execute($ids);
    $files = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    foreach ($files as $f) {
        $path = UPLOAD_DIR . $f;
        if (file_exists($path)) @unlink($path);
    }
    
    // Delete records
    $stmt = $db->prepare("DELETE FROM absensi_foto WHERE id IN ($inKey)");
    $stmt->execute($ids);
    
    jsonResponse(['success' => true, 'deleted' => $stmt->rowCount()]);
}

function handleDownloadZip() {
    $idsRaw = $_GET['ids'] ?? '';
    if (!$idsRaw) { http_response_code(400); die('Missing ids'); }
    
    $ids = sanitizeIdList(explode(',', $idsRaw));
    if (empty($ids)) die('No ids');
    
    $db = getDB();
    $inKey = str_repeat('?,', count($ids) - 1) . '?';
    $stmt = $db->prepare("SELECT ops_id, nama, tipe, foto_path, created_at FROM absensi_foto WHERE id IN ($inKey)");
    $stmt->execute($ids);
    $records = $stmt->fetchAll();
    
    if (empty($records)) die('Files not found');
    
    $zip = new ZipArchive();
    $zipName = 'AbsenFoto_' . date('Ymd_His') . '.zip';
    $zipPath = sys_get_temp_dir() . '/' . $zipName;
    
    if ($zip->open($zipPath, ZipArchive::CREATE) !== TRUE) {
        die('Could not create ZIP file');
    }
    
    foreach ($records as $r) {
        $path = UPLOAD_DIR . $r['foto_path'];
        if (file_exists($path)) {
            $dateClean = date('Ymd_Hi', strtotime($r['created_at']));
            $nameClean = preg_replace('/[^a-zA-Z0-9_-]/', '_', $r['nama']);
            $filename = "{$dateClean}_{$r['ops_id']}_{$nameClean}_{$r['tipe']}.jpg";
            $zip->addFile($path, $filename);
        }
    }
    $zip->close();
    
    header('Content-Type: application/zip');
    header('Content-disposition: attachment; filename='.$zipName);
    header('Content-Length: ' . filesize($zipPath));
    readfile($zipPath);
    @unlink($zipPath);
    exit;
}
