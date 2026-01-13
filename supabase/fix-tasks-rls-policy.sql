-- ============================================
-- FIX RLS POLICY CHO BẢNG CAC_TASK_QUY_TRINH
-- Đảm bảo có policy cho phép insert/update/delete
-- ============================================

-- 1. Bật RLS cho bảng (nếu chưa bật)
ALTER TABLE public.cac_task_quy_trinh ENABLE ROW LEVEL SECURITY;

-- 2. Xóa các policy cũ nếu có (để tránh conflict)
DROP POLICY IF EXISTS "Cho phep tat ca" ON public.cac_task_quy_trinh;
DROP POLICY IF EXISTS "Allow all operations" ON public.cac_task_quy_trinh;
DROP POLICY IF EXISTS "Public access" ON public.cac_task_quy_trinh;

-- 3. Tạo policy mới cho phép tất cả operations
CREATE POLICY "Cho phep tat ca" 
ON public.cac_task_quy_trinh
FOR ALL
USING (true)
WITH CHECK (true);

-- 4. Kiểm tra lại các policy
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

-- 5. Kiểm tra RLS có được bật không
SELECT 
    tablename,
    rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'cac_task_quy_trinh';


