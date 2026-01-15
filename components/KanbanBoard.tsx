import { AlertTriangle, Briefcase, Calendar, ChevronRight, Clock, Columns, History, Layers, ListChecks, MoreHorizontal, RotateCcw, User, X, XCircle } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MOCK_MEMBERS } from '../constants';
import { useAppStore } from '../context';
import { DB_PATHS, supabase } from '../supabase';
import { Order, OrderStatus, ServiceCatalogItem, ServiceItem, ServiceType, WorkflowDefinition, WorkflowStage } from '../types';
import { EditStageTasksModal } from './EditStageTasksModal';

interface KanbanItem extends ServiceItem {
  orderId: string;
  customerName: string;
  expectedDelivery: string;
  cancelReason?: string;
  note?: string;
}

interface ActivityLog {
  id: string;
  user: string;
  userAvatar?: string;
  action: string;
  itemName: string;
  timestamp: string;
  details?: string;
  type: 'info' | 'warning' | 'danger';
}

// Default columns fallback
const DEFAULT_COLUMNS = [
  { id: 'In Queue', title: 'Chờ Xử Lý', color: 'bg-neutral-900', dot: 'bg-slate-500' },
  { id: 'Cleaning', title: 'Vệ Sinh', color: 'bg-blue-900/10', dot: 'bg-blue-500' },
  { id: 'Repairing', title: 'Sửa Chữa', color: 'bg-orange-900/10', dot: 'bg-orange-500' },
  { id: 'QC', title: 'Kiểm Tra (QC)', color: 'bg-purple-900/10', dot: 'bg-purple-500' },
  { id: 'Ready', title: 'Hoàn Thành', color: 'bg-emerald-900/10', dot: 'bg-emerald-500' },
];
// Fallback user since MOCK_MEMBERS is now empty
const CURRENT_USER = MOCK_MEMBERS[0] || {
  id: 'system',
  name: 'Hệ thống',
  role: 'Quản lý' as const,
  phone: '',
  email: '',
  status: 'Active' as const
};

// Helper to remove undefined values before saving to Supabase
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

// Utility for formatting date (only date, no time)
const formatDate = (date: string | Date | undefined | null): string => {
  if (!date) return '';
  try {
    let dateObj: Date;

    if (typeof date === 'string') {
      // Handle ISO string format: 2026-01-17T00:00:00+00:00 or 2026-01-17
      // Extract just the date part before 'T' if exists to avoid timezone issues
      const datePart = date.split('T')[0];

      // If it's in format YYYY-MM-DD, parse it correctly (local time, no timezone conversion)
      if (datePart.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = datePart.split('-').map(Number);
        dateObj = new Date(year, month - 1, day); // month is 0-indexed, creates date in local time
      } else {
        // Try parsing as normal date string
        dateObj = new Date(date);
      }
    } else {
      dateObj = date;
    }

    if (isNaN(dateObj.getTime())) {
      // If invalid date, try to parse Vietnamese date format (dd/mm/yyyy)
      if (typeof date === 'string') {
        const parts = date.split('/');
        if (parts.length === 3) {
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1;
          const year = parseInt(parts[2]);
          const parsedDate = new Date(year, month, day);
          if (!isNaN(parsedDate.getTime())) {
            return parsedDate.toLocaleDateString('vi-VN', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            });
          }
        }
      }
      // If all parsing fails, try to extract date part from ISO string
      if (typeof date === 'string' && date.includes('T')) {
        const datePart = date.split('T')[0];
        const [year, month, day] = datePart.split('-');
        if (year && month && day) {
          return `${day}/${month}/${year}`;
        }
      }
      return date.toString(); // Return original if all parsing fails
    }

    // Format to Vietnamese date format (dd/mm/yyyy) - no timezone conversion
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Error formatting date:', error, date);
    // Fallback: try to extract date part from ISO string
    if (typeof date === 'string' && date.includes('T')) {
      const datePart = date.split('T')[0];
      const [year, month, day] = datePart.split('-');
      if (year && month && day) {
        return `${day}/${month}/${year}`;
      }
    }
    return typeof date === 'string' ? date : '';
  }
};

// Helper to check if string is a UUID
const isUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

export const KanbanBoard: React.FC = () => {
  const { orders, setOrders, updateOrderItemStatus, updateOrder, members, workflows } = useAppStore();
  // REMOVED local orders state to use global store for optimistic updates
  // const [orders, setOrders] = useState<Order[]>([]);
  const [services, setServices] = useState<ServiceCatalogItem[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [showOrderSelector, setShowOrderSelector] = useState(false);
  const initializedRef = useRef(false);
  const orderSelectorRef = useRef<HTMLDivElement>(null);

  // Safe orders check
  const safeOrders = Array.isArray(orders) ? orders : [];

  // Helper functions for mapping data
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

  const mapOrderStatusFromDb = (dbValue: string | null | undefined): OrderStatus => {
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
        assignedMembers: item.nhan_vien_phu_trach || item.assignedMembers,
        stageAssignments: item.gan_nhan_vien_theo_buoc || item.stageAssignments
      })),
      totalAmount: vnOrder.tong_tien || vnOrder.totalAmount || 0,
      deposit: vnOrder.tien_coc || vnOrder.dat_coc || vnOrder.deposit || 0,
      status: mapOrderStatusFromDb(vnOrder.trang_thai),
      createdAt: vnOrder.ngay_tao || vnOrder.createdAt || new Date().toISOString(),
      expectedDelivery: vnOrder.ngay_du_kien_giao || vnOrder.expectedDelivery || '',
      notes: vnOrder.ghi_chu || vnOrder.notes,
      discount: vnOrder.giam_gia || vnOrder.discount,
      additionalFees: vnOrder.phu_phi || vnOrder.additionalFees
    };
  };

  // Load Orders from Supabase
  useEffect(() => {
    const loadOrders = async () => {
      console.log('🔄 Starting to load orders from Supabase...');
      try {
        // Load orders
        const ordersResult = await supabase
          .from(DB_PATHS.ORDERS)
          .select('id, id_khach_hang, ten_khach_hang, tong_tien, tien_coc, trang_thai, ngay_du_kien_giao, ghi_chu, ngay_tao')
          .limit(100);

        if (ordersResult.error) {
          console.error('❌ Error loading orders:', ordersResult.error);
          setOrders([]);
          return;
        }

        // Load items separately
        const itemsResult = await supabase
          .from(DB_PATHS.SERVICE_ITEMS)
          .select('id, id_don_hang, ten_hang_muc, loai, don_gia, so_luong, trang_thai, id_ky_thuat_vien, la_san_pham, id_dich_vu_goc, id_quy_trinh, anh_truoc, anh_sau, lich_su_thuc_hien, nhat_ky_ky_thuat, cap_nhat_cuoi, phan_cong_tasks, gan_nhan_vien_theo_buoc, nhan_vien_phu_trach')
          .limit(500);

        if (itemsResult.error) {
          console.error('Error loading service items:', itemsResult.error);
        }

        // Group items by order_id
        const itemsByOrder = new Map<string, any[]>();
        (itemsResult.data || []).forEach((item: any) => {
          const orderId = item.id_don_hang;
          if (orderId) {
            if (!itemsByOrder.has(orderId)) {
              itemsByOrder.set(orderId, []);
            }
            itemsByOrder.get(orderId)!.push(item);
          }
        });

        // Map orders với items
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

        console.log('✅ Orders loaded from Supabase:', {
          count: ordersList.length,
          sample: ordersList[0] ? {
            id: ordersList[0].id,
            customerName: ordersList[0].customerName,
            itemsCount: ordersList[0].items?.length || 0
          } : null
        });

        setOrders(ordersList);
      } catch (error) {
        console.error('❌ Error loading orders (catch):', error);
        setOrders([]);
      }
    };

    loadOrders();

    // Real-time sync for orders
    const channel = supabase
      .channel('kanban-orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: DB_PATHS.ORDERS,
        },
        async () => {
          console.log('🔄 Order changed, reloading...');
          const ordersResult = await supabase
            .from(DB_PATHS.ORDERS)
            .select('id, id_khach_hang, ten_khach_hang, tong_tien, tien_coc, trang_thai, ngay_du_kien_giao, ghi_chu, ngay_tao')
            .limit(100);

          if (!ordersResult.error && ordersResult.data) {
            const itemsResult = await supabase
              .from(DB_PATHS.SERVICE_ITEMS)
              .select('id, id_don_hang, ten_hang_muc, loai, don_gia, so_luong, trang_thai, id_ky_thuat_vien, la_san_pham, id_dich_vu_goc, id_quy_trinh, anh_truoc, anh_sau, lich_su_thuc_hien, nhat_ky_ky_thuat, cap_nhat_cuoi, phan_cong_tasks, gan_nhan_vien_theo_buoc, nhan_vien_phu_trach')
              .limit(500);

            const itemsByOrder = new Map<string, any[]>();
            (itemsResult.data || []).forEach((item: any) => {
              const orderId = item.id_don_hang;
              if (orderId) {
                if (!itemsByOrder.has(orderId)) {
                  itemsByOrder.set(orderId, []);
                }
                itemsByOrder.get(orderId)!.push(item);
              }
            });

            const ordersList: Order[] = (ordersResult.data || []).map((order: any) => {
              try {
                return mapVietnameseOrderToEnglish({
                  ...order,
                  danh_sach_dich_vu: itemsByOrder.get(order.id) || []
                });
              } catch (error) {
                return null;
              }
            }).filter((order): order is Order => order !== null);

            setOrders(ordersList);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: DB_PATHS.SERVICE_ITEMS,
        },
        async () => {
          console.log('🔄 Service item changed, reloading orders...');
          // Reload orders to get updated items
          const ordersResult = await supabase
            .from(DB_PATHS.ORDERS)
            .select('id, id_khach_hang, ten_khach_hang, tong_tien, tien_coc, trang_thai, ngay_du_kien_giao, ghi_chu, ngay_tao')
            .limit(100);

          if (!ordersResult.error && ordersResult.data) {
            const itemsResult = await supabase
              .from(DB_PATHS.SERVICE_ITEMS)
              .select('id, id_don_hang, ten_hang_muc, loai, don_gia, so_luong, trang_thai, id_ky_thuat_vien, la_san_pham, id_dich_vu_goc, id_quy_trinh, anh_truoc, anh_sau, lich_su_thuc_hien, nhat_ky_ky_thuat, cap_nhat_cuoi, phan_cong_tasks, gan_nhan_vien_theo_buoc, nhan_vien_phu_trach')
              .limit(500);

            const itemsByOrder = new Map<string, any[]>();
            (itemsResult.data || []).forEach((item: any) => {
              const orderId = item.id_don_hang;
              if (orderId) {
                if (!itemsByOrder.has(orderId)) {
                  itemsByOrder.set(orderId, []);
                }
                itemsByOrder.get(orderId)!.push(item);
              }
            });

            const ordersList: Order[] = (ordersResult.data || []).map((order: any) => {
              try {
                return mapVietnameseOrderToEnglish({
                  ...order,
                  danh_sach_dich_vu: itemsByOrder.get(order.id) || []
                });
              } catch (error) {
                return null;
              }
            }).filter((order): order is Order => order !== null);

            setOrders(ordersList);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Auto select all orders on initial load
  useEffect(() => {
    if (!initializedRef.current && orders && Array.isArray(orders) && orders.length > 0) {
      try {
        const allOrderIds = new Set(orders.filter(o => o && o.id).map(o => o.id));
        if (allOrderIds.size > 0) {
          setSelectedOrderIds(allOrderIds);
          initializedRef.current = true;
        }
      } catch (error) {
        console.error('Error initializing selected orders:', error);
      }
    }
  }, [orders]);

  // Load services for workflow sequence lookup
  useEffect(() => {
    const loadServices = async () => {
      const { data, error } = await supabase
        .from(DB_PATHS.SERVICES)
        .select('*');

      if (!error && data) {
        const list = data.map(item => ({ ...item } as ServiceCatalogItem));
        console.log('📦 Services loaded:', {
          count: list.length,
          services: list.map(s => ({ id: s.id, name: s.name, workflowsCount: s.workflows?.length || 0 }))
        });
        setServices(list);
      } else {
        console.log('⚠️ No services found in Supabase');
        setServices([]);
      }
    };

    loadServices();

    const channel = supabase
      .channel('kanban-services-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: DB_PATHS.SERVICES,
        },
        async () => {
          const { data } = await supabase.from(DB_PATHS.SERVICES).select('*');
          if (data) {
            const list = data.map(item => ({ ...item } as ServiceCatalogItem));
            setServices(list);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);


  // Workflows are now loaded via AppContext - no need to load them here

  // Get workflows - ALWAYS SHOW ALL WORKFLOWS in sidebar
  const WORKFLOWS_FILTER = useMemo(() => {
    try {
      const baseFilter = [
        { id: 'ALL', label: 'Tất cả công việc', types: [] as ServiceType[], color: 'bg-neutral-800 text-slate-400' }
      ];

      // If no workflows loaded, return base filter only
      if (!workflows || workflows.length === 0) {
        console.log('⚠️ No workflows loaded, returning base filter only');
        return baseFilter;
      }

      // ALWAYS show ALL workflows in sidebar, sorted alphabetically
      console.log('📋 Showing ALL workflows in sidebar:', {
        totalWorkflows: workflows.length,
        workflows: workflows.map(w => ({ id: w.id, label: w.label }))
      });

      const allWorkflows = (workflows || [])
        .filter(wf => wf && wf.id)
        .map((wf, index) => ({ ...wf, _order: index }))
        .sort((a, b) => {
          // Sort alphabetically by label
          const labelA = (a.label || '').toLowerCase();
          const labelB = (b.label || '').toLowerCase();
          if (labelA !== labelB) {
            return labelA.localeCompare(labelB);
          }
          return a._order - b._order;
        });

      console.log('✅ All workflows sorted:', allWorkflows.map(w => ({
        id: w.id,
        label: w.label
      })));

      return [...baseFilter, ...allWorkflows.map(wf => ({
        id: wf.id,
        label: wf.label || wf.id,
        types: wf.types || [],
        color: wf.color || 'bg-neutral-800 text-slate-400'
      }))];

      /* OLD LOGIC - Filtered by selected orders (DISABLED)
      // Safe orders check
      const safeOrders = Array.isArray(orders) ? orders : [];
  
      // Get workflows from selected orders (or all orders if none selected)
      const ordersToProcess = selectedOrderIds.size > 0
        ? safeOrders.filter(o => o && o.id && selectedOrderIds.has(o.id))
        : safeOrders;
  
      if (ordersToProcess.length > 0) {
        console.log('🔍 Selected Orders:', {
          selectedCount: selectedOrderIds.size,
          ordersToProcess: ordersToProcess.map(o => ({
            id: o.id,
            itemsCount: o.items?.length || 0
          }))
        });
  
        console.log('📦 Available Services:', (services || []).map(s => ({
          id: s.id,
          name: s.name,
          workflowsCount: s.workflows?.length || 0,
          workflows: s.workflows?.map(w => ({ id: w.id, order: w.order })) || []
        })));
  
        console.log('📋 Available Workflows:', (workflows || []).map(w => ({ id: w.id, label: w.label })));
  
        // Get all workflowIds from ALL workflows in services of items
        // Use Map to store workflow order for sorting
        const workflowOrderMap = new Map<string, number>(); // workflowId -> order
        const orderWorkflowIds = new Set<string>();
  
        // Process all selected orders
        ordersToProcess.forEach(order => {
          if (order && order.items && Array.isArray(order.items)) {
            const allItems = order.items.filter(item => item && !item.isProduct);
  
            console.log('📦 All non-product items:', allItems.length);
            console.log('📦 Items details (full):', allItems.map(i => ({
              id: i.id,
              name: i.name,
              serviceId: i.serviceId,
              workflowId: i.workflowId,
              status: i.status,
              type: i.type,
              isProduct: i.isProduct,
              history: i.history ? i.history.length : 0,
              fullItemData: i
            })));
  
            allItems.forEach(item => {
              // If item has serviceId, get workflows from service
              if (item.serviceId) {
                const service = (services || []).find(s => s && s.id === item.serviceId);
                console.log('🔎 Item with service:', {
                  itemId: item.id,
                  itemName: item.name,
                  serviceId: item.serviceId,
                  serviceFound: !!service,
                  serviceName: service?.name,
                  workflowsCount: service?.workflows?.length || 0,
                  workflows: service?.workflows?.map(w => w.id) || []
                });
  
                if (service && service.workflows && Array.isArray(service.workflows) && service.workflows.length > 0) {
                  console.log('📋 Service workflows details:', {
                    serviceId: service.id,
                    serviceName: service.name,
                    workflowsCount: service.workflows.length,
                    workflows: service.workflows.map(w => ({ id: w.id, order: w.order }))
                  });
  
                  // Add ALL workflows from this service
                  service.workflows.forEach(wf => {
                    console.log('🔎 Trying to match workflow:', {
                      serviceWorkflowId: wf.id,
                      serviceWorkflowIdType: typeof wf.id,
                      serviceWorkflowOrder: wf.order
                    });
  
                    // Try to find workflow by ID first (exact match)
                    let workflowExists = (workflows || []).find(w => w && w.id === wf.id);
  
                    // If not found by ID, try to find by label (case-insensitive, trim spaces)
                    if (!workflowExists) {
                      const wfIdTrimmed = String(wf.id || '').trim();
                      workflowExists = (workflows || []).find(w => {
                        const wId = String(w.id || '').trim();
                        const wLabel = String(w.label || '').trim();
                        const wfIdLower = wfIdTrimmed.toLowerCase();
                        const wIdLower = wId.toLowerCase();
                        const wLabelLower = wLabel.toLowerCase();
  
                        // Try multiple matching strategies
                        const matches =
                          wId === wfIdTrimmed ||
                          wLabel === wfIdTrimmed ||
                          wIdLower === wfIdLower ||
                          wLabelLower === wfIdLower ||
                          wId.includes(wfIdTrimmed) ||
                          wfIdTrimmed.includes(wId) ||
                          wLabel.includes(wfIdTrimmed) ||
                          wfIdTrimmed.includes(wLabel);
  
                        if (matches) {
                          console.log('✅ Found workflow by flexible matching:', {
                            serviceWorkflowId: wf.id,
                            matchedWorkflowId: w.id,
                            matchedWorkflowLabel: w.label,
                            matchType: wId === wfIdTrimmed ? 'exact-id' :
                              wLabel === wfIdTrimmed ? 'exact-label' :
                                wIdLower === wfIdLower ? 'case-insensitive-id' :
                                  wLabelLower === wfIdLower ? 'case-insensitive-label' : 'partial'
                          });
                        }
  
                        return matches;
                      });
                    } else {
                      console.log('✅ Found workflow by exact ID match:', {
                        serviceWorkflowId: wf.id,
                        matchedWorkflowId: workflowExists.id,
                        matchedWorkflowLabel: workflowExists.label
                      });
                    }
  
                    if (workflowExists) {
                      orderWorkflowIds.add(workflowExists.id); // Use the actual workflow ID from workflows list
                      // Store order for sorting (use minimum order if workflow appears in multiple services)
                      const currentOrder = workflowOrderMap.get(workflowExists.id);
                      if (currentOrder === undefined || wf.order < currentOrder) {
                        workflowOrderMap.set(workflowExists.id, wf.order);
                      }
                      console.log('✅ Added workflow to orderWorkflowIds:', {
                        serviceWorkflowId: wf.id,
                        matchedWorkflowId: workflowExists.id,
                        workflowLabel: workflowExists.label,
                        order: wf.order
                      });
                    } else {
                      console.warn('❌ Workflow NOT FOUND in workflows list:', {
                        serviceWorkflowId: wf.id,
                        serviceWorkflowIdType: typeof wf.id,
                        serviceWorkflowIdValue: JSON.stringify(wf.id),
                        availableWorkflowIds: (workflows || []).map(w => w?.id).filter(Boolean),
                        availableWorkflowLabels: (workflows || []).map(w => w?.label).filter(Boolean),
                        allWorkflowData: (workflows || []).map(w => ({ id: w?.id, label: w?.label })).filter(w => w.id)
                      });
                    }
                  });
                } else if (service) {
                  console.warn('⚠️ Service has no workflows:', {
                    serviceId: service.id,
                    serviceName: service.name,
                    hasWorkflows: !!service.workflows,
                    workflowsType: typeof service.workflows,
                    workflowsIsArray: Array.isArray(service.workflows)
                  });
                } else {
                  console.warn('❌ Service not found:', {
                    itemId: item.id,
                    itemServiceId: item.serviceId,
                    availableServiceIds: (services || []).map(s => s?.id).filter(Boolean),
                    availableServiceNames: (services || []).map(s => s?.name).filter(Boolean)
                  });
                }
              }
  
              // If item has workflowId but no serviceId, add that workflow
              if (item.workflowId && !item.serviceId) {
                orderWorkflowIds.add(item.workflowId);
                // Set a default order (high number) for workflows without service
                if (!workflowOrderMap.has(item.workflowId)) {
                  workflowOrderMap.set(item.workflowId, 999);
                }
                console.log('✅ Added workflow from item.workflowId:', item.workflowId);
              }
  
              // If item has neither serviceId nor workflowId, we'll show all workflows as fallback
              if (!item.serviceId && !item.workflowId) {
                console.warn('⚠️ Item has no serviceId and no workflowId:', {
                  itemId: item.id,
                  itemName: item.name
                });
              }
            });
          }
        });
  
        // If no workflows found from services, show all workflows (fallback)
        if (orderWorkflowIds.size === 0) {
          console.log('⚠️ No workflows found from services, showing ALL workflows as fallback');
          (workflows || []).forEach((wf, index) => {
            if (wf && wf.id) {
              orderWorkflowIds.add(wf.id);
              if (!workflowOrderMap.has(wf.id)) {
                // Use index as order to maintain some sorting
                workflowOrderMap.set(wf.id, index);
              }
            }
          });
        }
  
        console.log('📋 Order Workflow IDs (Set):', Array.from(orderWorkflowIds));
        console.log('📋 Workflow Order Map:', Array.from(workflowOrderMap.entries()));
        console.log('📋 Total workflows in system:', (workflows || []).length);
        console.log('📋 All workflow IDs in system:', (workflows || []).map(w => w?.id).filter(Boolean));
  
        // Filter workflows to only include those from services in this order
        // Sort by order from service.workflows
        const assignedWorkflows = (workflows || [])
          .filter(wf => wf && wf.id && orderWorkflowIds.has(wf.id))
          .sort((a, b) => {
            const orderA = workflowOrderMap.get(a.id) ?? 999;
            const orderB = workflowOrderMap.get(b.id) ?? 999;
            return orderA - orderB;
          })
          .map(wf => ({
            id: wf.id,
            label: wf.label || wf.id,
            types: wf.types || [],
            color: wf.color || 'bg-neutral-800 text-slate-400'
          }));
  
        console.log('🎯 Assigned Workflows (filtered & sorted):', {
          count: assignedWorkflows.length,
          workflows: assignedWorkflows.map(w => ({
            id: w.id,
            label: w.label
          }))
        });
        console.log('🎯 All Available Workflows in system:', (workflows || []).map(w => ({ id: w?.id, label: w?.label })).filter(w => w.id));
  
        // If no workflows found, show all workflows as fallback
        if (assignedWorkflows.length === 0) {
          console.log('⚠️ No assigned workflows found, showing ALL workflows as fallback');
          const allWorkflowsFallback = (workflows || [])
            .filter(wf => wf && wf.id)
            .map((wf, index) => ({
              id: wf.id,
              label: wf.label || wf.id,
              types: wf.types || [],
              color: wf.color || 'bg-neutral-800 text-slate-400'
            }));
          return [...baseFilter, ...allWorkflowsFallback];
        }
  
        return [...baseFilter, ...assignedWorkflows];
      }
  
      // If no orders to process, show ALL workflows (simplified fallback)
      console.log('⚠️ No orders to process, showing ALL workflows');
      const allWorkflows = (workflows || [])
        .filter(wf => wf && wf.id)
        .map((wf, index) => ({ ...wf, _order: index }))
        .sort((a, b) => {
          // Try to maintain some order if workflows have labels
          const labelA = (a.label || '').toLowerCase();
          const labelB = (b.label || '').toLowerCase();
          if (labelA !== labelB) {
            return labelA.localeCompare(labelB);
          }
          return a._order - b._order;
        });
  
      console.log('📋 Showing all workflows (no orders):', allWorkflows.map(w => ({
        id: w.id,
        label: w.label
      })));
      
      return [...baseFilter, ...allWorkflows.map(wf => ({
        id: wf.id,
        label: wf.label,
        types: wf.types || [],
        color: wf.color || 'bg-neutral-800 text-slate-400'
      }))];
      */
    } catch (error) {
      console.error('Error in WORKFLOWS_FILTER:', error);
      return [{ id: 'ALL', label: 'Tất cả công việc', types: [] as ServiceType[], color: 'bg-neutral-800 text-slate-400' }];
    }
  }, [workflows]); // Removed dependencies on orders, services, selectedOrderIds - only depends on workflows

  // Helper to map old status to new stage IDs - must be defined before useMemo that uses it
  const mapStatusToStageId = (status: string): string => {
    const statusMap: Record<string, string> = {
      'In Queue': 'in-queue',
      'Cleaning': 'cleaning',
      'Repairing': 'repairing',
      'QC': 'qc',
      'Ready': 'ready',
      'Done': 'ready'
    };
    return statusMap[status] || status.toLowerCase().replace(/\s+/g, '-');
  };

  const items: KanbanItem[] = useMemo(() => {
    // Log workflows state when computing items
    console.log('🔍 Computing items - workflows state:', {
      workflowsCount: workflows?.length || 0,
      workflows: (workflows || []).map(w => ({ id: w.id, label: w.label, stagesCount: w.stages?.length || 0 })),
      servicesCount: services?.length || 0,
      ordersCount: orders?.length || 0
    });


    // Helper to normalize status to UUID of first stage in workflow

    const normalizeStatusToStageUUID = (item: any, wfId: string | undefined): string => {
      const currentStatus = item.status || 'cho_xu_ly';

      // CRITICAL: Don't normalize special statuses (done, cancel, etc.)
      const specialStatuses = ['done', 'cancel', 'delivered', 'hoan_thanh', 'da_giao', 'huy'];
      if (specialStatuses.includes(currentStatus.toLowerCase())) {
        return currentStatus; // Keep special status as-is
      }

      // If no workflowId, return original status
      if (!wfId) {
        console.warn('⚠️ No workflowId for item, returning original status:', {
          itemId: item.id,
          itemName: item.name,
          status: currentStatus
        });
        return currentStatus;
      }

      // Check if workflows are loaded
      if (!workflows || workflows.length === 0) {
        console.warn('⚠️ Workflows not loaded yet, returning original status. Will retry when workflows load:', {
          itemId: item.id,
          itemName: item.name,
          status: currentStatus,
          workflowId: wfId,
          workflowsCount: workflows?.length || 0
        });
        return currentStatus; // Return original, items will be recomputed when workflows load
      }

      // Find workflow
      const wf = workflows.find(w => w && w.id === wfId);
      if (!wf) {
        console.warn('⚠️ Workflow not found in workflows state:', {
          itemId: item.id,
          itemName: item.name,
          status: currentStatus,
          workflowId: wfId,
          availableWorkflowIds: workflows.map(w => w.id),
          workflowsCount: workflows.length
        });
        // FORCE RETURN CURRENT STATUS if valid UUID, might be optimistic update with stale workflow state
        if (isUUID(currentStatus)) return currentStatus;
        return currentStatus;
      }

      // If status is already a UUID, check if it exists in workflow stages
      if (isUUID(currentStatus)) {
        if (wf.stages) {
          const stageExists = wf.stages.some(s => s.id === currentStatus);
          if (stageExists) {
            return currentStatus; // Valid UUID that exists in workflow
          }
        }
        // UUID exists but not in workflow, will normalize to first stage below
      } else {
        // Status is not a UUID - try to match by stage name first
        if (wf.stages && wf.stages.length > 0) {
          const statusLower = currentStatus.toLowerCase().trim();
          const matchingStage = wf.stages.find(s => {
            const stageNameLower = (s.name || '').toLowerCase().trim();
            return stageNameLower === statusLower || s.id.toLowerCase() === statusLower;
          });
          if (matchingStage) {
            console.log('✅ Found stage by name match:', {
              oldStatus: currentStatus,
              newStatus: matchingStage.id,
              stageName: matchingStage.name,
              workflowId: wfId,
              workflowName: wf.label
            });
            return matchingStage.id;
          }
        }
      }

      // Status is not a UUID or doesn't match any stage, get first stage UUID
      if (wf.stages && wf.stages.length > 0) {
        const sortedStages = [...wf.stages].sort((a, b) => (a.order || 0) - (b.order || 0));
        const firstStageId = sortedStages[0].id;
        console.log('🔄 Normalizing status to first stage:', {
          oldStatus: currentStatus,
          newStatus: firstStageId,
          workflowId: wfId,
          workflowName: wf.label,
          stageName: sortedStages[0].name
        });
        return firstStageId;
      }

      // Fallback: return original status if workflow has no stages
      console.warn('⚠️ Workflow found but has no stages:', {
        itemId: item.id,
        itemName: item.name,
        status: currentStatus,
        workflowId: wfId,
        workflowName: wf.label,
        stagesCount: wf.stages?.length || 0
      });
      return currentStatus;
    };

    const allItems = (orders || []).flatMap(order => {
      if (!order.items || !Array.isArray(order.items)) return [];

      // 1. Process items first (normalize status, add metadata)
      const processedItems = order.items
        .filter(item => item && !item.isProduct)
        .map(item => {
          // Determine workflowId from service if not already set
          let workflowId = item.workflowId;

          // If no workflowId but has serviceId, get from service
          if (!workflowId && item.serviceId) {
            const service = (services || []).find(s => s && s.id === item.serviceId);
            if (service && service.workflows && Array.isArray(service.workflows) && service.workflows.length > 0) {
              // Get current workflow from item history, or use first workflow from service
              if (item.history && item.history.length > 0) {
                // Try to find workflow that matches current status
                const currentStageId = item.status;
                const matchingWf = service.workflows.find(wf => {
                  const wfDef = (workflows || []).find(w => w && w.id === wf.id);
                  if (wfDef && wfDef.stages) {
                    return wfDef.stages.some(s => s.id === currentStageId);
                  }
                  return false;
                });
                if (matchingWf) {
                  workflowId = matchingWf.id;
                } else {
                  // Use first workflow if no match
                  const sortedWorkflows = [...service.workflows].sort((a, b) => a.order - b.order);
                  workflowId = sortedWorkflows[0].id;
                }
              } else {
                // No history, use first workflow
                const sortedWorkflows = [...service.workflows].sort((a, b) => a.order - b.order);
                workflowId = sortedWorkflows[0].id;
              }
            }
          }

          // Normalize status to UUID of first stage if needed
          const normalizedStatus = normalizeStatusToStageUUID(item, workflowId);

          // Generate ID as {orderId}-{serviceId} if serviceId exists
          // Otherwise use existing item.id
          // Fix 406 error: Always use the real database ID
          const itemId = item.id;

          return {
            ...item,
            id: itemId,
            orderId: order.id,
            customerName: order.customerName,
            expectedDelivery: order.expectedDelivery,
            workflowId: workflowId,
            status: normalizedStatus // Use normalized status
          };
        });

      // 2. Return all processed items (Matrix View needs full list)
      return processedItems;
    });

    console.log('📦 Kanban items created:', {
      totalOrders: orders.length,
      totalItems: allItems.length,
      items: allItems.map(i => ({
        id: i.id,
        orderId: i.orderId,
        name: i.name,
        status: i.status,
        type: i.type,
        workflowId: i.workflowId,
        serviceId: i.serviceId,
        isProduct: i.isProduct,
        hasHistory: !!(i.history && i.history.length > 0)
      })),
      itemsWithoutWorkflow: allItems.filter(i => !i.workflowId && !i.serviceId).length,
      itemsWithWorkflowId: allItems.filter(i => !!i.workflowId).length,
      itemsWithServiceId: allItems.filter(i => !!i.serviceId).length,
      availableWorkflows: (workflows || []).map(w => ({ id: w.id, label: w.label, stagesCount: w.stages?.length || 0 }))
    });

    return allItems;
  }, [orders, workflows, services]);

  const [draggedItem, setDraggedItem] = useState<KanbanItem | null>(null);
  const [activeWorkflow, setActiveWorkflow] = useState<string>('ALL');
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  // Visible Kanban Items: Apply sequential filtering for Kanban columns ONLY
  // Matrix View continues to use full 'items' list
  const visibleKanbanItems = useMemo(() => {
    if (activeWorkflow === 'ALL') {
      // Matrix View: return ALL items (no filtering)
      return items;
    }

    // Kanban Columns View: apply sequential visibility logic
    const processedItems = items;

    // Group items by Service ID
    const serviceIds: string[] = Array.from(new Set(processedItems.map(i => i.serviceId).filter((id): id is string => !!id)));

    // If no services or only 1 service, return all items
    if (serviceIds.length <= 1) return processedItems;

    // Find the first "Active" or "Incomplete" service
    let activeServiceId: string | null = null;

    for (const serviceId of serviceIds) {
      if (!serviceId) continue;

      const serviceItems = processedItems.filter(i => i.serviceId === serviceId);

      // Check if this service is completed
      const isCompleted = serviceItems.every(i => {
        const status = i.status.toLowerCase();
        return ['done', 'cancel', 'delivered', 'hoan_thanh', 'da_giao', 'huy'].includes(status) ||
          (workflows || []).some(w => w.id === i.workflowId && w.stages?.find(s => s.id === i.status)?.name === 'Done');
      });

      if (!isCompleted) {
        activeServiceId = serviceId;
        break;
      }
    }

    // If all services are completed, return all items
    if (!activeServiceId) return processedItems;

    const activeServiceIndex = serviceIds.indexOf(activeServiceId);

    return processedItems.filter(item => {
      if (!item.serviceId) return true;
      const itemServiceIndex = serviceIds.indexOf(item.serviceId);
      // ONLY SHOW: Completed services AND The current active service.
      return itemServiceIndex <= activeServiceIndex;
    });
  }, [items, activeWorkflow, workflows]);

  const [showHistory, setShowHistory] = useState(false);
  const [selectedItem, setSelectedItem] = useState<KanbanItem | null>(null);
  const [editingStage, setEditingStage] = useState<{ stageId: string; stageName: string } | null>(null);

  // Get columns from active workflow
  const columns = useMemo(() => {
    if (activeWorkflow === 'ALL') {

      // If orders are selected, only show ALL workflows from services of items in those orders
      // If no orders selected, don't show any workflows
      if (selectedOrderIds.size === 0) {
        console.log('⚠️ No selected orders, returning empty columns');
        return [];
      }

      // Get workflows from all selected orders
      const selectedOrders = (orders || []).filter(o => o && selectedOrderIds.has(o.id));
      if (selectedOrders.length === 0) {
        return [];
      }

      const orderWorkflowIds = new Set<string>();
      const workflowOrderMap = new Map<string, number>();
      let itemsWithServiceId = 0;
      let itemsWithWorkflowId = 0;
      let itemsWithoutBoth = 0;
      let servicesFound = 0;
      let workflowsFromServices = 0;
      let workflowsFromItems = 0;

      // Process all selected orders
      selectedOrders.forEach(order => {
        if (order && order.items && Array.isArray(order.items)) {
          order.items
            .filter(item => item && !item.isProduct)
            .forEach(item => {
              // First, try to get workflows from service
              if (item.serviceId) {
                itemsWithServiceId++;
                const service = (services || []).find(s => s && s.id === item.serviceId);
                if (service) {
                  servicesFound++;
                  console.log('✅ Found service:', {
                    itemId: item.id,
                    itemName: item.name,
                    serviceId: item.serviceId,
                    serviceName: service.name,
                    serviceWorkflows: service.workflows
                  });

                  if (service.workflows && Array.isArray(service.workflows) && service.workflows.length > 0) {
                    // Add ALL workflows from this service (not just current one)
                    service.workflows.forEach((wf, index) => {
                      // Try to find workflow by ID or label
                      let workflowExists = (workflows || []).find(w => w && w.id === wf.id);
                      if (!workflowExists) {
                        workflowExists = (workflows || []).find(w => {
                          const wId = w.id?.trim();
                          const wLabel = w.label?.trim();
                          const wfId = wf.id?.trim();
                          return wId === wfId ||
                            wLabel === wfId ||
                            (typeof wf.id === 'string' && w.id?.toLowerCase() === wf.id.toLowerCase()) ||
                            (typeof wf.id === 'string' && w.label?.toLowerCase() === wf.id.toLowerCase());
                        });
                      }
                      if (workflowExists) {
                        orderWorkflowIds.add(workflowExists.id);
                        const currentOrder = workflowOrderMap.get(workflowExists.id);
                        if (currentOrder === undefined || index < currentOrder) {
                          workflowOrderMap.set(workflowExists.id, index);
                        }
                        workflowsFromServices++;
                      } else {
                        console.warn('⚠️ Workflow not found:', {
                          serviceWorkflowId: wf.id,
                          availableWorkflowIds: workflows.map(w => w.id)
                        });
                      }
                    });
                  } else {
                    console.warn('⚠️ Service has no workflows:', {
                      serviceId: service.id,
                      serviceName: service.name
                    });
                  }
                } else {
                  console.warn('⚠️ Service not found:', {
                    itemId: item.id,
                    serviceId: item.serviceId,
                    availableServiceIds: services.map(s => s.id)
                  });
                }
              }

              // Also add workflow from item.workflowId if it exists
              if (item.workflowId) {
                itemsWithWorkflowId++;
                const workflowExists = (workflows || []).find(w => w && w.id === item.workflowId);
                if (workflowExists) {
                  orderWorkflowIds.add(workflowExists.id);
                  workflowsFromItems++;
                } else {
                  console.warn('⚠️ Workflow from item.workflowId not found:', {
                    itemId: item.id,
                    itemWorkflowId: item.workflowId,
                    availableWorkflowIds: workflows.map(w => w.id)
                  });
                }
              }

              if (!item.serviceId && !item.workflowId) {
                itemsWithoutBoth++;
              }
            });
        }
      });

      console.log('📊 Workflow collection summary:', {
        orderWorkflowIds: Array.from(orderWorkflowIds),
        itemsWithServiceId,
        itemsWithWorkflowId,
        itemsWithoutBoth,
        servicesFound,
        workflowsFromServices,
        workflowsFromItems,
        totalWorkflowsInSystem: workflows.length,
        availableWorkflowIds: workflows.map(w => w.id)
      });

      const workflowsToShow = (workflows || [])
        .filter(wf => wf && wf.id && orderWorkflowIds.has(wf.id))
        .sort((a, b) => {
          const orderA = workflowOrderMap.get(a.id) ?? 999;
          const orderB = workflowOrderMap.get(b.id) ?? 999;
          return orderA - orderB;
        });

      console.log('✅ Workflows to show as columns:', {
        count: workflowsToShow.length,
        workflows: workflowsToShow.map(w => ({ id: w.id, label: w.label }))
      });

      // Fallback: if no workflows found, show all workflows that have stages
      if (workflowsToShow.length === 0) {
        console.warn('⚠️ No workflows found from items, falling back to all workflows with stages');
        const fallbackWorkflows = (workflows || []).filter(wf => wf && wf.id && wf.stages && wf.stages.length > 0);
        console.log('📋 Fallback workflows:', {
          count: fallbackWorkflows.length,
          workflows: fallbackWorkflows.map(w => ({ id: w.id, label: w.label, stagesCount: w.stages?.length || 0 }))
        });

        if (fallbackWorkflows.length > 0) {
          return fallbackWorkflows.map(wf => ({
            id: wf?.id || '',
            title: wf?.label || '',
            color: wf?.color ? wf.color.replace('-500', '-900/10') : 'bg-neutral-900',
            dot: 'bg-slate-500',
            isSpecial: false
          })).filter(w => w.id);
        }
      }

      return workflowsToShow.map(wf => ({
        id: wf?.id || '',
        title: wf?.label || '',
        color: wf?.color ? wf.color.replace('-500', '-900/10') : 'bg-neutral-900',
        dot: 'bg-slate-500',
        isSpecial: false
      })).filter(w => w.id);
    }

    let workflowColumns: any[] = [];
    const workflow = (workflows || []).find(wf => wf && wf.id === activeWorkflow);

    if (workflow?.stages && workflow.stages.length > 0) {
      workflowColumns = workflow.stages.sort((a, b) => a.order - b.order).map(stage => ({
        id: stage.id,
        title: stage.name,
        color: stage.color ? stage.color.replace('-500', '-900/10') : 'bg-neutral-900',
        dot: stage.color || 'bg-slate-500',
        isSpecial: false
      }));
    } else {
      workflowColumns = DEFAULT_COLUMNS.map(col => ({
        id: mapStatusToStageId(col.id),
        title: col.title,
        color: col.color,
        dot: col.dot,
        isSpecial: false
      }));
    }

    return [
      ...workflowColumns,
      {
        id: 'done',
        title: 'Done',
        color: 'bg-emerald-900/10',
        dot: 'bg-emerald-500',
        isSpecial: true,
        specialType: 'done'
      },
      {
        id: 'cancel',
        title: 'Cancel',
        color: 'bg-red-900/10',
        dot: 'bg-red-500',
        isSpecial: true,
        specialType: 'cancel'
      }
    ];
  }, [activeWorkflow, workflows, Array.from(selectedOrderIds).join(','), orders, services]);

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    type: 'CANCEL' | 'BACKWARD' | null;
    item: KanbanItem | null;
    targetStatus?: string;
    previousWorkflow?: { workflow: WorkflowDefinition; stage: WorkflowStage };
  }>({ isOpen: false, type: null, item: null });
  const [reasonInput, setReasonInput] = useState('');

  const addVisualLog = (action: string, itemName: string, details?: string, type: 'info' | 'warning' | 'danger' = 'info') => {
    const newLog: ActivityLog = {
      id: Date.now().toString(),
      user: CURRENT_USER.name,
      userAvatar: CURRENT_USER.avatar,
      action,
      itemName,
      timestamp: new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', second: '2-digit' }),
      details,
      type
    };
    setLogs(prev => [newLog, ...prev]);
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, item: KanbanItem) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id); // Required for drag to work in some browsers
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, statusId: string) => {
    e.preventDefault();
    if (!draggedItem) return;

    // ----- SEQUENTIAL SERVICE PROCESSING CHECK -----
    if (draggedItem.serviceId && draggedItem.orderId) {
      // Use global items (already processed with current status) instead of order.items
      const orderItems = items.filter(i => i.orderId === draggedItem.orderId);

      if (orderItems.length > 0) {
        // Group items by Service ID
        const itemsByService = new Map<string, KanbanItem[]>();
        const serviceIds: string[] = [];

        orderItems.forEach(item => {
          const sID = item.serviceId;
          if (sID) {
            if (!itemsByService.has(sID)) {
              itemsByService.set(sID, []);
              serviceIds.push(sID);
            }
            itemsByService.get(sID)?.push(item);
          }
        });

        // Current item's service index
        const currentServiceIndex = serviceIds.indexOf(draggedItem.serviceId);

        if (currentServiceIndex > 0) {
          // Check all previous services must be completed
          for (let i = 0; i < currentServiceIndex; i++) {
            const prevServiceId = serviceIds[i];
            const prevItems = itemsByService.get(prevServiceId) || [];

            // Check if ALL items in previous service are done
            const isPrevCompleted = prevItems.every(item => {
              const status = (item.status || '').toLowerCase();
              const isDone = ['done', 'cancel', 'delivered', 'hoan_thanh', 'da_giao', 'huy'].includes(status) ||
                (workflows || []).some(w => w.id === item.workflowId && w.stages?.find(s => s.id === item.status)?.name === 'Done');

              return isDone;
            });

            if (!isPrevCompleted) {
              const prevService = (services || []).find(s => s.id === prevServiceId);
              const prevServiceName = prevService?.name || 'Dịch vụ trước';
              alert(`⚠️ CHẶN: Vui lòng hoàn thành dịch vụ "${prevServiceName}" trước khi làm dịch vụ này!`);
              setDraggedItem(null);
              return; // BLOCK DROP
            }
          }
        }
      }
    }

    // ---------------------------------------

    if (draggedItem.status === statusId) {
      setDraggedItem(null);
      return;
    }

    const validStatus = columns.find(c => c.id === statusId);
    if (!validStatus) return;

    const oldStatusTitle = columns.find(c => c.id === draggedItem.status)?.title;
    const newStatusTitle = validStatus.title;

    // Handle special columns
    if (statusId === 'done') {
      console.log('🎯 Done column detected, checking for next workflow...');
      let movedToNextWorkflow = false;

      // Check for Next Workflow
      console.log('📋 Item info:', {
        serviceId: draggedItem.serviceId,
        workflowId: draggedItem.workflowId,
        itemName: draggedItem.name,
        FULL_ITEM: draggedItem
      });

      if (draggedItem.serviceId && draggedItem.workflowId) {
        const service = (services || []).find(s => s && s.id === draggedItem.serviceId);
        console.log('🔍 Found service:', service ? {
          id: service.id,
          name: service.name,
          workflows: service.workflows
        } : 'NOT FOUND');

        // Ensure service exists and has workflows config
        if (service && service.workflows && service.workflows.length > 0) {
          // Find current workflow index
          const currentWfIndex = service.workflows.findIndex(wf => wf.id === draggedItem.workflowId);
          console.log('📊 Workflow index:', {
            currentWfIndex,
            totalWorkflows: service.workflows.length,
            currentWorkflowId: draggedItem.workflowId,
            allWorkflowIds: service.workflows.map(w => w.id)
          });

          if (currentWfIndex !== -1 && currentWfIndex < service.workflows.length - 1) {
            // Determine next workflow
            const nextWfConfig = service.workflows[currentWfIndex + 1];
            const nextWf = (workflows || []).find(w => w && w.id === nextWfConfig.id);
            console.log('➡️ Next workflow:', nextWf ? {
              id: nextWf.id,
              label: nextWf.label,
              stagesCount: nextWf.stages?.length || 0
            } : 'NOT FOUND');

            if (nextWf && nextWf.stages && nextWf.stages.length > 0) {
              // Find first stage of next workflow
              const sortedStages = [...nextWf.stages].sort((a, b) => a.order - b.order);
              const firstStage = sortedStages[0];
              console.log('🎬 First stage of next workflow:', firstStage);

              // Perform Update
              const order = orders.find(o => o.id === draggedItem.orderId);
              if (order && order.items && Array.isArray(order.items)) {
                const now = Date.now();
                const updatedItems = order.items.map(item => {
                  if (item.id === draggedItem.id) {
                    // Close history
                    const newHistory = [...(item.history || [])];
                    if (newHistory.length > 0) {
                      const lastEntry = newHistory[newHistory.length - 1];
                      if (!lastEntry.leftAt) {
                        newHistory[newHistory.length - 1] = {
                          ...lastEntry,
                          leftAt: now,
                          duration: now - lastEntry.enteredAt
                        };
                      }
                    }
                    // Open new history
                    newHistory.push({
                      stageId: firstStage.id,
                      stageName: firstStage.name,
                      enteredAt: now,
                      performedBy: CURRENT_USER.name
                    });

                    return {
                      ...item,
                      workflowId: nextWf.id,
                      status: firstStage.id,
                      history: newHistory,
                      lastUpdated: now
                    };
                  }
                  return item;
                });

                console.log('💾 Updating order with new workflow...');
                const cleanedOrder = removeUndefined({ ...order, items: updatedItems });
                await updateOrder(order.id, cleanedOrder);
                addVisualLog('Chuyển quy trình', draggedItem.name, `Chuyển sang quy trình: ${nextWf.label} (Bước: ${firstStage.name})`, 'info');
                movedToNextWorkflow = true;
                console.log('✅ Successfully moved to next workflow!');
              }
            } else {
              console.log('❌ Next workflow has no stages');
              alert('Quy trình tiếp theo chưa được cấu hình các bước!');
            }
          } else {
            console.log('ℹ️ No next workflow (last workflow or not found)');
          }
        } else {
          console.log('⚠️ Service has no workflows configured');
        }
      } else {
        console.log('⚠️ Item missing serviceId or workflowId');
      }

      if (!movedToNextWorkflow) {
        console.log('🏁 Marking as done (no next workflow)');
        // No next workflow -> Mark as Done
        updateOrderItemStatus(draggedItem.orderId, draggedItem.id, 'done', CURRENT_USER.name);
        addVisualLog('Hoàn thành', draggedItem.name, `Đã hoàn thành toàn bộ quy trình`, 'info');
      }

      setDraggedItem(null);
      return;
    }

    if (statusId === 'cancel') {
      console.log('🚫 Cancel column detected, prompting for confirmation...');
      setModalConfig({
        isOpen: true,
        type: 'CANCEL',
        item: draggedItem,
        targetStatus: statusId
      });
      setDraggedItem(null);
      return;
    }



    // Normal column logic
    const currentStageId = mapStatusToStageId(draggedItem.status);
    const oldIndex = columns.findIndex(c => c.id === currentStageId);
    const newIndex = columns.findIndex(c => c.id === statusId);

    console.log('🔍 Drag Debug:', {
      draggedItemStatus: draggedItem.status,
      mappedCurrentStageId: currentStageId,
      targetStatusId: statusId,
      oldIndex,
      newIndex,
      columnsIds: columns.map(c => c.id)
    });

    // If oldIndex is -1, the item's current status doesn't match any column
    // This can happen with legacy data or items from different workflows
    // In this case, allow the move (treat as forward move)
    if (oldIndex === -1) {
      console.log('⚠️ Current status not found in columns, allowing move');
      updateOrderItemStatus(draggedItem.orderId, draggedItem.id, statusId, CURRENT_USER.name);
      addVisualLog('Cập nhật tiến độ', draggedItem.name, `Chuyển sang [${newStatusTitle}]`, 'info');
    } else if (newIndex < oldIndex) {
      console.log('⬅️ Backward move detected, showing modal');
      setModalConfig({
        isOpen: true,
        type: 'BACKWARD',
        item: draggedItem,
        targetStatus: statusId
      });
    } else {
      console.log('➡️ Forward move, calling updateOrderItemStatus');
      updateOrderItemStatus(draggedItem.orderId, draggedItem.id, statusId, CURRENT_USER.name);
      addVisualLog('Cập nhật tiến độ', draggedItem.name, `Chuyển từ [${oldStatusTitle}] sang [${newStatusTitle}]`, 'info');
    }

    setDraggedItem(null);
  };

  const handleCancelRequest = (item: KanbanItem) => {
    setReasonInput('');
    setModalConfig({
      isOpen: true,
      type: 'CANCEL',
      item: item
    });
  };

  const confirmAction = () => {
    if (!modalConfig.item) return;

    // Only require reason for backward moves, optional for Restart (CANCEL)
    if (modalConfig.type !== 'CANCEL' && !reasonInput.trim()) {
      alert("Vui lòng nhập nội dung ghi chú!");
      return;
    }

    const oldStatusTitle = columns.find(c => c.id === modalConfig.item?.status)?.title;

    if (modalConfig.type === 'CANCEL') {
      // Logic for "Re-do current workflow" (Làm lại từ đầu phần đó)
      const currentWf = (workflows || []).find(w => w && w.id === modalConfig.item?.workflowId);

      if (currentWf && currentWf.stages && currentWf.stages.length > 0) {
        // Sort stages to find the first one
        const sortedStages = [...currentWf.stages].sort((a, b) => (a.order || 0) - (b.order || 0));
        const firstStage = sortedStages[0];

        // Reset item status to the first stage of the current workflow
        updateOrderItemStatus(modalConfig.item.orderId, modalConfig.item.id, firstStage.id, CURRENT_USER.name, reasonInput);
        addVisualLog('Làm lại quy trình', modalConfig.item.name, `Đã làm lại từ đầu quy trình [${currentWf.label}]. Lý do: ${reasonInput}`, 'warning');
      } else {
        // Fallback if no workflow/stages found (should be rare)
        updateOrderItemStatus(modalConfig.item.orderId, modalConfig.item.id, 'cancel', CURRENT_USER.name, reasonInput);
        addVisualLog('Hủy', modalConfig.item.name, `Từ [${oldStatusTitle}]. Lý do: ${reasonInput}`, 'danger');
      }
    }
    else if (modalConfig.type === 'BACKWARD' && modalConfig.targetStatus) {
      const newStatusTitle = columns.find(c => c.id === modalConfig.targetStatus)?.title;
      updateOrderItemStatus(modalConfig.item.orderId, modalConfig.item.id, modalConfig.targetStatus, CURRENT_USER.name, reasonInput);
      addVisualLog('Trả lại quy trình', modalConfig.item.name, `Từ [${oldStatusTitle}] về [${newStatusTitle}]. Ghi chú: ${reasonInput}`, 'warning');
    }

    closeModal();
  };

  const closeModal = () => {
    setModalConfig({ isOpen: false, type: null, item: null });
    setReasonInput('');
  };

  const filteredItems = useMemo(() => {
    let result = items;

    console.log('🔍 Filtering items:', {
      totalItems: items.length,
      selectedOrderIds: Array.from(selectedOrderIds),
      activeWorkflow,
      items: items.map(i => ({
        id: i.id,
        orderId: i.orderId,
        name: i.name,
        workflowId: i.workflowId,
        serviceId: i.serviceId,
        status: i.status,
        type: i.type
      })),
      itemsWithWorkflowId: items.filter(i => !!i.workflowId).length,
      itemsWithServiceId: items.filter(i => !!i.serviceId).length,
      itemsWithoutBoth: items.filter(i => !i.workflowId && !i.serviceId).length
    });

    // First filter by selected orders if any
    if (selectedOrderIds.size > 0) {
      result = result.filter(item => selectedOrderIds.has(item.orderId));
      console.log('📦 After order filter:', result.length);
    }

    // Then filter by active workflow
    if (activeWorkflow === 'ALL') {
      console.log('✅ Returning all items (ALL selected):', result.length);
      return result;
    }

    // Filter by workflowId - items must belong to the selected workflow
    const filteredByWorkflow = result.filter(item => item.workflowId === activeWorkflow);

    // Apply Sequential Visibility: Hide completed services, only show active + pending
    // GLOBAL CHECK: We must check the sequential status of ALL services for the order, not just the ones in this workflow.

    return filteredByWorkflow.filter(item => {
      // 1. Find all services for this item's order
      const orderItems = items.filter(i => i.orderId === item.orderId);
      const serviceIds = Array.from(new Set(orderItems.map(i => i.serviceId).filter((id): id is string => !!id)));

      if (serviceIds.length <= 1) {
        // Only one service, standard checks
        const status = (item.status || '').trim().toLowerCase();
        const isExplicitDone = ['done', 'cancel', 'delivered', 'hoan_thanh', 'da_giao', 'huy'].includes(status);
        const isDoneStage = (workflows || []).some(w => w.stages?.some(s => {
          // ... (existing done check logic) ...
          const sId = (s.id || '').toLowerCase();
          return sId === status && ['done', 'hoàn thành', 'completed', 'finish'].some(k => (s.name || '').toLowerCase().includes(k));
        }));
        return !isExplicitDone && !isDoneStage;
      }

      // 2. Find the FIRST incomplete service for this order
      let firstIncompleteServiceId = null;
      for (const sId of serviceIds) {
        const sItems = orderItems.filter(i => i.serviceId === sId);
        const isCompleted = sItems.every(i => {
          const status = (i.status || '').toLowerCase();
          if (['done', 'cancel', 'delivered', 'hoan_thanh', 'da_giao', 'huy'].includes(status)) return true;
          const wf = workflows.find(w => w.id === i.workflowId);
          const stage = wf?.stages?.find(s => s.id === i.status);
          return stage && ['done', 'hoàn thành', 'completed', 'finish'].some(k => (stage.name || '').toLowerCase().includes(k));
        });

        if (!isCompleted) {
          firstIncompleteServiceId = sId;
          break;
        }
      }

      // 3. Only show items if they belong to the FIRST incomplete service
      // (Or if all are complete, none should show in active view anyway, but fallback to last)
      if (firstIncompleteServiceId) {
        return item.serviceId === firstIncompleteServiceId;
      }

      return false; // All services complete
    });
  }, [items, activeWorkflow, workflows, Array.from(selectedOrderIds).join(',')]);

  const getWorkflowCount = (workflowId: string, types: ServiceType[]) => {
    let filtered = items;

    // Filter by selected orders if any
    if (selectedOrderIds.size > 0) {
      filtered = filtered.filter(item => selectedOrderIds.has(item.orderId));
    }

    if (workflowId === 'ALL') return filtered.length;

    // Count items that belong to this workflow
    return filtered.filter(item => item.workflowId === workflowId).length;
  };

  const formatDuration = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}p`;
    return `${minutes}p`;
  };

  // Helper to check if item matches column
  const checkStatusMatch = (item: KanbanItem, colId: string) => {
    // In ALL mode, columns represent workflows, not stages
    // We need to check if item belongs to this workflow AND is in any stage
    if (activeWorkflow === 'ALL') {
      // Check if item belongs to this workflow
      if (item.workflowId === colId) {
        // Item belongs to this workflow, show it
        return true;
      }

      // Fallback: if item has no workflowId, try to match by service type
      if (!item.workflowId) {
        const wf = (workflows || []).find(w => w && w.id === colId);
        if (wf && wf.types && wf.types.includes(item.type)) {
          return true;
        }
      }
      return false;
    }

    // In specific workflow mode, columns represent stages
    // Check if item's status matches this stage

    // Exact match
    if (item.status === colId) return true;

    // DEBUG: Trace why optimistic update might fail match
    // Only log if active workflow matches item workflow but status check fails
    if (activeWorkflow !== 'ALL' && item.workflowId === activeWorkflow && isUUID(item.status) && isUUID(colId)) {
      // console.log('DEBUG CHECK STATUS:', { itemStatus: item.status, colId, match: item.status === colId });
    }

    // Case-insensitive match
    const itemStatusLower = (item.status || '').toLowerCase().trim();
    const colIdLower = (colId || '').toLowerCase().trim();
    if (itemStatusLower === colIdLower) return true;

    // Try mapped status
    const itemStatusId = mapStatusToStageId(item.status);
    if (itemStatusId === colId) return true;
    if (itemStatusId.toLowerCase() === colIdLower) return true;

    // Check against all stages across all workflows
    const stage = workflows.flatMap(wf => wf.stages || []).find(s => s.id === colId);
    if (stage) {
      const stageNameLower = (stage.name || '').toLowerCase().trim();
      const stageIdLower = (stage.id || '').toLowerCase().trim();

      // Match by stage name or ID (case-insensitive)
      if (itemStatusLower === stageNameLower || itemStatusLower === stageIdLower) {
        return true;
      }
    }

    return false;
  };

  const renderCard = (item: KanbanItem) => {
    console.log('🎴 Rendering card for item:', {
      itemId: item.id,
      itemName: item.name,
      workflowId: item.workflowId,
      serviceId: item.serviceId,
      status: item.status,
      orderId: item.orderId
    });

    const getStageName = (statusId: string) => {
      const stage = workflows.flatMap(wf => wf.stages || []).find(s => s.id === statusId);
      if (stage) return stage.name;
      if (statusId === 'in-queue') return 'Chờ xử lý';
      if (statusId === 'ready') return 'Hoàn thành';
      if (statusId === 'done') return 'Hoàn thành';
      if (statusId === 'cancel') return 'Đã hủy';
      return statusId;
    };

    // Find workflow by item.workflowId - try multiple ways
    let wf = (workflows || []).find(w => w && w.id === item.workflowId);

    console.log('🔍 Finding workflow for item:', {
      itemId: item.id,
      itemWorkflowId: item.workflowId,
      itemServiceId: item.serviceId,
      workflowsCount: workflows.length,
      workflowFound: !!wf,
      workflowLabel: wf?.label
    });

    // If workflow not found, try to find by serviceId
    if (!wf && item.serviceId) {
      const service = (services || []).find(s => s && s.id === item.serviceId);
      if (service) {
        // Try workflows from service
        if (service.workflows && Array.isArray(service.workflows) && service.workflows.length > 0) {
          for (const wfRef of service.workflows) {
            const workflowId = typeof wfRef === 'string' ? wfRef : (wfRef?.id || '');
            wf = (workflows || []).find(w => w && w.id === workflowId);
            if (wf) break;
          }
        }
        // Try workflowId from service
        if (!wf && service.workflowId) {
          const workflowId = typeof service.workflowId === 'string' ? service.workflowId : (service.workflowId[0] || '');
          wf = (workflows || []).find(w => w && w.id === workflowId);
        }
      }
    }

    const currentStage = wf?.stages?.find(s => s.id === item.status);
    const allStages = wf?.stages && Array.isArray(wf.stages) && wf.stages.length > 0
      ? [...wf.stages].sort((a, b) => (a.order || 0) - (b.order || 0))
      : [];

    // Debug: Log workflow and stages info
    if (!wf || !wf.stages || wf.stages.length === 0) {
      console.warn('⚠️ Workflow không có stages:', {
        itemId: item.id,
        itemName: item.name,
        itemWorkflowId: item.workflowId,
        itemServiceId: item.serviceId,
        itemStatus: item.status,
        workflowFound: !!wf,
        workflowLabel: wf?.label,
        stagesCount: wf?.stages?.length || 0,
        allStagesCount: allStages.length,
        workflowsCount: workflows.length,
        workflowsWithStages: workflows.filter(w => w.stages && w.stages.length > 0).map(w => ({
          id: w.id,
          label: w.label,
          stagesCount: w.stages?.length || 0
        }))
      });
    } else {
      console.log('✅ Workflow có stages:', {
        itemId: item.id,
        itemName: item.name,
        workflowId: wf.id,
        workflowLabel: wf.label,
        stagesCount: allStages.length,
        stages: allStages.map(s => ({ id: s.id, name: s.name, order: s.order })),
        currentStageId: item.status,
        currentStageName: currentStage?.name
      });
    }

    return (
      <div
        key={item.id}
        draggable
        onDragStart={(e) => handleDragStart(e, item)}
        className="bg-gradient-to-br from-neutral-900 to-neutral-950 p-4 rounded-xl shadow-xl shadow-black/30 border border-neutral-800/80 cursor-move hover:border-gold-500/60 hover:shadow-gold-500/10 transition-all duration-300 group active:cursor-grabbing relative mb-3 last:mb-0 backdrop-blur-sm"
      >
        {/* Header Section */}
        <div className="flex gap-3 mb-3">
          {/* Image */}
          <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-neutral-800 to-neutral-900 overflow-hidden flex-shrink-0 relative border border-neutral-700/50 shadow-inner">
            {item.beforeImage ? (
              <img src={item.beforeImage} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500 text-[10px] font-medium">No Img</div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-1.5">
              <div></div>
              <button
                onClick={(e) => { e.stopPropagation(); setModalConfig({ isOpen: true, type: 'CANCEL', item }); }}
                className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100"
                title="Hủy công việc"
              >
                <XCircle size={16} />
              </button>
            </div>
            <h4 className="font-semibold text-slate-100 text-sm leading-tight mb-1.5 line-clamp-2" title={item.name}>{item.name}</h4>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <User size={13} className="text-slate-500" />
              <span className="truncate font-medium">{item.customerName}</span>
            </div>
          </div>
        </div>

        {/* Technical Log Alert */}
        {item.technicalLog && item.technicalLog.length > 0 && (() => {
          const latestLog = item.technicalLog[item.technicalLog.length - 1];
          return (
            <div className="mb-3 bg-gradient-to-r from-orange-900/30 to-orange-800/20 text-orange-300 px-3 py-2 rounded-lg border border-orange-800/40 flex items-start gap-2 shadow-sm">
              <AlertTriangle size={12} className="mt-0.5 flex-shrink-0 text-orange-400" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[11px] mb-0.5">{latestLog.author} - {latestLog.timestamp}</div>
                <div className="text-[10px] text-orange-200/90 line-clamp-2 leading-relaxed">{latestLog.content}</div>
              </div>
            </div>
          );
        })()}

        {/* Workflow & Stages Section */}
        <div className="mb-3 pt-3 border-t border-neutral-800/60">
          {/* Workflow Name - More Prominent */}
          {wf && (
            <div className="mb-3 space-y-2">
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-900/20 rounded-lg border border-blue-800/40">
                <Layers size={14} className="text-blue-400" />
                <div className="flex-1">
                  <div className="text-[9px] text-blue-400/70 uppercase tracking-wider font-medium">Quy trình</div>
                  <div className="text-xs font-bold text-blue-300">{wf.label}</div>
                </div>
              </div>

              {/* Nhân sự phụ trách quy trình */}
              {wf.assignedMembers && wf.assignedMembers.length > 0 && (
                <div className="px-3 py-2 bg-neutral-800/30 rounded-lg border border-neutral-700/30">
                  <div className="text-[9px] text-slate-400/70 uppercase tracking-wider font-medium mb-1.5 flex items-center gap-1">
                    <User size={10} />
                    Nhân sự phụ trách
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {wf.assignedMembers.map(memberId => {
                      const member = members.find(m => m.id === memberId);
                      if (!member) return null;
                      return (
                        <div
                          key={memberId}
                          className="flex items-center gap-1.5 px-2 py-1 bg-neutral-700/50 rounded border border-neutral-600/30"
                        >
                          {member.avatar ? (
                            <img src={member.avatar} alt="" className="w-4 h-4 rounded-full" />
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-neutral-600 flex items-center justify-center text-[8px] font-bold text-slate-300">
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="text-[10px] text-slate-300 font-medium">{member.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Workflow Stages Progress - ALWAYS SHOW if workflow exists */}
          {wf ? (
            <div className="mb-3 pt-2 border-t border-neutral-800/60">
              {allStages.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-[9px] text-slate-500 uppercase tracking-wider font-medium px-1 flex items-center gap-1">
                    <Columns size={10} />
                    Các bước quy trình ({allStages.length})
                  </div>
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 px-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {allStages.map((stage, idx) => {
                      // Logic Fix: Use index comparison for status
                      const currentStageIndex = allStages.findIndex(s => s.id === item.status);
                      const isItemDone = ['done', 'cancel', 'delivered', 'hoan_thanh', 'da_giao', 'huy'].includes(item.status.toLowerCase());

                      const isCompleted = isItemDone || (currentStageIndex !== -1 && idx < currentStageIndex);
                      const isCurrent = !isItemDone && (stage.id === item.status);
                      const isUpcoming = !isCompleted && !isCurrent;

                      // Determine assigned members for this stage (Per-Order > Template)
                      let stageMembers = stage.assignedMembers || [];
                      if ((item as any).stageAssignments && Array.isArray((item as any).stageAssignments)) {
                        const specificAssignment = (item as any).stageAssignments.find((a: any) => a.stageId === stage.id);
                        if (specificAssignment && specificAssignment.assignedMemberIds && specificAssignment.assignedMemberIds.length > 0) {
                          stageMembers = specificAssignment.assignedMemberIds;
                        }
                      }

                      return (
                        <React.Fragment key={stage.id || idx}>
                          <div className={`flex-shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all relative group ${isCurrent
                            ? 'bg-gold-600/20 text-gold-400 border border-gold-500/50 shadow-sm shadow-gold-500/20'
                            : isCompleted
                              ? 'bg-emerald-900/20 text-emerald-400 border border-emerald-700/30'
                              : 'bg-neutral-800/40 text-slate-500 border border-neutral-700/30'
                            }`}>
                            <div className="flex items-center gap-1.5">
                              {/* Always use idx + 1 for sequential numbering */}
                              <span className="text-[9px] text-slate-400 font-bold">#{idx + 1}</span>
                              <span className="line-clamp-1 max-w-[90px]">{stage.name}</span>
                            </div>
                            {stageMembers.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1 border-t border-neutral-700/30 pt-1">
                                {stageMembers.map(memberId => {
                                  const member = members.find(m => m.id === memberId);
                                  if (!member) return null;
                                  return (
                                    <div key={memberId} className="flex items-center gap-1 bg-neutral-800/80 px-1 rounded-sm border border-neutral-700/50">
                                      {member.avatar ? (
                                        <img src={member.avatar} alt="" className="w-2.5 h-2.5 rounded-full" />
                                      ) : (
                                        <div className="w-2.5 h-2.5 rounded-full bg-neutral-700 flex items-center justify-center text-[6px] font-bold text-slate-400">
                                          {member.name.charAt(0).toUpperCase()}
                                        </div>
                                      )}
                                      <span className="text-[8px] text-slate-300 font-medium">{member.name}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          {idx < allStages.length - 1 && (
                            <ChevronRight size={12} className={`flex-shrink-0 mx-0.5 ${isCompleted ? 'text-emerald-600' : isCurrent ? 'text-gold-500' : 'text-slate-700'
                              }`} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-2 text-xs text-slate-500 bg-neutral-800/30 rounded-lg border border-neutral-700/30">
                  <div className="text-[9px] text-slate-400 mb-1">Quy trình: {wf.label}</div>
                  <div>Chưa có bước nào được thiết lập</div>
                </div>
              )}
            </div>
          ) : (
            <div className="mb-3 pt-2 border-t border-neutral-800/60 text-center py-2 text-xs text-slate-500 bg-neutral-800/30 rounded-lg border border-neutral-700/30">
              <div className="text-[9px] text-slate-400 mb-1">Chưa có quy trình</div>
              <div>Dịch vụ này chưa được gán quy trình</div>
            </div>
          )}

          {/* Current Stage Highlight - More Prominent */}
          {currentStage && (() => {
            // Determine assigned members for the CURRENT stage (Per-Order > Template)
            let currentStageMembers = currentStage.assignedMembers || [];
            if ((item as any).stageAssignments && Array.isArray((item as any).stageAssignments)) {
              const specificAssignment = (item as any).stageAssignments.find((a: any) => a.stageId === currentStage.id);
              if (specificAssignment && specificAssignment.assignedMemberIds && specificAssignment.assignedMemberIds.length > 0) {
                currentStageMembers = specificAssignment.assignedMemberIds;
              }
            }

            return (
              <div className="space-y-2">
                <div className="flex flex-col gap-2 px-3 py-2 bg-gradient-to-r from-gold-900/20 to-gold-800/10 border border-gold-700/40 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-gold-500 animate-pulse"></span>
                    <div className="flex-1">
                      <div className="text-[9px] text-gold-500/80 uppercase tracking-wider font-medium">Đang làm</div>
                      <div className="text-xs font-bold text-gold-400">{currentStage.name}</div>
                    </div>
                  </div>

                  {/* Nhân sự phụ trách bước này */}
                  {currentStageMembers.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1 border-t border-gold-700/20 pt-2">
                      {currentStageMembers.map(memberId => {
                        const member = members.find(m => m.id === memberId);
                        if (!member) return null;
                        return (
                          <div
                            key={memberId}
                            className="flex items-center gap-1 px-1.5 py-0.5 bg-neutral-900/60 border border-gold-900/30 rounded-full"
                          >
                            {member.avatar ? (
                              <img src={member.avatar} alt="" className="w-3.5 h-3.5 rounded-full" />
                            ) : (
                              <div className="w-3.5 h-3.5 rounded-full bg-neutral-800 flex items-center justify-center text-[7px] font-bold text-slate-300">
                                {member.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className="text-[9px] text-gold-200/80 font-medium">{member.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Footer Section */}
        <div className="pt-3 border-t border-neutral-800/60">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-neutral-800/50 px-2.5 py-1.5 rounded-lg border border-neutral-700/30">
              <Calendar size={12} className="text-slate-500" />
              <span className="text-[11px]">
                <span className="text-slate-500">Ngày hẹn:</span>{' '}
                <span className="text-slate-200 font-medium">{formatDate(item.expectedDelivery) || 'Chưa có'}</span>
              </span>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-gold-400">{item.price.toLocaleString('vi-VN')} ₫</div>
              {item.lastUpdated && (
                <div className="text-[10px] text-slate-500 flex items-center justify-end gap-1 mt-0.5">
                  <Clock size={9} />
                  <span>{new Date(item.lastUpdated).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Debug info
  useEffect(() => {
    console.log('🔍 Kanban Debug Info:', {
      totalOrders: safeOrders.length,
      selectedOrderIds: Array.from(selectedOrderIds),
      totalItems: items.length,
      filteredItems: filteredItems.length,
      activeWorkflow,
      workflowsCount: workflows.length,
      workflowsWithStages: workflows.filter(w => w.stages && w.stages.length > 0).length,
      servicesCount: services.length,
      ordersWithItems: safeOrders.filter(o => o.items && o.items.length > 0).length,
      ordersWithoutItems: safeOrders.filter(o => !o.items || o.items.length === 0).length,
      itemsWithWorkflowId: items.filter(i => !!i.workflowId).length,
      itemsWithServiceId: items.filter(i => !!i.serviceId).length,
      itemsWithoutBoth: items.filter(i => !i.workflowId && !i.serviceId).length,
      sampleItems: items.slice(0, 3).map(i => ({
        id: i.id,
        name: i.name,
        workflowId: i.workflowId,
        serviceId: i.serviceId,
        status: i.status
      })),
      workflows: workflows.map(w => ({
        id: w.id,
        label: w.label,
        stagesCount: w.stages?.length || 0
      }))
    });
  }, [safeOrders.length, selectedOrderIds.size, items.length, filteredItems.length, activeWorkflow, workflows.length, services.length]);

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col relative">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-100 flex items-center gap-3">
            <Columns className="text-gold-500" />
            Bảng Tiến Độ (Kanban)
          </h1>
          <p className="text-slate-500 mt-1">
            Quản lý trực quan quy trình sản xuất theo từng nhóm việc.
            {safeOrders.length === 0 && (
              <span className="ml-2 text-orange-400">⚠️ Chưa có đơn hàng nào</span>
            )}
            {safeOrders.length > 0 && items.length === 0 && (
              <span className="ml-2 text-orange-400">⚠️ Đơn hàng không có dịch vụ (chỉ có sản phẩm)</span>
            )}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {/* Order Selector with Checkboxes */}
          <div className="relative" ref={orderSelectorRef}>
            <button
              onClick={() => setShowOrderSelector(!showOrderSelector)}
              className="px-4 py-2 bg-neutral-900 border border-neutral-800 text-slate-300 rounded-lg text-sm font-medium hover:bg-neutral-800 transition-colors flex items-center gap-2 min-w-[200px]"
            >
              <span>
                {selectedOrderIds.size === 0 || selectedOrderIds.size === safeOrders.length
                  ? 'Tất cả đơn hàng'
                  : `Đã chọn ${selectedOrderIds.size} đơn`}
              </span>
              <ChevronRight
                size={14}
                className={`transition-transform ${showOrderSelector ? 'rotate-90' : ''}`}
              />
            </button>

            {showOrderSelector && (
              <div className="absolute top-full left-0 mt-2 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl z-50 min-w-[300px] max-h-[400px] overflow-y-auto">
                <div className="p-2 border-b border-neutral-800">
                  <label className="flex items-center gap-2 px-3 py-2 hover:bg-neutral-800 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedOrderIds.size === safeOrders.length && safeOrders.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const allIds = new Set(safeOrders.filter(o => o && o.id).map(o => o.id));
                          setSelectedOrderIds(allIds);
                        } else {
                          setSelectedOrderIds(new Set());
                        }
                        setActiveWorkflow('ALL');
                      }}
                      className="w-4 h-4 text-gold-600 bg-neutral-800 border-neutral-700 rounded focus:ring-gold-500 focus:ring-2"
                    />
                    <span className="text-sm font-medium text-slate-300">Tất cả đơn hàng</span>
                  </label>
                </div>
                <div className="p-2 space-y-1">
                  {safeOrders.map(order => (
                    <label
                      key={order.id}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-neutral-800 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedOrderIds.has(order.id)}
                        onChange={(e) => {
                          const newSet = new Set(selectedOrderIds);
                          if (e.target.checked) {
                            newSet.add(order.id);
                          } else {
                            newSet.delete(order.id);
                          }
                          // Auto select all if none selected
                          if (newSet.size === 0) {
                            const allIds = new Set(safeOrders.filter(o => o && o.id).map(o => o.id));
                            setSelectedOrderIds(allIds);
                          } else {
                            setSelectedOrderIds(newSet);
                          }
                          setActiveWorkflow('ALL');
                        }}
                        className="w-4 h-4 text-gold-600 bg-neutral-800 border-neutral-700 rounded focus:ring-gold-500 focus:ring-2"
                      />
                      <span className="text-sm text-slate-300 flex-1">
                        #{order.id} - {order.customerName}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-900 border border-neutral-800 text-slate-300 rounded-lg text-sm font-medium hover:bg-neutral-800 transition-colors relative"
          >
            <History size={16} />
            <span>Lịch sử</span>
            {logs.length > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full border border-neutral-900"></span>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Left Sidebar: Workflows */}
        <div className="w-64 flex-shrink-0 flex flex-col gap-2 overflow-y-auto pr-2">
          {selectedOrderIds.size > 0 && selectedOrderIds.size < safeOrders.length && (() => {
            const selectedOrdersList = safeOrders.filter(o => o && o.id && selectedOrderIds.has(o.id));
            return selectedOrdersList.length > 0 ? (
              <div className="mb-3 p-3 bg-gold-900/20 border border-gold-800/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-gold-500 uppercase tracking-wider">Đơn hàng đã chọn ({selectedOrderIds.size})</h3>
                  <button
                    onClick={() => {
                      const allIds = new Set(safeOrders.filter(o => o && o.id).map(o => o.id));
                      setSelectedOrderIds(allIds);
                      setActiveWorkflow('ALL');
                    }}
                    className="p-1 hover:bg-gold-900/30 rounded text-gold-400 hover:text-gold-300 transition-colors"
                    title="Chọn tất cả"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {selectedOrdersList.slice(0, 3).map(order => (
                    <div key={order.id} className="text-xs">
                      <div className="font-semibold text-gold-400">#{order.id}</div>
                      <div className="text-slate-400">{order.customerName}</div>
                    </div>
                  ))}
                  {selectedOrdersList.length > 3 && (
                    <div className="text-xs text-slate-500">+{selectedOrdersList.length - 3} đơn hàng khác</div>
                  )}
                </div>
              </div>
            ) : null;
          })()}
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 px-2">
            Danh sách quy trình
          </h3>
          {WORKFLOWS_FILTER.map((wf) => {
            const isActive = activeWorkflow === wf.id;
            const count = getWorkflowCount(wf.id, wf.types);

            return (
              <button
                key={wf.id}
                onClick={() => setActiveWorkflow(wf.id)}
                className={`flex items-center justify-between p-3 rounded-xl transition-all text-left group ${isActive
                  ? 'bg-neutral-800 shadow-md border-l-4 border-gold-500'
                  : 'hover:bg-neutral-900/50 text-slate-500 border-l-4 border-transparent'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isActive ? 'bg-gold-600 text-black' : 'bg-neutral-800 text-slate-500 group-hover:bg-neutral-700'}`}>
                    {wf.id === 'ALL' ? <Layers size={18} /> : <Briefcase size={18} />}
                  </div>
                  <div>
                    <span className={`block font-medium text-sm ${isActive ? 'text-slate-200' : 'text-slate-500'}`}>
                      {wf.label}
                    </span>
                    <span className="text-xs text-slate-600">{count} công việc</span>
                  </div>
                </div>
                {isActive && <ChevronRight size={16} className="text-gold-500" />}
              </button>
            );
          })}
        </div>

        {/* Right Content: Kanban Board or Matrix View */}
        <div className="flex-1 overflow-hidden bg-neutral-900/50 rounded-xl border border-neutral-800 relative">
          {activeWorkflow === 'ALL' ? (
            // MATRIX VIEW
            // ⚠️ CRITICAL: DO NOT MODIFY THIS UI LAYOUT
            // USER REQUIREMENT: "trong bản kanban khi chỉnh sửa không bao giờ được sửa giao diện phần tất cả công việc này"
            // PRESERVE THE CURRENT MATRIX VIEW LAYOUT AS IS.
            <div className="absolute inset-0 overflow-auto bg-neutral-900/50">
              <div className="min-w-full w-max pb-10">
                {/* Header Row - Restored for Right Column Alignment */}
                <div className="flex border-b border-neutral-800 sticky top-0 bg-neutral-900 z-40 min-w-full text-left">
                  <div className="flex-1 p-4 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                    <h3 className="font-semibold text-slate-300 text-sm uppercase tracking-wide">TIẾN ĐỘ THỰC HIỆN</h3>
                  </div>
                  <div className="w-[200px] flex-shrink-0 p-3 font-bold text-gold-500 text-center bg-neutral-800 border-l border-neutral-700 sticky right-0 shadow-[-5px_0_15px_-5px_rgba(0,0,0,0.5)] z-50 ml-auto flex flex-col justify-center">
                    THÔNG TIN
                  </div>
                </div>

                {(() => {
                  // Filter orders
                  const ordersToShow = selectedOrderIds.size > 0
                    ? safeOrders.filter(o => o && selectedOrderIds.has(o.id))
                    : safeOrders;

                  if (ordersToShow.length === 0) {
                    return (
                      <div className="flex items-center justify-center p-12 text-center text-slate-500">
                        <div>
                          <Columns size={48} className="mx-auto mb-4 text-slate-600" />
                          <h3 className="text-lg font-semibold text-slate-400 mb-2">Chưa có công việc nào</h3>
                          <p className="text-sm text-slate-500">Không có đơn hàng nào được chọn hoặc tìm thấy.</p>
                        </div>
                      </div>
                    );
                  }

                  return ordersToShow.map(order => {
                    // Use the original items from `order.items` to ensure strict sorting order
                    const orderItems = order.items?.filter(item => item && !item.isProduct) || [];
                    if (orderItems.length === 0) return null;

                    // We need to map the raw order items to the processed items (with status/IDs) from the main `items` list
                    const processedOrderItems = orderItems.map(rawItem => {
                      return items.find(i => i.id === rawItem.id || (i.orderId === order.id && i.name === rawItem.name));
                    }).filter(Boolean) as KanbanItem[];

                    if (processedOrderItems.length === 0) return null;

                    return (
                      <div key={order.id} className="mb-4 bg-transparent relative flex group border-b border-neutral-800/50 pb-6">

                        <div className="flex-1 min-w-0 flex overflow-x-auto gap-8 px-2 pb-2" style={{ scrollbarWidth: 'thin' }}>
                          {(() => {
                            // 1. Ungrouped: Render items directly for sequential headers
                            return processedOrderItems.map((item, idx) => {
                              const wfId = item.workflowId || 'unknown';
                              const workflowDef = workflows.find(w => w.id === wfId);
                              const label = workflowDef?.label || (wfId === 'unknown' ? 'Chưa phân loại' : 'Quy trình khác');

                              return (
                                <div key={`${item.id}-${idx}`} className="flex-shrink-0 flex flex-col gap-3 relative">
                                  {/* Workflow Header - 1-to-1 Mapping for Sequence */}
                                  <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-800/90 rounded-lg border border-neutral-700 w-max sticky left-0 z-10 backdrop-blur-sm shadow-sm">
                                    <Layers size={14} className="text-gold-500" />
                                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">{label}</span>
                                    <span className="bg-neutral-700 text-slate-400 text-[10px] px-1.5 py-0.5 rounded-full font-bold">{idx + 1}</span>
                                  </div>

                                  <div className="flex gap-4">
                                    {/* Inner map removed, rendering directly */}
                                    {(() => {
                                      const wfId = item.workflowId || 'unknown';
                                      const workflowDef = workflows.find(w => w.id === wfId);

                                      // Determine stages
                                      let wfStages: WorkflowStage[] = [];
                                      if (workflowDef && workflowDef.stages && workflowDef.stages.length > 0) {
                                        wfStages = [...workflowDef.stages].sort((a, b) => a.order - b.order);
                                      } else {
                                        wfStages = DEFAULT_COLUMNS.map(col => ({
                                          id: mapStatusToStageId(col.id),
                                          name: col.title,
                                          order: 0,
                                          color: col.color
                                        } as WorkflowStage));
                                      }

                                      // Find current stage index
                                      const currentStageIndex = wfStages.findIndex(s => s.id === item.status) || 0;
                                      const currentStage = wfStages.find(s => s.id === item.status);

                                      // Determine if item is DONE
                                      const isItemDone = ['done', 'cancel', 'delivered', 'hoan_thanh', 'da_giao', 'huy'].includes(item.status.toLowerCase()) ||
                                        currentStage?.name === 'Done';

                                      return (
                                        <div
                                          key={`${item.id}-${idx}`}
                                          className={`flex-shrink-0 w-[340px] bg-neutral-900 border rounded-xl p-4 flex flex-col shadow-sm relative hover:border-neutral-700 transition-colors ${isItemDone ? 'border-emerald-500/50 ring-1 ring-emerald-500/20' : 'border-neutral-800'
                                            }`}
                                        >
                                          {isItemDone && (
                                            <div className="absolute top-3 right-3 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg z-20 flex items-center gap-1">
                                              ✅ DONE
                                            </div>
                                          )}
                                          {/* Card Header: Image + Basic Info */}
                                          <div className="flex gap-3 mb-4">
                                            <div className="w-16 h-16 bg-neutral-800 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden border border-neutral-700/50">
                                              {item.beforeImage ? (
                                                <img src={item.beforeImage} alt="" className="w-full h-full object-cover" />
                                              ) : (
                                                <div className="text-[10px] text-slate-600 font-medium">No Img</div>
                                              )}
                                            </div>
                                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                              <h4 className="text-slate-200 font-bold text-sm truncate" title={item.name}>{item.name}</h4>
                                              <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                                <User size={12} />
                                                <span>{order.customerName}</span>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Workflow Badge */}
                                          <div className="mb-3">
                                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-900/20 border border-blue-900/30 rounded-lg max-w-full">
                                              <Layers size={12} className="text-blue-400 flex-shrink-0" />
                                              <div className="flex flex-col min-w-0">
                                                <span className="text-[9px] text-blue-300 uppercase font-bold tracking-wider leading-none mb-0.5">QUY TRÌNH</span>
                                                <span className="text-xs text-blue-100 font-semibold truncate leading-tight">{workflowDef?.label || 'Mặc định'}</span>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Progress Stepper (Mini) */}
                                          <div className="mb-4">
                                            <div className="flex items-center justify-between mb-2">
                                              <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider flex items-center gap-1">
                                                <ListChecks size={12} /> Các bước thực hiện ({wfStages.length})
                                              </span>
                                            </div>
                                            <div className="flex gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                                              {wfStages.map((stage, sIdx) => {
                                                const isCompleted = sIdx < currentStageIndex;
                                                const isCurrent = stage.id === item.status;

                                                // Determine assigned members for this stage
                                                let stageMembers = stage.assignedMembers || [];
                                                if ((item as any).stageAssignments && Array.isArray((item as any).stageAssignments)) {
                                                  const specificAssignment = (item as any).stageAssignments.find((a: any) => a.stageId === stage.id);
                                                  if (specificAssignment && specificAssignment.assignedMemberIds && specificAssignment.assignedMemberIds.length > 0) {
                                                    stageMembers = specificAssignment.assignedMemberIds;
                                                  }
                                                }

                                                return (
                                                  <div
                                                    key={stage.id}
                                                    className={`flex-shrink-0 px-2 py-1 rounded text-[10px] whitespace-nowrap border flex flex-col gap-0.5
                                                      ${isCurrent
                                                        ? 'bg-orange-900/20 border-orange-500/50 text-orange-200 font-bold'
                                                        : isCompleted
                                                          ? 'bg-neutral-800 border-neutral-700 text-slate-500'
                                                          : 'bg-neutral-900 border-neutral-800 text-slate-600'
                                                      }`}
                                                  >
                                                    <div className="flex items-center gap-1">
                                                      <span className="font-mono opacity-50">#{sIdx + 1}</span> {stage.name}
                                                    </div>
                                                    {stageMembers.length > 0 && (
                                                      <div className="flex -space-x-1 mt-0.5 overflow-hidden">
                                                        {stageMembers.slice(0, 3).map(memberId => {
                                                          const member = members.find(m => m.id === memberId);
                                                          if (!member) return null;
                                                          return (
                                                            <div key={memberId} className="w-3 h-3 rounded-full border border-neutral-900 bg-neutral-800 flex items-center justify-center overflow-hidden" title={member.name}>
                                                              {member.avatar ? (
                                                                <img src={member.avatar} alt="" className="w-full h-full object-cover" />
                                                              ) : (
                                                                <span className="text-[6px] text-slate-400 font-bold">{member.name.charAt(0)}</span>
                                                              )}
                                                            </div>
                                                          );
                                                        })}
                                                      </div>
                                                    )}
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>

                                          {/* Current Status Highlight Box */}
                                          <div className="mt-auto bg-neutral-800/40 border border-neutral-700/40 rounded-lg p-3 relative overflow-hidden">
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500"></div>
                                            <div className="flex justify-between items-start">
                                              <div className="flex-1 min-w-0">
                                                <div className="text-[10px] text-orange-500 font-bold uppercase tracking-wider mb-0.5 ml-2">ĐANG LÀM</div>
                                                <div className="text-sm text-slate-200 font-bold ml-2 truncate">
                                                  {currentStage?.name || 'Chưa bắt đầu'}
                                                </div>
                                              </div>

                                              {/* Staff for active stage in Matrix View */}
                                              {(() => {
                                                let currentStageMembers = currentStage?.assignedMembers || [];
                                                if (currentStage && (item as any).stageAssignments && Array.isArray((item as any).stageAssignments)) {
                                                  const specificAssignment = (item as any).stageAssignments.find((a: any) => a.stageId === currentStage.id);
                                                  if (specificAssignment && specificAssignment.assignedMemberIds && specificAssignment.assignedMemberIds.length > 0) {
                                                    currentStageMembers = specificAssignment.assignedMemberIds;
                                                  }
                                                }

                                                if (currentStageMembers.length === 0) return null;

                                                return (
                                                  <div className="flex flex-wrap gap-1 justify-end">
                                                    {currentStageMembers.map(memberId => {
                                                      const member = members.find(m => m.id === memberId);
                                                      if (!member) return null;
                                                      return (
                                                        <div key={memberId} className="flex items-center gap-1 bg-neutral-900/60 border border-orange-500/20 px-1.5 py-0.5 rounded-full">
                                                          {member.avatar ? (
                                                            <img src={member.avatar} alt="" className="w-3 h-3 rounded-full" />
                                                          ) : (
                                                            <div className="w-2.5 h-2.5 rounded-full bg-neutral-700 flex items-center justify-center text-[6px] font-bold text-slate-300">
                                                              {member.name.charAt(0)}
                                                            </div>
                                                          )}
                                                          <span className="text-[9px] text-slate-300 font-medium">{member.name}</span>
                                                        </div>
                                                      );
                                                    })}
                                                  </div>
                                                );
                                              })()}
                                            </div>
                                          </div>

                                          {/* Footer Info */}
                                          <div className="mt-4 flex items-center justify-between pt-3 border-t border-neutral-800/50 text-xs">
                                            <div className="flex items-center gap-1.5 text-slate-400 bg-neutral-800/50 px-2 py-1 rounded">
                                              <Calendar size={12} />
                                              <span>{formatDate(order.expectedDelivery)}</span>
                                            </div>
                                            <div className="font-mono font-bold text-gold-400 text-sm">
                                              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price)}
                                            </div>
                                          </div>

                                        </div>
                                      );
                                    })()}
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>

                        {/* RIGHT PART: Sticky Order Info - RESTORED ORIGINAL STYLE */}
                        <div className="w-[200px] flex-shrink-0 p-3 bg-neutral-900/95 border-l border-neutral-800 flex flex-col justify-center sticky right-0 z-30 shadow-[-5px_0_15px_-5px_rgba(0,0,0,0.5)] ml-auto">
                          <div className="text-xs font-mono text-slate-500 mb-1">#{order.id}</div>
                          <p className="text-slate-300 font-medium text-lg mb-2">{order.customerName}</p>

                          <div className="flex flex-col gap-2 mt-2">
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                              <Calendar size={14} />
                              <span>Ngày hẹn: <span className="text-slate-300">{formatDate(order.expectedDelivery)}</span></span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                              <Briefcase size={14} />
                              <span>Tổng mục: <span className="text-slate-300">{orderItems.length}</span></span>
                            </div>
                          </div>
                        </div>

                      </div>
                    );
                  });
                })()}

              </div>
            </div>
          ) : (
            // STANDARD KANBAN VIEW
            <div className="flex h-full gap-6 min-w-[1200px] p-4 overflow-x-auto">
              {columns.map(col => {
                const colItems = filteredItems
                  .filter(i => checkStatusMatch(i, col.id))
                  .sort((a, b) => {
                    // Sort by workflow stage order first
                    const aWorkflow = (workflows || []).find(w => w && w.id === a.workflowId);
                    const bWorkflow = (workflows || []).find(w => w && w.id === b.workflowId);

                    if (aWorkflow && bWorkflow) {
                      const aStage = aWorkflow.stages?.find(s => s.id === a.status);
                      const bStage = bWorkflow.stages?.find(s => s.id === b.status);

                      if (aStage && bStage) {
                        const orderDiff = aStage.order - bStage.order;
                        if (orderDiff !== 0) return orderDiff;
                      }
                    }

                    // Then sort by expected delivery date
                    if (a.expectedDelivery && b.expectedDelivery) {
                      const aDate = new Date(a.expectedDelivery).getTime();
                      const bDate = new Date(b.expectedDelivery).getTime();
                      if (!isNaN(aDate) && !isNaN(bDate)) {
                        const dateDiff = aDate - bDate;
                        if (dateDiff !== 0) return dateDiff;
                      }
                    }

                    // Finally sort by last updated (most recent first)
                    if (a.lastUpdated && b.lastUpdated) {
                      return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
                    }

                    // Fallback: sort by order ID
                    return a.orderId.localeCompare(b.orderId);
                  });

                return (
                  <div
                    key={col.id}
                    className="flex-1 flex flex-col bg-neutral-950/50 rounded-xl border border-neutral-800 shadow-sm min-w-[320px]"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, col.id)}
                  >
                    {/* Column Header */}
                    <div className="p-4 flex items-center justify-between border-b border-neutral-800 bg-neutral-900/80 backdrop-blur rounded-t-xl sticky top-0 z-10">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`}></span>
                        <h3 className="font-semibold text-slate-300 text-sm uppercase tracking-wide">{col.title}</h3>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="bg-neutral-800 text-slate-400 text-xs px-2.5 py-1 rounded-full font-bold shadow-sm">
                          {colItems.length}
                        </span>
                        <button
                          onClick={() => setEditingStage({ stageId: col.id, stageName: col.title })}
                          className="p-1.5 hover:bg-neutral-800 rounded-lg text-slate-500 hover:text-slate-200 transition-colors"
                          title="Chỉnh sửa tasks mặc định"
                        >
                          <MoreHorizontal size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Column Body */}
                    <div className={`flex-1 overflow-y-auto p-3 space-y-3 ${col.color}`}>
                      {colItems.map(item => renderCard(item))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div >


      {/* Confirmation & Warning Modal */}
      {
        modalConfig.isOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-neutral-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 border border-neutral-800">
              {/* Flashing Header */}
              <div className={`p-4 flex items-center gap-3 ${modalConfig.type === 'CANCEL' ? 'bg-red-900/20' : 'bg-orange-900/20'
                }`}>
                <div className={`p-2 rounded-full ${modalConfig.type === 'CANCEL' ? 'bg-red-900/40 text-red-500' : 'bg-orange-900/40 text-orange-500'
                  } animate-pulse`}>
                  {modalConfig.type === 'CANCEL' ? <AlertTriangle size={24} /> : <RotateCcw size={24} />}
                </div>
                <div>
                  <h3 className={`font-bold text-lg ${modalConfig.type === 'CANCEL' ? 'text-red-500' : 'text-orange-500'
                    } animate-pulse`}>
                    {modalConfig.type === 'CANCEL' ? 'Xác nhận Làm Lại Quy Trình' : 'Cảnh báo: Lùi Quy Trình'}
                  </h3>
                </div>
              </div>

              <div className="p-6">
                <p className="text-slate-400 mb-4 text-sm">
                  {modalConfig.type === 'CANCEL'
                    ? `Bạn có chắc chắn muốn làm lại từ đầu quy trình cho "${modalConfig.item?.name}" không? Tiến độ hiện tại sẽ bị đặt lại.`
                    : `Bạn đang chuyển công việc "${modalConfig.item?.name}" về bước trước đó. Vui lòng ghi rõ lý do (VD: QC không đạt, làm lại...).`
                  }
                </p>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    {modalConfig.type === 'CANCEL' ? 'Lý do làm lại (Tùy chọn)' : 'Ghi chú / Lý do trả lại'}
                    {modalConfig.type !== 'CANCEL' && <span className="text-orange-500"> *</span>}
                  </label>
                  <textarea
                    className={`w-full p-3 border rounded-lg focus:ring-1 outline-none text-sm bg-neutral-950 text-slate-200 ${modalConfig.type === 'CANCEL'
                      ? 'border-red-900 focus:border-red-500'
                      : 'border-orange-900 focus:border-orange-500'
                      }`}
                    rows={3}
                    placeholder={
                      modalConfig.type === 'CANCEL'
                        ? "Nhập lý do (không bắt buộc)..."
                        : "Nhập lý do chuyển lại bước trước (VD: Đường chỉ lỗi, màu chưa chuẩn...)"
                    }
                    value={reasonInput}
                    onChange={(e) => setReasonInput(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="flex justify-end gap-3 mt-2">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 border border-neutral-700 rounded-lg text-slate-400 hover:bg-neutral-800 font-medium text-sm"
                  >
                    Quay lại
                  </button>
                  <button
                    onClick={confirmAction}
                    className={`px-4 py-2 rounded-lg text-white font-medium shadow-lg transition-all text-sm ${modalConfig.type === 'CANCEL'
                      ? 'bg-red-700 hover:bg-red-800 shadow-red-900/20'
                      : 'bg-orange-600 hover:bg-orange-700 shadow-orange-900/20'
                      }`}
                  >
                    Xác nhận
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* History Log Modal (Visual + Real Data Mix) */}
      {
        showHistory && (
          <div className="fixed inset-0 bg-black/60 z-[90] flex justify-end backdrop-blur-sm">
            <div className="w-full max-w-md bg-neutral-900 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-neutral-800">
              <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-900">
                <h3 className="font-serif font-bold text-lg text-slate-100 flex items-center gap-2">
                  <History size={20} className="text-gold-500" />
                  Lịch Sử Hoạt Động
                </h3>
                <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-neutral-800 rounded-full transition-colors">
                  <XCircle size={20} className="text-slate-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {logs.length === 0 ? (
                  <div className="text-center py-10 text-slate-600">
                    <History size={48} className="mx-auto mb-3 opacity-20" />
                    <p>Chưa có hoạt động nào được ghi nhận trong phiên này.</p>
                  </div>
                ) : (
                  logs.map(log => (
                    <div key={log.id} className="flex gap-3 relative pb-6 last:pb-0">
                      <div className="absolute left-[15px] top-8 bottom-0 w-px bg-neutral-800 last:hidden"></div>
                      <div className="flex-shrink-0">
                        {log.userAvatar ? (
                          <img src={log.userAvatar} alt="" className="w-8 h-8 rounded-full border border-neutral-700" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-bold text-slate-400">
                            {log.user.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-semibold text-sm text-slate-300">{log.user}</span>
                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                              <Clock size={10} /> {log.timestamp}
                            </span>
                          </div>
                          <p className={`text-xs font-medium mb-1 ${log.type === 'danger' ? 'text-red-500' :
                            log.type === 'warning' ? 'text-orange-500' : 'text-blue-500'
                            }`}>
                            {log.action}: {log.itemName}
                          </p>
                          {log.details && (
                            <p className="text-xs text-slate-500 leading-relaxed italic border-t border-neutral-800 pt-1 mt-1">
                              "{log.details}"
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )
      }


      {/* Edit Stage Tasks Modal */}
      {
        editingStage && (
          <EditStageTasksModal
            stageId={editingStage.stageId}
            stageName={editingStage.stageName}
            currentWorkflow={(workflows || []).find(wf => wf && wf.id === activeWorkflow)}
            onClose={() => setEditingStage(null)}
          />
        )
      }
    </div >
  );
};