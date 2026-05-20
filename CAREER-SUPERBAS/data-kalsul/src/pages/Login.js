/* ═══════════════════════════════════════════════════
   Login Page
   ═══════════════════════════════════════════════════ */

import { auth } from '../utils/auth.js';
import { navigate } from '../router.js';
import { toast } from '../utils/toast.js';

export async function LoginPage(container) {
  container.innerHTML = `
    <div class="auth-page">
      <div class="auth-card glass-static">
        <div class="auth-logo">
          <h1>DATA KALSUL</h1>
          <p>Kalimantan &amp; Sulawesi Data Management</p>
        </div>

        <div class="auth-error" id="login-error"></div>

        <form class="auth-form" id="login-form">
          <div class="input-group">
            <label for="username">Username</label>
            <input type="text" id="username" class="input" placeholder="Masukkan username" autocomplete="username" required />
          </div>
          <div class="input-group">
            <label for="password">Password</label>
            <input type="password" id="password" class="input" placeholder="Masukkan password" autocomplete="current-password" required />
          </div>
          <button type="submit" class="btn btn-primary" id="login-btn">
            <span id="login-btn-text">Masuk</span>
            <div class="spinner" id="login-spinner" style="display:none"></div>
          </button>
        </form>

        <p style="text-align:center;margin-top:24px;font-size:12px;color:var(--text-tertiary)">
          Super-BAS © ${new Date().getFullYear()}
        </p>
      </div>
    </div>
  `;

  const form = document.getElementById('login-form');
  const errorEl = document.getElementById('login-error');
  const btnText = document.getElementById('login-btn-text');
  const spinner = document.getElementById('login-spinner');
  const btn = document.getElementById('login-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !password) {
      showError('Username dan password harus diisi');
      return;
    }

    setLoading(true);
    try {
      await auth.login(username, password);
      toast('Login berhasil! Selamat datang, Sir.', 'success');
      navigate('/dashboard');
    } catch (err) {
      showError(err.message || 'Login gagal. Periksa username dan password.');
    } finally {
      setLoading(false);
    }
  });

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.classList.add('show');
    setTimeout(() => errorEl.classList.remove('show'), 5000);
  }

  function setLoading(loading) {
    btn.disabled = loading;
    btnText.style.display = loading ? 'none' : '';
    spinner.style.display = loading ? 'block' : 'none';
  }

  // Focus username on load
  setTimeout(() => document.getElementById('username')?.focus(), 100);
}
