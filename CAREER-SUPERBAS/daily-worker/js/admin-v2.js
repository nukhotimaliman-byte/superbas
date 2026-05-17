/**
 * BAS DW Admin V2 — Core Logic
 * Auth, Sidebar, Theme, Tab switching, Dummy data
 */
const USE_DUMMY = false;
const API_BASE = 'api/';
const ADMIN_ROLE = 'owner'; // 'owner' | 'korlap'

// ── Auth Check (with server session + fallback) ──
let _isDemoAdmin = false;
let currentAdmin = null;

async function silentReAuth() {
    try {
        const cached = localStorage.getItem('dw_admin_v2');
        if (!cached) return false;
        const res = await fetch(API_BASE + 'user-auth.php?action=check', { credentials:'same-origin', cache:'no-store' });
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) return false;
        const data = await res.json();
        if (data.authenticated && data.user) { currentAdmin = data.user; return true; }
        return false;
    } catch { return false; }
}

async function initAuth() {
    if (USE_DUMMY) {
        // Dummy mode — use localStorage or defaults
        const stored = JSON.parse(localStorage.getItem('dw_admin_v2') || 'null');
        currentAdmin = stored || { name:'Owner BAS', role:'owner', username:'owner' };
        _isDemoAdmin = true;
        return true;
    }
    // 1. Check demo session
    try {
        const demo = sessionStorage.getItem('bas_demo_user');
        if (demo) {
            const u = JSON.parse(demo);
            if (['owner','korlap','korlap_interview','korlap_td'].includes(u.role)) {
                currentAdmin = u; _isDemoAdmin = true; return true;
            }
        }
    } catch {}
    // 2. Server session check with retry
    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            const res = await fetch(API_BASE + 'user-auth.php?action=check', { credentials:'same-origin', cache:'no-store' });
            const ct = res.headers.get('content-type') || '';
            if (!ct.includes('application/json')) continue;
            const data = await res.json();
            if (data.authenticated && data.user && ['owner','korlap','korlap_interview','korlap_td'].includes(data.user.role)) {
                currentAdmin = data.user;
                try { localStorage.setItem('dw_admin_v2', JSON.stringify(data.user)); } catch {}
                return true;
            }
        } catch {}
    }
    // 3. localStorage fallback (check both v2 key and legacy bas_admin_cache from old login)
    try {
        const cached = localStorage.getItem('dw_admin_v2') || localStorage.getItem('bas_admin_cache');
        if (cached) {
            const u = JSON.parse(cached);
            if (['owner','korlap','korlap_interview','korlap_td'].includes(u.role)) {
                currentAdmin = u;
                // Sync to v2 key if from legacy
                try { localStorage.setItem('dw_admin_v2', JSON.stringify(u)); } catch {}
                return true;
            }
        }
    } catch {}
    return false;
}

// Legacy compat: adminData must exist before DOMContentLoaded modules run
const ADMIN = JSON.parse(localStorage.getItem('dw_admin_v2') || localStorage.getItem('bas_admin_cache') || 'null');
const adminData = ADMIN || { name: 'Admin', role: 'owner', username: 'admin' };

// ── Header: time-based greeting ──
function setGreeting() {
    var h = new Date().getHours();
    var g = h < 11 ? 'Selamat pagi,' : h < 15 ? 'Selamat siang,' : h < 18 ? 'Selamat sore,' : 'Selamat malam,';
    var el = document.getElementById('welcomeName');
    var gr = document.querySelector('.hdr-greeting');
    if (gr) gr.textContent = g;
    if (el) el.textContent = adminData.name.split(' ')[0];
}
document.getElementById('userName').textContent = adminData.name;
setGreeting();

// ── Auto-Refresh (5 min + visibility change) ──
let _autoRefreshTimer = null;
function startAutoRefresh(ms) {
    ms = ms || 300000; // 5 minutes
    if (_autoRefreshTimer) clearInterval(_autoRefreshTimer);
    _autoRefreshTimer = setInterval(async function() {
        if (document.hidden) return;
        console.info('[BAS] Auto-refreshing data...');
        await loadAllData();
        if (typeof applyFilter === 'function') applyFilter();
        if (typeof initOverview === 'function') initOverview();
    }, ms);
}
document.addEventListener('visibilitychange', async function() {
    if (!document.hidden && adminData) {
        await loadAllData();
        if (typeof applyFilter === 'function') applyFilter();
    }
});


// Clock
function updateClock() {
    const now = new Date();
    const d = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    const t = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    document.getElementById('clock').textContent = d + ' · ' + t;
}
updateClock(); setInterval(updateClock, 1000);

// ── Theme ──
const theme = localStorage.getItem('dw_admin_theme') || 'dark';
if (theme === 'light') document.documentElement.setAttribute('data-theme', 'light');

document.getElementById('themeToggle').addEventListener('click', function () {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    if (isLight) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('dw_admin_theme', 'dark');
        document.querySelector('.ic-dark').style.display = '';
        document.querySelector('.ic-light').style.display = 'none';
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('dw_admin_theme', 'light');
        document.querySelector('.ic-dark').style.display = 'none';
        document.querySelector('.ic-light').style.display = '';
    }
    onThemeChange();
});
if (theme === 'light') {
    document.querySelector('.ic-dark').style.display = 'none';
    document.querySelector('.ic-light').style.display = '';
}

// ── Sidebar ──
const sidebar = document.getElementById('sidebar');
const sidebarState = localStorage.getItem('dw_sidebar') || 'expanded';
if (sidebarState === 'collapsed') sidebar.classList.add('collapsed');

document.getElementById('sidebarToggle').addEventListener('click', function () {
    sidebar.classList.toggle('collapsed');
    localStorage.setItem('dw_sidebar', sidebar.classList.contains('collapsed') ? 'collapsed' : 'expanded');
});

// Owner-only items
if (adminData.role !== 'owner') {
    document.querySelectorAll('.nav-owner-only').forEach(el => el.style.display = 'none');
}

// ── Tab Switching ──
const tabs = document.querySelectorAll('.sidebar-item[data-tab]');
const panels = document.querySelectorAll('.panel');

tabs.forEach(tab => {
    tab.addEventListener('click', function () {
        const target = this.getAttribute('data-tab');
        tabs.forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        panels.forEach(p => p.classList.remove('active'));
        const panel = document.getElementById('panel-' + target);
        if (panel) panel.classList.add('active');
        // Init chat when tab opened
        if (target === 'chat' && !window._chatInited) {
            window._chatInited = true;
            AdminChat.init({
                container: 'chatContainer',
                role: ADMIN_ROLE || 'owner',
                project: 'dw',
                apiBase: './api/chat.php',
            });
        }
        // Mobile: close sidebar
        if (window.innerWidth <= 1024) sidebar.classList.remove('mobile-open');
    });
});

// Mobile sidebar
if (window.innerWidth <= 1024) {
    document.getElementById('sidebarToggle').addEventListener('click', function () {
        sidebar.classList.toggle('mobile-open');
    });
}

// ── Logout ──
document.getElementById('logoutBtn').addEventListener('click', async function () {
    localStorage.removeItem('dw_admin_v2');
    localStorage.removeItem('bas_admin_cache');
    sessionStorage.removeItem('bas_demo_user');
    try { await fetch(API_BASE + 'user-auth.php?action=logout', { method:'POST' }); } catch {}
    window.location.href = 'login';
});

// ── Toast ──
function showToast(msg, type = 'success') {
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = 'toast toast--' + type;
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3000);
}

// ── Modal ──
function closeModal() {
    document.getElementById('detailModal').classList.remove('show');
}

function openModal(html) {
    document.getElementById('detailBody').innerHTML = html;
    document.getElementById('detailModal').classList.add('show');
}
function closeModal() {
    document.getElementById('detailModal').classList.remove('show');
}

// ── DATA STORE (populated from API) ──
let DUMMY = {
    candidates: [],
    stations: [],
    statuses: ['Belum Pemberkasan','Sudah Pemberkasan','Menunggu Test Drive','Jadwal Test Drive','Hadir','Tidak Hadir','Lulus','Tidak Lulus'],
    korlaps: [],
    locations: [],
    chatConversations: [],
    chatMessages: {},
    menuConfig: {},
    linktreeCategories: [],
    linktree: [],
    dropdownOpts: {
        status: ['Belum Pemberkasan','Sudah Pemberkasan','Menunggu Test Drive','Jadwal Test Drive','Hadir','Tidak Hadir','Lulus','Tidak Lulus'],
        station: [],
        pendidikan: ['SD','SMP','SMA/SMK','D3','S1','S2'],
    },
    blacklists: []
};

// ── Load all data from API into DUMMY store ──
async function loadAllData() {
    try {
        const [candRes, locRes] = await Promise.all([
            fetch(API_BASE + 'admin.php', { credentials: 'same-origin' }).then(r => r.json()).catch(() => ({ candidates: [] })),
            fetch(API_BASE + 'locations.php', { credentials: 'same-origin' }).then(r => r.json()).catch(() => ({ locations: [] })),
        ]);
        // Populate candidates with station alias
        DUMMY.candidates = (candRes.candidates || []).map(c => ({
            ...c,
            station: c.location_name || c.display_location || '',
            user_created_at: c.user_created_at || c.created_at
        }));
        // Populate locations & stations
        DUMMY.locations = locRes.locations || [];
        DUMMY.stations = DUMMY.locations.map(l => l.name);
        DUMMY.dropdownOpts.station = DUMMY.stations;
        // Try to load dropdown settings
        try {
            const settRes = await fetch(API_BASE + 'settings.php?action=options').then(r => r.json());
            if (settRes.ok && settRes.options) {
                if (settRes.options.status) {
                    DUMMY.statuses = settRes.options.status.map(s => s.value || s.label);
                    DUMMY.dropdownOpts.status = DUMMY.statuses;
                }
                if (settRes.options.pendidikan) {
                    DUMMY.dropdownOpts.pendidikan = settRes.options.pendidikan.map(s => s.value || s.label);
                }
            }
        } catch(e) { console.warn('Settings load skipped:', e); }
        console.info('[BAS] Data loaded:', DUMMY.candidates.length, 'candidates,', DUMMY.locations.length, 'locations');
    } catch (err) {
        console.error('[BAS] Failed to load data:', err);
    }
}

// ── Chart Theme Helper ──
function getChartColors() {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    return {
        text: isLight ? 'rgba(0,0,0,.55)' : 'rgba(255,255,255,.55)',
        grid: isLight ? 'rgba(0,0,0,.08)' : 'rgba(255,255,255,.06)',
        legend: isLight ? 'rgba(0,0,0,.6)' : 'rgba(255,255,255,.6)',
        gridNone: 'transparent',
    };
}

// Store chart instances for destroy/re-create
const chartInstances = {};

function onThemeChange() {
    // Destroy all charts
    Object.keys(chartInstances).forEach(k => {
        if (chartInstances[k]) { chartInstances[k].destroy(); chartInstances[k] = null; }
    });
    // Re-init pages that have charts
    if (typeof initOverview === 'function') initOverview();
    if (typeof initModules === 'function') {
        initAnalytics();
    }
}

// ── Province Access Control ──
// Empty array = ALL provinces allowed (default for existing accounts)
const ALL_SERVICE_MENUS = [
    { key:'berkas', label:'Pemberkasan' },
    { key:'absensi', label:'Absensi' },
    { key:'slipgaji', label:'Slip Gaji' },
    { key:'linkgaji', label:'Link Gaji' },
    { key:'chat', label:'Chat Admin' },
    { key:'lokasi', label:'Lokasi DC' },
    { key:'idcard', label:'ID Card' },
    { key:'rekening', label:'Rekening' },
    { key:'gantirek', label:'Ganti Rek' },
    { key:'aduan', label:'Aduan Pungli' },
];
// ── Area mapping (provinsi → area) ──
const AREA_MAP = {
    'Sumatra': ['Aceh','Sumatera Utara','Sumatera Barat','Riau','Kepulauan Riau','Jambi','Sumatera Selatan','Bengkulu','Lampung','Kepulauan Bangka Belitung'],
    'Jabodetabek - Banten': ['DKI Jakarta','Banten'],
    'Jawa Barat': ['Jawa Barat'],
    'Jawa Tengah': ['Jawa Tengah','DI Yogyakarta'],
    'Jawa Timur': ['Jawa Timur'],
    'Bali - Nusa Tenggara': ['Bali','Nusa Tenggara Barat','Nusa Tenggara Timur'],
    'Kalimantan': ['Kalimantan Barat','Kalimantan Tengah','Kalimantan Selatan','Kalimantan Timur','Kalimantan Utara'],
    'Sulawesi - Papua': ['Sulawesi Utara','Sulawesi Tengah','Sulawesi Selatan','Sulawesi Tenggara','Gorontalo','Sulawesi Barat','Maluku','Maluku Utara','Papua','Papua Barat','Papua Selatan','Papua Tengah','Papua Pegunungan','Papua Barat Daya']
};
const ALL_AREAS = Object.keys(AREA_MAP);
// Keep ALL_PROVINCES for backward compat (registration etc.)
const ALL_PROVINCES = Object.values(AREA_MAP).flat();
// Kota/Kab in Jawa Barat province that belong to Jabodetabek
const JABODETABEK_KABUPATEN = ['Bekasi','Bogor','Depok','Kota Bekasi','Kota Bogor','Kota Depok','Kabupaten Bekasi','Kabupaten Bogor'];

function getAreaForCandidate(c) {
    if (!c || !c.provinsi) return '-';
    const prov = c.provinsi;
    // Special case: Jawa Barat province — check kabupaten for Jabodetabek cities
    if (prov === 'Jawa Barat' && c.kabupaten) {
        const kab = c.kabupaten;
        if (JABODETABEK_KABUPATEN.some(k => kab.toLowerCase().includes(k.toLowerCase()))) {
            return 'Jabodetabek - Banten';
        }
    }
    for (const [area, provs] of Object.entries(AREA_MAP)) {
        if (provs.includes(prov)) return area;
    }
    return '-';
}

function getAllowedAreas() {
    if (adminData.role === 'owner') return []; // empty = all
    const aa = adminData.allowed_areas || adminData.allowed_provinces || [];
    return aa.length === 0 ? [] : aa;
}
function filterByArea(data) {
    const aa = getAllowedAreas();
    if (aa.length === 0) return data; // all access
    return data.filter(c => aa.includes(getAreaForCandidate(c)));
}
// Backward compat aliases
function getAllowedProvinces() { return getAllowedAreas(); }
function filterByProvince(data) { return filterByArea(data); }

// ── Init all pages ──
document.addEventListener('DOMContentLoaded', async function () {
    // Run auth check
    const authOk = await initAuth();
    if (!authOk && !USE_DUMMY) {
        localStorage.removeItem('dw_admin_v2');
        localStorage.removeItem('bas_admin_cache');
        window.location.href = 'login';
        return;
    }
    // Update admin info post-auth
    if (currentAdmin) {
        document.getElementById('userName').textContent = currentAdmin.name || adminData.name;
        setGreeting();
        // Sync adminData so getAllowedAreas() reads fresh allowed_areas from server
        adminData.allowed_areas = currentAdmin.allowed_areas || [];
        adminData.role = currentAdmin.role || adminData.role;
        adminData.name = currentAdmin.name || adminData.name;
        adminData.username = currentAdmin.username || adminData.username;
        console.info('[BAS] Admin synced — role:', adminData.role, 'allowed_areas:', adminData.allowed_areas);
    }

    // Load real data from API before initializing modules
    await loadAllData();

    if (typeof initOverview === 'function') initOverview();
    if (typeof initCandidates === 'function') initCandidates();
    if (typeof initModules === 'function') initModules();

    // Update chat badge on load
    var chatTotal = (DUMMY.chatConversations||[]).reduce(function(s,c){return s+(c.unread||0);},0);
    var cb = document.getElementById('chatNavBadge');
    if (cb) { cb.textContent = chatTotal; cb.style.display = chatTotal > 0 ? 'inline' : 'none'; }
    var cm = document.getElementById('chatNavBadgeMini');
    if (cm) { cm.textContent = chatTotal; cm.style.display = chatTotal > 0 ? 'flex' : 'none'; }

    // Start auto-refresh
    startAutoRefresh();
});
