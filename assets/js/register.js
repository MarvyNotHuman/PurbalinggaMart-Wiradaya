'use strict';
/* ================================================================
   PURBALINGGA MART — Register Store JS
   register.js
   ================================================================ */

let isSubmitting = false;
let regRole = 'buyer'; // 'buyer' | 'seller'

/* ── Role switching ──────────────────────────────────────────── */
function setRegRole(role) {
  regRole = role;
  document.querySelectorAll('.role-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.role === role);
  });

  const section2   = document.getElementById('reg-section-2');
  const divider    = document.getElementById('reg-divider');
  const title      = document.getElementById('reg-title');
  const subtitle   = document.getElementById('reg-subtitle');
  const ownerLabel = document.getElementById('reg-owner-label');
  const ownerInput = document.getElementById('reg-owner');
  const infoText   = document.getElementById('reg-info-text');
  const stepLine   = document.getElementById('reg-step-line');
  const submitBtn  = document.getElementById('reg-submit');

  if (role === 'seller') {
    if (section2) section2.style.display = '';
    if (divider)  divider.style.display  = '';
    if (stepLine) stepLine.style.display = '';
    if (title)    title.textContent = 'Daftar Toko UMKM';
    if (subtitle) subtitle.textContent = 'Bergabung dengan marketplace lokal Purbalingga dan mulai berjualan hari ini.';
    if (ownerLabel) ownerLabel.innerHTML = 'Nama Pemilik <span style="color:#ef4444">*</span>';
    if (ownerInput) ownerInput.placeholder = 'Nama lengkap Anda';
    if (infoText) infoText.innerHTML = '<strong>Gratis mendaftar!</strong> Toko Anda akan langsung aktif setelah registrasi. Mulai upload produk dan terima pesanan dari seluruh Purbalingga.';
  } else {
    if (section2) section2.style.display = 'none';
    if (divider)  divider.style.display  = 'none';
    if (stepLine) stepLine.style.display = 'none';
    if (title)    title.textContent = 'Daftar Akun Pembeli';
    if (subtitle) subtitle.textContent = 'Buat akun untuk mulai berbelanja produk UMKM Purbalingga.';
    if (ownerLabel) ownerLabel.innerHTML = 'Nama Lengkap <span style="color:#ef4444">*</span>';
    if (ownerInput) ownerInput.placeholder = 'Nama lengkap Anda';
    if (infoText) infoText.innerHTML = '<strong>Gratis mendaftar!</strong> Akun Anda akan langsung aktif setelah registrasi. Mulai belanja produk UMKM lokal sekarang juga.';
  }

  clearAllErrors();
}

/* ── Password strength ────────────────────────────────────────── */
function checkStrength(pwd) {
  let score = 0;
  if (pwd.length >= 6)  score++;
  if (pwd.length >= 10) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return score; // 0-5
}

function updateStrengthUI(pwd) {
  const bars  = document.querySelectorAll('.strength-bar');
  const label = document.getElementById('strength-label');
  const score = checkStrength(pwd);
  const levels = [
    { cls:'',       text:'',             color:'#94a3b8' },
    { cls:'weak',   text:'Lemah',        color:'#ef4444' },
    { cls:'fair',   text:'Cukup',        color:'#f97316' },
    { cls:'good',   text:'Baik',         color:'#f59e0b' },
    { cls:'strong', text:'Kuat',         color:'#16a34a' },
    { cls:'strong', text:'Sangat Kuat',  color:'#15803d' },
  ];
  const level = levels[score] || levels[0];
  bars.forEach((bar, i) => {
    bar.className = 'strength-bar';
    if (i < score && level.cls) bar.classList.add(level.cls);
  });
  if (label) { label.textContent = level.text; label.style.color = level.color; }
}

/* ── Show / hide password ─────────────────────────────────────── */
function togglePass(inputId, btnId) {
  const inp = document.getElementById(inputId);
  const btn = document.getElementById(btnId);
  if (!inp || !btn) return;
  const isText = inp.type === 'text';
  inp.type = isText ? 'password' : 'text';
  btn.innerHTML = isText
    ? `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`
    : `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
}

/* ── Field error helpers ──────────────────────────────────────── */
function setFieldError(id, msg) {
  const el = document.getElementById(id);
  const err = document.getElementById(id + '-err');
  if (el) el.classList.add('error');
  if (err) { err.textContent = msg; err.style.display = 'block'; }
}
function clearFieldError(id) {
  const el = document.getElementById(id);
  const err = document.getElementById(id + '-err');
  if (el) el.classList.remove('error');
  if (err) err.style.display = 'none';
}
function clearAllErrors() {
  document.querySelectorAll('.form-input, .form-select').forEach(el => el.classList.remove('error'));
  document.querySelectorAll('[id$="-err"]').forEach(el => el.style.display = 'none');
  const alert = document.getElementById('reg-alert');
  if (alert) alert.classList.remove('show','ok-alert');
}

function showAlert(msg, type = 'error') {
  const el = document.getElementById('reg-alert');
  const m  = document.getElementById('reg-alert-msg');
  if (!el || !m) return;
  m.innerHTML = msg;
  el.className = 'auth-alert show';
  if (type === 'ok')   el.classList.add('ok-alert');
  if (type === 'info') el.classList.add('info-alert');
}

/* ── Validate ─────────────────────────────────────────────────── */
function validateForm() {
  let valid = true;
  clearAllErrors();

  const fields = [
    ['reg-username',  'Username wajib diisi (min 3 karakter)',     v => v.length >= 3],
    ['reg-email',     'Email wajib diisi dan valid',               v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)],
    ['reg-owner',     'Nama lengkap wajib diisi',                  v => v.length >= 2],
    ['reg-password',  'Password minimal 6 karakter',               v => v.length >= 6],
  ];

  if (regRole === 'seller') {
    fields.push(
      ['reg-storename', 'Nama toko wajib diisi (min 3 karakter)', v => v.length >= 3],
      ['reg-category',  'Pilih kategori toko',                     v => v !== '']
    );
  }

  fields.forEach(([id, msg, test]) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (!test(el.value.trim())) { setFieldError(id, msg); valid = false; }
  });

  const pass    = document.getElementById('reg-password')?.value    || '';
  const confirm = document.getElementById('reg-confirm-pass')?.value || '';
  if (pass.length >= 6 && pass !== confirm) {
    setFieldError('reg-confirm-pass', 'Konfirmasi password tidak cocok');
    valid = false;
  }

  const terms = document.getElementById('reg-terms');
  if (terms && !terms.checked) {
    showAlert('Anda harus menyetujui syarat dan ketentuan terlebih dahulu.');
    valid = false;
  }

  return valid;
}

/* ── Submit ───────────────────────────────────────────────────── */
function handleRegister() {
  if (isSubmitting) return;
  if (!validateForm()) return;

  isSubmitting = true;
  const btn = document.getElementById('reg-submit');
  if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner"></div> Mendaftarkan...'; }

  const data = {
    username:        document.getElementById('reg-username')?.value.trim(),
    email:           document.getElementById('reg-email')?.value.trim().toLowerCase(),
    password:        document.getElementById('reg-password')?.value,
    confirmPassword: document.getElementById('reg-confirm-pass')?.value,
    ownerName:       document.getElementById('reg-owner')?.value.trim(),
    storeName:       document.getElementById('reg-storename')?.value.trim(),
    category:        document.getElementById('reg-category')?.value,
    location:        document.getElementById('reg-location')?.value,
  };

  // Simulate network delay
  setTimeout(() => {
    const result = regRole === 'seller'
      ? PM_AUTH.registerSeller(data)
      : PM_AUTH.registerBuyer(data);
    isSubmitting = false;

    if (!result.ok) {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#fff" stroke-width="2.5"><polyline points="20,6 9,17 4,12"/></svg> Daftar Sekarang';
      }
      showAlert(result.msg);
      return;
    }

    // Success
    if (btn) { btn.disabled = false; btn.style.background = '#15803d'; btn.innerHTML = '✅ Berhasil! Mengalihkan ke halaman login...'; }

    if (regRole === 'seller') {
      showAlert(`🎉 Toko <strong>${data.storeName}</strong> berhasil didaftarkan! Silakan login untuk mulai berjualan.`, 'ok');
    } else {
      showAlert(`🎉 Akun <strong>${data.ownerName}</strong> berhasil didaftarkan! Silakan login untuk mulai berbelanja.`, 'ok');
    }

    // Save username for auto-fill on login page
    sessionStorage.setItem('pm_new_username', data.username);
    sessionStorage.setItem('pm_new_role', regRole);

    setTimeout(() => {
      window.location.href = `login.html?msg=registered&role=${regRole}`;
    }, 1800);
  }, 900);
}

/* ── Init ─────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // If already logged in, go to the appropriate panel
  const user = PM_AUTH.getCurrentUser();
  if (user) {
    const dest = { admin:'admin.html', seller:'seller.html', buyer:'index.html' };
    window.location.href = dest[user.role] || 'index.html';
    return;
  }

  // Role tabs
  document.querySelectorAll('.role-tab').forEach(tab => {
    tab.addEventListener('click', () => setRegRole(tab.dataset.role));
  });
  setRegRole('buyer');

  // Password strength listener
  document.getElementById('reg-password')?.addEventListener('input', function() {
    updateStrengthUI(this.value);
    clearFieldError('reg-password');
  });

  // Real-time field clear on input
  ['reg-username','reg-email','reg-storename','reg-owner','reg-confirm-pass'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => clearFieldError(id));
  });
  document.getElementById('reg-category')?.addEventListener('change', () => clearFieldError('reg-category'));

  // Toggle password visibility
  document.getElementById('pass-toggle-1')?.addEventListener('click', () => togglePass('reg-password', 'pass-toggle-1'));
  document.getElementById('pass-toggle-2')?.addEventListener('click', () => togglePass('reg-confirm-pass', 'pass-toggle-2'));

  // Submit
  document.getElementById('reg-submit')?.addEventListener('click', handleRegister);
  document.getElementById('reg-form')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) handleRegister();
  });
});
