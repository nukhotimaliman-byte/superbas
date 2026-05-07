<?php
require_once __DIR__ . '/../config.php';
header('Content-Type: text/plain');

$db = getDB();
$name = 'Super Owner';
$username = 'superowner';
$password = password_hash('password', PASSWORD_DEFAULT);
$role = 'owner';

$stmt = $db->prepare('SELECT id FROM drv_admins WHERE username = ? LIMIT 1');
$stmt->execute([$username]);
if ($stmt->fetch()) {
    echo "User '$username' already exists. Updating password...\n";
    $db->prepare('UPDATE drv_admins SET password = ?, role = ? WHERE username = ?')->execute([$password, $role, $username]);
    echo "Done.\n";
} else {
    $db->prepare('INSERT INTO drv_admins (name, username, password, role) VALUES (?, ?, ?, ?)')->execute([$name, $username, $password, $role]);
    echo "Created owner account: $username\n";
}
unlink(__FILE__);
echo "Script removed.\n";
