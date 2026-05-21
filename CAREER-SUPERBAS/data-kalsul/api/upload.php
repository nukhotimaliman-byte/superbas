<?php
/* Data KalSul — Upload API v2 */
require_once __DIR__ . '/config.php';
$user = requireAuth();

$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'POST') jsonError('Method not allowed', 405);

$body = getJsonBody();
$station = trim($body['station'] ?? '');
$bulan = trim($body['bulan'] ?? '');       // YYYY-MM
$periode = trim($body['periode'] ?? '');   // P1 or P2
$employees = $body['employees'] ?? [];

if ($station === '') jsonError('Station harus diisi');
if ($bulan === '') jsonError('Bulan harus diisi');
if (!in_array($periode, ['P1','P2'])) jsonError('Periode harus P1 atau P2');
if (empty($employees)) jsonError('Data karyawan kosong');

// Format bulan to first day
$bulanDate = $bulan . '-01';

$db = getDB();

try {
    $db->beginTransaction();

    // Upsert dataset
    $stmt = $db->prepare("SELECT id FROM kalsul_datasets WHERE station = :st AND bulan = :bl AND periode = :pr LIMIT 1");
    $stmt->execute([':st' => $station, ':bl' => $bulanDate, ':pr' => $periode]);
    $dataset = $stmt->fetch();

    if ($dataset) {
        $datasetId = (int)$dataset['id'];
        // Clear old employees for this dataset (replace with new upload)
        $db->prepare("DELETE FROM kalsul_employees WHERE dataset_id = :did")->execute([':did' => $datasetId]);
    } else {
        $stmt = $db->prepare("INSERT INTO kalsul_datasets (station, bulan, periode, admin_id) VALUES (:st, :bl, :pr, :aid)");
        $stmt->execute([':st' => $station, ':bl' => $bulanDate, ':pr' => $periode, ':aid' => $user['id']]);
        $datasetId = (int)$db->lastInsertId();
    }

    // Insert employees
    $insertStmt = $db->prepare("INSERT INTO kalsul_employees (dataset_id, ops_id, nama, station, hk, status) VALUES (:did, :oid, :nama, :st, :hk, :status)");

    $imported = 0;
    $skipped = 0;

    foreach ($employees as $emp) {
        $opsId = trim($emp['ops_id'] ?? '');
        $nama = trim($emp['nama'] ?? '');

        if ($opsId === '' || $nama === '') { $skipped++; continue; }

        $insertStmt->execute([
            ':did' => $datasetId,
            ':oid' => $opsId,
            ':nama' => $nama,
            ':st' => trim($emp['station'] ?? $station),
            ':hk' => (int)($emp['hk'] ?? 0),
            ':status' => trim($emp['status'] ?? 'Daily Worker'),
        ]);
        $imported++;
    }

    // Update dataset count
    $db->prepare("UPDATE kalsul_datasets SET total_employees = :cnt WHERE id = :did")->execute([':cnt' => $imported, ':did' => $datasetId]);

    $db->commit();

    jsonSuccess([
        'dataset_id' => $datasetId,
        'imported' => $imported,
        'skipped' => $skipped,
        'total' => count($employees),
    ]);

} catch (PDOException $e) {
    $db->rollBack();
    jsonError('Upload failed: ' . $e->getMessage(), 500);
}
