#!/usr/local/bin/php
<?php
header('Content-Type: text/plain; charset=utf-8');
echo "=== BAS Owner PHP Installer ===\n\n";

$ownerDir = dirname(__FILE__) . '/owner';
$ts = time();
$repoZip = "https://github.com/nukhotimaliman-byte/superbas/archive/refs/heads/main.zip?t={$ts}";
$tmpZip  = dirname(__FILE__) . '/tmp-owner-install.zip';

echo "Target: $ownerDir\n";
echo "Downloading from GitHub...\n";
$ch = curl_init($repoZip);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_TIMEOUT, 120);
curl_setopt($ch, CURLOPT_USERAGENT, 'BAS-Deploy/1.0');
$data = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$err = curl_error($ch);
curl_close($ch);

if ($httpCode !== 200 || !$data) { die("FAIL: HTTP $httpCode - $err\n"); }
file_put_contents($tmpZip, $data);
echo "Downloaded: " . round(filesize($tmpZip)/1024) . " KB\n\n";

$zip = new ZipArchive;
if ($zip->open($tmpZip) !== TRUE) { die("FAIL: Cannot open ZIP\n"); }

$firstEntry = $zip->getNameIndex(0);
$repoPrefix = explode('/', $firstEntry)[0];
$prefix = $repoPrefix . '/CAREER-SUPERBAS/owner/';
echo "Prefix: $prefix\nEntries: {$zip->numFiles}\n\n";

$count = 0;
for ($i = 0; $i < $zip->numFiles; $i++) {
    $name = $zip->getNameIndex($i);
    if (strpos($name, $prefix) !== 0) continue;
    $rel = substr($name, strlen($prefix));
    if (empty($rel) || substr($rel, -1) === '/') continue;
    if (!preg_match('/\.(php|htaccess)$/i', $rel)) continue;
    if (strpos($rel, 'install') !== false) continue;

    $dest = $ownerDir . '/' . $rel;
    $dir  = dirname($dest);
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    $content = $zip->getFromIndex($i);
    if ($content === false) { echo "FAIL: $rel\n"; continue; }
    file_put_contents($dest, $content);
    echo "OK: $rel (" . strlen($content) . " bytes)\n";
    $count++;
}
$zip->close();
@unlink($tmpZip);

if (!is_dir($ownerDir . '/data')) { mkdir($ownerDir . '/data', 0755, true); echo "OK: data/ created\n"; }

echo "\n=== Done: $count files ===\n";
if ($count > 0) { @unlink(__FILE__); echo "Installer removed.\n"; }
