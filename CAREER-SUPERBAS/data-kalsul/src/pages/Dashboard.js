/* ═══════════════════════════════════════════════════
   Dashboard Page
   ═══════════════════════════════════════════════════ */

import { createShell, initShellEvents, toggleMobileMenu } from '../components/Shell.js';
import { api } from '../utils/api.js';
import { icons } from '../utils/icons.js';

export async function DashboardPage(container) {
  container.innerHTML = createShell('dashboard');
  initShellEvents();

  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page-header">
      <div style="display:flex;align-items:center;gap:12px">
        <button class="mobile-menu-btn" id="mobile-menu-toggle">${icons.menu}</button>
        <h1 class="page-title">Dashboard</h1>
      </div>
      <div class="page-actions">
        <span style="font-size:var(--font-sm);color:var(--text-tertiary)" id="last-update"></span>
      </div>
    </div>

    <div class="page-body">
      <!-- Stats -->
      <div class="stats-grid" id="stats-grid">
        <div class="stat-card glass fade-up stagger-1">
          <div class="stat-card-header">
            <span class="stat-card-label">Total Karyawan</span>
            <div class="stat-card-icon cyan">${icons.users}</div>
          </div>
          <div class="stat-card-value" id="stat-total">—</div>
          <div class="stat-card-change">Seluruh wilayah</div>
        </div>

        <div class="stat-card glass fade-up stagger-2">
          <div class="stat-card-header">
            <span class="stat-card-label">Kalimantan</span>
            <div class="stat-card-icon purple">${icons.users}</div>
          </div>
          <div class="stat-card-value" id="stat-kalimantan">—</div>
          <div class="stat-card-change">Region Kalimantan</div>
        </div>

        <div class="stat-card glass fade-up stagger-3">
          <div class="stat-card-header">
            <span class="stat-card-label">Sulawesi</span>
            <div class="stat-card-icon green">${icons.users}</div>
          </div>
          <div class="stat-card-value" id="stat-sulawesi">—</div>
          <div class="stat-card-change">Region Sulawesi</div>
        </div>

        <div class="stat-card glass fade-up stagger-4">
          <div class="stat-card-header">
            <span class="stat-card-label">Link Gaji Terisi</span>
            <div class="stat-card-icon orange">${icons.money}</div>
          </div>
          <div class="stat-card-value" id="stat-gaji">—</div>
          <div class="stat-card-change" id="stat-gaji-pct">Dari total karyawan</div>
        </div>
      </div>

      <!-- Station Distribution -->
      <div class="glass-static" style="padding:var(--space-lg);margin-bottom:var(--space-xl)">
        <h2 style="font-size:var(--font-md);font-weight:600;margin-bottom:var(--space-lg)">Distribusi per Station</h2>
        <div id="station-chart" style="display:flex;flex-direction:column;gap:12px">
          <div class="loading-overlay" style="position:relative;min-height:120px">
            <div class="spinner spinner-lg"></div>
            <div class="loading-text">Memuat data...</div>
          </div>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="glass-static" style="padding:var(--space-lg)">
        <h2 style="font-size:var(--font-md);font-weight:600;margin-bottom:var(--space-lg)">Upload Terakhir</h2>
        <div id="recent-uploads">
          <div class="empty-state">
            <div class="empty-state-icon">${icons.file}</div>
            <div class="empty-state-title">Belum ada upload</div>
            <div class="empty-state-desc">Data upload akan muncul di sini setelah Anda mengupload file.</div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Mobile menu toggle
  document.getElementById('mobile-menu-toggle')?.addEventListener('click', toggleMobileMenu);

  // Load data
  loadDashboardData();
}

async function loadDashboardData() {
  try {
    // Fetch employee stats
    const data = await api.getEmployees({ page: 1, per_page: 1 });
    
    if (data.pagination) {
      document.getElementById('stat-total').textContent = formatNumber(data.pagination.total || 0);
    }

    // Fetch by region
    const [kalData, sulData] = await Promise.all([
      api.getEmployees({ page: 1, per_page: 1, region: 'kalimantan' }).catch(() => null),
      api.getEmployees({ page: 1, per_page: 1, region: 'sulawesi' }).catch(() => null),
    ]);

    const kalTotal = kalData?.pagination?.total || 0;
    const sulTotal = sulData?.pagination?.total || 0;
    const total = (data.pagination?.total || 0);

    document.getElementById('stat-kalimantan').textContent = formatNumber(kalTotal);
    document.getElementById('stat-sulawesi').textContent = formatNumber(sulTotal);

    // Gaji status
    try {
      const gajiData = await api.getGajiStatus();
      const filled = gajiData.filled || 0;
      const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
      document.getElementById('stat-gaji').textContent = formatNumber(filled);
      document.getElementById('stat-gaji-pct').textContent = `${pct}% dari total karyawan`;
    } catch {
      document.getElementById('stat-gaji').textContent = '—';
    }

    // Station chart
    loadStationChart();

    // Update time
    document.getElementById('last-update').textContent = `Update: ${new Date().toLocaleTimeString('id-ID')}`;

  } catch (err) {
    console.error('Dashboard load error:', err);
    // Show zeros on error
    ['stat-total', 'stat-kalimantan', 'stat-sulawesi', 'stat-gaji'].forEach(id => {
      document.getElementById(id).textContent = '0';
    });
    loadStationChart();
  }
}

async function loadStationChart() {
  const chartEl = document.getElementById('station-chart');
  try {
    const data = await api.getEmployees({ page: 1, per_page: 999 });
    const employees = data.employees || data.data || [];

    if (employees.length === 0) {
      chartEl.innerHTML = `
        <div class="empty-state" style="padding:var(--space-lg)">
          <div class="empty-state-desc">Belum ada data karyawan</div>
        </div>
      `;
      return;
    }

    // Group by station
    const stationMap = {};
    employees.forEach(emp => {
      const station = emp.station || 'Tidak Diketahui';
      stationMap[station] = (stationMap[station] || 0) + 1;
    });

    const sorted = Object.entries(stationMap).sort((a, b) => b[1] - a[1]);
    const maxCount = sorted[0]?.[1] || 1;

    chartEl.innerHTML = sorted.map(([station, count]) => {
      const pct = Math.round((count / maxCount) * 100);
      return `
        <div style="display:flex;align-items:center;gap:16px">
          <span style="width:140px;font-size:var(--font-sm);color:var(--text-secondary);text-align:right;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${station}">${station}</span>
          <div style="flex:1">
            <div class="progress-bar">
              <div class="progress-bar-fill" style="width:${pct}%"></div>
            </div>
          </div>
          <span style="width:40px;font-size:var(--font-sm);font-weight:600;color:var(--text-primary)">${count}</span>
        </div>
      `;
    }).join('');

  } catch {
    chartEl.innerHTML = `
      <div class="empty-state" style="padding:var(--space-lg)">
        <div class="empty-state-desc">Gagal memuat data station</div>
      </div>
    `;
  }
}

function formatNumber(num) {
  return new Intl.NumberFormat('id-ID').format(num);
}
