/* ═══════════════════════════════════════════════════
   Shell v3 — Sidebar Navigation
   ═══════════════════════════════════════════════════ */

export function renderShell(user) {
  const isKorlap = user?.role === 'korlap';
  return `
    <div class="shell">
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-brand">
          <div class="sidebar-logo">KS</div>
          <div>
            <div class="sidebar-title">Data KalSul</div>
            <div class="sidebar-subtitle">Super-BAS Admin</div>
          </div>
        </div>

        <nav class="sidebar-nav">
          <a href="#/" class="nav-item active" data-tab="/">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            <span>Dashboard</span>
          </a>
          <a href="#/upload" class="nav-item" data-tab="/upload">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <span>Upload Data</span>
          </a>
          <a href="#/data" class="nav-item" data-tab="/data">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            <span>Data Karyawan</span>
          </a>
          ${!isKorlap ? `
          <a href="#/korlap" class="nav-item" data-tab="/korlap">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
            <span>Kelola Korlap</span>
          </a>` : ''}
        </nav>

        <div class="sidebar-footer">
          <div class="sidebar-user">
            <div class="sidebar-avatar">${(user?.name || 'A').charAt(0).toUpperCase()}</div>
            <div class="sidebar-user-info">
              <span class="sidebar-user-name">${user?.name || 'User'}</span>
              <span class="sidebar-user-role">${user?.role || 'admin'}</span>
            </div>
          </div>
          <button class="btn-logout" id="btn-logout" title="Logout">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </aside>

      <main class="main-area">
        <div class="main-header" id="main-header">
          <button class="btn-hamburger" id="btn-hamburger">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
        </div>
        <div class="shell-content" id="page-content"></div>
      </main>
    </div>
  `;
}

export function initShellEvents(logoutFn) {
  document.getElementById('btn-logout')?.addEventListener('click', logoutFn);
  
  // Mobile hamburger
  document.getElementById('btn-hamburger')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.toggle('open');
  });
  
  // Close sidebar on nav click (mobile)
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.remove('open');
    });
  });
}

export function setActiveTab(hash) {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.tab === hash);
  });
}
