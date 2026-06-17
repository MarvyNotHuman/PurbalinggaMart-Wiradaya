/* ================================================================
   PURBALINGGA MART — orders.js
   Order history: list, status, invoice link, admin/seller views
   ================================================================ */
'use strict';

(function () {

  const fmt     = n => 'Rp ' + Number(n).toLocaleString('id-ID');
  const fmtDate = d => new Date(d).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const STATUS_CFG = {
    pending:    { label: 'Menunggu',         cls: 'os-pending',    icon: '⏳' },
    diproses:   { label: 'Diproses',         cls: 'os-process',    icon: '🔄' },
    dikemas:    { label: 'Dikemas',          cls: 'os-packed',     icon: '📦' },  // [FIX] was missing
    dikirim:    { label: 'Dikirim',          cls: 'os-sent',       icon: '🚚' },
    tiba:       { label: 'Tiba di Tujuan',   cls: 'os-arrived',    icon: '📍' },  // [FIX] was missing
    diterima:   { label: 'Diterima Pembeli', cls: 'os-received',   icon: '🤝' },  // [FIX] was missing
    selesai:    { label: 'Selesai',          cls: 'os-done',       icon: '✅' },
    dibatalkan: { label: 'Dibatalkan',       cls: 'os-cancelled',  icon: '❌' },  // [FIX] was missing
  };

  const SHIPPING_ICONS = {
    regular: '🚛', express: '⚡', seller: '🛵', pickup: '🤝',
  };
  function shippingIcon(type) {
    return SHIPPING_ICONS[type] || '🚛';
  }

  let activeFilter = 'all';
  let searchQuery  = '';

  /* ── Init ────────────────────────────────────────────────── */
  /* ── Fetch orders dari Supabase sesuai role ─────────────── */
  async function fetchOrdersFromSupabase(user) {
    if (typeof SB === 'undefined') return null;
    try {
      let rows;
      if (user.role === 'buyer') {
        rows = await SB.get('pm_transactions', `?buyer_id=eq.${user.id}&order=created_at.desc`);
      } else if (user.role === 'seller') {
        // Ambil semua transaksi, filter produk milik seller ini
        rows = await SB.get('pm_transactions', '?order=created_at.desc');
        rows = rows.filter(r => {
          try {
            const prods = typeof r.products === 'string' ? JSON.parse(r.products) : r.products;
            return prods.some(p => p.sellerUsername === user.username);
          } catch { return false; }
        });
      } else {
        rows = await SB.get('pm_transactions', '?order=created_at.desc');
      }

      if (!rows || rows.length === 0) return null;

      // Map kolom Supabase → format yang dipakai orders.js
      return rows.map(r => ({
        transactionId:  r.id,
        buyerId:        r.buyer_id,
        buyerName:      r.buyer_name,
        buyerEmail:     r.buyer_email,
        products:       typeof r.products === 'string' ? JSON.parse(r.products) : r.products,
        subtotal:       r.subtotal,
        shipping:       r.shipping,
        shippingOriginal: r.shipping_original,
        shippingType:   r.shipping_type,
        shippingLabel:  r.shipping_label,
        notes:          r.notes,
        discount:       r.discount,
        serviceFee:     r.service_fee,
        total:          r.total,
        paymentMethod:  r.payment_method,
        address:        typeof r.address === 'string' ? JSON.parse(r.address) : r.address,
        voucher:        r.voucher,
        voucherLabel:   r.voucher_label,
        status:         r.status,
        statusHistory:  typeof r.status_history === 'string' ? JSON.parse(r.status_history) : (r.status_history || []),
        createdAt:      r.created_at,
        updatedAt:      r.updated_at,
      }));
    } catch (e) {
      console.warn('[Orders] Gagal fetch dari Supabase, pakai localStorage:', e.message);
      return null;
    }
  }

  async function init() {
    if (!PM_AUTH.isLoggedIn()) {
      window.location.href = 'login.html?required=buyer';
      return;
    }

    const user = PM_AUTH.getCurrentUser();

    if (user.role === 'admin') {
      renderAdminOrders();
    } else if (user.role === 'seller') {
      renderSellerOrders(user.username);
    } else {
      renderBuyerOrders(user.id);
    }

    bindFilters();
    bindSearch();
  }

  /* ── BUYER ORDERS ────────────────────────────────────────── */
  function renderBuyerOrders(buyerId) {
    const sbTxns = await fetchOrdersFromSupabase(user);
    const txns = sbTxns || PM_TX.getByBuyer(buyerId);

    // Update page heading
    setTxt('orders-heading', 'Pesanan Saya');
    setTxt('orders-sub',     `${txns.length} total transaksi`);

    renderOrderStats(txns);
    renderOrderList(txns, 'buyer');
  }

  /* ── SELLER ORDERS ───────────────────────────────────────── */
  function renderSellerOrders(sellerUsername) {
    const sbTxns = await fetchOrdersFromSupabase(user);
    const txns = sbTxns || PM_TX.getBySeller(sellerUsername);
    setTxt('orders-heading', 'Pesanan Masuk');
    setTxt('orders-sub',     `${txns.length} transaksi masuk`);
    renderOrderStats(txns);
    renderOrderList(txns, 'seller');
    showSellerChangeStatus();
  }

  function showSellerChangeStatus() {
    document.querySelectorAll('.ord-status-change').forEach(el => el.style.display = 'flex');
  }

  /* ── ADMIN ORDERS ────────────────────────────────────────── */
  function renderAdminOrders() {
    const sbTxns = await fetchOrdersFromSupabase(user);
    const txns = sbTxns || PM_TX.getAll();
    setTxt('orders-heading', 'Semua Transaksi');
    setTxt('orders-sub',     `${txns.length} transaksi marketplace`);
    renderOrderStats(txns);
    renderOrderList(txns, 'admin');
    document.getElementById('orders-stats-extra')?.classList.remove('hidden');
    renderAdminStats(txns);
  }

  /* ── Stats bar ───────────────────────────────────────────── */
  function renderOrderStats(txns) {
    const byStatus = {};
    txns.forEach(t => { byStatus[t.status] = (byStatus[t.status] || 0) + 1; });
    const revenue = txns.reduce((s, t) => s + t.total, 0);

    setTxt('stat-total-orders',   txns.length);
    setTxt('stat-pending-orders', byStatus.pending || 0);
    setTxt('stat-done-orders',    byStatus.selesai || 0);
    setTxt('stat-revenue',        fmt(revenue));
  }

  /* ── Admin stats ─────────────────────────────────────────── */
  function renderAdminStats(txns) {
    const el = document.getElementById('admin-tx-stats');
    if (!el) return;
    const topSellers = {};
    txns.forEach(t => {
      t.products.forEach(p => {
        topSellers[p.storeName] = (topSellers[p.storeName] || 0) + p.subtotal;
      });
    });
    const sorted = Object.entries(topSellers).sort((a, b) => b[1] - a[1]).slice(0, 5);
    el.innerHTML = `<div style="font-size:13px;font-weight:700;color:#1e293b;margin-bottom:10px">🏆 Top Seller Revenue</div>` +
      sorted.map(([name, rev]) => `
        <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #f1f5f9;font-size:13px">
          <span style="color:#475569;font-weight:600">${name}</span>
          <span style="color:#16a34a;font-weight:800">${fmt(rev)}</span>
        </div>`).join('');
  }

  /* ── Render order list ───────────────────────────────────── */
  function renderOrderList(txns, role) {
    const el = document.getElementById('orders-list');
    if (!el) return;

    // Apply filter
    let filtered = [...txns];
    if (activeFilter !== 'all') filtered = filtered.filter(t => t.status === activeFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.transactionId.toLowerCase().includes(q) ||
        t.products.some(p => p.name.toLowerCase().includes(q)) ||
        t.buyerName?.toLowerCase().includes(q)
      );
    }

    if (filtered.length === 0) {
      el.innerHTML = `
        <div class="ord-empty">
          <div class="ord-empty-icon">📋</div>
          <div class="ord-empty-title">Tidak Ada Pesanan</div>
          <div class="ord-empty-desc">${activeFilter !== 'all' ? 'Tidak ada pesanan dengan status ini.' : 'Belum ada transaksi yang tercatat.'}</div>
          ${role === 'buyer' ? `<a href="index.html" class="ord-empty-btn">Mulai Belanja →</a>` : ''}
        </div>`;
      return;
    }

    el.innerHTML = filtered.map(t => renderOrderCard(t, role)).join('');

    // Bind status change buttons (seller/admin)
    el.querySelectorAll('.ord-next-status-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const txId      = btn.dataset.txid;
        const newStatus = btn.dataset.next;
        changeStatus(txId, newStatus, role === 'admin' ? txns : PM_TX.getBySeller(PM_AUTH.getCurrentUser().username));
      });
    });
  }

  function renderOrderCard(t, role) {
    const s       = STATUS_CFG[t.status] || STATUS_CFG.pending;
    const preview = t.products.slice(0, 2);
    const more    = t.products.length - 2;
    // [FIX] Lengkapi rantai status sesuai STATUS_CONFIG di supabase-config.js
    const nextStatus = {
      pending:  'diproses',
      diproses: 'dikemas',
      dikemas:  'dikirim',
      dikirim:  'tiba',
      tiba:     'diterima',
      diterima: 'selesai',
    };
    const nextLabel = {
      pending:  '→ Proses',
      diproses: '→ Kemas',
      dikemas:  '→ Kirim',
      dikirim:  '→ Tiba',
      tiba:     '→ Diterima',
      diterima: '→ Selesai',
    };
    // [FIX] Jangan tampilkan tombol ubah status jika sudah selesai atau dibatalkan
    const showChange = (role === 'seller' || role === 'admin') &&
                       t.status !== 'selesai' && t.status !== 'dibatalkan';

    return `
      <div class="ord-card" data-txid="${t.transactionId}">
        <div class="ord-card-head">
          <div class="ord-card-head-left">
            <span class="ord-status-badge ${s.cls}">${s.icon} ${s.label}</span>
            <span class="ord-txid">${t.transactionId}</span>
          </div>
          <div class="ord-card-head-right">
            <span class="ord-date">${fmtDate(t.createdAt)}</span>
          </div>
        </div>

        <div class="ord-products">
          ${preview.map(p => `
            <div class="ord-prod-row">
              <img src="${p.image}" alt="${p.name}"
                   onerror="this.src='https://picsum.photos/seed/${p.productId}/80/80'">
              <div class="ord-prod-info">
                <div class="ord-prod-name">${p.name}</div>
                <div class="ord-prod-meta">🏪 ${p.storeName} · ${fmt(p.price)} × ${p.qty}</div>
                ${p.shippingLabel ? `<div class="ord-prod-ship">${shippingIcon(p.shippingType)} ${p.shippingLabel}${p.perishable ? ' · 🌿 Cepat Basi' : ''}</div>` : ''}
              </div>
              <div class="ord-prod-sub">${fmt(p.subtotal)}</div>
            </div>`).join('')}
          ${more > 0 ? `<div class="ord-more-items">+ ${more} produk lainnya</div>` : ''}
        </div>

        ${role !== 'buyer' ? `
          <div class="ord-buyer-info">
            <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            ${t.buyerName} · ${t.address.city || ''} · ${t.address.phone || ''}
          </div>` : ''}

        <div class="ord-card-foot">
          <div class="ord-payment">
            <span class="ord-pay-method">${t.paymentMethod?.toUpperCase()}</span>
            ${t.shippingLabel ? `<span class="ord-pay-method" style="background:#f0fdf4;color:#15803d">🚚 ${t.shippingLabel}</span>` : ''}
            <span class="ord-total-label">Total: <strong class="ord-total">${fmt(t.total)}</strong></span>
          </div>
          <div class="ord-actions">
            ${showChange ? `
              <button class="ord-btn ord-btn-status ord-next-status-btn"
                      data-txid="${t.transactionId}"
                      data-next="${nextStatus[t.status]}">
                ${nextLabel[t.status] || ''}
              </button>` : ''}
            <button class="ord-btn" onclick="openTracking('${t.transactionId}')"
                    style="background:#eff6ff;border-color:#bfdbfe;color:#1e40af">
              📦 Tracking
            </button>
            ${t.status === 'selesai' && role === 'buyer' && t.products.length > 0 ? `
              <button class="ord-btn" onclick="openReview('${t.products[0].productId}','${t.products[0].name}','${t.transactionId}')"
                      style="background:#fefce8;border-color:#fde68a;color:#92400e">
                ⭐ Ulasan
              </button>` : ''}
            <a href="invoice.html?id=${t.transactionId}" class="ord-btn ord-btn-invoice">
              🧾 Invoice
            </a>
            <button class="ord-btn ord-btn-print" onclick="PM_ORDERS.printInvoice('${t.transactionId}')">
              🖨️ Print
            </button>
          </div>
        </div>
      </div>`;
  }

  /* ── Change status ───────────────────────────────────────── */
  function changeStatus(txId, newStatus, txns) {
    const ok = PM_TX.updateStatus(txId, newStatus,
      newStatus === 'diproses'   ? 'Seller sedang memproses pesanan' :
      newStatus === 'dikemas'    ? 'Pesanan sedang dikemas' :          // [FIX]
      newStatus === 'dikirim'    ? 'Pesanan telah dikirim' :
      newStatus === 'tiba'       ? 'Pesanan tiba di kota tujuan' :     // [FIX]
      newStatus === 'diterima'   ? 'Pesanan diterima oleh pembeli' :   // [FIX]
      newStatus === 'selesai'    ? 'Pesanan telah selesai' :
      newStatus === 'dibatalkan' ? 'Pesanan dibatalkan' : '');

    if (!ok) { PM_AUTH.toast('Gagal mengubah status', 'err'); return; }
    PM_AUTH.toast(`✅ Status diubah ke: ${newStatus}`, 'ok');

    // Re-render
    renderOrderList(txns || PM_TX.getAll(), PM_AUTH.getCurrentUser().role);
    renderOrderStats(txns || PM_TX.getAll());
  }

  /* ── Print invoice ───────────────────────────────────────── */
  function printInvoice(txId) {
    sessionStorage.setItem('pm_last_tx', txId);
    window.open(`invoice.html?id=${txId}`, '_blank');
  }

  /* ── Bind filters ────────────────────────────────────────── */
  function bindFilters() {
    document.querySelectorAll('.ord-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.ord-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeFilter = btn.dataset.filter;
        init();
      });
    });
  }

  /* ── Bind search ─────────────────────────────────────────── */
  function bindSearch() {
    const inp = document.getElementById('orders-search');
    if (!inp) return;
    let timer;
    inp.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        searchQuery = inp.value.trim();
        init();
      }, 300);
    });
  }

  function setTxt(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  /* ── Expose ──────────────────────────────────────────────── */
  window.PM_ORDERS = { printInvoice, changeStatus };
  document.addEventListener('DOMContentLoaded', init);

})();
