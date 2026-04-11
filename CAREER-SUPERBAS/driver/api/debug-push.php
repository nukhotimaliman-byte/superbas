<?php
/**
 * Debug Push Subscription — Run AFTER login
 * Tests the full subscribe flow server-side
 */
require_once __DIR__ . '/../config.php';

header('Content-Type: application/json');

$action = $_GET['action'] ?? '';

// Show debug info
if ($action === '' || $action === 'debug') {
    $db = getDB();
    
    $info = [
        'php_version' => PHP_VERSION,
        'session_user_id' => $_SESSION['user_id'] ?? 'NOT SET',
        'session_user_name' => $_SESSION['user_name'] ?? 'NOT SET',
        'session_admin_id' => $_SESSION['admin_id'] ?? 'NOT SET',
    ];
    
    try {
        $subs = $db->query("SELECT id, user_id, LEFT(endpoint,80) as endpoint_short, created_at FROM push_subscriptions ORDER BY id DESC LIMIT 10")->fetchAll();
        $info['subscriptions'] = $subs;
        $info['subscription_count'] = count($subs);
    } catch (Exception $e) {
        $info['error'] = $e->getMessage();
    }
    
    try {
        $notifs = $db->query("SELECT id, user_id, title, LEFT(message,50) as msg, is_read, created_at FROM notifications ORDER BY id DESC LIMIT 10")->fetchAll();
        $info['notifications'] = $notifs;
    } catch (Exception $e) {
        $info['notif_error'] = $e->getMessage();
    }
    
    echo json_encode($info, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

// Test subscribe endpoint directly
if ($action === 'test_subscribe') {
    if (empty($_SESSION['user_id'])) {
        echo json_encode(['error' => 'Not logged in! Login first at /driver/login.html']);
        exit;
    }
    
    echo json_encode([
        'ok' => true,
        'user_id' => $_SESSION['user_id'],
        'message' => 'Session is valid. Subscribe should work from JS.'
    ]);
    exit;
}

echo json_encode(['error' => 'Unknown action. Use: ?action=debug or ?action=test_subscribe']);
