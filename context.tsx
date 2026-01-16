import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { DB_TABLES, supabase } from './supabase';
import {
  Customer,
  InventoryItem,
  Member,
  Order,
  OrderStatus,
  Product,
  ServiceType,
  TechnicalLog,
  WorkflowDefinition,
  WorkflowStage
} from './types';

interface AppContextType {
  orders: Order[];
  inventory: InventoryItem[];
  members: Member[];
  products: Product[];
  customers: Customer[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  addOrder: (newOrder: Order) => void;
  updateOrder: (orderId: string, updatedOrder: Order) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  deleteOrderItem: (orderId: string, itemId: string) => Promise<void>;
  updateOrderItemStatus: (orderId: string, itemId: string, newStatus: string, user: string, note?: string) => void;
  updateInventory: (items: InventoryItem[]) => void;
  updateInventoryItem: (itemId: string, updatedItem: InventoryItem) => Promise<void>;
  deleteInventoryItem: (itemId: string) => Promise<void>;
  addInventoryItem: (newItem: InventoryItem) => Promise<void>;
  updateMember: (memberId: string, updatedMember: Member) => Promise<void>;
  deleteMember: (memberId: string) => Promise<void>;
  addMember: (newMember: Member) => Promise<void>;
  updateProduct: (productId: string, updatedProduct: Product) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  addProduct: (newProduct: Product) => Promise<void>;
  addTechnicianNote: (orderId: string, itemId: string, content: string, user: string) => void;
  addCustomer: (newCustomer: Customer) => Promise<void>;
  updateCustomer: (customerId: string, updatedCustomer: Customer) => Promise<void>;
  deleteCustomer: (customerId: string) => Promise<void>;
  isLoading: boolean;
  workflows: WorkflowDefinition[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Mapping functions for order status (must be defined before use)
  const mapOrderStatusDisplayToDb = (displayValue: OrderStatus | string): string => {
    const mapping: Record<string, string> = {
      'Pending': 'cho_xu_ly',
      'Confirmed': 'da_xac_nhan',
      'Processing': 'dang_xu_ly',
      'Done': 'hoan_thanh',
      'Delivered': 'da_giao',
      'Cancelled': 'huy'
    };
    return mapping[displayValue] || 'cho_xu_ly';
  };

  const mapOrderStatusDbToDisplay = (dbValue: string | null | undefined): OrderStatus => {
    if (!dbValue) return OrderStatus.PENDING;
    const mapping: Record<string, OrderStatus> = {
      'cho_xu_ly': OrderStatus.PENDING,
      'da_xac_nhan': OrderStatus.CONFIRMED,
      'dang_xu_ly': OrderStatus.PROCESSING,
      'hoan_thanh': OrderStatus.DONE,
      'da_giao': OrderStatus.DELIVERED,
      'huy': OrderStatus.CANCELLED
    };
    return mapping[dbValue] || OrderStatus.PENDING;
  };

  // Mapping function for service type (loai)
  const mapServiceTypeToDb = (serviceType: ServiceType | string): string => {
    const mapping: Record<string, string> = {
      'Repair': 'sua_chua',
      'Cleaning': 've_sinh',
      'Plating': 'xi_ma',
      'Dyeing': 'nhuom',
      'Custom': 'custom',
      'Product': 'san_pham'
    };
    return mapping[serviceType] || 'custom';
  };

  const mapServiceTypeFromDb = (dbValue: string | null | undefined): ServiceType => {
    if (!dbValue) return ServiceType.CUSTOM;
    const mapping: Record<string, ServiceType> = {
      'sua_chua': ServiceType.REPAIR,
      've_sinh': ServiceType.CLEANING,
      'xi_ma': ServiceType.PLATING,
      'nhuom': ServiceType.DYEING,
      'custom': ServiceType.CUSTOM,
      'san_pham': ServiceType.PRODUCT
    };
    return mapping[dbValue] || ServiceType.CUSTOM;
  };

  // Helper function to convert date string to ISO format for PostgreSQL
  const formatDateForDB = (dateString: string | null | undefined): string | null => {
    if (!dateString) return null;

    // If already in ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss), return as is
    if (/^\d{4}-\d{2}-\d{2}/.test(dateString)) {
      return dateString;
    }

    // Try to parse various date formats
    try {
      // Handle DD/MM/YYYY or D/M/YYYY format
      const parts = dateString.split('/');
      if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        // Return ISO format: YYYY-MM-DD
        return `${year}-${month}-${day}`;
      }

      // Try to parse with Date object and convert to ISO
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0]; // Return YYYY-MM-DD
      }
    } catch (error) {
      console.warn('Error parsing date:', dateString, error);
    }

    return null;
  };

  // Helper function để chuyển đổi từ tiếng Việt sang tiếng Anh
  const mapVietnameseOrderToEnglish = (vnOrder: any): Order => {
    return {
      id: vnOrder.ma_don_hang || vnOrder.id,
      customerId: vnOrder.id_khach_hang || vnOrder.ma_khach_hang || vnOrder.customerId || '',
      customerName: vnOrder.ten_khach_hang || vnOrder.customerName || '',
      items: (vnOrder.danh_sach_dich_vu || vnOrder.items || []).map((item: any) => ({
        id: item.ma_item || item.id,
        name: item.ten_hang_muc || item.ten || item.name,
        type: mapServiceTypeFromDb(item.loai || item.loai_dich_vu || item.type),
        price: Number(item.don_gia || item.gia || item.price || 0),
        quantity: item.so_luong || item.quantity || 1,
        status: item.trang_thai || item.status,
        technicianId: item.id_ky_thuat_vien || item.technicianId,
        beforeImage: item.anh_truoc || item.beforeImage,
        afterImage: item.anh_sau || item.afterImage,
        isProduct: item.la_san_pham || item.isProduct || false,
        serviceId: item.id_dich_vu_goc || item.serviceId,
        workflowId: item.id_quy_trinh || item.workflowId,
        history: item.lich_su_thuc_hien || item.history,
        lastUpdated: item.cap_nhat_cuoi || item.lastUpdated,
        technicalLog: item.nhat_ky_ky_thuat || item.technicalLog,
        notes: item.ghi_chu || item.notes || undefined,
        assignedMembers: item.nhan_vien_phu_trach || item.assignedMembers || undefined,
        commissions: item.hoa_hong || item.commissions || undefined,
        stageAssignments: item.gan_nhan_vien_theo_buoc || item.stageAssignments || undefined
      })),
      totalAmount: vnOrder.tong_tien || vnOrder.totalAmount || 0,
      deposit: vnOrder.tien_coc || vnOrder.dat_coc || vnOrder.deposit || 0,
      status: mapOrderStatusDbToDisplay(vnOrder.trang_thai || vnOrder.status),
      createdAt: vnOrder.ngay_tao || vnOrder.createdAt || new Date().toLocaleDateString('vi-VN'),
      expectedDelivery: vnOrder.ngay_du_kien_giao || vnOrder.ngay_giao_du_kien || vnOrder.expectedDelivery || '',
      notes: vnOrder.ghi_chu || vnOrder.notes,
      discount: vnOrder.giam_gia || vnOrder.discount || 0,
      discountType: vnOrder.loai_giam_gia || 'money',
      additionalFees: vnOrder.phi_phat_sinh || vnOrder.additionalFees || 0,
      surchargeReason: vnOrder.ly_do_phu_phi || ''
    };
  };

  const mapVietnameseInventoryToEnglish = (vnItem: any): InventoryItem => {
    return {
      id: vnItem.id || vnItem.ma_vat_tu,
      sku: vnItem.ma_sku || vnItem.sku,
      name: vnItem.ten_vat_tu || vnItem.name,
      category: mapInventoryCategoryDbToDisplay(vnItem.danh_muc || vnItem.category),
      quantity: vnItem.so_luong_ton || vnItem.so_luong || vnItem.quantity,
      unit: vnItem.don_vi_tinh || vnItem.don_vi || vnItem.unit,
      minThreshold: vnItem.nguong_toi_thieu || vnItem.minThreshold,
      importPrice: vnItem.gia_nhap || vnItem.importPrice,
      supplier: vnItem.nha_cung_cap || vnItem.supplier,
      lastImport: vnItem.lan_nhap_cuoi || vnItem.ngay_nhap_gan_nhat || vnItem.lastImport,
      image: vnItem.anh_vat_tu || vnItem.hinh_anh || vnItem.image
    };
  };

  // Mapping functions for database values to frontend display values
  const mapDepartmentDbToDisplay = (dbValue: string | null | undefined): Member['department'] | undefined => {
    if (!dbValue) return undefined;
    const mapping: Record<string, Member['department']> = {
      'ky_thuat': 'Kỹ Thuật',
      'spa': 'Spa',
      'qc': 'QA/QC',
      'hau_can': 'Hậu Cần',
      'quan_ly': 'Quản Lý',
      'kinh_doanh': 'Kinh Doanh'
    };
    // Nếu có trong mapping thì dùng giá trị đó
    if (mapping[dbValue]) {
      return mapping[dbValue];
    }
    // Nếu không có trong mapping, chuyển đổi từ snake_case sang Title Case
    return dbValue
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ') as Member['department'];
  };

  const mapDepartmentDisplayToDb = (displayValue: string | null | undefined): string | null => {
    if (!displayValue || displayValue.trim() === '') return null;
    const mapping: Record<string, string> = {
      'Kỹ Thuật': 'ky_thuat',
      'Spa': 'spa',
      'QA/QC': 'qc',
      'Hậu Cần': 'hau_can',
      'Quản Lý': 'quan_ly',
      'Kinh Doanh': 'kinh_doanh'
    };
    // Nếu có trong mapping thì dùng giá trị đó, nếu không thì chuyển đổi thành snake_case
    if (mapping[displayValue]) {
      return mapping[displayValue];
    }
    // Chuyển đổi giá trị mới thành snake_case để lưu vào database
    const snakeCase = displayValue
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Bỏ dấu
      .replace(/[^a-z0-9]+/g, '_') // Thay ký tự đặc biệt bằng underscore
      .replace(/^_+|_+$/g, ''); // Bỏ underscore ở đầu và cuối
    return snakeCase || null;
  };

  const mapRoleDbToDisplay = (dbValue: string | null | undefined): Member['role'] => {
    if (!dbValue) return 'Tư vấn viên';
    const mapping: Record<string, Member['role']> = {
      'quan_ly': 'Quản lý',
      'tu_van': 'Tư vấn viên',
      'ky_thuat': 'Kỹ thuật viên',
      'qc': 'QC'
    };
    // Nếu có trong mapping thì dùng giá trị đó
    if (mapping[dbValue]) {
      return mapping[dbValue];
    }
    // Nếu không có trong mapping, chuyển đổi từ snake_case sang Title Case
    return dbValue
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ') as Member['role'];
  };

  const mapRoleDisplayToDb = (displayValue: string): string => {
    const mapping: Record<string, string> = {
      'Quản lý': 'quan_ly',
      'Tư vấn viên': 'tu_van',
      'Kỹ thuật viên': 'ky_thuat',
      'QC': 'qc'
    };
    // Nếu có trong mapping thì dùng giá trị đó
    if (mapping[displayValue]) {
      return mapping[displayValue];
    }
    // Nếu không có trong mapping, chuyển đổi thành snake_case để lưu vào database
    return displayValue
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Bỏ dấu
      .replace(/[^a-z0-9]+/g, '_') // Thay ký tự đặc biệt bằng underscore
      .replace(/^_+|_+$/g, ''); // Bỏ underscore ở đầu và cuối
  };

  const mapStatusDbToDisplay = (dbValue: string | null | undefined): Member['status'] => {
    if (!dbValue) return 'Active';
    const mapping: Record<string, Member['status']> = {
      'hoat_dong': 'Active',
      'nghi': 'Off'
    };
    return mapping[dbValue] || 'Active';
  };

  const mapStatusDisplayToDb = (displayValue: string): string => {
    const mapping: Record<string, string> = {
      'Active': 'hoat_dong',
      'Off': 'nghi'
    };
    return mapping[displayValue] || 'hoat_dong';
  };

  const mapVietnameseMemberToEnglish = (vnItem: any): Member => {
    return {
      id: vnItem.ma_nhan_vien || vnItem.id,
      name: vnItem.ho_ten || vnItem.name,
      role: mapRoleDbToDisplay(vnItem.vai_tro),
      phone: vnItem.sdt || vnItem.so_dien_thoai || vnItem.phone,
      email: vnItem.email || '',
      status: mapStatusDbToDisplay(vnItem.trang_thai),
      avatar: vnItem.anh_dai_dien || vnItem.avatar,
      specialty: vnItem.chuyen_mon || vnItem.specialty,
      department: mapDepartmentDbToDisplay(vnItem.phong_ban)
    };
  };

  const mapVietnameseProductToEnglish = (vnItem: any): Product => {
    return {
      id: vnItem.ma_san_pham || vnItem.id,
      name: vnItem.ten_san_pham || vnItem.name,
      category: vnItem.danh_muc || vnItem.category,
      price: vnItem.gia_ban || vnItem.price,
      stock: vnItem.ton_kho || vnItem.stock,
      image: vnItem.hinh_anh || vnItem.image,
      desc: vnItem.mo_ta || vnItem.desc
    };
  };

  // Mapping functions for customer tier
  const mapTierDbToDisplay = (dbValue: string | null | undefined): Customer['tier'] => {
    if (!dbValue) return 'Standard';
    const mapping: Record<string, Customer['tier']> = {
      'thuong': 'Standard',
      'vip': 'VIP',
      'vvip': 'VVIP'
    };
    return mapping[dbValue.toLowerCase()] || 'Standard';
  };

  const mapTierDisplayToDb = (displayValue: Customer['tier'] | string | null | undefined): string => {
    if (!displayValue) return 'thuong';
    const mapping: Record<string, string> = {
      'Standard': 'thuong',
      'VIP': 'vip',
      'VVIP': 'vvip'
    };
    return mapping[displayValue] || 'thuong';
  };

  const mapInventoryCategoryDisplayToDb = (displayValue: string): string => {
    const mapping: Record<string, string> = {
      'Hoá chất': 'hoa_chat',
      'Phụ kiện': 'phu_kien',
      'Dụng cụ': 'dung_cu',
      'Vật tư tiêu hao': 'vat_tu_tieu_hao'
    };
    return mapping[displayValue] || 'vat_tu_tieu_hao';
  };

  const mapInventoryCategoryDbToDisplay = (dbValue: string | null | undefined): InventoryItem['category'] => {
    if (!dbValue) return 'Vật tư tiêu hao';
    const mapping: Record<string, InventoryItem['category']> = {
      'hoa_chat': 'Hoá chất',
      'phu_kien': 'Phụ kiện',
      'dung_cu': 'Dụng cụ',
      'vat_tu_tieu_hao': 'Vật tư tiêu hao'
    };
    return mapping[dbValue] || 'Vật tư tiêu hao';
  };

  const mapVietnameseCustomerToEnglish = (vnItem: any): Customer => {
    return {
      id: vnItem.ma_khach_hang || vnItem.id,
      name: vnItem.ten || vnItem.ho_ten || vnItem.name,
      phone: vnItem.sdt || vnItem.so_dien_thoai || vnItem.phone,
      email: vnItem.email || '',
      address: vnItem.dia_chi || vnItem.address,
      tier: mapTierDbToDisplay(vnItem.hang_thanh_vien || vnItem.hang_khach || vnItem.tier),
      totalSpent: vnItem.tong_chi_tieu || vnItem.totalSpent || 0,
      lastVisit: vnItem.lan_cuoi_ghe || vnItem.lan_ghe_gan_nhat || vnItem.lastVisit || '',
      notes: vnItem.ghi_chu || vnItem.notes,
      source: vnItem.nguon_khach || vnItem.source,
      status: vnItem.trang_thai || vnItem.status,
      assigneeId: vnItem.id_nhan_vien_phu_trach || vnItem.assigneeId,
      interactionCount: vnItem.so_lan_tuong_tac || vnItem.interactionCount || 0,
      group: vnItem.nhom_khach || vnItem.group
    };
  };

  // --- 1. Load dữ liệu từ Supabase (Realtime) ---
  const mapVietnameseWorkflowToEnglish = (vnItem: any): WorkflowDefinition => {
    return {
      id: vnItem.id,
      label: vnItem.ten_quy_trinh || vnItem.label,
      description: vnItem.mo_ta || vnItem.description,
      department: (mapDepartmentDbToDisplay(vnItem.bo_phan) as any) || 'Kỹ Thuật', // Default fallback
      color: vnItem.mau_sac || vnItem.color || '#3b82f6',
      types: vnItem.loai_dich_vu ? (Array.isArray(vnItem.loai_dich_vu) ? vnItem.loai_dich_vu.map(mapServiceTypeFromDb) : [mapServiceTypeFromDb(vnItem.loai_dich_vu)]) : [],
      stages: vnItem.cac_buoc_quy_trinh ? vnItem.cac_buoc_quy_trinh.map((stage: any) => ({
        id: stage.id,
        name: stage.ten_buoc || stage.name,
        order: stage.thu_tu || stage.order || 0,
        color: stage.mau_sac || stage.color,
        todos: stage.cac_task_quy_trinh ? stage.cac_task_quy_trinh.map((task: any) => ({
          id: task.id,
          title: task.tieu_de || task.title,
          required: task.bat_buoc || task.required
        })) : []
      })).sort((a: any, b: any) => a.order - b.order) : []
    };
  };

  const loadWorkflows = async () => {
    try {
      // Select workflows and join with stages
      const { data, error } = await supabase
        .from(DB_TABLES.WORKFLOWS)
        .select(`
          *,
            cac_buoc_quy_trinh (
              id,
              id_quy_trinh,
              ten_buoc,
              thu_tu,
              chi_tiet,
              tieu_chuan,
              mau_sac,
              nhan_vien_duoc_giao
            )
        `);

      if (error) {
        console.error('❌ Error loading workflows:', error);
        return;
      }


      // Convert workflow data with stages
      const list = (data || []).map((vnItem: any): WorkflowDefinition => {
        // Map stages if they exist
        const stages: WorkflowStage[] = (vnItem.cac_buoc_quy_trinh || [])
          .sort((a: any, b: any) => (a.thu_tu || 0) - (b.thu_tu || 0))
          .map((stage: any) => ({
            id: stage.id,
            name: stage.ten_buoc || 'Bước',
            order: stage.thu_tu || 0,
            color: stage.mau_sac || '#666',
            details: stage.chi_tiet || undefined,
            standards: stage.tieu_chuan || undefined,
            todos: [], // Tasks will be loaded separately if needed
            assignedMembers: stage.nhan_vien_duoc_giao || undefined
          }));

        return {
          id: vnItem.id,
          label: vnItem.ten_quy_trinh || vnItem.label || 'Quy trình',
          description: vnItem.mo_ta || vnItem.description || '',
          department: 'Kỹ Thuật' as any, // Default for now
          color: vnItem.mau_sac || vnItem.color || '#3b82f6',
          types: Array.isArray(vnItem.loai_ap_dung) ? vnItem.loai_ap_dung : [],
          materials: Array.isArray(vnItem.vat_tu_can_thiet) ? vnItem.vat_tu_can_thiet : undefined,
          stages: stages.length > 0 ? stages : undefined
        };
      });

      setWorkflows(list);

    } catch (error) {
      console.error('❌ Error loading workflows (catch):', error);
      setWorkflows([]);
    }
  };

  const loadOrders = async () => {
    try {
      // Load orders - only select columns that exist in database
      const ordersResult = await supabase
        .from(DB_TABLES.ORDERS)
        .select('id, id_khach_hang, ten_khach_hang, tong_tien, tien_coc, trang_thai, ngay_du_kien_giao, ghi_chu, ngay_tao, giam_gia, phi_phat_sinh, loai_giam_gia, ly_do_phu_phi')
        .order('ngay_tao', { ascending: false })
        .limit(100);

      if (ordersResult.error) {
        console.error('❌ Error loading orders:', {
          error: ordersResult.error,
          code: ordersResult.error.code,
          message: ordersResult.error.message,
          details: ordersResult.error.details,
          hint: ordersResult.error.hint,
          table: DB_TABLES.ORDERS
        });
        setOrders([]);
        return; // Don't throw, just return empty
      }


      // Load items separately - only select columns that exist
      const itemsResult = await supabase
        .from(DB_TABLES.SERVICE_ITEMS)
        .select('id, id_don_hang, ten_hang_muc, loai, don_gia, so_luong, trang_thai, id_ky_thuat_vien, la_san_pham, id_dich_vu_goc, id_quy_trinh, anh_truoc, anh_sau, lich_su_thuc_hien, nhat_ky_ky_thuat, cap_nhat_cuoi, phan_cong_tasks, gan_nhan_vien_theo_buoc, nhan_vien_phu_trach, hoa_hong')
        .limit(500);

      if (itemsResult.error) {
        console.error('Error loading service items:', itemsResult.error);
        console.warn('Continuing with orders without items');
      }

      // Load services to link serviceId → workflowId
      const { data: servicesData, error: servicesError } = await supabase
        .from(DB_TABLES.SERVICES)
        .select('id, id_quy_trinh, cac_buoc_quy_trinh')
        .limit(500);

      if (servicesError) {
        console.warn('⚠️ Error loading services for workflow linking:', servicesError);
      }

      // Create serviceId → workflowId map
      const serviceWorkflowMap = new Map<string, string>();
      if (servicesData && Array.isArray(servicesData)) {
        servicesData.forEach((service: any) => {
          const serviceId = service.id || service.ma_dich_vu;
          if (!serviceId) return;

          // Try to get workflowId from service
          let workflowId: string | undefined;

          // Priority 1: Check workflows array (new format)
          if (service.workflows && Array.isArray(service.workflows) && service.workflows.length > 0) {
            // Sort by order and get first one
            const sortedWorkflows = [...service.workflows].sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
            workflowId = sortedWorkflows[0].id;
          }
          // Priority 2: Check id_quy_trinh (database column)
          else if (service.id_quy_trinh) {
            workflowId = service.id_quy_trinh;
          }
          // Priority 3: Check workflows from cac_buoc_quy_trinh
          else if (service.cac_buoc_quy_trinh && Array.isArray(service.cac_buoc_quy_trinh) && service.cac_buoc_quy_trinh.length > 0) {
            const firstWorkflow = service.cac_buoc_quy_trinh[0];
            workflowId = firstWorkflow.id || firstWorkflow.id_quy_trinh;
          }
          // Priority 4: Check workflowId (old format)
          else if (service.workflowId) {
            if (typeof service.workflowId === 'string') {
              workflowId = service.workflowId;
            } else if (Array.isArray(service.workflowId) && service.workflowId.length > 0) {
              workflowId = service.workflowId[0];
            }
          }

          if (workflowId) {
            serviceWorkflowMap.set(serviceId, workflowId);
          }
        });
      }

      // Link serviceId → workflowId for items that don't have workflowId
      const itemsWithWorkflows = (itemsResult.data || []).map((item: any) => {
        // If item already has id_quy_trinh (workflowId), keep it
        if (item.id_quy_trinh) {
          return item;
        }

        // If item has serviceId, try to get workflowId from services
        if (item.id_dich_vu_goc && serviceWorkflowMap.has(item.id_dich_vu_goc)) {
          const linkedWorkflowId = serviceWorkflowMap.get(item.id_dich_vu_goc);
          return {
            ...item,
            id_quy_trinh: linkedWorkflowId
          };
        }

        return item;
      });

      // Group items by order_id
      const itemsByOrder = new Map<string, any[]>();
      itemsWithWorkflows.forEach((item: any) => {
        const orderId = item.id_don_hang;
        if (orderId) {
          if (!itemsByOrder.has(orderId)) {
            itemsByOrder.set(orderId, []);
          }
          itemsByOrder.get(orderId)!.push(item);
        }
      });


      // Map orders với items (bao gồm cả orders không có items)
      const ordersList: Order[] = (ordersResult.data || []).map((order: any) => {
        try {
          return mapVietnameseOrderToEnglish({
            ...order,
            danh_sach_dich_vu: itemsByOrder.get(order.id) || []
          });
        } catch (error) {
          console.error('Error mapping order:', order, error);
          return null;
        }
      }).filter((order): order is Order => order !== null);

      console.log('✅ Mapped orders:', {
        count: ordersList.length
      });

      setOrders(ordersList);

      if (ordersList.length === 0) {
        // No orders logic
      }

    } catch (error) {
      console.error('❌ Error loading orders (catch):', {
        error,
        errorType: typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined
      });
      setOrders([]);
    }
  };

  const loadInventory = async () => {
    try {
      const { data, error } = await supabase
        .from(DB_TABLES.INVENTORY)
        .select('*')
        .order('ten_vat_tu', { ascending: true })
        .limit(100); // Giới hạn để tăng tốc độ

      if (error) throw error;

      const list: InventoryItem[] = (data || []).map(mapVietnameseInventoryToEnglish);
      setInventory(list);
    } catch (error) {
      console.error('Error loading inventory:', error);
      setInventory([]);
    }
  };

  const loadMembers = async () => {
    try {
      const { data, error } = await supabase
        .from(DB_TABLES.MEMBERS)
        .select('id, ho_ten, vai_tro, sdt, email, trang_thai, anh_dai_dien, phong_ban') // Không select mat_khau để bảo mật
        .order('ho_ten', { ascending: true })
        .limit(100);

      if (error) {
        console.error('❌ Error loading members:', error);
        setMembers([]);
        return;
      }

      const membersList = (data || []).map(mapVietnameseMemberToEnglish);
      setMembers(membersList);
    } catch (error) {
      console.error('❌ Error loading members (catch):', error);
      setMembers([]);
    }
  };

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from(DB_TABLES.PRODUCTS)
        .select('id, ten_san_pham, danh_muc, gia_ban, ton_kho, anh_san_pham, mo_ta')
        .order('ten_san_pham', { ascending: true })
        .limit(100); // Giảm limit để tăng tốc độ

      if (error) {
        console.error('Error loading products:', error);
        setProducts([]);
        return;
      }

      const productsList = (data || []).map(mapVietnameseProductToEnglish);

      setProducts(productsList);
    } catch (error) {
      console.error('Error loading products:', error);
      setProducts([]);
    }
  };

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from(DB_TABLES.CUSTOMERS)
        .select('id, ten, sdt, email, dia_chi, hang_thanh_vien, tong_chi_tieu, lan_cuoi_ghe, ghi_chu, nguon_khach, trang_thai, id_nhan_vien_phu_trach, so_lan_tuong_tac, nhom_khach')
        .order('ten', { ascending: true })
        .limit(100); // Giảm limit để tăng tốc độ

      if (error) {
        console.error('Error loading customers:', error);
        setCustomers([]);
        return;
      }

      const customersList = (data || []).map(mapVietnameseCustomerToEnglish);

      setCustomers(customersList);
    } catch (error) {
      console.error('Error loading customers:', error);
      setCustomers([]);
    }
  };

  useEffect(() => {
    // 1. Tải dữ liệu từ cache (localStorage) để hiển thị TỨC THÌ
    console.log('⚡ Loading data from cache...');
    try {
      const cachedOrders = localStorage.getItem('cache_orders');
      const cachedInventory = localStorage.getItem('cache_inventory');
      const cachedMembers = localStorage.getItem('cache_members');
      const cachedProducts = localStorage.getItem('cache_products');
      const cachedCustomers = localStorage.getItem('cache_customers');
      const cachedWorkflows = localStorage.getItem('cache_workflows');

      if (cachedOrders) setOrders(JSON.parse(cachedOrders));
      if (cachedInventory) setInventory(JSON.parse(cachedInventory));
      if (cachedMembers) setMembers(JSON.parse(cachedMembers));
      if (cachedProducts) setProducts(JSON.parse(cachedProducts));
      if (cachedCustomers) setCustomers(JSON.parse(cachedCustomers));
      if (cachedWorkflows) setWorkflows(JSON.parse(cachedWorkflows));

      console.log('✅ Local cache loaded');
    } catch (e) {
      console.warn('⚠️ Error loading from cache:', e);
    }

    // Set loading = false NGAY LẬP TỨC để UI hiển thị (không block UI)
    setIsLoading(false);

    const startTime = performance.now();

    // 2. Fetch dữ liệu mới từ Supabase trong background
    console.log('🔄 Fetching fresh data from Supabase...');

    Promise.allSettled([
      loadOrders(),
      loadInventory(),
      loadMembers(),
      loadProducts(),
      loadCustomers(),
      loadWorkflows()
    ])
      .then((results) => {
        const totalTime = performance.now() - startTime;
        console.log('✅ All data loading completed (Background):', {
          totalTime: `${totalTime.toFixed(2)}ms`
        });
      })
      .catch((err) => {
        console.error('❌ Error in Promise.allSettled:', err);
      });

    // Setup real-time listeners SAU KHI load xong (delay 5s để không làm chậm initial load)
    // Nếu WebSocket fails, app vẫn hoạt động bình thường với polling
    let channel: any = null;
    const setupRealtime = () => {
      try {
        console.log('🔄 Setting up realtime subscriptions...');
        // Debounce function để tránh reload quá nhiều
        let reloadTimeout: NodeJS.Timeout;
        const debouncedReload = (fn: () => void) => {
          clearTimeout(reloadTimeout);
          reloadTimeout = setTimeout(fn, 3000); // Tăng debounce lên 3s để giảm load
        };

        channel = supabase
          .channel('app-changes')
          .on('postgres_changes',
            { event: '*', schema: 'public', table: DB_TABLES.ORDERS },
            () => {
              console.log('🔄 Realtime: Orders changed, reloading...');
              debouncedReload(loadOrders);
            }
          )
          .on('postgres_changes',
            { event: '*', schema: 'public', table: DB_TABLES.SERVICE_ITEMS },
            () => {
              console.log('🔄 Realtime: Service items changed, reloading orders...');
              debouncedReload(loadOrders);
            }
          )
          .on('postgres_changes',
            { event: '*', schema: 'public', table: DB_TABLES.WORKFLOWS },
            () => debouncedReload(loadWorkflows)
          )
          .on('postgres_changes',
            { event: '*', schema: 'public', table: DB_TABLES.INVENTORY },
            () => debouncedReload(loadInventory)
          )
          .on('postgres_changes',
            { event: '*', schema: 'public', table: DB_TABLES.MEMBERS },
            () => debouncedReload(loadMembers)
          )
          .on('postgres_changes',
            { event: '*', schema: 'public', table: DB_TABLES.PRODUCTS },
            () => debouncedReload(loadProducts)
          )
          .on('postgres_changes',
            { event: '*', schema: 'public', table: DB_TABLES.CUSTOMERS },
            () => debouncedReload(loadCustomers)
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log('✅ Realtime subscription successful');
            } else if (status === 'CHANNEL_ERROR') {
              console.warn('⚠️ Realtime channel error - app will continue without realtime updates. Data will be loaded on page refresh.');
            } else if (status === 'TIMED_OUT') {
              console.warn('⚠️ Realtime subscription timed out - app will continue without realtime updates. Data will be loaded on page refresh.');
            } else if (status === 'CLOSED') {
              console.warn('⚠️ Realtime channel closed - will retry on next change');
            }
          });
      } catch (error) {
        console.warn('⚠️ Error setting up realtime subscriptions (non-critical):', error);
        console.warn('⚠️ App will continue to work normally - data will be loaded on page refresh.');
      }
    };

    // Setup realtime sau 5 giây để không làm chậm initial load
    const realtimeTimeout = setTimeout(setupRealtime, 5000);

    return () => {
      clearTimeout(realtimeTimeout);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  // 4. Tự động lưu cache mỗi khi dữ liệu thay đổi
  useEffect(() => {
    // Debounce việc lưu cache để không ghi file quá nhiều lần
    const timer = setTimeout(() => {
      try {
        if (orders.length > 0) localStorage.setItem('cache_orders', JSON.stringify(orders.slice(0, 50))); // Chỉ cache 50 đơn gần nhất để tiết kiệm dung lượng
        if (inventory.length > 0) localStorage.setItem('cache_inventory', JSON.stringify(inventory));
        if (members.length > 0) localStorage.setItem('cache_members', JSON.stringify(members));
        if (products.length > 0) localStorage.setItem('cache_products', JSON.stringify(products));
        if (customers.length > 0) localStorage.setItem('cache_customers', JSON.stringify(customers));
        if (workflows.length > 0) localStorage.setItem('cache_workflows', JSON.stringify(workflows));
        // console.log('💾 Data auto-cached');
      } catch (e) {
        console.warn('⚠️ Sync cache error (possibly quota full):', e);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [orders, inventory, members, products, customers, workflows]);


  // --- 2. Thêm Đơn Hàng & Trừ Kho ---
  const addOrder = async (newOrder: Order) => {
    try {
      // Lưu đơn hàng vào Supabase (KHÔNG gửi id - để database tự tạo)
      const orderData = {
        id_khach_hang: newOrder.customerId,
        ten_khach_hang: newOrder.customerName,
        tong_tien: newOrder.totalAmount,
        tien_coc: newOrder.deposit || 0,
        trang_thai: mapOrderStatusDisplayToDb(newOrder.status),
        ngay_du_kien_giao: formatDateForDB(newOrder.expectedDelivery),
        ghi_chu: newOrder.notes || '',
        giam_gia: newOrder.discount || 0,
        loai_giam_gia: newOrder.discountType || 'money',
        phi_phat_sinh: newOrder.additionalFees || 0,
        ly_do_phu_phi: newOrder.surchargeReason || ''
      };

      // Insert order và lấy FULL data ngay
      const { data: savedOrder, error: orderError } = await supabase
        .from(DB_TABLES.ORDERS)
        .insert(orderData)
        .select('*')
        .single();

      if (orderError) throw orderError;

      const orderId = savedOrder?.id;
      if (!orderId) throw new Error('Không thể lấy ID đơn hàng sau khi tạo');

      // Lưu từng item vào bảng hang_muc_dich_vu (KHÔNG gửi id - để database tự tạo)
      const itemsToInsert = newOrder.items.map(item => {
        const itemData: any = {
          id_don_hang: orderId, // Dùng orderId từ database
          ten_hang_muc: item.name,
          loai: mapServiceTypeToDb(item.type),
          don_gia: item.price,
          so_luong: item.quantity || 1,
          trang_thai: item.status || 'cho_xu_ly', // Default status nếu không có
          la_san_pham: item.isProduct || false
        };

        // Chỉ thêm optional fields nếu có giá trị
        if (item.technicianId) itemData.id_ky_thuat_vien = item.technicianId;
        if (item.beforeImage) itemData.anh_truoc = item.beforeImage;
        if (item.afterImage) itemData.anh_sau = item.afterImage;
        if (item.serviceId) itemData.id_dich_vu_goc = item.serviceId;

        // QUAN TRỌNG: Luôn lưu workflowId nếu có (không chỉ khi truthy)
        if (item.workflowId) {
          itemData.id_quy_trinh = item.workflowId;
        } else if (item.serviceId) {
          // Nếu không có workflowId nhưng có serviceId, thử lấy từ service
          console.warn('⚠️ Item không có workflowId, nhưng có serviceId:', item.serviceId);
        }

        if (item.history && item.history.length > 0) itemData.lich_su_thuc_hien = item.history;
        if (item.lastUpdated) itemData.cap_nhat_cuoi = item.lastUpdated;
        if (item.technicalLog && item.technicalLog.length > 0) itemData.nhat_ky_ky_thuat = item.technicalLog;
        if ((item as any).stageAssignments) itemData.gan_nhan_vien_theo_buoc = (item as any).stageAssignments;
        if (item.commissions) itemData.hoa_hong = item.commissions;

        return itemData;
      });

      console.log('💾 Saving items to database:', {
        orderId,
        itemsCount: itemsToInsert.length,
        items: itemsToInsert.map(i => ({
          ten_hang_muc: i.ten_hang_muc,
          loai: i.loai,
          don_gia: i.don_gia,
          id_dich_vu_goc: i.id_dich_vu_goc,
          id_quy_trinh: i.id_quy_trinh,
          la_san_pham: i.la_san_pham
        }))
      });

      let insertedItems: any[] = [];
      if (itemsToInsert.length > 0) {
        // Batch insert tất cả items cùng lúc
        const { data, error: itemsError } = await supabase
          .from(DB_TABLES.SERVICE_ITEMS)
          .insert(itemsToInsert)
          .select();

        if (itemsError) {
          console.error('❌ Error saving items:', itemsError);
          throw itemsError;
        }

        insertedItems = data || [];

        console.log('✅ Items saved successfully:', {
          insertedCount: insertedItems.length,
          insertedItems: insertedItems
        });
      } else {
        console.warn('⚠️ No items to insert');
      }

      // --- OPTIMIZED FIX: Use returned data for immediate local update ---
      try {
        if (savedOrder) {
          const finalItems = itemsToInsert.length > 0 ? (insertedItems || []) : [];

          const formattedOrder = mapVietnameseOrderToEnglish({
            ...savedOrder,
            danh_sach_dich_vu: finalItems
          });

          console.log('🚀 Local update: Adding new order to state immediately (Optimized)', formattedOrder);
          setOrders(prev => [formattedOrder, ...prev]);
        }
      } catch (e) {
        console.error('Error updating local state for new order:', e);
      }
      // ------------------------------------------------------------------

      // Tính toán trừ kho dựa trên workflowId của item (batch update)
      const currentInventory = [...inventory];
      const inventoryUpdates = new Map<string, number>(); // Map<itemId, newQuantity>

      for (const item of newOrder.items) {
        // Chỉ trừ kho cho items không phải product và có workflowId
        if (!item.isProduct && item.workflowId) {
          // Tìm workflow từ workflows
          const workflow = workflows.find(w => w.id === item.workflowId);

          if (workflow && workflow.materials && Array.isArray(workflow.materials)) {
            for (const mat of workflow.materials) {
              const inventoryItemId = mat.inventoryItemId || mat.itemId;
              const invItem = currentInventory.find(i => i.id === inventoryItemId);

              if (invItem && mat.quantity) {
                const deductAmount = mat.quantity * (item.quantity || 1);
                const currentQty = inventoryUpdates.get(invItem.id) ?? invItem.quantity;
                const newQuantity = Math.max(0, currentQty - deductAmount);
                inventoryUpdates.set(invItem.id, newQuantity);
              }
            }
          }
        }
      }

      // Batch update tất cả inventory items cùng lúc (tối ưu: không block, xử lý lỗi sau)
      if (inventoryUpdates.size > 0) {
        // Sử dụng Promise.allSettled để không block, xử lý lỗi sau
        Promise.allSettled(
          Array.from(inventoryUpdates.entries()).map(([itemId, newQuantity]) =>
            supabase
              .from(DB_TABLES.INVENTORY)
              .update({ so_luong_ton: newQuantity })
              .eq('id', itemId)
          )
        ).then(results => {
          results.forEach((result, index) => {
            if (result.status === 'rejected' || (result.status === 'fulfilled' && result.value.error)) {
              const itemId = Array.from(inventoryUpdates.keys())[index];
              console.error(`Error updating inventory item ${itemId}:`,
                result.status === 'rejected' ? result.reason : result.value.error);
            }
          });
          console.log(`📦 Đã cập nhật ${inventoryUpdates.size} vật tư trong kho`);

          // Sync local inventory state
          setInventory(prev => prev.map(item => {
            if (inventoryUpdates.has(item.id)) {
              return { ...item, quantity: inventoryUpdates.get(item.id)! };
            }
            return item;
          }));
        });
      }
    } catch (error) {
      console.error('Error saving order:', error);
      throw error;
    }
  };

  // --- 2.5. Cập nhật Đơn Hàng ---
  const updateOrder = async (orderId: string, updatedOrder: Order) => {
    try {
      // 🚀 OPTIMISTIC UPDATE: Update local state immediately
      setOrders(prevOrders => prevOrders.map(o => o.id === orderId ? updatedOrder : o));

      // Update order

      const orderData: any = {
        id_khach_hang: updatedOrder.customerId,
        ten_khach_hang: updatedOrder.customerName,
        tong_tien: updatedOrder.totalAmount,
        tien_coc: updatedOrder.deposit || 0,
        trang_thai: mapOrderStatusDisplayToDb(updatedOrder.status),
        ngay_du_kien_giao: formatDateForDB(updatedOrder.expectedDelivery),
        ghi_chu: updatedOrder.notes || '',
        giam_gia: updatedOrder.discount || 0,
        loai_giam_gia: updatedOrder.discountType || 'money',
        phi_phat_sinh: updatedOrder.additionalFees || 0,
        ly_do_phu_phi: updatedOrder.surchargeReason || ''
      };

      // Add discount and additionalFees if they exist (may not be in schema yet)
      if (updatedOrder.discount !== undefined && updatedOrder.discount !== null) {
        orderData.giam_gia = updatedOrder.discount;
      }
      if (updatedOrder.additionalFees !== undefined && updatedOrder.additionalFees !== null) {
        orderData.phi_phat_sinh = updatedOrder.additionalFees;
      }

      const { error: orderError } = await supabase
        .from(DB_TABLES.ORDERS)
        .update(orderData)
        .eq('id', orderId);

      if (orderError) throw orderError;

      // Dùng upsert thay vì delete + insert (nhanh hơn)
      if (updatedOrder.items.length > 0) {
        const itemsToUpsert = updatedOrder.items.map(item => {
          const itemData: any = {
            id_don_hang: orderId,
            ten_hang_muc: item.name,
            loai: mapServiceTypeToDb(item.type),
            don_gia: item.price,
            so_luong: item.quantity || 1,
            trang_thai: item.status,
            la_san_pham: item.isProduct || false
          };

          // CRITICAL: Include item.id for upsert to work correctly
          // Only include id if it exists and is not empty (for existing items)
          if (item.id && item.id.trim() !== '') {
            itemData.id = item.id;
          }

          // Chỉ thêm optional fields nếu có giá trị
          if (item.technicianId) itemData.id_ky_thuat_vien = item.technicianId;
          if (item.beforeImage) itemData.anh_truoc = item.beforeImage;
          if (item.afterImage) itemData.anh_sau = item.afterImage;
          if (item.serviceId) itemData.id_dich_vu_goc = item.serviceId;
          if (item.workflowId) itemData.id_quy_trinh = item.workflowId;
          if (item.history && item.history.length > 0) itemData.lich_su_thuc_hien = item.history;
          if (item.lastUpdated) itemData.cap_nhat_cuoi = item.lastUpdated;
          if (item.technicalLog && item.technicalLog.length > 0) itemData.nhat_ky_ky_thuat = item.technicalLog;

          // Add notes and assignedMembers if they exist (may need to add columns to schema)
          if (item.notes) itemData.ghi_chu = item.notes;
          if (item.assignedMembers && item.assignedMembers.length > 0) {
            itemData.nhan_vien_phu_trach = item.assignedMembers;
          }
          if (item.commissions) {
            itemData.hoa_hong = item.commissions;
          }
          if ((item as any).stageAssignments) itemData.gan_nhan_vien_theo_buoc = (item as any).stageAssignments;

          return itemData;
        });

        // PRESERVE existing data before upsert: Load current items to preserve history, technicalLog, phan_cong_tasks
        const { data: existingItemsData } = await supabase
          .from(DB_TABLES.SERVICE_ITEMS)
          .select('id, lich_su_thuc_hien, nhat_ky_ky_thuat, cap_nhat_cuoi, phan_cong_tasks, ghi_chu, nhan_vien_phu_trach, hoa_hong')
          .eq('id_don_hang', orderId);

        // Merge preserved data into itemsToUpsert
        if (existingItemsData) {
          const existingItemsMap = new Map(existingItemsData.map(item => [item.id, item]));
          itemsToUpsert.forEach(itemData => {
            const existing = existingItemsMap.get(itemData.id);
            if (existing) {
              // PRESERVE history if not provided in updated item
              if (!itemData.lich_su_thuc_hien && existing.lich_su_thuc_hien) {
                itemData.lich_su_thuc_hien = existing.lich_su_thuc_hien;
              }
              // PRESERVE technicalLog if not provided
              if (!itemData.nhat_ky_ky_thuat && existing.nhat_ky_ky_thuat) {
                itemData.nhat_ky_ky_thuat = existing.nhat_ky_ky_thuat;
              }
              // PRESERVE lastUpdated if not provided
              if (!itemData.cap_nhat_cuoi && existing.cap_nhat_cuoi) {
                itemData.cap_nhat_cuoi = existing.cap_nhat_cuoi;
              }
              // PRESERVE phan_cong_tasks (workflow assignments) - very important!
              if (!itemData.phan_cong_tasks && existing.phan_cong_tasks) {
                itemData.phan_cong_tasks = existing.phan_cong_tasks;
              }
              // PRESERVE notes if not provided in updated item
              if (!itemData.ghi_chu && existing.ghi_chu) {
                itemData.ghi_chu = existing.ghi_chu;
              }
              // PRESERVE assignedMembers if not provided
              if (!itemData.nhan_vien_phu_trach && existing.nhan_vien_phu_trach) {
                itemData.nhan_vien_phu_trach = existing.nhan_vien_phu_trach;
              }
              // PRESERVE commissions if not provided
              if (!itemData.hoa_hong && existing.hoa_hong) {
                itemData.hoa_hong = existing.hoa_hong;
              }
            }
          });
        }
        // Separate items into existing (with valid ID) and new (without ID)
        const itemsToUpdate = itemsToUpsert.filter(item => item.id && item.id.trim() !== '');
        const itemsToInsert = itemsToUpsert.filter(item => !item.id || item.id.trim() === '').map(item => {
          // Remove the id field for new items - let DB auto-generate
          const { id, ...itemWithoutId } = item;
          return itemWithoutId;
        });

        // Update existing items (upsert with conflict on id)
        if (itemsToUpdate.length > 0) {
          const { error: updateError } = await supabase
            .from(DB_TABLES.SERVICE_ITEMS)
            .upsert(itemsToUpdate, { onConflict: 'id' });

          if (updateError) throw updateError;
        }

        // Insert new items (let DB generate ID)
        if (itemsToInsert.length > 0) {
          const { error: insertError } = await supabase
            .from(DB_TABLES.SERVICE_ITEMS)
            .insert(itemsToInsert);

          if (insertError) throw insertError;
        }

        // Xóa items không còn trong danh sách
        const currentItemIds = new Set(updatedOrder.items.map(i => i.id));
        const { data: existingItems } = await supabase
          .from(DB_TABLES.SERVICE_ITEMS)
          .select('id')
          .eq('id_don_hang', orderId);

        if (existingItems) {
          const itemsToDelete = existingItems
            .filter(item => !currentItemIds.has(item.id))
            .map(item => item.id);

          if (itemsToDelete.length > 0) {
            await supabase
              .from(DB_TABLES.SERVICE_ITEMS)
              .delete()
              .in('id', itemsToDelete);
          }
        }
      } else {
        // Nếu không có items, xóa tất cả
        await supabase
          .from(DB_TABLES.SERVICE_ITEMS)
          .delete()
          .eq('id_don_hang', orderId);
      }
    } catch (error) {
      console.error('Error updating order:', error);
      throw error;
    }
  };

  // --- 2.6. Xóa Đơn Hàng ---
  const deleteOrder = async (orderId: string) => {
    try {
      // Items will be deleted automatically due to CASCADE
      const { error } = await supabase
        .from(DB_TABLES.ORDERS)
        .delete()
        .eq('id', orderId);

      if (error) throw error;

      console.log('🗑️ Local update: Removing order from state immediately', orderId);
      setOrders(prev => prev.filter(o => o.id !== orderId));
    } catch (error) {
      console.error('Error deleting order:', error);
      throw error;
    }
  };

  // Helper function to remove undefined values from object
  const removeUndefined = (obj: any): any => {
    if (obj === null || obj === undefined) return null;
    if (Array.isArray(obj)) {
      return obj.map(item => removeUndefined(item));
    }
    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const key in obj) {
        if (obj[key] !== undefined) {
          cleaned[key] = removeUndefined(obj[key]);
        }
      }
      return cleaned;
    }
    return obj;
  };

  // --- 2.7. Xóa Item khỏi Đơn Hàng ---
  const deleteOrderItem = async (orderId: string, itemId: string) => {
    try {
      // Xóa item từ bảng hang_muc_dich_vu
      const { error: deleteError } = await supabase
        .from(DB_TABLES.SERVICE_ITEMS)
        .delete()
        .eq('id', itemId)
        .eq('id_don_hang', orderId);

      if (deleteError) throw deleteError;

      // Tính lại tổng tiền từ các items còn lại
      const order = orders.find(o => o.id === orderId);
      if (order) {
        const remainingItems = order.items.filter(item => item.id !== itemId);
        const newTotalAmount = remainingItems.reduce((acc, item) => acc + item.price, 0);

        // Cập nhật tổng tiền của đơn hàng
        await supabase
          .from(DB_TABLES.ORDERS)
          .update({ tong_tien: newTotalAmount })
          .eq('id', orderId);
      }
    } catch (error) {
      console.error('Error deleting order item:', error);
      throw error;
    }
  };

  // --- 3. Cập nhật Trạng thái Quy trình ---
  const updateOrderItemStatus = async (orderId: string, itemId: string, newStatus: string, user: string, note?: string) => {
    try {
      // 1. Get current item from LOCAL STATE to calculate new history immediately (True Optimistic)
      const currentOrder = orders.find(o => o.id === orderId);
      const currentItem = currentOrder?.items.find(i => i.id === itemId);

      if (!currentOrder || !currentItem) {
        console.error('Item not found in local orders state:', { orderId, itemId });
        // Fallback or return? If not in local state, UI can't be updated anyway.
        return;
      }

      const now = Date.now();
      const currentHistory = (currentItem.history || []) as any[];
      let newHistory = [...currentHistory];

      // Đóng stage cũ
      if (newHistory.length > 0) {
        const lastEntryIndex = newHistory.length - 1;
        const lastEntry = newHistory[lastEntryIndex];
        if (!lastEntry.leftAt) {
          newHistory[lastEntryIndex] = {
            ...lastEntry,
            leftAt: now,
            duration: now - lastEntry.enteredAt
          };
        }
      }

      // Mở stage mới
      newHistory.push({
        stageId: newStatus,
        stageName: newStatus, // Sẽ được map từ workflows khi load lại
        enteredAt: now,
        performedBy: user
      });

      // Xử lý Log (Ghi chú)
      let newLog = (currentItem.technicalLog || []) as any[];
      if (note) {
        newLog = [...newLog, { // Create new array to be safe
          id: Date.now().toString(),
          content: note,
          author: user,
          timestamp: new Date().toLocaleString('vi-VN'),
          stage: newStatus
        }];
      }

      // 🚀 OPTIMISTIC UPDATE: Update local state immediately
      let computedOrderStatus: OrderStatus | undefined;

      setOrders(prevOrders => {
        return prevOrders.map(order => {
          if (order.id === orderId) {
            // Create updated items array
            const updatedItems = order.items.map(item => {
              if (item.id === itemId) {
                return {
                  ...item,
                  status: newStatus,
                  history: newHistory as any,
                  technicalLog: newLog as any,
                  lastUpdated: now
                };
              }
              return item;
            });

            // --- AUTO-UPDATE ORDER STATUS LOGIC ---
            // Filter only service items (ignore products)
            const serviceItems = updatedItems.filter(i => !i.isProduct);

            if (serviceItems.length > 0) {
              // Helper to check for "Done" status robustly
              const isItemDone = (status: string) => {
                const s = (status || '').toLowerCase().trim();
                return ['done', 'hoàn thành', 'hoàn tất', 'đã xong', 'finish', 'finished', 'complete', 'completed', 'delivered', 'da_giao', 'huy', 'cancel'].some(k => s.includes(k));
              };

              const isAllDone = serviceItems.every(i => isItemDone(i.status));
              const isStarted = serviceItems.some(i => !['in-queue', 'pending', 'cho_xu_ly'].includes((i.status || '').toLowerCase()) && !isItemDone(i.status));

              if (isAllDone) {
                computedOrderStatus = OrderStatus.DONE;
              } else if (isStarted || serviceItems.some(i => !isItemDone(i.status) && !['in-queue', 'pending', 'cho_xu_ly'].includes((i.status || '').toLowerCase()))) {
                // Any item started but not all done -> Processing
                // Also catching case where items are just not pending
                computedOrderStatus = OrderStatus.PROCESSING;
              } else {
                // If not all done and nothing clearly started (still pending), keep original or set to pending?
                // Safer to keep original unless we want to force Pending
                computedOrderStatus = order.status;
              }

              // Only override if strictly upgrading status or completing
              // Prevent auto-reverting to Pending if user manually set something else (unless really all pending)
              if (computedOrderStatus === OrderStatus.PROCESSING && order.status === OrderStatus.PENDING) {
                // Allow upgrade
              } else if (computedOrderStatus === OrderStatus.DONE) {
                // Allow complete
              } else {
                computedOrderStatus = order.status; // Fallback to current
              }

              // SIMPLIFIED LOGIC:
              // If all done -> DONE
              // If any started and order is Pending -> PROCESSING
              if (isAllDone) {
                computedOrderStatus = OrderStatus.DONE;
              } else if (order.status === OrderStatus.PENDING && serviceItems.some(i => !['in-queue', 'pending', 'cho_xu_ly'].includes((i.status || '').toLowerCase()))) {
                computedOrderStatus = OrderStatus.PROCESSING;
              } else {
                computedOrderStatus = order.status;
              }
            }
            // -------------------------------------

            return {
              ...order,
              status: computedOrderStatus || order.status,
              items: updatedItems
            };
          }
          return order;
        });
      });

      // Cập nhật lên Supabase (Item Status)
      console.log('📤 Updating order item status in database:', {
        itemId,
        orderId,
        newStatus,
        historyEntries: newHistory.length,
        logEntries: newLog.length
      });

      const { error: updateError } = await supabase
        .from(DB_TABLES.SERVICE_ITEMS)
        .update({
          trang_thai: newStatus,
          lich_su_thuc_hien: newHistory,
          cap_nhat_cuoi: now,
          nhat_ky_ky_thuat: newLog
        })
        .eq('id', itemId)
        .eq('id_don_hang', orderId);

      if (updateError) {
        // Rollback state if error (optional, simplified for now)
        console.error('❌ Error updating order item status:', {
          error: updateError,
          code: updateError.code,
          message: updateError.message,
          hint: updateError.hint,
          details: updateError.details
        });
        throw updateError;
      }

      // --- RE-VERIFY & AUTO-UPDATE ORDER STATUS (Using fresh DB data) ---
      // Fetch all items for this order directly from DB to avoid local state staleness
      const { data: dbItems, error: itemsError } = await supabase
        .from(DB_TABLES.SERVICE_ITEMS)
        .select('trang_thai, la_san_pham')
        .eq('id_don_hang', orderId);

      if (!itemsError && dbItems) {
        const dbServiceItems = dbItems.filter(i => !i.la_san_pham);

        if (dbServiceItems.length > 0) {
          const isDbItemDone = (status: string | null) => {
            if (!status) return false;
            const s = status.toLowerCase().trim();
            // 1. Check explicit keywords
            const isExplicit = ['done', 'hoàn thành', 'hoàn tất', 'đã xong', 'finish', 'finished', 'complete', 'completed', 'delivered', 'da_giao', 'huy', 'cancel'].some(k => s.includes(k));
            if (isExplicit) return true;

            // 2. Check if it's a UUID for a Done stage in workflows
            // Access 'workflows' from the closure (it's available in AppProvider)
            return (workflows || []).some(w =>
              w.stages?.some(stage => {
                const stageId = (stage.id || '').toLowerCase();
                if (stageId !== s) return false;

                const stageName = (stage.name || '').toLowerCase().trim();
                return ['done', 'hoàn thành', 'hoàn tất', 'đã xong', 'finish', 'finished', 'complete', 'completed'].some(k => stageName.includes(k));
              })
            );
          };

          const isAllDbDone = dbServiceItems.every(i => isDbItemDone(i.trang_thai));
          const isAnyDbStarted = dbServiceItems.some(i => !['in-queue', 'pending', 'cho_xu_ly'].includes((i.trang_thai || '').toLowerCase()) && !isDbItemDone(i.trang_thai));

          let newDbStatus = currentOrder.status; // Default to current

          // Logic:
          // 1. All Done -> DONE
          // 2. Not all done, but some started -> PROCESSING
          // 3. Not all done, but some completed (and others pending) -> PROCESSING (Because work has started)

          if (isAllDbDone) {
            newDbStatus = OrderStatus.DONE;
          } else {
            // Check if ANY non-pending activity exists (either started or finished)
            const hasActivity = dbServiceItems.some(i => !['in-queue', 'pending', 'cho_xu_ly'].includes((i.trang_thai || '').toLowerCase()));

            if (hasActivity && currentOrder.status === OrderStatus.PENDING) {
              newDbStatus = OrderStatus.PROCESSING;
            } else if (hasActivity && currentOrder.status === OrderStatus.DONE) {
              // Re-opening order if it was done but now not all done
              newDbStatus = OrderStatus.PROCESSING;
            }
          }

          if (newDbStatus !== currentOrder.status) {
            console.log('🔄 Auto-updating Order Status (Validated by DB):', {
              orderId,
              oldStatus: currentOrder.status,
              newStatus: newDbStatus,
              dbItemsCount: dbServiceItems.length,
              isAllDone: isAllDbDone
            });

            await supabase
              .from(DB_TABLES.ORDERS)
              .update({ trang_thai: mapOrderStatusDisplayToDb(newDbStatus) })
              .eq('id', orderId);

            // Update local state for consistency
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newDbStatus } : o));
          }
        }
      }

      console.log('✅ Order item status updated successfully:', {
        itemId,
        orderId,
        newStatus,
        historyEntries: newHistory.length,
        logEntries: newLog.length
      });

    } catch (error) {
      console.error('❌ Error updating order item status:', error);
      throw error;
    }
  };

  // --- 4. Thêm Ghi chú kỹ thuật ---
  const addTechnicianNote = async (orderId: string, itemId: string, content: string, user: string) => {
    try {
      // Lấy item hiện tại
      const { data: itemData, error: fetchError } = await supabase
        .from(DB_TABLES.SERVICE_ITEMS)
        .select('*')
        .eq('id', itemId)
        .eq('id_don_hang', orderId)
        .single();

      if (fetchError || !itemData) {
        console.error('Item not found:', fetchError);
        return;
      }

      const newLog: TechnicalLog = {
        id: Date.now().toString(),
        content: content,
        author: user,
        timestamp: new Date().toLocaleString('vi-VN'),
        stage: itemData.trang_thai
      };

      const currentLogs = (itemData.nhat_ky_ky_thuat || []) as any[];
      const updatedLogs = [newLog, ...currentLogs];

      // Update Supabase
      const { error: updateError } = await supabase
        .from(DB_TABLES.SERVICE_ITEMS)
        .update({ nhat_ky_ky_thuat: updatedLogs })
        .eq('id', itemId)
        .eq('id_don_hang', orderId);

      if (updateError) throw updateError;
    } catch (error) {
      console.error('Error adding technician note:', error);
      throw error;
    }
  };

  const updateInventory = async (items: InventoryItem[]) => {
    try {
      for (const item of items) {
        const itemData = {
          ma_sku: item.sku,
          ten_vat_tu: item.name,
          danh_muc: item.category,
          so_luong_ton: item.quantity,
          don_vi_tinh: item.unit,
          nguong_toi_thieu: item.minThreshold || 0,
          gia_nhap: item.importPrice || 0,
          nha_cung_cap: item.supplier || null,
          lan_nhap_cuoi: item.lastImport || null,
          anh_vat_tu: item.image || null
        };

        await supabase
          .from(DB_TABLES.INVENTORY)
          .update(itemData)
          .eq('id', item.id);
      }
    } catch (error) {
      console.error('Error updating inventory:', error);
      throw error;
    }
  };

  // Cập nhật một vật tư cụ thể
  const updateInventoryItem = async (itemId: string, updatedItem: InventoryItem) => {
    try {
      const itemData: any = {
        ma_sku: updatedItem.sku,
        ten_vat_tu: updatedItem.name,
        danh_muc: mapInventoryCategoryDisplayToDb(updatedItem.category),
        so_luong_ton: updatedItem.quantity,
        don_vi_tinh: updatedItem.unit,
        nguong_toi_thieu: updatedItem.minThreshold || 0,
        gia_nhap: updatedItem.importPrice || 0,
        nha_cung_cap: updatedItem.supplier || null,
        lan_nhap_cuoi: formatDateForDB(updatedItem.lastImport),
        anh_vat_tu: updatedItem.image || null
      };

      const { data, error } = await supabase
        .from(DB_TABLES.INVENTORY)
        .update(itemData)
        .eq('id', itemId)
        .select()
        .single();

      if (error) throw error;

      // OPTIMISTIC UPDATE: Cập nhật local state ngay lập tức
      const updatedInventoryItem = mapVietnameseInventoryToEnglish(data);
      setInventory(prev => prev.map(item => item.id === itemId ? updatedInventoryItem : item));

      // Backup reload (vẫn cần thiết để đảm bảo đồng bộ hoàn toàn)
      loadInventory();
    } catch (error) {
      console.error('Error updating inventory item:', error);
      throw error;
    }
  };

  // Xóa một vật tư
  const deleteInventoryItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from(DB_TABLES.INVENTORY)
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      // OPTIMISTIC UPDATE: Xóa khỏi local state ngay lập tức
      setInventory(prev => prev.filter(item => item.id !== itemId));

      // Backup reload
      loadInventory();
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      throw error;
    }
  };

  // Thêm vật tư mới
  const addInventoryItem = async (newItem: InventoryItem) => {
    try {
      // KHÔNG gửi id - để database tự tạo
      const itemData: any = {
        ma_sku: newItem.sku,
        ten_vat_tu: newItem.name,
        danh_muc: mapInventoryCategoryDisplayToDb(newItem.category),
        so_luong_ton: newItem.quantity,
        don_vi_tinh: newItem.unit,
        nguong_toi_thieu: newItem.minThreshold || 0,
        gia_nhap: newItem.importPrice || 0,
        nha_cung_cap: newItem.supplier || null,
        lan_nhap_cuoi: formatDateForDB(newItem.lastImport),
        anh_vat_tu: newItem.image || null
      };

      const { data, error } = await supabase
        .from(DB_TABLES.INVENTORY)
        .insert(itemData)
        .select()
        .single();

      if (error) throw error;

      // OPTIMISTIC UPDATE: Thêm vào local state ngay lập tức
      const newlyAddedItem = mapVietnameseInventoryToEnglish(data);
      setInventory(prev => [newlyAddedItem, ...prev]);

      // Backup reload
      loadInventory();
    } catch (error) {
      console.error('Error adding inventory item:', error);
      throw error;
    }
  };

  // Cập nhật nhân sự
  const updateMember = async (memberId: string, updatedMember: Member) => {
    try {
      const memberData = {
        ho_ten: updatedMember.name,
        vai_tro: mapRoleDisplayToDb(updatedMember.role),
        sdt: updatedMember.phone,
        email: updatedMember.email || null,
        trang_thai: mapStatusDisplayToDb(updatedMember.status),
        anh_dai_dien: updatedMember.avatar || null,
        phong_ban: mapDepartmentDisplayToDb(updatedMember.department)
      };

      const { data, error } = await supabase
        .from(DB_TABLES.MEMBERS)
        .update(memberData)
        .eq('id', memberId)
        .select();

      if (error) {
        console.error('Supabase update error:', error);
        throw error;
      }

      console.log('Member updated successfully:', data);

      // Reload dữ liệu ngay sau khi cập nhật thành công
      await loadMembers();
    } catch (error) {
      console.error('Error updating member:', error);
      throw error;
    }
  };

  // Xóa nhân sự
  const deleteMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from(DB_TABLES.MEMBERS)
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      // Reload dữ liệu ngay sau khi xóa thành công
      await loadMembers();
    } catch (error) {
      console.error('Error deleting member:', error);
      throw error;
    }
  };

  // Thêm nhân sự mới
  const addMember = async (newMember: Member) => {
    try {
      // KHÔNG gửi id - để database tự tạo
      const memberData = {
        ho_ten: newMember.name,
        vai_tro: mapRoleDisplayToDb(newMember.role),
        sdt: newMember.phone,
        email: newMember.email || null,
        trang_thai: mapStatusDisplayToDb(newMember.status),
        anh_dai_dien: newMember.avatar || null,
        phong_ban: mapDepartmentDisplayToDb(newMember.department)
      };

      const { error } = await supabase
        .from(DB_TABLES.MEMBERS)
        .insert(memberData);

      if (error) throw error;

      // Reload dữ liệu ngay sau khi thêm thành công để hiển thị ngay
      await loadMembers();
    } catch (error) {
      console.error('Error adding member:', error);
      throw error;
    }
  };

  // Cập nhật sản phẩm
  const updateProduct = async (productId: string, updatedProduct: Product) => {
    try {
      const productData = {
        ten_san_pham: updatedProduct.name,
        danh_muc: updatedProduct.category,
        gia_ban: updatedProduct.price,
        ton_kho: updatedProduct.stock,
        anh_san_pham: updatedProduct.image || null,
        mo_ta: updatedProduct.desc || null
      };

      const { error } = await supabase
        .from(DB_TABLES.PRODUCTS)
        .update(productData)
        .eq('id', productId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  };

  // Xóa sản phẩm
  const deleteProduct = async (productId: string) => {
    try {
      const { error } = await supabase
        .from(DB_TABLES.PRODUCTS)
        .delete()
        .eq('id', productId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  };

  // Thêm sản phẩm mới
  const addProduct = async (newProduct: Product) => {
    try {
      // KHÔNG gửi id - để database tự tạo
      const productData = {
        ten_san_pham: newProduct.name,
        danh_muc: newProduct.category,
        gia_ban: newProduct.price,
        ton_kho: newProduct.stock,
        anh_san_pham: newProduct.image || null,
        mo_ta: newProduct.desc || null
      };

      // Không select data để tối ưu tốc độ (realtime sẽ update UI)
      const { error } = await supabase
        .from(DB_TABLES.PRODUCTS)
        .insert(productData);

      if (error) throw error;
    } catch (error) {
      console.error('Error adding product:', error);
      throw error;
    }
  };

  // Khách hàng
  const addCustomer = async (newCustomer: Customer) => {
    try {
      // KHÔNG gửi id - để database tự tạo
      const customerData = {
        ten: newCustomer.name,
        sdt: newCustomer.phone,
        email: newCustomer.email || null,
        dia_chi: newCustomer.address || null,
        hang_thanh_vien: mapTierDisplayToDb(newCustomer.tier), // Convert tier to database format
        tong_chi_tieu: newCustomer.totalSpent || 0,
        lan_cuoi_ghe: newCustomer.lastVisit || null,
        ghi_chu: newCustomer.notes || null,
        nguon_khach: newCustomer.source || null,
        trang_thai: newCustomer.status || null,
        id_nhan_vien_phu_trach: newCustomer.assigneeId || null,
        so_lan_tuong_tac: newCustomer.interactionCount || 0,
        nhom_khach: newCustomer.group || null
      };

      // Không select data để tối ưu tốc độ (realtime sẽ update UI)
      const { error } = await supabase
        .from(DB_TABLES.CUSTOMERS)
        .insert(customerData);

      if (error) throw error;
    } catch (error) {
      console.error('Error adding customer:', error);
      throw error;
    }
  };

  const updateCustomer = async (customerId: string, updatedCustomer: Customer) => {
    try {
      // 🚀 OPTIMISTIC UPDATE: Update local state immediately
      setCustomers(prev => prev.map(c => c.id === customerId ? updatedCustomer : c));

      const customerData = {
        ten: updatedCustomer.name,
        sdt: updatedCustomer.phone,
        email: updatedCustomer.email || null,
        dia_chi: updatedCustomer.address || null,
        hang_thanh_vien: mapTierDisplayToDb(updatedCustomer.tier), // Convert tier to database format
        tong_chi_tieu: updatedCustomer.totalSpent || 0,
        lan_cuoi_ghe: updatedCustomer.lastVisit || null,
        ghi_chu: updatedCustomer.notes || null,
        nguon_khach: updatedCustomer.source || null,
        trang_thai: updatedCustomer.status || null,
        id_nhan_vien_phu_trach: updatedCustomer.assigneeId || null,
        so_lan_tuong_tac: updatedCustomer.interactionCount || 0,
        nhom_khach: updatedCustomer.group || null
      };

      const { error } = await supabase
        .from(DB_TABLES.CUSTOMERS)
        .update(customerData)
        .eq('id', customerId);

      if (error) {
        // Rollback if error
        console.error('Supabase update error, rolling back:', error);
        setCustomers(prev => prev.map(c => c.id === customerId ? customers.find(old => old.id === customerId)! : c));
        throw error;
      }
    } catch (error) {
      console.error('Error updating customer:', error);
      throw error;
    }
  };

  const deleteCustomer = async (customerId: string) => {
    try {
      const { error } = await supabase
        .from(DB_TABLES.CUSTOMERS)
        .delete()
        .eq('id', customerId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting customer:', error);
      throw error;
    }
  };

  return (
    <AppContext.Provider value={{
      orders, setOrders, inventory, members, products, customers, workflows,
      addOrder, updateOrder, deleteOrder, deleteOrderItem, updateOrderItemStatus,
      updateInventory, updateInventoryItem, deleteInventoryItem, addInventoryItem,
      updateMember, deleteMember, addMember,
      updateProduct, deleteProduct, addProduct,
      addCustomer, updateCustomer, deleteCustomer,
      addTechnicianNote, isLoading
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppStore = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppStore must be used within an AppProvider');
  }
  return context;
};