<?php
/**
 * Data Kalsul - Upload API
 * POST – upload Excel/CSV file, parse and bulk insert/update employees
 *
 * Expected columns (case-insensitive header match):
 * No, OPS ID, Nama, Station, Status, No Rek, Bank, Atas Nama, No HP, NIK, Alamat
 */

require_once __DIR__ . '/config.php';
$admin = requireAuth();

if (getMethod() !== 'POST') {
    jsonError('Method not allowed', 405);
}

// Validate file upload
if (empty($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    $errorMessages = [
        UPLOAD_ERR_INI_SIZE   => 'File exceeds server upload limit',
        UPLOAD_ERR_FORM_SIZE  => 'File exceeds form upload limit',
        UPLOAD_ERR_PARTIAL    => 'File was only partially uploaded',
        UPLOAD_ERR_NO_FILE    => 'No file was uploaded',
        UPLOAD_ERR_NO_TMP_DIR => 'Server temp directory missing',
        UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
    ];
    $code = $_FILES['file']['error'] ?? UPLOAD_ERR_NO_FILE;
    jsonError($errorMessages[$code] ?? 'File upload failed');
}

$file     = $_FILES['file'];
$filename = basename($file['name']);
$tmpPath  = $file['tmp_name'];
$ext      = strtolower(pathinfo($filename, PATHINFO_EXTENSION));

// Max 10 MB
if ($file['size'] > 10 * 1024 * 1024) {
    jsonError('File size exceeds 10 MB limit');
}

// ── Parse file into rows ──
$rows = [];

if ($ext === 'csv' || $ext === 'txt') {
    $rows = parseCSV($tmpPath);
} elseif ($ext === 'xlsx' || $ext === 'xls') {
    $rows = parseExcel($tmpPath);
} else {
    jsonError('Unsupported file format. Please upload .csv, .xlsx, or .xls');
}

if (empty($rows)) {
    jsonError('No data rows found in file');
}

// ── Map headers ──
$headerMap = [
    'no'        => ['no', 'nomor'],
    'ops_id'    => ['ops id', 'ops_id', 'opsid', 'id ops'],
    'nama'      => ['nama', 'name', 'nama lengkap'],
    'station'   => ['station', 'stasiun', 'lokasi'],
    'status'    => ['status', 'status pekerja'],
    'no_rek'    => ['no rek', 'no_rek', 'norek', 'nomor rekening', 'no rekening'],
    'bank'      => ['bank', 'nama bank'],
    'atas_nama' => ['atas nama', 'atas_nama', 'a/n', 'an'],
    'no_hp'     => ['no hp', 'no_hp', 'nohp', 'nomor hp', 'no handphone', 'hp', 'telepon'],
    'nik'       => ['nik', 'no ktp', 'nomor ktp', 'no identitas'],
    'alamat'    => ['alamat', 'address', 'alamat lengkap'],
];

// First row = headers
$rawHeaders = array_map(function ($h) {
    return strtolower(trim((string)$h));
}, $rows[0]);

$colMap = []; // field => column index
foreach ($headerMap as $field => $aliases) {
    foreach ($rawHeaders as $idx => $header) {
        if (in_array($header, $aliases, true)) {
            $colMap[$field] = $idx;
            break;
        }
    }
}

// Must at least have 'nama'
if (!isset($colMap['nama'])) {
    jsonError('Could not find "Nama" column in header row. Please check your file format.');
}

// ── Bulk insert/update ──
$db = getDB();
$inserted = 0;
$updated  = 0;
$failed   = 0;
$errors   = [];

// Determine update mode: use ops_id if available
$mode = isset($colMap['ops_id']) ? 'ops_id' : 'insert_only';

$db->beginTransaction();
try {
    for ($i = 1, $len = count($rows); $i < $len; $i++) {
        $row = $rows[$i];

        // Skip empty rows
        $nama = trim((string)($row[$colMap['nama']] ?? ''));
        if ($nama === '') continue;

        $record = [];
        foreach ($colMap as $field => $colIdx) {
            $val = $row[$colIdx] ?? null;
            $record[$field] = ($val !== null) ? trim((string)$val) : null;
        }

        // Cast 'no' to int
        if (isset($record['no']) && $record['no'] !== null) {
            $record['no'] = (int)$record['no'];
        }

        try {
            if ($mode === 'ops_id' && !empty($record['ops_id'])) {
                // Check if exists
                $check = $db->prepare('SELECT id FROM kalsul_employees WHERE ops_id = :ops_id LIMIT 1');
                $check->execute([':ops_id' => $record['ops_id']]);
                $existing = $check->fetch();

                if ($existing) {
                    // Update
                    $sets   = [];
                    $params = [':id' => $existing['id']];
                    foreach ($record as $field => $val) {
                        $sets[] = "`$field` = :$field";
                        $params[":$field"] = $val;
                    }
                    $sql = 'UPDATE kalsul_employees SET ' . implode(', ', $sets) . ' WHERE id = :id';
                    $db->prepare($sql)->execute($params);
                    $updated++;
                } else {
                    // Insert
                    insertEmployee($db, $record);
                    $inserted++;
                }
            } else {
                // Insert only
                insertEmployee($db, $record);
                $inserted++;
            }
        } catch (Exception $e) {
            $failed++;
            $errors[] = "Row " . ($i + 1) . ": " . $e->getMessage();
        }
    }

    $db->commit();
} catch (Exception $e) {
    $db->rollBack();
    jsonError('Upload failed: ' . $e->getMessage(), 500);
}

// Log upload
$status = ($failed === 0) ? 'success' : (($inserted + $updated > 0) ? 'partial' : 'failed');
$logStmt = $db->prepare('INSERT INTO kalsul_uploads (filename, uploaded_by, rows_imported, rows_updated, rows_failed, status, notes) VALUES (:f, :u, :i, :up, :fail, :s, :n)');
$logStmt->execute([
    ':f'    => $filename,
    ':u'    => $admin['id'],
    ':i'    => $inserted,
    ':up'   => $updated,
    ':fail' => $failed,
    ':s'    => $status,
    ':n'    => $errors ? implode("\n", array_slice($errors, 0, 20)) : null,
]);

jsonSuccess([
    'filename'      => $filename,
    'rows_imported' => $inserted,
    'rows_updated'  => $updated,
    'rows_failed'   => $failed,
    'status'        => $status,
    'errors'        => array_slice($errors, 0, 10),
]);

// ── Helper: Insert employee ──
function insertEmployee(PDO $db, array $record): void {
    $fields = array_keys($record);
    $cols   = implode(', ', array_map(fn($f) => "`$f`", $fields));
    $placeholders = implode(', ', array_map(fn($f) => ":$f", $fields));

    $sql  = "INSERT INTO kalsul_employees ($cols) VALUES ($placeholders)";
    $stmt = $db->prepare($sql);

    $params = [];
    foreach ($record as $field => $val) {
        $params[":$field"] = $val;
    }
    $stmt->execute($params);
}

// ── Helper: Parse CSV ──
function parseCSV(string $path): array {
    $rows = [];
    $handle = fopen($path, 'r');
    if (!$handle) return [];

    // Try to detect delimiter
    $firstLine = fgets($handle);
    rewind($handle);
    $delimiter = (substr_count($firstLine, ';') > substr_count($firstLine, ',')) ? ';' : ',';

    while (($data = fgetcsv($handle, 0, $delimiter)) !== false) {
        $rows[] = $data;
    }
    fclose($handle);
    return $rows;
}

// ── Helper: Parse Excel (requires PhpSpreadsheet) ──
function parseExcel(string $path): array {
    // Check if PhpSpreadsheet is available
    $autoloadPaths = [
        __DIR__ . '/vendor/autoload.php',
        __DIR__ . '/../vendor/autoload.php',
    ];

    $loaded = false;
    foreach ($autoloadPaths as $autoload) {
        if (file_exists($autoload)) {
            require_once $autoload;
            $loaded = true;
            break;
        }
    }

    if (!$loaded || !class_exists('\\PhpOffice\\PhpSpreadsheet\\IOFactory')) {
        jsonError('Excel parsing requires PhpSpreadsheet library. Please install via: composer require phpoffice/phpspreadsheet, or upload a CSV file instead.');
    }

    try {
        $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($path);
        $worksheet   = $spreadsheet->getActiveSheet();
        $rows        = [];

        foreach ($worksheet->getRowIterator() as $row) {
            $cellIterator = $row->getCellIterator();
            $cellIterator->setIterateOnlyExistingCells(false);

            $rowData = [];
            foreach ($cellIterator as $cell) {
                $rowData[] = $cell->getValue();
            }
            $rows[] = $rowData;
        }

        return $rows;
    } catch (Exception $e) {
        jsonError('Failed to parse Excel file: ' . $e->getMessage());
    }
    return [];
}
