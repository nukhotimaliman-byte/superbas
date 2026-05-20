/* ═══════════════════════════════════════════════════
   Data Table Page — Employee Data Management
   ═══════════════════════════════════════════════════ */

import { createShell, initShellEvents, toggleMobileMenu } from '../components/Shell.js';
import { api } from '../utils/api.js';
import { icons } from '../utils/icons.js';
import { toast } from '../utils/toast.js';

let currentPage = 1;
let perPage = 25;
let searchQuery = '';
let stationFilter = '';
let debounceTimer = null;

export async function DataTablePage(container) {
  container.innerHTML = createShell('data');
  initShellEvents();

  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page-header">
      <div style="display:flex;align-items:center;gap:12px">
        <button class="mobile-menu-btn" id="mobile-menu-toggle">${icons.menu}</button>
        <h1 class="page-title">Data Karyawan</h1>
      </div>
      <div class="page-actions">
        <div class="dropdown" style="position:relative" id="export-dropdown">
          <button class="btn btn-secondary btn-sm" id="export-btn">
            ${icons.download} Export
          </button>
          <div class="dropdown-menu" id="export-menu" style="display:none;position:absolute;right:0;top:calc(100% + 4px);background:var(--bg-tertiary);border:1px solid var(--glass-border);border-radius:var(--radius-md);padding:4px;min-width:160px;z-index:20;box-shadow:var(--shadow-lg)">
            <a href="#" class="dropdown-item" id="export-csv" style="display:block;padding:10px 14px;border-radius:var(--radius-sm);font-size:var(--font-sm);color:var(--text-secondary);transition:background 0.15s">📄 Export CSV</a>
            <a href="#" class="dropdown-item" id="export-excel" style="display:block;padding:10px 14px;border-radius:var(--radius-sm);font-size:var(--font-sm);color:var(--text-secondary);transition:background 0.15s">📊 Export Excel</a>
          </div>
        </div>
      </div>
    </div>

    <div class="page-body">
      <!-- Toolbar -->
      <div class="toolbar">
        <div class="toolbar-left">
          <input type="text" class="input input-search" id="search-input" placeholder="Cari nama atau OPS ID..." style="max-width:320px" />
          <select class="input" id="station-filter" style="max-width:200px">
            <option value="">Semua Station</option>
          </select>
          <select class="input" id="perpage-select" style="max-width:120px">
            <option value="25">25/hal</option>
            <option value="50">50/hal</option>
            <option value="100">100/hal</option>
          </select>
        </div>
        <div class="toolbar-right">
          <span style="font-size:var(--font-sm);color:var(--text-tertiary)" id="result-count"></span>
        </div>
      </div>

      <!-- Table -->
      <div class="glass-static" style="position:relative" id="table-container">
        <div class="table-wrapper">
          <table class="table" id="data-table">
            <thead>
              <tr>
                <th style="width:50px">No</th>
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
                <th>Gaji</th>
                <th style="width:80px">Aksi</th>
              </tr>
            </thead>
            <tbody id="data-tbody">
              <tr><td colspan="15" style="text-align:center;padding:40px;color:var(--text-tertiary)">Memuat data...</td></tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="pagination" style="padding:var(--space-md) var(--space-lg)">
          <div class="pagination-info" id="pagination-info">—</div>
          <div class="pagination-controls" id="pagination-controls"></div>
        </div>
      </div>
    </div>

    <!-- Edit Modal -->
    <div class="modal-overlay" id="edit-modal">
      <div class="modal glass-static">
        <div class="modal-header">
          <h3 class="modal-title">Edit Karyawan</h3>
          <button class="modal-close" id="modal-close">${icons.x}</button>
        </div>
        <div class="modal-body" id="edit-form-body"></div>
        <div class="modal-footer">
          <button class="btn btn-secondary btn-sm" id="modal-cancel">Batal</button>
          <button class="btn btn-primary btn-sm" id="modal-save">Simpan</button>
        </div>
      </div>
    </div>
  `;

  // Mobile menu
  document.getElementById('mobile-menu-toggle')?.addEventListener('click', toggleMobileMenu);

  // Search
  document.getElementById('search-input')?.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      searchQuery = e.target.value.trim();
      currentPage = 1;
      loadData();
    }, 400);
  });

  // Station filter
  document.getElementById('station-filter')?.addEventListener('change', (e) => {
    stationFilter = e.target.value;
    currentPage = 1;
    loadData();
  });

  // Per page
  document.getElementById('perpage-select')?.addEventListener('change', (e) => {
    perPage = parseInt(e.target.value);
    currentPage = 1;
    loadData();
  });

  // Export dropdown
  const exportBtn = document.getElementById('export-btn');
  const exportMenu = document.getElementById('export-menu');
  exportBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    exportMenu.style.display = exportMenu.style.display === 'none' ? 'block' : 'none';
  });
  document.addEventListener('click', () => {
    if (exportMenu) exportMenu.style.display = 'none';
  });

  document.getElementById('export-csv')?.addEventListener('click', (e) => {
    e.preventDefault();
    window.open(api.exportCSV(), '_blank');
    exportMenu.style.display = 'none';
  });
  document.getElementById('export-excel')?.addEventListener('click', (e) => {
    e.preventDefault();
    window.open(api.exportExcel(), '_blank');
    exportMenu.style.display = 'none';
  });

  // Modal events
  document.getElementById('modal-close')?.addEventListener('click', closeModal);
  document.getElementById('modal-cancel')?.addEventListener('click', closeModal);
  document.getElementById('edit-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'edit-modal') closeModal();
  });

  // Load stations & data
  loadStations();
  loadData();

  return () => {
    clearTimeout(debounceTimer);
  };
}

async function loadStations() {
  try {
    const data = await api.getEmployees({ page: 1, per_page: 999 });
    const employees = data.employees || data.data || [];
    const stations = [...new Set(employees.map(e => e.station).filter(Boolean))].sort();
    
    const select = document.getElementById('station-filter');
    if (select) {
      stations.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = s;
        select.appendChild(opt);
      });
    }
  } catch {
    // Silent
  }
}

async function loadData() {
  const tbody = document.getElementById('data-tbody');
  tbody.innerHTML = `<tr><td colspan="13" style="text-align:center;padding:40px"><div class="spinner" style="margin:0 auto"></div></td></tr>`;

  try {
    const params = {
      page: currentPage,
      per_page: perPage,
    };
    if (searchQuery) params.search = searchQuery;
    if (stationFilter) params.station = stationFilter;

    const data = await api.getEmployees(params);
    const employees = data.employees || data.data || [];
    const pagination = data.pagination || { total: 0, page: 1, per_page: perPage, total_pages: 1 };

    if (employees.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="15">
          <div class="empty-state">
            <div class="empty-state-icon">${icons.users}</div>
            <div class="empty-state-title">Tidak ada data</div>
            <div class="empty-state-desc">${searchQuery ? 'Coba ubah kata kunci pencarian' : 'Upload file Excel/CSV untuk menambahkan data'}</div>
          </div>
        </td></tr>
      `;
      document.getElementById('result-count').textContent = '0 data';
      document.getElementById('pagination-info').textContent = '';
      document.getElementById('pagination-controls').innerHTML = '';
      return;
    }

    const startNum = (pagination.page - 1) * pagination.per_page;

    tbody.innerHTML = employees.map((emp, i) => `
      <tr data-id="${emp.id}">
        <td style="color:var(--text-tertiary)">${startNum + i + 1}</td>
        <td><span class="badge badge-primary">${esc(emp.ops_id)}</span></td>
        <td style="font-weight:500">${esc(emp.nama)}</td>
        <td>${esc(emp.station)}</td>
        <td style="text-align:center;font-weight:600">${esc(emp.hk || '')}</td>
        <td><span class="badge badge-accent">${esc(emp.status)}</span></td>
        <td style="font-family:monospace;font-size:12px">${esc(emp.no_rek)}</td>
        <td>${esc(emp.bank)}</td>
        <td>${esc(emp.atas_nama)}</td>
        <td>${esc(emp.no_hp)}</td>
        <td style="font-family:monospace;font-size:12px">${esc(emp.nik)}</td>
        <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(emp.alamat)}">${esc(emp.alamat)}</td>
        <td>
          ${emp.gaji_link_filled 
            ? '<span class="gaji-status"><span class="gaji-dot filled"></span>Sudah</span>' 
            : '<span class="gaji-status"><span class="gaji-dot unfilled"></span>Belum</span>'}
        </td>
        <td>
          <div style="display:flex;gap:4px">
            <button class="btn btn-ghost btn-icon btn-sm edit-btn" data-id="${emp.id}" title="Edit">
              ${icons.edit}
            </button>
            <button class="btn btn-ghost btn-icon btn-sm delete-btn" data-id="${emp.id}" title="Hapus" style="color:var(--error)">
              ${icons.trash}
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    // Result count
    document.getElementById('result-count').textContent = `${pagination.total} data`;

    // Pagination
    renderPagination(pagination);

    // Edit buttons
    tbody.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => openEditModal(employees.find(e => e.id == btn.dataset.id)));
    });

    // Delete buttons
    tbody.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => handleDelete(btn.dataset.id));
    });

  } catch (err) {
    tbody.innerHTML = `
      <tr><td colspan="13" style="text-align:center;padding:40px;color:var(--error)">
        Gagal memuat data: ${err.message || 'Unknown error'}
      </td></tr>
    `;
  }
}

function renderPagination(pagination) {
  const info = document.getElementById('pagination-info');
  const controls = document.getElementById('pagination-controls');

  const start = (pagination.page - 1) * pagination.per_page + 1;
  const end = Math.min(pagination.page * pagination.per_page, pagination.total);
  info.textContent = `${start}–${end} dari ${pagination.total}`;

  const totalPages = pagination.total_pages || Math.ceil(pagination.total / pagination.per_page);
  if (totalPages <= 1) {
    controls.innerHTML = '';
    return;
  }

  let html = `<button class="pagination-btn" ${currentPage <= 1 ? 'disabled' : ''} data-page="${currentPage - 1}">${icons.chevronLeft}</button>`;

  // Show page numbers
  const pages = getPageNumbers(currentPage, totalPages);
  pages.forEach(p => {
    if (p === '...') {
      html += `<span style="padding:0 4px;color:var(--text-tertiary)">...</span>`;
    } else {
      html += `<button class="pagination-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
    }
  });

  html += `<button class="pagination-btn" ${currentPage >= totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">${icons.chevronRight}</button>`;

  controls.innerHTML = html;
  controls.querySelectorAll('.pagination-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => {
      currentPage = parseInt(btn.dataset.page);
      loadData();
      // Scroll to top
      document.getElementById('table-container')?.scrollIntoView({ behavior: 'smooth' });
    });
  });
}

function getPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  
  const pages = [];
  if (current <= 3) {
    pages.push(1, 2, 3, 4, '...', total);
  } else if (current >= total - 2) {
    pages.push(1, '...', total - 3, total - 2, total - 1, total);
  } else {
    pages.push(1, '...', current - 1, current, current + 1, '...', total);
  }
  return pages;
}

function openEditModal(employee) {
  if (!employee) return;
  
  const modal = document.getElementById('edit-modal');
  const body = document.getElementById('edit-form-body');

  const fields = [
    { key: 'ops_id', label: 'OPS ID', type: 'text' },
    { key: 'nama', label: 'Nama', type: 'text' },
    { key: 'station', label: 'Station', type: 'text' },
    { key: 'hk', label: 'HK (Hari Kerja)', type: 'text' },
    { key: 'status', label: 'Status', type: 'text' },
    { key: 'no_rek', label: 'No Rekening', type: 'text' },
    { key: 'bank', label: 'Bank', type: 'text' },
    { key: 'atas_nama', label: 'Atas Nama', type: 'text' },
    { key: 'no_hp', label: 'No HP', type: 'text' },
    { key: 'nik', label: 'NIK', type: 'text' },
    { key: 'alamat', label: 'Alamat', type: 'textarea' },
  ];

  body.innerHTML = `
    <form id="edit-form" style="display:flex;flex-direction:column;gap:var(--space-md)">
      ${fields.map(f => `
        <div class="input-group">
          <label for="edit-${f.key}">${f.label}</label>
          ${f.type === 'textarea' 
            ? `<textarea id="edit-${f.key}" class="input" rows="2" style="resize:vertical">${esc(employee[f.key])}</textarea>`
            : `<input type="text" id="edit-${f.key}" class="input" value="${esc(employee[f.key])}" />`
          }
        </div>
      `).join('')}
    </form>
  `;

  modal.classList.add('show');
  modal.dataset.employeeId = employee.id;

  // Save handler
  const saveBtn = document.getElementById('modal-save');
  const newSaveBtn = saveBtn.cloneNode(true);
  saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
  newSaveBtn.id = 'modal-save';

  newSaveBtn.addEventListener('click', async () => {
    const updates = {};
    fields.forEach(f => {
      const el = document.getElementById(`edit-${f.key}`);
      if (el) updates[f.key] = el.value.trim();
    });

    newSaveBtn.disabled = true;
    newSaveBtn.innerHTML = '<div class="spinner"></div>';
    
    try {
      await api.updateEmployee(employee.id, updates);
      toast('Data berhasil diperbarui', 'success');
      closeModal();
      loadData();
    } catch (err) {
      toast(err.message || 'Gagal menyimpan', 'error');
      newSaveBtn.disabled = false;
      newSaveBtn.textContent = 'Simpan';
    }
  });
}

function closeModal() {
  document.getElementById('edit-modal')?.classList.remove('show');
}

async function handleDelete(id) {
  if (!confirm('Yakin ingin menghapus data karyawan ini, Sir?')) return;
  
  try {
    await api.deleteEmployee(id);
    toast('Data berhasil dihapus', 'success');
    loadData();
  } catch (err) {
    toast(err.message || 'Gagal menghapus', 'error');
  }
}

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
