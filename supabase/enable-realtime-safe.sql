-- ============================================
-- BẬT REALTIME AN TOÀN (KHÔNG LỖI NẾU ĐÃ BẬT)
-- ============================================

-- 1. Bật realtime cho cac_task_quy_trinh (nếu chưa bật)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'cac_task_quy_trinh'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.cac_task_quy_trinh;
        RAISE NOTICE 'Đã bật realtime cho cac_task_quy_trinh';
    ELSE
        RAISE NOTICE 'cac_task_quy_trinh đã được bật realtime rồi';
    END IF;
END $$;

-- 2. Bật realtime cho cac_buoc_quy_trinh (nếu chưa bật)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'cac_buoc_quy_trinh'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.cac_buoc_quy_trinh;
        RAISE NOTICE 'Đã bật realtime cho cac_buoc_quy_trinh';
    ELSE
        RAISE NOTICE 'cac_buoc_quy_trinh đã được bật realtime rồi';
    END IF;
END $$;

-- 3. Bật realtime cho quy_trinh (nếu chưa bật)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'quy_trinh'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.quy_trinh;
        RAISE NOTICE 'Đã bật realtime cho quy_trinh';
    ELSE
        RAISE NOTICE 'quy_trinh đã được bật realtime rồi';
    END IF;
END $$;

-- 4. Bật realtime cho nhan_su (nếu chưa bật)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'nhan_su'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.nhan_su;
        RAISE NOTICE 'Đã bật realtime cho nhan_su';
    ELSE
        RAISE NOTICE 'nhan_su đã được bật realtime rồi';
    END IF;
END $$;

-- 5. Bật realtime cho don_hang (nếu chưa bật)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'don_hang'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.don_hang;
        RAISE NOTICE 'Đã bật realtime cho don_hang';
    ELSE
        RAISE NOTICE 'don_hang đã được bật realtime rồi';
    END IF;
END $$;

-- 6. Kiểm tra lại tất cả các bảng đã bật realtime
SELECT 
    t.tablename,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
            AND schemaname = 'public' 
            AND tablename = t.tablename
        ) 
        THEN 'Đã bật ✓'
        ELSE 'Chưa bật ✗'
    END as realtime_status
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND t.tablename IN (
    'cac_task_quy_trinh',
    'cac_buoc_quy_trinh',
    'quy_trinh',
    'nhan_su',
    'don_hang'
  )
ORDER BY t.tablename;














