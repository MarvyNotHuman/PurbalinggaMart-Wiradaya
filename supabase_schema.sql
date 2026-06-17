-- ================================================================
-- PURBALINGGA MART — Supabase Schema (FIXED v2)
-- Jalankan seluruh file ini di SQL Editor Supabase
-- ================================================================
-- CHANGELOG (Bug Fixes):
-- [FIX-1] pm_users: kolom `password_hash` diubah ke `password_hash`
--         (kode auth.js menyimpan plaintext; kolom ini hanya untuk Supabase reference,
--          autentikasi sebenarnya terjadi di localStorage — diberi nama jelas agar tidak
--          membingungkan. Tidak ada hashing di sisi client saat ini.)
-- [FIX-2] pm_products: seller_id diubah dari TEXT -> UUID + REFERENCES pm_users(id)
--         agar ada referential integrity ke tabel users.
-- [FIX-3] pm_transactions: buyer_id diubah dari TEXT -> UUID + REFERENCES pm_users(id)
--         Sebelumnya mismatch: pm_users.id UUID vs buyer_id TEXT.
-- [FIX-4] pm_transactions: status CHECK constraint ditambah 'dikemas','tiba','diterima'
--         agar konsisten dengan STATUS_CONFIG di supabase-config.js.
-- [FIX-5] pm_transactions: notes diubah dari JSONB -> TEXT
--         Kode transaction.js menyimpan notes sebagai string biasa ('' default),
--         bukan JSON array/object.
-- [FIX-6] pm_reviews: ditambah kolom seller_id untuk mendukung fitur seller_reply.
-- [FIX-7] Ditambahkan trigger updated_at otomatis untuk pm_products & pm_transactions.
-- [FIX-8] pm_tracking: ditambah CHECK constraint untuk kolom status.
-- [FIX-9] pm_notifications: kolom `data` diubah dari JSONB -> TEXT
--         Kode supabase-config.js memanggil JSON.stringify(data) sebelum insert,
--         jadi kolom harus TEXT (bukan JSONB — double encoding akan gagal parse).
-- [FIX-10] Seed data pm_payment_config: seller_id 'global' tetap TEXT
--          (bukan foreign key — ini konfigurasi global, bukan milik user tertentu).
-- ================================================================

-- ── Helper: auto-update updated_at ───────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. TABEL USERS (seller & buyer)
CREATE TABLE IF NOT EXISTS pm_users (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  -- [FIX-1] Nama kolom password_hash dipertahankan, tapi isinya plaintext
  -- karena client tidak melakukan hashing. Ubah ke hashing di sisi server
  -- jika ingin security yang sesungguhnya.
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin','seller','buyer')),
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  phone         TEXT,
  avatar_url    TEXT,
  store_name    TEXT,
  store_id      TEXT,
  category      TEXT,
  location      TEXT,
  status        TEXT DEFAULT 'active' CHECK (status IN ('active','suspended')),
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- 2. TABEL PRODUK
-- [FIX-2] seller_id diubah ke UUID REFERENCES pm_users(id)
CREATE TABLE IF NOT EXISTS pm_products (
  id             TEXT PRIMARY KEY DEFAULT ('p_' || extract(epoch from now())::text || '_' || substr(gen_random_uuid()::text,1,5)),
  seller_id      UUID NOT NULL REFERENCES pm_users(id) ON DELETE CASCADE,
  seller_username TEXT NOT NULL,
  store_name     TEXT NOT NULL,
  store_id       TEXT,
  name           TEXT NOT NULL,
  category       TEXT NOT NULL,
  location       TEXT NOT NULL DEFAULT 'Purbalingga Kota',
  price          INTEGER NOT NULL CHECK (price > 0),
  original_price INTEGER CHECK (original_price > 0),
  stock          INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  sold           INTEGER DEFAULT 0 CHECK (sold >= 0),
  rating         NUMERIC(3,2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  rating_count   INTEGER DEFAULT 0 CHECK (rating_count >= 0),
  badge          TEXT,
  promo          BOOLEAN DEFAULT false,
  perishable     BOOLEAN DEFAULT false,
  description    TEXT,
  image_url      TEXT,
  status         TEXT DEFAULT 'active' CHECK (status IN ('active','suspended','hidden')),
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- [FIX-7] Trigger updated_at untuk pm_products
CREATE OR REPLACE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON pm_products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 3. TABEL TRANSAKSI
-- [FIX-3] buyer_id diubah ke UUID REFERENCES pm_users(id)
-- [FIX-4] status CHECK ditambah 'dikemas','tiba','diterima'
-- [FIX-5] notes diubah dari JSONB -> TEXT
CREATE TABLE IF NOT EXISTS pm_transactions (
  id                 TEXT PRIMARY KEY,
  buyer_id           UUID NOT NULL REFERENCES pm_users(id) ON DELETE RESTRICT,
  buyer_name         TEXT NOT NULL,
  buyer_email        TEXT,
  products           JSONB NOT NULL,
  subtotal           INTEGER NOT NULL CHECK (subtotal >= 0),
  shipping           INTEGER DEFAULT 0 CHECK (shipping >= 0),
  shipping_original  INTEGER DEFAULT 0 CHECK (shipping_original >= 0),
  shipping_type      JSONB,
  shipping_label     TEXT,
  notes              TEXT,                     -- [FIX-5] was JSONB
  discount           INTEGER DEFAULT 0 CHECK (discount >= 0),
  service_fee        INTEGER DEFAULT 0 CHECK (service_fee >= 0),
  total              INTEGER NOT NULL CHECK (total >= 0),
  payment_method     TEXT NOT NULL,
  address            JSONB NOT NULL,
  voucher            TEXT,
  voucher_label      TEXT,
  status             TEXT DEFAULT 'pending' CHECK (status IN (
    'pending','diproses','dikemas','dikirim','tiba','diterima','selesai','dibatalkan'
  )),                                          -- [FIX-4] ditambah dikemas/tiba/diterima
  status_history     JSONB DEFAULT '[]',
  payment_proof_url  TEXT,
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now()
);

-- [FIX-7] Trigger updated_at untuk pm_transactions
CREATE OR REPLACE TRIGGER trg_transactions_updated_at
  BEFORE UPDATE ON pm_transactions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 4. TABEL TRACKING PENGIRIMAN
-- [FIX-8] Ditambah CHECK constraint untuk status
CREATE TABLE IF NOT EXISTS pm_tracking (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id   TEXT REFERENCES pm_transactions(id) ON DELETE CASCADE,
  status           TEXT NOT NULL CHECK (status IN (
    'pending','diproses','dikemas','dikirim','tiba','diterima','selesai','dibatalkan'
  )),
  location         TEXT,
  description      TEXT NOT NULL,
  courier          TEXT,
  resi_number      TEXT,
  created_by       TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- 5. TABEL RATING & ULASAN
-- [FIX-6] Ditambah seller_id untuk mendukung fitur seller_reply
CREATE TABLE IF NOT EXISTS pm_reviews (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id     TEXT REFERENCES pm_products(id) ON DELETE CASCADE,
  transaction_id TEXT REFERENCES pm_transactions(id) ON DELETE CASCADE,
  buyer_id       UUID NOT NULL REFERENCES pm_users(id) ON DELETE CASCADE,
  buyer_name     TEXT NOT NULL,
  buyer_avatar   TEXT,
  rating         INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review         TEXT,
  image_urls     JSONB DEFAULT '[]',
  seller_reply   TEXT,
  seller_id      UUID REFERENCES pm_users(id) ON DELETE SET NULL,  -- [FIX-6]
  created_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_id, transaction_id, buyer_id)
);

-- 6. TABEL NOTIFIKASI
-- [FIX-9] data diubah dari JSONB -> TEXT (karena kode melakukan JSON.stringify sebelum insert)
CREATE TABLE IF NOT EXISTS pm_notifications (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('new_order','status_update','review','promo')),
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  data        TEXT DEFAULT '{}',               -- [FIX-9] was JSONB
  read        BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 7. TABEL QRIS & PAYMENT INFO (per seller)
-- [FIX-10] seller_id tetap TEXT (mendukung nilai 'global' yang bukan UUID)
CREATE TABLE IF NOT EXISTS pm_payment_config (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id    TEXT NOT NULL UNIQUE,
  qris_url     TEXT,
  bank_bca     TEXT,
  bank_bri     TEXT,
  bank_mandiri TEXT,
  ewallet_num  TEXT,
  account_name TEXT DEFAULT 'Purbalingga Mart',
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- ================================================================
-- INDEX untuk performa query
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_products_seller   ON pm_products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_status   ON pm_products(status);
CREATE INDEX IF NOT EXISTS idx_products_category ON pm_products(category);
CREATE INDEX IF NOT EXISTS idx_tx_buyer          ON pm_transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_tx_status         ON pm_transactions(status);
CREATE INDEX IF NOT EXISTS idx_tracking_tx       ON pm_tracking(transaction_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product   ON pm_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_notify_user       ON pm_notifications(user_id, read);

-- ================================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================================
ALTER TABLE pm_products       ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_transactions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_reviews        ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_notifications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_tracking       ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_payment_config ENABLE ROW LEVEL SECURITY;

-- Products: semua bisa baca produk aktif
DROP POLICY IF EXISTS "products_public_read" ON pm_products;
CREATE POLICY "products_public_read" ON pm_products
  FOR SELECT USING (status = 'active');

-- Products: anon bisa insert/update (untuk demo tanpa auth Supabase)
DROP POLICY IF EXISTS "products_anon_write" ON pm_products;
CREATE POLICY "products_anon_write" ON pm_products
  FOR ALL USING (true);

-- Transactions: anon akses penuh (pakai localStorage auth)
DROP POLICY IF EXISTS "tx_anon_all" ON pm_transactions;
CREATE POLICY "tx_anon_all" ON pm_transactions
  FOR ALL USING (true);

-- Reviews: semua bisa baca
DROP POLICY IF EXISTS "reviews_public_read" ON pm_reviews;
CREATE POLICY "reviews_public_read" ON pm_reviews
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "reviews_anon_write" ON pm_reviews;
CREATE POLICY "reviews_anon_write" ON pm_reviews
  FOR ALL USING (true);

-- Notifications: anon bisa insert & baca
DROP POLICY IF EXISTS "notify_anon_all" ON pm_notifications;
CREATE POLICY "notify_anon_all" ON pm_notifications
  FOR ALL USING (true);

-- Tracking: semua bisa baca
DROP POLICY IF EXISTS "tracking_public_read" ON pm_tracking;
CREATE POLICY "tracking_public_read" ON pm_tracking
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "tracking_anon_write" ON pm_tracking;
CREATE POLICY "tracking_anon_write" ON pm_tracking
  FOR ALL USING (true);

-- Payment config: publik baca
DROP POLICY IF EXISTS "payconfig_public_read" ON pm_payment_config;
CREATE POLICY "payconfig_public_read" ON pm_payment_config
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "payconfig_anon_write" ON pm_payment_config;
CREATE POLICY "payconfig_anon_write" ON pm_payment_config
  FOR ALL USING (true);

-- ================================================================
-- REALTIME — aktifkan untuk notifikasi
-- ================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE pm_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE pm_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE pm_tracking;

-- ================================================================
-- SEED DATA — Payment config default (QRIS)
-- ================================================================
INSERT INTO pm_payment_config (seller_id, qris_url, bank_bca, bank_bri, bank_mandiri, ewallet_num, account_name)
VALUES
  ('global', NULL, '1234567890', '0987654321', '1122334455', '081234567890', 'Purbalingga Mart')
ON CONFLICT (seller_id) DO NOTHING;
