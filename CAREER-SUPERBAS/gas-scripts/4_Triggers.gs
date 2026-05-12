// ═══════════════════════════════════════════════════
// BAS SYNC — Triggers.gs
// Auto-trigger setup: sync absensi setiap 15 menit
// ═══════════════════════════════════════════════════

/**
 * Aktifkan auto-sync absensi setiap 15 menit
 * Jalankan fungsi ini SEKALI untuk setup trigger
 */
function setupAutoSync() {
  // Hapus semua trigger lama
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(t) {
    ScriptApp.deleteTrigger(t);
  });
  
  // Buat trigger: sync absensi setiap 15 menit
  ScriptApp.newTrigger('syncAbsensi')
    .timeBased()
    .everyMinutes(15)
    .create();
  
  Logger.log('✅ Auto-sync absensi setiap 15 menit aktif');
  SpreadsheetApp.getActive().toast(
    'Auto-sync AKTIF — Absensi akan sync ke MySQL setiap 15 menit',
    '🟢 BAS Sync',
    10
  );
}

/**
 * Nonaktifkan semua auto-sync
 */
function removeAutoSync() {
  var triggers = ScriptApp.getProjectTriggers();
  var count = triggers.length;
  triggers.forEach(function(t) {
    ScriptApp.deleteTrigger(t);
  });
  
  Logger.log('❌ ' + count + ' trigger(s) dihapus');
  SpreadsheetApp.getActive().toast(
    count + ' auto-sync trigger dinonaktifkan',
    '🔴 BAS Sync',
    5
  );
}

/**
 * Cek status trigger yang aktif
 */
function checkTriggerStatus() {
  var triggers = ScriptApp.getProjectTriggers();
  var info = [];
  
  triggers.forEach(function(t) {
    info.push(t.getHandlerFunction() + ' — every ' + t.getTriggerSource());
  });
  
  var msg = triggers.length === 0
    ? '🔴 Tidak ada auto-sync yang aktif'
    : '🟢 ' + triggers.length + ' trigger aktif:\n' + info.join('\n');
  
  SpreadsheetApp.getUi().alert('Status BAS Sync', msg, SpreadsheetApp.getUi().ButtonSet.OK);
}
