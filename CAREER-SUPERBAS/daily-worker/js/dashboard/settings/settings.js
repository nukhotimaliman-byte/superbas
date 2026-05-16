/**
 * BAS Daily Worker — Settings Page Module
 * Theme toggle, account info, logout
 */

function renderSettings() {
  var container = document.getElementById('settingsContent');
  if (!container) return;
  var isDark = document.body.classList.contains('dark-mode');

  var h = '<div style="padding:16px;">';

  // Appearance section
  h += '<div class="set-section">' +
    '<div class="set-section-title">Tampilan</div>' +
    '<div class="set-row">' +
      '<div class="set-row-left">' +
        '<div class="set-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg></div>' +
        '<div><div class="set-label">Mode Gelap</div><div class="set-desc">Tampilan lebih nyaman di malam hari</div></div>' +
      '</div>' +
      '<label class="set-toggle">' +
        '<input type="checkbox" id="darkModeToggle" ' + (isDark ? 'checked' : '') + ' onchange="toggleDarkMode(this.checked)">' +
        '<span class="set-toggle-slider"></span>' +
      '</label>' +
    '</div>' +
  '</div>';

  // Account section
  h += '<div class="set-section">' +
    '<div class="set-section-title">Akun</div>' +
    '<div class="set-row">' +
      '<div class="set-row-left">' +
        '<div class="set-icon set-icon-info"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>' +
        '<div><div class="set-label">' + USER_DATA.nama + '</div><div class="set-desc">' + (USER_DATA.ops_id || 'Belum ada OPS ID') + '</div></div>' +
      '</div>' +
    '</div>' +
  '</div>';

  // Logout
  h += '<button class="set-logout" onclick="doLogout()">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>' +
    'Keluar dari Akun</button>';

  h += '</div>';
  container.innerHTML = h;
}

function doLogout() {
  if (confirm('Yakin ingin keluar dari akun?')) {
    if (typeof handleUserLogout === 'function') { handleUserLogout(); }
    else { localStorage.clear(); sessionStorage.clear(); window.location.href = 'login.html'; }
  }
}
