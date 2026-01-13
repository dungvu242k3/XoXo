-- ============================================
-- TẠO FOREIGN KEY CHO BẢNG CAC_TASK_QUY_TRINH
-- Link id_buoc_quy_trinh với cac_buoc_quy_trinh.id
-- ============================================

-- 1. Kiểm tra xem foreign key đã tồn tại chưa
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
  AND tc.table_name = 'cac_task_quy_trinh'
  AND kcu.column_name = 'id_buoc_quy_trinh';

-- 2. Kiểm tra dữ liệu có vi phạm không (tasks trỏ đến stage không tồn tại)
SELECT 
    ct.id,
    ct.id_buoc_quy_trinh,
    ct.ten_task,
    CASE 
        WHEN cb.id IS NULL THEN 'LỖI: Stage không tồn tại'
        ELSE 'OK'
    END as trang_thai
FROM public.cac_task_quy_trinh ct
LEFT JOIN public.cac_buoc_quy_trinh cb ON ct.id_buoc_quy_trinh = cb.id
WHERE cb.id IS NULL;

-- 3. Xóa foreign key cũ nếu có (để tạo lại)
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    SELECT tc.constraint_name INTO constraint_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name = 'cac_task_quy_trinh'
      AND kcu.column_name = 'id_buoc_quy_trinh'
    LIMIT 1;
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.cac_task_quy_trinh DROP CONSTRAINT IF EXISTS ' || constraint_name;
        RAISE NOTICE 'Đã xóa foreign key cũ: %', constraint_name;
    ELSE
        RAISE NOTICE 'Không có foreign key cũ để xóa';
    END IF;
END $$;

-- 4. Tạo foreign key constraint mới
ALTER TABLE public.cac_task_quy_trinh
ADD CONSTRAINT fk_task_id_buoc_quy_trinh
FOREIGN KEY (id_buoc_quy_trinh)
REFERENCES public.cac_buoc_quy_trinh(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- 5. Tạo index để tối ưu performance (nếu chưa có)
CREATE INDEX IF NOT EXISTS idx_task_id_buoc_quy_trinh 
ON public.cac_task_quy_trinh(id_buoc_quy_trinh);

-- 6. Kiểm tra lại foreign key đã được tạo
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule,
    rc.update_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'cac_task_quy_trinh'
  AND kcu.column_name = 'id_buoc_quy_trinh';

-- 7. Test: Thử insert task với stage ID không tồn tại (sẽ bị lỗi)
-- DO $$
-- DECLARE
--     test_stage_id TEXT := '00000000-0000-0000-0000-000000000000';
-- BEGIN
--     INSERT INTO public.cac_task_quy_trinh (
--         id_buoc_quy_trinh,
--         ten_task,
--         thu_tu,
--         da_hoan_thanh
--     ) VALUES (
--         test_stage_id,
--         'Test Foreign Key',
--         0,
--         false
--     );
--     RAISE NOTICE 'LỖI: Foreign key không hoạt động!';
-- EXCEPTION
--     WHEN foreign_key_violation THEN
--         RAISE NOTICE '✓ Foreign key hoạt động đúng - đã chặn insert với stage ID không tồn tại';
-- END $$;

