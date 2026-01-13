-- ============================================
-- QUICK FIX: Add missing columns to nhan_su
-- ============================================
-- Chạy script này trong Supabase SQL Editor để thêm các cột còn thiếu

-- Thêm cột chuyen_mon nếu chưa có
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'nhan_su' 
        AND column_name = 'chuyen_mon'
    ) THEN
        ALTER TABLE public.nhan_su ADD COLUMN chuyen_mon TEXT;
        RAISE NOTICE '✓ Đã thêm cột chuyen_mon';
    ELSE
        RAISE NOTICE '✓ Cột chuyen_mon đã tồn tại';
    END IF;
END $$;

-- Thêm các cột khác nếu chưa có (để đảm bảo)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'nhan_su' 
        AND column_name = 'phong_ban'
    ) THEN
        ALTER TABLE public.nhan_su ADD COLUMN phong_ban TEXT;
        RAISE NOTICE '✓ Đã thêm cột phong_ban';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'nhan_su' 
        AND column_name = 'anh_dai_dien'
    ) THEN
        ALTER TABLE public.nhan_su ADD COLUMN anh_dai_dien TEXT;
        RAISE NOTICE '✓ Đã thêm cột anh_dai_dien';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'nhan_su' 
        AND column_name = 'email'
    ) THEN
        ALTER TABLE public.nhan_su ADD COLUMN email TEXT;
        RAISE NOTICE '✓ Đã thêm cột email';
    END IF;
END $$;

-- Verify: Xem danh sách tất cả cột
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'nhan_su'
ORDER BY ordinal_position;





