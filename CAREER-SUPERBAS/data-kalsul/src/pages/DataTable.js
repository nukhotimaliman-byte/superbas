/* ═══════════════════════════════════════════════════
   DataTable v3 — Clean, no emoji, delete dataset
   ═══════════════════════════════════════════════════ */
import { api } from '../utils/api.js';

let currentDatasetId = null;
let currentSort = { col: 'nama', dir: 'ASC' };
let currentSearch = '';
let currentRekFilter = '';
let expandedOpsId = null;
let _allDatasets = [];
let _availableMonths = [];
let _currentMonthIdx = 0;
let _currentPeriode = '';

export function renderDataTable() {
  return `
    <div class="page-header">
      <div><h1>Data Karyawan</h1><p class="page-desc">Kelola data karyawan dan rekening</p></div>
      <a href="${api.exportCSV()}" class="btn btn-outline btn-sm" target="_blank">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Export
      </a>
    </div>

    <!-- Period Selector (owner only) -->
    <div class="period-bar" id="period-bar" style="display:none">
      <div class="period-nav">
        <button class="period-nav-btn" id="period-prev" title="Bulan sebelumnya">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span class="period-label" id="period-label"></span>
        <button class="period-nav-btn" id="period-next" title="Bulan berikutnya">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
      <div class="period-toggles" id="period-toggles"></div>
    </div>

    <!-- Subtabs -->
    <div class="subtabs-wrapper">
      <div class="subtabs" id="dataset-tabs">
        ${renderSubtabSkeleton()}
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-bar">
      <div class="filter-group">
        <input type="text" id="search-input" class="input input-sm" placeholder="Cari nama atau OPS ID..." />
      </div>
      <div class="filter-group">
        <select id="rek-filter" class="input input-sm">
          <option value="">Semua Status Rek</option>
          <option value="done">DONE</option>
          <option value="kosong">KOSONG</option>
          <option value="abnormal">ABNORMAL</option>
          <option value="bermasalah">BERMASALAH (Abnormal + Kosong)</option>
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
              <th style="width:50px">AKSI</th>
            </tr>
          </thead>
          <tbody id="data-tbody">
            ${renderTableSkeleton()}
          </tbody>
        </table>
      </div>
    </div>

  `;
}

let _user = null;

export async function initDataTable(user) {
  _user = user;
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
}

async function loadDatasets() {
  try {
    const res = await api.getDatasets();
    const tabs = document.getElementById('dataset-tabs');
    if (!tabs) return;

    _allDatasets = res.datasets || [];

    if (_allDatasets.length === 0) {
      tabs.innerHTML = '<div style="padding:16px;color:var(--t3);font-size:13px">Belum ada data. Upload file terlebih dahulu.</div>';
      return;
    }

    const isKorlap = _user?.role === 'korlap';

    // --- Period navigation (owner/admin only) ---
    if (!isKorlap) {
      // Extract unique months (sorted newest first)
      const monthSet = new Set(_allDatasets.map(ds => ds.bulan));
      _availableMonths = [...monthSet].sort((a, b) => b.localeCompare(a));
      if (_currentMonthIdx >= _availableMonths.length) _currentMonthIdx = 0;

      const periodBar = document.getElementById('period-bar');
      if (periodBar) {
        periodBar.style.display = 'flex';

        // Month label
        const curMonth = _availableMonths[_currentMonthIdx];
        const monthLabel = new Date(curMonth).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
        document.getElementById('period-label').textContent = monthLabel;

        // Period toggles: find which periodes exist for this month
        const periodesForMonth = [...new Set(_allDatasets.filter(ds => ds.bulan === curMonth).map(ds => ds.periode))].sort();
        const toggles = document.getElementById('period-toggles');
        const allBtn = `<button class="period-btn${_currentPeriode === '' ? ' active' : ''}" data-periode="">Semua</button>`;
        const pBtns = periodesForMonth.map(p =>
          `<button class="period-btn${_currentPeriode === p ? ' active' : ''}" data-periode="${p}">${p}</button>`
        ).join('');
        toggles.innerHTML = allBtn + pBtns;

        // Period toggle events
        toggles.querySelectorAll('.period-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            _currentPeriode = btn.dataset.periode;
            renderFilteredTabs();
          });
        });

        // Month nav events
        document.getElementById('period-prev').onclick = () => {
          if (_currentMonthIdx < _availableMonths.length - 1) { _currentMonthIdx++; _currentPeriode = ''; loadDatasets(); }
        };
        document.getElementById('period-next').onclick = () => {
          if (_currentMonthIdx > 0) { _currentMonthIdx--; _currentPeriode = ''; loadDatasets(); }
        };

        // Disable buttons at edges
        document.getElementById('period-prev').disabled = _currentMonthIdx >= _availableMonths.length - 1;
        document.getElementById('period-next').disabled = _currentMonthIdx <= 0;
      }

      renderFilteredTabs();
    } else {
      // Korlap: no period nav, show datasets directly
      document.getElementById('period-bar').style.display = 'none';
      renderStationTabs(_allDatasets, true);
    }
  } catch (err) {
    console.error('Failed to load datasets:', err);
    const tabs = document.getElementById('dataset-tabs');
    if (tabs) tabs.innerHTML = `<div style="padding:16px;color:var(--danger);font-size:13px">Error: ${err.message || 'Gagal memuat dataset'}</div>`;
  }
}

function renderFilteredTabs() {
  const curMonth = _availableMonths[_currentMonthIdx];
  let filtered = _allDatasets.filter(ds => ds.bulan === curMonth);
  if (_currentPeriode) filtered = filtered.filter(ds => ds.periode === _currentPeriode);

  // Update toggles active state
  document.querySelectorAll('.period-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.periode === _currentPeriode);
  });

  renderStationTabs(filtered, false);
}

function renderStationTabs(datasets, isKorlap) {
  const tabs = document.getElementById('dataset-tabs');
  if (!tabs) return;

  if (datasets.length === 0) {
    tabs.innerHTML = '<div style="padding:16px;color:var(--t3);font-size:13px">Tidak ada data untuk periode ini.</div>';
    currentDatasetId = '__none__';
    loadEmployees();
    return;
  }

  const totalEmp = datasets.reduce((sum, ds) => sum + (parseInt(ds.total_employees) || 0), 0);

  // "Semua DC" tab only for owner/admin
  const allTab = !isKorlap ? `<button class="subtab active" data-id="all">
    <span class="subtab-station">Semua DC</span>
    <span class="subtab-meta">${datasets.length} station · ${totalEmp} org</span>
  </button>` : '';

  const stationTabs = datasets.map((ds, idx) => {
    const bulan = new Date(ds.bulan).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
    const activeClass = isKorlap && idx === 0 ? ' active' : '';
    return `<button class="subtab${activeClass}" data-id="${ds.id}">
      <span class="subtab-station">${esc(ds.station)}</span>
      <span class="subtab-meta">${bulan} · ${ds.periode} · ${ds.total_employees} org</span>
      <button class="subtab-del" data-del-id="${ds.id}" title="Hapus dataset">&times;</button>
    </button>`;
  }).join('');

  tabs.innerHTML = allTab + stationTabs;

  // Tab click
  tabs.querySelectorAll('.subtab').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (e.target.classList.contains('subtab-del')) return;
      tabs.querySelectorAll('.subtab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentDatasetId = btn.dataset.id === 'all' ? '' : btn.dataset.id;
      loadEmployees();
    });
  });

  // Delete dataset
  tabs.querySelectorAll('.subtab-del').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.delId;
      if (!confirm('Hapus dataset ini beserta semua data karyawannya?')) return;
      try {
        await api.deleteDataset(id);
        loadDatasets();
      } catch (err) { alert('Error: ' + err.message); }
    });
  });

  // Auto-select
  if (isKorlap) {
    currentDatasetId = datasets[0].id;
  } else {
    currentDatasetId = '';
  }
  loadEmployees();
}

async function loadEmployees() {
  const tbody = document.getElementById('data-tbody');
  if (!tbody) return;

  tbody.innerHTML = renderTableSkeleton();

  if (currentDatasetId === '__none__') {
    tbody.innerHTML = `<tr><td colspan="13"><div class="empty-state"><div class="empty-state-title">Tidak ada data untuk periode ini</div></div></td></tr>`;
    document.getElementById('data-count').textContent = '0 data';
    return;
  }

  try {
    const params = {
      dataset_id: currentDatasetId || '',
      search: currentSearch,
      sort_by: currentSort.col,
      sort_dir: currentSort.dir,
      rek_status: currentRekFilter,
      per_page: currentDatasetId ? 200 : 500,
    };

    const res = await api.getEmployees(params);
    let employees = res.employees || [];

    // De-duplicate by ops_id: merge stations when viewing all
    if (!currentDatasetId) {
      const map = new Map();
      for (const emp of employees) {
        const key = emp.ops_id;
        if (map.has(key)) {
          const existing = map.get(key);
          if (!existing._stations.includes(emp.station)) {
            existing._stations.push(emp.station);
          }
        } else {
          emp._stations = [emp.station];
          map.set(key, emp);
        }
      }
      employees = Array.from(map.values());
    } else {
      employees.forEach(e => { e._stations = [e.station]; });
    }

    document.getElementById('data-count').textContent = `${employees.length} data`;

    if (employees.length === 0) {
      tbody.innerHTML = `<tr><td colspan="13"><div class="empty-state"><div class="empty-state-title">Tidak ada data</div></div></td></tr>`;
      return;
    }

    tbody.innerHTML = employees.map((emp, idx) => renderEmployeeRow(emp, idx + 1)).join('');

    // Attach expand: click row or expand button
    tbody.querySelectorAll('tr[data-ops-id]').forEach(row => {
      row.addEventListener('click', (e) => {
        // Don't expand if clicking a link or button
        if (e.target.closest('a, button')) return;
        toggleExpand(row.dataset.opsId, row);
      });
      row.style.cursor = 'pointer';
    });
    tbody.querySelectorAll('.btn-expand').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleExpand(btn.dataset.opsId, btn.closest('tr'));
      });
    });
    // Delete employee
    tbody.querySelectorAll('.btn-del-emp').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.empId;
        if (!confirm('Hapus karyawan ini?')) return;
        try {
          await api.deleteEmployee(id);
          loadEmployees();
        } catch (err) { alert('Gagal hapus: ' + err.message); }
      });
    });
    // Status manual override
    tbody.querySelectorAll('.status-select').forEach(sel => {
      sel.addEventListener('click', (e) => e.stopPropagation());
      sel.addEventListener('change', async (e) => {
        e.stopPropagation();
        const empId = sel.dataset.empId;
        const newStatus = sel.value;
        sel.className = `status-select status-${newStatus}`;
        try {
          await api.updateEmployee(empId, { status: newStatus });
        } catch (err) { alert('Gagal update status: ' + err.message); }
      });
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="13" style="text-align:center;color:var(--danger);padding:20px">Error: ${err.message}</td></tr>`;
  }
}

function renderEmployeeRow(emp, no) {
  const statusClass = { done: 'badge-done', abnormal: 'badge-abnormal', kosong: 'badge-kosong' }[emp.rek_status] || 'badge-kosong';
  const statusLabel = (emp.rek_status || 'kosong').toUpperCase();
  const isManual = emp.status && ['done','abnormal','kosong'].includes(emp.status);
  const manualTag = isManual ? ' <span style="font-size:9px;opacity:.5">(M)</span>' : '';
  const rekStatusHtml = `<select class="status-select status-${emp.rek_status || 'kosong'}" data-emp-id="${emp.id}" data-current="${emp.rek_status || 'kosong'}">
    <option value="done"${emp.rek_status === 'done' ? ' selected' : ''}>DONE</option>
    <option value="abnormal"${emp.rek_status === 'abnormal' ? ' selected' : ''}>ABNORMAL</option>
    <option value="kosong"${emp.rek_status === 'kosong' || !emp.rek_status ? ' selected' : ''}>KOSONG</option>
  </select>`;

  const noRekClass = emp.has_pergantian ? 'cell-highlight' : '';
  const expandBtn = `<button class="btn-expand" data-ops-id="${esc(emp.ops_id)}" title="Lihat detail">&#9660;</button>`;

  const tgl = emp.rek_tanggal ? parseWIB(emp.rek_tanggal).toLocaleDateString('id-ID', {day:'2-digit',month:'short',year:'numeric'}) : '-';
  const digitBadge = emp.rek_digit_count > 0 ? `<span class="digit-badge">${emp.rek_digit_count}</span>` : '';

  // Station: parse comma-separated + merge dedup stations, deduplicate
  const rawStations = (emp.station || '').split(',').map(s => s.trim()).filter(Boolean);
  const dedupStations = (emp._stations || []).flatMap(s => s.split(',').map(x => x.trim()).filter(Boolean));
  const allStations = [...new Set([...rawStations, ...dedupStations])];
  const firstStation = allStations[0] || '-';
  const extraCount = allStations.length - 1;
  const stationBadge = extraCount > 0
    ? `<span class="badge badge-station-more">+${extraCount}</span>`
    : '';
  const stationHtml = `<span class="station-cell">${esc(firstStation)}${stationBadge}</span>`;

  return `
    <tr data-ops-id="${esc(emp.ops_id)}" data-stations="${esc(allStations.join('||'))}" class="${emp.has_pergantian ? 'row-pergantian' : ''}">
      <td>${no}</td>
      <td><span class="badge badge-primary">${esc(emp.ops_id)}</span></td>
      <td style="font-weight:500;color:var(--t1)">${esc(emp.nama)}</td>
      <td>${stationHtml}</td>
      <td style="text-align:center;font-weight:700">${emp.hk || 0}</td>
      <td>${rekStatusHtml}</td>
      <td style="font-size:12px">${tgl}</td>
      <td class="${noRekClass}">
        <span class="norek-cell">${esc(emp.no_rek) || '-'} ${digitBadge}</span>
        ${expandBtn}
      </td>
      <td>${esc(emp.bank) || '-'}</td>
      <td>${esc(emp.atas_nama) || '-'}</td>
      <td style="font-size:12px">${esc(emp.no_hp) || '-'}</td>
      <td style="font-size:12px;font-family:monospace">${esc(emp.nik) || '-'}</td>
      <td><button class="btn-del-emp" data-emp-id="${emp.id}" title="Hapus karyawan"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg></button></td>
    </tr>
  `;
}

async function toggleExpand(opsId, row) {
  const existing = document.querySelector('.expanded-row');
  if (existing) {
    existing.remove();
    if (expandedOpsId === opsId) { expandedOpsId = null; return; }
  }
  expandedOpsId = opsId;

  const expandedTr = document.createElement('tr');
  expandedTr.className = 'expanded-row';
  expandedTr.innerHTML = `<td colspan="13"><div class="rek-history-loading">Memuat detail...</div></td>`;
  row.after(expandedTr);

  try {
    // Get stations from row data
    const stations = (row.dataset.stations || '').split('||').filter(Boolean);

    // Get rekening history
    const res = await api.getRekeningHistory(opsId);
    const history = res.history || [];

    // Build stations section
    let stationsHtml = '';
    if (stations.length > 1) {
      stationsHtml = `
        <div class="expand-section">
          <div class="expand-section-title">Penempatan (${stations.length} station)</div>
          <div class="expand-stations">
            ${stations.map(s => `<span class="badge badge-station">${esc(s)}</span>`).join('')}
          </div>
        </div>
      `;
    }

    // Build rekening history section
    let rekHtml = '';
    if (history.length > 0) {
      const rows = history.map(r => {
        const srcBadge = r.source === 'link_pergantian_rek'
          ? '<span class="src-badge src-pergantian">PERGANTIAN REK</span>'
          : '<span class="src-badge src-gaji">LINK GAJI</span>';
        const tgl = r.timestamp_gas ? parseWIB(r.timestamp_gas).toLocaleDateString('id-ID', {day:'2-digit',month:'short',year:'numeric'}) : '-';
        const digitCount = r.rek_digit_count || String(r.no_rek || '').length;

        return `<tr>
          <td>${srcBadge}</td>
          <td>${tgl}</td>
          <td>${esc(r.no_rek) || '-'} <span class="digit-badge">${digitCount}</span></td>
          <td>${esc(r.bank) || '-'}</td>
          <td>${esc(r.atas_nama) || '-'}</td>
        </tr>`;
      }).join('');

      rekHtml = `
        <div class="expand-section">
          <div class="expand-section-title">Riwayat Rekening (${history.length} record)</div>
          <table class="rek-history-table">
            <thead><tr><th>Sumber</th><th>Tanggal</th><th>No Rekening</th><th>Bank</th><th>Atas Nama</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
    } else {
      rekHtml = `<div class="expand-section"><div class="expand-section-title" style="color:var(--t3)">Belum ada data rekening</div></div>`;
    }

    expandedTr.innerHTML = `<td colspan="13">
      <div class="rek-history">
        <div class="rek-history-title">Detail — ${esc(opsId)}</div>
        ${stationsHtml}
        ${rekHtml}
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



function renderSubtabSkeleton() {
  return Array.from({length: 4}, (_, i) => `
    <div class="skel-subtab" style="animation-delay:${i*0.1}s">
      <div class="skel-cell skel-cell-lg"></div>
      <div class="skel-cell skel-cell-md" style="margin-top:4px"></div>
    </div>`).join('');
}

function renderTableSkeleton() {
  return Array.from({length: 8}, (_, i) => `
    <tr style="animation: skeleton-pulse 1.5s ease-in-out infinite ${i*0.1}s">
      <td><div class="skel-cell skel-cell-sm"></div></td>
      <td><div class="skel-cell skel-cell-md" style="height:20px;border-radius:4px"></div></td>
      <td><div class="skel-cell skel-cell-xl"></div></td>
      <td><div class="skel-cell skel-cell-lg"></div></td>
      <td><div class="skel-cell skel-cell-sm" style="margin:0 auto"></div></td>
      <td><div class="skel-cell skel-cell-md" style="height:20px;border-radius:4px"></div></td>
      <td><div class="skel-cell skel-cell-md"></div></td>
      <td><div class="skel-cell skel-cell-lg"></div></td>
      <td><div class="skel-cell skel-cell-md"></div></td>
      <td><div class="skel-cell skel-cell-lg"></div></td>
      <td><div class="skel-cell skel-cell-md"></div></td>
      <td><div class="skel-cell skel-cell-lg"></div></td>
      <td><div class="skel-cell skel-cell-sm"></div></td>
    </tr>`).join('');
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str ?? '';
  return d.innerHTML;
}

// Parse MySQL datetime as WIB (UTC+7)
function parseWIB(ts) {
  if (!ts) return null;
  return new Date(ts.replace(' ', 'T') + '+07:00');
}

