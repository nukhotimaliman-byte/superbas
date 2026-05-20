<?php
/**
 * Data Kalsul - Export API
 * GET ?format=csv                  – export all employees as CSV
 * GET ?format=excel                – export all employees as Excel (.xlsx)
 * GET ?format=csv&station=XXX      – export filtered by station
 */

require_once __DIR__ . '/config.php';
requireAuth();

if (getMethod() !== 'GET') {
    jsonError('Method not allowed', 405);
}

$format  = strtolower($_GET['format'] ?? 'csv');
$station = trim($_GET['station'] ?? '');

// ── Fetch data ──
$db = getDB();
$where  = '';
$params = [];

if ($station !== '') {
    $where = 'WHERE station = :station';
    $params[':station'] = $station;
}

$sql = "SELECT `no`, ops_id, nama, station, status, no_rek, bank, atas_nama, no_hp, nik, alamat FROM kalsul_employees $where ORDER BY `no` ASC, id ASC";
$stmt = $db->prepare($sql);
$stmt->execute($params);
$rows = $stmt->fetchAll();

$headers = ['No', 'OPS ID', 'Nama', 'Station', 'Status', 'No Rek', 'Bank', 'Atas Nama', 'No HP', 'NIK', 'Alamat'];
$fields  = ['no', 'ops_id', 'nama', 'station', 'status', 'no_rek', 'bank', 'atas_nama', 'no_hp', 'nik', 'alamat'];

$dateStr = date('Y-m-d');
$stationSlug = $station !== '' ? '_' . preg_replace('/[^a-zA-Z0-9]/', '-', $station) : '';
$baseFilename = "data-kalsul{$stationSlug}_{$dateStr}";

switch ($format) {

    // ── CSV Export ──
    case 'csv':
        // Override JSON content type
        header('Content-Type: text/csv; charset=utf-8');
        header("Content-Disposition: attachment; filename=\"{$baseFilename}.csv\"");
        header('Cache-Control: no-cache, no-store, must-revalidate');

        $output = fopen('php://output', 'w');

        // BOM for UTF-8 Excel compatibility
        fwrite($output, "\xEF\xBB\xBF");

        // Header row
        fputcsv($output, $headers);

        // Data rows
        foreach ($rows as $row) {
            $line = [];
            foreach ($fields as $f) {
                $line[] = $row[$f] ?? '';
            }
            fputcsv($output, $line);
        }

        fclose($output);
        exit;

    // ── Excel Export ──
    case 'excel':
        // Check PhpSpreadsheet
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

        if (!$loaded || !class_exists('\\PhpOffice\\PhpSpreadsheet\\Spreadsheet')) {
            jsonError('Excel export requires PhpSpreadsheet library. Please install via: composer require phpoffice/phpspreadsheet, or export as CSV instead.');
        }

        $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Data Kalsul');

        // Header row (bold + background)
        $headerStyle = [
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => [
                'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                'startColor' => ['rgb' => '2563EB'],
            ],
            'alignment' => ['horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER],
        ];

        foreach ($headers as $colIdx => $header) {
            $col = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($colIdx + 1);
            $sheet->setCellValue("{$col}1", $header);
            $sheet->getStyle("{$col}1")->applyFromArray($headerStyle);
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        // Data rows
        foreach ($rows as $rowIdx => $row) {
            $excelRow = $rowIdx + 2;
            foreach ($fields as $colIdx => $field) {
                $col = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($colIdx + 1);
                $value = $row[$field] ?? '';

                // Force text for numeric-looking fields
                if (in_array($field, ['no_rek', 'no_hp', 'nik'], true) && $value !== '') {
                    $sheet->setCellValueExplicit("{$col}{$excelRow}", $value, \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
                } else {
                    $sheet->setCellValue("{$col}{$excelRow}", $value);
                }
            }
        }

        // Auto-filter
        $lastCol = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex(count($headers));
        $lastRow = count($rows) + 1;
        $sheet->setAutoFilter("A1:{$lastCol}{$lastRow}");

        // Output
        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header("Content-Disposition: attachment; filename=\"{$baseFilename}.xlsx\"");
        header('Cache-Control: no-cache, no-store, must-revalidate');

        $writer = new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet);
        $writer->save('php://output');
        $spreadsheet->disconnectWorksheets();
        unset($spreadsheet);
        exit;

    default:
        jsonError('Invalid format. Use "csv" or "excel".');
}
