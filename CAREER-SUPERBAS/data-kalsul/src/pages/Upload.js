/* ═══════════════════════════════════════════════════
   Upload Page — Drag & Drop Excel/CSV
   ═══════════════════════════════════════════════════ */

import { createShell, initShellEvents, toggleMobileMenu } from '../components/Shell.js';
import { parseFile, validateEmployees } from '../utils/parser.js';
import { api } from '../utils/api.js';
import { icons } from '../utils/icons.js';
import { toast } from '../utils/toast.js';
import { navigate } from '../router.js';

let parsedData = null;

export async function UploadPage(container) {
  container.innerHTML = createShell('upload');
  initShellEvents();

  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page-header">
      <div style="display:flex;align-items:center;gap:12px">
        <button class="mobile-menu-btn" id="mobile-menu-toggle">${icons.menu}</button>
        <h1 class="page-title">Upload Data</h1>
      </div>
    </div>

    <div class="page-body">
      <!-- Upload Zone -->
      <div class="glass-static" style="padding:var(--space-xl);margin-bottom:var(--space-xl)" id="upload-section">
        <h2 style="font-size:var(--font-md);font-weight:600;margin-bottom:var(--space-lg)">Upload File Absensi</h2>
        
        <div class="upload-zone" id="upload-zone">
          <div class="upload-zone-icon">📄</div>
          <div class="upload-zone-text"><strong>Klik untuk pilih file</strong> atau drag & drop di sini</div>
          <div class="upload-zone-hint">Format: .xlsx, .xls, .csv — Maks 10MB</div>
          <input type="file" id="file-input" accept=".xlsx,.xls,.csv" style="display:none" />
        </div>

        <!-- File Preview -->
        <div id="file-info" style="display:none">
          <div class="file-preview glass">
            <div class="file-preview-icon">📊</div>
            <div class="file-preview-info">
              <div class="file-preview-name" id="file-name"></div>
              <div class="file-preview-meta" id="file-meta"></div>
            </div>
            <button class="btn btn-ghost btn-sm" id="clear-file">${icons.x} Hapus</button>
          </div>
        </div>
      </div>

      <!-- Validation Errors -->
      <div id="validation-section" style="display:none;margin-bottom:var(--space-xl)">
        <div class="glass-static" style="padding:var(--space-lg)">
          <h3 style="font-size:var(--font-base);font-weight:600;color:var(--warning);margin-bottom:var(--space-md)">⚠ Peringatan Validasi</h3>
          <div id="validation-list" style="max-height:200px;overflow-y:auto;font-size:var(--font-sm)"></div>
        </div>
      </div>

      <!-- Preview Table -->
      <div id="preview-section" style="display:none;margin-bottom:var(--space-xl)">
        <div class="glass-static" style="padding:var(--space-lg)">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-lg)">
            <h2 style="font-size:var(--font-md);font-weight:600">
              Preview Data <span style="color:var(--text-tertiary);font-weight:400" id="preview-count"></span>
            </h2>
            <button class="btn btn-primary" id="import-btn">
              ${icons.upload} Import ke Database
            </button>
          </div>

          <div class="table-wrapper" style="max-height:500px;overflow-y:auto">
            <table class="table" id="preview-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>OPS ID</th>
                  <th>Nama</th>
                  <th>Station</th>
                  <th>HK</th>
                  <th>Status</th>
                  <th>No Rek</th>
                  <th>Bank</th>
                  <th>Atas Nama</th>
                  <th>No HP</th>
                  <th>NIK</th>
                  <th>Alamat</th>
                </tr>
              </thead>
              <tbody id="preview-tbody"></tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Import Progress -->
      <div id="import-progress" style="display:none">
        <div class="glass-static" style="padding:var(--space-xl);text-align:center">
          <div class="spinner spinner-lg" style="margin:0 auto var(--space-md)"></div>
          <p style="font-size:var(--font-md);font-weight:600;margin-bottom:var(--space-sm)">Mengimport data...</p>
          <p style="font-size:var(--font-sm);color:var(--text-secondary)" id="import-status">Memproses...</p>
        </div>
      </div>
    </div>
  `;

  // Mobile menu
  document.getElementById('mobile-menu-toggle')?.addEventListener('click', toggleMobileMenu);

  // Upload zone events
  const zone = document.getElementById('upload-zone');
  const fileInput = document.getElementById('file-input');

  zone.addEventListener('click', () => fileInput.click());
  
  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });
  
  zone.addEventListener('dragleave', () => {
    zone.classList.remove('drag-over');
  });
  
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
  });

  // Clear file
  document.getElementById('clear-file')?.addEventListener('click', () => {
    parsedData = null;
    fileInput.value = '';
    document.getElementById('file-info').style.display = 'none';
    document.getElementById('preview-section').style.display = 'none';
    document.getElementById('validation-section').style.display = 'none';
    zone.style.display = '';
  });

  // Import button
  document.getElementById('import-btn')?.addEventListener('click', handleImport);
}

async function handleFile(file) {
  const validExts = ['.xlsx', '.xls', '.csv'];
  const ext = '.' + file.name.split('.').pop().toLowerCase();
  
  if (!validExts.includes(ext)) {
    toast('Format file tidak didukung. Gunakan .xlsx, .xls, atau .csv', 'error');
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    toast('Ukuran file maksimal 10MB', 'error');
    return;
  }

  // Show file info
  document.getElementById('file-info').style.display = 'block';
  document.getElementById('file-name').textContent = file.name;
  document.getElementById('file-meta').textContent = `${formatFileSize(file.size)} • ${ext.toUpperCase().slice(1)}`;
  document.getElementById('upload-zone').style.display = 'none';

  try {
    toast('Memproses file...', 'info', 2000);
    parsedData = await parseFile(file);
    parsedData._file = file;

    // Validate
    const errors = validateEmployees(parsedData.employees);
    if (errors.length > 0) {
      showValidation(errors);
    }

    // Show preview
    showPreview(parsedData);
    toast(`${parsedData.totalRows} baris data ditemukan`, 'success');

  } catch (err) {
    toast(err.message || 'Gagal memproses file', 'error');
    document.getElementById('file-info').style.display = 'none';
    document.getElementById('upload-zone').style.display = '';
  }
}

function showValidation(errors) {
  const section = document.getElementById('validation-section');
  const list = document.getElementById('validation-list');
  section.style.display = 'block';

  list.innerHTML = errors.slice(0, 50).map(err => `
    <div style="padding:6px 0;border-bottom:1px solid var(--glass-border);display:flex;gap:12px">
      <span class="badge badge-warning" style="flex-shrink:0">Baris ${err.row}</span>
      <span style="color:var(--text-secondary)">${err.message}</span>
    </div>
  `).join('');

  if (errors.length > 50) {
    list.innerHTML += `<p style="padding:8px 0;color:var(--text-tertiary)">...dan ${errors.length - 50} peringatan lainnya</p>`;
  }
}

function showPreview(data) {
  const section = document.getElementById('preview-section');
  const tbody = document.getElementById('preview-tbody');
  const count = document.getElementById('preview-count');

  section.style.display = 'block';
  count.textContent = `(${data.totalRows} baris)`;

  // Show first 100 rows in preview
  const preview = data.employees.slice(0, 100);
  tbody.innerHTML = preview.map(emp => `
    <tr>
      <td>${emp.no}</td>
      <td><span class="badge badge-primary">${escapeHtml(emp.ops_id)}</span></td>
      <td style="font-weight:500">${escapeHtml(emp.nama)}</td>
      <td>${escapeHtml(emp.station)}</td>
      <td style="text-align:center;font-weight:600">${escapeHtml(emp.hk)}</td>
      <td><span class="badge badge-accent">${escapeHtml(emp.status)}</span></td>
      <td>${escapeHtml(emp.no_rek)}</td>
      <td>${escapeHtml(emp.bank)}</td>
      <td>${escapeHtml(emp.atas_nama)}</td>
      <td>${escapeHtml(emp.no_hp)}</td>
      <td>${escapeHtml(emp.nik)}</td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escapeHtml(emp.alamat)}">${escapeHtml(emp.alamat)}</td>
    </tr>
  `).join('');

  if (data.totalRows > 100) {
    tbody.innerHTML += `<tr><td colspan="12" style="text-align:center;color:var(--text-tertiary);padding:16px">...dan ${data.totalRows - 100} baris lainnya</td></tr>`;
  }
}

async function handleImport() {
  if (!parsedData || !parsedData._file) {
    toast('Tidak ada data untuk diimport', 'error');
    return;
  }

  if (!confirm(`Import ${parsedData.totalRows} data karyawan ke database?`)) {
    return;
  }

  // Show progress
  document.getElementById('preview-section').style.display = 'none';
  document.getElementById('validation-section').style.display = 'none';
  document.getElementById('import-progress').style.display = 'block';

  try {
    const formData = new FormData();
    formData.append('file', parsedData._file);

    const result = await api.uploadFile(formData);
    
    document.getElementById('import-progress').style.display = 'none';
    
    toast(`Import berhasil! ${result.imported || parsedData.totalRows} data diproses.`, 'success', 6000);
    
    // Navigate to data table
    setTimeout(() => navigate('/data'), 1500);

  } catch (err) {
    document.getElementById('import-progress').style.display = 'none';
    document.getElementById('preview-section').style.display = 'block';
    toast(err.message || 'Gagal mengimport data', 'error');
  }
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
