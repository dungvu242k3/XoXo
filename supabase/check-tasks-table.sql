-- ============================================
-- KIỂM TRA BẢNG CAC_TASK_QUY_TRINH
-- Kiểm tra xem bảng có tồn tại và có đúng cấu trúc không
-- ============================================

-- 1. Kiểm tra bảng có tồn tại không
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'cac_task_quy_trinh'
        ) 
        THEN 'Bảng cac_task_quy_trinh TỒN TẠI ✓'
        ELSE 'Bảng cac_task_quy_trinh KHÔNG TỒN TẠI ✗ - Cần chạy create-tasks-table.sql'
    END as table_status;

-- 2. Kiểm tra các cột trong bảng
SELECT 
    column_name as "Tên cột",
    data_type as "Kiểu dữ liệu",
    is_nullable as "Cho phép NULL",
    column_default as "Giá trị mặc định"
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'cac_task_quy_trinh'
ORDER BY ordinal_position;

-- 3. Kiểm tra RLS (Row Level Security) policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'cac_task_quy_trinh';

-- 4. Kiểm tra xem RLS có được bật không
SELECT 
    tablename,
    rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'cac_task_quy_trinh';

-- 5. Đếm số lượng tasks hiện có
SELECT COUNT(*) as "Số lượng tasks" 
FROM public.cac_task_quy_trinh;

-- 6. Xem mẫu dữ liệu (nếu có)
SELECT * 
FROM public.cac_task_quy_trinh 
LIMIT 5;

-- 7. Kiểm tra foreign key constraint
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'cac_task_quy_trinh';


