/**
 * ═══════════════════════════════════════════════════════
 * BAS DAILY WORKER — IMPORTRANGE SYNC (KARYAWAN)
 * Google Apps Script: Sync Sheet KARYAWAN → MySQL
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
 *   - Tiap 15 menit: full sync (backup)
 */

// ── Configuration ───────────────────────────────────
const CONFIG = {
  API_URL: 'https://super-bas.com/daily-worker/api/importrange.php',
  API_KEY: 'BAS-DW-IMPORTRANGE-2026',
  
  SHEET_KARYAWAN: 'KARYAWAN',
  SHEET_DATABASE: 'DATABASE',
  
  // Kolom Sheet KARYAWAN (0-indexed)
  // A=OPS_ID, B=NAMA, C=NIK, D=STATUS (DAILY WORKER - VENDOR BAS), E=STATION, F=WA, G=BANK, H=REKENING, I=AN, J=JOIN
  COL: {
    OPS_ID:     0,  // A
    NAMA:       1,  // B
    NIK:        2,  // C
    STATUS:     3,  // D (berisi "DAILY WORKER - VENDOR BAS")
    STATION:    4,  // E (lokasi DC)
    WA:         5,  // F
    BANK:       6,  // G
    REKENING:   7,  // H
    ATAS_NAMA:  8,  // I
    JOIN_DATE:  9,  // J
    STATUS_GAJI:10, // K (VLOOKUP result - akan ditulis oleh script)
  },
  
  // Kolom OPS ID di Sheet DATABASE (0-indexed)
  DB_OPSID_COL: 5,  // Kolom F di Sheet DATABASE
  
  START_ROW: 2,  // Data mulai baris 2 (baris 1 = header)
};


// ═══════════════════════════════════════════════════════
// SETUP (Jalankan sekali)
// ═══════════════════════════════════════════════════════

function setupTriggers() {
  // Hapus trigger lama
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  
  // onEdit trigger
  ScriptApp.newTrigger('onEditSync')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onEdit()
    .create();
  
  // Full sync tiap 15 menit
  ScriptApp.newTrigger('fullSync')
    .timeBased()
    .everyMinutes(15)
    .create();
  
  Logger.log('✅ Triggers installed!');
  SpreadsheetApp.getActive().toast('Triggers berhasil dipasang!', 'BAS Sync', 5);
}


// ═══════════════════════════════════════════════════════
// VLOOKUP STATUS GAJI
// ═══════════════════════════════════════════════════════

/**
 * Cek apakah OPS ID ada di Sheet DATABASE
 * Otomatis isi kolom L di Sheet KARYAWAN
 */
function updateStatusGaji() {
  const ss = SpreadsheetApp.getActive();
  const sheetKaryawan = ss.getSheetByName(CONFIG.SHEET_KARYAWAN);
  
  if (!sheetKaryawan) {
    Logger.log('❌ Sheet KARYAWAN tidak ditemukan!');
    return;
  }
  
  const karLastRow = sheetKaryawan.getLastRow();
  if (karLastRow < CONFIG.START_ROW) return;
  
  // Baca kolom REKENING (H) untuk cek status gaji
  const totalRows = karLastRow - CONFIG.START_ROW + 1;
  const rekeningData = sheetKaryawan.getRange(CONFIG.START_ROW, CONFIG.COL.REKENING + 1, totalRows, 1).getValues();
  
  // Tentukan status berdasarkan rekening
  const statuses = [];
  rekeningData.forEach(row => {
    const rekening = String(row[0] || '').trim();
    if (rekening && rekening !== '' && rekening !== '0') {
      statuses.push(['Sudah isi link gaji']);
    } else {
      statuses.push(['Belum isi link gaji']);
    }
  });
  
  // Tulis status ke kolom K (STATUS_GAJI)
  sheetKaryawan.getRange(CONFIG.START_ROW, CONFIG.COL.STATUS_GAJI + 1, statuses.length, 1).setValues(statuses);
  
  Logger.log('✅ Status gaji updated: ' + statuses.length + ' rows');
}


// ═══════════════════════════════════════════════════════
// SYNC FUNCTIONS
// ═══════════════════════════════════════════════════════

/**
 * Full Sync: Update status gaji lalu kirim semua data ke MySQL
 */
function fullSync() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(CONFIG.SHEET_KARYAWAN);
  if (!sheet) {
    Logger.log('❌ Sheet KARYAWAN not found!');
    return;
  }
  
  // Step 1: Update status gaji dari VLOOKUP
  updateStatusGaji();
  
  // Step 2: Baca data KARYAWAN
  const lastRow = sheet.getLastRow();
  if (lastRow < CONFIG.START_ROW) {
    Logger.log('ℹ️ No data to sync');
    return;
  }
  
  const lastCol = Math.max(sheet.getLastColumn(), 11); // Min 11 kolom (A-K)
  const data = sheet.getRange(CONFIG.START_ROW, 1, lastRow - CONFIG.START_ROW + 1, lastCol).getValues();
  
  // Convert ke row objects
  const rows = [];
  data.forEach((row, index) => {
    const opsId = String(row[CONFIG.COL.OPS_ID] || '').trim();
    if (!opsId) return;
    
    rows.push(buildRowPayload(row, index + CONFIG.START_ROW));
  });
  
  if (rows.length === 0) {
    Logger.log('ℹ️ No valid rows');
    return;
  }
  
  // Step 3: Kirim ke MySQL dalam batch
  const BATCH_SIZE = 100;
  let totalInserted = 0;
  let totalUpdated  = 0;
  
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const response = callAPI('sync', { rows: batch });
    
    if (response.success) {
      totalInserted += response.inserted || 0;
      totalUpdated  += response.updated || 0;
    } else {
      Logger.log('❌ Batch error: ' + response.error);
    }
  }
  
  const msg = 'Sync: ' + totalInserted + ' baru, ' + totalUpdated + ' diupdate dari ' + rows.length + ' karyawan.';
  Logger.log('✅ ' + msg);
  
  try {
    SpreadsheetApp.getActive().toast(msg, 'BAS Sync', 5);
  } catch(e) {}
}

/**
 * onEdit Trigger: Sync baris yang diedit
 */
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
  
  // Tentukan status gaji berdasarkan rekening
  const rekening = String(rowData[CONFIG.COL.REKENING] || '').trim();
  const statusGaji = (rekening && rekening !== '' && rekening !== '0') ? 'Sudah isi link gaji' : 'Belum isi link gaji';
  
  // Update kolom K di sheet
  sheet.getRange(row, CONFIG.COL.STATUS_GAJI + 1).setValue(statusGaji);
  rowData[CONFIG.COL.STATUS_GAJI] = statusGaji;
  
  // Kirim ke MySQL
  const payload = buildRowPayload(rowData, row);
  const response = callAPI('upsert', payload);
  
  if (response.success) {
    Logger.log('✅ Row ' + row + ' (' + opsId + ') ' + response.action);
  } else {
    Logger.log('❌ Row ' + row + ': ' + response.error);
  }
}

// getStatusGajiForOpsId removed — status now determined by rekening field directly


// ═══════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════

/**
 * Build payload dari row data
 */
function buildRowPayload(row, sheetRow) {
  const rekening = String(row[CONFIG.COL.REKENING] || '').trim();
  const bank = String(row[CONFIG.COL.BANK] || '').trim();
  
  // Otomatis tentukan status gaji:
  // Jika rekening sudah terisi = sudah isi link gaji
  let statusGaji = 'Belum isi link gaji';
  if (rekening && rekening !== '' && rekening !== '0') {
    statusGaji = 'Sudah isi link gaji';
  }
  
  return {
    ops_id:      String(row[CONFIG.COL.OPS_ID] || '').trim(),
    nama:        String(row[CONFIG.COL.NAMA] || '').trim(),
    nik:         String(row[CONFIG.COL.NIK] || '').trim(),
    status:      String(row[CONFIG.COL.STATUS] || 'DAILY WORKER').trim(),
    station:     String(row[CONFIG.COL.STATION] || '').trim(),
    wa:          String(row[CONFIG.COL.WA] || '').trim(),
    bank:        bank,
    rekening:    rekening,
    atas_nama:   String(row[CONFIG.COL.ATAS_NAMA] || '').trim(),
    join_date:   formatDate(row[CONFIG.COL.JOIN_DATE]),
    status_gaji: statusGaji,
    sheet_row:   sheetRow
  };
}

/**
 * Format date value from sheet
 */
function formatDate(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy/MM/dd');
  }
  return String(val).trim();
}

/**
 * Call the API
 */
function callAPI(action, data) {
  const url = CONFIG.API_URL + '?action=' + action;
  const payload = Object.assign({}, data, { api_key: CONFIG.API_KEY });
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
    followRedirects: true
  };
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    const code = response.getResponseCode();
    const body = response.getContentText();
    
    if (code >= 200 && code < 300) {
      return JSON.parse(body);
    } else {
      Logger.log('API Error ' + code + ': ' + body);
      return { success: false, error: 'HTTP ' + code + ': ' + body };
    }
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
      case 'getData':
        return jsonOutput(getAllData());
      case 'getStats':
        return jsonOutput(getSheetStats());
      case 'sync':
        fullSync();
        return jsonOutput({ success: true, message: 'Full sync triggered!' });
      default:
        return jsonOutput(getAllData());
    }
  } catch (error) {
    return jsonOutput({ success: false, error: error.message });
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action || 'sync';
    
    if (action === 'sync') {
      fullSync();
      return jsonOutput({ success: true, message: 'Full sync completed!' });
    }
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
  const byStation = {};
  const byStatusGaji = {};
  
  if (allData.data) {
    allData.data.forEach(row => {
      const st = row.station || 'Unknown';
      const sg = row.status_gaji || 'Unknown';
      byStation[st] = (byStation[st] || 0) + 1;
      byStatusGaji[sg] = (byStatusGaji[sg] || 0) + 1;
    });
  }
  
  return {
    success: true,
    stats: {
      total: allData.total || 0,
      by_station: byStation,
      by_status_gaji: byStatusGaji,
      fetched_at: new Date().toISOString()
    }
  };
}

function jsonOutput(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Menu kustom
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🔄 BAS Sync')
    .addItem('Full Sync ke Database', 'fullSync')
    .addItem('Update Status Gaji', 'updateStatusGaji')
    .addItem('Pasang Auto-Sync', 'setupTriggers')
    .addToUi();
}
