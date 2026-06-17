# 🗄️ SETUP SUPABASE — Purbalingga Mart

## Langkah 1: Buat akun Supabase

1. Buka https://supabase.com → Sign Up (gratis)
2. Buat project baru → pilih region **Singapore** (terdekat)
3. Catat:
   - **Project URL**: `https://xxxx.supabase.co`
   - **anon public key** (dari Settings → API)

---

## Langkah 2: Jalankan SQL di Supabase

Buka **SQL Editor** di dashboard Supabase, lalu paste SQL dari file `supabase_schema.sql`.

---

## Langkah 3: Setup Storage Bucket (untuk foto produk)

1. Buka **Storage** di sidebar Supabase
2. Klik **New Bucket** → nama: `product-images` → Public: ✅ ON
3. Klik **New Bucket** lagi → nama: `qris-images` → Public: ✅ ON

---

## Langkah 4: Masukkan config ke `supabase-config.js`

```js
const SUPABASE_URL  = 'https://XXXX.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

---

## Fitur Baru yang Sudah Diintegrasikan

| Fitur | File |
|-------|------|
| 📷 Foto QRIS di checkout | `checkout.html` + `supabase-config.js` |
| 🖼️ Upload foto produk asli | `seller.html` + `assets/js/seller.js` |
| 🔔 Notifikasi real-time | `assets/js/realtime-notify.js` |
| ⭐ Rating & ulasan produk | `assets/js/rating.js` + `index.html` |
| 📦 Tracking pengiriman | `orders.html` + `assets/js/tracking.js` |
