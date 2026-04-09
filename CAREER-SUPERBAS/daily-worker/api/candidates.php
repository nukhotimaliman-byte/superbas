<?php
/**
 * BAS Recruitment — Daily Worker Candidates API
 * POST /api/candidates.php              — Register new candidate / Update profile
 * GET  /api/candidates.php?user_id=xxx  — Get candidate by user_id
 */
require_once __DIR__ . '/config.php';

// Helper function to get DB connection (assumed config.php handles constants)
function getDWDB() {
    return new PDO('mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4', DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
}

function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $action = $data['action'] ?? 'submit_pemberkasan';

    // ── Submit Pemberkasan (Data Diri) ─
    if ($action === 'submit_pemberkasan') {
        $user_id       = intval($data['user_id'] ?? 0);
        $nama          = trim($data['nama'] ?? '');
        $nik           = trim($data['nik'] ?? '');
        $nomor_telepon = trim($data['nomor_telepon'] ?? '');
        $gender        = trim($data['gender'] ?? '');
        $bank          = trim($data['bank'] ?? '');
        $norek         = trim($data['norek'] ?? '');
        $atas_nama     = trim($data['atas_nama'] ?? '');
        $alamat        = trim($data['alamat'] ?? '');
        $kota          = trim($data['kota'] ?? '');
        $tanggal_lahir = trim($data['tanggal_lahir'] ?? '');
        $referensi     = trim($data['referensi'] ?? '');
        $station       = trim($data['station'] ?? '');
        $signature     = $data['signature_data'] ?? null;

        if (!$user_id) {
            jsonResponse(['error' => 'User ID wajib'], 400);
        }

        try {
            $db = getDWDB();
            
            // Check if exists
            $stmt = $db->prepare('SELECT id, signature_path FROM candidates_dw WHERE user_id = ?');
            $stmt->execute([$user_id]);
            $existing = $stmt->fetch();

            if (empty($signature) && $existing && !empty($existing['signature_path'])) {
                $signature = $existing['signature_path'];
            }

            if ($existing) {
                $stmt = $db->prepare("
                    UPDATE candidates_dw
                    SET nama = ?, nik = ?, nomor_telepon = ?, gender = ?, bank = ?, norek = ?,
                        atas_nama = ?, alamat = ?, kota = ?, tanggal_lahir = ?, referensi = ?, station = ?,
                        signature_path = COALESCE(?, signature_path)
                    WHERE user_id = ?
                ");
                $stmt->execute([
                    $nama ?: null, $nik ?: null, $nomor_telepon ?: null, $gender ?: null, 
                    $bank ?: null, $norek ?: null, $atas_nama ?: null, $alamat ?: null, 
                    $kota ?: null, $tanggal_lahir ?: null, $referensi ?: null, $station ?: null,
                    $signature, $user_id
                ]);
            } else {
                // given_id di-set null, ID dicetak oleh admin.
                $given_id = null;
                
                $stmt = $db->prepare("
                    INSERT INTO candidates_dw 
                    (given_id, user_id, nama, nik, nomor_telepon, gender, bank, norek, atas_nama, alamat, kota, tanggal_lahir, referensi, station, signature_path, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Belum Pemberkasan')
                ");
                $stmt->execute([
                    $given_id, $user_id, $nama, $nik, $nomor_telepon, $gender, $bank, $norek, $atas_nama, $alamat, 
                    $kota, $tanggal_lahir, $referensi, $station, $signature
                ]);
            }

            jsonResponse(['success' => true, 'message' => 'Data berkas berhasil disimpan!']);
        } catch (PDOException $e) {
            jsonResponse(['error' => 'Gagal menyimpan: ' . $e->getMessage()], 500);
        }
    }

    jsonResponse(['error' => 'Action tidak valid'], 400);

} elseif ($method === 'GET') {
    $db = getDWDB();

    $user_id = intval($_GET['user_id'] ?? 0);
    if ($user_id) {
        $stmt = $db->prepare('
            SELECT id, given_id, nama, nik, nomor_telepon, gender, bank, norek, atas_nama, 
                   alamat, kota, tanggal_lahir, referensi, station, ktp_path, signature_path, 
                   status, created_at
            FROM candidates_dw
            WHERE user_id = ?
            LIMIT 1
        ');
        $stmt->execute([$user_id]);
        $candidate = $stmt->fetch();

        // Get user info
        $stmt2 = $db->prepare('SELECT name, username FROM users WHERE id = ?');
        $stmt2->execute([$user_id]);
        $user = $stmt2->fetch();

        jsonResponse([
            'candidate' => $candidate,
            'user' => $user
        ]);
    }

    jsonResponse(['error' => 'Parameter tidak valid'], 400);
} else {
    jsonResponse(['error' => 'Method not allowed'], 405);
}
