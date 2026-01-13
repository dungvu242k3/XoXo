-- ============================================
-- FIX 400 ERROR WHEN LOADING MEMBERS
-- ============================================
-- Lỗi 400 thường do:
-- 1. Constraint check đang block
-- 2. Cột không tồn tại
-- 3. Syntax query sai (đã fix trong code)

-- 1. Bỏ các constraint check có thể gây lỗi
ALTER TABLE public.nhan_su 
DROP CONSTRAINT IF EXISTS nhan_su_phong_ban_check;

ALTER TABLE public.nhan_su 
DROP CONSTRAINT IF EXISTS nhan_su_vai_tro_check;

ALTER TABLE public.nhan_su 
DROP CONSTRAINT IF EXISTS nhan_su_trang_thai_check;

-- 2. Đảm bảo tất cả cột cần thiết đều tồn tại
DO $$ 
BEGIN
    -- Kiểm tra và thêm cột phong_ban nếu chưa có
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'nhan_su' 
        AND column_name = 'phong_ban'
    ) THEN
        ALTER TABLE public.nhan_su ADD COLUMN phong_ban TEXT;
        RAISE NOTICE 'Đã thêm cột phong_ban';
    END IF;

    -- Kiểm tra và thêm cột chuyen_mon nếu chưa có
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'nhan_su' 
        AND column_name = 'chuyen_mon'
    ) THEN
        ALTER TABLE public.nhan_su ADD COLUMN chuyen_mon TEXT;
        RAISE NOTICE 'Đã thêm cột chuyen_mon';
    END IF;

    -- Kiểm tra và thêm cột anh_dai_dien nếu chưa có
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'nhan_su' 
        AND column_name = 'anh_dai_dien'
    ) THEN
        ALTER TABLE public.nhan_su ADD COLUMN anh_dai_dien TEXT;
        RAISE NOTICE 'Đã thêm cột anh_dai_dien';
    END IF;

    -- Kiểm tra và thêm cột email nếu chưa có
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'nhan_su' 
        AND column_name = 'email'
    ) THEN
        ALTER TABLE public.nhan_su ADD COLUMN email TEXT;
        RAISE NOTICE 'Đã thêm cột email';
    END IF;

    -- Kiểm tra và thêm cột ngay_tao nếu chưa có
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'nhan_su' 
        AND column_name = 'ngay_tao'
    ) THEN
        ALTER TABLE public.nhan_su ADD COLUMN ngay_tao TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Đã thêm cột ngay_tao';
    END IF;

    -- Kiểm tra và thêm cột ngay_cap_nhat nếu chưa có
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'nhan_su' 
        AND column_name = 'ngay_cap_nhat'
    ) THEN
        ALTER TABLE public.nhan_su ADD COLUMN ngay_cap_nhat TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Đã thêm cột ngay_cap_nhat';
    END IF;
END $$;

-- 3. Xem danh sách tất cả cột hiện tại (để verify)
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'nhan_su'
ORDER BY ordinal_position;

-- 4. Test query (giống như trong code)
-- SELECT id, ho_ten, vai_tro, sdt, email, trang_thai, anh_dai_dien, chuyen_mon, phong_ban
-- FROM public.nhan_su
-- ORDER BY ho_ten ASC
-- LIMIT 100;





