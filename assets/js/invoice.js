/* ================================================================
   PURBALINGGA MART — invoice.js
   Invoice display, print, status management
   ================================================================ */
'use strict';

(function () {

  const fmt     = n => 'Rp ' + Number(n).toLocaleString('id-ID');
  const fmtDate = d => new Date(d).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  const STATUS_INFO = {
    pending:  { label: 'Menunggu Konfirmasi', icon: '⏳', cls: 'pending',  msg: 'Pesanan Anda sedang menunggu konfirmasi dari seller.' },
    diproses: { label: 'Sedang Diproses',     icon: '🔄', cls: 'diproses', msg: 'Seller sedang memproses pesanan Anda.' },
    dikirim:  { label: 'Dalam Pengiriman',     icon: '🚚', cls: 'dikirim',  msg: 'Pesanan Anda sedang dalam perjalanan ke alamat Anda.' },
    selesai:  { label: 'Pesanan Selesai',      icon: '✅', cls: 'selesai',  msg: 'Pesanan telah diterima. Terima kasih telah berbelanja!' },
  };

  const PAYMENT_LABELS = {
    cod:      '💵 COD (Bayar di Tempat)',
    transfer: '🏦 Transfer Bank',
    ewallet:  '💳 E-Wallet',
    qris:     '📱 QRIS',
  };

  let tx = null;

  /* ── Init ────────────────────────────────────────────────── */
  function init() {
    const params = new URLSearchParams(window.location.search);
    const txId   = params.get('id') || sessionStorage.getItem('pm_last_tx');

    if (!txId) {
      renderError('ID Invoice tidak ditemukan.');
      return;
    }

    tx = PM_TX.getById(txId);
    if (!tx) {
      renderError(`Invoice <strong>${txId}</strong> tidak ditemukan di database.`);
      return;
    }

    renderStatusBanner(tx);
    renderInvoice(tx);
    renderTimeline(tx);
    bindActions(tx);
  }

  /* ── Status banner ───────────────────────────────────────── */
  function renderStatusBanner(tx) {
    const el = document.getElementById('inv-status-banner');
    if (!el) return;
    const s = STATUS_INFO[tx.status] || STATUS_INFO.pending;
    el.className = `inv-status-banner ${s.cls}`;
    el.innerHTML = `
      <div class="inv-status-icon">${s.icon}</div>
      <div class="inv-status-info">
        <h3>${s.label}</h3>
        <p>${s.msg}</p>
      </div>`;
  }

  /* ── Render full invoice ─────────────────────────────────── */
  function renderInvoice(tx) {
    const area = document.getElementById('invoice-print-area');
    if (!area) return;

    const s       = STATUS_INFO[tx.status] || STATUS_INFO.pending;
    const sbCls   = `sb-${tx.status}`;
    const payLbl  = PAYMENT_LABELS[tx.paymentMethod] || tx.paymentMethod;
    const hasSave = Math.max(0, tx.shippingOriginal - tx.shipping);

    area.innerHTML = `
      <!-- HEADER -->
      <div class="inv-header">
        <div class="inv-header-brand">
          <div class="inv-header-logo">🏪</div>
          <div class="inv-header-texts">
            <div class="inv-brand-name">PURBALINGGA MART</div>
            <div class="inv-brand-sub">Marketplace Lokal UMKM Purbalingga</div>
          </div>
        </div>
        <div class="inv-header-right">
          <div class="inv-title">INVOICE</div>
          <div class="inv-number">${tx.transactionId}</div>
          <div class="inv-date">${fmtDate(tx.createdAt)}</div>
        </div>
      </div>

      <!-- META ROW -->
      <div class="inv-meta">
        <div class="inv-meta-cell">
          <div class="inv-meta-label">Status</div>
          <div class="inv-meta-value">
            <span class="inv-status-badge ${sbCls}">${s.icon} ${s.label}</span>
          </div>
        </div>
        <div class="inv-meta-cell">
          <div class="inv-meta-label">Metode Bayar</div>
          <div class="inv-meta-value">${payLbl}</div>
        </div>
        <div class="inv-meta-cell">
          <div class="inv-meta-label">Total Item</div>
          <div class="inv-meta-value">${tx.products.reduce((s,p)=>s+p.qty,0)} produk</div>
          <div class="inv-meta-sub">${tx.products.length} jenis</div>
        </div>
        <div class="inv-meta-cell">
          <div class="inv-meta-label">Total Bayar</div>
          <div class="inv-meta-value" style="color:#16a34a;font-size:15px;font-weight:900">${fmt(tx.total)}</div>
        </div>
      </div>

      <!-- INFO GRID: Buyer + Address -->
      <div class="inv-info-grid">
        <div class="inv-info-cell">
          <div class="inv-info-title">
            <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Data Pembeli
          </div>
          <div class="inv-info-row"><span class="inv-info-key">Nama</span><span class="inv-info-val">${tx.buyerName}</span></div>
          <div class="inv-info-row"><span class="inv-info-key">Email</span><span class="inv-info-val">${tx.buyerEmail || '-'}</span></div>
          <div class="inv-info-row"><span class="inv-info-key">Tgl Pesan</span><span class="inv-info-val">${fmtDate(tx.createdAt)}</span></div>
          ${tx.voucherLabel ? `<div class="inv-info-row"><span class="inv-info-key">Voucher</span><span class="inv-info-val" style="color:#16a34a">${tx.voucherLabel}</span></div>` : ''}
        </div>
        <div class="inv-info-cell">
          <div class="inv-info-title">
            <svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
            Alamat Pengiriman
          </div>
          <div class="inv-info-row"><span class="inv-info-key">Penerima</span><span class="inv-info-val">${tx.address.name}</span></div>
          <div class="inv-info-row"><span class="inv-info-key">HP</span><span class="inv-info-val">${tx.address.phone}</span></div>
          <div class="inv-info-row"><span class="inv-info-key">Alamat</span><span class="inv-info-val">${tx.address.detail}</span></div>
          <div class="inv-info-row"><span class="inv-info-key">Kota</span><span class="inv-info-val">${[tx.address.district, tx.address.city, tx.address.province].filter(Boolean).join(', ')}</span></div>
          ${tx.address.postalCode ? `<div class="inv-info-row"><span class="inv-info-key">Kode Pos</span><span class="inv-info-val">${tx.address.postalCode}</span></div>` : ''}
          ${tx.shippingLabel ? `<div class="inv-info-row"><span class="inv-info-key">Pengiriman</span><span class="inv-info-val">${tx.shippingLabel}</span></div>` : ''}
        </div>
      </div>

      <!-- PRODUCTS TABLE -->
      <div class="inv-table-wrap">
        <div class="inv-table-title">Detail Produk</div>
        <table class="inv-table">
          <thead>
            <tr>
              <th style="width:40%">Produk</th>
              <th>Harga Satuan</th>
              <th style="text-align:center">Qty</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${tx.products.map(p => `
              <tr>
                <td>
                  <div class="inv-table-product">
                    <img class="inv-prod-img" src="${p.image}"
                         onerror="this.src='https://picsum.photos/seed/${p.productId}/80/80'"
                         alt="${p.name}">
                    <div>
                      <div class="inv-prod-name">${p.name}</div>
                      <div class="inv-prod-store">🏪 ${p.storeName} · 📍 ${p.location}</div>
                      ${p.shippingLabel ? `<div class="inv-prod-store" style="color:#15803d">🚚 ${p.shippingLabel}${p.perishable ? ' · 🌿 Cepat Basi' : ''}</div>` : ''}
                    </div>
                  </div>
                </td>
                <td class="inv-table-price">${fmt(p.price)}</td>
                <td class="inv-table-qty">${p.qty}</td>
                <td class="inv-table-sub">${fmt(p.subtotal)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>

      <!-- TOTALS -->
      <div class="inv-totals">
        <div class="inv-totals-box">
          <div class="inv-total-row">
            <span>Subtotal Produk</span>
            <span class="inv-total-val">${fmt(tx.subtotal)}</span>
          </div>
          <div class="inv-total-row">
            <span>Ongkos Kirim</span>
            <span class="inv-total-val">${tx.shipping === 0 ? '<span style="color:#16a34a">GRATIS</span>' : fmt(tx.shipping)}</span>
          </div>
          ${tx.discount > 0 ? `
          <div class="inv-total-row disc">
            <span>Diskon ${tx.voucherLabel || ''}</span>
            <span class="inv-total-val">− ${fmt(tx.discount)}</span>
          </div>` : ''}
          ${hasSave > 0 ? `
          <div class="inv-total-row disc">
            <span>Diskon Ongkir</span>
            <span class="inv-total-val">− ${fmt(hasSave)}</span>
          </div>` : ''}
          <div class="inv-total-row">
            <span>Biaya Layanan (1%)</span>
            <span class="inv-total-val">${fmt(tx.serviceFee)}</span>
          </div>
          <div class="inv-total-row grand">
            <span>TOTAL PEMBAYARAN</span>
            <span>${fmt(tx.total)}</span>
          </div>
        </div>
      </div>

      <!-- FOOTER -->
      <div class="inv-footer">
        <div class="inv-footer-note">
          <strong>Purbalingga Mart</strong> — Platform Marketplace Lokal UMKM<br>
          Jl. Letjen Suprapto No.1, Purbalingga, Jawa Tengah<br>
          Email: info@purbalinggamart.id · WA: 0812-3456-7890<br><br>
          <em>Terima kasih telah mendukung produk UMKM lokal Purbalingga! 💚</em>
        </div>
        <div class="inv-footer-qr">
          <div class="inv-qr-box">${tx.transactionId.slice(-8)}</div>
          <p>ID Pesanan</p>
        </div>
      </div>`;
  }

  /* ── Timeline ────────────────────────────────────────────── */
  function renderTimeline(tx) {
    const el = document.getElementById('inv-timeline');
    if (!el) return;
    const history = tx.statusHistory || [{ status: tx.status, time: tx.createdAt, note: '' }];

    el.innerHTML = history.map((h, i) => {
      const s = STATUS_INFO[h.status] || { icon: '📌', label: h.status };
      return `
        <div class="inv-tl-item">
          <div class="inv-tl-dot done">
            <svg viewBox="0 0 24 24"><polyline points="20,6 9,17 4,12"/></svg>
          </div>
          <div class="inv-tl-text">
            <div class="inv-tl-status">${s.icon} ${s.label || h.status}</div>
            <div class="inv-tl-time">${fmtDate(h.time)}</div>
            ${h.note ? `<div class="inv-tl-note">${h.note}</div>` : ''}
          </div>
        </div>`;
    }).join('');
  }

  /* ── Bind action buttons ─────────────────────────────────── */
  function bindActions(tx) {
    // Print
    document.getElementById('inv-print-btn')?.addEventListener('click', () => {
      window.print();
    });

    // Back to orders
    document.getElementById('inv-orders-btn')?.addEventListener('click', () => {
      window.location.href = 'orders.html';
    });

    // Back to home
    document.getElementById('inv-home-btn')?.addEventListener('click', () => {
      window.location.href = 'index.html';
    });

    // Share (copy link)
    document.getElementById('inv-share-btn')?.addEventListener('click', () => {
      navigator.clipboard.writeText(window.location.href).then(() => {
        showToast('Link invoice disalin!', 'ok');
      });
    });
  }

  /* ── Error state ─────────────────────────────────────────── */
  function renderError(msg) {
    const area = document.getElementById('invoice-print-area');
    if (area) area.innerHTML = `
      <div style="text-align:center;padding:80px 20px">
        <div style="font-size:56px;margin-bottom:16px">😕</div>
        <div style="font-size:18px;font-weight:800;color:#1e293b;margin-bottom:8px">Invoice Tidak Ditemukan</div>
        <div style="font-size:14px;color:#64748b;margin-bottom:24px">${msg}</div>
        <a href="orders.html" style="display:inline-block;padding:11px 24px;background:#16a34a;color:#fff;border-radius:10px;font-weight:700;text-decoration:none">
          Lihat Semua Pesanan
        </a>
      </div>`;

    const banner = document.getElementById('inv-status-banner');
    if (banner) banner.style.display = 'none';
  }

  /* ── Toast ───────────────────────────────────────────────── */
  function showToast(msg, type = 'ok') {
    if (window.PM_AUTH?.toast) { PM_AUTH.toast(msg, type); return; }
    alert(msg);
  }

  document.addEventListener('DOMContentLoaded', init);

})();
