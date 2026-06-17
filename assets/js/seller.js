/* ================================================================
   PURBALINGGA MART — seller.js
   Seller panel: CRUD products, dashboard, stats
   ================================================================ */
'use strict';

(function () {

  const fmt = n => 'Rp ' + Number(n).toLocaleString('id-ID');

  /* ── Seller panel state ──────────────────────────────────── */
  let currentSeller = null;
  let editingProductId = null;

  /* ================================================================
     INIT
     ================================================================ */
  function init() {
    if (!PM_AUTH.requireRole('seller')) return;
    currentSeller = PM_AUTH.getCurrentUser();
    PM_AUTH.updateSellerNav();
    updateSellerInfo();
    renderDashboard();
    renderMyProducts();
    initAddProductForm();

    // Listen for DB changes
    window.addEventListener('storage', e => {
      if (e.key === 'pm_products') {
        renderDashboard();
        renderMyProducts();
      }
    });
  }

  /* ── Update seller info in sidebar ──────────────────────── */
  function updateSellerInfo() {
    if (!currentSeller) return;
    document.querySelectorAll('.sb-store-name-text').forEach(el => {
      el.textContent = currentSeller.storeName || 'Toko Saya';
    });
    document.querySelectorAll('.sb-store-av-img, .tb-profile-img').forEach(el => {
      el.src = currentSeller.avatar || 'https://picsum.photos/seed/default/80/80';
    });
    document.querySelectorAll('.tb-seller-name').forEach(el => {
      el.textContent = currentSeller.name;
    });
  }

  /* ================================================================
     DASHBOARD
     ================================================================ */
  function renderDashboard() {
    const products = PM_DB.getProductsBySeller(currentSeller.username || currentSeller.storeId);
    const active = products.filter(p => p.status === 'active');
    const totalSold = products.reduce((s, p) => s + (p.sold || 0), 0);
    const revenue = products.reduce((s, p) => s + (p.sold || 0) * p.price, 0);

    setDashStat('dash-total-products',  products.length);
    setDashStat('dash-active-products', active.length);
    setDashStat('dash-total-sold',      totalSold);
    setDashStat('dash-revenue',         fmt(revenue));

    // Render recent products in dashboard
    const recentEl = document.getElementById('dash-recent-products');
    if (recentEl) {
      const recent = [...products].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
      if (recent.length === 0) {
        recentEl.innerHTML = `<div class="pm-empty-state" style="padding:24px">
          <div class="pm-empty-icon">📦</div>
          <div class="pm-empty-title">Belum Ada Produk</div>
          <div class="pm-empty-desc">Tambah produk pertama Anda!</div>
        </div>`;
      } else {
        recentEl.innerHTML = recent.map(p => `
          <div class="dp-row">
            <img src="${p.image}" alt="${p.name}"
                 onerror="this.src='https://picsum.photos/seed/${p.id}/80/80'"
                 style="width:40px;height:40px;border-radius:8px;object-fit:cover;flex-shrink:0">
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:600;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name}</div>
              <div style="font-size:11.5px;color:#64748b">${fmt(p.price)} · Stok: ${p.stock}</div>
            </div>
            <span class="dp-status ${p.status === 'active' ? 'dp-active' : 'dp-inactive'}">${p.status}</span>
          </div>`).join('');
      }
    }
  }

  function setDashStat(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  /* ================================================================
     MY PRODUCTS TABLE
     ================================================================ */
  function renderMyProducts() {
    const products = PM_DB.getProductsBySeller(currentSeller.username || currentSeller.storeId);
    const el = document.getElementById('seller-products-list');
    if (!el) return;

    if (products.length === 0) {
      el.innerHTML = `<div class="pm-empty-state" style="padding:48px 20px">
        <div class="pm-empty-icon">📦</div>
        <div class="pm-empty-title">Belum Ada Produk</div>
        <div class="pm-empty-desc">Klik "Tambah Produk" untuk mulai berjualan.</div>
        <button class="pm-btn-green" onclick="switchSection('add-product')" style="margin-top:16px">
          + Tambah Produk Pertama
        </button>
      </div>`;
      return;
    }

    el.innerHTML = `
      <div class="sp-table-wrap">
        <table class="sp-table">
          <thead>
            <tr>
              <th>Produk</th>
              <th>Kategori</th>
              <th>Harga</th>
              <th>Stok</th>
              <th>Terjual</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            ${products.map(p => `
              <tr data-id="${p.id}">
                <td>
                  <div style="display:flex;align-items:center;gap:10px">
                    <img src="${p.image}" alt="${p.name}"
                         onerror="this.src='https://picsum.photos/seed/${p.id}/80/80'"
                         style="width:44px;height:44px;border-radius:8px;object-fit:cover;flex-shrink:0">
                    <div>
                      <div style="font-weight:600;font-size:13px;color:#1e293b">${p.name}</div>
                      <div style="font-size:11px;color:#94a3b8">📍 ${p.location}</div>
                    </div>
                  </div>
                </td>
                <td><span class="sp-cat-tag">${p.category}</span></td>
                <td>
                  <div style="font-weight:700;color:#16a34a;font-size:13px">${fmt(p.price)}</div>
                  ${p.originalPrice > p.price ? `<div style="font-size:11px;color:#94a3b8;text-decoration:line-through">${fmt(p.originalPrice)}</div>` : ''}
                </td>
                <td>
                  <span class="${p.stock === 0 ? 'text-danger' : p.stock <= 5 ? 'text-warn' : ''}" style="font-weight:600;font-size:13px">
                    ${p.stock}
                  </span>
                </td>
                <td style="font-weight:600;font-size:13px">${p.sold}</td>
                <td>
                  <span class="sp-status ${p.status === 'active' ? 'sp-active' : p.status === 'suspended' ? 'sp-suspended' : 'sp-hidden'}">
                    ${p.status}
                  </span>
                </td>
                <td>
                  <div style="display:flex;gap:6px;flex-wrap:wrap">
                    <button class="sp-btn sp-btn-edit" onclick="PM_SELLER.editProduct('${p.id}')">✏️ Edit</button>
                    <button class="sp-btn sp-btn-del"  onclick="PM_SELLER.deleteProduct('${p.id}')">🗑️ Hapus</button>
                  </div>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  /* ================================================================
     ADD / EDIT PRODUCT FORM
     ================================================================ */
  function initAddProductForm() {
    const form = document.getElementById('add-product-form');
    if (!form) return;

    // Image preview
    document.getElementById('prod-image-file')?.addEventListener('change', function () {
      const file = this.files[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) {
        PM_AUTH.toast('Ukuran gambar maksimal 2MB', 'err');
        return;
      }
      const reader = new FileReader();
      reader.onload = e => {
        const preview = document.getElementById('image-preview');
        if (preview) {
          preview.src = e.target.result;
          preview.style.display = 'block';
        }
        document.getElementById('prod-image-b64').value = e.target.result;
      };
      reader.readAsDataURL(file);
    });

    // Submit
    document.getElementById('save-product-btn')?.addEventListener('click', saveProduct);
    document.getElementById('cancel-product-btn')?.addEventListener('click', resetForm);
  }

  /* ── Save product (add or edit) ──────────────────────────── */
  function saveProduct() {
    const name     = document.getElementById('prod-name')?.value.trim();
    const price    = parseInt(document.getElementById('prod-price')?.value);
    const origPrice= parseInt(document.getElementById('prod-orig-price')?.value) || price;
    const stock    = parseInt(document.getElementById('prod-stock')?.value);
    const category = document.getElementById('prod-category')?.value;
    const location = document.getElementById('prod-location')?.value;
    const durability = document.getElementById('prod-durability')?.value || 'tahan-lama';
    const desc     = document.getElementById('prod-desc')?.value.trim();
    const badge    = document.getElementById('prod-badge')?.value;
    const promo    = document.getElementById('prod-promo')?.checked;
    let   image    = document.getElementById('prod-image-b64')?.value ||
                     document.getElementById('prod-image-url')?.value.trim();

    // Validation
    if (!name)     { PM_AUTH.toast('Nama produk wajib diisi', 'err'); return; }
    if (!price || price <= 0) { PM_AUTH.toast('Harga harus lebih dari 0', 'err'); return; }
    if (isNaN(stock) || stock < 0) { PM_AUTH.toast('Stok tidak valid', 'err'); return; }
    if (!category) { PM_AUTH.toast('Pilih kategori produk', 'err'); return; }

    if (!image) {
      image = `https://picsum.photos/seed/${encodeURIComponent(name)}/400/300`;
    }

    const productData = {
      name, price, originalPrice: origPrice || price,
      stock, category, location: location || 'Purbalingga Kota',
      description: desc,
      badge: badge || '',
      promo: promo || false,
      perishable: durability === 'cepat-basi',
      image,
      sellerId: currentSeller.storeId || currentSeller.username,
      sellerUsername: currentSeller.username,
      storeName: currentSeller.storeName || 'Toko Saya',
      storeId: currentSeller.storeId,
    };

    const btn = document.getElementById('save-product-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Menyimpan...'; }

    setTimeout(() => {
      let savedProduct;
      if (editingProductId) {
        savedProduct = PM_DB.updateProduct(editingProductId, productData);
        PM_AUTH.toast('✅ Produk berhasil diperbarui!', 'ok');
        editingProductId = null;
      } else {
        savedProduct = PM_DB.addProduct(productData);
        PM_AUTH.toast('✅ Produk berhasil ditambahkan!', 'ok');
      }

      // [FIX] Sync produk ke Supabase setelah disimpan ke localStorage
      if (savedProduct && typeof PM_UPLOAD !== 'undefined') {
        PM_UPLOAD.syncProduct(savedProduct).catch(() => {});
      }

      if (btn) { btn.disabled = false; btn.textContent = editingProductId ? 'Update Produk' : 'Simpan Produk'; }

      renderMyProducts();
      renderDashboard();
      resetForm();
      switchSection('products');
    }, 600);
  }

  /* ── Edit product ────────────────────────────────────────── */
  function editProduct(id) {
    const p = PM_DB.getProductById(id);
    if (!p) return;

    editingProductId = id;
    switchSection('add-product');

    // Fill form
    setTimeout(() => {
      document.getElementById('prod-name') && (document.getElementById('prod-name').value = p.name);
      document.getElementById('prod-price') && (document.getElementById('prod-price').value = p.price);
      document.getElementById('prod-orig-price') && (document.getElementById('prod-orig-price').value = p.originalPrice || '');
      document.getElementById('prod-stock') && (document.getElementById('prod-stock').value = p.stock);
      document.getElementById('prod-category') && (document.getElementById('prod-category').value = p.category);
      document.getElementById('prod-location') && (document.getElementById('prod-location').value = p.location);
      document.getElementById('prod-desc') && (document.getElementById('prod-desc').value = p.description || '');
      document.getElementById('prod-badge') && (document.getElementById('prod-badge').value = p.badge || '');
      document.getElementById('prod-promo') && (document.getElementById('prod-promo').checked = p.promo || false);
      document.getElementById('prod-durability') && (document.getElementById('prod-durability').value = p.perishable ? 'cepat-basi' : 'tahan-lama');
      document.getElementById('prod-image-url') && (document.getElementById('prod-image-url').value = p.image && !p.image.startsWith('data:') ? p.image : '');

      const preview = document.getElementById('image-preview');
      if (preview && p.image) {
        preview.src = p.image;
        preview.style.display = 'block';
      }

      // Update button text
      const btn = document.getElementById('save-product-btn');
      const heading = document.getElementById('add-product-heading');
      if (btn) btn.textContent = 'Update Produk';
      if (heading) heading.textContent = 'Edit Produk';
    }, 50);
  }

  /* ── Delete product ──────────────────────────────────────── */
  function deleteProduct(id) {
    const p = PM_DB.getProductById(id);
    if (!p) return;
    if (!confirm(`Hapus produk "${p.name}"?\nTindakan ini tidak dapat dibatalkan.`)) return;
    PM_DB.deleteProduct(id);
    PM_AUTH.toast('🗑️ Produk dihapus.', 'warn');
    renderMyProducts();
    renderDashboard();
  }

  /* ── Reset form ──────────────────────────────────────────── */
  function resetForm() {
    editingProductId = null;
    document.getElementById('add-product-form')?.reset();
    const preview = document.getElementById('image-preview');
    if (preview) { preview.src = ''; preview.style.display = 'none'; }
    document.getElementById('prod-image-b64') && (document.getElementById('prod-image-b64').value = '');
    const btn = document.getElementById('save-product-btn');
    const heading = document.getElementById('add-product-heading');
    if (btn) btn.textContent = 'Simpan Produk';
    if (heading) heading.textContent = 'Tambah Produk';
  }

  /* ── Expose ──────────────────────────────────────────────── */
  window.PM_SELLER = { init, editProduct, deleteProduct, renderMyProducts };
  document.addEventListener('DOMContentLoaded', init);

})();
