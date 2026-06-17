/* ================================================================
   PURBALINGGA MART — cart.js
   Cart drawer + checkout redirect
   ================================================================ */
'use strict';

(function () {

  const fmt = n => 'Rp ' + Number(n).toLocaleString('id-ID');

  function openCart() {
    if (!PM_AUTH.isLoggedIn()) { PM_AUTH.showLoginModal(); return; }
    document.getElementById('pm-cart-drawer')?.remove();

    const cart  = PM_DB.getCart();
    const total = PM_DB.getCartTotal();
    const el    = document.createElement('div');
    el.id = 'pm-cart-drawer';
    el.innerHTML = `
      <div class="pm-cart-overlay" onclick="PM_CART.close()"></div>
      <div class="pm-cart-panel">
        <div class="pm-cart-header">
          <h2>🛒 Keranjang Belanja</h2>
          <button class="pm-cart-close" onclick="PM_CART.close()">✕</button>
        </div>
        <div class="pm-cart-body" id="pm-cart-body">${renderCartBody(cart)}</div>
        <div class="pm-cart-footer">
          <div class="pm-cart-total-row">
            <span>Total Belanja</span>
            <span class="pm-cart-total" id="pm-cart-total">${fmt(total)}</span>
          </div>
          <button class="pm-cart-checkout" onclick="PM_CART.checkout()">
            💳 Lanjut ke Pembayaran
          </button>
          <button class="pm-cart-continue" onclick="PM_CART.close()">
            ← Lanjut Belanja
          </button>
        </div>
      </div>`;
    document.body.appendChild(el);
    document.body.style.overflow = 'hidden';
    setTimeout(() => el.querySelector('.pm-cart-panel')?.classList.add('open'), 10);
  }

  function renderCartBody(cart) {
    if (!cart || cart.length === 0) {
      return `<div class="pm-empty-state" style="padding:48px 20px">
        <div class="pm-empty-icon">🛒</div>
        <div class="pm-empty-title">Keranjang Kosong</div>
        <div class="pm-empty-desc">Tambahkan produk dari marketplace.</div>
        <a href="index.html" style="display:inline-block;margin-top:14px;padding:9px 20px;background:#16a34a;color:#fff;border-radius:8px;font-weight:700;font-size:13px;text-decoration:none">Mulai Belanja →</a>
      </div>`;
    }
    return cart.map(item => `
      <div class="pm-cart-item" data-pid="${item.productId}">
        <img src="${item.image}" alt="${item.name}"
             onerror="this.src='https://picsum.photos/seed/${item.productId}/80/80'"
             style="width:56px;height:56px;border-radius:10px;object-fit:cover;flex-shrink:0">
        <div class="pm-ci-info">
          <div class="pm-ci-name">${item.name}</div>
          <div class="pm-ci-store">${item.storeName}</div>
          <div class="pm-ci-price">${fmt(item.price)}</div>
        </div>
        <div class="pm-ci-qty">
          <button onclick="PM_CART.updateQty('${item.productId}', ${item.qty - 1})">−</button>
          <span>${item.qty}</span>
          <button onclick="PM_CART.updateQty('${item.productId}', ${item.qty + 1})">+</button>
        </div>
        <button class="pm-ci-remove" onclick="PM_CART.removeItem('${item.productId}')" title="Hapus">✕</button>
      </div>`).join('');
  }

  function close() {
    const el = document.getElementById('pm-cart-drawer');
    if (!el) return;
    el.querySelector('.pm-cart-panel')?.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => el.remove(), 300);
  }

  function updateQty(productId, qty) {
    PM_DB.updateCartQty(productId, qty);
    const body    = document.getElementById('pm-cart-body');
    const totalEl = document.getElementById('pm-cart-total');
    if (body)    body.innerHTML    = renderCartBody(PM_DB.getCart());
    if (totalEl) totalEl.textContent = fmt(PM_DB.getCartTotal());
    window.PM_PRODUCTS?.updateCartBadge();
  }

  function removeItem(productId) {
    PM_DB.removeFromCart(productId);
    const body    = document.getElementById('pm-cart-body');
    const totalEl = document.getElementById('pm-cart-total');
    if (body)    body.innerHTML    = renderCartBody(PM_DB.getCart());
    if (totalEl) totalEl.textContent = fmt(PM_DB.getCartTotal());
    window.PM_PRODUCTS?.updateCartBadge();
    PM_AUTH.toast('Item dihapus dari keranjang', 'warn');
  }

  function checkout() {
    const cart = PM_DB.getCart();
    if (cart.length === 0) { PM_AUTH.toast('Keranjang kosong!', 'err'); return; }
    if (!PM_AUTH.isLoggedIn()) { PM_AUTH.showLoginModal(); return; }
    window.location.href = 'checkout.html';
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.cart-btn').forEach(btn => btn.addEventListener('click', openCart));
  });

  window.PM_CART = { openCart, close, updateQty, removeItem, checkout };

})();
