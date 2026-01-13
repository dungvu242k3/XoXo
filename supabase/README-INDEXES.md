# Hướng Dẫn Thêm Indexes Để Tăng Tốc Độ Database

## Vấn Đề
- Database chưa có indexes → queries chậm
- Dữ liệu quá lớn → load lâu

## Giải Pháp

### 1. Chạy Script Thêm Indexes

Mở **Supabase Dashboard** → **SQL Editor** → Chạy file `supabase/add-indexes.sql`

Script này sẽ:
- ✅ Thêm indexes cho tất cả các cột thường được query
- ✅ Tối ưu ORDER BY queries (ngay_tao)
- ✅ Tối ưu WHERE queries (category, status, etc.)
- ✅ Tối ưu JOIN queries (foreign keys)
- ✅ Tối ưu tìm kiếm text (full-text search)

### 2. Kiểm Tra Indexes Đã Tạo

Chạy query này trong SQL Editor:

```sql
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

### 3. Kết Quả Mong Đợi

Sau khi thêm indexes:
- ⚡ **Query speed tăng 5-10x** cho các queries có WHERE/ORDER BY
- ⚡ **Load time giảm 50-70%**
- ⚡ **Database CPU usage giảm đáng kể**

### 4. Monitoring

Kiểm tra performance:
1. Mở Browser DevTools → Network tab
2. Xem thời gian load của Supabase requests
3. Console sẽ hiển thị: `⏱️ Services loaded in XXXms`

### 5. Lưu Ý

- Indexes chiếm thêm disk space (nhưng đáng giá)
- INSERT/UPDATE sẽ chậm hơn một chút (nhưng SELECT nhanh hơn nhiều)
- Nên chạy `ANALYZE` sau khi thêm indexes

### 6. Tối Ưu Thêm (Nếu Cần)

Nếu vẫn chậm sau khi thêm indexes:
1. **Pagination**: Load 20-50 items mỗi lần
2. **Lazy Loading**: Chỉ load khi scroll đến
3. **Caching**: Cache data trong memory/localStorage
4. **CDN cho ảnh**: Upload ảnh lên CDN thay vì lưu base64 trong DB

