-- ============================================
-- XÓA CỘT CONG_VIEC KHỎI BẢNG CAC_BUOC_QUY_TRINH
-- Tasks giờ được lưu trong bảng riêng cac_task_quy_trinh
-- ============================================

-- 1. Kiểm tra cột cong_viec có tồn tại không
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'cac_buoc_quy_trinh'
  AND column_name = 'cong_viec';

-- 2. Xóa cột cong_viec (nếu có dữ liệu, sẽ mất dữ liệu - nhưng đã chuyển sang bảng riêng rồi)
ALTER TABLE public.cac_buoc_quy_trinh 
DROP COLUMN IF EXISTS cong_viec;

-- 3. Kiểm tra lại các cột còn lại
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'cac_buoc_quy_trinh'
ORDER BY ordinal_position;

-- Lưu ý:
-- - Sau khi xóa cột này, tất cả tasks sẽ chỉ được lưu trong bảng cac_task_quy_trinh
-- - Đảm bảo đã chạy migration script để chuyển dữ liệu từ cong_viec sang bảng mới trước khi xóa


