<?php
/**
 * BAS Super Owner — Site Status API (PUBLIC — no auth)
 * GET /owner/api/site-status.php
 */
require_once __DIR__ . '/../config.php';

$settings = getSettings();
$maintenance = $settings['maintenance'] ?? ['enabled' => false];

jsonResponse([
    'maintenance' => $maintenance['enabled'] ?? false,
    'message' => $maintenance['message'] ?? '',
    'estimate' => $maintenance['estimate'] ?? ''
]);
