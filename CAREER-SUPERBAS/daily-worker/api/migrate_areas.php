<?php
/**
 * Migration Script
 * Adds allowed_areas column to dw_admins
 */
require_once __DIR__ . '/../config.php';

$db = getDB();
try {
    $db->exec("ALTER TABLE dw_admins ADD COLUMN allowed_areas TEXT DEFAULT NULL");
    echo "Success: Column 'allowed_areas' added successfully.";
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
        echo "Info: Column 'allowed_areas' already exists.";
    } else {
        echo "Error: " . $e->getMessage();
    }
}
