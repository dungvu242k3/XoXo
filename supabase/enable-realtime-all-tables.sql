-- ============================================
-- BẬT REALTIME CHO TẤT CẢ CÁC BẢNG CẦN THIẾT
-- ============================================

-- 1. Bật realtime cho bảng cac_task_quy_trinh (QUAN TRỌNG!)
ALTER PUBLICATION supabase_realtime ADD TABLE public.cac_task_quy_trinh;

-- 2. Bật realtime cho bảng cac_buoc_quy_trinh (stages)
ALTER PUBLICATION supabase_realtime ADD TABLE public.cac_buoc_quy_trinh;

-- 3. Bật realtime cho bảng quy_trinh (workflows)
ALTER PUBLICATION supabase_realtime ADD TABLE public.quy_trinh;

-- 4. Bật realtime cho bảng nhan_su (members)
ALTER PUBLICATION supabase_realtime ADD TABLE public.nhan_su;

-- 5. Bật realtime cho bảng don_hang (orders)
ALTER PUBLICATION supabase_realtime ADD TABLE public.don_hang;

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

