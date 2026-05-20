/* ═══════════════════════════════════════════════════
   Dashboard Layout Shell
   Creates the sidebar + main content wrapper
   ═══════════════════════════════════════════════════ */

import { auth } from '../utils/auth.js';
import { navigate } from '../router.js';
import { icons } from '../utils/icons.js';
import { toast } from '../utils/toast.js';

export function createShell(activePage = 'dashboard') {
  const user = auth.user;
  const initials = user?.name ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : 'AD';

  return `
    <div class="app-shell">
      <!-- Sidebar -->
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-header">
          <div class="sidebar-brand">
            <div class="sidebar-brand-icon">KS</div>
            <div class="sidebar-brand-text">
              <span>Data KalSul</span>
              <span>Super-BAS Admin</span>
            </div>
          </div>
        </div>

        <nav class="sidebar-nav">
          <div class="sidebar-section-title">Menu</div>
          
          <a href="/dashboard" data-link class="nav-item ${activePage === 'dashboard' ? 'active' : ''}" id="nav-dashboard">
            <span class="nav-icon">${icons.dashboard}</span>
            <span>Dashboard</span>
          </a>
          
          <a href="/upload" data-link class="nav-item ${activePage === 'upload' ? 'active' : ''}" id="nav-upload">
            <span class="nav-icon">${icons.upload}</span>
            <span>Upload Data</span>
          </a>
          
          <a href="/data" data-link class="nav-item ${activePage === 'data' ? 'active' : ''}" id="nav-data">
            <span class="nav-icon">${icons.table}</span>
            <span>Data Karyawan</span>
          </a>

          <div class="sidebar-section-title" style="margin-top:16px">Lainnya</div>

          <a href="/data" data-link class="nav-item" id="nav-export" onclick="return false">
            <span class="nav-icon">${icons.download}</span>
            <span>Export Data</span>
          </a>
        </nav>

        <div class="sidebar-footer">
          <div class="sidebar-user" id="sidebar-user-btn">
            <div class="sidebar-avatar">${initials}</div>
            <div class="sidebar-user-info">
              <span>${user?.name || 'Admin'}</span>
              <span>${user?.role || 'admin'}</span>
            </div>
          </div>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="main-content" id="main-content">
        <!-- Page content injected here -->
      </main>
    </div>

    <!-- Mobile overlay -->
    <div class="sidebar-overlay" id="sidebar-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:99"></div>
  `;
}

export function initShellEvents() {
  // Logout from user menu
  const userBtn = document.getElementById('sidebar-user-btn');
  if (userBtn) {
    userBtn.addEventListener('click', async () => {
      if (confirm('Yakin ingin logout, Sir?')) {
        try {
          await auth.logout();
          toast('Sampai jumpa, Sir.', 'info');
          navigate('/');
        } catch {
          navigate('/');
        }
      }
    });
  }

  // Export button
  const exportBtn = document.getElementById('nav-export');
  if (exportBtn) {
    exportBtn.addEventListener('click', (e) => {
      e.preventDefault();
      navigate('/data');
    });
  }

  // Mobile menu
  const overlay = document.getElementById('sidebar-overlay');
  if (overlay) {
    overlay.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.remove('mobile-open');
      overlay.style.display = 'none';
    });
  }
}

export function toggleMobileMenu() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (sidebar) {
    const isOpen = sidebar.classList.toggle('mobile-open');
    if (overlay) overlay.style.display = isOpen ? 'block' : 'none';
  }
}
