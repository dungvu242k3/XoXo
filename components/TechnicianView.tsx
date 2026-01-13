import { AlertTriangle, Camera, CheckCircle2, Clock, FileText, Filter, Save, Trash2, Upload, User } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SERVICE_CATALOG } from '../constants';
import { useAppStore } from '../context';
import { DB_PATHS, supabase } from '../supabase';
import { ServiceCatalogItem, ServiceItem, TodoStep, WorkflowDefinition, WorkflowStage } from '../types';

// Current simulated user
// Current simulated user
const CURRENT_USER = {
  id: 'S002',
  name: 'Lê Bảo Trung',
  role: 'Kỹ thuật viên' as const,
  phone: '0909000002',
  email: 'trung.le@xoxo.vn',
  status: 'Active' as const
};

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

// Helper to map status to Vietnamese display text
const mapStatusToVietnamese = (status: string): string => {
  const statusMap: Record<string, string> = {
    'In Queue': 'Chờ Xử Lý',
    'cho_xu_ly': 'Chờ Xử Lý',
    'Cleaning': 'Vệ Sinh',
    'Repairing': 'Sửa Chữa',
    'QC': 'Kiểm Tra (QC)',
    'Ready': 'Hoàn Thành',
    'Done': 'Hoàn Thành',
    'Delivered': 'Đã Giao',
    'Cancelled': 'Đã Hủy',
    'cancel': 'Đã Hủy'
  };
  return statusMap[status] || status || 'Chưa xác định';
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

// Helper to get workflow stages from serviceId (now accepts workflows and services parameters)
const getWorkflowStages = (serviceId?: string, workflows?: WorkflowDefinition[], services?: ServiceCatalogItem[]) => {
  if (!serviceId) {
    console.warn('⚠️ getWorkflowStages: No serviceId provided');
    return null;
  }

  // Use provided services or fallback to SERVICE_CATALOG
  const serviceList = services || SERVICE_CATALOG;

  console.log('🔍 getWorkflowStages - Searching for service:', {
    serviceId,
    servicesCount: serviceList.length,
    availableServiceIds: serviceList.map(s => s.id).slice(0, 10)
  });

  // Find service in catalog
  const service = serviceList.find(s => s.id === serviceId);
  if (!service) {
    console.warn('⚠️ getWorkflowStages: Service not found:', {
      serviceId,
      availableServices: serviceList.map(s => ({ id: s.id, name: s.name })).slice(0, 5)
    });
    return null;
  }

  console.log('✅ getWorkflowStages: Service found:', {
    serviceId: service.id,
    serviceName: service.name,
    hasWorkflows: !!service.workflows,
    workflowsCount: service.workflows?.length || 0,
    workflows: service.workflows,
    hasWorkflowId: !!service.workflowId,
    workflowId: service.workflowId
  });

  // Get first workflow ID (if multiple workflows, use first one)
  let workflowId: string | undefined;

  // Check for new workflows format (array of {id, order})
  if ('workflows' in service && Array.isArray(service.workflows) && service.workflows.length > 0) {
    // Sort by order and get first one
    const sortedWorkflows = [...service.workflows].sort((a, b) => a.order - b.order);
    workflowId = sortedWorkflows[0].id;
    console.log('✅ getWorkflowStages: Using workflow from workflows array:', {
      workflowId,
      allWorkflows: service.workflows
    });
  }
  // Check for old workflowId format
  else if ('workflowId' in service && service.workflowId) {
    if (typeof service.workflowId === 'string') {
      workflowId = service.workflowId;
      console.log('✅ getWorkflowStages: Using workflowId string:', workflowId);
    } else if (Array.isArray(service.workflowId) && service.workflowId.length > 0) {
      workflowId = service.workflowId[0];
      console.log('✅ getWorkflowStages: Using workflowId array[0]:', workflowId);
    }
  }

  // If service doesn't have workflowId, try to find workflow by service type/category
  if (!workflowId && service.category) {
    console.log('🔍 getWorkflowStages: Service has no workflowId, trying to find by category/type:', service.category);
    // Try to find workflow that matches service category or type
    for (const wf of (workflows || [])) {
      if (wf.types && Array.isArray(wf.types)) {
        const categoryLower = service.category.toLowerCase();
        const hasMatchingType = wf.types.some(t =>
          t.toLowerCase().includes(categoryLower) ||
          categoryLower.includes(t.toLowerCase())
        );

        if (hasMatchingType && wf.stages && wf.stages.length > 0) {
          workflowId = wf.id;
          console.log('✅ getWorkflowStages: Found workflow by service category:', {
            serviceCategory: service.category,
            workflowId: wf.id,
            workflowLabel: wf.label,
            workflowTypes: wf.types
          });
          break;
        }
      }
    }
  }

  if (!workflowId) {
    console.warn('⚠️ getWorkflowStages: No workflowId found for service:', {
      serviceId,
      serviceName: service.name,
      serviceCategory: service.category
    });
    // Last resort: try to find any workflow with stages
    for (const wf of (workflows || [])) {
      if (wf.stages && wf.stages.length > 0) {
        workflowId = wf.id;
        console.log('✅ getWorkflowStages: Using fallback workflow (first available):', {
          workflowId: wf.id,
          workflowLabel: wf.label
        });
        break;
      }
    }
    if (!workflowId) {
      return null;
    }
  }

  // Find workflow from provided workflows
  const workflowList = workflows || [];
  console.log('🔍 getWorkflowStages: Searching for workflow:', {
    workflowId,
    workflowsCount: workflowList.length,
    availableWorkflowIds: workflowList.map(wf => wf.id).slice(0, 10)
  });

  const workflow = workflowList.find(wf => wf && wf.id === workflowId);
  if (!workflow) {
    console.warn('⚠️ getWorkflowStages: Workflow not found:', {
      workflowId,
      availableWorkflows: workflowList.map(wf => ({ id: wf.id, label: wf.label })).slice(0, 5)
    });
    return null;
  }

  if (!workflow.stages || workflow.stages.length === 0) {
    console.warn('⚠️ getWorkflowStages: Workflow has no stages:', {
      workflowId,
      workflowLabel: workflow.label
    });
    return null;
  }

  const sortedStages = workflow.stages.sort((a, b) => a.order - b.order);
  console.log('✅ getWorkflowStages: Found stages:', {
    workflowId,
    workflowLabel: workflow.label,
    stagesCount: sortedStages.length,
    stages: sortedStages.map(s => ({
      id: s.id,
      name: s.name,
      order: s.order,
      todosCount: s.todos?.length || 0,
      todos: s.todos
    }))
  });

  return sortedStages;
};

// Filter options will be generated dynamically from workflows

interface FlatTask extends ServiceItem {
  orderId: string;
  orderCode: string;
  customerName: string;
  expectedDelivery: string;
  orderNotes?: string;
}

interface WorkflowStepProps {
  title: string;
  status: string;
  index: number;
  currentIndex: number;
  todos?: TodoStep[];
  onTodoToggle?: (todoId: string, stageId: string, completed: boolean) => void;
  assignedMembers?: string[];
  members?: any[];
}

const WorkflowStep: React.FC<WorkflowStepProps> = ({ title, status, index, currentIndex, todos, onTodoToggle, assignedMembers, members = [] }) => {
  // Determine visual state based on index comparisons
  let isActive = false;
  let isCompleted = false;

  if (index < currentIndex) {
    isCompleted = true;
  } else if (index === currentIndex) {
    isActive = true;
  }

  // Show todos if available - ALWAYS show todos if they exist
  const hasTodos = todos && Array.isArray(todos) && todos.length > 0;

  // Debug log
  if (hasTodos) {
    console.log(`📋 WorkflowStep "${title}" (${status}) has ${todos.length} todos:`, todos);
  }

  return (
    <div className={`relative rounded-lg border transition-all duration-300 ${isActive
      ? 'bg-neutral-800 border-gold-600 shadow-md shadow-black/30 scale-[1.02] z-10'
      : isCompleted
        ? 'bg-emerald-900/20 border-emerald-900/50 opacity-90'
        : 'bg-neutral-900 border-neutral-800 opacity-60'
      }`}>
      {/* Header */}
      <div className="flex items-center gap-3 p-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${isCompleted ? 'bg-emerald-600 text-white' : isActive ? 'bg-gold-500 text-black' : 'bg-neutral-800 text-slate-500'
          }`}>
          {isCompleted ? <CheckCircle2 size={16} /> : <Clock size={16} />}
        </div>
        <div className="flex-1">
          <h4 className={`font-medium text-sm ${isActive ? 'text-slate-100' : 'text-slate-500'}`}>{title}</h4>

          <div className="space-y-1.5 mt-1.5">
            {hasTodos && (
              <div className="text-[10px] text-slate-500 flex items-center gap-1">
                <FileText size={10} /> {todos.length} công việc
              </div>
            )}

            {assignedMembers && assignedMembers.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {assignedMembers.slice(0, 3).map(memberId => {
                  const member = members.find(m => m.id === memberId);
                  if (!member) return null;
                  return (
                    <div
                      key={memberId}
                      className="flex items-center gap-1.5 px-1.5 py-0.5 bg-neutral-800/80 border border-neutral-700/50 rounded-full"
                      title={member.name}
                    >
                      {member.avatar ? (
                        <img src={member.avatar} alt="" className="w-3.5 h-3.5 rounded-full" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full bg-neutral-700 flex items-center justify-center text-[7px] font-bold text-slate-300">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-[9px] text-slate-400 font-medium whitespace-nowrap">
                        {member.name}
                      </span>
                    </div>
                  );
                })}
                {assignedMembers.length > 3 && (
                  <span className="text-[9px] text-slate-500">+{assignedMembers.length - 3}</span>
                )}
              </div>
            )}
          </div>
        </div>
        {isActive && (
          <span className="px-2 py-0.5 bg-gold-600 text-black rounded text-[10px] font-bold shadow-sm uppercase">Đang làm</span>
        )}
      </div>

      {/* Todos - ALWAYS show if available, or show empty state */}
      <div className={`px-3 pb-3 pt-0 space-y-2 border-t ${isActive ? 'border-gold-600/30' : isCompleted ? 'border-emerald-900/30' : 'border-neutral-800'}`}>
        {hasTodos ? (
          todos!.map((todo) => (
            <label
              key={todo.id}
              className={`flex items-start gap-2 p-2 rounded cursor-pointer transition-all hover:bg-neutral-800/50 ${todo.completed ? 'opacity-75' : ''
                }`}
            >
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={(e) => {
                  if (onTodoToggle) {
                    onTodoToggle(todo.id, status, e.target.checked);
                  }
                }}
                disabled={!isActive && !isCompleted}
                className="mt-0.5 w-4 h-4 rounded border-neutral-600 bg-neutral-800 text-gold-500 focus:ring-gold-500 focus:ring-offset-0 focus:ring-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <div className="flex-1">
                <span className={`text-xs ${todo.completed ? 'line-through text-slate-500' : isActive ? 'text-slate-300' : 'text-slate-500'}`}>
                  {todo.title}
                </span>
                {todo.description && (
                  <p className="text-[10px] text-slate-600 mt-0.5">{todo.description}</p>
                )}
              </div>
            </label>
          ))
        ) : (
          <div className="py-2 px-2 text-[10px] text-slate-600 italic text-center">
            Chưa có công việc cho bước này
          </div>
        )}
      </div>
    </div>
  );
};

export const TechnicianView: React.FC = () => {
  const { orders, addTechnicianNote, updateOrderItemStatus, deleteOrderItem, updateOrder, members } = useAppStore();

  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [noteInput, setNoteInput] = useState('');
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [services, setServices] = useState<ServiceCatalogItem[]>(SERVICE_CATALOG);
  const [showImageUploadModal, setShowImageUploadModal] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load workflows from Supabase
  useEffect(() => {
    const loadWorkflows = async () => {
      try {
        // Load workflows
        const { data: workflowsData, error: workflowsError } = await supabase
          .from(DB_PATHS.WORKFLOWS)
          .select('id, ten_quy_trinh, mo_ta, phong_ban_phu_trach, loai_ap_dung, vat_tu_can_thiet, nhan_vien_duoc_giao')
          .limit(100);

        if (workflowsError) throw workflowsError;

        // Load stages từ database
        const { data: stagesData, error: stagesError } = await supabase
          .from(DB_PATHS.WORKFLOW_STAGES)
          .select('id, id_quy_trinh, ten_buoc, thu_tu, chi_tiet, tieu_chuan, nhan_vien_duoc_giao')
          .order('thu_tu', { ascending: true });

        if (stagesError) throw stagesError;

        // Load tasks từ database
        const stageIds = (stagesData || []).map((s: any) => s.id);
        console.log('🔍 Loading tasks for stages:', {
          stageIdsCount: stageIds.length,
          stageIds: stageIds.slice(0, 5), // Show first 5
          stages: (stagesData || []).slice(0, 5).map((s: any) => ({
            id: s.id,
            name: s.ten_buoc,
            workflowId: s.id_quy_trinh
          }))
        });

        let tasksData: any[] = [];

        if (stageIds.length > 0) {
          const { data: tasks, error: tasksError } = await supabase
            .from(DB_PATHS.WORKFLOW_TASKS)
            .select('*')
            .in('id_buoc_quy_trinh', stageIds)
            .order('thu_tu', { ascending: true });

          if (tasksError) {
            console.error('❌ Error loading tasks:', {
              error: tasksError,
              code: tasksError.code,
              message: tasksError.message,
              hint: tasksError.hint,
              table: DB_PATHS.WORKFLOW_TASKS
            });
            // Nếu table không tồn tại, thử check xem table có trong schema không
            if (tasksError.code === '42P01' || tasksError.message?.includes('does not exist')) {
              console.error('❌ Table không tồn tại! Cần tạo bảng:', DB_PATHS.WORKFLOW_TASKS);
            }
          } else {
            console.log('📋 Tasks loaded from database:', {
              tasksCount: tasks?.length || 0,
              tasks: (tasks || []).slice(0, 10).map((t: any) => ({
                id: t.id,
                ten_task: t.ten_task,
                id_buoc_quy_trinh: t.id_buoc_quy_trinh,
                thu_tu: t.thu_tu,
                da_hoan_thanh: t.da_hoan_thanh
              }))
            });
            if (tasks) {
              tasksData = tasks;
            }

            // Nếu không có tasks, log warning
            if (!tasks || tasks.length === 0) {
              console.warn('⚠️ Không có tasks nào trong database cho các stages này. Cần tạo tasks trong bảng cac_task_quy_trinh.');
            }
          }
        } else {
          console.warn('⚠️ No stage IDs to load tasks for');
        }

        // Group tasks by stage id
        const tasksByStage = tasksData.reduce((acc: any, task: any) => {
          const stageId = task.id_buoc_quy_trinh;
          if (!stageId) {
            console.warn('⚠️ Task missing id_buoc_quy_trinh:', task);
            return acc;
          }
          if (!acc[stageId]) {
            acc[stageId] = [];
          }
          acc[stageId].push({
            id: task.id,
            title: task.ten_task || task.ten || 'Unnamed Task',
            description: task.mo_ta || undefined,
            completed: task.da_hoan_thanh || false,
            order: task.thu_tu || 0
          });
          return acc;
        }, {});

        console.log('📋 Tasks grouped by stage:', {
          totalTasks: tasksData.length,
          stagesWithTasks: Object.keys(tasksByStage).length,
          stageIdsFromTasks: Object.keys(tasksByStage),
          tasksByStage: Object.entries(tasksByStage).map(([stageId, todos]: [string, any]) => ({
            stageId,
            todosCount: Array.isArray(todos) ? todos.length : 0,
            todos: Array.isArray(todos) ? todos.map((t: any) => ({ id: t.id, title: t.title })) : []
          }))
        });

        // Debug: Log stage IDs từ stages để so sánh
        const stageIdsFromStages = (stagesData || []).map((s: any) => s.id);
        console.log('🔍 Stage IDs from stages data:', {
          stagesCount: (stagesData || []).length,
          stageIds: stageIdsFromStages,
          stageIdsFromTasks: Object.keys(tasksByStage),
          matchingStageIds: stageIdsFromStages.filter(id => Object.keys(tasksByStage).includes(id)),
          missingStageIds: stageIdsFromStages.filter(id => !Object.keys(tasksByStage).includes(id))
        });

        // Group stages by workflow ID
        const stagesByWorkflow = new Map<string, any[]>();
        (stagesData || []).forEach((stage: any) => {
          // Skip stages without workflow ID
          if (!stage.id_quy_trinh) {
            console.warn('⚠️ Stage missing id_quy_trinh:', {
              stageId: stage.id,
              stageName: stage.ten_buoc
            });
            return;
          }

          if (!stagesByWorkflow.has(stage.id_quy_trinh)) {
            stagesByWorkflow.set(stage.id_quy_trinh, []);
          }
          const stageTodos = (tasksByStage[stage.id] || []).sort((a: any, b: any) => a.order - b.order);

          // Debug: Kiểm tra xem stage.id có trong tasksByStage không
          const hasTodosInTasksByStage = !!tasksByStage[stage.id];
          console.log(`🔍 Checking todos for stage "${stage.ten_buoc}" (${stage.id}):`, {
            stageId: stage.id,
            workflowId: stage.id_quy_trinh,
            hasTodosInTasksByStage,
            todosCount: stageTodos.length,
            availableStageIds: Object.keys(tasksByStage),
            stageIdInAvailable: Object.keys(tasksByStage).includes(stage.id)
          });

          const stageData = {
            id: stage.id,
            name: stage.ten_buoc,
            order: stage.thu_tu || 0, // Default to 0 if thu_tu is missing
            details: stage.chi_tiet || undefined,
            standards: stage.tieu_chuan || undefined,
            todos: stageTodos.length > 0 ? stageTodos : undefined, // Chỉ set todos nếu có ít nhất 1 todo
            assignedMembers: stage.nhan_vien_duoc_giao || undefined
          };

          stagesByWorkflow.get(stage.id_quy_trinh)!.push(stageData);

          // Debug log for each stage
          if (stageTodos.length > 0) {
            console.log(`✅ Stage "${stage.ten_buoc}" (${stage.id}) in workflow "${stage.id_quy_trinh}" has ${stageTodos.length} todos:`, stageTodos);
          } else {
            console.log(`⚠️ Stage "${stage.ten_buoc}" (${stage.id}) in workflow "${stage.id_quy_trinh}" has NO todos. Available stage IDs with tasks:`, Object.keys(tasksByStage));
          }
        });

        // Sort stages by order (thu_tu) for each workflow
        stagesByWorkflow.forEach((stages, workflowId) => {
          stages.sort((a, b) => (a.order || 0) - (b.order || 0));
          console.log(`✅ Sorted ${stages.length} stages for workflow ${workflowId}:`, stages.map(s => ({ id: s.id, name: s.name, order: s.order })));
        });

        // Map workflows với stages
        const workflowsList: WorkflowDefinition[] = (workflowsData || []).map((wf: any) => ({
          id: wf.id,
          label: wf.ten_quy_trinh || '',
          description: wf.mo_ta || '',
          department: wf.phong_ban_phu_trach || 'Kỹ Thuật',
          types: wf.loai_ap_dung || [],
          materials: wf.vat_tu_can_thiet || undefined,
          stages: stagesByWorkflow.get(wf.id) || undefined,
          assignedMembers: wf.nhan_vien_duoc_giao || undefined
        } as WorkflowDefinition));

        console.log('✅ TechnicianView - Workflows loaded:', {
          workflowsCount: workflowsList.length,
          workflowsWithStages: workflowsList.filter(wf => wf.stages && wf.stages.length > 0).length,
          workflows: workflowsList.map(wf => ({
            id: wf.id,
            label: wf.label,
            stagesCount: wf.stages?.length || 0,
            stageIds: wf.stages?.map(s => s.id) || [],
            stageNames: wf.stages?.map(s => s.name) || [],
            types: wf.types,
            hasStages: !!wf.stages && wf.stages.length > 0,
            department: wf.department
          })),
          totalStages: workflowsList.reduce((sum, wf) => sum + (wf.stages?.length || 0), 0)
        });

        setWorkflows(workflowsList);
      } catch (error) {
        console.error('Error loading workflows:', error);
        setWorkflows([]);
      }
    };

    loadWorkflows();

    // Listen for real-time updates
    const channel = supabase
      .channel('technician-workflows-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: DB_PATHS.WORKFLOWS,
        },
        async () => {
          // Reload workflows on change
          loadWorkflows();
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

        // Bắt đầu với MOCK data
        const mergedServices = new Map<string, ServiceCatalogItem>();

        // Thêm tất cả MOCK services trước
        SERVICE_CATALOG.forEach(svc => {
          mergedServices.set(svc.id, { ...svc });
        });

        // Merge với data từ Supabase (ưu tiên Supabase nếu trùng ID)
        if (!error && data) {
          data.forEach(svc => {
            const serviceId = svc.id || svc.ma_dich_vu || '';

            // Parse workflows từ cac_buoc_quy_trinh JSONB hoặc từ workflows array
            let workflowsArray: { id: string; order: number }[] = [];
            if (svc.workflows && Array.isArray(svc.workflows)) {
              workflowsArray = svc.workflows;
            } else if (svc.cac_buoc_quy_trinh && Array.isArray(svc.cac_buoc_quy_trinh)) {
              // Nếu có cac_buoc_quy_trinh, map thành workflows
              workflowsArray = svc.cac_buoc_quy_trinh.map((wf: any, idx: number) => ({
                id: wf.id || wf.id_quy_trinh || '',
                order: wf.order || wf.thu_tu || idx
              }));
            } else if (svc.workflowId) {
              // Fallback to workflowId
              if (Array.isArray(svc.workflowId)) {
                workflowsArray = svc.workflowId.map((id: string, idx: number) => ({ id, order: idx }));
              } else {
                workflowsArray = [{ id: svc.workflowId, order: 0 }];
              }
            }

            mergedServices.set(serviceId, {
              id: serviceId,
              name: svc.ten_dich_vu || svc.name || svc.ten || '',
              category: svc.danh_muc || svc.category || '',
              price: Number(svc.gia_niem_yet || svc.price || svc.gia || svc.gia_goc || 0),
              desc: svc.mo_ta || svc.desc || '',
              image: svc.anh_dich_vu || svc.image || svc.hinh_anh || svc.anh || '',
              workflowId: svc.id_quy_trinh || svc.workflowId || '',
              workflows: workflowsArray
            } as ServiceCatalogItem);
          });
        }

        const servicesList = Array.from(mergedServices.values());
        console.log('🔧 TechnicianView - Services loaded:', {
          count: servicesList.length,
          services: servicesList.map(s => ({
            id: s.id,
            name: s.name,
            workflowsCount: s.workflows?.length || 0,
            workflows: s.workflows
          }))
        });
        setServices(servicesList);
      } catch (error) {
        console.error('Error loading services:', error);
        setServices(SERVICE_CATALOG);
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
            SERVICE_CATALOG.forEach(svc => {
              mergedServices.set(svc.id, { ...svc });
            });
            data.forEach(svc => {
              const serviceId = svc.id || svc.ma_dich_vu || '';

              // Parse workflows từ cac_buoc_quy_trinh JSONB hoặc từ workflows array
              let workflowsArray: { id: string; order: number }[] = [];
              if (svc.workflows && Array.isArray(svc.workflows)) {
                workflowsArray = svc.workflows;
              } else if (svc.cac_buoc_quy_trinh && Array.isArray(svc.cac_buoc_quy_trinh)) {
                // Nếu có cac_buoc_quy_trinh, map thành workflows
                workflowsArray = svc.cac_buoc_quy_trinh.map((wf: any, idx: number) => ({
                  id: wf.id || wf.id_quy_trinh || '',
                  order: wf.order || wf.thu_tu || idx
                }));
              } else if (svc.workflowId) {
                // Fallback to workflowId
                if (Array.isArray(svc.workflowId)) {
                  workflowsArray = svc.workflowId.map((id: string, idx: number) => ({ id, order: idx }));
                } else {
                  workflowsArray = [{ id: svc.workflowId, order: 0 }];
                }
              }

              mergedServices.set(serviceId, {
                id: serviceId,
                name: svc.ten_dich_vu || svc.name || svc.ten || '',
                category: svc.danh_muc || svc.category || '',
                price: Number(svc.gia_niem_yet || svc.price || svc.gia || svc.gia_goc || 0),
                desc: svc.mo_ta || svc.desc || '',
                image: svc.anh_dich_vu || svc.image || svc.hinh_anh || svc.anh || '',
                workflowId: svc.id_quy_trinh || svc.workflowId || '',
                workflows: workflowsArray
              } as ServiceCatalogItem);
            });
            const servicesList = Array.from(mergedServices.values());
            console.log('🔧 TechnicianView - Services reloaded:', {
              count: servicesList.length,
              services: servicesList.map(s => ({
                id: s.id,
                name: s.name,
                workflowsCount: s.workflows?.length || 0,
                workflows: s.workflows
              }))
            });
            setServices(servicesList);
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
    const tasks = orders.flatMap(order =>
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

    console.log('📋 TechnicianView - myTasks created:', {
      totalTasks: tasks.length,
      tasks: tasks.map(t => ({
        id: t.id,
        name: t.name,
        serviceId: t.serviceId,
        workflowId: t.workflowId,
        status: t.status,
        orderId: t.orderId
      })),
      tasksWithServiceId: tasks.filter(t => !!t.serviceId).length,
      tasksWithWorkflowId: tasks.filter(t => !!t.workflowId).length,
      tasksWithoutBoth: tasks.filter(t => !t.serviceId && !t.workflowId).length
    });

    return tasks;
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

  const activeTask = useMemo(() => {
    const task = myTasks.find(t => t.id === activeTaskId) || myTasks[0] || null;
    if (task) {
      console.log('📌 Active task updated:', {
        taskId: task.id,
        taskName: task.name,
        taskStatus: task.status,
        myTasksCount: myTasks.length
      });
    }
    return task;
  }, [myTasks, activeTaskId]);

  // Get workflow stages for active task
  const workflowStages = useMemo(() => {
    if (!activeTask) {
      console.log('⚠️ TechnicianView: No active task');
      return null;
    }

    console.log('🔍 TechnicianView: Getting workflow stages for task:', {
      taskId: activeTask.id,
      taskName: activeTask.name,
      serviceId: activeTask.serviceId,
      workflowId: activeTask.workflowId,
      taskStatus: activeTask.status,
      workflowsCount: workflows.length,
      servicesCount: services.length,
      availableServiceIds: services.map(s => s.id).slice(0, 10),
      availableWorkflowIds: workflows.map(w => w.id).slice(0, 10)
    });

    // Try to find workflow directly from item.workflowId first
    let stages: WorkflowStage[] | null = null;

    if (activeTask.workflowId) {
      const workflow = workflows.find(w => w && w.id === activeTask.workflowId);
      if (workflow && workflow.stages && workflow.stages.length > 0) {
        stages = workflow.stages.sort((a, b) => (a.order || 0) - (b.order || 0));
        console.log('✅ TechnicianView: Found workflow by item.workflowId:', {
          workflowId: activeTask.workflowId,
          workflowLabel: workflow.label,
          stagesCount: stages.length
        });
      } else {
        console.warn('⚠️ TechnicianView: Workflow not found or has no stages:', {
          workflowId: activeTask.workflowId,
          workflowFound: !!workflow,
          hasStages: workflow?.stages?.length || 0
        });
      }
    }

    // If not found, try to get from serviceId
    if (!stages && activeTask.serviceId) {
      console.log('🔍 Trying to get workflow from serviceId:', activeTask.serviceId);
      stages = getWorkflowStages(activeTask.serviceId, workflows, services);
    }

    // If still no stages, try to find workflow by service type
    if (!stages && activeTask.type) {
      console.log('🔍 Trying to find workflow by service type:', activeTask.type);
      // Map service type to workflow types
      const typeMapping: Record<string, string[]> = {
        'Repair': ['sua_chua', 'repair', 'Repair'],
        'Cleaning': ['ve_sinh', 'cleaning', 'Cleaning'],
        'Plating': ['xi_ma', 'plating', 'Plating'],
        'Dyeing': ['nhuom', 'dyeing', 'Dyeing'],
        'Custom': ['custom', 'Custom']
      };

      const matchingTypes = typeMapping[activeTask.type] || [activeTask.type.toLowerCase()];

      // Find workflow that has matching type in loai_ap_dung
      for (const wf of workflows) {
        if (wf.types && Array.isArray(wf.types)) {
          const hasMatchingType = wf.types.some(t =>
            matchingTypes.includes(t.toLowerCase()) ||
            matchingTypes.some(mt => t.toLowerCase().includes(mt.toLowerCase()))
          );

          if (hasMatchingType && wf.stages && wf.stages.length > 0) {
            stages = wf.stages.sort((a, b) => (a.order || 0) - (b.order || 0));
            console.log('✅ Found workflow by matching service type:', {
              workflowId: wf.id,
              workflowLabel: wf.label,
              serviceType: activeTask.type,
              workflowTypes: wf.types,
              stagesCount: stages.length
            });
            break;
          }
        }
      }
    }

    // If still no stages, try to find any workflow that matches the status
    if (!stages && activeTask.status) {
      console.log('🔍 Trying to find workflow by status:', activeTask.status);
      // Try to find workflow that has a stage matching the current status
      for (const wf of workflows) {
        if (wf.stages && wf.stages.some(s => s.id === activeTask.status)) {
          stages = wf.stages.sort((a, b) => (a.order || 0) - (b.order || 0));
          console.log('✅ Found workflow by matching status to stage:', {
            workflowId: wf.id,
            workflowLabel: wf.label,
            stagesCount: stages.length,
            matchingStageId: activeTask.status
          });
          break;
        }
      }
    }

    // If still no stages, try to find any workflow with stages as fallback
    if (!stages) {
      console.log('🔍 Trying to find any workflow with stages as fallback');
      for (const wf of workflows) {
        if (wf.stages && wf.stages.length > 0) {
          stages = wf.stages.sort((a, b) => (a.order || 0) - (b.order || 0));
          console.log('✅ Found workflow as fallback (first available):', {
            workflowId: wf.id,
            workflowLabel: wf.label,
            stagesCount: stages.length
          });
          break;
        }
      }
    }

    // If still no stages, log warning
    if (!stages) {
      console.warn('❌ TechnicianView: Could not find workflow stages:', {
        taskId: activeTask.id,
        taskName: activeTask.name,
        serviceId: activeTask.serviceId,
        workflowId: activeTask.workflowId,
        serviceType: activeTask.type,
        status: activeTask.status,
        workflowsAvailable: workflows.map(w => ({
          id: w.id,
          label: w.label,
          stagesCount: w.stages?.length || 0,
          types: w.types
        })),
        servicesAvailable: services.map(s => ({
          id: s.id,
          name: s.name,
          hasWorkflows: !!s.workflows,
          workflowId: s.workflowId
        })).slice(0, 5)
      });
      return null;
    }

    // Merge todos từ workflows state vào stages
    if (stages && workflows.length > 0) {
      console.log('🔍 Looking for workflow with stages:', {
        stagesCount: stages.length,
        stageIds: stages.map(s => s.id),
        workflowsCount: workflows.length
      });

      // Tìm workflow chứa các stages này
      let workflow = null;

      // Thử tìm workflow bằng workflowId từ activeTask
      if (activeTask.workflowId) {
        workflow = workflows.find(w => w.id === activeTask.workflowId);
        console.log('🔍 Looking for workflow by activeTask.workflowId:', {
          workflowId: activeTask.workflowId,
          found: !!workflow,
          workflowLabel: workflow?.label
        });
      }

      // Nếu không tìm thấy, thử tìm bằng cách match stage IDs
      if (!workflow) {
        workflow = workflows.find(w => {
          if (!w.stages) return false;
          const stageIds = new Set(w.stages.map(s => s.id));
          return stages.some(st => stageIds.has(st.id));
        });
        console.log('🔍 Looking for workflow by stage IDs:', {
          found: !!workflow,
          workflowLabel: workflow?.label
        });
      }

      if (workflow && workflow.stages) {
        console.log('✅ Found workflow:', {
          workflowId: workflow.id,
          workflowLabel: workflow.label,
          stagesCount: workflow.stages.length,
          stagesWithTodos: workflow.stages.filter(s => s.todos && s.todos.length > 0).length
        });

        stages.forEach((stage, idx) => {
          // Tìm stage tương ứng trong workflow state (có todos từ database)
          const wfStage = workflow.stages?.find(s => s.id === stage.id);

          if (wfStage) {
            if (wfStage.todos && wfStage.todos.length > 0) {
              // Merge todos từ workflow state vào stage
              stage.todos = wfStage.todos;
              console.log(`✅ Merged ${wfStage.todos.length} todos into stage "${stage.name}" (${stage.id}):`, wfStage.todos.map((t: any) => ({ id: t.id, title: t.title })));
            } else {
              console.warn(`⚠️ Stage ${idx + 1} "${stage.name}" (${stage.id}) found in workflow but has NO todos`);
            }
          } else {
            console.warn(`⚠️ Stage ${idx + 1} "${stage.name}" (${stage.id}) NOT found in workflow stages`);
          }
        });
      } else {
        console.warn('⚠️ No workflow found containing these stages:', {
          activeTaskWorkflowId: activeTask.workflowId,
          availableWorkflowIds: workflows.map(w => w.id),
          stageIds: stages.map(s => s.id)
        });
      }
    }

    if (stages && stages.length > 0) {
      console.log('✅ TechnicianView: Final workflow stages with todos:', {
        serviceId: activeTask.serviceId,
        workflowId: activeTask.workflowId,
        taskStatus: activeTask.status,
        stagesFound: stages.length,
        stages: stages.map(s => ({
          id: s.id,
          name: s.name,
          order: s.order,
          hasTodos: !!s.todos,
          todosCount: s.todos?.length || 0,
          todos: s.todos?.map((t: any) => ({ id: t.id, title: t.title, completed: t.completed }))
        }))
      });
    } else {
      console.warn('❌ TechnicianView: Could not find workflow stages:', {
        taskId: activeTask.id,
        taskName: activeTask.name,
        serviceId: activeTask.serviceId,
        workflowId: activeTask.workflowId,
        status: activeTask.status,
        workflowsAvailable: workflows.map(w => ({
          id: w.id,
          label: w.label,
          stagesCount: w.stages?.length || 0,
          stageIds: w.stages?.map(s => s.id) || []
        })),
        servicesAvailable: services.map(s => ({
          id: s.id,
          name: s.name,
          hasWorkflows: !!s.workflows,
          workflowsCount: s.workflows?.length || 0,
          workflowId: s.workflowId
        })).slice(0, 5)
      });
    }

    return stages;
  }, [activeTask, workflows, services]);

  // Map current status to stage ID - try direct match first, then fallback to mapping
  // LUÔN trả về bước đầu tiên nếu không tìm thấy match
  const currentStageId = useMemo(() => {
    if (!activeTask || !workflowStages || workflowStages.length === 0) {
      // Nếu không có workflow stages, trả về null để currentStepIndex = 0
      return null;
    }

    // Debug log
    console.log('Finding current stage:', {
      taskStatus: activeTask.status,
      workflowStageIds: workflowStages.map(s => s.id),
      workflowStageNames: workflowStages.map(s => s.name),
      firstStageId: workflowStages[0]?.id,
      firstStageName: workflowStages[0]?.name
    });

    // First, try to find exact match in workflow stages
    const exactMatch = workflowStages.find(stage => stage.id === activeTask.status);
    if (exactMatch) {
      console.log('✅ Found exact match:', exactMatch.id);
      return exactMatch.id;
    }

    // If no exact match, try mapping
    const mappedId = mapStatusToStageId(activeTask.status);
    const mappedMatch = workflowStages.find(stage => stage.id === mappedId);
    if (mappedMatch) {
      console.log('✅ Found mapped match:', mappedMatch.id);
      return mappedMatch.id;
    }

    // If still no match, try case-insensitive search
    const caseInsensitiveMatch = workflowStages.find(stage =>
      stage.id.toLowerCase() === activeTask.status.toLowerCase() ||
      stage.name.toLowerCase() === activeTask.status.toLowerCase()
    );
    if (caseInsensitiveMatch) {
      console.log('✅ Found case-insensitive match:', caseInsensitiveMatch.id);
      return caseInsensitiveMatch.id;
    }

    // KHÔNG TÌM THẤY MATCH - LUÔN trả về bước đầu tiên
    console.log('⚠️ No stage match found for status, defaulting to first stage:', {
      taskStatus: activeTask.status,
      firstStageId: workflowStages[0]?.id,
      firstStageName: workflowStages[0]?.name
    });
    return workflowStages[0]?.id || null;
  }, [activeTask, workflowStages]);

  // Find current step index - LUÔN trả về 0 (bước đầu tiên) nếu không tìm thấy
  const currentStepIndex = useMemo(() => {
    if (!workflowStages || workflowStages.length === 0) return -1;

    // Nếu có currentStageId, tìm index của nó
    if (currentStageId) {
      const index = workflowStages.findIndex(stage => stage.id === currentStageId);
      if (index >= 0) {
        return index;
      }
    }

    // Nếu không tìm thấy hoặc không có currentStageId, LUÔN trả về 0 (bước đầu tiên)
    console.log('✅ Defaulting to first step (index 0):', {
      currentStageId,
      firstStageId: workflowStages[0]?.id,
      firstStageName: workflowStages[0]?.name
    });
    return 0;
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
    addTechnicianNote(activeTask.orderId, activeTask.id, noteInput, CURRENT_USER.name);
    setNoteInput('');
  };

  // Handle todo toggle
  const handleTodoToggle = async (todoId: string, stageId: string, completed: boolean) => {
    try {
      console.log('🔄 Toggling todo:', { todoId, stageId, completed });

      // Update todo in database
      const { error } = await supabase
        .from(DB_PATHS.WORKFLOW_TASKS)
        .update({ da_hoan_thanh: completed })
        .eq('id', todoId);

      if (error) {
        console.error('Error updating todo:', error);
        alert('Lỗi khi cập nhật task. Vui lòng thử lại.');
        return;
      }

      // Reload workflows to reflect changes
      const loadWorkflows = async () => {
        try {
          const { data: workflowsData, error: workflowsError } = await supabase
            .from(DB_PATHS.WORKFLOWS)
            .select('id, ten_quy_trinh, mo_ta, phong_ban_phu_trach, loai_ap_dung, vat_tu_can_thiet, nhan_vien_duoc_giao')
            .order('ngay_tao', { ascending: false })
            .limit(100);

          if (workflowsError) throw workflowsError;

          const { data: stagesData, error: stagesError } = await supabase
            .from(DB_PATHS.WORKFLOW_STAGES)
            .select('id, id_quy_trinh, ten_buoc, thu_tu, chi_tiet, tieu_chuan, nhan_vien_duoc_giao')
            .order('id_quy_trinh, thu_tu', { ascending: true });

          if (stagesError) throw stagesError;

          const stageIds = (stagesData || []).map((s: any) => s.id);
          let tasksData: any[] = [];

          if (stageIds.length > 0) {
            const { data: tasks, error: tasksError } = await supabase
              .from(DB_PATHS.WORKFLOW_TASKS)
              .select('*')
              .in('id_buoc_quy_trinh', stageIds)
              .order('thu_tu', { ascending: true });

            if (!tasksError && tasks) {
              tasksData = tasks;
            }
          }

          const tasksByStage = tasksData.reduce((acc: any, task: any) => {
            if (!acc[task.id_buoc_quy_trinh]) {
              acc[task.id_buoc_quy_trinh] = [];
            }
            acc[task.id_buoc_quy_trinh].push({
              id: task.id,
              title: task.ten_task,
              description: task.mo_ta || undefined,
              completed: task.da_hoan_thanh || false,
              order: task.thu_tu || 0
            });
            return acc;
          }, {});

          const stagesByWorkflow = new Map<string, any[]>();
          (stagesData || []).forEach((stage: any) => {
            if (!stagesByWorkflow.has(stage.id_quy_trinh)) {
              stagesByWorkflow.set(stage.id_quy_trinh, []);
            }
            stagesByWorkflow.get(stage.id_quy_trinh)!.push({
              id: stage.id,
              name: stage.ten_buoc,
              order: stage.thu_tu,
              details: stage.chi_tiet || undefined,
              standards: stage.tieu_chuan || undefined,
              todos: tasksByStage[stage.id] || undefined
            });
          });

          const workflowsList: WorkflowDefinition[] = (workflowsData || []).map((wf: any) => ({
            id: wf.id,
            label: wf.ten_quy_trinh || '',
            description: wf.mo_ta || '',
            department: wf.phong_ban_phu_trach || 'Kỹ Thuật',
            types: wf.loai_ap_dung || [],
            materials: wf.vat_tu_can_thiet || undefined,
            stages: stagesByWorkflow.get(wf.id) || undefined,
            assignedMembers: wf.nhan_vien_duoc_giao || undefined
          } as WorkflowDefinition));

          setWorkflows(workflowsList);
          console.log('✅ Workflows reloaded after todo toggle');
        } catch (error) {
          console.error('Error reloading workflows:', error);
        }
      };

      await loadWorkflows();
    } catch (error) {
      console.error('Error in handleTodoToggle:', error);
      alert('Lỗi khi cập nhật task. Vui lòng thử lại.');
    }
  };

  const handleCompleteStep = async () => {
    console.log('🔄 handleCompleteStep called:', {
      activeTask: !!activeTask,
      workflowStages: !!workflowStages,
      workflowStagesLength: workflowStages?.length || 0,
      currentStepIndex
    });

    if (!activeTask || !workflowStages || currentStepIndex < 0) {
      console.error('❌ Cannot complete step:', {
        activeTask: !!activeTask,
        workflowStages: !!workflowStages,
        currentStepIndex
      });
      alert('Không thể hoàn thành bước này. Vui lòng kiểm tra lại trạng thái hiện tại.');
      return;
    }

    try {
      const nextStepIndex = currentStepIndex + 1;
      const currentStage = workflowStages[currentStepIndex];

      console.log('✅ Moving to next step:', {
        currentStepIndex,
        currentStageId: currentStage.id,
        currentStageName: currentStage.name,
        nextStepIndex,
        totalStages: workflowStages.length
      });

      if (nextStepIndex < workflowStages.length) {
        // Move to next stage in current workflow
        const nextStage = workflowStages[nextStepIndex];
        console.log('➡️ Moving to next stage:', {
          nextStageId: nextStage.id,
          nextStageName: nextStage.name
        });

        try {
          await updateOrderItemStatus(activeTask.orderId, activeTask.id, nextStage.id, CURRENT_USER.name, "Hoàn thành bước " + currentStage.name);
          console.log('✅ Status updated successfully to:', nextStage.id);

          // Note: The orders state will be updated by updateOrderItemStatus
          // which updates local state immediately. activeTask will be recalculated
          // from myTasks useMemo, which depends on orders, so it should update automatically.
          // But we can force a re-render to ensure UI updates
          console.log('⏳ Waiting for state to update...');

          // Give React time to process the state update from context
          setTimeout(() => {
            console.log('🔄 State should be updated. UI will re-render automatically.');
          }, 300);

        } catch (error: any) {
          console.error('❌ Error updating status:', error);
          alert('Lỗi khi cập nhật trạng thái: ' + (error?.message || String(error)));
          return;
        }
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
                        performedBy: CURRENT_USER.name
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
        await updateOrderItemStatus(activeTask.orderId, activeTask.id, lastStage.id, CURRENT_USER.name, "Hoàn thành quy trình");
      }
    } catch (error: any) {
      console.error('Lỗi khi hoàn thành bước:', error);
      alert('Lỗi khi hoàn thành bước: ' + (error?.message || String(error)));
    }
  };

  const handleDeleteTask = async () => {
    if (!activeTask) return;

    if (window.confirm(`Bạn có chắc chắn muốn xóa "${activeTask.name}" khỏi đơn hàng?\n\nHành động này sẽ xóa item này khỏi đơn hàng.`)) {
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
          <p className="text-slate-500 mt-1 text-sm">Xin chào {CURRENT_USER.name}, chúc bạn một ngày làm việc hiệu quả.</p>
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
                  </div>
                  <div className="flex justify-between items-center text-sm text-slate-500 mt-2">
                    {/* Bỏ hiển thị status ID (UUID) - chỉ hiển thị expected delivery */}
                    <span className="text-xs flex items-center gap-1">
                      <Clock size={10} /> {formatDate(task.expectedDelivery) || 'Chưa có'}
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

                    {/* Nhân sự phụ trách */}
                    {(() => {
                      const activeWorkflow = workflows.find(w => w.id === activeTask.workflowId);
                      const itemAssignedMembers = activeTask.assignedMembers || [];
                      const workflowAssignedMembers = activeWorkflow?.assignedMembers || [];

                      // Combine or prioritize - usually item specific is what we want to see
                      const combinedMembers = itemAssignedMembers.length > 0 ? itemAssignedMembers : workflowAssignedMembers;

                      if (combinedMembers.length > 0) {
                        return (
                          <div className="mb-4 px-3 py-2 bg-neutral-800/30 rounded-lg border border-neutral-700/30">
                            <div className="text-[10px] text-slate-400/70 uppercase tracking-wider font-medium mb-2 flex items-center gap-1">
                              <User size={10} />
                              Nhân sự phụ trách {itemAssignedMembers.length > 0 ? '(Giao việc riêng)' : '(Giao theo quy trình)'}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {combinedMembers.map(memberId => {
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
                        );
                      }
                      return null;
                    })()}

                    <div className="space-y-3 relative">
                      <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-neutral-800 -z-10"></div>
                      {workflowStages ? (
                        workflowStages.map((stage, idx) => {
                          const stageTodos = stage.todos || [];
                          console.log(`🔍 Rendering WorkflowStep ${idx + 1}:`, {
                            stageId: stage.id,
                            stageName: stage.name,
                            hasTodos: !!stage.todos,
                            todosCount: stageTodos.length,
                            todos: stageTodos.map((t: any) => ({ id: t.id, title: t.title, completed: t.completed }))
                          });

                          return (
                            <WorkflowStep
                              key={stage.id}
                              title={stage.name}
                              status={stage.id}
                              index={idx}
                              currentIndex={currentStepIndex}
                              todos={stageTodos.length > 0 ? stageTodos : undefined}
                              onTodoToggle={handleTodoToggle}
                              assignedMembers={activeTask.stageAssignments?.find((sa: any) => sa.stageId === stage.id)?.assignedMemberIds || stage.assignedMembers}
                              members={members}
                            />
                          );
                        })
                      ) : (
                        <div className="text-center py-4 text-slate-500 text-sm">
                          Không tìm thấy quy trình cho dịch vụ này
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-neutral-800">
                    {(() => {
                      const isDisabled = !activeTask || !workflowStages || currentStepIndex < 0 || !workflowStages || workflowStages.length === 0;
                      const isLastStep = currentStepIndex >= (workflowStages?.length || 0) - 1;

                      console.log('🔘 Button state:', {
                        activeTask: !!activeTask,
                        workflowStages: !!workflowStages,
                        workflowStagesLength: workflowStages?.length || 0,
                        currentStepIndex,
                        isDisabled,
                        isLastStep
                      });

                      return (
                        <>
                          <button
                            onClick={handleCompleteStep}
                            disabled={isDisabled}
                            className="w-full bg-emerald-700 hover:bg-emerald-600 disabled:bg-neutral-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white py-3 rounded-lg font-bold transition-colors shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2"
                          >
                            <CheckCircle2 size={20} />
                            {isLastStep ? 'Hoàn Thành Quy Trình' : 'Hoàn Thành Bước Này'}
                          </button>
                          {isDisabled && (
                            <p className="text-xs text-slate-500 mt-2 text-center">
                              {!activeTask ? 'Chưa chọn công việc' : !workflowStages ? 'Không tìm thấy quy trình' : currentStepIndex < 0 ? 'Không xác định được bước hiện tại' : 'Không có bước nào trong quy trình'}
                            </p>
                          )}
                        </>
                      );
                    })()}
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