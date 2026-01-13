# 🔍 HƯỚNG DẪN DEBUG: KANBAN KHÔNG HIỂN THỊ CÔNG VIỆC

## 📋 NGUYÊN NHÂN CÓ THỂ

### 1. ❌ **Orders chưa được load**
**Triệu chứng:**
- Màn hình hiển thị "Chưa có đơn hàng nào trong hệ thống"
- `safeOrders.length === 0`

**Kiểm tra:**
```javascript
// Mở Console (F12) và xem logs:
🔄 Starting to load orders from Supabase...
✅ Orders loaded from Supabase: { count: X }
```

**Nguyên nhân:**
- Supabase connection lỗi
- Table `don_hang` không có dữ liệu
- RLS (Row Level Security) chặn truy cập

**Giải pháp:**
1. Kiểm tra kết nối Supabase
2. Kiểm tra có dữ liệu trong table `don_hang`
3. Kiểm tra RLS policies

---

### 2. ❌ **Items không được tạo**
**Triệu chứng:**
- Có orders nhưng không có items
- `items.length === 0` nhưng `safeOrders.length > 0`

**Kiểm tra Console:**
```javascript
📦 Kanban items created: {
  totalOrders: X,
  totalItems: Y,  // ← Nếu = 0 là vấn đề
  itemsWithoutWorkflow: Z,
  itemsWithServiceId: W
}
```

**Nguyên nhân:**
- Orders không có items (hoặc chỉ có sản phẩm `isProduct = true`)
- Items chưa được tạo trong database
- Items bị filter ra (không phải dịch vụ)

**Giải pháp:**
1. Kiểm tra table `hang_muc_dich_vu` có dữ liệu không
2. Kiểm tra items có `la_san_pham = false` (chỉ hiển thị dịch vụ, không hiển thị sản phẩm)
3. Kiểm tra `id_don_hang` của items có match với `id` của orders không

---

### 3. ❌ **Items không có workflowId**
**Triệu chứng:**
- Items có nhưng không hiển thị trong columns
- Console log: `⚠️ No workflowId for item`

**Kiểm tra:**
```javascript
📦 Kanban items created: {
  items: [
    {
      id: "...",
      workflowId: "???" // ← Nếu undefined/null là vấn đề
    }
  ],
  itemsWithoutWorkflow: X  // ← Số lượng items không có workflowId
}
```

**Nguyên nhân:**
- Items không có `id_dich_vu_goc` (serviceId)
- Service không có `workflows` config
- Items không có `id_quy_trinh` (workflowId)

**Giải pháp:**
1. Kiểm tra items có `id_dich_vu_goc` không
2. Kiểm tra services có `workflows` array không
3. Thêm `workflowId` trực tiếp vào items nếu cần

---

### 4. ❌ **Workflows chưa được load**
**Triệu chứng:**
- Columns không hiển thị
- Console log: `⚠️ Workflows not loaded yet`

**Kiểm tra:**
```javascript
✅ Mapped workflows list: {
  workflowsCount: X,  // ← Nếu = 0 là vấn đề
  workflowsWithStages: Y
}
```

**Nguyên nhân:**
- Supabase connection lỗi
- Table `quy_trinh` không có dữ liệu
- Stages không được load (`cac_buoc_quy_trinh`)

**Giải pháp:**
1. Kiểm tra table `quy_trinh` có dữ liệu
2. Kiểm tra table `cac_buoc_quy_trinh` có stages
3. Kiểm tra `id_quy_trinh` trong stages có match với `id` của workflows

---

### 5. ❌ **Selected Orders rỗng**
**Triệu chứng:**
- Columns rỗng trong ALL mode
- Console log: `selectedOrderIds.size === 0`

**Kiểm tra:**
```javascript
🔍 Kanban Debug Info: {
  selectedOrderIds: [...],  // ← Nếu [] là vấn đề
  totalOrders: X
}
```

**Nguyên nhân:**
- Auto-select chưa chạy
- User bỏ chọn tất cả orders

**Giải pháp:**
1. Component tự động select tất cả orders khi load
2. Nếu vẫn rỗng, kiểm tra logic trong `useEffect` auto-select
3. User có thể chọn lại orders từ dropdown

---

### 6. ❌ **Columns không được tạo (ALL mode)**
**Triệu chứng:**
- Matrix view không có columns (chỉ có cột "THÔNG TIN")
- Console log: `columns.length === 0`

**Kiểm tra:**
```javascript
🔍 Matrix View Debug: {
  columnsCount: X,  // ← Nếu = 0 là vấn đề
  columns: [...]
}
```

**Nguyên nhân:**
- Không tìm thấy workflows từ services của items
- Workflow IDs không match
- Selected orders rỗng

**Giải pháp:**
1. Kiểm tra items có `serviceId` không
2. Kiểm tra services có `workflows` config không
3. Kiểm tra workflow IDs có match không (case-sensitive)

---

### 7. ❌ **Items không match với Columns (checkStatusMatch)**
**Triệu chứng:**
- Columns có nhưng không có items trong đó
- Console log: `⚠️ Item should match but checkStatusMatch returned false`

**Kiểm tra:**
```javascript
🔍 Matrix View Debug: {
  filteredItems: [
    {
      workflowId: "xxx",  // ← Item workflowId
      ...
    }
  ],
  columns: [
    {
      id: "yyy",  // ← Column id (workflowId)
      ...
    }
  ]
}
```

**Nguyên nhân:**
- `item.workflowId !== col.id` (trong ALL mode)
- Workflow IDs không match (case-sensitive hoặc type khác)

**Giải pháp:**
1. So sánh `item.workflowId` với `col.id`
2. Đảm bảo cả hai đều là string và match chính xác
3. Kiểm tra có trailing spaces hoặc case khác nhau không

---

## 🔧 CÁCH KIỂM TRA NHANH

### Bước 1: Mở Console (F12)
```javascript
// Filter logs: "Kanban" hoặc "Debug"
```

### Bước 2: Kiểm tra thứ tự logs
1. ✅ `🔄 Starting to load orders from Supabase...`
2. ✅ `✅ Orders loaded from Supabase: { count: X }`
3. ✅ `🔄 Starting to load workflows...`
4. ✅ `✅ Mapped workflows list: { workflowsCount: X }`
5. ✅ `📦 Kanban items created: { totalItems: X }`
6. ✅ `🔍 Kanban Debug Info: { ... }`

### Bước 3: Kiểm tra từng phần

**Orders:**
```javascript
// Console log:
safeOrders.length  // Phải > 0
```

**Items:**
```javascript
// Console log:
items.length  // Phải > 0
items.filter(i => !i.isProduct).length  // Items dịch vụ
```

**Workflows:**
```javascript
// Console log:
workflows.length  // Phải > 0
workflows.filter(w => w.stages && w.stages.length > 0).length  // Workflows có stages
```

**Columns:**
```javascript
// Console log trong Matrix View:
columns.length  // Phải > 0
columns.map(c => c.id)  // Danh sách workflow IDs
```

**Filtered Items:**
```javascript
// Console log:
filteredItems.length  // Phải > 0 nếu có items
filteredItems.map(i => ({ workflowId: i.workflowId, serviceId: i.serviceId }))
```

---

## 🐛 DEBUG CODE ĐÃ ĐƯỢC THÊM

### 1. Debug trong Matrix View
```typescript
// File: components/KanbanBoard.tsx - Dòng 2315
console.log('🔍 Matrix View Debug:', {
  activeWorkflow,
  columnsCount: columns.length,
  columns: columns.map(c => ({ id: c.id, title: c.title })),
  filteredItemsCount: filteredItems.length,
  itemsCount: items.length,
  selectedOrderIdsCount: selectedOrderIds.size,
  filteredItems: filteredItems.slice(0, 3).map(i => ({
    id: i.id,
    name: i.name,
    workflowId: i.workflowId,
    serviceId: i.serviceId,
    status: i.status
  }))
});
```

### 2. Debug Order Groups
```typescript
console.log('📦 Order Groups:', {
  groupsCount: Object.keys(orderGroups).length,
  groups: Object.entries(orderGroups).map(([orderId, items]) => ({
    orderId,
    itemsCount: items.length,
    items: items.map(i => ({
      id: i.id,
      name: i.name,
      workflowId: i.workflowId,
      serviceId: i.serviceId
    }))
  }))
});
```

### 3. Enhanced Empty State
Empty state bây giờ hiển thị:
- Tổng đơn hàng
- Tổng items
- Items sau filter
- Columns count
- Selected orders count
- Active workflow
- Workflows/Services loaded
- Sample items với thông tin chi tiết

---

## ✅ CHECKLIST KIỂM TRA

- [ ] Orders được load (`safeOrders.length > 0`)
- [ ] Items được tạo (`items.length > 0`)
- [ ] Items có workflowId (`items.every(i => i.workflowId)`)
- [ ] Workflows được load (`workflows.length > 0`)
- [ ] Workflows có stages (`workflows.every(w => w.stages && w.stages.length > 0)`)
- [ ] Services được load (`services.length > 0`)
- [ ] Selected orders không rỗng (`selectedOrderIds.size > 0`)
- [ ] Columns được tạo (`columns.length > 0`)
- [ ] Filtered items không rỗng (`filteredItems.length > 0`)
- [ ] Items match với columns (kiểm tra `checkStatusMatch`)

---

## 📞 VẤN ĐỀ THƯỜNG GẶP

### Q: Tại sao items không hiển thị trong columns?
**A:** Kiểm tra:
1. Items có `workflowId` không
2. `workflowId` có match với `col.id` không
3. `checkStatusMatch` có trả về `true` không

### Q: Tại sao columns rỗng?
**A:** Kiểm tra:
1. Selected orders có rỗng không
2. Items có `serviceId` không
3. Services có `workflows` config không
4. Workflow IDs có match không

### Q: Tại sao filteredItems rỗng?
**A:** Kiểm tra:
1. `items.length > 0` không
2. `selectedOrderIds.size > 0` không
3. `activeWorkflow` filter có đúng không

---

**File liên quan:**
- `components/KanbanBoard.tsx` - Component chính
- Console logs trong browser DevTools (F12)

