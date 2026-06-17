/* ================================================================
   PURBALINGGA MART — script.js
   Homepage coordinator: countdown, chatbot, store scroll,
   navbar enhancements, login redirect bridge, PM_AUTH cart link
   ================================================================ */
'use strict';

(function () {

  /* ================================================================
     1. COUNTDOWN TIMER — Flash Sale harian
     ================================================================ */
  function startCountdown() {
    function tick() {
      const now = new Date();
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      let diff = Math.max(0, end - now);

      const h = String(Math.floor(diff / 3600000)).padStart(2, '0'); diff %= 3600000;
      const m = String(Math.floor(diff / 60000)).padStart(2, '0');   diff %= 60000;
      const s = String(Math.floor(diff / 1000)).padStart(2, '0');

      const cdH = document.getElementById('cd-h');
      const cdM = document.getElementById('cd-m');
      const cdS = document.getElementById('cd-s');
      if (cdH) cdH.textContent = h;
      if (cdM) cdM.textContent = m;
      if (cdS) cdS.textContent = s;
    }
    tick();
    setInterval(tick, 1000);
  }

  /* ================================================================
     2. STORE SCROLL — dynamic dari localStorage users
     ================================================================ */
  function renderStoreScroll() {
    const el = document.getElementById('store-scroll');
    if (!el || !window.PM_AUTH || !window.PM_DB) return;

    const sellers = PM_AUTH.getUsers().filter(u => u.role === 'seller');
    if (!sellers.length) {
      el.innerHTML = `<div style="padding:20px;color:#94a3b8;font-size:13.5px">Belum ada toko terdaftar.</div>`;
      return;
    }

    el.innerHTML = sellers.map(s => {
      const prods   = PM_DB.getProductsBySeller(s.username);
      const avgRating = prods.length
        ? (prods.reduce((sum, p) => sum + (p.rating || 0), 0) / prods.length).toFixed(1)
        : '-';

      return `
        <div class="store-card" role="article" aria-label="${s.storeName}">
          <img class="sc-av" src="${s.avatar || 'https://picsum.photos/seed/default/80/80'}"
               alt="${s.storeName}"
               onerror="this.src='https://picsum.photos/seed/${s.username}/80/80'">
          <div class="sc-name">${s.storeName || s.name}</div>
          <div class="sc-cat" style="text-transform:capitalize">${s.category || 'UMKM'}</div>
          <div class="sc-loc">📍 ${s.location || 'Purbalingga'}</div>
          <div class="sc-rating" style="font-size:12px;color:#f59e0b;font-weight:700;margin:3px 0">${avgRating !== '-' ? '⭐ ' + avgRating : '⭐ -'}</div>
          <div class="sc-count">${prods.length} Produk</div>
          <button class="sc-visit-btn"
                  onclick="PM_SECTIONS.setCategory('semua');PM_SECTIONS.searchQuery='${s.storeName}';PM_SECTIONS.renderMainGrid();document.getElementById('section-all-products').scrollIntoView({behavior:'smooth'})"
                  style="margin-top:8px;padding:5px 12px;background:#16a34a;color:#fff;border:none;border-radius:6px;font-size:11.5px;font-weight:700;cursor:pointer;font-family:'Poppins',sans-serif">
            Lihat Produk
          </button>
        </div>`;
    }).join('');
  }

  /* ================================================================
     3. PROMO STRIP — dynamic text dari DB
     ================================================================ */
  function buildPromoStrip() {
    if (!window.PM_DB) return;
    const promos = PM_DB.getPromo(6);
    if (!promos.length) return;

    const fmt = n => 'Rp ' + Number(n).toLocaleString('id-ID');
    const parts = promos.map(p => {
      const disc = p.originalPrice > p.price
        ? Math.round((1 - p.price / p.originalPrice) * 100)
        : 0;
      return disc > 0
        ? `${p.name} <strong>-${disc}%</strong>`
        : p.name;
    });

    const stripText = document.getElementById('promo-strip-text');
    if (stripText) {
      const base = parts.join('&nbsp;·&nbsp;');
      stripText.innerHTML = base + '&nbsp;·&nbsp; Daftar toko UMKM sekarang GRATIS! &nbsp;·&nbsp; COD tersedia area Purbalingga &nbsp;·&nbsp; ' + base;
    }
  }

  /* ================================================================
     4. CHATBOT — smart responses dengan DB data
     ================================================================ */
  function initChatbot() {
    const fab     = document.getElementById('chat-fab');
    const win     = document.getElementById('chat-window');
    const closeBtn= document.getElementById('cw-close');
    const msgs    = document.getElementById('cw-msgs');
    const inp     = document.getElementById('cw-input');
    const sendBtn = document.getElementById('cw-send');
    if (!fab || !win) return;

    const REPLIES = {
      'harga':    () => {
        const products = window.PM_DB ? PM_DB.getActiveProducts() : [];
        const min = products.length ? Math.min(...products.map(p => p.price)) : 5000;
        const max = products.length ? Math.max(...products.map(p => p.price)) : 500000;
        return `Harga produk di Purbalingga Mart mulai dari Rp ${min.toLocaleString('id-ID')} hingga Rp ${max.toLocaleString('id-ID')}! Semua produk UMKM asli.`;
      },
      'promo':    () => {
        const cnt = window.PM_DB ? PM_DB.getPromo().length : 0;
        return `Ada ${cnt} promo aktif saat ini! Cek section "Promo Hari Ini" di bawah halaman ini untuk diskon terbaik.`;
      },
      'terbaru':  () => {
        const p = window.PM_DB ? PM_DB.getLatest(1)[0] : null;
        return p ? `Produk terbaru: <strong>${p.name}</strong> dari ${p.storeName} — ${new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(p.price)}` : 'Cek section Produk Terbaru untuk melihat produk terkini!';
      },
      'daftar':   () => 'Untuk daftar toko, klik tombol "Daftar Toko" di navbar atas atau kunjungi halaman register-store.html — GRATIS!',
      'seller':   () => 'Login sebagai seller di login.html, lalu kelola produk di seller panel. Mudah dan cepat!',
      'cod':      () => 'COD tersedia untuk area Purbalingga Kota dan sekitarnya. Hubungi seller langsung via WhatsApp untuk konfirmasi.',
      'ongkir':   () => 'Gratis ongkir untuk area Purbalingga! Setiap pembelian langsung diantar ke alamat Anda.',
      'terlaris': () => {
        const p = window.PM_DB ? PM_DB.getBestSellers(1)[0] : null;
        return p ? `Produk terlaris saat ini: <strong>${p.name}</strong> — sudah ${p.sold} terjual! ⭐${p.rating}` : 'Cek section Produk Terlaris untuk produk paling diminati!';
      },
      'makanan':  () => 'Kami punya banyak produk makanan khas Purbalingga: Nopia, Mendoan, Getuk Goreng, Kripik Tempe, Sambal Bawang, dan banyak lagi! Klik kategori Makanan untuk melihat semua.',
      'kerajinan':() => 'Tersedia Batik Tulis, Anyaman Bambu, Tas Rotan, dan berbagai kerajinan tangan autentik dari pengrajin Purbalingga.',
      'fashion':  () => 'Purbalingga terkenal sebagai sentra bulu mata terbesar Indonesia! Cek produk fashion & kecantikan kami.',
      'bayar':    () => 'Saat ini tersedia pembayaran COD (Cash on Delivery) dan transfer bank. Hubungi seller langsung via WhatsApp untuk konfirmasi pembayaran.',
      'wa':       () => 'Setiap produk bisa langsung dihubungi ke seller via tombol WhatsApp di halaman detail produk!',
      'login':    () => 'Kamu bisa masuk ke akun di halaman login.html. Ada tipe akun Buyer, Seller, dan Admin.',
      'admin':    () => 'Untuk akses admin, gunakan username: admin dan password: admin123 di halaman login.',
    };

    const DEFAULT_REPLY = () => {
      const stats = window.PM_DB ? PM_DB.getStats() : { active: 0, sellers: 0 };
      return `Terima kasih bertanya! Purbalingga Mart punya <strong>${stats.active} produk aktif</strong> dari <strong>${stats.sellers} toko UMKM</strong>. Ketik kata kunci seperti "promo", "harga", "COD", atau nama kategori untuk bantuan lebih lanjut! 😊`;
    };

    function getBotReply(q) {
      const lower = q.toLowerCase();
      for (const [key, fn] of Object.entries(REPLIES)) {
        if (lower.includes(key)) return fn();
      }
      return DEFAULT_REPLY();
    }

    function addMsg(text, isBot) {
      const d = document.createElement('div');
      d.className = 'cw-msg ' + (isBot ? 'cw-bot' : 'cw-user');
      d.innerHTML = text;
      msgs.appendChild(d);
      msgs.scrollTop = msgs.scrollHeight;
    }

    function addQuickReplies() {
      const qr = document.createElement('div');
      qr.className = 'cw-qr';
      qr.innerHTML = `
        <button onclick="PM_SCRIPT._chatSend('Ada promo hari ini?')">🔥 Promo</button>
        <button onclick="PM_SCRIPT._chatSend('Produk terlaris apa?')">🏆 Terlaris</button>
        <button onclick="PM_SCRIPT._chatSend('Cara daftar toko?')">🏪 Daftar Toko</button>
        <button onclick="PM_SCRIPT._chatSend('Apakah ada COD?')">🚚 COD</button>`;
      msgs.appendChild(qr);
      msgs.scrollTop = msgs.scrollHeight;
    }

    function sendMsg(text) {
      const v = (text || inp.value).trim();
      if (!v) return;
      // Remove quick replies
      document.querySelector('.cw-qr')?.remove();
      addMsg(v, false);
      inp.value = '';
      // Typing indicator
      const typing = document.createElement('div');
      typing.className = 'cw-msg cw-bot cw-typing';
      typing.innerHTML = '<span></span><span></span><span></span>';
      msgs.appendChild(typing);
      msgs.scrollTop = msgs.scrollHeight;
      setTimeout(() => {
        typing.remove();
        addMsg(getBotReply(v), true);
      }, 700);
    }

    // Public for quick-reply buttons
    window.PM_SCRIPT = window.PM_SCRIPT || {};
    PM_SCRIPT._chatSend = sendMsg;

    // Toggle window
    fab.addEventListener('click', () => {
      const isOpen = win.classList.toggle('open');
      if (isOpen && !msgs.children.length) {
        addMsg('Halo! Saya <strong>Mbak Mart</strong> 🤖, asisten Purbalingga Mart. Ada yang bisa dibantu?', true);
        setTimeout(addQuickReplies, 300);
      }
    });

    closeBtn?.addEventListener('click', () => win.classList.remove('open'));
    sendBtn?.addEventListener('click', () => sendMsg());
    inp?.addEventListener('keydown', e => { if (e.key === 'Enter') sendMsg(); });
  }

  /* ================================================================
     5. AUTH → CART bridge
     Patch PM_AUTH._cartClick to open PM_CART drawer
     ================================================================ */
  function bridgeAuthCart() {
    if (!window.PM_AUTH) return;
    PM_AUTH._cartClick = function () {
      if (!this.isLoggedIn()) { this.showLoginModal(); return; }
      if (window.PM_CART) PM_CART.openCart();
      else this.toast('Keranjang belanja — fitur segera hadir!', 'info');
    };
  }

  /* ================================================================
     6. SECTION "SEE ALL" — scroll to main grid with filter
     ================================================================ */
  function bindSeeAll() {
    document.querySelectorAll('.pm-see-all').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('section-all-products')
          ?.scrollIntoView({ behavior: 'smooth' });
      });
    });
  }

  /* ================================================================
     7. SCROLL-BASED NAVBAR shadow
     ================================================================ */
  function initNavbarScroll() {
    const nav = document.querySelector('.navbar');
    if (!nav) return;
    window.addEventListener('scroll', () => {
      nav.style.boxShadow = window.scrollY > 10
        ? '0 4px 20px rgba(0,0,0,.08)'
        : '';
    }, { passive: true });
  }

  /* ================================================================
     8. "BACK TO TOP" button
     ================================================================ */
  function initBackToTop() {
    const btn = document.createElement('button');
    btn.id = 'back-to-top';
    btn.innerHTML = '↑';
    btn.title = 'Kembali ke atas';
    btn.setAttribute('aria-label', 'Kembali ke atas');
    btn.style.cssText = `
      position:fixed;bottom:100px;right:22px;width:42px;height:42px;
      background:#16a34a;color:#fff;border:none;border-radius:50%;
      font-size:18px;font-weight:700;cursor:pointer;
      box-shadow:0 4px 16px rgba(22,163,74,.4);z-index:390;
      opacity:0;transition:opacity .3s,transform .3s;pointer-events:none;
      font-family:'Poppins',sans-serif;line-height:1;
    `;
    document.body.appendChild(btn);

    function updateVisibility() {
      const chatOpen = document.getElementById('chat-window')?.classList.contains('open');
      const show = window.scrollY > 500 && !chatOpen;
      btn.style.opacity = show ? '1' : '0';
      btn.style.pointerEvents = show ? 'auto' : 'none';
    }

    window.addEventListener('scroll', updateVisibility, { passive: true });

    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Re-check visibility whenever the chatbot is toggled
    document.getElementById('chat-fab')?.addEventListener('click', () => {
      setTimeout(updateVisibility, 0);
    });
    document.getElementById('cw-close')?.addEventListener('click', () => {
      setTimeout(updateVisibility, 0);
    });
  }

  /* ================================================================
     9. PRODUCT SECTION HORIZONTAL SCROLL — drag support
     ================================================================ */
  function initHScrollDrag() {
    document.querySelectorAll('.hscroll').forEach(el => {
      let isDown = false, startX, scrollLeft;
      el.addEventListener('mousedown', e => {
        isDown = true;
        el.style.cursor = 'grabbing';
        startX = e.pageX - el.offsetLeft;
        scrollLeft = el.scrollLeft;
      });
      el.addEventListener('mouseleave', () => { isDown = false; el.style.cursor = ''; });
      el.addEventListener('mouseup',    () => { isDown = false; el.style.cursor = ''; });
      el.addEventListener('mousemove', e => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - el.offsetLeft;
        el.scrollLeft = scrollLeft - (x - startX) * 1.4;
      });
    });
  }

  /* ================================================================
     10. HORIZONTAL SCROLL CARD WIDTH — ensure cards don't wrap
     ================================================================ */
  function fixHScrollCards() {
    document.querySelectorAll('.hscroll .prod-card').forEach(card => {
      card.style.minWidth = '210px';
      card.style.width    = '210px';
      card.style.flexShrink = '0';
    });
  }

  /* ================================================================
     11. INJECT CHATBOT + QUICK-REPLY STYLES
     ================================================================ */
  function injectChatbotStyles() {
    if (document.getElementById('pm-chatbot-style')) return;
    const s = document.createElement('style');
    s.id = 'pm-chatbot-style';
    s.textContent = `
      /* Chatbot quick replies */
      .cw-qr {
        display:flex;flex-wrap:wrap;gap:6px;padding:8px 0 4px;
      }
      .cw-qr button {
        padding:6px 12px;background:#f0fdf4;color:#15803d;
        border:1.5px solid #dcfce7;border-radius:20px;
        font-size:12px;font-weight:600;cursor:pointer;
        font-family:'Poppins',sans-serif;transition:all .15s;
      }
      .cw-qr button:hover{background:#dcfce7;}

      /* Typing indicator */
      .cw-typing{display:flex;gap:4px;align-items:center;padding:10px 14px !important}
      .cw-typing span{
        width:7px;height:7px;border-radius:50%;background:#94a3b8;
        animation:cwTyping 1.2s infinite;
      }
      .cw-typing span:nth-child(2){animation-delay:.2s}
      .cw-typing span:nth-child(3){animation-delay:.4s}
      @keyframes cwTyping{0%,80%,100%{transform:scale(1);opacity:.4}40%{transform:scale(1.3);opacity:1}}

      /* Smooth card fade-in */
      .prod-card{animation:prodFadeIn .3s ease both}
      @keyframes prodFadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}

      /* Horizontal scroll */
      .hscroll{overflow-x:auto;padding-bottom:8px;cursor:grab;user-select:none;}
      .hscroll::-webkit-scrollbar{height:4px}
      .hscroll::-webkit-scrollbar-thumb{background:#dcfce7;border-radius:2px}
      .hscroll:active{cursor:grabbing}

      /* Category tiles active state */
      .cat-tile{cursor:pointer;transition:all .2s}
      .cat-tile.active,.cat-tile:hover{background:#f0fdf4 !important;border-color:#16a34a !important}
      .cat-tile.active .ct-name{color:#15803d !important;font-weight:700}

      /* Store visit btn */
      .sc-visit-btn:hover{background:#15803d !important}

      /* Modal animation */
      @keyframes pmFadeIn{from{opacity:0}to{opacity:1}}
      @keyframes pmScaleIn{from{opacity:0;transform:scale(.93)}to{opacity:1;transform:scale(1)}}
    `;
    document.head.appendChild(s);
  }

  /* ================================================================
     12. BANNER: Notifikasi setelah login
     ================================================================ */
  function checkLoginNotice() {
    if (!window.PM_AUTH) return;
    const user = PM_AUTH.getCurrentUser();
    if (!user) return;

    const lastNotice = sessionStorage.getItem('pm_login_noticed');
    if (lastNotice) return;

    sessionStorage.setItem('pm_login_noticed', '1');

    const greetings = {
      admin:  `👑 Selamat datang Admin! <a href="admin.html" style="color:#fff;font-weight:800;text-decoration:underline">Buka Panel Admin →</a>`,
      seller: `🏪 Halo ${user.name.split(' ')[0]}! <a href="seller.html" style="color:#fff;font-weight:800;text-decoration:underline">Kelola Toko Anda →</a>`,
      buyer:  `👋 Halo ${user.name.split(' ')[0]}! Selamat belanja di Purbalingga Mart.`,
    };

    const msg = greetings[user.role];
    if (msg) PM_AUTH.toast(msg, user.role === 'admin' ? 'warn' : 'ok', 4000);
  }

  /* ================================================================
     13. REALTIME PRODUCT COUNT in topbar
     ================================================================ */
  function initRealtimeCount() {
    if (!window.PM_DB) return;
    // Update every time products change in any tab
    window.addEventListener('storage', e => {
      if (e.key === 'pm_products') {
        if (window.PM_SECTIONS) PM_SECTIONS.renderAllSections();
        renderStoreScroll();
      }
    });
  }

  /* ================================================================
     14. CATEGORY PILL binding fix (after auth.js nav rebuild)
     ================================================================ */
  function rebindCatPills() {
    // auth.js may re-render navbar; rebind cat pills after
    setTimeout(() => {
      document.querySelectorAll('.cat-pill').forEach(el => {
        // Remove duplicate listeners by cloning (safe)
        const cat = el.dataset.cat;
        if (!cat || el.dataset.bound) return;
        el.dataset.bound = '1';
        el.addEventListener('click', () => {
          if (window.PM_SECTIONS) PM_SECTIONS.setCategory(cat);
        });
      });
    }, 400);
  }

  /* ================================================================
     15. PENDING ORDERS BADGE on "Pesanan" nav button
     ================================================================ */
  function updatePendingOrdersBadge() {
    const dot = document.getElementById('orders-pending-dot');
    if (!dot || !window.PM_AUTH || !window.PM_TX) return;

    const user = PM_AUTH.getCurrentUser();
    if (!user) { dot.style.display = 'none'; return; }

    let txns = [];
    if (user.role === 'buyer') {
      txns = PM_TX.getByBuyer(user.id);
    } else if (user.role === 'seller') {
      txns = PM_TX.getBySeller(user.username);
    } else if (user.role === 'admin') {
      txns = PM_TX.getAll();
    }

    const pendingCount = txns.filter(t => t.status === 'pending').length;
    dot.textContent = pendingCount;
    dot.style.display = pendingCount > 0 ? 'flex' : 'none';

    // Adjust label for sellers/admin (incoming orders waiting to be processed)
    const navBtn = document.getElementById('nav-orders-btn');
    if (navBtn && pendingCount > 0 && (user.role === 'seller' || user.role === 'admin')) {
      navBtn.title = `${pendingCount} pesanan menunggu diproses`;
    }
  }

  function initPendingOrdersBadge() {
    updatePendingOrdersBadge();
    // Re-check after auth.js rebuilds the navbar
    setTimeout(updatePendingOrdersBadge, 400);
    // Re-check when transactions change in another tab
    window.addEventListener('storage', e => {
      if (e.key === 'pm_transactions') updatePendingOrdersBadge();
    });
  }

  /* ================================================================
     16. "PESANAN AKTIF" QUICK PANEL (produk yang sedang dibeli)
     ================================================================ */
  const ORDER_STATUS_INFO = {
    pending:  { label: 'Menunggu Konfirmasi', icon: '⏳', cls: 'pending' },
    diproses: { label: 'Sedang Dikemas',      icon: '📦', cls: 'diproses' },
    dikirim:  { label: 'Sedang Diantar',      icon: '🚚', cls: 'dikirim' },
    selesai:  { label: 'Selesai',             icon: '✅', cls: 'selesai' },
  };

  function getActiveOrdersForUser(user) {
    if (!window.PM_TX) return [];
    let txns = [];
    if (user.role === 'buyer') {
      txns = PM_TX.getByBuyer(user.id);
    } else if (user.role === 'seller') {
      txns = PM_TX.getBySeller(user.username);
    } else if (user.role === 'admin') {
      txns = PM_TX.getAll();
    }
    return txns.filter(t => t.status !== 'selesai');
  }

  function openOrdersPanel(e) {
    const user = window.PM_AUTH?.getCurrentUser();
    if (!user) return; // let the link fall through to login via auth.js handling

    if (e) e.preventDefault();
    document.getElementById('pm-orders-panel')?.remove();

    const active = getActiveOrdersForUser(user);

    const el = document.createElement('div');
    el.id = 'pm-orders-panel';
    el.innerHTML = `
      <div class="pm-cart-overlay" onclick="document.getElementById('pm-orders-panel')?.querySelector('.pm-cart-panel')?.classList.remove('open');setTimeout(()=>document.getElementById('pm-orders-panel')?.remove(),300);document.body.style.overflow=''"></div>
      <div class="pm-cart-panel">
        <div class="pm-cart-header">
          <h2>📦 Pesanan Sedang Berjalan</h2>
          <button class="pm-cart-close" onclick="document.getElementById('pm-orders-panel')?.querySelector('.pm-cart-panel')?.classList.remove('open');setTimeout(()=>document.getElementById('pm-orders-panel')?.remove(),300);document.body.style.overflow=''">✕</button>
        </div>
        <div class="pm-cart-body">${renderActiveOrdersBody(active, user)}</div>
        <div class="pm-cart-footer">
          <a href="orders.html" class="pm-cart-checkout" style="display:block;text-align:center;text-decoration:none">
            📋 Lihat Semua Pesanan
          </a>
        </div>
      </div>`;
    document.body.appendChild(el);
    document.body.style.overflow = 'hidden';
    setTimeout(() => el.querySelector('.pm-cart-panel')?.classList.add('open'), 10);
  }

  function renderActiveOrdersBody(txns, user) {
    if (!txns || txns.length === 0) {
      return `<div class="pm-empty-state" style="padding:48px 20px">
        <div class="pm-empty-icon">📦</div>
        <div class="pm-empty-title">Belum Ada Pesanan Aktif</div>
        <div class="pm-empty-desc">Pesanan yang sedang diproses/diantar akan muncul di sini.</div>
      </div>`;
    }
    const fmt = n => 'Rp ' + Number(n).toLocaleString('id-ID');
    return txns.slice(0, 8).map(t => {
      const s = ORDER_STATUS_INFO[t.status] || ORDER_STATUS_INFO.pending;
      const first = t.products[0];
      const more   = t.products.length - 1;
      return `
        <a href="invoice.html?id=${t.transactionId}" class="pm-order-row" style="text-decoration:none;color:inherit">
          <img src="${first?.image || ''}" alt="${first?.name || ''}"
               onerror="this.src='https://picsum.photos/seed/${first?.productId || 'x'}/80/80'"
               style="width:48px;height:48px;border-radius:9px;object-fit:cover;flex-shrink:0">
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:600;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
              ${first?.name || t.transactionId}${more > 0 ? ` + ${more} lainnya` : ''}
            </div>
            <div style="font-size:11.5px;color:#94a3b8;margin-top:1px">${t.transactionId}</div>
            <div style="font-size:11.5px;color:#16a34a;font-weight:600;margin-top:2px">${fmt(t.total)}</div>
          </div>
          <span class="pm-order-status ${s.cls}">${s.icon} ${s.label}</span>
        </a>`;
    }).join('');
  }

  function initOrdersPanel() {
    const btn = document.getElementById('nav-orders-btn');
    if (!btn) return;
    btn.addEventListener('click', e => {
      const user = window.PM_AUTH?.getCurrentUser();
      if (!user) return; // not logged in → follow link to login.html
      openOrdersPanel(e);
    });
  }

  /* ================================================================
     INIT
     ================================================================ */
  function init() {
    injectChatbotStyles();
    startCountdown();
    initNavbarScroll();
    initBackToTop();
    initChatbot();
    bridgeAuthCart();
    bindSeeAll();
    rebindCatPills();
    initPendingOrdersBadge();
    initOrdersPanel();

    // After DB is ready (storage.js already ran in <head> order)
    buildPromoStrip();
    renderStoreScroll();
    initRealtimeCount();

    // After sections render (products.js PM_SECTIONS.init fires on DOMContentLoaded)
    setTimeout(() => {
      initHScrollDrag();
      fixHScrollCards();
      checkLoginNotice();
    }, 600);

    // Also fix after section renders
    window.addEventListener('pm_sections_rendered', () => {
      setTimeout(fixHScrollCards, 50);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.PM_SCRIPT = window.PM_SCRIPT || {};
  Object.assign(window.PM_SCRIPT, { renderStoreScroll, buildPromoStrip, initOrdersPanel, updatePendingOrdersBadge });

})();
