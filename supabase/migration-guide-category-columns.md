# Migration Guide: Chuyển duong_dan_danh_muc sang 4 cột Cap_1, Cap_2, Cap_3, Cap_4

## Mục đích
Thay thế cột JSONB `duong_dan_danh_muc` bằng 4 cột TEXT riêng biệt để:
- Dễ query và filter theo từng cấp
- Tối ưu hiệu suất với index riêng cho từng cấp
- Cấu trúc rõ ràng hơn, dễ quản lý

## Cấu trúc mới

### Trước (JSONB):
```sql
duong_dan_danh_muc: ["Spa", "Chăm sóc da", "Mặt nạ", "Mặt nạ collagen"]
```

### Sau (4 cột):
```sql
cap_1: "Spa"
cap_2: "Chăm sóc da"
cap_3: "Mặt nạ"
cap_4: "Mặt nạ collagen"
```

## Cách thực hiện

### Bước 1: Backup dữ liệu (QUAN TRỌNG!)
```sql
-- Export dữ liệu hiện tại
COPY (SELECT * FROM public.dich_vu_spa) TO '/tmp/dich_vu_spa_backup.csv' WITH CSV HEADER;
```

Hoặc sử dụng Supabase Dashboard:
1. Vào Table Editor > `dich_vu_spa`
2. Click "Export" để tải về file CSV

### Bước 2: Chạy migration script
1. Mở Supabase Dashboard
2. Vào SQL Editor
3. Copy toàn bộ nội dung file `migrate-category-to-columns.sql`
4. Paste vào SQL Editor
5. Click "Run" để thực thi

### Bước 3: Verify migration
Sau khi chạy script, kiểm tra:
```sql
-- Kiểm tra số lượng records có dữ liệu category
SELECT 
  COUNT(*) as total,
  COUNT(cap_1) as co_cap_1,
  COUNT(cap_2) as co_cap_2,
  COUNT(cap_3) as co_cap_3,
  COUNT(cap_4) as co_cap_4
FROM public.dich_vu_spa;

-- Xem một vài records mẫu
SELECT id, ten_dich_vu, cap_1, cap_2, cap_3, cap_4 
FROM public.dich_vu_spa 
WHERE cap_1 IS NOT NULL 
LIMIT 10;
```

## Rollback (nếu cần quay lại)

Nếu gặp vấn đề, có thể rollback bằng cách:
1. Sử dụng script rollback trong file `migrate-category-to-columns.sql` (phần comment)
2. Hoặc restore từ backup đã tạo ở Bước 1

## Lưu ý

1. **Backup trước khi chạy**: Luôn backup dữ liệu trước khi chạy migration
2. **Test trên môi trường dev**: Nên test migration trên database dev trước
3. **Kiểm tra dữ liệu**: Sau khi migration, kiểm tra kỹ dữ liệu đã được migrate đúng chưa
4. **Update code**: Code frontend đã được cập nhật để sử dụng 4 cột mới

## Query examples sau khi migration

```sql
-- Tìm tất cả dịch vụ ở cấp 1 "Spa"
SELECT * FROM public.dich_vu_spa WHERE cap_1 = 'Spa';

-- Tìm tất cả dịch vụ ở cấp 2 "Chăm sóc da"
SELECT * FROM public.dich_vu_spa WHERE cap_2 = 'Chăm sóc da';

-- Tìm dịch vụ có đầy đủ 4 cấp
SELECT * FROM public.dich_vu_spa 
WHERE cap_1 IS NOT NULL 
  AND cap_2 IS NOT NULL 
  AND cap_3 IS NOT NULL 
  AND cap_4 IS NOT NULL;

-- Đếm số dịch vụ theo từng cấp 1
SELECT cap_1, COUNT(*) as so_luong 
FROM public.dich_vu_spa 
WHERE cap_1 IS NOT NULL 
GROUP BY cap_1 
ORDER BY so_luong DESC;
```

