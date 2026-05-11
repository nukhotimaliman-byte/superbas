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
    _autoRefreshTimer = setInterval(function() {
        if (document.hidden) return;
        console.info('[BAS] Auto-refreshing data...');
        if (typeof applyFilter === 'function') applyFilter();
        if (typeof initOverview === 'function') initOverview();
    }, ms);
}
document.addEventListener('visibilitychange', function() {
    if (!document.hidden && adminData) {
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
                allowedProvinces: typeof ALLOWED_PROVINCES !== 'undefined' ? ALLOWED_PROVINCES : null,
                dummyData: DUMMY,
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
    window.location.href = 'login.html';
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

// ── DUMMY DATA ──
const DUMMY = {
    candidates: [
        { id:1, given_id:'DW001', name:'Ahmad Fauzi', nik:'3209220101030001', whatsapp:'081234567890', station:'Sungai Kakap DC', status:'Belum Pemberkasan', created_at:'2026-05-10', email:'ahmad@mail.com', user_username:'ahmad01', user_password:'bas1234', user_created_at:'2026-05-09', tempat_lahir:'Pontianak', tanggal_lahir:'1998-01-15', provinsi:'Kalimantan Barat', kabupaten:'Kubu Raya', kecamatan:'Sungai Kakap', kelurahan:'Pal 9', address:'Jl. Raya Kakap No.12', pendidikan_terakhir:'SMA', pernah_kerja_spx:'Ya', surat_sehat:'Ada', paklaring:'Tidak Ada', referensi:'Teman', emergency_phone:'081299988877', emergency_name:'Siti Aisyah', emergency_relation:'Ibu', korlap_notes:'', bank_name:'BCA', bank_account_no:'1234567890', bank_account_name:'Ahmad Fauzi', location_name:'Sungai Kakap DC' },
        { id:2, given_id:'DW002', name:'Budi Santoso', nik:'3209220101030002', whatsapp:'081234567891', station:'Pontianak DC', status:'Sudah Pemberkasan', created_at:'2026-05-09', email:'budi@mail.com', user_username:'budi02', user_password:'bas5678', user_created_at:'2026-05-08', tempat_lahir:'Singkawang', tanggal_lahir:'1995-06-20', provinsi:'Kalimantan Barat', kabupaten:'Pontianak', kecamatan:'Pontianak Selatan', kelurahan:'Akcaya', address:'Jl. Ahmad Yani No.55', pendidikan_terakhir:'D3', pernah_kerja_spx:'Tidak', surat_sehat:'Ada', paklaring:'Ada', referensi:'Iklan', emergency_phone:'081288877766', emergency_name:'Rudi Hartono', emergency_relation:'Ayah', korlap_notes:'Dokumen lengkap', bank_name:'BRI', bank_account_no:'9876543210', bank_account_name:'Budi Santoso', location_name:'Pontianak DC' },
        { id:3, given_id:'DW003', name:'Cindy Rahayu', nik:'3209220101030003', whatsapp:'081234567892', station:'Sungai Kakap DC', status:'Lulus', created_at:'2026-05-08', email:'cindy@mail.com', user_username:'cindy03', user_password:'bas9012', user_created_at:'2026-05-07', tempat_lahir:'Mempawah', tanggal_lahir:'2000-03-10', provinsi:'Kalimantan Barat', kabupaten:'Mempawah', kecamatan:'Mempawah Hilir', kelurahan:'Terusan', address:'Jl. Merdeka No.8', pendidikan_terakhir:'SMA', pernah_kerja_spx:'Ya', surat_sehat:'Ada', paklaring:'Ada', referensi:'Walk-in', emergency_phone:'081277766655', emergency_name:'Agus Rahayu', emergency_relation:'Ayah', korlap_notes:'Kandidat rajin', bank_name:'Mandiri', bank_account_no:'1122334455', bank_account_name:'Cindy Rahayu', location_name:'Sungai Kakap DC' },
        { id:4, given_id:'DW004', name:'Dedi Kurniawan', nik:'3209220101030004', whatsapp:'081234567893', station:'Makassar DC', status:'Tidak Lulus', created_at:'2026-05-08', email:'dedi@mail.com', user_username:'dedi04', user_password:'bas3456', user_created_at:'2026-05-07', tempat_lahir:'Makassar', tanggal_lahir:'1997-11-25', provinsi:'Sulawesi Selatan', kabupaten:'Makassar', kecamatan:'Tamalate', kelurahan:'Rappocini', address:'Jl. Sultan Alauddin No.12', pendidikan_terakhir:'SMP', pernah_kerja_spx:'Tidak', surat_sehat:'Tidak Ada', paklaring:'Tidak Ada', referensi:'Media Sosial', emergency_phone:'081266655544', emergency_name:'Rina Kurniawan', emergency_relation:'Istri', korlap_notes:'Gagal test', bank_name:'BNI', bank_account_no:'5566778899', bank_account_name:'Dedi Kurniawan', location_name:'Makassar DC' },
        { id:5, given_id:'DW005', name:'Eka Pratama', nik:'3209220101030005', whatsapp:'081234567894', station:'Pontianak DC', status:'Belum Pemberkasan', created_at:'2026-05-07', email:'eka@mail.com', user_username:'eka05', user_password:'bas7890', user_created_at:'2026-05-06', tempat_lahir:'Ketapang', tanggal_lahir:'1999-08-05', provinsi:'Kalimantan Barat', kabupaten:'Ketapang', kecamatan:'Delta Pawan', kelurahan:'Sampit', address:'Jl. Diponegoro No.3', pendidikan_terakhir:'S1', pernah_kerja_spx:'Tidak', surat_sehat:'Ada', paklaring:'Ada', referensi:'LinkedIn', emergency_phone:'081255544433', emergency_name:'Maya Pratama', emergency_relation:'Ibu', korlap_notes:'', bank_name:'SEABANK', bank_account_no:'9988776655', bank_account_name:'Eka Pratama', location_name:'Pontianak DC' },
        { id:6, given_id:'DW006', name:'Fitri Handayani', nik:'3209220101030006', whatsapp:'081234567895', station:'Balikpapan DC', status:'Lulus', created_at:'2026-05-07', email:'fitri@mail.com', user_username:'fitri06', user_password:'bas2345', user_created_at:'2026-05-06', tempat_lahir:'Balikpapan', tanggal_lahir:'2001-02-14', provinsi:'Kalimantan Timur', kabupaten:'Balikpapan', kecamatan:'Balikpapan Selatan', kelurahan:'Klandasan', address:'Jl. MT Haryono No.8', pendidikan_terakhir:'SMA', pernah_kerja_spx:'Ya', surat_sehat:'Ada', paklaring:'Ada', referensi:'Teman', emergency_phone:'081244433322', emergency_name:'Dewi Handayani', emergency_relation:'Kakak', korlap_notes:'Sangat potensial', bank_name:'BCA', bank_account_no:'1122334456', bank_account_name:'Fitri Handayani', location_name:'Balikpapan DC' },
        { id:7, given_id:'DW007', name:'Gilang Ramadhan', nik:'3209220101030007', whatsapp:'081234567896', station:'Sungai Kakap DC', status:'Sudah Pemberkasan', created_at:'2026-05-06', email:'gilang@mail.com', user_username:'gilang07', user_password:'bas6789', user_created_at:'2026-05-05', tempat_lahir:'Sambas', tanggal_lahir:'1996-12-01', provinsi:'Kalimantan Barat', kabupaten:'Sambas', kecamatan:'Sambas', kelurahan:'Durian', address:'Jl. Tanjungpura No.20', pendidikan_terakhir:'D3', pernah_kerja_spx:'Ya', surat_sehat:'Ada', paklaring:'Ada', referensi:'Walk-in', emergency_phone:'081233322211', emergency_name:'Hendra Ramadhan', emergency_relation:'Ayah', korlap_notes:'Proses interview', bank_name:'BRI', bank_account_no:'6655443322', bank_account_name:'Gilang Ramadhan', location_name:'Sungai Kakap DC' },
        { id:8, given_id:'DW008', name:'Hana Salsabila', nik:'3209220101030008', whatsapp:'081234567897', station:'Makassar DC', status:'Belum Pemberkasan', created_at:'2026-05-06', email:'hana@mail.com', user_username:'hana08', user_password:'bas0123', user_created_at:'2026-05-05', tempat_lahir:'Gowa', tanggal_lahir:'2000-07-18', provinsi:'Sulawesi Selatan', kabupaten:'Gowa', kecamatan:'Somba Opu', kelurahan:'Sungguminasa', address:'Jl. Poros Malino No.5', pendidikan_terakhir:'SMA', pernah_kerja_spx:'Tidak', surat_sehat:'Ada', paklaring:'Tidak Ada', referensi:'Iklan', emergency_phone:'081222211100', emergency_name:'Yusuf Salsabila', emergency_relation:'Ayah', korlap_notes:'', bank_name:'Mandiri', bank_account_no:'7788990011', bank_account_name:'Hana Salsabila', location_name:'Makassar DC' },
        { id:9, given_id:'DW009', name:'Irfan Maulana', nik:'3209220101030009', whatsapp:'081234567898', station:'Balikpapan DC', status:'Tidak Lulus', created_at:'2026-05-05', email:'irfan@mail.com', user_username:'irfan09', user_password:'bas4567', user_created_at:'2026-05-04', tempat_lahir:'Samarinda', tanggal_lahir:'1998-09-30', provinsi:'Kalimantan Timur', kabupaten:'Samarinda', kecamatan:'Samarinda Ulu', kelurahan:'Air Hitam', address:'Jl. KH Wahid Hasyim No.15', pendidikan_terakhir:'SMP', pernah_kerja_spx:'Tidak', surat_sehat:'Tidak Ada', paklaring:'Tidak Ada', referensi:'Media Sosial', emergency_phone:'081211100099', emergency_name:'Sari Maulana', emergency_relation:'Istri', korlap_notes:'Tidak lolos test', bank_name:'BNI', bank_account_no:'3344556677', bank_account_name:'Irfan Maulana', location_name:'Balikpapan DC' },
        { id:10, given_id:'DW010', name:'Joko Susanto', nik:'3209220101030010', whatsapp:'081234567899', station:'Pontianak DC', status:'Lulus', created_at:'2026-05-05', email:'joko@mail.com', user_username:'joko10', user_password:'bas8901', user_created_at:'2026-05-04', tempat_lahir:'Pontianak', tanggal_lahir:'1997-04-22', provinsi:'Kalimantan Barat', kabupaten:'Pontianak', kecamatan:'Pontianak Barat', kelurahan:'Siantan Hulu', address:'Jl. Gusti Hamzah No.7', pendidikan_terakhir:'S1', pernah_kerja_spx:'Ya', surat_sehat:'Ada', paklaring:'Ada', referensi:'LinkedIn', emergency_phone:'081200099988', emergency_name:'Ani Susanto', emergency_relation:'Ibu', korlap_notes:'Top candidate', bank_name:'BCA', bank_account_no:'1029384756', bank_account_name:'Joko Susanto', location_name:'Pontianak DC' },
    ],
    stations: ['Sungai Kakap DC', 'Pontianak DC', 'Makassar DC', 'Balikpapan DC'],
    statuses: ['Belum Pemberkasan', 'Sudah Pemberkasan', 'Lulus', 'Tidak Lulus'],
    korlaps: [
        { id: 1, username: 'korlap_skp', name: 'Budi Korlap', role: 'korlap_interview', allowed_provinces: [] },
        { id: 2, username: 'korlap_td1', name: 'Sari TD', role: 'korlap_td', allowed_provinces: [] },
    ],
    locations: [
        { id: 1, name: 'Sungai Kakap DC', address: 'Jl. Raya Sungai Kakap No.1', maps_link: '' },
        { id: 2, name: 'Pontianak DC', address: 'Jl. Ahmad Yani No.55', maps_link: '' },
        { id: 3, name: 'Makassar DC', address: 'Jl. Sultan Alauddin No.12', maps_link: '' },
        { id: 4, name: 'Balikpapan DC', address: 'Jl. MT Haryono No.8', maps_link: '' },
    ],
    chatConversations: [
        {candidateId:1,name:'Ahmad Fauzi',givenId:'DW001',station:'Sungai Kakap DC',kabupaten:'Kubu Raya',provinsi:'Kalimantan Barat',status:'Sudah Pemberkasan',project:'dw',lastMessage:'Kapan jadwal interview?',lastTime:'2026-05-11 13:30:00',unread:2,online:'online'},
        {candidateId:2,name:'Budi Santoso',givenId:'DW002',station:'Pontianak DC',kabupaten:'Pontianak',provinsi:'Kalimantan Barat',status:'Lulus',project:'dw',lastMessage:'Terima kasih infonya',lastTime:'2026-05-11 12:15:00',unread:0,online:'away'},
        {candidateId:3,name:'Cindy Rahayu',givenId:'DW003',station:'Sungai Kakap DC',kabupaten:'Mempawah',provinsi:'Kalimantan Barat',status:'Belum Pemberkasan',project:'dw',lastMessage:'Foto KTP sudah saya kirim',lastTime:'2026-05-10 18:45:00',unread:1,online:'offline'},
        {candidateId:4,name:'Dedi Kurniawan',givenId:'DW004',station:'Makassar DC',kabupaten:'Makassar',provinsi:'Sulawesi Selatan',status:'Tidak Lulus',project:'dw',lastMessage:'Min saya mau tanya dong',lastTime:'2026-05-10 10:00:00',unread:3,online:'offline'},
    ],
    chatMessages: {
        1:[
            {id:1,sender_type:'user',sender_name:'Ahmad Fauzi',message_type:'text',message:'Halo admin, saya mau tanya',created_at:'2026-05-11 13:25:00',is_read:1},
            {id:2,sender_type:'admin',sender_name:'Admin BAS',message_type:'text',message:'Halo Ahmad, silakan ada yang bisa dibantu?',created_at:'2026-05-11 13:26:00',is_read:1},
            {id:3,sender_type:'user',sender_name:'Ahmad Fauzi',message_type:'text',message:'Kapan jadwal interview? Saya sudah lengkapi berkas',created_at:'2026-05-11 13:28:00',is_read:0},
            {id:4,sender_type:'user',sender_name:'Ahmad Fauzi',message_type:'text',message:'Cek link ini https://super-bas.com/daily-worker/berkas untuk referensi',created_at:'2026-05-11 13:30:00',is_read:0},
        ],
        2:[
            {id:1,sender_type:'admin',sender_name:'Admin BAS',message_type:'text',message:'Selamat Budi, Anda lolos seleksi',created_at:'2026-05-11 12:10:00',is_read:1},
            {id:2,sender_type:'user',sender_name:'Budi Santoso',message_type:'text',message:'Terima kasih infonya',created_at:'2026-05-11 12:15:00',is_read:1},
        ],
        3:[
            {id:1,sender_type:'user',sender_name:'Cindy Rahayu',message_type:'text',message:'Min, saya mau kirim foto KTP',created_at:'2026-05-10 18:40:00',is_read:1},
            {id:2,sender_type:'user',sender_name:'Cindy Rahayu',message_type:'image',message:'',file_name:'ktp_cindy.jpg',file_path:'#',file_size:245000,created_at:'2026-05-10 18:45:00',is_read:0},
        ],
        4:[
            {id:1,sender_type:'user',sender_name:'Dedi Kurniawan',message_type:'text',message:'Min saya mau tanya dong',created_at:'2026-05-10 10:00:00',is_read:0},
            {id:2,sender_type:'user',sender_name:'Dedi Kurniawan',message_type:'location',message:'Lokasi saya',latitude:-5.1477,longitude:119.4327,created_at:'2026-05-10 10:02:00',is_read:0},
            {id:3,sender_type:'user',sender_name:'Dedi Kurniawan',message_type:'text',message:'Kenapa status saya tidak lulus?',created_at:'2026-05-10 10:05:00',is_read:0},
        ],
    },
    menuConfig: {
        '_default': ['berkas','absensi','slipgaji','linkgaji','chat','lokasi','idcard','rekening','gantirek','aduan'],
        'Kalimantan Barat': ['berkas','absensi','slipgaji','linkgaji','chat','lokasi','idcard','rekening'],
        'Sulawesi Selatan': ['berkas','absensi','slipgaji','chat','lokasi','idcard'],
    },
    linktreeCategories: ['Kalimantan', 'Sulawesi', 'Umum'],
    linktree: [
        { id:1, title:'Grup WA Kalbar', url:'https://chat.whatsapp.com/abc123', icon:'whatsapp', category:'Kalimantan', active:true, order:1 },
        { id:2, title:'Grup WA Sulsel', url:'https://chat.whatsapp.com/def456', icon:'whatsapp', category:'Sulawesi', active:true, order:2 },
        { id:3, title:'Instagram BAS', url:'https://instagram.com/superbas_id', icon:'instagram', category:'Umum', active:true, order:3 },
        { id:4, title:'Telegram Info', url:'https://t.me/bas_info', icon:'telegram', category:'Umum', active:false, order:4 },
        { id:5, title:'Grup WA Pontianak', url:'https://chat.whatsapp.com/ghi789', icon:'whatsapp', category:'Kalimantan', active:true, order:5 },
    ],
    dropdownOpts: {
        status: ['Belum Pemberkasan','Sudah Pemberkasan','Menunggu Test Drive','Jadwal Test Drive','Hadir','Tidak Hadir','Lulus','Tidak Lulus'],
        station: ['Sungai Kakap DC','Pontianak DC','Makassar DC','Balikpapan DC'],
        pendidikan: ['SD','SMP','SMA/SMK','D3','S1','S2'],
    },
    blacklists: [
        { id: 1, nik: '3209221234560001', name: 'Tersangka A', reason: 'Fraud', created_at: '2026-04-15' },
        { id: 2, nik: '3209221234560002', name: 'Tersangka B', reason: 'Mangkir berulang', created_at: '2026-04-20' },
    ]
};

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

const ALL_PROVINCES = ['Aceh','Sumatera Utara','Sumatera Barat','Riau','Jambi','Sumatera Selatan','Bengkulu','Lampung','Kepulauan Bangka Belitung','Kepulauan Riau','DKI Jakarta','Jawa Barat','Jawa Tengah','DI Yogyakarta','Jawa Timur','Banten','Bali','Nusa Tenggara Barat','Nusa Tenggara Timur','Kalimantan Barat','Kalimantan Tengah','Kalimantan Selatan','Kalimantan Timur','Kalimantan Utara','Sulawesi Utara','Sulawesi Tengah','Sulawesi Selatan','Sulawesi Tenggara','Gorontalo','Sulawesi Barat','Maluku','Maluku Utara','Papua','Papua Barat','Papua Selatan','Papua Tengah','Papua Pegunungan','Papua Barat Daya'];
function getAllowedProvinces() {
    if (adminData.role === 'owner') return []; // empty = all
    const ap = adminData.allowed_provinces || [];
    return ap.length === 0 ? [] : ap; // empty = all
}
function filterByProvince(data) {
    const ap = getAllowedProvinces();
    if (ap.length === 0) return data; // all access
    return data.filter(c => ap.includes(c.provinsi));
}

// ── Init all pages ──
document.addEventListener('DOMContentLoaded', async function () {
    // Run auth check (non-blocking for dummy mode)
    const authOk = await initAuth();
    if (!authOk && !USE_DUMMY) {
        localStorage.removeItem('dw_admin_v2');
        localStorage.removeItem('bas_admin_cache');
        window.location.href = 'login.html';
        return;
    }
    // Update admin info post-auth
    if (currentAdmin) {
        document.getElementById('userName').textContent = currentAdmin.name || adminData.name;
        setGreeting();
    }

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
