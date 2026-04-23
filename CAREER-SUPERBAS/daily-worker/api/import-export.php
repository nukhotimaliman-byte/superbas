<?php
/**
 * BAS Recruitment — Import/Export API (Owner only)
 * GET  ?action=export       — Export dw_candidates to JSON (for client-side Excel)
 * POST ?action=import       — Import dw_candidates from JSON (parsed client-side)
 */
require_once __DIR__ . '/../config.php';

$admin = requireAuth();
if ($admin['role'] !== 'owner') {
    jsonResponse(['error' => 'Forbidden — Owner only'], 403);
}

$db = getDB();
$action = $_GET['action'] ?? '';

switch ($action) {

    // ═══ EXPORT ════════════════════════════════
    case 'export':
        $stmt = $db->query("
            SELECT 
                c.id,
                c.given_id,
                u.username,
                u.password AS user_password,
                c.name,
                c.nik,
                c.whatsapp,
                c.email,
                c.sim_type,
                c.armada_type,
                c.status,
                c.tempat_lahir,
                c.tanggal_lahir,
                c.address,
                c.pendidikan_terakhir,
                c.pernah_kerja_spx,
                c.surat_sehat,
                c.paklaring,
                c.signature_data,
                l.name AS lokasi_interview,
                c.jadwal_interview,
                c.created_at
            FROM dw_candidates c
            LEFT JOIN dw_users u ON c.user_id = u.id
            LEFT JOIN dw_locations l ON c.location_id = l.id
            ORDER BY c.id ASC
        ");
        $candidates = $stmt->fetchAll();

        // Get dw_documents per candidate
        $docStmt = $db->query("SELECT candidate_id, doc_type, original_name FROM dw_documents ORDER BY candidate_id");
        $docs = [];
        foreach ($docStmt->fetchAll() as $d) {
            $docs[$d['candidate_id']][] = $d['doc_type'] . ': ' . $d['original_name'];
        }

        // Attach docs
        foreach ($candidates as &$c) {
            $cid = $c['id'] ?? null;
            $c['berkas'] = isset($docs[$cid]) ? implode('; ', $docs[$cid]) : '';
            $c['tanda_tangan'] = $c['signature_data'] ? 'Ada' : 'Tidak Ada';
            unset($c['signature_data']);
        }

        jsonResponse(['candidates' => $candidates]);
        break;

    // ═══ IMPORT ════════════════════════════════
    case 'import':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            jsonResponse(['error' => 'POST required'], 405);
        }

        $data = json_decode(file_get_contents('php://input'), true);
        $rows = $data['rows'] ?? [];

        if (empty($rows)) {
            jsonResponse(['error' => 'Data kosong'], 400);
        }

        $inserted = 0;
        $updated = 0;
        $errors = [];
        $locCache = [];

        // Preload dw_locations
        $locStmt = $db->query("SELECT id, name FROM dw_locations");
        foreach ($locStmt->fetchAll() as $loc) {
            $locCache[strtolower(trim($loc['name']))] = $loc['id'];
        }

        $validStatuses = [
            'Belum Pemberkasan', 'Sudah Pemberkasan', 'Menunggu Test Drive',
            'Jadwal Test Drive', 'Hadir', 'Tidak Hadir', 'Lulus', 'Tidak Lulus'
        ];

        foreach ($rows as $i => $row) {
            $rowNum = $i + 2;
            
            $name = trim($row['nama'] ?? $row['Nama'] ?? '');
            if (!$name) {
                $errors[] = "Baris {$rowNum}: Nama kosong, dilewati";
                continue;
            }

            $wa = trim($row['nomor_whatsapp'] ?? $row['Nomor WhatsApp'] ?? '');
            if (!$wa) {
                $errors[] = "Baris {$rowNum}: WhatsApp kosong, dilewati";
                continue;
            }

            // Parse fields
            $givenId    = trim($row['id'] ?? $row['ID'] ?? '') ?: null;
            $nik        = trim($row['nik'] ?? $row['NIK'] ?? '') ?: null;
            $email      = trim($row['email'] ?? $row['Email'] ?? '') ?: null;
            $simType    = trim($row['tipe_sim'] ?? $row['Tipe/Jenis SIM'] ?? 'B2');
            $armada     = trim($row['armada'] ?? $row['Armada'] ?? 'CDD');
            if (!in_array($armada, ['CDD', 'Wingbox', 'Bigmama'])) $armada = 'CDD';

            $status = trim($row['status_user'] ?? $row['Status User'] ?? 'Belum Pemberkasan');
            if (!in_array($status, $validStatuses)) $status = 'Belum Pemberkasan';

            $locName = strtolower(trim($row['lokasi_interview'] ?? $row['Lokasi Interview'] ?? ''));
            $locationId = $locCache[$locName] ?? (array_values($locCache)[0] ?? 1);

            $tempatLahir  = trim($row['tempat_lahir'] ?? $row['Tempat Lahir'] ?? '') ?: null;
            $tglLahir     = $row['tanggal_lahir'] ?? $row['Tanggal Lahir'] ?? null ?: null;
            $alamat       = trim($row['alamat_domisili'] ?? $row['Alamat Domisili'] ?? '') ?: null;
            $pendidikan   = trim($row['pendidikan_terakhir'] ?? $row['Pendidikan Terakhir'] ?? '') ?: null;
            $spx          = trim($row['pernah_kerja_spx'] ?? $row['Pernah Bekerja di SPX?'] ?? '') ?: null;
            $suratSehat   = trim($row['surat_sehat'] ?? $row['Surat Keterangan Sehat'] ?? '') ?: null;
            $paklaring    = trim($row['paklaring'] ?? $row['Paklaring'] ?? '') ?: null;
            $jadwalIntv   = $row['jadwal_interview'] ?? $row['Jadwal Interview'] ?? null ?: null;

            try {
                // ── Check if NIK exists → UPDATE instead of INSERT ──
                $existing = null;
                if ($nik) {
                    $check = $db->prepare('SELECT id FROM dw_candidates WHERE nik = ? LIMIT 1');
                    $check->execute([$nik]);
                    $existing = $check->fetch();
                }

                if ($existing) {
                    // UPDATE existing candidate (upsert by NIK)
                    $updates = [];
                    $params = [];

                    // Always update given_id if provided
                    if ($givenId !== null) {
                        $updates[] = 'given_id = ?';
                        $params[] = $givenId;
                    }
                    // Update all other fields
                    $updates[] = 'name = ?';           $params[] = $name;
                    $updates[] = 'whatsapp = ?';       $params[] = $wa;
                    $updates[] = 'email = ?';          $params[] = $email;
                    $updates[] = 'sim_type = ?';       $params[] = $simType;
                    $updates[] = 'armada_type = ?';    $params[] = $armada;
                    $updates[] = 'location_id = ?';    $params[] = $locationId;
                    $updates[] = 'status = ?';         $params[] = $status;
                    $updates[] = 'tempat_lahir = ?';   $params[] = $tempatLahir;
                    $updates[] = 'tanggal_lahir = ?';  $params[] = $tglLahir;
                    $updates[] = 'address = ?';        $params[] = $alamat;
                    $updates[] = 'pendidikan_terakhir = ?'; $params[] = $pendidikan;
                    $updates[] = 'pernah_kerja_spx = ?';    $params[] = $spx;
                    $updates[] = 'surat_sehat = ?';    $params[] = $suratSehat;
                    $updates[] = 'paklaring = ?';      $params[] = $paklaring;
                    $updates[] = 'jadwal_interview = ?'; $params[] = $jadwalIntv;

                    $params[] = $existing['id'];
                    $db->prepare('UPDATE dw_candidates SET ' . implode(', ', $updates) . ' WHERE id = ?')->execute($params);
                    $updated++;
                } else {
                    // INSERT new candidate
                    $stmt = $db->prepare("
                        INSERT INTO dw_candidates 
                        (given_id, name, nik, whatsapp, email, sim_type, armada_type, location_id, status,
                         tempat_lahir, tanggal_lahir, address, pendidikan_terakhir, pernah_kerja_spx,
                         surat_sehat, paklaring, jadwal_interview)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ");
                    $stmt->execute([
                        $givenId, $name, $nik, $wa, $email, $simType, $armada, $locationId, $status,
                        $tempatLahir, $tglLahir, $alamat, $pendidikan, $spx, $suratSehat, $paklaring, $jadwalIntv
                    ]);
                    $inserted++;
                }
            } catch (\Exception $e) {
                $errors[] = "Baris {$rowNum}: " . $e->getMessage();
            }
        }

        $msg = [];
        if ($inserted > 0) $msg[] = "{$inserted} kandidat baru diimport";
        if ($updated > 0)  $msg[] = "{$updated} kandidat diupdate (by NIK)";
        if (count($errors)) $msg[] = count($errors) . " error";

        jsonResponse([
            'success' => true,
            'inserted' => $inserted,
            'updated' => $updated,
            'errors' => $errors,
            'message' => implode(', ', $msg) ?: 'Tidak ada perubahan'
        ]);
        break;

    default:
        jsonResponse(['error' => 'Invalid action'], 400);
}
