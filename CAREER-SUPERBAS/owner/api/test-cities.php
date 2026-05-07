<?php
require_once __DIR__ . '/../config.php';
header('Content-Type: application/json');

try {
    $owner = requireOwnerAuth();
    $db = getDB();

    $result = [];
    $tables = ['drv_candidates', 'krr_candidates', 'dw_candidates'];

    foreach ($tables as $tbl) {
        try {
            $cols = $db->query("SHOW COLUMNS FROM $tbl LIKE 'kabupaten'")->fetchAll();
            if (count($cols) > 0) {
                $stmt = $db->query("SELECT kabupaten AS city, COUNT(*) AS cnt FROM $tbl WHERE kabupaten IS NOT NULL AND kabupaten != '' GROUP BY kabupaten ORDER BY cnt DESC LIMIT 5");
                while ($row = $stmt->fetch()) {
                    $c = trim($row['city']);
                    if ($c) {
                        $found = false;
                        foreach ($result as &$r) {
                            if ($r['city'] === $c) { $r['total'] += intval($row['cnt']); $found = true; break; }
                        }
                        if (!$found) $result[] = ['city' => $c, 'total' => intval($row['cnt'])];
                    }
                }
            }
        } catch (Exception $e) {
            // skip
        }
    }

    usort($result, function($a, $b) { return $b['total'] - $a['total']; });
    echo json_encode(array_slice($result, 0, 10));
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
