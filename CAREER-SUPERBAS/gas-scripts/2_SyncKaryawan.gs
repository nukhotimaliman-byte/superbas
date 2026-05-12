// ═══════════════════════════════════════════════════
// BAS SYNC — SyncKaryawan.gs
// Sync tab KARYAWAN → dw_importrange MySQL
// ═══════════════════════════════════════════════════

function syncKaryawan() {
  var sheet = SpreadsheetApp.getActive().getSheetByName(CONFIG.SHEET_KARYAWAN);
  if (!sheet) {
    Logger.log('❌ Sheet "' + CONFIG.SHEET_KARYAWAN + '" tidak ditemukan');
    SpreadsheetApp.getActive().toast('Sheet KARYAWAN tidak ditemukan!', '❌ Error');
    return;
  }
  
  var data = sheet.getDataRange().getValues();
  var cols = CONFIG.KARYAWAN_COLS;
  var rows = [];
  
  for (var i = 1; i < data.length; i++) {
    var opsId = String(data[i][cols.OPS_ID] || '').trim();
    if (!opsId) continue;
    
    rows.push({
      ops_id:    opsId,
      nama:      String(data[i][cols.NAMA] || '').trim(),
      nik:       String(data[i][cols.NIK] || '').trim(),
      status:    String(data[i][cols.STATUS] || 'AKTIF').trim(),
      station:   String(data[i][cols.STATION] || '').trim(),
      wa:        String(data[i][cols.WA] || '').trim(),
      bank:      String(data[i][cols.BANK] || '').trim(),
      rekening:  String(data[i][cols.REKENING] || '').trim(),
      atas_nama: String(data[i][cols.ATAS_NAMA] || '').trim(),
      join_date: formatDate(data[i][cols.JOIN_DATE])
    });
  }
  
  Logger.log('📦 Karyawan: ' + rows.length + ' rows to sync');
  
  if (rows.length === 0) {
    SpreadsheetApp.getActive().toast('Tidak ada data karyawan', '⚠️');
    return;
  }
  
  sendBatch(CONFIG.API_URL + '?action=sync_karyawan', rows, 'Karyawan');
}

/**
 * Format date to YYYY-MM-DD
 */
function formatDate(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, 'Asia/Jakarta', 'yyyy-MM-dd');
  }
  var str = String(val).trim();
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  // DD/MM/YYYY
  var m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return m[3] + '-' + m[2].padStart(2,'0') + '-' + m[1].padStart(2,'0');
  return str;
}
