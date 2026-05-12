// ═══════════════════════════════════════════════════
// BAS SYNC — SyncAbsensi.gs
// Sync tab ABSENSI → dw_attendance MySQL
// Auto-triggered setiap 15 menit
// ═══════════════════════════════════════════════════

function syncAbsensi() {
  var sheet = SpreadsheetApp.getActive().getSheetByName(CONFIG.SHEET_ABSENSI);
  if (!sheet) {
    Logger.log('❌ Sheet "' + CONFIG.SHEET_ABSENSI + '" tidak ditemukan');
    return;
  }
  
  var data = sheet.getDataRange().getValues();
  var cols = CONFIG.ABSENSI_COLS;
  var rows = [];
  
  for (var i = 1; i < data.length; i++) {
    var opsId = String(data[i][cols.OPS_ID] || '').trim();
    if (!opsId) continue;
    
    var dateVal = data[i][cols.DATE];
    var dateStr = '';
    
    // Handle Date object from Sheets
    if (dateVal instanceof Date) {
      dateStr = Utilities.formatDate(dateVal, 'Asia/Jakarta', 'yyyy-MM-dd');
    } else {
      dateStr = parseTanggalIndonesia(String(dateVal || '').trim());
    }
    
    if (!dateStr) continue;
    
    rows.push({
      ops_id:   opsId,
      name:     String(data[i][cols.NAMA] || '').trim(),
      status:   String(data[i][cols.STATUS] || 'DONE').trim(),
      station:  String(data[i][cols.STATION] || '').trim(),
      shifting: String(data[i][cols.SHIFTING] || '').trim(),
      date:     dateStr
    });
  }
  
  Logger.log('📦 Absensi: ' + rows.length + ' rows to sync');
  
  if (rows.length === 0) {
    Logger.log('⚠️ Tidak ada data absensi');
    return;
  }
  
  sendBatch(CONFIG.API_URL + '?action=sync_absensi', rows, 'Absensi');
}

/**
 * Parse "Minggu, 01 Februari 2026" → "2026-02-01"
 * Also handles "01 Februari 2026" without day name
 */
function parseTanggalIndonesia(raw) {
  if (!raw) return '';
  
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  
  var bulan = {
    'januari':'01', 'februari':'02', 'maret':'03', 'april':'04',
    'mei':'05', 'juni':'06', 'juli':'07', 'agustus':'08',
    'september':'09', 'oktober':'10', 'november':'11', 'desember':'12'
  };
  
  // Remove day name and comma
  var clean = raw.replace(/,/g, '').trim();
  var parts = clean.split(/\s+/);
  
  // Find the pattern: DD BULAN YYYY (last 3 parts)
  if (parts.length >= 3) {
    var yyyy = parts[parts.length - 1];
    var mmName = (parts[parts.length - 2] || '').toLowerCase();
    var dd = parts[parts.length - 3];
    
    var mm = bulan[mmName];
    if (mm && /^\d+$/.test(yyyy) && /^\d+$/.test(dd)) {
      return yyyy + '-' + mm + '-' + String(dd).padStart(2, '0');
    }
  }
  
  return '';
}
