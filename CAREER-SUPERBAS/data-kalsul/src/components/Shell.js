/* ═══════════════════════════════════════════════════
   Shell v3 — Super Owner Style (Header + Sidebar)
   Clean, no emoji, collapsible sidebar
   ═══════════════════════════════════════════════════ */

export function renderShell(user) {
  const isKorlap = user?.role === 'korlap';
  return `
    <header class="hdr">
      <div class="hdr-in">
        <div class="hdr-left">
          <button class="sidebar-toggle" id="sidebarToggle" title="Toggle sidebar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <div class="hdr-logo">KS</div>
          <div class="hdr-divider"></div>
          <span class="hdr-title">Data KalSul</span>
        </div>
        <div class="hdr-right">
          <span class="hdr-clock" id="clock"></span>
          <div class="hdr-divider"></div>
          <span class="hdr-user">${user?.name || 'User'}</span>
          <button class="hdr-btn" id="btn-logout" title="Logout">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </div>
    </header>

    <aside class="sidebar" id="sidebar">
      <nav class="sidebar-nav">
        <div class="sidebar-section-label">Main</div>
        <a href="#/" class="sidebar-item active" data-tab="/" data-tooltip="Dashboard">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
          <span>Dashboard</span>
        </a>
        <a href="#/upload" class="sidebar-item" data-tab="/upload" data-tooltip="Upload Data">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <span>Upload Data</span>
        </a>
        <a href="#/data" class="sidebar-item" data-tab="/data" data-tooltip="Data Karyawan">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
          <span>Data Karyawan</span>
        </a>
        <a href="#/search" class="sidebar-item" data-tab="/search" data-tooltip="Cari Data">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <span>Cari Data</span>
        </a>
        ${!isKorlap ? `
        <div class="sidebar-section-label">System</div>
        <a href="#/korlap" class="sidebar-item" data-tab="/korlap" data-tooltip="Kelola Korlap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
          <span>Kelola Korlap</span>
        </a>` : ''}
      </nav>
      <div class="sidebar-footer">
        <div class="sidebar-version">KalSul v2.0</div>
      </div>
    </aside>

    <div class="main">
      <div class="shell-content" id="page-content"></div>
    </div>
  `;
}

export function initShellEvents(logoutFn) {
  document.getElementById('btn-logout')?.addEventListener('click', logoutFn);
  
  // Sidebar toggle (desktop = collapse, mobile = slide)
  document.getElementById('sidebarToggle')?.addEventListener('click', () => {
    const sb = document.getElementById('sidebar');
    if (window.innerWidth > 1024) {
      sb?.classList.toggle('collapsed');
      document.body.classList.toggle('sidebar-collapsed');
    } else {
      sb?.classList.toggle('mobile-open');
    }
  });
  
  // Close sidebar on nav click (mobile)
  document.querySelectorAll('.sidebar-item').forEach(item => {
    item.addEventListener('click', () => {
      if (window.innerWidth <= 1024) {
        document.getElementById('sidebar')?.classList.remove('mobile-open');
      }
    });
  });
  
  // Clock
  function updateClock() {
    const el = document.getElementById('clock');
    if (el) el.textContent = new Date().toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit',second:'2-digit'});
  }
  updateClock();
  setInterval(updateClock, 1000);
}

export function setActiveTab(hash) {
  document.querySelectorAll('.sidebar-item').forEach(item => {
    item.classList.toggle('active', item.dataset.tab === hash);
  });
}
