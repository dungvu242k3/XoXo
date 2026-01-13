-- ============================================
-- TẠO BẢNG CÁC TASK (Cấp con của cac_buoc_quy_trinh)
-- ============================================
-- Bảng này lưu các task (công việc) thuộc về mỗi bước quy trình
-- Thay thế cho việc lưu trong cột cong_viec (JSON) của bảng cac_buoc_quy_trinh

-- 1. Tạo bảng cac_task_quy_trinh
CREATE TABLE IF NOT EXISTS public.cac_task_quy_trinh (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  id_buoc_quy_trinh TEXT NOT NULL REFERENCES public.cac_buoc_quy_trinh(id) ON DELETE CASCADE,
  ten_task TEXT NOT NULL,
  mo_ta TEXT,
  thu_tu INTEGER NOT NULL DEFAULT 0,
  da_hoan_thanh BOOLEAN DEFAULT FALSE,
  ngay_tao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ngay_cap_nhat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ràng buộc: thu_tu phải >= 0
  CONSTRAINT chk_thu_tu CHECK (thu_tu >= 0)
);

-- 2. Tạo indexes để tối ưu queries
CREATE INDEX IF NOT EXISTS idx_task_id_buoc_quy_trinh ON public.cac_task_quy_trinh(id_buoc_quy_trinh);
CREATE INDEX IF NOT EXISTS idx_task_thu_tu ON public.cac_task_quy_trinh(id_buoc_quy_trinh, thu_tu ASC);
CREATE INDEX IF NOT EXISTS idx_task_da_hoan_thanh ON public.cac_task_quy_trinh(da_hoan_thanh) WHERE da_hoan_thanh = FALSE;

-- 3. Tạo trigger để tự động cập nhật ngay_cap_nhat
CREATE OR REPLACE FUNCTION cap_nhat_thoi_gian_task()
RETURNS TRIGGER AS $$
BEGIN
  NEW.ngay_cap_nhat = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_task_update ON public.cac_task_quy_trinh;
CREATE TRIGGER trg_task_update 
  BEFORE UPDATE ON public.cac_task_quy_trinh 
  FOR EACH ROW 
  EXECUTE FUNCTION cap_nhat_thoi_gian_task();

-- 4. Bật RLS và tạo policy
ALTER TABLE public.cac_task_quy_trinh ENABLE ROW LEVEL SECURITY;

-- Xóa policy cũ nếu đã tồn tại
DROP POLICY IF EXISTS "Cho phep tat ca" ON public.cac_task_quy_trinh;

-- Tạo policy mới
CREATE POLICY "Cho phep tat ca" 
ON public.cac_task_quy_trinh
FOR ALL
USING (true)
WITH CHECK (true);

-- 5. Comment cho bảng và cột
COMMENT ON TABLE public.cac_task_quy_trinh IS 'Bảng lưu các task (công việc) thuộc về mỗi bước quy trình';
COMMENT ON COLUMN public.cac_task_quy_trinh.id IS 'ID duy nhất của task';
COMMENT ON COLUMN public.cac_task_quy_trinh.id_buoc_quy_trinh IS 'ID bước quy trình cha (foreign key)';
COMMENT ON COLUMN public.cac_task_quy_trinh.ten_task IS 'Tên task';
COMMENT ON COLUMN public.cac_task_quy_trinh.mo_ta IS 'Mô tả chi tiết task';
COMMENT ON COLUMN public.cac_task_quy_trinh.thu_tu IS 'Thứ tự task trong bước (0, 1, 2, ...)';
COMMENT ON COLUMN public.cac_task_quy_trinh.da_hoan_thanh IS 'Trạng thái hoàn thành (true/false)';

-- ============================================
-- MIGRATION: Chuyển dữ liệu từ JSON sang bảng mới
-- ============================================
-- Script này sẽ chuyển các task từ cột cong_viec (JSON) sang bảng cac_task_quy_trinh
-- CHỈ chạy nếu cột cong_viec tồn tại trong bảng cac_buoc_quy_trinh

DO $$
DECLARE
  stage_record RECORD;
  task_item JSONB;
  task_order INTEGER;
  column_exists BOOLEAN;
BEGIN
  -- Kiểm tra xem cột cong_viec có tồn tại không
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'cac_buoc_quy_trinh' 
      AND column_name = 'cong_viec'
  ) INTO column_exists;

  IF NOT column_exists THEN
    RAISE NOTICE 'Cột cong_viec không tồn tại trong bảng cac_buoc_quy_trinh. Bỏ qua migration.';
    RETURN;
  END IF;

  -- Duyệt qua tất cả các bước quy trình có cong_viec
  FOR stage_record IN 
    SELECT id, cong_viec 
    FROM public.cac_buoc_quy_trinh 
    WHERE cong_viec IS NOT NULL 
      AND jsonb_typeof(cong_viec) = 'array'
      AND jsonb_array_length(cong_viec) > 0
  LOOP
    task_order := 0;
    
    -- Duyệt qua từng task trong mảng JSON
    FOR task_item IN 
      SELECT * FROM jsonb_array_elements(stage_record.cong_viec)
    LOOP
      -- Chèn task vào bảng mới
      INSERT INTO public.cac_task_quy_trinh (
        id_buoc_quy_trinh,
        ten_task,
        mo_ta,
        thu_tu,
        da_hoan_thanh,
        ngay_tao
      ) VALUES (
        stage_record.id,
        COALESCE(task_item->>'title', task_item->>'name', 'Task không tên'),
        task_item->>'description',
        COALESCE((task_item->>'order')::INTEGER, task_order),
        COALESCE((task_item->>'completed')::BOOLEAN, FALSE),
        NOW()
      )
      ON CONFLICT (id) DO NOTHING; -- Tránh duplicate
      
      task_order := task_order + 1;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Đã chuyển dữ liệu task từ JSON sang bảng cac_task_quy_trinh';
END $$;

-- ============================================
-- ANALYZE để cập nhật thống kê
-- ============================================
ANALYZE public.cac_task_quy_trinh;

-- ============================================
-- KIỂM TRA DỮ LIỆU ĐÃ CHUYỂN
-- ============================================
-- Chạy query này để xem số lượng task đã chuyển:
-- SELECT 
--   cb.ten_buoc,
--   COUNT(ct.id) as so_task
-- FROM public.cac_buoc_quy_trinh cb
-- LEFT JOIN public.cac_task_quy_trinh ct ON ct.id_buoc_quy_trinh = cb.id
-- GROUP BY cb.id, cb.ten_buoc
-- ORDER BY cb.id;

