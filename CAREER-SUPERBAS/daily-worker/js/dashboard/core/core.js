/**
 * BAS Daily Worker — Dashboard Core
 * Router, shared data, utilities, auth, init
 */

// ── API Base ──
const API_BASE = '/daily-worker/api/';

// ── Shared Constants ──
const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const HARI = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];

// ── Menu Definitions ──
const ALL_MENUS = [
  { key:'berkas', label:'Pemberkasan', page:'page-berkas', cls:'si-red', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>' },
  { key:'absensi', label:'Absensi', page:'page-absensi', cls:'si-blue', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' },
  { key:'slipgaji', label:'Slip Gaji', page:'page-slipgaji', cls:'si-green', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>' },
  { key:'linkgaji', label:'Link Gaji', page:'page-linkgaji', cls:'si-purple', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>' },
  { key:'chat', label:'Chat Admin', cls:'si-orange', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' },
  { key:'lokasi', label:'Lokasi DC', page:'page-lokasi', cls:'si-pink', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>' },
  { key:'idcard', label:'ID Card', page:'page-idcard', cls:'si-teal', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>' },
  { key:'rekening', label:'Rekening', page:'page-rekening', cls:'', style:'background:rgba(6,182,212,0.1);color:#06b6d4;', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 10h20"/><path d="M6 16h4"/></svg>' },
  { key:'gantirek', label:'Ganti Rek', page:'page-gantirek', cls:'', style:'background:rgba(234,179,8,0.1);color:#eab308;', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>' },
  { key:'aduan', label:'Aduan Pungli', page:'page-aduan', cls:'', style:'background:rgba(239,68,68,0.1);color:#ef4444;', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' },
];

// ── Menu Order (localStorage) ──
function getMenuOrder() {
  try { const s = localStorage.getItem('dw_menu_order'); return s ? JSON.parse(s) : ALL_MENUS.map(m=>m.key); }
  catch(e) { return ALL_MENUS.map(m=>m.key); }
}
function saveMenuOrder(order) { localStorage.setItem('dw_menu_order', JSON.stringify(order)); }
function getOrderedMenus() {
  const order = getMenuOrder();
  const map = {}; ALL_MENUS.forEach(m => map[m.key] = m);
  const ordered = order.filter(k => map[k]).map(k => map[k]);
  ALL_MENUS.forEach(m => { if (!order.includes(m.key)) ordered.push(m); });
  return ordered;
}

function makeItemHTML(m, clickable) {
  const st = m.style ? `style="${m.style}"` : '';
  const click = clickable && m.page ? `onclick="showPage('${m.page}')"` : '';
  return `<div class="service-item" data-key="${m.key}" ${click}><div class="service-icon ${m.cls}" ${st}>${m.icon}</div><span class="service-label">${m.label}</span></div>`;
}

// ── User Data ──
var USER_DATA = { nama:'', nik:'', ops_id:'', station:'', join_date:'', bank:'', rekening:'', atas_nama:'', status_berkas:'Belum Pemberkasan', status_gaji:'' };
var CURRENT_USER = null;

// ── Page Navigation Index (for transition direction) ──
const PAGE_INDEX = { 'page-home':0, 'page-berkas':1, 'page-absensi':2, 'page-slipgaji':3, 'page-linkgaji':4, 'page-rekening':5, 'page-gantirek':6, 'page-aduan':7, 'page-lainnya':8, 'page-idcard':9, 'page-settings':10, 'page-chat':11, 'page-lokasi':12 };
var _currentPage = 'page-home';

// ── Lazy Init Tracker ──
const _inited = {};

// ── Router ──
function showPage(pageId) {
  const prevIdx = PAGE_INDEX[_currentPage] || 0;
  const nextIdx = PAGE_INDEX[pageId] || 0;
  const direction = nextIdx >= prevIdx ? 'slide-in-right' : 'slide-in-left';

  document.querySelectorAll('.page-content').forEach(p => {
    p.classList.remove('active', 'slide-in-right', 'slide-in-left');
  });
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const targetPage = document.getElementById(pageId);
  if (targetPage) {
    targetPage.classList.add('active', direction);
  }
  document.querySelector(`[data-page="${pageId}"]`)?.classList.add('active');

  // Lazy init — only init module on first visit
  if (!_inited[pageId]) {
    _inited[pageId] = true;
  }

  // Page-specific renders
  if (pageId === 'page-lainnya' && typeof renderLainnyaPage === 'function') renderLainnyaPage();
  if (pageId === 'page-absensi' && typeof renderAbsensi === 'function') renderAbsensi();
  if (pageId === 'page-slipgaji' && typeof renderSlipGaji === 'function') renderSlipGaji();
  if (pageId === 'page-rekening' && typeof renderRekening === 'function') renderRekening();
  if (pageId === 'page-gantirek' && typeof renderGantiRekening === 'function') renderGantiRekening();
  if (pageId === 'page-aduan' && typeof renderAduan === 'function') renderAduan();
  if (pageId === 'page-berkas' && typeof renderBerkas === 'function') renderBerkas();
  if (pageId === 'page-idcard' && typeof BASIdCard !== 'undefined') BASIdCard.render('idcardContent', USER_DATA);
  if (pageId === 'page-settings' && typeof renderSettings === 'function') renderSettings();
  if (pageId === 'page-lokasi' && typeof renderLokasi === 'function') renderLokasi();
  if (pageId === 'page-chat' && typeof UserChat !== 'undefined') UserChat.init();

  var bnav = document.querySelector('.bottom-nav');
  if (bnav) bnav.style.display = (pageId === 'page-chat') ? 'none' : '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
  _currentPage = pageId;

  // Update URL (clean path, no hash)
  var slug = pageId.replace('page-', '');
  var basePath = '/daily-worker/';
  var newPath = slug === 'home' ? basePath : basePath + slug;
  if (window.location.pathname !== newPath) {
    history.pushState({ page: pageId }, '', newPath);
  }
}

// ── Shared Utilities ──
function fmtRp(n) { return !n||n===0?'-':'Rp '+Number(n).toLocaleString('id-ID'); }

function formatRekening(rek) {
  if (!rek || rek === '-') return '-';
  return rek.replace(/(.{4})/g, '$1 ').trim();
}

// ── Smart Name Matching ──
function normalizeNama(str) {
  return str.toLowerCase()
    .replace(/[.,\-_'`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a, b) {
  var m = a.length, n = b.length;
  var d = [];
  for (var i = 0; i <= m; i++) { d[i] = [i]; }
  for (var j = 0; j <= n; j++) { d[0][j] = j; }
  for (i = 1; i <= m; i++) {
    for (j = 1; j <= n; j++) {
      var cost = a[i-1] === b[j-1] ? 0 : 1;
      d[i][j] = Math.min(d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + cost);
    }
  }
  return d[m][n];
}

function tokenSimilarity(a, b) {
  var maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - (levenshtein(a, b) / maxLen);
}

function isNameMatch(nama1, nama2) {
  var n1 = normalizeNama(nama1);
  var n2 = normalizeNama(nama2);
  if (n1 === n2) return true;
  var t1 = n1.split(' ').filter(function(w) { return w.length > 1; });
  var t2 = n2.split(' ').filter(function(w) { return w.length > 1; });
  for (var i = 0; i < t1.length; i++) {
    for (var j = 0; j < t2.length; j++) {
      if (tokenSimilarity(t1[i], t2[j]) >= 0.6) return true;
    }
  }
  return false;
}

// ── Dark Mode ──
function toggleDarkMode(on) {
  if (on) {
    document.body.classList.add('dark-mode');
    localStorage.setItem('bas_dark_mode', '1');
  } else {
    document.body.classList.remove('dark-mode');
    localStorage.setItem('bas_dark_mode', '0');
  }
}

function initDarkMode() {
  if (localStorage.getItem('bas_dark_mode') === '1') {
    document.body.classList.add('dark-mode');
  }
}

// ── Data Cache (localStorage with TTL) ──
const DWCache = {
  _prefix: 'dw_cache_',
  set: function(key, data, ttlMinutes) {
    try {
      var entry = { data: data, expires: Date.now() + (ttlMinutes || 10) * 60000 };
      localStorage.setItem(this._prefix + key, JSON.stringify(entry));
    } catch(e) { /* quota exceeded — ignore */ }
  },
  get: function(key) {
    try {
      var raw = localStorage.getItem(this._prefix + key);
      if (!raw) return null;
      var entry = JSON.parse(raw);
      if (Date.now() > entry.expires) { localStorage.removeItem(this._prefix + key); return null; }
      return entry.data;
    } catch(e) { return null; }
  },
  clear: function(key) {
    if (key) { localStorage.removeItem(this._prefix + key); }
    else {
      var keys = Object.keys(localStorage).filter(k => k.startsWith(this._prefix));
      keys.forEach(k => localStorage.removeItem(k));
    }
  }
};

// ── Early URL Detection (runs before DOMContentLoaded to prevent flash) ──
var _initialSlug = window.location.pathname.replace('/daily-worker/', '').replace(/\/$/, '').replace('dashboard-new.html', '').replace('dashboard.html', '');
if (_initialSlug && _initialSlug !== 'home') {
  // Remove 'active' from home immediately to prevent flash
  document.addEventListener('DOMContentLoaded', function() {
    var home = document.getElementById('page-home');
    if (home && document.getElementById('page-' + _initialSlug)) {
      home.classList.remove('active');
    }
  }, { once: true });
}

// ══════════════════════════════════════════
// INIT — DOMContentLoaded
// ══════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  initDarkMode();

  // Auth check
  if (typeof checkUserAuth === 'function') {
    try {
      CURRENT_USER = await checkUserAuth();
      if (!CURRENT_USER) { window.location.href = '/daily-worker/login.html'; return; }
      if (['owner','korlap','korlap_interview','korlap_td'].includes(CURRENT_USER.role)) { window.location.href = '/daily-worker/admin.html'; return; }
      // Load candidate data from API
      try {
        const res = await fetch('/daily-worker/api/candidates.php?user_id=' + CURRENT_USER.id);
        const data = await res.json();
        if (data.candidate) {
          const c = data.candidate;
          USER_DATA.nama = c.name || CURRENT_USER.name || '';
          USER_DATA.nik = c.nik || CURRENT_USER.nik || '';
          USER_DATA.ops_id = c.given_id || c.candidate_id || '';
          USER_DATA.station = c.location_name || '';
          USER_DATA.join_date = c.created_at ? new Date(c.created_at).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'}) : '';
          USER_DATA.bank = c.bank_name || '';
          USER_DATA.rekening = c.bank_account_no || '';
          USER_DATA.atas_nama = c.bank_account_name || '';
          USER_DATA.status_berkas = c.status || 'Belum Pemberkasan';
          USER_DATA.status_gaji = '';
        } else {
          USER_DATA.nama = CURRENT_USER.name || '';
          USER_DATA.nik = CURRENT_USER.nik || '';
        }
      } catch(e) { console.warn('Failed to load candidate:', e); USER_DATA.nama = CURRENT_USER.name || ''; }

      // Enrich with importrange data
      try {
        var searchKey = USER_DATA.nik || USER_DATA.ops_id || '';
        if (searchKey) {
          var irRes = await fetch('/daily-worker/api/importrange.php?action=list&search=' + encodeURIComponent(searchKey) + '&limit=1');
          var irData = await irRes.json();
          if (irData.success && irData.data && irData.data.length > 0) {
            var ir = irData.data[0];
            if (ir.ops_id) USER_DATA.ops_id = ir.ops_id;
            if (ir.station) USER_DATA.station = ir.station;
            if (ir.bank) USER_DATA.bank = ir.bank;
            if (ir.rekening) USER_DATA.rekening = ir.rekening;
            if (ir.atas_nama) USER_DATA.atas_nama = ir.atas_nama;
            if (ir.join_date) USER_DATA.join_date = ir.join_date;
            if (ir.status_gaji) USER_DATA.status_gaji = ir.status_gaji;
            if (ir.nama) USER_DATA.nama = ir.nama;
          }
        }
      } catch(e) { console.warn('Importrange enrich failed:', e); }

    } catch(e) { console.warn('Auth check failed:', e); }
  }

  // Init all home components
  if (typeof renderHomeGrid === 'function') renderHomeGrid();
  if (typeof updateOpsCard === 'function') updateOpsCard();
  if (typeof updateNotifications === 'function') updateNotifications();
  if (typeof loadLinktree === 'function') loadLinktree();
  if (typeof loadSiteLinks === 'function') loadSiteLinks();

  // Bottom nav click handlers
  document.querySelectorAll('.nav-item').forEach(b => b.addEventListener('click', () => showPage(b.dataset.page)));
  var chatBtn = document.getElementById('chatBtn');
  if (chatBtn) chatBtn.addEventListener('click', function() { showPage('page-chat'); });

  // Restore page from clean URL (e.g. /daily-worker/idcard → page-idcard)
  if (_initialSlug && document.getElementById('page-' + _initialSlug)) {
    showPage('page-' + _initialSlug);
  } else if (!_initialSlug || _initialSlug === 'home') {
    // Make sure home is active
    var home = document.getElementById('page-home');
    if (home) home.classList.add('active');
  }

  // Handle browser back/forward
  window.addEventListener('popstate', function(e) {
    var slug = window.location.pathname.replace('/daily-worker/', '').replace(/\/$/, '');
    if (slug && document.getElementById('page-' + slug)) {
      showPage('page-' + slug);
    } else {
      showPage('page-home');
    }
  });
});
