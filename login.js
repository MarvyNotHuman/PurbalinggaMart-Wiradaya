'use strict';
/* ================================================================
   PURBALINGGA MART — Login Page JS
   login.js
   ================================================================ */

let selectedRole = 'buyer';
let isLoading    = false;

/* ── DOM refs ─────────────────────────────────────────────────── */
const form     = () => document.getElementById('login-form');
const uInput   = () => document.getElementById('login-user');
const pInput   = () => document.getElementById('login-pass');
const alertEl  = () => document.getElementById('login-alert');
const alertMsg = () => document.getElementById('login-alert-msg');
const submitBtn= () => document.getElementById('login-submit');
const roleInfo = () => document.getElementById('role-info-text');

/* ── URL param message ────────────────────────────────────────── */
function readUrlParams() {
  const params  = new URLSearchParams(window.location.search);
  const required = params.get('required'); // 'seller' | 'admin' | 'buyer'
  const denied   = params.get('denied');   // '1' if wrong role
  const current  = params.get('current');  // current role when denied
  const msg      = params.get('msg');      // generic message key

  if (required) {
    // Pre-select the required role tab
    setRole(required);
    const roleLabels = { admin:'Admin', seller:'Seller', buyer:'Pembeli' };
    const label = roleLabels[required] || required;
    if (denied === '1') {
      showAlert(`Akses ditolak. Halaman ini hanya untuk <strong>${label}</strong>. Anda login sebagai <strong>${roleLabels[current]||current}</strong>.`, 'error');
    } else {
      showAlert(`Silakan login sebagai <strong>${label}</strong> untuk melanjutkan.`, 'info');
    }
  }

  if (msg === 'logout') {
    showAlert('Anda telah berhasil logout. Sampai jumpa! 👋', 'ok');
  }
  if (msg === 'registered') {
    const savedRole = sessionStorage.getItem('pm_new_role') || params.get('role') || 'seller';
    const roleLabel = savedRole === 'seller' ? 'Toko' : 'Akun';
    showAlert(`${roleLabel} berhasil didaftarkan! Silakan login dengan akun baru Anda.`, 'ok');
    const uEl = uInput();
    const savedUser = sessionStorage.getItem('pm_new_username');
    if (uEl && savedUser) { uEl.value = savedUser; sessionStorage.removeItem('pm_new_username'); }
    sessionStorage.removeItem('pm_new_role');
    setRole(savedRole === 'seller' ? 'seller' : 'buyer');
  }
}

/* ── Role tab switching ───────────────────────────────────────── */
function setRole(role) {
  selectedRole = role;
  document.querySelectorAll('.role-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.role === role);
  });
  updateRoleInfo(role);
  clearAlert();
}

function updateRoleInfo(role) {
  const el = roleInfo(); if (!el) return;
  const msgs = {
    buyer:  '🛒 Masuk sebagai <strong>Pembeli</strong> untuk berbelanja produk UMKM Purbalingga.',
    seller: '🏪 Masuk sebagai <strong>Seller</strong> untuk mengelola toko dan produk Anda.',
    admin:  '👑 Masuk sebagai <strong>Admin</strong> untuk mengelola seluruh marketplace.',
  };
  el.innerHTML = msgs[role] || '';
}

/* ── Alert helpers ────────────────────────────────────────────── */
function showAlert(msg, type = 'error') {
  const a = alertEl(); const m = alertMsg(); if (!a || !m) return;
  m.innerHTML = msg;
  a.className = 'auth-alert show';
  if (type === 'info') a.classList.add('info-alert');
  if (type === 'ok')   a.classList.add('ok-alert');
}
function clearAlert() {
  const a = alertEl(); if (!a) return;
  a.classList.remove('show','info-alert','ok-alert');
}

/* ── Password visibility ──────────────────────────────────────── */
function togglePassword() {
  const inp = pInput();
  const btn = document.getElementById('pass-toggle-btn');
  if (!inp || !btn) return;
  const isText = inp.type === 'text';
  inp.type = isText ? 'password' : 'text';
  btn.innerHTML = isText
    ? `<svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`
    : `<svg viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
}

/* ── Fill demo credentials ────────────────────────────────────── */
function fillDemo(username, password, role) {
  const u = uInput(); const p = pInput(); if (!u || !p) return;
  u.value = username;
  p.value = password;
  setRole(role);
  clearAlert();
  // Brief visual feedback
  u.style.borderColor = '#16a34a';
  p.style.borderColor = '#16a34a';
  setTimeout(() => { u.style.borderColor = ''; p.style.borderColor = ''; }, 1000);
}

/* ── Validate ─────────────────────────────────────────────────── */
function validate() {
  const u = uInput()?.value.trim();
  const p = pInput()?.value;
  if (!u || !p) { showAlert('Username dan password wajib diisi.'); return false; }
  if (p.length < 4) { showAlert('Password terlalu pendek.'); return false; }
  return true;
}

/* ── Loading state ────────────────────────────────────────────── */
function setLoading(on) {
  isLoading = on;
  const btn = submitBtn(); if (!btn) return;
  btn.disabled = on;
  btn.innerHTML = on
    ? `<div class="spinner"></div> Memverifikasi...`
    : `<svg viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10,17 15,12 10,7"/><line x1="15" y1="12" x2="3" y2="12"/></svg> Masuk`;
}

/* ── Submit ───────────────────────────────────────────────────── */
function handleLogin(e) {
  if (e) e.preventDefault();
  if (isLoading) return;
  clearAlert();
  if (!validate()) {
    document.getElementById('login-form')?.classList.add('shake');
    setTimeout(() => document.getElementById('login-form')?.classList.remove('shake'), 400);
    return;
  }

  const username = uInput().value.trim();
  const password = pInput().value;
  const remember = document.getElementById('remember-me')?.checked || false;

  setLoading(true);

  // Simulate network delay (realistic UX)
  setTimeout(() => {
    const result = PM_AUTH.login(username, password, selectedRole, remember);
    setLoading(false);

    if (!result.ok) {
      showAlert(result.msg);
      document.getElementById('login-form')?.classList.add('shake');
      setTimeout(() => document.getElementById('login-form')?.classList.remove('shake'), 400);
      pInput().value = '';
      return;
    }

    // Success → redirect based on role
    const user = result.user;
    showAlert(`✅ Selamat datang, <strong>${user.name}</strong>! Mengalihkan...`, 'ok');

    setTimeout(() => {
      const redirect = {
        admin:  'admin.html',
        seller: 'seller.html',
        buyer:  'index.html',
      };
      // Check if there's a saved intended page
      const saved = localStorage.getItem('pm_auth_redirect');
      if (saved) { localStorage.removeItem('pm_auth_redirect'); window.location.href = saved; return; }
      window.location.href = redirect[user.role] || 'index.html';
    }, 900);

  }, 700); // 700ms simulated auth delay
}

/* ── Init ─────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // If already logged in, redirect immediately
  const user = PM_AUTH.getCurrentUser();
  if (user) {
    const dest = { admin:'admin.html', seller:'seller.html', buyer:'index.html' };
    window.location.href = dest[user.role] || 'index.html';
    return;
  }

  // Bind role tabs
  document.querySelectorAll('.role-tab').forEach(tab => {
    tab.addEventListener('click', () => setRole(tab.dataset.role));
  });

  // Bind form
  document.getElementById('login-form')?.addEventListener('submit', handleLogin);
  document.getElementById('login-submit')?.addEventListener('click', handleLogin);

  // Password toggle
  document.getElementById('pass-toggle-btn')?.addEventListener('click', togglePassword);

  // Enter key on username field
  uInput()?.addEventListener('keydown', e => { if (e.key === 'Enter') pInput()?.focus(); });
  pInput()?.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(e); });

  // Read URL params (error messages / pre-fill)
  readUrlParams();

  // Set default role info
  updateRoleInfo('buyer');

  // Focus first field
  setTimeout(() => uInput()?.focus(), 300);
});
