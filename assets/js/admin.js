/* ================================================================
   PURBALINGGA MART — admin.js
   Admin panel: manage all products, sellers, stats
   ================================================================ */
'use strict';

(function () {

  const fmt = n => 'Rp ' + Number(n).toLocaleString('id-ID');

  /* ================================================================
     INIT
     ================================================================ */
  function init() {
    if (!PM_AUTH.requireRole('admin')) return;
    renderAdminDashboard();
    renderAdminProducts();
    renderAdminSellers();

    // Refresh on DB changes
    window.addEventListener('storage', e => {
      if (e.key === 'pm_products' || e.key === 'pm_auth_users') {
        renderAdminDashboard();
        renderAdminProducts();
        renderAdminSellers();
      }
    });
  }

  /* ================================================================
     DASHBOARD STATS
     ================================================================ */
  function renderAdminDashboard() {
    const stats    = PM_DB.getStats();
    const users    = PM_AUTH.getUsers();
    const sellers  = users.filter(u => u.role === 'seller');
    const buyers   = users.filter(u => u.role === 'buyer');
    const products = PM_DB.getProducts();
    const promo    = PM_DB.getPromo();

    // Summary cards
    setStat('adm-total-products',  stats.total);
    setStat('adm-active-products', stats.active);
    setStat('adm-total-sellers',   sellers.length);
    setStat('adm-total-buyers',    buyers.length);
    setStat('adm-total-promo',     promo.length);
    setStat('adm-total-categories',stats.categories);
    setStat('adm-total-locations', stats.locations);

    // Estimated revenue
    const revenue = products.reduce((s, p) => s + (p.sold || 0) * p.price, 0);
    setStat('adm-est-revenue', fmt(revenue));

    // Top categories chart (text-based)
    const catEl = document.getElementById('adm-cat-breakdown');
    if (catEl) {
      const cats = {};
      products.forEach(p => { cats[p.category] = (cats[p.category] || 0) + 1; });
      catEl.innerHTML = Object.entries(cats)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, cnt]) => `
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
            <span style="font-size:13px;color:#1e293b;min-width:100px;text-transform:capitalize">${cat}</span>
            <div style="flex:1;background:#f1f5f9;border-radius:4px;height:8px;overflow:hidden">
              <div style="width:${Math.round(cnt/products.length*100)}%;height:100%;background:#16a34a;border-radius:4px;transition:width .6s ease"></div>
            </div>
            <span style="font-size:12px;color:#64748b;min-width:30px;text-align:right">${cnt}</span>
          </div>`).join('');
    }
  }

  function setStat(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  /* ================================================================
     ALL PRODUCTS TABLE
     ================================================================ */
  function renderAdminProducts(filter = '') {
    const el = document.getElementById('admin-products-list');
    if (!el) return;

    let products = PM_DB.getProducts();
    if (filter) {
      const q = filter.toLowerCase();
      products = products.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.storeName.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    }

    if (products.length === 0) {
      el.innerHTML = `<div class="pm-empty-state" style="padding:40px">
        <div class="pm-empty-icon">📦</div>
        <div class="pm-empty-title">Tidak Ada Produk</div>
      </div>`;
      return;
    }

    el.innerHTML = `
      <div style="overflow-x:auto">
        <table class="sp-table">
          <thead>
            <tr>
              <th>Produk</th>
              <th>Toko / Seller</th>
              <th>Kategori</th>
              <th>Harga</th>
              <th>Stok</th>
              <th>Terjual</th>
              <th>Status</th>
              <th>Aksi Admin</th>
            </tr>
          </thead>
          <tbody>
            ${products.map(p => `
              <tr>
                <td>
                  <div style="display:flex;align-items:center;gap:10px">
                    <img src="${p.image}" alt="${p.name}"
                         onerror="this.src='https://picsum.photos/seed/${p.id}/80/80'"
                         style="width:42px;height:42px;border-radius:8px;object-fit:cover;flex-shrink:0">
                    <div style="font-weight:600;font-size:13px;color:#1e293b">${p.name}</div>
                  </div>
                </td>
                <td style="font-size:12.5px;color:#64748b">${p.storeName || '-'}</td>
                <td><span class="sp-cat-tag">${p.category}</span></td>
                <td style="font-weight:700;color:#16a34a;font-size:13px">${fmt(p.price)}</td>
                <td style="font-weight:600;font-size:13px">${p.stock}</td>
                <td style="font-weight:600;font-size:13px">${p.sold}</td>
                <td>
                  <span class="sp-status ${p.status === 'active' ? 'sp-active' : 'sp-suspended'}">
                    ${p.status}
                  </span>
                </td>
                <td>
                  <div style="display:flex;gap:5px;flex-wrap:wrap">
                    ${p.status === 'active'
                      ? `<button class="sp-btn sp-btn-suspend" onclick="PM_ADMIN.suspendProduct('${p.id}')">⏸ Suspend</button>`
                      : `<button class="sp-btn sp-btn-edit" onclick="PM_ADMIN.activateProduct('${p.id}')">▶ Aktifkan</button>`
                    }
                    <button class="sp-btn sp-btn-del" onclick="PM_ADMIN.deleteProduct('${p.id}')">🗑 Hapus</button>
                  </div>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  /* ================================================================
     SELLERS TABLE
     ================================================================ */
  function renderAdminSellers() {
    const el = document.getElementById('admin-sellers-list');
    if (!el) return;

    const sellers = PM_AUTH.getUsers().filter(u => u.role === 'seller');
    if (sellers.length === 0) {
      el.innerHTML = `<div class="pm-empty-state" style="padding:40px">
        <div class="pm-empty-icon">🏪</div>
        <div class="pm-empty-title">Belum Ada Seller</div>
      </div>`;
      return;
    }

    el.innerHTML = `
      <div style="overflow-x:auto">
        <table class="sp-table">
          <thead>
            <tr>
              <th>Seller</th>
              <th>Toko</th>
              <th>Kategori</th>
              <th>Lokasi</th>
              <th>Produk</th>
              <th>Total Terjual</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${sellers.map(s => {
              const products = PM_DB.getProductsBySeller(s.username);
              const totalSold = products.reduce((sum, p) => sum + (p.sold || 0), 0);
              return `
              <tr>
                <td>
                  <div style="display:flex;align-items:center;gap:10px">
                    <img src="${s.avatar || 'https://picsum.photos/seed/default/80/80'}" alt="${s.name}"
                         style="width:36px;height:36px;border-radius:50%;object-fit:cover">
                    <div>
                      <div style="font-weight:600;font-size:13px">${s.name}</div>
                      <div style="font-size:11px;color:#94a3b8">@${s.username}</div>
                    </div>
                  </div>
                </td>
                <td style="font-weight:600;font-size:13px">${s.storeName || '-'}</td>
                <td><span class="sp-cat-tag">${s.category || '-'}</span></td>
                <td style="font-size:12.5px;color:#64748b">📍 ${s.location || '-'}</td>
                <td style="font-weight:600">${products.length}</td>
                <td style="font-weight:600">${totalSold}</td>
                <td><span class="sp-status sp-active">active</span></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  }

  /* ── Product actions ─────────────────────────────────────── */
  function suspendProduct(id) {
    const p = PM_DB.getProductById(id);
    if (!confirm(`Suspend produk "${p?.name}"?`)) return;
    PM_DB.suspendProduct(id);
    PM_AUTH.toast('⏸ Produk disuspend.', 'warn');
    renderAdminProducts();
    renderAdminDashboard();
  }

  function activateProduct(id) {
    PM_DB.activateProduct(id);
    PM_AUTH.toast('▶ Produk diaktifkan!', 'ok');
    renderAdminProducts();
    renderAdminDashboard();
  }

  function deleteProduct(id) {
    const p = PM_DB.getProductById(id);
    if (!confirm(`Hapus permanen produk "${p?.name}"?`)) return;
    PM_DB.deleteProduct(id);
    PM_AUTH.toast('🗑️ Produk dihapus.', 'warn');
    renderAdminProducts();
    renderAdminDashboard();
  }

  /* ── Expose ──────────────────────────────────────────────── */
  window.PM_ADMIN = { init, renderAdminProducts, renderAdminSellers, suspendProduct, activateProduct, deleteProduct };
  document.addEventListener('DOMContentLoaded', init);

})();
