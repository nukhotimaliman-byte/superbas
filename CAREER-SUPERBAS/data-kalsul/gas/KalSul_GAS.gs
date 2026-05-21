/**
 * ════════════════════════════════════════════════
 * DATA KALSUL — Google Apps Script
 * 1 Script, 2 Sheet: LINK GAJI + LINK PERGANTIAN REKENING
 * Sync ke: https://super-bas.com/data-kalsul/api/gaji-status.php?action=sync
 * ════════════════════════════════════════════════
 */

const CONFIG = {
  API_URL: 'https://super-bas.com/data-kalsul/api/gaji-status.php?action=sync',
  TOKEN: 'kalsul-sync-2026',
  SHEET_GAJI: 'Sheet1',            // Nama sheet Link Gaji (sesuaikan)
  SHEET_PERGANTIAN: 'Sheet2',      // Nama sheet Pergantian Rek (sesuaikan)
};

/**
 * Menu di spreadsheet
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🔄 Data KalSul')
    .addItem('Sync ke Server', 'syncToServer')
    .addItem('Sync Link Gaji saja', 'syncGajiOnly')
    .addItem('Sync Pergantian Rek saja', 'syncPergantianOnly')
    .addToUi();
}

/**
 * Sync kedua sheet ke server
 */
function syncToServer() {
  const ui = SpreadsheetApp.getUi();
  
  try {
    const gajiData = readSheetGaji();
    const pergantianData = readSheetPergantian();
    
    const payload = {
      token: CONFIG.TOKEN,
      link_gaji: gajiData,
      link_pergantian_rek: pergantianData,
    };
    
    const response = sendToServer(payload);
    
    ui.alert(
      '✅ Sync Berhasil!',
      `Link Gaji: ${gajiData.length} data\n` +
      `Pergantian Rek: ${pergantianData.length} data\n\n` +
      `Server: ${response.inserted || 0} data disimpan`,
      ui.ButtonSet.OK
    );
  } catch (err) {
    ui.alert('❌ Sync Gagal', err.message, ui.ButtonSet.OK);
  }
}

function syncGajiOnly() {
  const ui = SpreadsheetApp.getUi();
  try {
    const data = readSheetGaji();
    const response = sendToServer({ token: CONFIG.TOKEN, link_gaji: data, link_pergantian_rek: [] });
    ui.alert('✅ Sync Link Gaji Berhasil!', `${data.length} data → ${response.inserted || 0} disimpan`, ui.ButtonSet.OK);
  } catch (err) { ui.alert('❌ Gagal', err.message, ui.ButtonSet.OK); }
}

function syncPergantianOnly() {
  const ui = SpreadsheetApp.getUi();
  try {
    const data = readSheetPergantian();
    const response = sendToServer({ token: CONFIG.TOKEN, link_gaji: [], link_pergantian_rek: data });
    ui.alert('✅ Sync Pergantian Rek Berhasil!', `${data.length} data → ${response.inserted || 0} disimpan`, ui.ButtonSet.OK);
  } catch (err) { ui.alert('❌ Gagal', err.message, ui.ButtonSet.OK); }
}

/**
 * Baca Sheet Link Gaji
 * Kolom: Timestamp | Email | NAMA SESUAI KTP | NIK | OPS ID | Lokasi Kerja |
 *        TANGGAL LAHIR | ALAMAT | NO WHATSAPP | MEMBER ID/BPJS | NO REKENING | ATAS NAMA | NAMA BANK
 */
function readSheetGaji() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_GAJI);
  if (!sheet) throw new Error(`Sheet "${CONFIG.SHEET_GAJI}" tidak ditemukan!`);
  
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  
  const header = data[0].map(h => String(h).toLowerCase().trim());
  
  // Auto-detect column indices
  const cols = {
    timestamp: findCol(header, ['timestamp', 'waktu']),
    email: findCol(header, ['email', 'email address']),
    nama_ktp: findCol(header, ['nama sesuai ktp', 'nama', 'nama lengkap', 'name']),
    nik: findCol(header, ['nik', 'no ktp', 'nomor ktp']),
    ops_id: findCol(header, ['ops id', 'ops_id', 'opsid', 'id ops']),
    lokasi_kerja: findCol(header, ['lokasi kerja', 'lokasi', 'penempatan', 'station']),
    tgl_lahir: findCol(header, ['tanggal lahir', 'tgl lahir']),
    alamat: findCol(header, ['alamat', 'alamat sesuai domisili', 'alamat domisili']),
    no_hp: findCol(header, ['no whatsapp', 'no whatshapp', 'no hp', 'whatsapp', 'telepon']),
    no_rek: findCol(header, ['no rekening', 'no rek', 'norek', 'rekening', 'nomor rekening']),
    atas_nama: findCol(header, ['atas nama', 'atas nama rekening', 'nama rekening']),
    bank: findCol(header, ['nama bank', 'bank']),
  };
  
  const result = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const opsId = getVal(row, cols.ops_id);
    if (!opsId) continue;
    
    result.push({
      timestamp: formatTimestamp(getVal(row, cols.timestamp)),
      email: getVal(row, cols.email),
      nama_ktp: getVal(row, cols.nama_ktp),
      nik: getVal(row, cols.nik),
      ops_id: opsId,
      lokasi_kerja: getVal(row, cols.lokasi_kerja),
      tgl_lahir: getVal(row, cols.tgl_lahir),
      alamat: getVal(row, cols.alamat),
      no_hp: cleanPhone(getVal(row, cols.no_hp)),
      no_rek: cleanRek(getVal(row, cols.no_rek)),
      atas_nama: getVal(row, cols.atas_nama),
      bank: getVal(row, cols.bank),
    });
  }
  
  return result;
}

/**
 * Baca Sheet Pergantian Rekening
 * Kolom: Timestamp | Email | Nama | Ops ID | Penempatan |
 *        NOMOR REKENING | NAMA REKENING | NAMA BANK | FOTO
 */
function readSheetPergantian() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_PERGANTIAN);
  if (!sheet) throw new Error(`Sheet "${CONFIG.SHEET_PERGANTIAN}" tidak ditemukan!`);
  
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  
  const header = data[0].map(h => String(h).toLowerCase().trim());
  
  const cols = {
    timestamp: findCol(header, ['timestamp', 'waktu']),
    email: findCol(header, ['email', 'email address']),
    nama: findCol(header, ['nama', 'name']),
    ops_id: findCol(header, ['ops id', 'ops_id', 'opsid']),
    penempatan: findCol(header, ['penempatan', 'lokasi', 'station']),
    no_rek: findCol(header, ['nomor rekening', 'no rekening', 'no rek', 'norek', 'rekening']),
    atas_nama: findCol(header, ['nama rekening', 'atas nama', 'atas nama rekening']),
    bank: findCol(header, ['nama bank', 'bank']),
  };
  
  const result = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const opsId = getVal(row, cols.ops_id);
    if (!opsId) continue;
    
    result.push({
      timestamp: formatTimestamp(getVal(row, cols.timestamp)),
      email: getVal(row, cols.email),
      nama: getVal(row, cols.nama),
      ops_id: opsId,
      penempatan: getVal(row, cols.penempatan),
      no_rek: cleanRek(getVal(row, cols.no_rek)),
      atas_nama: getVal(row, cols.atas_nama),
      bank: getVal(row, cols.bank),
    });
  }
  
  return result;
}

// ── Helpers ──

function findCol(header, keywords) {
  for (const kw of keywords) {
    const idx = header.indexOf(kw);
    if (idx >= 0) return idx;
  }
  return -1;
}

function getVal(row, colIdx) {
  if (colIdx < 0 || colIdx >= row.length) return '';
  const val = row[colIdx];
  if (val instanceof Date) return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  return String(val || '').trim();
}

function cleanRek(val) {
  return String(val || '').replace(/[^0-9]/g, '');
}

function cleanPhone(val) {
  return String(val || '').replace(/[^0-9+]/g, '');
}

function formatTimestamp(val) {
  if (!val) return new Date().toISOString().replace('T', ' ').substring(0, 19);
  if (val instanceof Date) return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  // Try parse
  const d = new Date(val);
  if (!isNaN(d.getTime())) return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  return String(val);
}

function sendToServer(payload) {
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };
  
  const response = UrlFetchApp.fetch(CONFIG.API_URL, options);
  const code = response.getResponseCode();
  const body = response.getContentText();
  
  if (code !== 200) {
    throw new Error(`Server error (${code}): ${body}`);
  }
  
  return JSON.parse(body);
}
