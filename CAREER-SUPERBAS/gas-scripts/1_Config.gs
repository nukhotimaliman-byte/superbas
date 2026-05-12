// ═══════════════════════════════════════════════════
// BAS SYNC — Config.gs
// Konfigurasi global untuk sinkronisasi GAS → MySQL
// ═══════════════════════════════════════════════════

var CONFIG = {
  // API endpoint
  API_URL: 'https://super-bas.com/daily-worker/api/attendance.php',
  SYNC_TOKEN: 'bas-sync-2026',
  
  // Sheet names
  SHEET_KARYAWAN: 'KARYAWAN',
  SHEET_ABSENSI: 'ABSENSI',
  
  // Column mapping KARYAWAN (0-indexed)
  // A:OPS_ID  B:NAMA  C:NIK  D:STATUS  E:STATION  F:WA  G:Bank  H:Rekening  I:AN  J:Join
  KARYAWAN_COLS: {
    OPS_ID:   0,
    NAMA:     1,
    NIK:      2,
    STATUS:   3,
    STATION:  4,
    WA:       5,
    BANK:     6,
    REKENING: 7,
    ATAS_NAMA:8,
    JOIN_DATE:9
  },
  
  // Column mapping ABSENSI (0-indexed)
  // A:OPSID  B:NAMA  C:STATUS  D:STATION  E:SHIFTING  F:DATE
  ABSENSI_COLS: {
    OPS_ID:   0,
    NAMA:     1,
    STATUS:   2,
    STATION:  3,
    SHIFTING: 4,
    DATE:     5
  }
};
