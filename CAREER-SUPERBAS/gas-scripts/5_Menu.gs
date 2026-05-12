// ═══════════════════════════════════════════════════
// BAS SYNC — Menu.gs
// Custom menu di spreadsheet + batch sender helper
// ═══════════════════════════════════════════════════

/**
 * Menu otomatis muncul saat spreadsheet dibuka
 */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('🔄 BAS Sync')
    .addItem('📋 Sync Karyawan → MySQL', 'syncKaryawan')
    .addItem('📅 Sync Absensi → MySQL', 'syncAbsensi')
    .addItem('🔁 Sync Semua', 'syncAll')
    .addSeparator()
    .addItem('🟢 Aktifkan Auto-Sync (15 menit)', 'setupAutoSync')
    .addItem('🔴 Nonaktifkan Auto-Sync', 'removeAutoSync')
    .addSeparator()
    .addItem('ℹ️ Cek Status Sync', 'checkTriggerStatus')
    .addToUi();
}

/**
 * Sync semua data sekaligus
 */
function syncAll() {
  SpreadsheetApp.getActive().toast('Memulai sync semua data...', '🔄 BAS Sync');
  syncKaryawan();
  syncAbsensi();
  SpreadsheetApp.getActive().toast('Sync semua selesai!', '✅ BAS Sync');
}

/**
 * Batch sender — kirim data ke API dalam batch 500 rows
 * @param {string} url - API endpoint URL
 * @param {Array} allRows - All data rows to send
 * @param {string} label - Label for toast/log
 */
function sendBatch(url, allRows, label) {
  var BATCH_SIZE = 500;
  var total = allRows.length;
  var totalSynced = 0;
  var errors = 0;
  
  for (var i = 0; i < total; i += BATCH_SIZE) {
    var chunk = allRows.slice(i, i + BATCH_SIZE);
    var batchNum = Math.ceil((i + 1) / BATCH_SIZE);
    
    try {
      var resp = UrlFetchApp.fetch(url, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({
          token: CONFIG.SYNC_TOKEN,
          rows: chunk
        }),
        muteHttpExceptions: true
      });
      
      var code = resp.getResponseCode();
      var body = resp.getContentText();
      
      if (code === 200) {
        var result = JSON.parse(body);
        totalSynced += (result.synced || 0);
        Logger.log('✅ Batch ' + batchNum + ': ' + (result.synced || 0) + ' synced');
      } else {
        errors++;
        Logger.log('❌ Batch ' + batchNum + ': HTTP ' + code + ' → ' + body);
      }
    } catch (e) {
      errors++;
      Logger.log('❌ Batch ' + batchNum + ' error: ' + e.message);
    }
  }
  
  var msg = '✅ ' + label + ': ' + totalSynced + '/' + total + ' berhasil sync';
  if (errors > 0) msg += ' (' + errors + ' batch error)';
  
  Logger.log(msg);
  SpreadsheetApp.getActive().toast(msg, 'BAS Sync', 8);
}
