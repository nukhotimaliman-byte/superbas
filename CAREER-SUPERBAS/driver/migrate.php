<?php
require_once __DIR__ . '/api/config.php';
$sql = file_get_contents(__DIR__ . '/migrate.sql');
$db = getDB();
try {
    $db->exec($sql);
    echo "Migration successful!\n";
} catch (PDOException $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
}
