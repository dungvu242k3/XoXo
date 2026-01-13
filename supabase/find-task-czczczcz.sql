-- ============================================
-- TÌM TASK "czczczcz" TRONG DATABASE
-- ============================================

-- 1. Tìm trong bảng cac_task_quy_trinh
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
WHERE ct.ten_task LIKE '%czczczcz%'
   OR ct.ten_task ILIKE '%czczczcz%'
ORDER BY ct.ngay_tao DESC;

-- 2. Tìm tất cả tasks gần đây (có thể task mới thêm)
SELECT 
    ct.id,
    ct.id_buoc_quy_trinh,
    cb.ten_buoc as ten_buoc_quy_trinh,
    ct.ten_task,
    ct.ngay_tao
FROM public.cac_task_quy_trinh ct
LEFT JOIN public.cac_buoc_quy_trinh cb ON ct.id_buoc_quy_trinh = cb.id
ORDER BY ct.ngay_tao DESC
LIMIT 20;

-- 3. Kiểm tra xem có task nào được tạo trong 5 phút qua không
SELECT 
    ct.id,
    ct.id_buoc_quy_trinh,
    cb.ten_buoc as ten_buoc_quy_trinh,
    ct.ten_task,
    ct.ngay_tao,
    NOW() - ct.ngay_tao as thoi_gian_truoc
FROM public.cac_task_quy_trinh ct
LEFT JOIN public.cac_buoc_quy_trinh cb ON ct.id_buoc_quy_trinh = cb.id
WHERE ct.ngay_tao > NOW() - INTERVAL '5 minutes'
ORDER BY ct.ngay_tao DESC;

-- 4. Đếm tổng số tasks
SELECT COUNT(*) as total_tasks FROM public.cac_task_quy_trinh;

-- 5. Kiểm tra xem có lỗi foreign key không (task trỏ đến stage không tồn tại)
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

