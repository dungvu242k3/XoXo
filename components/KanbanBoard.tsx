import { AlertTriangle, Briefcase, Calendar, ChevronRight, Clock, Columns, History, Layers, MoreHorizontal, RotateCcw, User, X, XCircle } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../context';
import { DB_PATHS, supabase } from '../supabase';
import { ServiceCatalogItem, ServiceItem, ServiceType, WorkflowDefinition, WorkflowStage } from '../types';
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
// Fallback user definition removed in favor of dynamic resolution inside component

// Helper to remove undefined values before saving to Firebase
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

export const KanbanBoard: React.FC = () => {
  const { orders, updateOrderItemStatus, updateOrder, members } = useAppStore();
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);

  // Define current user relative to members data
  const currentUser = useMemo(() => {
    if (members && members.length > 0) {
      return members[0];
    }
    return {
      id: 'system',
      name: 'Hệ thống',
      role: 'Quản lý' as const,
      phone: '',
      email: '',
      status: 'Active' as const
    };
  }, [members]);
  const [services, setServices] = useState<ServiceCatalogItem[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [showOrderSelector, setShowOrderSelector] = useState(false);
  const initializedRef = useRef(false);
  const orderSelectorRef = useRef<HTMLDivElement>(null);

  // Safe orders check
  const safeOrders = Array.isArray(orders) ? orders : [];

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
        const list = data.map(item => ({
          ...item,
          // Ensure mapping if keys differ (though DB should match now)
          ten_dich_vu: item.ten_dich_vu || item.name,
          cac_buoc_quy_trinh: item.cac_buoc_quy_trinh || item.workflows,
          id_quy_trinh: item.id_quy_trinh || item.workflowId,
          gia_niem_yet: item.gia_niem_yet || item.price || 0,
          danh_muc: item.danh_muc || item.category || '',
          mo_ta: item.mo_ta || item.desc || '',
          anh_dich_vu: item.anh_dich_vu || item.image || ''
        } as ServiceCatalogItem));
        console.log('📦 Services loaded:', {
          count: list.length,
          services: list.map(s => ({ id: s.id, name: s.ten_dich_vu, workflowsCount: s.cac_buoc_quy_trinh?.length || 0 }))
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
            const list = data.map(item => ({
              ...item,
              ten_dich_vu: item.ten_dich_vu || item.name,
              cac_buoc_quy_trinh: item.cac_buoc_quy_trinh || item.workflows,
              id_quy_trinh: item.id_quy_trinh || item.workflowId,
              gia_niem_yet: item.gia_niem_yet || item.price || 0,
              danh_muc: item.danh_muc || item.category || '',
              mo_ta: item.mo_ta || item.desc || '',
              anh_dich_vu: item.anh_dich_vu || item.image || ''
            } as ServiceCatalogItem));
            setServices(list);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Load workflows from Supabase
  useEffect(() => {
    const loadWorkflows = async () => {
      try {
        const { data, error } = await supabase
          .from(DB_PATHS.WORKFLOWS)
          .select('*');

        if (!error && data) {
          const workflowsList: WorkflowDefinition[] = data.map(wf => ({
            id: wf.id || '',
            ten_quy_trinh: wf.ten_quy_trinh || wf.label || '',
            mo_ta: wf.mo_ta || wf.description || '',
            phong_ban_phu_trach: wf.phong_ban_phu_trach || wf.department || 'Kỹ Thuật',
            loai_ap_dung: wf.loai_ap_dung || wf.types || [],
            mau_sac: wf.mau_sac || wf.color || 'bg-blue-900/30 text-blue-400 border-blue-800',
            vat_tu_can_thiet: wf.vat_tu_can_thiet || wf.materials || undefined,
            cac_buoc: wf.cac_buoc || wf.stages || undefined,
            nhan_vien_duoc_giao: wf.nhan_vien_duoc_giao || wf.assignedMembers || undefined
          } as WorkflowDefinition));
          setWorkflows(workflowsList);
        } else {
          setWorkflows([]);
        }
      } catch (error) {
        console.error('Error loading workflows:', error);
        setWorkflows([]);
      }
    };

    loadWorkflows();

    // Listen for real-time updates
    const channel = supabase
      .channel('kanban-workflows-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: DB_PATHS.WORKFLOWS,
        },
        async () => {
          const { data } = await supabase.from(DB_PATHS.WORKFLOWS).select('*');
          if (data) {
            const workflowsList: WorkflowDefinition[] = data.map(wf => ({
              id: wf.id || '',
              ten_quy_trinh: wf.ten_quy_trinh || wf.label || '',
              mo_ta: wf.mo_ta || wf.description || '',
              phong_ban_phu_trach: wf.phong_ban_phu_trach || wf.department || 'Kỹ Thuật',
              loai_ap_dung: wf.loai_ap_dung || wf.types || [],
              mau_sac: wf.mau_sac || wf.color || 'bg-blue-900/30 text-blue-400 border-blue-800',
              vat_tu_can_thiet: wf.vat_tu_can_thiet || wf.materials || undefined,
              cac_buoc: wf.cac_buoc || wf.stages || undefined,
              nhan_vien_duoc_giao: wf.nhan_vien_duoc_giao || wf.assignedMembers || undefined
            } as WorkflowDefinition));
            setWorkflows(workflowsList);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Get workflows assigned to selected order - based on actual workflowIds in items
  const WORKFLOWS_FILTER = useMemo(() => {
    const baseFilter = [
      { id: 'ALL', label: 'Tất cả công việc', types: [] as ServiceType[], color: 'bg-neutral-800 text-slate-400' }
    ];

    try {
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
          name: s.ten_dich_vu,
          workflowsCount: s.cac_buoc_quy_trinh?.length || 0,
          workflows: s.cac_buoc_quy_trinh?.map(w => ({ id: w.id, order: w.thu_tu })) || []
        })));

        console.log('📋 Available Workflows:', (workflows || []).map(w => ({ id: w.id, label: w.ten_quy_trinh })));

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

                if (service && service.cac_buoc_quy_trinh && Array.isArray(service.cac_buoc_quy_trinh) && service.cac_buoc_quy_trinh.length > 0) {
                  console.log('📋 Service workflows details:', {
                    serviceId: service.id,
                    serviceName: service.ten_dich_vu,
                    workflowsCount: service.cac_buoc_quy_trinh.length,
                    workflows: service.cac_buoc_quy_trinh.map(w => ({ id: w.id, order: w.thu_tu }))
                  });

                  // Add ALL workflows from this service
                  service.cac_buoc_quy_trinh.forEach(wf => {
                    console.log('🔎 Trying to match workflow:', {
                      serviceWorkflowId: wf.id,
                      serviceWorkflowIdType: typeof wf.id,
                      serviceWorkflowOrder: wf.thu_tu
                    });

                    // Try to find workflow by ID first (exact match)
                    let workflowExists = (workflows || []).find(w => w && w.id === wf.id);

                    // If not found by ID, try to find by label (case-insensitive, trim spaces)
                    if (!workflowExists) {
                      const wfIdTrimmed = String(wf.id || '').trim();
                      workflowExists = (workflows || []).find(w => {
                        const wId = String(w.id || '').trim();
                        const wLabel = String(w.ten_quy_trinh || '').trim();
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
                            matchedWorkflowLabel: w.ten_quy_trinh,
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
                        matchedWorkflowLabel: workflowExists.ten_quy_trinh
                      });
                    }

                    if (workflowExists) {
                      orderWorkflowIds.add(workflowExists.id); // Use the actual workflow ID from workflows list
                      // Store order for sorting (use minimum order if workflow appears in multiple services)
                      const currentOrder = workflowOrderMap.get(workflowExists.id);
                      if (currentOrder === undefined || wf.thu_tu < currentOrder) {
                        workflowOrderMap.set(workflowExists.id, wf.thu_tu);
                      }
                      console.log('✅ Added workflow to orderWorkflowIds:', {
                        serviceWorkflowId: wf.id,
                        matchedWorkflowId: workflowExists.id,
                        workflowLabel: workflowExists.ten_quy_trinh,
                        order: wf.thu_tu
                      });
                    } else {
                      console.warn('❌ Workflow NOT FOUND in workflows list:', {
                        serviceWorkflowId: wf.id,
                        serviceWorkflowIdType: typeof wf.id,
                        serviceWorkflowIdValue: JSON.stringify(wf.id),
                        availableWorkflowIds: (workflows || []).map(w => w?.id).filter(Boolean),
                        availableWorkflowLabels: (workflows || []).map(w => w?.ten_quy_trinh).filter(Boolean),
                        allWorkflowData: (workflows || []).map(w => ({ id: w?.id, label: w?.ten_quy_trinh })).filter(w => w.id)
                      });
                    }
                  });
                } else if (service) {
                  console.warn('⚠️ Service has no workflows:', {
                    serviceId: service.id,
                    serviceName: service.ten_dich_vu,
                    hasWorkflows: !!service.cac_buoc_quy_trinh,
                    workflowsType: typeof service.cac_buoc_quy_trinh,
                    workflowsIsArray: Array.isArray(service.cac_buoc_quy_trinh)
                  });
                } else {
                  console.warn('❌ Service not found:', {
                    itemId: item.id,
                    itemServiceId: item.serviceId,
                    availableServiceIds: (services || []).map(s => s?.id).filter(Boolean),
                    availableServiceNames: (services || []).map(s => s?.ten_dich_vu).filter(Boolean)
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
          console.log('⚠️ No workflows found from services, showing all workflows as fallback');
          (workflows || []).forEach(wf => {
            if (wf && wf.id) {
              orderWorkflowIds.add(wf.id);
              if (!workflowOrderMap.has(wf.id)) {
                workflowOrderMap.set(wf.id, 999);
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
          .filter(wf => orderWorkflowIds.has(wf.id))
          .sort((a, b) => {
            const orderA = workflowOrderMap.get(a.id) ?? 999;
            const orderB = workflowOrderMap.get(b.id) ?? 999;
            return orderA - orderB;
          });

        console.log('🎯 Assigned Workflows (filtered & sorted):', {
          count: assignedWorkflows.length,
          workflows: assignedWorkflows.map(w => ({
            id: w.id,
            label: w.ten_quy_trinh,
            order: workflowOrderMap.get(w.id) ?? 999
          }))
        });
        console.log('🎯 All Available Workflows:', (workflows || []).map(w => ({ id: w?.id, label: w?.ten_quy_trinh })).filter(w => w.id));

        return [...baseFilter, ...assignedWorkflows];
      }

      // If no orders to process, show workflows from all services in all orders
      console.log('⚠️ No orders to process, getting workflows from all items in all orders');
      const allWorkflowIds = new Set<string>();
      const allWorkflowOrderMap = new Map<string, number>(); // workflowId -> order

      safeOrders.forEach(order => {
        if (order && order.items && Array.isArray(order.items)) {
          order.items
            .filter(item => item && !item.isProduct && item.serviceId)
            .forEach(item => {
              const service = (services || []).find(s => s && s.id === item.serviceId);
              if (service && service.cac_buoc_quy_trinh && Array.isArray(service.cac_buoc_quy_trinh) && service.cac_buoc_quy_trinh.length > 0) {
                service.cac_buoc_quy_trinh.forEach(wf => {
                  // Try to find workflow by ID first
                  let workflowExists = (workflows || []).find(w => w && w.id === wf.id);

                  // If not found by ID, try flexible matching
                  if (!workflowExists) {
                    const wfIdTrimmed = String(wf.id || '').trim();
                    workflowExists = (workflows || []).find(w => {
                      const wId = String(w.id || '').trim();
                      const wLabel = String(w.ten_quy_trinh || '').trim();
                      const wfIdLower = wfIdTrimmed.toLowerCase();
                      const wIdLower = wId.toLowerCase();
                      const wLabelLower = wLabel.toLowerCase();

                      return wId === wfIdTrimmed ||
                        wLabel === wfIdTrimmed ||
                        wIdLower === wfIdLower ||
                        wLabelLower === wfIdLower ||
                        wId.includes(wfIdTrimmed) ||
                        wfIdTrimmed.includes(wId) ||
                        wLabel.includes(wfIdTrimmed) ||
                        wfIdTrimmed.includes(wLabel);
                    });
                  }

                  if (workflowExists) {
                    allWorkflowIds.add(workflowExists.id);
                    // Store order for sorting (use minimum order if workflow appears in multiple services)
                    const currentOrder = allWorkflowOrderMap.get(workflowExists.id);
                    if (currentOrder === undefined || wf.thu_tu < currentOrder) {
                      allWorkflowOrderMap.set(workflowExists.id, wf.thu_tu);
                    }
                  }
                });
              }
            });
        }
      });

      // Sort workflows by order from service.workflows
      const allWorkflows = (workflows || [])
        .filter(wf => allWorkflowIds.has(wf.id))
        .sort((a, b) => {
          const orderA = allWorkflowOrderMap.get(a.id) ?? 999;
          const orderB = allWorkflowOrderMap.get(b.id) ?? 999;
          return orderA - orderB;
        });

      console.log('📋 All workflows from all services (sorted):', allWorkflows.map(w => ({
        id: w.id,
        label: w.ten_quy_trinh,
        order: allWorkflowOrderMap.get(w.id) ?? 999
      })));
      return [...baseFilter, ...allWorkflows];
    } catch (error) {
      console.error('Error in WORKFLOWS_FILTER:', error);
      return baseFilter;
    }
  }, [workflows, Array.from(selectedOrderIds).join(','), orders, services]);

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
    const allItems = (orders || []).flatMap(order => {
      if (!order.items || !Array.isArray(order.items)) return [];
      return order.items
        .filter(item => item && !item.isProduct)
        .map(item => {
          // Determine workflowId from service if not already set
          let workflowId = item.workflowId;

          // If no workflowId but has serviceId, get from service
          if (!workflowId && item.serviceId) {
            const service = (services || []).find(s => s && s.id === item.serviceId);
            if (service && service.cac_buoc_quy_trinh && Array.isArray(service.cac_buoc_quy_trinh) && service.cac_buoc_quy_trinh.length > 0) {
              // Get current workflow from item history, or use first workflow from service
              if (item.history && item.history.length > 0) {
                // Try to find workflow that matches current status
                const currentStageId = item.status;
                const matchingWf = service.cac_buoc_quy_trinh.find(wf => {
                  const wfDef = (workflows || []).find(w => w && w.id === wf.id);
                  if (wfDef && wfDef.cac_buoc) {
                    return wfDef.cac_buoc.some(s => s.id === currentStageId);
                  }
                  return false;
                });
                if (matchingWf) {
                  workflowId = matchingWf.id;
                } else {
                  // Use first workflow if no match
                  const sortedWorkflows = [...service.cac_buoc_quy_trinh].sort((a, b) => a.thu_tu - b.thu_tu);
                  workflowId = sortedWorkflows[0].id;
                }
              } else {
                // No history, use first workflow
                const sortedWorkflows = [...service.cac_buoc_quy_trinh].sort((a, b) => a.thu_tu - b.thu_tu);
                workflowId = sortedWorkflows[0].id;
              }
            }
          }

          // Generate ID as {orderId}-{serviceId} if serviceId exists
          // Otherwise use existing item.id
          const itemId = item.serviceId
            ? `${order.id}-${item.serviceId}`
            : item.id;

          return {
            ...item,
            id: itemId,
            orderId: order.id,
            customerName: order.customerName,
            expectedDelivery: order.expectedDelivery,
            workflowId: workflowId
          };
        });
    });

    console.log('Kanban items:', {
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
        history: i.history,
        fullItem: i
      }))
    });

    return allItems;
  }, [orders, workflows, services]);

  const [draggedItem, setDraggedItem] = useState<KanbanItem | null>(null);
  const [activeWorkflow, setActiveWorkflow] = useState<string>('ALL');
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedItem, setSelectedItem] = useState<KanbanItem | null>(null);
  const [editingStage, setEditingStage] = useState<{ stageId: string; stageName: string } | null>(null);

  // Get columns from active workflow
  const columns = useMemo(() => {
    if (activeWorkflow === 'ALL') {
      // If orders are selected, only show ALL workflows from services of items in those orders
      // If no orders selected, don't show any workflows
      if (selectedOrderIds.size === 0) {
        return [];
      }

      // Use Orders as Columns
      const relevantOrders = (orders || []).filter(o => o && selectedOrderIds.has(o.id));
      relevantOrders.sort((a, b) => b.id.localeCompare(a.id));

      return relevantOrders.map(order => ({
        id: order.id,
        title: `#${order.id} | ${order.customerName}`,
        dot: 'bg-gold-500',
        color: 'bg-neutral-900/50'
      }));
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

    return workflowColumns;
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
      user: currentUser.name,
      userAvatar: currentUser.avatar,
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
                      performedBy: currentUser.name
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
        updateOrderItemStatus(draggedItem.orderId, draggedItem.id, 'done', currentUser.name);
        addVisualLog('Hoàn thành', draggedItem.name, `Đã hoàn thành toàn bộ quy trình`, 'info');
      }

      setDraggedItem(null);
      return;
    }

    if (statusId === 'cancel') {
      console.log('🚫 Cancel column detected, checking for previous workflow...');
      let movedToPreviousWorkflow = false;

      // Check for Previous Workflow
      console.log('📋 Item info for cancel:', {
        serviceId: draggedItem.serviceId,
        workflowId: draggedItem.workflowId,
        itemName: draggedItem.name
      });

      if (draggedItem.serviceId && draggedItem.workflowId) {
        const service = (services || []).find(s => s && s.id === draggedItem.serviceId);
        console.log('🔍 Found service:', service ? {
          id: service.id,
          name: service.name,
          workflows: service.workflows
        } : 'NOT FOUND');

        if (service && service.workflows && service.workflows.length > 0) {
          const currentWfIndex = service.workflows.findIndex(wf => wf.id === draggedItem.workflowId);
          console.log('📊 Current workflow index:', {
            currentWfIndex,
            totalWorkflows: service.workflows.length
          });

          // Check if there's a previous workflow (index > 0)
          if (currentWfIndex > 0) {
            const prevWfConfig = service.workflows[currentWfIndex - 1];
            const prevWf = (workflows || []).find(w => w && w.id === prevWfConfig.id);
            console.log('⬅️ Previous workflow:', prevWf ? {
              id: prevWf.id,
              label: prevWf.label,
              stagesCount: prevWf.stages?.length || 0
            } : 'NOT FOUND');

            if (prevWf && prevWf.stages && prevWf.stages.length > 0) {
              // Find LAST stage of previous workflow
              const sortedStages = [...prevWf.stages].sort((a, b) => a.order - b.order);
              const lastStage = sortedStages[sortedStages.length - 1];
              console.log('🎬 Last stage of previous workflow:', lastStage);

              // Show modal to get reason
              setModalConfig({
                isOpen: true,
                type: 'CANCEL',
                item: draggedItem,
                targetStatus: 'previous_workflow',
                previousWorkflow: { workflow: prevWf, stage: lastStage }
              });
              setDraggedItem(null);
              return;
            } else {
              alert('Quy trình trước chưa được cấu hình các bước!');
            }
          } else {
            console.log('ℹ️ No previous workflow (first workflow)');
            alert('Đây là quy trình đầu tiên, không thể quay lại quy trình trước!');
          }
        } else {
          console.log('⚠️ Service has no workflows configured');
        }
      } else {
        console.log('⚠️ Item missing serviceId or workflowId');
      }

      // If no previous workflow, just show cancel modal
      if (!movedToPreviousWorkflow) {
        setModalConfig({
          isOpen: true,
          type: 'CANCEL',
          item: draggedItem,
          targetStatus: statusId
        });
      }

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
      updateOrderItemStatus(draggedItem.orderId, draggedItem.id, statusId, currentUser.name);
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
      updateOrderItemStatus(draggedItem.orderId, draggedItem.id, statusId, currentUser.name);
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

    if (!reasonInput.trim()) {
      alert("Vui lòng nhập nội dung ghi chú!");
      return;
    }

    const oldStatusTitle = columns.find(c => c.id === modalConfig.item?.status)?.title;

    if (modalConfig.type === 'CANCEL') {
      // Check if we need to move to previous workflow
      if (modalConfig.previousWorkflow) {
        const { workflow: prevWf, stage: lastStage } = modalConfig.previousWorkflow;
        const order = orders.find(o => o.id === modalConfig.item.orderId);

        if (order) {
          const now = Date.now();
          const updatedItems = order.items.map(item => {
            if (item.id === modalConfig.item.id) {
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
                stageId: lastStage.id,
                stageName: lastStage.name,
                enteredAt: now,
                performedBy: currentUser.name
              });

              return {
                ...item,
                workflowId: prevWf.id,
                status: lastStage.id,
                history: newHistory,
                lastUpdated: now
              };
            }
            return item;
          });

          const cleanedOrder = removeUndefined({ ...order, items: updatedItems });
          updateOrder(order.id, cleanedOrder);
          addVisualLog('Trả lại quy trình', modalConfig.item.name, `Từ [${oldStatusTitle}] về quy trình: ${prevWf.label} (${lastStage.name}). Lý do: ${reasonInput}`, 'warning');
        }
      } else {
        // Just mark as cancelled
        updateOrderItemStatus(modalConfig.item.orderId, modalConfig.item.id, 'cancel', currentUser.name, reasonInput);
        addVisualLog('Hủy', modalConfig.item.name, `Từ [${oldStatusTitle}]. Lý do: ${reasonInput}`, 'danger');
      }
    }
    else if (modalConfig.type === 'BACKWARD' && modalConfig.targetStatus) {
      const newStatusTitle = columns.find(c => c.id === modalConfig.targetStatus)?.title;
      updateOrderItemStatus(modalConfig.item.orderId, modalConfig.item.id, modalConfig.targetStatus, currentUser.name, reasonInput);
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
        serviceId: i.serviceId
      }))
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
    const filtered = result.filter(item => item.workflowId === activeWorkflow);
    console.log('📋 After workflow filter:', {
      activeWorkflow,
      filteredCount: filtered.length,
      filteredItems: filtered.map(i => ({ id: i.id, name: i.name, workflowId: i.workflowId }))
    });
    return filtered;
  }, [items, activeWorkflow, Array.from(selectedOrderIds).join(',')]);

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

  const checkStatusMatch = (item: KanbanItem, colId: string) => {
    if (activeWorkflow === 'ALL') {
      return item.orderId === colId;
    }

    if (item.status === colId) return true;
    const itemStatusId = mapStatusToStageId(item.status);
    if (itemStatusId === colId) return true;
    if (item.status.toLowerCase() === colId.toLowerCase()) return true;

    // Check against all stages across all workflows
    const stage = workflows.flatMap(wf => wf.stages || []).find(s => s.id === colId);
    if (stage && (item.status === stage.name || item.status.toLowerCase() === stage.name.toLowerCase())) {
      return true;
    }
    return false;
  };

  const renderCard = (item: KanbanItem) => {
    const getStageName = (statusId: string) => {
      const stage = workflows.flatMap(wf => wf.stages || []).find(s => s.id === statusId);
      if (stage) return stage.name;
      if (statusId === 'in-queue') return 'Chờ xử lý';
      if (statusId === 'ready') return 'Hoàn thành';
      if (statusId === 'done') return 'Hoàn thành';
      if (statusId === 'cancel') return 'Đã hủy';
      return statusId;
    };

    const wf = (workflows || []).find(w => w && w.id === item.workflowId);
    const currentStage = wf?.stages?.find(s => s.id === item.status);
    const allStages = wf?.stages ? [...wf.stages].sort((a, b) => a.order - b.order) : [];

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
              <span className="text-[10px] font-mono text-slate-400 bg-neutral-800/80 px-2 py-0.5 rounded-md border border-neutral-700/50">{item.id}</span>
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
          {/* Workflow Name */}
          {wf && (
            <div className="flex items-center gap-2 mb-3 px-2 py-1.5 bg-neutral-800/40 rounded-lg border border-neutral-700/30">
              <Layers size={12} className="text-slate-400" />
              <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide">{wf.label}</span>
            </div>
          )}

          {/* Workflow Stages Progress */}
          {allStages.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {allStages.map((stage, idx) => {
                  const isCompleted = item.history?.some(h => h.stageId === stage.id) || false;
                  const isCurrent = stage.id === item.status;
                  const isUpcoming = !isCompleted && !isCurrent;

                  return (
                    <React.Fragment key={stage.id}>
                      <div className={`flex-shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all ${isCurrent
                        ? 'bg-gold-600/20 text-gold-400 border border-gold-500/50 shadow-sm shadow-gold-500/20'
                        : isCompleted
                          ? 'bg-emerald-900/20 text-emerald-400 border border-emerald-700/30'
                          : 'bg-neutral-800/40 text-slate-500 border border-neutral-700/30'
                        }`}>
                        <span className="line-clamp-1 max-w-[80px]">{stage.name}</span>
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
          )}

          {/* Current Stage Highlight */}
          {currentStage && (
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-gold-900/10 border border-gold-800/30 rounded-lg mb-3">
              <span className="w-2 h-2 rounded-full bg-gold-500 animate-pulse"></span>
              <span className="text-[11px] font-bold text-gold-400">{currentStage.name}</span>
            </div>
          )}
        </div>

        {/* Footer Section */}
        <div className="pt-3 border-t border-neutral-800/60">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-neutral-800/50 px-2.5 py-1.5 rounded-lg border border-neutral-700/30">
              <Calendar size={12} className="text-slate-500" />
              <span className="text-[11px]">
                <span className="text-slate-500">Ngày hẹn:</span>{' '}
                <span className="text-slate-200 font-medium">{item.expectedDelivery || 'Chưa có'}</span>
              </span>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-gold-400">{item.price.toLocaleString()} ₫</div>
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

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col relative">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-100 flex items-center gap-3">
            <Columns className="text-gold-500" />
            Bảng Tiến Độ (Kanban)
          </h1>
          <p className="text-slate-500 mt-1">Quản lý trực quan quy trình sản xuất theo từng nhóm việc.</p>
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
            {selectedOrderIds.size > 0 && selectedOrderIds.size < safeOrders.length ? 'Quy trình của đơn hàng đã chọn' : 'Danh sách quy trình'}
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
          <div className="flex h-full gap-6 min-w-full p-4 overflow-x-auto">
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
        </div>
      </div>


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
                    {modalConfig.type === 'CANCEL' ? 'Xác nhận Hủy Công Việc' : 'Cảnh báo: Lùi Quy Trình'}
                  </h3>
                </div>
              </div>

              <div className="p-6">
                <p className="text-slate-400 mb-4 text-sm">
                  {modalConfig.type === 'CANCEL'
                    ? `Bạn có chắc chắn muốn hủy công việc "${modalConfig.item?.name}" không? Hành động này không thể hoàn tác.`
                    : `Bạn đang chuyển công việc "${modalConfig.item?.name}" về bước trước đó. Vui lòng ghi rõ lý do (VD: QC không đạt, làm lại...).`
                  }
                </p>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    {modalConfig.type === 'CANCEL' ? 'Lý do hủy' : 'Ghi chú / Lý do trả lại'}
                    <span className={modalConfig.type === 'CANCEL' ? "text-red-500" : "text-orange-500"}> *</span>
                  </label>
                  <textarea
                    className={`w-full p-3 border rounded-lg focus:ring-1 outline-none text-sm bg-neutral-950 text-slate-200 ${modalConfig.type === 'CANCEL'
                      ? 'border-red-900 focus:border-red-500'
                      : 'border-orange-900 focus:border-orange-500'
                      }`}
                    rows={3}
                    placeholder={
                      modalConfig.type === 'CANCEL'
                        ? "Nhập lý do hủy đơn..."
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