import { ArrowLeft, CheckCircle2, CheckSquare, ChevronDown, ChevronRight, Circle, Columns, Download, Edit, Eye, FileText, Image as ImageIcon, MoreHorizontal, Package, Plus, Printer, QrCode, Search, ShoppingBag, Square, Trash2, Upload, Users, X } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../context';
import { DB_PATHS, supabase } from '../supabase';
import { Member, Order, OrderStatus, ServiceCatalogItem, ServiceItem, ServiceType, TodoStep, WorkflowDefinition } from '../types';
import CommissionRow from './CommissionRow';

// Utility for formatting currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

// Utility for formatting numbers with thousand separators (dấu chấm)
const formatNumber = (num: number | string | undefined | null): string => {
  if (num === undefined || num === null) return '0';
  const numValue = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(numValue)) return '0';
  return numValue.toLocaleString('vi-VN');
};

// Utility for formatting price/money with dấu chấm separator
const formatPrice = (amount: number | string | undefined | null): string => {
  if (amount === undefined || amount === null) return '0';
  const numValue = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numValue)) return '0';
  return numValue.toLocaleString('vi-VN');
};

// Utility for formatting numbers with thousand separators for input
const formatNumberInput = (value: string): string => {
  const cleanValue = value.replace(/\D/g, '');
  // Remove leading zeros if not just "0"
  if (cleanValue.length > 1 && cleanValue.startsWith('0')) {
    return cleanValue.replace(/^0+/, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  return cleanValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

// Utility for formatting date (only date, no time)
const formatDate = (date: string | Date | undefined | null): string => {
  if (!date) return '';
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
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
      return date.toString(); // Return original if all parsing fails
    }
    return dateObj.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    return typeof date === 'string' ? date : '';
  }
};

// MultiSelect Dropdown Filter
const MultiSelectFilter: React.FC<{
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}> = ({ label, options, selected, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter(item => item !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${selected.length > 0
          ? 'bg-gold-900/20 border-gold-500/50 text-gold-500'
          : 'bg-neutral-800 border-neutral-700 text-slate-300 hover:bg-neutral-700'
          }`}
      >
        <span>{label}</span>
        {selected.length > 0 && (
          <span className="bg-gold-500 text-black text-[10px] px-1.5 rounded-full font-bold">{selected.length}</span>
        )}
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-56 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col">
          <div className="p-2 max-h-60 overflow-y-auto space-y-1">
            <label className="flex items-center gap-2 p-2 hover:bg-neutral-800 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={selected.length === options.length}
                onChange={() => onChange(selected.length === options.length ? [] : [...options])}
                className="rounded border-neutral-600 bg-neutral-800 text-gold-500 focus:ring-gold-500"
              />
              <span className="text-sm font-medium text-slate-200">Chọn tất cả</span>
            </label>
            <div className="h-px bg-neutral-800 my-1"></div>
            {options.map(option => (
              <label key={option} className="flex items-center gap-2 p-2 hover:bg-neutral-800 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.includes(option)}
                  onChange={() => toggleOption(option)}
                  className="rounded border-neutral-600 bg-neutral-800 text-gold-500 focus:ring-gold-500"
                />
                <span className="text-sm text-slate-300">{option}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Action Menu Component around Portal
const ActionMenu: React.FC<{
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  itemName: string;
}> = ({ onView, onEdit, onDelete, itemName }) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 4,
        left: rect.right - 150
      });
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const handleScroll = () => { if (isOpen) setIsOpen(false); };
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={buttonRef}
        onClick={toggleMenu}
        className="p-2 hover:bg-neutral-800 rounded-lg text-slate-500 hover:text-slate-300 transition-colors"
      >
        <MoreHorizontal size={20} />
      </button>

      {isOpen && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} />
          <div
            className="fixed bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl z-[9999] w-[150px] overflow-hidden"
            style={{ top: coords.top, left: coords.left }}
          >
            <button
              onClick={(e) => { e.stopPropagation(); onView(); setIsOpen(false); }}
              className="w-full px-4 py-2.5 text-left text-sm text-slate-300 hover:bg-neutral-700 flex items-center gap-2 transition-colors"
            >
              <Eye size={16} /> Xem
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); setIsOpen(false); }}
              className="w-full px-4 py-2.5 text-left text-sm text-slate-300 hover:bg-neutral-700 flex items-center gap-2 transition-colors"
            >
              <Edit size={16} /> Sửa
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); if (window.confirm(`Xóa đơn hàng "${itemName}"?`)) onDelete(); setIsOpen(false); }}
              className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-900/20 flex items-center gap-2 transition-colors"
            >
              <Trash2 size={16} /> Xóa
            </button>
          </div>
        </>,
        document.body
      )}
    </>
  );
};

// Cache for task assignments - shared across all WorkflowStagesTasksView instances
const assignmentsCacheRef: { current: Record<string, Record<string, string[]>> } = { current: {} };

// Component to display workflow stages and tasks with assignment
const WorkflowStagesTasksView: React.FC<{
  item: ServiceItem;
  workflows: WorkflowDefinition[];
  members: Member[];
  onUpdateTaskAssignment: (taskId: string, assignedTo: string[]) => Promise<void>;
  isReadOnly?: boolean;
}> = React.memo(({ item, workflows, members, onUpdateTaskAssignment, isReadOnly = false }) => {
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
  const [taskAssignments, setTaskAssignments] = useState<Record<string, string[]>>({});
  // Staff assignment per workflow stage (supports multi-select)
  const [openStageSelector, setOpenStageSelector] = useState<string | null>(null);
  const [pendingStageAssignments, setPendingStageAssignments] = useState<{
    [key: string]: string[]; // "serviceId-stageId" -> array of member IDs
  }>({});

  const [showAssignmentModal, setShowAssignmentModal] = useState<{ taskId: string; taskTitle: string } | null>(null);

  // Memoize current workflow to avoid recalculation - only depend on workflowId, not entire workflows array
  const currentWorkflow = useMemo(() => {
    if (!item.workflowId) return null;
    return workflows.find(w => w.id === item.workflowId) || null;
  }, [item.workflowId, workflows.length]); // Only re-calculate if workflows array length changes

  // Memoize members map for fast lookup
  const membersMap = useMemo(() => {
    const map = new Map<string, Member>();
    members.forEach(m => map.set(m.id, m));
    return map;
  }, [members.length]); // Only recreate if members count changes

  // Load task assignments from database - with caching
  useEffect(() => {
    // Check cache first
    if (assignmentsCacheRef.current[item.id]) {
      setTaskAssignments(assignmentsCacheRef.current[item.id]);
      return;
    }

    let isMounted = true;

    const loadAssignments = async () => {
      try {
        const { data } = await supabase
          .from(DB_PATHS.SERVICE_ITEMS)
          .select('phan_cong_tasks')
          .eq('id', item.id)
          .single();

        if (isMounted && data?.phan_cong_tasks) {
          const assignments = (data.phan_cong_tasks as Array<{ taskId: string; assignedTo: string[] }>).reduce((acc, a) => {
            acc[a.taskId] = a.assignedTo || [];
            return acc;
          }, {} as Record<string, string[]>);

          // Cache the result
          assignmentsCacheRef.current[item.id] = assignments;
          setTaskAssignments(assignments);
        }
      } catch (error) {
        if (isMounted) {
          console.error('Error loading task assignments:', error);
        }
      }
    };

    loadAssignments();

    return () => {
      isMounted = false;
    };
  }, [item.id]);

  // Auto-expand current stage on mount - only when workflow or status changes
  useEffect(() => {
    if (currentWorkflow && item.status) {
      const currentStage = currentWorkflow.stages?.find(s => s.id === item.status);
      if (currentStage) {
        setExpandedStages(prev => {
          if (prev.has(currentStage.id)) return prev;
          return new Set([currentStage.id]);
        });
      }
    }
  }, [currentWorkflow?.id, item.status]); // Only depend on workflow ID, not entire object

  // Memoize toggle function
  const toggleStage = useCallback((stageId: string) => {
    setExpandedStages(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(stageId)) {
        newExpanded.delete(stageId);
      } else {
        newExpanded.add(stageId);
      }
      return newExpanded;
    });
  }, []);

  // Memoize assignment handler
  const handleTaskAssignment = useCallback(async (taskId: string, taskTitle: string, memberIds: string[]) => {
    try {
      await onUpdateTaskAssignment(taskId, memberIds);
      const newAssignments = { ...taskAssignments, [taskId]: memberIds };
      setTaskAssignments(newAssignments);
      // Update cache
      if (assignmentsCacheRef.current[item.id]) {
        assignmentsCacheRef.current[item.id] = newAssignments;
      }
      setShowAssignmentModal(null);
    } catch (error) {
      console.error('Error updating task assignment:', error);
    }
  }, [onUpdateTaskAssignment, taskAssignments, item.id]);

  // Early returns
  if (!currentWorkflow) {
    return (
      <div className="mt-2 p-2 bg-neutral-800/50 rounded border border-neutral-700">
        <div className="text-xs text-slate-400">
          <span className="text-slate-500">Chưa có quy trình:</span> Dịch vụ này chưa được gán quy trình hoặc quy trình không tồn tại
        </div>
        {item.workflowId && (
          <div className="text-[10px] text-slate-600 mt-1">
            WorkflowId: {item.workflowId}
          </div>
        )}
      </div>
    );
  }

  if (!currentWorkflow.stages || currentWorkflow.stages.length === 0) {
    return (
      <div className="mt-2 text-[10px] text-slate-600 italic">
        Quy trình "{currentWorkflow.label}" chưa có bước nào được thiết lập
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="text-xs font-semibold text-slate-300 mb-3 flex items-center justify-between border-b border-neutral-700 pb-2">
        <div className="flex items-center gap-2">
          <Columns size={14} className="text-gold-500" />
          <span className="font-bold">Quy trình: {currentWorkflow.label}</span>
          <span className="text-[10px] text-slate-500">
            ({currentWorkflow.stages?.length || 0} bước)
          </span>
        </div>
        {currentWorkflow.stages && currentWorkflow.stages.length > 0 && (
          <button
            onClick={() => {
              if (expandedStages.size === currentWorkflow.stages!.length) {
                setExpandedStages(new Set());
              } else {
                setExpandedStages(new Set(currentWorkflow.stages!.map(s => s.id)));
              }
            }}
            className="text-[10px] text-slate-400 hover:text-slate-200 px-2 py-1 rounded border border-neutral-700 hover:border-gold-500/50 transition-colors"
          >
            {expandedStages.size === currentWorkflow.stages!.length ? 'Thu gọn tất cả' : 'Mở tất cả'}
          </button>
        )}
      </div>
      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 border border-neutral-800 rounded-lg p-3 bg-neutral-900/50">
        {currentWorkflow.stages.map((stage) => {
          const isExpanded = expandedStages.has(stage.id);
          const isCurrentStage = item.status === stage.id;

          return (
            <div key={stage.id} className="border border-neutral-800 rounded-lg overflow-hidden">
              {/* Stage Header */}
              <div
                className={`p-2.5 bg-neutral-800/50 cursor-pointer hover:bg-neutral-800 transition-colors ${isCurrentStage ? 'border-l-2 border-gold-500' : ''}`}
                onClick={() => toggleStage(stage.id)}
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <ChevronRight
                        size={14}
                        className={`text-slate-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      />
                      <span className="text-xs font-medium text-gold-500">
                        Bước {stage.order}
                      </span>
                      <span className={`text-xs font-semibold ${isCurrentStage ? 'text-gold-400' : 'text-slate-300'}`}>
                        {stage.name}
                      </span>
                      {isCurrentStage && (
                        <span className="text-[10px] text-yellow-500 font-bold ml-2">● ĐANG LÀM</span>
                      )}
                    </div>
                  </div>

                  {/* Members moved to bottom of header */}
                  {(() => {
                    const templateMembers = stage.assignedMembers || [];
                    const itemAssignments = (item as any).stageAssignments?.find((sa: any) => sa.stageId === stage.id)?.assignedMemberIds || [];
                    const combinedMemberIds = Array.from(new Set([...templateMembers, ...itemAssignments]));

                    if (combinedMemberIds.length === 0) return null;

                    return (
                      <div className="flex items-center gap-1.5 flex-wrap ml-6"> {/* Thêm ml-6 để thẳng hàng với tên bước */}
                        {combinedMemberIds.slice(0, 3).map(memberId => {
                          const member = membersMap.get(memberId);
                          if (!member) return null;
                          return (
                            <div
                              key={memberId}
                              className="flex items-center gap-1.5 px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 rounded-full"
                              title={member.name}
                            >
                              <div className="w-3.5 h-3.5 rounded-full bg-neutral-700 flex items-center justify-center overflow-hidden flex-shrink-0 text-[6px] font-bold">
                                {member.avatar ? (
                                  <img src={member.avatar} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-slate-300">{member.name.charAt(0)}</span>
                                )}
                              </div>
                              <span className="text-[9px] text-slate-400 font-medium whitespace-nowrap">
                                {member.name}
                              </span>
                            </div>
                          );
                        })}
                        {combinedMemberIds.length > 3 && (
                          <span className="text-[9px] text-slate-500 ml-1">+{combinedMemberIds.length - 3}</span>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Stage Tasks */}
              {isExpanded && (
                <div className="p-2 bg-neutral-900 space-y-1.5 border-t border-neutral-800">
                  {stage.todos && stage.todos.length > 0 ? (
                    stage.todos.map((task: TodoStep) => {
                      const assigned = taskAssignments[task.id] || [];
                      return (
                        <div key={task.id} className="p-2 bg-neutral-800/50 rounded border border-neutral-700">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 flex-1 min-w-0">
                              {task.completed ? (
                                <CheckCircle2 size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                              ) : (
                                <Circle size={14} className="text-slate-500 mt-0.5 flex-shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className={`text-xs ${task.completed ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                                  {task.title}
                                </div>
                                {task.description && (
                                  <div className="text-[10px] text-slate-500 mt-0.5">{task.description}</div>
                                )}
                                {/* Assigned Members */}
                                {assigned.length > 0 && (
                                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                    {assigned.slice(0, 3).map(memberId => {
                                      const member = membersMap.get(memberId);
                                      if (!member) return null;
                                      return (
                                        <div
                                          key={memberId}
                                          className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-900/20 border border-blue-800/30 rounded text-[10px] text-blue-400"
                                          title={member.name}
                                        >
                                          {member.avatar ? (
                                            <img src={member.avatar} alt="" className="w-3 h-3 rounded-full" />
                                          ) : (
                                            <div className="w-3 h-3 rounded-full bg-blue-700 flex items-center justify-center text-[8px] font-bold">
                                              {member.name.charAt(0)}
                                            </div>
                                          )}
                                          <span className="truncate max-w-[60px]">{member.name}</span>
                                        </div>
                                      );
                                    })}
                                    {assigned.length > 3 && (
                                      <span className="text-[10px] text-slate-500">+{assigned.length - 3}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            {!isReadOnly && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowAssignmentModal({ taskId: task.id, taskTitle: task.title });
                                }}
                                className="p-1 hover:bg-neutral-700 rounded text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0"
                                title="Gán nhân sự"
                              >
                                <Users size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-[10px] text-slate-600 italic py-2 text-center">
                      Chưa có task nào cho bước này
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Assignment Modal */}
      {showAssignmentModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-neutral-900 rounded-xl shadow-2xl w-full max-w-md border border-neutral-800">
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-200">Gán nhân sự cho task</h3>
              <button
                onClick={() => setShowAssignmentModal(null)}
                className="p-1 hover:bg-neutral-800 rounded transition-colors text-slate-400"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4">
              <div className="mb-3">
                <div className="text-sm font-medium text-slate-300">{showAssignmentModal.taskTitle}</div>
              </div>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {members.map(member => {
                  const isSelected = (taskAssignments[showAssignmentModal!.taskId] || []).includes(member.id);
                  return (
                    <label
                      key={member.id}
                      className="flex items-center gap-2 p-2 bg-neutral-800/50 rounded border border-neutral-700 hover:border-gold-500/50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          const current = taskAssignments[showAssignmentModal!.taskId] || [];
                          const newAssigned = e.target.checked
                            ? [...current, member.id]
                            : current.filter(id => id !== member.id);
                          setTaskAssignments(prev => ({ ...prev, [showAssignmentModal!.taskId]: newAssigned }));
                        }}
                        className="w-4 h-4 text-gold-600 bg-neutral-800 border-neutral-700 rounded focus:ring-gold-500"
                      />
                      <div className="flex items-center gap-2 flex-1">
                        {member.avatar ? (
                          <img src={member.avatar} alt="" className="w-8 h-8 rounded-full" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center text-xs font-bold">
                            {member.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-slate-200">{member.name}</div>
                          <div className="text-xs text-slate-500">{member.role}</div>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="p-4 border-t border-neutral-800 flex gap-2">
              <button
                onClick={() => setShowAssignmentModal(null)}
                className="flex-1 py-2 px-4 bg-neutral-800 hover:bg-neutral-700 text-slate-300 rounded-lg transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={() => handleTaskAssignment(
                  showAssignmentModal.taskId,
                  showAssignmentModal.taskTitle,
                  taskAssignments[showAssignmentModal.taskId] || []
                )}
                className="flex-1 py-2 px-4 bg-gold-600 hover:bg-gold-700 text-black font-medium rounded-lg transition-colors"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for React.memo - only re-render if essential props change
  if (prevProps.item.id !== nextProps.item.id) return false;
  if (prevProps.item.workflowId !== nextProps.item.workflowId) return false;
  if (prevProps.item.status !== nextProps.item.status) return false;
  if (prevProps.workflows.length !== nextProps.workflows.length) return false;
  // Check if the specific workflow changed
  const prevWorkflow = prevProps.workflows.find(w => w.id === prevProps.item.workflowId);
  const nextWorkflow = nextProps.workflows.find(w => w.id === nextProps.item.workflowId);
  if (prevWorkflow?.stages?.length !== nextWorkflow?.stages?.length) return false;
  if (prevProps.members.length !== nextProps.members.length) return false;
  if (prevProps.onUpdateTaskAssignment !== nextProps.onUpdateTaskAssignment) return false;
  return true; // Props are equal, skip re-render
});

export const Orders: React.FC = () => {
  const { orders, addOrder, updateOrder, deleteOrder, customers, products, members } = useAppStore();
  const [services, setServices] = useState<ServiceCatalogItem[]>([]);

  // Debug: Log orders để kiểm tra
  useEffect(() => {
    console.log('📦 Orders component - orders state:', {
      ordersCount: orders?.length || 0,
      orders: orders,
      ordersIsArray: Array.isArray(orders)
    });
  }, [orders]);
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const workflowsCacheRef = useRef<{ workflows: WorkflowDefinition[]; timestamp: number } | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [qrPrintTargetId, setQrPrintTargetId] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [printType, setPrintType] = useState<'QR' | 'INVOICE'>('QR');
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState({
    products: [] as string[],
    statuses: [] as string[]
  });

  // Derived Options for Filters
  const productOptions = useMemo(() => {
    const set = new Set<string>();
    orders.forEach(o => o.items?.forEach(i => set.add(i.name)));
    return Array.from(set).sort();
  }, [orders]);

  const statusOptions = Object.values(OrderStatus);

  const getCustomerInfo = (customerId: string) => customers.find(c => c.id === customerId);

  // Filter Logic
  const filteredOrders = useMemo(() => {
    if (!orders || !Array.isArray(orders)) {
      console.warn('⚠️ Orders is not an array:', orders);
      return [];
    }

    const filtered = orders.filter(order => {
      if (!order || !order.id) return false;

      // Search Text
      if (searchText) {
        const lower = searchText.toLowerCase();
        const customer = customers.find(c => c.id === order.customerId);
        const match = (order.id || '').toLowerCase().includes(lower) ||
          (order.customerName || '').toLowerCase().includes(lower) ||
          (customer?.phone || '').includes(lower);
        if (!match) return false;
      }

      // Filter Product
      if (filters.products.length > 0) {
        const hasProduct = order.items?.some(i => i && filters.products.includes(i.name));
        if (!hasProduct) return false;
      }

      // Filter Status
      if (filters.statuses.length > 0) {
        if (!filters.statuses.includes(order.status)) return false;
      }

      return true;
    });

    console.log('🔍 Filtered orders:', {
      totalOrders: orders.length,
      filteredCount: filtered.length,
      searchText,
      filtersProducts: filters.products.length,
      filtersStatuses: filters.statuses.length
    });

    return filtered;
  }, [orders, searchText, filters, customers]);

  const updateFilter = (key: keyof typeof filters, val: string[]) => setFilters(prev => ({ ...prev, [key]: val }));

  // Stats Calculation
  const stats = useMemo(() => {
    const count = filteredOrders.length;
    const revenue = filteredOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const deposit = filteredOrders.reduce((sum, o) => sum + (o.deposit || 0), 0);
    return { count, revenue, deposit };
  }, [filteredOrders]);

  // Fetch Services & Workflows from Supabase
  useEffect(() => {
    const loadServices = async () => {
      try {
        const { data, error } = await supabase.from(DB_PATHS.SERVICES).select('*');
        if (error) {
          console.error('Error loading services:', error);
          setServices([]);
          return;
        }
        if (data) {
          // Log raw data to inspect available fields
          if (data.length > 0) {
            console.log('🔍 First Raw Service Item:', data[0]);
            console.log('🔍 Keys in Raw Service Item:', Object.keys(data[0]));
          }
          // Map data từ database (tiếng Việt) sang ServiceCatalogItem
          const mappedServices: ServiceCatalogItem[] = data.map((item: any) => {
            // Parse workflows từ cac_buoc_quy_trinh JSONB hoặc từ workflows array
            let workflowsArray: { id: string; order: number }[] = [];

            // Priority 1: Check if 'workflows' already exists on item (e.g. from view or previous mapping)
            if (item.workflows && Array.isArray(item.workflows)) {
              workflowsArray = item.workflows;
            }
            // Priority 2: Parse 'cac_buoc_quy_trinh' (JSONB column)
            else if (item.cac_buoc_quy_trinh) {
              let rawWorkflows = item.cac_buoc_quy_trinh;

              // Try to parse if string
              if (typeof rawWorkflows === 'string') {
                try {
                  rawWorkflows = JSON.parse(rawWorkflows);
                } catch (e) {
                  console.error('Error parsing cac_buoc_quy_trinh for service:', item.id, e);
                  rawWorkflows = [];
                }
              }

              if (Array.isArray(rawWorkflows)) {
                workflowsArray = rawWorkflows.map((wf: any, idx: number) => ({
                  id: wf.id || wf.id_quy_trinh || (typeof wf === 'string' ? wf : `step-${idx}`),
                  order: wf.order || wf.thu_tu || idx + 1,
                  name: wf.ten_buoc || wf.name || wf.ten || `Bước ${idx + 1}`
                }));
              }
            }

            // Determine primary workflowId
            let primaryWorkflowId = item.id_quy_trinh || item.workflowId || '';
            if (!primaryWorkflowId && workflowsArray.length > 0) {
              primaryWorkflowId = workflowsArray[0].id;
            }

            return {
              id: item.id || item.ma_dich_vu || '',
              name: item.ten_dich_vu || item.name || item.ten || '',
              category: item.danh_muc || item.category || '',
              price: Number(item.gia_niem_yet || item.price || item.gia || item.gia_goc || 0),
              desc: item.mo_ta || item.desc || '',
              image: item.anh_dich_vu || item.image || item.hinh_anh || item.anh || '',
              workflowId: primaryWorkflowId,
              workflows: workflowsArray
            };
          });

          console.log('✅ Services loaded with workflows:', mappedServices.map(s => ({
            id: s.id,
            name: s.name,
            workflowId: s.workflowId,
            workflowsCount: s.workflows?.length
          })));

          setServices(mappedServices);
        } else {
          console.log('⚠️ No services data returned');
          setServices([]);
        }
      } catch (error) {
        console.error('Error loading services:', error);
        setServices([]);
      }
    };

    const loadWorkflows = async () => {
      try {
        // Check cache first (5 minutes cache)
        const now = Date.now();
        const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
        if (workflowsCacheRef.current && (now - workflowsCacheRef.current.timestamp) < CACHE_DURATION) {
          setWorkflows(workflowsCacheRef.current.workflows);
          return;
        }

        console.log('🔄 Loading workflows, stages, and tasks from Supabase...');

        // Load workflows, stages, and tasks in parallel
        const [workflowsResult, stagesResult, tasksResult] = await Promise.all([
          supabase
            .from(DB_PATHS.WORKFLOWS)
            .select('id, ten_quy_trinh, mo_ta, phong_ban_phu_trach, loai_ap_dung, vat_tu_can_thiet')
            .order('ngay_tao', { ascending: false })
            .limit(100),
          supabase
            .from(DB_PATHS.WORKFLOW_STAGES)
            .select('id, id_quy_trinh, ten_buoc, thu_tu, chi_tiet, tieu_chuan, nhan_vien_duoc_giao')
            .order('id_quy_trinh, thu_tu', { ascending: true }),
          supabase
            .from(DB_PATHS.WORKFLOW_TASKS)
            .select('id, id_buoc_quy_trinh, ten_task, mo_ta, da_hoan_thanh, thu_tu')
            .order('thu_tu', { ascending: true })
        ]);

        if (workflowsResult.error) {
          console.error('❌ Error loading workflows:', workflowsResult.error);
          throw workflowsResult.error;
        }
        if (stagesResult.error) {
          console.error('❌ Error loading stages:', stagesResult.error);
          throw stagesResult.error;
        }

        const workflowsData = workflowsResult.data || [];
        const stagesData = stagesResult.data || [];
        const tasksData = tasksResult.data || [];

        console.log(`📊 Loaded: ${workflowsData.length} workflows, ${stagesData.length} stages, ${tasksData.length} tasks`);
        // Log sample stage to verify id_quy_trinh match
        if (stagesData.length > 0) {
          console.log('🔍 Sample Stage Data:', stagesData[0]);
          // Check distinct workflow IDs in stages
          const stageWorkflowIds = new Set(stagesData.map((s: any) => s.id_quy_trinh));
          console.log('🔗 Unique Workflow IDs in Stages:', Array.from(stageWorkflowIds));
        }

        // Group tasks by stage id
        const tasksByStage: Record<string, TodoStep[]> = tasksData.reduce((acc: Record<string, TodoStep[]>, task: any) => {
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
        }, {} as Record<string, TodoStep[]>);

        // Group stages by workflow ID
        const stagesByWorkflow = new Map<string, any[]>();
        stagesData.forEach((stage: any) => {
          if (!stagesByWorkflow.has(stage.id_quy_trinh)) {
            stagesByWorkflow.set(stage.id_quy_trinh, []);
          }
          stagesByWorkflow.get(stage.id_quy_trinh)!.push({
            id: stage.id,
            name: stage.ten_buoc,
            order: stage.thu_tu,
            details: stage.chi_tiet || undefined,
            standards: stage.tieu_chuan || undefined,
            todos: tasksByStage[stage.id] || undefined,
            assignedMembers: stage.nhan_vien_duoc_giao || undefined
          });
        });

        // Map từ tên cột tiếng Việt sang interface
        const departmentMap: Record<string, any> = {
          'ky_thuat': 'Kỹ Thuật',
          'spa': 'Spa',
          'qc': 'QA/QC',
          'hau_can': 'Hậu Cần'
        };

        const workflowsList: WorkflowDefinition[] = workflowsData.map((wf: any) => ({
          id: wf.id,
          label: wf.ten_quy_trinh || '',
          description: wf.mo_ta || '',
          department: departmentMap[wf.phong_ban_phu_trach] || 'Kỹ Thuật',
          types: wf.loai_ap_dung || [],
          materials: wf.vat_tu_can_thiet || undefined,
          stages: stagesByWorkflow.get(wf.id) || undefined,
          color: 'bg-slate-500'
        }));

        console.log('✅ Final Workflows List:', workflowsList.map(w => ({ id: w.id, label: w.label, stagesCount: w.stages?.length || 0 })));

        // Update cache
        workflowsCacheRef.current = { workflows: workflowsList, timestamp: now };
        setWorkflows(workflowsList);
      } catch (error) {
        console.error('Error loading workflows:', error);
        setWorkflows([]);
      }
    };

    loadServices();
    loadWorkflows();

    const servicesChannel = supabase
      .channel('orders-services-changes')
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
            const mappedServices: ServiceCatalogItem[] = data.map((item: any) => {
              let workflowsArray: { id: string; order: number }[] = [];
              if (item.workflows && Array.isArray(item.workflows)) {
                workflowsArray = item.workflows;
              } else if (item.cac_buoc_quy_trinh && Array.isArray(item.cac_buoc_quy_trinh)) {
                workflowsArray = item.cac_buoc_quy_trinh.map((wf: any, idx: number) => ({
                  id: wf.id || wf.id_quy_trinh || '',
                  order: wf.order || wf.thu_tu || idx
                }));
              }

              return {
                id: item.id || item.ma_dich_vu || '',
                name: item.ten_dich_vu || item.name || item.ten || '',
                category: item.danh_muc || item.category || '',
                price: Number(item.gia_niem_yet || item.price || item.gia || item.gia_goc || 0),
                desc: item.mo_ta || item.desc || '',
                image: item.anh_dich_vu || item.image || item.hinh_anh || item.anh || '',
                workflowId: item.id_quy_trinh || item.workflowId || '',
                workflows: workflowsArray
              };
            });
            setServices(mappedServices);
          }
        }
      )
      .subscribe();

    // Only subscribe to workflow changes if needed - can be disabled for better performance
    // const workflowsChannel = supabase
    //   .channel('orders-workflows-changes')
    //   .on(
    //     'postgres_changes',
    //     {
    //       event: '*',
    //       schema: 'public',
    //       table: DB_PATHS.WORKFLOWS,
    //     },
    //     async () => {
    //       // Invalidate cache when workflows change
    //       workflowsCacheRef.current = null;
    //       loadWorkflows();
    //     }
    //   )
    //   .subscribe();

    return () => {
      supabase.removeChannel(servicesChannel);
      // workflowsChannel đã bị comment, không cần remove
    };
  }, []);



  // New Order Form State
  const [newOrderItems, setNewOrderItems] = useState<ServiceItem[]>([]);
  const [selectedItemType, setSelectedItemType] = useState<'SERVICE' | 'PRODUCT'>('SERVICE');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [customPrice, setCustomPrice] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [newOrderDeposit, setNewOrderDeposit] = useState<string>('');
  const [newOrderExpectedDelivery, setNewOrderExpectedDelivery] = useState<string>(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [newOrderDiscount, setNewOrderDiscount] = useState<string>('');
  const [newOrderDiscountType, setNewOrderDiscountType] = useState<'money' | 'percent'>('money');
  const [newOrderAdditionalFees, setNewOrderAdditionalFees] = useState<string>('');
  const [newOrderSurchargeReason, setNewOrderSurchargeReason] = useState<string>('');
  const [selectedItemsForMultiAdd, setSelectedItemsForMultiAdd] = useState<Set<string>>(new Set());
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [editingItemNotes, setEditingItemNotes] = useState<string>('');
  const [editingItemAssignedMembers, setEditingItemAssignedMembers] = useState<string[]>([]);

  // Staff assignment per workflow stage
  const [openStageSelector, setOpenStageSelector] = useState<string | null>(null);
  const [pendingStageAssignments, setPendingStageAssignments] = useState<{
    [key: string]: string[]; // "serviceId-stageId" -> member IDs
  }>({});
  const [editingItemCommissions, setEditingItemCommissions] = useState<{ [key: string]: { value: number, type: 'money' | 'percent' } }>({});
  const [editingEditItemCommissions, setEditingEditItemCommissions] = useState<{ [key: string]: { value: number, type: 'money' | 'percent' } }>({});


  // Edit Order Form State
  const [editOrderItems, setEditOrderItems] = useState<ServiceItem[]>([]);
  const [editSelectedItemType, setEditSelectedItemType] = useState<'SERVICE' | 'PRODUCT'>('SERVICE');
  const [editSelectedItemId, setEditSelectedItemId] = useState('');
  const [editCustomPrice, setEditCustomPrice] = useState<string>('');
  const [editSelectedCustomerId, setEditSelectedCustomerId] = useState('');
  const [editDeposit, setEditDeposit] = useState<string>('');
  const [editExpectedDelivery, setEditExpectedDelivery] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editOrderDiscount, setEditOrderDiscount] = useState<string>('0');
  const [editOrderDiscountType, setEditOrderDiscountType] = useState<'money' | 'percent'>('money');
  const [editOrderAdditionalFees, setEditOrderAdditionalFees] = useState<string>('0');
  const [editSurchargeReason, setEditSurchargeReason] = useState<string>('');
  const [editSelectedItemsForMultiAdd, setEditSelectedItemsForMultiAdd] = useState<Set<string>>(new Set());
  const [editingEditItemIndex, setEditingEditItemIndex] = useState<number | null>(null);
  const [editingEditItemNotes, setEditingEditItemNotes] = useState<string>('');
  const [editingEditItemAssignedMembers, setEditingEditItemAssignedMembers] = useState<string[]>([]);

  const handleSaveItemEdit = (isEditOrder: boolean) => {
    if (isEditOrder) {
      if (editingEditItemIndex === null) return;
      const updatedItems = [...editOrderItems];
      updatedItems[editingEditItemIndex] = {
        ...updatedItems[editingEditItemIndex],
        notes: editingEditItemNotes,
        assignedMembers: editingEditItemAssignedMembers,
        commissions: editingEditItemCommissions
      };
      setEditOrderItems(updatedItems);
      setEditingEditItemIndex(null);
    } else {
      if (editingItemIndex === null) return;
      const updatedItems = [...newOrderItems];
      updatedItems[editingItemIndex] = {
        ...updatedItems[editingItemIndex],
        notes: editingItemNotes,
        assignedMembers: editingItemAssignedMembers,
        commissions: editingItemCommissions
      };
      setNewOrderItems(updatedItems);
      setEditingItemIndex(null);
    }
    // Clear temp states
    setEditingItemNotes('');
    setEditingEditItemNotes('');
    setEditingItemAssignedMembers([]);
    setEditingEditItemAssignedMembers([]);
    setEditingItemCommissions({});
    setEditingEditItemCommissions({});
  };

  const toggleSelectOrder = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(selectedOrderIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedOrderIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedOrderIds.size === orders.length) setSelectedOrderIds(new Set());
    else setSelectedOrderIds(new Set(orders.map(o => o.id)));
  };

  const handleAddItem = () => {
    if (!selectedItemId) return;

    let itemData: any;
    let type: ServiceType;
    let name: string;
    let image: string = '';
    let workflowId: string | undefined;
    let initialStatus = 'In Queue';
    let initialStageName = 'Chờ Xử Lý';

    if (selectedItemType === 'SERVICE') {
      const svc = services.find(s => s.id === selectedItemId);
      if (!svc) return;
      itemData = svc;
      type = ServiceType.REPAIR;
      name = svc.name;
      image = svc.image;

      console.log('🔧 Service info when adding item:', {
        serviceId: svc.id,
        serviceName: svc.name,
        workflows: svc.workflows,
        workflowId: svc.workflowId
      });

      // Determine Workflow
      if (svc.workflows && svc.workflows.length > 0) {
        workflowId = svc.workflows[0].id;
        console.log('✅ Using workflows[0].id:', workflowId);
      } else if (Array.isArray(svc.workflowId) && svc.workflowId.length > 0) {
        workflowId = svc.workflowId[0];
        console.log('✅ Using workflowId[0]:', workflowId);
      } else if (typeof svc.workflowId === 'string' && svc.workflowId) {
        workflowId = svc.workflowId;
        console.log('✅ Using workflowId string:', workflowId);
      } else {
        console.log('⚠️ No workflow found for this service!');
      }

      // Determine Initial Stage if Workflow Found
      if (workflowId) {
        const wf = workflows.find(w => w.id === workflowId);
        if (wf && wf.stages && wf.stages.length > 0) {
          const sortedStages = [...wf.stages].sort((a, b) => a.order - b.order);
          initialStatus = sortedStages[0].id; // Use UUID from stage
          initialStageName = sortedStages[0].name;
          console.log('✅ Set initial status from workflow stage:', {
            workflowId,
            workflowName: wf.label,
            stageId: initialStatus,
            stageName: initialStageName
          });
        } else {
          console.warn('⚠️ Workflow found but no stages:', workflowId);
        }
      } else {
        console.warn('⚠️ No workflowId for service, cannot set proper stage status');
        // Nếu không có workflow, vẫn dùng 'In Queue' nhưng sẽ có vấn đề khi hiển thị
      }

    } else {
      const prod = products.find(p => p.id === selectedItemId);
      if (!prod) return;
      itemData = prod;
      type = ServiceType.PRODUCT;
      name = prod.name;
      image = prod.image;
      initialStatus = 'Done';
      initialStageName = 'Hoàn Thành';
    }

    // Không tạo ID - sẽ được tạo khi lưu vào database
    const newItem: ServiceItem = {
      id: '', // Tạm thời để trống, sẽ được cập nhật sau khi tạo
      name: name,
      type: type,
      price: customPrice ? parseInt(customPrice) : itemData.price,
      status: initialStatus,
      quantity: 1,
      beforeImage: image,
      isProduct: selectedItemType === 'PRODUCT',
      serviceId: selectedItemType === 'SERVICE' ? selectedItemId : undefined,
      workflowId: workflowId || undefined, // Đảm bảo workflowId được set
      history: [{
        stageId: initialStatus,
        stageName: initialStageName,
        enteredAt: Date.now(),
        performedBy: 'Hệ thống'
      }]
    };

    console.log('✅ New item created:', {
      name: newItem.name,
      serviceId: newItem.serviceId,
      workflowId: newItem.workflowId,
      status: newItem.status,
      isProduct: newItem.isProduct
    });

    // NEW: Attach stage assignments if service has workflow
    if (selectedItemType === 'SERVICE' && workflowId && selectedItemId) {
      // Filter assignments for THIS service only
      const servicePrefix = `${selectedItemId}-`;
      const serviceAssignments = Object.entries(pendingStageAssignments)
        .filter(([key]) => key.startsWith(servicePrefix))
        .map(([key, memberIds]) => ({
          stageId: key.replace(servicePrefix, ''), // Remove serviceId prefix to get stageId
          assignedMemberIds: memberIds
        }));

      if (serviceAssignments.length > 0) {
        // Add to newItem (will be saved to database as JSONB)
        (newItem as any).stageAssignments = serviceAssignments;
      }
    }

    setNewOrderItems([...newOrderItems, newItem]);
    setSelectedItemId('');
    setCustomPrice('');

    // Clear pending assignments for this service only
    if (selectedItemId) {
      const servicePrefix = `${selectedItemId}-`;
      setPendingStageAssignments(prev => {
        const filtered: typeof prev = {};
        Object.entries(prev).forEach(([key, value]) => {
          if (!key.startsWith(servicePrefix)) {
            filtered[key] = value;
          }
        });
        return filtered;
      });
    }
  };

  const handleRemoveItem = (index: number) => {
    const updated = [...newOrderItems];
    updated.splice(index, 1);
    setNewOrderItems(updated);
  };

  // Handle edit item (notes and assigned members)
  const handleEditItem = (index: number, isEditMode: boolean = false) => {
    const items = isEditMode ? editOrderItems : newOrderItems;
    const item = items[index];
    if (isEditMode) {
      setEditingEditItemIndex(index);
      setEditingEditItemNotes(item.notes || '');
      setEditingEditItemAssignedMembers(item.assignedMembers || []);
    } else {
      setEditingItemIndex(index);
      setEditingItemNotes(item.notes || '');
      setEditingItemAssignedMembers(item.assignedMembers || []);
    }
  };

  // Handle save item edits


  // Helper functions for staff assignment
  const makeAssignmentKey = (serviceId: string, stageId: string) => `${serviceId}-${stageId}`;

  const toggleStageStaffSelector = (key: string) => {
    setOpenStageSelector(prev => prev === key ? null : key);
  };

  const getSelectedStaffForStage = (serviceId: string, stageId: string) => {
    const key = makeAssignmentKey(serviceId, stageId);
    const memberIds = pendingStageAssignments[key] || [];
    return members.filter(m => memberIds.includes(m.id));
  };

  const isStaffAssignedToStage = (serviceId: string, stageId: string, memberId: string) => {
    const key = makeAssignmentKey(serviceId, stageId);
    return (pendingStageAssignments[key] || []).includes(memberId);
  };

  const handleToggleStaffForStage = (serviceId: string, stageId: string, memberId: string, checked: boolean) => {
    const key = makeAssignmentKey(serviceId, stageId);
    setPendingStageAssignments(prev => {
      const current = prev[key] || [];
      return {
        ...prev,
        [key]: checked
          ? [...current, memberId]
          : current.filter(id => id !== memberId)
      };
    });
  };


  // Handle multi-select add items
  const handleAddMultipleItems = () => {
    if (selectedItemsForMultiAdd.size === 0) return;

    const list = selectedItemType === 'SERVICE' ? services : products;
    const itemsToAdd: ServiceItem[] = [];

    selectedItemsForMultiAdd.forEach(itemId => {
      const itemData = list.find(i => i.id === itemId);
      if (!itemData) return;

      let workflowId: string | undefined;
      let initialStatus = 'In Queue';
      let initialStageName = 'Chờ Xử Lý';

      if (selectedItemType === 'SERVICE') {
        const svc = itemData as ServiceCatalogItem;
        if (svc.workflows && svc.workflows.length > 0) {
          workflowId = svc.workflows[0].id;
        } else if (Array.isArray(svc.workflowId) && svc.workflowId.length > 0) {
          workflowId = svc.workflowId[0];
        } else if (typeof svc.workflowId === 'string' && svc.workflowId) {
          workflowId = svc.workflowId;
        }

        if (workflowId) {
          const wf = workflows.find(w => w.id === workflowId);
          if (wf && wf.stages && wf.stages.length > 0) {
            const sortedStages = [...wf.stages].sort((a, b) => a.order - b.order);
            initialStatus = sortedStages[0].id;
            initialStageName = sortedStages[0].name;
          }
        }
      }

      const newItem: ServiceItem = {
        id: '',
        name: itemData.name,
        type: selectedItemType === 'SERVICE' ? ServiceType.REPAIR : ServiceType.PRODUCT,
        price: itemData.price,
        status: selectedItemType === 'PRODUCT' ? 'Done' : initialStatus,
        quantity: 1,
        beforeImage: itemData.image || '',
        isProduct: selectedItemType === 'PRODUCT',
        serviceId: selectedItemType === 'SERVICE' ? itemId : undefined,
        workflowId: workflowId || undefined,
        history: [{
          stageId: selectedItemType === 'PRODUCT' ? 'Done' : initialStatus,
          stageName: selectedItemType === 'PRODUCT' ? 'Hoàn Thành' : initialStageName,
          enteredAt: Date.now(),
          performedBy: 'Hệ thống'
        }]
      };

      // NEW: Attach stage assignments for this service
      if (selectedItemType === 'SERVICE' && workflowId) {
        // Filter assignments for THIS service only
        const servicePrefix = `${itemId}-`;
        const serviceAssignments = Object.entries(pendingStageAssignments)
          .filter(([key]) => key.startsWith(servicePrefix))
          .map(([key, memberIds]) => ({
            stageId: key.replace(servicePrefix, ''), // Remove serviceId prefix to get stageId
            assignedMemberIds: memberIds
          }));

        if (serviceAssignments.length > 0) {
          (newItem as any).stageAssignments = serviceAssignments;
        }
      }

      itemsToAdd.push(newItem);
    });

    setNewOrderItems([...newOrderItems, ...itemsToAdd]);

    // Clear pending assignments for selected services only
    if (selectedItemType === 'SERVICE' && selectedItemsForMultiAdd.size > 0) {
      const selectedIds = Array.from(selectedItemsForMultiAdd);
      setPendingStageAssignments(prev => {
        const filtered: typeof prev = {};
        Object.entries(prev).forEach(([key, value]) => {
          // Keep assignments that don't belong to any selected service
          const belongsToSelected = selectedIds.some(id => key.startsWith(`${id}-`));
          if (!belongsToSelected) {
            filtered[key] = value;
          }
        });
        return filtered;
      });
    }

    setSelectedItemsForMultiAdd(new Set());
  };

  // Helper function to calculate order total
  const calculateOrderTotal = (items: ServiceItem[], discount: number = 0, discountType: 'money' | 'percent' = 'money', additionalFees: number = 0): number => {
    const subtotal = items.reduce((acc, item) => acc + (item.price * (item.quantity || 1)), 0);
    let discountAmount = discount;
    if (discountType === 'percent') {
      discountAmount = (subtotal * discount) / 100;
    }
    const total = subtotal - discountAmount + additionalFees;
    return Math.max(0, total); // Ensure total is not negative
  };

  const handleCreateOrder = () => {
    if (!selectedCustomerId || newOrderItems.length === 0) return;

    const customer = customers.find(c => c.id === selectedCustomerId);
    const discount = parseFloat(newOrderDiscount.replace(/\./g, '')) || 0;
    const additionalFees = parseFloat(newOrderAdditionalFees.replace(/\./g, '')) || 0;
    const deposit = parseFloat(newOrderDeposit.replace(/\./g, '')) || 0;
    const totalAmount = calculateOrderTotal(newOrderItems, discount, newOrderDiscountType, additionalFees);

    // Tự động gán technician cho item đầu tiên (không phải product)
    const firstServiceItem = newOrderItems.find(item => !item.isProduct);
    let itemsWithAssignment = [...newOrderItems];

    if (firstServiceItem) {
      // Tìm technician đầu tiên (Kỹ thuật viên) từ members
      const firstTechnician = members.find(m => m.role === 'Kỹ thuật viên');

      if (firstTechnician) {
        const firstItemIndex = itemsWithAssignment.findIndex(item => item.id === firstServiceItem.id);
        if (firstItemIndex !== -1) {
          itemsWithAssignment[firstItemIndex] = {
            ...itemsWithAssignment[firstItemIndex],
            technicianId: firstTechnician.id
          };
        }
      }
    }

    // Không tạo ID - để database tự tạo
    const newOrder: Order = {
      id: '', // Tạm thời để trống, sẽ được cập nhật sau khi tạo
      customerId: selectedCustomerId,
      customerName: customer?.name || 'Khách lẻ',
      items: itemsWithAssignment.map(item => {
        // Convert commission percentage to money
        if (item.commissions) {
          const commissions: any = {};
          Object.entries(item.commissions).forEach(([memberId, comm]: [string, any]) => {
            if (comm.type === 'percent') {
              commissions[memberId] = {
                value: (item.price * (comm.value || 0)) / 100,
                type: 'money'
              };
            } else {
              commissions[memberId] = comm;
            }
          });
          return { ...item, commissions };
        }
        return item;
      }), // Không cần tạo ID cho items - database tự tạo
      totalAmount: totalAmount,
      deposit: deposit,
      status: OrderStatus.PENDING,
      createdAt: new Date().toLocaleDateString('vi-VN'),
      expectedDelivery: newOrderExpectedDelivery ? new Date(newOrderExpectedDelivery).toLocaleDateString('vi-VN') : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('vi-VN'),
      notes: '',
      discount: discount > 0 ? discount : undefined,
      discountType: newOrderDiscountType,
      additionalFees: additionalFees > 0 ? additionalFees : undefined,
      surchargeReason: newOrderSurchargeReason || undefined
    };

    addOrder(newOrder);

    setIsModalOpen(false);
    setNewOrderItems([]);
    setSelectedCustomerId('');
    setNewOrderDeposit('');
    setNewOrderExpectedDelivery(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setNewOrderDiscount('');
    setNewOrderDiscountType('money');
    setNewOrderAdditionalFees('');
    setNewOrderSurchargeReason('');
    setSelectedItemsForMultiAdd(new Set());
  };

  const handleEditAddItem = () => {
    if (!editSelectedItemId) return;

    let itemData: any;
    let type: ServiceType;
    let name: string;
    let image: string = '';
    let workflowId: string | undefined;
    let initialStatus = 'In Queue';
    let initialStageName = 'Chờ Xử Lý';

    if (editSelectedItemType === 'SERVICE') {
      const svc = services.find(s => s.id === editSelectedItemId);
      if (!svc) return;
      itemData = svc;
      type = ServiceType.REPAIR;
      name = svc.name;
      image = svc.image;

      // Determine Workflow
      if (svc.workflows && svc.workflows.length > 0) {
        workflowId = svc.workflows[0].id;
      } else if (Array.isArray(svc.workflowId) && svc.workflowId.length > 0) {
        workflowId = svc.workflowId[0];
      } else if (typeof svc.workflowId === 'string' && svc.workflowId) {
        workflowId = svc.workflowId;
      }

      if (workflowId) {
        const wf = workflows.find(w => w.id === workflowId);
        if (wf && wf.stages && wf.stages.length > 0) {
          const sortedStages = [...wf.stages].sort((a, b) => a.order - b.order);
          initialStatus = sortedStages[0].id;
          initialStageName = sortedStages[0].name;
        }
      }

    } else {
      const prod = products.find(p => p.id === editSelectedItemId);
      if (!prod) return;
      itemData = prod;
      type = ServiceType.PRODUCT;
      name = prod.name;
      image = prod.image;
      initialStatus = 'Done';
      initialStageName = 'Hoàn Thành';
    }

    // Không tạo ID - sẽ được tạo khi lưu vào database
    const newItem: ServiceItem = {
      id: '', // Tạm thời để trống, sẽ được cập nhật sau khi tạo
      name: name,
      type: type,
      price: editCustomPrice ? parseInt(editCustomPrice) : itemData.price,
      status: initialStatus,
      quantity: 1,
      beforeImage: image,
      isProduct: editSelectedItemType === 'PRODUCT',
      serviceId: editSelectedItemType === 'SERVICE' ? editSelectedItemId : undefined,
      workflowId: workflowId,
      history: [{
        stageId: initialStatus,
        stageName: initialStageName,
        enteredAt: Date.now(),
        performedBy: 'Hệ thống'
      }]
    };

    setEditOrderItems([...editOrderItems, newItem]);
    setEditSelectedItemId('');
    setEditCustomPrice('');
  };

  const handleEditRemoveItem = (index: number) => {
    const updated = [...editOrderItems];
    updated.splice(index, 1);
    setEditOrderItems(updated);
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



  const handleUpdateTaskAssignment = async (itemId: string, orderId: string, taskId: string, assignedTo: string[]) => {
    // Prevent 406 error: Don't query Supabase if we don't have a valid ID (new item)
    if (!itemId || !orderId || itemId === '' || orderId === '') {
      console.warn('⚠️ handleUpdateTaskAssignment: Skipped DB update because itemId or orderId is missing (local item).');
      return;
    }

    try {
      // 1. Get current phan_cong_tasks from database
      const { data, error: fetchError } = await supabase
        .from(DB_PATHS.SERVICE_ITEMS)
        .select('phan_cong_tasks')
        .eq('id', itemId)
        .single();

      if (fetchError) throw fetchError;

      let currentAssignments = (data?.phan_cong_tasks || []) as Array<{ taskId: string; assignedTo: string[] }>;

      // 2. Update or add assignment for this specific taskId
      const taskIndex = currentAssignments.findIndex(a => a.taskId === taskId);
      if (taskIndex >= 0) {
        currentAssignments[taskIndex].assignedTo = assignedTo;
      } else {
        currentAssignments.push({ taskId, assignedTo });
      }

      // 3. Save back to database
      const { error: updateError } = await supabase
        .from(DB_PATHS.SERVICE_ITEMS)
        .update({ phan_cong_tasks: currentAssignments })
        .eq('id', itemId);

      if (updateError) throw updateError;

      console.log(`✅ Successfully updated task assignment for itemId: ${itemId}, taskId: ${taskId}`);
    } catch (error) {
      console.error('❌ Error in handleUpdateTaskAssignment:', error);
      throw error;
    }
  };

  const handleUpdateOrder = async () => {
    if (!editingOrder || !editSelectedCustomerId || editOrderItems.length === 0) return;

    const customer = customers.find(c => c.id === editSelectedCustomerId);
    const discount = parseFloat(editOrderDiscount.replace(/\./g, '')) || 0;
    const additionalFees = parseFloat(editOrderAdditionalFees.replace(/\./g, '')) || 0;
    const deposit = parseFloat(editDeposit.replace(/\./g, '')) || 0;
    const totalAmount = calculateOrderTotal(editOrderItems, discount, editOrderDiscountType, additionalFees);

    // Clean items to remove undefined values - PRESERVE original IDs
    const cleanedItems = editOrderItems.map(item => {
      // Preserve original ID - don't regenerate it
      const cleaned: any = {
        id: item.id, // Keep original ID to avoid creating duplicates
        name: item.name,
        type: item.type,
        price: item.price,
        quantity: item.quantity || 1,
        status: item.status
      };

      // Only add optional fields if they have values
      if (item.beforeImage) cleaned.beforeImage = item.beforeImage;
      if (item.afterImage) cleaned.afterImage = item.afterImage;
      if (item.isProduct !== undefined) cleaned.isProduct = item.isProduct;
      if (item.serviceId) cleaned.serviceId = item.serviceId;
      if (item.workflowId) cleaned.workflowId = item.workflowId;
      if (item.technicianId) cleaned.technicianId = item.technicianId;
      if (item.history && item.history.length > 0) cleaned.history = item.history;
      if (item.lastUpdated) cleaned.lastUpdated = item.lastUpdated;
      if (item.technicalLog && item.technicalLog.length > 0) cleaned.technicalLog = item.technicalLog;
      if (item.notes) cleaned.notes = item.notes;
      if (item.assignedMembers && item.assignedMembers.length > 0) {
        cleaned.assignedMembers = item.assignedMembers;
      }
      if (item.commissions) {
        // Convert percentage to money before saving (Snapshot value)
        const commissions: any = {};
        Object.entries(item.commissions).forEach(([memberId, comm]: [string, any]) => {
          if (comm.type === 'percent') {
            commissions[memberId] = {
              value: (item.price * (comm.value || 0)) / 100,
              type: 'money'
            };
          } else {
            commissions[memberId] = comm;
          }
        });
        cleaned.commissions = commissions;
      }
      if ((item as any).stageAssignments) cleaned.stageAssignments = (item as any).stageAssignments;

      return cleaned;
    });

    const updatedOrder: any = {
      id: editingOrder.id,
      customerId: editSelectedCustomerId,
      customerName: customer?.name || 'Khách lẻ',
      items: cleanedItems,
      totalAmount: totalAmount,
      deposit: deposit,
      status: editingOrder.status,
      createdAt: editingOrder.createdAt,
      expectedDelivery: editExpectedDelivery, // Already formatted string if needed or handle parsing
      notes: editNotes || '',
      discount: discount > 0 ? discount : undefined,
      discountType: editOrderDiscountType,
      additionalFees: additionalFees > 0 ? additionalFees : undefined,
      surchargeReason: editSurchargeReason || undefined
    };

    try {
      // Remove all undefined values before saving
      const cleanedOrder = removeUndefined(updatedOrder);
      await updateOrder(editingOrder.id, cleanedOrder);
      setIsEditModalOpen(false);
      setEditingOrder(null);
      setEditOrderItems([]);
      setEditSelectedCustomerId('');
      setEditDeposit('');
      setEditExpectedDelivery('');
      setEditNotes('');
      setEditOrderDiscount('');
      setEditOrderAdditionalFees('');
      setEditSelectedItemsForMultiAdd(new Set());
    } catch (error: any) {
      console.error('Lỗi khi cập nhật đơn hàng:', error);
      alert('Lỗi khi cập nhật đơn hàng: ' + (error?.message || String(error)));
    }
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.CONFIRMED: return 'bg-blue-900/30 text-blue-400 border-blue-800';
      case OrderStatus.PROCESSING: return 'bg-gold-900/30 text-gold-500 border-gold-800';
      case OrderStatus.DONE: return 'bg-emerald-900/30 text-emerald-400 border-emerald-800';
      case OrderStatus.DELIVERED: return 'bg-neutral-800 text-slate-400 border-neutral-700';
      case OrderStatus.CANCELLED: return 'bg-red-900/30 text-red-400 border-red-800';
      default: return 'bg-neutral-800 text-slate-400 border-neutral-700';
    }
  };




  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* --- CONTROL PANEL --- */}
      <div className="bg-neutral-900 rounded-xl shadow-sm border border-neutral-800 p-4 space-y-4 flex-shrink-0">

        {/* ROW 1: Actions & Search */}
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <button onClick={() => window.history.back()} className="p-2 hover:bg-neutral-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors" title="Quay lại">
            <ArrowLeft size={20} />
          </button>

          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Tìm kiếm (Mã đơn, Tên khách, SĐT...)"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-1 focus:ring-gold-500 outline-none transition-all placeholder-slate-600"
            />
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-300 hover:bg-neutral-700 transition-colors" onClick={() => alert('Đang phát triển')}>
              <Download size={18} /> <span className="hidden sm:inline">Excel</span>
            </button>
            <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-300 hover:bg-neutral-700 transition-colors" onClick={() => alert('Đang phát triển')}>
              <Upload size={18} /> <span className="hidden sm:inline">Upload</span>
            </button>
            <button
              onClick={() => { setIsModalOpen(true); setNewOrderItems([]); }}
              className="flex items-center gap-2 bg-gold-600 hover:bg-gold-700 text-black font-medium px-4 py-2.5 rounded-lg shadow-lg shadow-gold-900/20 transition-all font-bold"
            >
              <Plus size={18} /> <span className="hidden sm:inline">Tạo Đơn</span>
            </button>
          </div>
        </div>

        {/* ROW 2: Filters */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-neutral-800">
          <MultiSelectFilter label="Sản phẩm / Dịch vụ" options={productOptions} selected={filters.products} onChange={(v) => updateFilter('products', v)} />
          <MultiSelectFilter label="Trạng thái" options={statusOptions} selected={filters.statuses} onChange={(v) => updateFilter('statuses', v)} />
          {selectedOrderIds.size > 0 && (
            <div className="ml-auto flex items-center gap-2 bg-gold-900/20 border border-gold-900/50 px-3 py-1 rounded text-gold-500 text-sm animate-in fade-in">
              <span>Đã chọn {selectedOrderIds.size} đơn</span>
              <div className="h-4 w-px bg-gold-900/50 mx-2"></div>
              <span>Đã chọn {selectedOrderIds.size} đơn</span>
              <div className="h-4 w-px bg-gold-900/50 mx-2"></div>
              <button onClick={() => { setPrintType('QR'); setShowQRModal(true); }} className="hover:text-gold-400 flex items-center gap-1"><QrCode size={14} /> Print QR</button>
            </div>
          )}
        </div>

        {/* ROW 3: Stats */}
        <div className="flex flex-wrap gap-6 sm:gap-12 pt-2 border-t border-neutral-800 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Số đơn hàng:</span>
            <span className="text-xl font-bold text-slate-200">{stats.count}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Tổng doanh thu:</span>
            <span className="text-xl font-bold text-gold-500">{formatCurrency(stats.revenue)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Đã cọc:</span>
            <span className="text-xl font-bold text-emerald-500">{formatCurrency(stats.deposit)}</span>
          </div>
        </div>
      </div>

      {/* --- TABLE CONTENT --- */}
      <div className="bg-neutral-900 rounded-xl shadow-lg shadow-black/20 border border-neutral-800 flex flex-col overflow-hidden min-h-0 flex-1">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left border-collapse relative">
            <thead className="sticky top-0 z-20 bg-neutral-900 shadow-sm">
              <tr className="border-b border-neutral-800 text-slate-500 text-xs font-bold uppercase tracking-wider bg-neutral-800/50">
                <th className="p-4 w-10">
                  <button onClick={toggleSelectAll} className="text-slate-500 hover:text-slate-300">
                    {selectedOrderIds.size > 0 && selectedOrderIds.size === orders.length ? <CheckSquare size={18} className="text-gold-500" /> : <Square size={18} />}
                  </button>
                </th>

                <th className="p-4 min-w-[200px]">Khách Hàng</th>
                <th className="p-4 w-12 text-center text-slate-500"><QrCode size={14} className="mx-auto" /></th>
                <th className="p-4">Sản Phẩm</th>
                <th className="p-4 text-right">Tổng Tiền</th>
                <th className="p-4">Trạng Thái</th>
                <th className="p-4 hidden md:table-cell">Ngày Hẹn</th>
                <th className="p-4 w-12 sticky right-0 bg-neutral-900 z-30"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {!orders || orders.length === 0 ? (
                <tr><td colSpan={8} className="p-12 text-center text-slate-500">
                  <div className="flex flex-col items-center gap-2">
                    <ShoppingBag size={48} className="text-slate-600 opacity-50" />
                    <p className="text-lg font-semibold text-slate-400">Chưa có đơn hàng nào</p>
                    <p className="text-sm text-slate-500">Nhấn "Tạo Đơn" để thêm đơn hàng mới</p>
                  </div>
                </td></tr>
              ) : filteredOrders.length === 0 ? (
                <tr><td colSpan={8} className="p-12 text-center text-slate-500">
                  <div className="flex flex-col items-center gap-2">
                    <Search size={48} className="text-slate-600 opacity-50" />
                    <p className="text-lg font-semibold text-slate-400">Không tìm thấy đơn hàng</p>
                    <p className="text-sm text-slate-500">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                    <p className="text-xs text-slate-600 mt-2">Tổng số đơn hàng: {orders.length}</p>
                  </div>
                </td></tr>
              ) : filteredOrders.map((order) => {
                const isSelected = selectedOrderIds.has(order.id);
                return (
                  <tr key={order.id} className={`transition-colors group ${isSelected ? 'bg-gold-900/10' : 'hover:bg-neutral-800/50'}`}>
                    <td className="p-4" onClick={(e) => toggleSelectOrder(order.id, e)}>
                      {isSelected ? <CheckSquare size={18} className="text-gold-500" /> : <Square size={18} className="text-neutral-600" />}
                    </td>

                    <td className="p-4">
                      <div className="font-bold text-slate-200">{order.customerName}</div>
                      <div className="text-[10px] text-gold-600/80 font-bold mt-0.5 uppercase tracking-wide">
                        {getCustomerInfo(order.customerId)?.tier || 'Member'}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.stopPropagation();
                          setQrPrintTargetId(order.id);
                          setPrintType('QR');
                          setShowQRModal(true);
                        }}
                        className="p-1.5 text-slate-500 hover:text-gold-500 hover:bg-gold-900/10 rounded transition-colors"
                        title="In mã QR đơn này"
                      >
                        <QrCode size={18} />
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="flex -space-x-2">
                        {(order.items || []).slice(0, 4).map((item, idx) => (
                          <div key={idx} className="w-8 h-8 rounded-full border-2 border-neutral-900 bg-neutral-800 flex items-center justify-center overflow-hidden" title={item.name}>
                            {item.beforeImage ? (
                              <img src={item.beforeImage || undefined} className="w-full h-full object-cover" alt="" />
                            ) : (
                              <span className="text-[10px] text-slate-400 font-bold">{item.name[0]}</span>
                            )}
                          </div>
                        ))}
                        {(order.items || []).length > 4 && (
                          <div className="w-8 h-8 rounded-full border-2 border-neutral-900 bg-neutral-800 flex items-center justify-center text-[10px] text-slate-400 font-bold">
                            +{(order.items || []).length - 4}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right font-bold text-gold-400">{formatPrice(order.totalAmount)} ₫</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-400 hidden md:table-cell">{formatDate(order.expectedDelivery)}</td>
                    <td className="p-4 sticky right-0 bg-neutral-900/95 backdrop-blur-sm group-hover:bg-neutral-800 transition-colors z-20">
                      <ActionMenu
                        itemName={order.id}
                        onView={() => {
                          setSelectedOrder(order);
                          setEditingOrder(null);
                          setIsEditModalOpen(false);
                        }}
                        onEdit={() => {
                          if (!order) return;

                          setEditingOrder(order);
                          setEditOrderItems((order.items as unknown as ServiceItem[]) || []);

                          // Find matching customer ID - try multiple ways
                          let customerIdToUse = order.customerId || '';

                          // If customerId doesn't match any customer, try to find by name
                          if (customerIdToUse && !customers.find(c => c.id === customerIdToUse)) {
                            const customerByName = customers.find(c =>
                              c.name === order.customerName ||
                              c.name.toLowerCase() === order.customerName?.toLowerCase()
                            );
                            if (customerByName) {
                              customerIdToUse = customerByName.id;
                            }
                          }

                          // If still no match, try first customer as fallback
                          if (!customerIdToUse && customers.length > 0) {
                            customerIdToUse = customers[0].id;
                          }

                          setEditSelectedCustomerId(customerIdToUse);
                          setEditDeposit(order.deposit ? formatNumber(order.deposit) : '');
                          setEditExpectedDelivery(order.expectedDelivery ? new Date(order.expectedDelivery).toISOString().split('T')[0] : '');
                          setEditNotes(order.notes || '');
                          setEditOrderDiscount(order.discount ? formatNumber(order.discount) : '');
                          setEditOrderDiscountType(order.discountType || 'money');
                          setEditOrderAdditionalFees(order.additionalFees ? formatNumber(order.additionalFees) : '');
                          setEditSurchargeReason(order.surchargeReason || '');
                          setEditSelectedItemsForMultiAdd(new Set());
                          setEditSelectedItemType('SERVICE');
                          setEditSelectedItemId('');
                          setEditCustomPrice('');
                          setSelectedOrder(null);
                          setIsEditModalOpen(true);
                        }}
                        onDelete={() => deleteOrder(order.id)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedOrder && !isEditModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border border-neutral-800 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-neutral-800 flex justify-between items-center sticky top-0 bg-neutral-900 z-10">
              <div>
                <h2 className="text-xl font-serif font-bold text-slate-100">Chi Tiết Đơn Hàng</h2>
                <p className="text-sm text-slate-500">{selectedOrder.id}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-neutral-800 rounded-full text-slate-400">✕</button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2 space-y-6">
                <div className="bg-neutral-800/50 p-4 rounded-lg border border-neutral-800">
                  <h3 className="font-semibold text-gold-500 mb-3 flex items-center gap-2">
                    <QrCode size={18} /> Danh Sách Dịch Vụ & Sản Phẩm
                  </h3>
                  <div className="space-y-4">
                    {console.log('🔍 Orders Modal Items:', selectedOrder.items)}
                    {selectedOrder.items.map((item) => {
                      // Find stage name if possible
                      let statusLabel = item.status;
                      // Try to find status in workflows
                      if (item.workflowId) {
                        const wf = workflows.find(w => w.id === item.workflowId);
                        const stage = wf?.stages?.find(s => s.id === item.status);
                        if (stage) statusLabel = stage.name;
                      }

                      return (
                        <div key={item.id} className="bg-neutral-900 p-4 rounded-lg border border-neutral-800 shadow-sm flex gap-4">
                          <div className="w-20 h-20 bg-neutral-800 rounded-md overflow-hidden flex-shrink-0 relative group">
                            {item.beforeImage && item.beforeImage.trim() ? (
                              <img src={item.beforeImage} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="Before" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-600">No Img</div>
                            )}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <ImageIcon className="text-white" size={20} />
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <h4 className="font-medium text-slate-200 flex items-center gap-2">
                                {item.isProduct && <Package size={14} className="text-slate-500" />}
                                {item.name}
                              </h4>
                              <span className="text-xs bg-neutral-800 px-2 py-1 rounded text-slate-400 border border-neutral-700">
                                {statusLabel}
                              </span>
                            </div>
                            <p className="text-sm text-slate-500 mt-1">{item.type} • x{formatNumber(item.quantity || 1)}</p>
                            <div className="mt-2 flex items-center gap-2 text-xs text-gold-600 font-medium">
                              <QrCode size={14} />
                              <span>{item.id}</span>
                            </div>
                            {!item.isProduct && item.serviceId && (
                              <WorkflowStagesTasksView
                                item={item}
                                workflows={workflows}
                                members={members || []}
                                onUpdateTaskAssignment={async (taskId: string, assignedTo: string[]) => {
                                  try {
                                    await handleUpdateTaskAssignment(item.id, selectedOrder?.id || '', taskId, assignedTo);
                                  } catch (error) {
                                    alert('Lỗi khi cập nhật phân công: ' + (error as Error).message);
                                  }
                                }}
                                isReadOnly={true}
                              />
                            )}
                            {item.workflowId && !item.serviceId && (
                              <div className="mt-1 text-[10px] text-blue-500">
                                Quy trình: {workflows.find(w => w.id === item.workflowId)?.label || 'Unknown'}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-slate-300">{formatPrice(item.price)} ₫</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-neutral-800/30 p-4 rounded-lg border border-neutral-800">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">Thông Tin Khách Hàng</h3>
                  {(() => {
                    const c = getCustomerInfo(selectedOrder.customerId);
                    return (
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-slate-500">Tên</label>
                          <p className="font-medium text-slate-200">{selectedOrder.customerName}</p>
                        </div>
                        <div>
                          <label className="text-xs text-slate-500">SĐT</label>
                          <p className="font-medium text-slate-200">{c?.phone || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-xs text-slate-500">Địa chỉ</label>
                          <p className="text-sm text-slate-300">{c?.address || 'Chưa có'}</p>
                        </div>
                        {selectedOrder.expectedDelivery && (
                          <div>
                            <label className="text-xs text-slate-500">Ngày hẹn trả</label>
                            <p className="font-medium text-gold-500">{formatDate(selectedOrder.expectedDelivery)}</p>
                          </div>
                        )}
                        {selectedOrder.notes && (
                          <div>
                            <label className="text-xs text-slate-500">Ghi chú</label>
                            <p className="text-sm text-slate-300 whitespace-pre-wrap">{selectedOrder.notes}</p>
                          </div>
                        )}
                        {selectedOrder.surchargeReason && (
                          <div>
                            <label className="text-xs text-slate-500">Lý do phụ phí</label>
                            <p className="text-sm text-orange-400">{selectedOrder.surchargeReason}</p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                <div className="bg-neutral-800/30 p-4 rounded-lg border border-neutral-800">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">Thanh Toán</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Tạm tính ({selectedOrder.items?.length || 0} mục)</span>
                      <span className="text-slate-300">
                        {formatPrice((selectedOrder.items || []).reduce((acc, i) => acc + (i.price * (i.quantity || 1)), 0))} ₫
                      </span>
                    </div>
                    {(selectedOrder.discount || 0) > 0 && (() => {
                      const subtotal = (selectedOrder.items || []).reduce((acc, i) => acc + (i.price * (i.quantity || 1)), 0);
                      const discountAmount = selectedOrder.discountType === 'percent'
                        ? (subtotal * (selectedOrder.discount || 0)) / 100
                        : (selectedOrder.discount || 0);
                      return (
                        <div className="flex justify-between text-emerald-400">
                          <span>Khấu trừ {selectedOrder.discountType === 'percent' ? `(${selectedOrder.discount}%)` : ''}</span>
                          <span>-{formatPrice(discountAmount)} ₫</span>
                        </div>
                      );
                    })()}
                    {(selectedOrder.additionalFees || 0) > 0 && (
                      <div className="flex justify-between text-blue-400">
                        <span>Phụ phí phát sinh</span>
                        <span>+{formatPrice(selectedOrder.additionalFees || 0)} ₫</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-slate-200 pt-2 border-t border-neutral-700">
                      <span>Tổng hóa đơn</span>
                      <span>{formatPrice(selectedOrder.totalAmount)} ₫</span>
                    </div>
                    <div className="flex justify-between text-gold-500">
                      <span>Đã cọc</span>
                      <span>-{formatPrice(selectedOrder.deposit || 0)} ₫</span>
                    </div>
                    <div className="flex justify-between font-bold text-red-500 pt-2 border-t border-neutral-700">
                      <span>Còn lại</span>
                      <span>{formatPrice(selectedOrder.totalAmount - (selectedOrder.deposit || 0))} ₫</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (selectedOrder) {
                      setQrPrintTargetId(selectedOrder.id);
                      setPrintType('INVOICE');
                      setShowQRModal(true);
                    }
                  }}
                  className="w-full py-3 bg-white text-black rounded-lg hover:bg-slate-200 flex items-center justify-center gap-2 font-medium"
                >
                  <FileText size={18} />
                  In Hóa Đơn
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ... keeping Print Modal and Create/Edit Modals logic (Edit modal should be updated in real impl to match Create logic for workflows) ... */}
      {/* For brevity, omitting re-re-writing Create/Edit modal structure if it hasn't changed structure, but the handle functions are updated above. */}
      {/* Actually I need to include them to complete the file. */}

      {/* QR Print Modal */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4">
          {/* Same contents as before */}
          <div className="bg-neutral-900 rounded-xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl border border-neutral-800">
            <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-900 rounded-t-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gold-600 text-black rounded-lg">
                  <QrCode size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-100">In Mã QR Đơn Hàng</h3>
                  <p className="text-xs text-slate-500">Đã chọn {selectedOrderIds.size} đơn hàng</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  <Printer size={18} /> In Ngay
                </button>
                <button onClick={() => { setShowQRModal(false); setQrPrintTargetId(null); }} className="p-2 hover:bg-neutral-800 rounded-full transition-colors text-slate-400">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-neutral-950">
              <style>{`
                @media print {
                  body * {
                    visibility: hidden;
                  }
                  #printable-ticket-area, #printable-ticket-area * {
                    visibility: visible;
                  }
                  #printable-ticket-area {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    margin: 0;
                    padding: 0;
                    background: white;
                    color: black !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                  @page {
                    size: A4;
                    margin: 10mm;
                  }
                }
              `}</style>
              <div id="printable-ticket-area" className="bg-white shadow-lg mx-auto max-w-[210mm] min-h-[297mm] p-8 print:p-0 print:w-full print:shadow-none text-black">
                {orders.filter(o => qrPrintTargetId ? o.id === qrPrintTargetId : selectedOrderIds.has(o.id)).map(order => (
                  <div key={order.id} className="break-inside-avoid mb-8 pb-8 border-b-2 border-dashed border-slate-300 last:border-0 last:mb-0 last:pb-0">

                    {printType === 'QR' ? (
                      <>
                        {/* 1. Main Order Ticket (Phiếu Tiếp Nhận) */}
                        <div className="border-2 border-black rounded-xl overflow-hidden mb-6">
                          <div className="bg-black text-white p-2.5 text-center uppercase font-bold tracking-widest border-b-2 border-black text-sm">
                            Phiếu Tiếp Nhận Dịch Vụ / Service Ticket
                          </div>
                          <div className="p-6 flex flex-row gap-6">
                            {/* Left Info */}
                            <div className="flex-1 space-y-5">
                              <div>
                                <div className="text-[10px] font-mono text-slate-500 uppercase mb-1 tracking-wider">Mã Đơn Hàng / Order ID</div>
                                <div className="text-5xl font-black tracking-tighter tabular-nums">
                                  #{order.id.slice(0, 8).toUpperCase()}
                                </div>
                                <div className="text-[9px] font-mono text-slate-400 mt-1">{order.id}</div>
                              </div>

                              <div className="space-y-1">
                                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Khách Hàng / Customer</div>
                                <div className="text-2xl font-bold line-clamp-1">{order.customerName}</div>
                                {getCustomerInfo(order.customerId) && (
                                  <div className="text-sm font-medium text-slate-600">{getCustomerInfo(order.customerId)?.phone}</div>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                                <div>
                                  <div className="text-[10px] font-mono text-slate-500 uppercase mb-0.5">Ngày nhận (Received)</div>
                                  <div className="font-bold text-lg">{formatDate(order.createdAt)}</div>
                                </div>
                                <div>
                                  <div className="text-[10px] font-mono text-slate-500 uppercase mb-0.5">Hẹn trả (Expected)</div>
                                  <div className="font-bold text-lg">{formatDate(order.expectedDelivery)}</div>
                                </div>
                              </div>
                            </div>

                            {/* Right QR */}
                            <div className="flex flex-col items-center justify-center pl-6 border-l border-slate-200 w-48 shrink-0">
                              <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${order.id}`}
                                alt="Order QR"
                                className="w-40 h-40 mix-blend-multiply"
                              />
                              <div className="text-center mt-2 space-y-1">
                                <div className="text-[10px] text-slate-500 font-medium">Quét để xem chi tiết</div>
                                <div className="font-bold text-xs bg-slate-100 px-2 py-1 rounded">{order.items.length} Sản phẩm</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 2. Item Tags (Tem Sản Phẩm) */}
                        {order.items.length > 0 && (
                          <div>
                            <div className="text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Tem Sản Phẩm ({order.items.length})</div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                              {order.items.map((item, idx) => (
                                <div key={item.id} className="border border-slate-300 rounded-lg p-3 flex gap-3 bg-slate-50/50 relative overflow-hidden break-inside-avoid">
                                  <div className="absolute top-0 right-0 px-1.5 py-0.5 bg-slate-200 rounded-bl text-[9px] font-mono font-bold text-slate-500">
                                    {idx + 1}/{order.items.length}
                                  </div>

                                  <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${item.id}`}
                                    alt="Item QR"
                                    className="w-16 h-16 mix-blend-multiply bg-white p-1 rounded border border-slate-200 shrink-0 self-center"
                                  />

                                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <div className="text-[10px] font-mono text-slate-500 mb-0.5 font-bold">
                                      #{order.id.slice(0, 8).toUpperCase()}
                                    </div>
                                    <div className="font-bold text-base leading-tight mb-1 line-clamp-2 pr-4">{item.name}</div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded font-medium text-slate-600">
                                        {item.type === 'SERVICE' ? 'Dịch vụ' : 'Sản phẩm'}
                                      </span>
                                      {item.id && (
                                        <span className="text-[9px] font-mono text-slate-400 truncate max-w-[80px]">
                                          {item.id.split('-')[0]}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="p-8">
                        {/* INVOICE LAYOUT */}
                        <div className="text-center mb-8">
                          <h1 className="text-3xl font-black uppercase mb-1 tracking-widest">Hóa Đơn Thanh Toán</h1>
                          <div className="text-xs font-mono text-slate-500 tracking-widest uppercase">Invoice / Receipt</div>
                        </div>

                        <div className="flex justify-between mb-8">
                          <div>
                            <div className="font-bold text-lg mb-1">{order.customerName}</div>
                            <div className="text-sm text-slate-500">{getCustomerInfo(order.customerId)?.phone}</div>
                            <div className="text-sm text-slate-500">{getCustomerInfo(order.customerId)?.address}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-slate-500">Mã đơn: <span className="font-mono font-bold text-black">#{order.id.slice(0, 8).toUpperCase()}</span></div>
                            <div className="text-sm text-slate-500">Ngày: <span className="font-medium text-black">{formatDate(new Date())}</span></div>
                          </div>
                        </div>

                        <table className="w-full text-sm mb-8">
                          <thead>
                            <tr className="border-b-2 border-black text-xs font-bold uppercase tracking-wider">
                              <th className="text-left py-2">Dịch vụ</th>
                              <th className="text-right py-2 w-16">SL</th>
                              <th className="text-right py-2 w-32">Đơn giá</th>
                              <th className="text-right py-2 w-32">Thành tiền</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {order.items.map((item, i) => (
                              <tr key={i}>
                                <td className="py-3 font-medium">{item.name}</td>
                                <td className="py-3 text-right text-slate-600">{item.quantity || 1}</td>
                                <td className="py-3 text-right text-slate-600">{formatPrice(item.price)}</td>
                                <td className="py-3 text-right font-bold">{formatPrice(item.price * (item.quantity || 1))}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        <div className="flex justify-end mb-12">
                          <div className="w-80 space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">Tổng tiền hàng</span>
                              <span className="font-medium">{formatPrice((order.items || []).reduce((s, x) => s + (x.price * (x.quantity || 1)), 0))} ₫</span>
                            </div>
                            {(order.discount || 0) > 0 && (() => {
                              const subtotal = (order.items || []).reduce((s, x) => s + (x.price * (x.quantity || 1)), 0);
                              const discountAmount = order.discountType === 'percent'
                                ? (subtotal * (order.discount || 0)) / 100
                                : (order.discount || 0);
                              return (
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-500">Giảm giá {order.discountType === 'percent' ? `(${order.discount}%)` : ''}</span>
                                  <span className="font-medium">-{formatPrice(discountAmount)} ₫</span>
                                </div>
                              );
                            })()}
                            {(order.additionalFees || 0) > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Phụ phí</span>
                                <span className="font-medium">+{formatPrice(order.additionalFees)} ₫</span>
                              </div>
                            )}
                            <div className="border-t border-black pt-2 flex justify-between font-bold text-lg items-center">
                              <span>TỔNG THANH TOÁN</span>
                              <span className="whitespace-nowrap">{formatPrice(order.totalAmount)} ₫</span>
                            </div>
                            <div className="flex justify-between text-sm pt-1">
                              <span className="text-slate-500">Đã thanh toán (Cọc)</span>
                              <span className="font-medium">{formatPrice(order.deposit || 0)} ₫</span>
                            </div>
                            <div className="flex justify-between text-sm font-bold pt-1">
                              <span className="text-slate-900">CÒN LẠI</span>
                              <span className="text-red-600">{formatPrice(order.totalAmount - (order.deposit || 0))} ₫</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-center space-y-2">
                          <p className="text-sm font-medium italic">Cảm ơn quý khách đã sử dụng dịch vụ!</p>
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${order.id}`}
                            alt="QR"
                            className="w-16 h-16 mx-auto mix-blend-multiply opacity-50"
                          />
                        </div>
                      </div>
                    )}

                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Order Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-neutral-800 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-neutral-800">
              <h2 className="text-xl font-serif font-bold text-slate-100">Tạo Đơn Hàng Mới</h2>
              <p className="text-slate-500 text-sm">Nhập thông tin khách hàng và chọn sản phẩm/dịch vụ.</p>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="bg-neutral-800/30 p-4 rounded-xl border border-neutral-800">
                <label className="block text-sm font-bold text-slate-300 mb-2">Khách hàng <span className="text-red-500">*</span></label>
                <select
                  className="w-full p-2.5 border border-neutral-700 rounded-lg outline-none focus:ring-1 focus:ring-gold-500 bg-neutral-900 text-slate-200"
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                >
                  <option value="">-- Chọn khách hàng --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} - {c.phone} ({c.tier})</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-200">Sản Phẩm & Dịch Vụ</h3>
                  <span className="text-xs text-slate-500">
                    {newOrderItems.length} mục đã chọn
                  </span>
                </div>

                {/* Add Item Form */}
                <div className="p-4 border border-gold-900/30 bg-gold-900/10 rounded-xl mb-4">
                  <div className="flex gap-4 mb-3 border-b border-gold-900/20 pb-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="type"
                        checked={selectedItemType === 'SERVICE'}
                        onChange={() => {
                          setSelectedItemType('SERVICE');
                          setSelectedItemId('');
                          setCustomPrice('');
                          setSelectedItemsForMultiAdd(new Set());
                        }}
                        className="text-gold-500 focus:ring-gold-500 bg-neutral-900 border-neutral-700"
                      />
                      <span className="text-sm font-medium text-slate-300">Dịch Vụ (Spa/Sửa chữa)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="type"
                        checked={selectedItemType === 'PRODUCT'}
                        onChange={() => {
                          setSelectedItemType('PRODUCT');
                          setSelectedItemId('');
                          setCustomPrice('');
                          setSelectedItemsForMultiAdd(new Set());
                        }}
                        className="text-gold-500 focus:ring-gold-500 bg-neutral-900 border-neutral-700"
                      />
                      <span className="text-sm font-medium text-slate-300">Sản Phẩm Bán Lẻ</span>
                    </label>
                  </div>

                  {/* Multi-select mode */}
                  <div className="mb-3 pb-3 border-b border-gold-900/20">
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={selectedItemsForMultiAdd.size > 0}
                        onChange={(e) => {
                          if (!e.target.checked) {
                            setSelectedItemsForMultiAdd(new Set());
                          }
                        }}
                        className="rounded border-neutral-600 bg-neutral-900 text-gold-500 focus:ring-gold-500"
                      />
                      <span className="text-slate-300">Chế độ chọn nhiều ({selectedItemsForMultiAdd.size} đã chọn)</span>
                    </label>
                  </div>

                  {/* Multi-select list with checkboxes */}
                  <div className="max-h-48 overflow-y-auto mb-3 space-y-2 border border-neutral-700 rounded-lg p-3 bg-neutral-900/50">
                    <div className="flex items-center gap-2 pb-2 border-b border-neutral-700">
                      <input
                        type="checkbox"
                        checked={selectedItemsForMultiAdd.size > 0 && selectedItemsForMultiAdd.size === (selectedItemType === 'SERVICE' ? services : products).length}
                        onChange={(e) => {
                          const list = selectedItemType === 'SERVICE' ? services : products;
                          if (e.target.checked) {
                            setSelectedItemsForMultiAdd(new Set(list.map(i => i.id)));
                          } else {
                            setSelectedItemsForMultiAdd(new Set());
                          }
                        }}
                        className="rounded border-neutral-600 bg-neutral-800 text-gold-500 focus:ring-gold-500"
                      />
                      <span className="text-xs font-semibold text-slate-400 uppercase">Chọn tất cả</span>
                    </div>
                    {(selectedItemType === 'SERVICE' ? services : products).map(item => (
                      <label key={item.id} className="flex items-center gap-2 p-2 hover:bg-neutral-800 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedItemsForMultiAdd.has(item.id)}
                          onChange={(e) => {
                            const newSet = new Set(selectedItemsForMultiAdd);
                            if (e.target.checked) {
                              newSet.add(item.id);
                            } else {
                              newSet.delete(item.id);
                            }
                            setSelectedItemsForMultiAdd(newSet);
                          }}
                          className="rounded border-neutral-600 bg-neutral-800 text-gold-500 focus:ring-gold-500"
                        />
                        <span className="text-sm text-slate-300 flex-1">{item.name}</span>
                        <span className="text-xs text-slate-500">
                          {formatPrice(item.price || 0)} ₫
                        </span>
                      </label>
                    ))}
                  </div>

                  {/* NEW: Workflows for Multi-Select Mode */}
                  {selectedItemsForMultiAdd.size > 0 && selectedItemType === 'SERVICE' && (
                    <div className="mt-4 space-y-4 mb-4">
                      <h4 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
                        <Columns size={16} className="text-gold-500" />
                        Gán nhân sự cho các dịch vụ đã chọn
                      </h4>

                      {Array.from(selectedItemsForMultiAdd).map((serviceId) => {
                        const idStr = String(serviceId);
                        const service = services.find(s => s.id === idStr);
                        if (!service) return null;

                        // Robust Workflow Resolution
                        let displayWorkflowId: string | undefined;
                        let embeddedWorkflows: any[] = [];

                        if (service.workflows && service.workflows.length > 0) {
                          displayWorkflowId = service.workflows[0].id; // Fallback ID
                          embeddedWorkflows = service.workflows;      // Embedded stages
                        } else if (Array.isArray(service.workflowId) && service.workflowId.length > 0) {
                          displayWorkflowId = service.workflowId[0];
                        } else if (typeof service.workflowId === 'string' && service.workflowId) {
                          displayWorkflowId = service.workflowId;
                        }

                        // Try find global workflow first
                        let workflow = displayWorkflowId ? workflows.find(w => w.id === displayWorkflowId) : undefined;

                        // If global workflow not found, check if we have embedded stages
                        // Construct a temporary workflow object from embedded data
                        if (!workflow && embeddedWorkflows.length > 0) {
                          workflow = {
                            id: displayWorkflowId || 'embedded',
                            label: service.name, // Use service name as workflow label
                            color: 'bg-slate-500',
                            department: 'Kỹ Thuật', // Default
                            types: [],
                            stages: embeddedWorkflows.map(wf => ({
                              id: wf.id,
                              name: wf.name || `Bước ${wf.order}`,
                              order: wf.order
                            })).sort((a, b) => a.order - b.order)
                          };
                        }

                        if (!workflow?.stages || workflow.stages.length === 0) {
                          return (
                            <div key={serviceId} className="p-4 border border-neutral-800 rounded-lg bg-neutral-900/50">
                              <div className="text-sm font-bold text-slate-200 mb-2">{service.name}</div>
                              <div className="text-[10px] text-slate-600 italic">Chưa có quy trình được cấu hình</div>
                            </div>
                          );
                        }

                        return (
                          <div key={idStr} className="p-3 bg-neutral-800/50 rounded-lg border border-neutral-700">
                            <h5 className="text-sm font-semibold text-slate-200 mb-2">
                              {service.name} - {workflow.label}
                            </h5>

                            <div className="space-y-2">
                              {workflow.stages.sort((a, b) => a.order - b.order).map((stage, idx) => {
                                const assignmentKey = makeAssignmentKey(idStr, stage.id);
                                const selectedStaff = getSelectedStaffForStage(idStr, stage.id);

                                return (
                                  <div key={stage.id} className="bg-neutral-900/50 p-2 rounded border border-neutral-700 font-sans">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs text-slate-300 font-medium">
                                        {idx + 1}. {stage.name}
                                      </span>
                                    </div>

                                    {/* Multi-select for staff */}
                                    <div className="relative">
                                      <button
                                        type="button"
                                        onClick={() => toggleStageStaffSelector(assignmentKey)}
                                        className="w-full p-1.5 bg-neutral-800 border border-neutral-600 rounded text-left text-xs text-slate-300 hover:border-gold-500 transition-colors flex items-center justify-between"
                                      >
                                        <span className="truncate">
                                          {selectedStaff.length > 0
                                            ? selectedStaff.map(m => m.name).join(', ')
                                            : `Chọn nhân sự...`
                                          }
                                        </span>
                                        <Users size={12} className="text-slate-500 flex-shrink-0 ml-2" />
                                      </button>

                                      {openStageSelector === assignmentKey && (
                                        <>
                                          <div
                                            className="fixed inset-0 z-40"
                                            onClick={() => setOpenStageSelector(null)}
                                          />
                                          <div className="absolute z-50 mt-1 w-full bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                                            {members.map(member => (
                                              <label
                                                key={member.id}
                                                className="flex items-center gap-2 px-2 py-1.5 hover:bg-neutral-700 cursor-pointer"
                                              >
                                                <input
                                                  type="checkbox"
                                                  checked={isStaffAssignedToStage(idStr, stage.id, member.id)}
                                                  onChange={(e) => handleToggleStaffForStage(idStr, stage.id, member.id, e.target.checked)}
                                                  className="rounded border-neutral-600 bg-neutral-900 text-gold-500"
                                                />
                                                <div className="flex items-center gap-2">
                                                  {member.avatar ? (
                                                    <img src={member.avatar} className="w-4 h-4 rounded-full" alt="" />
                                                  ) : (
                                                    <div className="w-4 h-4 rounded-full bg-neutral-700 flex items-center justify-center text-[8px] font-bold text-slate-300">
                                                      {member.name.charAt(0)}
                                                    </div>
                                                  )}
                                                  <span className="text-xs text-slate-300">{member.name}</span>
                                                </div>
                                              </label>
                                            ))}
                                          </div>
                                        </>
                                      )}
                                    </div>

                                    {/* Show selected staff chips */}
                                    {selectedStaff.length > 0 && (
                                      <div className="mt-1.5 flex flex-wrap gap-1">
                                        {selectedStaff.map(member => (
                                          <div
                                            key={member.id}
                                            className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-900/20 rounded border border-blue-800/40 text-[10px]"
                                          >
                                            {member.avatar && <img src={member.avatar} className="w-3 h-3 rounded-full" alt="" />}
                                            <span className="text-blue-300">{member.name}</span>
                                            <button
                                              type="button"
                                              onClick={() => handleToggleStaffForStage(idStr, stage.id, member.id, false)}
                                              className="ml-0.5 text-blue-400 hover:text-red-400"
                                            >
                                              ×
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Single select mode (fallback) */}
                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Hoặc chọn từng mục</label>
                      <select
                        className="w-full p-2 border border-neutral-700 rounded-lg text-sm bg-neutral-900 text-slate-200 focus:border-gold-500 outline-none"
                        value={selectedItemId}
                        onChange={(e) => {
                          setSelectedItemId(e.target.value);
                          const list = selectedItemType === 'SERVICE' ? services : products;
                          const item = list.find(i => i.id === e.target.value);
                          if (item) {
                            console.log('✅ Selected item:', item);
                            setCustomPrice(item.price.toString());
                          }
                        }}
                      >
                        <option value="">-- Chọn từng mục --</option>
                        {selectedItemType === 'SERVICE' ? (
                          services.length > 0 ? (
                            services.map(s => (
                              <option key={s.id} value={s.id}>
                                {s.name} (Giá gốc: {formatPrice(s.price || 0)} ₫)
                              </option>
                            ))
                          ) : (
                            <option value="" disabled>Không có dịch vụ nào ({services.length})</option>
                          )
                        ) : (
                          products.map(p => <option key={p.id} value={p.id}>{p.name} (Tồn: {formatNumber(p.stock)})</option>)
                        )}
                      </select>
                    </div>
                    <div className="w-40">
                      <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Đơn Giá (VNĐ)</label>
                      <input
                        type="number"
                        className="w-full p-2 border border-neutral-700 rounded-lg text-sm font-medium bg-neutral-900 text-slate-200 focus:border-gold-500 outline-none"
                        value={customPrice}
                        onChange={(e) => setCustomPrice(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={handleAddMultipleItems}
                        disabled={selectedItemsForMultiAdd.size === 0}
                        className="px-4 py-2 bg-gold-600 text-black rounded-lg text-sm font-medium hover:bg-gold-700 disabled:bg-neutral-800 disabled:text-slate-600 transition-colors"
                        title={`Thêm ${selectedItemsForMultiAdd.size} mục đã chọn`}
                      >
                        Thêm ({selectedItemsForMultiAdd.size})
                      </button>
                      <button
                        onClick={handleAddItem}
                        disabled={!selectedItemId}
                        className="px-4 py-2 bg-slate-100 text-black rounded-lg text-sm font-medium hover:bg-white disabled:bg-neutral-800 disabled:text-slate-600 transition-colors"
                      >
                        Thêm
                      </button>
                    </div>
                  </div>


                  {/* NEW: Workflow Stages for Single Selection */}
                  {selectedItemId && selectedItemType === 'SERVICE' && (() => {
                    const service = services.find(s => s.id === selectedItemId);
                    if (!service) return null;

                    // Robust Workflow Resolution
                    let displayWorkflowId: string | undefined;
                    let embeddedWorkflows: any[] = [];

                    if (service.workflows && service.workflows.length > 0) {
                      displayWorkflowId = service.workflows[0].id; // Fallback ID
                      embeddedWorkflows = service.workflows;      // Embedded stages
                    } else if (Array.isArray(service.workflowId) && service.workflowId.length > 0) {
                      displayWorkflowId = service.workflowId[0];
                    } else if (typeof service.workflowId === 'string' && service.workflowId) {
                      displayWorkflowId = service.workflowId;
                    }

                    // Try find global workflow first
                    let workflow = displayWorkflowId ? workflows.find(w => w.id === displayWorkflowId) : undefined;

                    // If global workflow not found, check if we have embedded stages
                    // Construct a temporary workflow object from embedded data
                    if (!workflow && embeddedWorkflows.length > 0) {
                      workflow = {
                        id: displayWorkflowId || 'embedded',
                        label: service.name, // Use service name as workflow label
                        color: 'bg-slate-500',
                        department: 'Kỹ Thuật', // Default
                        types: [],
                        stages: embeddedWorkflows.map(wf => ({
                          id: wf.id,
                          name: wf.name || `Bước ${wf.order}`,
                          order: wf.order
                        })).sort((a, b) => a.order - b.order)
                      };
                    }

                    if (!workflow?.stages || workflow.stages.length === 0) {
                      return (
                        <div className="mt-3 p-3 border border-neutral-800 rounded-lg bg-neutral-900/50">
                          <div className="text-[10px] text-slate-600 italic">Chưa có quy trình được cấu hình</div>
                        </div>
                      );
                    }

                    return (
                      <div className="mt-3 p-3 bg-neutral-800/50 rounded-lg border border-neutral-700">
                        <h5 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
                          <Columns size={16} className="text-gold-500" />
                          Quy trình: {workflow.label}
                        </h5>
                        <div className="grid grid-cols-1 gap-2">
                          {workflow.stages.sort((a, b) => a.order - b.order).map((stage, idx) => {
                            const assignmentKey = makeAssignmentKey(selectedItemId, stage.id);
                            const selectedStaff = getSelectedStaffForStage(selectedItemId, stage.id);

                            return (
                              <div key={stage.id} className="bg-neutral-900/50 p-2 rounded border border-neutral-700 font-sans flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-neutral-800 flex items-center justify-center text-xs text-slate-400 font-medium">
                                  {idx + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-medium text-slate-300">{stage.name}</div>
                                </div>

                                {/* Staff Selector */}
                                <div className="relative w-1/2">
                                  <button
                                    type="button"
                                    onClick={() => toggleStageStaffSelector(assignmentKey)}
                                    className="w-full p-1.5 bg-neutral-800 border border-neutral-600 rounded text-left text-xs text-slate-300 hover:border-gold-500 transition-colors flex items-center justify-between"
                                  >
                                    <span className="truncate">
                                      {selectedStaff.length > 0
                                        ? selectedStaff.map(m => m.name).join(', ')
                                        : `Gán nhân sự...`
                                      }
                                    </span>
                                    <Users size={12} className="text-slate-500 flex-shrink-0 ml-2" />
                                  </button>

                                  {openStageSelector === assignmentKey && (
                                    <>
                                      <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setOpenStageSelector(null)}
                                      />
                                      <div className="absolute z-50 right-0 mt-1 w-64 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                                        {members.map(member => (
                                          <label
                                            key={member.id}
                                            className="flex items-center gap-2 px-2 py-1.5 hover:bg-neutral-700 cursor-pointer"
                                          >
                                            <input
                                              type="checkbox"
                                              checked={isStaffAssignedToStage(selectedItemId, stage.id, member.id)}
                                              onChange={(e) => handleToggleStaffForStage(selectedItemId, stage.id, member.id, e.target.checked)}
                                              className="rounded border-neutral-600 bg-neutral-900 text-gold-500"
                                            />
                                            <div className="flex items-center gap-2">
                                              {member.avatar ? (
                                                <img src={member.avatar} className="w-4 h-4 rounded-full" alt="" />
                                              ) : (
                                                <div className="w-4 h-4 rounded-full bg-neutral-700 flex items-center justify-center text-[8px] font-bold text-slate-300">
                                                  {member.name.charAt(0)}
                                                </div>
                                              )}
                                              <span className="text-xs text-slate-300">{member.name}</span>
                                            </div>
                                          </label>
                                        ))}
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Items List */}
                <div className="space-y-2">
                  {newOrderItems.map((item, idx) => (
                    <div key={idx} className="p-3 bg-neutral-800/50 rounded-lg border border-neutral-700 text-sm">
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="w-8 h-8 rounded bg-neutral-700 flex items-center justify-center text-slate-400 flex-shrink-0">
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-slate-200">{item.name}</div>
                            <div className="text-xs text-slate-500">{item.type}</div>

                            {/* Display notes if exists */}
                            {item.notes && (
                              <div className="mt-2 text-xs text-slate-400 bg-neutral-900/50 px-2 py-1 rounded border border-neutral-700">
                                <span className="font-semibold text-slate-500">Ghi chú:</span> {item.notes}
                              </div>
                            )}

                            {/* Display assigned members if exists */}
                            {item.assignedMembers && item.assignedMembers.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {item.assignedMembers.map(memberId => {
                                  const member = members.find(m => m.id === memberId);
                                  if (!member) return null;
                                  return (
                                    <div
                                      key={memberId}
                                      className="flex items-center gap-1.5 px-2 py-1 bg-blue-900/20 rounded border border-blue-800/40 text-xs"
                                    >
                                      {member.avatar ? (
                                        <img src={member.avatar} alt="" className="w-4 h-4 rounded-full" />
                                      ) : (
                                        <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-[8px] font-bold text-white">
                                          {member.name.charAt(0).toUpperCase()}
                                        </div>
                                      )}
                                      <span className="text-blue-300 font-medium">{member.name}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Display stage assignments if exists */}
                            {(item as any).stageAssignments && (item as any).stageAssignments.length > 0 && (
                              <div className="mt-2 text-xs space-y-1">
                                {(item as any).stageAssignments.map((assignment: any, aIdx: number) => {
                                  // Find stage name (need workflow)
                                  let stageName = assignment.stageId;
                                  const workflow = item.workflowId ? workflows.find(w => w.id === item.workflowId) : null;
                                  if (workflow) {
                                    const stage = workflow.stages?.find(s => s.id === assignment.stageId);
                                    if (stage) stageName = stage.name;
                                  }

                                  return (
                                    <div key={aIdx} className="flex flex-wrap items-center gap-2 bg-neutral-900/30 px-2 py-1 rounded border border-neutral-700/50">
                                      <span className="text-slate-400 font-medium">{stageName}:</span>
                                      <div className="flex flex-wrap gap-1">
                                        {assignment.assignedMemberIds.map((mid: string) => {
                                          const m = members.find(mem => mem.id === mid);
                                          return m ? (
                                            <span key={mid} className="text-gold-500 bg-gold-900/10 px-1 rounded text-[10px]">
                                              {m.name}
                                            </span>
                                          ) : null;
                                        })}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-start gap-3 flex-shrink-0">
                          {/* Commission Inputs for New Order Items */}
                          {(() => {
                            // Gather all unique members assigned to this item across all stages
                            const allAssignedMemberIds = new Set<string>();
                            if ((item as any).stageAssignments) {
                              (item as any).stageAssignments.forEach((sa: any) => {
                                if (sa.assignedMemberIds) {
                                  sa.assignedMemberIds.forEach((id: string) => allAssignedMemberIds.add(id));
                                }
                              });
                            }

                            const assignedMembersList = Array.from(allAssignedMemberIds);

                            if (assignedMembersList.length > 0) {
                              return (
                                <div className="flex flex-col gap-1 items-end">
                                  <div className="text-[9px] font-bold text-slate-500 uppercase">CHIA HOA HỒNG</div>
                                  {assignedMembersList.map(memberId => {
                                    const member = members.find(m => m.id === memberId);
                                    if (!member) return null;
                                    const comm = item.commissions?.[memberId] || { value: 0, type: 'money' };

                                    return (
                                      <CommissionRow
                                        key={memberId}
                                        member={member}
                                        commission={comm}
                                        itemPrice={item.price}
                                        onUpdate={(val, type) => {
                                          const newItems = [...newOrderItems];
                                          const currentCommissions = newItems[idx].commissions || {};

                                          // Immediate conversion: Snap to money if percent is selected
                                          let finalValue = val;
                                          let finalType = type;
                                          if (type === 'percent') {
                                            finalValue = (item.price * val) / 100;
                                            finalType = 'money';
                                          }

                                          newItems[idx].commissions = {
                                            ...currentCommissions,
                                            [memberId]: { value: finalValue, type: finalType }
                                          };
                                          setNewOrderItems(newItems);
                                        }}
                                        onDelete={() => {
                                          const newItems = [...newOrderItems];
                                          // 1. Remove from assignedMembers
                                          const currentAssigned = newItems[idx].assignedMembers || [];
                                          newItems[idx].assignedMembers = currentAssigned.filter(id => id !== memberId);

                                          // 2. Remove from commissions
                                          const currentCommissions = { ...newItems[idx].commissions };
                                          delete currentCommissions[memberId];
                                          newItems[idx].commissions = currentCommissions;

                                          setNewOrderItems(newItems);
                                        }}
                                      />
                                    );
                                  })}
                                </div>
                              );
                            }
                            return null;
                          })()}
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-slate-300">{formatPrice(item.price)} ₫</span>
                            <button
                              onClick={() => handleEditItem(idx, false)}
                              className="p-1.5 hover:bg-gold-900/20 hover:text-gold-400 text-slate-500 rounded transition-colors"
                              title="Thêm ghi chú và nhân sự"
                            >
                              <Plus size={16} />
                            </button>
                            <button onClick={() => {
                              const newItems = [...newOrderItems];
                              newItems.splice(idx, 1);
                              setNewOrderItems(newItems);
                            }} className="p-1 hover:text-red-500 text-slate-500">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Add Staff Assignment UI here if needed, or rely on the "Edit Item" modal triggered by Plus button */}
                      {/* For simplicity, we can show a mini-workflow view here similar to Edit Modal */}
                      {!item.isProduct && item.serviceId && (
                        <div className="mt-2 border-t border-neutral-700/50 pt-2">
                          <div className="text-xs text-slate-500 mb-1">Gán nhân sự thực hiện:</div>
                          {/* Re-use the logic from Edit Modal - but we need to handle state updates for 'newOrderItems' */}
                          {(() => {
                            // Find service to check for embedded workflows
                            const service = services.find(s => s.id === item.serviceId);
                            let displayWorkflowId = item.workflowId || service?.workflowId;

                            // Try find global workflow first
                            let wf = (displayWorkflowId && typeof displayWorkflowId === 'string')
                              ? workflows.find(w => w.id === displayWorkflowId)
                              : undefined;

                            // Embedded fallback
                            if (!wf && service?.workflows && service.workflows.length > 0) {
                              wf = {
                                id: 'embedded-' + service.id,
                                label: service.name,
                                color: 'bg-slate-500',
                                department: 'Kỹ Thuật',
                                types: [],
                                stages: service.workflows.map(step => ({
                                  id: step.id,
                                  name: step.name || `Bước ${step.order}`,
                                  order: step.order
                                })).sort((a, b) => a.order - b.order)
                              };
                            }

                            if (!wf?.stages || wf.stages.length === 0) {
                              return <div className="text-[10px] text-slate-600 italic">Quy trình chưa có bước (hoặc chưa cấu hình)</div>;
                            }

                            return (
                              <div className="space-y-1">
                                {wf.stages.sort((a, b) => a.order - b.order).map(stage => {
                                  // Check existing assignments for this item
                                  const currentAssignments = (item as any).stageAssignments?.find((sa: any) => sa.stageId === stage.id)?.assignedMemberIds || [];
                                  const selectorKey = `selector-${idx}-${stage.id}`;

                                  return (
                                    <div key={stage.id} className="flex items-center gap-2 flex-shrink-0 justify-between">
                                      <div className="flex flex-col items-start w-full">
                                        <div
                                          onClick={() => {
                                            handleEditItem(idx, false);
                                            setEditingItemCommissions(item.commissions || {});
                                          }}
                                          className="p-1.5 hover:bg-gold-900/20 hover:text-gold-400 text-slate-500 rounded transition-colors cursor-pointer w-full group"
                                          title="Thêm ghi chú và nhân sự"
                                        >
                                          <div className="flex items-center justify-between bg-neutral-900/40 p-1.5 rounded border border-neutral-700/50 group-hover:border-gold-500/50">
                                            <span className="text-xs text-slate-300 mr-2">{stage.name}</span>
                                            <div className="relative" onClick={(e) => e.stopPropagation()}>
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setOpenStageSelector(openStageSelector === selectorKey ? null : selectorKey);
                                                }}
                                                className="flex items-center gap-1 text-[10px] bg-neutral-800 px-2 py-1 rounded border border-neutral-600 hover:border-gold-500 text-slate-300"
                                              >
                                                {currentAssignments.length > 0 ? `${currentAssignments.length} nhân sự` : 'Chọn nhân sự'}
                                                <Users size={10} />
                                              </button>

                                              {openStageSelector === selectorKey && (
                                                <>
                                                  <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpenStageSelector(null); }} />
                                                  <div className="absolute right-0 z-50 mt-1 w-48 bg-neutral-800 border border-neutral-700 rounded shadow-xl max-h-40 overflow-y-auto">
                                                    {members.map(m => (
                                                      <label key={m.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-neutral-700 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                                        <input type="checkbox"
                                                          checked={currentAssignments.includes(m.id)}
                                                          onChange={(e) => {
                                                            // Update newOrderItems[idx].stageAssignments
                                                            const newItems = [...newOrderItems];
                                                            const currentItem = { ...newItems[idx] };
                                                            let stageAssignments = (currentItem as any).stageAssignments ? [...(currentItem as any).stageAssignments] : [];

                                                            // Find or create assignment for this stage
                                                            let saIndex = stageAssignments.findIndex((sa: any) => sa.stageId === stage.id);
                                                            if (saIndex === -1) {
                                                              stageAssignments.push({ stageId: stage.id, assignedMemberIds: [] });
                                                              saIndex = stageAssignments.length - 1;
                                                            }

                                                            let ids = [...stageAssignments[saIndex].assignedMemberIds];
                                                            if (e.target.checked) ids.push(m.id);
                                                            else ids = ids.filter((id: string) => id !== m.id);

                                                            stageAssignments[saIndex] = { ...stageAssignments[saIndex], assignedMemberIds: ids };
                                                            (currentItem as any).stageAssignments = stageAssignments;
                                                            newItems[idx] = currentItem;
                                                            setNewOrderItems(newItems);
                                                          }}
                                                          className="rounded border-neutral-600 bg-neutral-900 text-gold-500"
                                                        />
                                                        <span className="text-xs text-slate-300">{m.name}</span>
                                                      </label>
                                                    ))}
                                                  </div>
                                                </>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex flex-col items-end gap-1">

                                        {(() => {
                                          const allAssignedMemberIds = new Set<string>();
                                          if ((item as any).stageAssignments) {
                                            (item as any).stageAssignments.forEach((sa: any) => {
                                              if (sa.assignedMemberIds) sa.assignedMemberIds.forEach((id: string) => allAssignedMemberIds.add(id));
                                            });
                                          }
                                          const assignedMembersList = Array.from(allAssignedMemberIds);

                                          if (false) { // Disabled duplicate commission block
                                            return (
                                              <div className="flex flex-col gap-1 items-end mt-1">
                                                <div className="text-[9px] font-bold text-slate-500 uppercase">CHIA HOA HỒNG</div>
                                                {assignedMembersList.map(memberId => {
                                                  const member = members.find(m => m.id === memberId);
                                                  if (!member) return null;
                                                  const comm = item.commissions?.[memberId] || { value: 0, type: 'money' };
                                                  return (
                                                    <div key={memberId} className="flex items-center gap-1 bg-neutral-900/40 p-1 rounded border border-neutral-700/50">
                                                      <div className="flex items-center gap-1">
                                                        {member.avatar ? <img src={member.avatar} alt="" className="w-4 h-4 rounded-full" /> : <div className="w-4 h-4 rounded-full bg-neutral-700 text-[8px] flex items-center justify-center text-slate-300">{member.name.charAt(0)}</div>}
                                                        <span className="text-[10px] text-slate-300 max-w-[50px] truncate">{member.name}</span>
                                                      </div>
                                                      <div className="flex gap-0.5 bg-neutral-800 rounded p-0.5 border border-neutral-700">
                                                        <button onClick={() => {
                                                          const newItems = [...newOrderItems];
                                                          const currentCommissions = newItems[idx].commissions || {};
                                                          newItems[idx].commissions = { ...currentCommissions, [memberId]: { ...comm, type: 'money' } };
                                                          setNewOrderItems(newItems);
                                                        }} className={`px-1 py-0.5 text-[8px] rounded ${comm.type === 'money' ? 'bg-gold-500 text-black font-bold' : 'text-slate-500 hover:text-slate-300'}`}>₫</button>
                                                        <button onClick={() => {
                                                          const newItems = [...newOrderItems];
                                                          const currentCommissions = newItems[idx].commissions || {};
                                                          newItems[idx].commissions = { ...currentCommissions, [memberId]: { ...comm, type: 'percent' } };
                                                          setNewOrderItems(newItems);
                                                        }} className={`px-1 py-0.5 text-[8px] rounded ${comm.type === 'percent' ? 'bg-gold-500 text-black font-bold' : 'text-slate-500 hover:text-slate-300'}`}>%</button>
                                                      </div>
                                                      <input type="text" value={comm.value ? formatNumber(comm.value) : ''} onChange={(e) => {
                                                        const val = parseFloat(e.target.value.replace(/\./g, '')) || 0;
                                                        const newItems = [...newOrderItems];
                                                        const currentCommissions = newItems[idx].commissions || {};
                                                        newItems[idx].commissions = { ...currentCommissions, [memberId]: { ...comm, value: val } };
                                                        setNewOrderItems(newItems);
                                                      }} className="w-14 bg-neutral-950 border border-neutral-700 rounded px-1 py-0.5 text-right text-[10px] text-gold-500 font-bold outline-none" placeholder="0" />
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            );
                                          }
                                          return null;
                                        })()}
                                      </div>
                                    </div>
                                  );
                                })}



                              </div>
                            );
                          })()}
                        </div>
                      )
                      }
                    </div>
                  ))}
                  {newOrderItems.length === 0 && (
                    <div className="text-center py-6 text-slate-500 border border-dashed border-neutral-800 rounded-lg cursor-pointer hover:bg-neutral-800/30 transition-colors" onClick={() => document.querySelector('select')?.focus()}>
                      Chưa có sản phẩm/dịch vụ nào
                    </div>
                  )}
                </div>

                {/* Discount and Additional Fees */}
                < div className="mt-4 pt-4 border-t border-neutral-800 space-y-4" >
                  {/* Deposit and Expected Delivery */}
                  < div className="grid grid-cols-2 gap-4" >
                    <div>
                      <label className="block text-sm font-bold text-slate-300 mb-2">
                        Tiền Cọc <span className="text-slate-500 text-xs">VNĐ</span>
                      </label>
                      <input
                        type="text"
                        value={newOrderDeposit}
                        onChange={(e) => setNewOrderDeposit(formatNumberInput(e.target.value))}
                        className="w-full p-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-1 focus:ring-gold-500 outline-none"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-300 mb-2">
                        Ngày Trả (Dự kiến)
                      </label>
                      <input
                        type="date"
                        value={newOrderExpectedDelivery}
                        onChange={(e) => setNewOrderExpectedDelivery(e.target.value)}
                        className="w-full p-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-1 focus:ring-gold-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-300 mb-2 flex justify-between">
                        <span>Khấu trừ (Giảm giá)</span>
                        <div className="flex gap-1 bg-neutral-700 rounded p-0.5">
                          <button
                            onClick={() => setNewOrderDiscountType('money')}
                            className={`px-2 py-0.5 text-xs rounded ${newOrderDiscountType === 'money' ? 'bg-gold-500 text-black font-bold' : 'text-slate-400'}`}
                          >VNĐ</button>
                          <button
                            onClick={() => setNewOrderDiscountType('percent')}
                            className={`px-2 py-0.5 text-xs rounded ${newOrderDiscountType === 'percent' ? 'bg-gold-500 text-black font-bold' : 'text-slate-400'}`}
                          >%</button>
                        </div>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={newOrderDiscount}
                          onChange={(e) => setNewOrderDiscount(formatNumberInput(e.target.value))}
                          className="w-full p-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-1 focus:ring-gold-500 outline-none"
                          placeholder="0"
                        />
                        {newOrderDiscountType === 'percent' && (
                          <div className="absolute right-3 top-2.5 text-slate-500 text-sm font-mono">
                            = {formatPrice((newOrderItems.reduce((acc, i) => acc + (i.price * (i.quantity || 1)), 0) * (parseFloat(newOrderDiscount.replace(/\./g, '')) || 0)) / 100)} ₫
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="flex gap-2 mb-2">
                        <label className="w-1/3 text-sm font-bold text-slate-300">
                          Phụ phí
                        </label>
                        <label className="flex-1 text-sm font-bold text-slate-300">
                          Lý do
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newOrderAdditionalFees}
                          onChange={(e) => setNewOrderAdditionalFees(formatNumberInput(e.target.value))}
                          className="w-1/3 p-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-1 focus:ring-gold-500 outline-none text-right"
                          placeholder="0"
                        />
                        <input
                          type="text"
                          value={newOrderSurchargeReason}
                          onChange={(e) => setNewOrderSurchargeReason(e.target.value)}
                          className="flex-1 p-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-1 focus:ring-gold-500 outline-none text-sm"
                          placeholder="Lý do..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Invoice Summary */}
                  <div className="bg-neutral-800/50 p-4 rounded-lg border border-neutral-700">
                    <h4 className="text-sm font-semibold text-slate-300 mb-3">Tổng Hóa Đơn</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between text-slate-400">
                        <span>Tạm tính ({newOrderItems.length} mục):</span>
                        <span>{formatPrice(newOrderItems.reduce((acc, i) => acc + (i.price * (i.quantity || 1)), 0))} ₫</span>
                      </div>
                      {parseFloat(newOrderDiscount) > 0 && (
                        <div className="flex justify-between text-emerald-400">
                          <span>Khấu trừ ({newOrderDiscountType === 'percent' ? `${newOrderDiscount}%` : `${formatPrice(newOrderDiscount.replace(/\./g, ''))} ₫`}):</span>
                          <span>-{formatPrice(newOrderDiscountType === 'percent' ? (newOrderItems.reduce((acc, i) => acc + (i.price * (i.quantity || 1)), 0) * (parseFloat(newOrderDiscount.replace(/\./g, '')) || 0)) / 100 : (parseFloat(newOrderDiscount.replace(/\./g, '')) || 0))} ₫</span>
                        </div>
                      )}
                      {parseFloat(newOrderAdditionalFees.replace(/\./g, '')) > 0 && (
                        <div className="flex justify-between text-blue-400">
                          <span>Phụ phí {newOrderSurchargeReason ? `(${newOrderSurchargeReason})` : ''}:</span>
                          <span>+{formatPrice(parseFloat(newOrderAdditionalFees.replace(/\./g, '')) || 0)} ₫</span>
                        </div>
                      )}
                      <div className="pt-2 border-t border-neutral-700 flex justify-between font-bold text-lg">
                        <span className="text-slate-200">Tổng cộng:</span>
                        <span className="text-gold-500">
                          {formatPrice(calculateOrderTotal(newOrderItems, parseFloat(newOrderDiscount.replace(/\./g, '')) || 0, newOrderDiscountType, parseFloat(newOrderAdditionalFees.replace(/\./g, '')) || 0))} ₫
                        </span>
                      </div>
                      {parseFloat(newOrderDeposit.replace(/\./g, '')) > 0 && (
                        <div className="flex justify-between text-gold-600/80 text-sm mt-1">
                          <span>Đã cọc:</span>
                          <span>-{newOrderDeposit} ₫</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-red-500 pt-1 text-sm">
                        <span>Còn lại:</span>
                        <span>{formatPrice(calculateOrderTotal(newOrderItems, parseFloat(newOrderDiscount.replace(/\./g, '')) || 0, newOrderDiscountType, parseFloat(newOrderAdditionalFees.replace(/\./g, '')) || 0) - (parseFloat(newOrderDeposit.replace(/\./g, '')) || 0))} ₫</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-neutral-800 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2.5 border border-neutral-700 bg-neutral-800 text-slate-300 rounded-lg hover:bg-neutral-700 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateOrder}
                disabled={!selectedCustomerId || newOrderItems.length === 0}
                className="px-6 py-2.5 bg-gold-600 hover:bg-gold-700 text-black font-medium rounded-lg shadow-lg shadow-gold-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Tạo Đơn Hàng
              </button>
            </div>
          </div>
        </div >
      )
      }

      {/* Edit Order Modal */}
      {
        isEditModalOpen && editingOrder && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            {/* Re-implementing Edit Modal Content similar to above but with Edit state */}
            <div className="bg-neutral-900 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-neutral-800 animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-neutral-800">
                <h2 className="text-xl font-serif font-bold text-slate-100">Chỉnh Sửa Đơn Hàng</h2>
                <p className="text-slate-500 text-sm">Cập nhật thông tin đơn hàng #{editingOrder.id}</p>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Customer Select */}
                <div className="bg-neutral-800/30 p-4 rounded-xl border border-neutral-800">
                  <label className="block text-sm font-bold text-slate-300 mb-2">Khách hàng <span className="text-red-500">*</span></label>
                  <select
                    className="w-full p-2.5 border border-neutral-700 rounded-lg outline-none focus:ring-1 focus:ring-gold-500 bg-neutral-900 text-slate-200"
                    value={editSelectedCustomerId}
                    onChange={(e) => setEditSelectedCustomerId(e.target.value)}
                  >
                    <option value="">-- Chọn khách hàng --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} - {c.phone} ({c.tier})</option>
                    ))}
                  </select>
                </div>

                {/* Items */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-slate-200">Sản Phẩm & Dịch Vụ</h3>
                  </div>

                  {/* Add Item Form (Edit Mode) */}
                  <div className="p-4 border border-gold-900/30 bg-gold-900/10 rounded-xl mb-4">
                    <div className="flex gap-4 mb-3 border-b border-gold-900/20 pb-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="editType"
                          checked={editSelectedItemType === 'SERVICE'}
                          onChange={() => { setEditSelectedItemType('SERVICE'); setEditSelectedItemId(''); setEditCustomPrice(''); }}
                          className="text-gold-500 focus:ring-gold-500 bg-neutral-900 border-neutral-700"
                        />
                        <span className="text-sm font-medium text-slate-300">Dịch Vụ</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="editType"
                          checked={editSelectedItemType === 'PRODUCT'}
                          onChange={() => { setEditSelectedItemType('PRODUCT'); setEditSelectedItemId(''); setEditCustomPrice(''); }}
                          className="text-gold-500 focus:ring-gold-500 bg-neutral-900 border-neutral-700"
                        />
                        <span className="text-sm font-medium text-slate-300">Sản Phẩm</span>
                      </label>
                    </div>

                    <div className="flex gap-3 items-end">
                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Chọn Item</label>
                        <select
                          className="w-full p-2 border border-neutral-700 rounded-lg text-sm bg-neutral-900 text-slate-200 focus:border-gold-500 outline-none"
                          value={editSelectedItemId}
                          onChange={(e) => {
                            setEditSelectedItemId(e.target.value);
                            const list = editSelectedItemType === 'SERVICE' ? services : products;
                            const item = list.find(i => i.id === e.target.value);
                            if (item) setEditCustomPrice(item.price.toString());
                          }}
                        >
                          <option value="">-- Chọn --</option>
                          {editSelectedItemType === 'SERVICE'
                            ? services.map(s => <option key={s.id} value={s.id}>{s.name} (Giá gốc: {formatPrice(s.price || 0)})</option>)
                            : products.map(p => <option key={p.id} value={p.id}>{p.name} (Tồn: {formatNumber(p.stock)})</option>)
                          }
                        </select>
                      </div>
                      <div className="w-40">
                        <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Đơn Giá</label>
                        <input
                          type="number"
                          className="w-full p-2 border border-neutral-700 rounded-lg text-sm font-medium bg-neutral-900 text-slate-200 focus:border-gold-500 outline-none"
                          value={editCustomPrice}
                          onChange={(e) => setEditCustomPrice(e.target.value)}
                          placeholder="0"
                        />
                      </div>
                      <button
                        onClick={handleEditAddItem}
                        disabled={!editSelectedItemId}
                        className="px-4 py-2 bg-slate-100 text-black rounded-lg text-sm font-medium hover:bg-white disabled:bg-neutral-800 disabled:text-slate-600 transition-colors"
                      >
                        Thêm
                      </button>
                    </div>
                  </div>

                  {/* Items List (Edit) */}
                  <div className="space-y-2">
                    {editOrderItems.map((item, idx) => {
                      const service = item.serviceId ? services.find(s => s.id === item.serviceId) : null;
                      const workflow = item.workflowId ? workflows.find(w => w.id === item.workflowId) : null;

                      return (
                        <div key={idx} className="p-3 bg-neutral-800/50 rounded-lg border border-neutral-700 text-sm">
                          <div className="flex justify-between items-start">
                            <div className="flex items-start gap-3 flex-1">
                              <div className="w-8 h-8 rounded bg-neutral-700 flex items-center justify-center text-slate-400 flex-shrink-0">
                                {idx + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-slate-200">{item.name}</div>
                                <div className="text-xs text-slate-500">{item.type}</div>

                                {/* Display notes if exists */}
                                {item.notes && (
                                  <div className="mt-2 text-xs text-slate-400 bg-neutral-900/50 px-2 py-1 rounded border border-neutral-700">
                                    <span className="font-semibold text-slate-500">Ghi chú:</span> {item.notes}
                                  </div>
                                )}

                                {/* Display assigned members if exists */}
                                {item.assignedMembers && item.assignedMembers.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    {item.assignedMembers.map(memberId => {
                                      const member = members.find(m => m.id === memberId);
                                      if (!member) return null;
                                      return (
                                        <div
                                          key={memberId}
                                          className="flex items-center gap-1.5 px-2 py-1 bg-blue-900/20 rounded border border-blue-800/40 text-xs"
                                        >
                                          {member.avatar ? (
                                            <img src={member.avatar} alt="" className="w-4 h-4 rounded-full" />
                                          ) : (
                                            <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-[8px] font-bold text-white">
                                              {member.name.charAt(0).toUpperCase()}
                                            </div>
                                          )}
                                          <span className="text-blue-300 font-medium">{member.name}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Display stage assignments if exists */}
                                {(item as any).stageAssignments && (item as any).stageAssignments.length > 0 && (
                                  <div className="mt-2 text-xs space-y-1">
                                    {(item as any).stageAssignments.map((assignment: any, aIdx: number) => {
                                      // Find stage name (need workflow)
                                      let stageName = assignment.stageId;
                                      const wf = item.workflowId ? workflows.find(w => w.id === item.workflowId) : null;
                                      if (wf) {
                                        const stage = wf.stages?.find(s => s.id === assignment.stageId);
                                        if (stage) stageName = stage.name;
                                      }

                                      return (
                                        <div key={aIdx} className="flex flex-wrap items-center gap-2 bg-neutral-900/30 px-2 py-1 rounded border border-neutral-700/50">
                                          <span className="text-slate-400 font-medium">{stageName}:</span>
                                          <div className="flex flex-wrap gap-1">
                                            {assignment.assignedMemberIds.map((mid: string) => {
                                              const m = members.find(mem => mem.id === mid);
                                              return m ? (
                                                <span key={mid} className="text-gold-500 bg-gold-900/10 px-1 rounded text-[10px]">
                                                  {m.name}
                                                </span>
                                              ) : null;
                                            })}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                              </div>


                            </div>
                            <div className="flex items-start gap-3 flex-shrink-0">
                              {(() => {
                                const allAssignedMemberIds = new Set<string>();
                                if (item.assignedMembers) item.assignedMembers.forEach(id => allAssignedMemberIds.add(id));
                                if ((item as any).stageAssignments) {
                                  (item as any).stageAssignments.forEach((sa: any) => {
                                    if (sa.assignedMemberIds) sa.assignedMemberIds.forEach((id: string) => allAssignedMemberIds.add(id));
                                  });
                                }
                                const assignedMembersList = Array.from(allAssignedMemberIds);

                                if (assignedMembersList.length > 0) {
                                  return (
                                    <div className="flex flex-col gap-1 items-end">
                                      <div className="text-[9px] font-bold text-slate-500 uppercase">CHIA HOA HỒNG</div>
                                      {assignedMembersList.map(memberId => {
                                        const member = members.find(m => m.id === memberId);
                                        if (!member) return null;
                                        const comm = item.commissions?.[memberId] || { value: 0, type: 'money' };
                                        return (
                                          <CommissionRow
                                            key={memberId}
                                            member={member}
                                            commission={comm}
                                            itemPrice={item.price}
                                            onUpdate={(val, type) => {
                                              const newItems = [...editOrderItems];
                                              const currentCommissions = newItems[idx].commissions || {};

                                              // Immediate conversion: Snap to money if percent is selected
                                              let finalValue = val;
                                              let finalType = type;
                                              if (type === 'percent') {
                                                finalValue = (item.price * val) / 100;
                                                finalType = 'money';
                                              }

                                              newItems[idx].commissions = {
                                                ...currentCommissions,
                                                [memberId]: { value: finalValue, type: finalType }
                                              };
                                              setEditOrderItems(newItems);
                                            }}
                                            onDelete={() => {
                                              const newItems = [...editOrderItems];
                                              // 1. Remove from assignedMembers
                                              const currentAssigned = newItems[idx].assignedMembers || [];
                                              newItems[idx].assignedMembers = currentAssigned.filter(id => id !== memberId);

                                              // 2. Remove from commissions
                                              const currentCommissions = { ...newItems[idx].commissions };
                                              delete currentCommissions[memberId];
                                              newItems[idx].commissions = currentCommissions;

                                              setEditOrderItems(newItems);
                                            }}
                                          />
                                        );
                                      })}
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-slate-300">{formatPrice(item.price)} ₫</span>
                                <button
                                  onClick={() => {
                                    handleEditItem(idx, true);
                                    setEditingItemCommissions(item.commissions || {});
                                  }}
                                  className="p-1.5 hover:bg-gold-900/20 hover:text-gold-400 text-slate-500 rounded transition-colors"
                                  title="Thêm ghi chú và nhân sự"
                                >
                                  <Plus size={16} />
                                </button>
                                <button onClick={() => handleEditRemoveItem(idx)} className="p-1 hover:text-red-500 text-slate-500">
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Hiển thị workflow stages và tasks với gán nhân sự */}
                          {!item.isProduct && item.serviceId && (
                            <WorkflowStagesTasksView
                              item={item}
                              workflows={workflows}
                              members={members || []}
                              onUpdateTaskAssignment={async (taskId: string, assignedTo: string[]) => {
                                // Prevent 406 error for new items (no ID)
                                if (!item.id) {
                                  const newItems = [...editOrderItems];
                                  const currentItem = newItems[idx] as any;
                                  const currentAssignments = (currentItem.phan_cong_tasks || []) as Array<{ taskId: string; assignedTo: string[]; completed: boolean }>;
                                  const existingIndex = currentAssignments.findIndex(a => a.taskId === taskId);

                                  let newAssignments;
                                  if (existingIndex >= 0) {
                                    newAssignments = [...currentAssignments];
                                    newAssignments[existingIndex] = { ...newAssignments[existingIndex], assignedTo };
                                  } else {
                                    newAssignments = [...currentAssignments, { taskId, assignedTo, completed: false }];
                                  }

                                  newItems[idx] = { ...newItems[idx], phan_cong_tasks: newAssignments } as any;
                                  setEditOrderItems(newItems);
                                  return;
                                }

                                // Update task assignment in database for existing items
                                try {
                                  const { data: currentItem } = await supabase
                                    .from(DB_PATHS.SERVICE_ITEMS)
                                    .select('phan_cong_tasks')
                                    .eq('id', item.id)
                                    .single();

                                  const currentAssignments = (currentItem?.phan_cong_tasks || []) as Array<{ taskId: string; assignedTo: string[]; completed: boolean }>;
                                  const existingIndex = currentAssignments.findIndex(a => a.taskId === taskId);

                                  let newAssignments;
                                  if (existingIndex >= 0) {
                                    newAssignments = [...currentAssignments];
                                    newAssignments[existingIndex] = {
                                      ...newAssignments[existingIndex],
                                      assignedTo
                                    };
                                  } else {
                                    newAssignments = [
                                      ...currentAssignments,
                                      { taskId, assignedTo, completed: false }
                                    ];
                                  }

                                  const { error } = await supabase
                                    .from(DB_PATHS.SERVICE_ITEMS)
                                    .update({ phan_cong_tasks: newAssignments })
                                    .eq('id', item.id);

                                  if (error) throw error;

                                  // Update local state
                                  const updatedItems = editOrderItems.map(it =>
                                    it.id === item.id
                                      ? { ...it } // Keep item as is, component will reload assignments
                                      : it
                                  );
                                  setEditOrderItems(updatedItems);
                                } catch (error) {
                                  console.error('Error updating task assignment:', error);
                                  alert('Lỗi khi cập nhật phân công: ' + (error as Error).message);
                                }
                              }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Extra Info */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-300 mb-2">Tiền Cọc</label>
                      <input
                        type="text"
                        value={editDeposit}
                        onChange={(e) => setEditDeposit(formatNumberInput(e.target.value))}
                        className="w-full p-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-1 focus:ring-gold-500 outline-none"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-300 mb-2">Ngày Trả Dự Kiến</label>
                      <input
                        type="date"
                        value={editExpectedDelivery}
                        onChange={(e) => setEditExpectedDelivery(e.target.value)}
                        className="w-full p-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-1 focus:ring-gold-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Discount and Additional Fees for Edit */}
                  <div className="mt-4 pt-4 border-t border-neutral-800 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-300 mb-2 flex justify-between">
                          <span>Khấu trừ (Giảm giá)</span>
                          <div className="flex gap-1 bg-neutral-700 rounded p-0.5">
                            <button
                              onClick={() => setEditOrderDiscountType('money')}
                              className={`px-2 py-0.5 text-xs rounded ${editOrderDiscountType === 'money' ? 'bg-gold-500 text-black font-bold' : 'text-slate-400'}`}
                            >VNĐ</button>
                            <button
                              onClick={() => setEditOrderDiscountType('percent')}
                              className={`px-2 py-0.5 text-xs rounded ${editOrderDiscountType === 'percent' ? 'bg-gold-500 text-black font-bold' : 'text-slate-400'}`}
                            >%</button>
                          </div>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={editOrderDiscount}
                            onChange={(e) => setEditOrderDiscount(formatNumberInput(e.target.value))}
                            className="w-full p-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-1 focus:ring-gold-500 outline-none"
                            placeholder="0"
                          />
                          {editOrderDiscountType === 'percent' && (
                            <div className="absolute right-3 top-2.5 text-slate-500 text-sm font-mono">
                              = {formatPrice((editOrderItems.reduce((acc, i) => acc + (i.price * (i.quantity || 1)), 0) * (parseFloat(editOrderDiscount.replace(/\./g, '')) || 0)) / 100)} ₫
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="flex gap-2 mb-2">
                          <label className="w-1/3 text-sm font-bold text-slate-300">
                            Phụ phí
                          </label>
                          <label className="flex-1 text-sm font-bold text-slate-300">
                            Lý do
                          </label>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={editOrderAdditionalFees}
                            onChange={(e) => setEditOrderAdditionalFees(formatNumberInput(e.target.value))}
                            className="w-1/3 p-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-1 focus:ring-gold-500 outline-none text-right"
                            placeholder="0"
                          />
                          <input
                            type="text"
                            value={editSurchargeReason}
                            onChange={(e) => setEditSurchargeReason(e.target.value)}
                            className="flex-1 p-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-1 focus:ring-gold-500 outline-none text-sm"
                            placeholder="Lý do..."
                          />
                        </div>
                      </div>
                    </div>

                    {/* Invoice Summary for Edit */}
                    <div className="bg-neutral-800/50 p-4 rounded-lg border border-neutral-700">
                      <h4 className="text-sm font-semibold text-slate-300 mb-3">Tổng Hóa Đơn</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between text-slate-400">
                          <span>Tạm tính ({editOrderItems.length} mục):</span>
                          <span>{formatPrice(editOrderItems.reduce((acc, i) => acc + (i.price * (i.quantity || 1)), 0))} ₫</span>
                        </div>
                        {parseFloat(editOrderDiscount) > 0 && (
                          <div className="flex justify-between text-emerald-400">
                            <span>Khấu trừ ({editOrderDiscountType === 'percent' ? `${editOrderDiscount}%` : `${formatPrice(editOrderDiscount.replace(/\./g, ''))} ₫`}):</span>
                            <span>-{formatPrice(editOrderDiscountType === 'percent' ? (editOrderItems.reduce((acc, i) => acc + (i.price * (i.quantity || 1)), 0) * (parseFloat(editOrderDiscount.replace(/\./g, '')) || 0)) / 100 : (parseFloat(editOrderDiscount.replace(/\./g, '')) || 0))} ₫</span>
                          </div>
                        )}
                        {parseFloat(editOrderAdditionalFees.replace(/\./g, '')) > 0 && (
                          <div className="flex justify-between text-blue-400">
                            <span>Phụ phí {editSurchargeReason ? `(${editSurchargeReason})` : ''}:</span>
                            <span>+{formatPrice(parseFloat(editOrderAdditionalFees.replace(/\./g, '')) || 0)} ₫</span>
                          </div>
                        )}
                        <div className="pt-2 border-t border-neutral-700 flex justify-between font-bold text-lg">
                          <span className="text-slate-200">Tổng cộng:</span>
                          <span className="text-gold-500">
                            {formatPrice(calculateOrderTotal(editOrderItems, parseFloat(editOrderDiscount.replace(/\./g, '')) || 0, editOrderDiscountType, parseFloat(editOrderAdditionalFees.replace(/\./g, '')) || 0))} ₫
                          </span>
                        </div>
                        {parseFloat(editDeposit.replace(/\./g, '')) > 0 && (
                          <div className="flex justify-between text-gold-600/80 text-sm mt-1">
                            <span>Đã cọc:</span>
                            <span>-{editDeposit} ₫</span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold text-red-500 pt-1 text-sm">
                          <span>Còn lại:</span>
                          <span>{formatPrice(calculateOrderTotal(editOrderItems, parseFloat(editOrderDiscount.replace(/\./g, '')) || 0, editOrderDiscountType, parseFloat(editOrderAdditionalFees.replace(/\./g, '')) || 0) - (parseFloat(editDeposit.replace(/\./g, '')) || 0))} ₫</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">Ghi Chú</label>
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full p-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-1 focus:ring-gold-500 outline-none h-24 resize-none"
                    placeholder="Ghi chú đơn hàng..."
                  />
                </div>
              </div>

              <div className="p-6 border-t border-neutral-800 flex justify-end gap-3">
                <button
                  onClick={() => { setIsEditModalOpen(false); setEditingOrder(null); }}
                  className="px-6 py-2.5 border border-neutral-700 bg-neutral-800 text-slate-300 rounded-lg hover:bg-neutral-700 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleUpdateOrder}
                  className="px-6 py-2.5 bg-gold-600 hover:bg-gold-700 text-black font-medium rounded-lg shadow-lg shadow-gold-900/20 transition-all font-bold"
                >
                  Cập Nhật Đơn Hàng
                </button>
              </div>
            </div>
          </div >
        )
      }

      {/* Edit Item Modal (for notes and assigned members) */}
      {
        (editingItemIndex !== null || editingEditItemIndex !== null) && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-neutral-900 rounded-xl w-full max-w-md shadow-2xl border border-neutral-800 animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-neutral-800">
                <h2 className="text-xl font-serif font-bold text-slate-100">Thêm Ghi Chú & Nhân Sự</h2>
                <p className="text-slate-500 text-sm mt-1">
                  {editingItemIndex !== null
                    ? newOrderItems[editingItemIndex]?.name
                    : editOrderItems[editingEditItemIndex!]?.name}
                </p>
              </div>

              <div className="p-6 space-y-6">
                {/* Notes */}
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">
                    Ghi chú
                  </label>
                  <textarea
                    value={editingItemIndex !== null ? editingItemNotes : editingEditItemNotes}
                    onChange={(e) => {
                      if (editingItemIndex !== null) {
                        setEditingItemNotes(e.target.value);
                      } else {
                        setEditingEditItemNotes(e.target.value);
                      }
                    }}
                    className="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-1 focus:ring-gold-500 outline-none h-24 resize-none"
                    placeholder="Nhập ghi chú cho item này..."
                  />
                </div>

                {/* Assigned Members */}
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">
                    Nhân sự phụ trách
                  </label>
                  <div className="max-h-48 overflow-y-auto border border-neutral-700 rounded-lg p-2 bg-neutral-800/50 space-y-2">
                    {members.length === 0 ? (
                      <div className="text-center py-4 text-slate-500 text-sm">Chưa có nhân sự nào</div>
                    ) : (
                      members.map(member => {
                        const isSelected = (editingItemIndex !== null
                          ? editingItemAssignedMembers
                          : editingEditItemAssignedMembers).includes(member.id);

                        return (
                          <label
                            key={member.id}
                            className="flex items-center gap-3 p-2 hover:bg-neutral-700 rounded cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                const currentMembers = editingItemIndex !== null
                                  ? editingItemAssignedMembers
                                  : editingEditItemAssignedMembers;

                                let newMembers: string[];
                                if (e.target.checked) {
                                  newMembers = [...currentMembers, member.id];
                                } else {
                                  newMembers = currentMembers.filter(id => id !== member.id);
                                }

                                if (editingItemIndex !== null) {
                                  setEditingItemAssignedMembers(newMembers);
                                } else {
                                  setEditingEditItemAssignedMembers(newMembers);
                                }
                              }}
                              className="rounded border-neutral-600 bg-neutral-900 text-gold-500 focus:ring-gold-500"
                            />
                            <div className="flex items-center gap-2 flex-1">
                              {member.avatar ? (
                                <img src={member.avatar} alt="" className="w-8 h-8 rounded-full" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center text-xs font-bold text-slate-300">
                                  {member.name.charAt(0)}
                                </div>
                              )}
                              <span className="text-sm text-slate-200 font-medium">{member.name}</span>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-neutral-800 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setEditingItemIndex(null);
                    setEditingEditItemIndex(null);
                    setEditingItemNotes('');
                    setEditingEditItemNotes('');
                    setEditingItemAssignedMembers([]);
                    setEditingEditItemAssignedMembers([]);
                  }}
                  className="px-6 py-2.5 border border-neutral-700 bg-neutral-800 text-slate-300 rounded-lg hover:bg-neutral-700 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={() => handleSaveItemEdit(editingEditItemIndex !== null)}
                  className="px-6 py-2.5 bg-gold-600 hover:bg-gold-700 text-black font-medium rounded-lg shadow-lg shadow-gold-900/20 transition-all"
                >
                  Lưu
                </button>
              </div>
            </div>
          </div>
        )
      }

    </div >
  );
};