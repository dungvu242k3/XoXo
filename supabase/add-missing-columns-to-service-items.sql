-- ============================================
-- ADD MISSING COLUMNS TO HẠNG MỤC DỊCH VỤ
-- ============================================
-- Script này bổ sung các cột còn thiếu vào bảng hang_muc_dich_vu
-- để khắc phục lỗi 400 (Bad Request) khi truy vấn.

-- 1. Thêm cột nhan_vien_phu_trach (JSONB array)
-- Lưu danh sách ID nhân sự phụ trách toàn bộ item này
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'hang_muc_dich_vu' 
        AND column_name = 'nhan_vien_phu_trach'
    ) THEN
        ALTER TABLE public.hang_muc_dich_vu ADD COLUMN nhan_vien_phu_trach JSONB DEFAULT '[]'::JSONB;
        COMMENT ON COLUMN public.hang_muc_dich_vu.nhan_vien_phu_trach IS 'Danh sách ID nhân sự phụ trách item này';
        RAISE NOTICE '✓ Đã thêm cột nhan_vien_phu_trach';
    END IF;
END $$;

-- 2. Thêm cột gan_nhan_vien_theo_buoc (JSONB array)
-- Lưu phân công nhân sự cụ thể cho từng bước quy trình
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'hang_muc_dich_vu' 
        AND column_name = 'gan_nhan_vien_theo_buoc'
    ) THEN
        ALTER TABLE public.hang_muc_dich_vu ADD COLUMN gan_nhan_vien_theo_buoc JSONB DEFAULT '[]'::JSONB;
        COMMENT ON COLUMN public.hang_muc_dich_vu.gan_nhan_vien_theo_buoc IS 'Phân công nhân sự theo từng bước quy trình';
        RAISE NOTICE '✓ Đã thêm cột gan_nhan_vien_theo_buoc';
    END IF;
END $$;

-- 3. Thêm cột ghi_chu (TEXT) nếu chưa có
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'hang_muc_dich_vu' 
        AND column_name = 'ghi_chu'
    ) THEN
        ALTER TABLE public.hang_muc_dich_vu ADD COLUMN ghi_chu TEXT;
        RAISE NOTICE '✓ Đã thêm cột ghi_chu';
    END IF;
END $$;

-- Verify: Xem lại cấu trúc bảng
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'hang_muc_dich_vu'
ORDER BY ordinal_position;
