/**
 * BAS DW Admin V2 — Modules
 * Analytics, AI Insights, Korlap, Locations, Blacklist, Settings
 */
function initModules() {
    initAnalytics();
    initDWCalendar();
    initAI();
    initKorlap();
    initLocations();
    initBlacklist();
    initSettings();
}

// ═══ ANALYTICS ═══
let _analyticsDays = 30;
let _analyticsFrom = null;
let _analyticsTo = null;

function initAnalytics(rangeDays, fromDate, toDate) {
    // Use passed params or stored state
    if (typeof rangeDays === 'number') _analyticsDays = rangeDays;
    if (fromDate) _analyticsFrom = fromDate;
    if (toDate) _analyticsTo = toDate;

    const allData = filterByProvince(DUMMY.candidates);
    const cc = getChartColors();

    // Determine date range
    let dateFrom, dateTo;
    if (_analyticsFrom && _analyticsTo) {
        dateFrom = new Date(_analyticsFrom); dateFrom.setHours(0,0,0,0);
        dateTo = new Date(_analyticsTo); dateTo.setHours(23,59,59,999);
    } else {
        dateTo = new Date(); dateTo.setHours(23,59,59,999);
        dateFrom = new Date(); dateFrom.setDate(dateFrom.getDate() - _analyticsDays + 1); dateFrom.setHours(0,0,0,0);
    }

    // Filter data by date range (based on created_at)
    const data = allData.filter(function(c) {
        if (!c.created_at) return true;
        var cd = new Date(c.created_at);
        return cd >= dateFrom && cd <= dateTo;
    });

    // Calculate days between
    var daysDiff = Math.max(1, Math.ceil((dateTo - dateFrom) / (1000*60*60*24)));

    // Update info label
    var infoEl = document.getElementById('daterangeInfo');
    var fromStr = dateFrom.toLocaleDateString('id-ID', {day:'numeric',month:'short',year:'numeric'});
    var toStr = dateTo.toLocaleDateString('id-ID', {day:'numeric',month:'short',year:'numeric'});
    if (infoEl) infoEl.textContent = fromStr + ' — ' + toStr + ' · ' + data.length + ' kandidat · ' + daysDiff + ' hari';

    // Update trend label
    var trendLabel = document.getElementById('trendRangeLabel');
    if (trendLabel) trendLabel.textContent = '— ' + daysDiff + ' hari';

    // Build trend data for the range
    const days = [], counts = [];
    // Determine tick grouping
    var groupByWeek = daysDiff > 60;
    if (groupByWeek) {
        // Group by week
        var weekStart = new Date(dateFrom);
        while (weekStart <= dateTo) {
            var weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);
            if (weekEnd > dateTo) weekEnd = dateTo;
            days.push(weekStart.toLocaleDateString('id-ID', {day:'2-digit',month:'short'}));
            var cnt = allData.filter(function(c) {
                if (!c.created_at) return false;
                var cd = new Date(c.created_at);
                return cd >= weekStart && cd <= weekEnd;
            }).length || Math.floor(Math.random() * 8) + 1;
            counts.push(cnt);
            weekStart = new Date(weekEnd); weekStart.setDate(weekStart.getDate() + 1);
        }
    } else {
        for (var i = daysDiff - 1; i >= 0; i--) {
            var d = new Date(dateTo); d.setDate(d.getDate() - i);
            days.push(d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }));
            var dateStr = d.toISOString().split('T')[0];
            var cnt = allData.filter(function(c) { return c.created_at === dateStr; }).length;
            counts.push(cnt || Math.floor(Math.random() * 6) + 1);
        }
    }

    // Trend chart
    chartInstances.trend30 = new Chart(document.getElementById('chartTrend30'), {
        type: 'line',
        data: { labels: days, datasets: [{ label: 'Pendaftar', data: counts, borderColor: '#38BDF8', backgroundColor: 'rgba(56,189,248,.08)', fill: true, tension: .4, pointRadius: daysDiff > 60 ? 3 : 2, borderWidth: 2 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: cc.grid }, ticks: { color: cc.text, font: { size: 10 }, maxTicksLimit: daysDiff > 30 ? 12 : 15 } }, y: { grid: { color: cc.grid }, ticks: { color: cc.text, font: { size: 10 } }, beginAtZero: true } } }
    });

    // Status bar (filtered data)
    const statusCounts = {};
    data.forEach(c => { statusCounts[c.status] = (statusCounts[c.status] || 0) + 1; });
    const scl = { 'Belum Pemberkasan': '#38BDF8', 'Sudah Pemberkasan': '#FBBF24', 'Lulus': '#22C55E', 'Tidak Lulus': '#EF4444' };
    chartInstances.statusBar = new Chart(document.getElementById('chartStatusBar'), {
        type: 'bar',
        data: { labels: Object.keys(statusCounts), datasets: [{ data: Object.values(statusCounts), backgroundColor: Object.keys(statusCounts).map(k => scl[k] || '#8B5CF6'), borderRadius: 6, borderSkipped: false }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { color: cc.text, font: { size: 10 } } }, y: { grid: { color: cc.grid }, ticks: { color: cc.text, font: { size: 10 } }, beginAtZero: true } } }
    });

    // Pass rate per station (filtered data)
    const stationStats = {};
    data.forEach(c => {
        if (!stationStats[c.station]) stationStats[c.station] = { total: 0, lulus: 0 };
        stationStats[c.station].total++;
        if (c.status === 'Lulus') stationStats[c.station].lulus++;
    });
    chartInstances.passRate = new Chart(document.getElementById('chartPassRate'), {
        type: 'bar',
        data: { labels: Object.keys(stationStats), datasets: [{ label: 'Pass Rate %', data: Object.values(stationStats).map(s => s.total > 0 ? Math.round((s.lulus / s.total) * 100) : 0), backgroundColor: 'rgba(34,197,94,.6)', borderRadius: 6, borderSkipped: false }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { color: cc.text, font: { size: 10 } } }, y: { grid: { color: cc.grid }, ticks: { color: cc.text, font: { size: 10 }, callback: v => v + '%' }, beginAtZero: true, max: 100 } } }
    });
}

// ═══ CALENDAR COMPONENT (Jarvis-style) ═══
const DW_CAL_DAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const DW_CAL_MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

let dwCalState = {
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
    startDate: null,
    endDate: null,
    dataDots: new Set()
};

function initDWCalendar() {
    var prevBtn = document.getElementById('dwCalPrev');
    var nextBtn = document.getElementById('dwCalNext');
    if (!prevBtn || !nextBtn) return;

    prevBtn.addEventListener('click', function() {
        dwCalState.month--;
        if (dwCalState.month < 0) { dwCalState.month = 11; dwCalState.year--; }
        renderDWCalendar();
    });
    nextBtn.addEventListener('click', function() {
        dwCalState.month++;
        if (dwCalState.month > 11) { dwCalState.month = 0; dwCalState.year++; }
        renderDWCalendar();
    });

    // Preset buttons
    document.querySelectorAll('.dw-cal-preset').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var days = parseInt(btn.dataset.days);
            if (days === 0) {
                dwCalState.startDate = null; dwCalState.endDate = null;
                document.querySelectorAll('.dw-cal-preset').forEach(function(b){b.classList.remove('active');});
                btn.classList.add('active');
                renderDWCalendar(); updateDWRangeDisplay(); refreshAnalyticsFromCal();
                return;
            }
            var end = new Date(); var start = new Date();
            start.setDate(start.getDate() - days + 1);
            dwCalState.startDate = start; dwCalState.endDate = end;
            dwCalState.year = end.getFullYear(); dwCalState.month = end.getMonth();
            document.querySelectorAll('.dw-cal-preset').forEach(function(b){b.classList.remove('active');});
            btn.classList.add('active');
            renderDWCalendar(); updateDWRangeDisplay(); refreshAnalyticsFromCal();
        });
    });

    // Build data dots from candidate dates
    (DUMMY.candidates || []).forEach(function(c) {
        if (c.created_at) dwCalState.dataDots.add(c.created_at);
    });

    // Default: 30 days
    var default30 = document.querySelector('.dw-cal-preset[data-days="30"]');
    if (default30) default30.click();
}

function renderDWCalendar() {
    var grid = document.getElementById('dwCalGrid');
    if (!grid) return;

    var y = dwCalState.year, m = dwCalState.month;
    var monthEl = document.getElementById('dwCalMonth');
    if (monthEl) monthEl.textContent = DW_CAL_MONTHS[m] + ' ' + y;

    var firstDay = new Date(y, m, 1).getDay();
    var daysInMonth = new Date(y, m + 1, 0).getDate();
    var startOffset = firstDay === 0 ? 6 : firstDay - 1;

    var today = new Date();
    var todayStr = dwFmtISO(today);

    var html = DW_CAL_DAYS.map(function(d) { return '<div class="dw-cal-head">' + d + '</div>'; }).join('');

    for (var i = 0; i < startOffset; i++) {
        html += '<div class="dw-cal-day dw-cal-day--empty"></div>';
    }

    for (var d = 1; d <= daysInMonth; d++) {
        var date = new Date(y, m, d);
        var iso = dwFmtISO(date);
        var classes = ['dw-cal-day'];

        if (iso === todayStr) classes.push('dw-cal-day--today');
        if (dwCalState.dataDots.has(iso)) classes.push('dw-cal-day--has-data');

        if (dwCalState.startDate && dwCalState.endDate) {
            var ds = dwFmtISO(dwCalState.startDate), de = dwFmtISO(dwCalState.endDate);
            if (iso === ds || iso === de) classes.push('dw-cal-day--selected');
            if (iso > ds && iso < de) classes.push('dw-cal-day--in-range');
        } else if (dwCalState.startDate && !dwCalState.endDate) {
            if (iso === dwFmtISO(dwCalState.startDate)) classes.push('dw-cal-day--selected');
        }

        html += '<div class="' + classes.join(' ') + '" data-date="' + iso + '">' +
            '<span class="dw-cal-day-num">' + d + '</span>' +
            (dwCalState.dataDots.has(iso) ? '<span class="dw-cal-dot"></span>' : '') +
            '</div>';
    }

    grid.innerHTML = html;

    // Click handlers
    grid.querySelectorAll('.dw-cal-day:not(.dw-cal-day--empty)').forEach(function(cell) {
        cell.addEventListener('click', function() {
            dwCalClickDay(cell.dataset.date);
        });
    });
}

function dwCalClickDay(isoStr) {
    var clickedDate = new Date(isoStr + 'T00:00:00');
    if (!dwCalState.startDate || (dwCalState.startDate && dwCalState.endDate)) {
        dwCalState.startDate = clickedDate;
        dwCalState.endDate = null;
    } else {
        if (clickedDate < dwCalState.startDate) {
            dwCalState.endDate = dwCalState.startDate;
            dwCalState.startDate = clickedDate;
        } else {
            dwCalState.endDate = clickedDate;
        }
        document.querySelectorAll('.dw-cal-preset').forEach(function(b){b.classList.remove('active');});
        refreshAnalyticsFromCal();
    }
    renderDWCalendar();
    updateDWRangeDisplay();
}

function updateDWRangeDisplay() {
    var el = document.getElementById('dwCalRangeDisplay');
    if (!el) return;
    if (dwCalState.startDate && dwCalState.endDate) {
        var s = dwCalState.startDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        var e = dwCalState.endDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
        var diff = Math.ceil((dwCalState.endDate - dwCalState.startDate) / 86400000) + 1;
        el.innerHTML = '<strong>' + s + ' — ' + e + '</strong> <span class="dw-cal-range-days">' + diff + ' hari</span>';
    } else if (dwCalState.startDate) {
        el.innerHTML = '<span class="dw-cal-range-hint">Klik tanggal akhir untuk menentukan rentang</span>';
    } else {
        el.innerHTML = '<span class="dw-cal-range-hint">Klik 2 tanggal untuk memilih rentang</span>';
    }
}

function refreshAnalyticsFromCal() {
    var fromISO = null, toISO = null;
    if (dwCalState.startDate && dwCalState.endDate) {
        fromISO = dwFmtISO(dwCalState.startDate);
        toISO = dwFmtISO(dwCalState.endDate);
    }
    // Destroy existing charts
    Object.keys(chartInstances).forEach(function(k) {
        if (chartInstances[k]) { chartInstances[k].destroy(); chartInstances[k] = null; }
    });
    if (fromISO && toISO) {
        initAnalytics(null, fromISO, toISO);
    } else {
        initAnalytics(30);
    }
}

function dwFmtISO(d) {
    return d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');
}


// ═══ AI INSIGHTS ═══
function initAI() {
    const data = filterByProvince(DUMMY.candidates);
    const total = data.length;
    const lulus = data.filter(c => c.status === 'Lulus').length;
    const gagal = data.filter(c => c.status === 'Tidak Lulus').length;

    // AI Stat cards
    const grid = document.getElementById('aiStatGrid');
    const aiStats = [
        { label: 'Potensi Tinggi', value: Math.max(1, Math.floor(total * 0.3)), icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a4 4 0 0 0-4 4c0 2 2 3 2 6h4c0-3 2-4 2-6a4 4 0 0 0-4-4z"/><line x1="10" y1="22" x2="14" y2="22"/></svg>' },
        { label: 'High Risk', value: gagal, icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' },
        { label: 'Avg. Score', value: '76', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>' },
        { label: 'Prediksi Minggu Depan', value: Math.floor(total * 1.2), icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>' },
    ];
    grid.innerHTML = aiStats.map(s => `
        <div class="stat-card">
            <div class="stat-card-top"><div class="stat-icon">${s.icon}</div><div class="stat-label">${s.label}</div></div>
            <div class="stat-value">${s.value}</div>
        </div>`).join('');

    // Insights list
    const list = document.getElementById('aiInsightsList');
    const insights = [
        { type: 'success', text: `${lulus} kandidat telah lulus. Pass rate: ${total > 0 ? Math.round((lulus/total)*100) : 0}%` },
        { type: 'warning', text: `${gagal} kandidat tidak lulus. Perlu evaluasi proses seleksi.` },
        { type: 'info', text: `Station dengan performa tertinggi: ${DUMMY.stations[0]}` },
        { type: 'info', text: `Prediksi pendaftar minggu depan: ~${Math.floor(total * 1.2)} kandidat` },
    ];
    const icolors = { success: '#22C55E', warning: '#FBBF24', info: '#38BDF8' };
    list.innerHTML = insights.map(i => `
        <div style="display:flex;gap:12px;align-items:flex-start;padding:14px 0;border-bottom:1px solid var(--border);">
            <div style="width:8px;height:8px;border-radius:50%;background:${icolors[i.type]};margin-top:5px;flex-shrink:0;"></div>
            <div style="font-size:.78rem;color:var(--t2);">${i.text}</div>
        </div>`).join('');
}

// ═══ KORLAP ═══
async function initKorlap() {
    buildProvCheckboxes('klProvinceList', 'kl-prov-cb', 'kl');
    await loadKorlapData();
    renderKorlap();
}

function buildProvCheckboxes(containerId, cbClass, prefix) {
    const list = document.getElementById(containerId);
    if (!list) return;
    list.innerHTML = ALL_PROVINCES.map(p =>
        '<label style="display:flex;align-items:center;gap:6px;font-size:.72rem;color:var(--t2);cursor:pointer;padding:3px 4px;">' +
        '<input type="checkbox" class="' + cbClass + '" value="' + p + '" onchange="updateProvLabel(\'' + prefix + '\')"> ' + p + '</label>'
    ).join('');
}

function toggleProvDropdown(id) {
    const el = document.getElementById(id);
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function toggleAllProv(checked, prefix) {
    const cls = prefix === 'kl' ? 'kl-prov-cb' : 'edit-prov-cb';
    document.querySelectorAll('.' + cls).forEach(cb => cb.checked = checked);
    updateProvLabel(prefix);
}

function updateProvLabel(prefix) {
    const cls = prefix === 'kl' ? 'kl-prov-cb' : 'edit-prov-cb';
    const all = document.querySelectorAll('.' + cls);
    const checked = document.querySelectorAll('.' + cls + ':checked');
    const labelEl = document.getElementById(prefix + 'ProvLabel');
    const allCb = document.getElementById(prefix + 'ProvAll');
    if (allCb) allCb.checked = checked.length === all.length;
    if (!labelEl) return;
    if (checked.length === 0 || checked.length === all.length) labelEl.textContent = 'Semua Provinsi';
    else labelEl.textContent = checked.length + ' provinsi dipilih';
}
function renderKorlap() {
    const tbody = document.getElementById('korlapTable');
    const data = DUMMY.korlaps;
    if (data.length === 0) { tbody.innerHTML = '<tr><td colspan="6" class="tbl-empty">Belum ada korlap</td></tr>'; return; }
    tbody.innerHTML = data.map(k => {
        const provText = (!k.allowed_provinces || k.allowed_provinces.length === 0)
            ? '<span class="badge" style="background:rgba(34,197,94,.15);color:#22C55E;">Semua Provinsi</span>'
            : k.allowed_provinces.map(p => '<span class="badge" style="background:var(--accent-d);color:var(--accent);margin:2px;">' + p + '</span>').join('');
        return `<tr>
        <td>${k.id}</td><td>${k.username}</td><td>${k.name}</td>
        <td><span class="badge badge-${k.role === 'korlap_interview' ? 'interview' : 'proses'}">${k.role}</span></td>
        <td>${provText}</td>
        <td style="display:flex;gap:6px;">
            <button class="act-btn" onclick="editKorlap(${k.id})" title="Edit Provinsi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
            <button class="act-btn" onclick="deleteKorlap(${k.id})" title="Hapus"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
        </td>
    </tr>`;
    }).join('');
}
async function createKorlap() {
    const u = document.getElementById('klUser').value.trim();
    const n = document.getElementById('klName').value.trim();
    const p = document.getElementById('klPass').value.trim();
    if (!u || !n || !p) { showToast('Isi semua field', 'error'); return; }
    try {
        const res = await fetch(API_BASE + 'korlap.php?action=create', {
            method: 'POST', credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: u, name: n, password: p, role: document.getElementById('klRole').value, location_id: 0 })
        });
        const data = await res.json();
        if (!data.success) { showToast(data.error || 'Gagal membuat korlap', 'error'); return; }
        document.getElementById('klUser').value = '';
        document.getElementById('klName').value = '';
        document.getElementById('klPass').value = '';
        await loadKorlapData();
        renderKorlap();
        showToast('Korlap berhasil dibuat');
    } catch(e) { showToast('Error: ' + e.message, 'error'); }
}
function editKorlap(id) {
    const k = DUMMY.korlaps.find(x => x.id === id);
    if (!k) return;
    document.getElementById('editKlId').value = id;
    document.getElementById('editKlName').textContent = k.name + ' (' + k.username + ')';
    const cont = document.getElementById('editKlProvinces');
    cont.innerHTML = ALL_PROVINCES.map(p =>
        '<label style="display:flex;align-items:center;gap:6px;font-size:.72rem;color:var(--t2);cursor:pointer;padding:3px 4px;">' +
        '<input type="checkbox" class="edit-prov-cb" value="' + p + '"' +
        ((!k.allowed_provinces || k.allowed_provinces.length === 0 || k.allowed_provinces.includes(p)) ? ' checked' : '') +
        ' onchange="updateEditProvCount()"> ' + p + '</label>'
    ).join('');
    document.getElementById('editKorlapModal').classList.add('show');
}
function saveKorlapEdit() {
    const id = +document.getElementById('editKlId').value;
    const k = DUMMY.korlaps.find(x => x.id === id);
    if (!k) return;
    const allCbs = document.querySelectorAll('.edit-prov-cb');
    const checked = [...document.querySelectorAll('.edit-prov-cb:checked')].map(cb => cb.value);
    k.allowed_provinces = (checked.length === allCbs.length) ? [] : checked;
    document.getElementById('editKorlapModal').classList.remove('show');
    renderKorlap();
    showToast('Akses provinsi diperbarui');
}
function updateEditProvCount() {
    // Optional: visual feedback in edit modal
}
async function deleteKorlap(id) {
    if (!confirm('Hapus korlap ini?')) return;
    try {
        const res = await fetch(API_BASE + 'korlap.php?action=delete&id=' + id, {
            method: 'DELETE', credentials: 'same-origin'
        });
        const data = await res.json();
        if (!data.success) { showToast(data.error || 'Gagal menghapus', 'error'); return; }
        DUMMY.korlaps = DUMMY.korlaps.filter(k => k.id !== id);
        renderKorlap();
        showToast('Korlap dihapus');
    } catch(e) { showToast('Error: ' + e.message, 'error'); }
}
async function loadKorlapData() {
    try {
        const res = await fetch(API_BASE + 'korlap.php?action=list', { credentials: 'same-origin' });
        const data = await res.json();
        DUMMY.korlaps = data.korlaps || [];
    } catch(e) { console.warn('Load korlap failed:', e); }
}

// ═══ LOCATIONS ═══
async function initLocations() {
    try {
        const res = await fetch(API_BASE + 'locations.php', { credentials: 'same-origin' });
        const data = await res.json();
        DUMMY.locations = data.locations || [];
    } catch(e) { console.warn('Load locations failed:', e); }
    renderLocations();
}
function renderLocations() {
    const tbody = document.getElementById('locTable');
    const data = DUMMY.locations;
    if (data.length === 0) { tbody.innerHTML = '<tr><td colspan="5" class="tbl-empty">Belum ada lokasi</td></tr>'; return; }
    tbody.innerHTML = data.map(l => `<tr>
        <td>${l.id}</td><td>${l.name}</td><td>${l.address}</td>
        <td>${l.maps_link ? '<a href="'+l.maps_link+'" target="_blank" style="color:var(--accent);">Buka</a>' : '-'}</td>
        <td><button class="act-btn" onclick="deleteLocation(${l.id})" title="Hapus"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button></td>
    </tr>`).join('');
}
async function createLocation() {
    const n = document.getElementById('locName').value.trim();
    if (!n) { showToast('Nama lokasi wajib diisi', 'error'); return; }
    try {
        const res = await fetch(API_BASE + 'locations.php', {
            method: 'POST', credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: n, address: document.getElementById('locAddr').value.trim(), maps_link: document.getElementById('locMaps').value.trim() })
        });
        const data = await res.json();
        if (!data.success) { showToast(data.error || 'Gagal menambah lokasi', 'error'); return; }
        document.getElementById('locName').value = '';
        document.getElementById('locAddr').value = '';
        document.getElementById('locMaps').value = '';
        await initLocations();
        showToast('Lokasi berhasil ditambahkan');
    } catch(e) { showToast('Error: ' + e.message, 'error'); }
}
async function deleteLocation(id) {
    if (!confirm('Hapus lokasi ini?')) return;
    try {
        const res = await fetch(API_BASE + 'locations.php', {
            method: 'DELETE', credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id })
        });
        const data = await res.json();
        if (!data.success) { showToast(data.error || 'Gagal menghapus', 'error'); return; }
        DUMMY.locations = DUMMY.locations.filter(l => l.id !== id);
        renderLocations();
        showToast('Lokasi dihapus');
    } catch(e) { showToast('Error: ' + e.message, 'error'); }
}

// ═══ BLACKLIST ═══
async function initBlacklist() {
    try {
        const res = await fetch(API_BASE + 'blacklist.php', { credentials: 'same-origin' });
        const data = await res.json();
        DUMMY.blacklists = (data.blacklists || []).map(b => ({ ...b, name: b.candidate_name || 'Unknown' }));
    } catch(e) { console.warn('Load blacklist failed:', e); }
    renderBlacklist();
}
function renderBlacklist() {
    const tbody = document.getElementById('blTable');
    const data = DUMMY.blacklists;
    if (data.length === 0) { tbody.innerHTML = '<tr><td colspan="5" class="tbl-empty">Belum ada blacklist</td></tr>'; return; }
    tbody.innerHTML = data.map(b => `<tr>
        <td style="font-variant-numeric:tabular-nums;">${b.nik}</td><td>${b.name}</td><td>${b.reason}</td><td>${b.created_at}</td>
        <td><button class="act-btn" onclick="deleteBlacklist(${b.id})" title="Hapus"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button></td>
    </tr>`).join('');
}
async function addBlacklist() {
    const nik = document.getElementById('blNik').value.trim();
    const reason = document.getElementById('blReason').value.trim();
    if (!nik || !reason) { showToast('NIK dan alasan wajib diisi', 'error'); return; }
    try {
        const res = await fetch(API_BASE + 'blacklist.php', {
            method: 'POST', credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nik: nik, reason: reason })
        });
        const data = await res.json();
        if (!data.success) { showToast(data.error || 'Gagal blacklist', 'error'); return; }
        document.getElementById('blNik').value = '';
        document.getElementById('blReason').value = '';
        await initBlacklist();
        showToast('NIK berhasil di-blacklist');
    } catch(e) { showToast('Error: ' + e.message, 'error'); }
}
async function deleteBlacklist(id) {
    if (!confirm('Hapus blacklist ini?')) return;
    try {
        const res = await fetch(API_BASE + 'blacklist.php', {
            method: 'DELETE', credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id })
        });
        const data = await res.json();
        if (!data.success) { showToast(data.error || 'Gagal menghapus', 'error'); return; }
        DUMMY.blacklists = DUMMY.blacklists.filter(b => b.id !== id);
        renderBlacklist();
        showToast('Blacklist dihapus');
    } catch(e) { showToast('Error: ' + e.message, 'error'); }
}

// ═══ SETTINGS ═══
function initSettings() {
    // Sub-tab navigation
    const nav = document.getElementById('settingsNav');
    if (!nav) return;
    nav.addEventListener('click', e => {
        const btn = e.target.closest('.settings-nav-item');
        if (!btn) return;
        nav.querySelectorAll('.settings-nav-item').forEach(x => x.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
        const panel = document.getElementById(btn.dataset.section);
        if (panel) panel.classList.add('active');
    });

    // Init linktree
    renderGroups();
    populateCategoryDropdowns();
    renderLinktree();
    // Init menu layanan
    initMenuConfig();
    // Init dropdown opts
    renderDropdownOpts();
    // Init system info
    const storageSize = JSON.stringify(localStorage).length;
    const sysStorage = document.getElementById('sysStorage');
    if (sysStorage) sysStorage.textContent = (storageSize / 1024).toFixed(1) + ' KB used';
}

// ── Maintenance ──
function saveMaintenance() {
    const on = document.getElementById('maintToggle').checked;
    const msg = document.getElementById('maintMessage').value;
    const est = document.getElementById('maintEstimate').value;
    showToast(on ? 'Maintenance mode ON' : 'Maintenance mode OFF');
}

// ── Group Management ──
function renderGroups() {
    var list = document.getElementById('groupList');
    if (!list) return;
    var cats = DUMMY.linktreeCategories || [];
    list.innerHTML = cats.map(function(g) {
        return '<div style="display:flex;align-items:center;gap:6px;padding:6px 12px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;">' +
            '<span style="font-size:.75rem;font-weight:600;" id="grp_' + g.replace(/\s/g,'_') + '">' + g + '</span>' +
            '<button class="act-btn" onclick="editGroup(\'' + g + '\')" title="Rename"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>' +
            '<button class="act-btn" onclick="deleteGroup(\'' + g + '\')" title="Hapus"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>' +
        '</div>';
    }).join('');
}

function populateCategoryDropdowns() {
    var cats = DUMMY.linktreeCategories || [];
    var sel = document.getElementById('ltCategory');
    if (sel) {
        sel.innerHTML = '';
        cats.forEach(function(c) { sel.add(new Option(c, c)); });
    }
}

function addGroup() {
    var name = document.getElementById('newGroupName').value.trim();
    if (!name) { showToast('Masukkan nama grup', 'error'); return; }
    if (!DUMMY.linktreeCategories) DUMMY.linktreeCategories = [];
    if (DUMMY.linktreeCategories.indexOf(name) !== -1) { showToast('Grup sudah ada', 'error'); return; }
    DUMMY.linktreeCategories.push(name);
    document.getElementById('newGroupName').value = '';
    renderGroups();
    populateCategoryDropdowns();
    showToast('Grup ditambahkan');
}

function editGroup(oldName) {
    var newName = prompt('Rename grup "' + oldName + '" menjadi:', oldName);
    if (!newName || newName.trim() === '' || newName === oldName) return;
    newName = newName.trim();
    var idx = DUMMY.linktreeCategories.indexOf(oldName);
    if (idx !== -1) DUMMY.linktreeCategories[idx] = newName;
    (DUMMY.linktree || []).forEach(function(lt) { if (lt.category === oldName) lt.category = newName; });
    renderGroups();
    populateCategoryDropdowns();
    renderLinktree();
    showToast('Grup diperbarui');
}

function deleteGroup(name) {
    if (name === 'Umum') { showToast('Grup Umum tidak bisa dihapus', 'error'); return; }
    if (!confirm('Hapus grup "' + name + '"? Link akan dipindah ke Umum.')) return;
    DUMMY.linktreeCategories = DUMMY.linktreeCategories.filter(function(c) { return c !== name; });
    (DUMMY.linktree || []).forEach(function(lt) { if (lt.category === name) lt.category = 'Umum'; });
    renderGroups();
    populateCategoryDropdowns();
    renderLinktree();
    showToast('Grup dihapus');
}

// ── Linktree Manager ──
const ICON_COLORS = { whatsapp:'#25D366', telegram:'#0088cc', instagram:'#E4405F', link:'#38BDF8', tiktok:'#000', youtube:'#FF0000' };
const ICON_SVG = {
    whatsapp:'<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>',
    telegram:'<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>',
    instagram:'<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 1 0 0-12.324zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405a1.441 1.441 0 1 1-2.88 0 1.441 1.441 0 0 1 2.88 0z"/></svg>',
    link:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
    tiktok:'<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>',
    youtube:'<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
};

function renderLinktree() {
    const list = document.getElementById('linktreeList');
    if (!list) return;
    const data = (DUMMY.linktree || []).sort((a,b) => a.order - b.order);
    if (data.length === 0) { list.innerHTML = '<p style="color:var(--t3);font-size:.75rem;text-align:center;padding:20px;">Belum ada link</p>'; return; }
    list.innerHTML = data.map(lt => {
        const color = ICON_COLORS[lt.icon] || '#38BDF8';
        const opacity = lt.active ? '1' : '.4';
        return '<div class="linktree-item" style="opacity:' + opacity + '">' +
            '<div class="linktree-item-icon" style="background:' + color + '20;color:' + color + ';">' + (ICON_SVG[lt.icon] || ICON_SVG.link) + '</div>' +
            '<div class="linktree-item-info">' +
                '<div class="linktree-item-title">' + lt.title + '</div>' +
                '<div class="linktree-item-url">' + lt.url + '</div>' +
            '</div>' +
            '<span class="linktree-item-badge" style="background:' + (lt.active?'rgba(34,197,94,.15)':'rgba(239,68,68,.15)') + ';color:' + (lt.active?'#22C55E':'#EF4444') + '">' + (lt.active?'Aktif':'Nonaktif') + '</span>' +
            '<span class="badge" style="background:var(--accent-d);color:var(--accent);">' + lt.category + '</span>' +
            '<button class="act-btn" onclick="editLinktree(' + lt.id + ')" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>' +
            '<button class="act-btn" onclick="toggleLinktree(' + lt.id + ')" title="Toggle"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>' +
            '<button class="act-btn" onclick="deleteLinktree(' + lt.id + ')" title="Hapus"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>' +
        '</div>';
    }).join('');
}

function addLinktree() {
    const title = document.getElementById('ltTitle').value.trim();
    const url = document.getElementById('ltUrl').value.trim();
    if (!title || !url) { showToast('Isi judul dan URL', 'error'); return; }
    if (!DUMMY.linktree) DUMMY.linktree = [];
    const maxId = DUMMY.linktree.reduce((m, x) => Math.max(m, x.id), 0);
    DUMMY.linktree.push({
        id: maxId + 1,
        title: title, url: url,
        icon: document.getElementById('ltIcon').value,
        category: document.getElementById('ltCategory').value,
        active: true,
        order: DUMMY.linktree.length + 1,
    });
    document.getElementById('ltTitle').value = '';
    document.getElementById('ltUrl').value = '';
    renderLinktree();
    showToast('Link berhasil ditambahkan');
}

function editLinktree(id) {
    const lt = (DUMMY.linktree || []).find(function(x) { return x.id === id; });
    if (!lt) return;
    const iconOpts = ['whatsapp','telegram','instagram','link','tiktok','youtube'].map(function(i) {
        return '<option value="' + i + '"' + (i === lt.icon ? ' selected' : '') + '>' + i.charAt(0).toUpperCase() + i.slice(1) + '</option>';
    }).join('');
    const catOpts = (DUMMY.linktreeCategories || ['Umum']).map(function(c) {
        return '<option value="' + c + '"' + (c === lt.category ? ' selected' : '') + '>' + c + '</option>';
    }).join('');
    const html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
        '<div><label class="s-form-label">Judul</label><input class="s-input" id="editLtTitle" value="' + lt.title + '"></div>' +
        '<div><label class="s-form-label">URL</label><input class="s-input" id="editLtUrl" value="' + lt.url + '"></div>' +
        '<div><label class="s-form-label">Icon</label><select class="s-input" id="editLtIcon">' + iconOpts + '</select></div>' +
        '<div><label class="s-form-label">Kategori</label><select class="s-input" id="editLtCategory">' + catOpts + '</select></div>' +
    '</div>' +
    '<button class="s-btn s-btn--primary" style="margin-top:16px;" onclick="saveLinktreeEdit(' + id + ')">Simpan</button>';
    openModal(html);
}

function saveLinktreeEdit(id) {
    const lt = (DUMMY.linktree || []).find(function(x) { return x.id === id; });
    if (!lt) return;
    lt.title = document.getElementById('editLtTitle').value.trim();
    lt.url = document.getElementById('editLtUrl').value.trim();
    lt.icon = document.getElementById('editLtIcon').value;
    lt.category = document.getElementById('editLtCategory').value;
    closeModal();
    renderLinktree();
    showToast('Link berhasil diperbarui');
}

function toggleLinktree(id) {
    const lt = (DUMMY.linktree || []).find(function(x) { return x.id === id; });
    if (lt) { lt.active = !lt.active; renderLinktree(); showToast(lt.active ? 'Link diaktifkan' : 'Link dinonaktifkan'); }
}

function deleteLinktree(id) {
    DUMMY.linktree = (DUMMY.linktree || []).filter(function(x) { return x.id !== id; });
    renderLinktree();
    showToast('Link dihapus');
}

// ── Menu Layanan per Provinsi ──
function initMenuConfig() {
    var sel = document.getElementById('menuProvSelect');
    if (!sel) return;
    sel.innerHTML = '<option value="_default">Default (Semua Provinsi)</option><option value="Jabodetabek">Jabodetabek</option>';
    ALL_PROVINCES.forEach(function(p) {
        var opt = document.createElement('option');
        opt.value = p; opt.textContent = p;
        sel.appendChild(opt);
    });
    loadMenuConfig('_default');
}

function loadMenuConfig(prov) {
    var config = DUMMY.menuConfig || {};
    var activeKeys = config[prov] || config['_default'] || ALL_SERVICE_MENUS.map(function(m) { return m.key; });
    var container = document.getElementById('menuCheckboxes');
    if (!container) return;
    container.innerHTML = ALL_SERVICE_MENUS.map(function(m) {
        var checked = activeKeys.indexOf(m.key) !== -1 ? ' checked' : '';
        return '<label style="display:flex;align-items:center;gap:8px;font-size:.78rem;color:var(--t2);cursor:pointer;padding:6px 8px;border-radius:6px;transition:background .15s;" onmouseover="this.style.background=\'var(--bg2)\'" onmouseout="this.style.background=\'transparent\'">' +
            '<input type="checkbox" class="menu-cfg-cb" value="' + m.key + '"' + checked + ' onchange="renderMenuPreview()"> ' + m.label +
        '</label>';
    }).join('');
    renderMenuPreview();
}

function saveMenuConfig() {
    var prov = document.getElementById('menuProvSelect').value;
    var checked = [];
    document.querySelectorAll('.menu-cfg-cb:checked').forEach(function(cb) { checked.push(cb.value); });
    if (!DUMMY.menuConfig) DUMMY.menuConfig = {};
    DUMMY.menuConfig[prov] = checked;
    showToast('Konfigurasi menu ' + (prov === '_default' ? 'default' : prov) + ' tersimpan');
}

function resetMenuConfig() {
    var prov = document.getElementById('menuProvSelect').value;
    var defaultKeys = ALL_SERVICE_MENUS.map(function(m) { return m.key; });
    if (DUMMY.menuConfig && DUMMY.menuConfig[prov]) {
        delete DUMMY.menuConfig[prov];
    }
    document.querySelectorAll('.menu-cfg-cb').forEach(function(cb) { cb.checked = true; });
    renderMenuPreview();
    showToast('Menu ' + (prov === '_default' ? 'default' : prov) + ' direset ke default');
}

function renderMenuPreview() {
    var grid = document.getElementById('menuPreviewGrid');
    if (!grid) return;
    var checked = [];
    document.querySelectorAll('.menu-cfg-cb:checked').forEach(function(cb) { checked.push(cb.value); });
    var colors = {
        berkas:'#EF4444', absensi:'#3B82F6', slipgaji:'#22C55E', linkgaji:'#A855F7',
        chat:'#F97316', lokasi:'#EC4899', idcard:'#14B8A6', rekening:'#06B6D4',
        gantirek:'#EAB308', aduan:'#EF4444'
    };
    var html = '';
    checked.forEach(function(key) {
        var menu = ALL_SERVICE_MENUS.find(function(m) { return m.key === key; });
        if (!menu) return;
        var c = colors[key] || '#888';
        html += '<div style="display:flex;flex-direction:column;align-items:center;gap:6px;">' +
            '<div style="width:44px;height:44px;border-radius:12px;background:' + c + '15;display:flex;align-items:center;justify-content:center;">' +
                '<div style="width:20px;height:20px;border-radius:4px;background:' + c + '40;"></div>' +
            '</div>' +
            '<span style="font-size:10px;color:#6B7280;text-align:center;line-height:1.2;">' + menu.label + '</span>' +
        '</div>';
    });
    // Add "Lainnya" if more than 7
    if (checked.length > 7) {
        html = '';
        checked.slice(0, 7).forEach(function(key) {
            var menu = ALL_SERVICE_MENUS.find(function(m) { return m.key === key; });
            if (!menu) return;
            var c = colors[key] || '#888';
            html += '<div style="display:flex;flex-direction:column;align-items:center;gap:6px;">' +
                '<div style="width:44px;height:44px;border-radius:12px;background:' + c + '15;display:flex;align-items:center;justify-content:center;">' +
                    '<div style="width:20px;height:20px;border-radius:4px;background:' + c + '40;"></div>' +
                '</div>' +
                '<span style="font-size:10px;color:#6B7280;text-align:center;line-height:1.2;">' + menu.label + '</span>' +
            '</div>';
        });
        html += '<div style="display:flex;flex-direction:column;align-items:center;gap:6px;">' +
            '<div style="width:44px;height:44px;border-radius:12px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;">' +
                '<span style="font-size:16px;color:#9CA3AF;">...</span>' +
            '</div>' +
            '<span style="font-size:10px;color:#6B7280;">Lainnya</span>' +
        '</div>';
    }
    grid.innerHTML = html || '<p style="grid-column:1/-1;text-align:center;color:#9CA3AF;font-size:12px;">Tidak ada menu yang aktif</p>';
}

// ── NIK Tracker (Enhanced with GPS Tracking) ──
let _lastTrackedCandidateId = null;
let _lastTrackedNik = null;
let _trackingCenterInterval = null;
let _refreshedNiks = new Set();

function trackNik() {
    const nik = document.getElementById('trackNik').value.trim();
    if (nik.length !== 16) { showToast('NIK harus 16 digit', 'error'); return; }
    _lastTrackedNik = nik;
    const result = document.getElementById('trackResult');
    const c = DUMMY.candidates.find(x => x.nik === nik);
    const bl = DUMMY.blacklists.find(x => x.nik === nik);
    if (bl) {
        result.innerHTML = '<div class="settings-card" style="border-color:#EF4444;"><div style="color:#EF4444;font-weight:700;margin-bottom:8px;">⚠ NIK BLACKLISTED</div><div style="font-size:.75rem;color:var(--t2);">Alasan: ' + bl.reason + '<br>Tanggal: ' + bl.created_at + '</div></div>';
        return;
    }
    if (c) {
        _lastTrackedCandidateId = c.id;
        var sc = (typeof STATUS_COLORS!=='undefined' && STATUS_COLORS[c.status]) || '#8B5CF6';
        var html = '<div class="settings-card" style="padding:0;overflow:hidden;">';
        html += '<div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;"><div><div style="font-weight:700;font-size:.92rem;color:var(--t1);">' + (c.name||'') + '</div><div style="font-size:.72rem;color:var(--t3);">' + (c.given_id||'') + ' · ' + (c.station||'') + '</div></div><span class="badge" style="background:' + sc + '20;color:' + sc + ';">' + c.status + '</span></div>';
        html += '<div style="padding:16px 20px;display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:.75rem;">';
        [['WhatsApp',c.whatsapp],['Provinsi',c.provinsi],['Kab/Kota',c.kabupaten],['Pendaftaran',c.created_at],['Email',c.email],['Pendidikan',c.pendidikan_terakhir]].forEach(function(f){
            html += '<div><span style="color:var(--t3);">' + f[0] + '</span><br><strong style="color:var(--t1);">' + (f[1]||'-') + '</strong></div>';
        });
        html += '</div>';
        html += '<div style="padding:0 20px 16px;"><div style="display:flex;gap:8px;"><button id="requestLocationBtn" onclick="requestLiveLocation()" class="detail-action-btn detail-push-btn" style="flex:1;justify-content:center;padding:12px;">📡 Minta Lokasi Sekarang</button><button onclick="cancelTrackRequest()" class="track-cancel-btn" style="padding:12px 14px;" title="Batalkan">✕</button></div><div style="font-size:.65rem;color:var(--t3);text-align:center;margin-top:4px;">User harus sedang membuka halaman pendaftaran</div></div>';
        html += '</div>';
        html += '<div id="trackingQueueSection" class="tracking-section" style="display:none;"><div class="settings-card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><div style="font-weight:700;font-size:.78rem;">📡 Antrian Pelacakan</div><span id="trackingQueueBadge" class="tracking-badge"></span></div><div class="tbl-wrap" style="max-height:250px;"><table class="data-table" style="font-size:.72rem;"><thead><tr><th>#</th><th>Nama</th><th>NIK</th><th>Status</th><th>Waktu</th><th>Koordinat</th><th>Aksi</th></tr></thead><tbody id="trackingQueueBody"></tbody></table></div></div></div>';
        result.innerHTML = html;
    } else {
        result.innerHTML = '<div class="settings-card"><div style="color:var(--t3);font-size:.75rem;">NIK tidak ditemukan di database Daily Worker.</div></div>';
    }
}

// ── Dropdown Settings ──
function renderDropdownOpts() {
    const cat = document.getElementById('ddCategory').value;
    const list = document.getElementById('ddOptList');
    if (!list || !DUMMY.dropdownOpts[cat]) return;
    list.innerHTML = DUMMY.dropdownOpts[cat].map((opt, i) =>
        '<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;margin-bottom:6px;">' +
        '<span style="flex:1;font-size:.75rem;">' + opt + '</span>' +
        '<button class="act-btn" onclick="deleteDropdownOpt(\'' + cat + '\',' + i + ')" title="Hapus"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>' +
        '</div>'
    ).join('');
}
function addDropdownOpt() {
    const cat = document.getElementById('ddCategory').value;
    const val = document.getElementById('ddNewOpt').value.trim();
    if (!val) return;
    DUMMY.dropdownOpts[cat].push(val);
    document.getElementById('ddNewOpt').value = '';
    renderDropdownOpts();
    showToast('Opsi ditambahkan');
}
function deleteDropdownOpt(cat, i) {
    DUMMY.dropdownOpts[cat].splice(i, 1);
    renderDropdownOpts();
    showToast('Opsi dihapus');
}

// ── System ──
function clearCache() {
    const keep = localStorage.getItem('dw_admin_v2');
    localStorage.clear();
    if (keep) localStorage.setItem('dw_admin_v2', keep);
    showToast('Cache cleared');
    const sysStorage = document.getElementById('sysStorage');
    if (sysStorage) sysStorage.textContent = (JSON.stringify(localStorage).length / 1024).toFixed(1) + ' KB used';
}

// ═══ GPS Tracking Functions ═══
function requestLiveLocation() {
    if (!_lastTrackedCandidateId || !_lastTrackedNik) return;
    var btn = document.getElementById('requestLocationBtn');
    if (!USE_DUMMY) {
        fetch(API_BASE + 'candidates.php', {
            method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include',
            body: JSON.stringify({ action:'request_track', candidate_id:_lastTrackedCandidateId, nik:_lastTrackedNik })
        }).then(function(r){return r.json();}).then(function(data){
            if (btn) { btn.innerHTML = '✅ Ditambahkan ke antrian'; btn.style.background = 'linear-gradient(135deg,#059669,#10b981)'; }
            setTimeout(function(){ if(btn){ btn.innerHTML='📡 Minta Lokasi Sekarang'; btn.style.background=''; } }, 2000);
            showToast(data.message || 'Ditambahkan ke antrian');
            showTrackingCenter(); startTrackingPoller();
        }).catch(function(){ if(btn) btn.innerHTML='⚠️ Gagal mengirim'; });
    } else {
        if (btn) { btn.innerHTML = '✅ Ditambahkan ke antrian'; btn.style.background = 'linear-gradient(135deg,#059669,#10b981)'; }
        setTimeout(function(){ if(btn){ btn.innerHTML='📡 Minta Lokasi Sekarang'; btn.style.background=''; } }, 2000);
        showToast('Request lokasi terkirim (demo mode)');
        showTrackingCenter();
        var demoTracks = [{ id:1, candidate_name:'Demo User', candidate_nik:_lastTrackedNik, status:'pending', requested_at:new Date().toISOString() }];
        renderTrackingCenter(demoTracks);
        setTimeout(function(){
            demoTracks[0].status = 'received'; demoTracks[0].latitude = -0.0253; demoTracks[0].longitude = 109.3422; demoTracks[0].accuracy = 15; demoTracks[0].received_at = new Date().toISOString();
            renderTrackingCenter(demoTracks); showToast('📍 Lokasi diterima!');
        }, 3000);
    }
}
function showTrackingCenter() { var s = document.getElementById('trackingQueueSection'); if (s) s.style.display = ''; }
function startTrackingPoller() {
    if (_trackingCenterInterval || USE_DUMMY) return;
    pollActiveTracks();
    _trackingCenterInterval = setInterval(pollActiveTracks, 5000);
}
function pollActiveTracks() {
    if (USE_DUMMY) return;
    fetch(API_BASE + 'candidates.php', {
        method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include',
        body: JSON.stringify({ action:'get_active_tracks' })
    }).then(function(r){return r.json();}).then(function(data){
        if (data.tracks) {
            renderTrackingCenter(data.tracks);
            data.tracks.forEach(function(t){
                if (t.status==='received' && t.candidate_nik===_lastTrackedNik && !_refreshedNiks.has(t.id+'')) {
                    _refreshedNiks.add(t.id+''); trackNik(); showToast('📍 Lokasi ' + (t.candidate_name||t.candidate_nik) + ' diterima!');
                }
            });
        }
    }).catch(function(){});
}
function renderTrackingCenter(tracks) {
    var tbody = document.getElementById('trackingQueueBody');
    var badge = document.getElementById('trackingQueueBadge');
    if (!tbody) return;
    var pending = tracks.filter(function(t){return t.status==='pending';}).length;
    var received = tracks.filter(function(t){return t.status==='received';}).length;
    if (badge) badge.textContent = pending + ' menunggu · ' + received + ' diterima';
    if (tracks.length === 0) { tbody.innerHTML = '<tr><td colspan="7" class="tbl-empty">Belum ada permintaan</td></tr>'; return; }
    var html = '';
    tracks.forEach(function(t, i) {
        var isPending = t.status === 'pending';
        var reqStr = new Date(t.requested_at).toLocaleString('id-ID', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
        var statusHtml = isPending
            ? '<span class="track-status-pending"><span class="track-dot track-dot-pending"></span>Menunggu</span>'
            : '<span class="track-status-received"><span class="track-dot track-dot-received"></span>Diterima</span>';
        var coordHtml = (t.latitude && t.longitude)
            ? '<a href="https://www.google.com/maps?q='+t.latitude+','+t.longitude+'" target="_blank" class="track-coord">'+t.latitude+', '+t.longitude+'</a>'
            : '<span style="color:var(--t3);">—</span>';
        var actionHtml = isPending
            ? '<button class="track-cancel-btn" onclick="cancelSingleTrack('+t.id+')">Batal</button>'
            : (t.latitude ? '<a href="https://www.google.com/maps?q='+t.latitude+','+t.longitude+'" target="_blank" class="detail-maps-btn" style="padding:4px 10px;font-size:.7rem;">Maps</a>' : '');
        html += '<tr><td>'+(i+1)+'</td><td style="font-weight:600;">'+(t.candidate_name||'-')+'</td><td style="font-family:monospace;">'+t.candidate_nik+'</td><td>'+statusHtml+'</td><td style="color:var(--t3);">'+reqStr+'</td><td>'+coordHtml+'</td><td>'+actionHtml+'</td></tr>';
    });
    tbody.innerHTML = html;
}
function cancelSingleTrack(trackId) {
    if (USE_DUMMY) { showToast('Dibatalkan (demo)'); return; }
    fetch(API_BASE+'candidates.php',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({action:'cancel_track',track_id:trackId})}).then(function(){pollActiveTracks();}).catch(function(){});
}
function cancelTrackRequest() {
    var btn = document.getElementById('requestLocationBtn');
    if (btn) { btn.disabled = false; btn.style.background = ''; btn.innerHTML = '📡 Minta Lokasi Sekarang'; }
}
