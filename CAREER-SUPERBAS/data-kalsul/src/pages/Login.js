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
            <div class="input-password-wrap">
              <input type="password" id="password" class="input" placeholder="Masukkan password" autocomplete="current-password" required />
              <button type="button" class="btn-toggle-pw" id="toggle-pw" title="Tampilkan password">
                <svg id="pw-icon-show" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                <svg id="pw-icon-hide" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:none"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              </button>
            </div>
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

  // Toggle password visibility
  document.getElementById('toggle-pw')?.addEventListener('click', () => {
    const pwInput = document.getElementById('password');
    const iconShow = document.getElementById('pw-icon-show');
    const iconHide = document.getElementById('pw-icon-hide');
    if (pwInput.type === 'password') {
      pwInput.type = 'text';
      iconShow.style.display = 'none';
      iconHide.style.display = 'block';
    } else {
      pwInput.type = 'password';
      iconShow.style.display = 'block';
      iconHide.style.display = 'none';
    }
  });

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
