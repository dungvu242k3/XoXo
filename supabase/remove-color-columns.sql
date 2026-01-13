-- ============================================
-- XÓA CỘT MAU_SAC KHỎI DATABASE
-- ============================================
-- Script này xóa cột mau_sac khỏi các bảng quy_trinh và cac_buoc_quy_trinh

-- 1. Xóa cột mau_sac khỏi bảng cac_buoc_quy_trinh (nếu tồn tại)
ALTER TABLE IF EXISTS public.cac_buoc_quy_trinh 
DROP COLUMN IF EXISTS mau_sac;

-- 2. Xóa cột mau_sac khỏi bảng quy_trinh (nếu tồn tại)
-- Lưu ý: Cột này có NOT NULL constraint, cần xóa constraint trước
ALTER TABLE IF EXISTS public.quy_trinh 
DROP COLUMN IF EXISTS mau_sac;

-- 3. Xác nhận các cột đã được xóa
DO $$
BEGIN
   IF EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'cac_buoc_quy_trinh' 
      AND column_name = 'mau_sac'
   ) THEN
      RAISE NOTICE 'Cảnh báo: Cột mau_sac vẫn còn trong bảng cac_buoc_quy_trinh';
   ELSE
      RAISE NOTICE '✅ Đã xóa cột mau_sac khỏi bảng cac_buoc_quy_trinh';
   END IF;

   IF EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'quy_trinh' 
      AND column_name = 'mau_sac'
   ) THEN
      RAISE NOTICE 'Cảnh báo: Cột mau_sac vẫn còn trong bảng quy_trinh';
   ELSE
      RAISE NOTICE '✅ Đã xóa cột mau_sac khỏi bảng quy_trinh';
   END IF;
END $$;

