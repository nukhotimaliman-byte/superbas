<?php
/* Data KalSul — Gaji Status / Rekening Sync API v2 */
require_once __DIR__ . '/config.php';

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

// ── POST sync from GAS (token-based) ──
if ($method === 'POST' && $action === 'sync') {
    $body = getJsonBody();
    if (($body['token'] ?? '') !== 'kalsul-sync-2026') jsonError('Invalid token', 403);

    $db = getDB();
    $inserted = 0;

    // Process Link Gaji
    $gajiData = $body['link_gaji'] ?? [];
    $gajiStmt = $db->prepare("INSERT INTO kalsul_rekening (ops_id, source, timestamp_gas, email, nama_sesuai_ktp, nik, lokasi_kerja, tanggal_lahir, alamat, no_hp, no_rek, atas_nama, bank) VALUES (:oid, 'link_gaji', :ts, :email, :nama, :nik, :lok, :tgl, :alamat, :hp, :rek, :atas, :bank)");

    foreach ($gajiData as $row) {
        $opsId = trim($row['ops_id'] ?? '');
        if ($opsId === '') continue;
        $noRek = preg_replace('/[^0-9]/', '', $row['no_rek'] ?? '');
        $gajiStmt->execute([
            ':oid' => $opsId,
            ':ts' => $row['timestamp'] ?? date('Y-m-d H:i:s'),
            ':email' => trim($row['email'] ?? ''),
            ':nama' => trim($row['nama_ktp'] ?? ''),
            ':nik' => trim($row['nik'] ?? ''),
            ':lok' => trim($row['lokasi_kerja'] ?? ''),
            ':tgl' => trim($row['tgl_lahir'] ?? ''),
            ':alamat' => trim($row['alamat'] ?? ''),
            ':hp' => trim($row['no_hp'] ?? ''),
            ':rek' => $noRek,
            ':atas' => trim($row['atas_nama'] ?? ''),
            ':bank' => trim($row['bank'] ?? ''),
        ]);
        $inserted++;
    }

    // Process Link Pergantian Rekening
    $pergData = $body['link_pergantian_rek'] ?? [];
    $pergStmt = $db->prepare("INSERT INTO kalsul_rekening (ops_id, source, timestamp_gas, email, nama_sesuai_ktp, penempatan, no_rek, atas_nama, bank) VALUES (:oid, 'link_pergantian_rek', :ts, :email, :nama, :pen, :rek, :atas, :bank)");

    foreach ($pergData as $row) {
        $opsId = trim($row['ops_id'] ?? '');
        if ($opsId === '') continue;
        $noRek = preg_replace('/[^0-9]/', '', $row['no_rek'] ?? '');
        $pergStmt->execute([
            ':oid' => $opsId,
            ':ts' => $row['timestamp'] ?? date('Y-m-d H:i:s'),
            ':email' => trim($row['email'] ?? ''),
            ':nama' => trim($row['nama'] ?? ''),
            ':pen' => trim($row['penempatan'] ?? ''),
            ':rek' => $noRek,
            ':atas' => trim($row['atas_nama'] ?? ''),
            ':bank' => trim($row['bank'] ?? ''),
        ]);
        $inserted++;
    }

    jsonSuccess(['inserted' => $inserted]);
}

// ── GET endpoints need auth ──
$user = requireAuth();
$db = getDB();

if ($action === 'summary') {
    $total = (int)$db->query('SELECT COUNT(DISTINCT ops_id) FROM kalsul_employees')->fetchColumn();
    $withRek = (int)$db->query("SELECT COUNT(DISTINCT e.ops_id) FROM kalsul_employees e INNER JOIN kalsul_rekening r ON e.ops_id = r.ops_id WHERE r.no_rek != ''")->fetchColumn();
    $pergantian = (int)$db->query("SELECT COUNT(DISTINCT ops_id) FROM kalsul_rekening WHERE source = 'link_pergantian_rek'")->fetchColumn();

    jsonSuccess([
        'total_employees' => $total,
        'with_rekening' => $withRek,
        'without_rekening' => $total - $withRek,
        'pergantian_count' => $pergantian,
    ]);
}

// Default stats
$total = (int)$db->query('SELECT COUNT(*) FROM kalsul_employees')->fetchColumn();
$datasets = (int)$db->query('SELECT COUNT(*) FROM kalsul_datasets')->fetchColumn();
jsonSuccess(['total_employees' => $total, 'total_datasets' => $datasets]);
