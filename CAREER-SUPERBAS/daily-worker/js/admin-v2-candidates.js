/**
 * BAS DW Admin V2 — Candidates Page (Excel-like)
 * Selection, Bulk, Inline Edit, Sort, Column Toggle, Import/Export, Pagination
 */

// ── Column definitions (order matters) ──
const COLUMNS = [
    { key:'_select', label:'', width:'40px', noToggle:true, noSort:true, noExport:true },
    { key:'given_id', label:'ID', sortable:true },
    { key:'station', label:'Station', sortable:true },
    { key:'korlap_notes', label:'Catatan', editable:true },
    { key:'user_created_at', label:'Tgl Akun', sortable:true },
    { key:'user_username', label:'Username' },
    { key:'user_password', label:'Password' },
    { key:'name', label:'Nama', sortable:true, editable:true },
    { key:'nik', label:'NIK', sortable:true },
    { key:'whatsapp', label:'WhatsApp', editable:true },
    { key:'email', label:'Email', editable:true },
    { key:'status', label:'Status', sortable:true, editable:'dropdown' },
    { key:'tempat_lahir', label:'Tempat Lahir', sortable:true },
    { key:'tanggal_lahir', label:'Tgl Lahir', sortable:true },
    { key:'area', label:'Area', sortable:true },
    { key:'kabupaten', label:'Kab/Kota', sortable:true },
    { key:'kecamatan', label:'Kecamatan', sortable:true },
    { key:'kelurahan', label:'Kelurahan' },
    { key:'address', label:'Alamat' },
    { key:'pendidikan_terakhir', label:'Pendidikan', sortable:true },
    { key:'pernah_kerja_spx', label:'SPX?' },
    { key:'surat_sehat', label:'Surat Sehat' },
    { key:'paklaring', label:'Paklaring' },
    { key:'referensi', label:'Referensi' },
    { key:'emergency_phone', label:'Kontak Darurat' },
    { key:'emergency_name', label:'Nama Kontak' },
    { key:'emergency_relation', label:'Hub. Kontak' },
    { key:'bank_name', label:'Bank' },
    { key:'bank_account_no', label:'No. Rek' },
    { key:'bank_account_name', label:'Atas Nama' },
    { key:'_action', label:'Aksi', width:'60px', noToggle:true, noSort:true, noExport:true },
];

const STATUS_COLORS = { 'Belum Pemberkasan':'#38BDF8', 'Sudah Pemberkasan':'#FBBF24', 'Menunggu Test Drive':'#A78BFA', 'Jadwal Test Drive':'#8B5CF6', 'Hadir':'#2DD4BF', 'Tidak Hadir':'#FB923C', 'Lulus':'#22C55E', 'Tidak Lulus':'#EF4444' };

let candData = [], candFiltered = [], candPage = 1, candPerPage = 50, candShowAll = false;
let candSort = { key: null, dir: 'asc' };
let selectedIds = new Set();
let colVisible = {};
let undoStack = [];

// ── Init ──
function initCandidates() {
    candData = filterByProvince(DUMMY.candidates.map(c => ({ ...c, station: c.station || c.location_name || '' })));
    
    // Load column visibility from localStorage
    const saved = localStorage.getItem('dw_col_visible');
    if (saved) { colVisible = JSON.parse(saved); }
    else { COLUMNS.forEach(c => { if (!c.noToggle) colVisible[c.key] = true; }); }

    // Populate filters
    const statusSel = document.getElementById('candStatusFilter');
    const bulkSel = document.getElementById('bulkStatusSel');
    DUMMY.statuses.forEach(s => {
        statusSel.add(new Option(s, s));
        bulkSel.add(new Option(s, s));
    });
    const stationSel = document.getElementById('candStationFilter');
    DUMMY.stations.forEach(s => stationSel.add(new Option(s, s)));
    
    // Area filter
    const provSel = document.getElementById('candProvinsiFilter');
    ALL_AREAS.forEach(a => provSel.add(new Option(a, a)));

    // Events
    document.getElementById('candSearch').addEventListener('input', () => { candPage = 1; applyFilter(); });
    statusSel.addEventListener('change', () => { candPage = 1; applyFilter(); });
    stationSel.addEventListener('change', () => { candPage = 1; applyFilter(); });
    provSel.addEventListener('change', () => { candPage = 1; applyFilter(); });
    
    // Keyboard undo
    document.addEventListener('keydown', e => { if ((e.ctrlKey||e.metaKey) && e.key === 'z') triggerUndo(); });
    
    // Close dropdowns on outside click
    document.addEventListener('click', e => {
        ['klProvDrop','colPanel'].forEach(id => {
            const el = document.getElementById(id);
            if (el && el.style.display !== 'none' && !el.contains(e.target) && !e.target.closest('[onclick*="' + id.replace('Drop','Dropdown').replace('Panel','ColPanel') + '"]')) {
                el.style.display = 'none';
            }
        });
    });

    buildColToggle();
    applyFilter();
}

// ── Filter ──
function applyFilter() {
    const q = document.getElementById('candSearch').value.toLowerCase();
    const status = document.getElementById('candStatusFilter').value;
    const station = document.getElementById('candStationFilter').value;
    const area = document.getElementById('candProvinsiFilter').value;

    candFiltered = candData.filter(c => {
        if (q && !(c.name||'').toLowerCase().includes(q) && !(c.nik||'').includes(q) && !(c.whatsapp||'').includes(q)) return false;
        if (status && c.status !== status) return false;
        if (station && c.station !== station) return false;
        if (area && getAreaForCandidate(c) !== area) return false;
        return true;
    });

    if (candSort.key) {
        candFiltered.sort((a, b) => {
            const va = (candSort.key === 'area' ? getAreaForCandidate(a) : (a[candSort.key] || '')).toString().toLowerCase();
            const vb = (candSort.key === 'area' ? getAreaForCandidate(b) : (b[candSort.key] || '')).toString().toLowerCase();
            const cmp = va < vb ? -1 : va > vb ? 1 : 0;
            return candSort.dir === 'asc' ? cmp : -cmp;
        });
    }

    render();
}

// ── Render ──
function render() {
    renderHeader();
    renderBody();
    renderPagination();
    updateBulkBar();
    document.getElementById('candidateCount').textContent = candFiltered.length + ' kandidat';
}

function renderHeader() {
    const tr = document.createElement('tr');
    COLUMNS.forEach(col => {
        if (col.key !== '_select' && col.key !== '_action' && !colVisible[col.key]) return;
        const th = document.createElement('th');
        th.style.whiteSpace = 'nowrap';
        if (col.width) th.style.width = col.width;

        if (col.key === '_select') {
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.id = 'selectAll';
            cb.onchange = () => toggleSelectAll(cb.checked);
            // Sync: check if all visible rows are selected
            const start = candShowAll ? 0 : (candPage - 1) * candPerPage;
            const end = candShowAll ? candFiltered.length : start + candPerPage;
            const visible = candFiltered.slice(start, end);
            cb.checked = visible.length > 0 && visible.every(c => selectedIds.has(c.id));
            th.appendChild(cb);
        } else if (col.sortable) {
            th.textContent = col.label;
            th.style.cursor = 'pointer';
            if (candSort.key === col.key) th.textContent += candSort.dir === 'asc' ? ' ▲' : ' ▼';
            th.onclick = () => { toggleSort(col.key); };
        } else {
            th.textContent = col.label;
        }
        tr.appendChild(th);
    });
    document.getElementById('candThead').innerHTML = '';
    document.getElementById('candThead').appendChild(tr);
}

function renderBody() {
    const tbody = document.getElementById('candTableBody');
    const start = candShowAll ? 0 : (candPage - 1) * candPerPage;
    const end = candShowAll ? candFiltered.length : start + candPerPage;
    const page = candFiltered.slice(start, end);

    if (page.length === 0) {
        tbody.innerHTML = '<tr><td colspan="' + visibleColCount() + '" class="tbl-empty">Tidak ada data</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    page.forEach(c => {
        const tr = document.createElement('tr');
        if (selectedIds.has(c.id)) tr.style.background = 'var(--accent-g)';

        COLUMNS.forEach(col => {
            if (col.key !== '_select' && col.key !== '_action' && !colVisible[col.key]) return;
            const td = document.createElement('td');
            td.style.whiteSpace = 'nowrap';

            if (col.key === '_select') {
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.checked = selectedIds.has(c.id);
                cb.onchange = () => toggleSelect(c.id, cb.checked);
                td.appendChild(cb);
            } else if (col.key === '_action') {
                const btn = document.createElement('button');
                btn.className = 'act-btn';
                btn.title = 'Detail';
                btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
                btn.onclick = () => showDetail(c.id);
                td.appendChild(btn);
                // Berkas button
                const btnDoc = document.createElement('button');
                btnDoc.className = 'act-btn';
                btnDoc.title = 'Lihat Berkas';
                btnDoc.style.marginLeft = '2px';
                btnDoc.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
                btnDoc.onclick = () => viewCandidateDocs(c.id);
                td.appendChild(btnDoc);
            } else if (col.key === 'status') {
                const bc = STATUS_COLORS[c.status] || '#8B5CF6';
                td.innerHTML = '<span class="badge" style="background:' + bc + '20;color:' + bc + ';cursor:pointer;" onclick="inlineEditStatus(this,' + c.id + ')">' + (c.status||'-') + '</span>';
            } else if (col.key === 'given_id') {
                td.style.fontWeight = '600';
                td.style.color = 'var(--accent)';
                td.textContent = c[col.key] || '-';
            } else if (col.key === 'nik' || col.key === 'bank_account_no') {
                td.style.fontVariantNumeric = 'tabular-nums';
                td.textContent = c[col.key] || '-';
            } else if (col.key === 'user_password') {
                td.style.whiteSpace = 'nowrap';
                const pw = c[col.key] || '';
                td.innerHTML = '<span style="display:inline-flex;align-items:center;gap:4px;">' +
                    '<span class="pw-display" data-pw="' + escHtml(pw) + '" style="font-family:monospace;font-size:.75rem;letter-spacing:.05em;">•••••</span>' +
                    '<button class="pw-toggle-btn" onclick="event.stopPropagation();toggleTablePw(this)" title="Tampilkan" style="padding:2px 4px;line-height:1;">' +
                    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>' +
                    '</button></span>';
            } else if (col.key === 'area') {
                td.textContent = getAreaForCandidate(c);
            } else if (col.editable === true) {
                td.textContent = c[col.key] || '-';
                td.style.cursor = 'pointer';
                td.ondblclick = () => inlineEdit(td, c, col.key);
            } else {
                td.textContent = c[col.key] || '-';
            }
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
}

function visibleColCount() {
    return COLUMNS.filter(c => c.key === '_select' || c.key === '_action' || colVisible[c.key]).length;
}

// ── Sort ──
function toggleSort(key) {
    if (candSort.key === key) candSort.dir = candSort.dir === 'asc' ? 'desc' : 'asc';
    else { candSort.key = key; candSort.dir = 'asc'; }
    applyFilter();
}

// ── Selection ──
function toggleSelect(id, checked) {
    if (checked) selectedIds.add(id); else selectedIds.delete(id);
    render();
}
function toggleSelectAll(checked) {
    const start = candShowAll ? 0 : (candPage - 1) * candPerPage;
    const end = candShowAll ? candFiltered.length : start + candPerPage;
    candFiltered.slice(start, end).forEach(c => { if (checked) selectedIds.add(c.id); else selectedIds.delete(c.id); });
    render();
}
function updateBulkBar() {
    const bar = document.getElementById('bulkBar');
    if (selectedIds.size > 0) {
        bar.style.display = 'flex';
        document.getElementById('selCount').textContent = selectedIds.size + ' dipilih';
    } else {
        bar.style.display = 'none';
    }
}

// ── Bulk Actions ──
function bulkStatus() {
    const newSt = document.getElementById('bulkStatusSel').value;
    if (!newSt) { showToast('Pilih status dulu', 'error'); return; }
    selectedIds.forEach(id => {
        const c = candData.find(x => x.id === id);
        if (c) { undoStack.push({ id, field:'status', old:c.status }); c.status = newSt; }
    });
    selectedIds.clear();
    showUndoIndicator();
    applyFilter();
    showToast('Status diubah');
}
function bulkDelete() {
    if (!confirm('Hapus ' + selectedIds.size + ' kandidat?')) return;
    candData = candData.filter(c => !selectedIds.has(c.id));
    selectedIds.clear();
    applyFilter();
    showToast('Kandidat dihapus');
}

// ── Inline Edit ──
function inlineEdit(td, candidate, field) {
    const old = candidate[field] || '';
    td.innerHTML = '';
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.value = old;
    inp.className = 'table-search';
    inp.style.cssText = 'padding:4px 8px;font-size:.75rem;width:100%;min-width:80px;';
    inp.onkeydown = e => {
        if (e.key === 'Enter') { saveInline(candidate, field, inp.value, old); applyFilter(); }
        if (e.key === 'Escape') applyFilter();
        if (e.key === 'Tab') { e.preventDefault(); saveInline(candidate, field, inp.value, old); applyFilter(); }
    };
    inp.onblur = () => { saveInline(candidate, field, inp.value, old); applyFilter(); };
    td.appendChild(inp);
    inp.focus();
    inp.select();
}

function inlineEditStatus(el, id) {
    const c = candData.find(x => x.id === id);
    if (!c) return;
    const td = el.parentElement;
    td.innerHTML = '';
    const sel = document.createElement('select');
    sel.className = 'table-select';
    sel.style.cssText = 'font-size:.72rem;padding:4px 8px;';
    DUMMY.statuses.forEach(s => { const o = new Option(s, s); if (s === c.status) o.selected = true; sel.add(o); });
    sel.onchange = () => { saveInline(c, 'status', sel.value, c.status); applyFilter(); };
    sel.onblur = () => applyFilter();
    td.appendChild(sel);
    sel.focus();
}

function saveInline(c, field, newVal, oldVal) {
    if (newVal !== oldVal) {
        undoStack.push({ id: c.id, field, old: oldVal });
        c[field] = newVal;
        showUndoIndicator();
    }
}

// ── Undo ──
function triggerUndo() {
    if (undoStack.length === 0) return;
    const u = undoStack.pop();
    const c = candData.find(x => x.id === u.id);
    if (c) c[u.field] = u.old;
    applyFilter();
    showToast('Undo berhasil', 'info');
    if (undoStack.length === 0) document.getElementById('undoIndicator').style.display = 'none';
}
function showUndoIndicator() {
    const el = document.getElementById('undoIndicator');
    el.style.display = 'block';
    el.textContent = 'Ctrl+Z untuk undo (' + undoStack.length + ' perubahan)';
}

// ── Column Toggle ──
function buildColToggle() {
    const list = document.getElementById('colToggleList');
    list.innerHTML = '';
    COLUMNS.forEach(col => {
        if (col.noToggle) return;
        const label = document.createElement('label');
        label.style.cssText = 'display:flex;align-items:center;gap:8px;padding:4px 0;font-size:.72rem;color:var(--t2);cursor:pointer;';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = colVisible[col.key] !== false;
        cb.onchange = () => { colVisible[col.key] = cb.checked; localStorage.setItem('dw_col_visible', JSON.stringify(colVisible)); render(); };
        label.appendChild(cb);
        label.appendChild(document.createTextNode(col.label));
        list.appendChild(label);
    });
}
function toggleColPanel() {
    const p = document.getElementById('colPanel');
    p.style.display = p.style.display === 'none' ? 'block' : 'none';
}

// ── Pagination ──
function renderPagination() {
    const total = candFiltered.length;
    const totalPages = candShowAll ? 1 : Math.ceil(total / candPerPage) || 1;
    if (candPage > totalPages) candPage = totalPages;
    const start = candShowAll ? 1 : (candPage - 1) * candPerPage + 1;
    const end = candShowAll ? total : Math.min(candPage * candPerPage, total);

    document.getElementById('candInfo').textContent = 'Menampilkan ' + (total > 0 ? start : 0) + '–' + end + ' dari ' + total;

    const pEl = document.getElementById('candPages');
    if (candShowAll || totalPages <= 1) { pEl.innerHTML = ''; return; }
    let h = '';
    h += '<button class="page-btn" onclick="goPage(1)" ' + (candPage===1?'disabled':'') + '>&laquo;</button>';
    h += '<button class="page-btn" onclick="goPage(' + (candPage-1) + ')" ' + (candPage===1?'disabled':'') + '>&lsaquo;</button>';
    const startP = Math.max(1, candPage - 2), endP = Math.min(totalPages, candPage + 2);
    for (let i = startP; i <= endP; i++) h += '<button class="page-btn' + (i===candPage?' active':'') + '" onclick="goPage(' + i + ')">' + i + '</button>';
    h += '<button class="page-btn" onclick="goPage(' + (candPage+1) + ')" ' + (candPage===totalPages?'disabled':'') + '>&rsaquo;</button>';
    h += '<button class="page-btn" onclick="goPage(' + totalPages + ')" ' + (candPage===totalPages?'disabled':'') + '>&raquo;</button>';
    pEl.innerHTML = h;
}
function goPage(p) {
    const totalPages = Math.ceil(candFiltered.length / candPerPage) || 1;
    if (p < 1 || p > totalPages) return;
    candPage = p; render();
}
function toggleShowAll(v) { candShowAll = v; candPage = 1; render(); }
function setRowsPerPage(n) { candPerPage = n; candPage = 1; render(); }

// ── Import / Export ──
function downloadTemplate() {
    const headers = COLUMNS.filter(c => !c.noExport).map(c => c.label);
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'template_dw_kandidat.xlsx');
    showToast('Template downloaded');
}

function exportFiltered() {
    const keys = COLUMNS.filter(c => !c.noExport && colVisible[c.key] !== false).map(c => c.key);
    const headers = COLUMNS.filter(c => !c.noExport && colVisible[c.key] !== false).map(c => c.label);
    const rows = candFiltered.map(c => keys.map(k => c[k] || ''));
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Filtered');
    XLSX.writeFile(wb, 'dw_kandidat_filtered.xlsx');
    showToast('Export filtered berhasil');
}

function exportAll() {
    const keys = COLUMNS.filter(c => !c.noExport).map(c => c.key);
    const headers = COLUMNS.filter(c => !c.noExport).map(c => c.label);
    const rows = candData.map(c => keys.map(k => c[k] || ''));
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Semua');
    XLSX.writeFile(wb, 'dw_kandidat_semua.xlsx');
    showToast('Export semua berhasil');
}

function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
        const wb = XLSX.read(ev.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { defval: '' });
        if (json.length === 0) { showToast('File kosong', 'error'); return; }
        // Map header labels to keys
        const labelToKey = {};
        COLUMNS.forEach(c => { if (!c.noExport) labelToKey[c.label] = c.key; });
        let added = 0;
        json.forEach(row => {
            const obj = { id: candData.length + added + 100 };
            Object.keys(row).forEach(h => { const k = labelToKey[h]; if (k) obj[k] = row[h]; });
            if (obj.name || obj.nik) { candData.push(obj); added++; }
        });
        applyFilter();
        showToast(added + ' data berhasil diimport');
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
}

// ── Detail Modal (Enhanced) ──
function showDetail(id) {
    const c = candData.find(x => x.id === id);
    if (!c) return;

    // Status pipeline stages
    const stages = [
        { label:'Pendaftaran', icon:'📝' },
        { label:'Pemberkasan', icon:'📁' },
        { label:'Interview',   icon:'🗣️' },
        { label:'Lulus/Gagal',  icon:'✅' },
    ];
    const status = (c.status||'').toLowerCase();
    let activeIdx = 0;
    if (status.includes('tidak') || status.includes('gagal')) activeIdx = -1;
    else if (status.includes('lulus') || status.includes('aktif')) activeIdx = 3;
    else if (status.includes('interview') || status.includes('jadwal')) activeIdx = 2;
    else if (status.includes('berkas') || status.includes('lengkap') || status.includes('sudah')) activeIdx = 1;

    const stColor = activeIdx === -1 ? '#EF4444' : activeIdx >= 3 ? '#22C55E' : 'var(--accent)';
    const stBg = activeIdx === -1 ? 'rgba(239,68,68,.12)' : activeIdx >= 3 ? 'rgba(34,197,94,.12)' : 'rgba(99,102,241,.12)';

    // Timeline
    let timeline = '<div class="detail-timeline">';
    stages.forEach((s, i) => {
        const done = activeIdx >= 0 && i <= activeIdx;
        const cur = i === activeIdx;
        timeline += '<div class="tl-step' + (done?' done':'') + (cur?' current':'') + '">' +
            '<div class="tl-dot" style="' + (done?'background:var(--accent);border-color:var(--accent);':'') + (cur?'box-shadow:0 0 0 4px '+stBg+';':'') + '">' +
            (done?'<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>':'') +
            '</div>' +
            '<div class="tl-label">' + s.icon + ' ' + s.label + '</div>' +
            '</div>';
        if (i < stages.length - 1) timeline += '<div class="tl-line' + (activeIdx >= 0 && i < activeIdx?' done':'') + '"></div>';
    });
    timeline += '</div>';

    // Status badge
    const bc = STATUS_COLORS[c.status] || '#8B5CF6';
    const statusBadge = '<div style="text-align:center;margin:12px 0;">' +
        '<span class="badge" style="background:' + bc + '20;color:' + bc + ';font-size:.88rem;padding:6px 18px;">' + (c.status||'-') + '</span></div>';

    // Info grid
    const f = (l, v, opts) => {
        opts = opts || {};
        let val = v || '-';
        if (opts.isLink) val = '<a href="' + v + '" target="_blank" style="color:var(--accent);text-decoration:none;">' + (opts.linkText||v) + '</a>';
        if (opts.isBadge) val = '<span style="background:' + stBg + ';color:' + stColor + ';padding:3px 10px;border-radius:8px;font-weight:600;font-size:.78rem;display:inline-block;">' + v + '</span>';
        return '<div class="detail-field"><span class="detail-label">' + l + '</span><span class="detail-value">' + val + '</span></div>';
    };

    // WhatsApp link
    const waNum = c.whatsapp ? String(c.whatsapp).replace(/\D/g,'') : '';
    const waUrl = waNum ? 'https://wa.me/' + (waNum.startsWith('0') ? '62' + waNum.substring(1) : waNum) : '';

    // Full address
    const addrParts = [c.address, c.kelurahan, c.kecamatan, c.kabupaten, c.provinsi].filter(Boolean);
    const fullAddr = addrParts.join(', ');
    const mapsUrl = fullAddr ? 'https://www.google.com/maps/search/' + encodeURIComponent(fullAddr) : '';

    let info = '<div class="detail-grid">';
    info += f('Nama', c.name);
    info += f('ID', c.given_id);
    info += f('NIK', c.nik);
    info += f('Station', c.station);
    info += f('WhatsApp', waUrl ? c.whatsapp : '-', waUrl ? {isLink:true, linkText:c.whatsapp + ' 📱'} : {});
    info += f('Email', c.email);
    info += f('Tgl Daftar', c.created_at);
    info += f('Tempat Lahir', c.tempat_lahir);
    info += f('Tgl Lahir', c.tanggal_lahir);
    info += f('Pendidikan', c.pendidikan_terakhir);
    info += f('SPX?', c.pernah_kerja_spx);
    info += f('Surat Sehat', c.surat_sehat);
    info += f('Paklaring', c.paklaring);
    info += f('Referensi', c.referensi);
    info += '</div>';

    // Address card
    let addrCard = '';
    if (fullAddr) {
        addrCard = '<div class="detail-address-card">' +
            '<div class="detail-section-title">📍 ALAMAT TERDAFTAR</div>' +
            '<div style="font-size:.85rem;color:var(--t1);line-height:1.6;">' +
            (c.address ? '<div>' + escHtml(c.address) + '</div>' : '') +
            (c.kelurahan ? '<span style="font-size:.75rem;color:var(--t3);">Kel. </span>' + escHtml(c.kelurahan) + ' ' : '') +
            (c.kecamatan ? '<span style="font-size:.75rem;color:var(--t3);">Kec. </span>' + escHtml(c.kecamatan) : '') +
            (c.kabupaten ? '<div><span style="font-size:.75rem;color:var(--t3);">Kab/Kota </span>' + escHtml(c.kabupaten) + '</div>' : '') +
            (c.provinsi ? '<div><span style="font-size:.75rem;color:var(--t3);">Prov. </span>' + escHtml(c.provinsi) + '</div>' : '') +
            '<div><span style="font-size:.75rem;color:var(--t3);">Area </span><span style="font-weight:600;color:var(--accent);">' + escHtml(getAreaForCandidate(c)) + '</span></div>' +
            '</div>' +
            (mapsUrl ? '<a href="' + mapsUrl + '" target="_blank" class="detail-maps-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg> Buka di Google Maps</a>' : '') +
            '</div>';
    }

    // Emergency contact
    let emergency = '';
    if (c.emergency_phone || c.emergency_name) {
        emergency = '<div class="detail-address-card">' +
            '<div class="detail-section-title">🚨 KONTAK DARURAT</div>' +
            '<div class="detail-grid" style="margin-top:6px;">' +
            f('Nama', c.emergency_name) + f('Hubungan', c.emergency_relation) + f('Telepon', c.emergency_phone) +
            '</div></div>';
    }

    // Bank info
    let bank = '';
    if (c.bank_name || c.bank_account_no) {
        bank = '<div class="detail-address-card">' +
            '<div class="detail-section-title">🏦 REKENING BANK</div>' +
            '<div class="detail-grid" style="margin-top:6px;">' +
            f('Bank', c.bank_name) + f('No. Rek', c.bank_account_no) + f('Atas Nama', c.bank_account_name) +
            '</div></div>';
    }

    // Login info
    let login = '<div class="detail-address-card">' +
        '<div class="detail-section-title">🔐 INFO LOGIN</div>' +
        '<div class="detail-grid" style="margin-top:6px;">' +
        f('Username', c.user_username) +
        '<div class="detail-field"><span class="detail-label">Password</span>' +
        '<span class="detail-value" style="display:flex;align-items:center;gap:6px;">' +
        '<span class="pw-display" data-pw="' + escHtml(c.user_password||'') + '">•••••</span>' +
        '<button class="pw-toggle-btn" onclick="toggleDetailPw(this)" title="Tampilkan">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>' +
        '</button>' +
        '</span></div>' +
        f('Tgl Akun', c.user_created_at) +
        '</div></div>';

    // Korlap notes
    let notes = '';
    if (c.korlap_notes) {
        notes = '<div class="detail-notes-card">' +
            '<div class="detail-section-title">📋 CATATAN KORLAP</div>' +
            '<div style="font-size:.85rem;color:var(--t1);line-height:1.5;">' + escHtml(c.korlap_notes) + '</div>' +
            '</div>';
    }

    // Action buttons
    let actions = '<div class="detail-actions">';
    if (waUrl) actions += '<a href="' + waUrl + '" target="_blank" class="detail-action-btn detail-wa-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2A19.86 19.86 0 013.09 5.18 2 2 0 015.11 3h3a2 2 0 012 1.72c.13.81.36 1.6.68 2.34a2 2 0 01-.45 2.11l-1.27 1.27a16 16 0 006.29 6.29l1.27-1.27a2 2 0 012.11-.45c.74.32 1.53.55 2.34.68a2 2 0 011.72 2z"/></svg> WhatsApp</a>';
    actions += '<button class="detail-action-btn detail-push-btn" onclick="openPushModal(' + c.id + ',\'' + escHtml(c.name).replace(/'/g,"\\'") + '\')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg> Notifikasi</button>';
    actions += '</div>';

    openModal(timeline + statusBadge + info + addrCard + emergency + bank + login + notes + actions);
}

// Helper
function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// Password toggle in detail modal
function toggleDetailPw(btn) {
    const span = btn.parentElement.querySelector('.pw-display');
    if (!span) return;
    const pw = span.getAttribute('data-pw');
    if (span.textContent === '•••••') { span.textContent = pw || '(kosong)'; btn.title = 'Sembunyikan'; }
    else { span.textContent = '•••••'; btn.title = 'Tampilkan'; }
}

// Password toggle in candidates table
function toggleTablePw(btn) {
    const span = btn.closest('span').querySelector('.pw-display');
    if (!span) return;
    const pw = span.getAttribute('data-pw');
    if (span.textContent === '•••••') {
        span.textContent = pw || '(kosong)';
        btn.title = 'Sembunyikan';
        btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
    } else {
        span.textContent = '•••••';
        btn.title = 'Tampilkan';
        btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    }
}

// ── View Candidate Documents ──
async function viewCandidateDocs(candidateId) {
    openModal('<div style="text-align:center;padding:30px;color:var(--t2);">Memuat berkas...</div>');
    try {
        const res = await fetch(API_BASE + 'candidates.php?id=' + candidateId, { credentials: 'same-origin' });
        const data = await res.json();
        const docs = data.documents || [];
        const c = data.candidate || {};
        let html = '<div style="padding:4px;">';
        html += '<div class="detail-section-title">📄 BERKAS KANDIDAT</div>';
        html += '<p style="font-size:.82rem;color:var(--t2);margin:4px 0 16px;">' + (c.name || 'Kandidat #' + candidateId) + '</p>';
        if (docs.length === 0) {
            html += '<div style="text-align:center;padding:24px;color:var(--t3);font-size:.82rem;">Belum ada berkas yang diupload</div>';
        } else {
            html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;">';
            docs.forEach(function(d) {
                const ext = (d.file_path || '').split('.').pop().toLowerCase();
                const isImg = ['jpg','jpeg','png'].indexOf(ext) >= 0;
                const thumb = isImg
                    ? '<img src="uploads/' + d.file_path + '?t=' + Date.now() + '" style="width:100%;height:100px;object-fit:cover;border-radius:6px;">'
                    : '<div style="height:100px;display:flex;align-items:center;justify-content:center;background:var(--bg-secondary);border-radius:6px;font-size:2rem;">📄</div>';
                html += '<div style="border:1px solid var(--border);border-radius:8px;overflow:hidden;cursor:pointer;" onclick="window.open(\'api/documents.php?id=' + d.id + '\',\'_blank\')">';
                html += thumb;
                html += '<div style="padding:6px 8px;font-size:.72rem;font-weight:600;color:var(--t1);">' + (d.doc_type || '-') + '</div>';
                html += '<div style="padding:0 8px 6px;font-size:.65rem;color:var(--t3);">' + (d.uploaded_at || '-') + '</div>';
                html += '</div>';
            });
            html += '</div>';
        }
        html += '<div class="detail-actions" style="margin-top:16px;"><button class="detail-action-btn" onclick="closeModal()" style="background:var(--card);border:1px solid var(--border);color:var(--t2);flex:1;">Tutup</button></div>';
        html += '</div>';
        openModal(html);
    } catch(e) {
        openModal('<div style="text-align:center;padding:30px;color:var(--danger);">Gagal memuat berkas</div>');
    }
}

// Push Notification Modal
function openPushModal(candidateId, name) {
    const html = '<div class="push-modal-inner">' +
        '<div class="detail-section-title">🔔 KIRIM NOTIFIKASI</div>' +
        '<p style="font-size:.82rem;color:var(--t2);margin:8px 0 16px;">Kirim pesan ke <strong>' + name + '</strong></p>' +
        '<textarea id="pushMessage" class="push-textarea" rows="4" placeholder="Tulis pesan notifikasi..."></textarea>' +
        '<div class="detail-actions" style="margin-top:12px;">' +
        '<button class="detail-action-btn detail-push-btn" onclick="sendPushNotif(' + candidateId + ')" style="flex:1;">Kirim Notifikasi</button>' +
        '<button class="detail-action-btn" onclick="closeModal()" style="background:var(--card);border:1px solid var(--border);color:var(--t2);">Batal</button>' +
        '</div></div>';
    openModal(html);
}

function sendPushNotif(candidateId) {
    const msg = document.getElementById('pushMessage');
    if (!msg || !msg.value.trim()) { showToast('Tulis pesan terlebih dahulu', 'error'); return; }
    // In production: POST to API
    if (!USE_DUMMY) {
        fetch(API_BASE + 'push.php', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ candidate_id: candidateId, message: msg.value.trim() })
        }).then(r=>r.json()).then(d=>{ showToast(d.message||'Notifikasi terkirim'); closeModal(); }).catch(()=>showToast('Gagal mengirim','error'));
    } else {
        showToast('Notifikasi terkirim ke kandidat #' + candidateId);
        closeModal();
    }
}

// ── Scroll Preserve ──
let _savedScroll = { top: 0, left: 0 };
const _origRender = typeof render === 'function' ? null : null; // placeholder

function renderWithScroll() {
    const wrap = document.querySelector('.panel.active .tbl-wrap');
    if (wrap) { _savedScroll.top = wrap.scrollTop; _savedScroll.left = wrap.scrollLeft; }
    renderHeader();
    renderBody();
    renderPagination();
    updateBulkBar();
    document.getElementById('candidateCount').textContent = candFiltered.length + ' kandidat';
    // Restore scroll
    requestAnimationFrame(function() {
        const w = document.querySelector('.panel.active .tbl-wrap');
        if (w) { w.scrollTop = _savedScroll.top; w.scrollLeft = _savedScroll.left; }
    });
}

