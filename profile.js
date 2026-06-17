'use strict';
/* ================================================================
   PURBALINGGA MART — profile.js
   Halaman profil: edit info akun, ganti password, info toko, stats
   ================================================================ */

(function () {

  const fmt     = n => 'Rp ' + Number(n).toLocaleString('id-ID');
  const fmtDate = d => new Date(d).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric'
  });

  const ROLE_LABELS = { buyer: '🛒 Pembeli', seller: '🏪 Seller', admin: '👑 Admin' };
  const ROLE_ICONS  = { buyer: '🛒', seller: '🏪', admin: '👑' };

  const STATUS_CFG = {
    pending:  { icon: '⏳', label: 'Menunggu',  cls: 'pf-os-pending' },
    diproses: { icon: '📦', label: 'Dikemas',   cls: 'pf-os-diproses' },
    dikirim:  { icon: '🚚', label: 'Dikirim',   cls: 'pf-os-dikirim' },
    selesai:  { icon: '✅', label: 'Selesai',   cls: 'pf-os-selesai' },
  };

  /* ── Helpers ─────────────────────────────────────────────── */
  function $(id) { return document.getElementById(id); }
  function setTxt(id, val) { const el = $(id); if (el) el.textContent = val; }
  function showAlert(sectionId, msg, type = 'ok') {
    const al = $(sectionId);
    const mg = $(sectionId + '-msg');
    if (!al || !mg) return;
    mg.innerHTML = msg;
    al.className = 'pf-alert show ' + type;
    setTimeout(() => al.classList.remove('show'), 4000);
  }
  function showFieldErr(id, msg) {
    // id = field id (tanpa '-err'), misal 'pf-name'
    const err = $(id + '-err');
    if (err) { err.textContent = msg; err.style.display = 'block'; }
    $(id)?.classList.add('error');
  }
  function clearFieldErr(id) {
    const err = $(id + '-err');
    if (err) err.style.display = 'none';
    $(id)?.classList.remove('error');
  }

  /* ── Toggle password visibility ──────────────────────────── */
  window.pfTogglePass = function (inputId) {
    const inp = $(inputId);
    if (!inp) return;
    inp.type = inp.type === 'text' ? 'password' : 'text';
  };

  /* ── Init page ────────────────────────────────────────────── */
  function init() {
    const user = PM_AUTH.getCurrentUser();
    if (!user) {
      window.location.href = 'login.html?required=buyer';
      return;
    }

    renderHero(user);
    fillInfoForm(user);
    fillStoreForm(user);
    renderStats(user);
    renderRecentOrders(user);
    showRoleSections(user);
    bindAll(user);
  }

  /* ── Hero section ─────────────────────────────────────────── */
  function renderHero(user) {
    const avatar = user.avatar || `https://picsum.photos/seed/${user.username}/80/80`;
    $('pf-avatar-display').src = avatar;
    setTxt('pf-hero-name',  user.name);
    setTxt('pf-hero-user',  '@' + user.username + ' · ' + user.email);
    setTxt('pf-role-badge', ROLE_LABELS[user.role] || user.role);
    $('pf-role-icon').textContent = ROLE_ICONS[user.role] || '👤';

    const joined = user.createdAt ? 'Bergabung sejak ' + fmtDate(user.createdAt) : '';
    const store  = user.storeName ? '🏪 ' + user.storeName : '';
    setTxt('pf-hero-meta', [joined, store].filter(Boolean).join(' · '));

    // CTA button (seller → dashboard, buyer → open-store)
    const actEl = $('pf-hero-seller-btn');
    if (user.role === 'seller') {
      actEl.innerHTML = `<a href="seller.html" class="pf-btn pf-btn-ghost">
        <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
        Dashboard Seller</a>`;
    } else if (user.role === 'buyer') {
      actEl.innerHTML = `<a href="open-store.html" class="pf-btn pf-btn-ghost">🏪 Buka Toko</a>`;
    } else if (user.role === 'admin') {
      actEl.innerHTML = `<a href="admin.html" class="pf-btn pf-btn-ghost">
        <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/></svg>
        Admin Panel</a>`;
    }
  }

  /* ── Fill account info form ───────────────────────────────── */
  function fillInfoForm(user) {
    $('pf-username').value  = user.username;
    $('pf-name').value      = user.name || '';
    $('pf-email').value     = user.email || '';
    const avUrl = user.avatar || '';
    $('pf-av-url').value    = avUrl;
    $('pf-av-preview').src  = avUrl || `https://picsum.photos/seed/${user.username}/80/80`;

    // Preview avatar on URL change
    $('pf-av-url').addEventListener('input', function () {
      const val = this.value.trim();
      $('pf-av-preview').src = val || `https://picsum.photos/seed/${user.username}/80/80`;
    });
  }

  /* ── Fill store form (seller only) ───────────────────────── */
  function fillStoreForm(user) {
    if (user.role !== 'seller') return;
    $('pf-storename').value = user.storeName || '';
    const catEl = $('pf-category');
    if (catEl && user.category) catEl.value = user.category;
    const locEl = $('pf-location');
    if (locEl && user.location) locEl.value = user.location;
  }

  /* ── Show/hide role-specific cards ───────────────────────── */
  function showRoleSections(user) {
    if (user.role === 'seller') {
      $('pf-store-card').style.display = '';
      $('pf-open-store-card').style.display = 'none';
    } else if (user.role === 'buyer') {
      $('pf-store-card').style.display = 'none';
      $('pf-open-store-card').style.display = '';
    } else {
      $('pf-store-card').style.display = 'none';
      $('pf-open-store-card').style.display = 'none';
    }
  }

  /* ── Stats ────────────────────────────────────────────────── */
  function renderStats(user) {
    let txns = [];
    if (user.role === 'buyer') {
      txns = PM_TX.getByBuyer(user.id);
    } else if (user.role === 'seller') {
      txns = PM_TX.getBySeller(user.username);
    } else if (user.role === 'admin') {
      txns = PM_TX.getAll();
    }

    const active = txns.filter(t => t.status !== 'selesai').length;
    const done   = txns.filter(t => t.status === 'selesai').length;
    const spend  = txns.reduce((s, t) => s + (t.total || 0), 0);

    setTxt('pf-stat-orders', txns.length);
    setTxt('pf-stat-pending', active);
    setTxt('pf-stat-done', done);
    setTxt('pf-stat-spend', fmt(spend));

    // Relabel for seller/admin
    if (user.role === 'seller') {
      setTxt('pf-stat-spend-label', 'Total Omzet');
    } else if (user.role === 'admin') {
      setTxt('pf-stat-spend-label', 'Total Transaksi');
    }
  }

  /* ── Recent orders ────────────────────────────────────────── */
  function renderRecentOrders(user) {
    const el = $('pf-orders-list');
    if (!el) return;

    let txns = [];
    if (user.role === 'buyer') {
      txns = PM_TX.getByBuyer(user.id);
    } else if (user.role === 'seller') {
      txns = PM_TX.getBySeller(user.username);
    } else if (user.role === 'admin') {
      txns = PM_TX.getAll();
    }

    const recent = txns.slice(0, 5);
    if (recent.length === 0) {
      el.innerHTML = `<div style="text-align:center;color:#94a3b8;padding:24px 0;font-size:13px">
        Belum ada pesanan.</div>`;
      return;
    }

    el.innerHTML = recent.map(t => {
      const s     = STATUS_CFG[t.status] || STATUS_CFG.pending;
      const first = t.products?.[0];
      const more  = (t.products?.length || 1) - 1;
      return `
        <a href="invoice.html?id=${t.transactionId}" class="pf-order-row" style="text-decoration:none;color:inherit;display:flex">
          <img class="pf-order-img"
               src="${first?.image || ''}"
               onerror="this.src='https://picsum.photos/seed/${first?.productId||'x'}/80/80'"
               alt="${first?.name || ''}">
          <div class="pf-order-info">
            <div class="pf-order-name">${first?.name || t.transactionId}${more > 0 ? ` +${more} lainnya` : ''}</div>
            <div class="pf-order-meta">${t.transactionId} · ${fmt(t.total)}</div>
          </div>
          <span class="pf-order-status ${s.cls}">${s.icon} ${s.label}</span>
        </a>`;
    }).join('');
  }

  /* ── Save account info ────────────────────────────────────── */
  function saveInfo() {
    clearFieldErr('pf-name');
    clearFieldErr('pf-email');

    const name   = $('pf-name')?.value.trim();
    const email  = $('pf-email')?.value.trim().toLowerCase();
    const avatar = $('pf-av-url')?.value.trim();

    let valid = true;
    if (!name || name.length < 2) { showFieldErr('pf-name', 'Nama wajib diisi (min 2 karakter)'); valid = false; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showFieldErr('pf-email', 'Email tidak valid'); valid = false; }
    if (!valid) return;

    const result = PM_AUTH.updateProfile({ name, email, avatar });
    if (!result.ok) {
      showAlert('pf-info-alert', result.msg, 'err');
      return;
    }
    showAlert('pf-info-alert', '✅ Informasi akun berhasil diperbarui!', 'ok');
    renderHero(PM_AUTH.getCurrentUser());
    $('pf-avatar-display').src = avatar || `https://picsum.photos/seed/${PM_AUTH.getCurrentUser().username}/80/80`;
  }

  /* ── Change password ─────────────────────────────────────── */
  function changePassword() {
    ['pf-pass-old', 'pf-pass-new', 'pf-pass-confirm'].forEach(id => clearFieldErr(id));

    const oldPass = $('pf-pass-old')?.value;
    const newPass = $('pf-pass-new')?.value;
    const confirm = $('pf-pass-confirm')?.value;

    let valid = true;
    if (!oldPass) { showFieldErr('pf-pass-old', 'Masukkan password saat ini'); valid = false; }
    if (!newPass || newPass.length < 6) { showFieldErr('pf-pass-new', 'Password baru min. 6 karakter'); valid = false; }
    if (newPass && newPass !== confirm) { showFieldErr('pf-pass-confirm', 'Konfirmasi password tidak cocok'); valid = false; }
    if (!valid) return;

    const result = PM_AUTH.changePassword(oldPass, newPass);
    if (!result.ok) {
      showAlert('pf-pass-alert', result.msg, 'err');
      if (result.field === 'old') showFieldErr('pf-pass-old', result.msg);
      return;
    }
    showAlert('pf-pass-alert', '✅ Password berhasil diubah!', 'ok');
    ['pf-pass-old', 'pf-pass-new', 'pf-pass-confirm'].forEach(id => { const el = $(id); if (el) el.value = ''; });
  }

  /* ── Save store info (seller) ─────────────────────────────── */
  function saveStore() {
    clearFieldErr('pf-storename');
    const storeName = $('pf-storename')?.value.trim();
    const category  = $('pf-category')?.value;
    const location  = $('pf-location')?.value;

    if (!storeName || storeName.length < 3) {
      showFieldErr('pf-storename', 'Nama toko min. 3 karakter');
      return;
    }

    const result = PM_AUTH.updateStoreInfo({ storeName, category, location });
    if (!result.ok) {
      showAlert('pf-store-alert', result.msg, 'err');
      return;
    }
    showAlert('pf-store-alert', '✅ Informasi toko berhasil diperbarui!', 'ok');
    renderHero(PM_AUTH.getCurrentUser());
  }

  /* ── Bind all buttons ─────────────────────────────────────── */
  function bindAll(user) {
    $('pf-save-info-btn')?.addEventListener('click', saveInfo);
    $('pf-save-pass-btn')?.addEventListener('click', changePassword);
    if (user.role === 'seller') {
      $('pf-save-store-btn')?.addEventListener('click', saveStore);
    }
    // Clear errors on input
    ['pf-name', 'pf-email', 'pf-storename', 'pf-pass-old', 'pf-pass-new', 'pf-pass-confirm'].forEach(id => {
      $(id)?.addEventListener('input', () => clearFieldErr(id));
    });
  }

  document.addEventListener('DOMContentLoaded', init);

})();
