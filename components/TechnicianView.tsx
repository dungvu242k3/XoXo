import { AlertTriangle, Camera, CheckCircle2, Clock, FileText, Filter, Save, Trash2, Upload, User } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../context';
import { DB_PATHS, supabase } from '../supabase';
import { Member, ServiceCatalogItem, ServiceItem, WorkflowDefinition } from '../types';

// Current simulated user
// Current simulated user


// Helper to map old status to new stage IDs (for backward compatibility)
const mapStatusToStageId = (status: string): string => {
  const statusMap: Record<string, string> = {
    'In Queue': 'in-queue',
    'Cleaning': 'cleaning',
    'Repairing': 'repairing',
    'QC': 'qc',
    'Ready': 'ready',
    'Done': 'done'
  };
  return statusMap[status] || status.toLowerCase().replace(/\s+/g, '-');
};

// Helper to get workflow stages from serviceId (now accepts workflows and services parameters)
const getWorkflowStages = (serviceId?: string, workflows?: WorkflowDefinition[], services?: ServiceCatalogItem[]) => {
  if (!serviceId) return null;

  // Use provided services or empty array
  const serviceList = services || [];

  // Find service in catalog
  const service = serviceList.find(s => s.id === serviceId);
  if (!service) {
    console.warn('Service not found:', serviceId);
    return null;
  }

  // Get first workflow ID (if multiple workflows, use first one)
  let workflowId: string | undefined;

  // Check for new workflows format (array of {id, order})
  if ('workflows' in service && Array.isArray(service.workflows) && service.workflows.length > 0) {
    // Sort by order and get first one
    const sortedWorkflows = [...service.workflows].sort((a, b) => a.order - b.order);
    workflowId = sortedWorkflows[0].id;
  }
  // Check for old workflowId format
  else if ('workflowId' in service) {
    if (typeof service.workflowId === 'string') {
      workflowId = service.workflowId;
    } else if (Array.isArray(service.workflowId) && service.workflowId.length > 0) {
      workflowId = service.workflowId[0];
    }
  }

  if (!workflowId) return null;

  // Find workflow from provided workflows
  const workflowList = workflows || [];
  const workflow = workflowList.find(wf => wf.id === workflowId);
  if (!workflow || !workflow.stages || workflow.stages.length === 0) return null;

  return workflow.stages.sort((a, b) => a.order - b.order);
};

// Filter options will be generated dynamically from workflows

interface FlatTask extends ServiceItem {
  orderId: string;
  orderCode: string;
  customerName: string;
  expectedDelivery: string;
  orderNotes?: string;
}

const WorkflowStep: React.FC<{ title: string; status: string; index: number; currentIndex: number }> = ({ title, status, index, currentIndex }) => {
  // Determine visual state based on index comparisons
  let isActive = false;
  let isCompleted = false;

  if (index < currentIndex) {
    isCompleted = true;
  } else if (index === currentIndex) {
    isActive = true;
  }

  return (
    <div className={`relative flex items-center gap-3 p-3 rounded-lg border transition-all duration-300 ${isActive
      ? 'bg-neutral-800 border-gold-600 shadow-md shadow-black/30 scale-[1.02] z-10'
      : isCompleted
        ? 'bg-emerald-900/20 border-emerald-900/50 opacity-90'
        : 'bg-neutral-900 border-neutral-800 opacity-60'
      }`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${isCompleted ? 'bg-emerald-600 text-white' : isActive ? 'bg-gold-500 text-black' : 'bg-neutral-800 text-slate-500'
        }`}>
        {isCompleted ? <CheckCircle2 size={16} /> : <Clock size={16} />}
      </div>
      <div className="flex-1">
        <h4 className={`font-medium text-sm ${isActive ? 'text-slate-100' : 'text-slate-500'}`}>{title}</h4>
      </div>
      {isActive && (
        <span className="px-2 py-0.5 bg-gold-600 text-black rounded text-[10px] font-bold shadow-sm uppercase">Đang làm</span>
      )}
    </div>
  );
};

export const TechnicianView: React.FC = () => {
  const { orders, addTechnicianNote, updateOrderItemStatus, deleteOrderItem, updateOrder, members } = useAppStore();

  const currentUser = useMemo(() => {
    if (members.length > 0) return members[0];
    return {
      id: 'system',
      name: 'System User',
      role: 'Admin',
      phone: '',
      email: '',
      status: 'Active',
      avatar: undefined
    } as Member;
  }, [members]);

  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [noteInput, setNoteInput] = useState('');
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [services, setServices] = useState<ServiceCatalogItem[]>([]);
  const [showImageUploadModal, setShowImageUploadModal] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
            label: wf.label || '',
            description: wf.description || '',
            department: wf.department || 'Kỹ Thuật',
            types: wf.types || [],
            color: wf.color || 'bg-blue-900/30 text-blue-400 border-blue-800',
            materials: wf.materials || undefined,
            stages: wf.stages || undefined,
            assignedMembers: wf.assignedMembers || undefined
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
      .channel('workflows-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: DB_PATHS.WORKFLOWS,
        },
        async () => {
          // Reload workflows on change
          const { data } = await supabase.from(DB_PATHS.WORKFLOWS).select('*');
          if (data) {
            const workflowsList: WorkflowDefinition[] = data.map(wf => ({
              id: wf.id || '',
              label: wf.label || '',
              description: wf.description || '',
              department: wf.department || 'Kỹ Thuật',
              types: wf.types || [],
              color: wf.color || 'bg-blue-900/30 text-blue-400 border-blue-800',
              materials: wf.materials || undefined,
              stages: wf.stages || undefined,
              assignedMembers: wf.assignedMembers || undefined
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

  // Load services from Supabase
  useEffect(() => {
    const loadServices = async () => {
      try {
        const { data, error } = await supabase
          .from(DB_PATHS.SERVICES)
          .select('*');

        // Bắt đầu với empty data
        const mergedServices = new Map<string, ServiceCatalogItem>();


        // Merge với data từ Supabase (ưu tiên Supabase nếu trùng ID)
        if (!error && data) {
          data.forEach(svc => {
            const serviceId = svc.id || '';
            mergedServices.set(serviceId, {
              id: serviceId,
              name: svc.name || '',
              category: svc.category || '',
              price: svc.price || 0,
              desc: svc.desc || '',
              image: svc.image || '',
              workflows: svc.workflows || (svc.workflowId ? (Array.isArray(svc.workflowId) ? svc.workflowId.map((id: string, idx: number) => ({ id, order: idx })) : [{ id: svc.workflowId, order: 0 }]) : [])
            } as ServiceCatalogItem);
          });
        }

        setServices(Array.from(mergedServices.values()));
      } catch (error) {
        console.error('Error loading services:', error);
        setServices([]);
      }
    };

    loadServices();

    // Listen for real-time updates
    const channel = supabase
      .channel('services-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: DB_PATHS.SERVICES,
        },
        async () => {
          // Reload services on change
          const { data } = await supabase.from(DB_PATHS.SERVICES).select('*');
          if (data) {
            const mergedServices = new Map<string, ServiceCatalogItem>();

            data.forEach(svc => {
              const serviceId = svc.id || '';
              mergedServices.set(serviceId, {
                id: serviceId,
                name: svc.name || '',
                category: svc.category || '',
                price: svc.price || 0,
                desc: svc.desc || '',
                image: svc.image || '',
                workflows: svc.workflows || (svc.workflowId ? (Array.isArray(svc.workflowId) ? svc.workflowId.map((id: string, idx: number) => ({ id, order: idx })) : [{ id: svc.workflowId, order: 0 }]) : [])
              } as ServiceCatalogItem);
            });
            setServices(Array.from(mergedServices.values()));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Flatten orders to tasks assigned to me (Simulated logic: In a real app, we filter by assignee. Here we show all active items)
  const myTasks: FlatTask[] = useMemo(() => {
    return orders.flatMap(order =>
      order.items
        .filter(item => !item.isProduct && item.status !== 'Done' && item.status !== 'Delivered') // Filter out finished/products
        .map(item => ({
          ...item,
          orderId: order.id,
          orderCode: order.id,
          customerName: order.customerName,
          expectedDelivery: order.expectedDelivery,
          orderNotes: order.notes
        }))
    );
  }, [orders]);

  // Generate filter options from all workflow stages
  const filterOptions = useMemo(() => {
    const allStages = new Map<string, string>(); // stageId -> stageName

    // Add default "ALL" option
    const options = [{ id: 'ALL', label: 'Tất Cả' }];

    // Collect all unique stages from all workflows
    workflows.forEach(workflow => {
      if (workflow.stages && workflow.stages.length > 0) {
        workflow.stages.forEach(stage => {
          if (!allStages.has(stage.id)) {
            allStages.set(stage.id, stage.name);
          }
        });
      }
    });

    // Add backward compatibility mappings
    const statusMap: Record<string, string> = {
      'In Queue': 'in-queue',
      'Cleaning': 'cleaning',
      'Repairing': 'repairing',
      'QC': 'qc',
      'Ready': 'ready',
      'Done': 'done'
    };

    // Add mapped statuses if they don't exist
    Object.entries(statusMap).forEach(([oldStatus, stageId]) => {
      if (!allStages.has(stageId) && !allStages.has(oldStatus)) {
        allStages.set(oldStatus, oldStatus); // Keep old status for backward compatibility
      }
    });

    // Convert to filter options
    Array.from(allStages.entries()).forEach(([id, name]) => {
      options.push({ id, label: name });
    });

    return options;
  }, [workflows]);

  const filteredTasks = useMemo(() => {
    if (filterStatus === 'ALL') return myTasks;

    // Try exact match first
    let filtered = myTasks.filter(task => task.status === filterStatus);

    // If no results, try mapping
    if (filtered.length === 0) {
      const mappedId = mapStatusToStageId(filterStatus);
      filtered = myTasks.filter(task => {
        // Match by stage ID
        if (task.status === mappedId) return true;
        // Match by mapped status
        if (mapStatusToStageId(task.status) === mappedId) return true;
        // Case-insensitive match
        if (task.status.toLowerCase() === filterStatus.toLowerCase()) return true;
        return false;
      });
    }

    return filtered;
  }, [myTasks, filterStatus]);

  const activeTask = useMemo(() =>
    myTasks.find(t => t.id === activeTaskId) || myTasks[0] || null
    , [myTasks, activeTaskId]);

  // Get workflow stages for active task
  const workflowStages = useMemo(() => {
    if (!activeTask) {
      console.log('No active task');
      return null;
    }

    const stages = getWorkflowStages(activeTask.serviceId, workflows, services);
    console.log('Workflow stages for task:', {
      serviceId: activeTask.serviceId,
      taskStatus: activeTask.status,
      stagesFound: stages ? stages.length : 0,
      stages: stages?.map(s => ({ id: s.id, name: s.name, order: s.order }))
    });

    return stages;
  }, [activeTask, workflows, services]);

  // Map current status to stage ID - try direct match first, then fallback to mapping
  const currentStageId = useMemo(() => {
    if (!activeTask || !workflowStages) return null;

    // Debug log
    console.log('Finding current stage:', {
      taskStatus: activeTask.status,
      workflowStageIds: workflowStages.map(s => s.id),
      workflowStageNames: workflowStages.map(s => s.name)
    });

    // First, try to find exact match in workflow stages
    const exactMatch = workflowStages.find(stage => stage.id === activeTask.status);
    if (exactMatch) {
      console.log('Found exact match:', exactMatch.id);
      return exactMatch.id;
    }

    // If no exact match, try mapping
    const mappedId = mapStatusToStageId(activeTask.status);
    const mappedMatch = workflowStages.find(stage => stage.id === mappedId);
    if (mappedMatch) {
      console.log('Found mapped match:', mappedMatch.id);
      return mappedMatch.id;
    }

    // If still no match, try case-insensitive search
    const caseInsensitiveMatch = workflowStages.find(stage =>
      stage.id.toLowerCase() === activeTask.status.toLowerCase() ||
      stage.name.toLowerCase() === activeTask.status.toLowerCase()
    );
    if (caseInsensitiveMatch) {
      console.log('Found case-insensitive match:', caseInsensitiveMatch.id);
      return caseInsensitiveMatch.id;
    }

    console.warn('No stage match found for status:', activeTask.status);
    return null;
  }, [activeTask, workflowStages]);

  // Find current step index
  const currentStepIndex = useMemo(() => {
    if (!workflowStages || !currentStageId) return -1;
    return workflowStages.findIndex(stage => stage.id === currentStageId);
  }, [workflowStages, currentStageId]);

  // Filter technical logs to show only current stage and previous stages
  const filteredTechnicalLogs = useMemo(() => {
    if (!activeTask || !activeTask.technicalLog || currentStepIndex < 0) {
      return activeTask?.technicalLog || [];
    }

    // Get current stage ID
    const currentStage = workflowStages?.[currentStepIndex];
    if (!currentStage) return activeTask.technicalLog;

    // Show logs from current stage and previous stages only
    const currentAndPreviousStageIds = workflowStages
      .slice(0, currentStepIndex + 1)
      .map(s => s.id);

    return activeTask.technicalLog.filter(log =>
      currentAndPreviousStageIds.includes(log.stage) ||
      // Also include logs that match current stage name (for backward compatibility)
      log.stage === currentStage.name ||
      log.stage === currentStage.id
    );
  }, [activeTask, workflowStages, currentStepIndex]);

  const handleSaveNote = () => {
    if (!activeTask || !noteInput.trim()) return;
    addTechnicianNote(activeTask.orderId, activeTask.id, noteInput, currentUser.name);
    setNoteInput('');
  };

  const handleCompleteStep = async () => {
    if (!activeTask || !workflowStages || currentStepIndex < 0) {
      alert('Không thể hoàn thành bước này. Vui lòng kiểm tra lại trạng thái hiện tại.');
      return;
    }

    try {
      const nextStepIndex = currentStepIndex + 1;
      if (nextStepIndex < workflowStages.length) {
        // Move to next stage in current workflow
        const nextStage = workflowStages[nextStepIndex];
        const currentStage = workflowStages[currentStepIndex];
        await updateOrderItemStatus(activeTask.orderId, activeTask.id, nextStage.id, currentUser.name, "Hoàn thành bước " + currentStage.name);
      } else {
        // Final step - check if there's a next workflow
        const lastStage = workflowStages[workflowStages.length - 1];

        // Check for next workflow
        if (activeTask.serviceId && activeTask.workflowId) {
          const service = services.find(s => s.id === activeTask.serviceId);
          if (service && service.workflows && Array.isArray(service.workflows) && service.workflows.length > 0) {
            // Find current workflow index
            const currentWfIndex = service.workflows.findIndex(wf => wf.id === activeTask.workflowId);

            if (currentWfIndex !== -1 && currentWfIndex < service.workflows.length - 1) {
              // There's a next workflow - move to it
              const nextWfConfig = service.workflows[currentWfIndex + 1];
              const nextWf = workflows.find(w => w.id === nextWfConfig.id);

              if (nextWf && nextWf.stages && nextWf.stages.length > 0) {
                // Find first stage of next workflow
                const sortedStages = [...nextWf.stages].sort((a, b) => a.order - b.order);
                const firstStage = sortedStages[0];

                // Update order with new workflow
                const order = orders.find(o => o.id === activeTask.orderId);
                if (order) {
                  const now = Date.now();
                  const updatedItems = order.items.map(item => {
                    if (item.id === activeTask.id) {
                      // Close current workflow history
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
                      // Open new workflow history
                      newHistory.push({
                        stageId: firstStage.id,
                        stageName: firstStage.name,
                        enteredAt: now,
                        performedBy: currentUser.name
                      });

                      return {
                        ...item,
                        workflowId: nextWf.id, // Update to next workflow
                        status: firstStage.id,
                        history: newHistory,
                        lastUpdated: now
                      };
                    }
                    return item;
                  });

                  // Helper to remove undefined values
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

                  const cleanedOrder = removeUndefined({ ...order, items: updatedItems });
                  await updateOrder(order.id, cleanedOrder);
                  alert(`Đã chuyển sang quy trình: ${nextWf.label} (Bước: ${firstStage.name})`);
                  return; // Exit early, don't mark as done
                }
              } else {
                alert('Quy trình tiếp theo chưa được cấu hình các bước!');
              }
            }
          }
        }

        // No next workflow - mark as done
        await updateOrderItemStatus(activeTask.orderId, activeTask.id, lastStage.id, currentUser.name, "Hoàn thành quy trình");
      }
    } catch (error: any) {
      console.error('Lỗi khi hoàn thành bước:', error);
      alert('Lỗi khi hoàn thành bước: ' + (error?.message || String(error)));
    }
  };

  const handleDeleteTask = async () => {
    if (!activeTask) return;

    if (window.confirm(`Bạn có chắc chắn muốn xóa "${activeTask.name}" khỏi đơn hàng?\n\nHành động này sẽ xóa item này khỏi đơn hàng ${activeTask.orderCode}.`)) {
      try {
        await deleteOrderItem(activeTask.orderId, activeTask.id);
        setActiveTaskId(null);
      } catch (error: any) {
        console.error('Lỗi khi xóa item:', error);
        alert('Lỗi khi xóa item: ' + (error?.message || String(error)));
      }
    }
  };

  const handleImageUploadClick = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    console.log('Image upload clicked');
    setImageUrl('');
    setShowImageUploadModal(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn file ảnh!');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File quá lớn! Vui lòng chọn file nhỏ hơn 5MB.');
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setImageUrl(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveImage = async () => {
    if (!activeTask || !imageUrl.trim()) {
      alert('Vui lòng nhập URL ảnh hoặc chọn file!');
      return;
    }

    try {
      const order = orders.find(o => o.id === activeTask.orderId);
      if (!order) {
        alert('Không tìm thấy đơn hàng!');
        return;
      }

      const itemIndex = order.items.findIndex(i => i.id === activeTask.id);
      if (itemIndex === -1) {
        alert('Không tìm thấy item!');
        return;
      }

      const updatedOrder = {
        ...order,
        items: order.items.map((item, idx) =>
          idx === itemIndex
            ? { ...item, afterImage: imageUrl }
            : item
        )
      };

      await updateOrder(activeTask.orderId, updatedOrder);
      setShowImageUploadModal(false);
      setImageUrl('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Lỗi khi lưu ảnh:', error);
      alert('Lỗi khi lưu ảnh: ' + (error?.message || String(error)));
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-100 flex items-center gap-3">
            <User className="text-gold-500" size={28} />
            Công Việc Của Tôi
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Xin chào {currentUser.name}, chúc bạn một ngày làm việc hiệu quả.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task List Sidebar */}
        <div className="bg-neutral-900 rounded-xl shadow-lg shadow-black/20 border border-neutral-800 overflow-hidden h-[calc(100vh-12rem)] flex flex-col">
          <div className="p-4 border-b border-neutral-800 bg-neutral-900 space-y-3">
            <h2 className="font-semibold text-slate-200">Danh Sách ({filteredTasks.length})</h2>

            {/* Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {filterOptions.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setFilterStatus(opt.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${filterStatus === opt.id
                    ? 'bg-gold-600 text-black border-gold-600'
                    : 'bg-neutral-800 text-slate-400 border-neutral-700 hover:border-slate-500'
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-neutral-800 overflow-y-auto flex-1">
            {filteredTasks.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">Không có công việc nào</div>
            ) : (
              filteredTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => setActiveTaskId(task.id)}
                  className={`p-4 hover:bg-neutral-800 cursor-pointer transition-colors ${(activeTask?.id === task.id) ? 'bg-gold-900/10 border-l-4 border-gold-500' : 'border-l-4 border-transparent'
                    }`}
                >
                  <div className="flex justify-between mb-1">
                    <span className={`font-medium line-clamp-1 ${(activeTask?.id === task.id) ? 'text-gold-400' : 'text-slate-300'}`}>{task.name}</span>
                    <span className="text-xs font-mono text-slate-500 ml-2">#{task.id}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-slate-500 mt-2">
                    <span className="text-xs bg-neutral-800 px-2 py-0.5 rounded border border-neutral-700">{task.status}</span>
                    <span className="text-xs flex items-center gap-1">
                      <Clock size={10} /> {task.expectedDelivery}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Workspace */}
        <div className="lg:col-span-2 space-y-6">
          {activeTask ? (
            <div className="bg-neutral-900 p-6 rounded-xl shadow-lg shadow-black/20 border border-neutral-800 h-full flex flex-col">
              <div className="flex justify-between items-start mb-6 pb-6 border-b border-neutral-800">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-slate-100">{activeTask.name}</h2>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-slate-500 text-sm bg-neutral-800 px-2 py-1 rounded">Đơn: {activeTask.orderCode}</span>
                    <span className="text-slate-500 text-sm bg-neutral-800 px-2 py-1 rounded">Khách: {activeTask.customerName}</span>
                  </div>
                  {activeTask.orderNotes && (
                    <div className="mt-3 text-sm text-orange-400 flex items-center gap-2 bg-orange-900/10 px-3 py-2 rounded border border-orange-900/30">
                      <AlertTriangle size={14} />
                      Lưu ý từ đơn hàng: "{activeTask.orderNotes}"
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-blue-900/20 text-blue-400 rounded-full text-sm font-medium border border-blue-900/50">
                    {activeTask.type}
                  </span>
                  <button
                    onClick={handleDeleteTask}
                    className="p-2 bg-red-900/20 hover:bg-red-900/30 text-red-400 rounded-lg border border-red-900/50 transition-colors"
                    title="Xóa item này"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1 overflow-y-auto">
                {/* Workflow Column */}
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-slate-300 mb-4 px-1 flex items-center gap-2">
                      <Filter size={16} className="text-gold-500" /> Quy Trình Xử Lý
                    </h3>
                    <div className="space-y-3 relative">
                      <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-neutral-800 -z-10"></div>
                      {workflowStages ? (
                        workflowStages.map((stage, idx) => (
                          <WorkflowStep
                            key={stage.id}
                            title={stage.name}
                            status={stage.id}
                            index={idx}
                            currentIndex={currentStepIndex}
                          />
                        ))
                      ) : (
                        <div className="text-center py-4 text-slate-500 text-sm">
                          Không tìm thấy quy trình cho dịch vụ này
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-neutral-800">
                    <button
                      onClick={handleCompleteStep}
                      disabled={!activeTask || !workflowStages || currentStepIndex < 0 || currentStepIndex >= (workflowStages?.length || 0)}
                      className="w-full bg-emerald-700 hover:bg-emerald-600 disabled:bg-neutral-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white py-3 rounded-lg font-bold transition-colors shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 size={20} />
                      {currentStepIndex >= (workflowStages?.length || 0) - 1 ? 'Hoàn Thành Quy Trình' : 'Hoàn Thành Bước Này'}
                    </button>
                    {(!activeTask || !workflowStages || currentStepIndex < 0) && (
                      <p className="text-xs text-slate-500 mt-2 text-center">
                        {!activeTask ? 'Chưa chọn công việc' : !workflowStages ? 'Không tìm thấy quy trình' : 'Không xác định được bước hiện tại'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Evidence & Notes Column */}
                <div className="flex flex-col gap-4">
                  {/* Images */}
                  <div className="bg-neutral-950 rounded-lg p-4 border border-neutral-800">
                    <h3 className="font-semibold text-slate-300 mb-3 flex items-center gap-2 text-sm">
                      <Camera size={16} className="text-gold-500" /> Hình Ảnh Hiện Trường
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative aspect-square bg-neutral-800 rounded overflow-hidden group">
                        <img src={activeTask.beforeImage} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="Before" />
                        <span className="absolute bottom-1 left-1 text-[10px] bg-black/80 text-white px-1.5 py-0.5 rounded">Trước</span>
                      </div>
                      <div
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleImageUploadClick(e);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="relative aspect-square bg-neutral-900 border-2 border-dashed border-neutral-700 rounded flex flex-col items-center justify-center text-slate-500 hover:border-gold-500 hover:text-gold-500 cursor-pointer transition-colors"
                      >
                        {activeTask.afterImage ? (
                          <>
                            <img src={activeTask.afterImage} className="w-full h-full object-cover opacity-80" alt="After" />
                            <span className="absolute bottom-1 left-1 text-[10px] bg-black/80 text-white px-1.5 py-0.5 rounded">Sau</span>
                            <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center">
                              <Upload size={20} className="opacity-0 hover:opacity-100 transition-opacity" />
                            </div>
                          </>
                        ) : (
                          <>
                            <Upload size={24} />
                            <span className="text-xs mt-1">Tải ảnh Sau</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tech Logs / Notes */}
                  <div className="bg-neutral-950 rounded-lg p-4 border border-neutral-800 flex-1 flex flex-col">
                    <h3 className="font-semibold text-slate-300 mb-3 flex items-center gap-2 text-sm">
                      <FileText size={16} className="text-gold-500" /> Nhật Ký Kỹ Thuật
                    </h3>

                    {/* Log History */}
                    <div className="flex-1 min-h-[150px] max-h-[300px] overflow-y-auto space-y-3 mb-4 pr-1 scrollbar-thin">
                      {(!filteredTechnicalLogs || filteredTechnicalLogs.length === 0) ? (
                        <div className="text-xs text-slate-600 text-center py-4 italic">Chưa có ghi chú nào cho giai đoạn hiện tại</div>
                      ) : (
                        filteredTechnicalLogs.map((log) => {
                          // Check if this log is from current stage
                          const isCurrentStage = workflowStages?.[currentStepIndex]?.id === log.stage ||
                            workflowStages?.[currentStepIndex]?.name === log.stage;

                          return (
                            <div
                              key={log.id}
                              className={`bg-neutral-900 p-3 rounded-lg border text-xs ${isCurrentStage
                                ? 'border-gold-600/50 bg-gold-900/10'
                                : 'border-neutral-800'
                                }`}
                            >
                              <div className="flex justify-between text-slate-500 mb-1">
                                <span className="font-bold text-slate-400">{log.author}</span>
                                <span>{log.timestamp}</span>
                              </div>
                              <div className="text-slate-300">{log.content}</div>
                              <div className={`mt-1 text-[10px] uppercase font-medium inline-block px-1 rounded ${isCurrentStage
                                ? 'text-gold-400 bg-gold-900/20'
                                : 'text-slate-500 bg-neutral-800'
                                }`}>
                                Giai đoạn: {log.stage}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Input */}
                    <div className="mt-auto">
                      <textarea
                        className="w-full p-2 text-sm bg-neutral-900 border border-neutral-700 text-slate-200 rounded-lg h-20 focus:ring-1 focus:ring-gold-500 outline-none placeholder-slate-600 resize-none"
                        placeholder="Nhập mô tả/lưu ý cho giai đoạn sau..."
                        value={noteInput}
                        onChange={(e) => setNoteInput(e.target.value)}
                      ></textarea>
                      <button
                        onClick={handleSaveNote}
                        disabled={!noteInput.trim()}
                        className="w-full mt-2 bg-neutral-800 hover:bg-neutral-700 text-slate-200 py-2 rounded-lg font-medium transition-colors text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Save size={14} /> Lưu Ghi Chú
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-neutral-900 p-6 rounded-xl shadow-lg shadow-black/20 border border-neutral-800 h-full flex flex-col items-center justify-center text-slate-600">
              <User size={48} className="mb-4 opacity-20" />
              <p>Chọn một công việc từ danh sách để bắt đầu xử lý.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Upload Ảnh */}
      {showImageUploadModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowImageUploadModal(false);
              setImageUrl('');
            }
          }}
        >
          <div className="bg-neutral-900 rounded-xl shadow-2xl border border-neutral-800 w-full max-w-md">
            <div className="p-6 border-b border-neutral-800 flex justify-between items-center">
              <h2 className="text-xl font-serif font-bold text-slate-100">Tải Ảnh Sau</h2>
              <button
                onClick={() => {
                  setShowImageUploadModal(false);
                  setImageUrl('');
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  URL ảnh hoặc chọn file
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600 mb-2"
                />
                <div className="text-center text-slate-500 text-xs mb-2">hoặc</div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gold-600 file:text-black hover:file:bg-gold-700 file:cursor-pointer"
                />
                <p className="text-xs text-slate-500 mt-2">Định dạng: JPG, PNG, GIF (Max 5MB)</p>
              </div>

              {imageUrl && (
                <div className="mt-4">
                  <p className="text-sm text-slate-400 mb-2">Preview:</p>
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-full max-h-64 object-contain rounded-lg border border-neutral-700"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            <div className="p-6 border-t border-neutral-800 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowImageUploadModal(false);
                  setImageUrl('');
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                className="px-6 py-2.5 border border-neutral-700 bg-neutral-800 text-slate-300 rounded-lg hover:bg-neutral-700 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveImage}
                disabled={!imageUrl.trim()}
                className="px-6 py-2.5 bg-gold-600 hover:bg-gold-700 disabled:bg-neutral-800 disabled:text-slate-500 disabled:cursor-not-allowed text-black font-medium rounded-lg shadow-lg shadow-gold-900/20 transition-all"
              >
                Lưu Ảnh
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};