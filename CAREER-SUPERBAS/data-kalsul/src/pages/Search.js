/* ═══════════════════════════════════════════════════
   Search Page — Single & Bulk OPS ID Lookup
   Auto-parse OPS IDs from pasted text
   ═══════════════════════════════════════════════════ */
import { api } from '../utils/api.js';

let _bulkMode = false;

export function renderSearch() {
  return `
    <div class="page-header">
      <div><h1>Cari Data</h1><p class="page-desc">Cari data rekening karyawan berdasarkan OPS ID</p></div>
    </div>

    <div class="card">
      <div class="card-title" style="display:flex;align-items:center;justify-content:space-between">
        <span>Pencarian</span>
        <button class="btn btn-outline btn-sm" id="btn-toggle-bulk">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          Mode Bulk
        </button>
      </div>

      <!-- Single mode -->
      <div class="search-box" id="single-mode">
        <div class="search-input-wrap">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="search-ops" class="input search-input" placeholder="Ketik OPS ID (contoh: 1698202 atau Ops1698202)" autofocus />
          <button class="btn btn-primary" id="btn-search">Cari</button>
        </div>
        <p class="search-hint">Tekan Enter atau klik Cari untuk mencari data dari kedua sheet (Link Gaji & Pergantian Rekening)</p>
      </div>

      <!-- Bulk mode -->
      <div class="search-box" id="bulk-mode" style="display:none">
        <textarea id="bulk-input" class="input bulk-textarea" rows="6" placeholder="Paste OPS ID di sini — bisa dari Excel, WhatsApp, atau teks apapun&#10;&#10;Contoh:&#10;Ops1698202&#10;1851978, 1234567&#10;OPS: : 1826863&#10;&#10;Format WhatsApp korlap juga otomatis ke-detect!"></textarea>
        <div class="bulk-bar">
          <span class="bulk-parsed" id="bulk-parsed">0 OPS ID terdeteksi</span>
          <button class="btn btn-primary" id="btn-bulk-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            Cari Semua
          </button>
        </div>
        <p class="search-hint">Paste langsung dari Excel, Spreadsheet, atau chat WhatsApp — auto-parse OPS ID otomatis</p>
      </div>
    </div>

    <div id="search-result" style="display:none">
      <!-- Employee Info (single mode) -->
      <div class="card" id="emp-info-card" style="display:none">
        <div class="card-title">Data Karyawan</div>
        <div class="info-grid" id="emp-info"></div>
      </div>

      <!-- Rekening Records (single mode) -->
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

      <!-- Bulk Results -->
      <div class="card" id="bulk-result-card" style="display:none">
        <div class="card-title" id="bulk-result-title">Hasil Pencarian Bulk</div>
        <div class="bulk-summary" id="bulk-summary"></div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>NO</th>
                <th>OPS ID</th>
                <th>NAMA</th>
                <th>STATUS REK</th>
                <th>NO REKENING</th>
                <th>BANK</th>
                <th>ATAS NAMA</th>
                <th>TANGGAL</th>
                <th>SUMBER</th>
              </tr>
            </thead>
            <tbody id="bulk-tbody"></tbody>
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
  const bulkInput = document.getElementById('bulk-input');
  const btnBulk = document.getElementById('btn-bulk-search');
  const toggleBtn = document.getElementById('btn-toggle-bulk');

  btn?.addEventListener('click', doSearch);
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doSearch();
  });

  // Bulk toggle
  toggleBtn?.addEventListener('click', () => {
    _bulkMode = !_bulkMode;
    document.getElementById('single-mode').style.display = _bulkMode ? 'none' : 'block';
    document.getElementById('bulk-mode').style.display = _bulkMode ? 'block' : 'none';
    toggleBtn.innerHTML = _bulkMode
      ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> Mode Single`
      : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> Mode Bulk`;
    // Clear results
    hideResults();
  });

  // Auto-parse on input
  bulkInput?.addEventListener('input', () => {
    const ids = parseOpsIds(bulkInput.value);
    document.getElementById('bulk-parsed').textContent = `${ids.length} OPS ID terdeteksi`;
  });

  // Bulk search
  btnBulk?.addEventListener('click', doBulkSearch);

  setTimeout(() => input?.focus(), 100);
}

function hideResults() {
  document.getElementById('search-result').style.display = 'none';
  document.getElementById('emp-info-card').style.display = 'none';
  document.getElementById('rek-card').style.display = 'none';
  document.getElementById('bulk-result-card').style.display = 'none';
  document.getElementById('search-empty').style.display = 'none';
}

// Parse OPS IDs from any text — smart extraction
function parseOpsIds(text) {
  const ids = new Set();

  // 1. WhatsApp format: "OPS:" or "OPS: :" followed by digits
  const opsContextRegex = /ops\s*:?\s*:?\s*(\d{5,8})/gi;
  let m;
  while ((m = opsContextRegex.exec(text)) !== null) {
    ids.add(m[1]);
  }

  // 2. Ops-prefixed: Ops1234567
  const opsPrefixRegex = /\bops(\d{5,8})\b/gi;
  while ((m = opsPrefixRegex.exec(text)) !== null) {
    ids.add(m[1]);
  }

  // 3. If no context matches found, try standalone 6-8 digit numbers
  //    (only when text looks like a simple list, not WhatsApp chat)
  if (ids.size === 0) {
    const hasContext = /nama|norek|bank|atas.nama|lokasi|periode/i.test(text);
    if (!hasContext) {
      const standaloneRegex = /\b(\d{6,8})\b/g;
      while ((m = standaloneRegex.exec(text)) !== null) {
        ids.add(m[1]);
      }
    }
  }

  return [...ids];
}

async function doSearch() {
  const raw = document.getElementById('search-ops')?.value.trim();
  if (!raw) return;

  const resultDiv = document.getElementById('search-result');
  resultDiv.style.display = 'block';
  hideResults();
  resultDiv.style.display = 'block';

  const opsId = raw.replace(/^ops/i, '').trim();
  const opsIdFull = raw.match(/^ops/i) ? raw : `Ops${opsId}`;

  try {
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

    if (!emp && history.length === 0) {
      document.getElementById('search-empty').style.display = 'block';
      document.getElementById('empty-msg').textContent = `OPS ID "${raw}" tidak ditemukan di kedua sheet`;
    }

  } catch (err) {
    document.getElementById('search-empty').style.display = 'block';
    document.getElementById('empty-msg').textContent = `Error: ${err.message}`;
  }

  resultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function doBulkSearch() {
  const text = document.getElementById('bulk-input')?.value || '';
  const ids = parseOpsIds(text);
  if (ids.length === 0) return;

  const resultDiv = document.getElementById('search-result');
  resultDiv.style.display = 'block';
  hideResults();
  resultDiv.style.display = 'block';

  const bulkCard = document.getElementById('bulk-result-card');
  bulkCard.style.display = 'block';
  document.getElementById('bulk-result-title').textContent = `Mencari ${ids.length} OPS ID...`;
  document.getElementById('bulk-tbody').innerHTML = `<tr><td colspan="9" style="text-align:center;padding:30px;color:var(--t3)">
    <div class="loading-spinner" style="margin:0 auto 10px"></div>Memproses ${ids.length} OPS ID...</td></tr>`;

  const results = [];
  let found = 0;
  let notFound = 0;

  // Process in batches to avoid overwhelming the API
  for (const id of ids) {
    try {
      const opsIdFull = `Ops${id}`;
      const rekRes = await api.getRekeningHistory(opsIdFull).catch(() => ({ history: [] }));
      const history = rekRes.history || [];

      if (history.length > 0) {
        const latest = history[0]; // newest first
        results.push({
          opsId: id,
          found: true,
          noRek: latest.no_rek || '-',
          bank: latest.bank || '-',
          atasNama: latest.atas_nama || '-',
          tanggal: latest.timestamp_gas || '-',
          source: latest.source || '-',
          historyCount: history.length,
        });
        found++;
      } else {
        // Try employee data
        const empRes = await api.getEmployees({ search: id, per_page: 5 }).catch(() => ({ employees: [] }));
        const emp = empRes.employees?.find(e => e.ops_id.replace(/^ops/i, '') === id);
        if (emp) {
          results.push({
            opsId: id,
            found: true,
            nama: emp.nama,
            noRek: emp.no_rek || '-',
            bank: emp.bank || '-',
            atasNama: emp.atas_nama || '-',
            tanggal: emp.rek_tanggal || '-',
            source: '-',
            rekStatus: emp.rek_status,
            historyCount: 0,
          });
          found++;
        } else {
          results.push({ opsId: id, found: false });
          notFound++;
        }
      }
    } catch {
      results.push({ opsId: id, found: false });
      notFound++;
    }
  }

  // Render summary
  document.getElementById('bulk-result-title').textContent = `Hasil Pencarian Bulk (${ids.length} OPS ID)`;
  document.getElementById('bulk-summary').innerHTML = `
    <div class="bulk-stats">
      <span class="bulk-stat bulk-stat-found">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        ${found} ditemukan
      </span>
      <span class="bulk-stat bulk-stat-notfound">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        ${notFound} tidak ditemukan
      </span>
    </div>
  `;

  // Render table
  document.getElementById('bulk-tbody').innerHTML = results.map((r, i) => {
    if (!r.found) {
      return `<tr class="row-notfound">
        <td>${i + 1}</td>
        <td><span class="badge badge-primary">Ops${esc(r.opsId)}</span></td>
        <td colspan="7" style="color:var(--t3);font-style:italic">Tidak ditemukan di kedua sheet</td>
      </tr>`;
    }

    const statusBadge = {
      done: '<span class="badge badge-done">DONE</span>',
      abnormal: '<span class="badge badge-abnormal">ABNORMAL</span>',
      kosong: '<span class="badge badge-kosong">KOSONG</span>',
    }[r.rekStatus] || (r.noRek && r.noRek !== '-' ? '<span class="badge badge-done">ADA</span>' : '<span class="badge badge-kosong">KOSONG</span>');

    const srcBadge = r.source === 'link_pergantian_rek'
      ? '<span class="src-badge src-pergantian">PERGANTIAN</span>'
      : r.source === 'link_gaji'
      ? '<span class="src-badge src-gaji">LINK GAJI</span>'
      : '-';

    const tgl = (r.tanggal && r.tanggal !== '-')
      ? new Date(r.tanggal.replace(' ', 'T')).toLocaleDateString('id-ID', {day:'2-digit', month:'short', year:'numeric'})
      : '-';

    return `<tr>
      <td>${i + 1}</td>
      <td><span class="badge badge-primary">Ops${esc(r.opsId)}</span></td>
      <td style="font-weight:500;color:var(--t1)">${esc(r.nama || r.atasNama || '-')}</td>
      <td>${statusBadge}</td>
      <td style="font-family:monospace">${esc(r.noRek)}</td>
      <td>${esc(r.bank)}</td>
      <td>${esc(r.atasNama)}</td>
      <td style="font-size:12px">${tgl}</td>
      <td>${srcBadge}</td>
    </tr>`;
  }).join('');

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
