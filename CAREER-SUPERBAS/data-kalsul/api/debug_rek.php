<?php
/* Debug: test upload session */
require_once __DIR__ . '/config.php';

header('Content-Type: application/json');
echo json_encode([
    'session' => [
        'kalsul_admin_id' => $_SESSION['kalsul_admin_id'] ?? null,
        'kalsul_admin_name' => $_SESSION['kalsul_admin_name'] ?? null,
        'kalsul_admin_role' => $_SESSION['kalsul_admin_role'] ?? null,
    ],
    'method' => $_SERVER['REQUEST_METHOD'],
    'content_type' => $_SERVER['CONTENT_TYPE'] ?? '',
    'raw_input_length' => strlen(file_get_contents('php://input')),
]);
