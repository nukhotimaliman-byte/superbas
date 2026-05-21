/**
 * ════════════════════════════════════════════════
 * DATA KALSUL — Google Apps Script v3
 * SMART SYNC: Hanya kirim data BARU (belum ✅)
 * Auto-refresh setiap 5 menit
 * ════════════════════════════════════════════════
 */

var CONFIG = {
  API_URL: 'https://super-bas.com/data-kalsul/api/gaji-status.php?action=sync',
  TOKEN: 'kalsul-sync-2026',
  SHEET_GAJI: 'Sheet1',
  SHEET_PERGANTIAN: 'Sheet2',
  SYNCED_MARK: '✅',
};

// ═══ MENU ═══
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🔄 Data KalSul')
    .addItem('🔄 Sync Data Baru', 'syncNewData')
    .addItem('⏰ Aktifkan Auto-Sync (5 menit)', 'setupAutoSync')
    .addItem('⛔ Matikan Auto-Sync', 'removeAutoSync')
    .addItem('📊 Status Sync', 'showSyncStatus')
    .addToUi();
}

// ═══ WEB APP ═══
function doGet(e) {
  try {
    var result = syncNewDataSilent();
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false, error: err.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) { return doGet(e); }

// ═══ SYNC DATA BARU ═══
function syncNewData() {
  var ui = SpreadsheetApp.getUi();
  try {
    var result = syncNewDataSilent();
    ui.alert('✅ Sync Selesai!',
      'Link Gaji: ' + result.gaji_synced + ' data baru\n' +
      'Pergantian Rek: ' + result.pergantian_synced + ' data baru\n\n' +
      'Server: ' + result.server_inserted + ' data disimpan',
      ui.ButtonSet.OK);
  } catch (err) {
    ui.alert('❌ Sync Gagal', err.message, ui.ButtonSet.OK);
  }
}

// ═══ CORE SYNC (silent, untuk auto-trigger & web) ═══
function syncNewDataSilent() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Read new data from both sheets
  var gajiResult = readNewRows(ss, CONFIG.SHEET_GAJI, 'gaji');
  var pergResult = readNewRows(ss, CONFIG.SHEET_PERGANTIAN, 'pergantian');
  
  var totalNew = gajiResult.data.length + pergResult.data.length;
  
  if (totalNew === 0) {
    return { success: true, gaji_synced: 0, pergantian_synced: 0, server_inserted: 0, message: 'Tidak ada data baru' };
  }
  
  // Send to server
  var payload = {
    token: CONFIG.TOKEN,
    link_gaji: gajiResult.data,
    link_pergantian_rek: pergResult.data,
  };
  
  var response = sendToServer(payload);
  
  // Mark as synced
  if (gajiResult.data.length > 0) {
    markSynced(ss, CONFIG.SHEET_GAJI, gajiResult.syncCol, gajiResult.rows);
  }
  if (pergResult.data.length > 0) {
    markSynced(ss, CONFIG.SHEET_PERGANTIAN, pergResult.syncCol, pergResult.rows);
  }
  
  return {
    success: true,
    gaji_synced: gajiResult.data.length,
    pergantian_synced: pergResult.data.length,
    server_inserted: response.inserted || 0,
  };
}

// ═══ BACA DATA BARU (dari bawah, yang belum ✅) ═══
function readNewRows(ss, sheetName, type) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { data: [], syncCol: -1, rows: [] };
  
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2) return { data: [], syncCol: -1, rows: [] };
  
  // Get headers
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var headerLower = headers.map(function(h) { return String(h).toLowerCase().trim(); });
  
  // Find or create SYNCED column
  var syncCol = headerLower.indexOf('synced');
  if (syncCol === -1) {
    syncCol = lastCol; // Next column
    sheet.getRange(1, syncCol + 1).setValue('SYNCED');
    sheet.getRange(1, syncCol + 1).setFontWeight('bold');
    sheet.getRange(1, syncCol + 1).setBackground('#4a86e8');
    sheet.getRange(1, syncCol + 1).setFontColor('#ffffff');
    lastCol = syncCol + 1;
  }
  
  // Read ALL data
  var allData = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  
  // Collect rows WITHOUT ✅ — read from BOTTOM
  var newData = [];
  var newRowIndices = [];
  
  for (var i = allData.length - 1; i >= 0; i--) {
    var row = allData[i];
    var syncVal = String(row[syncCol] || '').trim();
    
    if (syncVal.indexOf('✅') !== -1) continue; // Already synced
    
    var parsed = parseRow(row, headerLower, type);
    if (parsed) {
      newData.push(parsed);
      newRowIndices.push(i + 2); // +2 because row 1 = header, array is 0-indexed
    }
  }
  
  return { data: newData, syncCol: syncCol, rows: newRowIndices };
}

// ═══ PARSE ROW ═══
function parseRow(row, header, type) {
  if (type === 'gaji') {
    var opsId = getColVal(row, header, ['ops id', 'ops_id', 'opsid']);
    if (!opsId) return null;
    
    return {
      ops_id: opsId,
      timestamp: formatTS(getColVal(row, header, ['timestamp', 'waktu'])),
      email: getColVal(row, header, ['email', 'email address']),
      nama_ktp: getColVal(row, header, ['nama sesuai ktp', 'nama', 'nama lengkap']),
      nik: getColVal(row, header, ['nik', 'no ktp']),
      lokasi_kerja: getColVal(row, header, ['lokasi kerja', 'lokasi', 'penempatan']),
      tgl_lahir: getColVal(row, header, ['tanggal lahir', 'tgl lahir']),
      alamat: getColVal(row, header, ['alamat', 'alamat sesuai domisili']),
      no_hp: cleanPhone(getColVal(row, header, ['no whatsapp', 'no whatshapp', 'no hp', 'whatsapp'])),
      no_rek: cleanRek(getColVal(row, header, ['no rekening', 'no rek', 'norek', 'rekening', 'nomor rekening'])),
      atas_nama: getColVal(row, header, ['atas nama', 'atas nama rekening', 'nama rekening']),
      bank: getColVal(row, header, ['nama bank', 'bank']),
    };
  } else {
    var opsId2 = getColVal(row, header, ['ops id', 'ops_id', 'opsid']);
    if (!opsId2) return null;
    
    return {
      ops_id: opsId2,
      timestamp: formatTS(getColVal(row, header, ['timestamp', 'waktu'])),
      email: getColVal(row, header, ['email', 'email address']),
      nama: getColVal(row, header, ['nama', 'name']),
      penempatan: getColVal(row, header, ['penempatan', 'lokasi', 'station']),
      no_rek: cleanRek(getColVal(row, header, ['nomor rekening', 'no rekening', 'no rek', 'norek'])),
      atas_nama: getColVal(row, header, ['nama rekening', 'atas nama']),
      bank: getColVal(row, header, ['nama bank', 'bank']),
    };
  }
}

// ═══ TANDAI ✅ DI SHEET ═══
function markSynced(ss, sheetName, syncCol, rowIndices) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;
  
  var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
  
  for (var i = 0; i < rowIndices.length; i++) {
    var cell = sheet.getRange(rowIndices[i], syncCol + 1);
    cell.setValue('✅ ' + now);
    cell.setBackground('#d9ead3'); // Light green
  }
  
  SpreadsheetApp.flush();
}

// ═══ AUTO-SYNC TRIGGER ═══
function setupAutoSync() {
  // Remove old triggers
  removeAutoSync();
  
  // Create new: every 5 minutes
  ScriptApp.newTrigger('autoSync')
    .timeBased()
    .everyMinutes(5)
    .create();
  
  SpreadsheetApp.getUi().alert('✅ Auto-Sync Aktif!',
    'Data baru akan otomatis di-sync ke server setiap 5 menit.\n\n' +
    'Untuk mematikan: Menu 🔄 Data KalSul → Matikan Auto-Sync',
    SpreadsheetApp.getUi().ButtonSet.OK);
}

function removeAutoSync() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'autoSync') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  
  try {
    SpreadsheetApp.getUi().alert('⛔ Auto-Sync Dimatikan', 'Trigger auto-sync telah dihapus.', SpreadsheetApp.getUi().ButtonSet.OK);
  } catch(e) {}
}

function autoSync() {
  try {
    syncNewDataSilent();
  } catch (err) {
    Logger.log('Auto-sync error: ' + err.message);
  }
}

// ═══ STATUS ═══
function showSyncStatus() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  
  var sheet1 = ss.getSheetByName(CONFIG.SHEET_GAJI);
  var sheet2 = ss.getSheetByName(CONFIG.SHEET_PERGANTIAN);
  
  var total1 = sheet1 ? Math.max(0, sheet1.getLastRow() - 1) : 0;
  var total2 = sheet2 ? Math.max(0, sheet2.getLastRow() - 1) : 0;
  
  var synced1 = countSynced(ss, CONFIG.SHEET_GAJI);
  var synced2 = countSynced(ss, CONFIG.SHEET_PERGANTIAN);
  
  // Check auto-sync
  var triggers = ScriptApp.getProjectTriggers();
  var autoActive = false;
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'autoSync') autoActive = true;
  }
  
  ui.alert('📊 Status Sync',
    '── Link Gaji ──\n' +
    'Total: ' + total1 + ' baris\n' +
    'Sudah sync: ' + synced1 + ' ✅\n' +
    'Belum sync: ' + (total1 - synced1) + '\n\n' +
    '── Pergantian Rek ──\n' +
    'Total: ' + total2 + ' baris\n' +
    'Sudah sync: ' + synced2 + ' ✅\n' +
    'Belum sync: ' + (total2 - synced2) + '\n\n' +
    '── Auto-Sync ──\n' +
    'Status: ' + (autoActive ? '✅ AKTIF (setiap 5 menit)' : '⛔ TIDAK AKTIF'),
    ui.ButtonSet.OK);
}

function countSynced(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return 0;
  
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var headerLower = headers.map(function(h) { return String(h).toLowerCase().trim(); });
  var syncCol = headerLower.indexOf('synced');
  if (syncCol === -1) return 0;
  
  var vals = sheet.getRange(2, syncCol + 1, sheet.getLastRow() - 1, 1).getValues();
  var count = 0;
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][0]).indexOf('✅') !== -1) count++;
  }
  return count;
}

// ═══ HELPERS ═══
function getColVal(row, header, keywords) {
  for (var k = 0; k < keywords.length; k++) {
    var idx = header.indexOf(keywords[k]);
    if (idx >= 0 && idx < row.length) {
      var val = row[idx];
      if (val instanceof Date) return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
      return String(val || '').trim();
    }
  }
  return '';
}

function cleanRek(val) { return String(val || '').replace(/[^0-9]/g, ''); }
function cleanPhone(val) { return String(val || '').replace(/[^0-9+]/g, ''); }

function formatTS(val) {
  if (!val) return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  if (val instanceof Date) return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  try {
    var d = new Date(val);
    if (!isNaN(d.getTime())) return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  } catch(e) {}
  return String(val);
}

function sendToServer(payload) {
  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
    validateHttpsCertificates: false,
  };
  
  var response = UrlFetchApp.fetch(CONFIG.API_URL, options);
  var code = response.getResponseCode();
  var body = response.getContentText();
  
  if (code !== 200) {
    throw new Error('Server error (' + code + '): ' + body.substring(0, 300));
  }
  
  return JSON.parse(body);
}
