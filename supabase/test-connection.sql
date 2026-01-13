-- ============================================
-- KIỂM TRA KẾT NỐI SUPABASE
-- ============================================

-- 1. Kiểm tra xem có thể query được không
SELECT 
    'Connection OK' as status,
    NOW() as current_time,
    version() as postgres_version;

-- 2. Kiểm tra bảng cac_task_quy_trinh có tồn tại không
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name = 'cac_task_quy_trinh'
        ) 
        THEN 'Bảng tồn tại ✓'
        ELSE 'Bảng KHÔNG tồn tại ✗'
    END as table_status;

-- 3. Kiểm tra RLS có được bật không
SELECT 
    tablename,
    rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'cac_task_quy_trinh';

-- 4. Kiểm tra policies
SELECT 
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE tablename = 'cac_task_quy_trinh';

-- 5. Test insert (sẽ rollback sau)
BEGIN;
INSERT INTO public.cac_task_quy_trinh (
    id_buoc_quy_trinh,
    ten_task,
    mo_ta,
    thu_tu,
    da_hoan_thanh
) VALUES (
    (SELECT id FROM public.cac_buoc_quy_trinh LIMIT 1),
    'Test Connection Task',
    'Task này được tạo để test kết nối',
    0,
    false
) RETURNING id, ten_task, ngay_tao;
ROLLBACK;

-- Nếu query trên chạy được, nghĩa là:
-- ✓ Database connection OK
-- ✓ Table exists
-- ✓ RLS policy allows insert
-- ✓ Foreign key constraint OK














