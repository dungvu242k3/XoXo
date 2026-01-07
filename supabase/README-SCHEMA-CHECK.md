# Kiểm tra Schema Supabase

## Vấn đề
Một số cột có thể chưa tồn tại trong database Supabase.

## Cách kiểm tra và sửa

### Bước 1: Chạy script kiểm tra
Mở Supabase Dashboard → SQL Editor và chạy file `verify-and-fix-schema.sql`

Script này sẽ:
- Bỏ constraint check cho `phong_ban` (cho phép bất kỳ giá trị nào)
- Kiểm tra và thêm các cột còn thiếu trong bảng `nhan_su`
- Hiển thị danh sách tất cả cột hiện có

### Bước 2: Kiểm tra kết quả
Sau khi chạy script, kiểm tra output để xem:
- Các cột nào đã được thêm
- Các cột nào đã tồn tại
- Constraint đã được bỏ chưa

### Bước 3: Nếu vẫn thiếu cột
Nếu vẫn có cột thiếu, chạy lệnh ALTER TABLE để thêm:

```sql
ALTER TABLE public.nhan_su ADD COLUMN ten_cot TEXT;
```

## Các cột cần có trong bảng nhan_su:
- id (TEXT PRIMARY KEY)
- ho_ten (TEXT NOT NULL)
- vai_tro (TEXT NOT NULL)
- sdt (TEXT NOT NULL)
- email (TEXT)
- trang_thai (TEXT)
- anh_dai_dien (TEXT)
- chuyen_mon (TEXT)
- phong_ban (TEXT) - KHÔNG có constraint check
- ngay_tao (TIMESTAMP WITH TIME ZONE)
- ngay_cap_nhat (TIMESTAMP WITH TIME ZONE)

