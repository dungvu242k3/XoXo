-- ============================================
-- REMOVE CONSTRAINTS FROM NHAN_SU
-- Cho phép bất kỳ giá trị phòng ban và vai trò nào
-- ============================================

-- Xóa constraint check cũ cho phong_ban
ALTER TABLE public.nhan_su 
DROP CONSTRAINT IF EXISTS nhan_su_phong_ban_check;

-- Xóa constraint check cũ cho vai_tro
ALTER TABLE public.nhan_su 
DROP CONSTRAINT IF EXISTS nhan_su_vai_tro_check;

-- Phòng ban và vai trò giờ có thể là bất kỳ giá trị TEXT nào (hoặc NULL)

