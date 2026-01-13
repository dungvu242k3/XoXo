-- ============================================
-- FIX RLS POLICY CHO BẢNG CAC_TASK_QUY_TRINH
-- Xóa policy yêu cầu authenticated, chỉ giữ policy cho phép tất cả
-- ============================================

-- 1. Xóa tất cả policies cũ
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.cac_task_quy_trinh;
DROP POLICY IF EXISTS "Cho phep tat ca" ON public.cac_task_quy_trinh;
DROP POLICY IF EXISTS "Allow all operations" ON public.cac_task_quy_trinh;
DROP POLICY IF EXISTS "Public access" ON public.cac_task_quy_trinh;

-- 2. Đảm bảo RLS được bật
ALTER TABLE public.cac_task_quy_trinh ENABLE ROW LEVEL SECURITY;

-- 3. Tạo policy mới cho phép TẤT CẢ (không cần authenticated)
CREATE POLICY "Cho phep tat ca" 
ON public.cac_task_quy_trinh
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- 4. Kiểm tra lại policies
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'cac_task_quy_trinh'
ORDER BY policyname;

-- 5. Kiểm tra RLS có được bật không
SELECT 
    tablename,
    rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'cac_task_quy_trinh';

