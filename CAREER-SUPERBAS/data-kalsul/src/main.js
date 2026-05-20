/* ═══════════════════════════════════════════════════
   Data KalSul — Main Entry Point
   ═══════════════════════════════════════════════════ */

import './style.css';
import { route, initRouter, navigate } from './router.js';
import { auth } from './utils/auth.js';
import { LoginPage } from './pages/Login.js';
import { DashboardPage } from './pages/Dashboard.js';
import { UploadPage } from './pages/Upload.js';
import { DataTablePage } from './pages/DataTable.js';

// ── Auth Guard ─────────────────────────────────
function withAuth(handler) {
  return async (container) => {
    const user = await auth.check();
    if (!user) {
      navigate('/');
      return;
    }
    return handler(container);
  };
}

function withGuest(handler) {
  return async (container) => {
    const user = await auth.check();
    if (user) {
      navigate('/dashboard');
      return;
    }
    return handler(container);
  };
}

// ── Routes ─────────────────────────────────────
route('/', withGuest(LoginPage));
route('/login', withGuest(LoginPage));
route('/dashboard', withAuth(DashboardPage));
route('/upload', withAuth(UploadPage));
route('/data', withAuth(DataTablePage));

// ── Start ──────────────────────────────────────
initRouter();

console.log('%c🚀 Data KalSul v1.0', 'color: #00d4ff; font-size: 14px; font-weight: bold');
console.log('%cSuper-BAS Admin Dashboard', 'color: #7c3aed; font-size: 11px');
