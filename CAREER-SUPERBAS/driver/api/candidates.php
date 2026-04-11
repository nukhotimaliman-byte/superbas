<?php
/**
 * BAS Recruitment — Candidates API
 * POST /api/candidates.php              — Register new candidate / Update profile / Schedule interview
 * GET  /api/candidates.php?whatsapp=xxx — Status tracking lookup
 * GET  /api/candidates.php?user_id=xxx  — Get candidate by user_id (dashboard)
 */
require_once __DIR__ . '/../config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $action = $data['action'] ?? 'register';

    // ── Register New Candidate ──────────────────
    if ($action === 'register') {
        $name        = trim($data['name'] ?? '');
        $whatsapp    = trim($data['whatsapp'] ?? '');
        $address     = trim($data['address'] ?? '');
        $provinsi    = trim($data['provinsi'] ?? '');
        $kabupaten   = trim($data['kabupaten'] ?? '');
        $kecamatan   = trim($data['kecamatan'] ?? '');
        $kelurahan   = trim($data['kelurahan'] ?? '');
        $armada      = $data['armada_type'] ?? '';
        $sim_type    = trim($data['sim_type'] ?? '');
        $location_id = intval($data['location_id'] ?? 0);
        $signature   = $data['signature_data'] ?? null;
        $user_id     = intval($data['user_id'] ?? 0) ?: null;

        // Validation
        $errors = [];
        if (!$name) $errors[] = 'Nama wajib diisi';
        if (!$whatsapp) $errors[] = 'Nomor WhatsApp wajib diisi';
        if (!preg_match('/^[0-9]{10,15}$/', $whatsapp)) $errors[] = 'Format WhatsApp tidak valid';
        if (!in_array($armada, ['CDD', 'Wingbox', 'Bigmama'])) $errors[] = 'Tipe armada tidak valid';
        if (!$sim_type) $errors[] = 'Tipe SIM wajib diisi';
        // Get location valid options
        $locCheck = $db->prepare('SELECT id FROM locations WHERE id = ?');
        $locCheck->execute([$location_id]);
        if (!$locCheck->fetch()) $errors[] = 'Lokasi interview tidak valid/berlum dipilih';

        if (!empty($errors)) {
            jsonResponse(['error' => implode(', ', $errors)], 400);
        }

        $db = getDB();

        // Get NIK from user account if logged in
        $nik = null;
        if ($user_id) {
            $stmt = $db->prepare('SELECT nik FROM users WHERE id = ?');
            $stmt->execute([$user_id]);
            $user = $stmt->fetch();
            if ($user && !empty($user['nik'])) $nik = $user['nik'];
        }

        // Check if user already has a candidate record (auto-created on registration)
        $existingCandidate = null;
        if ($user_id) {
            $stmt = $db->prepare('SELECT id FROM candidates WHERE user_id = ?');
            $stmt->execute([$user_id]);
            $existingCandidate = $stmt->fetch();
        }

        if ($existingCandidate) {
            // Update existing skeleton record
            $stmt = $db->prepare('UPDATE candidates SET nik = ?, name = ?, whatsapp = ?, address = ?, provinsi = ?, kabupaten = ?, kecamatan = ?, kelurahan = ?, armada_type = ?, sim_type = ?, location_id = ?, signature_data = ? WHERE id = ?');
            $stmt->execute([$nik, $name, $whatsapp, $address, $provinsi, $kabupaten, $kecamatan, $kelurahan, $armada, $sim_type, $location_id, $signature, $existingCandidate['id']]);
            $candidateId = $existingCandidate['id'];
        } else {
            // Check duplicate WhatsApp
            $stmt = $db->prepare('SELECT id FROM candidates WHERE whatsapp = ? AND whatsapp != ""');
            $stmt->execute([$whatsapp]);
            if ($stmt->fetch()) {
                jsonResponse(['error' => 'Nomor WhatsApp sudah terdaftar.'], 409);
            }

            $stmt = $db->prepare('INSERT INTO candidates (user_id, nik, name, whatsapp, address, provinsi, kabupaten, kecamatan, kelurahan, armada_type, sim_type, location_id, status, signature_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
            $stmt->execute([$user_id, $nik, $name, $whatsapp, $address, $provinsi, $kabupaten, $kecamatan, $kelurahan, $armada, $sim_type, $location_id, 'Belum Pemberkasan', $signature]);
            $candidateId = $db->lastInsertId();
        }

        jsonResponse([
            'success' => true,
            'candidate_id' => $candidateId,
            'message' => 'Pendaftaran berhasil!'
        ], 201);
    }

    // ── Update Interview Schedule ───────────────
    if ($action === 'schedule') {
        requireUser();
        $candidate_id = intval($data['candidate_id'] ?? 0);
        $date = trim($data['interview_date'] ?? $data['test_drive_date'] ?? '');
        $location = trim($data['location_name'] ?? '');

        if (!$candidate_id || !$date || !$location) {
            jsonResponse(['error' => 'Tanggal dan lokasi interview wajib diisi'], 400);
        }

        $validLocations = ['Makobas', 'Mess Cileungsi', 'Cibitung', 'Cakung 2'];
        if (!in_array($location, $validLocations)) {
            jsonResponse(['error' => 'Lokasi tidak valid'], 400);
        }

        // Validate date is Tuesday (2) or Thursday (4)
        $dow = date('N', strtotime($date));
        if (!in_array($dow, ['2', '4'])) {
            jsonResponse(['error' => 'Hanya boleh memilih hari Selasa atau Kamis'], 400);
        }

        $db = getDB();
        try {
            $stmt = $db->prepare('UPDATE candidates SET jadwal_interview = ?, interview_location = ? WHERE id = ?');
            $stmt->execute([$date, $location, $candidate_id]);
        } catch (PDOException $e) {
            jsonResponse(['error' => 'Gagal menyimpan jadwal: ' . $e->getMessage()], 500);
        }
        // Status TIDAK diubah di sini — hanya korlap/owner yang bisa ubah status

        jsonResponse(['success' => true, 'message' => 'Jadwal interview berhasil disimpan!']);
    }

    // ── Update Photo ─────────────────────────────
    if ($action === 'update_photo') {
        requireUser();
        $candidate_id = intval($data['candidate_id'] ?? 0);
        $photo_data = $data['photo_data'] ?? '';

        if (!$candidate_id || !$photo_data) {
            jsonResponse(['error' => 'Data tidak lengkap'], 400);
        }

        $db = getDB();
        $stmt = $db->prepare('UPDATE candidates SET photo_data = ? WHERE id = ?');
        $stmt->execute([$photo_data, $candidate_id]);

        jsonResponse(['success' => true, 'message' => 'Foto berhasil disimpan!']);
    }

    // ── Submit Pemberkasan (Data Diri + Dokumen) ─
    // Partial save: user bisa simpan satu-satu, tidak harus lengkap sekaligus
    if ($action === 'submit_pemberkasan') {
        requireUser();
        $candidate_id        = intval($data['candidate_id'] ?? 0);
        $tempat_lahir        = trim($data['birth_place'] ?? $data['tempat_lahir'] ?? '');
        $tanggal_lahir       = trim($data['birth_date'] ?? $data['tanggal_lahir'] ?? '');
        $address             = trim($data['address'] ?? '');
        $provinsi            = trim($data['provinsi'] ?? '');
        $kabupaten           = trim($data['kabupaten'] ?? '');
        $kecamatan           = trim($data['kecamatan'] ?? '');
        $kelurahan           = trim($data['kelurahan'] ?? '');
        $whatsapp            = trim($data['whatsapp'] ?? '');
        $sim_type            = trim($data['sim_type'] ?? '');
        $armada_type         = trim($data['armada_type'] ?? '');
        $pernah_kerja_spx    = $data['worked_at_spx'] ?? $data['pernah_kerja_spx'] ?? null;
        $pendidikan_terakhir = trim($data['last_education'] ?? $data['pendidikan_terakhir'] ?? '');
        $surat_sehat         = $data['surat_sehat_status'] ?? $data['surat_sehat'] ?? null;
        $paklaring           = $data['paklaring_status'] ?? $data['paklaring'] ?? null;
        $signature           = $data['signature_data'] ?? null;
        $referensi           = trim($data['referensi'] ?? '');
        $emergency_name      = trim($data['emergency_name'] ?? '');
        $emergency_phone     = trim($data['emergency_phone'] ?? '');
        $emergency_relation  = trim($data['emergency_relation'] ?? '');
        $bank_name           = trim($data['bank_name'] ?? '');
        $bank_account_no     = trim($data['bank_account_no'] ?? '');
        $bank_account_name   = trim($data['bank_account_name'] ?? '');

        if (!$candidate_id) {
            jsonResponse(['error' => 'Candidate ID wajib'], 400);
        }

        // Validate format ONLY if value is provided (partial save allowed)
        if ($tanggal_lahir) {
            $d = DateTime::createFromFormat('Y-m-d', $tanggal_lahir);
            if (!$d || $d->format('Y-m-d') !== $tanggal_lahir) {
                jsonResponse(['error' => 'Format Tanggal Lahir tidak valid (YYYY-MM-DD)'], 400);
            }
            $today = new DateTime();
            $age = $today->diff(new DateTime($tanggal_lahir))->y;
            if ($age < 17) {
                jsonResponse(['error' => 'Usia minimal 17 tahun'], 400);
            }
            if ($age > 65) {
                jsonResponse(['error' => 'Usia maksimal 65 tahun'], 400);
            }
        }

        // Validate SIM type only if provided
        $validSim = ['SIM B1 Umum', 'SIM B1', 'SIM B2 Umum', 'SIM B2'];
        if ($sim_type && !in_array($sim_type, $validSim)) {
            jsonResponse(['error' => 'Jenis SIM tidak valid'], 400);
        }

        // Validate armada only if provided
        $validArmada = ['CDD', 'Wingbox', 'Bigmama'];
        if ($armada_type && !in_array($armada_type, $validArmada)) {
            jsonResponse(['error' => 'Posisi dilamar tidak valid'], 400);
        }

        // Validate Yes/No fields only if provided
        $validYesNo = ['Ya', 'Tidak'];
        if ($pernah_kerja_spx && !in_array($pernah_kerja_spx, $validYesNo)) {
            jsonResponse(['error' => 'Pilihan SPX tidak valid'], 400);
        }
        $validAdaTidak = ['Ada', 'Tidak Ada'];
        if ($surat_sehat && !in_array($surat_sehat, $validAdaTidak)) {
            jsonResponse(['error' => 'Pilihan Surat Sehat tidak valid'], 400);
        }
        if ($paklaring && !in_array($paklaring, $validAdaTidak)) {
            jsonResponse(['error' => 'Pilihan Paklaring tidak valid'], 400);
        }

        try {
            $db = getDB();
            $stmt = $db->prepare('SELECT status, signature_data FROM candidates WHERE id = ?');
            $stmt->execute([$candidate_id]);
            $existing = $stmt->fetch();

            if (!$existing) {
                jsonResponse(['error' => 'Kandidat tidak ditemukan'], 404);
            }

            // If no new signature drawn, keep existing
            if (empty($signature) && !empty($existing['signature_data'])) {
                $signature = $existing['signature_data'];
            }

            $stmt = $db->prepare("
                UPDATE candidates
                SET tempat_lahir = ?, tanggal_lahir = ?, address = ?,
                    provinsi = ?, kabupaten = ?, kecamatan = ?, kelurahan = ?,
                    whatsapp = ?,
                    sim_type = ?, armada_type = ?,
                    pernah_kerja_spx = ?, pendidikan_terakhir = ?,
                    surat_sehat = ?, paklaring = ?,
                    referensi = ?, emergency_name = ?, emergency_phone = ?, emergency_relation = ?,
                    bank_name = ?, bank_account_no = ?, bank_account_name = ?,
                    signature_data = COALESCE(?, signature_data)
                WHERE id = ?
            ");
            $stmt->execute([
                $tempat_lahir ?: null, $tanggal_lahir ?: null, $address ?: null,
                $provinsi ?: null, $kabupaten ?: null, $kecamatan ?: null, $kelurahan ?: null,
                $whatsapp ?: null,
                $sim_type ?: null, $armada_type ?: null,
                $pernah_kerja_spx, $pendidikan_terakhir ?: null,
                $surat_sehat, $paklaring,
                $referensi ?: null, $emergency_name ?: null, $emergency_phone ?: null, $emergency_relation ?: null,
                $bank_name ?: null, $bank_account_no ?: null, $bank_account_name ?: null,
                $signature, $candidate_id
            ]);

            jsonResponse(['success' => true, 'message' => 'Data berhasil disimpan!']);
        } catch (PDOException $e) {
            jsonResponse(['error' => 'Gagal menyimpan: ' . $e->getMessage()], 500);
        }
    }

    jsonResponse(['error' => 'Action tidak valid'], 400);

} elseif ($method === 'GET') {
    $db = getDB();

    // ── Dashboard: Get by user_id ───────────────
    $user_id = intval($_GET['user_id'] ?? 0);
    if ($user_id) {
        $stmt = $db->prepare('
            SELECT c.id, c.given_id, c.candidate_id, c.nik, c.name, c.whatsapp, c.address,
                   c.provinsi, c.kabupaten, c.kecamatan, c.kelurahan,
                   c.armada_type, c.sim_type, c.status, c.test_drive_date, c.test_drive_time,
                   c.jadwal_interview,
                   c.tempat_lahir, c.tanggal_lahir,
                   c.pernah_kerja_spx, c.pendidikan_terakhir, c.surat_sehat, c.paklaring,
                   c.referensi, c.emergency_name, c.emergency_phone, c.emergency_relation,
                   c.bank_name, c.bank_account_no, c.bank_account_name,
                   c.signature_data, c.korlap_notes, c.photo_data, c.created_at, c.interview_location,
                   l.name AS location_name, l.address AS location_address, l.maps_link
            FROM candidates c
            LEFT JOIN locations l ON c.location_id = l.id
            WHERE c.user_id = ?
            LIMIT 1
        ');
        $stmt->execute([$user_id]);
        $candidate = $stmt->fetch();

        if (!$candidate) {
            jsonResponse(['candidate' => null]);
        }

        // Get documents
        $stmt = $db->prepare('SELECT id, doc_type, file_path, original_name, file_size, uploaded_at FROM documents WHERE candidate_id = ?');
        $stmt->execute([$candidate['id']]);
        $docs = $stmt->fetchAll();

        // Get user info
        $stmt = $db->prepare('SELECT name, email, picture FROM users WHERE id = ?');
        $stmt->execute([$user_id]);
        $user = $stmt->fetch();

        // Get all locations for list display
        $stmt = $db->query('SELECT name, address, maps_link FROM locations ORDER BY name ASC');
        $all_locations = $stmt->fetchAll();

        jsonResponse([
            'candidate' => $candidate,
            'documents' => $docs,
            'user' => $user,
            'all_locations' => $all_locations
        ]);
    }

    // ── Status Tracking by WhatsApp ─────────────
    $whatsapp = trim($_GET['whatsapp'] ?? '');
    if ($whatsapp) {
        $stmt = $db->prepare('
            SELECT c.id, c.candidate_id, c.nik, c.name, c.whatsapp, c.address,
                   c.provinsi, c.kabupaten, c.kecamatan, c.kelurahan,
                   c.armada_type, c.sim_type, c.status, c.test_drive_date, c.test_drive_time,
                   c.tempat_lahir, c.tanggal_lahir,
                   c.pernah_kerja_spx, c.pendidikan_terakhir, c.surat_sehat, c.paklaring,
                   c.signature_data, c.korlap_notes, c.created_at, c.interview_location,
                   l.name AS location_name, l.address AS location_address, l.maps_link
            FROM candidates c
            LEFT JOIN locations l ON c.location_id = l.id
            WHERE c.whatsapp = ?
        ');
        $stmt->execute([$whatsapp]);
        $candidate = $stmt->fetch();

        if (!$candidate) {
            jsonResponse(['error' => 'Nomor WhatsApp tidak ditemukan.'], 404);
        }

        $stmt = $db->prepare('SELECT doc_type, uploaded_at FROM documents WHERE candidate_id = ?');
        $stmt->execute([$candidate['id']]);
        $docs = $stmt->fetchAll();

        jsonResponse(['candidate' => $candidate, 'documents' => $docs]);
    }

    jsonResponse(['error' => 'Parameter tidak valid'], 400);

} else {
    jsonResponse(['error' => 'Method not allowed'], 405);
}
