/* ═══════════════════════════════════════════════════
   Shell v2 — Tab Navigation Layout
   ═══════════════════════════════════════════════════ */

const icons = {
  dashboard: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  upload: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
  data: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>',
  korlap: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>',
  export: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  logout: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
};

export function renderShell(user) {
  const isAdmin = user.role === 'owner' || user.role === 'admin';

  return `
    <div class="shell">
      <!-- Header -->
      <header class="shell-header">
        <div class="shell-brand">
          <div class="shell-logo">KS</div>
          <div>
            <div class="shell-title">Data KalSul</div>
            <div class="shell-subtitle">Super-BAS Admin</div>
          </div>
        </div>

        <!-- Tab Navigation -->
        <nav class="shell-tabs" id="main-tabs">
          <a href="#/" class="tab-item active" data-route="/">
            ${icons.dashboard}<span>Dashboard</span>
          </a>
          <a href="#/upload" class="tab-item" data-route="/upload">
            ${icons.upload}<span>Upload Data</span>
          </a>
          <a href="#/data" class="tab-item" data-route="/data">
            ${icons.data}<span>Data Karyawan</span>
          </a>
          ${isAdmin ? `
          <a href="#/korlap" class="tab-item" data-route="/korlap">
            ${icons.korlap}<span>Kelola Korlap</span>
          </a>` : ''}
        </nav>

        <!-- User info -->
        <div class="shell-user">
          <div class="shell-user-info">
            <span class="shell-user-name">${user.name}</span>
            <span class="shell-user-role">${user.role}${user.station ? ' · ' + user.station : ''}</span>
          </div>
          <button class="btn-icon" id="btn-logout" title="Logout">${icons.logout}</button>
        </div>
      </header>

      <!-- Content -->
      <main class="shell-content" id="page-content">
        <!-- Pages render here -->
      </main>
    </div>
  `;
}

export function initShellEvents(onLogout) {
  document.getElementById('btn-logout')?.addEventListener('click', onLogout);
}

export function setActiveTab(route) {
  document.querySelectorAll('.tab-item').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.route === route);
  });
}
