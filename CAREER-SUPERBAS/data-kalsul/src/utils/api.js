/* ═══════════════════════════════════════════════════
   API Utility — Fetch wrapper for PHP Backend
   ═══════════════════════════════════════════════════ */

const BASE = '/data-kalsul/api';

async function request(endpoint, options = {}) {
  const url = `${BASE}/${endpoint}`;
  const config = {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  };

  // Don't set Content-Type for FormData
  if (options.body instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  const res = await fetch(url, config);
  const data = await res.json();

  if (!res.ok) {
    throw { status: res.status, message: data.error || 'Request failed', data };
  }
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

  // Employees
  getEmployees: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`employees.php?action=list&${q}`);
  },
  getEmployee: (id) =>
    request(`employees.php?action=get&id=${id}`),
  updateEmployee: (id, data) =>
    request('employees.php?action=update', { method: 'PUT', body: JSON.stringify({ id, ...data }) }),
  deleteEmployee: (id) =>
    request('employees.php?action=delete', { method: 'DELETE', body: JSON.stringify({ id }) }),

  // Upload
  uploadFile: (formData) =>
    request('upload.php', { method: 'POST', body: formData }),

  // Gaji Status
  getGajiStatus: () =>
    request('gaji-status.php'),

  // Export
  exportExcel: () => `${BASE}/export.php?format=excel`,
  exportCSV: () => `${BASE}/export.php?format=csv`,
};
