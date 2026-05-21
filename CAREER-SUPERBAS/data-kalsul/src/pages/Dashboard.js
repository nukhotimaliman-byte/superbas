/* ═══════════════════════════════════════════════════
   Dashboard v2 — Overview Stats
   ═══════════════════════════════════════════════════ */
import { api } from '../utils/api.js';

export function renderDashboard() {
  return `
    <div class="page-header"><h1>Dashboard</h1></div>

    <div class="stats-grid" id="stats-grid">
      <div class="stat-card">
        <div class="stat-icon stat-icon-blue">📊</div>
        <div class="stat-info">
          <div class="stat-value" id="stat-datasets">-</div>
          <div class="stat-label">Total Dataset</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon-green">👥</div>
        <div class="stat-info">
          <div class="stat-value" id="stat-employees">-</div>
          <div class="stat-label">Total Karyawan</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon-cyan">✅</div>
        <div class="stat-info">
          <div class="stat-value" id="stat-done">-</div>
          <div class="stat-label">Rek. Lengkap</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon-amber">⬜</div>
        <div class="stat-info">
          <div class="stat-value" id="stat-kosong">-</div>
          <div class="stat-label">Belum Isi</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon-red">🔴</div>
        <div class="stat-info">
          <div class="stat-value" id="stat-pergantian">-</div>
          <div class="stat-label">Pergantian Rek</div>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:24px">
      <div class="card-title">Quick Actions</div>
      <div class="quick-actions">
        <a href="#/upload" class="quick-action">
          <span class="qa-icon">📤</span>
          <span>Upload Data Baru</span>
        </a>
        <a href="#/data" class="quick-action">
          <span class="qa-icon">📋</span>
          <span>Lihat Data Karyawan</span>
        </a>
      </div>
    </div>
  `;
}

export async function initDashboard() {
  try {
    const [gajiRes, statusRes] = await Promise.all([
      api.getGajiSummary().catch(() => ({})),
      api.getEmployees({ per_page: 1 }).catch(() => ({ pagination: {} })),
    ]);

    const ds = await api.getDatasets().catch(() => ({ datasets: [] }));

    setVal('stat-datasets', ds.datasets?.length || 0);
    setVal('stat-employees', gajiRes.total_employees || 0);
    setVal('stat-done', gajiRes.with_rekening || 0);
    setVal('stat-kosong', gajiRes.without_rekening || 0);
    setVal('stat-pergantian', gajiRes.pergantian_count || 0);
  } catch (err) {
    console.error('Dashboard error:', err);
  }
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
