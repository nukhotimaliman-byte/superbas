/**
 * BAS Recruitment — Unified Auth Logic
 * Supports: username/NIK + password, Google Sign-In, Forgot Password
 */

const USER_AUTH_API = './api/user-auth.php';

// ── Demo Accounts (no database needed) ─────
const DEMO_ACCOUNTS = {
    'owner':    { id: 901, name: 'Owner Demo',    username: 'owner',    email: 'owner@demo.bas',    role: 'owner',   nik: '0000000000000001' },
    'korlap':   { id: 902, name: 'Korlap Demo',   username: 'korlap',   email: 'korlap@demo.bas',   role: 'korlap',  nik: '0000000000000002' },
    'kandidat': { id: 903, name: 'Kandidat Demo',  username: 'kandidat', email: 'kandidat@demo.bas', role: 'user',    nik: '0000000000000003' }
};
const DEMO_PASSWORDS = { 'owner': 'owner123', 'korlap': 'korlap123', 'kandidat': 'kandidat123' };

// ── Check session ──────────────────────────
async function checkUserAuth() {
    // Check demo session first
    const demoUser = sessionStorage.getItem('bas_demo_user');
    if (demoUser) {
        try { return JSON.parse(demoUser); } catch { sessionStorage.removeItem('bas_demo_user'); }
    }
    try {
        const res = await fetch(`${USER_AUTH_API}?action=check`, { credentials: 'same-origin' });
        const data = await res.json();
        return data.authenticated ? data.user : null;
    } catch {
        return null;
    }
}

// ── Login (username OR NIK + password) ─────
async function handleLogin(username, password) {
    // Check demo accounts first
    const key = username.toLowerCase();
    if (DEMO_ACCOUNTS[key] && DEMO_PASSWORDS[key] === password) {
        const user = { ...DEMO_ACCOUNTS[key] };
        sessionStorage.setItem('bas_demo_user', JSON.stringify(user));
        return { user };
    }
    try {
        const res = await fetch(`${USER_AUTH_API}?action=login`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (!res.ok || !data.success) return { error: data.error || 'Login gagal' };
        
        // Cache admin session to prevent auto-logout drop during redirect
        if (data.user && ['owner','korlap','korlap_interview','korlap_td'].includes(data.user.role)) {
            try { localStorage.setItem('bas_admin_cache', JSON.stringify(data.user)); } catch {}
        }
        
        return { user: data.user };
    } catch {
        return { error: 'Tidak dapat terhubung ke server' };
    }
}

// ── Register (NIK + username + email + password + address) ──
async function handleRegister(username, name, password, nik, email, phone, addr) {
    try {
        const body = { username, name, password, nik, email, phone };
        if (addr) {
            body.address = addr.full || '';
            body.provinsi = addr.provinsi || '';
            body.kabupaten = addr.kabupaten || '';
            body.kecamatan = addr.kecamatan || '';
            body.kelurahan = addr.kelurahan || '';
        }
        const res = await fetch(`${USER_AUTH_API}?action=register`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
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
            credentials: 'same-origin',
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
            credentials: 'same-origin',
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
            credentials: 'same-origin',
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
    sessionStorage.removeItem('bas_demo_user');
    try { await fetch(`${USER_AUTH_API}?action=logout`, { method: 'POST', credentials: 'same-origin' }); } catch {}
    window.location.href = 'login.html';
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
