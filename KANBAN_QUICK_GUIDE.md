# 📋 HƯỚNG DẪN NHANH: CÁCH LẤY VÀ HIỂN THỊ THÔNG TIN KANBAN

## 🔄 QUY TRÌNH ĐƠN GIẢN

```
┌─────────────────────────────────────────────────────────────┐
│  BƯỚC 1: LẤY DỮ LIỆU                                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  📦 Orders           →  Từ Supabase (table: don_hang)       │
│  📋 Workflows        →  Từ Supabase (table: quy_trinh)      │
│  🛠️  Services        →  Từ Supabase (table: dich_vu)        │
│                                                              │
│  ⚠️  TẤT CẢ ĐỀU LẤY TRỰC TIẾP TỪ SUPABASE                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  BƯỚC 2: TẠO KANBAN ITEMS                                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  • Lấy items từ orders (chỉ dịch vụ, không sản phẩm)        │
│  • Xác định workflowId:                                      │
│    - Nếu item.workflowId có → dùng luôn                      │
│    - Nếu không → tìm từ service.workflows[0]                │
│  • Chuẩn hóa status:                                         │
│    - Nếu là UUID hợp lệ → giữ nguyên                         │
│    - Nếu là string (tên) → tìm match → đổi sang UUID        │
│    - Nếu không match → dùng UUID của stage đầu tiên          │
│  • Thêm thông tin: orderId, customerName, expectedDelivery   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  BƯỚC 3: TẠO COLUMNS                                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Chế độ "ALL":          Chế độ cụ thể:                      │
│  ┌──────────────┐       ┌──────────────┐                   │
│  │ Column =     │       │ Column =     │                   │
│  │ Workflow     │       │ Stage        │                   │
│  └──────────────┘       └──────────────┘                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  BƯỚC 4: LỌC ITEMS                                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  • Lọc theo selectedOrderIds                                │
│  • Lọc theo activeWorkflow                                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  BƯỚC 5: PHÂN BỔ VÀO COLUMNS                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Với mỗi column:                                            │
│  • Dùng checkStatusMatch(item, colId)                       │
│  • Nếu match → item thuộc column này                        │
│  • Sắp xếp: stage.order → expectedDelivery → lastUpdated   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  BƯỚC 6: RENDER CARD                                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Mỗi item → renderCard() hiển thị:                          │
│  • Ảnh + Tên dịch vụ + Khách hàng                           │
│  • Technical log (nếu có)                                    │
│  • Thông tin quy trình (tên, nhân sự)                        │
│  • Progress các stages (vàng/xanh/xám)                       │
│  • Stage hiện tại (highlight)                                │
│  • Ngày hẹn + Giá + Thời gian cập nhật                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 LUỒNG DỮ LIỆU CHI TIẾT

### 1️⃣ Orders → Items

```typescript
Order {
  id: "ORD001"
  customerName: "Nguyễn Văn A"
  items: [
    {
      id: "ITEM001",
      name: "Sửa chữa giày",
      serviceId: "SRV001",        // ← Dùng để tìm workflow
      workflowId: "WF001",        // ← Nếu có, dùng luôn
      status: "uuid-stage-1",     // ← UUID của stage hiện tại
      history: [...],
      price: 500000
    }
  ]
}
```

### 2️⃣ Service → Workflow Mapping

```typescript
Service {
  id: "SRV001",
  name: "Sửa chữa",
  workflows: [
    { id: "WF001", order: 1 },   // ← Workflow đầu tiên
    { id: "WF002", order: 2 }    // ← Workflow tiếp theo
  ]
}
```

### 3️⃣ Workflow → Stages

```typescript
Workflow {
  id: "WF001",
  label: "Quy trình sửa chữa",
  stages: [
    { id: "uuid-1", name: "Tiếp nhận", order: 1 },
    { id: "uuid-2", name: "Kiểm tra", order: 2 },
    { id: "uuid-3", name: "Sửa chữa", order: 3 },
    { id: "uuid-4", name: "Hoàn thành", order: 4 }
  ]
}
```

### 4️⃣ Status Matching

```typescript
// Item có status = "uuid-2"
// Column có id = "uuid-2"
checkStatusMatch(item, "uuid-2") → ✅ TRUE

// Item thuộc workflow "WF001", đang ở stage "uuid-2"
// Column là stage "uuid-2" của workflow "WF001"
// → Item sẽ hiển thị trong column này
```

---

## 🎯 CÁC TRƯỜNG HỢP XỬ LÝ ĐẶC BIỆT

### Case 1: Item chưa có workflowId

```typescript
item.workflowId = undefined
item.serviceId = "SRV001"

→ Tìm service "SRV001"
→ Lấy service.workflows[0].id
→ Gán vào item.workflowId
```

### Case 2: Status là tên (string) thay vì UUID

```typescript
item.status = "Kiểm tra"  // ← Tên stage (cũ)
workflow.stages = [
  { id: "uuid-2", name: "Kiểm tra" }
]

→ Tìm stage có name = "Kiểm tra"
→ Đổi item.status = "uuid-2"
```

### Case 3: Status không match bất kỳ stage nào

```typescript
item.status = "invalid-status"
workflow.stages = [
  { id: "uuid-1", name: "Tiếp nhận", order: 1 }
]

→ Lấy stage đầu tiên (order = 1)
→ Đổi item.status = "uuid-1"
```

### Case 4: Item thuộc workflow khác với column

```typescript
item.workflowId = "WF001"
column.id = "WF002"  // ← Workflow khác

→ checkStatusMatch() → FALSE
→ Item KHÔNG hiển thị trong column này
```

---

## 🔍 CHECKLIST KIỂM TRA

Khi gặp vấn đề, kiểm tra:

- [ ] Orders đã được load chưa? (`orders.length > 0`)
- [ ] Workflows đã được load chưa? (`workflows.length > 0`)
- [ ] Services đã được load chưa? (`services.length > 0`)
- [ ] Item có `serviceId` hoặc `workflowId` không?
- [ ] `item.status` có phải UUID hợp lệ không?
- [ ] UUID đó có tồn tại trong `workflow.stages` không?
- [ ] Column `id` có match với `item.status` không?
- [ ] Item có thuộc `selectedOrderIds` không?
- [ ] Item có thuộc `activeWorkflow` không?

---

## 📝 CODE SNIPPETS QUAN TRỌNG

### Lấy items từ orders

```typescript
const items = orders.flatMap(order => 
  order.items
    .filter(item => !item.isProduct)
    .map(item => ({
      ...item,
      orderId: order.id,
      customerName: order.customerName,
      workflowId: item.workflowId || findWorkflowFromService(item.serviceId)
    }))
);
```

### Tìm workflow từ service

```typescript
const findWorkflowFromService = (serviceId: string) => {
  const service = services.find(s => s.id === serviceId);
  return service?.workflows?.[0]?.id;
};
```

### Kiểm tra item có thuộc column

```typescript
const checkStatusMatch = (item: KanbanItem, colId: string) => {
  if (activeWorkflow === 'ALL') {
    return item.workflowId === colId;  // Column = Workflow
  }
  return item.status === colId;        // Column = Stage
};
```

### Render items trong column

```typescript
const colItems = filteredItems
  .filter(item => checkStatusMatch(item, col.id))
  .sort((a, b) => {
    // Sort logic
  });

return colItems.map(item => renderCard(item));
```

---

## 🚀 THỰC HÀNH

**Xem logs trong Console:**
1. Mở Browser DevTools (F12)
2. Tab Console
3. Filter: `Kanban` hoặc `Workflow`
4. Xem các log:
   - `🔍 Computing items`
   - `📦 Kanban items created`
   - `🎴 Rendering card`

**Kiểm tra dữ liệu:**
```typescript
// Thêm vào renderCard()
console.log('Item data:', {
  id: item.id,
  status: item.status,
  workflowId: item.workflowId,
  stages: wf?.stages?.map(s => ({ id: s.id, name: s.name }))
});
```

---

**Tài liệu đầy đủ:** Xem `KANBAN_DATA_FLOW.md`

