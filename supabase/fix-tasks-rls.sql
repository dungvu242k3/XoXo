-- Enable RLS for the table (just in case)
ALTER TABLE public.cac_task_quy_trinh ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations (SELECT, INSERT, UPDATE, DELETE) for everyone
-- Note: In production, you might want to restrict this to authenticated users
DROP POLICY IF EXISTS "Cho phep tat ca cac_task_quy_trinh" ON public.cac_task_quy_trinh;

CREATE POLICY "Cho phep tat ca cac_task_quy_trinh" 
ON public.cac_task_quy_trinh 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Verify policies
SELECT * FROM pg_policies WHERE tablename = 'cac_task_quy_trinh';
