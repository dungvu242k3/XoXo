# Hướng Dẫn Tạo Bảng Quy Trình (Workflow Tables)

## 📋 Tổng Quan

File `create-workflow-tables.sql` tạo toàn bộ các bảng liên quan đến quy trình trong một lần chạy:

1. **cac_task_quy_trinh** - Bảng Task (cấp con của Bước)
2. **danh_sach_todo_quy_trinh** - Bảng Todo List (cấp con của Task)

**Cấu trúc cây hoàn chỉnh:**
```
Quy Trình (quy_trinh)
  └── Bước (cac_buoc_quy_trinh)
      └── Task (cac_task_quy_trinh)
          └── Todo List (danh_sach_todo_quy_trinh)
```

---

## 🚀 Cách Sử Dụng

### Bước 1: Chạy Script Tạo Bảng

1. Mở [Supabase Dashboard](https://supabase.com/dashboard)
2. Chọn project của bạn
3. Vào **SQL Editor** (menu bên trái)
4. Click **New Query**
5. Copy toàn bộ nội dung file `supabase/create-workflow-tables.sql`
6. Paste vào SQL Editor
7. Click **Run** (hoặc nhấn `Ctrl+Enter`)

### Bước 2: Kiểm Tra

Sau khi chạy, kiểm tra các bảng đã tạo:

```sql
-- Kiểm tra bảng cac_task_quy_trinh
SELECT COUNT(*) FROM cac_task_quy_trinh;

-- Kiểm tra bảng danh_sach_todo_quy_trinh
SELECT COUNT(*) FROM danh_sach_todo_quy_trinh;

-- Xem cấu trúc bảng
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name IN ('cac_task_quy_trinh', 'danh_sach_todo_quy_trinh')
ORDER BY table_name, ordinal_position;
```

---

## 📊 Cấu Trúc Bảng

### 1. Bảng `cac_task_quy_trinh`

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | TEXT (PK) | ID duy nhất |
| `id_buoc_quy_trinh` | TEXT (FK) | ID bước quy trình cha |
| `ten_task` | TEXT | Tên task |
| `mo_ta` | TEXT | Mô tả (optional) |
| `thu_tu` | INTEGER | Thứ tự trong bước |
| `da_hoan_thanh` | BOOLEAN | Trạng thái hoàn thành |
| `ngay_tao` | TIMESTAMP | Ngày tạo |
| `ngay_cap_nhat` | TIMESTAMP | Ngày cập nhật (tự động) |

### 2. Bảng `danh_sach_todo_quy_trinh`

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | TEXT (PK) | ID duy nhất |
| `id_task_quy_trinh` | TEXT (FK) | ID task quy trình cha |
| `ten_todo` | TEXT | Tên todo |
| `mo_ta` | TEXT | Mô tả (optional) |
| `thu_tu` | INTEGER | Thứ tự trong task |
| `da_hoan_thanh` | BOOLEAN | Trạng thái hoàn thành |
| `ngay_hoan_thanh` | TIMESTAMP | Ngày hoàn thành (tự động) |
| `nguoi_thuc_hien` | TEXT | Người thực hiện |
| `ngay_tao` | TIMESTAMP | Ngày tạo |
| `ngay_cap_nhat` | TIMESTAMP | Ngày cập nhật (tự động) |

---

## 🔄 Migration Tự Động

Script tự động chuyển dữ liệu từ:
- **Cũ:** `cac_buoc_quy_trinh.cong_viec` (JSON array)
- **Mới:** `cac_task_quy_trinh` (bảng riêng)

**Lưu ý:** Migration chỉ chạy nếu chưa có task trong bảng mới (tránh duplicate).

---

## 📝 Ví Dụ Sử Dụng

### Thêm Task mới:

```sql
INSERT INTO cac_task_quy_trinh (
  id_buoc_quy_trinh,
  ten_task,
  mo_ta,
  thu_tu
) VALUES (
  'stage-id-here',
  'Làm sạch bề mặt',
  'Làm sạch toàn bộ bề mặt máy',
  1
);
```

### Thêm Todo List mới:

```sql
INSERT INTO danh_sach_todo_quy_trinh (
  id_task_quy_trinh,
  ten_todo,
  mo_ta,
  thu_tu
) VALUES (
  'task-id-here',
  'Tháo vỏ máy',
  'Tháo các ốc vít và vỏ máy',
  1
);
```

### Lấy tất cả tasks và todo list của một quy trình:

```sql
SELECT 
  q.ten_quy_trinh,
  cb.ten_buoc,
  cb.thu_tu as buoc_thu_tu,
  ct.ten_task,
  ct.thu_tu as task_thu_tu,
  dt.ten_todo,
  dt.da_hoan_thanh,
  dt.nguoi_thuc_hien
FROM danh_sach_todo_quy_trinh dt
JOIN cac_task_quy_trinh ct ON dt.id_task_quy_trinh = ct.id
JOIN cac_buoc_quy_trinh cb ON ct.id_buoc_quy_trinh = cb.id
JOIN quy_trinh q ON cb.id_quy_trinh = q.id
WHERE q.id = 'workflow-id-here'
ORDER BY cb.thu_tu, ct.thu_tu, dt.thu_tu;
```

---

## ⚠️ Lưu Ý

1. **Cascade Delete:**
   - Xóa quy trình → Xóa tất cả bước, task, todo list
   - Xóa bước → Xóa tất cả task, todo list
   - Xóa task → Xóa tất cả todo list

2. **Thứ tự:**
   - Tasks được sắp xếp theo `thu_tu` trong mỗi bước
   - Todo list được sắp xếp theo `thu_tu` trong mỗi task

3. **Tự động:**
   - `ngay_cap_nhat` tự động cập nhật khi có thay đổi
   - `ngay_hoan_thanh` tự động set khi `da_hoan_thanh = TRUE`

4. **Performance:**
   - Tất cả bảng đã có indexes để query nhanh
   - Sử dụng composite indexes cho ORDER BY queries

---

## 🔧 Cập Nhật Code

Sau khi tạo bảng, code đã được cập nhật:
- ✅ `supabase.ts` - Thêm `WORKFLOW_TASKS` và `WORKFLOW_TODO_LIST` vào `DB_TABLES`

Cần cập nhật thêm:
- ⏳ `components/Workflows.tsx` - Load tasks và todo list từ bảng mới
- ⏳ `components/EditStageTasksModal.tsx` - CRUD tasks và todo list
- ⏳ `components/WorkflowConfig.tsx` - Quản lý tasks và todo list trong config

---

## 📚 Tài Liệu Liên Quan

- `supabase/README-TASKS-TABLE.md` - Chi tiết về bảng Task
- `supabase/README-TODO-LIST-TABLE.md` - Chi tiết về bảng Todo List
- `docs/WORKFLOW-TREE-STRUCTURE.md` - Cấu trúc cây quy trình

