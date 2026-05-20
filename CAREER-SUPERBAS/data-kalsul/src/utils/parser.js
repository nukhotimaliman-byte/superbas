/* ═══════════════════════════════════════════════════
   Excel/CSV Parser using SheetJS
   ═══════════════════════════════════════════════════ */

import * as XLSX from 'xlsx';

/**
 * Parse uploaded file (Excel or CSV) and return structured data
 * Expected columns: No, OPS ID, Nama, Station, Status, No Rek, Bank, Atas Nama, No HP, NIK, Alamat
 */
export function parseFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Get raw data as array of arrays
        const raw = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        if (raw.length < 2) {
          reject(new Error('File kosong atau hanya berisi header'));
          return;
        }

        // First row is header
        const headers = raw[0].map(h => String(h).trim().toLowerCase());
        const rows = raw.slice(1).filter(row => row.some(cell => cell !== ''));

        // Try to map columns
        const mapping = autoMapColumns(headers);
        
        const employees = rows.map((row, i) => ({
          no: i + 1,
          ops_id: getCell(row, mapping.ops_id),
          nama: getCell(row, mapping.nama),
          station: getCell(row, mapping.station),
          status: getCell(row, mapping.status) || 'Daily Worker',
          no_rek: getCell(row, mapping.no_rek),
          bank: getCell(row, mapping.bank),
          atas_nama: getCell(row, mapping.atas_nama),
          no_hp: getCell(row, mapping.no_hp),
          nik: getCell(row, mapping.nik),
          alamat: getCell(row, mapping.alamat),
        })).filter(emp => emp.ops_id || emp.nama); // Filter out empty rows

        resolve({
          sheetName,
          totalSheets: workbook.SheetNames.length,
          headers: raw[0],
          mapping,
          employees,
          totalRows: employees.length,
        });
      } catch (err) {
        reject(new Error('Gagal membaca file: ' + err.message));
      }
    };

    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.readAsArrayBuffer(file);
  });
}

function getCell(row, index) {
  if (index === -1 || index === undefined) return '';
  return String(row[index] ?? '').trim();
}

/**
 * Auto-map column headers to expected fields
 */
function autoMapColumns(headers) {
  const mapping = {
    ops_id: -1,
    nama: -1,
    station: -1,
    status: -1,
    no_rek: -1,
    bank: -1,
    atas_nama: -1,
    no_hp: -1,
    nik: -1,
    alamat: -1,
  };

  const patterns = {
    ops_id: ['ops_id', 'ops id', 'opsid', 'ops', 'id ops', 'kode', 'id'],
    nama: ['nama', 'name', 'nama lengkap', 'nama karyawan', 'employee'],
    station: ['station', 'stasiun', 'lokasi', 'location', 'penempatan', 'site'],
    status: ['status', 'tipe', 'type', 'jenis', 'kategori'],
    no_rek: ['no_rek', 'no rek', 'norek', 'rekening', 'no rekening', 'account', 'nomor rekening'],
    bank: ['bank', 'nama bank'],
    atas_nama: ['atas_nama', 'atas nama', 'a/n', 'an', 'nama rekening', 'account name'],
    no_hp: ['no_hp', 'no hp', 'nohp', 'hp', 'telepon', 'phone', 'wa', 'whatsapp', 'no telp', 'no wa'],
    nik: ['nik', 'no ktp', 'ktp', 'nomor ktp', 'nomor identitas'],
    alamat: ['alamat', 'address', 'alamat lengkap', 'domisili'],
  };

  for (const [field, keywords] of Object.entries(patterns)) {
    const idx = headers.findIndex(h => keywords.some(k => h.includes(k)));
    if (idx !== -1) mapping[field] = idx;
  }

  return mapping;
}

/**
 * Validate parsed employee data
 */
export function validateEmployees(employees) {
  const errors = [];
  const opsIds = new Set();

  employees.forEach((emp, i) => {
    const row = i + 2; // +2 because header=1, 0-indexed

    if (!emp.ops_id) {
      errors.push({ row, field: 'ops_id', message: 'OPS ID kosong' });
    } else if (opsIds.has(emp.ops_id)) {
      errors.push({ row, field: 'ops_id', message: `OPS ID "${emp.ops_id}" duplikat` });
    } else {
      opsIds.add(emp.ops_id);
    }

    if (!emp.nama) {
      errors.push({ row, field: 'nama', message: 'Nama kosong' });
    }

    if (emp.nik && !/^\d{16}$/.test(emp.nik.replace(/\s/g, ''))) {
      errors.push({ row, field: 'nik', message: `NIK "${emp.nik}" bukan 16 digit` });
    }
  });

  return errors;
}
