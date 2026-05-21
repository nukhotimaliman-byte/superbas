/* ═══════════════════════════════════════════════════
   Dashboard v3 — Clean, no emoji, SVG icons
   ═══════════════════════════════════════════════════ */
import { api } from '../utils/api.js';

export function renderDashboard() {
  return `
    <div class="page-header">
      <div><h1>Dashboard</h1><p class="page-desc">Ringkasan data rekening karyawan</p></div>
    </div>

    <div class="stats-grid" id="stats-grid">
      <div class="stat-card">
        <div class="stat-icon stat-icon-blue">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
        </div>
        <div class="stat-info">
          <div class="stat-value" id="stat-datasets">-</div>
          <div class="stat-label">Total Dataset</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon-green">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
        </div>
        <div class="stat-info">
          <div class="stat-value" id="stat-employees">-</div>
          <div class="stat-label">Total Karyawan</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon-cyan">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        </div>
        <div class="stat-info">
          <div class="stat-value" id="stat-done">-</div>
          <div class="stat-label">Rek. Lengkap</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon-amber">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>
        </div>
        <div class="stat-info">
          <div class="stat-value" id="stat-kosong">-</div>
          <div class="stat-label">Belum Isi</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon-red">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.21 15.89A10 10 0 118 2.83"/><path d="M22 12A10 10 0 0012 2v10z"/></svg>
        </div>
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
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <span>Upload Data Baru</span>
        </a>
        <a href="#/data" class="quick-action">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
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
  if (el) el.textContent = typeof val === 'number' ? val.toLocaleString('id-ID') : val;
}
