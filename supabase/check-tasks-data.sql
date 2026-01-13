-- ============================================
-- KIỂM TRA DỮ LIỆU TRONG BẢNG CAC_TASK_QUY_TRINH
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

-- 2. Đếm số lượng tasks
SELECT 
    COUNT(*) as total_tasks
FROM public.cac_task_quy_trinh;

-- 3. Xem tất cả tasks với thông tin stage
SELECT 
    ct.id,
    ct.id_buoc_quy_trinh,
    cb.ten_buoc as ten_buoc_quy_trinh,
    cb.id_quy_trinh,
    ct.ten_task,
    ct.mo_ta,
    ct.thu_tu,
    ct.da_hoan_thanh,
    ct.ngay_tao,
    ct.ngay_cap_nhat
FROM public.cac_task_quy_trinh ct
LEFT JOIN public.cac_buoc_quy_trinh cb ON ct.id_buoc_quy_trinh = cb.id
ORDER BY ct.ngay_tao DESC;

-- 4. Xem tasks theo từng stage
SELECT 
    cb.id as stage_id,
    cb.ten_buoc,
    cb.id_quy_trinh,
    COUNT(ct.id) as so_task,
    STRING_AGG(ct.ten_task, ', ') as danh_sach_task
FROM public.cac_buoc_quy_trinh cb
LEFT JOIN public.cac_task_quy_trinh ct ON ct.id_buoc_quy_trinh = cb.id
GROUP BY cb.id, cb.ten_buoc, cb.id_quy_trinh
ORDER BY cb.id_quy_trinh, cb.thu_tu;

-- 5. Xem các stage chưa có task
SELECT 
    cb.id as stage_id,
    cb.ten_buoc,
    cb.id_quy_trinh,
    cb.thu_tu
FROM public.cac_buoc_quy_trinh cb
LEFT JOIN public.cac_task_quy_trinh ct ON ct.id_buoc_quy_trinh = cb.id
WHERE ct.id IS NULL
ORDER BY cb.id_quy_trinh, cb.thu_tu;

-- 6. Kiểm tra foreign key constraint
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

-- 7. Kiểm tra RLS policy
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'cac_task_quy_trinh';

-- 8. Test insert một task mẫu (comment out nếu không muốn chạy)
-- Lấy một stage ID từ bảng cac_buoc_quy_trinh
-- SELECT id FROM public.cac_buoc_quy_trinh LIMIT 1;

-- INSERT INTO public.cac_task_quy_trinh (
--     id_buoc_quy_trinh,
--     ten_task,
--     mo_ta,
--     thu_tu,
--     da_hoan_thanh
-- ) VALUES (
--     (SELECT id FROM public.cac_buoc_quy_trinh LIMIT 1),
--     'Test Task',
--     'Đây là task test',
--     0,
--     false
-- );

