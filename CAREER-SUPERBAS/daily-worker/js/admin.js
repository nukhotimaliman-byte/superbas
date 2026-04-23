/**
 * BAS Recruitment — Admin Dashboard Logic (Unified)
 * Sidebar navigation, Charts, Candidate management, ML integration
 */

const API_BASE = './api';
let currentAdmin = null;
let allCandidates = [];
let analyticsData = null;
let chartInstances = {};

// ── Silent Re-Authentication ─────────────────────
// When session expires, try to re-authenticate using cached credentials
async function silentReAuth() {
    try {
        const cached = localStorage.getItem('bas_admin_cache');
        if (!cached) return false;
        const user = JSON.parse(cached);
        // Try to re-verify session (touch cookie)
        const res = await fetch(`${API_BASE}/user-auth.php?action=check`, {
            credentials: 'same-origin',
            cache: 'no-store'
        });
        const data = await res.json();
        if (data.authenticated && data.user) {
            currentAdmin = data.user;
            return true;
        }
        return false;
    } catch {
        return false;
    }
}

// ── Auto Refresh Interval ─────────────────────────
// Periodically reload data to prevent stale/empty tables
let _autoRefreshTimer = null;
function startAutoRefresh(intervalMs = 5 * 60 * 1000) {
    if (_autoRefreshTimer) clearInterval(_autoRefreshTimer);
    _autoRefreshTimer = setInterval(async () => {
        if (document.hidden) return; // Don't refresh when tab is hidden
        console.info('[BAS] Auto-refreshing data...');
        try { await loadCandidates(); } catch {}
        try { await loadAnalytics(); } catch {}
    }, intervalMs);
}

// Also refresh when tab becomes visible after being hidden
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && currentAdmin) {
        console.info('[BAS] Tab visible — refreshing data...');
        loadCandidates().catch(() => {});
        loadAnalytics().catch(() => {});
    }
});

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

// ══════════════════════════════════════════════
// TOAST — provided by js/utils.js
// ══════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════
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

// ══════════════════════════════════════════════
// DASHBOARD INIT
// ══════════════════════════════════════════════
async function initDashboard() {
    // Set user info
    const topAvatar = document.getElementById('topbarAvatar');
    if (topAvatar) topAvatar.textContent = (currentAdmin.name||'A').charAt(0).toUpperCase();

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

    // Start auto-refresh (every 5 minutes) to keep data fresh
    startAutoRefresh();
}

// ══════════════════════════════════════════════
// SIDEBAR NAVIGATION
// ══════════════════════════════════════════════
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

// ── Settings Page Init: auto-load tracking queue + dropdown settings ──
// NOTE: there used to be a duplicate of this function further down (in the dropdown settings section).
// They have been merged here into a single function.
async function loadSettingsPage() {
    // Auto-load active tracking queue
    pollActiveTracks().then(() => {}).catch(() => {});
    startTrackingPoller();
    // Load dropdown options and render settings cards
    await loadDropdownOptions();
    renderSettingsCards();
    // Refresh linktree items
    loadLinktreeItems();
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

// ══════════════════════════════════════════════
// LOAD ANALYTICS (Owner API)
// ══════════════════════════════════════════════
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

// ══════════════════════════════════════════════
// LOAD CANDIDATES
// ══════════════════════════════════════════════
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
            // Handle session expiry — re-authenticate silently
            if (res.status === 401) {
                console.warn('[BAS] Session expired during loadCandidates, attempting silent re-auth...');
                const reauth = await silentReAuth();
                if (reauth) {
                    // Retry once after re-auth
                    const res2 = await fetch(url, { credentials: 'same-origin' });
                    if (res2.status === 401) {
                        showToast('Sesi habis. Silakan login ulang.', 'error');
                        setTimeout(() => { localStorage.removeItem('bas_admin_cache'); window.location.href = 'login.html'; }, 1500);
                        return;
                    }
                    const data2 = await res2.json();
                    candidates = data2.candidates || [];
                } else {
                    showToast('Sesi habis. Silakan login ulang.', 'error');
                    setTimeout(() => { localStorage.removeItem('bas_admin_cache'); window.location.href = 'login.html'; }, 1500);
                    return;
                }
            } else {
                const data = await res.json();
                candidates = data.candidates || [];
            }
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
                ${ce('korlap_notes',      '<span title="' + escapeHtml(c.korlap_notes || '') + '">' + notesShort + '</span>')}
                ${ce('user_created_at',    c.user_created_at ? formatDate(c.user_created_at) : '-')}
                ${usernameCell}
                ${pwCell}
                ${ce('name',              '<strong>' + escapeHtml(c.name||'-') + '</strong>')}
                ${ce('nik',               c.nik || '-')}
                ${ce('whatsapp',          c.whatsapp || '-')}
                <td>${c.email || '-'}</td>
                ${cs('status',            '<span class="badge ' + getStatusBadgeClass(c.status) + '">' + c.status + '</span>')}
                ${ce('tempat_lahir',      c.tempat_lahir || '-')}
                ${ce('tanggal_lahir',     c.tanggal_lahir || '-')}
                ${ce('provinsi',          c.provinsi || '-')}
                ${ce('kabupaten',         c.kabupaten || '-')}
                ${ce('kecamatan',         c.kecamatan || '-')}
                ${ce('kelurahan',         c.kelurahan || '-')}
                ${ce('address',           '<span title="' + escapeHtml(c.address || '') + '">' + addrShort + '</span>')}
                ${cs('pendidikan_terakhir', c.pendidikan_terakhir || '-')}
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
    if (field === 'sim_type') {
        const dbOpts = (_dropdownCache['sim_type'] || []).map(o => [o.value, o.label]);
        options = dbOpts.length ? [['', '—'], ...dbOpts] : [['', '—'], ['SIM A', 'SIM A'], ['SIM B1', 'SIM B1'], ['SIM B2', 'SIM B2']];
    } else if (field === 'armada_type') {
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
    } else if (field === 'pendidikan_terakhir') {
        const dbOpts = (_dropdownCache['pendidikan_terakhir'] || []).map(o => [o.value, o.label]);
        options = dbOpts.length ? [['', '—'], ...dbOpts] : [['', '—'], ['SD', 'SD'], ['SMP', 'SMP'], ['SMA/SMK', 'SMA/SMK'], ['D3', 'D3']];
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
                    <div class="table-avatar">${(c.name||'?').charAt(0).toUpperCase()}</div>
                    <span class="table-name">${escapeHtml(c.name||'-')}</span>
                </div></td>
                <td>${c.location_name || '-'}</td>
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
            <td><div class="table-name-cell"><div class="table-avatar">${(c.name||'?').charAt(0).toUpperCase()}</div><span class="table-name">${escapeHtml(c.name||'-')}</span></div></td>
            <td>${c.location_name || '-'}</td>
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
                    <h3 style="font-weight:700;font-size:1.2rem;">${escapeHtml(c.name||'-')}</h3>
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
                            <div style="width:40px;height:40px;border-radius:8px;overflow:hidden;background:rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                                ${docThumb(d.file_path)}
                            </div>
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
            <button class="btn btn-block" style="margin-top:8px;background:linear-gradient(135deg,#2563EB,#1D4ED8);color:#fff;border:none;display:flex;align-items:center;justify-content:center;gap:6px;" onclick="openChatForCandidate(${c.id}, '${escapeHtml(c.name).replace(/'/g, "\\'")}')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                </svg>
                Chat
            </button>

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
    const map = { 'Belum Pemberkasan': 'badge-default', 'Sudah Pemberkasan': 'badge-pemberkasan', 'Menunggu Test Drive': 'badge-menunggu', 'Jadwal Test Drive': 'badge-jadwal', 'Hadir': 'badge-lulus', 'Tidak Hadir': 'badge-gagal', 'Lulus': 'badge-lulus', 'Tidak Lulus': 'badge-gagal', 'Proses Follow Up': 'badge-menunggu', 'Sudah Follow Up': 'badge-pemberkasan', 'Undang WI': 'badge-jadwal' };
    return map[status] || 'badge-default';
}

function getStatusColor(status) {
    const map = { 'Belum Pemberkasan': '#9CA3AF', 'Sudah Pemberkasan': '#F59E0B', 'Menunggu Test Drive': '#8B5CF6', 'Jadwal Test Drive': '#3B82F6', 'Hadir': '#06B6D4', 'Tidak Hadir': '#F97316', 'Lulus': '#10B981', 'Tidak Lulus': '#EF4444', 'Proses Follow Up': '#A855F7', 'Sudah Follow Up': '#14B8A6', 'Undang WI': '#0EA5E9' };
    return map[status] || '#9CA3AF';
}

function getDocIcon(path) { const ext = (path || '').split('.').pop().toLowerCase(); return ['jpg','jpeg','png'].includes(ext) ? 'IMG' : ext === 'pdf' ? 'PDF' : 'FILE'; }
function docThumb(path) {
    const ext = (path || '').split('.').pop().toLowerCase();
    if (['jpg','jpeg','png'].includes(ext)) {
        return '<img src="/driver/' + path + '" style="width:100%;height:100%;object-fit:cover;" onerror="this.outerHTML=\'<span style=font-size:1rem;font-weight:700;color:gray>IMG</span>\'">';
    }
    return '<span style="font-size:1rem;font-weight:700;color:var(--text-muted);">' + getDocIcon(path) + '</span>';
}
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

// ══════════════════════════════════════════════
// ROLE-BASED STATUS OPTIONS
// ══════════════════════════════════════════════
let ALL_STATUSES = ['Belum Pemberkasan','Sudah Pemberkasan','Menunggu Test Drive','Jadwal Test Drive','Hadir','Tidak Hadir','Proses Follow Up','Sudah Follow Up','Undang WI','Lulus','Tidak Lulus'];

function getStatusOptions(currentStatus) {
    const role = currentAdmin?.role;
    if (role === 'owner') return ALL_STATUSES;
    if (role === 'korlap_interview') {
        return ['Belum Pemberkasan','Sudah Pemberkasan','Menunggu Test Drive','Jadwal Test Drive','Proses Follow Up','Sudah Follow Up','Undang WI'];
    }
    if (role === 'korlap_td') {
        return ['Jadwal Test Drive','Hadir','Tidak Hadir','Proses Follow Up','Sudah Follow Up','Undang WI','Lulus','Tidak Lulus'];
    }
    // default korlap (legacy) — all
    return ALL_STATUSES;
}

// ══════════════════════════════════════════════
// KORLAP MANAGEMENT (Owner Only)
// ══════════════════════════════════════════════
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
    loadModalTemplates('pushTemplatePicker');
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
    loadModalTemplates('pushTemplatePicker');
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
            // Update Status filter checkboxes dynamically
            updateStatusFilterCheckboxes();
            // Update Armada filter checkboxes dynamically
            updateArmadaFilterCheckboxes();
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

function updateStatusFilterCheckboxes() {
    const list = document.getElementById('mfListStatus');
    if (!list) return;
    // Preserve currently checked values
    const checked = new Set(Array.from(list.querySelectorAll('input:checked')).map(cb => cb.value));
    list.innerHTML = ALL_STATUSES.map(s =>
        `<label class="mf-item"><input type="checkbox" value="${s}" onchange="onMultiFilterChange('Status')"${checked.has(s) ? ' checked' : ''}> ${s}</label>`
    ).join('');
}

function updateArmadaFilterCheckboxes() {
    const list = document.getElementById('mfListArmada');
    if (!list) return;
    const armadaItems = _dropdownCache['armada_type'] || [];
    if (armadaItems.length === 0) return; // Keep empty if no data
    const checked = new Set(Array.from(list.querySelectorAll('input:checked')).map(cb => cb.value));
    list.innerHTML = armadaItems.map(item =>
        `<label class="mf-item"><input type="checkbox" value="${item.value}" onchange="onMultiFilterChange('Armada')"${checked.has(item.value) ? ' checked' : ''}> ${item.label}</label>`
    ).join('');
}

// Settings page renderer (merged into the function defined earlier — this is now just the cards renderer caller)
// The main loadSettingsPage() is defined near initDashboard() and includes both
// tracking queue init + dropdown options loading.

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

// ═══════════════════════════════════════════════════════
// LINKTREE MANAGEMENT V2 — SVG Icons + Grouping
// ═══════════════════════════════════════════════════════
let _linktreeCache = [];

const LT_SVG_ICONS = {
    'link':           '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
    'video':          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>',
    'clipboard':      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>',
    'message-circle': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
    'phone':          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.88.35 1.73.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c1.08.35 1.93.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
    'map-pin':        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    'globe':          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
    'megaphone':      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l18-5v12L3 13v-2z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>',
    'briefcase':      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
    'truck':          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
    'package':        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
    'building':       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="9" y1="22" x2="9" y2="18"/><line x1="15" y1="22" x2="15" y2="18"/></svg>',
    'check-circle':   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    'zap':            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    'bell':           '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
    'calendar':       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    'shield':         '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    'award':          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>',
    'download':       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    'external-link':  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
    'whatsapp':       '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>',
    'instagram':      '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>',
    'tiktok':         '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.46v-7.13a8.16 8.16 0 005.58 2.18v-3.45a4.85 4.85 0 01-3.59-1.58 4.83 4.83 0 01-1.24-2.99h3.45c0 .03-.03.03-.03.03s0 0 .03 0h.37V6.69z"/></svg>',
    'facebook':       '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
    'youtube':        '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
    'telegram':       '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>',
};
const LT_SOCIAL = ['whatsapp','instagram','tiktok','facebook','youtube','telegram'];

function ltGetIconSvg(key) { return LT_SVG_ICONS[key] || LT_SVG_ICONS['link']; }
function ltGetIconClass(key) { return LT_SOCIAL.includes(key) ? ` ic-${key}` : ''; }

function buildIconPicker() {
    const picker = document.getElementById('ltIconPicker');
    if (!picker) return;
    picker.innerHTML = Object.keys(LT_SVG_ICONS).map(key =>
        `<div class="lt-icon-opt${ltGetIconClass(key)}" data-icon="${key}" title="${key}">${LT_SVG_ICONS[key]}</div>`
    ).join('');
}
buildIconPicker();

document.addEventListener('click', function(e) {
    const opt = e.target.closest('.lt-icon-opt');
    if (opt && opt.closest('#ltIconPicker')) {
        document.querySelectorAll('#ltIconPicker .lt-icon-opt').forEach(el => el.classList.remove('selected'));
        opt.classList.add('selected');
    }
});

const LT_AUTH_HEADERS = { 'Content-Type': 'application/json', 'X-Admin-Token': 'bas-owner-2026' };

async function loadLinktreeItems() {
    const list = document.getElementById('linktreeList');
    try {
        const res = await fetch(`${API_BASE}/linktree.php?action=all`, {
            credentials: 'include',
            headers: { 'X-Admin-Token': 'bas-owner-2026' }
        });
        const data = await res.json();
        if (data.ok && data.links) {
            _linktreeCache = data.links;
            renderLinktreeList();
        } else if (data.error === 'Unauthorized' || data.error === 'Forbidden') {
            // Fallback to public list
            try {
                const res2 = await fetch(`${API_BASE}/linktree.php?action=list`);
                const data2 = await res2.json();
                if (data2.ok && data2.links) { _linktreeCache = data2.links; renderLinktreeList(); }
            } catch(e2) {
                if (list) list.innerHTML = '<div class="settings-card-empty">Belum ada link. Klik "Tambah Link" untuk menambahkan.</div>';
            }
        } else {
            _linktreeCache = [];
            renderLinktreeList();
        }
    } catch(e) {
        console.warn('Failed to load linktree:', e);
        if (list) list.innerHTML = '<div class="settings-card-empty">Belum ada link. Klik "Tambah Link" untuk menambahkan.</div>';
    }
}

function renderLinktreeList() {
    const list = document.getElementById('linktreeList');
    const count = document.getElementById('linktreeCount');
    if (!list) return;
    const active = _linktreeCache.filter(l => l.is_active == 1).length;
    if (count) count.textContent = `${active} aktif / ${_linktreeCache.length} total`;
    if (_linktreeCache.length === 0) {
        list.innerHTML = '<div class="settings-card-empty">Belum ada link. Klik "Tambah Link" untuk menambahkan.</div>';
        return;
    }
    const standalone = []; const groups = {};
    _linktreeCache.forEach(item => {
        if (item.group_name) {
            if (!groups[item.group_name]) groups[item.group_name] = [];
            groups[item.group_name].push(item);
        } else { standalone.push(item); }
    });
    let html = '';
    standalone.forEach(item => { html += renderLtAdminItem(item); });
    for (const [gName, items] of Object.entries(groups)) {
        const allActive = items.every(i => i.is_active == 1);
        const toggleIcon = allActive ? '👁️' : '🚫';
        const toggleTitle = allActive ? 'Sembunyikan semua' : 'Tampilkan semua';
        html += `<div class="lt-group-header">
            <div class="lt-group-title">📁 ${escapeHtml(gName)} <span class="lt-group-count">(${items.length})</span></div>
            <div class="lt-group-actions">
                <button onclick="toggleLinktreeGroup('${escapeHtml(gName)}')" title="${toggleTitle}" class="lt-grp-btn">${toggleIcon}</button>
                <button onclick="renameLinktreeGroup('${escapeHtml(gName)}')" title="Rename grup" class="lt-grp-btn">✏️</button>
                <button onclick="deleteLinktreeGroup('${escapeHtml(gName)}')" title="Hapus grup" class="lt-grp-btn btn-del">🗑️</button>
            </div>
        </div>`;
        items.forEach(item => { html += renderLtAdminItem(item); });
    }
    list.innerHTML = html;
}

function renderLtAdminItem(item) {
    const isActive = item.is_active == 1;
    const inactiveClass = isActive ? '' : ' lt-inactive';
    const iconKey = item.icon_key || 'link';
    return `<div class="lt-item${inactiveClass}" data-id="${item.id}">
        <span class="lt-item-icon" style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;color:var(--accent);">${ltGetIconSvg(iconKey)}</span>
        <div class="lt-item-info">
            <div class="lt-item-title">${escapeHtml(item.title)}</div>
            <div class="lt-item-url">${escapeHtml(item.url)}</div>
            ${item.description ? `<div class="lt-item-desc">${escapeHtml(item.description)}</div>` : ''}
        </div>
        <label class="lt-toggle" title="${isActive ? 'Aktif' : 'Nonaktif'}">
            <input type="checkbox" ${isActive ? 'checked' : ''} onchange="toggleLinktreeItem(${item.id})">
            <span class="lt-toggle-slider"></span>
        </label>
        <div class="lt-item-actions">
            <button onclick="editLinktreeItem(${item.id})" title="Edit">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn-del" onclick="deleteLinktreeItem(${item.id})" title="Hapus">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            </button>
        </div>
    </div>`;
}

function openLinktreeModal(editItem) {
    const modal = document.getElementById('linktreeModal');
    const title = document.getElementById('linktreeModalTitle');
    document.getElementById('ltEditId').value = editItem ? editItem.id : '';
    document.getElementById('ltTitle').value = editItem ? editItem.title : '';
    document.getElementById('ltUrl').value = editItem ? editItem.url : '';
    document.getElementById('ltDesc').value = editItem ? (editItem.description || '') : '';
    document.getElementById('ltGroupName').value = editItem ? (editItem.group_name || '') : '';
    document.getElementById('ltGroupOrder').value = editItem ? (editItem.group_order || 0) : 0;
    const suggestions = document.getElementById('ltGroupSuggestions');
    const existingGroups = [...new Set(_linktreeCache.filter(l => l.group_name).map(l => l.group_name))];
    suggestions.innerHTML = existingGroups.map(g => `<option value="${escapeHtml(g)}">`).join('');
    const selectedKey = editItem ? (editItem.icon_key || 'link') : 'link';
    document.querySelectorAll('#ltIconPicker .lt-icon-opt').forEach(el => {
        el.classList.toggle('selected', el.dataset.icon === selectedKey);
    });
    title.textContent = editItem ? '✏️ Edit Link' : '🔗 Tambah Link Baru';
    modal.style.display = 'flex';
    document.getElementById('ltTitle').focus();
}

function closeLinktreeModal() {
    document.getElementById('linktreeModal').style.display = 'none';
}

function editLinktreeItem(id) {
    const item = _linktreeCache.find(l => l.id == id);
    if (item) openLinktreeModal(item);
}

async function saveLinktreeItem() {
    const id = document.getElementById('ltEditId').value;
    const titleVal = document.getElementById('ltTitle').value.trim();
    const url = document.getElementById('ltUrl').value.trim();
    const desc = document.getElementById('ltDesc').value.trim();
    const groupName = document.getElementById('ltGroupName').value.trim();
    const groupOrder = parseInt(document.getElementById('ltGroupOrder').value) || 0;
    const selectedIcon = document.querySelector('#ltIconPicker .lt-icon-opt.selected');
    const iconKey = selectedIcon ? selectedIcon.dataset.icon : 'link';
    if (!titleVal || !url) { showToast('Judul dan URL wajib diisi', 'error'); return; }
    const btn = document.getElementById('ltSaveBtn');
    btn.disabled = true;
    try {
        const action = id ? 'update' : 'add';
        const body = { title: titleVal, url, icon: '🔗', icon_key: iconKey, description: desc, group_name: groupName || null, group_order: groupOrder };
        if (id) body.id = parseInt(id);
        const res = await fetch(`${API_BASE}/linktree.php?action=${action}`, {
            method: 'POST', headers: LT_AUTH_HEADERS,
            credentials: 'include', body: JSON.stringify(body)
        });
        const data = await res.json();
        if (data.ok) { showToast(data.message || 'Berhasil!'); closeLinktreeModal(); await loadLinktreeItems(); }
        else { showToast(data.error || 'Gagal menyimpan', 'error'); }
    } catch(e) { showToast('Error: ' + e.message, 'error'); }
    finally { btn.disabled = false; }
}

async function deleteLinktreeItem(id) {
    const item = _linktreeCache.find(l => l.id == id);
    if (!confirm(`Hapus link "${item ? item.title : ''}"?\n\nLink ini akan dihapus dari beranda.`)) return;
    try {
        const res = await fetch(`${API_BASE}/linktree.php?action=delete`, {
            method: 'POST', headers: LT_AUTH_HEADERS,
            credentials: 'include', body: JSON.stringify({ id })
        });
        const data = await res.json();
        if (data.ok) { showToast(data.message || 'Berhasil dihapus'); await loadLinktreeItems(); }
        else { showToast(data.error || 'Gagal menghapus', 'error'); }
    } catch(e) { showToast('Error: ' + e.message, 'error'); }
}

async function toggleLinktreeItem(id) {
    try {
        const res = await fetch(`${API_BASE}/linktree.php?action=toggle`, {
            method: 'POST', headers: LT_AUTH_HEADERS,
            credentials: 'include', body: JSON.stringify({ id })
        });
        const data = await res.json();
        if (data.ok) { showToast(data.message || 'Status diperbarui'); await loadLinktreeItems(); }
        else { showToast(data.error || 'Gagal update', 'error'); }
    } catch(e) { showToast('Error: ' + e.message, 'error'); }
}

// ── Group Management ──
async function addLinktreeGroup() {
    const name = prompt('Nama grup baru:');
    if (!name || !name.trim()) return;
    const order = parseInt(prompt('Urutan grup (angka, default 0):', '0')) || 0;
    // Create group by adding a placeholder link
    try {
        const res = await fetch(`${API_BASE}/linktree.php?action=add`, {
            method: 'POST', headers: LT_AUTH_HEADERS,
            credentials: 'include',
            body: JSON.stringify({
                title: 'Link Baru', url: '#', icon: '🔗', icon_key: 'link',
                description: '', group_name: name.trim(), group_order: order
            })
        });
        const data = await res.json();
        if (data.ok) { showToast(`Grup "${name.trim()}" dibuat!`); await loadLinktreeItems(); }
        else { showToast(data.error || 'Gagal membuat grup', 'error'); }
    } catch(e) { showToast('Error: ' + e.message, 'error'); }
}

async function renameLinktreeGroup(oldName) {
    const newName = prompt(`Rename grup "${oldName}" menjadi:`, oldName);
    if (!newName || !newName.trim() || newName.trim() === oldName) return;
    try {
        const res = await fetch(`${API_BASE}/linktree.php?action=rename-group`, {
            method: 'POST', headers: LT_AUTH_HEADERS,
            credentials: 'include',
            body: JSON.stringify({ old_name: oldName, new_name: newName.trim() })
        });
        const data = await res.json();
        if (data.ok) { showToast(data.message || 'Grup berhasil direname'); await loadLinktreeItems(); }
        else { showToast(data.error || 'Gagal rename grup', 'error'); }
    } catch(e) { showToast('Error: ' + e.message, 'error'); }
}

async function deleteLinktreeGroup(name) {
    if (!confirm(`Hapus grup "${name}"?\n\nSemua link di dalamnya akan jadi standalone (tidak dihapus).`)) return;
    try {
        const res = await fetch(`${API_BASE}/linktree.php?action=delete-group`, {
            method: 'POST', headers: LT_AUTH_HEADERS,
            credentials: 'include',
            body: JSON.stringify({ group_name: name })
        });
        const data = await res.json();
        if (data.ok) { showToast(data.message || 'Grup dihapus'); await loadLinktreeItems(); }
        else { showToast(data.error || 'Gagal hapus grup', 'error'); }
    } catch(e) { showToast('Error: ' + e.message, 'error'); }
}

async function toggleLinktreeGroup(groupName) {
    const items = _linktreeCache.filter(l => l.group_name === groupName);
    const allActive = items.every(i => i.is_active == 1);
    const action = allActive ? 'hide' : 'show';
    if (!confirm(`${allActive ? 'Sembunyikan' : 'Tampilkan'} semua ${items.length} link di grup "${groupName}"?`)) return;
    try {
        for (const item of items) {
            if ((allActive && item.is_active == 1) || (!allActive && item.is_active == 0)) {
                await fetch(`${API_BASE}/linktree.php?action=toggle`, {
                    method: 'POST', headers: LT_AUTH_HEADERS,
                    credentials: 'include', body: JSON.stringify({ id: item.id })
                });
            }
        }
        showToast(`Grup "${groupName}" ${allActive ? 'disembunyikan' : 'ditampilkan'}`);
        await loadLinktreeItems();
    } catch(e) { showToast('Error: ' + e.message, 'error'); }
}

loadLinktreeItems();
/* ═══════════════════════════════════════════
   ADMIN CHAT
   ═══════════════════════════════════════════ */

let adminChatCandidateId = null;
let adminChatConversations = [];

// ── Panel Open/Close ────────────────────
function openAdminChat(candidateId) {
    document.getElementById('adminChatPanel').classList.add('open');
    document.getElementById('adminChatOverlay').classList.add('open');

    if (candidateId) {
        openAdminChatThread(candidateId);
    } else {
        loadAdminConversations();
    }
}

function closeAdminChat() {
    document.getElementById('adminChatPanel').classList.remove('open');
    document.getElementById('adminChatOverlay').classList.remove('open');
    ChatEngine.stopPoll();
}

// ── Demo Data (fallback when API unavailable) ──
const _demoChatData = {
    conversations: [
        { candidate_id:1, candidate_name:'Achmad Farhan', whatsapp:'081234567890', status:'proses_pemberkasan', sim_type:'SIM A', provinsi:'Banten', kabupaten:'Kota Tangerang', kecamatan:'Cipondoh', armada_type:'Mobil', location_name:'Tangerang', unread_count:2, last_message:'Siap min, sudah saya siapkan semua dokumennya', last_msg_time:'2026-04-12 19:10:00', last_sender_type:'user' },
        { candidate_id:2, candidate_name:'Budi Santoso', whatsapp:'081234567891', status:'lolos', sim_type:'SIM C', provinsi:'Jawa Barat', kabupaten:'Kota Bekasi', kecamatan:'Bekasi Selatan', armada_type:'Motor', location_name:'Bekasi', unread_count:1, last_message:'Baik terima kasih admin 🙏', last_msg_time:'2026-04-12 18:45:00', last_sender_type:'user' },
        { candidate_id:3, candidate_name:'Citra Dewi', whatsapp:'081234567892', status:'jadwal_test_drive', sim_type:'SIM A', provinsi:'DKI Jakarta', kabupaten:'Jakarta Selatan', kecamatan:'Kebayoran Baru', armada_type:'Mobil', location_name:'Jakarta', unread_count:0, last_message:'Mantap! Sampai jumpa di lokasi test drive 👍', last_msg_time:'2026-04-12 17:30:00', last_sender_type:'admin' },
        { candidate_id:4, candidate_name:'Deni Prasetyo', whatsapp:'081234567893', status:'baru', sim_type:'SIM A', provinsi:'Jawa Barat', kabupaten:'Kota Bogor', kecamatan:'Bogor Tengah', armada_type:'Mobil', location_name:'Bogor', unread_count:0, last_message:'Saya mau daftar jadi driver', last_msg_time:'2026-04-11 14:20:00', last_sender_type:'user' },
        { candidate_id:5, candidate_name:'Eka Rahmawati', whatsapp:'081234567894', status:'proses_pemberkasan', sim_type:'SIM C', provinsi:'Banten', kabupaten:'Kota Tangerang Selatan', kecamatan:'Serpong', armada_type:'Motor', location_name:'Tangerang Selatan', unread_count:0, last_message:'Foto KTP sudah saya upload min', last_msg_time:'2026-04-11 10:15:00', last_sender_type:'user' },
    ],
    threads: {
        1: [
            { id:1, sender_type:'user', sender_name:'Achmad Farhan', message_type:'text', message:'Selamat siang admin, saya mau tanya jadwal test drive', created_at:'2026-04-12 18:50:00', is_read:1 },
            { id:2, sender_type:'admin', sender_name:'Admin', message_type:'text', message:'Selamat siang! Jadwal test drive bisa dipilih di dashboard ya 📋', created_at:'2026-04-12 18:52:00', is_read:1 },
            { id:3, sender_type:'user', sender_name:'Achmad Farhan', message_type:'text', message:'Oh iya min, untuk lokasi Tangerang kapan ya?', created_at:'2026-04-12 18:55:00', is_read:1 },
            { id:4, sender_type:'admin', sender_name:'Admin', message_type:'text', message:'Untuk Tangerang dijadwalkan tanggal 15 April ya. Pastikan SIM dan KTP dibawa!', created_at:'2026-04-12 18:57:00', is_read:1 },
            { id:5, sender_type:'user', sender_name:'Achmad Farhan', message_type:'text', message:'Baik terima kasih admin 🙏', created_at:'2026-04-12 19:00:00', is_read:1 },
            { id:6, sender_type:'admin', sender_name:'Admin', message_type:'text', message:'Sama-sama! Jangan lupa siapkan SIM dan KTP ya', created_at:'2026-04-12 19:05:00', is_read:1 },
            { id:7, sender_type:'user', sender_name:'Achmad Farhan', message_type:'text', message:'Siap min, sudah saya siapkan semua dokumennya', created_at:'2026-04-12 19:10:00', is_read:0 },
        ],
        2: [
            { id:10, sender_type:'user', sender_name:'Budi Santoso', message_type:'text', message:'Min, saya mau konfirmasi jadwal interview', created_at:'2026-04-12 17:30:00', is_read:1 },
            { id:11, sender_type:'admin', sender_name:'Admin', message_type:'text', message:'Jadwal interview Anda tanggal 16 April pukul 09.00 WIB di kantor cabang Bekasi', created_at:'2026-04-12 17:35:00', is_read:1 },
            { id:12, sender_type:'user', sender_name:'Budi Santoso', message_type:'text', message:'Baik terima kasih admin 🙏', created_at:'2026-04-12 18:45:00', is_read:0 },
        ],
        3: [
            { id:20, sender_type:'user', sender_name:'Citra Dewi', message_type:'text', message:'Admin, test drive saya berhasil 🎉', created_at:'2026-04-12 15:20:00', is_read:1 },
            { id:21, sender_type:'admin', sender_name:'Admin', message_type:'text', message:'Selamat! Hasil test drive Anda sangat baik 🌟', created_at:'2026-04-12 15:25:00', is_read:1 },
            { id:22, sender_type:'admin', sender_name:'Admin', message_type:'text', message:'Selanjutnya silakan lengkapi berkas di dashboard ya', created_at:'2026-04-12 15:26:00', is_read:1 },
            { id:23, sender_type:'user', sender_name:'Citra Dewi', message_type:'text', message:'Siap admin! Terima kasih banyak', created_at:'2026-04-12 15:30:00', is_read:1 },
            { id:24, sender_type:'admin', sender_name:'Admin', message_type:'text', message:'Mantap! Sampai jumpa di lokasi test drive 👍', created_at:'2026-04-12 17:30:00', is_read:1 },
        ]
    }
};
let _usingDemoChat = false;

// ── Load Conversations ──────────────────
async function loadAdminConversations(search) {
    document.getElementById('adminChatListView').style.display = '';
    document.getElementById('adminChatThreadView').style.display = 'none';
    document.getElementById('adminChatPanelHeader').style.display = '';
    if (typeof ChatEngine !== 'undefined') ChatEngine.stopPoll();

    try {
        let url = '/driver/api/chat.php?action=conversations';
        if (search) url += '&search=' + encodeURIComponent(search);
        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        adminChatConversations = data.conversations || [];
        _usingDemoChat = false;
        renderAdminChatList(adminChatConversations);
    } catch(e) {
        console.warn('Chat API unavailable, loading demo data');
        _usingDemoChat = true;
        let convos = _demoChatData.conversations;
        if (search) {
            const s = search.toLowerCase();
            convos = convos.filter(c => c.candidate_name.toLowerCase().includes(s));
        }
        adminChatConversations = convos;
        renderAdminChatList(convos);
    }
}

function renderAdminChatList(convos) {
    const list = document.getElementById('adminChatList');
    if (!convos.length) {
        list.innerHTML = '<div style="text-align:center;padding:40px 20px;opacity:0.5;"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg><div style="font-weight:700;margin-top:8px;">Belum ada percakapan</div><div style="font-size:0.78rem;margin-top:4px;">Kirim pesan ke kandidat dari tabel data</div></div>';
        return;
    }

    list.innerHTML = convos.map(c => {
        const initials = (c.candidate_name || '?').split(' ').map(w => w[0]).join('').substring(0,2).toUpperCase();
        const lastMsg = c.last_msg_type === 'image' ? '📷 Foto' :
                       c.last_msg_type === 'file' ? '📎 File' :
                       c.last_msg_type === 'location' ? '📍 Lokasi' :
                       (c.last_message || '').substring(0, 40);
        const prefix = c.last_sender_type === 'admin' ? 'Anda: ' : '';
        const unread = c.unread_count > 0 ? `<div class="admin-chat-unread">${c.unread_count}</div>` : '';
        const time = ChatEngine.formatTime(c.last_msg_time);

        return `<div class="admin-chat-item" onclick="openAdminChatThread(${c.candidate_id}, '${ChatEngine.escHtml(c.candidate_name)}')">
            <div class="admin-chat-avatar">${initials}</div>
            <div class="admin-chat-info">
                <div class="admin-chat-name">${ChatEngine.escHtml(c.candidate_name)}</div>
                <div class="admin-chat-preview">${prefix}${ChatEngine.escHtml(lastMsg)}</div>
            </div>
            <div class="admin-chat-meta">
                <div class="admin-chat-time">${time}</div>
                ${unread}
            </div>
        </div>`;
    }).join('');
}

function searchAdminChats(val) {
    clearTimeout(searchAdminChats._t);
    searchAdminChats._t = setTimeout(() => loadAdminConversations(val), 300);
}

// ── Open Chat Thread ────────────────────
async function openAdminChatThread(candidateId, name) {
    adminChatCandidateId = candidateId;
    document.getElementById('adminChatListView').style.display = 'none';
    document.getElementById('adminChatThreadView').style.display = 'flex';
    document.getElementById('adminChatPanelHeader').style.display = 'none';
    document.getElementById('adminChatName').textContent = name || 'Kandidat #' + candidateId;
    document.getElementById('adminChatStatus').textContent = 'Memuat...';
    document.getElementById('adminChatMessages').innerHTML = '';

    // Populate detail card from conversation data
    const convo = adminChatConversations.find(c => c.candidate_id == candidateId);
    if (convo) {
        populateChatDetail(convo);
        // Auto-open detail on first view
        document.getElementById('chatDetailCard').classList.add('open');
        document.getElementById('chatDetailToggle').classList.add('active');
    }

    // Demo mode — render static messages
    if (_usingDemoChat) {
        const msgs = _demoChatData.threads[candidateId] || [];
        const area = document.getElementById('adminChatMessages');
        const dblSvg = '<svg width="16" height="14" viewBox="0 0 28 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 6 8 17 4 13"/><polyline points="24 6 14 17 11 14"/></svg>';
        const checkSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
        area.innerHTML = msgs.map(m => {
            const isMine = m.sender_type === 'admin';
            const side = isMine ? 'mine' : 'theirs';
            const time = m.created_at ? m.created_at.substring(11,16) : '';
            const readIcon = isMine ? '<span class="chat-read' + (m.is_read ? ' read' : '') + '">' + (m.is_read ? dblSvg : checkSvg) + '</span>' : '';
            return '<div class="chat-bubble chat-bubble--' + side + '"><div class="chat-text">' + (m.message||'').replace(/\n/g,'<br>') + '</div><div class="chat-meta"><span class="chat-time">' + time + '</span>' + readIcon + '</div></div>';
        }).join('');
        requestAnimationFrame(() => area.scrollTop = area.scrollHeight);
        document.getElementById('adminChatStatus').textContent = 'Online (Demo)';
        return;
    }

    ChatEngine.init({
        candidateId: candidateId,
        role: 'admin',
        container: document.getElementById('adminChatThreadView'),
        onNewMessages: () => {
            ChatEngine.markRead(candidateId);
        },
        onTypingChange: (isTyping) => {
            const el = document.getElementById('adminTypingIndicator');
            if (el) el.classList.toggle('active', isTyping);
        }
    });

    try {
        const data = await ChatEngine.loadHistory(candidateId);
        if (data.messages && data.messages.length > 0) {
            ChatEngine.renderMessages(data.messages);
            ChatEngine.setLastMsgId(data.messages[data.messages.length - 1].id);
        }
        document.getElementById('adminChatStatus').textContent = 'Online';
        ChatEngine.startPoll();
        ChatEngine.markRead(candidateId);
    } catch(e) {
        document.getElementById('adminChatStatus').textContent = 'Error';
    }
}

function adminChatBack() {
    ChatEngine.stopPoll();
    adminChatCandidateId = null;
    document.getElementById('adminTemplatesPanel').classList.remove('open');
    document.getElementById('chatDetailCard').classList.remove('open');
    document.getElementById('chatDetailToggle').classList.remove('active');
    loadAdminConversations();
}

// ── Toggle Detail Card ──────────────────
function toggleChatDetail() {
    const card = document.getElementById('chatDetailCard');
    const btn = document.getElementById('chatDetailToggle');
    card.classList.toggle('open');
    btn.classList.toggle('active');
}

function _getStatusBadge(status) {
    const map = {
        'baru': ['Baru', 'status-baru'],
        'proses_pemberkasan': ['Proses Berkas', 'status-proses'],
        'sudah_pemberkasan': ['Berkas Lengkap', 'status-proses'],
        'menunggu_test_drive': ['Menunggu TD', 'status-jadwal'],
        'jadwal_test_drive': ['Jadwal TD', 'status-jadwal'],
        'jadwal_interview': ['Jadwal Interview', 'status-jadwal'],
        'lolos': ['Lolos', 'status-lolos'],
        'gagal': ['Gagal', 'status-gagal'],
        'lulus': ['Lulus', 'status-lolos'],
        'tidal_lulus': ['Tidak Lulus', 'status-gagal'],
    };
    const [label, cls] = map[status] || [status || '-', 'status-baru'];
    return `<span class="chat-detail-badge ${cls}">${label}</span>`;
}

function populateChatDetail(convo) {
    document.getElementById('chatDetailStatus').innerHTML = _getStatusBadge(convo.status);
    document.getElementById('chatDetailSim').textContent = convo.sim_type || '-';
    document.getElementById('chatDetailArmada').textContent = convo.armada_type || '-';

    const parts = [convo.kecamatan, convo.kabupaten, convo.provinsi].filter(Boolean);
    document.getElementById('chatDetailAddress').textContent = parts.length ? parts.join(', ') : '-';
}

// ── Send Message ────────────────────────
async function adminChatSend() {
    const input = document.getElementById('adminChatInput');
    const text = input.value.trim();
    if (!text || !adminChatCandidateId) return;

    input.value = '';
    adminChatAutoResize(input);
    document.getElementById('adminTemplatesPanel').classList.remove('open');

    try {
        await ChatEngine.sendText(adminChatCandidateId, text);
    } catch(e) {
        showToast('Gagal mengirim', 'error');
    }
}

function adminChatKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        adminChatSend();
    }
}

function adminChatAutoResize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 100) + 'px';
}

// ── File/Image ──────────────────────────
function adminPickImage() { document.getElementById('adminChatImageInput').click(); }
function adminPickFile() { document.getElementById('adminChatFileInput').click(); }

async function adminHandleFile(input) {
    const file = input.files[0];
    if (!file || !adminChatCandidateId) return;
    input.value = '';

    if (file.size > 10 * 1024 * 1024) {
        showToast('File terlalu besar (max 10MB)', 'error');
        return;
    }

    try {
        await ChatEngine.sendFile(adminChatCandidateId, file);
    } catch(e) {
        showToast('Gagal mengirim file', 'error');
    }
}

// ── Location ────────────────────────────
async function adminSendLocation() {
    if (!adminChatCandidateId) return;
    try {
        await ChatEngine.sendLocation(adminChatCandidateId);
    } catch(e) {
        showToast('Gagal lokasi: ' + e, 'error');
    }
}

// ── Templates ───────────────────────────
const _demoTemplates = [
    { id:1, title:'Sapaan Awal', message:'Halo! Selamat datang di BAS Recruitment. Ada yang bisa kami bantu?' },
    { id:2, title:'Reminder Test Drive', message:'Halo {nama}, jangan lupa jadwal test drive Anda besok ya. Siapkan SIM dan KTP. Terima kasih!' },
    { id:3, title:'Pemberkasan Lengkap', message:'Selamat! Berkas Anda sudah lengkap. Tim kami akan segera memproses data Anda.' },
    { id:4, title:'Jadwal Interview', message:'Jadwal interview Anda: {tanggal} pukul {jam} WIB di {lokasi}. Harap datang 15 menit sebelumnya.' },
];

async function toggleAdminTemplates() {
    const panel = document.getElementById('adminTemplatesPanel');
    panel.classList.toggle('open');

    if (panel.classList.contains('open')) {
        const list = document.getElementById('adminTemplatesList');
        let templates = [];
        try {
            const res = await fetch('/driver/api/chat.php?action=templates', { credentials: 'include' });
            if (!res.ok) throw new Error('API error');
            const data = await res.json();
            templates = data.templates || [];
        } catch(e) {
            templates = _demoTemplates;
        }

        if (!templates.length) {
            list.innerHTML = '<div class="tpl-quick-empty">Belum ada template</div>';
        } else {
            list.innerHTML = templates.map(t => {
                const esc = typeof ChatEngine !== 'undefined' ? ChatEngine.escHtml : (s => s.replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c])));
                return `<div class="tpl-quick-item" onclick="useTemplate(\`${esc(t.message).replace(/`/g,'\\`')}\`)">
                    <div class="tpl-quick-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg></div>
                    <div class="tpl-quick-body">
                        <div class="tpl-quick-title">${esc(t.title)}</div>
                        <div class="tpl-quick-preview">${esc(t.message)}</div>
                    </div>
                </div>`;
            }).join('');
        }
    }
}

function useTemplate(msg) {
    // Smart variable replacement
    const convo = adminChatConversations.find(c => c.candidate_id == adminChatCandidateId);
    if (convo) {
        msg = msg.replace(/\{nama\}/gi, convo.candidate_name || '')
                 .replace(/\{armada\}/gi, convo.armada_type || '')
                 .replace(/\{lokasi\}/gi, [convo.kecamatan, convo.kabupaten].filter(Boolean).join(', ') || '')
                 .replace(/\{status\}/gi, convo.status || '')
                 .replace(/\{whatsapp\}/gi, convo.whatsapp || '')
                 .replace(/\{tanggal\}/gi, new Date().toLocaleDateString('id-ID', {day:'numeric',month:'long',year:'numeric'}));
    }
    document.getElementById('adminChatInput').value = msg;
    document.getElementById('adminTemplatesPanel').classList.remove('open');
    document.getElementById('adminChatInput').focus();
    adminChatAutoResize(document.getElementById('adminChatInput'));
}

// ── Template Manager ────────────────────
function openTemplateManager() {
    document.getElementById('adminTemplatesPanel').classList.remove('open');
    document.getElementById('templateManagerModal').style.display = 'flex';
    loadTemplateManager();
}

function closeTemplateManager() {
    document.getElementById('templateManagerModal').style.display = 'none';
}

async function loadTemplateManager() {
    let templates = [];
    try {
        const res = await fetch('/driver/api/chat.php?action=templates', { credentials: 'include' });
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        templates = data.templates || [];
    } catch(e) {
        templates = _demoTemplates;
    }

    const list = document.getElementById('templateManagerList');
    if (!templates.length) {
        list.innerHTML = `<div class="tpl-manager-empty">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
            <div>Belum ada template</div>
            <div style="font-size:0.72rem;margin-top:4px;">Buat template pertama Anda di bawah</div>
        </div>`;
        return;
    }

    const esc = typeof ChatEngine !== 'undefined' ? ChatEngine.escHtml : (s => s.replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c])));
    list.innerHTML = templates.map((t, i) => {
        const initials = t.title.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase();
        return `<div class="tpl-manager-item">
            <div class="tpl-manager-item-icon">${initials}</div>
            <div class="tpl-manager-item-body">
                <div class="tpl-manager-item-title">${esc(t.title)}</div>
                <div class="tpl-manager-item-msg">${esc(t.message)}</div>
            </div>
            <div class="tpl-manager-item-actions">
                <button class="tpl-action-btn delete" onclick="deleteTemplate(${t.id})" title="Hapus">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                </button>
            </div>
        </div>`;
    }).join('');
}

async function saveNewTemplate() {
    const title = document.getElementById('newTemplateTitle').value.trim();
    const message = document.getElementById('newTemplateMessage').value.trim();
    if (!title || !message) return showToast('Judul dan isi wajib diisi', 'error');

    try {
        const res = await fetch('/driver/api/chat.php?action=save_template', {
            method: 'POST', credentials: 'include',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ title, message })
        });
        if (!res.ok) throw new Error('API error');
        document.getElementById('newTemplateTitle').value = '';
        document.getElementById('newTemplateMessage').value = '';
        loadTemplateManager();
        showToast('Template berhasil disimpan ✓');
    } catch(e) {
        // Demo mode — simulate save
        _demoTemplates.push({ id: Date.now(), title, message });
        document.getElementById('newTemplateTitle').value = '';
        document.getElementById('newTemplateMessage').value = '';
        loadTemplateManager();
        showToast('Template berhasil disimpan ✓ (Demo)');
    }
}

async function deleteTemplate(id) {
    if (!confirm('Hapus template ini?')) return;
    try {
        const res = await fetch('/driver/api/chat.php?action=delete_template', {
            method: 'POST', credentials: 'include',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ id })
        });
        if (!res.ok) throw new Error('API error');
        loadTemplateManager();
        showToast('Template dihapus');
    } catch(e) {
        const idx = _demoTemplates.findIndex(t => t.id === id);
        if (idx >= 0) _demoTemplates.splice(idx, 1);
        loadTemplateManager();
        showToast('Template dihapus (Demo)');
    }
}

// ── Template Picker for modals ──────────
async function loadModalTemplates(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    // Keep first option
    select.innerHTML = '<option value="">— Pilih template (opsional) —</option>';

    let templates = [];
    try {
        const res = await fetch('/driver/api/chat.php?action=templates', { credentials: 'include' });
        if (!res.ok) throw new Error('');
        const data = await res.json();
        templates = data.templates || [];
    } catch(e) {
        templates = _demoTemplates;
    }

    templates.forEach((t, i) => {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = t.title;
        opt.dataset.title = t.title;
        opt.dataset.message = t.message;
        select.appendChild(opt);
    });
}

function applyMsgTemplate(selectEl, titleId, messageId) {
    const opt = selectEl.selectedOptions[0];
    if (!opt || !opt.dataset.message) return;
    if (titleId) {
        const titleInput = document.getElementById(titleId);
        if (titleInput) titleInput.value = opt.dataset.title || '';
    }
    if (messageId) {
        const msgInput = document.getElementById(messageId);
        if (msgInput) msgInput.value = opt.dataset.message || '';
    }
}

// ── Blast Chat from bulk action ─────────
function getSelectedCandidateIds() {
    return Array.from(document.querySelectorAll('.cand-checkbox:checked')).map(cb => parseInt(cb.value));
}

let _blastCandidateIds = [];

function blastChatMessage() {
    const selected = getSelectedCandidateIds();
    if (!selected.length) return showToast('Pilih kandidat dulu', 'error');

    _blastCandidateIds = selected;

    // Collect names
    const names = selected.map(cid => {
        const c = allCandidates.find(x => x.id === cid);
        return c ? c.name : '#' + cid;
    });

    document.getElementById('blastRecipientInfo').textContent =
        selected.length + ' penerima: ' +
        (names.length <= 3 ? names.join(', ') : names.slice(0,3).join(', ') + ' +' + (names.length-3) + ' lainnya');

    document.getElementById('blastMessage').value = '';
    document.getElementById('blastChatModal').style.display = 'flex';
    loadModalTemplates('blastTemplatePicker');
    document.getElementById('blastMessage').focus();
}

function closeBlastModal() {
    document.getElementById('blastChatModal').style.display = 'none';
    _blastCandidateIds = [];
}

async function sendBlastChat() {
    const message = document.getElementById('blastMessage').value.trim();
    if (!message) return showToast('Pesan tidak boleh kosong', 'error');
    if (!_blastCandidateIds.length) return showToast('Tidak ada penerima', 'error');

    const btn = document.getElementById('blastSendBtn');
    btn.disabled = true;
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> Mengirim...';

    try {
        const res = await fetch('/driver/api/chat.php?action=blast', {
            method: 'POST', credentials: 'include',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ candidate_ids: _blastCandidateIds, message })
        });
        const data = await res.json();
        if (data.ok) {
            showToast(`Pesan terkirim ke ${data.sent} kandidat ✓`);
            closeBlastModal();
        } else {
            showToast(data.error || 'Gagal', 'error');
        }
    } catch(e) {
        showToast('Gagal mengirim: ' + e.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Kirim ke Semua';
    }
}

// ── Admin Chat Badge ────────────────────
async function updateAdminChatBadge() {
    try {
        const count = await ChatEngine.getUnreadCount();
        const badge = document.getElementById('adminChatBadge');
        if (count > 0) {
            badge.textContent = count;
            badge.style.display = '';
        } else {
            badge.style.display = 'none';
        }
    } catch(e) {}
}

// Update badge every 10 seconds
setInterval(updateAdminChatBadge, 10000);
setTimeout(updateAdminChatBadge, 2000);

// ── Open chat from candidate detail ─────
function openChatForCandidate(candidateId, name) {
    openAdminChat();
    setTimeout(() => openAdminChatThread(candidateId, name), 300);
}

// ══════════════════════════════════════════════
// NIK TRACKER — Owner/Korlap melacak kandidat
// ══════════════════════════════════════════════
const TRACKER_CACHE_KEY = 'bas_admin_tracker_cache';

// Init: load cache on page load
(function initAdminTracker() {
    try {
        const cache = JSON.parse(localStorage.getItem(TRACKER_CACHE_KEY));
        if (cache && cache.nik && cache.data) {
            const inp = document.getElementById('trackerNikInput');
            if (inp) inp.value = cache.nik;
            renderTrackerResult(cache.data, cache.timestamp);
        }
    } catch(e) {}
})();

async function doTrackNik() {
    const input = document.getElementById('trackerNikInput');
    const nik = (input?.value || '').replace(/\D/g, '');

    if (nik.length !== 16) {
        showTrackerError('NIK harus 16 digit angka.');
        return;
    }

    document.getElementById('trackerLoading').style.display = '';
    document.getElementById('trackerResult').style.display = 'none';
    document.getElementById('trackerError').style.display = 'none';
    document.getElementById('trackerBtn').disabled = true;

    try {
        const res = await fetch(`${API_BASE}/candidates.php?nik=${encodeURIComponent(nik)}`, { credentials: 'include' });
        const data = await res.json();

        if (data.error) {
            showTrackerError(data.error);
            return;
        }

        const now = Date.now();
        localStorage.setItem(TRACKER_CACHE_KEY, JSON.stringify({ nik, data, timestamp: now }));
        _lastTrackedCandidateId = data.candidate?.id || null;
        _lastTrackedNik = nik;
        renderTrackerResult(data, now);

    } catch(e) {
        showTrackerError('Gagal terhubung ke server.');
    } finally {
        document.getElementById('trackerLoading').style.display = 'none';
        document.getElementById('trackerBtn').disabled = false;
    }
}

let _lastTrackedCandidateId = null;
let _lastTrackedNik = null;
let _trackingCenterInterval = null;
let _refreshedNiks = new Set(); // prevent infinite doTrackNik loop

async function requestLiveLocation() {
    if (!_lastTrackedCandidateId || !_lastTrackedNik) return;

    const btn = document.getElementById('requestLocationBtn');
    const c = JSON.parse(localStorage.getItem(TRACKER_CACHE_KEY) || '{}');
    const name = c?.data?.candidate?.name || '';

    try {
        const res = await fetch(`${API_BASE}/candidates.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ 
                action: 'request_track', 
                candidate_id: _lastTrackedCandidateId,
                name: name,
                nik: _lastTrackedNik
            })
        });
        const data = await res.json();
        if (btn) {
            btn.innerHTML = '✅ Ditambahkan ke antrian';
            btn.style.background = 'linear-gradient(135deg,#059669,#10b981)';
            setTimeout(() => {
                btn.innerHTML = '📡 Minta Lokasi Sekarang';
                btn.style.background = 'linear-gradient(135deg,#6366F1,#8B5CF6)';
            }, 2000);
        }
        showToast?.(data.message || 'Ditambahkan ke antrian', 'success');
    } catch(e) {
        if (btn) btn.innerHTML = '⚠️ Gagal mengirim';
        return;
    }

    // Start Tracking Center if not active
    showTrackingCenter();
    startTrackingPoller();
}

function showTrackingCenter() {
    const section = document.getElementById('trackingQueueSection');
    if (section) section.style.display = '';
}

function startTrackingPoller() {
    if (_trackingCenterInterval) return;
    pollActiveTracks();
    _trackingCenterInterval = setInterval(pollActiveTracks, 5000);
}

async function pollActiveTracks() {
    try {
        const res = await fetch(`${API_BASE}/candidates.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ action: 'get_active_tracks' })
        });
        const data = await res.json();
        if (data.tracks) {
            renderTrackingCenter(data.tracks);

            // Auto-refresh main tracker ONCE per received track (prevent infinite loop)
            data.tracks.forEach(t => {
                if (t.status === 'received' && t.candidate_nik === _lastTrackedNik && !_refreshedNiks.has(t.id + '')) {
                    _refreshedNiks.add(t.id + '');
                    doTrackNik();
                    showToast?.('📍 Lokasi ' + (t.candidate_name || t.candidate_nik) + ' diterima!', 'success');
                }
            });

            // Stop polling if no more pending (with grace period)
            const hasPending = data.tracks.some(t => t.status === 'pending');
            if (!hasPending && _trackingCenterInterval) {
                setTimeout(() => {
                    if (_trackingCenterInterval && !document.querySelector('[data-status="pending"]')) {
                        clearInterval(_trackingCenterInterval);
                        _trackingCenterInterval = null;
                    }
                }, 30000);
            }
        }
    } catch(e) {}
}

function renderTrackingCenter(tracks) {
    const tbody = document.getElementById('trackingQueueBody');
    const badge = document.getElementById('trackingQueueBadge');
    const section = document.getElementById('trackingQueueSection');
    if (!tbody) return;

    const pending = tracks.filter(t => t.status === 'pending').length;
    const received = tracks.filter(t => t.status === 'received').length;
    if (badge) badge.textContent = `${pending} menunggu · ${received} diterima`;

    if (tracks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--text-muted);">Belum ada permintaan pelacakan</td></tr>';
        if (section) section.style.display = 'none';
        return;
    }

    if (section) section.style.display = '';

    let html = '';
    tracks.forEach((t, i) => {
        const isPending = t.status === 'pending';
        const reqTime = new Date(t.requested_at);
        const reqStr = reqTime.toLocaleString('id-ID', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});

        // Elapsed time for pending
        let statusHtml = '';
        if (isPending) {
            const elapsed = Math.floor((Date.now() - reqTime.getTime()) / 1000);
            const mins = Math.floor(elapsed / 60);
            const secs = elapsed % 60;
            const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
            statusHtml = `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:8px;font-size:.75rem;font-weight:600;background:rgba(245,158,11,.12);color:#f59e0b;">
                <span style="width:6px;height:6px;border-radius:50%;background:#f59e0b;animation:pulse 2s infinite;"></span>
                Menunggu (${timeStr})
            </span>`;
        } else {
            const recTime = new Date(t.received_at).toLocaleString('id-ID', {hour:'2-digit',minute:'2-digit'});
            statusHtml = `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:8px;font-size:.75rem;font-weight:600;background:rgba(16,185,129,.12);color:#10b981;">
                <span style="width:6px;height:6px;border-radius:50%;background:#10b981;"></span>
                Diterima (${recTime})
            </span>`;
        }

        // Coordinates
        let coordHtml = '<span style="color:var(--text-muted);font-size:.8rem;">—</span>';
        if (t.latitude && t.longitude) {
            const mapsUrl = `https://www.google.com/maps?q=${t.latitude},${t.longitude}`;
            coordHtml = `<a href="${mapsUrl}" target="_blank" rel="noopener" style="font-family:monospace;font-size:.78rem;color:var(--accent);text-decoration:none;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">${t.latitude}, ${t.longitude}</a>
            ${t.accuracy ? '<div style="font-size:.68rem;color:var(--text-muted);">±' + Math.round(t.accuracy) + 'm</div>' : ''}`;
        }

        // Action
        let actionHtml = '';
        if (isPending) {
            actionHtml = `<button onclick="cancelSingleTrack(${t.id})" style="padding:4px 10px;background:none;border:1px solid var(--border-color);border-radius:6px;color:var(--text-muted);font-size:.75rem;cursor:pointer;transition:all .15s;" onmouseover="this.style.borderColor='#ef4444';this.style.color='#ef4444'" onmouseout="this.style.borderColor='var(--border-color)';this.style.color='var(--text-muted)'">Batalkan</button>`;
        } else if (t.latitude) {
            const mapsUrl = `https://www.google.com/maps?q=${t.latitude},${t.longitude}`;
            actionHtml = `<a href="${mapsUrl}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;background:linear-gradient(135deg,#EA4335,#34A853);color:#fff;border-radius:6px;text-decoration:none;font-size:.75rem;font-weight:600;transition:opacity .2s;" onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                Maps
            </a>`;
        }

        const rowBg = isPending ? 'background:rgba(245,158,11,.04);' : 'background:rgba(16,185,129,.04);';
        html += `<tr data-status="${t.status}" style="transition:background .15s;${rowBg}">
            <td style="text-align:center;font-size:.82rem;color:var(--text-muted);">${i + 1}</td>
            <td style="font-weight:600;font-size:.85rem;">${t.candidate_name || '-'}</td>
            <td style="font-family:monospace;font-size:.82rem;">${t.candidate_nik}</td>
            <td>${statusHtml}</td>
            <td style="font-size:.82rem;color:var(--text-muted);">${reqStr}</td>
            <td>${coordHtml}</td>
            <td style="text-align:center;">${actionHtml}</td>
        </tr>`;
    });
    tbody.innerHTML = html;
}

async function cancelSingleTrack(trackId) {
    try {
        await fetch(`${API_BASE}/candidates.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ action: 'cancel_track', track_id: trackId })
        });
        pollActiveTracks(); // refresh
    } catch(e) {}
}

function cancelTrackRequest() {
    // Only reset the button UI — DON'T kill the whole poller
    // (other tracks may still be pending)
    const btn = document.getElementById('requestLocationBtn');
    if (btn) {
        btn.disabled = false;
        btn.style.background = 'linear-gradient(135deg,#6366F1,#8B5CF6)';
        btn.innerHTML = '📡 Minta Lokasi Sekarang';
    }
}

async function loadLocationHistory(candidateId) {
    try {
        const res = await fetch(`${API_BASE}/candidates.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ action: 'get_location_history', candidate_id: candidateId })
        });
        const data = await res.json();
        if (data.history && data.history.length > 0) {
            renderLocationHistory(data.history);
        }
    } catch(e) {}
}

function renderLocationHistory(history) {
    const container = document.getElementById('locationHistoryContainer');
    if (!container) return;

    let html = `<div style="font-size:.75rem;color:var(--text-muted);font-weight:600;margin-bottom:8px;">📋 RIWAYAT LOKASI (${history.length})</div>`;
    html += '<div style="max-height:200px;overflow-y:auto;scrollbar-width:thin;">';

    history.forEach((loc, i) => {
        const time = new Date(loc.created_at).toLocaleString('id-ID', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
        const acc = loc.accuracy ? `±${Math.round(loc.accuracy)}m` : '';
        const mapsUrl = `https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`;
        const isFirst = i === 0;

        html += `<a href="${mapsUrl}" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;text-decoration:none;transition:background .2s;${isFirst ? 'background:rgba(99,102,241,.1);' : ''}" onmouseover="this.style.background='var(--bg-tertiary)'" onmouseout="this.style.background='${isFirst ? 'rgba(99,102,241,.1)' : 'transparent'}'">
            <div style="width:8px;height:8px;border-radius:50%;background:${isFirst ? '#10b981' : 'var(--border-color)'};flex-shrink:0;"></div>
            <div style="flex:1;min-width:0;">
                <div style="font-family:monospace;font-size:.78rem;color:${isFirst ? 'var(--accent)' : 'var(--text-primary)'};">${loc.latitude}, ${loc.longitude}</div>
                <div style="font-size:.7rem;color:var(--text-muted);">${time} ${acc ? '· ' + acc : ''}</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </a>`;
    });

    html += '</div>';
    container.innerHTML = html;
    container.style.display = '';
}

function showTrackerError(msg) {
    document.getElementById('trackerLoading').style.display = 'none';
    document.getElementById('trackerResult').style.display = 'none';
    const el = document.getElementById('trackerError');
    el.style.display = '';
    el.innerHTML = `<div style="color:#ef4444;font-size:.9rem;">⚠️ ${msg}</div>`;
    document.getElementById('trackerBtn').disabled = false;
}

function renderTrackerResult(data, timestamp) {
    const c = data.candidate;
    if (!c) return;

    const docs = data.documents || [];

    // Status pipeline
    const stages = [
        { label: 'Pendaftaran', icon: '📝' },
        { label: 'Pemberkasan', icon: '📁' },
        { label: 'Interview',   icon: '🗣️' },
        { label: 'Test Drive',  icon: '🚛' },
        { label: 'Diterima',    icon: '✅' }
    ];

    const status = (c.status || '').toLowerCase();
    let activeIdx = 0;
    if (status.includes('blacklist') || status.includes('ditolak') || status.includes('gagal') || status.includes('tidak')) {
        activeIdx = -1;
    } else if (status.includes('diterima') || status.includes('aktif') || status.includes('lolos')) {
        activeIdx = 4;
    } else if (status.includes('test') || status.includes('drive')) {
        activeIdx = 3;
    } else if (status.includes('interview') || status.includes('jadwal')) {
        activeIdx = 2;
    } else if (status.includes('berkas') || status.includes('lengkap') || status.includes('proses')) {
        activeIdx = 1;
    }

    let statusColor = 'var(--accent)';
    let statusBg = 'rgba(59,130,246,0.12)';
    if (activeIdx === -1) { statusColor = '#ef4444'; statusBg = 'rgba(239,68,68,0.12)'; }
    else if (activeIdx >= 4) { statusColor = '#10b981'; statusBg = 'rgba(16,185,129,0.12)'; }

    // Timeline
    let timeline = '<div style="display:flex;align-items:flex-start;gap:0;padding:20px 24px 16px;">';
    stages.forEach((s, i) => {
        const done = activeIdx >= 0 && i <= activeIdx;
        const cur = i === activeIdx;
        const dotBg = done ? 'var(--accent)' : 'transparent';
        const dotBorder = done ? 'var(--accent)' : 'var(--border-color)';
        const lineBg = (activeIdx >= 0 && i < activeIdx) ? 'var(--accent)' : 'var(--border-color)';
        const txtCol = done ? 'var(--text-primary)' : 'var(--text-muted)';
        const fw = cur ? '700' : '400';
        const sz = cur ? 30 : 22;

        timeline += `<div style="flex:1;text-align:center;">
            <div style="width:${sz}px;height:${sz}px;border-radius:50%;background:${dotBg};border:2.5px solid ${dotBorder};margin:0 auto;display:flex;align-items:center;justify-content:center;transition:all .3s;${cur ? 'box-shadow:0 0 0 4px ' + statusBg : ''}">
                ${done ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
            </div>
            <div style="font-size:.72rem;margin-top:6px;color:${txtCol};font-weight:${fw};line-height:1.3;">${s.icon}<br>${s.label}</div>
        </div>`;
        if (i < stages.length - 1) {
            timeline += `<div style="flex:0.6;height:2.5px;background:${lineBg};margin-top:${cur ? 14 : 10}px;border-radius:2px;transition:all .3s;"></div>`;
        }
    });
    timeline += '</div>';

    // Info grid — enhanced with full address + WA link + Maps
    const waNum = c.whatsapp ? String(c.whatsapp).replace(/\D/g,'') : '';
    const waLink = waNum ? `<a href="https://wa.me/${waNum.startsWith('0') ? '62' + waNum.substring(1) : waNum}" target="_blank" style="color:var(--accent);text-decoration:none;font-weight:600;">${escapeHtml(c.whatsapp)} 📱</a>` : null;

    // Build full address string
    const addrParts = [c.address, c.kelurahan, c.kecamatan, c.kabupaten, c.provinsi].filter(Boolean);
    const fullAddr = addrParts.join(', ');
    const mapsUrl = fullAddr ? `https://www.google.com/maps/search/${encodeURIComponent(fullAddr)}` : '';

    const rows = [
        ['Nama', c.name],
        ['NIK', c.nik],
        ['Status', c.status, statusColor, statusBg],
        ['Armada', c.armada_type],
        ['SIM', c.sim_type],
        ['WhatsApp', waLink, null, null, true],
        ['Lokasi Interview', c.location_name || c.interview_location],
        ['Jadwal Interview', c.jadwal_interview],
        ['Test Drive', c.test_drive_date],
        ['Tempat Lahir', c.tempat_lahir],
        ['Tanggal Lahir', c.tanggal_lahir],
        ['Pendidikan', c.pendidikan_terakhir],
        ['Dokumen', docs.length ? docs.length + ' file terupload' : 'Belum ada'],
        ['Terdaftar', c.created_at ? new Date(c.created_at).toLocaleDateString('id-ID', {day:'numeric',month:'long',year:'numeric'}) : null]
    ].filter(r => r[1]);

    let info = '<div style="padding:0 24px 20px;display:grid;grid-template-columns:1fr 1fr;gap:0;">';
    rows.forEach(([label, value, color, bg, isHtml]) => {
        const valStyle = color
            ? `background:${bg};color:${color};padding:3px 10px;border-radius:8px;font-weight:600;font-size:.8rem;display:inline-block;`
            : 'color:var(--text-primary);';
        const display = isHtml ? value : escapeHtml(String(value));
        info += `<div style="padding:10px 0;border-bottom:1px solid var(--border-color);">
            <div style="font-size:.75rem;color:var(--text-muted);margin-bottom:2px;">${label}</div>
            <div style="font-size:.88rem;${valStyle}">${display}</div>
        </div>`;
    });
    info += '</div>';

    // Full Address Card with Maps button — GPS or address fallback
    let addrCard = '';
    const hasGps = c.last_latitude && c.last_longitude;
    const gpsUrl = hasGps ? `https://www.google.com/maps?q=${c.last_latitude},${c.last_longitude}` : '';
    const lastSeen = c.last_location_at ? new Date(c.last_location_at).toLocaleString('id-ID', {day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : null;
    const accMeters = c.last_accuracy ? Math.round(c.last_accuracy) : null;

    // "Minta Lokasi" button + cancel
    let requestBtn = `<div style="margin:0 24px 12px;">
        <div style="display:flex;gap:8px;">
            <button id="requestLocationBtn" onclick="requestLiveLocation()"
                style="flex:1;padding:12px 20px;background:linear-gradient(135deg,#6366F1,#8B5CF6);color:#fff;border:none;border-radius:10px;font-size:.88rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:all .2s;box-shadow:0 2px 10px rgba(99,102,241,.3);"
                onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">
                📡 Minta Lokasi Sekarang
            </button>
            <button onclick="cancelTrackRequest()" title="Batalkan"
                style="padding:12px 14px;background:var(--bg-secondary);color:var(--text-muted);border:1px solid var(--border-color);border-radius:10px;font-size:.88rem;cursor:pointer;transition:all .2s;"
                onmouseover="this.style.borderColor='#ef4444';this.style.color='#ef4444'" onmouseout="this.style.borderColor='var(--border-color)';this.style.color='var(--text-muted)'">
                ✕
            </button>
        </div>
        <div style="font-size:.7rem;color:var(--text-muted);text-align:center;margin-top:4px;">User harus sedang membuka halaman pendaftaran · Menunggu tanpa batas waktu</div>
    </div>`;

    if (hasGps || fullAddr) {
        addrCard += `<div style="margin:0 24px 16px;padding:14px 16px;background:var(--bg-secondary);border-radius:12px;border:1px solid var(--border-color);">`;

        // GPS Live Location
        if (hasGps) {
            addrCard += `
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
                <div style="width:10px;height:10px;border-radius:50%;background:#10b981;box-shadow:0 0 6px #10b981;animation:pulse 2s infinite;"></div>
                <div style="font-size:.75rem;color:var(--text-muted);font-weight:600;">📡 LOKASI TERAKHIR (GPS)</div>
            </div>
            <div style="font-size:.88rem;color:var(--text-primary);margin-bottom:4px;">
                <div style="font-family:monospace;font-size:.82rem;color:var(--accent);">${c.last_latitude}, ${c.last_longitude}</div>
                ${lastSeen ? '<div style="font-size:.75rem;color:var(--text-muted);margin-top:4px;">🕒 Terakhir online: ' + lastSeen + '</div>' : ''}
                ${accMeters ? '<div style="font-size:.75rem;color:var(--text-muted);">📏 Akurasi: ±' + accMeters + ' meter</div>' : ''}
            </div>
            <a href="${gpsUrl}" target="_blank" rel="noopener"
               style="display:inline-flex;align-items:center;gap:6px;margin-top:10px;padding:10px 20px;background:linear-gradient(135deg,#EA4335,#FBBC05,#34A853,#4285F4);color:#fff;border-radius:10px;text-decoration:none;font-size:.88rem;font-weight:700;transition:opacity .2s;box-shadow:0 2px 8px rgba(0,0,0,.15);"
               onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                Buka Lokasi di Google Maps
            </a>`;
        }

        // Address info
        if (fullAddr) {
            addrCard += `
            <div style="${hasGps ? 'margin-top:16px;padding-top:12px;border-top:1px solid var(--border-color);' : ''}">
                <div style="font-size:.75rem;color:var(--text-muted);margin-bottom:6px;font-weight:600;">📍 ALAMAT TERDAFTAR</div>
                <div style="font-size:.85rem;color:var(--text-primary);line-height:1.6;">
                    ${c.address ? '<div>' + escapeHtml(c.address) + '</div>' : ''}
                    ${c.kelurahan ? '<span style="font-size:.78rem;color:var(--text-muted);">Kel. </span>' + escapeHtml(c.kelurahan) : ''}
                    ${c.kecamatan ? '<span style="font-size:.78rem;color:var(--text-muted);margin-left:4px;">Kec. </span>' + escapeHtml(c.kecamatan) : ''}
                    ${c.kabupaten ? '<div><span style="font-size:.78rem;color:var(--text-muted);">Kab/Kota </span>' + escapeHtml(c.kabupaten) + '</div>' : ''}
                    ${c.provinsi ? '<div><span style="font-size:.78rem;color:var(--text-muted);">Prov. </span>' + escapeHtml(c.provinsi) + '</div>' : ''}
                </div>
                ${!hasGps ? `<a href="${mapsUrl}" target="_blank" rel="noopener"
                   style="display:inline-flex;align-items:center;gap:6px;margin-top:8px;padding:8px 16px;background:linear-gradient(135deg,#4285F4,#34A853);color:#fff;border-radius:8px;text-decoration:none;font-size:.82rem;font-weight:600;"
                   onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    Cari di Google Maps
                </a>` : ''}
            </div>`;
        }

        addrCard += '</div>';
    }

    // Location History container
    let historyCard = `<div id="locationHistoryContainer" style="display:none;margin:0 24px 16px;padding:14px 16px;background:var(--bg-secondary);border-radius:12px;border:1px solid var(--border-color);"></div>`;

    // Korlap notes
    let notes = '';
    if (c.korlap_notes) {
        notes = `<div style="margin:0 24px 20px;padding:12px 16px;background:var(--bg-secondary);border-radius:10px;border-left:3px solid var(--accent);">
            <div style="font-size:.75rem;color:var(--text-muted);margin-bottom:4px;font-weight:600;">📋 CATATAN KORLAP</div>
            <div style="font-size:.88rem;color:var(--text-primary);line-height:1.5;">${escapeHtml(c.korlap_notes)}</div>
        </div>`;
    }

    const el = document.getElementById('trackerResult');
    el.innerHTML = timeline + info + requestBtn + addrCard + historyCard + notes;
    el.style.display = '';
    document.getElementById('trackerError').style.display = 'none';
    document.getElementById('trackerLoading').style.display = 'none';

    // Auto-load location history if GPS data exists
    if (hasGps && _lastTrackedCandidateId) {
        loadLocationHistory(_lastTrackedCandidateId);
    }

    // Cache hint
    const hint = document.getElementById('trackerCacheHint');
    const time = document.getElementById('trackerCacheTime');
    if (hint && timestamp) {
        hint.style.display = '';
        time.textContent = new Date(timestamp).toLocaleTimeString('id-ID');
    }
}
