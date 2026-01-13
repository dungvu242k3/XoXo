-- ============================================
-- THÊM CỘT PHÂN CÔNG TASKS VÀO HẠNG MỤC DỊCH VỤ
-- ============================================
-- Script này thêm cột phan_cong_tasks vào bảng hang_muc_dich_vu
-- để lưu thông tin gán nhân sự cho từng task trong quy trình

-- Thêm cột phan_cong_tasks (JSONB array) vào bảng hang_muc_dich_vu
ALTER TABLE IF EXISTS public.hang_muc_dich_vu 
ADD COLUMN IF NOT EXISTS phan_cong_tasks JSONB DEFAULT '[]'::JSONB;

-- Tạo comment cho cột
COMMENT ON COLUMN public.hang_muc_dich_vu.phan_cong_tasks IS 'Danh sách phân công nhân sự cho các task (JSONB array: [{ taskId: string, assignedTo: string[], completed: boolean }])';

-- Xác nhận cột đã được thêm
DO $$
BEGIN
   IF EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'hang_muc_dich_vu' 
      AND column_name = 'phan_cong_tasks'
   ) THEN
      RAISE NOTICE '✅ Đã thêm cột phan_cong_tasks vào bảng hang_muc_dich_vu';
   ELSE
      RAISE NOTICE '❌ Cột phan_cong_tasks chưa được thêm';
   END IF;
END $$;

