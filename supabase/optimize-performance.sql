-- ============================================
-- DATABASE OPTIMIZATION (INDEXING)
-- ============================================

-- Bảng: don_hang (Orders)
-- Index cho ngày tạo (để load 100 đơn mới nhất cực nhanh)
CREATE INDEX IF NOT EXISTS idx_don_hang_ngay_tao ON public.don_hang (ngay_tao DESC);
-- Index cho trạng thái
CREATE INDEX IF NOT EXISTS idx_don_hang_trang_thai ON public.don_hang (trang_thai);

-- Bảng: hang_muc_dich_vu (Service Items)
-- Index cho ID đơn hàng (để lấy items của 100 đơn hàng nhanh)
CREATE INDEX IF NOT EXISTS idx_hang_muc_id_don_hang ON public.hang_muc_dich_vu (id_don_hang);

-- Bảng: kho_vat_tu (Inventory)
-- Index cho tên vật tư
CREATE INDEX IF NOT EXISTS idx_kho_vat_tu_ten ON public.kho_vat_tu (ten_vat_tu ASC);
-- Index cho mã SKU
CREATE INDEX IF NOT EXISTS idx_kho_vat_tu_sku ON public.kho_vat_tu (ma_sku);

-- Bảng: khach_hang (Customers)
-- Index cho tên và số điện thoại
CREATE INDEX IF NOT EXISTS idx_khach_hang_ten ON public.khach_hang (ten ASC);
CREATE INDEX IF NOT EXISTS idx_khach_hang_sdt ON public.khach_hang (sdt);

-- Bảng: nhan_su (Members)
-- Index cho họ tên
CREATE INDEX IF NOT EXISTS idx_nhan_su_ho_ten ON public.nhan_su (ho_ten ASC);

-- Verify
SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public';
