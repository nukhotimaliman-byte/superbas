<?php
/**
 * BAS Recruitment — Daily Worker Document Upload
 * POST /api/documents.php — Upload KTP
 */
require_once __DIR__ . '/config.php';

function getDWDB() {
    return new PDO('mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4', DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);
}

function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $user_id = intval($_POST['user_id'] ?? 0);
    $docType = $_POST['doc_type'] ?? '';

    if (!$user_id) jsonResponse(['error' => 'User ID wajib'], 400);
    if ($docType !== 'KTP') jsonResponse(['error' => 'Tipe dokumen tidak valid'], 400);

    // Verify user exists in candidates_dw
    $db = getDWDB();
    $stmt = $db->prepare('SELECT id FROM candidates_dw WHERE user_id = ?');
    $stmt->execute([$user_id]);
    if (!$stmt->fetch()) {
        // If not exist, create dummy row first so we can update ktp_path
        // OPS ID dibiarkan NULL — akan diisi oleh korlap/owner nanti
        $stmt = $db->prepare("INSERT INTO candidates_dw (user_id) VALUES (?)");
        $stmt->execute([$user_id]);
    }

    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        jsonResponse(['error' => 'Upload error'], 400);
    }

    $file = $_FILES['file'];
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, ['jpg', 'jpeg', 'png', 'pdf'])) {
        jsonResponse(['error' => 'Format file tidak diizinkan. Gunakan JPG, PNG, atau PDF.'], 400);
    }

    $uploadDir = __DIR__ . '/uploads/berkas/';
    if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);

    $filename = 'ktp_' . $user_id . '_' . time() . '.' . $ext;
    $filepath = $uploadDir . $filename;

    if (move_uploaded_file($file['tmp_name'], $filepath)) {
        // Save to DB
        $stmt = $db->prepare('UPDATE candidates_dw SET ktp_path = ? WHERE user_id = ?');
        $stmt->execute([$filename, $user_id]);

        jsonResponse([
            'success' => true,
            'message' => 'KTP berhasil diupload',
            'file' => $filename
        ], 201);
    } else {
        jsonResponse(['error' => 'Gagal memindahkan file ke server'], 500);
    }

} else {
    jsonResponse(['error' => 'Method not allowed'], 405);
}
