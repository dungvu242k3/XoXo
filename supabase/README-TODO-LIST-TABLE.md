# Hướng Dẫn Bảng Danh Sách Todo Quy Trình

## 📋 Tổng Quan

Bảng `danh_sach_todo_quy_trinh` là bảng con của `cac_task_quy_trinh`, lưu trữ các todo list (danh sách công việc chi tiết) thuộc về mỗi task.

**Cấu trúc cây hoàn chỉnh:**
```
Quy Trình (quy_trinh)
  └── Bước (cac_buoc_quy_trinh)
      └── Task (cac_task_quy_trinh)
          └── Todo List (danh_sach_todo_quy_trinh) ← Bảng mới
```

---

## 🗄️ Cấu Trúc Bảng

### Bảng: `danh_sach_todo_quy_trinh`

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | TEXT (PK) | ID duy nhất của todo |
| `id_task_quy_trinh` | TEXT (FK) | ID task quy trình cha → `cac_task_quy_trinh.id` |
| `ten_todo` | TEXT | Tên todo |
| `mo_ta` | TEXT | Mô tả chi tiết (optional) |
| `thu_tu` | INTEGER | Thứ tự trong task (0, 1, 2, ...) |
| `da_hoan_thanh` | BOOLEAN | Trạng thái hoàn thành (default: false) |
| `ngay_hoan_thanh` | TIMESTAMP | Ngày hoàn thành (tự động khi đánh dấu) |
| `nguoi_thuc_hien` | TEXT | Người thực hiện (ID hoặc tên) |
| `ngay_tao` | TIMESTAMP | Ngày tạo |
| `ngay_cap_nhat` | TIMESTAMP | Ngày cập nhật (tự động) |

### Foreign Key:
- `id_task_quy_trinh` → `cac_task_quy_trinh.id` (ON DELETE CASCADE)

### Indexes:
- `idx_todo_list_id_task_quy_trinh`: Tối ưu query theo task
- `idx_todo_list_thu_tu`: Tối ưu sắp xếp theo thứ tự
- `idx_todo_list_da_hoan_thanh`: Tối ưu filter todo chưa hoàn thành
- `idx_todo_list_nguoi_thuc_hien`: Tối ưu filter theo người thực hiện

### Triggers:
- Tự động cập nhật `ngay_cap_nhat` khi có thay đổi
- Tự động set `ngay_hoan_thanh` khi đánh dấu hoàn thành

---

## 🚀 Cách Sử Dụng

### 1. Chạy Script Tạo Bảng

Mở **Supabase Dashboard** → **SQL Editor** → Chạy file `supabase/create-todo-list-table.sql`

Script này sẽ:
- ✅ Tạo bảng `danh_sach_todo_quy_trinh`
- ✅ Tạo indexes
- ✅ Tạo trigger tự động cập nhật thời gian

### 2. Sử Dụng Trong Code

```typescript
import { supabase, DB_TABLES } from '../supabase';

// Load todo list của một task
const loadTodoList = async (taskId: string) => {
  const { data, error } = await supabase
    .from(DB_TABLES.WORKFLOW_TODO_LIST)
    .select('*')
    .eq('id_task_quy_trinh', taskId)
    .order('thu_tu', { ascending: true });
    
  return data;
};

// Thêm todo mới
const addTodo = async (taskId: string, todoName: string, description?: string) => {
  const { data, error } = await supabase
    .from(DB_TABLES.WORKFLOW_TODO_LIST)
    .insert({
      id_task_quy_trinh: taskId,
      ten_todo: todoName,
      mo_ta: description,
      thu_tu: 0,
      da_hoan_thanh: false
    })
    .select()
    .single();
    
  return data;
};

// Cập nhật trạng thái todo
const updateTodoStatus = async (todoId: string, completed: boolean, nguoiThucHien?: string) => {
  const updateData: any = { da_hoan_thanh: completed };
  if (nguoiThucHien) {
    updateData.nguoi_thuc_hien = nguoiThucHien;
  }
  
  const { error } = await supabase
    .from(DB_TABLES.WORKFLOW_TODO_LIST)
    .update(updateData)
    .eq('id', todoId);
    
  return !error;
};

// Xóa todo
const deleteTodo = async (todoId: string) => {
  const { error } = await supabase
    .from(DB_TABLES.WORKFLOW_TODO_LIST)
    .delete()
    .eq('id', todoId);
    
  return !error;
};
```

---

## 📊 Ví Dụ Query

### Lấy tất cả todo list của một task:
```sql
SELECT * 
FROM danh_sach_todo_quy_trinh 
WHERE id_task_quy_trinh = 'task-id-here'
ORDER BY thu_tu ASC;
```

### Lấy todo list chưa hoàn thành:
```sql
SELECT * 
FROM danh_sach_todo_quy_trinh 
WHERE id_task_quy_trinh = 'task-id-here'
  AND da_hoan_thanh = FALSE
ORDER BY thu_tu ASC;
```

### Lấy todo list theo người thực hiện:
```sql
SELECT * 
FROM danh_sach_todo_quy_trinh 
WHERE nguoi_thuc_hien = 'user-id-here'
  AND da_hoan_thanh = FALSE
ORDER BY ngay_tao DESC;
```

### Lấy tất cả todo list của một quy trình (join đầy đủ):
```sql
SELECT 
  q.ten_quy_trinh,
  cb.ten_buoc,
  cb.thu_tu as buoc_thu_tu,
  ct.ten_task,
  ct.thu_tu as task_thu_tu,
  dt.ten_todo,
  dt.da_hoan_thanh,
  dt.nguoi_thuc_hien,
  dt.ngay_hoan_thanh
FROM danh_sach_todo_quy_trinh dt
JOIN cac_task_quy_trinh ct ON dt.id_task_quy_trinh = ct.id
JOIN cac_buoc_quy_trinh cb ON ct.id_buoc_quy_trinh = cb.id
JOIN quy_trinh q ON cb.id_quy_trinh = q.id
WHERE q.id = 'workflow-id-here'
ORDER BY cb.thu_tu, ct.thu_tu, dt.thu_tu;
```

### Thống kê todo list:
```sql
SELECT 
  ct.ten_task,
  COUNT(dt.id) as tong_todo,
  COUNT(CASE WHEN dt.da_hoan_thanh = TRUE THEN 1 END) as todo_da_hoan_thanh,
  COUNT(CASE WHEN dt.da_hoan_thanh = FALSE THEN 1 END) as todo_chua_hoan_thanh
FROM cac_task_quy_trinh ct
LEFT JOIN danh_sach_todo_quy_trinh dt ON dt.id_task_quy_trinh = ct.id
WHERE ct.id_buoc_quy_trinh = 'stage-id-here'
GROUP BY ct.id, ct.ten_task
ORDER BY ct.thu_tu;
```

---

## 🔄 Cấu Trúc Cây Hoàn Chỉnh

```
📦 QUY TRÌNH (quy_trinh)
   │
   └── 📋 BƯỚC (cac_buoc_quy_trinh)
       │
       └── ✅ TASK (cac_task_quy_trinh)
           │
           └── 📝 TODO LIST (danh_sach_todo_quy_trinh)
```

### Ví dụ thực tế:

```
Quy trình: "Sửa chữa Điện thoại"
│
├── Bước 1: Vệ Sinh
│   │
│   └── Task: Làm sạch bề mặt
│       │
│       ├── Todo: Tháo vỏ máy
│       ├── Todo: Lau chùi bụi bẩn
│       └── Todo: Kiểm tra linh kiện
│
└── Bước 2: Chẩn đoán
    │
    └── Task: Kiểm tra nguồn
        │
        ├── Todo: Test pin
        └── Todo: Kiểm tra sạc
```

---

## ⚠️ Lưu Ý

1. **Cascade Delete:** 
   - Khi xóa task → Tất cả todo list tự động bị xóa
   - Khi xóa bước → Tất cả task và todo list tự động bị xóa
   - Khi xóa quy trình → Tất cả bước, task và todo list tự động bị xóa

2. **Thứ tự:** Todo list được sắp xếp theo `thu_tu` (0, 1, 2, ...)

3. **Tự động:** 
   - `ngay_hoan_thanh` tự động được set khi `da_hoan_thanh = TRUE`
   - `ngay_cap_nhat` tự động cập nhật khi có thay đổi

4. **Performance:** Bảng có indexes để query nhanh, đặc biệt khi filter theo task hoặc trạng thái

---

## 🔧 Cập Nhật Code

Sau khi tạo bảng, cần cập nhật:
1. ✅ `supabase.ts` - Thêm `WORKFLOW_TODO_LIST` vào `DB_TABLES`
2. ⏳ `components/EditStageTasksModal.tsx` - Load và quản lý todo list
3. ⏳ `components/WorkflowConfig.tsx` - Hiển thị todo list trong config
4. ⏳ `components/TechnicianView.tsx` - Hiển thị và đánh dấu hoàn thành todo

