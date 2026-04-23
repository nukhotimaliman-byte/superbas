<?php
/**
 * BAS Recruitment — Push Notification API
 *
 * Actions:
 *   GET  ?action=vapid_key                 → returns public VAPID key
 *   POST ?action=subscribe                 → save push subscription
 *   POST ?action=unsubscribe               → remove subscription
 *   POST ?action=send                      → send push to specific user(s) (admin)
 *   GET  ?action=latest                    → get latest unread notification (for SW)
 *   GET  ?action=unread_count              → count unread drv_notifications
 *   POST ?action=mark_read                 → mark notification(s) as read
 *   GET  ?action=list                      → list drv_notifications for user
 */
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../lib/WebPush.php';

$action = $_GET['action'] ?? $_POST['action'] ?? '';

// ══════════════════════════════════════════════════════
// Public: Return VAPID public key
// ══════════════════════════════════════════════════════
if ($action === 'vapid_key') {
    jsonResponse(['publicKey' => VAPID_PUBLIC_KEY]);
}

// ══════════════════════════════════════════════════════
// User: Subscribe to push
// ══════════════════════════════════════════════════════
if ($action === 'subscribe' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $user = requireUser();
    $data = json_decode(file_get_contents('php://input'), true);

    $endpoint = $data['endpoint'] ?? '';
    $p256dh   = $data['keys']['p256dh'] ?? '';
    $auth     = $data['keys']['auth'] ?? '';

    if (!$endpoint) jsonResponse(['error' => 'Missing endpoint'], 400);

    $db = getDB();

    // Upsert: replace if same endpoint exists
    $db->prepare("DELETE FROM drv_push_subscriptions WHERE endpoint = ?")->execute([$endpoint]);

    $stmt = $db->prepare("INSERT INTO drv_push_subscriptions (user_id, endpoint, p256dh, auth_key) VALUES (?, ?, ?, ?)");
    $stmt->execute([$user['id'], $endpoint, $p256dh, $auth]);

    jsonResponse(['ok' => true, 'message' => 'Subscribed']);
}

// ══════════════════════════════════════════════════════
// User: Unsubscribe
// ══════════════════════════════════════════════════════
if ($action === 'unsubscribe' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $user = requireUser();
    $data = json_decode(file_get_contents('php://input'), true);
    $endpoint = $data['endpoint'] ?? '';
    if ($endpoint) {
        getDB()->prepare("DELETE FROM drv_push_subscriptions WHERE user_id = ? AND endpoint = ?")->execute([$user['id'], $endpoint]);
    }
    jsonResponse(['ok' => true]);
}

// ══════════════════════════════════════════════════════
// Admin: Send push notification to user(s)
// ══════════════════════════════════════════════════════
if ($action === 'send' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $admin = requireAuth();
    $data  = json_decode(file_get_contents('php://input'), true);

    $userIds = $data['user_ids'] ?? [];
    $title   = trim($data['title'] ?? 'Notifikasi BAS');
    $message = trim($data['message'] ?? '');

    if (empty($userIds) || !$message) {
        jsonResponse(['error' => 'user_ids dan message wajib diisi'], 400);
    }

    $db = getDB();

    // 1. Save notification records
    $stmtNotif = $db->prepare(
        "INSERT INTO drv_notifications (user_id, type, title, message, created_by) VALUES (?, 'korlap_note', ?, ?, ?)"
    );
    foreach ($userIds as $uid) {
        $stmtNotif->execute([$uid, $title, $message, $admin['id']]);
    }

    // 2. Send Web Push with payload to each subscription
    $placeholders = implode(',', array_fill(0, count($userIds), '?'));
    $subs = $db->prepare("SELECT * FROM drv_push_subscriptions WHERE user_id IN ($placeholders)");
    $subs->execute($userIds);
    $subscriptions = $subs->fetchAll();

    $pusher = new WebPushSender(VAPID_PUBLIC_KEY, VAPID_PEM, VAPID_SUBJECT);
    $results = ['sent' => 0, 'failed' => 0, 'expired' => 0];

    $pushPayload = [
        'title' => $title,
        'body'  => $message,
        'url'   => '/driver/daftar.html',
    ];

    foreach ($subscriptions as $sub) {
        $result = $pusher->send(
            $sub['endpoint'],
            $sub['p256dh'] ?? '',
            $sub['auth_key'] ?? '',
            $pushPayload
        );
        if ($result['success']) {
            $results['sent']++;
        } elseif ($result['status'] == 410 || $result['status'] == 404) {
            $db->prepare("DELETE FROM drv_push_subscriptions WHERE id = ?")->execute([$sub['id']]);
            $results['expired']++;
        } else {
            $results['failed']++;
        }
    }

    jsonResponse([
        'ok' => true,
        'message' => "Push terkirim ke {$results['sent']} device",
        'details' => $results
    ]);
}

// ══════════════════════════════════════════════════════
// SW / User: Get latest unread notification
// ══════════════════════════════════════════════════════
if ($action === 'latest') {
    // Try to identify user from session
    $userId = $_SESSION['user_id'] ?? 0;
    if (!$userId) jsonResponse(['title' => 'BAS Recruitment', 'body' => 'Ada notifikasi baru']);

    $db = getDB();
    $stmt = $db->prepare(
        "SELECT id, title, message, created_at FROM drv_notifications WHERE user_id = ? AND is_read = 0 ORDER BY id DESC LIMIT 1"
    );
    $stmt->execute([$userId]);
    $n = $stmt->fetch();

    if ($n) {
        jsonResponse([
            'id'    => $n['id'],
            'title' => $n['title'],
            'body'  => $n['message'],
            'url'   => '/driver/daftar.html',
            'time'  => $n['created_at']
        ]);
    } else {
        jsonResponse(['title' => 'BAS Recruitment', 'body' => 'Ada notifikasi baru']);
    }
}

// ══════════════════════════════════════════════════════
// User: Count unread drv_notifications
// ══════════════════════════════════════════════════════
if ($action === 'unread_count') {
    $user = requireUser();
    $db = getDB();
    $stmt = $db->prepare("SELECT COUNT(*) FROM drv_notifications WHERE user_id = ? AND is_read = 0");
    $stmt->execute([$user['id']]);
    jsonResponse(['count' => (int)$stmt->fetchColumn()]);
}

// ══════════════════════════════════════════════════════
// User: List drv_notifications
// ══════════════════════════════════════════════════════
if ($action === 'list') {
    $user = requireUser();
    $db = getDB();
    $stmt = $db->prepare(
        "SELECT id, type, title, message, is_read, created_at 
         FROM drv_notifications WHERE user_id = ? ORDER BY id DESC LIMIT 50"
    );
    $stmt->execute([$user['id']]);
    jsonResponse(['notifications' => $stmt->fetchAll()]);
}

// ══════════════════════════════════════════════════════
// User: Mark notification(s) as read
// ══════════════════════════════════════════════════════
if ($action === 'mark_read' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $user = requireUser();
    $data = json_decode(file_get_contents('php://input'), true);
    $db = getDB();

    if (!empty($data['all'])) {
        $db->prepare("UPDATE drv_notifications SET is_read = 1 WHERE user_id = ?")->execute([$user['id']]);
    } elseif (!empty($data['id'])) {
        $db->prepare("UPDATE drv_notifications SET is_read = 1 WHERE id = ? AND user_id = ?")->execute([$data['id'], $user['id']]);
    }
    jsonResponse(['ok' => true]);
}

jsonResponse(['error' => 'Invalid action'], 400);
