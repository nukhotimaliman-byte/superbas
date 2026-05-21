/* ═══════════════════════════════════════════════════
   Smart Parser v2 — Auto-detect format, multi-sheet,
   group by OPS ID, calculate HK
   ═══════════════════════════════════════════════════ */
import * as XLSX from 'xlsx';

/**
 * Parse uploaded file and return aggregated employee data.
 * Supports: SPX Attendance Export (45-col) and Internal BAS (10-col)
 * @returns {{ employees: Array, totalRows: number, format: string, stations: string[] }}
 */
export function parseFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true });
        const allRows = [];

        // Merge all sheets
        for (const sheetName of wb.SheetNames) {
          const ws = wb.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
          if (rows.length < 2) continue;

          const header = rows[0].map(h => String(h || '').trim().toLowerCase());
          const format = detectFormat(header);

          if (!format) continue;

          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;
            const parsed = extractRow(row, header, format);
            if (parsed) allRows.push(parsed);
          }
        }

        if (allRows.length === 0) {
          reject(new Error('Tidak ada data yang bisa diproses. Pastikan file berisi kolom OPS ID dan Nama.'));
          return;
        }

        // Group by OPS ID → calculate HK
        const grouped = {};
        const detectedFormat = allRows[0]?._format || 'unknown';

        for (const row of allRows) {
          // Filter: hanya ambil Vendor - BAS
          const statusLower = (row.status || '').toLowerCase();
          if (statusLower && !statusLower.includes('vendor - bas') && !statusLower.includes('vendor-bas') && !statusLower.includes('vendor bas')) {
            continue; // Skip non-BAS vendors
          }

          const key = row.ops_id;
          if (!grouped[key]) {
            grouped[key] = {
              ops_id: row.ops_id,
              nama: row.nama,
              station: row.station || '',
              status: cleanStatus(row.status),
              dates: new Set(),
            };
          }
          if (row.date) grouped[key].dates.add(row.date);
          // Keep the longest name
          if (row.nama.length > grouped[key].nama.length) grouped[key].nama = row.nama;
          // Keep station if not empty
          if (row.station && !grouped[key].station) grouped[key].station = row.station;
        }

        // Build result
        const employees = Object.values(grouped).map((g, idx) => ({
          no: idx + 1,
          ops_id: g.ops_id,
          nama: g.nama,
          station: g.station,
          hk: g.dates.size,
          status: g.status,
        }));

        // Sort by nama
        employees.sort((a, b) => a.nama.localeCompare(b.nama));
        employees.forEach((e, i) => e.no = i + 1);

        // Unique stations
        const stations = [...new Set(employees.map(e => e.station).filter(Boolean))];

        resolve({
          employees,
          totalRows: allRows.length,
          uniqueEmployees: employees.length,
          format: detectedFormat,
          stations,
        });
      } catch (err) {
        reject(new Error('Gagal memproses file: ' + err.message));
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Detect file format from header row
 */
function detectFormat(header) {
  const headerStr = header.join('|');

  // SPX format: has "staff id" and "staff name"
  if (header.includes('staff id') && header.includes('staff name')) {
    return 'spx';
  }

  // Internal BAS format: has "ops id" and "nama"
  if (header.includes('ops id') && header.includes('nama')) {
    return 'bas';
  }

  // Try fuzzy match
  const hasOpsLike = header.some(h => h.includes('ops') || h.includes('staff id'));
  const hasNameLike = header.some(h => h.includes('nama') || h.includes('name') || h.includes('staff name'));
  if (hasOpsLike && hasNameLike) return 'generic';

  return null;
}

/**
 * Extract one row based on format
 */
function extractRow(row, header, format) {
  const get = (col) => {
    const idx = header.indexOf(col);
    return idx >= 0 ? String(row[idx] ?? '').trim() : '';
  };

  const find = (keywords) => {
    for (const kw of keywords) {
      const idx = header.indexOf(kw);
      if (idx >= 0) return String(row[idx] ?? '').trim();
    }
    return '';
  };

  let opsId, nama, station, date, status;

  if (format === 'spx') {
    opsId = get('staff id');
    nama = get('staff name');
    station = get('profile station') || get('event station') || get('reporting station');
    date = formatDate(get('date'));
    status = get('contract type') || 'Daily Worker';
  } else if (format === 'bas') {
    opsId = get('ops id');
    nama = get('nama');
    station = get('station');
    date = formatDate(get('date'));
    status = get('contract type') || 'Daily Worker';
  } else {
    opsId = find(['ops id', 'ops_id', 'opsid', 'staff id', 'id ops', 'ops']);
    nama = find(['nama', 'name', 'staff name', 'nama lengkap', 'nama karyawan']);
    station = find(['station', 'stasiun', 'lokasi', 'profile station', 'penempatan']);
    date = formatDate(find(['date', 'tanggal', 'tgl']));
    status = find(['status', 'contract type', 'tipe']) || 'Daily Worker';
  }

  if (!opsId || !nama) return null;

  // Clean OPS ID: ensure it starts with Ops
  opsId = opsId.trim();

  return { ops_id: opsId, nama: nama, station, date, status, _format: format };
}

/**
 * Format date to YYYY-MM-DD string
 */
function formatDate(val) {
  if (!val) return '';
  // Already a date string
  if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}/)) return val.substring(0, 10);
  // Date object
  if (val instanceof Date) {
    return val.toISOString().substring(0, 10);
  }
  // Excel serial number
  if (typeof val === 'number' && val > 40000 && val < 60000) {
    const d = new Date((val - 25569) * 86400 * 1000);
    return d.toISOString().substring(0, 10);
  }
  // Try parse
  const d = new Date(val);
  if (!isNaN(d.getTime())) return d.toISOString().substring(0, 10);
  return String(val).substring(0, 10);
}

/**
 * Clean status: remove 'Daily Worker' prefix
 * 'Daily Worker Vendor - BAS' → 'Vendor - BAS'
 */
function cleanStatus(status) {
  if (!status) return 'Vendor - BAS';
  let s = String(status).trim();
  // Remove 'Daily Worker' prefix
  s = s.replace(/^daily\s*worker\s*/i, '').trim();
  return s || 'Vendor - BAS';
}
