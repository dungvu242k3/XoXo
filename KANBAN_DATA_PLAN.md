# 📋 KẾ HOẠCH NGUỒN DỮ LIỆU CHO BẢNG KANBAN

## 🎯 Tổng Quan

Bảng Kanban (`KanbanBoard`) lấy dữ liệu từ **nhiều nguồn khác nhau** để hiển thị và quản lý tiến độ công việc. Dưới đây là chi tiết về từng nguồn dữ liệu.

---

## 📊 CÁC NGUỒN DỮ LIỆU CHÍNH

### 1. **ĐƠN HÀNG (Orders)** 
**Nguồn:** Supabase trực tiếp (tables: `don_hang` và `hang_muc_dich_vu`)

**Cách lấy:**
- Component load trực tiếp từ Supabase trong `useEffect`
- Load orders từ table `don_hang`
- Load items từ table `hang_muc_dich_vu`
- Group items theo `id_don_hang` và map sang Order[]
- Real-time sync qua Supabase Realtime subscriptions (channels: `kanban-orders-changes`)

**Dữ liệu sử dụng:**
```typescript
- order.id (Mã đơn hàng)
- order.customerName (Tên khách hàng)
- order.expectedDelivery (Ngày giao dự kiến)
- order.items[] (Danh sách dịch vụ/sản phẩm)
  - item.id
  - item.name
  - item.status (Trạng thái hiện tại)
  - item.serviceId (ID dịch vụ - để tìm workflow)
  - item.workflowId (ID quy trình đang thực hiện)
  - item.history[] (Lịch sử chuyển đổi trạng thái)
  - item.lastUpdated
  - item.technicalLog[]
```

**Vị trí code:**
- `components/KanbanBoard.tsx` dòng 135-280: Load trực tiếp từ Supabase
- Real-time sync qua channels: `kanban-orders-changes` (cho cả `don_hang` và `hang_muc_dich_vu`)

---

### 2. **QUY TRÌNH (Workflows)**
**Nguồn:** Supabase Table `quy_trinh` (WORKFLOWS)

**Cách lấy:**
- Load trực tiếp từ Supabase trong `useEffect` (dòng 138-261)
- Real-time sync qua Supabase Realtime channel

**Query:**
```sql
SELECT id, ten_quy_trinh, mo_ta, phong_ban_phu_trach, 
       loai_ap_dung, mau_sac, vat_tu_can_thiet, nhan_vien_duoc_giao
FROM quy_trinh
ORDER BY ngay_tao DESC
LIMIT 100
```

**Dữ liệu sử dụng:**
```typescript
- workflow.id
- workflow.label (ten_quy_trinh)
- workflow.description (mo_ta)
- workflow.department (phong_ban_phu_trach)
- workflow.types (loai_ap_dung)
- workflow.color (mau_sac)
- workflow.materials (vat_tu_can_thiet)
- workflow.assignedMembers (nhan_vien_duoc_giao)
- workflow.stages[] (Từ bảng cac_buoc_quy_trinh)
```

**Vị trí code:**
- `components/KanbanBoard.tsx` dòng 138-261: Load workflows

---

### 3. **CÁC BƯỚC QUY TRÌNH (Workflow Stages)**
**Nguồn:** Supabase Table `cac_buoc_quy_trinh` (WORKFLOW_STAGES)

**Cách lấy:**
- Load cùng với workflows (dòng 151-154)
- Group theo `id_quy_trinh` (workflow ID)

**Query:**
```sql
SELECT id, id_quy_trinh, ten_buoc, thu_tu, mau_sac, chi_tiet, tieu_chuan
FROM cac_buoc_quy_trinh
ORDER BY id_quy_trinh, thu_tu ASC
```

**Dữ liệu sử dụng:**
```typescript
- stage.id (UUID - QUAN TRỌNG để match với item.status)
- stage.name (ten_buoc)
- stage.order (thu_tu)
- stage.color (mau_sac)
- stage.details (chi_tiet)
- stage.standards (tieu_chuan)
- stage.todos[] (Từ bảng cac_task_quy_trinh)
```

**Vị trí code:**
- `components/KanbanBoard.tsx` dòng 151-204: Load và map stages

---

### 4. **CÁC TASK QUY TRÌNH (Workflow Tasks)**
**Nguồn:** Supabase Table `cac_task_quy_trinh` (WORKFLOW_TASKS)

**Cách lấy:**
- Load sau khi có danh sách stage IDs (dòng 159-172)
- Group theo `id_buoc_quy_trinh` (stage ID)

**Query:**
```sql
SELECT *
FROM cac_task_quy_trinh
WHERE id_buoc_quy_trinh IN (stage_ids...)
ORDER BY thu_tu ASC
```

**Dữ liệu sử dụng:**
```typescript
- task.id
- task.title (ten_task)
- task.description (mo_ta)
- task.completed (da_hoan_thanh)
- task.order (thu_tu)
```

**Vị trí code:**
- `components/KanbanBoard.tsx` dòng 159-187: Load và group tasks

---

### 5. **DỊCH VỤ (Services)**
**Nguồn:** Supabase Table `dich_vu_spa` (SERVICES)

**Cách lấy:**
- Load trong `useEffect` (dòng 92-135)
- Real-time sync qua Supabase Realtime channel

**Query:**
```sql
SELECT *
FROM dich_vu_spa
```

**Dữ liệu sử dụng:**
```typescript
- service.id
- service.name
- service.workflows[] (Danh sách workflows áp dụng cho service này)
  - workflow.id
  - workflow.order (Thứ tự thực hiện)
```

**Mục đích:**
- Tìm workflow phù hợp cho từng item dựa trên `item.serviceId`
- Xác định workflow tiếp theo khi hoàn thành workflow hiện tại

**Vị trí code:**
- `components/KanbanBoard.tsx` dòng 92-135: Load services

---

## 🔄 LUỒNG XỬ LÝ DỮ LIỆU

### Bước 1: Load dữ liệu cơ bản
```
1. Orders từ Context (đã load sẵn)
2. Services từ Supabase
3. Workflows từ Supabase
4. Stages từ Supabase (theo workflows)
5. Tasks từ Supabase (theo stages)
```

### Bước 2: Tạo Kanban Items
```typescript
// Dòng 584-658
items = orders.flatMap(order => 
  order.items
    .filter(item => !item.isProduct) // Chỉ lấy dịch vụ, không lấy sản phẩm
    .map(item => {
      // Xác định workflowId từ service nếu chưa có
      if (!item.workflowId && item.serviceId) {
        const service = services.find(s => s.id === item.serviceId);
        workflowId = service.workflows[0].id; // Workflow đầu tiên
      }
      
      return {
        ...item,
        orderId: order.id,
        customerName: order.customerName,
        expectedDelivery: order.expectedDelivery,
        workflowId: workflowId
      };
    })
);
```

### Bước 3: Lọc Workflows hiển thị
```typescript
// Dòng 264-569: WORKFLOWS_FILTER
1. Lấy tất cả workflows từ services của items trong selected orders
2. Match workflow IDs từ services với workflows đã load
3. Sắp xếp theo thứ tự (order) từ service.workflows
4. Trả về danh sách workflows để hiển thị trong sidebar
```

### Bước 4: Tạo Columns (Cột Kanban)
```typescript
// Dòng 668-768
if (activeWorkflow === 'ALL') {
  // Matrix view: Mỗi workflow là một cột
  columns = workflows.map(wf => ({
    id: wf.id,
    title: wf.label,
    color: wf.color
  }));
} else {
  // Standard view: Mỗi stage là một cột
  const workflow = workflows.find(w => w.id === activeWorkflow);
  columns = workflow.stages.map(stage => ({
    id: stage.id, // UUID từ database
    title: stage.name,
    color: stage.color
  }));
}
```

### Bước 5: Lọc Items theo Filter
```typescript
// Dòng 1138-1174: filteredItems
1. Lọc theo selectedOrderIds (nếu có)
2. Lọc theo activeWorkflow (nếu không phải 'ALL')
3. Match items với columns dựa trên:
   - item.status === column.id (UUID)
   - item.workflowId === column.id (trong ALL view)
```

---

## 🗄️ CẤU TRÚC DATABASE

### Bảng `don_hang` (Orders)
```sql
- ma_don_hang (id)
- ma_khach_hang (customerId)
- ten_khach_hang (customerName)
- danh_sach_dich_vu (items) - JSON array
- tong_tien (totalAmount)
- ngay_giao_du_kien (expectedDelivery)
- ...
```

### Bảng `quy_trinh` (Workflows)
```sql
- id (UUID)
- ten_quy_trinh (label)
- mo_ta (description)
- phong_ban_phu_trach (department)
- loai_ap_dung (types) - JSON array
- mau_sac (color)
- vat_tu_can_thiet (materials) - JSON
- nhan_vien_duoc_giao (assignedMembers) - JSON array
- ngay_tao (createdAt)
```

### Bảng `cac_buoc_quy_trinh` (Workflow Stages)
```sql
- id (UUID) - QUAN TRỌNG: Dùng để match với item.status
- id_quy_trinh (workflow_id) - Foreign key
- ten_buoc (name)
- thu_tu (order)
- mau_sac (color)
- chi_tiet (details)
- tieu_chuan (standards)
```

### Bảng `cac_task_quy_trinh` (Workflow Tasks)
```sql
- id (UUID)
- id_buoc_quy_trinh (stage_id) - Foreign key
- ten_task (title)
- mo_ta (description)
- thu_tu (order)
- da_hoan_thanh (completed)
```

### Bảng `dich_vu_spa` (Services)
```sql
- id (UUID)
- name
- workflows - JSON array:
  [
    {
      id: "workflow-uuid",
      order: 1
    },
    {
      id: "workflow-uuid-2",
      order: 2
    }
  ]
```

---

## 🔗 QUAN HỆ GIỮA CÁC BẢNG

```
don_hang (Orders)
  └── items[] (ServiceItem[])
      ├── serviceId → dich_vu_spa.id
      └── workflowId → quy_trinh.id
          └── status → cac_buoc_quy_trinh.id

dich_vu_spa (Services)
  └── workflows[] → quy_trinh.id[]

quy_trinh (Workflows)
  └── stages[] → cac_buoc_quy_trinh[]
      └── todos[] → cac_task_quy_trinh[]
```

---

## ⚡ REAL-TIME UPDATES

Kanban board tự động cập nhật khi có thay đổi:

1. **Services changes** (dòng 113-134)
   - Channel: `kanban-services-changes`
   - Table: `dich_vu_spa`
   - Event: `*` (INSERT, UPDATE, DELETE)

2. **Workflows changes** (dòng 228-260)
   - Channel: `kanban-workflows-changes`
   - Table: `quy_trinh`
   - Event: `*` (INSERT, UPDATE, DELETE)

3. **Orders changes** (từ Context)
   - Context tự động sync với Supabase
   - Component nhận updates qua `useAppStore()`

---

## 🎯 TÓM TẮT LUỒNG DỮ LIỆU

```
┌─────────────────┐
│  Supabase DB    │
│                 │
│  - don_hang     │──┐
│  - quy_trinh    │  │
│  - cac_buoc...  │  │
│  - cac_task...  │  │
│  - dich_vu_spa  │  │
└─────────────────┘  │
                     │
                     ▼
┌─────────────────────────┐
│   App Context           │
│   (useAppStore)         │
│                         │
│   - orders[]            │
│   - updateOrder()       │
│   - updateOrderItem...  │
└─────────────────────────┘
                     │
                     ▼
┌─────────────────────────┐
│   KanbanBoard Component  │
│                         │
│   1. Load workflows     │──┐
│   2. Load services      │  │ Direct Supabase
│   3. Get orders        │  │ queries
│   4. Create items       │  │
│   5. Filter & display   │  │
└─────────────────────────┘  │
                             │
                             ▼
                    ┌────────────────┐
                    │  Supabase      │
                    │  (Direct)      │
                    └────────────────┘
```

---

## 📝 LƯU Ý QUAN TRỌNG

1. **Item Status phải là UUID của Stage**
   - `item.status` phải match với `cac_buoc_quy_trinh.id` (UUID)
   - Không dùng tên stage (string) làm status

2. **Workflow Matching**
   - Component có logic flexible matching để match workflow IDs
   - Nếu không match được, sẽ fallback về tất cả workflows

3. **Service → Workflow Mapping**
   - Mỗi service có `workflows[]` array chứa thứ tự các workflows
   - Khi item hoàn thành workflow, tự động chuyển sang workflow tiếp theo

4. **Real-time Sync**
   - Tất cả dữ liệu đều có real-time sync
   - Không cần refresh page để thấy updates

---

## 🛠️ CÁCH KIỂM TRA DỮ LIỆU

### Console Logs
Component có nhiều console.log để debug:
- `🔍 Selected Orders` (dòng 279)
- `📦 Available Services` (dòng 287)
- `📋 Available Workflows` (dòng 294)
- `🎯 Assigned Workflows` (dòng 486)
- `Kanban items` (dòng 640)

### Kiểm tra trong Browser DevTools
1. Mở Console tab
2. Filter: `Kanban` hoặc `Workflow`
3. Xem logs khi component load và khi filter thay đổi

---

## ✅ CHECKLIST KHI SETUP

- [ ] Đảm bảo Supabase connection hoạt động
- [ ] Kiểm tra bảng `don_hang` có dữ liệu
- [ ] Kiểm tra bảng `quy_trinh` có workflows
- [ ] Kiểm tra bảng `cac_buoc_quy_trinh` có stages với UUID
- [ ] Kiểm tra bảng `dich_vu_spa` có services với workflows[]
- [ ] Kiểm tra `item.status` trong orders match với stage.id (UUID)
- [ ] Kiểm tra `item.serviceId` trong orders match với service.id
- [ ] Kiểm tra Real-time subscriptions hoạt động

---

**Tạo bởi:** Auto AI Assistant  
**Ngày:** 2024  
**File liên quan:** `components/KanbanBoard.tsx`, `context.tsx`, `supabase.ts`

