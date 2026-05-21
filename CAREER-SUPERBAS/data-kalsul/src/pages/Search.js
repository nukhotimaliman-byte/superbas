/* ═══════════════════════════════════════════════════
   Search Page — Manual OPS ID Lookup
   Shows data from both sheets (link_gaji & link_pergantian_rek)
   ═══════════════════════════════════════════════════ */
import { api } from '../utils/api.js';

export function renderSearch() {
  return `
    <div class="page-header">
      <div><h1>Cari Data</h1><p class="page-desc">Cari data rekening karyawan berdasarkan OPS ID</p></div>
    </div>

    <div class="card">
      <div class="card-title">Pencarian</div>
      <div class="search-box">
        <div class="search-input-wrap">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="search-ops" class="input search-input" placeholder="Ketik OPS ID (contoh: 1698202 atau Ops1698202)" autofocus />
          <button class="btn btn-primary" id="btn-search">Cari</button>
        </div>
        <p class="search-hint">Tekan Enter atau klik Cari untuk mencari data dari kedua sheet (Link Gaji & Pergantian Rekening)</p>
      </div>
    </div>

    <div id="search-result" style="display:none">
      <!-- Employee Info -->
      <div class="card" id="emp-info-card" style="display:none">
        <div class="card-title">Data Karyawan</div>
        <div class="info-grid" id="emp-info"></div>
      </div>

      <!-- Rekening Records -->
      <div class="card" id="rek-card" style="display:none">
        <div class="card-title" id="rek-title">Riwayat Rekening</div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>NO</th>
                <th>SUMBER</th>
                <th>TANGGAL</th>
                <th>EMAIL</th>
                <th>NO REKENING</th>
                <th>BANK</th>
                <th>ATAS NAMA</th>
                <th>NO HP</th>
                <th>NIK</th>
                <th>ALAMAT</th>
              </tr>
            </thead>
            <tbody id="rek-tbody"></tbody>
          </table>
        </div>
      </div>

      <!-- Empty state -->
      <div class="card" id="search-empty" style="display:none">
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <div class="empty-state-title" id="empty-msg">Tidak ditemukan</div>
        </div>
      </div>
    </div>
  `;
}

export function initSearch() {
  const input = document.getElementById('search-ops');
  const btn = document.getElementById('btn-search');

  btn?.addEventListener('click', doSearch);
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doSearch();
  });

  setTimeout(() => input?.focus(), 100);
}

async function doSearch() {
  const raw = document.getElementById('search-ops')?.value.trim();
  if (!raw) return;

  const resultDiv = document.getElementById('search-result');
  resultDiv.style.display = 'block';

  // Hide all result sections
  document.getElementById('emp-info-card').style.display = 'none';
  document.getElementById('rek-card').style.display = 'none';
  document.getElementById('search-empty').style.display = 'none';

  // Normalize: strip "Ops" prefix for search
  const opsId = raw.replace(/^ops/i, '').trim();
  const opsIdFull = raw.match(/^ops/i) ? raw : `Ops${opsId}`;

  try {
    // Search employee data
    const empRes = await api.getEmployees({ search: opsId, per_page: 10 }).catch(() => ({ employees: [] }));
    const emp = empRes.employees?.find(e =>
      e.ops_id.replace(/^ops/i, '') === opsId
    );

    if (emp) {
      document.getElementById('emp-info-card').style.display = 'block';
      document.getElementById('emp-info').innerHTML = renderInfoGrid([
        { label: 'OPS ID', value: emp.ops_id, badge: true },
        { label: 'Nama', value: emp.nama, bold: true },
        { label: 'Station', value: emp.station },
        { label: 'HK', value: emp.hk },
        { label: 'Status Rekening', value: emp.rek_status?.toUpperCase(), status: emp.rek_status },
        { label: 'No Rekening', value: emp.no_rek || '-' },
        { label: 'Bank', value: emp.bank || '-' },
        { label: 'Atas Nama', value: emp.atas_nama || '-' },
      ]);
    }

    // Search rekening history (try both formats)
    const rekRes = await api.getRekeningHistory(opsIdFull).catch(() => ({ history: [] }));
    const history = rekRes.history || [];

    if (history.length > 0) {
      document.getElementById('rek-card').style.display = 'block';
      document.getElementById('rek-title').textContent = `Riwayat Rekening (${history.length} record)`;

      document.getElementById('rek-tbody').innerHTML = history.map((r, i) => {
        const srcBadge = r.source === 'link_pergantian_rek'
          ? '<span class="src-badge src-pergantian">PERGANTIAN REK</span>'
          : '<span class="src-badge src-gaji">LINK GAJI</span>';
        const tgl = r.timestamp_gas
          ? new Date(r.timestamp_gas.replace(' ', 'T')).toLocaleDateString('id-ID', {day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'})
          : '-';

        return `<tr>
          <td>${i + 1}</td>
          <td>${srcBadge}</td>
          <td style="font-size:12px">${tgl}</td>
          <td style="font-size:12px">${esc(r.email) || '-'}</td>
          <td><span style="font-family:monospace">${esc(r.no_rek) || '-'}</span> <span class="digit-badge">${(r.no_rek || '').length}</span></td>
          <td>${esc(r.bank) || '-'}</td>
          <td style="font-weight:500">${esc(r.atas_nama) || '-'}</td>
          <td style="font-size:12px">${esc(r.no_hp) || '-'}</td>
          <td style="font-size:12px;font-family:monospace">${esc(r.nik) || '-'}</td>
          <td style="font-size:12px;max-width:200px;overflow:hidden;text-overflow:ellipsis">${esc(r.alamat) || '-'}</td>
        </tr>`;
      }).join('');
    }

    // Nothing found at all
    if (!emp && history.length === 0) {
      document.getElementById('search-empty').style.display = 'block';
      document.getElementById('empty-msg').textContent = `OPS ID "${raw}" tidak ditemukan di kedua sheet`;
    }

  } catch (err) {
    document.getElementById('search-empty').style.display = 'block';
    document.getElementById('empty-msg').textContent = `Error: ${err.message}`;
  }

  // Scroll to result
  resultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderInfoGrid(items) {
  return items.map(item => {
    let valueHtml = esc(String(item.value ?? '-'));
    if (item.badge) valueHtml = `<span class="badge badge-primary">${valueHtml}</span>`;
    if (item.bold) valueHtml = `<strong>${valueHtml}</strong>`;
    if (item.status) {
      const cls = { done: 'badge-done', abnormal: 'badge-abnormal', kosong: 'badge-kosong' }[item.status] || 'badge-kosong';
      valueHtml = `<span class="badge ${cls}">${valueHtml}</span>`;
    }
    return `<div class="info-item">
      <div class="info-label">${item.label}</div>
      <div class="info-value">${valueHtml}</div>
    </div>`;
  }).join('');
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str ?? '';
  return d.innerHTML;
}
