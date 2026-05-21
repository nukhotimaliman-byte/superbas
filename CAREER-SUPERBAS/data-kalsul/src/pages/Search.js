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
                <th>NAMA (WA)</th>
                <th>STATUS</th>
                <th>NO REKENING</th>
                <th>BANK</th>
                <th>ATAS NAMA (REK)</th>
                <th>COCOK</th>
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

  bulkInput?.addEventListener('input', () => {
    const parsed = parseOpsIds(bulkInput.value);
    document.getElementById('bulk-parsed').textContent = `${parsed.length} OPS ID terdeteksi`;
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

// Parse OPS IDs + NAMA from any text — smart extraction
function parseOpsIds(text) {
  const results = new Map(); // id -> { id, nama }

  // Split into blocks by "FORMAT GAJI" or double newlines
  const blocks = text.split(/(?=FORMAT\s+GAJI)|(?:\n\s*\n)/i);

  for (const block of blocks) {
    // Extract OPS ID
    const opsMatch = block.match(/ops\s*:?\s*:?\s*(\d{5,8})/i);
    if (opsMatch) {
      const id = opsMatch[1];
      // Extract NAMA
      const namaMatch = block.match(/NAMA\s*:\s*(.+)/i);
      const nama = namaMatch ? namaMatch[1].trim() : '';
      if (!results.has(id)) {
        results.set(id, { id, nama });
      }
    }
  }

  // Also try Ops-prefixed standalone: Ops1234567
  const opsPrefixRegex = /\bops(\d{5,8})\b/gi;
  let m;
  while ((m = opsPrefixRegex.exec(text)) !== null) {
    if (!results.has(m[1])) {
      results.set(m[1], { id: m[1], nama: '' });
    }
  }

  // Fallback: simple list of numbers (no WhatsApp context)
  if (results.size === 0) {
    const hasContext = /nama|norek|bank|atas.nama|lokasi|periode/i.test(text);
    if (!hasContext) {
      const standaloneRegex = /\b(\d{6,8})\b/g;
      while ((m = standaloneRegex.exec(text)) !== null) {
        if (!results.has(m[1])) {
          results.set(m[1], { id: m[1], nama: '' });
        }
      }
    }
  }

  return [...results.values()];
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
  const parsed = parseOpsIds(text);
  if (parsed.length === 0) return;

  const resultDiv = document.getElementById('search-result');
  resultDiv.style.display = 'block';
  hideResults();
  resultDiv.style.display = 'block';

  const bulkCard = document.getElementById('bulk-result-card');
  bulkCard.style.display = 'block';
  document.getElementById('bulk-result-title').textContent = `Mencari ${parsed.length} OPS ID...`;
  document.getElementById('bulk-tbody').innerHTML = `<tr><td colspan="9" style="text-align:center;padding:30px;color:var(--t3)">
    <div class="loading-spinner" style="margin:0 auto 10px"></div>Memproses ${parsed.length} OPS ID...</td></tr>`;

  const results = [];
  let found = 0, notFound = 0, matched = 0, mismatched = 0;

  for (const entry of parsed) {
    try {
      const opsIdFull = `Ops${entry.id}`;
      const rekRes = await api.getRekeningHistory(opsIdFull).catch(() => ({ history: [] }));
      const history = rekRes.history || [];

      if (history.length > 0) {
        const latest = history[0];
        const nameMatch = compareNames(entry.nama, latest.atas_nama || '');
        if (nameMatch === 'match') matched++;
        else if (nameMatch === 'mismatch') mismatched++;
        results.push({
          opsId: entry.id, waNama: entry.nama, found: true,
          noRek: latest.no_rek || '-', bank: latest.bank || '-',
          atasNama: latest.atas_nama || '-', source: latest.source || '-',
          nameMatch, history,
        });
        found++;
      } else {
        const empRes = await api.getEmployees({ search: entry.id, per_page: 5 }).catch(() => ({ employees: [] }));
        const emp = empRes.employees?.find(e => e.ops_id.replace(/^ops/i, '') === entry.id);
        if (emp) {
          const nameMatch = compareNames(entry.nama, emp.atas_nama || '');
          if (nameMatch === 'match') matched++;
          else if (nameMatch === 'mismatch') mismatched++;
          results.push({
            opsId: entry.id, waNama: entry.nama, found: true,
            noRek: emp.no_rek || '-', bank: emp.bank || '-',
            atasNama: emp.atas_nama || '-', source: '-',
            rekStatus: emp.rek_status, nameMatch,
          });
          found++;
        } else {
          results.push({ opsId: entry.id, waNama: entry.nama, found: false });
          notFound++;
        }
      }
    } catch {
      results.push({ opsId: entry.id, waNama: entry.nama, found: false });
      notFound++;
    }
  }

  // Render summary
  document.getElementById('bulk-result-title').textContent = `Hasil Pencarian Bulk (${parsed.length} OPS ID)`;
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
      ${matched > 0 ? `<span class="bulk-stat bulk-stat-match">Nama cocok: ${matched}</span>` : ''}
      ${mismatched > 0 ? `<span class="bulk-stat bulk-stat-mismatch">Nama beda: ${mismatched}</span>` : ''}
    </div>
  `;

  // Render table
  document.getElementById('bulk-tbody').innerHTML = results.map((r, i) => {
    if (!r.found) {
      return `<tr class="row-notfound">
        <td>${i + 1}</td>
        <td><span class="badge badge-primary">Ops${esc(r.opsId)}</span></td>
        <td>${esc(r.waNama) || '-'}</td>
        <td colspan="6" style="color:var(--t3);font-style:italic">Tidak ditemukan</td>
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

    const matchBadge = {
      match: '<span class="badge badge-done">COCOK</span>',
      mismatch: '<span class="badge badge-abnormal">BEDA</span>',
      unknown: '<span class="badge" style="background:rgba(255,255,255,.06);color:var(--t3)">-</span>',
    }[r.nameMatch] || '-';

    return `<tr class="bulk-row" data-bulk-idx="${i}" style="cursor:pointer">
      <td>${i + 1}</td>
      <td><span class="badge badge-primary">Ops${esc(r.opsId)}</span></td>
      <td style="font-weight:500;color:var(--t1)">${esc(r.waNama) || '-'}</td>
      <td>${statusBadge}</td>
      <td style="font-family:monospace">${esc(r.noRek)}</td>
      <td>${esc(r.bank)}</td>
      <td style="font-weight:500">${esc(r.atasNama)}</td>
      <td>${matchBadge}</td>
      <td>${srcBadge}</td>
    </tr>
    <tr class="bulk-detail" id="bulk-detail-${i}" style="display:none">
      <td colspan="9">${renderBulkDetail(r)}</td>
    </tr>`;
  }).join('');

  // Bind expand clicks
  document.querySelectorAll('.bulk-row').forEach(row => {
    row.addEventListener('click', () => {
      const idx = row.dataset.bulkIdx;
      const detail = document.getElementById(`bulk-detail-${idx}`);
      const isOpen = detail.style.display !== 'none';
      detail.style.display = isOpen ? 'none' : 'table-row';
      row.classList.toggle('expanded', !isOpen);
    });
  });

  resultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderBulkDetail(r) {
  if (!r.history || r.history.length === 0) {
    return `<div class="bulk-detail-inner"><span style="color:var(--t3)">Tidak ada riwayat rekening</span></div>`;
  }
  const rows = r.history.map((h, i) => {
    const srcBadge = h.source === 'link_pergantian_rek'
      ? '<span class="src-badge src-pergantian">PERGANTIAN REK</span>'
      : '<span class="src-badge src-gaji">LINK GAJI</span>';
    const tgl = h.timestamp_gas
      ? new Date(h.timestamp_gas.replace(' ', 'T')).toLocaleDateString('id-ID', {day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'})
      : '-';
    return `<tr>
      <td>${i + 1}</td>
      <td>${srcBadge}</td>
      <td style="font-size:12px">${tgl}</td>
      <td style="font-size:12px">${esc(h.email) || '-'}</td>
      <td style="font-family:monospace">${esc(h.no_rek) || '-'} <span class="digit-badge">${(h.no_rek || '').length}</span></td>
      <td>${esc(h.bank) || '-'}</td>
      <td style="font-weight:500">${esc(h.atas_nama) || '-'}</td>
      <td style="font-size:12px">${esc(h.no_hp) || '-'}</td>
    </tr>`;
  }).join('');

  return `<div class="bulk-detail-inner">
    <div class="bulk-detail-title">Riwayat Rekening (${r.history.length} record)</div>
    <table class="data-table detail-table">
      <thead><tr>
        <th>NO</th><th>SUMBER</th><th>TANGGAL</th><th>EMAIL</th>
        <th>NO REKENING</th><th>BANK</th><th>ATAS NAMA</th><th>NO HP</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

// Compare two names (fuzzy)
function compareNames(name1, name2) {
  if (!name1 || !name2) return 'unknown';
  const a = name1.toUpperCase().trim();
  const b = name2.toUpperCase().trim();
  if (a === b) return 'match';
  // Simple similarity: check if one contains the other or >80% chars match
  if (a.includes(b) || b.includes(a)) return 'match';
  // Levenshtein-like: count matching chars
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  if (longer.length === 0) return 'unknown';
  let matches = 0;
  const longerChars = longer.split('');
  const shorterChars = shorter.split('');
  for (let i = 0; i < shorterChars.length; i++) {
    if (longerChars.includes(shorterChars[i])) {
      matches++;
      longerChars.splice(longerChars.indexOf(shorterChars[i]), 1);
    }
  }
  const similarity = matches / longer.length;
  return similarity >= 0.7 ? 'match' : 'mismatch';
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
