-- ============================================
-- TEST INSERT TASK TRỰC TIẾP VÀO DATABASE
-- Để kiểm tra xem có lỗi gì không
-- ============================================

-- 1. Lấy một stage ID từ bảng cac_buoc_quy_trinh
SELECT 
    id,
    ten_buoc,
    id_quy_trinh
FROM public.cac_buoc_quy_trinh
LIMIT 5;

-- 2. Test insert một task với stage ID đầu tiên
-- Thay thế 'YOUR_STAGE_ID_HERE' bằng một ID thực tế từ query trên
DO $$
DECLARE
    test_stage_id TEXT;
BEGIN
    -- Lấy stage ID đầu tiên
    SELECT id INTO test_stage_id 
    FROM public.cac_buoc_quy_trinh 
    LIMIT 1;
    
    IF test_stage_id IS NULL THEN
        RAISE NOTICE 'Không có stage nào trong database!';
    ELSE
        RAISE NOTICE 'Test stage ID: %', test_stage_id;
        
        -- Thử insert task
        INSERT INTO public.cac_task_quy_trinh (
            id_buoc_quy_trinh,
            ten_task,
            mo_ta,
            thu_tu,
            da_hoan_thanh
        ) VALUES (
            test_stage_id,
            'Test Task từ SQL',
            'Đây là task test được insert trực tiếp từ SQL',
            0,
            false
        );
        
        RAISE NOTICE 'Insert thành công!';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Lỗi khi insert: %', SQLERRM;
END $$;

-- 3. Kiểm tra xem task đã được insert chưa
SELECT 
    ct.id,
    ct.id_buoc_quy_trinh,
    cb.ten_buoc,
    ct.ten_task,
    ct.ngay_tao
FROM public.cac_task_quy_trinh ct
LEFT JOIN public.cac_buoc_quy_trinh cb ON ct.id_buoc_quy_trinh = cb.id
ORDER BY ct.ngay_tao DESC
LIMIT 10;

