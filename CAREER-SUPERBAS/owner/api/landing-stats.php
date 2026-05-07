<?php
/**
 * BAS Super Owner — Landing Stats API (PUBLIC — no auth required)
 * GET /owner/api/landing-stats.php
 */
require_once __DIR__ . '/../config.php';

// No auth required — this is public for the landing page
$settings = getSettings();

if ($settings['landing_stats']['auto_count']) {
    // Auto-count from database
    $db = getDB();
    $drv = $db->query('SELECT COUNT(*) AS cnt FROM drv_candidates')->fetch()['cnt'];
    $kur = $db->query('SELECT COUNT(*) AS cnt FROM krr_candidates')->fetch()['cnt'];
    $dw  = $db->query('SELECT COUNT(*) AS cnt FROM dw_candidates')->fetch()['cnt'];
    $total = intval($drv) + intval($kur) + intval($dw);

    // Count unique cities
    $cityQuery = "
        SELECT COUNT(DISTINCT city) AS cnt FROM (
            SELECT l.name AS city FROM drv_candidates c LEFT JOIN drv_locations l ON c.location_id = l.id WHERE l.name IS NOT NULL
            UNION
            SELECT l.name FROM krr_candidates c LEFT JOIN krr_locations l ON c.location_id = l.id WHERE l.name IS NOT NULL
            UNION
            SELECT l.name FROM dw_candidates c LEFT JOIN dw_locations l ON c.location_id = l.id WHERE l.name IS NOT NULL
        ) cities
    ";
    $cities = $db->query($cityQuery)->fetch()['cnt'];

    jsonResponse([
        'total_pelamar' => number_format($total, 0, ',', '.'),
        'total_raw' => $total,
        'kota_aktif' => $cities,
        'persen_gratis' => $settings['landing_stats']['persen_gratis'] ?? '100',
        'auto_count' => true
    ]);
} else {
    jsonResponse([
        'total_pelamar' => $settings['landing_stats']['total_pelamar'] ?? '45.762',
        'total_raw' => 0,
        'kota_aktif' => $settings['landing_stats']['kota_aktif'] ?? '200',
        'persen_gratis' => $settings['landing_stats']['persen_gratis'] ?? '100',
        'auto_count' => false
    ]);
}
