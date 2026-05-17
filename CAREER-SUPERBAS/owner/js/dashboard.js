/**
 * BAS Command Center — Dashboard v2.0
 * Sidebar layout · Main initialization
 */
(async function(){
  // Theme & clock
  initTheme();
  startClock();

  // Auth check — redirect if not logged in
  const user = await checkAuth();
  if (!user) return;

  // Init all UI modules
  initSidebar();
  initSettingsNav();
  initModalClose();
  initLogout();
  initCandidates();
  initExport();
  initBlacklist();
  initSettingsSave();

  // Load overview data (default panel)
  loadOverview();
})();

/* ── Theme Toggle ───────────────────────────────────── */
function initTheme(){
  const saved = localStorage.getItem('bas-theme') || 'dark';
  if (saved === 'light') document.documentElement.setAttribute('data-theme', 'light');
  updateThemeIcons();
  Q('#themeToggle').addEventListener('click', () => {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    if (isLight) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('bas-theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('bas-theme', 'light');
    }
    updateThemeIcons();
    // Re-render active panel charts with new theme colors
    setTimeout(() => {
      const active = document.querySelector('.sidebar-item.active');
      if (active) {
        const view = active.dataset.view;
        if (view === 'overview') loadOverview();
        else if (view === 'analytics') loadAnalytics();
      }
    }, 100);
  });
}

function updateThemeIcons(){
  const light = document.documentElement.getAttribute('data-theme') === 'light';
  const dk = Q('#themeToggle .ic-dark'), lt = Q('#themeToggle .ic-light');
  if (dk) dk.style.display = light ? 'none' : 'block';
  if (lt) lt.style.display = light ? 'block' : 'none';
}

/* ── Live Clock ─────────────────────────────────────── */
function startClock(){
  const el = Q('#clock');
  const tick = () => {
    const d = new Date();
    el.textContent = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
      + '  ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  tick();
  setInterval(tick, 1000);
}

/* ── Auth ────────────────────────────────────────────── */
async function checkAuth(){
  try {
    const d = await api('auth.php?action=check');
    if (!d.logged_in) { window.location.href = 'index'; return null; }
    Q('#userName').textContent = d.name;
    return d;
  } catch(e) {
    window.location.href = 'index';
    return null;
  }
}

function initLogout(){
  Q('#logoutBtn').addEventListener('click', async () => {
    try { await api('auth.php?action=logout', { method: 'POST' }); } catch(e) {}
    window.location.href = 'index';
  });
}

/* ── Sidebar Navigation ──────────────────────────────── */
function initSidebar(){
  const sidebar = Q('#sidebar');
  const toggleBtn = Q('#sidebarToggle');
  const isMobile = () => window.innerWidth <= 1024;

  // Collapse state from localStorage
  const collapsed = localStorage.getItem('bas-sidebar') === 'collapsed';
  if (collapsed && !isMobile()) sidebar.classList.add('collapsed');

  // Toggle button
  toggleBtn.addEventListener('click', () => {
    if (isMobile()) {
      sidebar.classList.toggle('mobile-open');
    } else {
      sidebar.classList.toggle('collapsed');
      localStorage.setItem('bas-sidebar', sidebar.classList.contains('collapsed') ? 'collapsed' : 'expanded');
    }
  });

  // Close mobile sidebar when clicking outside
  document.addEventListener('click', e => {
    if (isMobile() && sidebar.classList.contains('mobile-open')
        && !sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
      sidebar.classList.remove('mobile-open');
    }
  });

  // Navigation items
  QQ('.sidebar-item').forEach(item => item.addEventListener('click', () => {
    QQ('.sidebar-item').forEach(x => x.classList.remove('active'));
    item.classList.add('active');
    QQ('.panel').forEach(p => p.classList.remove('active'));
    const p = Q('#panel-' + item.dataset.tab);
    if (p) p.classList.add('active');

    // Close mobile sidebar after selection
    if (isMobile()) sidebar.classList.remove('mobile-open');

    // Lazy-load panel data
    const tab = item.dataset.tab;
    if (tab === 'candidates'   && !window._cL) { loadCandidates(); window._cL = 1; }
    if (tab === 'blacklist'    && !window._bL) { loadBlacklist();  window._bL = 1; }
    if (tab === 'analytics'    && !window._aL) { loadAnalytics();  window._aL = 1; }
    if (tab === 'settings'     && !window._sL) { loadSettings();   window._sL = 1; }
    if (tab === 'linktree'     && !window._ltL) { loadLinktree();  window._ltL = 1; }
    if (tab === 'quick-access' && !window._qL) { renderQuickAccess(); window._qL = 1; }
  }));
}

/* ── Settings Sub-Navigation ─────────────────────────── */
function initSettingsNav(){
  const nav = Q('#settingsNav');
  if (!nav) return;
  nav.addEventListener('click', e => {
    const btn = e.target.closest('.settings-nav-item');
    if (!btn) return;
    QQ('.settings-nav-item').forEach(x => x.classList.remove('active'));
    btn.classList.add('active');
    QQ('.settings-panel').forEach(p => p.classList.remove('active'));
    const panel = Q('#' + btn.dataset.section);
    if (panel) panel.classList.add('active');
  });
}

/* ── Modal Close ─────────────────────────────────────── */
function initModalClose(){
  Q('#modalClose').addEventListener('click', closeModal);
  Q('#modalOverlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });
}
