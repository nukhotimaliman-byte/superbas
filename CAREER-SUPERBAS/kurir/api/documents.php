<?php
/**
 * BAS Recruitment — Document Upload API
 * POST /api/krr_documents.php — Upload document with watermark
 * GET  /api/krr_documents.php?id=X — Serve document for preview (admin only)
 */
require_once __DIR__ . '/../config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    // ── Upload Document ─────────────────────────
    $candidateId = intval($_POST['candidate_id'] ?? 0);
    $docType     = $_POST['doc_type'] ?? '';
    $validTypes  = ['KTP', 'SIM', 'SKCK', 'Surat Sehat', 'Paklaring', 'Pas Photo', 'STNK', 'KK'];

    if (!$candidateId) {
        jsonResponse(['error' => 'Candidate ID wajib'], 400);
    }
    if (!in_array($docType, $validTypes)) {
        jsonResponse(['error' => 'Tipe dokumen tidak valid'], 400);
    }

    // Verify candidate exists
    $db = getDB();
    $stmt = $db->prepare('SELECT id FROM krr_candidates WHERE id = ?');
    $stmt->execute([$candidateId]);
    if (!$stmt->fetch()) {
        jsonResponse(['error' => 'Kandidat tidak ditemukan'], 404);
    }

    // Check file upload
    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        $uploadErrors = [
            UPLOAD_ERR_INI_SIZE   => 'File terlalu besar (server limit)',
            UPLOAD_ERR_FORM_SIZE  => 'File terlalu besar (form limit)',
            UPLOAD_ERR_PARTIAL    => 'Upload tidak selesai',
            UPLOAD_ERR_NO_FILE    => 'Tidak ada file yang diupload',
        ];
        $errCode = $_FILES['file']['error'] ?? UPLOAD_ERR_NO_FILE;
        jsonResponse(['error' => $uploadErrors[$errCode] ?? 'Upload error'], 400);
    }

    $file = $_FILES['file'];

    // Validate size
    if ($file['size'] > MAX_FILE_SIZE) {
        jsonResponse(['error' => 'File melebihi batas 2MB'], 400);
    }

    // Validate extension & mime
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, ALLOWED_EXTENSIONS)) {
        jsonResponse(['error' => 'Format file tidak diizinkan. Gunakan JPG, PNG, atau PDF.'], 400);
    }

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    unset($finfo);
    if (!in_array($mime, ALLOWED_MIME_TYPES)) {
        jsonResponse(['error' => 'Tipe file tidak valid'], 400);
    }

    // Check if doc type already uploaded for this candidate
    $stmt = $db->prepare('SELECT id FROM krr_documents WHERE candidate_id = ? AND doc_type = ?');
    $stmt->execute([$candidateId, $docType]);
    $existingDoc = $stmt->fetch();

    // Generate unique filename
    $filename = 'doc_' . $candidateId . '_' . str_replace(' ', '_', $docType) . '_' . time() . '.' . $ext;
    $filepath = UPLOAD_DIR . $filename;

    // Save file directly (no watermark)
    move_uploaded_file($file['tmp_name'], $filepath);
    // Save or update DB
    if ($existingDoc) {
        $stmt = $db->prepare('UPDATE krr_documents SET file_path = ?, original_name = ?, file_size = ?, uploaded_at = NOW() WHERE id = ?');
        $stmt->execute([$filename, $file['name'], $file['size'], $existingDoc['id']]);
    } else {
        $stmt = $db->prepare('INSERT INTO krr_documents (candidate_id, doc_type, file_path, original_name, file_size) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([$candidateId, $docType, $filename, $file['name'], $file['size']]);
    }

    jsonResponse([
        'success' => true,
        'message' => $docType . ' berhasil diupload',
        'file' => $filename
    ], 201);

} elseif ($method === 'GET' && isset($_GET['id'])) {
    // ── Serve Document for Preview ──────────────
    requireAuth();

    $db = getDB();
    $stmt = $db->prepare('SELECT file_path, original_name FROM krr_documents WHERE id = ?');
    $stmt->execute([$_GET['id']]);
    $doc = $stmt->fetch();

    if (!$doc) {
        jsonResponse(['error' => 'Dokumen tidak ditemukan'], 404);
    }

    $fullPath = UPLOAD_DIR . $doc['file_path'];
    if (!file_exists($fullPath)) {
        jsonResponse(['error' => 'File tidak ditemukan di server'], 404);
    }

    $ext = strtolower(pathinfo($fullPath, PATHINFO_EXTENSION));
    $mimeMap = ['jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'pdf' => 'application/pdf'];
    $contentType = $mimeMap[$ext] ?? 'application/octet-stream';

    header('Content-Type: ' . $contentType);
    header('Content-Disposition: inline; filename="' . $doc['original_name'] . '"');
    header('Content-Length: ' . filesize($fullPath));
    header('Cache-Control: private, max-age=3600');
    readfile($fullPath);
    exit;

} else {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

// ── Watermark Helper ────────────────────────────────
function applyImageWatermark(string $tmpPath, string $ext) {
    if ($ext === 'png') {
        $img = imagecreatefrompng($tmpPath);
    } else {
        $img = imagecreatefromjpeg($tmpPath);
    }

    if (!$img) return false;

    $width  = imagesx($img);
    $height = imagesy($img);

    // Semi-transparent white color for watermark
    $color = imagecolorallocatealpha($img, 255, 255, 255, 80);
    $shadow = imagecolorallocatealpha($img, 0, 0, 0, 90);

    // Calculate font size relative to image
    $fontSize = max(3, min(5, intval($width / 150)));
    $text = WATERMARK_TEXT;
    $textWidth = imagefontwidth($fontSize) * strlen($text);
    $textHeight = imagefontheight($fontSize);

    // Tile watermark diagonally
    for ($y = 0; $y < $height; $y += $textHeight * 6) {
        for ($x = -$textWidth; $x < $width + $textWidth; $x += $textWidth + 40) {
            imagestring($img, $fontSize, $x + 1, $y + 1, $text, $shadow);
            imagestring($img, $fontSize, $x, $y, $text, $color);
        }
    }

    return $img;
}
