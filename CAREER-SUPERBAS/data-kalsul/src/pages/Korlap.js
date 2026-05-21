/* ═══════════════════════════════════════════════════
   Korlap Management Page — CRUD Korlap Accounts
   ═══════════════════════════════════════════════════ */
import { api } from '../utils/api.js';

export function renderKorlap() {
  return `
    <div class="page-header">
      <h1>Kelola Korlap</h1>
      <button class="btn btn-primary" id="btn-add-korlap">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Tambah Korlap
      </button>
    </div>

    <div class="card card-table">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width:50px">No</th>
              <th>Username</th>
              <th>Nama</th>
              <th>Station</th>
              <th>Dibuat</th>
              <th style="width:100px">Aksi</th>
            </tr>
          </thead>
          <tbody id="korlap-tbody">
            <tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-tertiary)">Memuat...</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal -->
    <div class="modal-overlay" id="korlap-modal" style="display:none">
      <div class="modal">
        <div class="modal-header">
          <h3 id="korlap-modal-title">Tambah Korlap</h3>
          <button class="btn-icon modal-close" id="korlap-modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="field-group">
            <label class="field-label">Username <span class="required">*</span></label>
            <input type="text" class="input" id="k-username" placeholder="username login" />
          </div>
          <div class="field-group">
            <label class="field-label">Nama Lengkap <span class="required">*</span></label>
            <input type="text" class="input" id="k-name" placeholder="Nama korlap" />
          </div>
          <div class="field-group">
            <label class="field-label">Password <span class="required">*</span></label>
            <input type="password" class="input" id="k-password" placeholder="Min 6 karakter" />
          </div>
          <div class="field-group">
            <label class="field-label">Station</label>
            <input type="text" class="input" id="k-station" placeholder="Station yang ditangani" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" id="korlap-modal-cancel">Batal</button>
          <button class="btn btn-primary" id="korlap-modal-save">Simpan</button>
        </div>
      </div>
    </div>
  `;
}

let editingId = null;

export async function initKorlap() {
  document.getElementById('btn-add-korlap')?.addEventListener('click', () => openModal());
  document.getElementById('korlap-modal-close')?.addEventListener('click', closeModal);
  document.getElementById('korlap-modal-cancel')?.addEventListener('click', closeModal);
  document.getElementById('korlap-modal-save')?.addEventListener('click', saveKorlap);

  await loadKorlaps();
}

async function loadKorlaps() {
  const tbody = document.getElementById('korlap-tbody');
  if (!tbody) return;

  try {
    const res = await api.getKorlaps();
    const korlaps = res.korlaps || [];

    if (korlaps.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-tertiary)">
        Belum ada akun korlap. Klik <strong>Tambah Korlap</strong> untuk membuat.
      </td></tr>`;
      return;
    }

    tbody.innerHTML = korlaps.map((k, i) => {
      const tgl = new Date(k.created_at).toLocaleDateString('id-ID', {day:'2-digit',month:'short',year:'numeric'});
      return `<tr>
        <td>${i + 1}</td>
        <td><span class="badge badge-primary">${esc(k.username)}</span></td>
        <td style="font-weight:500">${esc(k.name)}</td>
        <td>${esc(k.station) || '<span style="color:var(--text-tertiary)">-</span>'}</td>
        <td style="font-size:12px">${tgl}</td>
        <td>
          <div class="action-btns">
            <button class="btn-icon btn-edit-k" data-id="${k.id}" data-name="${esc(k.name)}" data-station="${esc(k.station||'')}" data-username="${esc(k.username)}" title="Edit">✏️</button>
            <button class="btn-icon btn-del-k" data-id="${k.id}" data-name="${esc(k.name)}" title="Hapus">🗑️</button>
          </div>
        </td>
      </tr>`;
    }).join('');

    tbody.querySelectorAll('.btn-edit-k').forEach(btn => {
      btn.addEventListener('click', () => {
        openModal({
          id: btn.dataset.id,
          username: btn.dataset.username,
          name: btn.dataset.name,
          station: btn.dataset.station,
        });
      });
    });

    tbody.querySelectorAll('.btn-del-k').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm(`Hapus korlap "${btn.dataset.name}"?`)) return;
        try {
          await api.deleteKorlap(btn.dataset.id);
          loadKorlaps();
        } catch (err) { alert('Error: ' + err.message); }
      });
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--danger)">${err.message}</td></tr>`;
  }
}

function openModal(data = null) {
  editingId = data?.id || null;
  document.getElementById('korlap-modal-title').textContent = editingId ? 'Edit Korlap' : 'Tambah Korlap';
  document.getElementById('k-username').value = data?.username || '';
  document.getElementById('k-username').disabled = !!editingId;
  document.getElementById('k-name').value = data?.name || '';
  document.getElementById('k-password').value = '';
  document.getElementById('k-password').placeholder = editingId ? 'Kosongkan jika tidak diubah' : 'Min 6 karakter';
  document.getElementById('k-station').value = data?.station || '';
  document.getElementById('korlap-modal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('korlap-modal').style.display = 'none';
  editingId = null;
}

async function saveKorlap() {
  const username = document.getElementById('k-username').value.trim();
  const name = document.getElementById('k-name').value.trim();
  const password = document.getElementById('k-password').value;
  const station = document.getElementById('k-station').value.trim();

  if (!name) { alert('Nama harus diisi'); return; }

  try {
    if (editingId) {
      const data = { name, station };
      if (password) data.password = password;
      await api.updateKorlap(editingId, data);
    } else {
      if (!username || !password) { alert('Username dan password harus diisi'); return; }
      await api.createKorlap({ username, password, name, station });
    }
    closeModal();
    loadKorlaps();
  } catch (err) { alert('Error: ' + err.message); }
}

function esc(s) { const d = document.createElement('div'); d.textContent = s ?? ''; return d.innerHTML; }
