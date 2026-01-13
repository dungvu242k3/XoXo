-- ============================================
-- THÊM INDEXES ĐỂ TĂNG TỐC ĐỘ QUERIES
-- ============================================
-- Chạy script này trong Supabase SQL Editor để tối ưu performance

-- 1. INDEXES CHO BẢNG DỊCH VỤ SPA (dich_vu_spa)
-- Index cho cột ngay_tao (dùng trong ORDER BY)
CREATE INDEX IF NOT EXISTS idx_dich_vu_spa_ngay_tao ON public.dich_vu_spa(ngay_tao DESC);

-- Index cho các cột category (dùng trong WHERE và filter)
CREATE INDEX IF NOT EXISTS idx_dich_vu_spa_cap_1 ON public.dich_vu_spa(cap_1) WHERE cap_1 IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dich_vu_spa_cap_2 ON public.dich_vu_spa(cap_2) WHERE cap_2 IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dich_vu_spa_cap_3 ON public.dich_vu_spa(cap_3) WHERE cap_3 IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dich_vu_spa_cap_4 ON public.dich_vu_spa(cap_4) WHERE cap_4 IS NOT NULL;

-- Composite index cho category path (tối ưu filter theo category)
CREATE INDEX IF NOT EXISTS idx_dich_vu_spa_category_path ON public.dich_vu_spa(cap_1, cap_2, cap_3, cap_4) 
WHERE cap_1 IS NOT NULL;

-- Index cho id_quy_trinh (dùng trong JOIN)
CREATE INDEX IF NOT EXISTS idx_dich_vu_spa_id_quy_trinh ON public.dich_vu_spa(id_quy_trinh) WHERE id_quy_trinh IS NOT NULL;

-- Index cho tìm kiếm tên dịch vụ (LIKE queries)
-- Sử dụng 'simple' thay vì 'vietnamese' (không phụ thuộc extension)
CREATE INDEX IF NOT EXISTS idx_dich_vu_spa_ten_dich_vu ON public.dich_vu_spa USING gin(to_tsvector('simple', ten_dich_vu));

-- Index bổ sung cho tìm kiếm prefix (ILIKE 'prefix%')
CREATE INDEX IF NOT EXISTS idx_dich_vu_spa_ten_dich_vu_prefix ON public.dich_vu_spa(ten_dich_vu text_pattern_ops);

-- 2. INDEXES CHO BẢNG QUY TRÌNH (quy_trinh)
-- Index cho ngay_tao
CREATE INDEX IF NOT EXISTS idx_quy_trinh_ngay_tao ON public.quy_trinh(ngay_tao DESC);

-- Index cho phong_ban_phu_trach (dùng trong filter)
CREATE INDEX IF NOT EXISTS idx_quy_trinh_phong_ban ON public.quy_trinh(phong_ban_phu_trach);

-- 3. INDEXES CHO BẢNG CÁC BƯỚC QUY TRÌNH (cac_buoc_quy_trinh)
-- Composite index cho id_quy_trinh và thu_tu (dùng trong ORDER BY)
CREATE INDEX IF NOT EXISTS idx_cac_buoc_quy_trinh_composite ON public.cac_buoc_quy_trinh(id_quy_trinh, thu_tu ASC);

-- 4. INDEXES CHO BẢNG ĐƠN HÀNG (don_hang)
-- Index cho ngay_tao (dùng trong ORDER BY)
CREATE INDEX IF NOT EXISTS idx_don_hang_ngay_tao ON public.don_hang(ngay_tao DESC);

-- Index cho trang_thai (dùng trong filter)
CREATE INDEX IF NOT EXISTS idx_don_hang_trang_thai ON public.don_hang(trang_thai);

-- Index cho id_khach_hang (dùng trong JOIN)
CREATE INDEX IF NOT EXISTS idx_don_hang_id_khach_hang ON public.don_hang(id_khach_hang);

-- Composite index cho filter theo khách hàng và trạng thái
CREATE INDEX IF NOT EXISTS idx_don_hang_khach_trang_thai ON public.don_hang(id_khach_hang, trang_thai);

-- 5. INDEXES CHO BẢNG HẠNG MỤC DỊCH VỤ (hang_muc_dich_vu)
-- Index cho id_don_hang (dùng trong JOIN)
CREATE INDEX IF NOT EXISTS idx_hang_muc_id_don_hang ON public.hang_muc_dich_vu(id_don_hang);

-- Index cho trang_thai (dùng trong filter)
CREATE INDEX IF NOT EXISTS idx_hang_muc_trang_thai ON public.hang_muc_dich_vu(trang_thai);

-- Index cho id_quy_trinh (dùng trong JOIN)
CREATE INDEX IF NOT EXISTS idx_hang_muc_id_quy_trinh ON public.hang_muc_dich_vu(id_quy_trinh) WHERE id_quy_trinh IS NOT NULL;

-- 6. INDEXES CHO BẢNG KHÁCH HÀNG (khach_hang)
-- Index cho tìm kiếm tên (LIKE queries)
-- Sử dụng 'simple' thay vì 'vietnamese' (không phụ thuộc extension)
CREATE INDEX IF NOT EXISTS idx_khach_hang_ten ON public.khach_hang USING gin(to_tsvector('simple', ten));

-- Index bổ sung cho tìm kiếm prefix (ILIKE 'prefix%')
CREATE INDEX IF NOT EXISTS idx_khach_hang_ten_prefix ON public.khach_hang(ten text_pattern_ops);

-- Index cho sdt (dùng trong tìm kiếm)
CREATE INDEX IF NOT EXISTS idx_khach_hang_sdt ON public.khach_hang(sdt);

-- Index cho hang_thanh_vien (dùng trong filter)
CREATE INDEX IF NOT EXISTS idx_khach_hang_hang_thanh_vien ON public.khach_hang(hang_thanh_vien);

-- 7. INDEXES CHO BẢNG KHO VẬT TƯ (kho_vat_tu)
-- Index cho ma_sku (đã có UNIQUE constraint nhưng thêm index để tăng tốc)
CREATE INDEX IF NOT EXISTS idx_kho_vat_tu_ma_sku ON public.kho_vat_tu(ma_sku);

-- Index cho danh_muc (dùng trong filter)
CREATE INDEX IF NOT EXISTS idx_kho_vat_tu_danh_muc ON public.kho_vat_tu(danh_muc);

-- 8. INDEXES CHO BẢNG SẢN PHẨM BÁN LẺ (san_pham_ban_le)
-- Index cho ngay_tao
CREATE INDEX IF NOT EXISTS idx_san_pham_ngay_tao ON public.san_pham_ban_le(ngay_tao DESC);

-- Index cho danh_muc (dùng trong filter)
CREATE INDEX IF NOT EXISTS idx_san_pham_danh_muc ON public.san_pham_ban_le(danh_muc);

-- ============================================
-- ANALYZE TABLES (Cập nhật thống kê cho query planner)
-- ============================================
ANALYZE public.dich_vu_spa;
ANALYZE public.quy_trinh;
ANALYZE public.cac_buoc_quy_trinh;
ANALYZE public.don_hang;
ANALYZE public.hang_muc_dich_vu;
ANALYZE public.khach_hang;
ANALYZE public.kho_vat_tu;
ANALYZE public.san_pham_ban_le;

-- ============================================
-- KIỂM TRA INDEXES ĐÃ TẠO
-- ============================================
-- Chạy query này để xem tất cả indexes:
-- SELECT 
--   schemaname,
--   tablename,
--   indexname,
--   indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
-- ORDER BY tablename, indexname;

