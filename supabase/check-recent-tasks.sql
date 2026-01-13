-- ============================================
-- KIỂM TRA TASKS GẦN ĐÂY
-- ============================================

-- 1. Xem tất cả tasks (sắp xếp theo ngày tạo mới nhất)
SELECT 
    ct.id,
    ct.id_buoc_quy_trinh,
    cb.ten_buoc,
    cb.id_quy_trinh,
    ct.ten_task,
    ct.mo_ta,
    ct.thu_tu,
    ct.da_hoan_thanh,
    ct.ngay_tao,
    ct.ngay_cap_nhat,
    NOW() - ct.ngay_tao as thoi_gian_truoc
FROM public.cac_task_quy_trinh ct
LEFT JOIN public.cac_buoc_quy_trinh cb ON ct.id_buoc_quy_trinh = cb.id
ORDER BY ct.ngay_tao DESC
LIMIT 20;

-- 2. Đếm tổng số tasks
SELECT COUNT(*) as total_tasks FROM public.cac_task_quy_trinh;

-- 3. Xem tasks được tạo trong 10 phút qua
SELECT 
    ct.id,
    ct.id_buoc_quy_trinh,
    cb.ten_buoc,
    ct.ten_task,
    ct.ngay_tao,
    EXTRACT(EPOCH FROM (NOW() - ct.ngay_tao)) / 60 as phut_truoc
FROM public.cac_task_quy_trinh ct
LEFT JOIN public.cac_buoc_quy_trinh cb ON ct.id_buoc_quy_trinh = cb.id
WHERE ct.ngay_tao > NOW() - INTERVAL '10 minutes'
ORDER BY ct.ngay_tao DESC;

-- 4. Kiểm tra xem có stage nào không có task
SELECT 
    cb.id as stage_id,
    cb.ten_buoc,
    cb.id_quy_trinh,
    COUNT(ct.id) as so_task
FROM public.cac_buoc_quy_trinh cb
LEFT JOIN public.cac_task_quy_trinh ct ON ct.id_buoc_quy_trinh = cb.id
GROUP BY cb.id, cb.ten_buoc, cb.id_quy_trinh
ORDER BY so_task ASC, cb.id_quy_trinh, cb.thu_tu;

