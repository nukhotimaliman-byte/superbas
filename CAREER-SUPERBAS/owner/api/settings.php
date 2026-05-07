<?php
/**
 * BAS Super Owner — Settings API (CMS)
 * GET  ?action=get           — Get all settings
 * POST ?action=save          — Save settings JSON
 * POST ?action=maintenance   — Toggle maintenance mode
 * POST ?action=landing_stats — Update landing page stats
 * POST ?action=social_media  — Update social media links
 * POST ?action=faq           — Update FAQ list
 * POST ?action=testimonials  — Update testimonials
 */
require_once __DIR__ . '/../config.php';

$owner = requireOwnerAuth();
$action = $_GET['action'] ?? 'get';

switch ($action) {

    case 'get':
        jsonResponse(getSettings());
        break;

    case 'maintenance':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);
        $input = json_decode(file_get_contents('php://input'), true);
        $settings = getSettings();
        $settings['maintenance'] = [
            'enabled' => boolval($input['enabled'] ?? false),
            'message' => trim($input['message'] ?? 'Website sedang dalam perbaikan.'),
            'estimate' => trim($input['estimate'] ?? '')
        ];
        saveSettings($settings);
        jsonResponse(['success' => true, 'maintenance' => $settings['maintenance']]);
        break;

    case 'landing_stats':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);
        $input = json_decode(file_get_contents('php://input'), true);
        $settings = getSettings();
        $settings['landing_stats'] = [
            'auto_count' => boolval($input['auto_count'] ?? false),
            'total_pelamar' => trim($input['total_pelamar'] ?? '45.762'),
            'kota_aktif' => trim($input['kota_aktif'] ?? '200'),
            'persen_gratis' => trim($input['persen_gratis'] ?? '100')
        ];
        saveSettings($settings);
        jsonResponse(['success' => true, 'landing_stats' => $settings['landing_stats']]);
        break;

    case 'social_media':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);
        $input = json_decode(file_get_contents('php://input'), true);
        $settings = getSettings();
        $settings['social_media'] = array_slice($input['social_media'] ?? [], 0, 3);
        saveSettings($settings);
        jsonResponse(['success' => true, 'social_media' => $settings['social_media']]);
        break;

    case 'faq':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);
        $input = json_decode(file_get_contents('php://input'), true);
        $settings = getSettings();
        $settings['faq'] = $input['faq'] ?? [];
        saveSettings($settings);
        jsonResponse(['success' => true, 'total' => count($settings['faq'])]);
        break;

    case 'testimonials':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);
        $input = json_decode(file_get_contents('php://input'), true);
        $settings = getSettings();
        $settings['testimonials'] = $input['testimonials'] ?? [];
        saveSettings($settings);
        jsonResponse(['success' => true, 'total' => count($settings['testimonials'])]);
        break;

    case 'gallery':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);
        $input = json_decode(file_get_contents('php://input'), true);
        $settings = getSettings();
        $settings['gallery'] = $input['gallery'] ?? [];
        saveSettings($settings);
        jsonResponse(['success' => true, 'total' => count($settings['gallery'])]);
        break;

    default:
        jsonResponse(['error' => 'Invalid action'], 400);
}
