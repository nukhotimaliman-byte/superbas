<?php
// FILE TEST KONEKSI - HAPUS SETELAH SELESAI DEBUG!
$host = '46.250.232.197';  // IP VPS Contabo
$dbname = 'super-bas.com';
$user = 'owner';
$pass = 'Asik123asik';
?>
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>DB Test</title>
<style>body{font-family:monospace;padding:20px;background:#0f0f0f;color:#eee}
.ok{color:#4ade80} .fail{color:#f87171} .warn{color:#facc15}
pre{background:#1a1a1a;padding:12px;border-radius:8px;overflow:auto}</style>
</head>
<body>
<h2>🔍 Database Connection Test</h2>

<?php
// ── 1. Test PDO Connection ────────────────────────
echo "<h3>1. Testing PDO connection...</h3>";
try {
    $dsn = "mysql:host=$host;dbname=$dbname;charset=utf8mb4";
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    echo "<p class='ok'>✅ Connected to $host / $dbname</p>";
} catch (PDOException $e) {
    echo "<p class='fail'>❌ FAILED: " . htmlspecialchars($e->getMessage()) . "</p>";
    exit;
}

// ── 2. Check Tables ─────────────────────────────
echo "<h3>2. Checking tables...</h3>";
$tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
echo "<p>Tables found: <strong>" . implode(', ', $tables) . "</strong></p>";

// ── 3. Check candidates columns ─────────────────
echo "<h3>3. Checking <code>candidates</code> table columns...</h3>";
$requiredCols = [
    'id', 'user_id', 'nik', 'name', 'whatsapp', 'address',
    'provinsi', 'kabupaten', 'kecamatan', 'kelurahan',
    'armada_type', 'sim_type', 'status', 'tempat_lahir', 'tanggal_lahir',
    'pernah_kerja_spx', 'pendidikan_terakhir', 'surat_sehat', 'paklaring',
    'referensi', 'emergency_name', 'emergency_phone', 'emergency_relation',
    'bank_name', 'bank_account_no', 'bank_account_name',
    'signature_data', 'photo_data', 'korlap_notes', 'interview_location',
    'test_drive_date', 'test_drive_time', 'location_id', 'created_at'
];

try {
    $cols = $pdo->query("SHOW COLUMNS FROM candidates")->fetchAll(PDO::FETCH_COLUMN);
    $missing = array_diff($requiredCols, $cols);
    foreach ($requiredCols as $col) {
        $found = in_array($col, $cols);
        echo "<p class='" . ($found ? 'ok' : 'fail') . "'>" . ($found ? '✅' : '❌ MISSING') . " <code>$col</code></p>";
    }
    if (!empty($missing)) {
        echo "<hr><p class='fail'>⚠️ KOLOM YANG HILANG: " . implode(', ', $missing) . "</p>";
        echo "<pre>-- Jalankan SQL ini di phpMyAdmin VPS:\n";
        $sqlFixes = [];
        $colDefs = [
            'provinsi'            => "VARCHAR(100) DEFAULT NULL",
            'kabupaten'           => "VARCHAR(100) DEFAULT NULL",
            'kecamatan'           => "VARCHAR(100) DEFAULT NULL",
            'kelurahan'           => "VARCHAR(100) DEFAULT NULL",
            'referensi'           => "VARCHAR(255) DEFAULT NULL",
            'emergency_name'      => "VARCHAR(100) DEFAULT NULL",
            'emergency_phone'     => "VARCHAR(20) DEFAULT NULL",
            'emergency_relation'  => "VARCHAR(50) DEFAULT NULL",
            'bank_name'           => "VARCHAR(50) DEFAULT NULL",
            'bank_account_no'     => "VARCHAR(30) DEFAULT NULL",
            'bank_account_name'   => "VARCHAR(100) DEFAULT NULL",
            'signature_data'      => "LONGTEXT DEFAULT NULL",
            'photo_data'          => "LONGTEXT DEFAULT NULL",
            'korlap_notes'        => "TEXT DEFAULT NULL",
            'interview_location'  => "VARCHAR(255) DEFAULT NULL",
            'test_drive_time'     => "TIME DEFAULT NULL",
            'given_id'            => "VARCHAR(20) DEFAULT NULL",
        ];
        foreach ($missing as $col) {
            $def = $colDefs[$col] ?? "VARCHAR(255) DEFAULT NULL";
            $sqlFixes[] = "ALTER TABLE candidates ADD COLUMN `$col` $def;";
        }
        echo implode("\n", $sqlFixes);
        echo "</pre>";
    } else {
        echo "<p class='ok'>✅ Semua kolom tersedia!</p>";
    }
} catch (Exception $e) {
    echo "<p class='fail'>❌ Gagal cek kolom: " . htmlspecialchars($e->getMessage()) . "</p>";
}

// ── 4. Check users columns ──────────────────────
echo "<h3>4. Checking <code>users</code> table columns...</h3>";
try {
    $cols = $pdo->query("SHOW COLUMNS FROM users")->fetchAll(PDO::FETCH_COLUMN);
    $reqUserCols = ['id','nik','username','password','name','email','phone','google_id','picture','is_deleted','plain_password','last_login','created_at'];
    $missingU = array_diff($reqUserCols, $cols);
    if (empty($missingU)) echo "<p class='ok'>✅ Semua kolom users tersedia!</p>";
    else echo "<p class='fail'>❌ Kolom users hilang: " . implode(', ', $missingU) . "</p>";
} catch (Exception $e) {
    echo "<p class='fail'>❌ " . htmlspecialchars($e->getMessage()) . "</p>";
}

// ── 4b. Check push notification tables ──────────
echo "<h3>4b. Push Notification Tables...</h3>";
try {
    // push_subscriptions table
    $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('push_subscriptions', $tables)) {
        $pdo->exec("CREATE TABLE push_subscriptions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            endpoint TEXT NOT NULL,
            p256dh VARCHAR(255) DEFAULT '',
            auth_key VARCHAR(255) DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_user (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        echo "<p class='ok'>✅ Tabel push_subscriptions dibuat!</p>";
    } else {
        echo "<p class='ok'>✅ push_subscriptions sudah ada</p>";
    }

    // notifications table
    if (!in_array('notifications', $tables)) {
        $pdo->exec("CREATE TABLE notifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            type ENUM('korlap_note','status_change','schedule','info') DEFAULT 'info',
            title VARCHAR(100) NOT NULL,
            message TEXT NOT NULL,
            is_read TINYINT(1) DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_by INT DEFAULT NULL,
            INDEX idx_user_read (user_id, is_read)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        echo "<p class='ok'>✅ Tabel notifications dibuat!</p>";
    } else {
        echo "<p class='ok'>✅ notifications sudah ada</p>";
    }
} catch (Exception $e) {
    echo "<p class='fail'>❌ Push tables: " . htmlspecialchars($e->getMessage()) . "</p>";
}

// ── 4c. Dropdown options table ──────────────────
echo "<h3>4c. Dropdown Options Table...</h3>";
try {
    $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('dropdown_options', $tables)) {
        $pdo->exec("CREATE TABLE dropdown_options (
            id INT AUTO_INCREMENT PRIMARY KEY,
            category VARCHAR(50) NOT NULL,
            label VARCHAR(100) NOT NULL,
            value VARCHAR(100) NOT NULL,
            color VARCHAR(20) DEFAULT '',
            sort_order INT DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_cat_val (category, value),
            INDEX idx_category (category)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        echo "<p class='ok'>✅ Tabel dropdown_options dibuat!</p>";

        // Auto seed defaults
        $defaults = [
            'status' => ['Belum Pemberkasan','Sudah Pemberkasan','Menunggu Test Drive','Jadwal Test Drive','Hadir','Tidak Hadir','Lulus','Tidak Lulus'],
            'armada_type' => ['CDD','Wingbox','Big Mama'],
            'sim_type' => ['SIM A','SIM B1','SIM B2'],
            'pernah_kerja_spx' => ['Ya','Tidak'],
            'surat_sehat' => ['Ada','Tidak Ada'],
            'paklaring' => ['Ada','Tidak Ada'],
            'pendidikan_terakhir' => ['SD','SMP','SMA/SMK','D3','S1','S2']
        ];
        $ins = $pdo->prepare("INSERT IGNORE INTO dropdown_options (category,label,value,sort_order) VALUES (?,?,?,?)");
        foreach ($defaults as $cat => $items) {
            foreach ($items as $i => $label) {
                $ins->execute([$cat, $label, $label, $i+1]);
            }
        }
        echo "<p class='ok'>✅ Default options seeded!</p>";
    } else {
        $cnt = $pdo->query("SELECT COUNT(*) FROM dropdown_options")->fetchColumn();
        echo "<p class='ok'>✅ dropdown_options sudah ada ($cnt opsi)</p>";
    }
} catch (Exception $e) {
    echo "<p class='fail'>❌ Dropdown table: " . htmlspecialchars($e->getMessage()) . "</p>";
}

// ── 5. Session test ─────────────────────────────
echo "<h3>5. Session Status...</h3>";
session_start();
echo "<p>Session ID: <code>" . session_id() . "</code></p>";
echo "<p>user_id in session: <strong class='" . (isset($_SESSION['user_id']) ? 'ok' : 'warn') . "'>" . ($_SESSION['user_id'] ?? 'NOT SET') . "</strong></p>";
echo "<p>admin_id in session: <strong>" . ($_SESSION['admin_id'] ?? 'NOT SET') . "</strong></p>";

// ── 6. Server Info ──────────────────────────────
echo "<h3>6. Server Info...</h3>";
echo "<p>PHP: " . phpversion() . "</p>";
echo "<p>Host: " . $_SERVER['HTTP_HOST'] . "</p>";
echo "<p>Server: " . ($_SERVER['SERVER_SOFTWARE'] ?? 'N/A') . "</p>";
?>

<hr>
<p class="warn">⚠️ HAPUS FILE INI SETELAH DEBUG SELESAI!</p>
</body>
</html>
