-- ============================================
-- BẬT REALTIME CHO BẢNG CAC_TASK_QUY_TRINH
-- ============================================

-- 1. Kiểm tra xem realtime đã được bật chưa
SELECT 
    schemaname,
    tablename,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
            AND schemaname = 'public' 
            AND tablename = 'cac_task_quy_trinh'
        ) 
        THEN 'Realtime đã bật ✓'
        ELSE 'Realtime chưa bật ✗'
    END as realtime_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'cac_task_quy_trinh';

-- 2. Bật realtime cho bảng cac_task_quy_trinh
ALTER PUBLICATION supabase_realtime ADD TABLE public.cac_task_quy_trinh;

-- 3. Kiểm tra lại sau khi bật
SELECT 
    schemaname,
    tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
  AND schemaname = 'public' 
  AND tablename = 'cac_task_quy_trinh';

-- 4. Kiểm tra xem có bảng nào khác cần bật realtime không
SELECT 
    t.tablename,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
            AND schemaname = 'public' 
            AND tablename = t.tablename
        ) 
        THEN 'Đã bật'
        ELSE 'Chưa bật'
    END as realtime_status
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND t.tablename IN (
    'cac_buoc_quy_trinh',
    'quy_trinh',
    'nhan_su',
    'don_hang'
  )
ORDER BY t.tablename;

