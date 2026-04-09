<?php
/**
 * BAS Recruitment — Daily Worker Payroll API
 * GET /api/payroll.php?user_id=xxx
 */
require_once __DIR__ . '/config.php';

function getDWDB() {
    return new PDO('mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4', DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
}

function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $user_id = intval($_GET['user_id'] ?? 0);
    if (!$user_id) jsonResponse(['error' => 'user_id diperlukan'], 400);

    try {
        $db = getDWDB();
        
        // Find nik from candidates_dw using user_id
        $stmtNik = $db->prepare('SELECT nik FROM candidates_dw WHERE user_id = ?');
        $stmtNik->execute([$user_id]);
        $cand = $stmtNik->fetch();
        
        if (!$cand || empty($cand['nik'])) {
            jsonResponse(['success' => true, 'payroll' => []]);
        }
        
        $nik = $cand['nik'];
        
        // Get everything from payroll_dw for this NIK
        $stmtPay = $db->prepare('SELECT * FROM payroll_dw WHERE nik = ? ORDER BY period DESC');
        $stmtPay->execute([$nik]);
        $payroll = $stmtPay->fetchAll();
        
        // Return structured data for the frontend
        jsonResponse([
            'success' => true,
            'payroll' => $payroll
        ]);

    } catch (PDOException $e) {
        jsonResponse(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
} else {
    jsonResponse(['error' => 'Method not allowed'], 405);
}
