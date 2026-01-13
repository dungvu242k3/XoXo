-- ============================================
-- TEST CONNECTION AND CHECK COLUMNS
-- Kiểm tra kết nối và các cột trong database
-- ============================================

-- 1. Kiểm tra kết nối
SELECT 'Kết nối thành công!' as status;

-- 2. Kiểm tra bảng nhan_su có tồn tại không
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'nhan_su'
        ) 
        THEN 'Bảng nhan_su TỒN TẠI ✓'
        ELSE 'Bảng nhan_su KHÔNG TỒN TẠI ✗'
    END as table_status;

-- 3. Liệt kê TẤT CẢ các cột trong bảng nhan_su
SELECT 
    column_name as "Tên cột",
    data_type as "Kiểu dữ liệu",
    is_nullable as "Cho phép NULL",
    column_default as "Giá trị mặc định"
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'nhan_su'
ORDER BY ordinal_position;

-- 4. Kiểm tra các constraint trên bảng nhan_su
SELECT 
    conname as "Tên constraint",
    contype as "Loại",
    pg_get_constraintdef(oid) as "Định nghĩa"
FROM pg_constraint
WHERE conrelid = 'public.nhan_su'::regclass;

-- 5. Đếm số lượng nhân sự hiện có
SELECT COUNT(*) as "Số lượng nhân sự" FROM public.nhan_su;

-- 6. Xem mẫu dữ liệu (nếu có)
SELECT * FROM public.nhan_su LIMIT 5;

