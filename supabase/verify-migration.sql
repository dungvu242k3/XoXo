-- ============================================
-- SCRIPT KIỂM TRA MIGRATION
-- ============================================
-- Chạy script này TRƯỚC và SAU khi migration để so sánh kết quả

-- 1. Kiểm tra số lượng quy trình có cac_buoc
SELECT 
  'Quy trình có cac_buoc (JSONB)' as check_type,
  COUNT(*) as count
FROM public.quy_trinh
WHERE cac_buoc IS NOT NULL 
  AND jsonb_typeof(cac_buoc) = 'array'
  AND jsonb_array_length(cac_buoc) > 0;

-- 2. Kiểm tra số lượng bước trong bảng mới
SELECT 
  'Bước trong bảng cac_buoc_quy_trinh' as check_type,
  COUNT(*) as count
FROM public.cac_buoc_quy_trinh;

-- 3. So sánh chi tiết từng quy trình
SELECT 
  q.id,
  q.ten_quy_trinh,
  jsonb_array_length(COALESCE(q.cac_buoc, '[]'::JSONB)) as so_buoc_cu,
  COUNT(cb.id) as so_buoc_moi,
  CASE 
    WHEN jsonb_array_length(COALESCE(q.cac_buoc, '[]'::JSONB)) = COUNT(cb.id) THEN '✅ OK'
    WHEN jsonb_array_length(COALESCE(q.cac_buoc, '[]'::JSONB)) > COUNT(cb.id) THEN '⚠️ Thiếu'
    WHEN jsonb_array_length(COALESCE(q.cac_buoc, '[]'::JSONB)) < COUNT(cb.id) THEN '⚠️ Thừa'
    ELSE '❌ Lỗi'
  END as status
FROM public.quy_trinh q
LEFT JOIN public.cac_buoc_quy_trinh cb ON cb.id_quy_trinh = q.id
WHERE q.cac_buoc IS NOT NULL
  AND jsonb_typeof(q.cac_buoc) = 'array'
  AND jsonb_array_length(q.cac_buoc) > 0
GROUP BY q.id, q.ten_quy_trinh, q.cac_buoc
ORDER BY q.ten_quy_trinh;

-- 4. Kiểm tra các bước không có trong bảng mới (nếu có)
SELECT 
  q.id as id_quy_trinh,
  q.ten_quy_trinh,
  stage->>'id' as stage_id,
  stage->>'name' as stage_name,
  stage->>'order' as stage_order
FROM public.quy_trinh q,
  jsonb_array_elements(q.cac_buoc) as stage
WHERE q.cac_buoc IS NOT NULL
  AND jsonb_typeof(q.cac_buoc) = 'array'
  AND NOT EXISTS (
    SELECT 1 
    FROM public.cac_buoc_quy_trinh cb 
    WHERE cb.id_quy_trinh = q.id 
      AND cb.id = stage->>'id'
  );

-- 5. Tổng kết
SELECT 
  COUNT(DISTINCT q.id) as tong_quy_trinh,
  SUM(jsonb_array_length(COALESCE(q.cac_buoc, '[]'::JSONB))) as tong_buoc_cu,
  COUNT(cb.id) as tong_buoc_moi,
  CASE 
    WHEN SUM(jsonb_array_length(COALESCE(q.cac_buoc, '[]'::JSONB))) = COUNT(cb.id) THEN '✅ Migration thành công!'
    ELSE '⚠️ Cần kiểm tra lại'
  END as ket_qua
FROM public.quy_trinh q
LEFT JOIN public.cac_buoc_quy_trinh cb ON cb.id_quy_trinh = q.id
WHERE q.cac_buoc IS NOT NULL
  AND jsonb_typeof(q.cac_buoc) = 'array'
  AND jsonb_array_length(q.cac_buoc) > 0;

