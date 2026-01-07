import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { DB_TABLES, supabase } from './supabase';
import {
  Customer,
  InventoryItem,
  Member,
  Order,
  Product,
  TechnicalLog,
  WorkflowDefinition
} from './types';

interface AppContextType {
  orders: Order[];
  inventory: InventoryItem[];
  members: Member[];
  products: Product[];
  customers: Customer[];
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

  // Helper function để chuyển đổi từ tiếng Việt sang tiếng Anh
  const mapVietnameseOrderToEnglish = (vnOrder: any): Order => {
    return {
      id: vnOrder.ma_don_hang || vnOrder.id,
      customerId: vnOrder.ma_khach_hang || vnOrder.customerId,
      customerName: vnOrder.ten_khach_hang || vnOrder.customerName,
      items: (vnOrder.danh_sach_dich_vu || vnOrder.items || []).map((item: any) => ({
        id: item.ma_item || item.id,
        name: item.ten_hang_muc || item.ten || item.name,
        type: item.loai || item.loai_dich_vu || item.type,
        price: item.don_gia || item.gia || item.price,
        quantity: item.so_luong || item.quantity || 1,
        status: item.trang_thai || item.status,
        technicianId: item.technicianId,
        beforeImage: item.anh_truoc || item.beforeImage,
        afterImage: item.anh_sau || item.afterImage,
        isProduct: item.isProduct,
        serviceId: item.serviceId,
        workflowId: item.workflowId,
        history: item.history,
        lastUpdated: item.lastUpdated,
        technicalLog: item.technicalLog
      })),
      totalAmount: vnOrder.tong_tien || vnOrder.totalAmount,
      deposit: vnOrder.dat_coc || vnOrder.deposit,
      status: vnOrder.trang_thai || vnOrder.status,
      createdAt: vnOrder.ngay_tao || vnOrder.createdAt,
      expectedDelivery: vnOrder.ngay_giao_du_kien || vnOrder.expectedDelivery,
      notes: vnOrder.ghi_chu || vnOrder.notes
    };
  };

  const mapVietnameseInventoryToEnglish = (vnItem: any): InventoryItem => {
    return {
      id: vnItem.ma_vat_tu || vnItem.id,
      sku: vnItem.ma_sku || vnItem.sku,
      name: vnItem.ten_vat_tu || vnItem.name,
      category: vnItem.danh_muc || vnItem.category,
      quantity: vnItem.so_luong_ton || vnItem.so_luong || vnItem.quantity,
      unit: vnItem.don_vi_tinh || vnItem.don_vi || vnItem.unit,
      minThreshold: vnItem.nguong_toi_thieu || vnItem.minThreshold,
      importPrice: vnItem.gia_nhap || vnItem.importPrice,
      supplier: vnItem.nha_cung_cap || vnItem.supplier,
      lastImport: vnItem.lan_nhap_cuoi || vnItem.ngay_nhap_gan_nhat || vnItem.lastImport,
      image: vnItem.anh_vat_tu || vnItem.hinh_anh || vnItem.image
    };
  };

  // ... (Keep intermediate code if any, but mappings are adjacent)

  // Mapping functions for database values to frontend display values
  // Mapping functions for database values to frontend display values

  // Maps for bidirectional lookup
  // Helper objects to ensure consistency. keys are both Frontend and DB values for easy lookup if needed, 
  // but primarilly we want predictable transformation.

  const roleToDb: Record<string, string> = {
    'Tư vấn viên': 'tu_van',
    'Kỹ thuật viên': 'ky_thuat',
    'QC': 'qc',
    'Quản lý': 'quan_ly'
  };

  const roleToDisplay: Record<string, string> = {
    'tu_van': 'Tư vấn viên',
    'ky_thuat': 'Kỹ thuật viên',
    'qc': 'QC',
    'quan_ly': 'Quản lý'
  };

  const statusToDb: Record<string, string> = {
    'Active': 'hoat_dong',
    'Off': 'nghi'
  };

  const statusToDisplay: Record<string, string> = {
    'hoat_dong': 'Active',
    'nghi': 'Off'
  };

  const deptToDb: Record<string, string> = {
    'Kỹ Thuật': 'ky_thuat',
    'Spa': 'spa',
    'QA/QC': 'qc',
    'Hậu Cần': 'hau_can',
    'Quản Lý': 'quan_ly',
    'Kinh Doanh': 'kinh_doanh'
  };

  const deptToDisplay: Record<string, string> = {
    'ky_thuat': 'Kỹ Thuật',
    'spa': 'Spa',
    'qc': 'QA/QC',
    'hau_can': 'Hậu Cần',
    'quan_ly': 'Quản Lý',
    'kinh_doanh': 'Kinh Doanh'
  };

  const mapRoleDisplayToDb = (displayRole: string): string => {
    return roleToDb[displayRole] || 'tu_van';
  };

  const mapStatusDisplayToDb = (displayStatus: string): string => {
    return statusToDb[displayStatus] || 'hoat_dong';
  };

  const mapDepartmentDisplayToDb = (displayDepartment?: string): string => {
    return (displayDepartment && deptToDb[displayDepartment]) || 'hau_can';
  };

  const mapVietnameseMemberToEnglish = (vnMember: any): Member => {
    return {
      id: vnMember.id,
      name: vnMember.ho_ten,
      role: roleToDisplay[vnMember.vai_tro] || vnMember.vai_tro,
      phone: vnMember.sdt,
      email: vnMember.email || '',
      status: (statusToDisplay[vnMember.trang_thai] || 'Active') as 'Active' | 'Off',
      avatar: vnMember.anh_dai_dien,
      specialty: vnMember.chuyen_mon,
      department: deptToDisplay[vnMember.phong_ban] || vnMember.phong_ban
    };
  };

  const mapVietnameseProductToEnglish = (vnItem: any): Product => {
    return {
      id: vnItem.ma_san_pham || vnItem.id,
      name: vnItem.ten_san_pham || vnItem.name,
      category: vnItem.danh_muc || vnItem.category,
      price: vnItem.gia_ban || vnItem.price,
      stock: vnItem.ton_kho || vnItem.stock,
      image: vnItem.anh_san_pham || vnItem.hinh_anh || vnItem.image,
      desc: vnItem.mo_ta || vnItem.desc
    };
  };

  const mapVietnameseCustomerToEnglish = (vnItem: any): Customer => {
    return {
      id: vnItem.ma_khach_hang || vnItem.id,
      name: vnItem.ten || vnItem.ho_ten || vnItem.name,
      phone: vnItem.sdt || vnItem.so_dien_thoai || vnItem.phone,
      email: vnItem.email || '',
      address: vnItem.dia_chi || vnItem.address,
      tier: vnItem.hang_thanh_vien || vnItem.hang_khach || vnItem.tier || 'Standard',
      totalSpent: vnItem.tong_chi_tieu || vnItem.totalSpent || 0,
      lastVisit: vnItem.lan_cuoi_ghe || vnItem.lan_ghe_gan_nhat || vnItem.lastVisit || '',
      notes: vnItem.ghi_chu || vnItem.notes,
      source: vnItem.nguon_khach || vnItem.source,
      status: vnItem.trang_thai || vnItem.status,
      assigneeId: vnItem.id_nhan_vien_phu_trach || vnItem.assigneeId,
      interactionCount: vnItem.so_lan_tuong_tac || vnItem.interactionCount,
      group: vnItem.nhom_khach || vnItem.group
    };
  };

  // --- 1. Load dữ liệu từ Supabase (Realtime) ---
  const loadOrders = async () => {
    try {
      // Load orders và items song song (tối ưu: giảm limit và chỉ select cần thiết)
      const [ordersResult, itemsResult] = await Promise.all([
        supabase
          .from(DB_TABLES.ORDERS)
          .select('id, id_khach_hang, ten_khach_hang, tong_tien, tien_coc, trang_thai, ngay_du_kien_giao, ghi_chu, ngay_tao')
          .order('ngay_tao', { ascending: false })
          .limit(20), // Giảm xuống 20 để tăng tốc độ
        supabase
          .from(DB_TABLES.SERVICE_ITEMS)
          .select('id, id_don_hang, ten_hang_muc, loai, don_gia, so_luong, trang_thai, id_ky_thuat_vien, la_san_pham, id_dich_vu_goc, id_quy_trinh')
          .limit(100) // Giảm xuống 100 để tăng tốc độ
      ]);

      if (ordersResult.error) {
        console.error('Error loading orders:', ordersResult.error);
        throw ordersResult.error;
      }

      if (itemsResult.error) {
        console.error('Error loading service items:', itemsResult.error);
        // Vẫn tiếp tục với orders, chỉ không có items
      }

      // Group items by order_id
      const itemsByOrder = new Map<string, any[]>();
      (itemsResult.data || []).forEach((item: any) => {
        const orderId = item.id_don_hang;
        if (!itemsByOrder.has(orderId)) {
          itemsByOrder.set(orderId, []);
        }
        itemsByOrder.get(orderId)!.push(item);
      });

      // Map orders với items (bao gồm cả orders không có items)
      const ordersList: Order[] = (ordersResult.data || []).map((order: any) => {
        return mapVietnameseOrderToEnglish({
          ...order,
          danh_sach_dich_vu: itemsByOrder.get(order.id) || []
        });
      });

      setOrders(ordersList);
    } catch (error) {
      console.error('Error loading orders:', error);
      setOrders([]);
    }
  };

  const loadInventory = async () => {
    try {
      const { data, error } = await supabase
        .from(DB_TABLES.INVENTORY)
        .select('id, ma_sku, ten_vat_tu, danh_muc, so_luong_ton, don_vi_tinh, nguong_toi_thieu, gia_nhap, nha_cung_cap, lan_nhap_cuoi, anh_vat_tu')
        .order('ten_vat_tu')
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
      const startTime = performance.now();
      const { data, error } = await supabase
        .from(DB_TABLES.MEMBERS)
        .select('id, ho_ten, vai_tro, sdt, email, trang_thai, anh_dai_dien, chuyen_mon, phong_ban')
        .order('ho_ten')
        .limit(100); // Giới hạn để tăng tốc độ

      if (error) {
        console.error('Error loading members:', error);
        setMembers([]);
        return;
      }

      const membersList = (data || []).map(mapVietnameseMemberToEnglish);
      const loadTime = performance.now() - startTime;

      setMembers(membersList);
    } catch (error) {
      console.error('Error loading members:', error);
      setMembers([]);
    }
  };

  const loadProducts = async () => {
    try {
      const startTime = performance.now();
      const { data, error } = await supabase
        .from(DB_TABLES.PRODUCTS)
        .select('id, ten_san_pham, danh_muc, gia_ban, ton_kho, anh_san_pham, mo_ta')
        .order('ten_san_pham')
        .limit(100); // Giảm limit để tăng tốc độ

      if (error) {
        console.error('Error loading products:', error);
        setProducts([]);
        return;
      }

      const productsList = (data || []).map(mapVietnameseProductToEnglish);
      const loadTime = performance.now() - startTime;

      setProducts(productsList);
    } catch (error) {
      console.error('Error loading products:', error);
      setProducts([]);
    }
  };

  const loadCustomers = async () => {
    try {
      const startTime = performance.now();
      const { data, error } = await supabase
        .from(DB_TABLES.CUSTOMERS)
        .select('id, ten, sdt, email, dia_chi, hang_thanh_vien, tong_chi_tieu, lan_cuoi_ghe, ghi_chu, nguon_khach, trang_thai, id_nhan_vien_phu_trach, so_lan_tuong_tac, nhom_khach')
        .order('ten')
        .limit(100); // Giảm limit để tăng tốc độ

      if (error) {
        console.error('Error loading customers:', error);
        setCustomers([]);
        return;
      }

      const customersList = (data || []).map(mapVietnameseCustomerToEnglish);
      const loadTime = performance.now() - startTime;

      setCustomers(customersList);
    } catch (error) {
      console.error('Error loading customers:', error);
      setCustomers([]);
    }
  };

  useEffect(() => {
    const startTime = performance.now();

    // Set loading = false NGAY LẬP TỨC để UI hiển thị (không block UI)
    setIsLoading(false);

    // Load TẤT CẢ data song song cùng lúc (không block UI)
    Promise.allSettled([
      loadOrders(),
      loadInventory(),
      loadMembers(),
      loadProducts(),
      loadCustomers()
    ])
      .then(() => {
        const totalTime = performance.now() - startTime;
      })
      .catch((err) => {
        console.error('Error loading data:', err);
      });

    // Setup real-time listeners SAU KHI load xong (delay 3s để không làm chậm initial load)
    let channel: any = null;
    const setupRealtime = () => {
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
          () => debouncedReload(loadOrders)
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: DB_TABLES.SERVICE_ITEMS },
          () => debouncedReload(loadOrders)
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
        .subscribe();
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

  // --- 2. Thêm Đơn Hàng & Trừ Kho ---
  const addOrder = async (newOrder: Order) => {
    try {
      // Lưu đơn hàng vào Supabase (KHÔNG gửi id - để database tự tạo)
      const orderData = {
        id_khach_hang: newOrder.customerId,
        ten_khach_hang: newOrder.customerName,
        tong_tien: newOrder.totalAmount,
        tien_coc: newOrder.deposit || 0,
        trang_thai: newOrder.status,
        ngay_du_kien_giao: newOrder.expectedDelivery || null,
        ghi_chu: newOrder.notes || ''
      };

      // Insert order và lấy ID ngay (cần ID để link items)
      const { data: savedOrder, error: orderError } = await supabase
        .from(DB_TABLES.ORDERS)
        .insert(orderData)
        .select('id')
        .single();

      if (orderError) throw orderError;

      const orderId = savedOrder?.id;
      if (!orderId) throw new Error('Không thể lấy ID đơn hàng sau khi tạo');

      // Lưu từng item vào bảng hang_muc_dich_vu (KHÔNG gửi id - để database tự tạo)
      const itemsToInsert = newOrder.items.map(item => {
        const itemData: any = {
          id_don_hang: orderId, // Dùng orderId từ database
          ten_hang_muc: item.name,
          loai: item.type,
          don_gia: item.price,
          so_luong: item.quantity || 1,
          trang_thai: item.status,
          la_san_pham: item.isProduct || false
        };

        // Chỉ thêm optional fields nếu có giá trị
        if (item.technicianId) itemData.id_ky_thuat_vien = item.technicianId;
        if (item.beforeImage) itemData.anh_truoc = item.beforeImage;
        if (item.afterImage) itemData.anh_sau = item.afterImage;
        if (item.serviceId) itemData.id_dich_vu_goc = item.serviceId;
        if (item.workflowId) itemData.id_quy_trinh = item.workflowId;
        if (item.history && item.history.length > 0) itemData.lich_su_thuc_hien = item.history;
        if (item.lastUpdated) itemData.cap_nhat_cuoi = item.lastUpdated;
        if (item.technicalLog && item.technicalLog.length > 0) itemData.nhat_ky_ky_thuat = item.technicalLog;

        return itemData;
      });

      if (itemsToInsert.length > 0) {
        // Batch insert tất cả items cùng lúc
        const { error: itemsError } = await supabase
          .from(DB_TABLES.SERVICE_ITEMS)
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

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
      // Update order
      const orderData = {
        id_khach_hang: updatedOrder.customerId,
        ten_khach_hang: updatedOrder.customerName,
        tong_tien: updatedOrder.totalAmount,
        tien_coc: updatedOrder.deposit || 0,
        trang_thai: updatedOrder.status,
        ngay_du_kien_giao: updatedOrder.expectedDelivery || null,
        ghi_chu: updatedOrder.notes || ''
      };

      const { error: orderError } = await supabase
        .from(DB_TABLES.ORDERS)
        .update(orderData)
        .eq('id', orderId);

      if (orderError) throw orderError;

      // Dùng upsert thay vì delete + insert (nhanh hơn)
      if (updatedOrder.items.length > 0) {
        const itemsToUpsert = updatedOrder.items.map(item => {
          const itemData: any = {
            id: item.id,
            id_don_hang: orderId,
            ten_hang_muc: item.name,
            loai: item.type,
            don_gia: item.price,
            so_luong: item.quantity || 1,
            trang_thai: item.status,
            la_san_pham: item.isProduct || false
          };

          // Chỉ thêm optional fields nếu có giá trị
          if (item.technicianId) itemData.id_ky_thuat_vien = item.technicianId;
          if (item.beforeImage) itemData.anh_truoc = item.beforeImage;
          if (item.afterImage) itemData.anh_sau = item.afterImage;
          if (item.serviceId) itemData.id_dich_vu_goc = item.serviceId;
          if (item.workflowId) itemData.id_quy_trinh = item.workflowId;
          if (item.history && item.history.length > 0) itemData.lich_su_thuc_hien = item.history;
          if (item.lastUpdated) itemData.cap_nhat_cuoi = item.lastUpdated;
          if (item.technicalLog && item.technicalLog.length > 0) itemData.nhat_ky_ky_thuat = item.technicalLog;

          return itemData;
        });

        // Upsert (insert or update) tất cả items cùng lúc
        const { error: itemsError } = await supabase
          .from(DB_TABLES.SERVICE_ITEMS)
          .upsert(itemsToUpsert, { onConflict: 'id' });

        if (itemsError) throw itemsError;

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
      // Lấy item hiện tại từ Supabase
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

      const now = Date.now();
      const currentHistory = (itemData.lich_su_thuc_hien || []) as any[];
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
        stageName: newStatus,
        enteredAt: now,
        performedBy: user
      });

      // Xử lý Log (Ghi chú)
      let newLog = (itemData.nhat_ky_ky_thuat || []) as any[];
      if (note) {
        newLog.push({
          id: Date.now().toString(),
          content: note,
          author: user,
          timestamp: new Date().toLocaleString('vi-VN'),
          stage: newStatus
        });
      }

      // Cập nhật lên Supabase
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

      if (updateError) throw updateError;
    } catch (error) {
      console.error('Error updating order item status:', error);
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
      const itemData = {
        ma_sku: updatedItem.sku,
        ten_vat_tu: updatedItem.name,
        danh_muc: updatedItem.category,
        so_luong_ton: updatedItem.quantity,
        don_vi_tinh: updatedItem.unit,
        nguong_toi_thieu: updatedItem.minThreshold || 0,
        gia_nhap: updatedItem.importPrice || 0,
        nha_cung_cap: updatedItem.supplier || null,
        lan_nhap_cuoi: updatedItem.lastImport || null,
        anh_vat_tu: updatedItem.image || null
      };

      const { error } = await supabase
        .from(DB_TABLES.INVENTORY)
        .update(itemData)
        .eq('id', itemId);

      if (error) throw error;
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
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      throw error;
    }
  };

  // Thêm vật tư mới
  const addInventoryItem = async (newItem: InventoryItem) => {
    try {
      // KHÔNG gửi id - để database tự tạo
      const itemData = {
        ma_sku: newItem.sku,
        ten_vat_tu: newItem.name,
        danh_muc: newItem.category,
        so_luong_ton: newItem.quantity,
        don_vi_tinh: newItem.unit,
        nguong_toi_thieu: newItem.minThreshold || 0,
        gia_nhap: newItem.importPrice || 0,
        nha_cung_cap: newItem.supplier || null,
        lan_nhap_cuoi: newItem.lastImport || null,
        anh_vat_tu: newItem.image || null
      };

      const { error } = await supabase
        .from(DB_TABLES.INVENTORY)
        .insert(itemData);

      if (error) throw error;
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
        chuyen_mon: updatedMember.specialty || null,
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
        chuyen_mon: newMember.specialty || null,
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
        hang_thanh_vien: newCustomer.tier || 'thuong',
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
      const customerData = {
        ten: updatedCustomer.name,
        sdt: updatedCustomer.phone,
        email: updatedCustomer.email || null,
        dia_chi: updatedCustomer.address || null,
        hang_thanh_vien: updatedCustomer.tier || 'thuong',
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

      if (error) throw error;
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
      orders, inventory, members, products, customers,
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