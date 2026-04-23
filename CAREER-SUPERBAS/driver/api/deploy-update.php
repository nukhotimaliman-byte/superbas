<?php
/**
 * Emergency File Deploy — uploads files from base64 POST
 * Usage: POST to this endpoint with JSON { "files": { "path": "base64content", ... } }
 * DELETE THIS FILE AFTER USE!
 */
header('Content-Type: application/json');

// Simple auth — change this token
$TOKEN = 'bas-deploy-2026';

$auth = $_GET['token'] ?? '';
if ($auth !== $TOKEN) {
    http_response_code(403);
    echo json_encode(['error' => 'Invalid token']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Health check
    echo json_encode(['status' => 'ready', 'doc_root' => $_SERVER['DOCUMENT_ROOT']]);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if (!$input || empty($input['files'])) {
    echo json_encode(['error' => 'No files specified']);
    exit;
}

$results = [];
$docRoot = $_SERVER['DOCUMENT_ROOT'];

foreach ($input['files'] as $relPath => $base64) {
    $fullPath = $docRoot . '/' . ltrim($relPath, '/');
    $dir = dirname($fullPath);
    
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    
    $content = base64_decode($base64);
    if ($content === false) {
        $results[$relPath] = 'ERROR: invalid base64';
        continue;
    }
    
    $written = file_put_contents($fullPath, $content);
    if ($written === false) {
        $results[$relPath] = 'ERROR: write failed';
    } else {
        $results[$relPath] = 'OK (' . $written . ' bytes)';
    }
}

echo json_encode(['results' => $results]);
