/**
 * ═══════════════════════════════════════════════════════
 * BAS DAILY WORKER — IMPORTRANGE SYNC (KARYAWAN + ABSENSI)
 * Google Apps Script: Sync Sheet KARYAWAN → MySQL + ABSENSI → MySQL
 * ═══════════════════════════════════════════════════════
 * 
 * SETUP:
 * 1. Buka Spreadsheet WORKFLOW SQL
 * 2. Menu: Ekstensi → Apps Script
 * 3. Copy-paste seluruh kode ini
 * 4. Jalankan `setupTriggers()` sekali
 * 5. Jalankan `fullSync()` untuk sync pertama kali
 * 
 * Auto-sync:
 *   - onEdit: sync baris yang diedit (real-time)
 *   - Tiap 15 menit: full sync karyawan + absensi
 */

// ── Configuration ───────────────────────────────────
const CONFIG = {
  API_URL: 'https://super-bas.com/daily-worker/api/importrange.php',
  API_KEY: 'BAS-DW-IMPORTRANGE-2026',
  
  // Attendance API (separate endpoint)
  ATTENDANCE_URL: 'https://super-bas.com/daily-worker/api/attendance.php',
  ATTENDANCE_TOKEN: 'bas-sync-2026',
  
  SHEET_KARYAWAN: 'KARYAWAN',
  SHEET_DATABASE: 'DATABASE',
  SHEET_ABSENSI: 'ABSENSI',
  
  // Kolom Sheet KARYAWAN (0-indexed)
  // A=OPS_ID, B=NAMA, C=NIK, D=STATUS, E=STATION, F=WA, G=BANK, H=REKENING, I=AN, J=JOIN
  COL: {
    OPS_ID:     0,
    NAMA:       1,
    NIK:        2,
    STATUS:     3,
    STATION:    4,
    WA:         5,
    BANK:       6,
    REKENING:   7,
    ATAS_NAMA:  8,
    JOIN_DATE:  9,
    STATUS_GAJI:10,
  },
  
  // Kolom Sheet ABSENSI (0-indexed)
  // A=OPSID, B=NAMA, C=STATUS, D=STATION, E=SHIFTING, F=DATE
  ABS_COL: {
    OPS_ID:   0,
    NAMA:     1,
    STATUS:   2,
    STATION:  3,
    SHIFTING: 4,
    DATE:     5
  },
  
  DB_OPSID_COL: 5,
  START_ROW: 2,
};


// ═══════════════════════════════════════════════════════
// SETUP (Jalankan sekali)
// ═══════════════════════════════════════════════════════

function setupTriggers() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  
  // onEdit trigger
  ScriptApp.newTrigger('onEditSync')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onEdit()
    .create();
  
  // Full sync tiap 15 menit (karyawan + absensi)
  ScriptApp.newTrigger('fullSyncAll')
    .timeBased()
    .everyMinutes(15)
    .create();
  
  Logger.log('✅ Triggers installed!');
  SpreadsheetApp.getActive().toast('Auto-sync aktif: Karyawan + Absensi setiap 15 menit', 'BAS Sync ✅', 10);
}

function removeTriggers() {
  var count = ScriptApp.getProjectTriggers().length;
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  SpreadsheetApp.getActive().toast(count + ' trigger dihapus', 'BAS Sync 🔴', 5);
}


// ═══════════════════════════════════════════════════════
// VLOOKUP STATUS GAJI
// ═══════════════════════════════════════════════════════

function updateStatusGaji() {
  const ss = SpreadsheetApp.getActive();
  const sheetKaryawan = ss.getSheetByName(CONFIG.SHEET_KARYAWAN);
  if (!sheetKaryawan) { Logger.log('❌ Sheet KARYAWAN tidak ditemukan!'); return; }
  
  const karLastRow = sheetKaryawan.getLastRow();
  if (karLastRow < CONFIG.START_ROW) return;
  
  const totalRows = karLastRow - CONFIG.START_ROW + 1;
  const rekeningData = sheetKaryawan.getRange(CONFIG.START_ROW, CONFIG.COL.REKENING + 1, totalRows, 1).getValues();
  
  const statuses = [];
  rekeningData.forEach(row => {
    const rekening = String(row[0] || '').trim();
    statuses.push([(rekening && rekening !== '' && rekening !== '0') ? 'Sudah isi link gaji' : 'Belum isi link gaji']);
  });
  
  sheetKaryawan.getRange(CONFIG.START_ROW, CONFIG.COL.STATUS_GAJI + 1, statuses.length, 1).setValues(statuses);
  Logger.log('✅ Status gaji updated: ' + statuses.length + ' rows');
}


// ═══════════════════════════════════════════════════════
// SYNC KARYAWAN
// ═══════════════════════════════════════════════════════

function fullSync() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(CONFIG.SHEET_KARYAWAN);
  if (!sheet) { Logger.log('❌ Sheet KARYAWAN not found!'); return; }
  
  updateStatusGaji();
  
  const lastRow = sheet.getLastRow();
  if (lastRow < CONFIG.START_ROW) { Logger.log('ℹ️ No data to sync'); return; }
  
  const lastCol = Math.max(sheet.getLastColumn(), 11);
  const data = sheet.getRange(CONFIG.START_ROW, 1, lastRow - CONFIG.START_ROW + 1, lastCol).getValues();
  
  const rows = [];
  data.forEach((row, index) => {
    const opsId = String(row[CONFIG.COL.OPS_ID] || '').trim();
    if (!opsId) return;
    rows.push(buildRowPayload(row, index + CONFIG.START_ROW));
  });
  
  if (rows.length === 0) { Logger.log('ℹ️ No valid rows'); return; }
  
  const BATCH_SIZE = 100;
  let totalInserted = 0, totalUpdated = 0;
  
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const response = callAPI('sync', { rows: batch });
    if (response.success) {
      totalInserted += response.inserted || 0;
      totalUpdated += response.updated || 0;
    } else {
      Logger.log('❌ Batch error: ' + response.error);
    }
  }
  
  const msg = 'Karyawan: ' + totalInserted + ' baru, ' + totalUpdated + ' update (' + rows.length + ' total)';
  Logger.log('✅ ' + msg);
  try { SpreadsheetApp.getActive().toast(msg, 'BAS Sync', 5); } catch(e) {}
}


// ═══════════════════════════════════════════════════════
// SYNC ABSENSI (NEW!)
// ═══════════════════════════════════════════════════════

function syncAbsensi() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(CONFIG.SHEET_ABSENSI);
  if (!sheet) { Logger.log('❌ Sheet ABSENSI tidak ditemukan'); return; }
  
  const lastRow = sheet.getLastRow();
  if (lastRow < CONFIG.START_ROW) { Logger.log('ℹ️ No absensi data'); return; }
  
  const data = sheet.getDataRange().getValues();
  const cols = CONFIG.ABS_COL;
  const rows = [];
  
  for (var i = 1; i < data.length; i++) {
    var opsId = String(data[i][cols.OPS_ID] || '').trim();
    if (!opsId) continue;
    
    var dateVal = data[i][cols.DATE];
    var dateStr = '';
    
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
  
  if (rows.length === 0) { Logger.log('⚠️ No absensi rows'); return; }
  
  // Send in batches of 500
  var BATCH = 500;
  var totalSynced = 0;
  
  for (var i = 0; i < rows.length; i += BATCH) {
    var chunk = rows.slice(i, i + BATCH);
    try {
      var resp = UrlFetchApp.fetch(CONFIG.ATTENDANCE_URL + '?action=sync_absensi', {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({ token: CONFIG.ATTENDANCE_TOKEN, rows: chunk }),
        muteHttpExceptions: true
      });
      var result = JSON.parse(resp.getContentText());
      totalSynced += (result.synced || 0);
      Logger.log('✅ Absensi batch: ' + (result.synced || 0) + ' synced');
    } catch (e) {
      Logger.log('❌ Absensi batch error: ' + e.message);
    }
  }
  
  var msg = 'Absensi: ' + totalSynced + '/' + rows.length + ' berhasil sync';
  Logger.log('✅ ' + msg);
  try { SpreadsheetApp.getActive().toast(msg, 'BAS Sync', 5); } catch(e) {}
}

/**
 * Parse "Minggu, 01 Februari 2026" → "2026-02-01"
 */
function parseTanggalIndonesia(raw) {
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  
  var bulan = {
    'januari':'01','februari':'02','maret':'03','april':'04',
    'mei':'05','juni':'06','juli':'07','agustus':'08',
    'september':'09','oktober':'10','november':'11','desember':'12'
  };
  
  var clean = raw.replace(/,/g, '').trim();
  var parts = clean.split(/\s+/);
  
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


// ═══════════════════════════════════════════════════════
// FULL SYNC ALL (Karyawan + Absensi) — Triggered every 15 min
// ═══════════════════════════════════════════════════════

function fullSyncAll() {
  Logger.log('🔄 Starting full sync...');
  fullSync();       // Sync karyawan
  syncAbsensi();    // Sync absensi
  Logger.log('✅ Full sync complete!');
}


// ═══════════════════════════════════════════════════════
// ON EDIT (Real-time sync for KARYAWAN)
// ═══════════════════════════════════════════════════════

function onEditSync(e) {
  if (!e || !e.range) return;
  
  const sheet = e.range.getSheet();
  if (sheet.getName() !== CONFIG.SHEET_KARYAWAN) return;
  
  const row = e.range.getRow();
  if (row < CONFIG.START_ROW) return;
  
  const lastCol = Math.max(sheet.getLastColumn(), 11);
  const rowData = sheet.getRange(row, 1, 1, lastCol).getValues()[0];
  
  const opsId = String(rowData[CONFIG.COL.OPS_ID] || '').trim();
  if (!opsId) return;
  
  const rekening = String(rowData[CONFIG.COL.REKENING] || '').trim();
  const statusGaji = (rekening && rekening !== '' && rekening !== '0') ? 'Sudah isi link gaji' : 'Belum isi link gaji';
  
  sheet.getRange(row, CONFIG.COL.STATUS_GAJI + 1).setValue(statusGaji);
  rowData[CONFIG.COL.STATUS_GAJI] = statusGaji;
  
  const payload = buildRowPayload(rowData, row);
  const response = callAPI('upsert', payload);
  
  if (response.success) {
    Logger.log('✅ Row ' + row + ' (' + opsId + ') ' + response.action);
  } else {
    Logger.log('❌ Row ' + row + ': ' + response.error);
  }
}


// ═══════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════

function buildRowPayload(row, sheetRow) {
  const rekening = String(row[CONFIG.COL.REKENING] || '').trim();
  let statusGaji = 'Belum isi link gaji';
  if (rekening && rekening !== '' && rekening !== '0') statusGaji = 'Sudah isi link gaji';
  
  return {
    ops_id:      String(row[CONFIG.COL.OPS_ID] || '').trim(),
    nama:        String(row[CONFIG.COL.NAMA] || '').trim(),
    nik:         String(row[CONFIG.COL.NIK] || '').trim(),
    status:      String(row[CONFIG.COL.STATUS] || 'DAILY WORKER').trim(),
    station:     String(row[CONFIG.COL.STATION] || '').trim(),
    wa:          String(row[CONFIG.COL.WA] || '').trim(),
    bank:        String(row[CONFIG.COL.BANK] || '').trim(),
    rekening:    rekening,
    atas_nama:   String(row[CONFIG.COL.ATAS_NAMA] || '').trim(),
    join_date:   formatDate(row[CONFIG.COL.JOIN_DATE]),
    status_gaji: statusGaji,
    sheet_row:   sheetRow
  };
}

function formatDate(val) {
  if (!val) return '';
  if (val instanceof Date) return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy/MM/dd');
  return String(val).trim();
}

function callAPI(action, data) {
  const url = CONFIG.API_URL + '?action=' + action;
  const payload = Object.assign({}, data, { api_key: CONFIG.API_KEY });
  
  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
      followRedirects: true
    });
    const code = response.getResponseCode();
    const body = response.getContentText();
    
    if (code >= 200 && code < 300) return JSON.parse(body);
    Logger.log('API Error ' + code + ': ' + body);
    return { success: false, error: 'HTTP ' + code };
  } catch (e) {
    Logger.log('API Exception: ' + e.message);
    return { success: false, error: e.message };
  }
}


// ═══════════════════════════════════════════════════════
// WEB APP (doGet/doPost)
// ═══════════════════════════════════════════════════════

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'getData';
  try {
    switch (action) {
      case 'getData': return jsonOutput(getAllData());
      case 'getStats': return jsonOutput(getSheetStats());
      case 'sync': fullSyncAll(); return jsonOutput({ success: true, message: 'Full sync triggered!' });
      default: return jsonOutput(getAllData());
    }
  } catch (error) {
    return jsonOutput({ success: false, error: error.message });
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.action === 'sync') { fullSyncAll(); return jsonOutput({ success: true }); }
    return jsonOutput({ success: false, error: 'Unknown action' });
  } catch (error) {
    return jsonOutput({ success: false, error: error.message });
  }
}

function getAllData() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(CONFIG.SHEET_KARYAWAN);
  if (!sheet) return { success: false, error: 'Sheet not found', data: [] };
  const lastRow = sheet.getLastRow();
  if (lastRow < CONFIG.START_ROW) return { success: true, data: [], total: 0 };
  const lastCol = Math.max(sheet.getLastColumn(), 11);
  const data = sheet.getRange(CONFIG.START_ROW, 1, lastRow - CONFIG.START_ROW + 1, lastCol).getValues();
  const rows = [];
  data.forEach((row, index) => {
    const opsId = String(row[CONFIG.COL.OPS_ID] || '').trim();
    if (!opsId) return;
    rows.push(buildRowPayload(row, index + CONFIG.START_ROW));
  });
  return { success: true, data: rows, total: rows.length, fetched_at: new Date().toISOString() };
}

function getSheetStats() {
  const allData = getAllData();
  const byStation = {}, byStatusGaji = {};
  if (allData.data) {
    allData.data.forEach(row => {
      byStation[row.station || 'Unknown'] = (byStation[row.station || 'Unknown'] || 0) + 1;
      byStatusGaji[row.status_gaji || 'Unknown'] = (byStatusGaji[row.status_gaji || 'Unknown'] || 0) + 1;
    });
  }
  return { success: true, stats: { total: allData.total || 0, by_station: byStation, by_status_gaji: byStatusGaji } };
}

function jsonOutput(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}


// ═══════════════════════════════════════════════════════
// CUSTOM MENU
// ═══════════════════════════════════════════════════════

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🔄 BAS Sync')
    .addItem('📋 Sync Karyawan → MySQL', 'fullSync')
    .addItem('📅 Sync Absensi → MySQL', 'syncAbsensi')
    .addItem('🔁 Sync Semua (Karyawan + Absensi)', 'fullSyncAll')
    .addSeparator()
    .addItem('Update Status Gaji', 'updateStatusGaji')
    .addSeparator()
    .addItem('🟢 Pasang Auto-Sync (15 menit)', 'setupTriggers')
    .addItem('🔴 Hapus Auto-Sync', 'removeTriggers')
    .addToUi();
}
