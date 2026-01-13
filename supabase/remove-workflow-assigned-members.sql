-- ============================================
-- XÓA CỘT NHÂN SỰ PHỤ TRÁCH Ở CẤP QUY TRÌNH
-- ============================================
-- Script này xóa cột nhan_vien_duoc_giao khỏi bảng quy_trinh
-- CHỈ giữ lại ở bảng cac_buoc_quy_trinh (cấp bước)

-- Xóa cột nhan_vien_duoc_giao khỏi bảng quy_trinh
ALTER TABLE IF EXISTS public.quy_trinh 
DROP COLUMN IF EXISTS nhan_vien_duoc_giao;

-- Xác nhận cột đã được xóa
DO $$
BEGIN
   IF NOT EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'quy_trinh' 
      AND column_name = 'nhan_vien_duoc_giao'
   ) THEN
      RAISE NOTICE '✅ Đã xóa cột nhan_vien_duoc_giao khỏi bảng quy_trinh';
   ELSE
      RAISE NOTICE '❌ Cột nhan_vien_duoc_giao vẫn còn trong bảng quy_trinh';
   END IF;
   
   -- Xác nhận cột vẫn còn trong bảng cac_buoc_quy_trinh
   IF EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'cac_buoc_quy_trinh' 
      AND column_name = 'nhan_vien_duoc_giao'
   ) THEN
      RAISE NOTICE '✅ Cột nhan_vien_duoc_giao vẫn còn trong bảng cac_buoc_quy_trinh (đúng)';
   ELSE
      RAISE NOTICE '⚠️ Cột nhan_vien_duoc_giao không có trong bảng cac_buoc_quy_trinh';
   END IF;
END $$;

