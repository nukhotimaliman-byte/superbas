/* ═══════════════════════════════════════════════════
   API Utility v2 — Fetch wrapper for PHP Backend
   ═══════════════════════════════════════════════════ */

const BASE = '/data-kalsul/api';

async function request(endpoint, options = {}) {
  const url = `${BASE}/${endpoint}`;
  const config = {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  };
  if (options.body instanceof FormData) delete config.headers['Content-Type'];

  const res = await fetch(url, config);
  const data = await res.json();
  if (!res.ok) throw { status: res.status, message: data.error || 'Request failed', data };
  return data;
}

export const api = {
  // Auth
  login: (username, password) =>
    request('auth.php?action=login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () =>
    request('auth.php?action=logout', { method: 'POST' }),
  me: () =>
    request('auth.php?action=me'),

  // Datasets (subtabs)
  getDatasets: () =>
    request('employees.php?action=datasets'),
  deleteDataset: (id) =>
    request('employees.php?action=delete_dataset', { method: 'DELETE', body: JSON.stringify({ dataset_id: id }) }),

  // Employees
  getEmployees: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`employees.php?action=list&${q}`);
  },
  getEmployee: (id) =>
    request(`employees.php?action=get&id=${id}`),
  updateEmployee: (id, data) =>
    request('employees.php', { method: 'PUT', body: JSON.stringify({ id, ...data }) }),
  deleteEmployee: (id) =>
    request('employees.php', { method: 'DELETE', body: JSON.stringify({ id }) }),
  getStations: () =>
    request('employees.php?action=stations'),

  // Rekening history
  getRekeningHistory: (opsId) =>
    request(`employees.php?action=rekening_history&ops_id=${encodeURIComponent(opsId)}`),

  // Upload
  uploadData: (payload) =>
    request('upload.php', { method: 'POST', body: JSON.stringify(payload) }),

  // Korlap management
  getKorlaps: () =>
    request('korlap.php?action=list'),
  createKorlap: (data) =>
    request('korlap.php?action=create', { method: 'POST', body: JSON.stringify(data) }),
  updateKorlap: (id, data) =>
    request('korlap.php?action=update', { method: 'PUT', body: JSON.stringify({ id, ...data }) }),
  deleteKorlap: (id) =>
    request('korlap.php?action=delete', { method: 'DELETE', body: JSON.stringify({ id }) }),

  // Gaji status
  getGajiSummary: () =>
    request('gaji-status.php?action=summary'),

  // Export
  exportExcel: () => `${BASE}/export.php?format=excel`,
  exportCSV: () => `${BASE}/export.php?format=csv`,
};
