/* ═══════════════════════════════════════════════════
   Upload Page v2 — Station + Bulan + Periode + Smart Parser
   ═══════════════════════════════════════════════════ */
import { api } from '../utils/api.js';
import { parseFile } from '../utils/parser.js';

let parsedData = null;

export function renderUpload() {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;

  return `
    <div class="page-header">
      <h1>Upload Data</h1>
    </div>

    <div class="card">
      <div class="card-title">Upload File Absensi</div>

      <!-- 3 Required Fields -->
      <div class="upload-fields">
        <div class="field-group">
          <label class="field-label">Nama Station <span class="required">*</span></label>
          <input type="text" id="upload-station" class="input" placeholder="Contoh: Maros DC, Kalawat DC..." />
        </div>
        <div class="field-group">
          <label class="field-label">Bulan <span class="required">*</span></label>
          <input type="month" id="upload-bulan" class="input" value="${currentMonth}" />
        </div>
        <div class="field-group">
          <label class="field-label">Periode <span class="required">*</span></label>
          <select id="upload-periode" class="input">
            <option value="">-- Pilih Periode --</option>
            <option value="P1">Periode 1 (Tgl 1-15)</option>
            <option value="P2">Periode 2 (Tgl 16-Akhir Bulan)</option>
          </select>
        </div>
      </div>

      <!-- Dropzone -->
      <div class="dropzone" id="dropzone">
        <div class="dropzone-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.5">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>
        <p><strong class="text-accent">Klik untuk pilih file</strong> atau drag & drop di sini</p>
        <p class="dropzone-hint">Format: .xlsx, .xls, .csv — Maks 10MB</p>
        <input type="file" id="file-input" hidden accept=".xlsx,.xls,.csv" />
      </div>

      <!-- Status -->
      <div id="upload-status" class="upload-status" style="display:none"></div>
    </div>

    <!-- Preview -->
    <div id="preview-section" style="display:none">
      <div class="card">
        <div class="card-title">
          <span>Preview Data</span>
          <div class="preview-stats" id="preview-stats"></div>
        </div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>No</th>
                <th>OPS ID</th>
                <th>Nama</th>
                <th>Station</th>
                <th>HK</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody id="preview-tbody"></tbody>
          </table>
        </div>
        <div class="preview-actions">
          <button class="btn btn-outline" id="btn-cancel">Batal</button>
          <button class="btn btn-primary" id="btn-import">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            Import Data
          </button>
        </div>
      </div>
    </div>
  `;
}

export function initUpload() {
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');
  if (!dropzone || !fileInput) return;

  dropzone.addEventListener('click', () => {
    if (!validateFields()) return;
    fileInput.click();
  });

  dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('drag-over'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    if (!validateFields()) return;
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length) handleFile(fileInput.files[0]);
    fileInput.value = '';
  });

  document.getElementById('btn-cancel')?.addEventListener('click', resetPreview);
  document.getElementById('btn-import')?.addEventListener('click', doImport);
}

function validateFields() {
  const station = document.getElementById('upload-station')?.value.trim();
  const bulan = document.getElementById('upload-bulan')?.value;
  const periode = document.getElementById('upload-periode')?.value;

  const missing = [];
  if (!station) missing.push('Station');
  if (!bulan) missing.push('Bulan');
  if (!periode) missing.push('Periode');

  if (missing.length > 0) {
    showStatus(`Harap isi dulu: <strong>${missing.join(', ')}</strong>`, 'warning');
    return false;
  }
  return true;
}

async function handleFile(file) {
  if (file.size > 10 * 1024 * 1024) {
    showStatus('File terlalu besar. Maksimal 10MB.', 'error');
    return;
  }

  showStatus('Memproses file... Deteksi format otomatis...', 'loading');

  try {
    parsedData = await parseFile(file);

    // Build column mapping info
    const mapInfo = parsedData.columnMapping ? Object.entries(parsedData.columnMapping)
      .filter(([k,v]) => v !== undefined)
      .map(([k]) => k.toUpperCase().replace('_',' '))
      .join(', ') : '';

    showStatus(
      `Format terdeteksi: <strong>${parsedData.format}</strong> ` +
      `| Kolom: ${mapInfo} ` +
      `| ${parsedData.totalRows} baris — <strong>${parsedData.uniqueEmployees} karyawan</strong> unik`,
      'success'
    );

    renderPreview(parsedData);
  } catch (err) {
    showStatus(`${err.message}`, 'error');
  }
}

function renderPreview(data) {
  const section = document.getElementById('preview-section');
  const tbody = document.getElementById('preview-tbody');
  const stats = document.getElementById('preview-stats');
  if (!section || !tbody) return;

  const multiShiftCount = data.employees.filter(e => e.multiShift).length;
  stats.innerHTML = `
    <span class="stat-badge">${data.uniqueEmployees} karyawan</span>
    <span class="stat-badge">${data.stations.length} station</span>
    ${multiShiftCount > 0 ? `<span class="stat-badge" style="background:rgba(251,191,36,.15);color:#fcd34d">${multiShiftCount} double shift</span>` : ''}
  `;

  const rows = data.employees.slice(0, 100);
  tbody.innerHTML = rows.map(emp => {
    const shiftBadge = emp.multiShift
      ? `<span class="badge badge-abnormal" title="${emp.multiShiftDays} hari double shift" style="font-size:9px;margin-left:4px">2x SHIFT</span>`
      : '';
    return `
    <tr${emp.multiShift ? ' style="background:rgba(251,191,36,.05)"' : ''}>
      <td>${emp.no}</td>
      <td><span class="badge badge-primary">${esc(emp.ops_id)}</span></td>
      <td style="font-weight:500">${esc(emp.nama)}</td>
      <td>${esc(emp.station)}</td>
      <td style="text-align:center;font-weight:700">${emp.hk}${shiftBadge}</td>
      <td><span class="badge badge-accent">${esc(emp.status)}</span></td>
    </tr>`;
  }).join('');

  if (data.uniqueEmployees > 100) {
    tbody.innerHTML += `<tr><td colspan="6" style="text-align:center;color:var(--text-tertiary);padding:16px">...dan ${data.uniqueEmployees - 100} karyawan lainnya</td></tr>`;
  }

  section.style.display = 'block';
  section.scrollIntoView({ behavior: 'smooth' });
}

async function doImport() {
  if (!parsedData) return;

  const station = document.getElementById('upload-station').value.trim();
  const bulan = document.getElementById('upload-bulan').value;
  const periode = document.getElementById('upload-periode').value;

  const btn = document.getElementById('btn-import');
  btn.disabled = true;
  btn.textContent = 'Mengimport...';

  try {
    const res = await api.uploadData({
      station, bulan, periode,
      employees: parsedData.employees,
    });

    showStatus(
      `Import berhasil! <strong>${res.imported}</strong> karyawan diimport` +
      (res.skipped > 0 ? `, ${res.skipped} dilewati` : ''),
      'success'
    );

    resetPreview();
    // Redirect to data page after 1.5s
    setTimeout(() => { window.location.hash = '#/data'; }, 1500);
  } catch (err) {
    showStatus(`Import gagal: ${err.message}`, 'error');
    btn.disabled = false;
    btn.textContent = 'Import Data';
  }
}

function resetPreview() {
  parsedData = null;
  const section = document.getElementById('preview-section');
  if (section) section.style.display = 'none';
}

function showStatus(msg, type) {
  const el = document.getElementById('upload-status');
  if (!el) return;
  el.style.display = 'block';
  el.className = `upload-status status-${type}`;
  el.innerHTML = msg;
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}
