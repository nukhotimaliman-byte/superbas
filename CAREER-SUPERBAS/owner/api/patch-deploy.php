<?php
/**
 * One-time patch: Update git-deploy.php + importrange.php on server
 * DELETE THIS FILE AFTER USE
 */
$key = $_GET['key'] ?? '';
if ($key !== 'BAS2026') die('❌ Invalid key');

header('Content-Type: text/plain; charset=utf-8');
$results = [];

// 1. Patch git-deploy.php — allow daily-worker/api/ PHP files
$deployFile = dirname(__DIR__, 2) . '/git-deploy.php';
if (file_exists($deployFile)) {
    $content = file_get_contents($deployFile);
    $old = "strpos(\$relativePath, 'owner/') !== 0) continue;";
    $new = "strpos(\$relativePath, 'owner/') !== 0 && strpos(\$relativePath, 'daily-worker/api/') !== 0) continue;";
    if (strpos($content, $new) !== false) {
        $results[] = "✅ git-deploy.php already patched";
    } elseif (strpos($content, $old) !== false) {
        $content = str_replace($old, $new, $content);
        file_put_contents($deployFile, $content);
        $results[] = "✅ git-deploy.php PATCHED — daily-worker/api/ now allowed";
    } else {
        $results[] = "⚠️ git-deploy.php — pattern not found, manual check needed";
    }
} else {
    $results[] = "❌ git-deploy.php not found at: $deployFile";
}

// 2. Patch importrange.php — ORDER BY last_synced_at DESC
$irFile = dirname(__DIR__, 2) . '/daily-worker/api/importrange.php';
if (file_exists($irFile)) {
    $content = file_get_contents($irFile);
    $old2 = 'ORDER BY id ASC LIMIT';
    $new2 = 'ORDER BY last_synced_at DESC LIMIT';
    if (strpos($content, $new2) !== false) {
        $results[] = "✅ importrange.php already has correct ORDER BY";
    } elseif (strpos($content, $old2) !== false) {
        $content = str_replace($old2, $new2, $content);
        file_put_contents($irFile, $content);
        $results[] = "✅ importrange.php PATCHED — ORDER BY last_synced_at DESC";
    } else {
        $results[] = "⚠️ importrange.php — ORDER BY pattern not found";
    }
} else {
    $results[] = "❌ importrange.php not found at: $irFile";
}

echo "=== BAS Patch Deploy ===\n\n";
foreach ($results as $r) echo "$r\n";
echo "\n⚠️ DELETE THIS FILE after confirming patches work!\n";
