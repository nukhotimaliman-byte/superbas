/**
 * BAS Recruitment â€” Admin Dashboard Logic (Unified)
 * Sidebar navigation, Charts, Candidate management, ML integration
 */

const API_BASE = './api';
let currentAdmin = null;
let allCandidates = [];
let analyticsData = null;
let chartInstances = {};

// ── Pagination State ─────────────────────────────
let currentPage   = 1;
let rowsPerPage   = 50;
let showAll       = false;
let totalPages    = 1;

function updatePager() {
    const total = allCandidates.length;
    totalPages  = showAll ? 1 : Math.max(1, Math.ceil(total / rowsPerPage));
    currentPage = Math.min(currentPage, totalPages);

    const countEl = document.getElementById('candidateCount');
    if (countEl) countEl.textContent = `${total} kandidat`;

    const start  = showAll ? 1 : (currentPage - 1) * rowsPerPage + 1;
    const end    = showAll ? total : Math.min(currentPage * rowsPerPage, total);

    const pagerInput = document.getElementById('pagerInput');
    const pagerTotal = document.getElementById('pagerTotal');
    const pagerInfo  = document.getElementById('pagerInfo');
    const pagerFirst = document.getElementById('pagerFirst');
    const pagerPrev  = document.getElementById('pagerPrev');
    const pagerNext  = document.getElementById('pagerNext');
    const pagerLast  = document.getElementById('pagerLast');
    const pagerShowAll = document.getElementById('pagerShowAll');
    const pagerRowsSelect = document.getElementById('pagerRowsSelect');

    if (pagerInput)     { pagerInput.value = currentPage; pagerInput.max = totalPages; }
    if (pagerTotal)     pagerTotal.textContent = totalPages;
    if (pagerInfo)      pagerInfo.textContent  = total === 0 ? 'Tidak ada data' : `Menampilkan ${start}–${end} dari ${total}`;
    if (pagerFirst)     pagerFirst.disabled = currentPage <= 1;
    if (pagerPrev)      pagerPrev.disabled  = currentPage <= 1;
    if (pagerNext)      pagerNext.disabled  = currentPage >= totalPages;
    if (pagerLast)      pagerLast.disabled  = currentPage >= totalPages;
    if (pagerShowAll)   pagerShowAll.checked = showAll;
    if (pagerRowsSelect && !showAll) pagerRowsSelect.value = rowsPerPage;

    // Save pager state
    try { localStorage.setItem('bas_pager', JSON.stringify({ rowsPerPage, showAll })); } catch {}
}

function getPagedCandidates() {
    if (showAll) return allCandidates;
    const start = (currentPage - 1) * rowsPerPage;
    return allCandidates.slice(start, start + rowsPerPage);
}

function goPage(n) {
    n = parseInt(n) || 1;
    currentPage = Math.max(1, Math.min(n, totalPages));
    updatePager();
    renderCandidateTable();
    // Scroll table back to top
    const wrap = document.querySelector('.table-wrap');
    if (wrap) wrap.scrollTop = 0;
}

function setRowsPerPage(n) {
    rowsPerPage = n;
    showAll = false;
    document.getElementById('pagerShowAll').checked = false;
    currentPage = 1;
    updatePager();
    renderCandidateTable();
}

function toggleShowAll(val) {
    showAll = val;
    currentPage = 1;
    const rowsSel = document.getElementById('pagerRowsSelect');
    if (rowsSel) rowsSel.disabled = val;
    updatePager();
    renderCandidateTable();
}

function triggerUndo() {
    // Simulate Ctrl+Z keydown
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }));
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// TOAST — provided by js/utils.js
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// INIT
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Check demo session first (sessionStorage — set by user-auth.js handleLogin)
    try {
        const demoUser = sessionStorage.getItem('bas_demo_user');
        if (demoUser) {
            const user = JSON.parse(demoUser);
            if (['owner','korlap','korlap_interview','korlap_td'].includes(user.role)) {
                currentAdmin = user;
                window._isDemoAdmin = true;
                initDashboard();
                return;
            }
        }
    } catch {}

    // 2. Check server session via PHP API (with retry)
    let authOK = false;
    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            const res = await fetch(`${API_BASE}/user-auth.php?action=check`, {
                credentials: 'same-origin',
                cache: 'no-store'
            });
            const contentType = res.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                // Server returned non-JSON (PHP not running, or HTML error page)
                console.warn(`[BAS Auth] Attempt ${attempt}: server returned non-JSON (${contentType})`);
                continue;
            }
            const data = await res.json();
            if (data.authenticated && data.user && ['owner','korlap','korlap_interview','korlap_td'].includes(data.user.role)) {
                currentAdmin = data.user;
                // Cache session in localStorage for resilience
                try { localStorage.setItem('bas_admin_cache', JSON.stringify(data.user)); } catch {}
                authOK = true;
                break;
            } else {
                console.warn(`[BAS Auth] Attempt ${attempt}: not authenticated or invalid role`, data);
            }
        } catch (e) {
            console.warn(`[BAS Auth] Attempt ${attempt} failed:`, e.message || e);
        }
    }

    // 3. If server auth failed, try localStorage cache as last resort
    if (!authOK) {
        try {
            const cached = localStorage.getItem('bas_admin_cache');
            if (cached) {
                const user = JSON.parse(cached);
                if (['owner','korlap','korlap_interview','korlap_td'].includes(user.role)) {
                    console.info('[BAS Auth] Using cached session — server session may have expired, will re-verify on next API call');
                    currentAdmin = user;
                    authOK = true;
                }
            }
        } catch {}
    }

    if (authOK) {
        initDashboard();
    } else {
        // Clear stale cache
        localStorage.removeItem('bas_admin_cache');
        window.location.href = 'login.html';
    }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// DASHBOARD INIT
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
async function initDashboard() {
    // Set user info
    const topAvatar = document.getElementById('topbarAvatar');
    if (topAvatar) topAvatar.textContent = currentAdmin.name.charAt(0).toUpperCase();

    // Show owner-only nav items
    if (currentAdmin.role === 'owner') {
        document.querySelectorAll('.nav-owner-only').forEach(el => el.style.display = '');
        document.querySelectorAll('.admin-btab-owner').forEach(el => el.style.display = '');
    }

    // Show privileged nav items (owner + korlap)
    const isPrivileged = currentAdmin.role === 'owner' || ['korlap','korlap_interview','korlap_td'].includes(currentAdmin.role);
    if (isPrivileged) {
        document.querySelectorAll('.nav-privileged').forEach(el => el.style.display = '');
    }

    // Greeting
    const hour = new Date().getHours();
    const greeting = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 18 ? 'Selamat sore' : 'Selamat malam';
    document.getElementById('greetingText').textContent = `${greeting}, ${currentAdmin.name.split(' ')[0]}!`;

    // Sidebar toggle
    const hamburger = document.getElementById('hamburgerBtn');
    const sidebar = document.getElementById('sidebar');
    const closeBtn = document.getElementById('sidebarClose');

    hamburger.addEventListener('click', () => {
        sidebar.classList.add('open');
        getOrCreateOverlay().classList.add('active');
    });

    closeBtn.addEventListener('click', closeSidebar);

    // Logout
    document.getElementById('logoutBtn').onclick = async () => {
        sessionStorage.removeItem('bas_demo_user');
        localStorage.removeItem('bas_admin_cache');
        try { await fetch(`${API_BASE}/user-auth.php?action=logout`, { method: 'POST' }); } catch {}
        window.location.href = 'login.html';
    };

    // Global search (optional - may not exist)
    document.getElementById('globalSearch')?.addEventListener('input', debounce((e) => {
        if (e.target.value.trim()) {
            switchPage('candidates');
            document.getElementById('filterSearch').value = e.target.value;
            loadCandidates();
        }
    }, 400));



    // Init multi-select filters
    await loadLocationFilter();

    // Bind search filter
    document.getElementById('filterSearch')?.addEventListener('input', debounce(loadCandidates, 300));

    // Close multi-filter panels on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.multi-filter-wrap')) {
            document.querySelectorAll('.multi-filter-panel.open').forEach(p => {
                p.classList.remove('open');
                p.previousElementSibling?.classList.remove('open');
            });
        }
    });

    // Init column toggle
    initColToggle();

    // Restore pager preferences from localStorage
    try {
        const saved = JSON.parse(localStorage.getItem('bas_pager') || '{}');
        if (saved.rowsPerPage) rowsPerPage = saved.rowsPerPage;
        if (saved.showAll)     showAll     = saved.showAll;
        const rowsSel = document.getElementById('pagerRowsSelect');
        if (rowsSel) rowsSel.value = rowsPerPage;
    } catch {}

    // Load all data
    await Promise.all([loadAnalytics(), loadCandidates()]);

    // Restore last active tab
    const savedTab = localStorage.getItem('admin_active_tab');
    if (savedTab) switchPage(savedTab);

    // Korlap management form
    document.getElementById('createKorlapForm')?.addEventListener('submit', handleCreateKorlap);

    // Init cell selection / fill-down / undo keyboard shortcuts
    initCellSelection();
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SIDEBAR NAVIGATION
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function switchPage(pageId) {
    document.querySelectorAll('.dash-page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    document.getElementById(`page-${pageId}`)?.classList.add('active');
    document.querySelector(`.nav-item[data-page="${pageId}"]`)?.classList.add('active');

    // Sync mobile bottom nav
    document.querySelectorAll('.admin-btab').forEach(b => b.classList.remove('active'));
    document.querySelector(`.admin-btab[data-page="${pageId}"]`)?.classList.add('active');

    closeSidebar();

    // Remember current tab
    localStorage.setItem('admin_active_tab', pageId);

    // Load page-specific data
    if (pageId === 'analytics' && analyticsData) renderAnalyticsPage(analyticsData);
    if (pageId === 'aiInsights') renderAIInsightsPage();
    if (pageId === 'korlapMgmt') loadKorlapList();
    if (pageId === 'locations') loadLocationsList();
    if (pageId === 'blacklist') loadBlacklistList();
    if (pageId === 'settings') loadSettingsPage();
}

function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    const overlay = document.querySelector('.sidebar-overlay');
    if (overlay) overlay.classList.remove('active');
}

function getOrCreateOverlay() {
    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.addEventListener('click', closeSidebar);
        document.body.appendChild(overlay);
    }
    return overlay;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// LOAD ANALYTICS (Owner API)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
async function loadAnalytics() {
    try {
        let data;
        if (window._isDemoAdmin) {
            data = {
                total: 127, lulus: 38, tidak_lulus: 12, pass_rate: 76,
                by_location: { 'Makobas': 42, 'Mess Cileungsi': 35, 'Cibitung': 28, 'Cakung 2': 22 },
                by_status: { 'Belum Pemberkasan': 30, 'Sudah Pemberkasan': 25, 'Menunggu Test Drive': 18, 'Jadwal Test Drive': 4, 'Lulus': 38, 'Tidak Lulus': 12 },
                recent_registrations: []
            };
        } else {
            const res = await fetch(`${API_BASE}/owner.php?action=analytics`);
            data = await res.json();
        }
        analyticsData = data;

        // KPI Cards with counter animation
        animateCounter('kpiTotal', data.total || 0);
        animateCounter('kpiLulus', data.lulus || 0);
        animateCounter('kpiGagal', data.tidak_lulus || 0);
        const dalamProses = (data.total || 0) - (data.lulus || 0) - (data.tidak_lulus || 0);
        animateCounter('kpiProses', Math.max(0, dalamProses));
        document.getElementById('kpiPassRate').textContent = (data.pass_rate || 0) + '%';

        // Charts
        renderLocationChart(data.by_location || {});
        renderStatusChart(data.by_status || {});
        renderStatusPipeline(data.by_status || {});
        renderStatusBarChart(data.by_status || {});
        renderTrendChart(data.recent_registrations || []);

        // AI Quick Insights
        renderQuickInsights(data);

    } catch (err) {
        console.error('Analytics error:', err);
    }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// LOAD CANDIDATES
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
async function loadLocationFilter() {
    try {
        let locations;
        if (window._isDemoAdmin) {
            locations = [
                { id: 1, name: 'Makobas' },
                { id: 2, name: 'Mess Cileungsi' },
                { id: 3, name: 'Cibitung' },
                { id: 4, name: 'Cakung 2' }
            ];
        } else {
            const res = await fetch(`${API_BASE}/admin.php?locations=1`);
            const data = await res.json();
            locations = data.locations;
        }
        const list = document.getElementById('mfListLocation');
        if (list && locations) {
            list.innerHTML = locations.map(loc => `
                <label class="mf-item">
                    <input type="checkbox" value="${loc.id}" onchange="onMultiFilterChange('Location')">
                    ${escapeHtml(loc.name)}
                </label>
            `).join('');
        }
    } catch {}
}

function getMultiFilterValues(key) {
    const list = document.getElementById(`mfList${key}`);
    if (!list) return [];
    return Array.from(list.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
}

function updateMultiFilterLabel(key) {
    const values = getMultiFilterValues(key);
    const label = document.getElementById(`mfLabel${key}`);
    const btn = document.getElementById(`mfBtn${key}`);
    const defaults = { Location: 'Semua Lokasi', Status: 'Semua Status', Armada: 'Semua Armada' };
    if (!label || !btn) return;
    if (values.length === 0) {
        label.textContent = defaults[key];
        btn.classList.remove('has-active');
    } else if (values.length === 1) {
        if (key === 'Location') {
            const cb = document.querySelector(`#mfListLocation input[value="${values[0]}"]`);
            label.textContent = cb?.closest('label')?.textContent?.trim() || '1 lokasi';
        } else {
            label.textContent = values[0];
        }
        btn.classList.add('has-active');
    } else {
        label.textContent = `${values.length} dipilih`;
        btn.classList.add('has-active');
    }
}

function toggleMultiFilter(key) {
    const panel = document.getElementById(`mfPanel${key}`);
    const btn = document.getElementById(`mfBtn${key}`);
    const isOpen = panel.classList.contains('open');
    document.querySelectorAll('.multi-filter-panel.open').forEach(p => p.classList.remove('open'));
    document.querySelectorAll('.multi-filter-btn.open').forEach(b => b.classList.remove('open'));
    if (!isOpen) { panel.classList.add('open'); btn.classList.add('open'); }
}

function clearMultiFilter(key) {
    const list = document.getElementById(`mfList${key}`);
    list?.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    // Also uncheck the "Semua" checkbox in header
    const panel = document.getElementById(`mfPanel${key}`);
    const selectAllCb = panel?.querySelector('.mf-select-all input[type="checkbox"]');
    if (selectAllCb) selectAllCb.checked = false;
    updateMultiFilterLabel(key);
    loadCandidates();
}

function selectAllMultiFilter(key, checked) {
    const list = document.getElementById(`mfList${key}`);
    list?.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = checked);
    updateMultiFilterLabel(key);
    loadCandidates();
}

function onMultiFilterChange(key) {
    // Sync "Semua" checkbox state
    const list = document.getElementById(`mfList${key}`);
    const panel = document.getElementById(`mfPanel${key}`);
    const selectAllCb = panel?.querySelector('.mf-select-all input[type="checkbox"]');
    if (list && selectAllCb) {
        const allBoxes = list.querySelectorAll('input[type="checkbox"]');
        const checkedBoxes = list.querySelectorAll('input[type="checkbox"]:checked');
        selectAllCb.checked = allBoxes.length > 0 && allBoxes.length === checkedBoxes.length;
    }
    updateMultiFilterLabel(key);
    loadCandidates();
}

async function loadCandidates() {
    const locIds   = getMultiFilterValues('Location');
    const statuses = getMultiFilterValues('Status');
    const armadas  = getMultiFilterValues('Armada');
    const search   = document.getElementById('filterSearch')?.value?.trim() || '';

    let url = `${API_BASE}/admin.php?`;
    if (search) url += `search=${encodeURIComponent(search)}&`;

    // Preserve scroll position and current page
    const tbody = document.getElementById('candidateTableBody');
    const tableWrap = tbody?.closest('.table-wrap');
    const scrollTop  = tableWrap?.scrollTop  || 0;
    const scrollLeft = tableWrap?.scrollLeft || 0;
    const savedPage  = currentPage;

    try {
        let candidates;
        if (window._isDemoAdmin) {
            candidates = _getDemoCandidates();
        } else {
            const res = await fetch(url, { credentials: 'same-origin' });
            const data = await res.json();
            candidates = data.candidates || [];
        }

        if (locIds.length > 0)   candidates = candidates.filter(c => locIds.includes(String(c.location_id)));
        if (statuses.length > 0) candidates = candidates.filter(c => statuses.includes(c.status));
        if (armadas.length > 0)  candidates = candidates.filter(c => armadas.includes(c.armada_type));

        allCandidates = candidates;

        // Re-apply current sort so table order is preserved after reload
        if (currentSortField) {
            allCandidates.sort((a, b) => {
                let va = a[currentSortField] || '';
                let vb = b[currentSortField] || '';
                if (typeof va === 'string') va = va.toLowerCase();
                if (typeof vb === 'string') vb = vb.toLowerCase();
                if (va < vb) return currentSortDir === 'asc' ? -1 : 1;
                if (va > vb) return currentSortDir === 'asc' ? 1 : -1;
                return 0;
            });
        }

        // Restore page (don't reset to 1 on every reload from edit)
        const _totalPages = showAll ? 1 : Math.max(1, Math.ceil(allCandidates.length / rowsPerPage));
        currentPage = Math.min(savedPage, _totalPages);
        updatePager();

        renderCandidateTable();
        renderRecentTable();

        // Restore scroll position
        requestAnimationFrame(() => {
            if (tableWrap) {
                tableWrap.scrollTop  = scrollTop;
                tableWrap.scrollLeft = scrollLeft;
            }
        });
    } catch (e) {
        console.error("DEBUG loadCandidates Error:", e);
        document.getElementById('candidateTableBody').innerHTML =
            '<tr><td colspan="34" class="table-empty">Gagal memuat data: ' + String(e.message || e) + '</td></tr>';
    }
}

// Update candidate data locally without API refetch (prevents table reload/flicker)
function updateLocalCandidate(cid, field, value) {
    const candidate = allCandidates.find(c => String(c.id) === String(cid));
    if (candidate) {
        candidate[field] = value;
        // Update display_location if location_id changed
        if (field === 'location_id') {
            const loc = (allLocations || []).find(l => String(l.id) === String(value));
            candidate.display_location = loc ? loc.name : value;
        }
    }
    renderCandidateTable();
}
// ══════════════════════════════════════════════
// RENDER TABLES
// ══════════════════════════════════════════════


function renderCandidateTable() {
    const tbody = document.getElementById('candidateTableBody');
    if (allCandidates.length === 0) {
        tbody.innerHTML = '<tr><td colspan="34" class="table-empty">Belum ada kandidat</td></tr>';
        updatePager();
        return;
    }

    // Reset sheet selection
    sheetActiveCell = null; sheetSelStart = null; sheetSelEnd = null;

    const isOwner   = currentAdmin?.role === 'owner';
    const isKorlap  = ['korlap','korlap_interview','korlap_td'].includes(currentAdmin?.role);
    const isPrivileged = isOwner || isKorlap; // same spreadsheet layout

    const pagedCandidates = getPagedCandidates();

    tbody.innerHTML = pagedCandidates.map((c) => {
        // ── Cell helpers ──────────────────────────────────────
        // ce: text-editable (owner only)
        const ce = (field, display) => {
            if (!isOwner) return `<td>${display}</td>`;
            return `<td class="cand-editable" data-field="${field}" data-cid="${c.id}" data-val="${escapeHtml(String(c[field] || ''))}">${display}</td>`;
        };

        // cs: select-editable (owner for all, korlap for status only)
        const cs = (field, display) => {
            const editable = isOwner || (isKorlap && field === 'status');
            if (!editable) return `<td>${display}</td>`;
            return `<td class="cand-editable-select" data-field="${field}" data-cid="${c.id}" data-val="${escapeHtml(String(c[field] || ''))}">${display}</td>`;
        };

        // cd: date-editable (owner + korlap)
        const cd = (field, display) => {
            if (!isPrivileged) return `<td>${display}</td>`;
            return `<td class="cand-editable" data-field="${field}" data-cid="${c.id}" data-val="${escapeHtml(String(c[field] || ''))}">${display}</td>`;
        };

        // ct: time-editable (owner + korlap)
        const ct = (field, display) => {
            if (!isPrivileged) return `<td>${display}</td>`;
            return `<td class="cand-editable-time" data-field="${field}" data-cid="${c.id}" data-val="${escapeHtml(String(c[field] || ''))}">${display}</td>`;
        };

        // ── Username cell ──────────────────────────────────────
        const usernameCell = isOwner
            ? ce('user_username', c.user_username
                ? `<span class="login-badge-ok">${escapeHtml(c.user_username)}</span>`
                : '-')
            : `<td>${c.user_username
                ? `<span class="login-badge-ok">${escapeHtml(c.user_username)}</span>`
                : '-'}</td>`;

        // ── Password cell (owner: show+toggle+reset, others: masked) ──
        let pwCell;
        if (isOwner) {
            const plain = c.user_password || '';
            const hasPw = !!c.user_id;
            pwCell = `<td style="white-space:nowrap;">
                <span class="pw-val" data-plain="${escapeHtml(plain)}">${
                hasPw
                    ? (plain ? '•••••' : '<em style="font-size:0.7rem;opacity:0.5;">null</em>')
                    : '-'
                }</span>
                ${hasPw ? `<button class="btn-eye" onclick="event.stopPropagation();togglePwVis(this)" title="Tampilkan/Sembunyikan">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                    <button class="btn-eye" onclick="event.stopPropagation();resetUserPassword(${c.id},'${escapeHtml(c.name || c.user_username || 'User').replace(/'/g,"\\'")}' )" title="Reset Password" style="margin-left:2px;">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                    </button>` : ''}
            </td>`;
        } else {
            // Korlap: sudah hidden password, tapi tampil masked dan identitas login
            pwCell = `<td>${c.user_id
                ? '<span style="opacity:0.4;font-size:0.75rem;">•••••</span>'
                : '-'}</td>`;
        }

        // ── Misc display helpers ───────────────────────────────
        const addrShort = c.address
            ? escapeHtml(c.address).substring(0, 20) + (c.address.length > 20 ? '…' : '')
            : '-';

        const dateDisplay  = c.test_drive_date ? formatDate(c.test_drive_date) : '-';
        const timeDisplay  = c.test_drive_time ? String(c.test_drive_time).substring(0, 5) : '-';
        const timeVal      = c.test_drive_time ? String(c.test_drive_time).substring(0, 5) : '';

        // ── Action buttons ────────────────────────────────────
        // Detail  — semua role
        // Blacklist — owner & korlap
        // Delete  — owner only
        const blacklistBtn = (isPrivileged && c.nik)
            ? `<button class="btn-action" style="background:var(--error);color:#fff;padding:4px 7px;font-size:0.8rem;min-width:28px;" onclick="event.stopPropagation();promptBlacklist('${escapeHtml(c.nik)}')" title="Blacklist NIK">🚫</button>`
            : '';
        const deleteBtn = isOwner
            ? `<button class="btn-trash" style="padding:4px 7px;min-width:28px;" onclick="event.stopPropagation();deleteCandidate(${c.id},'${escapeHtml(c.name).replace(/'/g,"\\'")}' )" title="Hapus">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
            </button>`
            : '';

        // isPrivileged → no row-click (spreadsheet nav); others → whole row clickable
        const rowAttr = isPrivileged ? '' : `onclick="openCandidate(${c.id})" style="cursor:pointer;"`;

        // ── Korlap notes display ──────────────────────────────
        const notesShort = c.korlap_notes
            ? escapeHtml(c.korlap_notes).substring(0, 25) + (c.korlap_notes.length > 25 ? '…' : '')
            : '-';

        return `
            <tr ${rowAttr}>
                <td class="td-select" onclick="event.stopPropagation()">
                    <input type="checkbox" class="cand-checkbox" value="${c.id}" onchange="updateBulkBar()">
                </td>
                ${ce('given_id',           c.given_id || '-')}
                ${cd('test_drive_date',   dateDisplay)}
                ${ct('test_drive_time',   timeDisplay)}
                ${ce('korlap_notes',      '<span title="' + escapeHtml(c.korlap_notes || '') + '">' + notesShort + '</span>')}
                ${ce('user_created_at',    c.user_created_at ? formatDate(c.user_created_at) : '-')}
                ${usernameCell}
                ${pwCell}
                ${ce('name',              '<strong>' + escapeHtml(c.name) + '</strong>')}
                ${ce('nik',               c.nik || '-')}
                ${ce('whatsapp',          c.whatsapp || '-')}
                <td>${c.email || '-'}</td>
                ${ce('sim_type',          c.sim_type || '-')}
                ${cs('armada_type',       c.armada_type || '-')}
                ${cs('status',            '<span class="badge ' + getStatusBadgeClass(c.status) + '">' + c.status + '</span>')}
                ${ce('tempat_lahir',      c.tempat_lahir || '-')}
                ${ce('tanggal_lahir',     c.tanggal_lahir || '-')}
                ${ce('provinsi',          c.provinsi || '-')}
                ${ce('kabupaten',         c.kabupaten || '-')}
                ${ce('kecamatan',         c.kecamatan || '-')}
                ${ce('kelurahan',         c.kelurahan || '-')}
                ${ce('address',           '<span title="' + escapeHtml(c.address || '') + '">' + addrShort + '</span>')}
                ${ce('pendidikan_terakhir', c.pendidikan_terakhir || '-')}
                ${cs('pernah_kerja_spx',  c.pernah_kerja_spx || '-')}
                ${cs('surat_sehat',       c.surat_sehat || '-')}
                ${cs('paklaring',         c.paklaring || '-')}
                ${ce('referensi',         c.referensi || '-')}
                ${ce('emergency_phone',   c.emergency_phone
                    ? `<a href="https://wa.me/${formatWaNumber(c.emergency_phone)}" target="_blank" class="wa-link">${escapeHtml(c.emergency_phone)}</a>`
                    : '-')}
                ${ce('emergency_name',    c.emergency_name || '-')}
                ${ce('emergency_relation', c.emergency_relation || '-')}
                ${cs('location_id',       c.display_location || '-')}
                ${ce('bank_name',         c.bank_name || '-')}
                ${ce('bank_account_no',   c.bank_account_no || '-')}
                ${ce('bank_account_name', c.bank_account_name || '-')}
                <td style="white-space:nowrap;">
                    <div style="display:flex;gap:4px;align-items:center;">
                        <button class="btn-action" style="padding:4px 10px;font-size:0.78rem;" onclick="event.stopPropagation();openCandidate(${c.id})">Detail</button>
                        <button class="btn-action" style="padding:4px 8px;font-size:0.78rem;background:#3B82F6;color:#fff;display:inline-flex;align-items:center;" onclick="event.stopPropagation();openSinglePush(${c.user_id},'${escapeHtml(c.name)}')" title="Kirim Push Notifikasi"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg></button>
                        ${blacklistBtn}
                        ${deleteBtn}
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    // ── Bind inline edit handlers (double-click) ─────────────
    if (isOwner) {
        // Owner: semua field text-editable
        tbody.querySelectorAll('.cand-editable:not([data-field="test_drive_date"])').forEach(td =>
            td.addEventListener('dblclick', (e) => { e.stopPropagation(); startCandEditText(td); })
        );
        tbody.querySelectorAll('.cand-editable-select').forEach(td =>
            td.addEventListener('dblclick', (e) => { e.stopPropagation(); startCandEditSelect(td); })
        );
        tbody.querySelectorAll('.cand-pw-edit').forEach(td =>
            td.addEventListener('dblclick', (e) => { e.stopPropagation(); startCandPwEdit(td); })
        );
    } else if (isKorlap) {
        // Korlap: hanya status (select)
        tbody.querySelectorAll('.cand-editable-select[data-field="status"]').forEach(td =>
            td.addEventListener('dblclick', (e) => { e.stopPropagation(); startCandEditSelect(td); })
        );
    }

    // Owner + Korlap: tanggal & jam test drive
    if (isPrivileged) {
        tbody.querySelectorAll('.cand-editable[data-field="test_drive_date"]').forEach(td =>
            td.addEventListener('dblclick', (e) => { e.stopPropagation(); startCandEditText(td); })
        );
        tbody.querySelectorAll('.cand-editable-time').forEach(td =>
            td.addEventListener('dblclick', (e) => { e.stopPropagation(); startCandEditTime(td); })
        );
    }

    // Bind sortable headers
    document.querySelectorAll('.dash-table th.sortable').forEach(th => {
        th.onclick = () => sortCandidates(th.dataset.sort, th);
    });

    // Init spreadsheet navigation (owner & korlap)
    if (isPrivileged) initSheetNav();
}

let currentSortField = null;
let currentSortDir = 'asc';

function sortCandidates(field, thEl) {
    if (currentSortField === field) {
        currentSortDir = currentSortDir === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortField = field;
        currentSortDir = 'asc';
    }

    document.querySelectorAll('.dash-table th.sortable').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
    });
    thEl.classList.add(currentSortDir === 'asc' ? 'sort-asc' : 'sort-desc');

    allCandidates.sort((a, b) => {
        let va = a[field] || '';
        let vb = b[field] || '';

        if (!isNaN(va) && !isNaN(vb) && va !== '' && vb !== '') {
            va = Number(va);
            vb = Number(vb);
        } else {
            va = String(va).toLowerCase();
            vb = String(vb).toLowerCase();
        }

        if (va < vb) return currentSortDir === 'asc' ? -1 : 1;
        if (va > vb) return currentSortDir === 'asc' ? 1 : -1;
        return 0;
    });

    renderCandidateTable();
}

// ══════════════════════════════════════════════
// CANDIDATE INLINE EDIT (Owner Only)
// ══════════════════════════════════════════════
function startCandEditText(td) {
    if (td.querySelector('input')) return;
    const field      = td.dataset.field;
    const cid        = td.dataset.cid;
    const currentVal = td.dataset.val || '';

    const input = document.createElement('input');
    input.type = (field === 'tanggal_lahir' || field === 'test_drive_date') ? 'date' : 'text';
    input.value = currentVal;
    input.className = 'inline-edit-input';
    td.innerHTML = '';
    td.appendChild(input);
    input.focus();
    input.select();

    let _saved = false; // guard: prevent double-save
    const save = () => {
        if (_saved) return;
        _saved = true;
        const newVal = input.value.trim();
        if (newVal !== currentVal) {
            saveCandidateField(cid, field, newVal, { oldVal: currentVal });
        } else {
            renderCandidateTable(); // restore display, no API call needed
        }
    };
    input.addEventListener('blur', save);
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
        if (e.key === 'Escape') { _saved = true; renderCandidateTable(); }
    });
}

// togglePwVis is defined further below (after toggleKorlapPwVis)

function startCandPwEdit(td) {
    if (td.querySelector('input')) return;
    const cid = td.dataset.cid;

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Password baru (min 6)';
    input.className = 'inline-edit-input';
    td.innerHTML = '';
    td.appendChild(input);
    input.focus();

    let _saved = false;
    const save = () => {
        if (_saved) return;
        _saved = true;
        const val = input.value.trim();
        if (val) {
            if (val.length < 6) { showToast('Password minimal 6 karakter', 'error'); renderCandidateTable(); return; }
            saveCandidateField(cid, 'user_password', val);
        } else {
            renderCandidateTable(); // cancelled
        }
    };
    input.addEventListener('blur', save);
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
        if (e.key === 'Escape') { _saved = true; renderCandidateTable(); }
    });
}

// Inline time editor for test_drive_time (editable by korlap & owner)
function startCandEditTime(td) {
    if (td.querySelector('input')) return;
    const cid      = td.dataset.cid;
    const currentVal = td.dataset.val || '';

    const input = document.createElement('input');
    input.type = 'time';
    input.value = currentVal;
    input.className = 'inline-edit-input';
    input.style.width = '90px';
    td.innerHTML = '';
    td.appendChild(input);
    input.focus();

    let _saved = false;
    const save = () => {
        if (_saved) return;
        _saved = true;
        const newVal = input.value; // HH:MM
        if (newVal !== currentVal) {
            saveCandidateField(cid, 'test_drive_time', newVal, { oldVal: currentVal });
        } else {
            renderCandidateTable();
        }
    };
    input.addEventListener('blur', save);
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
        if (e.key === 'Escape') { _saved = true; renderCandidateTable(); }
    });
}

function startCandEditSelect(td) {
    if (td.querySelector('select')) return;
    const field = td.dataset.field;
    const cid = td.dataset.cid;
    const currentVal = td.dataset.val || '';

    const select = document.createElement('select');
    select.className = 'inline-edit-select';

    let options = [];
    if (field === 'armada_type') {
        const dbOpts = (_dropdownCache['armada_type'] || []).map(o => [o.value, o.label]);
        options = [['', '—'], ...dbOpts];
    } else if (field === 'status') {
        options = ALL_STATUSES.map(s => [s, s]);
    } else if (field === 'pernah_kerja_spx') {
        const dbOpts = (_dropdownCache['pernah_kerja_spx'] || []).map(o => [o.value, o.label]);
        options = dbOpts.length ? [['', '—'], ...dbOpts] : [['', '—'], ['Ya', 'Ya'], ['Tidak', 'Tidak']];
    } else if (field === 'surat_sehat' || field === 'paklaring') {
        const dbOpts = (_dropdownCache[field] || []).map(o => [o.value, o.label]);
        options = dbOpts.length ? [['', '—'], ...dbOpts] : [['', '—'], ['Ada', 'Ada'], ['Tidak Ada', 'Tidak Ada']];
    } else if (field === 'location_id') {
        options = [];
        document.querySelectorAll('#mfListLocation input[type="checkbox"]').forEach(cb => {
            const label = cb.closest('label')?.textContent?.trim();
            if (cb.value && label) options.push([cb.value, label]);
        });
        if (options.length === 0 && window.allCandidates) {
            const seen = new Set();
            allCandidates.forEach(c => {
                if (c.location_id && c.location_name && !seen.has(c.location_id)) {
                    options.push([c.location_id, c.location_name]);
                    seen.add(c.location_id);
                }
            });
        }
    }

    options.forEach(([val, label]) => {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = label;
        if (String(val) === String(currentVal)) opt.selected = true;
        select.appendChild(opt);
    });

    td.innerHTML = '';
    td.appendChild(select);
    select.focus();

    let _saved = false; // guard: prevent blur+change double-save
    const save = () => {
        if (_saved) return;
        _saved = true;
        const newVal = select.value;
        if (newVal !== currentVal) {
            saveCandidateField(cid, field, newVal, { oldVal: currentVal });
        } else {
            renderCandidateTable(); // no change, just restore display
        }
    };
    select.addEventListener('change', () => { _saved = false; select.blur(); }); // reset guard on change so blur fires once
    select.addEventListener('blur', save);
    select.addEventListener('keydown', e => {
        if (e.key === 'Escape') { _saved = true; renderCandidateTable(); }
    });
}

// ── Undo / Redo Stack ──────────────────────────
const undoStack = []; // [{type:'single'|'batch', items:[{cid,field,oldVal,newVal}]}]
const redoStack = [];
const MAX_UNDO = 50;

function pushUndo(items) {
    undoStack.push({ items });
    if (undoStack.length > MAX_UNDO) undoStack.shift();
    redoStack.length = 0; // clear redo on new action
    updateUndoIndicator();
}

function updateUndoIndicator() {
    const el = document.getElementById('undoRedoIndicator');
    if (!el) return;
    el.textContent = undoStack.length > 0 ? `Ctrl+Z (${undoStack.length})` : '';
    el.style.display = undoStack.length > 0 ? 'inline' : 'none';
}

async function saveCandidateField(cid, field, value, opts = {}) {
    const { skipToast = false, skipReload = false, skipUndo = false, oldVal = null } = opts;
    // Push to undo if old value provided
    if (!skipUndo && oldVal !== null) {
        pushUndo([{ cid, field, oldVal, newVal: value }]);
    }
    try {
        const res = await fetch(`${API_BASE}/admin.php`, {
            method: 'PUT',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ candidate_id: parseInt(cid), field, value })
        });
        const data = await res.json();
        if (data.success) {
            if (!skipToast) showToast(data.message || 'Berhasil diperbarui');
            if (!skipReload) {
                // Local update: update allCandidates in-memory, avoid full API refetch
                // This prevents table flash and preserves sort order + scroll position
                updateLocalCandidate(cid, field, value);
            }
        } else {
            showToast(data.error || 'Gagal menyimpan', 'error');
            // On error: DO NOT update allCandidates with invalid value
            // Just re-render to close the inline input and restore old display
            if (!skipReload) renderCandidateTable();
        }
    } catch {
        showToast('Koneksi gagal', 'error');
        if (!skipReload) renderCandidateTable();
    }
}

// ══════════════════════════════════════════════
// SELECT & DELETE CANDIDATES
// ══════════════════════════════════════════════
function toggleSelectAll(masterCb) {
    const checked = masterCb.checked;
    document.querySelectorAll('.cand-checkbox').forEach(cb => cb.checked = checked);
    // Sync both select-all checkboxes
    const top = document.getElementById('selectAllTop');
    const thead = document.getElementById('selectAllCand');
    if (top) top.checked = checked;
    if (thead) thead.checked = checked;
    updateBulkBar();
}

function updateBulkBar() {
    const checked = document.querySelectorAll('.cand-checkbox:checked');
    const bar = document.getElementById('bulkActions');
    const count = document.getElementById('selectedCount');
    if (checked.length > 0) {
        bar.style.display = 'flex';
        count.textContent = checked.length + ' dipilih';
    } else {
        bar.style.display = 'none';
    }
}

async function deleteCandidate(id, name) {
    if (!confirm(`Hapus kandidat "${name}"?\n\nData akan dihapus permanen.`)) return;
    try {
        const res = await fetch(`${API_BASE}/admin.php`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: [id] })
        });
        const data = await res.json();
        if (data.success) {
            showToast(data.message || 'Kandidat berhasil dihapus');
            loadCandidates();
        } else {
            showToast(data.error || 'Gagal menghapus', 'error');
        }
    } catch {
        showToast('Koneksi gagal', 'error');
    }
}

async function bulkDeleteCandidates() {
    const checked = document.querySelectorAll('.cand-checkbox:checked');
    if (checked.length === 0) return;
    if (!confirm(`Hapus ${checked.length} kandidat terpilih?\n\nSemua data akan dihapus permanen.`)) return;
    const ids = Array.from(checked).map(cb => parseInt(cb.value));
    try {
        const res = await fetch(`${API_BASE}/admin.php`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids })
        });
        const data = await res.json();
        if (data.success) {
            showToast(data.message || 'Kandidat berhasil dihapus');
            document.getElementById('bulkActions').style.display = 'none';
            loadCandidates();
        } else {
            showToast(data.error || 'Gagal menghapus', 'error');
        }
    } catch {
        showToast('Koneksi gagal', 'error');
    }
}

// ══════════════════════════════════════════════
// COLUMN VISIBILITY TOGGLE
// ══════════════════════════════════════════════
const COL_TOGGLE_MAP = [
    // [colIndex (1-based nth-child), label]
    [2, 'ID'],
    [3, 'Tgl Akun'],
    [4, 'Username'],
    [5, 'Password'],
    [6, 'Nama'],
    [7, 'NIK'],
    [8, 'WhatsApp'],
    [9, 'Email'],
    [10, 'SIM'],
    [11, 'Armada'],
    [12, 'Status'],
    [13, 'Tempat Lahir'],
    [14, 'Tgl Lahir'],
    [15, 'Alamat'],
    [16, 'Pendidikan'],
    [17, 'SPX?'],
    [18, 'Surat Sehat'],
    [19, 'Paklaring'],
    [20, 'Referensi'],
    [21, 'Kontak Darurat'],
    [22, 'Nama Kontak'],
    [23, 'Hub. Kontak'],
    [24, 'Lokasi'],
    [25, 'Tgl Test Drive'],
    [26, 'Jam Test Drive'],
];

let colVisibility = {};

function initColToggle() {
    // Load saved state
    try {
        const saved = localStorage.getItem('bas_col_visibility');
        if (saved) colVisibility = JSON.parse(saved);
    } catch { colVisibility = {}; }

    const list = document.getElementById('colToggleList');
    if (!list) return;

    list.innerHTML = COL_TOGGLE_MAP.map(([colIdx, label]) => {
        const checked = colVisibility[colIdx] !== false;
        return `<div class="col-toggle-item" onclick="toggleCol(${colIdx}, this)">
            <input type="checkbox" ${checked ? 'checked' : ''} id="coltog_${colIdx}">
            <label for="coltog_${colIdx}">${label}</label>
        </div>`;
    }).join('');

    applyColVisibility();

    // Close on outside click
    document.addEventListener('click', (e) => {
        const panel = document.getElementById('colTogglePanel');
        const wrap = e.target.closest('.col-toggle-wrap');
        if (!wrap && panel) panel.classList.remove('open');
    });
}

function toggleColPanel() {
    const panel = document.getElementById('colTogglePanel');
    panel.classList.toggle('open');
}

function toggleCol(colIdx, itemEl) {
    const cb = itemEl.querySelector('input[type="checkbox"]');
    cb.checked = !cb.checked;
    colVisibility[colIdx] = cb.checked;

    // Save
    try { localStorage.setItem('bas_col_visibility', JSON.stringify(colVisibility)); } catch {}

    applyColVisibility();
}

function applyColVisibility() {
    let styleEl = document.getElementById('col-visibility-style');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'col-visibility-style';
        document.head.appendChild(styleEl);
    }

    const rules = [];
    for (const [colIdx] of COL_TOGGLE_MAP) {
        if (colVisibility[colIdx] === false) {
            rules.push(`.dash-table-full th:nth-child(${colIdx}), .dash-table-full td:nth-child(${colIdx}) { display: none; }`);
        }
    }
    styleEl.textContent = rules.join('\n');
}


// SPREADSHEET NAVIGATION (Excel-like)
// ══════════════════════════════════════════════
let sheetActiveCell = null;
let sheetSelStart = null;
let sheetSelEnd = null;

function initSheetNav() {
    const tbody = document.getElementById('candidateTableBody');
    if (!tbody) return;
    const wrap = tbody.closest('.table-wrap');
    if (!wrap) return;
    wrap.setAttribute('tabindex', '0');
    wrap.style.outline = 'none';

    // Remove old listeners by cloning wrapper only
    const newWrap = wrap.cloneNode(false);
    while (wrap.firstChild) newWrap.appendChild(wrap.firstChild);
    wrap.parentNode.replaceChild(newWrap, wrap);

    const table = newWrap.querySelector('#candidateTableBody');

    // Click to select cell (don't steal focus to allow native text select)
    table.addEventListener('mousedown', (e) => {
        const td = e.target.closest('td');
        if (!td || td.classList.contains('td-select')) return;
        if (e.target.closest('button, input, select, a')) return;
        const tr = td.closest('tr');
        if (!tr) return;
        const row = Array.from(table.children).indexOf(tr);
        const col = Array.from(tr.children).indexOf(td);
        if (e.shiftKey && sheetActiveCell) {
            e.preventDefault(); // prevent text select only on shift-click
            sheetSelEnd = { row, col };
        } else {
            sheetActiveCell = { row, col };
            sheetSelStart = { row, col };
            sheetSelEnd = { row, col };
        }
        highlightSheet();
    });

    // Focus wrapper on single click (delayed so text selection still works)
    table.addEventListener('click', (e) => {
        if (!e.target.closest('button, input, select, a')) {
            newWrap.focus();
        }
    });

    // Arrow key nav
    newWrap.addEventListener('keydown', (e) => {
        if (!sheetActiveCell) return;
        const rows = table.querySelectorAll('tr');
        const maxRow = rows.length - 1;
        if (maxRow < 0) return;

        if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
            e.preventDefault();
            let { row, col } = sheetActiveCell;
            if (e.key === 'ArrowUp') row = Math.max(0, row - 1);
            if (e.key === 'ArrowDown') row = Math.min(maxRow, row + 1);
            if (e.key === 'ArrowLeft') col = Math.max(1, col - 1);
            if (e.key === 'ArrowRight') {
                const maxCol = rows[row]?.children.length - 2 || col;
                col = Math.min(maxCol, col + 1);
            }
            sheetActiveCell = { row, col };
            if (e.shiftKey) { sheetSelEnd = { row, col }; }
            else { sheetSelStart = { row, col }; sheetSelEnd = { row, col }; }
            highlightSheet();
            rows[row]?.children[col]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }

        // Ctrl+A select all
        if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            sheetSelStart = { row: 0, col: 1 };
            sheetSelEnd = { row: maxRow, col: (rows[0]?.children.length || 2) - 2 };
            highlightSheet();
        }

        // Ctrl+C copy — respect native text selection first
        if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
            const nativeSel = window.getSelection();
            if (nativeSel && nativeSel.toString().trim()) return; // let browser handle
            e.preventDefault();
            copySheetSelection();
        }
    });

    // NOTE: Ctrl+V paste is now handled by document.addEventListener('paste') below
    // This allows paste to work regardless of which element has focus
}


// ── Document-level Paste Handler (works regardless of focus) ──────────────
const COL_FIELDS_MAP = [
    null,                  // 0: checkbox
    'given_id',            // 1: ID
    'test_drive_date',     // 2: Tgl Test Drive
    'test_drive_time',     // 3: Jam Test Drive
    'korlap_notes',        // 4: Catatan Korlap
    'user_created_at',     // 5: Tgl Akun
    'user_username',       // 6: Username
    null,                  // 7: Password (skip)
    'name',                // 8: Nama
    'nik',                 // 9: NIK
    'whatsapp',            // 10: WA
    'email',               // 11: Email
    'sim_type',            // 12: SIM
    'armada_type',         // 13: Armada
    'status',              // 14: Status
    'tempat_lahir',        // 15: Tempat Lahir
    'tanggal_lahir',       // 16: Tgl Lahir
    'provinsi',            // 17: Provinsi
    'kabupaten',           // 18: Kab/Kota
    'kecamatan',           // 19: Kecamatan
    'kelurahan',           // 20: Kelurahan
    'address',             // 21: Detail Alamat
    'pendidikan_terakhir', // 22: Pendidikan
    'pernah_kerja_spx',    // 23: SPX
    'surat_sehat',         // 24: Surat Sehat
    'paklaring',           // 25: Paklaring
    'referensi',           // 26: Referensi
    null,                  // 27: Emergency display (skip)
    'emergency_name',      // 28: Nama Kontak
    'emergency_relation',  // 29: Hubungan
    'location_id',         // 30: Lokasi
    'bank_name',           // 31: Bank
    'bank_account_no',     // 32: No. Rek
    'bank_account_name',   // 33: Atas Nama
    null                   // 34: Aksi
];

document.addEventListener('paste', async (e) => {
    // Only handle paste when table context is active
    if (!sheetActiveCell) return;
    if (currentAdmin?.role !== 'owner') return;
    const activeTag = document.activeElement?.tagName;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTag)) return;

    e.preventDefault();

    const clipData = (e.clipboardData || window.clipboardData).getData('text');
    if (!clipData || !clipData.trim()) { showFillHint('Clipboard kosong'); return; }

    const tbody = document.getElementById('candidateTableBody');
    if (!tbody) return;
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const startRow = sheetActiveCell.row;
    const startCol = sheetActiveCell.col;

    const pasteRows = clipData.split(/\r?\n/).filter(r => r.trim() !== '');
    const updates = [];

    for (let ri = 0; ri < pasteRows.length; ri++) {
        const tableRow = startRow + ri;
        if (tableRow >= rows.length) break;
        const tr = rows[tableRow];
        const cidCell = tr.querySelector('[data-cid]');
        if (!cidCell) continue;
        const cid = cidCell.dataset.cid;

        const cells = pasteRows[ri].split('\t');
        for (let ci = 0; ci < cells.length; ci++) {
            const tableCol = startCol + ci;
            // Prefer data-field from actual td if available
            const td = tr.children[tableCol];
            const field = (td && td.dataset.field) ? td.dataset.field : COL_FIELDS_MAP[tableCol];
            if (!field) continue;
            const value = cells[ci].trim();
            if (value === '') continue;
            updates.push({ cid, field, value });
        }
    }

    if (updates.length === 0) { showFillHint('Tidak ada data valid untuk di-paste'); return; }

    showFillHint(`Paste ${updates.length} data ke database...`);

    // Collect old values for undo
    const batchItems = updates.map(upd => {
        const cObj = allCandidates.find(c => String(c.id) === String(upd.cid));
        const oldVal = cObj ? String(cObj[upd.field] || '') : '';
        return { cid: upd.cid, field: upd.field, oldVal, newVal: upd.value };
    });
    pushUndo(batchItems);

    let ok = 0, fail = 0;
    for (const upd of updates) {
        try {
            const res = await fetch(`${API_BASE}/admin.php`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ candidate_id: parseInt(upd.cid), field: upd.field, value: upd.value })
            });
            const data = await res.json();
            if (data.success) ok++; else fail++;
        } catch { fail++; }
    }

    showFillHint(`Paste selesai: ${ok} berhasil${fail > 0 ? `, ${fail} gagal` : ''} · Ctrl+Z untuk undo`, 4000);
    loadCandidates();
});


function highlightSheet() {
    document.querySelectorAll('#candidateTableBody td.sheet-sel, #candidateTableBody td.sheet-cur').forEach(td => {
        td.classList.remove('sheet-sel', 'sheet-cur');
    });
    if (!sheetSelStart || !sheetSelEnd) return;
    const rows = document.querySelectorAll('#candidateTableBody tr');
    const r1 = Math.min(sheetSelStart.row, sheetSelEnd.row);
    const r2 = Math.max(sheetSelStart.row, sheetSelEnd.row);
    const c1 = Math.min(sheetSelStart.col, sheetSelEnd.col);
    const c2 = Math.max(sheetSelStart.col, sheetSelEnd.col);
    for (let r = r1; r <= r2; r++) {
        if (!rows[r]) continue;
        for (let c = c1; c <= c2; c++) {
            const td = rows[r]?.children[c];
            if (td) td.classList.add('sheet-sel');
        }
    }
    if (sheetActiveCell) {
        const cur = rows[sheetActiveCell.row]?.children[sheetActiveCell.col];
        if (cur) cur.classList.add('sheet-cur');
    }
}

function copySheetSelection() {
    if (!sheetSelStart || !sheetSelEnd) return;
    const rows = document.querySelectorAll('#candidateTableBody tr');
    const r1 = Math.min(sheetSelStart.row, sheetSelEnd.row);
    const r2 = Math.max(sheetSelStart.row, sheetSelEnd.row);
    const c1 = Math.min(sheetSelStart.col, sheetSelEnd.col);
    const c2 = Math.max(sheetSelStart.col, sheetSelEnd.col);
    const lines = [];
    for (let r = r1; r <= r2; r++) {
        if (!rows[r]) continue;
        const cells = [];
        for (let c = c1; c <= c2; c++) {
            const td = rows[r]?.children[c];
            cells.push(td ? td.textContent.trim().replace(/[\t\n]/g, ' ') : '');
        }
        lines.push(cells.join('\t'));
    }
    const text = lines.join('\n');
    navigator.clipboard.writeText(text).then(() => {
        showToast(`${r2 - r1 + 1} baris di-copy ke clipboard`);
    }).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = text; document.body.appendChild(ta);
        ta.select(); document.execCommand('copy');
        document.body.removeChild(ta);
        showToast(`${r2 - r1 + 1} baris di-copy ke clipboard`);
    });
}


function renderRecentTable() {
    const tbody = document.getElementById('recentTableBody');
    const recent = allCandidates.slice(0, 5);
    if (recent.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Belum ada kandidat</td></tr>';
        return;
    }

    tbody.innerHTML = recent.map(c => {
        const pred = MLEngine.predictSuccess(c);
        return `
            <tr onclick="openCandidate(${c.id})">
                <td><div class="table-name-cell">
                    <div class="table-avatar">${c.name.charAt(0).toUpperCase()}</div>
                    <span class="table-name">${escapeHtml(c.name)}</span>
                </div></td>
                <td>${c.armada_type}</td>
                <td>${c.location_name}</td>
                <td><span class="badge ${getStatusBadgeClass(c.status)}">${c.status}</span></td>
                <td><span class="badge-score badge-score-${pred.label === 'Tinggi' ? 'high' : pred.label === 'Sedang' ? 'mid' : 'low'}">${pred.score}%</span></td>
                <td><button class="btn-action" onclick="event.stopPropagation();openCandidate(${c.id})">Detail</button></td>
            </tr>
        `;
    }).join('');
}

// --------------------------------------------------------------------------------
// CHARTS (Chart.js)
// --------------------------------------------------------------------------------
function destroyChart(id) {
    if (chartInstances[id]) { chartInstances[id].destroy(); delete chartInstances[id]; }
}

function getChartDefaults() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
        gridColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        textColor: isDark ? '#9CA3AF' : '#6B7280',
    };
}

function renderLocationChart(byLocation) {
    const ctx = document.getElementById('locationChart');
    if (!ctx) return;
    destroyChart('location');

    const labels = Object.keys(byLocation);
    const totalData = labels.map(l => byLocation[l].total || 0);
    const lulusData = labels.map(l => (byLocation[l].statuses || {})['Lulus'] || 0);
    const gagalData = labels.map(l => (byLocation[l].statuses || {})['Tidak Lulus'] || 0);
    const defaults = getChartDefaults();

    chartInstances['location'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: 'Total', data: totalData, backgroundColor: '#818CF8', borderRadius: 6, barPercentage: 0.6 },
                { label: 'Lulus', data: lulusData, backgroundColor: '#10B981', borderRadius: 6, barPercentage: 0.6 },
                { label: 'Gagal', data: gagalData, backgroundColor: '#EF4444', borderRadius: 6, barPercentage: 0.6 },
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'top', labels: { usePointStyle: true, font: { family: "'Inter',sans-serif", size: 11 }, padding: 16 } } },
            scales: {
                y: { beginAtZero: true, grid: { color: defaults.gridColor }, ticks: { color: defaults.textColor, font: { size: 11 } } },
                x: { grid: { display: false }, ticks: { color: defaults.textColor, font: { size: 11 } } }
            }
        }
    });
}

function renderStatusChart(byStatus) {
    const ctx = document.getElementById('statusChart');
    if (!ctx) return;
    destroyChart('status');

    const labels = Object.keys(byStatus);
    const values = Object.values(byStatus);
    const colors = labels.map(l => getStatusColor(l));

    chartInstances['status'] = new Chart(ctx, {
        type: 'doughnut',
        data: { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 0, hoverOffset: 8 }] },
        options: {
            responsive: true, maintainAspectRatio: false,
            cutout: '68%',
            plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 12, font: { family: "'Inter',sans-serif", size: 11 } } } }
        }
    });
}

function renderStatusPipeline(byStatus) {
    const bar = document.getElementById('pipelineBar');
    const legend = document.getElementById('pipelineLegend');
    if (!bar || !legend) return;

    const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
    if (total === 0) {
        bar.innerHTML = '';
        legend.innerHTML = '<span style="color:var(--text-muted);font-size:0.8rem;">Belum ada data</span>';
        return;
    }

    const order = ['Belum Pemberkasan','Sudah Pemberkasan','Menunggu Test Drive','Jadwal Test Drive','Hadir','Tidak Hadir','Lulus','Tidak Lulus'];

    bar.innerHTML = order
        .filter(s => (byStatus[s] || 0) > 0)
        .map(s => {
            const pct = ((byStatus[s] / total) * 100).toFixed(1);
            return `<div class="pipeline-seg" style="width:${pct}%;background:${getStatusColor(s)};cursor:pointer" title="${s}: ${byStatus[s]}" onclick="filterByStatus('${s}')"></div>`;
        }).join('');

    legend.innerHTML = order.map(s => {
        const count = byStatus[s] || 0;
        return `<div class="pipeline-item" style="cursor:pointer" onclick="filterByStatus('${s}')">
            <div class="pipeline-dot" style="background:${getStatusColor(s)}"></div>
            <span>${s}</span>
            <span class="pipeline-count">${count}</span>
        </div>`;
    }).join('');
}

function filterByStatus(status) {
    const select = document.getElementById('filterStatus');
    if (!select) return;
    // Toggle: if already selected, reset to all
    select.value = select.value === status ? '' : status;
    switchPage('candidates');
    loadCandidates();
}

function renderStatusBarChart(byStatus) {
    const ctx = document.getElementById('statusBarChart');
    if (!ctx) return;
    destroyChart('statusBar');

    const order = ['Belum Pemberkasan','Sudah Pemberkasan','Menunggu Test Drive','Jadwal Test Drive','Hadir','Tidak Hadir','Lulus','Tidak Lulus'];
    const values = order.map(s => byStatus[s] || 0);
    const colors = order.map(s => getStatusColor(s));
    const defaults = getChartDefaults();

    chartInstances['statusBar'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: order,
            datasets: [{
                label: 'Jumlah',
                data: values,
                backgroundColor: colors.map(c => c + '33'),
                borderColor: colors,
                borderWidth: 1.5,
                borderRadius: 4,
                barPercentage: 0.7,
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { stepSize: 1, color: defaults.fontColor, font: { family: "'Inter',sans-serif", size: 11 } },
                    grid: { color: defaults.gridColor }
                },
                y: {
                    ticks: { color: defaults.fontColor, font: { family: "'Inter',sans-serif", size: 11 } },
                    grid: { display: false }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `${ctx.parsed.x} kandidat`
                    }
                }
            },
            onClick: (evt, elems) => {
                if (elems.length > 0) {
                    filterByStatus(order[elems[0].index]);
                }
            }
        }
    });
}

function renderTrendChart(recentData) {
    const ctx = document.getElementById('trendChart');
    if (!ctx) return;
    destroyChart('trend');

    const labels = recentData.map(d => {
        const dt = new Date(d.date);
        return dt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    });
    const values = recentData.map(d => d.cnt || 0);
    const defaults = getChartDefaults();

    chartInstances['trend'] = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Pendaftar',
                data: values,
                borderColor: '#6366F1',
                backgroundColor: 'rgba(99,102,241,0.1)',
                fill: true,
                tension: 0.4,
                borderWidth: 2.5,
                pointRadius: 4,
                pointBackgroundColor: '#6366F1',
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: defaults.gridColor }, ticks: { color: defaults.textColor } },
                x: { grid: { display: false }, ticks: { color: defaults.textColor } }
            }
        }
    });
}

function renderForecastChart(recentData) {
    const ctx = document.getElementById('forecastChart');
    if (!ctx) return;
    destroyChart('forecast');

    const forecast = MLEngine.forecastTrend(recentData, 7);
    const allData = [...recentData, ...forecast];
    const labels = allData.map(d => {
        const dt = new Date(d.date);
        return dt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    });
    const actual = allData.map(d => d.isForecast ? null : (d.cnt || 0));
    const predicted = allData.map(d => d.isForecast ? (d.cnt || 0) : null);
    const defaults = getChartDefaults();

    // Bridge between actual and forecast
    const lastActualIdx = recentData.length - 1;
    if (lastActualIdx >= 0 && forecast.length > 0) {
        predicted[lastActualIdx] = actual[lastActualIdx];
    }

    chartInstances['forecast'] = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                { label: 'Aktual', data: actual, borderColor: '#6366F1', backgroundColor: 'rgba(99,102,241,0.1)', fill: true, tension: 0.4, borderWidth: 2.5, pointRadius: 4, pointBackgroundColor: '#6366F1' },
                { label: 'Prediksi AI', data: predicted, borderColor: '#A855F7', backgroundColor: 'rgba(168,85,247,0.08)', fill: true, tension: 0.4, borderWidth: 2, borderDash: [6, 3], pointRadius: 4, pointBackgroundColor: '#A855F7' },
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'top', labels: { usePointStyle: true, font: { family: "'Inter',sans-serif", size: 11 } } } },
            scales: {
                y: { beginAtZero: true, grid: { color: defaults.gridColor }, ticks: { color: defaults.textColor } },
                x: { grid: { display: false }, ticks: { color: defaults.textColor, maxRotation: 45 } }
            }
        }
    });
}

function renderArmadaChart(byArmada) {
    const ctx = document.getElementById('armadaChart');
    if (!ctx) return;
    destroyChart('armada');

    chartInstances['armada'] = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(byArmada),
            datasets: [{ data: Object.values(byArmada), backgroundColor: ['#818CF8', '#F59E0B', '#06B6D4'], borderWidth: 0, hoverOffset: 8 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, font: { family: "'Inter',sans-serif" } } } }
        }
    });
}

// --------------------------------------------------------------------------------
// AI INSIGHTS
// --------------------------------------------------------------------------------
function renderQuickInsights(data) {
    const container = document.getElementById('aiQuickInsights');
    const insights = MLEngine.generateInsights(data, allCandidates);

    if (insights.length === 0) {
        container.innerHTML = '<div class="ai-insight-item type-info"><span class="ai-insight-icon">ℹ️</span><span class="ai-insight-text">Belum ada data cukup untuk analisis.</span></div>';
        return;
    }

    container.innerHTML = insights.slice(0, 4).map(i =>
        `<div class="ai-insight-item type-${i.type}"><span class="ai-insight-icon">${i.icon}</span><span class="ai-insight-text">${i.text}</span></div>`
    ).join('');
}

function renderAIInsightsPage() {
    if (!analyticsData) return;

    // Full insights
    const insights = MLEngine.generateInsights(analyticsData, allCandidates);
    document.getElementById('aiFullInsights').innerHTML = insights.length > 0
        ? insights.map(i => `<div class="ai-insight-item type-${i.type}"><span class="ai-insight-icon">${i.icon}</span><span class="ai-insight-text">${i.text}</span></div>`).join('')
        : '<div class="ai-insight-item type-info"><span class="ai-insight-icon">ℹ️</span><span class="ai-insight-text">Belum ada data cukup.</span></div>';

    // Anomaly detection
    const anomalies = MLEngine.detectAnomalies(analyticsData.recent_registrations || []);
    const anomalyEl = document.getElementById('anomalyList');
    anomalyEl.innerHTML = anomalies.length > 0
        ? anomalies.map(a => `<div class="ai-insight-item type-${a.anomalyType === 'spike' ? 'warning' : 'alert'}"><span class="ai-insight-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="${a.anomalyType === 'spike' ? '23 6 13.5 15.5 8.5 10.5 1 18' : '23 18 13.5 8.5 8.5 13.5 1 6'}"/></svg></span><span class="ai-insight-text">${a.date}: ${a.cnt} pendaftar (Z-Score: ${a.zScore}) — ${a.anomalyType === 'spike' ? 'Lonjakan' : 'Penurunan'} signifikan</span></div>`).join('')
        : '<div class="ai-insight-item type-success"><span class="ai-insight-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span><span class="ai-insight-text">Tidak ada anomali terdeteksi. Data dalam range normal.</span></div>';

    // ML Summary KPIs
    const ranked = MLEngine.rankCandidates(allCandidates);
    const highPotential = ranked.filter(c => c.prediction.score >= 70).length;
    const highRisk = ranked.filter(c => c.risk.level === 'high').length;
    const avgScore = ranked.length > 0 ? Math.round(ranked.reduce((s, c) => s + c.prediction.score, 0) / ranked.length) : 0;

    animateCounter('mlHighPotential', highPotential);
    animateCounter('mlHighRisk', highRisk);
    animateCounter('mlAvgScore', avgScore);

    // Forecast next week
    const forecast = MLEngine.forecastTrend(analyticsData.recent_registrations || [], 7);
    const forecastTotal = forecast.reduce((s, f) => s + f.cnt, 0);
    animateCounter('mlForecastNext', forecastTotal);

    // Ranked table
    const tbody = document.getElementById('aiRankedTableBody');
    const top = ranked.slice(0, 10);
    tbody.innerHTML = top.map((c, i) => `
        <tr onclick="openCandidate(${c.id})">
            <td><strong>#${i + 1}</strong></td>
            <td><div class="table-name-cell"><div class="table-avatar">${c.name.charAt(0).toUpperCase()}</div><span class="table-name">${escapeHtml(c.name)}</span></div></td>
            <td>${c.armada_type}</td>
            <td><span class="badge-score badge-score-${c.prediction.label === 'Tinggi' ? 'high' : c.prediction.label === 'Sedang' ? 'mid' : 'low'}">${c.prediction.score}%</span></td>
            <td><span class="badge-risk badge-risk-${c.risk.level}">● ${c.risk.level.toUpperCase()}</span></td>
            <td><div class="readiness-bar"><div class="readiness-track"><div class="readiness-fill" style="width:${c.readinessScore}%;background:${c.readinessScore >= 70 ? '#10B981' : c.readinessScore >= 40 ? '#F59E0B' : '#EF4444'};"></div></div><span class="readiness-label">${c.readinessScore}%</span></div></td>
        </tr>
    `).join('');
}

// Analytics page
function renderAnalyticsPage(data) {
    renderForecastChart(data.recent_registrations || []);
    renderArmadaChart(data.by_armada || {});
    renderLocationTable(data.by_location || {});
    initRangeCal(data.recent_registrations || []);
}

function renderLocationTable(byLocation) {
    const tbody = document.getElementById('locationTableBody');
    if (!tbody) return;

    tbody.innerHTML = Object.entries(byLocation).map(([name, data]) => {
        const s = data.statuses || {};
        const lulus = s['Lulus'] || 0;
        const gagal = s['Tidak Lulus'] || 0;
        const completed = lulus + gagal;
        const pending = data.total - completed;
        const rate = completed > 0 ? Math.round((lulus / completed) * 100) : 0;

        return `
            <tr>
                <td><strong>${name}</strong></td>
                <td>${data.total}</td>
                <td style="color:#10B981;font-weight:600;">${lulus}</td>
                <td style="color:#EF4444;font-weight:600;">${gagal}</td>
                <td>${pending}</td>
                <td><div class="readiness-bar"><div class="readiness-track"><div class="readiness-fill" style="width:${rate}%;background:${rate >= 60 ? '#10B981' : rate >= 30 ? '#F59E0B' : '#EF4444'};"></div></div><span class="readiness-label">${rate}%</span></div></td>
            </tr>
        `;
    }).join('');
}

// --------------------------------------------------------------------------------
// CANDIDATE DETAIL MODAL
// --------------------------------------------------------------------------------
async function openCandidate(id) {
    const modal = document.getElementById('candidateModal');
    const body = document.getElementById('modalBody');
    modal.classList.add('active');
    body.innerHTML = '<div class="spinner"></div>';

    try {
        const res = await fetch(`${API_BASE}/admin.php?id=${id}`);
        const data = await res.json();
        const c = data.candidate;
        const docs = data.documents || [];
        const pred = MLEngine.predictSuccess(c);
        const risk = MLEngine.assessRisk(c);

        body.innerHTML = `
            <div class="flex-between mb-2">
                <div>
                    <h3 style="font-weight:700;font-size:1.2rem;">${escapeHtml(c.name)}</h3>
                    <div style="color:var(--text-muted);font-size:0.85rem;">
                        ${c.whatsapp} · ${c.armada_type} · ${c.sim_type} · ${c.location_name}
                    </div>
                    ${c.user_username ? `<div style="margin-top:4px;"><span style="display:inline-flex;align-items:center;gap:4px;font-size:0.78rem;font-weight:600;padding:3px 10px;border-radius:6px;background:rgba(16,185,129,0.1);color:#10B981;">Login: ${escapeHtml(c.user_username)}</span></div>` : '<div style="margin-top:4px;"><span style="font-size:0.78rem;color:var(--text-muted);opacity:0.6;">Belum punya akun login</span></div>'}
                    <div style="color:var(--text-muted);font-size:0.8rem;margin-top:4px;">
                        ${c.address || '-'} · Daftar: ${formatDate(c.created_at)}
                    </div>
                    ${c.emergency_name ? `
                    <div style="margin-top:8px;padding:8px;background:rgba(239, 68, 68, 0.05);border-left:3px solid #EF4444;border-radius:4px;font-size:0.8rem;">
                        <strong style="color:var(--text);">Kontak Darurat:</strong><br>
                        ${escapeHtml(c.emergency_name)} (${escapeHtml(c.emergency_relation)}) - 
                        <a href="https://wa.me/${formatWaNumber(c.emergency_phone)}" target="_blank" style="color:#10B981;text-decoration:none;font-weight:600;">${escapeHtml(c.emergency_phone)}</a>
                    </div>` : ''}
                </div>
                ${c.nik ? `<div><button class="btn-primary" style="background:#EF4444;border-color:#EF4444;padding:6px 12px;font-size:0.8rem;" onclick="promptBlacklist('${escapeHtml(c.nik)}')"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px;vertical-align:middle;"><path d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10"/></svg>Blacklist NIK</button></div>` : ''}
            </div>

            <!-- AI Analysis -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0;">
                <div style="padding:12px;background:var(--bg-secondary);border-radius:10px;border-left:3px solid ${pred.color};">
                    <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:4px;">AI Prediction</div>
                    <div style="font-size:1.3rem;font-weight:800;color:${pred.color};">${pred.score}% <small style="font-size:0.7rem;">${pred.label}</small></div>
                </div>
                <div style="padding:12px;background:var(--bg-secondary);border-radius:10px;border-left:3px solid ${risk.color};">
                    <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:4px;">Risk Level</div>
                    <div style="font-size:1.3rem;font-weight:800;color:${risk.color};">${risk.level.toUpperCase()} <small style="font-size:0.7rem;">${risk.riskScore}pts</small></div>
                </div>
            </div>
            ${risk.risks.length > 0 ? `<div style="margin-bottom:16px;">${risk.risks.map(r => `<div style="font-size:0.8rem;color:${r.level === 'high' ? '#EF4444' : r.level === 'medium' ? '#F59E0B' : '#6B7280'};padding:2px 0;">⚡ ${r.msg}</div>`).join('')}</div>` : ''}

            <!-- Documents -->
            <div style="font-weight:700;font-size:0.95rem;margin-top:16px;">Dokumen (${docs.length}/5)</div>
            <div class="upload-grid mt-1">
                ${docs.map(d => `
                    <div class="card" style="padding:12px;cursor:pointer;" onclick="previewDoc(${d.id}, '${d.file_path}')">
                        <div class="flex gap-1" style="align-items:center;">
                            <span style="font-size:1.5rem;">${getDocIcon(d.file_path)}</span>
                            <div>
                                <div style="font-weight:600;font-size:0.85rem;">${d.doc_type}</div>
                                <div style="font-size:0.75rem;color:var(--text-muted);">${formatFileSize(d.file_size)}</div>
                            </div>
                        </div>
                    </div>
                `).join('')}
                ${docs.length === 0 ? '<div style="color:var(--text-muted);font-size:0.85rem;">Belum ada dokumen</div>' : ''}
            </div>

            <!-- Action Panel -->
            <div style="font-weight:700;font-size:0.95rem;margin-top:20px;">⚡ Action Panel</div>
            <div class="form-group mt-1">
                <label class="form-label">Status</label>
                <select class="form-select" id="editStatus">
                    ${getStatusOptions(c.status).map(s => `<option value="${s}" ${c.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Jadwal Test Drive</label>
                <input type="date" class="form-input" id="editTestDriveDate" value="${c.test_drive_date || ''}">
            </div>
            <div class="form-group">
                <label class="form-label">Catatan Korlap</label>
                <textarea class="form-textarea" id="editNotes" placeholder="Tambahkan catatan...">${c.korlap_notes || ''}</textarea>
            </div>
            <button class="btn btn-primary btn-block" onclick="saveCandidate(${c.id})">Simpan Perubahan</button>
            ${c.user_id ? `<button class="btn btn-block" style="margin-top:8px;background:linear-gradient(135deg,#0EA5E9,#6366F1);color:#fff;border:none;display:flex;align-items:center;justify-content:center;gap:6px;" onclick="openSinglePush(${c.user_id}, '${escapeHtml(c.name).replace(/'/g, "\\'")}')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                Kirim Notifikasi
            </button>` : ''}

            <div style="font-weight:700;font-size:0.95rem;margin-top:20px;">Riwayat</div>
            <div id="auditTrail" class="mt-1"><div class="spinner-sm"></div></div>
        `;

        loadAuditTrail(id);
    } catch {
        body.innerHTML = '<div class="table-empty">Gagal memuat detail</div>';
    }
}

async function promptBlacklist(nik) {
    if (!nik) return;
    const reason = prompt(`Masukkan alasan detail mem-blacklist akun dengan NIK: ${nik}\n(Misal: Masalah kedisiplinan, Pemalsuan Data)`);
    if (reason === null) return; // cancelled
    if (reason.trim() === '') {
        showToast('Alasan wajib diisi!', 'error');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/blacklist.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nik: nik, reason: reason.trim() })
        });
        const data = await res.json();
        
        if (data.success) {
            showToast('Akun Kandidat Berhasil Diblacklist', 'success');
            closeModal('candidateModal');
            if (typeof loadBlacklistList === 'function') loadBlacklistList(); // refresh tab if owner
        } else {
            showToast(data.error || 'Gagal Memblacklist', 'error');
        }
    } catch {
        showToast('Koneksi Gagal', 'error');
    }
}

async function saveCandidate(id) {
    const status = document.getElementById('editStatus').value;
    const testDriveDate = document.getElementById('editTestDriveDate').value;
    const notes = document.getElementById('editNotes').value;

    try {
        const res = await fetch(`${API_BASE}/admin.php`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ candidate_id: id, status, test_drive_date: testDriveDate, korlap_notes: notes })
        });
        const data = await res.json();
        if (data.success) {
            showToast('Data berhasil diperbarui');
            loadAuditTrail(id);
            loadCandidates();
        } else {
            showToast(data.error || 'Gagal menyimpan', 'error');
        }
    } catch {
        showToast('Koneksi gagal', 'error');
    }
}

async function loadAuditTrail(candidateId) {
    const container = document.getElementById('auditTrail');
    try {
        const res = await fetch(`${API_BASE}/admin.php?audit=${candidateId}`);
        const data = await res.json();
        const logs = data.audit || [];

        container.innerHTML = logs.length === 0
            ? '<div style="color:var(--text-muted);font-size:0.85rem;">Belum ada riwayat</div>'
            : `<div class="audit-list">${logs.map(l => `
                <div class="audit-item">
                    <div class="audit-action">${l.action}</div>
                    <div class="audit-detail">${l.old_value || '-'} → ${l.new_value || '-'}</div>
                    <div class="audit-time">oleh ${l.admin_name} · ${formatDateTime(l.created_at)}</div>
                </div>
            `).join('')}</div>`;
    } catch {
        container.innerHTML = '<div style="color:var(--text-muted);">Gagal memuat riwayat</div>';
    }
}

function previewDoc(docId, filePath) {
    const modal = document.getElementById('previewModal');
    const body = document.getElementById('previewBody');
    modal.classList.add('active');
    const ext = filePath.split('.').pop().toLowerCase();
    const url = `${API_BASE}/documents.php?id=${docId}`;
    
    let html = `<div style="text-align:right; margin-bottom:12px;">
                    <a href="${url}" target="_blank" class="btn btn-sm btn-primary" style="text-decoration:none; display:inline-block;">Buka Ukuran Penuh / Unduh</a>
                </div>`;
                
    if (['jpg','jpeg','png'].includes(ext)) {
        html += `<div class="doc-preview" style="background:#000; display:flex; justify-content:center; align-items:center; min-height:300px;">
                    <img src="${url}" alt="Document" style="max-width:100%; max-height:75vh; height:auto; object-fit:contain;">
                 </div>`;
    } else {
        html += `<div class="doc-preview">
                    <iframe src="${url}" style="width:100%; height:75vh; border:none; background:#fff;"></iframe>
                 </div>`;
    }
    body.innerHTML = html;
}

function closeModal(id) { document.getElementById(id).classList.remove('active'); }

// --------------------------------------------------------------------------------
// HELPERS
// --------------------------------------------------------------------------------
function animateCounter(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    const isPercent = el.textContent.includes('%');
    const duration = 800;
    const start = performance.now();
    const from = 0;

    function update(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(from + (target - from) * eased);
        el.textContent = current + (isPercent ? '%' : '');
        if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}

function getStatusBadgeClass(status) {
    const map = { 'Belum Pemberkasan': 'badge-default', 'Sudah Pemberkasan': 'badge-pemberkasan', 'Menunggu Test Drive': 'badge-menunggu', 'Jadwal Test Drive': 'badge-jadwal', 'Hadir': 'badge-lulus', 'Tidak Hadir': 'badge-gagal', 'Lulus': 'badge-lulus', 'Tidak Lulus': 'badge-gagal' };
    return map[status] || 'badge-default';
}

function getStatusColor(status) {
    const map = { 'Belum Pemberkasan': '#9CA3AF', 'Sudah Pemberkasan': '#F59E0B', 'Menunggu Test Drive': '#8B5CF6', 'Jadwal Test Drive': '#3B82F6', 'Hadir': '#06B6D4', 'Tidak Hadir': '#F97316', 'Lulus': '#10B981', 'Tidak Lulus': '#EF4444' };
    return map[status] || '#9CA3AF';
}

function getDocIcon(path) { const ext = (path || '').split('.').pop().toLowerCase(); return ['jpg','jpeg','png'].includes(ext) ? 'IMG' : ext === 'pdf' ? 'PDF' : 'FILE'; }
function formatDate(d) { return d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'; }
function formatDateTime(d) { return d ? new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'; }
function formatFileSize(b) { if (!b) return '-'; if (b < 1024) return b + ' B'; if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'; return (b / 1048576).toFixed(1) + ' MB'; }
function formatWaNumber(num) {
    if (!num) return '';
    let cleaned = String(num).replace(/\D/g, '');
    if (cleaned.startsWith('0')) cleaned = '62' + cleaned.substring(1);
    return cleaned;
}

function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ROLE-BASED STATUS OPTIONS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
let ALL_STATUSES = ['Belum Pemberkasan','Sudah Pemberkasan','Menunggu Test Drive','Jadwal Test Drive','Hadir','Tidak Hadir','Lulus','Tidak Lulus'];

function getStatusOptions(currentStatus) {
    const role = currentAdmin?.role;
    if (role === 'owner') return ALL_STATUSES;
    if (role === 'korlap_interview') {
        return ['Belum Pemberkasan','Sudah Pemberkasan','Menunggu Test Drive','Jadwal Test Drive'];
    }
    if (role === 'korlap_td') {
        return ['Jadwal Test Drive','Hadir','Tidak Hadir','Lulus','Tidak Lulus'];
    }
    // default korlap (legacy) â€” all
    return ALL_STATUSES;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// KORLAP MANAGEMENT (Owner Only)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
let korlapLocations = [];

function toggleCreateKorlap() {
    const box = document.getElementById('createKorlapBox');
    box.style.display = box.style.display === 'none' ? '' : 'none';
}

let allKorlaps = []; // in-memory korlap data for local updates

async function loadKorlapList() {
    // Preserve scroll position
    const wrap = document.getElementById('korlapTableWrap');
    const scrollTop  = wrap?.scrollTop  || 0;
    const scrollLeft = wrap?.scrollLeft || 0;
    try {
        const res = await fetch(`${API_BASE}/korlap.php?action=list`);
        const data = await res.json();
        korlapLocations = data.locations || [];
        allKorlaps = data.korlaps || [];
        renderKorlapTable(allKorlaps);

        const locSelect = document.getElementById('klLocation');
        if (locSelect && locSelect.options.length <= 1) {
            korlapLocations.forEach(loc => {
                const opt = document.createElement('option');
                opt.value = loc.id;
                opt.textContent = loc.name;
                locSelect.appendChild(opt);
            });
        }
        // Restore scroll
        requestAnimationFrame(() => {
            if (wrap) { wrap.scrollTop = scrollTop; wrap.scrollLeft = scrollLeft; }
        });
    } catch {
        document.getElementById('korlapTableBody').innerHTML = '<tr><td colspan="7" class="table-empty">Gagal memuat data</td></tr>';
    }
}

// Update satu korlap di memory lokal, re-render tanpa API refetch
function updateLocalKorlap(kid, field, value) {
    const idx = allKorlaps.findIndex(k => String(k.id) === String(kid));
    if (idx !== -1) {
        allKorlaps[idx][field] = value;
        // Sync display fields
        if (field === 'location_id') {
            const loc = korlapLocations.find(l => String(l.id) === String(value));
            allKorlaps[idx].location_name = loc?.name || '-';
        }
    }
    // Preserve scroll
    const wrap = document.getElementById('korlapTableWrap');
    const scrollTop  = wrap?.scrollTop  || 0;
    const scrollLeft = wrap?.scrollLeft || 0;
    renderKorlapTable(allKorlaps);
    requestAnimationFrame(() => {
        if (wrap) { wrap.scrollTop = scrollTop; wrap.scrollLeft = scrollLeft; }
    });
}

function renderKorlapTable(korlaps) {
    const tbody = document.getElementById('korlapTableBody');
    const roleLabels = { korlap: 'Korlap (Legacy)', korlap_interview: 'Korlap Interview', korlap_td: 'Korlap TD' };
    const roleColors = { korlap: '#9CA3AF', korlap_interview: '#818CF8', korlap_td: '#F59E0B' };

    if (korlaps.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="table-empty">Belum ada akun korlap</td></tr>';
        return;
    }

    tbody.innerHTML = korlaps.map(k => {
        const pw = k.plain_password || '';
        const hasPw = pw.length > 0;
        return `
        <tr data-kid="${k.id}">
            <td class="td-select" onclick="event.stopPropagation()">
                <input type="checkbox" class="korlap-checkbox" value="${k.id}" onchange="updateKorlapBulkBar()">
            </td>
            <td class="editable" data-field="id_display" data-kid="${k.id}" data-val="${k.id}">${k.id}</td>
            <td class="editable" data-field="username" data-kid="${k.id}" data-val="${escapeHtml(k.username)}">
                <strong>${escapeHtml(k.username)}</strong>
            </td>
            <td class="editable" data-field="name" data-kid="${k.id}" data-val="${escapeHtml(k.name)}">
                ${escapeHtml(k.name)}
            </td>
            <td class="editable-select" data-field="role" data-kid="${k.id}" data-val="${k.role}">
                <span class="kl-role-badge" style="background:${roleColors[k.role] || '#9CA3AF'}20;color:${roleColors[k.role] || '#9CA3AF'};">${roleLabels[k.role] || k.role}</span>
            </td>
            <td class="editable-select" data-field="location_id" data-kid="${k.id}" data-val="${k.location_id || ''}">
                ${k.location_name || '-'}
            </td>
            <td class="pw-cell editable" data-field="password" data-kid="${k.id}" data-val="">
                <span class="pw-val" data-plain="${escapeHtml(pw)}">${hasPw ? '•••••' : '-'}</span>
                ${hasPw ? '<button class="btn-eye" onclick="event.stopPropagation();toggleKorlapPwVis(this)" title="Lihat password"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg></button>' : ''}
            </td>
            <td>
                <button class="btn-trash" onclick="event.stopPropagation();deleteKorlap(${k.id},'${escapeHtml(k.username).replace(/'/g, "\\'")}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></button>
            </td>
        </tr>`;
    }).join('');

    // Bind inline edit handlers
    tbody.querySelectorAll('.editable:not(.pw-cell)').forEach(td => {
        if (td.dataset.field === 'id_display') return; // ID not editable
        td.addEventListener('dblclick', () => startInlineEdit(td));
    });
    tbody.querySelectorAll('.editable-select').forEach(td => {
        td.addEventListener('dblclick', () => startInlineSelect(td));
    });
    tbody.querySelectorAll('.pw-cell').forEach(td => {
        td.addEventListener('dblclick', () => startPwEdit(td));
    });

    // Init spreadsheet navigation for korlap table
    initKorlapSheetNav();
}

function toggleKorlapPwVis(btn) {
    const span = btn.parentElement.querySelector('.pw-val');
    if (!span) return;
    const plain = span.dataset.plain;
    if (!plain) { showToast('Password belum tersedia', 'error'); return; }
    if (span.dataset.shown === '1') {
        span.textContent = '•••••';
        span.dataset.shown = '0';
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>';
        btn.title = 'Lihat password';
    } else {
        span.textContent = plain;
        span.dataset.shown = '1';
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
        btn.title = 'Sembunyikan password';
    }
}

// Toggle password visibility in candidate table (user passwords) — Owner only
function togglePwVis(btn) {
    const td = btn.closest('td');
    const span = td.querySelector('.pw-val');
    if (!span) return;
    const plain = span.dataset.plain;
    if (!plain) {
        showToast('Password NULL — gunakan tombol Reset \u21ba untuk mengatur password baru', 'error');
        return;
    }
    if (span.dataset.shown === '1') {
        span.innerHTML = '\u2022\u2022\u2022\u2022\u2022';
        span.dataset.shown = '0';
        btn.title = 'Tampilkan password';
    } else {
        span.textContent = plain;
        span.dataset.shown = '1';
        btn.title = 'Sembunyikan password';
        clearTimeout(span._hideT);
        span._hideT = setTimeout(() => {
            span.innerHTML = '\u2022\u2022\u2022\u2022\u2022';
            span.dataset.shown = '0';
        }, 10000); // auto-hide 10 detik
    }
}

// Reset user password from candidate table — Owner only
async function resetUserPassword(candidateId, candidateName) {
    const newPw = prompt(`Reset password akun "${candidateName}":\n(Min. 6 karakter \u2014 kosongkan untuk batal)`);
    if (newPw === null || newPw.trim() === '') return;
    if (newPw.trim().length < 6) { showToast('Password minimal 6 karakter', 'error'); return; }
    try {
        const res = await fetch(`${API_BASE}/admin.php`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ candidate_id: candidateId, field: 'user_password', value: newPw.trim() })
        });
        const data = await res.json();
        if (data.success) {
            showToast(`\u2705 Password "${candidateName}" berhasil direset`);
            loadCandidates();
        } else {
            showToast(data.error || 'Gagal mereset password', 'error');
        }
    } catch {
        showToast('Koneksi gagal', 'error');
    }
}

function toggleSelectAllKorlap(master) {
    document.querySelectorAll('.korlap-checkbox').forEach(cb => cb.checked = master.checked);
    updateKorlapBulkBar();
}

function updateKorlapBulkBar() {
    const checked = document.querySelectorAll('.korlap-checkbox:checked');
    const bar = document.getElementById('bulkActionsKorlap');
    if (checked.length > 0) {
        bar.style.display = 'flex';
        document.getElementById('korlapSelectedCount').textContent = checked.length + ' dipilih';
    } else {
        bar.style.display = 'none';
    }
}

async function bulkDeleteKorlap() {
    const ids = Array.from(document.querySelectorAll('.korlap-checkbox:checked')).map(cb => parseInt(cb.value));
    if (!ids.length) return;
    if (!confirm(`Hapus ${ids.length} akun korlap?`)) return;

    let ok = 0, fail = 0;
    for (const id of ids) {
        try {
            const res = await fetch(`${API_BASE}/korlap.php?action=delete&id=${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) ok++; else fail++;
        } catch { fail++; }
    }
    showToast(`${ok} dihapus${fail ? ', ' + fail + ' gagal' : ''}`);
    loadKorlapList();
}

// Spreadsheet navigation for korlap table
let klSheetCell = null, klSelStart = null, klSelEnd = null;

function initKorlapSheetNav() {
    const tbody = document.getElementById('korlapTableBody');
    if (!tbody) return;
    const wrap = document.getElementById('korlapTableWrap');
    if (!wrap) return;
    wrap.setAttribute('tabindex', '0');
    wrap.style.outline = 'none';

    // Remove old listeners by cloning wrapper
    const newWrap = wrap.cloneNode(false);
    while (wrap.firstChild) newWrap.appendChild(wrap.firstChild);
    wrap.parentNode.replaceChild(newWrap, wrap);

    const table = newWrap.querySelector('#korlapTableBody');

    // Reset
    klSheetCell = null; klSelStart = null; klSelEnd = null;

    // Click to select
    table.addEventListener('mousedown', (e) => {
        const td = e.target.closest('td');
        if (!td || td.classList.contains('td-select')) return;
        if (e.target.closest('button, input, select, a')) return;
        const tr = td.closest('tr');
        if (!tr) return;
        const row = Array.from(table.children).indexOf(tr);
        const col = Array.from(tr.children).indexOf(td);
        if (e.shiftKey && klSheetCell) {
            e.preventDefault();
            klSelEnd = { row, col };
        } else {
            klSheetCell = { row, col };
            klSelStart = { row, col };
            klSelEnd = { row, col };
        }
        highlightKlSheet();
    });

    table.addEventListener('click', (e) => {
        if (!e.target.closest('button, input, select, a')) newWrap.focus();
    });

    newWrap.addEventListener('keydown', (e) => {
        if (!klSheetCell) return;
        const rows = table.querySelectorAll('tr');
        const maxRow = rows.length - 1;
        if (maxRow < 0) return;

        if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
            e.preventDefault();
            let { row, col } = klSheetCell;
            if (e.key === 'ArrowUp') row = Math.max(0, row - 1);
            if (e.key === 'ArrowDown') row = Math.min(maxRow, row + 1);
            if (e.key === 'ArrowLeft') col = Math.max(1, col - 1);
            if (e.key === 'ArrowRight') {
                const maxCol = rows[row]?.children.length - 2 || col;
                col = Math.min(maxCol, col + 1);
            }
            klSheetCell = { row, col };
            if (e.shiftKey) { klSelEnd = { row, col }; }
            else { klSelStart = { row, col }; klSelEnd = { row, col }; }
            highlightKlSheet();
            rows[row]?.children[col]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }

        if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            klSelStart = { row: 0, col: 1 };
            klSelEnd = { row: maxRow, col: (rows[0]?.children.length || 2) - 2 };
            highlightKlSheet();
        }

        if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
            const nativeSel = window.getSelection();
            if (nativeSel && nativeSel.toString().trim()) return;
            e.preventDefault();
            copyKlSheet();
        }
    });

    newWrap.addEventListener('paste', async (e) => {
        if (!klSheetCell) return;
        if (currentAdmin?.role !== 'owner') { showToast('Hanya owner', 'error'); return; }
        e.preventDefault();
        const clipData = (e.clipboardData || window.clipboardData).getData('text');
        if (!clipData) return;

        const KL_COL_FIELDS = [null, null, 'username', 'name', 'role', 'location_id', 'password'];
        const pasteRows = clipData.split('\n').filter(r => r.trim());
        const rows = table.querySelectorAll('tr');
        let saved = 0, failed = 0;

        for (let ri = 0; ri < pasteRows.length; ri++) {
            const targetRow = klSheetCell.row + ri;
            if (targetRow >= rows.length) break;
            const tr = rows[targetRow];
            const kid = tr.dataset.kid;
            if (!kid) continue;
            const cells = pasteRows[ri].split('\t');
            for (let ci = 0; ci < cells.length; ci++) {
                const targetCol = klSheetCell.col + ci;
                const field = KL_COL_FIELDS[targetCol];
                if (!field) continue;
                const val = cells[ci]?.trim();
                if (!val) continue;
                try {
                    const body = { id: parseInt(kid) };
                    body[field] = val;
                    const res = await fetch(`${API_BASE}/korlap.php?action=update`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body)
                    });
                    const data = await res.json();
                    if (data.success) saved++; else failed++;
                } catch { failed++; }
            }
        }
        showToast(`Paste: ${saved} tersimpan${failed ? ', ' + failed + ' gagal' : ''}`);
        loadKorlapList(); // Full reload after paste (data may span many rows)
    });
}

function highlightKlSheet() {
    const tbody = document.getElementById('korlapTableBody');
    if (!tbody) return;
    tbody.querySelectorAll('.sheet-sel, .sheet-cur').forEach(c => c.classList.remove('sheet-sel', 'sheet-cur'));
    if (!klSelStart || !klSelEnd) return;
    const r1 = Math.min(klSelStart.row, klSelEnd.row), r2 = Math.max(klSelStart.row, klSelEnd.row);
    const c1 = Math.min(klSelStart.col, klSelEnd.col), c2 = Math.max(klSelStart.col, klSelEnd.col);
    const rows = tbody.querySelectorAll('tr');
    for (let r = r1; r <= r2; r++) {
        if (!rows[r]) continue;
        for (let c = c1; c <= c2; c++) {
            rows[r].children[c]?.classList.add('sheet-sel');
        }
    }
    if (klSheetCell && rows[klSheetCell.row]) {
        rows[klSheetCell.row].children[klSheetCell.col]?.classList.add('sheet-cur');
    }
}

function copyKlSheet() {
    if (!klSelStart || !klSelEnd) return;
    const tbody = document.getElementById('korlapTableBody');
    const rows = tbody.querySelectorAll('tr');
    const r1 = Math.min(klSelStart.row, klSelEnd.row), r2 = Math.max(klSelStart.row, klSelEnd.row);
    const c1 = Math.min(klSelStart.col, klSelEnd.col), c2 = Math.max(klSelStart.col, klSelEnd.col);
    const lines = [];
    for (let r = r1; r <= r2; r++) {
        if (!rows[r]) continue;
        const cells = [];
        for (let c = c1; c <= c2; c++) {
            cells.push(rows[r].children[c]?.textContent?.trim() || '');
        }
        lines.push(cells.join('\t'));
    }
    navigator.clipboard.writeText(lines.join('\n')).then(() => showToast(`Copied ${(r2 - r1 + 1)}×${(c2 - c1 + 1)} cells`));
}


function startPwEdit(td) {
    if (td.querySelector('input')) return;
    const kid = td.dataset.kid;
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Password baru (min 6)';
    input.className = 'inline-edit-input';
    td.innerHTML = '';
    td.appendChild(input);
    input.focus();

    let _saved = false;
    const save = () => {
        if (_saved) return;
        _saved = true;
        const val = input.value.trim();
        if (val) {
            if (val.length < 6) { showToast('Password minimal 6 karakter', 'error'); renderKorlapTable(allKorlaps); return; }
            saveKorlapField(kid, 'password', val);
        } else { renderKorlapTable(allKorlaps); } // cancelled
    };
    input.addEventListener('blur', save);
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
        if (e.key === 'Escape') { _saved = true; renderKorlapTable(allKorlaps); }
    });
}
function startInlineEdit(td) {
    if (td.querySelector('input')) return;
    const field = td.dataset.field;
    const kid = td.dataset.kid;
    const currentVal = td.dataset.val || '';

    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentVal;
    input.className = 'inline-edit-input';
    td.innerHTML = '';
    td.appendChild(input);
    input.focus();
    input.select();

    let _saved = false;
    const save = () => {
        if (_saved) return;
        _saved = true;
        const newVal = input.value.trim();
        if (newVal && newVal !== currentVal) saveKorlapField(kid, field, newVal);
        else renderKorlapTable(allKorlaps); // no change or empty - restore display
    };
    input.addEventListener('blur', save);
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
        if (e.key === 'Escape') { _saved = true; renderKorlapTable(allKorlaps); }
    });
}

function startInlineSelect(td) {
    if (td.querySelector('select')) return;
    const field = td.dataset.field;
    const kid = td.dataset.kid;
    const currentVal = td.dataset.val || '';

    const select = document.createElement('select');
    select.className = 'inline-edit-select';

    if (field === 'role') {
        [['korlap_interview', 'Korlap Interview'], ['korlap_td', 'Korlap TD']].forEach(([val, label]) => {
            const opt = document.createElement('option');
            opt.value = val; opt.textContent = label;
            if (val === currentVal) opt.selected = true;
            select.appendChild(opt);
        });
    } else if (field === 'location_id') {
        const emptyOpt = document.createElement('option');
        emptyOpt.value = ''; emptyOpt.textContent = '-- Tidak ada --';
        select.appendChild(emptyOpt);
        korlapLocations.forEach(loc => {
            const opt = document.createElement('option');
            opt.value = loc.id; opt.textContent = loc.name;
            if (String(loc.id) === String(currentVal)) opt.selected = true;
            select.appendChild(opt);
        });
    }

    td.innerHTML = '';
    td.appendChild(select);
    select.focus();

    let _saved = false;
    const save = () => {
        if (_saved) return;
        _saved = true;
        const newVal = select.value;
        if (newVal !== currentVal) saveKorlapField(kid, field, newVal);
        else renderKorlapTable(allKorlaps); // no change, restore display
    };
    select.addEventListener('change', () => { _saved = false; select.blur(); });
    select.addEventListener('blur', save);
    select.addEventListener('keydown', e => {
        if (e.key === 'Escape') { _saved = true; renderKorlapTable(allKorlaps); }
    });
}

async function saveKorlapField(kid, field, value) {
    try {
        const body = { id: parseInt(kid) };
        body[field] = value;
        const res = await fetch(`${API_BASE}/korlap.php?action=update`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (data.success) {
            showToast('Berhasil diperbarui');
            // Local update: update allKorlaps, re-render without full API refetch
            // Prevents flash and preserves scroll position
            updateLocalKorlap(kid, field, value);
        } else {
            showToast(data.error || 'Gagal', 'error');
            renderKorlapTable(allKorlaps); // restore display without invalid value
        }
    } catch {
        showToast('Koneksi gagal', 'error');
        renderKorlapTable(allKorlaps);
    }
}

async function handleCreateKorlap(e) {
    e.preventDefault();
    const username = document.getElementById('klUsername').value.trim();
    const name = document.getElementById('klName').value.trim();
    const password = document.getElementById('klPassword').value;
    const role = document.getElementById('klRole').value;
    const locationId = document.getElementById('klLocation').value;

    if (!username || !name || !password || !role) { showToast('Lengkapi semua field', 'error'); return; }

    try {
        const res = await fetch(`${API_BASE}/korlap.php?action=create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, name, password, role, location_id: locationId })
        });
        const data = await res.json();
        if (data.success) {
            showToast('Akun korlap berhasil dibuat!');
            document.getElementById('createKorlapForm').reset();
            document.getElementById('createKorlapBox').style.display = 'none';
            loadKorlapList();
        } else { showToast(data.error || 'Gagal', 'error'); }
    } catch { showToast('Koneksi gagal', 'error'); }
}

async function deleteKorlap(id, username) {
    if (!confirm('Hapus akun "' + username + '"?')) return;
    try {
        const res = await fetch(`${API_BASE}/korlap.php?action=delete&id=${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) { showToast('Akun berhasil dihapus'); loadKorlapList(); }
        else showToast(data.error || 'Gagal', 'error');
    } catch { showToast('Koneksi gagal', 'error'); }
}

// ══════════════════════════════════════════════
// IMPORT / EXPORT EXCEL (Owner Only)
// ══════════════════════════════════════════════
const TEMPLATE_HEADERS = [
    'ID', 'Username', 'Password User', 'Nama', 'NIK', 'Nomor WhatsApp', 'Email',
    'Tipe/Jenis SIM', 'Armada', 'Status User', 'Tempat Lahir', 'Tanggal Lahir',
    'Alamat Domisili', 'Pendidikan Terakhir', 'Pernah Bekerja di SPX?',
    'Berkas', 'Surat Keterangan Sehat', 'Paklaring', 'Tanda Tangan',
    'Lokasi Interview', 'Jadwal Interview'
];

function downloadTemplate() {
    const wb = XLSX.utils.book_new();
    const sampleData = [
        TEMPLATE_HEADERS,
        ['', 'john_doe', '', 'John Doe', '3201234567890001', '081234567890', 'john@email.com',
         'B2', 'CDD', 'Belum Pemberkasan', 'Jakarta', '1995-06-15',
         'Jl. Merdeka No.1', 'SMA', 'Tidak',
         '', 'Ada', 'Tidak Ada', '',
         'Makobas', ''],
        ['', 'jane_doe', '', 'Jane Doe', '3201234567890002', '081298765432', 'jane@email.com',
         'B2', 'Wingbox', 'Sudah Pemberkasan', 'Bandung', '1993-03-22',
         'Jl. Asia Afrika No.5', 'D3', 'Ya',
         '', 'Ada', 'Ada', '',
         'Cibitung', ''],
    ];

    const ws = XLSX.utils.aoa_to_sheet(sampleData);

    // Column widths
    ws['!cols'] = [
        {wch:8}, {wch:15}, {wch:15}, {wch:22}, {wch:18}, {wch:16}, {wch:22},
        {wch:14}, {wch:12}, {wch:20}, {wch:14}, {wch:14},
        {wch:25}, {wch:18}, {wch:22},
        {wch:20}, {wch:22}, {wch:14}, {wch:14},
        {wch:18}, {wch:18}
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Template Kandidat');

    // Notes sheet
    const notes = [
        ['Kolom', 'Keterangan'],
        ['ID', 'ID dari owner (kosongkan jika belum diberikan)'],
        ['Username', 'Username akun user'],
        ['Password User', 'Password user (opsional)'],
        ['Nama', 'Nama lengkap kandidat (WAJIB)'],
        ['NIK', '16 digit NIK'],
        ['Nomor WhatsApp', 'Nomor WA aktif (WAJIB)'],
        ['Email', 'Email kandidat'],
        ['Tipe/Jenis SIM', 'Contoh: B2, B2 Umum, dll'],
        ['Armada', 'Pilih: CDD / Wingbox / Bigmama'],
        ['Status User', 'Pilih: Belum Pemberkasan / Sudah Pemberkasan / Menunggu Test Drive / Jadwal Test Drive / Hadir / Tidak Hadir / Lulus / Tidak Lulus'],
        ['Tempat Lahir', 'Kota tempat lahir'],
        ['Tanggal Lahir', 'Format: YYYY-MM-DD (2024-01-31)'],
        ['Alamat Domisili', 'Alamat tinggal saat ini'],
        ['Pendidikan Terakhir', 'Contoh: SMA, D3, S1'],
        ['Pernah Bekerja di SPX?', 'Pilih: Ya / Tidak'],
        ['Berkas', 'Daftar berkas (hanya untuk export)'],
        ['Surat Keterangan Sehat', 'Pilih: Ada / Tidak Ada'],
        ['Paklaring', 'Pilih: Ada / Tidak Ada'],
        ['Tanda Tangan', 'Otomatis dari sistem (hanya export)'],
        ['Lokasi Interview', 'Nama lokasi interview (harus sesuai dengan data lokasi)'],
        ['Jadwal Interview', 'Format: YYYY-MM-DD HH:MM'],
    ];
    const wsNotes = XLSX.utils.aoa_to_sheet(notes);
    wsNotes['!cols'] = [{wch:25}, {wch:60}];
    XLSX.utils.book_append_sheet(wb, wsNotes, 'Petunjuk Pengisian');

    XLSX.writeFile(wb, 'Template_Import_Kandidat_BAS.xlsx');
    showToast('Template berhasil diunduh!');
}

function handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    event.target.value = '';

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(ws, { defval: '' });

            if (jsonData.length === 0) {
                showToast('File kosong!', 'error');
                return;
            }

            // Show preview modal
            showImportPreview(jsonData);
        } catch (err) {
            showToast('File tidak valid: ' + err.message, 'error');
        }
    };
    reader.readAsArrayBuffer(file);
}

function showImportPreview(data) {
    const preview = document.getElementById('importPreview');
    const cols = Object.keys(data[0]);
    const maxShow = Math.min(data.length, 5);

    let html = `<div style="margin-bottom:12px;">
        <strong>${data.length} baris</strong> data ditemukan.
        ${data.length > 5 ? ' Menampilkan 5 pertama:' : ''}
    </div>
    <div style="overflow-x:auto;max-height:300px;border-radius:8px;border:1px solid var(--border-color);">
        <table class="dash-table" style="font-size:0.72rem;">
            <thead><tr>${cols.slice(0, 8).map(c => '<th>' + c + '</th>').join('')}${cols.length > 8 ? '<th>...</th>' : ''}</tr></thead>
            <tbody>`;

    for (let i = 0; i < maxShow; i++) {
        html += '<tr>';
        cols.slice(0, 8).forEach(c => {
            let val = data[i][c];
            if (val instanceof Date) val = val.toISOString().split('T')[0];
            html += '<td>' + (val || '-') + '</td>';
        });
        if (cols.length > 8) html += '<td>...</td>';
        html += '</tr>';
    }

    html += `</tbody></table></div>
    <div style="margin-top:16px;display:flex;gap:10px;justify-content:flex-end;">
        <button class="btn btn-sm" style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color);" onclick="closeModal('importModal')">Batal</button>
        <button class="btn btn-sm btn-primary" onclick="executeImport()">Import ${data.length} Data</button>
    </div>`;

    preview.innerHTML = html;
    window._importData = data;
    document.getElementById('importProgress').style.display = 'none';
    document.getElementById('importResult').style.display = 'none';
    preview.style.display = '';
    document.getElementById('importModal').classList.add('active');
}

async function executeImport() {
    const data = window._importData;
    if (!data) return;

    document.getElementById('importPreview').style.display = 'none';
    document.getElementById('importProgress').style.display = '';

    // Map Excel column names to API keys
    const rows = data.map(row => {
        const mapped = {};
        Object.entries(row).forEach(([key, val]) => {
            // Normalize key
            const k = key.trim();
            if (val instanceof Date) val = val.toISOString().split('T')[0];
            mapped[k] = val;
        });
        return mapped;
    });

    try {
        const res = await fetch(`${API_BASE}/import-export.php?action=import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rows })
        });
        const result = await res.json();

        document.getElementById('importProgress').style.display = 'none';
        const resultDiv = document.getElementById('importResult');
        resultDiv.style.display = '';

        let html = `<div style="text-align:center;padding:16px;">
            <div style="font-size:2rem;margin-bottom:8px;">${result.success ? '&#9989;' : '&#10060;'}</div>
            <h3 style="margin-bottom:8px;">${result.message || 'Selesai'}</h3>`;

        if (result.errors && result.errors.length > 0) {
            html += `<div style="text-align:left;margin-top:12px;max-height:150px;overflow-y:auto;background:rgba(239,68,68,0.1);padding:10px;border-radius:8px;font-size:0.75rem;">`;
            result.errors.forEach(e => { html += `<div style="color:#EF4444;margin-bottom:4px;">${e}</div>`; });
            html += `</div>`;
        }

        html += `<button class="btn btn-sm btn-primary" style="margin-top:16px;" onclick="closeModal('importModal');loadCandidates();">Tutup & Refresh</button></div>`;
        resultDiv.innerHTML = html;

        if (result.inserted > 0) loadCandidates();
    } catch {
        showToast('Import gagal: koneksi error', 'error');
        closeModal('importModal');
    }
}

async function exportToExcel() { return exportAll(); } // legacy compat

function buildExcelRows(candidates) {
    return candidates.map(c => ([
        c.given_id || '',
        c.username || '',
        '',
        c.name || '',
        c.nik || '',
        c.whatsapp || '',
        c.email || '',
        c.sim_type || '',
        c.armada_type || '',
        c.status || '',
        c.tempat_lahir || '',
        c.tanggal_lahir || '',
        c.address || '',
        c.pendidikan_terakhir || '',
        c.pernah_kerja_spx || '',
        c.berkas || '',
        c.surat_sehat || '',
        c.paklaring || '',
        c.tanda_tangan || '',
        c.lokasi_interview || '',
        c.jadwal_interview || '',
    ]));
}

function writeExcel(candidates, filename) {
    if (candidates.length === 0) { showToast('Tidak ada data untuk diexport', 'error'); return; }
    const wsData = [TEMPLATE_HEADERS, ...buildExcelRows(candidates)];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [
        {wch:8}, {wch:15}, {wch:15}, {wch:22}, {wch:18}, {wch:16}, {wch:22},
        {wch:14}, {wch:12}, {wch:20}, {wch:14}, {wch:14},
        {wch:25}, {wch:18}, {wch:22},
        {wch:20}, {wch:22}, {wch:14}, {wch:14},
        {wch:18}, {wch:18}
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data Kandidat');
    XLSX.writeFile(wb, filename);
    showToast(`Export berhasil! ${candidates.length} data`);
}

// Export only currently-filtered candidates (using allCandidates)
function exportFiltered() {
    const hasFilter =
        getMultiFilterValues('Location').length > 0 ||
        getMultiFilterValues('Status').length > 0 ||
        getMultiFilterValues('Armada').length > 0 ||
        document.getElementById('filterSearch')?.value?.trim();
    const label = hasFilter ? `_filtered` : '';
    const today = new Date().toISOString().split('T')[0];
    showToast(`Mengexport ${allCandidates.length} data (filter aktif)...`);
    writeExcel(allCandidates, `Data_Kandidat_BAS${label}_${today}.xlsx`);
}

// Export ALL candidates from API (ignoring filter)
async function exportAll() {
    showToast('Mengambil semua data...');
    try {
        const res = await fetch(`${API_BASE}/import-export.php?action=export`);
        const data = await res.json();
        const today = new Date().toISOString().split('T')[0];
        writeExcel(data.candidates || [], `Data_Kandidat_BAS_Semua_${today}.xlsx`);
    } catch {
        showToast('Export gagal', 'error');
    }
}

// Bulk status update for selected candidates
async function bulkUpdateStatus() {
    const newStatus = document.getElementById('bulkStatusSelect')?.value;
    if (!newStatus) { showToast('Pilih status terlebih dahulu', 'error'); return; }
    const checked = document.querySelectorAll('.cand-checkbox:checked');
    if (checked.length === 0) { showToast('Tidak ada kandidat dipilih', 'error'); return; }
    if (!confirm(`Ubah status ${checked.length} kandidat menjadi "${newStatus}"?`)) return;

    const ids = Array.from(checked).map(cb => parseInt(cb.value));
    try {
        const res = await fetch(`${API_BASE}/admin.php`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids, status: newStatus })
        });
        const data = await res.json();
        if (data.success) {
            showToast(`${ids.length} kandidat diubah ke "${newStatus}"`);
            document.getElementById('bulkStatusSelect').value = '';
            document.getElementById('bulkActions').style.display = 'none';
            loadCandidates();
        } else {
            showToast(data.error || 'Gagal mengubah status', 'error');
        }
    } catch {
        showToast('Koneksi gagal', 'error');
    }
}

// ══════════════════════════════════════════════
// DATE RANGE CALENDAR (Analytics)
// ══════════════════════════════════════════════
let rangeCalMonth = new Date().getMonth();
let rangeCalYear = new Date().getFullYear();
let rangeStart = null;
let rangeEnd = null;
let rangeDataDates = new Set();

function rangeCalNav(dir) {
    rangeCalMonth += dir;
    if (rangeCalMonth < 0) { rangeCalMonth = 11; rangeCalYear--; }
    if (rangeCalMonth > 11) { rangeCalMonth = 0; rangeCalYear++; }
    renderRangeCal();
}

function renderRangeCal() {
    const grid = document.getElementById('rangeCalGrid');
    if (!grid) return;

    const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    document.getElementById('rangeCalTitle').innerHTML = `<span>${months[rangeCalMonth]}</span> ${rangeCalYear}`;

    const firstDay = new Date(rangeCalYear, rangeCalMonth, 1);
    const lastDay = new Date(rangeCalYear, rangeCalMonth + 1, 0);
    const startWeekday = (firstDay.getDay() + 6) % 7; // Monday = 0
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let html = '';

    // Empty cells before first day
    for (let i = 0; i < startWeekday; i++) {
        html += '<div class="range-cal-cell empty"></div>';
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
        const date = new Date(rangeCalYear, rangeCalMonth, d);
        const dateStr = formatDateISO(date);
        let classes = ['range-cal-cell'];

        // Today
        if (date.getTime() === today.getTime()) classes.push('today');

        // Has registration data
        if (rangeDataDates.has(dateStr)) classes.push('has-data');

        // Range highlighting
        if (rangeStart && rangeEnd) {
            const s = new Date(rangeStart);
            const e = new Date(rangeEnd);
            if (date >= s && date <= e) classes.push('in-range');
            if (dateStr === rangeStart) classes.push('range-start');
            if (dateStr === rangeEnd) classes.push('range-end');
        } else if (rangeStart && dateStr === rangeStart) {
            classes.push('range-start');
        }

        html += `<div class="${classes.join(' ')}" onclick="pickRangeDate('${dateStr}')">
            <span>${d}</span>
            <div class="range-cal-dot"></div>
        </div>`;
    }

    grid.innerHTML = html;
    updateRangeInfo();
}

function pickRangeDate(dateStr) {
    if (!rangeStart || rangeEnd) {
        // First pick or reset
        rangeStart = dateStr;
        rangeEnd = null;
    } else {
        // Second pick
        if (dateStr < rangeStart) {
            rangeEnd = rangeStart;
            rangeStart = dateStr;
        } else if (dateStr === rangeStart) {
            return;
        } else {
            rangeEnd = dateStr;
        }
        // Apply filter to forecast chart
        applyRangeFilter();
    }
    renderRangeCal();
}

function updateRangeInfo() {
    const el = document.getElementById('rangeCalDates');
    if (!rangeStart) {
        el.innerHTML = 'Klik 2 tanggal untuk memilih rentang';
        return;
    }
    if (!rangeEnd) {
        el.innerHTML = `<span class="range-date">${rangeStart}</span> <span class="range-arrow">&rarr;</span> <span style="color:var(--text-muted);">pilih tanggal akhir</span>`;
        return;
    }
    const days = Math.round((new Date(rangeEnd) - new Date(rangeStart)) / 86400000) + 1;
    el.innerHTML = `<span class="range-date">${rangeStart}</span> <span class="range-arrow">&rarr;</span> <span class="range-date">${rangeEnd}</span> <span class="range-days">(${days} hari)</span>`;
}

function setRangePreset(days) {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days + 1);
    rangeStart = formatDateISO(start);
    rangeEnd = formatDateISO(end);
    rangeCalMonth = end.getMonth();
    rangeCalYear = end.getFullYear();
    renderRangeCal();
    applyRangeFilter();
}

function resetRange() {
    rangeStart = null;
    rangeEnd = null;
    renderRangeCal();
    // Reset to full data
    if (analyticsData) renderAnalyticsPage(analyticsData);
}

function applyRangeFilter() {
    if (!analyticsData || !rangeStart || !rangeEnd) return;

    const allRecent = analyticsData.recent_registrations || [];
    const filtered = allRecent.filter(d => {
        return d.date >= rangeStart && d.date <= rangeEnd;
    });

    if (filtered.length > 0) {
        renderForecastChart(filtered);
    }
}

function formatDateISO(d) {
    return d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');
}

function initRangeCal(recentData) {
    // Populate data dates set
    rangeDataDates.clear();
    if (recentData) {
        recentData.forEach(d => rangeDataDates.add(d.date));
    }
    renderRangeCal();
}

// ══════════════════════════════════════════════
// LOCATIONS MANAGEMENT
// ══════════════════════════════════════════════
function toggleCreateLocation() {
    const box = document.getElementById('createLocationBox');
    box.style.display = box.style.display === 'none' ? 'block' : 'none';
}

async function loadLocationsList() {
    try {
        const res = await fetch(`${API_BASE}/locations.php`);
        const data = await res.json();
        const tbody = document.getElementById('locationsTableBody');
        
        if (!data.locations || data.locations.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="table-empty">Belum ada lokasi</td></tr>';
            return;
        }

        tbody.innerHTML = data.locations.map(l => `
            <tr>
                <td>${l.id}</td>
                <td><strong>${escapeHtml(l.name)}</strong></td>
                <td>${escapeHtml(l.address)}</td>
                <td>${l.maps_link ? `<a href="${escapeHtml(l.maps_link)}" target="_blank" class="btn-link">Lihat Maps</a>` : '-'}</td>
                <td>
                    <button class="btn-primary" style="padding:4px 8px;font-size:0.75rem;margin-right:6px;display:inline-flex;align-items:center;gap:4px;" onclick="updateLocationLink(${l.id}, '${escapeHtml(l.maps_link || '').replace(/'/g, "\\'")}', '${escapeHtml(l.name).replace(/'/g, "\\'")}')" title="Edit Link Google Maps"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Edit Link</button>
                    <button class="btn-trash" onclick="deleteLocation(${l.id}, '${escapeHtml(l.name).replace(/'/g, "\\'")}')" title="Hapus"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>
                </td>
            </tr>
        `).join('');
    } catch {
        showToast('Gagal memuat lokasi', 'error');
    }
}

async function updateLocationLink(id, currentLink, name) {
    const newLink = prompt(`Edit Link Google Maps untuk lokasi "${name}":\n(Kosongkan jika ingin menghapus link)`, currentLink);
    if (newLink === null) return; // cancelled

    try {
        const res = await fetch(`${API_BASE}/locations.php`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id, maps_link: newLink.trim() })
        });
        const data = await res.json();
        if (data.success) {
            showToast('Link Maps diperbarui!');
            loadLocationsList();
        } else {
            showToast(data.error || 'Gagal memperbarui link', 'error');
        }
    } catch {
        showToast('Terjadi kesalahan koneksi', 'error');
    }
}

document.getElementById('createLocationForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Menyimpan...';

    const payload = {
        name: document.getElementById('locName').value.trim(),
        address: document.getElementById('locAddress').value.trim(),
        maps_link: document.getElementById('locMaps').value.trim()
    };

    try {
        const res = await fetch(`${API_BASE}/locations.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            showToast('Lokasi berhasil ditambahkan');
            e.target.reset();
            toggleCreateLocation();
            loadLocationsList();
        } else {
            showToast(data.error || 'Gagal menyimpan', 'error');
        }
    } catch {
        showToast('Terjadi kesalahan', 'error');
    }
    btn.disabled = false; btn.textContent = 'Simpan Lokasi';
});

async function deleteLocation(id, name) {
    if (!confirm(`Hapus lokasi "${name}"?\n(Lokasi yang sedang digunakan kandidat tidak bisa dihapus)`)) return;
    try {
        const res = await fetch(`${API_BASE}/locations.php`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        const data = await res.json();
        if (data.success) {
            showToast('Lokasi dihapus');
            loadLocationsList();
        } else {
            showToast(data.error || 'Gagal menghapus', 'error');
        }
    } catch {
        showToast('Terjadi kesalahan', 'error');
    }
}

// ══════════════════════════════════════════════
// BLACKLIST MANAGEMENT
// ══════════════════════════════════════════════
function toggleCreateBlacklist() {
    const box = document.getElementById('createBlacklistBox');
    box.style.display = box.style.display === 'none' ? 'block' : 'none';
}

async function loadBlacklistList() {
    const isOwner = currentAdmin?.role === 'owner';
    try {
        const res = await fetch(`${API_BASE}/blacklist.php`);
        const data = await res.json();
        const tbody = document.getElementById('blacklistTableBody');
        
        if (!data.blacklists || data.blacklists.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="table-empty">Belum ada blacklist</td></tr>';
            return;
        }

        tbody.innerHTML = data.blacklists.map(b => `
            <tr>
                <td>${b.id}</td>
                <td><strong style="color:var(--error);">${escapeHtml(b.nik)}</strong></td>
                <td>${escapeHtml(b.candidate_name || '-')}</td>
                <td>${escapeHtml(b.reason)}</td>
                <td>${formatDate(b.created_at)}</td>
                <td>${escapeHtml(b.creator_name || 'System')}</td>
                <td>${isOwner ? `<button class="btn-trash" onclick="deleteBlacklist(${b.id}, '${escapeHtml(b.nik)}')" title="Cabut Blacklist"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>` : '<span style="opacity:0.3;font-size:0.75rem;">—</span>'}</td>
            </tr>
        `).join('');
    } catch {
        showToast('Gagal memuat blacklist', 'error');
    }
}

document.getElementById('createBlacklistForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Memblokir...';

    const payload = {
        nik: document.getElementById('blNik').value.trim(),
        reason: document.getElementById('blReason').value.trim()
    };

    if (payload.nik.length !== 16) {
        showToast('NIK harus 16 digit angka', 'error');
        btn.disabled = false; btn.textContent = 'Blokir NIK';
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/blacklist.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            showToast('NIK berhasil diblokir');
            e.target.reset();
            toggleCreateBlacklist();
            loadBlacklistList();
        } else {
            showToast(data.error || 'Gagal memblokir', 'error');
        }
    } catch {
        showToast('Terjadi kesalahan', 'error');
    }
    btn.disabled = false; btn.textContent = 'Blokir NIK';
});

async function deleteBlacklist(id, nik) {
    if (!confirm(`Cabut NIK ${nik} dari daftar Blacklist?\nMereka akan bisa mendaftar lagi.`)) return;
    try {
        const res = await fetch(`${API_BASE}/blacklist.php`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        const data = await res.json();
        if (data.success) {
            showToast('Blacklist dicabut');
            loadBlacklistList();
        } else {
            showToast(data.error || 'Gagal mencabut', 'error');
        }
    } catch {
        showToast('Terjadi kesalahan', 'error');
    }
}

// ══════════════════════════════════════════════
// CELL SELECTION + CTRL+D FILL DOWN + CTRL+V PASTE
// ══════════════════════════════════════════════
let _cellAnchorRow = null;
let _cellAnchorCol = null;
let _cellAnchorHTML = '';

function showFillHint(msg, ms = 2200) {
    const el = document.getElementById('fillHint');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), ms);
}

function clearCellSelection() {
    document.querySelectorAll('#candidateTableBody td.cell-selected, #candidateTableBody td.cell-anchor')
        .forEach(t => t.classList.remove('cell-selected', 'cell-anchor'));
    _cellAnchorRow = null; _cellAnchorCol = null; _cellAnchorHTML = '';
}

function initCellSelection() {
    const obs = new MutationObserver(() => bindCellClicks());
    const tb = document.getElementById('candidateTableBody');
    if (tb) obs.observe(tb, { childList: true });
    bindCellClicks();

    document.addEventListener('keydown', async (e) => {
        const mod = e.ctrlKey || e.metaKey;
        const activeTag = document.activeElement?.tagName;
        if (['INPUT','TEXTAREA','SELECT'].includes(activeTag)) return; // don't intercept while typing

        // ── Ctrl+Z — Undo last cell change ──
        if (mod && e.key === 'z' && !e.shiftKey) {
            e.preventDefault(); // Always prevent (stops browser undo on page)
            if (undoStack.length === 0) { showFillHint('Tidak ada aksi yang bisa di-undo'); return; }
            const action = undoStack.pop();
            redoStack.push(action);
            showFillHint(`↩ Undo ${action.items.length} perubahan...`);
            for (const item of action.items) {
                await saveCandidateField(item.cid, item.field, item.oldVal, { skipToast: true, skipReload: true, skipUndo: true });
            }
            updateUndoIndicator();
            loadCandidates();
            showFillHint(`Undo selesai — ${action.items.length} nilai dikembalikan`);
            return;
        }

        // ── Ctrl+Y / Ctrl+Shift+Z — Redo ──
        if (mod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
            e.preventDefault(); // Always prevent
            if (redoStack.length === 0) { showFillHint('Tidak ada aksi yang bisa di-redo'); return; }
            const action = redoStack.pop();
            undoStack.push(action);
            showFillHint(`↪ Redo ${action.items.length} perubahan...`);
            for (const item of action.items) {
                await saveCandidateField(item.cid, item.field, item.newVal, { skipToast: true, skipReload: true, skipUndo: true });
            }
            updateUndoIndicator();
            loadCandidates();
            showFillHint(`Redo selesai — ${action.items.length} nilai diterapkan`);
            return;
        }

        // ── Ctrl+D — Fill down (uses sheetNav selection state) ──
        if (mod && e.key === 'd') {
            e.preventDefault(); // Always prevent bookmark dialog
            if (!sheetActiveCell || !sheetSelStart || !sheetSelEnd) {
                showFillHint('Klik sel dulu → Shift+klik range di kolom yang sama → Ctrl+D');
                return;
            }

            const tbody = document.getElementById('candidateTableBody');
            if (!tbody) return;
            const rows  = Array.from(tbody.querySelectorAll('tr'));
            const col   = sheetActiveCell.col;

            // Anchor cell = sheetActiveCell (the first cell clicked)
            const anchorTd  = rows[sheetActiveCell.row]?.children[col];
            if (!anchorTd || !anchorTd.dataset.field || !anchorTd.dataset.cid) {
                showFillHint('Kolom ini tidak bisa diisi. Pilih kolom yang bisa diedit.');
                return;
            }
            const anchorField = anchorTd.dataset.field;
            const anchorVal   = anchorTd.dataset.val || anchorTd.textContent.trim();

            // Range from sheetSelStart to sheetSelEnd
            const r1 = Math.min(sheetSelStart.row, sheetSelEnd.row);
            const r2 = Math.max(sheetSelStart.row, sheetSelEnd.row);

            if (r1 === r2) {
                showFillHint('Pilih range lebih dari 1 baris: klik sel → Shift+klik baris bawah → Ctrl+D');
                return;
            }

            const batchItems = [];
            for (let r = r1; r <= r2; r++) {
                const td = rows[r]?.children[col];
                if (!td || !td.dataset.field || !td.dataset.cid) continue;
                if (td.dataset.field !== anchorField) continue; // same column only
                if (td === anchorTd) continue; // skip anchor itself
                const oldVal = td.dataset.val || td.textContent.trim();
                batchItems.push({ cid: td.dataset.cid, field: anchorField, oldVal, newVal: anchorVal });
            }

            if (batchItems.length === 0) {
                showFillHint('Tidak ada baris valid untuk diisi');
                return;
            }

            showFillHint(`⬇️ Isi ${batchItems.length} baris dengan "${anchorVal}"...`);
            pushUndo(batchItems);
            await Promise.all(batchItems.map(item =>
                saveCandidateField(item.cid, item.field, item.newVal, { skipToast: true, skipReload: true, skipUndo: true })
            ));
            loadCandidates();
            showFillHint(`Ctrl+D: ${batchItems.length} baris terisi & disimpan · Ctrl+Z untuk undo`, 3500);
            return;
        }

        // ── Ctrl+V — Paste handled by initSheetNav native 'paste' event ──
        // (Supports Excel Tab-separated multi-column paste without clipboard permission prompt)

        if (e.key === 'Escape') clearCellSelection();
    });
}

function bindCellClicks() {
    const tbody = document.getElementById('candidateTableBody');
    if (!tbody) return;
    tbody.querySelectorAll('td').forEach(td => {
        if (td._cellBound) return;
        td._cellBound = true;
        td.style.cursor = 'cell';
        td.addEventListener('click', (e) => {
            // Let buttons, links, inputs, selects handle their own events
            if (e.target.closest('button,a,input,select')) return;
            const rowIdx = Array.from(td.closest('tbody').rows).indexOf(td.closest('tr'));
            const colIdx = Array.from(td.parentElement.cells).indexOf(td);

            if (!e.shiftKey) {
                clearCellSelection();
                _cellAnchorRow  = rowIdx;
                _cellAnchorCol  = colIdx;
                _cellAnchorHTML = td.innerHTML;
                td.classList.add('cell-anchor');
                const isEditable = td.dataset.field;
                const hint = isEditable
                    ? 'Dblclick untuk edit · Shift+klik range · Ctrl+D isi ke bawah'
                    : 'Shift+klik untuk pilih range · Ctrl+D isi ke bawah · Ctrl+V tempel';
                showFillHint(hint);
            } else if (_cellAnchorRow !== null && _cellAnchorCol !== null) {
                if (colIdx !== _cellAnchorCol) {
                    showFillHint('Pilih dalam kolom yang sama saja'); return;
                }
                document.querySelectorAll('#candidateTableBody td.cell-selected').forEach(t => t.classList.remove('cell-selected'));
                const rows = Array.from(td.closest('tbody').rows);
                const minR = Math.min(_cellAnchorRow, rowIdx);
                const maxR = Math.max(_cellAnchorRow, rowIdx);
                for (let r = minR; r <= maxR; r++) {
                    const cell = rows[r]?.cells[_cellAnchorCol];
                    if (cell && !cell.classList.contains('cell-anchor')) cell.classList.add('cell-selected');
                }
                showFillHint(`${maxR - minR} baris dipilih · Ctrl+D untuk isi semua`);
            }
        });
    });
}

// ══════════════════════════════════════════════
// DEMO DATA
// ══════════════════════════════════════════════
function _getDemoCandidates() {
    const names = ['Ahmad Farhan','Budi Santoso','Citra Dewi','Doni Prasetyo','Eka Rahmawati','Fajar Hidayat','Gilang Ramadhan','Hesti Nurjanah'];
    const statuses = ['Belum Pemberkasan','Sudah Pemberkasan','Menunggu Test Drive','Jadwal Test Drive','Lulus','Tidak Lulus','Sudah Pemberkasan','Lulus'];
    const armadas = ['CDD','Wingbox','CDD','Wingbox','CDD','CDD','Wingbox','CDD'];
    const locs = [1,2,3,4,1,2,3,4];
    const locNames = {1:'Makobas',2:'Mess Cileungsi',3:'Cibitung',4:'Cakung 2'};
    return names.map((name, i) => ({
        id: 100+i, given_id: 'DRV-'+(1001+i), name,
        nik: '32010101010100'+(10+i), whatsapp: '0812345678'+(10+i),
        email: name.split(' ')[0].toLowerCase()+'@email.com',
        sim_type: 'B2', armada_type: armadas[i], status: statuses[i],
        tempat_lahir: 'Jakarta', tanggal_lahir: '199'+(i%5)+'-0'+(i+1)+'-15',
        address: 'Jl. Demo No.'+(i+1)+', Jakarta',
        pendidikan_terakhir: i%2===0?'SMA':'SMK',
        pernah_kerja_spx: i%3===0?'Ya':'Tidak',
        surat_sehat: i%2===0?'Ada':'Belum',
        paklaring: i%2===0?'Ada':'Belum',
        referensi: i%3===1?'PT ABC':'',
        emergency_name: 'Keluarga '+name.split(' ')[1],
        emergency_phone: '0856789012'+(10+i),
        emergency_relation: i%2===0?'Istri':'Orang Tua',
        location_id: locs[i], display_location: locNames[locs[i]],
        test_drive_date: i<4 ? '2026-04-'+(10+i) : '',
        test_drive_time: i<4 ? '0'+(8+i)+':00' : '',
        user_id: 200+i, user_username: name.split(' ')[0].toLowerCase(),
        user_password: '', user_created_at: '2026-03-'+(15+i),
        created_at: '2026-03-'+(15+i)
    }));
}

// ═══════════════════════════════════════════════════════
// PUSH NOTIFICATION FUNCTIONS
// ═══════════════════════════════════════════════════════
let _pushTargetUserIds = [];

function openSinglePush(userId, name) {
    if (!userId) { showToast('User belum ada akun, tidak bisa kirim push', 'error'); return; }
    _pushTargetUserIds = [userId];
    document.getElementById('pushRecipientInfo').textContent = 'Penerima: ' + name;
    document.getElementById('pushTitle').value = 'Catatan dari Korlap';
    document.getElementById('pushMessage').value = '';
    document.getElementById('pushModal').style.display = 'flex';
    document.getElementById('pushMessage').focus();
}

function openBulkPushModal() {
    const checked = document.querySelectorAll('.cand-checkbox:checked');
    if (checked.length === 0) { showToast('Pilih kandidat terlebih dahulu', 'error'); return; }

    // Collect user_ids from checked candidates
    const candidateIds = Array.from(checked).map(cb => parseInt(cb.value));
    const userIds = [];
    const names = [];
    candidateIds.forEach(cid => {
        const c = allCandidates.find(x => x.id === cid);
        if (c && c.user_id) {
            userIds.push(c.user_id);
            names.push(c.name);
        }
    });

    if (userIds.length === 0) {
        showToast('Kandidat yang dipilih belum memiliki akun', 'error');
        return;
    }

    _pushTargetUserIds = userIds;
    document.getElementById('pushRecipientInfo').textContent =
        userIds.length + ' penerima: ' +
        (names.length <= 3 ? names.join(', ') : names.slice(0,3).join(', ') + ' +' + (names.length-3) + ' lainnya');
    document.getElementById('pushTitle').value = 'Catatan dari Korlap';
    document.getElementById('pushMessage').value = '';
    document.getElementById('pushModal').style.display = 'flex';
    document.getElementById('pushMessage').focus();
}

function closePushModal() {
    document.getElementById('pushModal').style.display = 'none';
    _pushTargetUserIds = [];
}

async function sendPushNotification() {
    const title   = document.getElementById('pushTitle').value.trim();
    const message = document.getElementById('pushMessage').value.trim();

    if (!message) { showToast('Pesan tidak boleh kosong', 'error'); return; }
    if (_pushTargetUserIds.length === 0) { showToast('Tidak ada penerima', 'error'); return; }

    const btn = document.getElementById('pushSendBtn');
    btn.disabled = true;
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> Mengirim...';

    try {
        const res = await fetch(`${API_BASE}/push.php?action=send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                user_ids: _pushTargetUserIds,
                title: title,
                message: message
            })
        });
        const data = await res.json();

        if (data.ok) {
            showToast(data.message || 'Notifikasi terkirim!');
            closePushModal();
        } else {
            showToast(data.error || 'Gagal mengirim notifikasi', 'error');
        }
    } catch(e) {
        showToast('Gagal mengirim: ' + e.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Kirim';
    }
}

// ═══════════════════════════════════════════════════════
// SETTINGS — DROPDOWN OPTIONS MANAGEMENT
// ═══════════════════════════════════════════════════════
let _dropdownCache = {};

const CATEGORY_LABELS = {
    'status':               'Status Kandidat',
    'armada_type':          'Tipe Armada',
    'sim_type':             'Tipe SIM',
    'pernah_kerja_spx':     'Pernah Kerja SPX',
    'surat_sehat':          'Surat Sehat',
    'paklaring':            'Paklaring',
    'pendidikan_terakhir':  'Pendidikan Terakhir'
};

const CATEGORY_ICONS = {
    'status':               '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 12l2 2 4-4"/></svg>',
    'armada_type':          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
    'sim_type':             '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>',
    'pernah_kerja_spx':     '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    'surat_sehat':          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    'paklaring':            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    'pendidikan_terakhir':  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 1 4 3 6 3s6-2 6-3v-5"/></svg>'
};

// Load all dropdown options from database
async function loadDropdownOptions() {
    try {
        const res = await fetch(`${API_BASE}/settings.php?action=options`, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        if (data.ok && data.options) {
            _dropdownCache = data.options;
            // Update ALL_STATUSES from cache
            if (_dropdownCache['status'] && _dropdownCache['status'].length > 0) {
                ALL_STATUSES = _dropdownCache['status'].map(o => o.value);
            }
            // Update bulk status select in admin.html
            updateBulkStatusSelect();
        }
    } catch(e) {
        console.warn('Failed to load dropdown options:', e);
    }
}

function updateBulkStatusSelect() {
    const sel = document.getElementById('bulkStatusSelect');
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = '<option value="">— Ubah Status ke —</option>';
    ALL_STATUSES.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s; opt.textContent = s;
        if (s === current) opt.selected = true;
        sel.appendChild(opt);
    });
}

// Settings page renderer
async function loadSettingsPage() {
    await loadDropdownOptions();
    renderSettingsCards();
}

function renderSettingsCards() {
    const container = document.getElementById('settingsContainer');
    if (!container) return;

    const categories = Object.keys(CATEGORY_LABELS);
    container.innerHTML = categories.map(cat => {
        const items = _dropdownCache[cat] || [];
        const icon = CATEGORY_ICONS[cat] || '';
        const label = CATEGORY_LABELS[cat];

        const itemsHtml = items.length === 0
            ? '<div class="settings-card-empty">Belum ada opsi</div>'
            : items.map((item, idx) => `
                <div class="settings-item" data-id="${item.id}">
                    <span class="item-order">${idx + 1}</span>
                    <span class="item-label">${escapeHtml(item.label)}</span>
                    <div class="item-actions">
                        <button onclick="editOption(${item.id},'${escapeHtml(item.label)}','${cat}')" title="Edit">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button class="btn-del" onclick="deleteOption(${item.id},'${escapeHtml(item.label)}')" title="Hapus">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                        </button>
                    </div>
                </div>
            `).join('');

        return `
            <div class="settings-card">
                <div class="settings-card-header">
                    <h3>${icon} ${label}</h3>
                    <span class="card-count">${items.length}</span>
                </div>
                <div class="settings-card-body">${itemsHtml}</div>
            </div>
        `;
    }).join('');
}

// Modal functions
function openAddOptionModal() {
    document.getElementById('optionEditId').value = '';
    document.getElementById('optionCategory').value = '';
    document.getElementById('optionCategory').disabled = false;
    document.getElementById('optionLabel').value = '';
    document.getElementById('optionModalTitle').innerHTML =
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Tambah Opsi Baru';
    document.getElementById('optionModal').style.display = 'flex';
    document.getElementById('optionLabel').focus();
}

function editOption(id, label, category) {
    document.getElementById('optionEditId').value = id;
    document.getElementById('optionCategory').value = category;
    document.getElementById('optionCategory').disabled = true;
    document.getElementById('optionLabel').value = label;
    document.getElementById('optionModalTitle').innerHTML =
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Edit Opsi';
    document.getElementById('optionModal').style.display = 'flex';
    document.getElementById('optionLabel').focus();
}

function closeOptionModal() {
    document.getElementById('optionModal').style.display = 'none';
}

async function saveOption() {
    const id       = document.getElementById('optionEditId').value;
    const category = document.getElementById('optionCategory').value;
    const label    = document.getElementById('optionLabel').value.trim();

    if (!category) { showToast('Pilih kategori terlebih dahulu', 'error'); return; }
    if (!label) { showToast('Label tidak boleh kosong', 'error'); return; }

    const btn = document.getElementById('optionSaveBtn');
    btn.disabled = true;

    try {
        const action = id ? 'update' : 'add';
        const body = id
            ? { id: parseInt(id), label: label, value: label }
            : { category, label, value: label };

        const res = await fetch(`${API_BASE}/settings.php?action=${action}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(body)
        });
        const data = await res.json();

        if (data.ok) {
            showToast(data.message || 'Berhasil!');
            closeOptionModal();
            await loadSettingsPage();
        } else {
            showToast(data.error || 'Gagal menyimpan', 'error');
        }
    } catch(e) {
        showToast('Error: ' + e.message, 'error');
    } finally {
        btn.disabled = false;
    }
}

async function deleteOption(id, label) {
    if (!confirm(`Hapus opsi "${label}"?\n\nOpsi ini akan dihapus dari daftar dropdown.`)) return;

    try {
        const res = await fetch(`${API_BASE}/settings.php?action=delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ id })
        });
        const data = await res.json();

        if (data.ok) {
            showToast(data.message || 'Berhasil dihapus');
            await loadSettingsPage();
        } else {
            showToast(data.error || 'Gagal menghapus', 'error');
        }
    } catch(e) {
        showToast('Error: ' + e.message, 'error');
    }
}

// Load dropdown options on init
loadDropdownOptions();
