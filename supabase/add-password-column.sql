-- ============================================
-- THÊM CỘT MẬT KHẨU VÀO BẢNG NHÂN SỰ
-- ============================================
-- Script này sẽ thêm cột mat_khau vào bảng nhan_su để hỗ trợ đăng nhập

-- 1. Thêm cột mat_khau vào bảng nhan_su
ALTER TABLE public.nhan_su 
ADD COLUMN IF NOT EXISTS mat_khau TEXT;

-- 2. Tạo index cho email để tối ưu query đăng nhập
CREATE INDEX IF NOT EXISTS idx_nhan_su_email ON public.nhan_su(email);

-- 3. Tạo index cho email và mat_khau để tối ưu query đăng nhập
CREATE INDEX IF NOT EXISTS idx_nhan_su_email_password ON public.nhan_su(email, mat_khau) WHERE email IS NOT NULL AND mat_khau IS NOT NULL;

-- 4. Comment cho cột mat_khau
COMMENT ON COLUMN public.nhan_su.mat_khau IS 'Mật khẩu đăng nhập (nên được hash trước khi lưu)';

-- ============================================
-- CẬP NHẬT MẬT KHẨU MẪU (Tùy chọn)
-- ============================================
-- Script này sẽ set mật khẩu mặc định cho các nhân viên mẫu
-- Mật khẩu mặc định: "123456" (nên hash bằng bcrypt trong production)

-- Lưu ý: Trong production, nên hash password bằng bcrypt hoặc argon2
-- UPDATE public.nhan_su 
-- SET mat_khau = '$2b$10$...' -- bcrypt hash của password
-- WHERE email IS NOT NULL AND mat_khau IS NULL;

-- Hoặc set password đơn giản cho testing (KHÔNG NÊN DÙNG TRONG PRODUCTION)
-- UPDATE public.nhan_su 
-- SET mat_khau = '123456' -- Password plain text (chỉ để test)
-- WHERE email = 'van.ngo@xoxo.vn' AND mat_khau IS NULL;


