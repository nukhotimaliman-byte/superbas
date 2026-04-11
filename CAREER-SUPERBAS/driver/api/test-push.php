<?php
/**
 * Test Push Notification - Debug endpoint
 * Usage: https://super-bas.com/driver/api/test-push.php
 * 
 * This will show:
 * 1. Whether push tables exist
 * 2. How many subscriptions are stored
 * 3. Try sending a test push to yourself
 */
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../lib/WebPush.php';

header('Content-Type: text/plain; charset=utf-8');

echo "=== Push Notification Debug ===\n\n";

// 1. Check tables
$db = getDB();
try {
    $count = $db->query("SELECT COUNT(*) FROM push_subscriptions")->fetchColumn();
    echo "✅ push_subscriptions table exists — $count subscription(s)\n";
    
    if ($count > 0) {
        $subs = $db->query("SELECT id, user_id, LEFT(endpoint, 60) as ep, created_at FROM push_subscriptions ORDER BY id DESC LIMIT 10")->fetchAll();
        foreach ($subs as $s) {
            echo "   #{$s['id']} user_id={$s['user_id']} ep={$s['ep']}... ({$s['created_at']})\n";
        }
    }
} catch (Exception $e) {
    echo "❌ push_subscriptions table MISSING! Run setup-push.php first\n";
    echo "   Error: " . $e->getMessage() . "\n";
}

echo "\n";

try {
    $count2 = $db->query("SELECT COUNT(*) FROM notifications")->fetchColumn();
    echo "✅ notifications table exists — $count2 notification(s)\n";
} catch (Exception $e) {
    echo "❌ notifications table MISSING! Run setup-push.php first\n";
}

echo "\n";

// 2. Check VAPID
echo "=== VAPID Config ===\n";
echo "Public Key: " . substr(VAPID_PUBLIC_KEY, 0, 20) . "...\n";
echo "Subject: " . VAPID_SUBJECT . "\n";

// 3. Check OpenSSL
echo "\n=== OpenSSL ===\n";
echo "OpenSSL available: " . (function_exists('openssl_sign') ? 'YES' : 'NO') . "\n";

// Try creating VAPID JWT
try {
    $pusher = new WebPushSender(VAPID_PUBLIC_KEY, VAPID_PEM, VAPID_SUBJECT);
    echo "✅ WebPushSender created successfully\n";
} catch (Exception $e) {
    echo "❌ WebPushSender ERROR: " . $e->getMessage() . "\n";
}

// 4. Try test push to first subscription
if ($count > 0) {
    echo "\n=== Test Push to First Subscription ===\n";
    $sub = $db->query("SELECT * FROM push_subscriptions ORDER BY id DESC LIMIT 1")->fetch();
    echo "Sending to user_id={$sub['user_id']}, endpoint=" . substr($sub['endpoint'], 0, 60) . "...\n";
    
    try {
        $result = $pusher->send($sub['endpoint']);
        echo "Result: " . json_encode($result) . "\n";
        
        if ($result['success']) {
            echo "✅ Push sent successfully! Check your phone.\n";
        } else {
            echo "❌ Push failed. Status: {$result['status']}, Reason: {$result['reason']}\n";
            if ($result['status'] == 410 || $result['status'] == 404) {
                echo "   → Subscription expired, user needs to re-subscribe\n";
            }
        }
    } catch (Exception $e) {
        echo "❌ Exception: " . $e->getMessage() . "\n";
    }
}

echo "\n=== PHP Version: " . PHP_VERSION . " ===\n";
echo "=== cURL: " . (function_exists('curl_init') ? 'YES' : 'NO') . " ===\n";
echo "\nDone. Delete this file after debugging.\n";
