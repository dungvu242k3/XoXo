-- ============================================
-- FIX DUPLICATE KEY CONSTRAINT ERROR
-- Kiểm tra và xóa các unique constraint không cần thiết
-- ============================================

-- 1. Kiểm tra các constraint hiện có trên bảng cac_buoc_quy_trinh
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.cac_buoc_quy_trinh'::regclass
ORDER BY conname;

-- 2. Xóa unique constraint nếu có trên id_quy_trinh (không hợp lý vì một quy trình có thể có nhiều bước)
ALTER TABLE public.cac_buoc_quy_trinh 
DROP CONSTRAINT IF EXISTS cac_buoc_quy_trinh_id_quy_trinh_key;

-- 3. Xóa unique constraint trên (id_quy_trinh, thu_tu) nếu có (có thể gây conflict)
ALTER TABLE public.cac_buoc_quy_trinh 
DROP CONSTRAINT IF EXISTS cac_buoc_quy_trinh_id_quy_trinh_thu_tu_key;

-- 4. Xóa unique constraint trên (id_quy_trinh, ten_buoc) nếu có
ALTER TABLE public.cac_buoc_quy_trinh 
DROP CONSTRAINT IF EXISTS cac_buoc_quy_trinh_id_quy_trinh_ten_buoc_key;

-- 5. Kiểm tra lại các constraint sau khi xóa
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.cac_buoc_quy_trinh'::regclass
ORDER BY conname;

-- Lưu ý: 
-- - Một quy trình (id_quy_trinh) có thể có nhiều bước (stages)
-- - Mỗi bước có thể có cùng thu_tu hoặc ten_buoc (không cần unique)
-- - Chỉ cần PRIMARY KEY trên id là đủ

