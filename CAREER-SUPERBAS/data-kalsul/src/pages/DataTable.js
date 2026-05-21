/* ═══════════════════════════════════════════════════
   DataTable v2 — Subtabs, Sortable, Expandable Rows,
   Rek Status Filter, Fuzzy Match Badges
   ═══════════════════════════════════════════════════ */
import { api } from '../utils/api.js';

let currentDatasetId = null;
let currentSort = { col: 'nama', dir: 'ASC' };
let currentSearch = '';
let currentRekFilter = '';
let expandedOpsId = null;

export function renderDataTable() {
  return `
    <div class="page-header">
      <h1>Data Karyawan</h1>
      <a href="${api.exportCSV()}" class="btn btn-outline btn-sm" target="_blank">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Export
      </a>
    </div>

    <!-- Subtabs -->
    <div class="subtabs-wrapper">
      <div class="subtabs" id="dataset-tabs">
        <div class="subtab-loading">Memuat dataset...</div>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-bar">
      <div class="filter-group">
        <input type="text" id="search-input" class="input input-sm" placeholder="🔍 Cari nama atau OPS ID..." />
      </div>
      <div class="filter-group">
        <select id="rek-filter" class="input input-sm">
          <option value="">Semua Status Rek</option>
          <option value="done">✅ DONE</option>
          <option value="kosong">⬜ KOSONG</option>
          <option value="abnormal">🔴 ABNORMAL</option>
        </select>
      </div>
      <div class="filter-group">
        <span id="data-count" class="data-count"></span>
      </div>
    </div>

    <!-- Table -->
    <div class="card card-table">
      <div class="table-wrapper">
        <table class="data-table" id="main-table">
          <thead>
            <tr>
              <th class="th-sortable" data-sort="id" style="width:50px">NO</th>
              <th class="th-sortable" data-sort="ops_id">OPS ID</th>
              <th class="th-sortable" data-sort="nama">NAMA</th>
              <th class="th-sortable" data-sort="station">STATION</th>
              <th class="th-sortable" data-sort="hk" style="width:60px">HK</th>
              <th style="width:100px">STATUS REK</th>
              <th>TANGGAL</th>
              <th>NO REK</th>
              <th>BANK</th>
              <th>ATAS NAMA</th>
              <th>NO HP</th>
              <th>NIK</th>
              <th style="width:60px">AKSI</th>
            </tr>
          </thead>
          <tbody id="data-tbody">
            <tr><td colspan="13" style="text-align:center;padding:40px;color:var(--text-tertiary)">Pilih dataset di atas</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Edit Modal -->
    <div class="modal-overlay" id="edit-modal" style="display:none">
      <div class="modal">
        <div class="modal-header">
          <h3>Edit Karyawan</h3>
          <button class="btn-icon modal-close" id="modal-close">&times;</button>
        </div>
        <div class="modal-body" id="modal-body"></div>
        <div class="modal-footer">
          <button class="btn btn-outline" id="modal-cancel">Batal</button>
          <button class="btn btn-primary" id="modal-save">Simpan</button>
        </div>
      </div>
    </div>
  `;
}

export async function initDataTable() {
  await loadDatasets();

  // Sort headers
  document.querySelectorAll('.th-sortable').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.sort;
      if (currentSort.col === col) {
        currentSort.dir = currentSort.dir === 'ASC' ? 'DESC' : 'ASC';
      } else {
        currentSort = { col, dir: 'ASC' };
      }
      updateSortIndicators();
      loadEmployees();
    });
  });

  // Search
  let searchTimer;
  document.getElementById('search-input')?.addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { currentSearch = e.target.value; loadEmployees(); }, 300);
  });

  // Rek filter
  document.getElementById('rek-filter')?.addEventListener('change', (e) => {
    currentRekFilter = e.target.value;
    loadEmployees();
  });

  // Modal
  document.getElementById('modal-close')?.addEventListener('click', closeModal);
  document.getElementById('modal-cancel')?.addEventListener('click', closeModal);
}

async function loadDatasets() {
  try {
    const res = await api.getDatasets();
    const tabs = document.getElementById('dataset-tabs');
    if (!tabs) return;

    if (!res.datasets || res.datasets.length === 0) {
      tabs.innerHTML = '<div class="subtab-empty">Belum ada data. Upload file terlebih dahulu.</div>';
      return;
    }

    tabs.innerHTML = res.datasets.map(ds => {
      const bulan = new Date(ds.bulan).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
      return `<button class="subtab" data-id="${ds.id}">
        <span class="subtab-station">${esc(ds.station)}</span>
        <span class="subtab-meta">${bulan} · ${ds.periode} · ${ds.total_employees} org</span>
      </button>`;
    }).join('');

    // Tab click
    tabs.querySelectorAll('.subtab').forEach(btn => {
      btn.addEventListener('click', () => {
        tabs.querySelectorAll('.subtab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentDatasetId = btn.dataset.id;
        loadEmployees();
      });
    });

    // Auto-select first
    const first = tabs.querySelector('.subtab');
    if (first) { first.click(); }
  } catch (err) {
    console.error('Failed to load datasets:', err);
  }
}

async function loadEmployees() {
  const tbody = document.getElementById('data-tbody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="13" style="text-align:center;padding:40px;color:var(--text-tertiary)">Memuat data...</td></tr>`;

  try {
    const params = {
      dataset_id: currentDatasetId || '',
      search: currentSearch,
      sort_by: currentSort.col,
      sort_dir: currentSort.dir,
      rek_status: currentRekFilter,
      per_page: 200,
    };

    const res = await api.getEmployees(params);
    const employees = res.employees || [];

    document.getElementById('data-count').textContent = `${employees.length} data`;

    if (employees.length === 0) {
      tbody.innerHTML = `<tr><td colspan="13"><div class="empty-state"><div class="empty-state-title">Tidak ada data</div></div></td></tr>`;
      return;
    }

    tbody.innerHTML = employees.map((emp, idx) => renderEmployeeRow(emp, idx + 1)).join('');

    // Attach events
    tbody.querySelectorAll('.btn-expand').forEach(btn => {
      btn.addEventListener('click', () => toggleExpand(btn.dataset.opsId, btn.closest('tr')));
    });
    tbody.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => openEditModal(JSON.parse(btn.dataset.emp)));
    });
    tbody.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => deleteEmployee(btn.dataset.id));
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="13" style="text-align:center;color:var(--danger);padding:20px">Error: ${err.message}</td></tr>`;
  }
}

function renderEmployeeRow(emp, no) {
  const rekStatusBadge = {
    done: '<span class="badge badge-done">✅ DONE</span>',
    abnormal: '<span class="badge badge-abnormal">🔴 ABNORMAL</span>',
    kosong: '<span class="badge badge-kosong">⬜ KOSONG</span>',
  }[emp.rek_status] || '<span class="badge badge-kosong">⬜ KOSONG</span>';

  const noRekClass = emp.has_pergantian ? 'cell-highlight' : '';
  const expandBtn = emp.rek_status !== 'kosong'
    ? `<button class="btn-expand" data-ops-id="${esc(emp.ops_id)}" title="Lihat riwayat">▼</button>`
    : '';

  const tgl = emp.rek_tanggal ? new Date(emp.rek_tanggal).toLocaleDateString('id-ID', {day:'2-digit',month:'short',year:'numeric'}) : '-';
  const digitBadge = emp.rek_digit_count > 0 ? `<span class="digit-badge">${emp.rek_digit_count}</span>` : '';

  return `
    <tr data-ops-id="${esc(emp.ops_id)}" class="${emp.has_pergantian ? 'row-pergantian' : ''}">
      <td>${no}</td>
      <td><span class="badge badge-primary">${esc(emp.ops_id)}</span></td>
      <td style="font-weight:500">${esc(emp.nama)}</td>
      <td>${esc(emp.station)}</td>
      <td style="text-align:center;font-weight:700">${emp.hk || 0}</td>
      <td>${rekStatusBadge}</td>
      <td style="font-size:12px">${tgl}</td>
      <td class="${noRekClass}">
        <span class="norek-cell">${esc(emp.no_rek) || '-'} ${digitBadge}</span>
        ${expandBtn}
      </td>
      <td>${esc(emp.bank) || '-'}</td>
      <td>${esc(emp.atas_nama) || '-'}</td>
      <td style="font-size:12px">${esc(emp.no_hp) || '-'}</td>
      <td style="font-size:12px;font-family:monospace">${esc(emp.nik) || '-'}</td>
      <td>
        <div class="action-btns">
          <button class="btn-icon btn-edit" data-emp='${JSON.stringify(emp).replace(/'/g, "&#39;")}' title="Edit">✏️</button>
          <button class="btn-icon btn-delete" data-id="${emp.id}" title="Hapus">🗑️</button>
        </div>
      </td>
    </tr>
  `;
}

async function toggleExpand(opsId, row) {
  // Remove existing expanded row
  const existing = document.querySelector('.expanded-row');
  if (existing) {
    existing.remove();
    if (expandedOpsId === opsId) { expandedOpsId = null; return; }
  }
  expandedOpsId = opsId;

  // Fetch history
  const expandedTr = document.createElement('tr');
  expandedTr.className = 'expanded-row';
  expandedTr.innerHTML = `<td colspan="13"><div class="rek-history-loading">Memuat riwayat...</div></td>`;
  row.after(expandedTr);

  try {
    const res = await api.getRekeningHistory(opsId);
    const history = res.history || [];

    if (history.length === 0) {
      expandedTr.innerHTML = `<td colspan="13"><div class="rek-history-empty">Tidak ada riwayat rekening</div></td>`;
      return;
    }

    const rows = history.map(r => {
      const srcBadge = r.source === 'link_pergantian_rek'
        ? '<span class="src-badge src-pergantian">🔄 LINK PERGANTIAN REK</span>'
        : '<span class="src-badge src-gaji">💰 LINK GAJI</span>';
      const tgl = r.timestamp_gas ? new Date(r.timestamp_gas).toLocaleDateString('id-ID', {day:'2-digit',month:'short',year:'numeric'}) : '-';
      const digitCount = r.rek_digit_count || String(r.no_rek || '').length;

      return `<tr>
        <td>${srcBadge}</td>
        <td>${tgl}</td>
        <td>${esc(r.no_rek) || '-'} <span class="digit-badge">${digitCount}</span></td>
        <td>${esc(r.bank) || '-'}</td>
        <td>${esc(r.atas_nama) || '-'}</td>
      </tr>`;
    }).join('');

    expandedTr.innerHTML = `<td colspan="13">
      <div class="rek-history">
        <div class="rek-history-title">📋 Riwayat Rekening — ${esc(opsId)} (terbaru → terlama)</div>
        <table class="rek-history-table">
          <thead><tr><th>Sumber</th><th>Tanggal</th><th>No Rekening</th><th>Bank</th><th>Atas Nama</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </td>`;
  } catch (err) {
    expandedTr.innerHTML = `<td colspan="13"><div class="rek-history-error">Error: ${err.message}</div></td>`;
  }
}

function updateSortIndicators() {
  document.querySelectorAll('.th-sortable').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
    if (th.dataset.sort === currentSort.col) {
      th.classList.add(currentSort.dir === 'ASC' ? 'sort-asc' : 'sort-desc');
    }
  });
}

function openEditModal(emp) {
  const modal = document.getElementById('edit-modal');
  const body = document.getElementById('modal-body');
  if (!modal || !body) return;

  const fields = [
    { key: 'ops_id', label: 'OPS ID', type: 'text' },
    { key: 'nama', label: 'Nama', type: 'text' },
    { key: 'station', label: 'Station', type: 'text' },
    { key: 'hk', label: 'HK (Hari Kerja)', type: 'number' },
    { key: 'status', label: 'Status', type: 'text' },
  ];

  body.innerHTML = fields.map(f => `
    <div class="field-group">
      <label class="field-label">${f.label}</label>
      <input type="${f.type}" class="input" id="edit-${f.key}" value="${esc(emp[f.key] || '')}" />
    </div>
  `).join('');

  modal.style.display = 'flex';

  const saveBtn = document.getElementById('modal-save');
  saveBtn.onclick = async () => {
    const data = {};
    fields.forEach(f => { data[f.key] = document.getElementById(`edit-${f.key}`).value; });
    try {
      await api.updateEmployee(emp.id, data);
      closeModal();
      loadEmployees();
    } catch (err) { alert('Error: ' + err.message); }
  };
}

function closeModal() {
  const m = document.getElementById('edit-modal');
  if (m) m.style.display = 'none';
}

async function deleteEmployee(id) {
  if (!confirm('Yakin hapus karyawan ini?')) return;
  try {
    await api.deleteEmployee(id);
    loadEmployees();
  } catch (err) { alert('Error: ' + err.message); }
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str ?? '';
  return d.innerHTML;
}
