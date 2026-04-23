<?php
/**
 * Setup Push Notification tables
 * Run once: https://super-bas.com/driver/api/setup-push.php
 */
require_once __DIR__ . '/../config.php';

$db = getDB();

$queries = [
    "CREATE TABLE IF NOT EXISTS krr_push_subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        endpoint TEXT NOT NULL,
        p256dh VARCHAR(255) DEFAULT '',
        auth_key VARCHAR(255) DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user (user_id),
        INDEX idx_endpoint (endpoint(255))
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

    "CREATE TABLE IF NOT EXISTS krr_notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        type VARCHAR(50) DEFAULT 'korlap_note',
        title VARCHAR(255) DEFAULT '',
        message TEXT DEFAULT '',
        is_read TINYINT(1) DEFAULT 0,
        created_by INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user (user_id),
        INDEX idx_unread (user_id, is_read)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
];

$results = [];
foreach ($queries as $sql) {
    try {
        $db->exec($sql);
        // Extract table name
        preg_match('/CREATE TABLE IF NOT EXISTS (\w+)/', $sql, $m);
        $results[] = "✅ Table '{$m[1]}' — OK";
    } catch (Exception $e) {
        $results[] = "❌ Error: " . $e->getMessage();
    }
}

// Verify tables exist
$tables = $db->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);

header('Content-Type: text/plain');
echo "=== Push Notification Setup ===\n\n";
echo implode("\n", $results) . "\n\n";
echo "=== All Tables in DB ===\n";
echo implode(", ", $tables) . "\n\n";

// Check if krr_push_subscriptions has data
$count = $db->query("SELECT COUNT(*) FROM krr_push_subscriptions")->fetchColumn();
echo "Push subscriptions: $count\n";

$count2 = $db->query("SELECT COUNT(*) FROM krr_notifications")->fetchColumn();
echo "krr_notifications: $count2\n";

echo "\n✅ Setup complete! Push krr_notifications are ready.\n";
echo "You can delete this file after running it.\n";
