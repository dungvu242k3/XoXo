# Hướng Dẫn Bảng Các Task Quy Trình

## 📋 Tổng Quan

Bảng `cac_task_quy_trinh` là bảng con của `cac_buoc_quy_trinh`, lưu trữ các task (công việc) thuộc về mỗi bước quy trình.

**Cấu trúc cây:**
```
Quy Trình (quy_trinh)
  └── Bước (cac_buoc_quy_trinh)
      └── Task (cac_task_quy_trinh) ← Bảng mới
```

---

## 🗄️ Cấu Trúc Bảng

### Bảng: `cac_task_quy_trinh`

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | TEXT (PK) | ID duy nhất của task |
| `id_buoc_quy_trinh` | TEXT (FK) | ID bước quy trình cha → `cac_buoc_quy_trinh.id` |
| `ten_task` | TEXT | Tên task |
| `mo_ta` | TEXT | Mô tả chi tiết (optional) |
| `thu_tu` | INTEGER | Thứ tự trong bước (0, 1, 2, ...) |
| `da_hoan_thanh` | BOOLEAN | Trạng thái hoàn thành (default: false) |
| `ngay_tao` | TIMESTAMP | Ngày tạo |
| `ngay_cap_nhat` | TIMESTAMP | Ngày cập nhật (tự động) |

### Foreign Key:
- `id_buoc_quy_trinh` → `cac_buoc_quy_trinh.id` (ON DELETE CASCADE)

### Indexes:
- `idx_task_id_buoc_quy_trinh`: Tối ưu query theo bước
- `idx_task_thu_tu`: Tối ưu sắp xếp theo thứ tự
- `idx_task_da_hoan_thanh`: Tối ưu filter task chưa hoàn thành

---

## 🚀 Cách Sử Dụng

### 1. Chạy Script Tạo Bảng

Mở **Supabase Dashboard** → **SQL Editor** → Chạy file `supabase/create-tasks-table.sql`

Script này sẽ:
- ✅ Tạo bảng `cac_task_quy_trinh`
- ✅ Tạo indexes
- ✅ Tạo trigger tự động cập nhật `ngay_cap_nhat`
- ✅ **Tự động chuyển dữ liệu** từ cột `cong_viec` (JSON) sang bảng mới

### 2. Kiểm Tra Dữ Liệu Đã Chuyển

```sql
SELECT 
  cb.ten_buoc,
  COUNT(ct.id) as so_task
FROM public.cac_buoc_quy_trinh cb
LEFT JOIN public.cac_task_quy_trinh ct ON ct.id_buoc_quy_trinh = cb.id
GROUP BY cb.id, cb.ten_buoc
ORDER BY cb.id;
```

### 3. Sử Dụng Trong Code

```typescript
import { supabase, DB_TABLES } from '../supabase';

// Load tasks của một bước
const loadTasks = async (stageId: string) => {
  const { data, error } = await supabase
    .from(DB_TABLES.WORKFLOW_TASKS)
    .select('*')
    .eq('id_buoc_quy_trinh', stageId)
    .order('thu_tu', { ascending: true });
    
  return data;
};

// Thêm task mới
const addTask = async (stageId: string, taskName: string) => {
  const { data, error } = await supabase
    .from(DB_TABLES.WORKFLOW_TASKS)
    .insert({
      id_buoc_quy_trinh: stageId,
      ten_task: taskName,
      thu_tu: 0,
      da_hoan_thanh: false
    })
    .select()
    .single();
    
  return data;
};

// Cập nhật trạng thái task
const updateTaskStatus = async (taskId: string, completed: boolean) => {
  const { error } = await supabase
    .from(DB_TABLES.WORKFLOW_TASKS)
    .update({ da_hoan_thanh: completed })
    .eq('id', taskId);
    
  return !error;
};
```

---

## 🔄 Migration Từ JSON

Script migration tự động chuyển dữ liệu từ:
- **Cũ:** `cac_buoc_quy_trinh.cong_viec` (JSON array)
- **Mới:** `cac_task_quy_trinh` (bảng riêng)

**Mapping:**
- `title`/`name` → `ten_task`
- `description` → `mo_ta`
- `order` → `thu_tu`
- `completed` → `da_hoan_thanh`

---

## 📊 Ví Dụ Query

### Lấy tất cả tasks của một bước:
```sql
SELECT * 
FROM cac_task_quy_trinh 
WHERE id_buoc_quy_trinh = 'stage-id-here'
ORDER BY thu_tu ASC;
```

### Lấy tasks chưa hoàn thành:
```sql
SELECT * 
FROM cac_task_quy_trinh 
WHERE id_buoc_quy_trinh = 'stage-id-here'
  AND da_hoan_thanh = FALSE
ORDER BY thu_tu ASC;
```

### Lấy tất cả tasks của một quy trình:
```sql
SELECT ct.*
FROM cac_task_quy_trinh ct
JOIN cac_buoc_quy_trinh cb ON ct.id_buoc_quy_trinh = cb.id
WHERE cb.id_quy_trinh = 'workflow-id-here'
ORDER BY cb.thu_tu, ct.thu_tu;
```

---

## ⚠️ Lưu Ý

1. **Cascade Delete:** Khi xóa bước quy trình, tất cả tasks sẽ tự động bị xóa
2. **Thứ tự:** Tasks được sắp xếp theo `thu_tu` (0, 1, 2, ...)
3. **Backward Compatibility:** Cột `cong_viec` vẫn tồn tại nhưng nên dùng bảng mới
4. **Performance:** Bảng mới có indexes để query nhanh hơn JSON

---

## 🔧 Cập Nhật Code

Sau khi tạo bảng, cần cập nhật:
1. ✅ `supabase.ts` - Thêm `WORKFLOW_TASKS` vào `DB_TABLES`
2. ⏳ `components/Workflows.tsx` - Load tasks từ bảng mới
3. ⏳ `components/EditStageTasksModal.tsx` - CRUD tasks từ bảng mới
4. ⏳ `components/WorkflowConfig.tsx` - Quản lý tasks trong config

