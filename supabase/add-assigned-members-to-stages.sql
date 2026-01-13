-- ============================================
-- THÊM CỘT NHÂN SỰ PHỤ TRÁCH VÀO CÁC BƯỚC QUY TRÌNH
-- ============================================
-- Script này thêm cột nhan_vien_duoc_giao vào bảng cac_buoc_quy_trinh
-- để có thể gán nhân sự phụ trách cho từng bước cụ thể

-- Thêm cột nhan_vien_duoc_giao (JSONB array) vào bảng cac_buoc_quy_trinh
ALTER TABLE IF EXISTS public.cac_buoc_quy_trinh 
ADD COLUMN IF NOT EXISTS nhan_vien_duoc_giao JSONB DEFAULT '[]'::JSONB;

-- Tạo comment cho cột
COMMENT ON COLUMN public.cac_buoc_quy_trinh.nhan_vien_duoc_giao IS 'Danh sách ID nhân sự phụ trách bước này (JSONB array)';

-- Xác nhận cột đã được thêm
DO $$
BEGIN
   IF EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'cac_buoc_quy_trinh' 
      AND column_name = 'nhan_vien_duoc_giao'
   ) THEN
      RAISE NOTICE '✅ Đã thêm cột nhan_vien_duoc_giao vào bảng cac_buoc_quy_trinh';
   ELSE
      RAISE NOTICE '❌ Cột nhan_vien_duoc_giao chưa được thêm';
   END IF;
END $$;

