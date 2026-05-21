/* ═══════════════════════════════════════════════════
   Data KalSul v2 — Main Entry Point
   ═══════════════════════════════════════════════════ */
import './index.css';
import { api } from './utils/api.js';
import { renderShell, initShellEvents, setActiveTab } from './components/Shell.js';
import { renderDashboard, initDashboard } from './pages/Dashboard.js';
import { renderUpload, initUpload } from './pages/Upload.js';
import { renderDataTable, initDataTable } from './pages/DataTable.js';
import { renderKorlap, initKorlap } from './pages/Korlap.js';

let currentUser = null;

async function init() {
  try {
    const res = await api.me();
    currentUser = res.user;
    renderApp();
  } catch {
    renderLogin();
  }
}

function renderLogin() {
  document.getElementById('app').innerHTML = `
    <div class="login-page">
      <div class="login-card">
        <div class="login-header">
          <h1 class="login-title">DATA KALSUL</h1>
          <p class="login-subtitle">Kalimantan & Sulawesi Data Management</p>
        </div>
        <div id="login-error" class="alert-error" style="display:none"></div>
        <div class="field-group">
          <label class="field-label">Username</label>
          <input type="text" class="input" id="login-user" placeholder="Username" autofocus />
        </div>
        <div class="field-group">
          <label class="field-label">Password</label>
          <input type="password" class="input" id="login-pass" placeholder="••••••••" />
        </div>
        <button class="btn btn-primary btn-block" id="btn-login">Masuk</button>
        <p class="login-footer">Super-BAS © 2026</p>
      </div>
    </div>
  `;

  document.getElementById('btn-login')?.addEventListener('click', doLogin);
  document.getElementById('login-pass')?.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  document.getElementById('login-user')?.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('login-pass')?.focus(); });
}

async function doLogin() {
  const username = document.getElementById('login-user')?.value.trim();
  const password = document.getElementById('login-pass')?.value;
  const errEl = document.getElementById('login-error');

  if (!username || !password) {
    errEl.textContent = 'Username dan password harus diisi';
    errEl.style.display = 'block';
    return;
  }

  try {
    const res = await api.login(username, password);
    currentUser = res.user;
    renderApp();
  } catch (err) {
    errEl.textContent = err.message || 'Login gagal';
    errEl.style.display = 'block';
  }
}

function renderApp() {
  document.getElementById('app').innerHTML = renderShell(currentUser);
  initShellEvents(doLogout);
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}

async function doLogout() {
  try { await api.logout(); } catch {}
  currentUser = null;
  renderLogin();
}

async function handleRoute() {
  const hash = window.location.hash.replace('#', '') || '/';
  const content = document.getElementById('page-content');
  if (!content) return;

  setActiveTab(hash);
  content.className = 'shell-content page-enter';

  switch (hash) {
    case '/':
      content.innerHTML = renderDashboard();
      await initDashboard();
      break;
    case '/upload':
      content.innerHTML = renderUpload();
      initUpload();
      break;
    case '/data':
      content.innerHTML = renderDataTable();
      await initDataTable();
      break;
    case '/korlap':
      if (currentUser?.role === 'korlap') { window.location.hash = '#/'; return; }
      content.innerHTML = renderKorlap();
      await initKorlap();
      break;
    default:
      content.innerHTML = '<div class="card"><h2>404</h2><p>Halaman tidak ditemukan</p></div>';
  }
}

// Start
init();
