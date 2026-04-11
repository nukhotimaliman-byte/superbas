<?php
/**
 * BAS Recruitment — Daily Worker Admin API
 */
require_once __DIR__ . '/config.php';

function getDWDB() {
    return new PDO('mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4', DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
}

// Main DB (where admins table lives)
function getMainDB() {
    return new PDO('mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4', DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
}


// Ensure user is an admin (owner/korlap)
if (empty($_SESSION['admin_id'])) {
    jsonResponse(['error' => 'Unauthorized'], 403);
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $action = $_GET['action'] ?? '';
    
    if ($action === 'get_all') {
        $db = getDWDB();
        $stmt = $db->query('
            SELECT id, given_id, nama, nik, nomor_telepon, gender, bank, norek, atas_nama, 
                   alamat, kota, tanggal_lahir, referensi, station, ktp_path, signature_path, 
                   status, created_at, updated_at
            FROM candidates_dw
            ORDER BY created_at DESC
        ');
        $candidates = $stmt->fetchAll();
        
        jsonResponse([
            'success' => true, 
            'candidates' => $candidates,
            'admin_role' => $_SESSION['admin_role'] ?? 'korlap',
            'admin_id' => $_SESSION['admin_id'] ?? 0
        ]);
    }
    
    if ($action === 'get_payrolls') {
        $db = getDWDB();
        $stmt = $db->query('
            SELECT p.id, p.nik, c.nama, p.period, p.pendapatan_dasar, p.lembur, p.potongan, p.thp, p.created_at 
            FROM payroll_dw p
            LEFT JOIN candidates_dw c ON p.nik = c.nik
            ORDER BY p.created_at DESC
        ');
        $payrolls = $stmt->fetchAll();
        jsonResponse(['success' => true, 'payrolls' => $payrolls]);
    }

    if ($action === 'get_admins') {
        // Owner only
        if (($_SESSION['admin_role'] ?? '') !== 'owner') {
            jsonResponse(['error' => 'Hanya owner yang bisa mengakses fitur ini'], 403);
        }
        $db = getMainDB();
        $stmt = $db->query('SELECT id, username, name, role, location_id, created_at FROM admins ORDER BY id ASC');
        $admins = $stmt->fetchAll();
        jsonResponse(['success' => true, 'admins' => $admins]);
    }

    jsonResponse(['error' => 'Invalid action'], 400);

} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $action = $data['action'] ?? '';
    
    if ($action === 'update_status') {
        $id = intval($data['id'] ?? 0);
        $status = $data['status'] ?? '';
        
        if (!$id || !$status) jsonResponse(['error' => 'Data tidak lengkap'], 400);

        try {
            $db = getDWDB();
            $stmt = $db->prepare('UPDATE candidates_dw SET status = ? WHERE id = ?');
            $stmt->execute([$status, $id]);
            jsonResponse(['success' => true]);
        } catch (PDOException $e) {
            jsonResponse(['error' => 'Update gagal: ' . $e->getMessage()], 500);
        }
    }

    if ($action === 'update_ops_id') {
        $id = intval($data['id'] ?? 0);
        $opsId = trim($data['ops_id'] ?? '');
        
        if (!$id) jsonResponse(['error' => 'ID tidak valid'], 400);

        try {
            $db = getDWDB();
            $stmt = $db->prepare('UPDATE candidates_dw SET given_id = ? WHERE id = ?');
            $stmt->execute([$opsId, $id]);
            jsonResponse(['success' => true]);
        } catch (PDOException $e) {
            jsonResponse(['error' => 'Update OPS ID gagal: ' . $e->getMessage()], 500);
        }
    }
    
    if ($action === 'bulk_import') {
        $rows = $data['data'] ?? [];
        if (empty($rows)) jsonResponse(['error' => 'Data kosong'], 400);

        try {
            $db = getDWDB();
            $stmt = $db->prepare("
                INSERT INTO candidates_dw (user_id, given_id, nama, nik, nomor_telepon, gender, bank, norek, atas_nama, alamat, kota, tanggal_lahir, referensi, station, status)
                VALUES (0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Belum Pemberkasan')
                ON DUPLICATE KEY UPDATE
                    given_id = IF(VALUES(given_id) != '', VALUES(given_id), candidates_dw.given_id),
                    nama = IF(VALUES(nama) != '', VALUES(nama), candidates_dw.nama),
                    nomor_telepon = IF(VALUES(nomor_telepon) != '', VALUES(nomor_telepon), candidates_dw.nomor_telepon),
                    gender = IF(VALUES(gender) != '', VALUES(gender), candidates_dw.gender),
                    bank = IF(VALUES(bank) != '', VALUES(bank), candidates_dw.bank),
                    norek = IF(VALUES(norek) != '', VALUES(norek), candidates_dw.norek),
                    atas_nama = IF(VALUES(atas_nama) != '', VALUES(atas_nama), candidates_dw.atas_nama),
                    alamat = IF(VALUES(alamat) != '', VALUES(alamat), candidates_dw.alamat),
                    kota = IF(VALUES(kota) != '', VALUES(kota), candidates_dw.kota),
                    tanggal_lahir = IF(VALUES(tanggal_lahir) != '', VALUES(tanggal_lahir), candidates_dw.tanggal_lahir),
                    referensi = IF(VALUES(referensi) != '', VALUES(referensi), candidates_dw.referensi),
                    station = IF(VALUES(station) != '', VALUES(station), candidates_dw.station)
            ");
            $count = 0;
            foreach ($rows as $r) {
                if (empty($r['nik'])) continue;
                try {
                    $stmt->execute([
                        $r['given_id'] ?? ($r['ops_id'] ?? ''),
                        $r['nama'] ?? '',
                        $r['nik'],
                        $r['nomor_telepon'] ?? ($r['no_telepon'] ?? ''),
                        $r['gender'] ?? '',
                        $r['bank'] ?? '',
                        $r['norek'] ?? ($r['no_rekening'] ?? ''),
                        $r['atas_nama'] ?? '',
                        $r['alamat'] ?? '',
                        $r['kota'] ?? '',
                        $r['tanggal_lahir'] ?? '',
                        $r['referensi'] ?? '',
                        $r['station'] ?? ''
                    ]);
                    $count++;
                } catch(Exception $e) { /* ignore formatting errors manually */ }
            }
            jsonResponse(['success' => true, 'imported' => $count]);
        } catch (PDOException $e) {
            jsonResponse(['error' => 'Bulk Import gagal: ' . $e->getMessage()], 500);
        }
    }

    if ($action === 'import_payroll') {
        $rows = $data['data'] ?? [];
        if (empty($rows)) jsonResponse(['error' => 'Data kosong'], 400);

        try {
            $db = getDWDB();
            $stmt = $db->prepare("
                INSERT INTO payroll_dw (nik, period, pendapatan_dasar, lembur, potongan, thp)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            $count = 0;
            foreach ($rows as $r) {
                if (!empty($r['nik']) && !empty($r['period'])) {
                    $stmt->execute([
                        $r['nik'], $r['period'], 
                        floatval($r['pendapatan_dasar']??0), floatval($r['lembur']??0), 
                        floatval($r['potongan']??0), floatval($r['thp']??0)
                    ]);
                    $count++;
                }
            }
            jsonResponse(['success' => true, 'imported' => $count]);
        } catch (PDOException $e) {
            jsonResponse(['error' => 'Import Payroll gagal: ' . $e->getMessage()], 500);
        }
    }

    // ── Owner-only: Manage admin/korlap accounts ──
    if ($action === 'create_admin') {
        if (($_SESSION['admin_role'] ?? '') !== 'owner') {
            jsonResponse(['error' => 'Hanya owner yang bisa mengakses fitur ini'], 403);
        }
        
        $username = trim($data['username'] ?? '');
        $password = $data['password'] ?? '';
        $name = trim($data['name'] ?? '');
        $role = $data['role'] ?? 'korlap';
        $locationId = $data['location_id'] ?? null;
        
        if (!$username || !$password || !$name) {
            jsonResponse(['error' => 'Username, password, dan nama wajib diisi'], 400);
        }
        if (strlen($password) < 6) {
            jsonResponse(['error' => 'Password minimal 6 karakter'], 400);
        }
        if (!in_array($role, ['korlap', 'owner'])) {
            jsonResponse(['error' => 'Role tidak valid'], 400);
        }
        
        try {
            $db = getMainDB();
            // Check duplicate username
            $check = $db->prepare('SELECT id FROM admins WHERE username = ?');
            $check->execute([$username]);
            if ($check->fetch()) {
                jsonResponse(['error' => 'Username sudah digunakan'], 400);
            }
            
            $hashed = password_hash($password, PASSWORD_DEFAULT);
            $stmt = $db->prepare('INSERT INTO admins (username, password, name, role, location_id) VALUES (?, ?, ?, ?, ?)');
            $stmt->execute([$username, $hashed, $name, $role, $locationId]);
            jsonResponse(['success' => true, 'id' => $db->lastInsertId()]);
        } catch (PDOException $e) {
            jsonResponse(['error' => 'Gagal membuat admin: ' . $e->getMessage()], 500);
        }
    }

    if ($action === 'delete_admin') {
        if (($_SESSION['admin_role'] ?? '') !== 'owner') {
            jsonResponse(['error' => 'Hanya owner yang bisa mengakses fitur ini'], 403);
        }
        
        $id = intval($data['id'] ?? 0);
        if (!$id) jsonResponse(['error' => 'ID tidak valid'], 400);
        
        // Prevent deleting yourself
        if ($id == $_SESSION['admin_id']) {
            jsonResponse(['error' => 'Tidak bisa menghapus akun sendiri'], 400);
        }
        
        try {
            $db = getMainDB();
            $stmt = $db->prepare('DELETE FROM admins WHERE id = ?');
            $stmt->execute([$id]);
            jsonResponse(['success' => true]);
        } catch (PDOException $e) {
            jsonResponse(['error' => 'Gagal menghapus admin: ' . $e->getMessage()], 500);
        }
    }
    
    jsonResponse(['error' => 'Invalid action'], 400);
} else {
    jsonResponse(['error' => 'Method not allowed'], 405);
}
