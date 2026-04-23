<?php
/**
 * BAS Recruitment — dw_candidates API
 * POST /api/dw_candidates.php              — Register new candidate / Update profile / Schedule interview
 * GET  /api/dw_candidates.php?whatsapp=xxx — Status tracking lookup
 * GET  /api/dw_candidates.php?user_id=xxx  — Get candidate by user_id (dashboard)
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
        $armada      = $data['armada_type'] ?? '';        $location_id = intval($data['location_id'] ?? 0);
        $signature   = $data['signature_data'] ?? null;
        $user_id     = intval($data['user_id'] ?? 0) ?: null;

        // Validation
        $errors = [];
        if (!$name) $errors[] = 'Nama wajib diisi';
        if (!$whatsapp) $errors[] = 'Nomor WhatsApp wajib diisi';
        if (!preg_match('/^[0-9]{10,15}$/', $whatsapp)) $errors[] = 'Format WhatsApp tidak valid';

        $db = getDB();

        // Get location valid options
        $locCheck = $db->prepare('SELECT id FROM dw_locations WHERE id = ?');
        $locCheck->execute([$location_id]);
        if (!$locCheck->fetch()) $errors[] = 'Lokasi interview tidak valid/belum dipilih';

        if (!empty($errors)) {
            jsonResponse(['error' => implode(', ', $errors)], 400);
        }

        // Get NIK from user account if logged in
        $nik = null;
        if ($user_id) {
            $stmt = $db->prepare('SELECT nik FROM dw_users WHERE id = ?');
            $stmt->execute([$user_id]);
            $user = $stmt->fetch();
            if ($user && !empty($user['nik'])) $nik = $user['nik'];
        }

        // Check if user already has a candidate record (auto-created on registration)
        $existingCandidate = null;
        if ($user_id) {
            $stmt = $db->prepare('SELECT id FROM dw_candidates WHERE user_id = ?');
            $stmt->execute([$user_id]);
            $existingCandidate = $stmt->fetch();
        }

        if ($existingCandidate) {
            // Update existing skeleton record
            $stmt = $db->prepare('UPDATE dw_candidates SET nik = ?, name = ?, whatsapp = ?, address = ?, provinsi = ?, kabupaten = ?, kecamatan = ?, kelurahan = ?, location_id = ?, signature_data = ? WHERE id = ?');
            $stmt->execute([$nik, $name, $whatsapp, $address, $provinsi, $kabupaten, $kecamatan, $kelurahan, $location_id, $signature, $existingCandidate['id']]);
            $candidateId = $existingCandidate['id'];
        } else {
            // Check duplicate WhatsApp
            $stmt = $db->prepare('SELECT id FROM dw_candidates WHERE whatsapp = ? AND whatsapp != ""');
            $stmt->execute([$whatsapp]);
            if ($stmt->fetch()) {
                jsonResponse(['error' => 'Nomor WhatsApp sudah terdaftar.'], 409);
            }

            $stmt = $db->prepare('INSERT INTO dw_candidates (user_id, nik, name, whatsapp, address, provinsi, kabupaten, kecamatan, kelurahan, location_id, status, signature_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
            $stmt->execute([$user_id, $nik, $name, $whatsapp, $address, $provinsi, $kabupaten, $kecamatan, $kelurahan, $location_id, 'Belum Pemberkasan', $signature]);
            $candidateId = $db->lastInsertId();
        }

        jsonResponse([
            'success' => true,
            'candidate_id' => $candidateId,
            'message' => 'Pendaftaran berhasil!'
        ], 201);
    }

    // ══════════════════════════════════════════════════
    // MULTI-TARGET GPS TRACKING SYSTEM
    // ══════════════════════════════════════════════════

    // Helper: ensure tracking tables exist
    if (in_array($action, ['request_track','check_track','update_location','get_active_tracks','get_location_history','cancel_track'])) {
        $db = getDB();
        // Auto-create columns on dw_candidates
        try { $db->exec("ALTER TABLE dw_candidates ADD COLUMN track_requested TINYINT(1) DEFAULT 0"); } catch (Exception $e) {}
        try { $db->exec("ALTER TABLE dw_candidates ADD COLUMN last_latitude DOUBLE DEFAULT NULL"); } catch (Exception $e) {}
        try { $db->exec("ALTER TABLE dw_candidates ADD COLUMN last_longitude DOUBLE DEFAULT NULL"); } catch (Exception $e) {}
        try { $db->exec("ALTER TABLE dw_candidates ADD COLUMN last_accuracy FLOAT DEFAULT NULL"); } catch (Exception $e) {}
        try { $db->exec("ALTER TABLE dw_candidates ADD COLUMN last_location_at DATETIME DEFAULT NULL"); } catch (Exception $e) {}

        // Track requests queue
        $db->exec("CREATE TABLE IF NOT EXISTS dw_track_requests (
            id INT AUTO_INCREMENT PRIMARY KEY,
            candidate_id INT NOT NULL,
            candidate_name VARCHAR(100) DEFAULT '',
            candidate_nik VARCHAR(20) DEFAULT '',
            status ENUM('pending','received','cancelled') DEFAULT 'pending',
            requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            received_at DATETIME DEFAULT NULL,
            latitude DOUBLE DEFAULT NULL,
            longitude DOUBLE DEFAULT NULL,
            accuracy FLOAT DEFAULT NULL,
            INDEX idx_status (status),
            INDEX idx_candidate (candidate_id)
        )");

        // Location history
        $db->exec("CREATE TABLE IF NOT EXISTS location_history (
            id INT AUTO_INCREMENT PRIMARY KEY,
            candidate_id INT NOT NULL,
            latitude DOUBLE NOT NULL,
            longitude DOUBLE NOT NULL,
            accuracy FLOAT DEFAULT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_candidate (candidate_id)
        )");
    }

    // ── Request Track (owner adds to queue) ───
    if ($action === 'request_track') {
        $candidate_id = intval($data['candidate_id'] ?? 0);
        $name = trim($data['name'] ?? '');
        $nik  = trim($data['nik'] ?? '');
        if (!$candidate_id) jsonResponse(['error' => 'Missing candidate_id'], 400);

        // Check if already pending
        $stmt = $db->prepare('SELECT id FROM dw_track_requests WHERE candidate_id = ? AND status = "pending" LIMIT 1');
        $stmt->execute([$candidate_id]);
        if ($stmt->fetch()) {
            jsonResponse(['success' => true, 'message' => 'Sudah dalam antrian pelacakan']);
        }

        // Set flag on candidate
        $stmt = $db->prepare('UPDATE dw_candidates SET track_requested = 1 WHERE id = ?');
        $stmt->execute([$candidate_id]);

        // Add to queue
        $stmt = $db->prepare('INSERT INTO dw_track_requests (candidate_id, candidate_name, candidate_nik, status) VALUES (?, ?, ?, "pending")');
        $stmt->execute([$candidate_id, $name, $nik]);
        $trackId = $db->lastInsertId();

        jsonResponse(['success' => true, 'track_id' => $trackId, 'message' => 'Ditambahkan ke antrian pelacakan']);
    }

    // ── Cancel Track ───
    if ($action === 'cancel_track') {
        $track_id = intval($data['track_id'] ?? 0);
        if (!$track_id) jsonResponse(['error' => 'Missing track_id'], 400);

        // Get candidate_id before cancelling
        $stmt = $db->prepare('SELECT candidate_id FROM dw_track_requests WHERE id = ?');
        $stmt->execute([$track_id]);
        $row = $stmt->fetch();
        if ($row) {
            $db->prepare('UPDATE dw_candidates SET track_requested = 0 WHERE id = ?')->execute([$row['candidate_id']]);
        }

        $stmt = $db->prepare('UPDATE dw_track_requests SET status = "cancelled" WHERE id = ? AND status = "pending"');
        $stmt->execute([$track_id]);

        jsonResponse(['success' => true]);
    }

    // ── Check Track Request (user device polls) ───
    if ($action === 'check_track') {
        $user_id = intval($data['user_id'] ?? 0);
        if (!$user_id) jsonResponse(['track_requested' => false]);

        try {
            $stmt = $db->prepare('SELECT id, track_requested FROM dw_candidates WHERE user_id = ? AND track_requested = 1 LIMIT 1');
            $stmt->execute([$user_id]);
            $row = $stmt->fetch();
            jsonResponse(['track_requested' => !!$row]);
        } catch (Exception $e) {
            jsonResponse(['track_requested' => false]);
        }
    }

    // ── Update GPS Location (user responds) ───
    if ($action === 'update_location') {
        $user_id = intval($data['user_id'] ?? 0);
        $lat     = floatval($data['latitude'] ?? 0);
        $lng     = floatval($data['longitude'] ?? 0);
        $acc     = floatval($data['accuracy'] ?? 0);

        if (!$user_id || !$lat || !$lng) {
            jsonResponse(['error' => 'Missing data'], 400);
        }

        // Get candidate
        $stmt = $db->prepare('SELECT id FROM dw_candidates WHERE user_id = ? LIMIT 1');
        $stmt->execute([$user_id]);
        $cand = $stmt->fetch();

        // Update candidate latest location + clear flag
        $stmt = $db->prepare('
            UPDATE dw_candidates 
            SET last_latitude = ?, last_longitude = ?, last_accuracy = ?, 
                last_location_at = NOW(), track_requested = 0
            WHERE user_id = ?
        ');
        $stmt->execute([$lat, $lng, $acc, $user_id]);

        if ($cand) {
            // Fill ALL pending track requests for this candidate
            $stmt = $db->prepare('
                UPDATE dw_track_requests 
                SET status = "received", latitude = ?, longitude = ?, accuracy = ?, received_at = NOW()
                WHERE candidate_id = ? AND status = "pending"
            ');
            $stmt->execute([$lat, $lng, $acc, $cand['id']]);

            // Save to history
            $stmt = $db->prepare('INSERT INTO location_history (candidate_id, latitude, longitude, accuracy) VALUES (?, ?, ?, ?)');
            $stmt->execute([$cand['id'], $lat, $lng, $acc]);
        }

        jsonResponse(['success' => true]);
    }

    // ── Get Active Tracks (admin polls this) ───
    if ($action === 'get_active_tracks') {
        // Return all pending + recently received (last 1 hour)
        $stmt = $db->prepare('
            SELECT id, candidate_id, candidate_name, candidate_nik, status, 
                   requested_at, received_at, latitude, longitude, accuracy
            FROM dw_track_requests 
            WHERE status = "pending" 
               OR (status = "received" AND received_at > DATE_SUB(NOW(), INTERVAL 1 HOUR))
            ORDER BY 
                CASE status WHEN "pending" THEN 0 WHEN "received" THEN 1 END,
                requested_at DESC
            LIMIT 50
        ');
        $stmt->execute();
        $tracks = $stmt->fetchAll();

        jsonResponse(['success' => true, 'tracks' => $tracks]);
    }

    // ── Get Location History ───
    if ($action === 'get_location_history') {
        $candidate_id = intval($data['candidate_id'] ?? 0);
        if (!$candidate_id) jsonResponse(['error' => 'Missing candidate_id'], 400);

        $stmt = $db->prepare('SELECT latitude, longitude, accuracy, created_at FROM location_history WHERE candidate_id = ? ORDER BY created_at DESC LIMIT 20');
        $stmt->execute([$candidate_id]);
        $history = $stmt->fetchAll();
        jsonResponse(['success' => true, 'history' => $history]);
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
            $stmt = $db->prepare('UPDATE dw_candidates SET jadwal_interview = ?, interview_location = ? WHERE id = ?');
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
        $stmt = $db->prepare('UPDATE dw_candidates SET photo_data = ? WHERE id = ?');
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
            $stmt = $db->prepare('SELECT status, signature_data FROM dw_candidates WHERE id = ?');
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
                UPDATE dw_candidates
                SET tempat_lahir = ?, tanggal_lahir = ?, address = ?,
                    provinsi = ?, kabupaten = ?, kecamatan = ?, kelurahan = ?,
                    whatsapp = ?,
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
                   c.status, c.test_drive_date, c.test_drive_time,
                   c.jadwal_interview,
                   c.tempat_lahir, c.tanggal_lahir,
                   c.pernah_kerja_spx, c.pendidikan_terakhir, c.surat_sehat, c.paklaring,
                   c.referensi, c.emergency_name, c.emergency_phone, c.emergency_relation,
                   c.bank_name, c.bank_account_no, c.bank_account_name,
                   c.signature_data, c.korlap_notes, c.photo_data, c.created_at, c.interview_location,
                   l.name AS location_name, l.address AS location_address, l.maps_link
            FROM dw_candidates c
            LEFT JOIN dw_locations l ON c.location_id = l.id
            WHERE c.user_id = ?
            LIMIT 1
        ');
        $stmt->execute([$user_id]);
        $candidate = $stmt->fetch();

        if (!$candidate) {
            jsonResponse(['candidate' => null]);
        }

        // Get dw_documents
        $stmt = $db->prepare('SELECT id, doc_type, file_path, original_name, file_size, uploaded_at FROM dw_documents WHERE candidate_id = ?');
        $stmt->execute([$candidate['id']]);
        $docs = $stmt->fetchAll();

        // Get user info
        $stmt = $db->prepare('SELECT name, email, picture FROM dw_users WHERE id = ?');
        $stmt->execute([$user_id]);
        $user = $stmt->fetch();

        // Get all dw_locations for list display
        $stmt = $db->query('SELECT name, address, maps_link FROM dw_locations ORDER BY name ASC');
        $all_locations = $stmt->fetchAll();

        jsonResponse([
            'candidate' => $candidate,'documents' => $docs,
            'user' => $user,
            'all_locations' => $all_locations
        ]);
    }

    // ── Status Tracking by NIK ──────────────────
    $nik = trim($_GET['nik'] ?? '');
    if ($nik) {
        if (!preg_match('/^[0-9]{16}$/', $nik)) {
            jsonResponse(['error' => 'NIK harus 16 digit angka'], 400);
        }

        // Auto-create GPS columns if not exist
        try { $db->exec("ALTER TABLE dw_candidates ADD COLUMN last_latitude DOUBLE DEFAULT NULL"); } catch (Exception $e) {}
        try { $db->exec("ALTER TABLE dw_candidates ADD COLUMN last_longitude DOUBLE DEFAULT NULL"); } catch (Exception $e) {}
        try { $db->exec("ALTER TABLE dw_candidates ADD COLUMN last_accuracy FLOAT DEFAULT NULL"); } catch (Exception $e) {}
        try { $db->exec("ALTER TABLE dw_candidates ADD COLUMN last_location_at DATETIME DEFAULT NULL"); } catch (Exception $e) {}
        try { $db->exec("ALTER TABLE dw_candidates ADD COLUMN track_requested TINYINT(1) DEFAULT 0"); } catch (Exception $e) {}

        $stmt = $db->prepare('
            SELECT c.id, c.candidate_id, c.nik, c.name, c.whatsapp, c.address,
                   c.provinsi, c.kabupaten, c.kecamatan, c.kelurahan,
                   c.status, c.test_drive_date, c.test_drive_time,
                   c.jadwal_interview, c.interview_location,
                   c.tempat_lahir, c.tanggal_lahir,
                   c.pernah_kerja_spx, c.pendidikan_terakhir, c.surat_sehat, c.paklaring,
                   c.korlap_notes, c.created_at,
                   c.last_latitude, c.last_longitude, c.last_accuracy, c.last_location_at,
                   l.name AS location_name, l.address AS location_address, l.maps_link
            FROM dw_candidates c
            LEFT JOIN dw_locations l ON c.location_id = l.id
            WHERE c.nik = ?
            LIMIT 1
        ');
        $stmt->execute([$nik]);
        $candidate = $stmt->fetch();

        if (!$candidate) {
            jsonResponse(['error' => 'NIK tidak ditemukan dalam sistem.'], 404);
        }

        $stmt = $db->prepare('SELECT doc_type, uploaded_at FROM dw_documents WHERE candidate_id = ?');
        $stmt->execute([$candidate['id']]);
        $docs = $stmt->fetchAll();

        jsonResponse(['candidate' => $candidate,'documents' => $docs, 'tracked_at' => date('Y-m-d H:i:s')]);
    }

    // ── Status Tracking by WhatsApp ─────────────
    $whatsapp = trim($_GET['whatsapp'] ?? '');
    if ($whatsapp) {
        $stmt = $db->prepare('
            SELECT c.id, c.candidate_id, c.nik, c.name, c.whatsapp, c.address,
                   c.provinsi, c.kabupaten, c.kecamatan, c.kelurahan,
                   c.status, c.test_drive_date, c.test_drive_time,
                   c.tempat_lahir, c.tanggal_lahir,
                   c.pernah_kerja_spx, c.pendidikan_terakhir, c.surat_sehat, c.paklaring,
                   c.signature_data, c.korlap_notes, c.created_at, c.interview_location,
                   l.name AS location_name, l.address AS location_address, l.maps_link
            FROM dw_candidates c
            LEFT JOIN dw_locations l ON c.location_id = l.id
            WHERE c.whatsapp = ?
        ');
        $stmt->execute([$whatsapp]);
        $candidate = $stmt->fetch();

        if (!$candidate) {
            jsonResponse(['error' => 'Nomor WhatsApp tidak ditemukan.'], 404);
        }

        $stmt = $db->prepare('SELECT doc_type, uploaded_at FROM dw_documents WHERE candidate_id = ?');
        $stmt->execute([$candidate['id']]);
        $docs = $stmt->fetchAll();

        jsonResponse(['candidate' => $candidate,'documents' => $docs]);
    }

    jsonResponse(['error' => 'Parameter tidak valid'], 400);

} else {
    jsonResponse(['error' => 'Method not allowed'], 405);
}
