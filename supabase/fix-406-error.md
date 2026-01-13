# Fix Lỗi 406 (Not Acceptable)

## Nguyên nhân
Lỗi 406 thường xảy ra khi:
1. **Real-time subscription chưa được enable** trong Supabase Dashboard
2. **RLS (Row Level Security) policy** chặn real-time updates
3. **Format dữ liệu JSONB** không đúng

## Giải pháp

### 1. Enable Real-time trong Supabase Dashboard

1. Vào [Supabase Dashboard](https://supabase.com/dashboard)
2. Chọn project của bạn
3. Vào **Database** → **Replication**
4. Tìm bảng `quy_trinh` (và các bảng khác nếu cần)
5. **Bật toggle** để enable real-time cho các bảng:
   - `quy_trinh`
   - `dich_vu_spa`
   - `don_hang`
   - `hang_muc_dich_vu`
   - `kho_vat_tu`
   - `nhan_su`
   - `san_pham_ban_le`
   - `khach_hang`

### 2. Kiểm tra RLS Policies

Đảm bảo RLS policies cho phép real-time:

```sql
-- Kiểm tra policies hiện tại
SELECT * FROM pg_policies WHERE tablename = 'quy_trinh';

-- Nếu cần, tạo policy cho real-time
CREATE POLICY "Enable real-time for all" ON public.quy_trinh
FOR SELECT USING (true);
```

### 3. Kiểm tra trong Browser Console

Mở Browser Console (F12) và kiểm tra:
- Có log "✅ Subscribed to workflows changes" không?
- Có lỗi gì về channel subscription không?

### 4. Tạm thời tắt Real-time (nếu không cần)

Nếu không cần real-time ngay, có thể comment out phần subscription trong code:

```typescript
// Tạm thời tắt real-time
// const channel = supabase.channel(...)
```

## Kiểm tra

Sau khi enable real-time:
1. Refresh trang
2. Thêm/sửa một workflow
3. Kiểm tra console xem còn lỗi 406 không
4. Kiểm tra xem workflow có được lưu vào database không

## Lưu ý

- Lỗi 406 **không ảnh hưởng** đến việc lưu dữ liệu (như log cho thấy "Workflow saved successfully!")
- Lỗi này chỉ ảnh hưởng đến **real-time updates**
- Nếu không cần real-time, có thể bỏ qua lỗi này

