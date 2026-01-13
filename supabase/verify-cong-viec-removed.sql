-- ============================================
-- KIỂM TRA CỘT CONG_VIEC ĐÃ BỊ XÓA CHƯA
-- ============================================

-- 1. Kiểm tra cột cong_viec có tồn tại không
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'cac_buoc_quy_trinh'
              AND column_name = 'cong_viec'
        ) 
        THEN 'Cột cong_viec VẪN TỒN TẠI ✗ - Cần xóa'
        ELSE 'Cột cong_viec ĐÃ BỊ XÓA ✓'
    END as column_status;

-- 2. Xem tất cả các cột trong bảng
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'cac_buoc_quy_trinh'
ORDER BY ordinal_position;

-- 3. Nếu cột vẫn tồn tại, xóa nó
ALTER TABLE public.cac_buoc_quy_trinh 
DROP COLUMN IF EXISTS cong_viec;

-- 4. Kiểm tra lại sau khi xóa
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'cac_buoc_quy_trinh'
ORDER BY ordinal_position;


