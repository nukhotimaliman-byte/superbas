/**
 * ═══════════════════════════════════════════════════════
 * BAS UNIVERSAL SYNC — Single File, Multi-Spreadsheet
 * ═══════════════════════════════════════════════════════
 * 
 * Paste kode ini di Apps Script spreadsheet manapun.
 * Script akan auto-detect sheet yang ada dan sync sesuai kebutuhan.
 * 
 * Sheet yang didukung:
 *   KARYAWAN       → dw_importrange (data karyawan)
 *   ABSENSI        → dw_attendance (data kehadiran)
 *   GANTI_REKENING → dw_rekening_changes (pengajuan ganti rek)
 * 
 * SETUP:
 *   1. Ekstensi → Apps Script → Paste kode ini
 *   2. Jalankan setupAutoSync() sekali
 *   3. Selesai! Data akan sync otomatis tiap 15 menit
 */

// ═══════════════════════════════════════════════════════
// CONFIG — Tidak perlu diubah
// ═══════════════════════════════════════════════════════
var CONFIG = {
  // API endpoints
  API_IMPORTRANGE: 'https://super-bas.com/daily-worker/api/importrange.php',
  API_ATTENDANCE:  'https://super-bas.com/daily-worker/api/attendance.php',
  
  // Auth tokens
  IMPORTRANGE_KEY: 'BAS-DW-IMPORTRANGE-2026',
  ATTENDANCE_TOKEN: 'bas-sync-2026',
  
  // Sheet names (auto-detect)
  SHEET_KARYAWAN:      'KARYAWAN',
  SHEET_ABSENSI:       'ABSENSI',
  SHEET_GANTI_REK:     'GANTI_REKENING',
  
  // Sync settings
  BATCH_SIZE: 500,
  START_ROW: 2,
  AUTO_SYNC_MINUTES: 15
};


// ═══════════════════════════════════════════════════════
// MENU — Auto-detect sheets yang ada
// ═══════════════════════════════════════════════════════
function onOpen() {
  var ss = SpreadsheetApp.getActive();
  var menu = SpreadsheetApp.getUi().createMenu('🔄 BAS Sync');
  
  menu.addItem('🔁 Sync Semua', 'syncAll');
  menu.addSeparator();
  
  if (ss.getSheetByName(CONFIG.SHEET_KARYAWAN))  menu.addItem('📋 Sync Karyawan', 'syncKaryawan');
  if (ss.getSheetByName(CONFIG.SHEET_ABSENSI))   menu.addItem('📅 Sync Absensi', 'syncAbsensi');
  if (ss.getSheetByName(CONFIG.SHEET_GANTI_REK)) menu.addItem('💳 Sync Ganti Rekening', 'syncGantiRekening');
  
  menu.addSeparator();
  menu.addItem('🟢 Aktifkan Auto-Sync (' + CONFIG.AUTO_SYNC_MINUTES + ' menit)', 'setupAutoSync');
  menu.addItem('🔴 Nonaktifkan Auto-Sync', 'removeAutoSync');
  menu.addItem('ℹ️ Status', 'showStatus');
  
  menu.addToUi();
}


// ═══════════════════════════════════════════════════════
// TRIGGERS
// ═══════════════════════════════════════════════════════
function setupAutoSync() {
  ScriptApp.getProjectTriggers().forEach(function(t) { ScriptApp.deleteTrigger(t); });
  
  // onEdit (real-time for KARYAWAN)
  ScriptApp.newTrigger('onEditSync')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onEdit()
    .create();
  
  // Time-based (sync all every 15 min)
  ScriptApp.newTrigger('syncAll')
    .timeBased()
    .everyMinutes(CONFIG.AUTO_SYNC_MINUTES)
    .create();
  
  var ss = SpreadsheetApp.getActive();
  var detected = [];
  if (ss.getSheetByName(CONFIG.SHEET_KARYAWAN))  detected.push('KARYAWAN');
  if (ss.getSheetByName(CONFIG.SHEET_ABSENSI))   detected.push('ABSENSI');
  if (ss.getSheetByName(CONFIG.SHEET_GANTI_REK)) detected.push('GANTI_REKENING');
  
  SpreadsheetApp.getActive().toast(
    'Auto-sync AKTIF setiap ' + CONFIG.AUTO_SYNC_MINUTES + ' menit\n' +
    'Sheet terdeteksi: ' + detected.join(', '),
    '🟢 BAS Sync', 10
  );
}

function removeAutoSync() {
  var count = ScriptApp.getProjectTriggers().length;
  ScriptApp.getProjectTriggers().forEach(function(t) { ScriptApp.deleteTrigger(t); });
  SpreadsheetApp.getActive().toast(count + ' trigger dihapus', '🔴 BAS Sync', 5);
}

function showStatus() {
  var ss = SpreadsheetApp.getActive();
  var triggers = ScriptApp.getProjectTriggers();
  var detected = [];
  if (ss.getSheetByName(CONFIG.SHEET_KARYAWAN))  detected.push('KARYAWAN ✅');
  if (ss.getSheetByName(CONFIG.SHEET_ABSENSI))   detected.push('ABSENSI ✅');
  if (ss.getSheetByName(CONFIG.SHEET_GANTI_REK)) detected.push('GANTI_REKENING ✅');
  
  var msg = '📊 Sheet terdeteksi:\n' + detected.join('\n') + '\n\n' +
    '⏱️ Auto-sync: ' + (triggers.length > 0 ? '🟢 AKTIF (' + triggers.length + ' trigger)' : '🔴 NONAKTIF') + '\n' +
    '📌 Spreadsheet: ' + ss.getName();
  
  SpreadsheetApp.getUi().alert('BAS Sync Status', msg, SpreadsheetApp.getUi().ButtonSet.OK);
}


// ═══════════════════════════════════════════════════════
// SYNC ALL — Auto-detect & sync
// ═══════════════════════════════════════════════════════
function syncAll() {
  var ss = SpreadsheetApp.getActive();
  var results = [];
  
  if (ss.getSheetByName(CONFIG.SHEET_KARYAWAN)) {
    syncKaryawan();
    results.push('Karyawan ✅');
  }
  if (ss.getSheetByName(CONFIG.SHEET_ABSENSI)) {
    syncAbsensi();
    results.push('Absensi ✅');
  }
  if (ss.getSheetByName(CONFIG.SHEET_GANTI_REK)) {
    syncGantiRekening();
    results.push('Ganti Rek ✅');
  }
  
  if (results.length > 0) {
    Logger.log('✅ syncAll: ' + results.join(', '));
    try { SpreadsheetApp.getActive().toast(results.join(' | '), 'BAS Sync ✅', 5); } catch(e) {}
  } else {
    Logger.log('⚠️ syncAll: No recognized sheets found');
  }
}


// ═══════════════════════════════════════════════════════
// SYNC KARYAWAN → dw_importrange
// ═══════════════════════════════════════════════════════
function syncKaryawan() {
  var sheet = SpreadsheetApp.getActive().getSheetByName(CONFIG.SHEET_KARYAWAN);
  if (!sheet) return;
  
  // Update status gaji first
  updateStatusGaji(sheet);
  
  var lastRow = sheet.getLastRow();
  if (lastRow < CONFIG.START_ROW) return;
  
  var lastCol = Math.max(sheet.getLastColumn(), 11);
  var data = sheet.getRange(CONFIG.START_ROW, 1, lastRow - CONFIG.START_ROW + 1, lastCol).getValues();
  
  // Column mapping (fixed for KARYAWAN)
  // A=OPS_ID B=NAMA C=NIK D=STATUS E=STATION F=WA G=BANK H=REKENING I=AN J=JOIN K=STATUS_GAJI
  var rows = [];
  data.forEach(function(row, index) {
    var opsId = String(row[0] || '').trim();
    if (!opsId) return;
    
    var rekening = String(row[7] || '').trim();
    var statusGaji = (rekening && rekening !== '0') ? 'Sudah isi link gaji' : 'Belum isi link gaji';
    
    rows.push({
      ops_id:      opsId,
      nama:        String(row[1] || '').trim(),
      nik:         String(row[2] || '').trim(),
      status:      String(row[3] || 'DAILY WORKER').trim(),
      station:     String(row[4] || '').trim(),
      wa:          String(row[5] || '').trim(),
      bank:        String(row[6] || '').trim(),
      rekening:    rekening,
      atas_nama:   String(row[8] || '').trim(),
      join_date:   fmtDate(row[9]),
      status_gaji: statusGaji,
      sheet_row:   index + CONFIG.START_ROW
    });
  });
  
  if (rows.length === 0) return;
  
  // Send in batches via importrange API
  var totalInserted = 0, totalUpdated = 0;
  for (var i = 0; i < rows.length; i += 100) {
    var batch = rows.slice(i, i + 100);
    var resp = postJSON(CONFIG.API_IMPORTRANGE + '?action=sync', { api_key: CONFIG.IMPORTRANGE_KEY, rows: batch });
    if (resp.success) {
      totalInserted += (resp.inserted || 0);
      totalUpdated += (resp.updated || 0);
    }
  }
  
  Logger.log('✅ Karyawan: ' + totalInserted + ' baru, ' + totalUpdated + ' update (' + rows.length + ' total)');
  try { SpreadsheetApp.getActive().toast('Karyawan: ' + rows.length + ' synced', 'BAS Sync', 3); } catch(e) {}
}


// ═══════════════════════════════════════════════════════
// SYNC ABSENSI → dw_attendance
// ═══════════════════════════════════════════════════════
function syncAbsensi() {
  var sheet = SpreadsheetApp.getActive().getSheetByName(CONFIG.SHEET_ABSENSI);
  if (!sheet) return;
  
  var data = sheet.getDataRange().getValues();
  // A=OPSID B=NAMA C=STATUS D=STATION E=SHIFTING F=DATE
  var rows = [];
  
  for (var i = 1; i < data.length; i++) {
    var opsId = String(data[i][0] || '').trim();
    if (!opsId) continue;
    
    var dateStr = '';
    if (data[i][5] instanceof Date) {
      dateStr = Utilities.formatDate(data[i][5], 'Asia/Jakarta', 'yyyy-MM-dd');
    } else {
      dateStr = parseTanggal(String(data[i][5] || '').trim());
    }
    if (!dateStr) continue;
    
    rows.push({
      ops_id:   opsId,
      name:     String(data[i][1] || '').trim(),
      status:   String(data[i][2] || 'DONE').trim(),
      station:  String(data[i][3] || '').trim(),
      shifting: String(data[i][4] || '').trim(),
      date:     dateStr
    });
  }
  
  if (rows.length === 0) return;
  
  var totalSynced = 0;
  for (var i = 0; i < rows.length; i += CONFIG.BATCH_SIZE) {
    var chunk = rows.slice(i, i + CONFIG.BATCH_SIZE);
    var resp = postJSON(CONFIG.API_ATTENDANCE + '?action=sync_absensi', { token: CONFIG.ATTENDANCE_TOKEN, rows: chunk });
    totalSynced += (resp.synced || 0);
  }
  
  Logger.log('✅ Absensi: ' + totalSynced + '/' + rows.length + ' synced');
  try { SpreadsheetApp.getActive().toast('Absensi: ' + totalSynced + ' synced', 'BAS Sync', 3); } catch(e) {}
}


// ═══════════════════════════════════════════════════════
// SYNC GANTI REKENING → dw_rekening_changes
// ═══════════════════════════════════════════════════════
function syncGantiRekening() {
  var sheet = SpreadsheetApp.getActive().getSheetByName(CONFIG.SHEET_GANTI_REK);
  if (!sheet) return;
  
  var data = sheet.getDataRange().getValues();
  // A=Timestamp B=Email C=Nama D=OpsID E=Penempatan F=NoRek G=NamaRek H=NamaBank I=FotoBukuRek
  var rows = [];
  
  for (var i = 1; i < data.length; i++) {
    var opsId = String(data[i][3] || '').trim();
    if (!opsId) continue;
    
    var tglAjuan = '';
    if (data[i][0] instanceof Date) {
      tglAjuan = Utilities.formatDate(data[i][0], 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');
    } else {
      tglAjuan = String(data[i][0] || '').trim();
    }
    if (!tglAjuan) continue;
    
    rows.push({
      ops_id:        opsId,
      email:         String(data[i][1] || '').trim(),
      nama:          String(data[i][2] || '').trim(),
      penempatan:    String(data[i][4] || '').trim(),
      rekening_baru: String(data[i][5] || '').trim(),
      nama_rekening: String(data[i][6] || '').trim(),
      bank_baru:     String(data[i][7] || '').trim(),
      foto_buku_rek: String(data[i][8] || '').trim(),
      tgl_ajuan:     tglAjuan
    });
  }
  
  if (rows.length === 0) return;
  
  var totalSynced = 0;
  var ssName = SpreadsheetApp.getActive().getName();
  for (var i = 0; i < rows.length; i += CONFIG.BATCH_SIZE) {
    var chunk = rows.slice(i, i + CONFIG.BATCH_SIZE);
    var resp = postJSON(CONFIG.API_ATTENDANCE + '?action=sync_gantirek', {
      token: CONFIG.ATTENDANCE_TOKEN,
      rows: chunk,
      source_sheet: ssName
    });
    totalSynced += (resp.synced || 0);
  }
  
  Logger.log('✅ Ganti Rek: ' + totalSynced + '/' + rows.length + ' synced');
  try { SpreadsheetApp.getActive().toast('Ganti Rek: ' + totalSynced + ' synced', 'BAS Sync', 3); } catch(e) {}
}


// ═══════════════════════════════════════════════════════
// ON EDIT — Real-time sync for KARYAWAN
// ═══════════════════════════════════════════════════════
function onEditSync(e) {
  if (!e || !e.range) return;
  var sheet = e.range.getSheet();
  if (sheet.getName() !== CONFIG.SHEET_KARYAWAN) return;
  
  var row = e.range.getRow();
  if (row < CONFIG.START_ROW) return;
  
  var lastCol = Math.max(sheet.getLastColumn(), 11);
  var rowData = sheet.getRange(row, 1, 1, lastCol).getValues()[0];
  var opsId = String(rowData[0] || '').trim();
  if (!opsId) return;
  
  var rekening = String(rowData[7] || '').trim();
  var statusGaji = (rekening && rekening !== '0') ? 'Sudah isi link gaji' : 'Belum isi link gaji';
  sheet.getRange(row, 11).setValue(statusGaji);
  
  var payload = {
    api_key: CONFIG.IMPORTRANGE_KEY,
    ops_id:      opsId,
    nama:        String(rowData[1] || '').trim(),
    nik:         String(rowData[2] || '').trim(),
    status:      String(rowData[3] || 'DAILY WORKER').trim(),
    station:     String(rowData[4] || '').trim(),
    wa:          String(rowData[5] || '').trim(),
    bank:        String(rowData[6] || '').trim(),
    rekening:    rekening,
    atas_nama:   String(rowData[8] || '').trim(),
    join_date:   fmtDate(rowData[9]),
    status_gaji: statusGaji,
    sheet_row:   row
  };
  
  postJSON(CONFIG.API_IMPORTRANGE + '?action=upsert', payload);
}


// ═══════════════════════════════════════════════════════
// STATUS GAJI — Auto-fill kolom K
// ═══════════════════════════════════════════════════════
function updateStatusGaji(sheet) {
  if (!sheet) sheet = SpreadsheetApp.getActive().getSheetByName(CONFIG.SHEET_KARYAWAN);
  if (!sheet) return;
  
  var lastRow = sheet.getLastRow();
  if (lastRow < CONFIG.START_ROW) return;
  
  var totalRows = lastRow - CONFIG.START_ROW + 1;
  var rekeningData = sheet.getRange(CONFIG.START_ROW, 8, totalRows, 1).getValues(); // Col H = Rekening
  
  var statuses = rekeningData.map(function(row) {
    var rek = String(row[0] || '').trim();
    return [(rek && rek !== '0') ? 'Sudah isi link gaji' : 'Belum isi link gaji'];
  });
  
  sheet.getRange(CONFIG.START_ROW, 11, statuses.length, 1).setValues(statuses); // Col K = Status Gaji
}


// ═══════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════

/** POST JSON ke API */
function postJSON(url, data) {
  try {
    var resp = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(data),
      muteHttpExceptions: true,
      followRedirects: true
    });
    var code = resp.getResponseCode();
    var body = resp.getContentText();
    if (code >= 200 && code < 300) return JSON.parse(body);
    Logger.log('❌ API ' + code + ': ' + body.substring(0, 200));
    return { success: false, error: 'HTTP ' + code };
  } catch (e) {
    Logger.log('❌ API error: ' + e.message);
    return { success: false, error: e.message };
  }
}

/** Format date → YYYY-MM-DD */
function fmtDate(val) {
  if (!val) return '';
  if (val instanceof Date) return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var s = String(val).trim();
  var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return m[3] + '-' + m[2].padStart(2,'0') + '-' + m[1].padStart(2,'0');
  return s;
}

/** Parse "Minggu, 01 Februari 2026" → "2026-02-01" */
function parseTanggal(raw) {
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  var bulan = {
    'januari':'01','februari':'02','maret':'03','april':'04',
    'mei':'05','juni':'06','juli':'07','agustus':'08',
    'september':'09','oktober':'10','november':'11','desember':'12'
  };
  var parts = raw.replace(/,/g,'').trim().split(/\s+/);
  if (parts.length >= 3) {
    var yyyy = parts[parts.length - 1];
    var mm = bulan[(parts[parts.length - 2] || '').toLowerCase()];
    var dd = parts[parts.length - 3];
    if (mm && /^\d+$/.test(yyyy) && /^\d+$/.test(dd))
      return yyyy + '-' + mm + '-' + String(dd).padStart(2,'0');
  }
  return '';
}
