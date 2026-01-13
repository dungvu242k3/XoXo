# Hướng dẫn Setup Supabase

## Bước 1: Tạo Supabase Project

1. Truy cập [Supabase](https://supabase.com)
2. Tạo project mới
3. Lưu lại:
   - Project URL
   - Anon/Public Key

## Bước 2: Chạy Schema SQL

1. Vào SQL Editor trong Supabase Dashboard
2. Copy toàn bộ nội dung file `schema.sql`
3. Paste và chạy trong SQL Editor

## Bước 3: Cấu hình Environment Variables

Tạo file `.env.local` hoặc `.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Bước 4: Cài đặt Dependencies

```bash
npm install
```

## Bước 5: Import Data (Tùy chọn)

Nếu bạn có dữ liệu cần import:

1. Chuyển đổi format JSON sang format PostgreSQL
2. Import vào Supabase bằng SQL hoặc Dashboard

## Cấu trúc Database

### Bảng chính:
- `khach_hang` - Khách hàng
- `don_hang` - Đơn hàng
- `service_items` - Sản phẩm trong đơn hàng
- `kho_vat_tu` - Kho vật tư
- `dich_vu_spa` - Dịch vụ Spa
- `san_pham_ban_le` - Sản phẩm bán lẻ
- `nhan_su` - Nhân sự
- `quy_trinh` - Quy trình
- `thong_bao` - Thông báo

### JSONB Fields:
- `category_path` (dich_vu_spa) - Array of strings
- `workflows` (dich_vu_spa) - Array of {id, order}
- `history` (service_items) - Array of TaskHistory
- `technical_log` (service_items) - Array of TechnicalLog
- `types` (quy_trinh) - Array of ServiceType
- `materials` (quy_trinh) - Array of WorkflowMaterial
- `stages` (quy_trinh) - Array of WorkflowStage
- `assigned_members` (quy_trinh) - Array of strings

## Lưu ý

- Tất cả timestamps sử dụng `TIMESTAMP WITH TIME ZONE`
- JSONB được sử dụng cho các trường phức tạp (arrays, objects)
- Foreign keys được thiết lập với CASCADE delete
- Indexes được tạo cho các trường thường query

