-- ============================================
-- MIGRATION SCRIPT: Chuyển cac_buoc từ JSONB sang bảng riêng
-- ============================================
-- Script này sẽ:
-- 1. Tạo bảng cac_buoc_quy_trinh (nếu chưa có)
-- 2. Migrate data từ cột cac_buoc JSONB sang bảng mới
-- 3. Xóa cột cac_buoc cũ (sau khi đã migrate xong)

-- Bước 1: Tạo bảng cac_buoc_quy_trinh (nếu chưa có)
CREATE TABLE IF NOT EXISTS public.cac_buoc_quy_trinh (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  id_quy_trinh TEXT NOT NULL REFERENCES public.quy_trinh(id) ON DELETE CASCADE,
  ten_buoc TEXT NOT NULL,
  thu_tu INTEGER NOT NULL DEFAULT 0,
  chi_tiet TEXT,
  tieu_chuan TEXT,
  cong_viec JSONB DEFAULT '[]'::JSONB,
  ngay_tao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ngay_cap_nhat TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bước 2: Tạo indexes (nếu chưa có)
CREATE INDEX IF NOT EXISTS idx_cac_buoc_id_quy_trinh ON public.cac_buoc_quy_trinh(id_quy_trinh);
CREATE INDEX IF NOT EXISTS idx_cac_buoc_thu_tu ON public.cac_buoc_quy_trinh(id_quy_trinh, thu_tu);

-- Bước 3: Tạo trigger update time (nếu chưa có)
CREATE OR REPLACE FUNCTION cap_nhat_thoi_gian()
RETURNS TRIGGER AS $$
BEGIN
  NEW.ngay_cap_nhat = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cac_buoc_update ON public.cac_buoc_quy_trinh;
CREATE TRIGGER trg_cac_buoc_update BEFORE UPDATE ON public.cac_buoc_quy_trinh FOR EACH ROW EXECUTE FUNCTION cap_nhat_thoi_gian();

-- Bước 4: Migrate data từ JSONB sang bảng mới
-- Lưu ý: Chỉ migrate các quy trình có cac_buoc không rỗng
DO $$
DECLARE
  workflow_record RECORD;
  stage_item JSONB;
  stage_index INTEGER;
  stage_id TEXT;
  stage_name TEXT;
  stage_order INTEGER;
  stage_details TEXT;
  stage_standards TEXT;
  stage_todos JSONB;
BEGIN
  -- Duyệt qua tất cả quy trình có cac_buoc
  FOR workflow_record IN 
    SELECT id, cac_buoc 
    FROM public.quy_trinh 
    WHERE cac_buoc IS NOT NULL 
      AND jsonb_typeof(cac_buoc) = 'array'
      AND jsonb_array_length(cac_buoc) > 0
  LOOP
    -- Duyệt qua từng bước trong mảng cac_buoc
    stage_index := 0;
    FOR stage_item IN SELECT * FROM jsonb_array_elements(workflow_record.cac_buoc)
    LOOP
      -- Extract các trường từ JSONB
      stage_id := COALESCE(stage_item->>'id', uuid_generate_v4()::TEXT);
      stage_name := COALESCE(stage_item->>'name', 'Bước ' || (stage_index + 1)::TEXT);
      stage_order := COALESCE((stage_item->>'order')::INTEGER, stage_index);
      stage_details := stage_item->>'details';
      stage_standards := stage_item->>'standards';
      stage_todos := COALESCE(stage_item->'todos', '[]'::JSONB);
      
      -- Insert vào bảng mới
      INSERT INTO public.cac_buoc_quy_trinh (
        id,
        id_quy_trinh,
        ten_buoc,
        thu_tu,
        chi_tiet,
        tieu_chuan,
        cong_viec
      ) VALUES (
        stage_id,
        workflow_record.id,
        stage_name,
        stage_order,
        stage_details,
        stage_standards,
        stage_todos
      )
      ON CONFLICT (id) DO NOTHING; -- Tránh duplicate nếu đã migrate rồi
      
      stage_index := stage_index + 1;
    END LOOP;
    
    RAISE NOTICE 'Đã migrate % bước cho quy trình %', stage_index, workflow_record.id;
  END LOOP;
  
  RAISE NOTICE '✅ Migration hoàn tất!';
END $$;

-- Bước 5: Kiểm tra kết quả migration
-- Chạy query này để xem số lượng bước đã migrate:
-- SELECT 
--   q.id,
--   q.ten_quy_trinh,
--   jsonb_array_length(COALESCE(q.cac_buoc, '[]'::JSONB)) as so_buoc_cu,
--   COUNT(cb.id) as so_buoc_moi
-- FROM public.quy_trinh q
-- LEFT JOIN public.cac_buoc_quy_trinh cb ON cb.id_quy_trinh = q.id
-- WHERE q.cac_buoc IS NOT NULL
-- GROUP BY q.id, q.ten_quy_trinh, q.cac_buoc
-- ORDER BY q.ten_quy_trinh;

-- Bước 6: SAU KHI ĐÃ XÁC NHẬN DATA ĐÃ MIGRATE ĐÚNG, chạy lệnh này để xóa cột cũ:
-- ALTER TABLE public.quy_trinh DROP COLUMN IF EXISTS cac_buoc;

-- Lưu ý: 
-- - Backup database trước khi chạy migration
-- - Kiểm tra kết quả migration bằng query ở Bước 5
-- - Chỉ xóa cột cac_buoc sau khi đã xác nhận mọi thứ hoạt động đúng

