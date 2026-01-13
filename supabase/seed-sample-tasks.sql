-- ============================================
-- INSERT TASKS MẪU VÀO CÁC STAGES
-- ============================================
-- Script này sẽ tạo một số tasks mẫu cho các stages hiện có
-- CHỈ chạy nếu bảng cac_task_quy_trinh đã được tạo

-- 1. Kiểm tra xem có stages nào không
DO $$
DECLARE
  stage_count INTEGER;
  task_count INTEGER;
  sample_stage RECORD;
  task_id TEXT;
BEGIN
  -- Đếm số stages
  SELECT COUNT(*) INTO stage_count
  FROM public.cac_buoc_quy_trinh;
  
  IF stage_count = 0 THEN
    RAISE NOTICE 'Không có stages nào trong bảng cac_buoc_quy_trinh. Vui lòng tạo stages trước.';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Đã tìm thấy % stages. Bắt đầu tạo tasks mẫu...', stage_count;
  
  -- Lấy 10 stages đầu tiên để tạo tasks mẫu
  FOR sample_stage IN 
    SELECT id, ten_buoc, id_quy_trinh, thu_tu
    FROM public.cac_buoc_quy_trinh 
    ORDER BY id_quy_trinh, thu_tu
    LIMIT 10
  LOOP
    -- Kiểm tra xem stage này đã có tasks chưa
    SELECT COUNT(*) INTO task_count
    FROM public.cac_task_quy_trinh
    WHERE id_buoc_quy_trinh = sample_stage.id;
    
    IF task_count = 0 THEN
      -- Tạo 2-3 tasks mẫu cho mỗi stage
      -- Task 1
      task_id := gen_random_uuid()::TEXT;
      INSERT INTO public.cac_task_quy_trinh (
        id,
        id_buoc_quy_trinh,
        ten_task,
        mo_ta,
        thu_tu,
        da_hoan_thanh,
        ngay_tao
      ) VALUES (
        task_id,
        sample_stage.id,
        'Kiểm tra và chuẩn bị vật liệu',
        'Kiểm tra đầy đủ vật liệu cần thiết cho bước này',
        0,
        FALSE,
        NOW()
      ) ON CONFLICT (id) DO NOTHING;
      
      -- Task 2
      task_id := gen_random_uuid()::TEXT;
      INSERT INTO public.cac_task_quy_trinh (
        id,
        id_buoc_quy_trinh,
        ten_task,
        mo_ta,
        thu_tu,
        da_hoan_thanh,
        ngay_tao
      ) VALUES (
        task_id,
        sample_stage.id,
        'Thực hiện ' || LOWER(sample_stage.ten_buoc),
        'Thực hiện công việc theo quy trình đã định',
        1,
        FALSE,
        NOW()
      ) ON CONFLICT (id) DO NOTHING;
      
      -- Task 3 (nếu stage không phải là stage đầu tiên)
      IF sample_stage.thu_tu > 0 THEN
        task_id := gen_random_uuid()::TEXT;
        INSERT INTO public.cac_task_quy_trinh (
          id,
          id_buoc_quy_trinh,
          ten_task,
          mo_ta,
          thu_tu,
          da_hoan_thanh,
          ngay_tao
        ) VALUES (
          task_id,
          sample_stage.id,
          'Kiểm tra chất lượng',
          'Kiểm tra kết quả trước khi chuyển sang bước tiếp theo',
          2,
          FALSE,
          NOW()
        ) ON CONFLICT (id) DO NOTHING;
      END IF;
      
      RAISE NOTICE 'Đã tạo tasks mẫu cho stage: % (ID: %)', sample_stage.ten_buoc, sample_stage.id;
    ELSE
      RAISE NOTICE 'Stage "%" (ID: %) đã có % tasks. Bỏ qua.', sample_stage.ten_buoc, sample_stage.id, task_count;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Hoàn thành tạo tasks mẫu!';
END $$;

-- 2. Kiểm tra kết quả
SELECT 
  cb.ten_buoc AS "Tên Bước",
  cb.thu_tu AS "Thứ Tự",
  COUNT(ct.id) AS "Số Tasks",
  COUNT(CASE WHEN ct.da_hoan_thanh = TRUE THEN 1 END) AS "Đã Hoàn Thành",
  COUNT(CASE WHEN ct.da_hoan_thanh = FALSE THEN 1 END) AS "Chưa Hoàn Thành"
FROM public.cac_buoc_quy_trinh cb
LEFT JOIN public.cac_task_quy_trinh ct ON ct.id_buoc_quy_trinh = cb.id
GROUP BY cb.id, cb.ten_buoc, cb.thu_tu
ORDER BY cb.id_quy_trinh, cb.thu_tu
LIMIT 20;

