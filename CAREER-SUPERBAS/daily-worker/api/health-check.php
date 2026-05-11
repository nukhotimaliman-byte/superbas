<?php
require_once __DIR__ . '/../config.php';
$db = getDB();

// 1. Count files in uploads directory
$uploadDir = __DIR__ . '/../uploads/';
$physicalFiles = glob($uploadDir . '*');
$physicalCount = count($physicalFiles);

// 2. Count records in dw_documents table
$stmt = $db->query('SELECT COUNT(*) as total FROM dw_documents');
$dbCount = $stmt->fetch()['total'];

// 3. Check how many DB records have matching physical files
$stmt = $db->query('SELECT id, candidate_id, doc_type, file_path, uploaded_at FROM dw_documents ORDER BY uploaded_at DESC');
$allDocs = $stmt->fetchAll();
$found = 0; $missing = 0; $missingList = [];
foreach ($allDocs as $doc) {
    if (file_exists($uploadDir . $doc['file_path'])) {
        $found++;
    } else {
        $missing++;
        if ($missing <= 10) $missingList[] = $doc['file_path'] . ' (cand:' . $doc['candidate_id'] . ', type:' . $doc['doc_type'] . ')';
    }
}

// 4. Count unique candidates with documents
$stmt = $db->query('SELECT COUNT(DISTINCT candidate_id) as total FROM dw_documents');
$candWithDocs = $stmt->fetch()['total'];

// 5. Doc type breakdown
$stmt = $db->query('SELECT doc_type, COUNT(*) as cnt FROM dw_documents GROUP BY doc_type ORDER BY cnt DESC');
$breakdown = $stmt->fetchAll();

echo "=== BAS Upload Health Check ===\n\n";
echo "Physical files in uploads/: $physicalCount\n";
echo "Records in dw_documents:    $dbCount\n";
echo "DB records with file found: $found\n";
echo "DB records with file MISSING: $missing\n";
echo "Unique candidates with docs: $candWithDocs\n\n";

echo "=== Doc Type Breakdown ===\n";
foreach ($breakdown as $b) {
    echo "  " . str_pad($b['doc_type'], 15) . ": " . $b['cnt'] . "\n";
}

if ($missing > 0) {
    echo "\n=== Missing Files (first 10) ===\n";
    foreach ($missingList as $m) echo "  - $m\n";
}

// 6. Show 5 most recent uploads
echo "\n=== 5 Most Recent Uploads ===\n";
foreach (array_slice($allDocs, 0, 5) as $doc) {
    $exists = file_exists($uploadDir . $doc['file_path']) ? 'OK' : 'MISSING';
    echo "  [$exists] {$doc['doc_type']} — cand:{$doc['candidate_id']} — {$doc['uploaded_at']}\n";
}
