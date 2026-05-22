<?php
$TOKEN = 'bas2026';
if (($_GET['token'] ?? '') !== $TOKEN) { die('Token salah'); }
header('Content-Type: text/plain; charset=utf-8');

// NEW parseTimestamp function (same as gaji-status.php)
function parseTimestamp($val) {
    if (empty($val)) return date('Y-m-d H:i:s');
    $val = trim($val);
    if (preg_match('/^\d{4}-\d{2}-\d{2}/', $val)) return substr($val, 0, 19);
    if (preg_match('#^(\d{1,2})/(\d{1,2})/(\d{4})(?:\s+(\d{1,2}):(\d{2}):(\d{2}))?#', $val, $m)) {
        $a = (int)$m[1]; 
        $b = (int)$m[2];
        $year = (int)$m[3];
        $h = (int)($m[4] ?? 0);
        $min = (int)($m[5] ?? 0);
        $sec = (int)($m[6] ?? 0);
        if ($a > 12) { $month = $b; $day = $a; }
        else { $month = $a; $day = $b; }
        return sprintf('%04d-%02d-%02d %02d:%02d:%02d', $year, $month, $day, $h, $min, $sec);
    }
    $ts = strtotime($val);
    if ($ts !== false) return date('Y-m-d H:i:s', $ts);
    return date('Y-m-d H:i:s');
}

echo "=== PARSE TEST (NEW LOGIC) ===\n";
$tests = [
    ['5/20/2026 9:02:15',       'GAS US format mm/dd/yyyy'],
    ['20/5/2026 9:02:15',       'EU format dd/mm/yyyy (day>12, auto-detect)'],
    ['05/20/2026 09:02:15',     'GAS US padded'],
    ['12/5/2026 14:30:00',      'Ambiguous: 12=month, 5=day (GAS default)'],
    ['5/12/2026 14:30:00',      'Ambiguous: 5=month, 12=day (GAS default)'],
    ['2026-05-20 09:02:15',     'MySQL format (pass-through)'],
];
foreach ($tests as [$t, $desc]) {
    $parsed = parseTimestamp($t);
    $date = new DateTime($parsed);
    $readable = $date->format('d M Y H:i:s');
    echo "$desc\n  Input:  [$t]\n  Output: [$parsed] → $readable\n\n";
}
