// ═══════════════════════════════════════════════════════════════
//  BAS Recruitment — Daily Worker SQL Admin Portal
//  Navigation, Data Fetching, Charts, Table Rendering
// ═══════════════════════════════════════════════════════════════

// ── XSS Escape ──
function esc(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

// ── Theme ──
function getTheme() {
    return localStorage.getItem('bas-theme') || localStorage.getItem('bas_owner_theme') || 'dark';
}
function applyTheme(theme) {
    const html = document.documentElement;
    html.className = theme === 'light' ? 'light' : 'dark';
    localStorage.setItem('bas-theme', theme);
    localStorage.setItem('bas_owner_theme', theme);
    const lbl = document.getElementById('themeLabel');
    if (lbl) lbl.textContent = theme === 'light' ? 'Mode Terang' : 'Mode Gelap';
}
function toggleTheme() {
    applyTheme(getTheme() === 'dark' ? 'light' : 'dark');
}

// ── State ──
let candidates = [];
let payrolls = [];
let admins = [];
let adminRole = 'korlap';
let charts = {};

// ── Navigation ──
function switchView(viewId, btn) {
    document.querySelectorAll('.view-section').forEach(v => v.classList.add('hidden'));
    document.getElementById(viewId).classList.remove('hidden');

    // Desktop nav
    document.querySelectorAll('.sidebar-btn[data-view]').forEach(b => b.classList.remove('active'));
    if (btn && btn.classList.contains('sidebar-btn')) btn.classList.add('active');
    else {
        const sb = document.querySelector(`.sidebar-btn[data-view="${viewId}"]`);
        if (sb) sb.classList.add('active');
    }

    // Mobile nav
    document.querySelectorAll('.mob-tab').forEach(b => {
        b.classList.remove('text-accent-cyan');
        b.classList.add('text-slate-500');
    });
    const mb = document.querySelector(`.mob-tab[data-view="${viewId}"]`);
    if (mb) { mb.classList.remove('text-slate-500'); mb.classList.add('text-accent-cyan'); }

    // Init charts when Deep Learning tab is shown
    if (viewId === 'viewDeepLearning') initDLCharts();
    // Load admins when Korlap tab is shown
    if (viewId === 'viewKorlap') fetchAdmins();
}

// ── Chart Config ──
function setChartTheme() {
    if (typeof Chart === 'undefined') return;
    const isLight = document.documentElement.classList.contains('light');
    Chart.defaults.color = isLight ? 'rgba(100,116,139,0.8)' : 'rgba(148,163,184,0.6)';
    Chart.defaults.borderColor = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.04)';
    Chart.defaults.font.family = 'Inter';
}

function mkChart(id, cfg) {
    if (typeof Chart === 'undefined') return null;
    if (charts[id]) charts[id].destroy();
    const el = document.getElementById(id);
    if (!el) return null;
    charts[id] = new Chart(el, cfg);
    return charts[id];
}

// ── Data Fetching ──
async function fetchData() {
    try {
        const res = await fetch('./api/admin.php?action=get_all');
        const data = await res.json();

        if (data.error) {
            if (data.error === 'Unauthorized') {
                // Try demo mode
                loadDemoData();
                return;
            }
            console.warn('API error:', data.error);
            loadDemoData();
            return;
        }

        candidates = data.candidates || [];
        adminRole = data.admin_role || 'korlap';
        window._currentAdminId = data.admin_id || 0;
        
        // Show korlap sidebar only for owner
        if (adminRole === 'owner') {
            const ks = document.getElementById('sidebarKorlapSection');
            if (ks) ks.classList.remove('hidden');
            const mk = document.getElementById('mobTabKorlap');
            if (mk) mk.classList.remove('hidden');
        }
        
        updateDashboard();
        renderTable();
        initStationChart();
        
        // Fetch Payroll after candidates
        await fetchPayrolls();
    } catch (e) {
        console.warn('Fetch failed, loading demo data:', e);
        loadDemoData();
    }
}

async function fetchPayrolls() {
    try {
        const res = await fetch('./api/admin.php?action=get_payrolls');
        const data = await res.json();
        if (data.success) {
            payrolls = data.payrolls || [];
            updatePayrollPeriodFilter();
            renderPayrollTable();
        }
    } catch (e) {
        console.warn('Failed fetching payrolls:', e);
    }
}

function loadDemoData() {
    candidates = [
        { id: 1, given_id: '', nama: 'Ahmad Santoso', nik: '3201010102990001', nomor_telepon: '081234567890', gender: 'Laki-laki', bank: 'BCA', norek: '1234567890', atas_nama: 'Ahmad Santoso', alamat: 'Jl. Raya Cibitung No. 12', kota: 'Bekasi', tanggal_lahir: '1995-03-15', referensi: 'Teman', station: 'Cibitung', ktp_path: null, signature_path: null, status: 'Sudah Pemberkasan', created_at: '2026-04-01' },
        { id: 2, given_id: '', nama: 'Siti Nurhaliza', nik: '3201010203970002', nomor_telepon: '082345678901', gender: 'Perempuan', bank: 'Mandiri', norek: '2345678901', atas_nama: 'Siti Nurhaliza', alamat: 'Kp. Mekar RT 03/05', kota: 'Cikarang', tanggal_lahir: '1997-08-22', referensi: 'FB', station: 'Cibitung', ktp_path: 'ktp_2.jpg', signature_path: 'data:image/png', status: 'Lulus', created_at: '2026-03-28' },
        { id: 3, given_id: '', nama: 'Budi Prasetyo', nik: '3201010304960003', nomor_telepon: '083456789012', gender: 'Laki-laki', bank: 'BRI', norek: '3456789012', atas_nama: 'Budi Prasetyo', alamat: 'Jl. Anggrek Blok C No.5', kota: 'Bekasi', tanggal_lahir: '1996-12-01', referensi: 'Karyawan BAS', station: 'Bekasi Hub', ktp_path: null, signature_path: null, status: 'Belum Pemberkasan', created_at: '2026-04-05' },
        { id: 4, given_id: '', nama: 'Dewi Lestari', nik: '3201010405980004', nomor_telepon: '084567890123', gender: 'Perempuan', bank: 'BCA', norek: '4567890123', atas_nama: 'Dewi Lestari', alamat: 'Perum Griya Indah B12', kota: 'Cakung', tanggal_lahir: '1998-06-10', referensi: 'Teman', station: 'Cakung 2', ktp_path: 'ktp_4.jpg', signature_path: 'data:image/png', status: 'Sudah Pemberkasan', created_at: '2026-04-03' },
    ];
    
    // Set to owner for local demo to show the Korlap tab
    adminRole = 'owner';
    const ks = document.getElementById('sidebarKorlapSection');
    if (ks) ks.classList.remove('hidden');
    const mk = document.getElementById('mobTabKorlap');
    if (mk) mk.classList.remove('hidden');

    updateDashboard();
    renderTable();
    initStationChart();
}

function updateDashboard() {
    document.getElementById('kpiTotal').textContent = candidates.length;
    document.getElementById('kpiBerkas').textContent = candidates.filter(c => c.status !== 'Belum Pemberkasan').length;
    document.getElementById('kpiLulus').textContent = candidates.filter(c => c.status === 'Lulus').length;
}

// ── Table Rendering ──
function renderTable(dataList = candidates) {
    const tbody = document.getElementById('kandidatTbody');
    if (!dataList || !dataList.length) {
        tbody.innerHTML = '<tr><td colspan="15" class="py-10 text-center text-slate-500 italic">Tidak ada data kandidat.</td></tr>';
        return;
    }

    const fmtData = (val) => val ? `<span class="text-white">${esc(val)}</span>` : `<span class="text-slate-600 italic">null</span>`;
    const tdClass = "px-3 py-2.5 whitespace-nowrap";

    tbody.innerHTML = dataList.map(c => {
        const statusColors = {
            'Lulus': { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
            'Tidak Lulus': { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30' },
            'Sudah Pemberkasan': { bg: 'bg-accent-cyan/15', text: 'text-accent-cyan', border: 'border-accent-cyan/30' },
            'Belum Pemberkasan': { bg: 'bg-slate-700/50', text: 'text-slate-400', border: 'border-slate-500/30' },
        };
        const sc = statusColors[c.status] || statusColors['Belum Pemberkasan'];
        const ktpLink = c.ktp_path ? `<a href="./api/uploads/berkas/${esc(c.ktp_path)}" target="_blank" class="text-accent-cyan hover:underline hover:text-white">Ada</a>` : '<span class="text-slate-600">null</span>';
        const sigText = c.signature_path ? '<span class="text-emerald-400">Ada</span>' : '<span class="text-slate-600">null</span>';

        return `
        <tr class="trow border-b border-white/5 hover:bg-white/5 transition-colors group">
            <td class="${tdClass} sticky left-0 z-0 bg-[#0f172a] group-hover:bg-[#1a2333] transition-colors"><input type="checkbox" class="row-checkbox" value="${c.id}"></td>
            <td class="${tdClass} font-mono text-accent-orange font-bold cursor-pointer group/ops" ondblclick="editOpsId(this, ${c.id}, '${esc(c.given_id || '')}')" title="Double-klik untuk edit OPS ID">
                <span class="inline-flex items-center gap-1">${c.given_id ? esc(c.given_id) : '<span class="text-slate-600 italic font-normal">— belum diisi</span>'}<svg class="w-2.5 h-2.5 text-slate-600 opacity-0 group-hover/ops:opacity-100 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg></span>
            </td>
            <td class="${tdClass} text-slate-400">${c.created_at ? esc(c.created_at.split(' ')[0]) : '-'}</td>
            <td class="${tdClass} cursor-pointer hover:text-accent-cyan transition-colors" onclick='copyCandidateData(this, ${JSON.stringify(c).replace(/'/g,"&#39;")})'>
                <span class="font-bold text-white">${esc(c.nama || '-')}</span>
            </td>
            <td class="${tdClass} font-mono text-slate-300 tracking-wide">${fmtData(c.nik)}</td>
            <td class="${tdClass} font-mono text-slate-300">${fmtData(c.nomor_telepon)}</td>
            <td class="${tdClass}">${fmtData(c.station)}</td>
            <td class="${tdClass}">${fmtData(c.gender)}</td>
            <td class="${tdClass}">${fmtData(c.kota)}</td>
            <td class="${tdClass}">${fmtData(c.tanggal_lahir)}</td>
            <td class="${tdClass}">${fmtData(c.bank)}</td>
            <td class="${tdClass} font-mono">${fmtData(c.norek)}</td>
            <td class="${tdClass}">
                <span class="px-2 py-0.5 rounded-full border ${sc.border} ${sc.bg} ${sc.text} text-[10px] font-bold tracking-wide">${esc(c.status)}</span>
            </td>
            <td class="${tdClass}">${ktpLink} <span class="text-slate-600 mx-1">/</span> ${sigText}</td>
            <td class="${tdClass} sticky right-0 z-0 bg-[#0f172a] group-hover:bg-[#1a2333] border-l border-white/5 text-center transition-colors">
                <select onchange="updateStatus(${c.id}, this.value)" class="bg-black/30 text-slate-300 border border-white/10 rounded px-2 py-1 text-[10px] outline-none cursor-pointer focus:border-accent-cyan">
                    <option value="" disabled selected>— Aksi —</option>
                    <option value="Belum Pemberkasan">Belum Pemberkasan</option>
                    <option value="Sudah Pemberkasan">Sudah Pemberkasan</option>
                    <option value="Lulus">Lulus</option>
                    <option value="Tidak Lulus">Tidak Lulus</option>
                </select>
            </td>
        </tr>`;
    }).join('');

    // Update Dropdown Station Filters dynamically
    updateStationFilterDropdown();
}

function updateStationFilterDropdown() {
    const filterStation = document.getElementById('filterStation');
    if (!filterStation || window.stationFilterPopulated) return;
    
    let stations = new Set();
    candidates.forEach(c => { if(c.station) stations.add(c.station); });
    
    Array.from(stations).sort().forEach(st => {
        let opt = document.createElement('option');
        opt.value = st;
        opt.textContent = st;
        filterStation.appendChild(opt);
    });
    window.stationFilterPopulated = true;
}

function filterTable() {
    const q = (document.getElementById('filterSearch').value || '').toLowerCase();
    const st = document.getElementById('filterStatus').value;
    const loc = document.getElementById('filterStation').value;

    let filtered = candidates;
    if (st) filtered = filtered.filter(c => c.status === st);
    if (loc) filtered = filtered.filter(c => c.station === loc);
    if (q) {
        filtered = filtered.filter(c => 
            (c.nama || '').toLowerCase().includes(q) || 
            (c.nomor_telepon || '').toLowerCase().includes(q) ||
            (c.nik || '').toLowerCase().includes(q)
        );
    }
    
    renderTable(filtered);
    
    const countEl = document.getElementById('candidateCount');
    if (countEl) countEl.textContent = `${filtered.length} kandidat`;
}

function toggleSelectAll(source) {
    const checkboxes = document.querySelectorAll('.row-checkbox');
    checkboxes.forEach(cb => cb.checked = source.checked);
}

// ── Payroll Rendering ──
function formatRupiah(num) {
    if (!num) return '0';
    return Number(num).toLocaleString('id-ID');
}

function updatePayrollPeriodFilter() {
    const filterPeriod = document.getElementById('filterPayrollPeriod');
    if (!filterPeriod || window.payrollPeriodPopulated) return;
    
    let periods = new Set();
    payrolls.forEach(p => { if(p.period) periods.add(p.period); });
    
    Array.from(periods).sort().forEach(per => {
        let opt = document.createElement('option');
        opt.value = per;
        opt.textContent = per;
        filterPeriod.appendChild(opt);
    });
    window.payrollPeriodPopulated = true;
}

function filterPayrollTable() {
    const q = (document.getElementById('filterPayrollSearch').value || '').toLowerCase();
    const per = document.getElementById('filterPayrollPeriod').value;

    let filtered = payrolls;
    if (per) filtered = filtered.filter(p => p.period === per);
    if (q) {
        filtered = filtered.filter(p => 
            (p.nama || '').toLowerCase().includes(q) || 
            (p.nik || '').toLowerCase().includes(q)
        );
    }
    
    renderPayrollTable(filtered);
    
    const countEl = document.getElementById('payrollCount');
    if (countEl) countEl.textContent = `${filtered.length} data gaji`;
}

function renderPayrollTable(dataList = payrolls) {
    const tbody = document.getElementById('payrollTbody');
    if (!tbody) return;
    
    if (!dataList || !dataList.length) {
        tbody.innerHTML = '<tr><td colspan="10" class="py-10 text-center text-slate-500 italic">Tidak ada rincian payroll.</td></tr>';
        return;
    }

    const fmtData = (val) => val ? `<span class="text-white">${esc(val)}</span>` : `<span class="text-slate-600 italic">null</span>`;
    const tdClass = "px-3 py-2.5 whitespace-nowrap";

    tbody.innerHTML = dataList.map(p => {
        const idHtml = p.id ? esc(p.id) : `<span class="italic">null</span>`;
        return `
        <tr class="hover:bg-white/5 transition-colors group cursor-pointer border-b border-white/5">
            <td class="${tdClass} sticky left-0 z-0 bg-[#0f172a] group-hover:bg-[#1a2333] transition-colors"><input type="checkbox" class="row-checkbox rounded border-white/20 bg-black/20 text-accent-cyan cursor-pointer" value="${p.id}"></td>
            <td class="${tdClass}"><span class="px-2 py-0.5 rounded-full border border-teal-500/30 bg-teal-500/15 text-teal-400 text-[10px] font-bold tracking-wide">${esc(p.period)}</span></td>
            <td class="${tdClass} font-mono text-accent-cyan">${fmtData(p.nik)}</td>
            <td class="${tdClass} font-bold cursor-help" title="Klik untuk Salin Nama">${fmtData(p.nama)}</td>
            <td class="${tdClass} text-right font-mono text-slate-300">Rp ${formatRupiah(p.pendapatan_dasar)}</td>
            <td class="${tdClass} text-right font-mono text-slate-300">Rp ${formatRupiah(p.lembur)}</td>
            <td class="${tdClass} text-right font-mono text-red-400">- Rp ${formatRupiah(p.potongan)}</td>
            <td class="${tdClass} text-right font-mono font-bold text-accent-green bg-accent-green/5 border-l border-white/5">Rp ${formatRupiah(p.thp)}</td>
            <td class="${tdClass} text-center"><span class="text-[10px] text-slate-500">${esc(p.created_at || '').substring(0,10)}</span></td>
            <td class="${tdClass} sticky right-0 z-0 bg-[#0f172a] group-hover:bg-[#1a2333] border-l border-white/5 text-center transition-colors">
                <button class="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded text-[10px] font-bold transition">Hapus</button>
            </td>
        </tr>`;
    }).join('');
    
    // Set total counter if not set by filter
    const countEl = document.getElementById('payrollCount');
    if (countEl && document.getElementById('filterPayrollSearch').value === '' && document.getElementById('filterPayrollPeriod').value === '') {
        countEl.textContent = `${dataList.length} data gaji`;
    }
}

async function copyCandidateData(el, c) {
    const text = `ID OPS       : ${c.given_id || '-'}
Nama         : ${c.nama || '-'}
NIK          : ${c.nik || '-'}
Telepon/WA   : ${c.nomor_telepon || '-'}
Gender       : ${c.gender || '-'}
Bank & Norek : ${c.bank || '-'} - ${c.norek || '-'} (A/N: ${c.atas_nama || '-'})
Alamat       : ${c.alamat || '-'}, ${c.kota || '-'}
TTL          : ${c.tanggal_lahir || '-'}
Station      : ${c.station || '-'}
Referensi    : ${c.referensi || '-'}
Status       : ${c.status || '-'}`;

    try {
        await navigator.clipboard.writeText(text);
        const origHTML = el.innerHTML;
        el.innerHTML = `<span class="text-accent-green font-bold text-xs">✓ Tersalin!</span>`;
        setTimeout(() => el.innerHTML = origHTML, 1000);
    } catch(e) {
        alert('Gagal menyalin data kandidat');
    }
}

function showDetail(c) {
    const modal = document.getElementById('modalDetail');
    document.getElementById('detailContent').innerHTML = `
        <div class="p-3 rounded-xl glass border border-white/5">
            <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nama Bank</p>
            <p class="text-sm text-white font-bold">${esc(c.bank || '-')}</p>
        </div>
        <div class="p-3 rounded-xl glass border border-white/5">
            <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nomor Rekening</p>
            <p class="text-sm text-accent-cyan font-mono font-bold">${esc(c.norek || '-')}</p>
        </div>
        <div class="p-3 rounded-xl glass border border-white/5">
            <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Atas Nama</p>
            <p class="text-sm text-white font-bold">${esc(c.atas_nama || '-')}</p>
        </div>
        <hr class="border-white/5 my-1">
        <div class="p-3 rounded-xl glass border border-white/5">
            <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Alamat</p>
            <p class="text-xs text-slate-300">${esc(c.alamat || '-')}, ${esc(c.kota || '')}</p>
        </div>
        <div class="p-3 rounded-xl glass border border-white/5">
            <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Referensi</p>
            <p class="text-xs text-slate-300">${esc(c.referensi || '-')}</p>
        </div>
    `;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

async function updateStatus(id, newStatus) {
    if (!confirm('Ubah status kandidat ini?')) { fetchData(); return; }
    try {
        const res = await fetch('./api/admin.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'update_status', id, status: newStatus })
        });
        const data = await res.json();
        if (data.success) fetchData();
        else alert('Gagal update: ' + data.error);
    } catch (e) {
        alert('Koneksi gagal');
    }
}

// ── Charts ──
function initStationChart() {
    setChartTheme();
    const sCount = {};
    candidates.forEach(c => { const st = c.station || 'Kosong'; sCount[st] = (sCount[st] || 0) + 1; });

    mkChart('chartStation', {
        type: 'bar',
        data: {
            labels: Object.keys(sCount),
            datasets: [{
                label: 'Jumlah Pendaftar',
                data: Object.values(sCount),
                backgroundColor: ['rgba(76,201,240,0.7)', 'rgba(59,130,246,0.7)', 'rgba(0,245,212,0.7)', 'rgba(255,158,0,0.7)'],
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
    });
}

let dlChartsInit = false;
function initDLCharts() {
    if (dlChartsInit) return;
    setChartTheme();

    mkChart('chartPredict1', {
        type: 'line',
        data: {
            labels: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Ming'],
            datasets: [{
                label: 'Prediksi Kehadiran %',
                data: [84, 88, 86, 89, 90, 85, 87],
                borderColor: 'rgba(76,201,240,1)',
                tension: 0.4,
                fill: true,
                backgroundColor: 'rgba(76,201,240,0.08)',
                pointBackgroundColor: '#4cc9f0',
                pointBorderWidth: 0,
                pointRadius: 4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { min: 70, max: 100 } } }
    });

    mkChart('chartPredict2', {
        type: 'doughnut',
        data: {
            labels: ['Bekasi Hub', 'Cakung 2', 'Cibitung'],
            datasets: [{
                data: [45, 30, 25],
                backgroundColor: ['rgba(59,130,246,0.8)', 'rgba(76,201,240,0.8)', 'rgba(0,245,212,0.8)'],
                borderWidth: 0,
                spacing: 2
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } } }
    });

    dlChartsInit = true;
}

// ══════════════════════════════════════════════
//  IMPORT / EXPORT
// ══════════════════════════════════════════════

let pendingImportData = [];

// CSV helper: escape field
function csvField(v) {
    const s = String(v == null ? '' : v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? '"' + s.replace(/"/g, '""') + '"' : s;
}

// ── Export CSV ──
function exportCSV() {
    if (!candidates.length) { alert('Tidak ada data untuk di-export.'); return; }

    const headers = ['No', 'ID', 'Nama', 'NIK', 'No Telepon', 'Gender', 'Alamat', 'Kota', 'Tanggal Lahir', 'Bank', 'No Rekening', 'Atas Nama', 'Station', 'Referensi', 'Status', 'Tanggal Daftar'];
    const rows = candidates.map((c, i) => [
        i + 1, c.given_id || '', c.nama || '', c.nik || '', c.nomor_telepon || '',
        c.gender || '', c.alamat || '', c.kota || '', c.tanggal_lahir || '',
        c.bank || '', c.norek || '', c.atas_nama || '', c.station || '',
        c.referensi || '', c.status || '', c.created_at || ''
    ].map(csvField).join(','));

    const bom = '\uFEFF'; // UTF-8 BOM for Excel
    const csvContent = bom + headers.join(',') + '\n' + rows.join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dailyworker_data_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    const info = document.getElementById('exportInfo');
    if (info) info.textContent = `✅ ${candidates.length} data berhasil di-export.`;
}

// ── Download Template ──
// downloadTemplate() defined below (XLSX version)

// ── Import Excel (Combined Data & OPS ID) ──
let currentImportAction = 'bulk_import';

function importExcelRow(event, actionType = 'bulk_import') {
    const file = event.target.files[0];
    if (!file) return;
    
    currentImportAction = actionType;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // Convert to JSON and lowercase keys
            let rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
            if (!rawJson.length) { alert('File Excel kosong atau format tidak valid.'); return; }

            // Normalize keys (lowercase, replace spaces)
            const normalizedData = rawJson.map(row => {
                const newRow = {};
                for (let key in row) {
                    const cleanKey = key.toLowerCase().replace(/[^a-z0-9_]/g, '_').trim();
                    newRow[cleanKey] = String(row[key] || '');
                }
                return newRow;
            });

            pendingImportData = normalizedData;
            
            const info = document.getElementById('importInfo_' + actionType) || document.getElementById('importInfo');
            if (info) info.textContent = `📄 ${file.name} — ${normalizedData.length} baris terdeteksi.`;

            // Show preview
            const preview = document.getElementById('importPreview');
            const thead = document.getElementById('importThead');
            const tbody = document.getElementById('importTbody');
            const count = document.getElementById('importCount');

            const headers = Object.keys(normalizedData[0]);
            thead.innerHTML = headers.map(h => `<th class="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase">${esc(h)}</th>`).join('');

            const showRows = normalizedData.slice(0, 20);
            tbody.innerHTML = showRows.map(row => `<tr class="border-b border-white/5">${headers.map(h => `<td class="px-3 py-2 text-xs text-slate-300 whitespace-nowrap">${esc(row[h] || '')}</td>`).join('')}</tr>`).join('');

            count.textContent = normalizedData.length > 20 ? `Menampilkan 20 dari ${normalizedData.length} baris` : `${normalizedData.length} baris`;
            preview.classList.remove('hidden');
        } catch (error) {
            console.error(error);
            alert('Gagal membaca file Excel. Pastikan format file .xlsx atau .xls valid.');
        }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
}

// ── Cancel Import ──
function cancelImport() {
    pendingImportData = [];
    document.getElementById('importPreview').classList.add('hidden');
    const info = document.getElementById('importInfo');
    if (info) info.textContent = 'Import dibatalkan.';
}

// ── Confirm Import ──
async function confirmImport() {
    if (!pendingImportData.length) return;

    try {
        const res = await fetch('./api/admin.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: currentImportAction, data: pendingImportData })
        });
        const result = await res.json();
        if (result.success) {
            alert(`✅ ${result.imported || pendingImportData.length} data berhasil di-import/di-update!`);
            cancelImport();
            if (currentImportAction !== 'import_payroll') {
                fetchData();
            }
        } else {
            alert('Import gagal: ' + (result.error || 'Unknown error'));
        }
    } catch (e) {
        // Demo mode fallback — merge into local data gracefully like UPSERT
        pendingImportData.forEach((row, i) => {
            let targetNik = row.nik || '';
            let existingIdx = candidates.findIndex(c => c.nik === targetNik && targetNik !== '');
            let newOpsId = row.ops_id || row.given_id || '';
            
            if (existingIdx >= 0) {
                // Update existing
                if (newOpsId) candidates[existingIdx].given_id = newOpsId;
                if (row.nama) candidates[existingIdx].nama = row.nama;
                if (row.nomor_telepon || row.no_telepon) candidates[existingIdx].nomor_telepon = row.nomor_telepon || row.no_telepon;
                if (row.status) candidates[existingIdx].status = row.status;
                if (row.station) candidates[existingIdx].station = row.station;
            } else if (targetNik && row.nama) {
                // Insert new 
                candidates.push({
                    id: candidates.length + i + 1,
                    given_id: newOpsId || '',
                    nama: row.nama || '', nik: targetNik,
                    nomor_telepon: row.nomor_telepon || row.no_telepon || '',
                    gender: row.gender || '', bank: row.bank || '',
                    norek: row.norek || row.no_rekening || '',
                    atas_nama: row.atas_nama || '', alamat: row.alamat || '',
                    kota: row.kota || '', tanggal_lahir: row.tanggal_lahir || '',
                    referensi: row.referensi || '', station: row.station || '',
                    status: 'Belum Pemberkasan', created_at: new Date().toISOString().slice(0, 10)
                });
            }
        });
        alert(`✅ ${pendingImportData.length} data berhasil di-proses (Demo Mode).`);
        cancelImport();
        updateDashboard();
        renderTable();
        initStationChart();
    }
}

// ── Export Excel ──
function exportExcel() {
    if (!candidates.length) { alert('Tidak ada data untuk di-export.'); return; }

    const formattedData = candidates.map((c, i) => ({
        'No': i + 1,
        'OPS ID (Given ID)': c.given_id || '',
        'Nama Lengkap': c.nama || '',
        'NIK': c.nik || '',
        'No Telepon': c.nomor_telepon || '',
        'Gender': c.gender || '',
        'Alamat': c.alamat || '',
        'Kota': c.kota || '',
        'Tanggal Lahir': c.tanggal_lahir || '',
        'Bank': c.bank || '',
        'No Rekening': c.norek || '',
        'Atas Nama': c.atas_nama || '',
        'Station': c.station || '',
        'Referensi': c.referensi || '',
        'Status': c.status || '',
        'Tanggal Daftar': c.created_at || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Candidates DW");
    XLSX.writeFile(workbook, `Karyawan_DW_SuperBAS_${new Date().toISOString().slice(0, 10)}.xlsx`);

    const info = document.getElementById('exportInfo');
    if (info) info.textContent = `✅ ${candidates.length} data berhasil di-export ke Excel.`;
}

// ── Download Template Excel ──
function downloadTemplate() {
    const templateData = [{
        'nik': '3201010101010001',
        'nama': 'Ahmad Contoh',
        'ops_id': '',
        'no_telepon': '081234567890',
        'gender': 'Laki-laki',
        'alamat': 'Jl. Contoh No.1',
        'kota': 'Bekasi',
        'tanggal_lahir': '1995-01-01',
        'bank': 'BCA',
        'no_rekening': '1234567890',
        'atas_nama': 'Ahmad Contoh',
        'station': 'Cibitung',
        'referensi': 'Teman'
    }];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template Data");
    XLSX.writeFile(workbook, 'Template_Import_DW.xlsx');
}

// ── Payroll & Templates ──
window.downloadPayrollTemplate = function() {
    const templateData = [{
        'nik': '3201010101010001',
        'period': 'Jan 2026',
        'pendapatan_dasar': '1500000',
        'lembur': '250000',
        'potongan': '50000',
        'thp': '1700000'
    }];
    
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Payroll Data");
    XLSX.writeFile(workbook, 'Template_Upload_Gaji_Excel.xlsx');
};

// ── ID Card Generator ──
window.switchIdCardTab = function(mode) {
    document.getElementById('tabSatu').classList.add('hidden');
    document.getElementById('tabBulk').classList.add('hidden');
    document.getElementById('btnTabSatu').className = "flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-black/20 text-slate-400 border border-white/10 hover:bg-white/5 transition";
    document.getElementById('btnTabBulk').className = "flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-black/20 text-slate-400 border border-white/10 hover:bg-white/5 transition";
    
    if (mode === 'satuan') {
        document.getElementById('tabSatu').classList.remove('hidden');
        document.getElementById('btnTabSatu').className = "flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-blue-500/15 text-blue-400 border border-blue-500/30 transition";
        populateIdCardDropdown();
    } else {
        document.getElementById('tabBulk').classList.remove('hidden');
        document.getElementById('btnTabBulk').className = "flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-blue-500/15 text-blue-400 border border-blue-500/30 transition";
    }
};

window.populateIdCardDropdown = function() {
    const select = document.getElementById('idcardSelect');
    if (!select || select.options.length > 1) return; // Prevent multiple populations
    
    const validCandidates = candidates.filter(c => c.status === 'Lulus' || c.given_id);
    validCandidates.forEach(c => {
        let opt = document.createElement('option');
        opt.value = JSON.stringify({ nama: c.nama, opsId: c.given_id || '-' });
        opt.textContent = `${c.nama} (${c.given_id || 'ID Belum Ditentukan'})`;
        select.appendChild(opt);
    });
    
    const countBtn = document.getElementById('btnLoadSemuaKaryawan');
    if(countBtn) countBtn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg> Load Karyawan Lulus (${validCandidates.length})`;
};

window.autoFillIdCard = function(selectEl) {
    if(!selectEl.value) return;
    const data = JSON.parse(selectEl.value);
    document.getElementById('idcardName').value = data.nama;
    document.getElementById('idcardOps').value = data.opsId === '-' ? '' : data.opsId;
};

function renderSingleCardView(nama, opsid, theme = 'light') {
    const themeClass = theme === 'light' ? ' light-theme' : '';
    const watermark = theme === 'light' 
        ? '<img src="assets/LogoBas.png" class="watermark-logo" alt="" />' 
        : '';

    return `
    <div class="id-card${themeClass}" style="margin-bottom:24px; page-break-inside:avoid; flex-shrink:0; border-radius:16px; -webkit-print-color-adjust:exact; print-color-adjust:exact;">
        <div class="overlay">
            <div class="overlay-inner"></div>
        </div>
        ${watermark}
        <div class="card-inner">
            <div class="top-bar">
                <div style="flex:1;display:flex;flex-direction:column;align-items:flex-start">
                    <img src="assets/LogoBas.png" style="width:80px;height:auto;object-fit:contain;${theme === 'dark' ? 'filter:brightness(0) invert(1);opacity:0.9;' : ''}" alt="BAS Logo" />
                </div>
                <div class="side-bars" style="display:flex;gap:6px">
                    <div class="bar bar-blue" style="width:6px;height:24px;border-radius:9999px"></div>
                    <div class="bar bar-pink" style="width:6px;height:16px;margin-top:8px;border-radius:9999px"></div>
                </div>
            </div>

            <div style="position:relative;z-index:10;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;width:100%;padding:0 16px">
                <div class="qr-section">
                    <div class="qr-wrap">
                        <div class="qr-inner">
                            <canvas class="qr-canvas" data-value="${esc(opsid)}"></canvas>
                        </div>
                    </div>
                </div>

                <div class="opsid-section">
                    <span class="ops-id">${esc(opsid)}</span>
                </div>

                <div class="name-section">
                    <h2 class="emp-name">${esc(nama)}</h2>
                    <div class="pos-line">
                        <div class="pos-bar"></div>
                        <p class="pos-text">DAILY WORKER</p>
                        <div class="pos-bar"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
}

window.generateSingleIdCard = function() {
    const nama = document.getElementById('idcardName').value.trim();
    const opsid = document.getElementById('idcardOps').value.trim();
    const theme = document.getElementById('idcardTheme') ? document.getElementById('idcardTheme').value : 'light';
    
    if (!nama || !opsid) return alert('Nama dan OPS ID wajib diisi!');
    
    const area = document.getElementById('printIdCardArea');
    area.innerHTML = renderSingleCardView(nama, opsid, theme);
    renderQRCodes();
    _canvasCache = null;
    addPrintNotice(area);
};

// Smart OPS ID detection - supports: ops262728, Ops1615632, DW-10025, OPS-xxx, DW10025, etc.
function isOpsId(str) {
    if (!str) return false;
    const s = str.trim();
    // Pattern: starts with ops/OPS/Ops followed by digits, or DW- prefix, or pure numeric 6+ digits
    return /^ops\d{3,}/i.test(s) ||        // ops262728, Ops1615632
           /^dw[-\s]?\d{3,}/i.test(s) ||   // DW-10025, DW 10025  
           /^OPS[-\s]?\d{3,}/i.test(s) ||  // OPS-262728
           /^id[-\s]?\d{3,}/i.test(s) ||   // ID-12345
           /^\d{6,}$/.test(s);              // 1615632 (pure 6+ digit number)
}

function isHeaderRow(cols) {
    const joined = cols.join(' ').toLowerCase();
    return joined.includes('nama') || joined.includes('name') || 
           joined.includes('ops') || joined.includes('id card') ||
           joined.includes('no.') || joined.includes('header');
}

window.generateBulkIdCard = function() {
    const raw = document.getElementById('idcardBulkData').value.trim();
    if (!raw) return alert('Paste data dari Excel/Sheet terlebih dahulu!');
    
    const theme = document.getElementById('idcardTheme') ? document.getElementById('idcardTheme').value : 'light';
    const lines = raw.split(/\r?\n/);
    let cardsHtml = '';
    let count = 0;
    let skipped = [];
    
    lines.forEach((line, i) => {
        if (!line.trim()) return;
        
        // Smart delimiter detection: TAB > semicolon > comma > multi-space
        let columns;
        if (line.includes('\t')) {
            columns = line.split('\t');
        } else if (line.includes(';')) {
            columns = line.split(';');
        } else if (line.includes(',')) {
            columns = line.split(',');
        } else {
            // Fallback: split on 2+ spaces
            columns = line.split(/\s{2,}/);
        }
        
        columns = columns.map(c => c.trim()).filter(c => c);
        
        // Skip header row
        if (i === 0 && isHeaderRow(columns)) return;
        
        let nama = null, ops = null;
        
        if (columns.length >= 2) {
            // Smart detection: find which column is OPS ID
            for (let c = 0; c < columns.length; c++) {
                if (isOpsId(columns[c])) {
                    ops = columns[c];
                    // Nama = the other column(s) combined (excluding numbers-only columns like row numbers)
                    const nameParts = columns.filter((col, idx) => {
                        if (idx === c) return false;
                        if (/^\d{1,3}$/.test(col.trim())) return false; // skip row numbers (1-999)
                        return true;
                    });
                    nama = nameParts.join(' ').trim();
                    break;
                }
            }
            
            // If no OPS ID pattern found, assume first = name, last = ops
            if (!ops) {
                // Check if first column looks like a row number
                const startIdx = /^\d{1,3}$/.test(columns[0]) ? 1 : 0;
                if (startIdx < columns.length - 1) {
                    nama = columns[startIdx];
                    ops = columns[columns.length - 1];
                }
            }
        } else if (columns.length === 1) {
            // Single column: try smart split on the text itself
            const text = columns[0];
            // Try to find OPS pattern embedded in text
            const opsMatch = text.match(/(ops\d{3,}|dw[-\s]?\d{3,})/i);
            if (opsMatch) {
                ops = opsMatch[0];
                nama = text.replace(opsMatch[0], '').trim().replace(/^[\s,;-]+|[\s,;-]+$/g, '');
            }
        }
        
        if (nama && ops) {
            cardsHtml += renderSingleCardView(nama, ops, theme);
            count++;
        } else {
            skipped.push(`Baris ${i+1}: "${line.substring(0, 50)}..."`);
        }
    });
    
    if (count === 0) {
        return alert(
            'Gagal mem-parsing data.\n\n' +
            'Format OPS ID yang didukung:\n' +
            '• ops262728\n' + 
            '• Ops1615632\n' +
            '• DW-10025\n' + 
            '• OPS-262728\n\n' +
            'Sistem otomatis mendeteksi kolom mana yang berisi Nama dan OPS ID.\n' +
            'Urutan kolom bebas!' +
            (skipped.length ? '\n\nBaris yang di-skip:\n' + skipped.slice(0, 5).join('\n') : '')
        );
    }
    
    const area = document.getElementById('printIdCardArea');
    area.innerHTML = cardsHtml;
    renderQRCodes();
    _canvasCache = null;
    addPrintNotice(area, count);
    
    if (skipped.length) {
        console.warn('Baris yang di-skip:', skipped);
    }
};

window.generateAllKaryawanCards = function() {
    const valid = candidates.filter(c => c.status === 'Lulus' && c.given_id);
    if (!valid.length) return alert('Tidak ada data karyawan yang Lulus dan memiliki ID OPS.');
    
    const theme = document.getElementById('idcardTheme') ? document.getElementById('idcardTheme').value : 'light';
    let cardsHtml = '';
    valid.forEach(c => {
        cardsHtml += renderSingleCardView(c.nama, c.given_id, theme);
    });
    
    const area = document.getElementById('printIdCardArea');
    area.innerHTML = cardsHtml;
    renderQRCodes();
    _canvasCache = null;
    addPrintNotice(area, valid.length);
};

window.renderQRCodes = function() {
    if (typeof QRious === 'undefined') return;
    document.querySelectorAll('#printIdCardArea .qr-canvas').forEach(canvas => {
        new QRious({
            element: canvas,
            value: canvas.getAttribute('data-value'),
            size: 130,
            level: 'H'
        });
        canvas.style.borderRadius = "8px";
    });
};

function addPrintNotice(container, count = 1) {
    const notice = document.createElement('div');
    notice.className = "w-full mt-4 p-4 rounded-xl border border-blue-500/30 bg-blue-500/10 flex items-center justify-between print:hidden";
    notice.innerHTML = `
        <div>
            <p class="text-sm font-bold text-blue-400">✅ Berhasil menghasilkan ${count} ID Card!</p>
            <p class="text-xs text-blue-400/80 mt-1">Gunakan tombol <strong>Unduh</strong> di sebelah kanan untuk mengekspor.</p>
        </div>
        <div class="relative">
            <button id="btnDropUnduh" onclick="toggleDownloadMenu()" class="px-5 py-2.5 rounded-xl bg-teal-400 text-teal-950 font-extrabold text-[11px] hover:bg-teal-300 transition-all shadow-lg shadow-teal-500/20 flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                Unduh
                <svg class="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
            </button>
            <div id="dropUnduh" class="hidden absolute right-0 mt-2 w-56 bg-white text-slate-800 rounded-xl shadow-xl overflow-hidden z-50 border border-slate-100 divide-y divide-slate-100 origin-top-right transition-all">
                <button onclick="downloadAs('zip')" class="w-full text-left px-4 py-3 text-[11px] font-bold hover:bg-slate-50 flex items-center gap-3">
                    <svg class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/></svg>
                    <div><span class="text-slate-700 font-extrabold">JPG</span> <span class="text-emerald-500 font-bold">(ZIP)</span> <span class="text-slate-400 font-normal">— semua gambar</span></div>
                </button>
                <button onclick="downloadAs('pdf')" class="w-full text-left px-4 py-3 text-[11px] font-bold hover:bg-slate-50 flex items-center gap-3">
                    <svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                    <div><span class="text-slate-700 font-extrabold">PDF</span> <span class="text-slate-400 font-normal">— siap cetak</span></div>
                </button>
            </div>
        </div>
    `;
    container.prepend(notice);
}

window.toggleDownloadMenu = function() {
    const d = document.getElementById('dropUnduh');
    if (d) d.classList.toggle('hidden');
};

document.addEventListener('click', (e) => {
    const drop = document.getElementById('dropUnduh');
    if (drop && !e.target.closest('#btnDropUnduh') && !e.target.closest('#dropUnduh')) {
        drop.classList.add('hidden');
    }
});

// Canvas cache to avoid re-rendering
let _canvasCache = null;

function showDownloadOverlay(total, current) {
    let overlay = document.getElementById('downloadOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'downloadOverlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.8);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;';
        document.body.appendChild(overlay);
    }
    const pct = total > 0 ? Math.round((current / total) * 100) : 0;
    overlay.innerHTML = `<div style="text-align:center;color:#fff;font-family:Inter,sans-serif;min-width:280px">
        <div style="width:44px;height:44px;border:3px solid rgba(255,255,255,0.1);border-top-color:#4cc9f0;border-radius:50%;animation:spin 0.5s linear infinite;margin:0 auto 16px"></div>
        <p id="dlProgress" style="font-size:14px;font-weight:800;letter-spacing:0.5px">${current} / ${total}</p>
        <div style="margin:12px auto;width:220px;height:6px;background:rgba(255,255,255,0.1);border-radius:99px;overflow:hidden">
            <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,#4cc9f0,#00f5d4);border-radius:99px;transition:width 0.2s"></div>
        </div>
        <p style="font-size:10px;color:rgba(255,255,255,0.4);margin-top:6px">Sedang merender kartu...</p>
    </div>
    <style>@keyframes spin{to{transform:rotate(360deg)}}</style>`;
    overlay.style.display = 'flex';
}

function updateOverlayProgress(total, current, phase) {
    const overlay = document.getElementById('downloadOverlay');
    if (!overlay) return;
    const pct = Math.round((current / total) * 100);
    const prog = overlay.querySelector('#dlProgress');
    if (prog) prog.textContent = current + ' / ' + total;
    const bar = overlay.querySelector('div > div > div:last-child > div');
    if (bar) bar.style.width = pct + '%';
    const msg = overlay.querySelector('div > p:last-child');
    if (msg && phase) msg.textContent = phase;
}

function hideDownloadOverlay() {
    const overlay = document.getElementById('downloadOverlay');
    if (overlay) overlay.style.display = 'none';
}

// ═══════════════════════════════════════════════════════════
//  CANVAS 2D DIRECT RENDERING ENGINE (50x faster than html2canvas)
// ═══════════════════════════════════════════════════════════

// Pre-load BAS logo once
let _basLogoImg = null;
function getBasLogo() {
    return new Promise((resolve) => {
        if (_basLogoImg) return resolve(_basLogoImg);
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => { _basLogoImg = img; resolve(img); };
        img.onerror = () => resolve(null);
        img.src = 'assets/LogoBas.png';
    });
}

function drawCardDirect(ctx, w, h, nama, opsid, isLight) {
    // ── Background ──
    if (isLight) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        // Light overlay
        const lg = ctx.createLinearGradient(0, 0, w * 0.8, h);
        lg.addColorStop(0, 'rgba(59,130,246,0.04)');
        lg.addColorStop(0.5, 'rgba(59,130,246,0.02)');
        lg.addColorStop(1, 'rgba(147,51,234,0.03)');
        ctx.fillStyle = lg;
        ctx.fillRect(0, 0, w, h);
    } else {
        const bg = ctx.createLinearGradient(0, 0, w * 0.6, h);
        bg.addColorStop(0, '#0d0025');
        bg.addColorStop(0.3, '#10002b');
        bg.addColorStop(0.6, '#1a0a3e');
        bg.addColorStop(1, '#0d0025');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);
        // Overlay gradient
        const ov = ctx.createLinearGradient(0, 0, 0, h);
        ov.addColorStop(0, 'rgba(16,0,43,0.05)');
        ov.addColorStop(0.5, 'rgba(16,0,43,0.15)');
        ov.addColorStop(1, 'rgba(16,0,43,0.3)');
        ctx.fillStyle = ov;
        ctx.fillRect(0, 0, w, h);
    }

    const textColor = isLight ? '#1e293b' : '#ffffff';
    const subColor = isLight ? '#3b82f6' : '#3b82f6';
    const opsColor = isLight ? '#0d9488' : '#00f5d4';

    // ── Logo (top-left) ──
    if (_basLogoImg) {
        const logoH = h * 0.06;
        const logoW = logoH * (_basLogoImg.width / _basLogoImg.height);
        const logoX = w * 0.08;
        const logoY = h * 0.06;
        if (isLight) {
            ctx.drawImage(_basLogoImg, logoX, logoY, logoW, logoH);
        } else {
            // White logo for dark mode
            ctx.globalCompositeOperation = 'difference';
            ctx.drawImage(_basLogoImg, logoX, logoY, logoW, logoH);
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 0.9;
            ctx.drawImage(_basLogoImg, logoX, logoY, logoW, logoH);
            ctx.globalAlpha = 1.0;
        }
    }

    // ── Accent bars (top-right) ──
    const barX = w * 0.86;
    // Blue bar
    ctx.fillStyle = '#1d4ed8';
    ctx.shadowColor = 'rgba(29,78,216,0.6)';
    ctx.shadowBlur = 6;
    roundRect(ctx, barX, h * 0.06, w * 0.02, h * 0.05, 99);
    ctx.fill();
    // Second bar
    ctx.fillStyle = '#3b82f6';
    ctx.shadowColor = 'rgba(59,130,246,0.6)';
    roundRect(ctx, barX + w * 0.03, h * 0.075, w * 0.02, h * 0.035, 99);
    ctx.fill();
    ctx.shadowBlur = 0;

    // ── QR Code ──
    const qrSize = w * 0.35;
    const qrOuterPad = w * 0.04;
    const qrInnerPad = w * 0.03;
    const qrTotalOuter = qrSize + qrInnerPad * 2 + qrOuterPad * 2;
    const qrX = (w - qrTotalOuter) / 2;
    const qrY = h * 0.16;

    // QR outer container (dark glass)
    ctx.fillStyle = isLight ? 'rgba(241,245,249,0.8)' : 'rgba(10,5,24,0.8)';
    ctx.strokeStyle = isLight ? 'rgba(59,130,246,0.15)' : 'rgba(29,78,216,0.25)';
    ctx.lineWidth = 1;
    if (!isLight) {
        ctx.shadowColor = 'rgba(29,78,216,0.15)';
        ctx.shadowBlur = 20;
    }
    roundRect(ctx, qrX, qrY, qrTotalOuter, qrTotalOuter, w * 0.06);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // QR inner white box
    const qrInnerX = qrX + qrOuterPad;
    const qrInnerY = qrY + qrOuterPad;
    const qrInnerTotal = qrSize + qrInnerPad * 2;
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, qrInnerX, qrInnerY, qrInnerTotal, qrInnerTotal, w * 0.04);
    ctx.fill();

    // Draw QR code using QRious
    const qrCanvas = document.createElement('canvas');
    new QRious({ element: qrCanvas, value: opsid, size: Math.round(qrSize), level: 'H' });
    ctx.drawImage(qrCanvas, qrInnerX + qrInnerPad, qrInnerY + qrInnerPad, qrSize, qrSize);

    // ── OPS ID ──
    const opsY = qrY + qrTotalOuter + h * 0.05;
    ctx.font = `900 ${w * 0.065}px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace`;
    ctx.textAlign = 'center';
    ctx.fillStyle = opsColor;
    if (!isLight) {
        ctx.shadowColor = 'rgba(0,245,212,0.4)';
        ctx.shadowBlur = 8;
    }
    ctx.fillText(opsid.toUpperCase(), w / 2, opsY);
    ctx.shadowBlur = 0;

    // ── Employee Name ──
    const nameY = opsY + h * 0.07;
    ctx.fillStyle = textColor;
    ctx.font = `900 ${w * 0.048}px Inter,system-ui,sans-serif`;
    ctx.textAlign = 'center';
    
    // Word wrap for long names
    const maxNameW = w * 0.85;
    const nameUpper = nama.toUpperCase();
    const words = nameUpper.split(' ');
    let lines = [];
    let currentLine = '';
    for (const word of words) {
        const testLine = currentLine ? currentLine + ' ' + word : word;
        if (ctx.measureText(testLine).width > maxNameW && currentLine) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }
    if (currentLine) lines.push(currentLine);
    
    const lineH = h * 0.045;
    for (let l = 0; l < lines.length; l++) {
        if (!isLight) {
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 6;
        }
        ctx.fillText(lines[l], w / 2, nameY + l * lineH);
    }
    ctx.shadowBlur = 0;

    // ── Position line: ─── DAILY WORKER ─── ──
    const posY = nameY + lines.length * lineH + h * 0.03;
    ctx.font = `700 ${w * 0.03}px Inter,system-ui,sans-serif`;
    ctx.fillStyle = subColor;
    ctx.textAlign = 'center';
    const posText = 'DAILY WORKER';
    const posTextW = ctx.measureText(posText).width;
    const barW = w * 0.1;
    const barGap = w * 0.025;
    
    // Left bar
    const lg1 = ctx.createLinearGradient(w/2 - posTextW/2 - barGap - barW, 0, w/2 - posTextW/2 - barGap, 0);
    lg1.addColorStop(0, 'transparent');
    lg1.addColorStop(0.5, subColor);
    lg1.addColorStop(1, 'transparent');
    ctx.fillStyle = lg1;
    ctx.fillRect(w/2 - posTextW/2 - barGap - barW, posY - h*0.003, barW, h*0.004);
    
    ctx.fillStyle = subColor;
    ctx.letterSpacing = '0.2em';
    ctx.fillText(posText, w / 2, posY);
    
    // Right bar
    const lg2 = ctx.createLinearGradient(w/2 + posTextW/2 + barGap, 0, w/2 + posTextW/2 + barGap + barW, 0);
    lg2.addColorStop(0, 'transparent');
    lg2.addColorStop(0.5, subColor);
    lg2.addColorStop(1, 'transparent');
    ctx.fillStyle = lg2;
    ctx.fillRect(w/2 + posTextW/2 + barGap, posY - h*0.003, barW, h*0.004);
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
}

window.downloadAs = async function(format) {
    const cards = document.querySelectorAll('#printIdCardArea .id-card');
    if (!cards.length) return alert('Tidak ada ID Card untuk diunduh.');
    
    document.getElementById('dropUnduh').classList.add('hidden');
    const total = cards.length;
    showDownloadOverlay(total, 0);

    // Pre-load logo
    await getBasLogo();

    // Collect card data from DOM (instant)
    const cardDataList = [];
    cards.forEach(card => {
        cardDataList.push({
            nama: card.querySelector('.emp-name')?.textContent || 'Unknown',
            opsid: card.querySelector('.ops-id')?.textContent || 'OPS000',
            isLight: card.classList.contains('light-theme')
        });
    });

    // Canvas dimensions (match card ratio)
    const W = 600, H = 960; // 2x resolution of 300x480

    try {
        if (format === 'png' || format === 'zip') {
            if (typeof JSZip === 'undefined') return alert('JSZip library belum dimuat.');
            const zip = new JSZip();
            const folder = zip.folder('ID_Cards_BAS');
            
            const canvas = document.createElement('canvas');
            canvas.width = W;
            canvas.height = H;
            const ctx = canvas.getContext('2d');
            
            for (let i = 0; i < total; i++) {
                const d = cardDataList[i];
                const empName = d.nama.replace(/[^a-zA-Z0-9]/g, '_');

                // Clear and draw
                ctx.clearRect(0, 0, W, H);
                drawCardDirect(ctx, W, H, d.nama, d.opsid, d.isLight);
                
                const dataUrl = canvas.toDataURL('image/jpeg', 0.90);
                folder.file('IDCard_' + empName + '_' + (i+1) + '.jpg', dataUrl.split(',')[1], { base64: true });
                
                if (i % 10 === 0) {
                    await new Promise(r => setTimeout(r, 0)); // yield every 10 cards
                    updateOverlayProgress(total, i + 1, 'Merender kartu... ⚡');
                }
            }
            updateOverlayProgress(total, total, 'Merender kartu... ⚡');
            
            // Clean up
            canvas.width = 0;
            canvas.height = 0;
            
            updateOverlayProgress(total, total, 'Membuat file ZIP...');
            const blob = await zip.generateAsync({ type: 'blob' });
            saveAs(blob, 'IDCards_BAS_' + new Date().toISOString().slice(0,10) + '.zip');
        } 
        else if (format === 'pdf') {
            if (!window.jspdf || !window.jspdf.jsPDF) return alert('jsPDF library belum dimuat.');
            const { jsPDF } = window.jspdf;
            const cardW = 75;
            const cardH = cardW * (H / W);
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [cardW, cardH] });
            
            const canvas = document.createElement('canvas');
            canvas.width = W;
            canvas.height = H;
            const ctx = canvas.getContext('2d');
            
            for (let i = 0; i < total; i++) {
                const d = cardDataList[i];
                
                ctx.clearRect(0, 0, W, H);
                drawCardDirect(ctx, W, H, d.nama, d.opsid, d.isLight);
                
                if (i > 0) pdf.addPage([cardW, cardH], 'portrait');
                pdf.addImage(canvas.toDataURL('image/jpeg', 0.90), 'JPEG', 0, 0, cardW, cardH);
                
                if (i % 10 === 0) {
                    await new Promise(r => setTimeout(r, 0));
                    updateOverlayProgress(total, i + 1, 'Merender kartu... ⚡');
                }
            }
            updateOverlayProgress(total, total, 'Merender kartu... ⚡');
            
            canvas.width = 0;
            canvas.height = 0;
            
            updateOverlayProgress(total, total, 'Menyimpan PDF...');
            pdf.save('IDCards_BAS_' + new Date().toISOString().slice(0,10) + '.pdf');
        }
    } catch(e) {
        console.error('Download error:', e);
        alert('Terjadi error saat download: ' + e.message);
    } finally {
        hideDownloadOverlay();
    }
};

// ═══════════════════════════════════════════════════════════
//  INLINE OPS ID EDITING
// ═══════════════════════════════════════════════════════════
window.editOpsId = function(td, candidateId, currentValue) {
    // Prevent multiple edits
    if (td.querySelector('input')) return;
    
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentValue;
    input.className = 'w-28 px-2 py-1 rounded bg-black/50 border border-accent-orange/50 text-accent-orange text-[11px] font-mono font-bold outline-none focus:border-accent-orange';
    input.placeholder = 'OPS ID...';
    
    td.innerHTML = '';
    td.appendChild(input);
    input.focus();
    input.select();
    
    const save = async () => {
        const newVal = input.value.trim();
        try {
            const res = await fetch('./api/admin.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'update_ops_id', id: candidateId, ops_id: newVal })
            });
            const data = await res.json();
            if (data.success) {
                // Update local state
                const c = candidates.find(x => x.id == candidateId);
                if (c) c.given_id = newVal;
                renderTable();
            } else {
                alert('Gagal: ' + (data.error || 'Unknown error'));
                renderTable();
            }
        } catch(e) {
            alert('Koneksi gagal');
            renderTable();
        }
    };
    
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); save(); }
        if (e.key === 'Escape') renderTable();
    });
    input.addEventListener('blur', save);
};

// ═══════════════════════════════════════════════════════════
//  KORLAP MANAGEMENT (Owner Only)
// ═══════════════════════════════════════════════════════════
async function fetchAdmins() {
    try {
        const res = await fetch('./api/admin.php?action=get_admins');
        const data = await res.json();
        if (data.success) {
            admins = data.admins || [];
            renderAdminTable();
        } else {
            const tbody = document.getElementById('korlapTbody');
            if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="py-8 text-center text-red-400 italic">' + (data.error || 'Gagal memuat data') + '</td></tr>';
        }
    } catch(e) {
        console.warn('Failed fetching admins:', e);
    }
}

function renderAdminTable() {
    const tbody = document.getElementById('korlapTbody');
    if (!tbody) return;
    
    if (!admins.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="py-8 text-center text-slate-500 italic">Belum ada data admin.</td></tr>';
        return;
    }
    
    const tdClass = 'px-4 py-3 whitespace-nowrap';
    tbody.innerHTML = admins.map(a => {
        const roleColors = {
            'owner': { bg: 'bg-accent-orange/15', text: 'text-accent-orange', border: 'border-accent-orange/30' },
            'korlap': { bg: 'bg-accent-cyan/15', text: 'text-accent-cyan', border: 'border-accent-cyan/30' }
        };
        const rc = roleColors[a.role] || roleColors['korlap'];
        const isMe = a.id == (window._currentAdminId || 0);
        
        return `
        <tr class="hover:bg-white/5 transition-colors">
            <td class="${tdClass} text-slate-500 font-mono">${a.id}</td>
            <td class="${tdClass} font-bold text-white font-mono">${esc(a.username)}</td>
            <td class="${tdClass} text-slate-300">${esc(a.name || '-')}</td>
            <td class="${tdClass}">
                <span class="px-2 py-0.5 rounded-full border ${rc.border} ${rc.bg} ${rc.text} text-[10px] font-bold tracking-wide uppercase">${esc(a.role)}</span>
            </td>
            <td class="${tdClass} text-center">
                ${isMe 
                    ? '<span class="text-[10px] text-slate-500 italic">Anda</span>' 
                    : `<button onclick="deleteKorlap(${a.id}, '${esc(a.username)}')" class="px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg text-[10px] font-bold transition">Hapus</button>`
                }
            </td>
        </tr>`;
    }).join('');
}

window.toggleKorlapForm = function() {
    const form = document.getElementById('korlapForm');
    if (form) form.classList.toggle('hidden');
};

window.createKorlap = async function() {
    const username = document.getElementById('korlapUsername').value.trim();
    const password = document.getElementById('korlapPassword').value;
    const name = document.getElementById('korlapName').value.trim();
    const role = document.getElementById('korlapRole').value;
    
    if (!username || !password || !name) return alert('Semua field wajib diisi!');
    if (password.length < 6) return alert('Password minimal 6 karakter');
    
    try {
        const res = await fetch('./api/admin.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'create_admin', username, password, name, role })
        });
        const data = await res.json();
        if (data.success) {
            alert('✅ Akun ' + role + ' berhasil dibuat!');
            document.getElementById('korlapUsername').value = '';
            document.getElementById('korlapPassword').value = '';
            document.getElementById('korlapName').value = '';
            document.getElementById('korlapForm').classList.add('hidden');
            fetchAdmins();
        } else {
            alert('❌ ' + (data.error || 'Gagal membuat akun'));
        }
    } catch(e) {
        alert('Koneksi gagal');
    }
};

window.deleteKorlap = async function(id, username) {
    if (!confirm(`Hapus akun "${username}"? Akun ini tidak akan bisa login lagi.`)) return;
    
    try {
        const res = await fetch('./api/admin.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete_admin', id })
        });
        const data = await res.json();
        if (data.success) {
            fetchAdmins();
        } else {
            alert('❌ ' + (data.error || 'Gagal menghapus'));
        }
    } catch(e) {
        alert('Koneksi gagal');
    }
};

// ── Logout ──
async function logout() {
    sessionStorage.removeItem('bas_owner_auth');
    sessionStorage.removeItem('bas_owner_profile');
    sessionStorage.removeItem('bas_demo_user');
    localStorage.removeItem('bas_session');
    try { await fetch('./api/user-auth.php?action=logout', { method: 'POST' }); } catch (e) {}
    window.location.replace('login.html');
}

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
    applyTheme(getTheme());
    fetchData();
});
