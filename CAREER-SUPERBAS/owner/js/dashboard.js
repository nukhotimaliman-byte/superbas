/**
 * BAS Command Center — Dashboard v1.0
 * Main initialization (modules loaded via script tags)
 */
(async function(){
  // Theme & clock
  initTheme();
  startClock();

  // Auth check — redirect if not logged in
  const user = await checkAuth();
  if (!user) return;

  // Init all UI modules
  initTabs();
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
    if (!d.logged_in) { window.location.href = 'index.html'; return null; }
    Q('#userName').textContent = d.name;
    return d;
  } catch(e) {
    window.location.href = 'index.html';
    return null;
  }
}

function initLogout(){
  Q('#logoutBtn').addEventListener('click', async () => {
    try { await api('auth.php?action=logout', { method: 'POST' }); } catch(e) {}
    window.location.href = 'index.html';
  });
}

/* ── Tab Navigation ──────────────────────────────────── */
function initTabs(){
  QQ('.tab').forEach(t => t.addEventListener('click', () => {
    QQ('.tab').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    QQ('.panel').forEach(p => p.classList.remove('active'));
    const p = Q('#panel-' + t.dataset.tab);
    if (p) p.classList.add('active');

    // Lazy-load panel data
    const tab = t.dataset.tab;
    if (tab === 'candidates' && !window._cL) { loadCandidates(); window._cL = 1; }
    if (tab === 'blacklist'  && !window._bL) { loadBlacklist();  window._bL = 1; }
    if (tab === 'analytics'  && !window._aL) { loadAnalytics();  window._aL = 1; }
    if (tab === 'settings'   && !window._sL) { loadSettings();   window._sL = 1; }
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
