-- ============================================
-- KIỂM TRA VÀ ĐẢM BẢO BẢNG CAC_TASK_QUY_TRINH ĐÚNG
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
        ELSE 'Bảng cac_task_quy_trinh KHÔNG TỒN TẠI ✗'
    END as table_status;

-- 2. Kiểm tra các cột
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'cac_task_quy_trinh'
ORDER BY ordinal_position;

-- 3. Kiểm tra foreign key constraint
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

-- 4. Kiểm tra RLS policies
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
WHERE tablename = 'cac_task_quy_trinh';

-- 5. Kiểm tra RLS có được bật không
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'cac_task_quy_trinh';

-- 6. Nếu RLS chưa bật, bật nó
ALTER TABLE public.cac_task_quy_trinh ENABLE ROW LEVEL SECURITY;

-- 7. Xóa policy cũ nếu có (để tránh conflict)
DROP POLICY IF EXISTS "Cho phep tat ca" ON public.cac_task_quy_trinh;
DROP POLICY IF EXISTS "Allow all" ON public.cac_task_quy_trinh;
DROP POLICY IF EXISTS "Enable all operations" ON public.cac_task_quy_trinh;

-- 8. Tạo policy mới cho phép tất cả operations
CREATE POLICY "Cho phep tat ca" 
ON public.cac_task_quy_trinh
FOR ALL
USING (true)
WITH CHECK (true);

-- 9. Kiểm tra indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'cac_task_quy_trinh';

-- 10. Xem một vài dữ liệu mẫu (nếu có)
SELECT 
    id,
    id_buoc_quy_trinh,
    ten_task,
    thu_tu,
    da_hoan_thanh,
    ngay_tao
FROM public.cac_task_quy_trinh
ORDER BY ngay_tao DESC
LIMIT 5;

-- 11. Kiểm tra xem có stage nào trong cac_buoc_quy_trinh không
SELECT 
    COUNT(*) as total_stages,
    COUNT(DISTINCT id_quy_trinh) as total_workflows
FROM public.cac_buoc_quy_trinh;

-- 12. Xem một vài stage mẫu
SELECT 
    id,
    id_quy_trinh,
    ten_buoc,
    thu_tu
FROM public.cac_buoc_quy_trinh
ORDER BY id_quy_trinh, thu_tu
LIMIT 10;

