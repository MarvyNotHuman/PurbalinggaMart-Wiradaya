'use strict';
/* ================================================================
   PURBALINGGA MART — Open Store (Buyer → Seller upgrade) JS
   open-store.js
   ================================================================ */

let osSubmitting = false;

function osSetFieldError(id, msg) {
  const el  = document.getElementById(id);
  const err = document.getElementById(id + '-err');
  if (el)  el.classList.add('error');
  if (err) { err.textContent = msg; err.style.display = 'block'; }
}
function osClearFieldError(id) {
  const el  = document.getElementById(id);
  const err = document.getElementById(id + '-err');
  if (el)  el.classList.remove('error');
  if (err) err.style.display = 'none';
}
function osClearAllErrors() {
  document.querySelectorAll('.form-input, .form-select').forEach(el => el.classList.remove('error'));
  document.querySelectorAll('[id$="-err"]').forEach(el => el.style.display = 'none');
  document.getElementById('os-alert')?.classList.remove('show', 'ok-alert', 'info-alert');
}
function osShowAlert(msg, type = 'error') {
  const el = document.getElementById('os-alert');
  const m  = document.getElementById('os-alert-msg');
  if (!el || !m) return;
  m.innerHTML = msg;
  el.className = 'auth-alert show';
  if (type === 'ok')   el.classList.add('ok-alert');
  if (type === 'info') el.classList.add('info-alert');
}

function osValidate() {
  let valid = true;
  osClearAllErrors();

  const storeName = document.getElementById('os-storename')?.value.trim() || '';
  const category  = document.getElementById('os-category')?.value || '';

  if (storeName.length < 3) { osSetFieldError('os-storename', 'Nama toko wajib diisi (min 3 karakter)'); valid = false; }
  if (!category)            { osSetFieldError('os-category', 'Pilih kategori toko'); valid = false; }

  return valid;
}

function osSubmit() {
  if (osSubmitting) return;
  if (!osValidate()) return;

  osSubmitting = true;
  const btn = document.getElementById('os-submit');
  if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner"></div> Menyimpan...'; }

  const data = {
    storeName: document.getElementById('os-storename')?.value.trim(),
    category:  document.getElementById('os-category')?.value,
    location:  document.getElementById('os-location')?.value,
  };

  setTimeout(() => {
    const result = PM_AUTH.upgradeToSeller(data);
    osSubmitting = false;

    if (!result.ok) {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#fff" stroke-width="2.5"><polyline points="20,6 9,17 4,12"/></svg> Buka Toko Sekarang';
      }
      osShowAlert(result.msg);
      return;
    }

    if (btn) { btn.disabled = false; btn.style.background = '#15803d'; btn.innerHTML = '✅ Berhasil! Mengalihkan ke Dashboard Seller...'; }
    osShowAlert(`🎉 Toko <strong>${data.storeName}</strong> berhasil dibuka! Mengalihkan ke Dashboard Seller...`, 'ok');

    setTimeout(() => {
      window.location.href = 'seller.html';
    }, 1400);
  }, 700);
}

document.addEventListener('DOMContentLoaded', () => {
  const user = PM_AUTH.getCurrentUser();

  // Must be logged in
  if (!user) {
    window.location.href = 'login.html?required=buyer';
    return;
  }
  // Sellers/admins already have a store / don't need this page
  if (user.role === 'seller') {
    window.location.href = 'seller.html';
    return;
  }
  if (user.role === 'admin') {
    window.location.href = 'admin.html';
    return;
  }

  ['os-storename', 'os-category'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => osClearFieldError(id));
    document.getElementById(id)?.addEventListener('change', () => osClearFieldError(id));
  });

  document.getElementById('os-submit')?.addEventListener('click', osSubmit);
  document.getElementById('os-form')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) osSubmit();
  });
});
