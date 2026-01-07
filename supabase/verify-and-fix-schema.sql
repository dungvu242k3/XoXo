-- ============================================
-- VERIFY AND FIX SCHEMA - Đảm bảo tất cả cột đều có
-- ============================================

-- 1. Kiểm tra và bỏ constraint check cho phong_ban trong nhan_su
ALTER TABLE public.nhan_su 
DROP CONSTRAINT IF EXISTS nhan_su_phong_ban_check;

-- 2. Bỏ constraint check cho vai_tro trong nhan_su (cho phép bất kỳ vai trò nào)
ALTER TABLE public.nhan_su 
DROP CONSTRAINT IF EXISTS nhan_su_vai_tro_check;

-- 2. Đảm bảo tất cả cột trong nhan_su đều tồn tại
-- Kiểm tra và thêm cột nếu chưa có (nếu cần)

-- Kiểm tra cột phong_ban
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'nhan_su' 
        AND column_name = 'phong_ban'
    ) THEN
        ALTER TABLE public.nhan_su ADD COLUMN phong_ban TEXT;
    END IF;
END $$;

-- Kiểm tra cột chuyen_mon
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'nhan_su' 
        AND column_name = 'chuyen_mon'
    ) THEN
        ALTER TABLE public.nhan_su ADD COLUMN chuyen_mon TEXT;
    END IF;
END $$;

-- Kiểm tra cột anh_dai_dien
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'nhan_su' 
        AND column_name = 'anh_dai_dien'
    ) THEN
        ALTER TABLE public.nhan_su ADD COLUMN anh_dai_dien TEXT;
    END IF;
END $$;

-- Kiểm tra cột email
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'nhan_su' 
        AND column_name = 'email'
    ) THEN
        ALTER TABLE public.nhan_su ADD COLUMN email TEXT;
    END IF;
END $$;

-- Kiểm tra cột ngay_tao
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'nhan_su' 
        AND column_name = 'ngay_tao'
    ) THEN
        ALTER TABLE public.nhan_su ADD COLUMN ngay_tao TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Kiểm tra cột ngay_cap_nhat
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'nhan_su' 
        AND column_name = 'ngay_cap_nhat'
    ) THEN
        ALTER TABLE public.nhan_su ADD COLUMN ngay_cap_nhat TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- 3. Xem danh sách tất cả cột trong bảng nhan_su
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'nhan_su'
ORDER BY ordinal_position;

