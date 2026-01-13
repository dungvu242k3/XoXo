# 📊 CÁCH LẤY VÀ HIỂN THỊ THÔNG TIN TRONG BẢNG KANBAN

## 🔄 TỔNG QUAN QUY TRÌNH

Bảng Kanban lấy dữ liệu từ **3 nguồn chính** - **TẤT CẢ ĐỀU TỪ SUPABASE TRỰC TIẾP**:
1. **Đơn hàng (Orders)** - từ Supabase trực tiếp
2. **Quy trình (Workflows)** - từ Supabase trực tiếp
3. **Dịch vụ (Services)** - từ Supabase trực tiếp

---

## 📥 BƯỚC 1: LẤY DỮ LIỆU (Data Fetching)

### 1.1. Đơn hàng (Orders)
**Nguồn:** Supabase trực tiếp (table `don_hang` và `hang_muc_dich_vu`)

```typescript
// File: components/KanbanBoard.tsx - Dòng 135-280
const [orders, setOrders] = useState<Order[]>([]);

// Load Orders từ Supabase
useEffect(() => {
  const loadOrders = async () => {
    // Load orders từ table don_hang
    const ordersResult = await supabase
      .from(DB_PATHS.ORDERS)
      .select('id, id_khach_hang, ten_khach_hang, ...')
      .limit(100);
    
    // Load items từ table hang_muc_dich_vu
    const itemsResult = await supabase
      .from(DB_PATHS.SERVICE_ITEMS)
      .select('id, id_don_hang, ten_hang_muc, ...')
      .limit(500);
    
    // Group items by order_id và map sang Order[]
    setOrders(ordersList);
  };
  
  loadOrders();
  
  // Real-time sync
  const channel = supabase
    .channel('kanban-orders-changes')
    .on('postgres_changes', { table: DB_PATHS.ORDERS }, ...)
    .on('postgres_changes', { table: DB_PATHS.SERVICE_ITEMS }, ...)
    .subscribe();
}, []);
```

**Cách hoạt động:**
- Component tự load trực tiếp từ Supabase table `don_hang` và `hang_muc_dich_vu`
- Có real-time sync qua Supabase Realtime subscriptions (2 channels: orders và service_items)
- Tự xử lý mapping từ tiếng Việt sang tiếng Anh

**Cấu trúc dữ liệu:**
```typescript
interface Order {
  id: string;                    // Mã đơn hàng
  customerName: string;          // Tên khách hàng
  expectedDelivery: string;      // Ngày giao dự kiến
  items: ServiceItem[];          // Danh sách dịch vụ/sản phẩm
}

interface ServiceItem {
  id: string;
  name: string;
  type: ServiceType;
  status: string;                // UUID của stage hiện tại
  serviceId?: string;            // ID dịch vụ (để tìm workflow)
  workflowId?: string;           // ID quy trình đang thực hiện
  history?: HistoryEntry[];      // Lịch sử chuyển đổi trạng thái
  beforeImage?: string;
  price: number;
  lastUpdated?: number;
}
```

---

### 1.2. Quy trình (Workflows) 
**Nguồn:** Supabase trực tiếp

```typescript
// File: components/KanbanBoard.tsx - Dòng 208-415

// Load workflows
const { data: workflowsData } = await supabase
  .from(DB_PATHS.WORKFLOWS)
  .select('id, ten_quy_trinh, mo_ta, phong_ban_phu_trach, loai_ap_dung, ...')
  .limit(100);

// Load stages (các bước trong quy trình)
const { data: stagesData } = await supabase
  .from(DB_PATHS.WORKFLOW_STAGES)
  .select('id, id_quy_trinh, ten_buoc, thu_tu, chi_tiet, ...')
  .order('thu_tu', { ascending: true });

// Load tasks (công việc trong từng stage)
const { data: tasksData } = await supabase
  .from(DB_PATHS.WORKFLOW_TASKS)
  .select('*')
  .in('id_buoc_quy_trinh', stageIds)
  .order('thu_tu', { ascending: true });
```

**Quy trình xử lý:**
1. Load workflows từ table `quy_trinh`
2. Load stages từ table `cac_buoc_quy_trinh` (group theo `id_quy_trinh`)
3. Load tasks từ table `cong_viec_quy_trinh` (group theo `id_buoc_quy_trinh`)
4. Kết hợp workflows + stages + tasks thành `WorkflowDefinition[]`
5. Real-time sync qua channel `kanban-workflows-changes`

**Cấu trúc sau khi xử lý:**
```typescript
interface WorkflowDefinition {
  id: string;                    // UUID của workflow
  label: string;                 // Tên quy trình
  description?: string;
  department?: string;
  types: ServiceType[];          // Loại dịch vụ áp dụng
  stages?: WorkflowStage[];      // Các bước trong quy trình
  assignedMembers?: string[];    // Nhân viên phụ trách
}

interface WorkflowStage {
  id: string;                    // UUID của stage (QUAN TRỌNG!)
  name: string;                  // Tên bước
  order: number;                 // Thứ tự
  details?: string;
  todos?: Task[];                // Danh sách công việc
  assignedMembers?: string[];    // Nhân viên phụ trách bước này
}
```

---

### 1.3. Dịch vụ (Services)
**Nguồn:** Supabase trực tiếp

```typescript
// File: components/KanbanBoard.tsx - Dòng 163-205

const { data } = await supabase
  .from(DB_PATHS.SERVICES)
  .select('*');

// Real-time sync
const channel = supabase
  .channel('kanban-services-changes')
  .on('postgres_changes', { table: DB_PATHS.SERVICES }, async () => {
    // Reload services khi có thay đổi
  });
```

**Mục đích:**
- Tìm workflow sequence cho mỗi service
- Map `serviceId` → `workflowId` khi item chưa có workflowId

**Cấu trúc:**
```typescript
interface ServiceCatalogItem {
  id: string;
  name: string;
  workflows?: Array<{
    id: string;                  // Workflow ID
    order: number;               // Thứ tự trong sequence
  }>;
}
```

---

## 🔄 BƯỚC 2: XỬ LÝ VÀ TẠO KANBAN ITEMS

### 2.1. Tạo Kanban Items từ Orders

```typescript
// File: components/KanbanBoard.tsx - Dòng 724-915

const items: KanbanItem[] = useMemo(() => {
  // Lấy tất cả items từ orders
  const allItems = (orders || []).flatMap(order => {
    if (!order.items || !Array.isArray(order.items)) return [];
    
    return order.items
      .filter(item => item && !item.isProduct)  // Chỉ lấy dịch vụ, không lấy sản phẩm
      .map(item => {
        // Xác định workflowId
        let workflowId = item.workflowId;
        
        // Nếu chưa có workflowId, tìm từ service
        if (!workflowId && item.serviceId) {
          const service = services.find(s => s.id === item.serviceId);
          if (service?.workflows?.length > 0) {
            // Lấy workflow đầu tiên trong sequence
            workflowId = service.workflows[0].id;
          }
        }
        
        // Chuẩn hóa status thành UUID của stage
        const normalizedStatus = normalizeStatusToStageUUID(item, workflowId);
        
        // Tạo KanbanItem
        return {
          ...item,
          orderId: order.id,
          customerName: order.customerName,
          expectedDelivery: order.expectedDelivery,
          workflowId: workflowId,
          status: normalizedStatus  // UUID của stage
        };
      });
  });
  
  return allItems;
}, [orders, workflows, services]);
```

**Các bước xử lý:**
1. **Lọc items:** Chỉ lấy dịch vụ (loại bỏ `isProduct = true`)
2. **Xác định workflowId:** 
   - Nếu item đã có `workflowId` → dùng luôn
   - Nếu chưa có → tìm từ `service.workflows[0]`
3. **Chuẩn hóa status:**
   - Nếu `status` là UUID và tồn tại trong workflow → giữ nguyên
   - Nếu không → đổi thành UUID của stage đầu tiên trong workflow
4. **Thêm thông tin order:** `orderId`, `customerName`, `expectedDelivery`

---

### 2.2. Chuẩn hóa Status (normalizeStatusToStageUUID)

```typescript
// File: components/KanbanBoard.tsx - Dòng 740-833

const normalizeStatusToStageUUID = (item: any, wfId: string | undefined): string => {
  const currentStatus = item.status || 'cho_xu_ly';
  
  // Nếu không có workflowId → trả về status gốc
  if (!wfId) return currentStatus;
  
  // Tìm workflow
  const wf = workflows.find(w => w.id === wfId);
  if (!wf) return currentStatus;
  
  // Nếu status đã là UUID và tồn tại trong stages → OK
  if (isUUID(currentStatus)) {
    const stageExists = wf.stages?.some(s => s.id === currentStatus);
    if (stageExists) return currentStatus;
  }
  
  // Nếu status là tên (string) → tìm match theo tên
  const matchingStage = wf.stages?.find(s => 
    s.name.toLowerCase() === currentStatus.toLowerCase()
  );
  if (matchingStage) return matchingStage.id;
  
  // Nếu không match → lấy stage đầu tiên
  const firstStage = wf.stages?.sort((a, b) => a.order - b.order)[0];
  return firstStage?.id || currentStatus;
};
```

---

## 🎨 BƯỚC 3: TẠO COLUMNS (CỘT KANBAN)

### 3.1. Chế độ "Tất cả quy trình" (ALL)

```typescript
// File: components/KanbanBoard.tsx - Dòng 925-1050

if (activeWorkflow === 'ALL') {
  // Mỗi column = 1 workflow
  // Lấy tất cả workflows từ items trong selected orders
  
  const workflowIds = new Set<string>();
  
  selectedOrders.forEach(order => {
    order.items.forEach(item => {
      if (item.serviceId) {
        const service = services.find(s => s.id === item.serviceId);
        service?.workflows?.forEach(wf => {
          workflowIds.add(wf.id);
        });
      }
    });
  });
  
  // Tạo columns từ workflows
  columns = workflows
    .filter(wf => workflowIds.has(wf.id))
    .map(wf => ({
      id: wf.id,
      title: wf.label,
      color: 'bg-neutral-900',
      dot: 'bg-blue-500'
    }));
}
```

**Hiển thị:**
- Mỗi cột = 1 workflow
- Items thuộc workflow đó sẽ hiển thị trong cột tương ứng

---

### 3.2. Chế độ "Quy trình cụ thể"

```typescript
// File: components/KanbanBoard.tsx - Dòng 1050-1070

// Lấy workflow đã chọn
const selectedWf = workflows.find(w => w.id === activeWorkflow);

// Tạo columns từ stages của workflow
columns = selectedWf?.stages
  ?.sort((a, b) => a.order - b.order)
  .map(stage => ({
    id: stage.id,              // UUID của stage
    title: stage.name,         // Tên stage
    color: getStageColor(stage),
    dot: getStageDot(stage)
  })) || [];

// Thêm cột đặc biệt
columns.push(
  { id: 'done', title: 'Hoàn thành', ... },
  { id: 'cancel', title: 'Đã hủy', ... }
);
```

**Hiển thị:**
- Mỗi cột = 1 stage trong workflow
- Items có `status` = UUID của stage sẽ hiển thị trong cột đó

---

## 🎯 BƯỚC 4: LỌC VÀ HIỂN THỊ ITEMS

### 4.1. Lọc Items theo bộ lọc

```typescript
// File: components/KanbanBoard.tsx - Dòng 1420-1450

const filteredItems = useMemo(() => {
  let filtered = items;
  
  // Lọc theo selected orders
  if (selectedOrderIds.size > 0) {
    filtered = filtered.filter(item => 
      selectedOrderIds.has(item.orderId)
    );
  }
  
  // Lọc theo active workflow
  if (activeWorkflow !== 'ALL') {
    filtered = filtered.filter(item => 
      item.workflowId === activeWorkflow
    );
  }
  
  return filtered;
}, [items, selectedOrderIds, activeWorkflow]);
```

---

### 4.2. Kiểm tra Item có thuộc Column không (checkStatusMatch)

```typescript
// File: components/KanbanBoard.tsx - Dòng 1470-1519

const checkStatusMatch = (item: KanbanItem, colId: string) => {
  // Chế độ ALL: column = workflow
  if (activeWorkflow === 'ALL') {
    return item.workflowId === colId;
  }
  
  // Chế độ cụ thể: column = stage
  // So sánh item.status với colId (UUID)
  if (item.status === colId) return true;
  
  // So sánh không phân biệt hoa thường
  if (item.status.toLowerCase() === colId.toLowerCase()) return true;
  
  // Tìm stage theo UUID
  const stage = workflows
    .flatMap(wf => wf.stages || [])
    .find(s => s.id === colId);
    
  if (stage) {
    // So sánh theo tên hoặc ID
    return item.status === stage.name || item.status === stage.id;
  }
  
  return false;
};
```

---

## 🎨 BƯỚC 5: RENDER CARD (HIỂN THỊ CHI TIẾT)

### 5.1. Cấu trúc Card

```typescript
// File: components/KanbanBoard.tsx - Dòng 1521-1850

const renderCard = (item: KanbanItem) => {
  // 1. Tìm workflow từ item.workflowId
  let wf = workflows.find(w => w.id === item.workflowId);
  
  // 2. Tìm stage hiện tại
  const currentStage = wf?.stages?.find(s => s.id === item.status);
  
  // 3. Lấy tất cả stages (đã sort)
  const allStages = wf?.stages?.sort((a, b) => a.order - b.order) || [];
  
  return (
    <div className="card">
      {/* Header: Ảnh + Tên + Khách hàng */}
      <div>
        <img src={item.beforeImage} />
        <h4>{item.name}</h4>
        <span>{item.customerName}</span>
      </div>
      
      {/* Technical Log Alert */}
      {item.technicalLog?.length > 0 && (
        <div>⚠️ {item.technicalLog[latest].content}</div>
      )}
      
      {/* Workflow Info */}
      {wf && (
        <div>
          <div>📋 Quy trình: {wf.label}</div>
          <div>👥 Nhân sự: {wf.assignedMembers}</div>
        </div>
      )}
      
      {/* Stages Progress */}
      <div>
        {allStages.map(stage => {
          const isCompleted = item.history?.some(h => h.stageId === stage.id);
          const isCurrent = stage.id === item.status;
          
          return (
            <div className={isCurrent ? 'current' : isCompleted ? 'completed' : 'upcoming'}>
              #{stage.order} {stage.name}
            </div>
          );
        })}
      </div>
      
      {/* Current Stage Highlight */}
      {currentStage && (
        <div className="current-stage">
          🟡 Đang làm: {currentStage.name}
        </div>
      )}
      
      {/* Footer: Ngày hẹn + Giá */}
      <div>
        <span>📅 {formatDate(item.expectedDelivery)}</span>
        <span>💰 {item.price.toLocaleString('vi-VN')} ₫</span>
      </div>
    </div>
  );
};
```

---

### 5.2. Thông tin hiển thị trên Card

1. **Header Section:**
   - Ảnh `beforeImage` (80x80px)
   - Tên dịch vụ (`item.name`)
   - Tên khách hàng (`item.customerName`)

2. **Technical Log:**
   - Hiển thị log kỹ thuật mới nhất nếu có
   - Format: `{author} - {timestamp}: {content}`

3. **Workflow Info:**
   - Tên quy trình (`wf.label`)
   - Nhân sự phụ trách (`wf.assignedMembers`)

4. **Stages Progress:**
   - Hiển thị tất cả stages trong workflow
   - Màu sắc:
     - 🟡 Vàng: Stage hiện tại (`item.status === stage.id`)
     - 🟢 Xanh: Stage đã hoàn thành (có trong `item.history`)
     - ⚪ Xám: Stage chưa đến
   - Thứ tự: Theo `stage.order`

5. **Current Stage:**
   - Highlight stage đang làm
   - Hiển thị nhân sự phụ trách stage

6. **Footer:**
   - Ngày giao dự kiến (`expectedDelivery`)
   - Giá dịch vụ (`price`)
   - Thời gian cập nhật cuối (`lastUpdated`)

---

## 🔄 BƯỚC 6: HIỂN THỊ TRONG COLUMNS

### 6.1. Chế độ Standard Kanban View

```typescript
// File: components/KanbanBoard.tsx - Dòng 2151-2225

{columns.map(col => {
  // Lọc items thuộc column này
  const colItems = filteredItems
    .filter(i => checkStatusMatch(i, col.id))
    .sort((a, b) => {
      // Sort theo stage order
      // Sort theo expected delivery
      // Sort theo lastUpdated
    });
  
  return (
    <div className="column">
      <div className="header">
        <span>{col.title}</span>
        <span>{colItems.length}</span>
      </div>
      <div className="body">
        {colItems.map(item => renderCard(item))}
      </div>
    </div>
  );
})}
```

---

### 6.2. Chế độ Matrix View (ALL workflows)

```typescript
// File: components/KanbanBoard.tsx - Dòng 2077-2149

// Group items theo OrderID
const orderGroups: Record<string, KanbanItem[]> = {};
filteredItems.forEach(item => {
  if (!orderGroups[item.orderId]) orderGroups[item.orderId] = [];
  orderGroups[item.orderId].push(item);
});

// Hiển thị dạng bảng
return Object.entries(orderGroups).map(([orderId, orderItems]) => (
  <div className="row">
    {/* Mỗi column = 1 workflow */}
    {columns.map(col => {
      const itemsInWorkflow = orderItems.filter(item => 
        item.workflowId === col.id
      );
      return (
        <div className="cell">
          {itemsInWorkflow.map(item => renderCard(item))}
        </div>
      );
    })}
    
    {/* Cột thông tin đơn hàng */}
    <div className="order-info">
      <p>{orderItems[0].customerName}</p>
      <p>Ngày hẹn: {formatDate(orderItems[0].expectedDelivery)}</p>
      <p>Tổng: {orderItems.length} mục</p>
    </div>
  </div>
));
```

---

## 🔄 REAL-TIME UPDATES

### Cập nhật tự động khi có thay đổi

1. **Orders:** Tự động sync qua Context Store (Supabase Realtime)
2. **Workflows:** Sync qua channel `kanban-workflows-changes`
3. **Services:** Sync qua channel `kanban-services-changes`

```typescript
// Khi có thay đổi → component tự động re-render
// useMemo và useEffect sẽ tự động tính toán lại items, columns, filteredItems
```

---

## 📝 TÓM TẮT QUY TRÌNH

```
1. Load Data
   ├── Orders (từ Context)
   ├── Workflows (từ Supabase)
   └── Services (từ Supabase)

2. Tạo Kanban Items
   ├── Lấy items từ orders
   ├── Xác định workflowId cho mỗi item
   └── Chuẩn hóa status thành UUID

3. Tạo Columns
   ├── Nếu ALL: columns = workflows
   └── Nếu cụ thể: columns = stages

4. Lọc Items
   ├── Theo selected orders
   └── Theo active workflow

5. Render
   ├── checkStatusMatch để phân bổ items vào columns
   ├── renderCard để hiển thị chi tiết
   └── Sắp xếp theo order, date, lastUpdated
```

---

## 🔍 DEBUG & LOGGING

Component có nhiều console.log để debug:
- `🔍 Computing items` - Khi tạo items
- `📦 Kanban items created` - Sau khi tạo xong
- `🎴 Rendering card` - Khi render từng card
- `🔍 Drag Debug` - Khi drag & drop
- `✅ Workflow có stages` - Khi tìm thấy workflow

Mở **Browser DevTools → Console** để xem logs.

---

## 📌 LƯU Ý QUAN TRỌNG

1. **Status phải là UUID:** `item.status` phải là UUID của stage, không phải tên
2. **Workflow matching:** Component tự động match workflow từ service nếu item chưa có
3. **Status normalization:** Tự động chuẩn hóa status cũ (string) thành UUID mới
4. **Real-time:** Tất cả dữ liệu đều có real-time sync, không cần refresh

---

**File liên quan:**
- `components/KanbanBoard.tsx` - Component chính
- `context.tsx` - Context Store cho Orders
- `supabase.ts` - Config Supabase

