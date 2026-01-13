-- ============================================
-- MIGRATION: Chuyển duong_dan_danh_muc JSONB sang 4 cột Cap_1, Cap_2, Cap_3, Cap_4
-- ============================================
-- Mục đích: Thay thế cột JSONB bằng 4 cột TEXT riêng biệt để dễ query và quản lý
-- Ngày tạo: 2024

BEGIN;

-- 1. Thêm 4 cột mới (tạm thời cho phép NULL)
ALTER TABLE public.dich_vu_spa 
  ADD COLUMN IF NOT EXISTS cap_1 TEXT,
  ADD COLUMN IF NOT EXISTS cap_2 TEXT,
  ADD COLUMN IF NOT EXISTS cap_3 TEXT,
  ADD COLUMN IF NOT EXISTS cap_4 TEXT;

-- 2. Migrate dữ liệu từ duong_dan_danh_muc JSONB sang 4 cột mới (nếu cột tồn tại)
-- Kiểm tra xem cột duong_dan_danh_muc có tồn tại không trước khi migrate
DO $$
BEGIN
  -- Kiểm tra xem cột có tồn tại không
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'dich_vu_spa' 
      AND column_name = 'duong_dan_danh_muc'
  ) THEN
    -- Migrate dữ liệu từ duong_dan_danh_muc JSONB sang 4 cột mới
    EXECUTE '
      UPDATE public.dich_vu_spa
      SET 
        cap_1 = CASE 
          WHEN duong_dan_danh_muc IS NOT NULL 
               AND jsonb_typeof(duong_dan_danh_muc) = ''array'' 
               AND jsonb_array_length(duong_dan_danh_muc) > 0 
          THEN duong_dan_danh_muc->>0 
          ELSE NULL 
        END,
        cap_2 = CASE 
          WHEN duong_dan_danh_muc IS NOT NULL 
               AND jsonb_typeof(duong_dan_danh_muc) = ''array'' 
               AND jsonb_array_length(duong_dan_danh_muc) > 1 
          THEN duong_dan_danh_muc->>1 
          ELSE NULL 
        END,
        cap_3 = CASE 
          WHEN duong_dan_danh_muc IS NOT NULL 
               AND jsonb_typeof(duong_dan_danh_muc) = ''array'' 
               AND jsonb_array_length(duong_dan_danh_muc) > 2 
          THEN duong_dan_danh_muc->>2 
          ELSE NULL 
        END,
        cap_4 = CASE 
          WHEN duong_dan_danh_muc IS NOT NULL 
               AND jsonb_typeof(duong_dan_danh_muc) = ''array'' 
               AND jsonb_array_length(duong_dan_danh_muc) > 3 
          THEN duong_dan_danh_muc->>3 
          ELSE NULL 
        END
      WHERE duong_dan_danh_muc IS NOT NULL 
        AND jsonb_typeof(duong_dan_danh_muc) = ''array'';
    ';
    RAISE NOTICE 'Đã migrate dữ liệu từ duong_dan_danh_muc sang 4 cột mới';
  ELSE
    RAISE NOTICE 'Cột duong_dan_danh_muc không tồn tại, bỏ qua bước migrate dữ liệu';
  END IF;
END $$;

-- 3. Xóa cột cũ duong_dan_danh_muc (nếu tồn tại)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'dich_vu_spa' 
      AND column_name = 'duong_dan_danh_muc'
  ) THEN
    ALTER TABLE public.dich_vu_spa DROP COLUMN duong_dan_danh_muc;
    RAISE NOTICE 'Đã xóa cột duong_dan_danh_muc';
  ELSE
    RAISE NOTICE 'Cột duong_dan_danh_muc không tồn tại, không cần xóa';
  END IF;
END $$;

-- 4. Tạo index để tối ưu query theo từng cấp (tùy chọn)
CREATE INDEX IF NOT EXISTS idx_dich_vu_spa_cap_1 ON public.dich_vu_spa(cap_1);
CREATE INDEX IF NOT EXISTS idx_dich_vu_spa_cap_2 ON public.dich_vu_spa(cap_2);
CREATE INDEX IF NOT EXISTS idx_dich_vu_spa_cap_3 ON public.dich_vu_spa(cap_3);
CREATE INDEX IF NOT EXISTS idx_dich_vu_spa_cap_4 ON public.dich_vu_spa(cap_4);

-- 5. Verify migration (kiểm tra số lượng records đã được migrate)
DO $$
DECLARE
  total_records INTEGER;
  migrated_records INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_records FROM public.dich_vu_spa;
  SELECT COUNT(*) INTO migrated_records 
  FROM public.dich_vu_spa 
  WHERE cap_1 IS NOT NULL OR cap_2 IS NOT NULL OR cap_3 IS NOT NULL OR cap_4 IS NOT NULL;
  
  RAISE NOTICE 'Tổng số dịch vụ: %', total_records;
  RAISE NOTICE 'Số dịch vụ có dữ liệu category: %', migrated_records;
END $$;

COMMIT;

-- ============================================
-- ROLLBACK SCRIPT (nếu cần quay lại)
-- ============================================
/*
BEGIN;

-- Thêm lại cột cũ
ALTER TABLE public.dich_vu_spa 
  ADD COLUMN duong_dan_danh_muc JSONB DEFAULT '[]'::JSONB;

-- Migrate ngược lại từ 4 cột sang JSONB
UPDATE public.dich_vu_spa
SET duong_dan_danh_muc = (
  SELECT jsonb_agg(cap ORDER BY ord)
  FROM (
    VALUES 
      (cap_1, 1),
      (cap_2, 2),
      (cap_3, 3),
      (cap_4, 4)
  ) AS t(cap, ord)
  WHERE cap IS NOT NULL
)
WHERE cap_1 IS NOT NULL OR cap_2 IS NOT NULL OR cap_3 IS NOT NULL OR cap_4 IS NOT NULL;

-- Xóa 4 cột mới
ALTER TABLE public.dich_vu_spa 
  DROP COLUMN IF EXISTS cap_1,
  DROP COLUMN IF EXISTS cap_2,
  DROP COLUMN IF EXISTS cap_3,
  DROP COLUMN IF EXISTS cap_4;

-- Xóa index
DROP INDEX IF EXISTS idx_dich_vu_spa_cap_1;
DROP INDEX IF EXISTS idx_dich_vu_spa_cap_2;
DROP INDEX IF EXISTS idx_dich_vu_spa_cap_3;
DROP INDEX IF EXISTS idx_dich_vu_spa_cap_4;

COMMIT;
*/

