var API_VERSION = 'v10-compat-2026-04-05';

var SHEET_SCHEMAS = {
  employees: {
    name: 'Data',
    aliases: ['Data', 'DataKaryawan', 'Karyawan', 'Employees'],
    headers: ['ops', 'nik', 'nama', 'jabatan', 'status', 'wa', 'station', 'rekening', 'atasNama', 'bank', 'joinDate', 'shift', 'divisi', 'email', 'alamat', 'createdAt']
  },
  attendance: {
    name: 'Absensi',
    aliases: ['Absensi', 'Attendance', 'Presensi'],
    headers: ['ops', 'nama', 'tanggal', 'station', 'status', 'shift', 'checkIn', 'checkOut', 'catatan']
  },
  payslips: {
    name: 'Gaji',
    aliases: ['Gaji', 'SlipGaji', 'Payslips', 'Payroll'],
    headers: ['ops', 'nama', 'periode', 'hk', 'gaji', 'rapel', 'claim', 'potPribadi', 'asuransi', 'totalDibayarkan', 'status', 'tanggalProses', 'nomorRekening', 'atasNama', 'namaBank']
  },
  owners: {
    name: 'Owner',
    aliases: ['Owner', 'DataOwner', 'Admins', 'Admin'],
    headers: ['ops', 'nik', 'nama', 'status', 'station', 'wa']
  },
  systemMessage: {
    name: 'SystemMessage',
    aliases: ['SystemMessage', 'PesanAdmin', 'Message'],
    headers: ['ID', 'Active', 'Type', 'Title', 'Content', 'Date']
  },
  stations: {
    name: 'DataValidasi',
    aliases: ['DataValidasi', 'Stations', 'Station', 'Lokasi', 'Locations'],
    headers: ['Station', 'Group']
  }
};

function doGet(e) {
  if (e && e.parameter && e.parameter.action) {
    try {
      return routeAction_(String(e.parameter.action), e.parameter || {});
    } catch (error) {
      return errorResponse_('Server Error: ' + error.toString());
    }
  }

  return jsonResponse_({
    status: 'ONLINE',
    version: API_VERSION,
    timestamp: new Date().toISOString(),
    spreadsheetName: getSpreadsheet_().getName()
  });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return errorResponse_('Tidak ada data yang dikirim.');
    }

    var data = parseJson_(e.postData.contents);
    if (!data) {
      return errorResponse_('Body request bukan JSON yang valid.');
    }

    return routeAction_(String(data.action || ''), data);
  } catch (error) {
    return errorResponse_('Server Error: ' + error.toString());
  }
}

function routeAction_(action, data) {
  switch (action) {
    case 'getAllEmployees':
      return jsonResponse_(getSheetObjectsByPurpose_('employees'));
    case 'getAllAttendance':
      return jsonResponse_(getSheetObjectsByPurpose_('attendance'));
    case 'getAllPayslips':
      return jsonResponse_(getSheetObjectsByPurpose_('payslips'));
    case 'getAttendance':
      return jsonResponse_(getRowsByOps_('attendance', data.opsId || data.opsid || data.ops));
    case 'getPayslips':
      return jsonResponse_(getRowsByOps_('payslips', data.opsId || data.opsid || data.ops));
    case 'getAllData':
      return jsonResponse_(getAllData_());
    case 'login':
      return loginKaryawan_(data.opsId || data.opsid || data.ops, data.nik);
    case 'loginOwner':
      return loginOwner_(data.opsId || data.opsid || data.ops, data.nik);
    case 'registerEmployee':
      return registerEmployee_(data);
    case 'getStations':
      return jsonResponse_(getStationsList_());
    case 'getSystemMessage':
      return jsonResponse_(getSystemMessage_());
    case 'diagnose':
      return jsonResponse_(diagnoseSheets_());
    case 'discoverSheets':
      return jsonResponse_(discoverSheets_());
    case 'setup':
      return jsonResponse_(setupSheets_());
    default:
      return errorResponse_('Action tidak dikenal: ' + action);
  }
}

function getAllData_() {
  var employeeMeta = resolveSheetByPurpose_('employees');
  var attendanceMeta = resolveSheetByPurpose_('attendance');
  var payslipMeta = resolveSheetByPurpose_('payslips');

  return {
    spreadsheetName: getSpreadsheet_().getName(),
    spreadsheetUrl: getSpreadsheet_().getUrl(),
    employees: employeeMeta.sheet ? sheetToObjects_(employeeMeta.sheet) : [],
    attendance: attendanceMeta.sheet ? sheetToObjects_(attendanceMeta.sheet) : [],
    payslips: payslipMeta.sheet ? sheetToObjects_(payslipMeta.sheet) : [],
    mappings: {
      employees: employeeMeta.sheet ? buildMappingInfo_(employeeMeta) : null,
      attendance: attendanceMeta.sheet ? buildMappingInfo_(attendanceMeta) : null,
      payslips: payslipMeta.sheet ? buildMappingInfo_(payslipMeta) : null
    }
  };
}

function getSheetObjectsByPurpose_(purpose) {
  var meta = resolveSheetByPurpose_(purpose);
  if (!meta.sheet) {
    throw new Error("Sheet untuk purpose '" + purpose + "' tidak ditemukan.");
  }
  return sheetToObjects_(meta.sheet);
}

function getRowsByOps_(purpose, opsId) {
  if (!opsId) {
    throw new Error('OPS ID tidak diberikan.');
  }

  var meta = resolveSheetByPurpose_(purpose);
  if (!meta.sheet) {
    throw new Error("Sheet untuk purpose '" + purpose + "' tidak ditemukan.");
  }

  var rows = sheetToObjects_(meta.sheet);
  var normalizedTarget = normalizeOpsId_(opsId);

  return rows.filter(function (row) {
    var rowOps = pickValueByAliases_(row, ['ops', 'ops id', 'opsid', 'ops_id', 'id ops', 'idops']);
    return normalizeOpsId_(rowOps) === normalizedTarget;
  });
}

function loginKaryawan_(opsId, nik) {
  if (!opsId || !nik) {
    return errorResponse_('OPS ID atau NIK kosong.');
  }

  var meta = resolveSheetByPurpose_('employees');
  if (!meta.sheet) {
    return errorResponse_("Sheet 'Data' tidak terhubung.");
  }

  var rows = sheetToObjects_(meta.sheet);
  var opsClean = normalizeOpsId_(opsId);
  var nikClean = String(nik).trim();
  var found = null;

  for (var i = 0; i < rows.length; i++) {
    var rowOps = normalizeOpsId_(pickValueByAliases_(rows[i], ['ops', 'ops id', 'opsid', 'ops_id', 'id ops', 'idops']));
    var rowNik = String(pickValueByAliases_(rows[i], ['nik']) || '').trim();
    if (rowOps === opsClean && rowNik === nikClean) {
      found = rows[i];
      break;
    }
  }

  if (!found) {
    return errorResponse_('Data karyawan tidak ditemukan atau kata sandi salah.');
  }

  return jsonResponse_(found);
}

function loginOwner_(opsId, nik) {
  if (!opsId || !nik) {
    return errorResponse_('OPS/NIK kosong.');
  }

  var meta = resolveSheetByPurpose_('owners');
  if (!meta.sheet) {
    return jsonResponse_({});
  }

  var rows = sheetToObjects_(meta.sheet);
  var opsClean = normalizeOpsId_(opsId);
  var nikClean = String(nik).trim();

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var rowOps = normalizeOpsId_(pickValueByAliases_(row, ['ops', 'ops id', 'opsid', 'ops_id', 'id ops', 'idops']));
    var rowNik = String(pickValueByAliases_(row, ['nik']) || '').trim();

    if (rowOps === opsClean && rowNik === nikClean) {
      return jsonResponse_(mergeObjects_({
        isOwner: true,
        ops: pickValueByAliases_(row, ['ops', 'ops id', 'opsid', 'ops_id', 'id ops', 'idops']) || '',
        nama: pickValueByAliases_(row, ['nama', 'name', 'nama lengkap']) || '',
        station: pickValueByAliases_(row, ['station', 'lokasi', 'stasiun', 'area', 'hubdc', 'hub dc']) || 'ALL',
        status: String(pickValueByAliases_(row, ['status', 'role']) || 'OWNER').toUpperCase(),
        wa: pickValueByAliases_(row, ['wa', 'telepon', 'phone', 'hp', 'whatsapp']) || ''
      }, row));
    }
  }

  return jsonResponse_({});
}

function registerEmployee_(data) {
  var meta = resolveSheetByPurpose_('employees');
  var sheet = meta.sheet || ensureSheetForPurpose_('employees');
  var headers = getHeaders_(sheet);
  if (!headers.length) {
    headers = SHEET_SCHEMAS.employees.headers.slice();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  var opsId = String(data.opsId || data.username || '').trim();
  var nik = String(data.nik || '').trim();
  var name = String(data.nama || data.name || '').trim();
  if (!opsId || !nik || !name) {
    return errorResponse_('OPS ID, NIK, dan nama wajib diisi.');
  }

  var rows = sheetToObjects_(sheet);
  var opsClean = normalizeOpsId_(opsId);
  for (var i = 0; i < rows.length; i++) {
    var rowOps = normalizeOpsId_(pickValueByAliases_(rows[i], ['ops', 'ops id', 'opsid', 'ops_id', 'id ops', 'idops']));
    var rowNik = String(pickValueByAliases_(rows[i], ['nik']) || '').trim();
    if (rowOps === opsClean || rowNik === nik) {
      return errorResponse_('OPS ID atau NIK sudah terdaftar.');
    }
  }

  var valueMap = {
    ops: opsId,
    opsid: opsId,
    nik: nik,
    nama: name,
    name: name,
    jabatan: data.jabatan || data.position || 'Daily Worker',
    position: data.jabatan || data.position || 'Daily Worker',
    status: data.status || 'Pending',
    wa: data.wa || data.telepon || '',
    phone: data.wa || data.telepon || '',
    telepon: data.telepon || data.wa || '',
    station: data.station || '',
    rekening: data.rekening || '',
    atasnama: data.atasNama || data.accountName || '',
    bank: data.bank || '',
    joindate: data.joinDate || formatDateOnly_(new Date()),
    shift: data.shift || '',
    divisi: data.divisi || '',
    email: data.email || '',
    alamat: data.alamat || '',
    createdat: new Date().toISOString(),
    portal: data.portal || 'daily-worker'
  };

  var row = headers.map(function (header) {
    return resolveValueForHeader_(header, valueMap);
  });

  sheet.appendRow(row);

  return jsonResponse_({
    success: true,
    message: 'Karyawan berhasil didaftarkan.',
    user: {
      opsId: opsId,
      nama: name,
      nik: nik,
      station: data.station || '',
      status: data.status || 'Pending'
    }
  });
}

function getStationsList_() {
  var meta = resolveSheetByPurpose_('stations');
  if (!meta.sheet) {
    return { success: true, groups: {}, stations: [] };
  }

  var rows = sheetToObjects_(meta.sheet);
  var groups = {};
  var stations = [];

  for (var i = 0; i < rows.length; i++) {
    var station = String(pickValueByAliases_(rows[i], ['station', 'lokasi', 'stasiun', 'name']) || '').trim();
    if (!station) {
      continue;
    }

    var groupName = String(pickValueByAliases_(rows[i], ['group', 'grup', 'wilayah', 'region']) || 'UMUM').trim();
    if (!groups[groupName]) {
      groups[groupName] = [];
    }
    groups[groupName].push(station);
    stations.push(station);
  }

  return {
    success: true,
    groups: groups,
    stations: uniqueStrings_(stations)
  };
}

function getSystemMessage_() {
  var meta = resolveSheetByPurpose_('systemMessage');
  if (!meta.sheet) {
    return null;
  }

  var rows = sheetToObjects_(meta.sheet);
  if (!rows.length) {
    return null;
  }

  for (var i = rows.length - 1; i >= 0; i--) {
    var row = rows[i];
    var activeValue = pickValueByAliases_(row, ['active', 'aktif']);
    if (activeValue === '' || activeValue === null || activeValue === undefined || isTruthy_(activeValue)) {
      return {
        ID: pickValueByAliases_(row, ['id']) || ('MSG-' + (i + 1)),
        Active: isTruthy_(activeValue === '' ? true : activeValue),
        Type: pickValueByAliases_(row, ['type', 'jenis']) || 'info',
        Title: pickValueByAliases_(row, ['title', 'judul']) || '',
        Content: pickValueByAliases_(row, ['content', 'isi', 'pesan']) || '',
        Date: pickValueByAliases_(row, ['date', 'tanggal']) || formatDateOnly_(new Date())
      };
    }
  }

  return null;
}

function discoverSheets_() {
  var spreadsheet = getSpreadsheet_();
  var sheets = spreadsheet.getSheets();
  var result = [];

  for (var i = 0; i < sheets.length; i++) {
    result.push(describeSheet_(sheets[i]));
  }

  return {
    spreadsheetName: spreadsheet.getName(),
    spreadsheetUrl: spreadsheet.getUrl(),
    sheets: result,
    generatedAt: new Date().toISOString()
  };
}

function diagnoseSheets_() {
  var discovery = discoverSheets_();
  var purposes = ['employees', 'attendance', 'payslips', 'owners', 'systemMessage', 'stations'];
  var missing = [];

  for (var i = 0; i < purposes.length; i++) {
    var meta = resolveSheetByPurpose_(purposes[i]);
    if (!meta.sheet) {
      missing.push(SHEET_SCHEMAS[purposes[i]].name);
    }
  }

  discovery.requiredSheets = purposes.map(function (purpose) {
    return SHEET_SCHEMAS[purpose].name;
  });
  discovery.missingSheets = missing;
  discovery.version = API_VERSION;
  return discovery;
}

function setupSheets_() {
  var created = [];
  var touched = [];

  for (var key in SHEET_SCHEMAS) {
    if (!SHEET_SCHEMAS.hasOwnProperty(key)) {
      continue;
    }
    var schema = SHEET_SCHEMAS[key];
    var meta = resolveSheetByPurpose_(key);
    var sheet = meta.sheet;
    if (!sheet) {
      sheet = getSpreadsheet_().insertSheet(schema.name);
      created.push(schema.name);
    }

    if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
      sheet.getRange(1, 1, 1, schema.headers.length).setValues([schema.headers]);
      touched.push(schema.name + ' (header dibuat)');
    } else if (!getHeaders_(sheet).length) {
      sheet.getRange(1, 1, 1, schema.headers.length).setValues([schema.headers]);
      touched.push(schema.name + ' (header diperbaiki)');
    }
  }

  var systemMeta = resolveSheetByPurpose_('systemMessage');
  if (systemMeta.sheet && systemMeta.sheet.getLastRow() === 1) {
    systemMeta.sheet.appendRow(['MSG-001', true, 'info', 'Selamat datang', 'SystemMessage siap digunakan.', formatDateOnly_(new Date())]);
    touched.push(systemMeta.sheet.getName() + ' (sample message)');
  }

  return {
    status: 'Success',
    message: 'Setup selesai.',
    created: created,
    updated: touched,
    spreadsheetName: getSpreadsheet_().getName(),
    spreadsheetUrl: getSpreadsheet_().getUrl()
  };
}

function resolveSheetByPurpose_(purpose) {
  var spreadsheet = getSpreadsheet_();
  var schema = SHEET_SCHEMAS[purpose];
  if (!schema) {
    throw new Error('Schema tidak dikenal: ' + purpose);
  }

  for (var i = 0; i < schema.aliases.length; i++) {
    var exact = spreadsheet.getSheetByName(schema.aliases[i]);
    if (exact) {
      return { sheet: exact, purpose: purpose, score: 999, matchedBy: 'name' };
    }
  }

  var best = null;
  var sheets = spreadsheet.getSheets();
  for (var j = 0; j < sheets.length; j++) {
    var info = describeSheet_(sheets[j]);
    var score = info.scores[purpose] || 0;
    if (!best || score > best.score) {
      best = { sheet: sheets[j], purpose: purpose, score: score, matchedBy: 'headers' };
    }
  }

  if (best && best.score > 0) {
    return best;
  }

  return { sheet: null, purpose: purpose, score: 0, matchedBy: 'none' };
}

function ensureSheetForPurpose_(purpose) {
  var meta = resolveSheetByPurpose_(purpose);
  if (meta.sheet) {
    return meta.sheet;
  }

  var schema = SHEET_SCHEMAS[purpose];
  var sheet = getSpreadsheet_().insertSheet(schema.name);
  sheet.getRange(1, 1, 1, schema.headers.length).setValues([schema.headers]);
  return sheet;
}

function describeSheet_(sheet) {
  var headers = getHeaders_(sheet);
  var scores = {};
  for (var purpose in SHEET_SCHEMAS) {
    if (SHEET_SCHEMAS.hasOwnProperty(purpose)) {
      scores[purpose] = scoreSheetForPurpose_(headers, purpose, sheet.getName());
    }
  }

  var topPurpose = 'unknown';
  var topScore = 0;
  for (var key in scores) {
    if (scores.hasOwnProperty(key) && scores[key] > topScore) {
      topScore = scores[key];
      topPurpose = key;
    }
  }

  return {
    name: sheet.getName(),
    rows: Math.max(sheet.getLastRow() - 1, 0),
    columns: sheet.getLastColumn(),
    headers: headers,
    type: topPurpose,
    scores: scores
  };
}

function buildMappingInfo_(meta) {
  return {
    sheet: meta.sheet.getName(),
    rows: Math.max(meta.sheet.getLastRow() - 1, 0),
    matchedBy: meta.matchedBy || 'name',
    score: meta.score || 0
  };
}

function scoreSheetForPurpose_(headers, purpose, sheetName) {
  var schema = SHEET_SCHEMAS[purpose];
  var normalizedHeaders = headers.map(function (header) {
    return normalizeHeader_(header);
  });
  var score = 0;

  if (schema.aliases.indexOf(sheetName) !== -1) {
    score += 10;
  }

  for (var i = 0; i < schema.headers.length; i++) {
    if (normalizedHeaders.indexOf(normalizeHeader_(schema.headers[i])) !== -1) {
      score += 2;
    }
  }

  if (purpose === 'employees') {
    score += countMatches_(normalizedHeaders, ['ops', 'opsid', 'nik', 'nama', 'jabatan', 'station']);
  } else if (purpose === 'attendance') {
    score += countMatches_(normalizedHeaders, ['ops', 'opsid', 'tanggal', 'status', 'station', 'shift']);
  } else if (purpose === 'payslips') {
    score += countMatches_(normalizedHeaders, ['ops', 'opsid', 'periode', 'gaji', 'totaldibayarkan']);
  } else if (purpose === 'owners') {
    score += countMatches_(normalizedHeaders, ['ops', 'opsid', 'nik', 'status', 'nama']);
  } else if (purpose === 'systemMessage') {
    score += countMatches_(normalizedHeaders, ['active', 'type', 'title', 'content', 'date']);
  } else if (purpose === 'stations') {
    score += countMatches_(normalizedHeaders, ['station', 'lokasi', 'group', 'wilayah']);
  }

  return score;
}

function countMatches_(headers, expected) {
  var count = 0;
  for (var i = 0; i < expected.length; i++) {
    if (headers.indexOf(normalizeHeader_(expected[i])) !== -1) {
      count += 1;
    }
  }
  return count;
}

function sheetToObjects_(sheet) {
  if (!sheet) {
    return [];
  }

  var values = sheet.getDataRange().getValues();
  if (!values || values.length < 2) {
    return [];
  }

  var headers = values[0];
  var result = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var obj = {};
    var hasData = false;
    for (var j = 0; j < headers.length; j++) {
      var header = String(headers[j] || '').trim();
      if (!header) {
        continue;
      }
      var value = normalizeCellValue_(row[j]);
      if (value !== '' && value !== null) {
        hasData = true;
      }
      obj[header] = value;
    }
    if (hasData) {
      result.push(obj);
    }
  }
  return result;
}

function getHeaders_(sheet) {
  if (!sheet || sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
    return [];
  }

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  return headers.map(function (header) {
    return String(header || '').trim();
  }).filter(function (header) {
    return header !== '';
  });
}

function normalizeCellValue_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  if (value === null || value === undefined) {
    return '';
  }
  return value;
}

function normalizeHeader_(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function normalizeOpsId_(value) {
  return String(value || '').trim().toUpperCase().replace(/^OPS/i, '').trim();
}

function resolveValueForHeader_(header, valueMap) {
  var key = normalizeHeader_(header);
  return valueMap.hasOwnProperty(key) ? valueMap[key] : '';
}

function pickValueByAliases_(row, aliases) {
  if (!row) {
    return '';
  }

  var normalizedAliases = aliases.map(function (alias) {
    return normalizeHeader_(alias);
  });

  for (var key in row) {
    if (row.hasOwnProperty(key) && normalizedAliases.indexOf(normalizeHeader_(key)) !== -1) {
      return row[key];
    }
  }

  return '';
}

function formatDateOnly_(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function parseJson_(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
}

function isTruthy_(value) {
  var normalized = String(value).toLowerCase();
  return value === true || value === 1 || normalized === '1' || normalized === 'true' || normalized === 'ya' || normalized === 'yes' || normalized === 'aktif';
}

function uniqueStrings_(items) {
  var seen = {};
  var result = [];
  for (var i = 0; i < items.length; i++) {
    var key = String(items[i]);
    if (!seen[key]) {
      seen[key] = true;
      result.push(key);
    }
  }
  return result;
}

function mergeObjects_(base, extra) {
  var out = {};
  var key;
  for (key in base) {
    if (base.hasOwnProperty(key)) {
      out[key] = base[key];
    }
  }
  for (key in extra) {
    if (extra.hasOwnProperty(key)) {
      out[key] = extra[key];
    }
  }
  return out;
}

function getSpreadsheet_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function jsonResponse_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function errorResponse_(message) {
  return jsonResponse_({ error: message });
}