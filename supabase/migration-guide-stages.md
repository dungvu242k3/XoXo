# Hướng Dẫn Migration: Chuyển cac_buoc từ JSONB sang Bảng Riêng

## Tổng Quan

Script này sẽ chuyển dữ liệu các bước quy trình từ cột JSONB `cac_buoc` trong bảng `quy_trinh` sang bảng riêng `cac_buoc_quy_trinh`.

## Các Bước Thực Hiện

### 1. Backup Database
**QUAN TRỌNG**: Luôn backup database trước khi chạy migration!

```sql
-- Trong Supabase Dashboard, vào Settings > Database > Backups
-- Hoặc export data thủ công
```

### 2. Chạy Migration Script

1. Mở Supabase Dashboard
2. Vào **SQL Editor**
3. Copy toàn bộ nội dung file `migrate-stages-to-table.sql`
4. Paste vào SQL Editor
5. Click **Run** để thực thi

### 3. Kiểm Tra Kết Quả

Sau khi chạy migration, kiểm tra bằng query sau:

```sql
SELECT 
  q.id,
  q.ten_quy_trinh,
  jsonb_array_length(COALESCE(q.cac_buoc, '[]'::JSONB)) as so_buoc_cu,
  COUNT(cb.id) as so_buoc_moi
FROM public.quy_trinh q
LEFT JOIN public.cac_buoc_quy_trinh cb ON cb.id_quy_trinh = q.id
WHERE q.cac_buoc IS NOT NULL
GROUP BY q.id, q.ten_quy_trinh, q.cac_buoc
ORDER BY q.ten_quy_trinh;
```

**Kỳ vọng**: `so_buoc_cu` = `so_buoc_moi` cho mỗi quy trình

### 4. Test Ứng Dụng

1. Refresh ứng dụng
2. Kiểm tra các quy trình hiển thị đúng các bước
3. Thử tạo/sửa/xóa quy trình mới
4. Xác nhận mọi thứ hoạt động bình thường

### 5. Xóa Cột Cũ (Sau Khi Đã Xác Nhận)

**CHỈ CHẠY SAU KHI ĐÃ XÁC NHẬN MỌI THỨ HOẠT ĐỘNG ĐÚNG!**

```sql
ALTER TABLE public.quy_trinh DROP COLUMN IF EXISTS cac_buoc;
```

## Cấu Trúc Dữ Liệu

### Trước Migration (JSONB)
```json
{
  "cac_buoc": [
    {
      "id": "stage-1",
      "name": "Bước 1",
      "order": 0,
      "color": "bg-blue-500",
      "details": "Chi tiết",
      "standards": "Tiêu chuẩn",
      "todos": [...]
    }
  ]
}
```

### Sau Migration (Bảng Riêng)
```sql
-- Bảng cac_buoc_quy_trinh
id: "stage-1"
id_quy_trinh: "workflow-id"
ten_buoc: "Bước 1"
thu_tu: 0
-- mau_sac đã bị xóa khỏi schema (không còn sử dụng)
chi_tiet: "Chi tiết"
tieu_chuan: "Tiêu chuẩn"
cong_viec: [...]
```

## Xử Lý Lỗi

### Lỗi: "relation already exists"
- Bảng đã được tạo, bỏ qua bước 1

### Lỗi: "duplicate key value"
- Data đã được migrate, script sẽ skip (ON CONFLICT DO NOTHING)

### Lỗi: "foreign key violation"
- Kiểm tra xem có quy trình nào bị xóa không
- Kiểm tra data integrity

## Rollback (Nếu Cần)

Nếu cần rollback, chạy:

```sql
-- Xóa bảng mới
DROP TABLE IF EXISTS public.cac_buoc_quy_trinh CASCADE;

-- Cột cac_buoc vẫn còn trong bảng quy_trinh (nếu chưa xóa)
-- Data vẫn còn nguyên
```

## Lưu Ý

- Migration script sử dụng `ON CONFLICT DO NOTHING` nên có thể chạy nhiều lần an toàn
- Script sẽ tự động generate ID nếu stage không có ID
- Todos vẫn được lưu dạng JSONB trong bảng mới (vì là nested data nhỏ)

