/* ═══════════════════════════════════════════════════
   Smart Parser v3 — Universal Column Auto-Mapper
   Detects ANY spreadsheet format by fuzzy-matching
   column names to known patterns
   ═══════════════════════════════════════════════════ */
import * as XLSX from 'xlsx';

// Column mapping: target field → possible column names (priority order)
const COLUMN_MAP = {
  ops_id: [
    'ops id', 'ops_id', 'opsid', 'id ops', 'ops',
    'staff id', 'staff_id', 'staffid',
    'account_id', 'account id', 'accountid',
    'id karyawan', 'employee id', 'emp id', 'nik ops',
  ],
  nama: [
    'nama', 'name', 'nama lengkap', 'nama karyawan', 'full name',
    'staff name', 'staff_name', 'staffname',
    'nama staff', 'employee name',
  ],
  station: [
    'station', 'station_name', 'station name',
    'stasiun', 'lokasi', 'lokasi kerja',
    'profile station', 'event station', 'reporting station',
    'penempatan', 'area', 'dc', 'hub',
  ],
  date: [
    'date', 'tanggal', 'tgl', 'attendance_date', 'attendance date',
    'check in date', 'checkin date', 'work date',
  ],
  status: [
    'contract type', 'contract_type', 'contracttype',
    'status', 'tipe', 'type', 'jenis',
    'entity', 'vendor',
  ],
  time_in: [
    'time_in_actual', 'time in actual', 'time_in', 'time in',
    'check in', 'check_in', 'checkin', 'jam masuk', 'clock in',
    'waktu masuk', 'in time', 'start time',
  ],
};

/**
 * Parse uploaded file — universal format detection.
 * @returns {{ employees, totalRows, uniqueEmployees, format, stations, columnMapping }}
 */
export function parseFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true });
        const allRows = [];
        let detectedMapping = null;
        let formatName = 'unknown';

        for (const sheetName of wb.SheetNames) {
          const ws = wb.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
          if (rows.length < 2) continue;

          const header = rows[0].map(h => String(h || '').trim().toLowerCase());
          const mapping = autoMapColumns(header);

          if (!mapping.ops_id && !mapping.nama) continue;
          // Need at least ops_id OR nama
          if (!mapping.ops_id && !mapping.nama) continue;

          if (!detectedMapping) detectedMapping = mapping;
          formatName = detectFormatName(header);

          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;
            const parsed = extractRow(row, header, mapping);
            if (parsed) {
              parsed._format = formatName;
              allRows.push(parsed);
            }
          }
        }

        if (allRows.length === 0) {
          reject(new Error('Tidak ada data yang bisa diproses. Pastikan file berisi kolom OPS ID / Account ID / Staff ID dan Nama / Staff Name.'));
          return;
        }

        // Group by OPS ID → calculate HK with shift detection (6h gap)
        const GAP_HOURS = 6;
        const grouped = {};
        for (const row of allRows) {
          // Filter: ONLY "Vendor - BAS" (exclude Synthesa, PSD, SOC, etc.)
          const statusLower = (row.status || '').toLowerCase();
          if (statusLower && statusLower.length > 3) {
            const isBAS = statusLower.includes('bas');
            if (!isBAS) continue;
          }

          const key = row.ops_id;
          if (!grouped[key]) {
            grouped[key] = {
              ops_id: row.ops_id,
              nama: row.nama,
              station: row.station || '',
              status: cleanStatus(row.status),
              shifts: [],       // array of timestamps for shift detection
              multiShift: false, // flag: has >1 shift on same day
            };
          }
          // Store date+time for shift detection
          if (row.date) {
            const ts = row.time_in ? `${row.date} ${row.time_in}` : row.date;
            grouped[key].shifts.push(ts);
          }
          if (row.nama.length > grouped[key].nama.length) grouped[key].nama = row.nama;
          if (row.station && !grouped[key].station) grouped[key].station = row.station;
        }

        const employees = Object.values(grouped).map((g, idx) => {
          // Calculate HK with shift detection
          const hkResult = countShifts(g.shifts, GAP_HOURS);
          return {
            no: idx + 1,
            ops_id: g.ops_id,
            nama: g.nama,
            station: g.station,
            hk: hkResult.total,
            multiShift: hkResult.multiShiftDays > 0,
            multiShiftDays: hkResult.multiShiftDays,
            status: g.status,
          };
        });

        employees.sort((a, b) => a.nama.localeCompare(b.nama));
        employees.forEach((e, i) => e.no = i + 1);

        const stations = [...new Set(employees.map(e => e.station).filter(Boolean))];

        resolve({
          employees,
          totalRows: allRows.length,
          uniqueEmployees: employees.length,
          format: formatName,
          stations,
          columnMapping: detectedMapping,
        });
      } catch (err) {
        reject(new Error('Gagal memproses file: ' + err.message));
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Auto-map columns by fuzzy matching header names to known patterns
 * Returns { ops_id: colIndex, nama: colIndex, station: colIndex, ... }
 */
function autoMapColumns(header) {
  const mapping = {};

  for (const [field, candidates] of Object.entries(COLUMN_MAP)) {
    // 1. Exact match first
    for (const candidate of candidates) {
      const idx = header.indexOf(candidate);
      if (idx >= 0) {
        mapping[field] = idx;
        break;
      }
    }
    if (mapping[field] !== undefined) continue;

    // 2. Partial/fuzzy match
    for (const candidate of candidates) {
      const idx = header.findIndex(h =>
        h.includes(candidate) || candidate.includes(h)
      );
      if (idx >= 0 && !Object.values(mapping).includes(idx)) {
        mapping[field] = idx;
        break;
      }
    }
  }

  return mapping;
}

/**
 * Detect human-readable format name from header
 */
function detectFormatName(header) {
  const h = header.join('|');
  if (h.includes('attendance_date') || h.includes('attendance date')) return 'Rekap Absensi';
  if (h.includes('staff id') && h.includes('staff name')) return 'SPX Export';
  if (h.includes('ops id') && h.includes('nama')) return 'Internal BAS';
  if (h.includes('account_id') || h.includes('account id')) return 'Account Export';
  return 'Auto-detect';
}

/**
 * Extract one row using column mapping
 */
function extractRow(row, header, mapping) {
  const getVal = (field) => {
    const idx = mapping[field];
    if (idx === undefined) return '';
    return String(row[idx] ?? '').trim();
  };

  let opsId = getVal('ops_id');
  let nama = getVal('nama');
  let station = getVal('station');
  let date = formatDate(getVal('date') || (row[mapping.date] ?? ''));
  let status = getVal('status');

  // Clean OPS ID
  if (!opsId || opsId === '0') return null;
  opsId = opsId.replace(/\s+/g, ''); // remove spaces

  // If no nama but has ops_id, still accept (with placeholder)
  if (!nama && !opsId) return null;
  if (!nama) nama = '-';

  return { ops_id: opsId, nama, station, date, status, time_in: getVal('time_in') };
}

/**
 * Format date to YYYY-MM-DD string
 */
function formatDate(val) {
  if (!val) return '';
  // Already a date string YYYY-MM-DD
  if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}/)) return val.substring(0, 10);
  // Date object
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().substring(0, 10);
  }
  // dd-MMM-yy format (01-May-26)
  if (typeof val === 'string' && val.match(/^\d{1,2}-[A-Za-z]{3}-\d{2,4}/)) {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString().substring(0, 10);
  }
  // Excel serial number
  if (typeof val === 'number' && val > 40000 && val < 60000) {
    const d = new Date((val - 25569) * 86400 * 1000);
    return d.toISOString().substring(0, 10);
  }
  // dd/mm/yyyy or mm/dd/yyyy
  if (typeof val === 'string' && val.match(/^\d{1,2}\/\d{1,2}\/\d{4}/)) {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString().substring(0, 10);
  }
  // Try parse anything
  const d = new Date(val);
  if (!isNaN(d.getTime())) return d.toISOString().substring(0, 10);
  return String(val).substring(0, 10);
}

/**
 * Clean status
 */
function cleanStatus(status) {
  if (!status) return 'Vendor - BAS';
  let s = String(status).trim();
  s = s.replace(/^daily\s*worker\s*/i, '').trim();
  return s || 'Vendor - BAS';
}

/**
 * Count shifts with gap detection.
 * Groups timestamps by date. For each date, if multiple entries have
 * time_in >gapHours apart, each is counted as a separate shift (HK).
 * @param {string[]} timestamps - array of "YYYY-MM-DD" or "YYYY-MM-DD HH:MM:SS"
 * @param {number} gapHours - minimum hours between entries to count as separate shift
 * @returns {{ total: number, multiShiftDays: number }}
 */
function countShifts(timestamps, gapHours) {
  if (!timestamps.length) return { total: 0, multiShiftDays: 0 };

  // Group by date
  const byDate = {};
  for (const ts of timestamps) {
    const dateStr = ts.substring(0, 10); // YYYY-MM-DD
    if (!byDate[dateStr]) byDate[dateStr] = [];
    byDate[dateStr].push(ts);
  }

  let total = 0;
  let multiShiftDays = 0;

  for (const [dateStr, entries] of Object.entries(byDate)) {
    if (entries.length <= 1) {
      total += 1; // single entry = 1 HK
      continue;
    }

    // Parse times and sort
    const times = entries.map(ts => {
      const timePart = ts.length > 10 ? ts.substring(11) : '00:00:00';
      const [h, m] = timePart.split(':').map(Number);
      return (h || 0) * 60 + (m || 0); // minutes since midnight
    }).sort((a, b) => a - b);

    // Count shifts: new shift if gap > gapHours
    let shifts = 1;
    for (let i = 1; i < times.length; i++) {
      const gapMin = times[i] - times[i - 1];
      if (gapMin >= gapHours * 60) {
        shifts++;
      }
    }

    total += shifts;
    if (shifts > 1) multiShiftDays++;
  }

  return { total, multiShiftDays };
}
