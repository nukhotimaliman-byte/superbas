<?php
/**
 * Diagnostic: Check document file status
 * Access: super-bas.com/driver/api/check-docs.php
 * DELETE THIS FILE AFTER USE!
 */
header('Content-Type: application/json');
require_once __DIR__ . '/../config.php';

$db = getDB();
$docs = $db->query('SELECT id, file_path FROM drv_documents ORDER BY id DESC LIMIT 10')->fetchAll();

$result = [
    'upload_dir' => UPLOAD_DIR,
    'upload_dir_exists' => is_dir(UPLOAD_DIR),
    'upload_dir_contents_count' => is_dir(UPLOAD_DIR) ? count(scandir(UPLOAD_DIR)) - 2 : 0,
    'documents' => []
];

foreach ($docs as $doc) {
    $fullPath = UPLOAD_DIR . $doc['file_path'];
    $result['documents'][] = [
        'id' => $doc['id'],
        'file_path' => $doc['file_path'],
        'full_path' => $fullPath,
        'exists' => file_exists($fullPath),
        'size' => file_exists($fullPath) ? filesize($fullPath) : null
    ];
}

echo json_encode($result, JSON_PRETTY_PRINT);
