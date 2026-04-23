/**
 * BAS Recruitment — Unified Auth Logic
 * Supports: username/NIK + password, Google Sign-In, Forgot Password
 */

const USER_AUTH_API = './api/user-auth.php';

// ── Check session ──────────────────────────
async function checkUserAuth() {
    try {
        const res = await fetch(`${USER_AUTH_API}?action=check`);
        const data = await res.json();
        return data.authenticated ? data.user : null;
    } catch {
        return null;
    }
}

// ── Login (username OR NIK + password) ─────
async function handleLogin(username, password) {
    try {
        const res = await fetch(`${USER_AUTH_API}?action=login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (!res.ok || !data.success) return { error: data.error || 'Login gagal' };
        return { user: data.user };
    } catch {
        return { error: 'Tidak dapat terhubung ke server' };
    }
}

// ── Register (NIK + username + email + password) ──
async function handleRegister(username, name, password, nik, email, phone) {
    try {
        const res = await fetch(`${USER_AUTH_API}?action=register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, name, password, nik, email, phone })
        });
        const data = await res.json();
        if (!res.ok || !data.success) return { error: data.error || 'Registrasi gagal' };
        return { user: data.user };
    } catch {
        return { error: 'Tidak dapat terhubung ke server' };
    }
}

// ── Forgot Password (NIK + email → new password) ──
async function handleForgotPassword(nik, email, newPassword) {
    try {
        const res = await fetch(`${USER_AUTH_API}?action=forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nik, email, new_password: newPassword })
        });
        const data = await res.json();
        if (!res.ok || !data.success) return { error: data.error || 'Reset gagal' };
        return { success: true, username: data.username, message: data.message };
    } catch {
        return { error: 'Tidak dapat terhubung ke server' };
    }
}

// ── Google Sign-In ─────────────────────────
async function handleGoogleSignIn(credential) {
    try {
        const res = await fetch(`${USER_AUTH_API}?action=google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential })
        });
        const data = await res.json();
        if (data.success) return { user: data.user };
        if (data.needsNik) return { needsNik: true, googleData: data.googleData };
        return { error: data.error || 'Login Google gagal' };
    } catch {
        return { error: 'Tidak dapat terhubung ke server' };
    }
}

// ── Google Complete Registration ───────────
async function handleGoogleComplete(nik, username, password, googleData, phone) {
    try {
        const res = await fetch(`${USER_AUTH_API}?action=google-complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nik, username, password, phone,
                google_id: googleData.google_id,
                email: googleData.email,
                name: googleData.name,
                picture: googleData.picture
            })
        });
        const data = await res.json();
        if (!res.ok || !data.success) return { error: data.error || 'Registrasi gagal' };
        return { user: data.user };
    } catch {
        return { error: 'Tidak dapat terhubung ke server' };
    }
}

// ── Logout ─────────────────────────────────
async function handleUserLogout() {
    try { await fetch(`${USER_AUTH_API}?action=logout`, { method: 'POST' }); } catch {}
    window.location.href = 'index.html';
}

// ── Redirect by role ───────────────────────
function redirectByRole(role) {
    switch (role) {
        case 'owner':
        case 'korlap':
        case 'korlap_interview':
        case 'korlap_td':
            window.location.href = 'admin.html'; break;
        default:
            window.location.href = 'daftar.html'; break;
    }
}

// ── Update header with user info ───────────
function updateHeaderForUser(user) {
    const headerActions = document.querySelector('.header-actions');
    if (!headerActions || !user) return;

    const loginBtn = headerActions.querySelector('.login-btn');
    if (loginBtn) loginBtn.remove();

    let userEl = headerActions.querySelector('.user-info');
    if (!userEl) {
        userEl = document.createElement('div');
        userEl.className = 'user-info';
        headerActions.insertBefore(userEl, headerActions.firstChild);
    }

    const initial = user.name.charAt(0).toUpperCase();
    const firstName = user.name.split(' ')[0];
    const avatarHtml = user.picture
        ? `<img src="${user.picture}" alt="${user.name}" class="user-avatar" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
           <div class="user-avatar-fallback" style="display:none;">${initial}</div>`
        : `<div class="user-avatar-fallback">${initial}</div>`;

    userEl.innerHTML = `
        ${avatarHtml}
        <span class="user-name">${firstName}</span>
        <button class="btn btn-sm btn-secondary" onclick="handleUserLogout()">Keluar</button>
    `;
}

// ── Toast — uses showToast from js/utils.js
