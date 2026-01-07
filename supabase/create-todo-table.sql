-- ============================================
-- TẠO BẢNG TODO LIST (Cấp con của cac_task_quy_trinh)
-- ============================================

-- 1. Tạo bảng danh_sach_todo_quy_trinh
CREATE TABLE IF NOT EXISTS public.danh_sach_todo_quy_trinh (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  id_task_quy_trinh TEXT NOT NULL REFERENCES public.cac_task_quy_trinh(id) ON DELETE CASCADE,
  ten_todo TEXT NOT NULL,
  mo_ta TEXT,
  thu_tu INTEGER NOT NULL DEFAULT 0,
  da_hoan_thanh BOOLEAN DEFAULT FALSE,
  ngay_hoan_thanh TIMESTAMP WITH TIME ZONE,
  nguoi_thuc_hien TEXT,
  ngay_tao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ngay_cap_nhat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT chk_thu_tu CHECK (thu_tu >= 0)
);

-- 2. Tạo indexes
CREATE INDEX IF NOT EXISTS idx_todo_id_task ON public.danh_sach_todo_quy_trinh(id_task_quy_trinh);
CREATE INDEX IF NOT EXISTS idx_todo_thu_tu ON public.danh_sach_todo_quy_trinh(id_task_quy_trinh, thu_tu ASC);
CREATE INDEX IF NOT EXISTS idx_todo_da_hoan_thanh ON public.danh_sach_todo_quy_trinh(da_hoan_thanh);

-- 3. Trigger cập nhật thời gian
CREATE TRIGGER trg_todo_update 
  BEFORE UPDATE ON public.danh_sach_todo_quy_trinh 
  FOR EACH ROW 
  EXECUTE FUNCTION cap_nhat_thoi_gian();

-- 4. Trigger auto-set ngay_hoan_thanh
CREATE OR REPLACE FUNCTION set_ngay_hoan_thanh()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.da_hoan_thanh = TRUE AND OLD.da_hoan_thanh = FALSE THEN
    NEW.ngay_hoan_thanh = NOW();
  ELSIF NEW.da_hoan_thanh = FALSE THEN
    NEW.ngay_hoan_thanh = NULL;
    NEW.nguoi_thuc_hien = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_todo_complete
  BEFORE UPDATE ON public.danh_sach_todo_quy_trinh
  FOR EACH ROW
  EXECUTE FUNCTION set_ngay_hoan_thanh();

-- 5. RLS Policies
ALTER TABLE public.danh_sach_todo_quy_trinh ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cho phep tat ca" ON public.danh_sach_todo_quy_trinh FOR ALL USING (true);
