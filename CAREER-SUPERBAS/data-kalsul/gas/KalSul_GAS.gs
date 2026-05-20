// ═══════════════════════════════════════════════════
// DATA KALSUL — Google Apps Script
// Sinkronisasi data gaji dari Google Sheets ke API
// ═══════════════════════════════════════════════════

// ── CONFIG ──────────────────────────────────────────
var KALSUL_CONFIG = {
  // API endpoint di super-bas.com
  API_URL: 'https://super-bas.com/data-kalsul/api/gaji-status.php',
  SYNC_TOKEN: 'kalsul-sync-2026',
  
  // Sheet names
  SHEET_GAJI: 'GAJI',
  
  // Column mapping GAJI (0-indexed)
  // A:OPS_ID  B:NAMA  C:STATUS_ISI  D:TANGGAL_ISI  E:NOMINAL
  GAJI_COLS: {
    OPS_ID:      0,
    NAMA:        1,
    STATUS_ISI:  2,  // "sudah" / "belum"
    TANGGAL_ISI: 3,
    NOMINAL:     4
  }
};

// ── MENU ────────────────────────────────────────────
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🔄 KalSul Sync')
    .addItem('Sync Status Gaji ke Server', 'syncGajiStatus')
    .addItem('Ambil Data Karyawan dari Server', 'pullEmployees')
    .addSeparator()
    .addItem('Setup Auto Sync (Setiap Jam)', 'setupAutoSync')
    .addItem('Hapus Auto Sync', 'removeAutoSync')
    .addToUi();
}

// ── SYNC GAJI STATUS ────────────────────────────────
function syncGajiStatus() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(KALSUL_CONFIG.SHEET_GAJI);
  if (!sheet) {
    SpreadsheetApp.getUi().alert('Sheet "' + KALSUL_CONFIG.SHEET_GAJI + '" tidak ditemukan!');
    return;
  }
  
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    SpreadsheetApp.getUi().alert('Sheet kosong atau hanya berisi header.');
    return;
  }
  
  var cols = KALSUL_CONFIG.GAJI_COLS;
  var gajiData = [];
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var opsId = String(row[cols.OPS_ID]).trim();
    if (!opsId) continue;
    
    var statusIsi = String(row[cols.STATUS_ISI]).trim().toLowerCase();
    var filled = (statusIsi === 'sudah' || statusIsi === 'yes' || statusIsi === '1' || statusIsi === 'true');
    
    gajiData.push({
      ops_id: opsId,
      nama: String(row[cols.NAMA]).trim(),
      filled: filled,
      tanggal_isi: row[cols.TANGGAL_ISI] ? Utilities.formatDate(new Date(row[cols.TANGGAL_ISI]), 'Asia/Jakarta', 'yyyy-MM-dd') : '',
      nominal: row[cols.NOMINAL] || 0
    });
  }
  
  // Send to API
  var payload = {
    action: 'sync',
    token: KALSUL_CONFIG.SYNC_TOKEN,
    data: gajiData,
    synced_at: new Date().toISOString()
  };
  
  try {
    var response = UrlFetchApp.fetch(KALSUL_CONFIG.API_URL, {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    
    var result = JSON.parse(response.getContentText());
    
    if (response.getResponseCode() === 200) {
      SpreadsheetApp.getUi().alert(
        '✅ Sync Berhasil!\n\n' +
        'Total: ' + gajiData.length + ' data\n' +
        'Updated: ' + (result.updated || 0) + '\n' +
        'Skipped: ' + (result.skipped || 0)
      );
    } else {
      SpreadsheetApp.getUi().alert('❌ Sync Gagal: ' + (result.error || 'Unknown error'));
    }
  } catch (err) {
    SpreadsheetApp.getUi().alert('❌ Error: ' + err.message);
  }
}

// ── PULL EMPLOYEES ──────────────────────────────────
function pullEmployees() {
  var ui = SpreadsheetApp.getUi();
  var confirm = ui.alert(
    'Ambil Data Karyawan',
    'Ini akan menambah/update sheet GAJI dengan data karyawan terbaru dari server. Lanjutkan?',
    ui.ButtonSet.YES_NO
  );
  
  if (confirm !== ui.Button.YES) return;
  
  try {
    var response = UrlFetchApp.fetch(
      KALSUL_CONFIG.API_URL + '?action=employees&token=' + KALSUL_CONFIG.SYNC_TOKEN,
      { muteHttpExceptions: true }
    );
    
    var result = JSON.parse(response.getContentText());
    
    if (!result.employees || result.employees.length === 0) {
      ui.alert('Tidak ada data karyawan dari server.');
      return;
    }
    
    // Get or create GAJI sheet
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(KALSUL_CONFIG.SHEET_GAJI);
    if (!sheet) {
      sheet = ss.insertSheet(KALSUL_CONFIG.SHEET_GAJI);
    }
    
    // Set headers
    var headers = ['OPS ID', 'NAMA', 'STATUS ISI', 'TANGGAL ISI', 'NOMINAL'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#1a1a2e')
      .setFontColor('#00d4ff');
    
    // Get existing data to preserve status
    var existing = {};
    var existingData = sheet.getDataRange().getValues();
    for (var i = 1; i < existingData.length; i++) {
      var opsId = String(existingData[i][0]).trim();
      if (opsId) {
        existing[opsId] = {
          status: existingData[i][2],
          tanggal: existingData[i][3],
          nominal: existingData[i][4]
        };
      }
    }
    
    // Write data
    var rows = result.employees.map(function(emp) {
      var prev = existing[emp.ops_id] || {};
      return [
        emp.ops_id,
        emp.nama,
        prev.status || 'belum',
        prev.tanggal || '',
        prev.nominal || ''
      ];
    });
    
    if (rows.length > 0) {
      // Clear old data (keep header)
      if (sheet.getLastRow() > 1) {
        sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).clear();
      }
      sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    }
    
    // Auto-resize
    for (var c = 1; c <= headers.length; c++) {
      sheet.autoResizeColumn(c);
    }
    
    ui.alert('✅ Berhasil!\n\n' + rows.length + ' data karyawan berhasil dimuat.');
    
  } catch (err) {
    ui.alert('❌ Error: ' + err.message);
  }
}

// ── AUTO SYNC TRIGGER ───────────────────────────────
function setupAutoSync() {
  // Remove existing triggers first
  removeAutoSync();
  
  // Create hourly trigger
  ScriptApp.newTrigger('autoSyncGaji')
    .timeBased()
    .everyHours(1)
    .create();
  
  SpreadsheetApp.getUi().alert('✅ Auto sync dijadwalkan setiap 1 jam.');
}

function removeAutoSync() {
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'autoSyncGaji') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

function autoSyncGaji() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(KALSUL_CONFIG.SHEET_GAJI);
  if (!sheet) return;
  
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return;
  
  var cols = KALSUL_CONFIG.GAJI_COLS;
  var gajiData = [];
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var opsId = String(row[cols.OPS_ID]).trim();
    if (!opsId) continue;
    
    var statusIsi = String(row[cols.STATUS_ISI]).trim().toLowerCase();
    var filled = (statusIsi === 'sudah' || statusIsi === 'yes' || statusIsi === '1' || statusIsi === 'true');
    
    gajiData.push({
      ops_id: opsId,
      filled: filled
    });
  }
  
  try {
    UrlFetchApp.fetch(KALSUL_CONFIG.API_URL, {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify({
        action: 'sync',
        token: KALSUL_CONFIG.SYNC_TOKEN,
        data: gajiData,
        synced_at: new Date().toISOString()
      }),
      muteHttpExceptions: true
    });
  } catch (err) {
    Logger.log('KalSul auto sync error: ' + err.message);
  }
}
