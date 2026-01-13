-- ============================================
-- SUPABASE SCHEMA - FIX LỖI "COLUMN DOES NOT EXIST"
-- ============================================

-- 1. XÓA SẠCH CÁC BẢNG CŨ (BẮT BUỘC ĐỂ TRÁNH XUNG ĐỘT TÊN CỘT)
-- Lệnh CASCADE sẽ tự động xóa các ràng buộc khóa ngoại liên quan
DROP TABLE IF EXISTS public.thong_bao CASCADE;
DROP TABLE IF EXISTS public.quy_trinh CASCADE;
DROP TABLE IF EXISTS public.nhan_su CASCADE;
DROP TABLE IF EXISTS public.san_pham_ban_le CASCADE;
DROP TABLE IF EXISTS public.dich_vu_spa CASCADE;
DROP TABLE IF EXISTS public.kho_vat_tu CASCADE;
DROP TABLE IF EXISTS public.hang_muc_dich_vu CASCADE; -- Tên tiếng Việt
DROP TABLE IF EXISTS public.service_items CASCADE; -- Tên tiếng Anh cũ (nếu còn)
DROP TABLE IF EXISTS public.don_hang CASCADE;
DROP TABLE IF EXISTS public.khach_hang CASCADE;

-- 2. Cài đặt Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TẠO BẢNG MỚI (TIẾNG VIỆT)
-- ============================================

-- 1. KHÁCH HÀNG
CREATE TABLE public.khach_hang (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  ten TEXT NOT NULL,
  sdt TEXT NOT NULL,
  email TEXT,
  dia_chi TEXT,
  hang_thanh_vien TEXT CHECK (hang_thanh_vien IN ('thuong', 'vip', 'vvip')) DEFAULT 'thuong',
  tong_chi_tieu NUMERIC(15, 2) DEFAULT 0,
  lan_cuoi_ghe TIMESTAMP WITH TIME ZONE,
  ghi_chu TEXT,
  nguon_khach TEXT,
  trang_thai TEXT,
  id_nhan_vien_phu_trach TEXT,
  so_lan_tuong_tac INTEGER DEFAULT 0,
  nhom_khach TEXT,
  ngay_tao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ngay_cap_nhat TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. ĐƠN HÀNG
CREATE TABLE public.don_hang (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  id_khach_hang TEXT NOT NULL REFERENCES public.khach_hang(id) ON DELETE CASCADE,
  ten_khach_hang TEXT NOT NULL,
  tong_tien NUMERIC(15, 2) NOT NULL DEFAULT 0,
  tien_coc NUMERIC(15, 2) DEFAULT 0,
  trang_thai TEXT CHECK (trang_thai IN ('cho_xu_ly', 'da_xac_nhan', 'dang_xu_ly', 'hoan_thanh', 'da_giao', 'huy')) DEFAULT 'cho_xu_ly',
  ngay_du_kien_giao TIMESTAMP WITH TIME ZONE,
  ghi_chu TEXT,
  ngay_tao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ngay_cap_nhat TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. HẠNG MỤC DỊCH VỤ (Service Items)
CREATE TABLE public.hang_muc_dich_vu (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  id_don_hang TEXT NOT NULL REFERENCES public.don_hang(id) ON DELETE CASCADE,
  ten_hang_muc TEXT NOT NULL,
  loai TEXT CHECK (loai IN ('ve_sinh', 'sua_chua', 'xi_ma', 'nhuom', 'custom', 'san_pham')) NOT NULL,
  don_gia NUMERIC(15, 2) NOT NULL,
  so_luong INTEGER DEFAULT 1,
  trang_thai TEXT NOT NULL,
  id_ky_thuat_vien TEXT,
  anh_truoc TEXT,
  anh_sau TEXT,
  la_san_pham BOOLEAN DEFAULT FALSE,
  id_dich_vu_goc TEXT,
  id_quy_trinh TEXT,
  lich_su_thuc_hien JSONB DEFAULT '[]'::JSONB,
  cap_nhat_cuoi BIGINT,
  nhat_ky_ky_thuat JSONB DEFAULT '[]'::JSONB,
  phan_cong_tasks JSONB DEFAULT '[]'::JSONB, -- Danh sách phân công nhân sự cho các task (JSONB array: [{ taskId: string, assignedTo: string[], completed: boolean }])
  ngay_tao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ngay_cap_nhat TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. KHO VẬT TƯ
CREATE TABLE public.kho_vat_tu (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  ma_sku TEXT UNIQUE NOT NULL,
  ten_vat_tu TEXT NOT NULL,
  danh_muc TEXT CHECK (danh_muc IN ('hoa_chat', 'phu_kien', 'dung_cu', 'vat_tu_tieu_hao')) NOT NULL,
  so_luong_ton INTEGER NOT NULL DEFAULT 0,
  don_vi_tinh TEXT NOT NULL,
  nguong_toi_thieu INTEGER DEFAULT 0,
  gia_nhap NUMERIC(15, 2) DEFAULT 0,
  nha_cung_cap TEXT,
  lan_nhap_cuoi TIMESTAMP WITH TIME ZONE,
  anh_vat_tu TEXT,
  ngay_tao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ngay_cap_nhat TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. DỊCH VỤ SPA
CREATE TABLE public.dich_vu_spa (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  ten_dich_vu TEXT NOT NULL,
  danh_muc TEXT,
  cap_1 TEXT,
  cap_2 TEXT,
  cap_3 TEXT,
  cap_4 TEXT,
  gia_niem_yet NUMERIC(15, 2) NOT NULL,
  mo_ta TEXT,
  anh_dich_vu TEXT,
  id_quy_trinh TEXT,
  cac_buoc_quy_trinh JSONB DEFAULT '[]'::JSONB,
  ngay_tao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ngay_cap_nhat TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. SẢN PHẨM BÁN LẺ
CREATE TABLE public.san_pham_ban_le (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  ten_san_pham TEXT NOT NULL,
  danh_muc TEXT,
  gia_ban NUMERIC(15, 2) NOT NULL,
  ton_kho INTEGER DEFAULT 0,
  anh_san_pham TEXT,
  mo_ta TEXT,
  ngay_tao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ngay_cap_nhat TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. NHÂN SỰ
CREATE TABLE public.nhan_su (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  ho_ten TEXT NOT NULL,
  vai_tro TEXT CHECK (vai_tro IN ('quan_ly', 'tu_van', 'ky_thuat', 'qc')) NOT NULL,
  sdt TEXT NOT NULL,
  email TEXT,
  trang_thai TEXT CHECK (trang_thai IN ('hoat_dong', 'nghi')) DEFAULT 'hoat_dong',
  anh_dai_dien TEXT,
  chuyen_mon TEXT,
  phong_ban TEXT CHECK (phong_ban IN ('ky_thuat', 'spa', 'qc', 'hau_can', 'quan_ly', 'kinh_doanh')),
  ngay_tao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ngay_cap_nhat TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. QUY TRÌNH
CREATE TABLE public.quy_trinh (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  ten_quy_trinh TEXT NOT NULL,
  loai_ap_dung JSONB NOT NULL DEFAULT '[]'::JSONB,
  mo_ta TEXT,
  phong_ban_phu_trach TEXT CHECK (phong_ban_phu_trach IN ('ky_thuat', 'spa', 'qc', 'hau_can')) NOT NULL,
  vat_tu_can_thiet JSONB DEFAULT '[]'::JSONB,
  nhan_vien_duoc_giao JSONB DEFAULT '[]'::JSONB,
  ngay_tao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ngay_cap_nhat TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8.1. CÁC BƯỚC QUY TRÌNH (Bảng con)
CREATE TABLE public.cac_buoc_quy_trinh (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  id_quy_trinh TEXT NOT NULL REFERENCES public.quy_trinh(id) ON DELETE CASCADE,
  ten_buoc TEXT NOT NULL,
  thu_tu INTEGER NOT NULL DEFAULT 0,
  chi_tiet TEXT,
  tieu_chuan TEXT,
  cong_viec JSONB DEFAULT '[]'::JSONB, -- Lưu todos dạng JSONB vì là nested data nhỏ
  nhan_vien_duoc_giao JSONB DEFAULT '[]'::JSONB, -- Danh sách ID nhân sự phụ trách bước này
  ngay_tao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ngay_cap_nhat TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. THÔNG BÁO
CREATE TABLE public.thong_bao (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  id_don_hang TEXT REFERENCES public.don_hang(id) ON DELETE CASCADE,
  id_muc_lien_quan TEXT,
  loai_thong_bao TEXT,
  noi_dung TEXT,
  da_doc BOOLEAN DEFAULT FALSE,
  ngay_tao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TẠO INDEX
-- ============================================

CREATE INDEX IF NOT EXISTS idx_don_hang_id_khach ON public.don_hang(id_khach_hang);
CREATE INDEX IF NOT EXISTS idx_don_hang_trang_thai ON public.don_hang(trang_thai);
CREATE INDEX IF NOT EXISTS idx_hang_muc_id_don ON public.hang_muc_dich_vu(id_don_hang);
CREATE INDEX IF NOT EXISTS idx_kho_ma_sku ON public.kho_vat_tu(ma_sku);
CREATE INDEX IF NOT EXISTS idx_thong_bao_da_doc ON public.thong_bao(da_doc);
CREATE INDEX IF NOT EXISTS idx_cac_buoc_id_quy_trinh ON public.cac_buoc_quy_trinh(id_quy_trinh);
CREATE INDEX IF NOT EXISTS idx_cac_buoc_thu_tu ON public.cac_buoc_quy_trinh(id_quy_trinh, thu_tu);

-- ============================================
-- BẢO MẬT (RLS)
-- ============================================

ALTER TABLE public.khach_hang ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.don_hang ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hang_muc_dich_vu ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kho_vat_tu ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dich_vu_spa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.san_pham_ban_le ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nhan_su ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quy_trinh ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thong_bao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cho phep tat ca" ON public.khach_hang FOR ALL USING (true);
CREATE POLICY "Cho phep tat ca" ON public.don_hang FOR ALL USING (true);
CREATE POLICY "Cho phep tat ca" ON public.hang_muc_dich_vu FOR ALL USING (true);
CREATE POLICY "Cho phep tat ca" ON public.kho_vat_tu FOR ALL USING (true);
CREATE POLICY "Cho phep tat ca" ON public.dich_vu_spa FOR ALL USING (true);
CREATE POLICY "Cho phep tat ca" ON public.san_pham_ban_le FOR ALL USING (true);
CREATE POLICY "Cho phep tat ca" ON public.nhan_su FOR ALL USING (true);
CREATE POLICY "Cho phep tat ca" ON public.quy_trinh FOR ALL USING (true);
CREATE POLICY "Cho phep tat ca" ON public.thong_bao FOR ALL USING (true);

-- ============================================
-- TRIGGER UPDATE TIME
-- ============================================

CREATE OR REPLACE FUNCTION cap_nhat_thoi_gian()
RETURNS TRIGGER AS $$
BEGIN
  NEW.ngay_cap_nhat = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_khach_hang_update ON public.khach_hang;
CREATE TRIGGER trg_khach_hang_update BEFORE UPDATE ON public.khach_hang FOR EACH ROW EXECUTE FUNCTION cap_nhat_thoi_gian();

DROP TRIGGER IF EXISTS trg_don_hang_update ON public.don_hang;
CREATE TRIGGER trg_don_hang_update BEFORE UPDATE ON public.don_hang FOR EACH ROW EXECUTE FUNCTION cap_nhat_thoi_gian();

DROP TRIGGER IF EXISTS trg_hang_muc_update ON public.hang_muc_dich_vu;
CREATE TRIGGER trg_hang_muc_update BEFORE UPDATE ON public.hang_muc_dich_vu FOR EACH ROW EXECUTE FUNCTION cap_nhat_thoi_gian();

DROP TRIGGER IF EXISTS trg_kho_vat_tu_update ON public.kho_vat_tu;
CREATE TRIGGER trg_kho_vat_tu_update BEFORE UPDATE ON public.kho_vat_tu FOR EACH ROW EXECUTE FUNCTION cap_nhat_thoi_gian();

DROP TRIGGER IF EXISTS trg_dich_vu_spa_update ON public.dich_vu_spa;
CREATE TRIGGER trg_dich_vu_spa_update BEFORE UPDATE ON public.dich_vu_spa FOR EACH ROW EXECUTE FUNCTION cap_nhat_thoi_gian();

DROP TRIGGER IF EXISTS trg_san_pham_update ON public.san_pham_ban_le;
CREATE TRIGGER trg_san_pham_update BEFORE UPDATE ON public.san_pham_ban_le FOR EACH ROW EXECUTE FUNCTION cap_nhat_thoi_gian();

DROP TRIGGER IF EXISTS trg_nhan_su_update ON public.nhan_su;
CREATE TRIGGER trg_nhan_su_update BEFORE UPDATE ON public.nhan_su FOR EACH ROW EXECUTE FUNCTION cap_nhat_thoi_gian();

DROP TRIGGER IF EXISTS trg_quy_trinh_update ON public.quy_trinh;
CREATE TRIGGER trg_quy_trinh_update BEFORE UPDATE ON public.quy_trinh FOR EACH ROW EXECUTE FUNCTION cap_nhat_thoi_gian();

DROP TRIGGER IF EXISTS trg_cac_buoc_update ON public.cac_buoc_quy_trinh;
CREATE TRIGGER trg_cac_buoc_update BEFORE UPDATE ON public.cac_buoc_quy_trinh FOR EACH ROW EXECUTE FUNCTION cap_nhat_thoi_gian();
