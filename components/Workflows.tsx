import { ArrowDown, ArrowUp, Building2, CheckCircle2, Circle, Columns, Edit, Eye, GitMerge, GripVertical, MoreHorizontal, Package, Plus, Trash2, Users, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../context';
import { DB_TABLES, supabase } from '../supabase';
import { Member, TodoStep, WorkflowDefinition, WorkflowMaterial, WorkflowStage } from '../types';

// Action Menu Component
const ActionMenu: React.FC<{
   onView: () => void;
   onEdit: () => void;
   onDelete: () => void;
   itemName: string;
}> = ({ onView, onEdit, onDelete, itemName }) => {
   const [isOpen, setIsOpen] = useState(false);
   const menuRef = useRef<HTMLDivElement>(null);

   useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
         if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
            setIsOpen(false);
         }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
   }, []);

   return (
      <div className="relative" ref={menuRef}>
         <button
            onClick={(e) => {
               e.stopPropagation();
               setIsOpen(!isOpen);
            }}
            className="p-2 hover:bg-neutral-800 rounded-lg text-slate-500 hover:text-slate-300 transition-colors"
         >
            <MoreHorizontal size={20} />
         </button>

         {isOpen && (
            <div className="absolute right-0 top-full mt-1 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl z-50 min-w-[140px] overflow-hidden">
               <button
                  onClick={(e) => {
                     e.stopPropagation();
                     onView();
                     setIsOpen(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-slate-300 hover:bg-neutral-700 flex items-center gap-2 transition-colors"
               >
                  <Eye size={16} />
                  Xem
               </button>
               <button
                  onClick={(e) => {
                     e.stopPropagation();
                     onEdit();
                     setIsOpen(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-slate-300 hover:bg-neutral-700 flex items-center gap-2 transition-colors"
               >
                  <Edit size={16} />
                  Sửa
               </button>
               <button
                  onClick={(e) => {
                     e.stopPropagation();
                     if (window.confirm(`Bạn có chắc chắn muốn xóa "${itemName}"?`)) {
                        onDelete();
                     }
                     setIsOpen(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-900/20 flex items-center gap-2 transition-colors"
               >
                  <Trash2 size={16} />
                  Xóa
               </button>
            </div>
         )}
      </div>
   );
};

// Helper to group workflows by department
const groupBy = <T, K extends keyof any>(list: T[], getKey: (item: T) => K) =>
   list.reduce((previous, currentItem) => {
      const group = getKey(currentItem);
      if (!previous[group]) previous[group] = [];
      previous[group].push(currentItem);
      return previous;
   }, {} as Record<K, T[]>);

// Helper to get department from member role
const getDepartmentFromRole = (role: Member['role']): string => {
   switch (role) {
      case 'Quản lý': return 'Quản Lý';
      case 'Kỹ thuật viên': return 'Kỹ Thuật';
      case 'QC': return 'QA/QC';
      case 'Tư vấn viên': return 'Kinh Doanh';
      default: return 'Khác';
   }
};

// Helper to get unique departments from members
const getDepartmentsFromMembers = (members: Member[]): string[] => {
   const departments = new Set<string>();
   (members || []).forEach(member => {
      const dept = member.department || getDepartmentFromRole(member.role);
      if (dept && dept !== 'Khác') {
         departments.add(dept);
      }
   });
   // Add default departments if not found in members
   const defaultDepts = ['Kỹ Thuật', 'Spa', 'QA/QC', 'Hậu Cần', 'Quản Lý', 'Kinh Doanh'];
   defaultDepts.forEach(dept => departments.add(dept));
   return Array.from(departments).sort();
};

export const Workflows: React.FC = () => {
   const { inventory } = useAppStore();
   const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowDefinition | null>(null);
   const [showAddModal, setShowAddModal] = useState(false);
   const [showViewModal, setShowViewModal] = useState(false);
   const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
   const [isLoading, setIsLoading] = useState(true);

   // Load workflows từ Supabase với join bảng các bước (di chuyển ra ngoài để có thể gọi từ các hàm khác)
   const loadWorkflows = async () => {
      try {
         // Load workflows
         const { data: workflowsData, error: workflowsError } = await supabase
            .from(DB_TABLES.WORKFLOWS)
            .select('id, ten_quy_trinh, mo_ta, phong_ban_phu_trach, loai_ap_dung, mau_sac, vat_tu_can_thiet, nhan_vien_duoc_giao')
            .order('ngay_tao', { ascending: false })
            .limit(100);

         if (workflowsError) throw workflowsError;

         // Load tất cả các bước quy trình
         const { data: stagesData, error: stagesError } = await supabase
            .from(DB_TABLES.WORKFLOW_STAGES)
            .select('id, id_quy_trinh, ten_buoc, thu_tu, mau_sac, chi_tiet, tieu_chuan, cong_viec')
            .order('id_quy_trinh, thu_tu', { ascending: true });

         if (stagesError) throw stagesError;

         // Load tất cả các task quy trình (New Table Logic)
         const { data: tasksData, error: tasksError } = await supabase
            .from('cac_task_quy_trinh')
            .select('*')
            .order('id_buoc_quy_trinh, thu_tu', { ascending: true });

         if (tasksError) console.error('Error loading tasks:', tasksError);

         // Group tasks by stage
         const tasksByStage = new Map<string, TodoStep[]>();
         (tasksData || []).forEach((task: any) => {
            if (!tasksByStage.has(task.id_buoc_quy_trinh)) {
               tasksByStage.set(task.id_buoc_quy_trinh, []);
            }
            tasksByStage.get(task.id_buoc_quy_trinh)!.push({
               id: task.id,
               title: task.ten_task,
               description: task.mo_ta,
               completed: task.da_hoan_thanh,
               order: task.thu_tu
            });
         });

         // Group stages by workflow ID
         const stagesByWorkflow = new Map<string, WorkflowStage[]>();
         (stagesData || []).forEach((stage: any) => {
            if (!stagesByWorkflow.has(stage.id_quy_trinh)) {
               stagesByWorkflow.set(stage.id_quy_trinh, []);
            }

            // Prioritize tasks from table, fallback to JSONB
            const tasks = tasksByStage.get(stage.id) || stage.cong_viec || [];

            stagesByWorkflow.get(stage.id_quy_trinh)!.push({
               id: stage.id,
               name: stage.ten_buoc,
               order: stage.thu_tu,
               color: stage.mau_sac || undefined,
               details: stage.chi_tiet || undefined,
               standards: stage.tieu_chuan || undefined,
               todos: tasks
            });
         });

         // Map từ tên cột tiếng Việt sang interface
         const workflowsList: WorkflowDefinition[] = (workflowsData || []).map((wf: any) => ({
            id: wf.id,
            label: wf.ten_quy_trinh || '',
            description: wf.mo_ta || '',
            department: wf.phong_ban_phu_trach || 'ky_thuat',
            types: wf.loai_ap_dung || [],
            color: wf.mau_sac || 'bg-blue-900/30 text-blue-400 border-blue-800',
            materials: wf.vat_tu_can_thiet || undefined,
            stages: stagesByWorkflow.get(wf.id) || undefined,
            assignedMembers: wf.nhan_vien_duoc_giao || undefined
         }));

         setWorkflows(workflowsList);
      } catch (error) {
         console.error('Error loading workflows:', error);
         setWorkflows([]);
      } finally {
         setIsLoading(false);
      }
   };

   useEffect(() => {
      loadWorkflows();

      // Listen for real-time updates (with error handling)
      let channel: any = null;
      try {
         // Debounce để tránh reload quá nhiều
         let reloadTimeout: NodeJS.Timeout;
         const debouncedReload = () => {
            clearTimeout(reloadTimeout);
            reloadTimeout = setTimeout(() => {
               console.log('Workflow changed, reloading...');
               loadWorkflows();
            }, 300); // Debounce 300ms để nhanh hơn
         };

         channel = supabase
            .channel('workflows-changes')
            .on('postgres_changes',
               { event: '*', schema: 'public', table: DB_TABLES.WORKFLOWS },
               debouncedReload
            )
            .on('postgres_changes',
               { event: '*', schema: 'public', table: DB_TABLES.WORKFLOW_STAGES },
               debouncedReload
            )
            .subscribe((status) => {
               if (status === 'SUBSCRIBED') {
                  console.log('✅ Subscribed to workflows and stages changes');
               } else if (status === 'CHANNEL_ERROR') {
                  console.warn('⚠️ Channel error, will retry on next load');
               }
            });
      } catch (error) {
         console.warn('Could not setup real-time subscription:', error);
         // Continue without real-time updates
      }

      return () => {
         if (channel) {
            supabase.removeChannel(channel).catch(console.error);
         }
      };
   }, []);

   // Group workflows by department with explicit type
   const workflowsByDept = groupBy(workflows, (wf: WorkflowDefinition) => wf.department);

   const handleOpenConfig = (wf: WorkflowDefinition) => {
      // Navigate to config page instead of opening modal
      window.location.href = `#/workflows/${wf.id}/config`;
   };


   return (
      <div className="space-y-6">
         {/* Modal Tạo Quy Trình Mới */}
         {showAddModal && (
            <CreateWorkflowModal
               onClose={() => setShowAddModal(false)}
               onSuccess={loadWorkflows}
            />
         )}

         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
               <h1 className="text-2xl font-serif font-bold text-slate-100">Quản Lý Quy Trình</h1>
               <p className="text-slate-500 mt-1">Thiết lập các luồng xử lý và định mức nguyên vật liệu.</p>
            </div>
            <button
               onClick={() => setShowAddModal(true)}
               className="flex items-center gap-2 bg-gold-600 hover:bg-gold-700 text-black font-medium px-4 py-2.5 rounded-lg shadow-lg shadow-gold-900/20 transition-all"
            >
               <Plus size={18} />
               <span>Tạo Quy Trình Mới</span>
            </button>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Object.entries(workflowsByDept).map(([dept, workflows]) => (
               <div key={dept} className="bg-neutral-900/30 rounded-lg border border-neutral-800 p-3">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-slate-100 mb-2">
                     <Building2 size={16} className="text-gold-500" />
                     <span>Phòng {dept}</span>
                     <span className="text-[10px] font-normal text-slate-400 bg-neutral-800 border border-neutral-700 px-1.5 py-0.5 rounded-full">{workflows.length}</span>
                  </h3>

                  <div className="space-y-1">
                     {workflows.map((wf) => (
                        <div key={wf.id} className="bg-neutral-900 px-2 py-1.5 rounded-md shadow-sm border border-neutral-800 flex gap-2 items-center hover:border-gold-900/30 transition-all">
                           <div className={`w-8 h-8 rounded flex items-center justify-center border flex-shrink-0 ${wf.color}`}>
                              <GitMerge size={14} />
                           </div>
                           <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-center gap-1">
                                 <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <h3 className="font-semibold text-xs text-slate-100 truncate">{wf.label}</h3>
                                    <span className="text-[9px] text-slate-400 bg-neutral-800 px-1 py-0.5 rounded border border-neutral-700 flex-shrink-0">{wf.department}</span>
                                 </div>
                                 <ActionMenu
                                    itemName={wf.label}
                                    onView={() => {
                                       setSelectedWorkflow(wf);
                                       setShowViewModal(true);
                                    }}
                                    onEdit={() => {
                                       handleOpenConfig(wf);
                                    }}
                                    onDelete={async () => {
                                       if (window.confirm(`CẢNH BÁO: BẠN SẮP XÓA QUY TRÌNH "${wf.label}"\n\nHành động này sẽ:\n- Xóa vĩnh viễn quy trình này.\n- Gỡ bỏ quy trình khỏi tất cả Dịch vụ đang sử dụng.\n- HỦY (Cancel) tất cả các công việc đang chạy trên quy trình này.\n\nBạn có chắc chắn muốn tiếp tục?`)) {
                                          try {
                                             // 1. Fetch data necessary for cascade
                                             const [servicesResult, ordersResult] = await Promise.all([
                                                supabase.from(DB_TABLES.SERVICES).select('*'),
                                                supabase.from(DB_TABLES.ORDERS).select('*')
                                             ]);

                                             // 2. Delete workflow
                                             const { error: deleteError } = await supabase
                                                .from(DB_TABLES.WORKFLOWS)
                                                .delete()
                                                .eq('id', wf.id);

                                             if (deleteError) throw deleteError;

                                             // 3. Clean Services (Remove workflow reference)
                                             if (servicesResult.data) {
                                                for (const svc of servicesResult.data) {
                                                   const workflows = svc.cac_buoc_quy_trinh || [];
                                                   const newWorkflows = workflows.filter((w: any) => w.id !== wf.id);
                                                   if (newWorkflows.length !== workflows.length) {
                                                      await supabase
                                                         .from(DB_TABLES.SERVICES)
                                                         .update({ cac_buoc_quy_trinh: newWorkflows })
                                                         .eq('id', svc.id);
                                                   }
                                                }
                                             }

                                             // 4. Cancel Active Orders/Tasks using this Workflow
                                             if (ordersResult.data) {
                                                for (const order of ordersResult.data) {
                                                   // Get items for this order
                                                   const { data: items } = await supabase
                                                      .from(DB_TABLES.SERVICE_ITEMS)
                                                      .select('*')
                                                      .eq('id_don_hang', order.id);

                                                   if (items) {
                                                      for (const item of items) {
                                                         const isActive = item.trang_thai !== 'done' && item.trang_thai !== 'cancel';
                                                         const usesWorkflow = item.id_quy_trinh === wf.id;

                                                         if (isActive && usesWorkflow) {
                                                            const history = item.lich_su_thuc_hien || [];
                                                            const newHistory = [
                                                               ...history,
                                                               {
                                                                  stageId: 'system',
                                                                  stageName: 'Hủy Tự Động',
                                                                  enteredAt: Date.now(),
                                                                  performedBy: 'System'
                                                               }
                                                            ];

                                                            await supabase
                                                               .from(DB_TABLES.SERVICE_ITEMS)
                                                               .update({
                                                                  trang_thai: 'cancel',
                                                                  lich_su_thuc_hien: newHistory
                                                               })
                                                               .eq('id', item.id);
                                                         }
                                                      }
                                                   }
                                                }
                                             }
                                             alert(`Đã xóa quy trình "${wf.label}" và cập nhật dữ liệu liên quan thành công!`);

                                          } catch (error: any) {
                                             console.error('Lỗi khi xóa quy trình:', error);
                                             const errorMessage = error?.message || String(error);
                                             alert('Lỗi khi xóa quy trình: ' + errorMessage);
                                          }
                                       }
                                    }}
                                 />
                              </div>
                              <div className="flex items-center gap-2 text-[9px] text-slate-500">
                                 <span>{wf.types.length > 0 ? wf.types.join(', ') : 'Tất cả'}</span>
                                 {wf.materials && wf.materials.length > 0 && (
                                    <span className="flex items-center gap-0.5"><Package size={9} />{wf.materials.length}</span>
                                 )}
                                 {wf.stages && wf.stages.length > 0 && (
                                    <span className="flex items-center gap-0.5"><Columns size={9} />{wf.stages.length}</span>
                                 )}
                                 <span className="text-slate-600">|</span>
                                 {wf.stages && wf.stages.length > 0 && (
                                    <span className="text-slate-400 truncate">
                                       {wf.stages.map((s, i) => `#${i + 1} ${s.name}`).join(' → ')}
                                    </span>
                                 )}
                              </div>
                           </div>
                        </div>
                     ))}

                     {/* Add New Placeholder */}
                     <button
                        onClick={() => setShowAddModal(true)}
                        className="bg-neutral-900/50 rounded-md border border-dashed border-neutral-800 flex items-center justify-center py-1.5 text-slate-600 hover:border-gold-600/50 hover:text-gold-500 hover:bg-neutral-900 transition-colors text-xs"
                     >
                        <Plus size={20} className="mr-2" />
                        <span className="font-medium">Thêm quy trình {dept}</span>
                     </button>
                  </div>
               </div>
            ))}
         </div>

         {/* Configuration Modal - Đã chuyển sang trang riêng /workflows/:id/config */}

         {/* View Modal */}
         {showViewModal && selectedWorkflow && (
            <WorkflowViewModal
               workflow={selectedWorkflow}
               onClose={() => {
                  setShowViewModal(false);
                  setSelectedWorkflow(null);
               }}
            />
         )}
      </div>
   );
};

// --- Sub-component: Stage Item ---
const StageItem: React.FC<{
   stage: WorkflowStage;
   idx: number;
   stages: WorkflowStage[];
   setStages: React.Dispatch<React.SetStateAction<WorkflowStage[]>>;
}> = ({ stage, idx, stages, setStages }) => {
   const [showTodoInput, setShowTodoInput] = useState(false);
   const [newTodoText, setNewTodoText] = useState('');
   const [newTodoNote, setNewTodoNote] = useState('');
   const [editingTodo, setEditingTodo] = useState<{ id: string, title: string, description: string } | null>(null);

   const stageTodos = stage.todos || [];

   const handleAddTodo = () => {
      if (!newTodoText.trim()) return;
      const newTodo: TodoStep = {
         id: `todo-${Date.now()}`,
         title: newTodoText,
         description: newTodoNote.trim(),
         completed: false,
         order: stageTodos.length
      };
      const updatedStages = stages.map(s =>
         s.id === stage.id
            ? { ...s, todos: [...(s.todos || []), newTodo] }
            : s
      );
      setStages(updatedStages);
      setNewTodoText('');
      setNewTodoNote('');
      setShowTodoInput(false);
   };

   const startEditing = (todo: TodoStep) => {
      setEditingTodo({
         id: todo.id,
         title: todo.title,
         description: todo.description || ''
      });
   };

   const saveEditing = () => {
      if (!editingTodo || !editingTodo.title.trim()) return;
      const updatedStages = stages.map(s =>
         s.id === stage.id
            ? {
               ...s, todos: (s.todos || []).map(t =>
                  t.id === editingTodo.id ? { ...t, title: editingTodo.title, description: editingTodo.description } : t
               )
            }
            : s
      );
      setStages(updatedStages);
      setEditingTodo(null);
   };

   return (
      <div className="bg-neutral-900 border border-neutral-800 rounded overflow-hidden">
         {/* Header Row - Table-like */}
         <div className="grid grid-cols-12 gap-2 p-2 bg-neutral-800/50 items-center text-xs">
            <div className="col-span-1 flex items-center gap-1">
               <GripVertical size={14} className="text-slate-600 cursor-move" />
               <div className={`w-2 h-2 rounded-full ${stage.color || 'bg-slate-500'}`}></div>
            </div>
            <div className="col-span-2 font-medium text-slate-200">
               {idx + 1}. {stage.name}
            </div>
            <div className="col-span-3 text-slate-400">
               {stage.details || <span className="italic text-slate-600">Chưa có chi tiết</span>}
            </div>
            <div className="col-span-3 text-slate-400">
               {stage.standards || <span className="italic text-slate-600">Chưa có tiêu chuẩn</span>}
            </div>
            <div className="col-span-2 text-slate-500 text-center">
               {stageTodos.length > 0 && (
                  <span className="bg-neutral-700 px-2 py-0.5 rounded">
                     {stageTodos.filter(t => t.completed).length}/{stageTodos.length} task
                  </span>
               )}
            </div>
            <div className="col-span-1 flex items-center justify-end gap-1">
               {idx > 0 && (
                  <button
                     onClick={() => {
                        const newStages = [...stages];
                        [newStages[idx], newStages[idx - 1]] = [newStages[idx - 1], newStages[idx]];
                        newStages[idx].order = idx;
                        newStages[idx - 1].order = idx - 1;
                        setStages(newStages);
                     }}
                     className="p-1 hover:bg-neutral-700 rounded text-slate-500 hover:text-slate-300"
                     title="Di chuyển lên"
                  >
                     <ArrowUp size={12} />
                  </button>
               )}
               {idx < stages.length - 1 && (
                  <button
                     onClick={() => {
                        const newStages = [...stages];
                        [newStages[idx], newStages[idx + 1]] = [newStages[idx + 1], newStages[idx]];
                        newStages[idx].order = idx;
                        newStages[idx + 1].order = idx + 1;
                        setStages(newStages);
                     }}
                     className="p-1 hover:bg-neutral-700 rounded text-slate-500 hover:text-slate-300"
                     title="Di chuyển xuống"
                  >
                     <ArrowDown size={12} />
                  </button>
               )}
               <button
                  onClick={() => {
                     if (window.confirm(`Xóa bước "${stage.name}"?`)) {
                        setStages(stages.filter(s => s.id !== stage.id).map((s, i) => ({ ...s, order: i })));
                     }
                  }}
                  className="p-1 hover:bg-neutral-700 rounded text-slate-500 hover:text-red-500"
               >
                  <X size={12} />
               </button>
            </div>
         </div>

         {/* Tasks Section */}
         <div className="p-2 pt-0">
            <div className="flex items-center justify-between mb-1 mt-2">
               <p className="text-[10px] font-medium text-slate-500 uppercase">Các task con</p>
               <button
                  onClick={() => setShowTodoInput(!showTodoInput)}
                  className="text-[10px] px-1.5 py-0.5 bg-gold-600/20 hover:bg-gold-600/30 text-gold-400 rounded flex items-center gap-1 transition-colors"
               >
                  <Plus size={10} />
                  Thêm
               </button>
            </div>

            {showTodoInput && (
               <div className="flex flex-col gap-2 mb-2 p-2 bg-neutral-800 rounded border border-neutral-700 animate-in fade-in zoom-in-95 duration-100">
                  <input
                     type="text"
                     value={newTodoText}
                     onChange={(e) => setNewTodoText(e.target.value)}
                     onKeyPress={(e) => {
                        if (e.key === 'Enter' && newTodoText.trim()) {
                           // Focus note
                           const noteInput = document.getElementById(`new-note-${stage.id}`);
                           if (noteInput) noteInput.focus();
                        }
                     }}
                     placeholder="Tên task..."
                     className="w-full px-2 py-1 text-[11px] border border-neutral-600 rounded bg-neutral-900 text-slate-200 outline-none focus:border-gold-500"
                     autoFocus
                  />
                  <div className="flex gap-2">
                     <input
                        id={`new-note-${stage.id}`}
                        type="text"
                        value={newTodoNote}
                        onChange={(e) => setNewTodoNote(e.target.value)}
                        onKeyPress={(e) => {
                           if (e.key === 'Enter') handleAddTodo();
                        }}
                        placeholder="Ghi chú (tùy chọn)..."
                        className="flex-1 px-2 py-1 text-[11px] border border-neutral-600 rounded bg-neutral-900 text-slate-200 outline-none focus:border-gold-500"
                     />
                     <button
                        onClick={handleAddTodo}
                        className="px-2 py-1 bg-gold-600 hover:bg-gold-700 text-black rounded text-[11px] font-medium transition-colors"
                     >
                        OK
                     </button>
                  </div>
               </div>
            )}

            {stageTodos.length === 0 ? (
               <p className="text-[10px] text-slate-600 italic py-1">Chưa có task</p>
            ) : (
               <div className="space-y-1">
                  {stageTodos.map(todo => (
                     <div key={todo.id} className="bg-neutral-800/30 rounded border border-neutral-800 p-1.5">
                        <div className="flex items-start gap-1.5 text-[11px]">
                           <button
                              onClick={() => {
                                 const updatedStages = stages.map(s =>
                                    s.id === stage.id
                                       ? {
                                          ...s, todos: (s.todos || []).map(t =>
                                             t.id === todo.id ? { ...t, completed: !t.completed } : t
                                          )
                                       }
                                       : s
                                 );
                                 setStages(updatedStages);
                              }}
                              className="flex-shrink-0 mt-0.5"
                           >
                              {todo.completed ? (
                                 <CheckCircle2 size={12} className="text-emerald-500" />
                              ) : (
                                 <Circle size={12} className="text-slate-600" />
                              )}
                           </button>

                           {/* Edit Form or Display */}
                           {editingTodo && editingTodo.id === todo.id ? (
                              <div className="flex-1 space-y-1">
                                 <input
                                    value={editingTodo.title}
                                    onChange={(e) => setEditingTodo({ ...editingTodo, title: e.target.value })}
                                    className="w-full px-1.5 py-0.5 text-[11px] border border-neutral-600 rounded bg-neutral-900 text-slate-200 focus:border-gold-500 outline-none"
                                    autoFocus
                                 />
                                 <div className="flex gap-1">
                                    <input
                                       value={editingTodo.description}
                                       onChange={(e) => setEditingTodo({ ...editingTodo, description: e.target.value })}
                                       className="flex-1 px-1.5 py-0.5 text-[10px] border border-neutral-600 rounded bg-neutral-900 text-slate-300 focus:border-gold-500 outline-none"
                                       placeholder="Ghi chú..."
                                       onKeyDown={e => { if (e.key === 'Enter') saveEditing() }}
                                    />
                                    <button onClick={saveEditing} className="px-1.5 bg-gold-600 text-[10px] text-black rounded">Lưu</button>
                                    <button onClick={() => setEditingTodo(null)} className="px-1.5 bg-neutral-700 text-[10px] text-slate-300 rounded">Hủy</button>
                                 </div>
                              </div>
                           ) : (
                              <div className="flex-1 group" onClick={() => startEditing(todo)} title="Nhấn để sửa">
                                 <div className="flex justify-between items-start">
                                    <span className={`${todo.completed ? 'text-slate-500 line-through' : 'text-slate-300'} hover:text-gold-400 cursor-pointer`}>
                                       {todo.title}
                                    </span>
                                    <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                                       <button
                                          onClick={(e) => { e.stopPropagation(); startEditing(todo); }}
                                          className="text-slate-600 hover:text-blue-400 transition-colors"
                                       >
                                          <Edit size={10} />
                                       </button>
                                       <button
                                          onClick={(e) => {
                                             e.stopPropagation();
                                             const updatedStages = stages.map(s =>
                                                s.id === stage.id
                                                   ? { ...s, todos: (s.todos || []).filter(t => t.id !== todo.id).map((t, i) => ({ ...t, order: i })) }
                                                   : s
                                             );
                                             setStages(updatedStages);
                                          }}
                                          className="text-slate-600 hover:text-red-500 transition-colors"
                                       >
                                          <X size={10} />
                                       </button>
                                    </div>
                                 </div>
                                 {todo.description && (
                                    <div className="text-[10px] text-slate-500 mt-0.5">{todo.description}</div>
                                 )}
                              </div>
                           )}
                        </div>
                     </div>
                  ))}
               </div>
            )}
         </div>
      </div>
   );
};

// --- Sub-component: Create Workflow Modal ---
const CreateWorkflowModal: React.FC<{ onClose: () => void; onSuccess?: () => Promise<void> }> = ({ onClose, onSuccess }) => {
   const { inventory, members } = useAppStore();
   const [workflowLabel, setWorkflowLabel] = useState('');
   const [workflowDescription, setWorkflowDescription] = useState('');
   const [workflowDepartment, setWorkflowDepartment] = useState<WorkflowDefinition['department']>('Kỹ Thuật');
   const [materials, setMaterials] = useState<WorkflowMaterial[]>([]);
   const [stages, setStages] = useState<WorkflowStage[]>([]);
   const [selectedInventoryId, setSelectedInventoryId] = useState('');
   const [quantity, setQuantity] = useState('');
   const [newStageName, setNewStageName] = useState('');
   const [newStageColor, setNewStageColor] = useState('bg-slate-500');
   const [newStageDetails, setNewStageDetails] = useState('');
   const [newStageStandards, setNewStageStandards] = useState('');
   const [assignedMembers, setAssignedMembers] = useState<string[]>([]);
   const [memberSearchText, setMemberSearchText] = useState('');

   // Tự động tạo ID từ tên quy trình
   // ID sẽ được database tự tạo, không cần generate nữa

   const getInventoryItem = (id: string) => (inventory || []).find(i => i.id === id);

   const handleAddMaterial = () => {
      if (!selectedInventoryId || !quantity) return;
      const newItem = {
         inventoryItemId: selectedInventoryId,
         quantity: parseFloat(quantity)
      };
      setMaterials([...materials, newItem]);
      setSelectedInventoryId('');
      setQuantity('');
   };

   const handleRemoveMaterial = (index: number) => {
      const newMaterials = [...materials];
      newMaterials.splice(index, 1);
      setMaterials(newMaterials);
   };

   const handleSave = async () => {
      console.log('handleSave called');
      if (!workflowLabel) {
         alert('Vui lòng nhập tên quy trình!');
         return;
      }

      try {
         console.log('Creating workflow object...');
         // Tự động chọn màu dựa trên phòng ban
         const departmentColors: Record<string, string> = {
            'Kỹ Thuật': 'bg-blue-900/30 text-blue-400 border-blue-800',
            'Spa': 'bg-purple-900/30 text-purple-400 border-purple-800',
            'QA/QC': 'bg-emerald-900/30 text-emerald-400 border-emerald-800',
            'Hậu Cần': 'bg-orange-900/30 text-orange-400 border-orange-800'
         };

         // Map department name to enum value
         const departmentMap: Record<string, string> = {
            'Kỹ Thuật': 'ky_thuat',
            'Spa': 'spa',
            'QA/QC': 'qc',
            'Hậu Cần': 'hau_can'
         };

         // Tạo đối tượng quy trình (KHÔNG gửi id - để database tự tạo)
         const newWorkflow: any = {
            ten_quy_trinh: workflowLabel,
            phong_ban_phu_trach: departmentMap[workflowDepartment] || 'ky_thuat',
            mau_sac: departmentColors[workflowDepartment] || 'bg-blue-900/30 text-blue-400 border-blue-800',
            loai_ap_dung: [] // JSONB array - required field
         };

         // Chỉ thêm optional fields nếu có giá trị
         if (workflowDescription) newWorkflow.mo_ta = workflowDescription;
         if (materials.length > 0) newWorkflow.vat_tu_can_thiet = materials;
         // KHÔNG thêm stages vào đây - sẽ lưu vào bảng riêng sau
         if (assignedMembers.length > 0) newWorkflow.nhan_vien_duoc_giao = assignedMembers;

         console.log('Saving workflow to Supabase:', newWorkflow);

         // Lưu vào Supabase (không gửi id - database tự tạo)
         // Chỉ select id để tối ưu tốc độ
         const { data, error } = await supabase
            .from(DB_TABLES.WORKFLOWS)
            .insert(newWorkflow)
            .select('id')
            .single();

         if (error) {
            console.error('Supabase insert error:', error);
            throw error;
         }

         const workflowId = data?.id;
         if (!workflowId) throw new Error('Không thể lấy ID quy trình sau khi tạo');

         // Lưu các bước vào bảng riêng
         // Lưu các bước vào bảng riêng
         if (stages.length > 0) {
            // 1. Insert Stages (without JSON tasks)
            const stagesToInsert = stages.map((stage, index) => ({
               id_quy_trinh: workflowId,
               ten_buoc: stage.name,
               thu_tu: stage.order !== undefined ? stage.order : index,
               mau_sac: stage.color || null,
               chi_tiet: stage.details || null,
               tieu_chuan: stage.standards || null,
               cong_viec: [] // JSONB empty
            }));

            const { data: insertedStages, error: stagesError } = await supabase
               .from(DB_TABLES.WORKFLOW_STAGES)
               .insert(stagesToInsert)
               .select('id, thu_tu');

            if (stagesError) {
               console.error('Error inserting stages:', stagesError);
               throw stagesError;
            }

            // 2. Insert Tasks into 'cac_task_quy_trinh'
            // We need to map the original stages (which have todos) to the inserted DB stages.
            // Assuming the insertion order is preserved or we can match by 'thu_tu'.
            if (insertedStages && insertedStages.length > 0) {
               const tasksToInsert: any[] = [];

               // Sort both by order to ensure matching
               const sortedOriginalStages = [...stages].sort((a, b) => (a.order || 0) - (b.order || 0));
               const sortedInsertedStages = [...insertedStages].sort((a: any, b: any) => a.thu_tu - b.thu_tu);

               sortedOriginalStages.forEach((orgStage, idx) => {
                  const dbStage = sortedInsertedStages[idx];
                  if (dbStage && orgStage.todos && orgStage.todos.length > 0) {
                     orgStage.todos.forEach((todo, tIdx) => {
                        tasksToInsert.push({
                           id_buoc_quy_trinh: dbStage.id,
                           ten_task: todo.title,
                           mo_ta: todo.description,
                           thu_tu: tIdx,
                           da_hoan_thanh: todo.completed
                        });
                     });
                  }
               });

               if (tasksToInsert.length > 0) {
                  const { error: tasksError } = await supabase
                     .from('cac_task_quy_trinh')
                     .insert(tasksToInsert);

                  if (tasksError) {
                     console.error('Error inserting tasks:', tasksError);
                     // Non-blocking but good to log
                  }
               }
            }
         }

         // Reset form
         setWorkflowLabel('');
         setWorkflowDescription('');
         setWorkflowDepartment('Kỹ Thuật');
         setMaterials([]);
         setStages([]);
         setAssignedMembers([]);
         setMemberSearchText('');

         // Reload workflows ngay để hiển thị luôn
         if (onSuccess) {
            await onSuccess();
         }

         alert(`Tạo quy trình thành công!\n\nID: ${workflowId}\nTên: ${workflowLabel}\nPhòng ban: ${workflowDepartment}\nVật tư: ${materials.length} loại\nCác bước: ${stages.length} bước\n\nĐã lưu vào Supabase!`);

         onClose();
      } catch (error: any) {
         console.error('Lỗi khi lưu quy trình:', error);
         const errorMessage = error?.message || String(error);
         alert('Lỗi khi lưu quy trình vào Firebase:\n' + errorMessage + '\n\nVui lòng kiểm tra kết nối Firebase và thử lại.');
      }
   };

   return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
         <div className="bg-neutral-900 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-neutral-800">
            <div className="p-5 border-b border-neutral-800 flex justify-between items-center bg-neutral-900">
               <div>
                  <h3 className="font-bold text-lg text-slate-100">Tạo Quy Trình Mới</h3>
                  <p className="text-xs text-slate-500">Thiết lập quy trình xử lý hoàn chỉnh</p>
               </div>
               <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-full transition-colors text-slate-400">
                  <X size={20} />
               </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
               <div className="grid grid-cols-2 gap-6">
                  {/* Cột trái */}
                  <div className="space-y-6">
                     {/* 1. General Info */}
                     <div>
                        <h4 className="font-bold text-slate-200 mb-2 text-sm">Thông Tin Cơ Bản</h4>
                        <div className="space-y-2">
                           <div>
                              <label className="text-xs font-medium text-slate-500 mb-1 block">Tên quy trình <span className="text-red-500">*</span></label>
                              <input
                                 type="text"
                                 value={workflowLabel}
                                 onChange={(e) => setWorkflowLabel(e.target.value)}
                                 placeholder="VD: Spa cao cấp"
                                 className="w-full p-2 border border-neutral-700 rounded text-sm outline-none focus:border-gold-500 bg-neutral-900 text-slate-200"
                              />
                              <div className="mt-2 p-2 bg-neutral-800/50 rounded border border-neutral-700">
                                 <span className="text-xs text-slate-400">ID sẽ được tự động tạo bởi database</span>
                              </div>
                           </div>
                           <div>
                              <label className="text-xs font-medium text-slate-500 mb-1 block">Phòng ban</label>
                              <select
                                 value={workflowDepartment}
                                 onChange={(e) => {
                                    const dept = e.target.value as WorkflowDefinition['department'];
                                    setWorkflowDepartment(dept);
                                    // Lọc nhân sự theo phòng ban
                                    const membersInDept = (members || []).filter(m => {
                                       const memberDept = m.department || getDepartmentFromRole(m.role);
                                       return memberDept === dept;
                                    });
                                    // Cập nhật assignedMembers chỉ giữ lại những người thuộc phòng ban mới
                                    setAssignedMembers(prev => prev.filter(id =>
                                       membersInDept.some(m => m.id === id)
                                    ));
                                 }}
                                 className="w-full p-2 border border-neutral-700 rounded text-sm outline-none focus:border-gold-500 bg-neutral-900 text-slate-200"
                              >
                                 {getDepartmentsFromMembers(members || []).map(dept => (
                                    <option key={dept} value={dept}>{dept}</option>
                                 ))}
                              </select>
                           </div>
                           <div>
                              <label className="text-xs font-medium text-slate-500 mb-1 block">Mô tả</label>
                              <textarea
                                 value={workflowDescription}
                                 onChange={(e) => setWorkflowDescription(e.target.value)}
                                 placeholder="Mô tả quy trình xử lý..."
                                 rows={2}
                                 className="w-full p-2 border border-neutral-700 rounded text-sm outline-none focus:border-gold-500 bg-neutral-900 text-slate-200 resize-none"
                              />
                           </div>
                        </div>
                     </div>

                     {/* 1.5. Nhân sự phụ trách */}
                     <div>
                        <h4 className="font-bold text-slate-200 mb-4 flex items-center gap-2">
                           <Users size={18} className="text-gold-500" />
                           Nhân Sự Phụ Trách
                        </h4>

                        <div className="bg-neutral-800/30 p-4 rounded-lg border border-neutral-800">
                           <div className="mb-3">
                              <label className="text-xs font-medium text-slate-500 mb-2 block">Tìm kiếm nhân sự</label>
                              <input
                                 type="text"
                                 value={memberSearchText}
                                 onChange={(e) => setMemberSearchText(e.target.value)}
                                 placeholder="Tìm theo tên, SĐT, email..."
                                 className="w-full p-2 border border-neutral-700 rounded text-sm outline-none focus:border-gold-500 bg-neutral-900 text-slate-200"
                              />
                           </div>

                           <div className="max-h-48 overflow-y-auto">
                              <div className="grid grid-cols-3 gap-2">
                                 {(members || [])
                                    .filter(m => {
                                       const memberDept = m.department || getDepartmentFromRole(m.role);
                                       const matchesDept = memberDept === workflowDepartment;
                                       const matchesSearch = !memberSearchText.trim() ||
                                          m.name.toLowerCase().includes(memberSearchText.toLowerCase()) ||
                                          m.phone.includes(memberSearchText) ||
                                          m.email.toLowerCase().includes(memberSearchText.toLowerCase());
                                       return matchesDept && matchesSearch && m.status === 'Active';
                                    })
                                    .map(member => (
                                       <label
                                          key={member.id}
                                          className="flex items-center gap-2 p-2 bg-neutral-900 rounded border border-neutral-800 hover:border-gold-500/50 cursor-pointer transition-colors"
                                       >
                                          <input
                                             type="checkbox"
                                             checked={assignedMembers.includes(member.id)}
                                             onChange={(e) => {
                                                if (e.target.checked) {
                                                   setAssignedMembers([...assignedMembers, member.id]);
                                                } else {
                                                   setAssignedMembers(assignedMembers.filter(id => id !== member.id));
                                                }
                                             }}
                                             className="w-4 h-4 text-gold-600 bg-neutral-800 border-neutral-700 rounded focus:ring-gold-500 flex-shrink-0"
                                          />
                                          <div className="flex-1 min-w-0">
                                             <div className="text-xs font-medium text-slate-200 truncate">{member.name}</div>
                                             <div className="text-[10px] text-slate-500 truncate">{member.role}</div>
                                          </div>
                                       </label>
                                    ))}
                              </div>
                              {(members || []).filter(m => {
                                 const memberDept = m.department || getDepartmentFromRole(m.role);
                                 return memberDept === workflowDepartment && m.status === 'Active';
                              }).length === 0 && (
                                    <div className="text-center py-4 text-slate-600 text-sm">
                                       Không có nhân sự nào trong phòng ban này
                                    </div>
                                 )}
                           </div>

                           {assignedMembers.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-neutral-800">
                                 <div className="text-xs font-medium text-slate-400 mb-2">Đã chọn ({assignedMembers.length}):</div>
                                 <div className="flex flex-wrap gap-2">
                                    {assignedMembers.map(memberId => {
                                       const member = (members || []).find(m => m.id === memberId);
                                       if (!member) return null;
                                       return (
                                          <div
                                             key={memberId}
                                             className="flex items-center gap-2 px-2 py-1 bg-gold-900/20 text-gold-400 border border-gold-800/30 rounded text-xs"
                                          >
                                             {member.name}
                                             <button
                                                onClick={() => setAssignedMembers(assignedMembers.filter(id => id !== memberId))}
                                                className="text-gold-500 hover:text-gold-300"
                                             >
                                                <X size={12} />
                                             </button>
                                          </div>
                                       );
                                    })}
                                 </div>
                              </div>
                           )}
                        </div>
                     </div>

                     {/* 3. Materials Configuration */}
                     <div>
                        <h4 className="font-bold text-slate-200 mb-4 flex items-center gap-2">
                           <Package size={18} className="text-gold-500" />
                           Định Mức Nguyên Vật Liệu
                        </h4>

                        <div className="bg-neutral-800/30 p-4 rounded-lg border border-neutral-800 mb-4">
                           <div className="grid grid-cols-1 gap-3 mb-3">
                              <div>
                                 <label className="text-xs font-medium text-slate-500 mb-1 block">Chọn vật tư trong kho</label>
                                 <select
                                    className="w-full p-2 border border-neutral-700 rounded text-sm outline-none focus:border-gold-500 bg-neutral-900 text-slate-200"
                                    value={selectedInventoryId}
                                    onChange={(e) => setSelectedInventoryId(e.target.value)}
                                 >
                                    <option value="">-- Chọn vật tư --</option>
                                    {(inventory || []).map(item => (
                                       <option key={item.id} value={item.id}>
                                          {item.name} (Tồn: {item.quantity.toLocaleString('vi-VN')} {item.unit})
                                       </option>
                                    ))}
                                 </select>
                              </div>
                              <div>
                                 <label className="text-xs font-medium text-slate-500 mb-1 block">Định mức / SP</label>
                                 <div className="flex">
                                    <input
                                       type="number"
                                       step="0.01"
                                       className="w-full p-2 border border-neutral-700 rounded-l text-sm outline-none focus:border-gold-500 bg-neutral-900 text-slate-200"
                                       placeholder="0.00"
                                       value={quantity}
                                       onChange={(e) => setQuantity(e.target.value)}
                                    />
                                    <span className="bg-neutral-800 px-3 py-2 text-xs flex items-center rounded-r border-y border-r border-neutral-700 text-slate-400">
                                       {selectedInventoryId ? getInventoryItem(selectedInventoryId)?.unit : 'Đơn vị'}
                                    </span>
                                 </div>
                              </div>
                           </div>

                           {selectedInventoryId && (
                              <div className="flex items-center gap-3 mb-3 bg-neutral-900 p-2 rounded border border-neutral-800">
                                 <img
                                    src={getInventoryItem(selectedInventoryId)?.image}
                                    alt=""
                                    className="w-8 h-8 rounded object-cover opacity-80"
                                 />
                                 <div className="text-xs">
                                    <span className="font-medium text-slate-200">{getInventoryItem(selectedInventoryId)?.name}</span>
                                    <div className="text-slate-500">
                                       Tồn kho hiện tại: <span className="font-bold text-emerald-500">{getInventoryItem(selectedInventoryId)?.quantity?.toLocaleString('vi-VN') || '0'}</span> {getInventoryItem(selectedInventoryId)?.unit}
                                    </div>
                                 </div>
                              </div>
                           )}

                           <button
                              onClick={handleAddMaterial}
                              disabled={!selectedInventoryId || !quantity}
                              className="w-full py-2 bg-slate-100 hover:bg-white disabled:bg-neutral-800 text-black rounded text-sm font-medium transition-colors"
                           >
                              + Thêm vào quy trình
                           </button>
                        </div>

                        <div>
                           {materials.length === 0 && (
                              <div className="text-center py-4 text-slate-600 text-sm border border-dashed border-neutral-800 rounded-lg">
                                 Chưa có định mức vật tư
                              </div>
                           )}
                           <div className="grid grid-cols-3 gap-2">
                              {materials.map((mat, idx) => {
                                 const itemDetails = getInventoryItem(mat.inventoryItemId);
                                 return (
                                    <div key={idx} className="relative p-2 bg-neutral-900 border border-neutral-800 rounded-lg shadow-sm">
                                       <div className="flex items-start gap-2 mb-2">
                                          <div className="w-8 h-8 rounded bg-neutral-800 overflow-hidden flex-shrink-0">
                                             <img src={itemDetails?.image} alt="" className="w-full h-full object-cover opacity-80" />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                             <h5 className="font-medium text-xs text-slate-200 truncate">{itemDetails?.name}</h5>
                                             <p className="text-[10px] text-slate-500 truncate">{itemDetails?.sku}</p>
                                          </div>
                                       </div>
                                       <div className="flex items-center justify-between">
                                          <div className="text-xs">
                                             <div className="font-bold text-slate-200">{mat.quantity.toLocaleString('vi-VN')} <span className="text-[10px] font-normal text-slate-500">{itemDetails?.unit}</span></div>
                                             <div className="text-[10px] text-slate-500">định mức</div>
                                          </div>
                                          <button
                                             onClick={() => handleRemoveMaterial(idx)}
                                             className="text-slate-500 hover:text-red-500 p-1"
                                          >
                                             <X size={12} />
                                          </button>
                                       </div>
                                    </div>
                                 );
                              })}
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* Cột phải */}
                  <div className="space-y-6">
                     {/* 2. Stages Configuration */}
                     <div>
                        <h4 className="font-bold text-slate-200 mb-2 flex items-center gap-2 text-sm">
                           <Columns size={16} className="text-gold-500" />
                           Các Bước Xử Lý
                        </h4>

                        <div className="bg-neutral-800/30 p-3 rounded-lg border border-neutral-800 mb-3">
                           <div className="grid grid-cols-2 gap-2 mb-2">
                              <div>
                                 <label className="text-xs font-medium text-slate-500 mb-1 block">Tên bước <span className="text-red-500">*</span></label>
                                 <input
                                    type="text"
                                    value={newStageName}
                                    onChange={(e) => setNewStageName(e.target.value)}
                                    placeholder="VD: Vệ sinh, Sửa chữa..."
                                    className="w-full p-1.5 border border-neutral-700 rounded text-sm outline-none focus:border-gold-500 bg-neutral-900 text-slate-200"
                                 />
                              </div>
                              <div>
                                 <label className="text-xs font-medium text-slate-500 mb-1 block">Màu sắc</label>
                                 <select
                                    value={newStageColor}
                                    onChange={(e) => setNewStageColor(e.target.value)}
                                    className="w-full p-1.5 border border-neutral-700 rounded text-sm outline-none focus:border-gold-500 bg-neutral-900 text-slate-200"
                                 >
                                    <option value="bg-slate-500">Xám</option>
                                    <option value="bg-blue-500">Xanh dương</option>
                                    <option value="bg-orange-500">Cam</option>
                                    <option value="bg-purple-500">Tím</option>
                                    <option value="bg-emerald-500">Xanh lá</option>
                                    <option value="bg-red-500">Đỏ</option>
                                    <option value="bg-yellow-500">Vàng</option>
                                    <option value="bg-pink-500">Hồng</option>
                                 </select>
                              </div>
                           </div>
                           <div className="grid grid-cols-2 gap-2 mb-2">
                              <div>
                                 <label className="text-xs font-medium text-slate-500 mb-1 block">Chi tiết</label>
                                 <input
                                    type="text"
                                    value={newStageDetails}
                                    onChange={(e) => setNewStageDetails(e.target.value)}
                                    placeholder="Mô tả chi tiết..."
                                    className="w-full p-1.5 border border-neutral-700 rounded text-sm outline-none focus:border-gold-500 bg-neutral-900 text-slate-200"
                                 />
                              </div>
                              <div>
                                 <label className="text-xs font-medium text-slate-500 mb-1 block">Tiêu chuẩn</label>
                                 <input
                                    type="text"
                                    value={newStageStandards}
                                    onChange={(e) => setNewStageStandards(e.target.value)}
                                    placeholder="Tiêu chuẩn hoàn thành..."
                                    className="w-full p-1.5 border border-neutral-700 rounded text-sm outline-none focus:border-gold-500 bg-neutral-900 text-slate-200"
                                 />
                              </div>
                           </div>

                           <button
                              onClick={() => {
                                 if (!newStageName.trim()) return;
                                 const newStage: WorkflowStage = {
                                    id: newStageName.toLowerCase().replace(/\s+/g, '-'),
                                    name: newStageName,
                                    order: stages.length,
                                    color: newStageColor
                                 };

                                 // Only add details and standards if they have values
                                 if (newStageDetails.trim()) {
                                    newStage.details = newStageDetails.trim();
                                 }
                                 if (newStageStandards.trim()) {
                                    newStage.standards = newStageStandards.trim();
                                 }

                                 setStages([...stages, newStage]);
                                 setNewStageName('');
                                 setNewStageColor('bg-slate-500');
                                 setNewStageDetails('');
                                 setNewStageStandards('');
                              }}
                              disabled={!newStageName.trim()}
                              className="w-full py-1.5 bg-slate-100 hover:bg-white disabled:bg-neutral-800 text-black rounded text-sm font-medium transition-colors"
                           >
                              + Thêm Bước
                           </button>
                        </div>

                        <div className="space-y-2">
                           {stages.length === 0 && (
                              <div className="text-center py-4 text-slate-600 text-sm border border-dashed border-neutral-800 rounded-lg">
                                 Chưa có bước nào. Các bước này sẽ hiển thị ở Kanban Board.
                              </div>
                           )}
                           {stages.sort((a, b) => a.order - b.order).map((stage, idx) => (
                              <StageItem
                                 key={stage.id}
                                 stage={stage}
                                 idx={idx}
                                 stages={stages}
                                 setStages={setStages}
                              />
                           ))}
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            <div className="p-5 border-t border-neutral-800 bg-neutral-900 flex justify-end gap-3">
               <button onClick={onClose} className="px-4 py-2 border border-neutral-700 rounded-lg text-slate-400 hover:bg-neutral-800 text-sm font-medium">Hủy</button>
               <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-gold-600 hover:bg-gold-700 text-black rounded-lg text-sm font-medium shadow-lg shadow-gold-900/20"
               >
                  Tạo Quy Trình
               </button>
            </div>
         </div>
      </div>
   );
};

// --- Sub-component: Stage Item with Todo Steps ---
export const StageItemWithTodos: React.FC<{
   stage: WorkflowStage;
   idx: number;
   totalStages: number;
   onMoveUp: () => void;
   onMoveDown: () => void;
   onDelete: () => void;
   onUpdate: (stage: WorkflowStage) => void;
}> = ({ stage, idx, totalStages, onMoveUp, onMoveDown, onDelete, onUpdate }) => {
   const [isExpanded, setIsExpanded] = useState(false);
   const [newTodoTitle, setNewTodoTitle] = useState('');
   const [newTodoNote, setNewTodoNote] = useState('');

   // Edit State
   const [editingTodo, setEditingTodo] = useState<{ id: string, title: string, description: string } | null>(null);

   const [todos, setTodos] = useState<TodoStep[]>(stage.todos || []);

   // Sync todos from props
   useEffect(() => {
      setTodos(stage.todos || []);
   }, [stage.todos]);

   const handleAddTodo = () => {
      if (!newTodoTitle.trim()) return;
      const newTodo: TodoStep = {
         id: `todo-${Date.now()}`,
         title: newTodoTitle,
         description: newTodoNote.trim(),
         completed: false,
         order: todos.length
      };
      const updatedTodos = [...todos, newTodo];
      setTodos(updatedTodos);
      onUpdate({ ...stage, todos: updatedTodos });
      setNewTodoTitle('');
      setNewTodoNote('');
   };

   const startEditing = (todo: TodoStep) => {
      setEditingTodo({
         id: todo.id,
         title: todo.title,
         description: todo.description || ''
      });
   };

   const saveEditing = () => {
      if (!editingTodo || !editingTodo.title.trim()) return;
      const updatedTodos = todos.map(t =>
         t.id === editingTodo.id
            ? { ...t, title: editingTodo.title, description: editingTodo.description }
            : t
      );
      setTodos(updatedTodos);
      onUpdate({ ...stage, todos: updatedTodos });
      setEditingTodo(null);
   };

   const handleToggleTodo = (todoId: string) => {
      const updatedTodos = todos.map(t =>
         t.id === todoId ? { ...t, completed: !t.completed } : t
      );
      setTodos(updatedTodos);
      onUpdate({ ...stage, todos: updatedTodos });
   };

   const handleRemoveTodo = (todoId: string) => {
      const updatedTodos = todos.filter(t => t.id !== todoId).map((t, i) => ({ ...t, order: i }));
      setTodos(updatedTodos);
      onUpdate({ ...stage, todos: updatedTodos });
   };

   const completedCount = todos.filter(t => t.completed).length;

   return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg shadow-sm overflow-hidden">
         <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-3 flex-1">
               <button
                  onClick={() => setIsExpanded(true)}
                  className="text-xs px-2 py-1 bg-gold-600/20 hover:bg-gold-600/30 text-gold-400 rounded flex items-center gap-1 transition-colors"
                  title="Thêm task cho bước này"
               >
                  <Plus size={12} />
                  Task
               </button>
               <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1 hover:bg-neutral-800 rounded transition-colors text-slate-500"
               >
                  <Plus size={16} className={`transform transition-transform ${isExpanded ? 'rotate-45' : ''}`} />
               </button>
               <div className="flex items-center gap-2">
                  <GripVertical size={16} className="text-slate-600 cursor-move" />
                  <div className={`w-3 h-3 rounded-full ${stage.color || 'bg-slate-500'}`}></div>
               </div>
               <div className="flex-1">
                  <h5 className="font-medium text-sm text-slate-200">{stage.name}</h5>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                     <span>Thứ tự: {idx + 1}</span>
                     {todos.length > 0 && (
                        <span className="bg-neutral-800 px-2 py-0.5 rounded">
                           {completedCount}/{todos.length} todo
                        </span>
                     )}
                  </div>
               </div>
            </div>
            <div className="flex items-center gap-2">
               {idx > 0 && (
                  <button
                     onClick={onMoveUp}
                     className="p-1.5 hover:bg-neutral-800 rounded text-slate-500 hover:text-slate-300"
                     title="Di chuyển lên"
                  >
                     <ArrowUp size={14} />
                  </button>
               )}
               {idx < totalStages - 1 && (
                  <button
                     onClick={onMoveDown}
                     className="p-1.5 hover:bg-neutral-800 rounded text-slate-500 hover:text-slate-300"
                     title="Di chuyển xuống"
                  >
                     <ArrowDown size={14} />
                  </button>
               )}
               <button
                  onClick={onDelete}
                  className="text-slate-500 hover:text-red-500 p-1"
               >
                  <X size={16} />
               </button>
            </div>
         </div>

         {/* Stage Details and Standards - Inline */}
         <div className="border-t border-neutral-800 px-3 py-2 bg-neutral-900/30">
            <div className="flex items-start gap-4 text-xs">
               <div className="flex-shrink-0">
                  <span className="font-medium text-slate-400">Tên:</span>
                  <span className="ml-1 text-slate-300">{stage.name}</span>
               </div>
               {stage.details && (
                  <div className="flex-1">
                     <span className="font-medium text-slate-400">Nội dung:</span>
                     <span className="ml-1 text-slate-300">{stage.details}</span>
                  </div>
               )}
               {stage.standards && (
                  <div className="flex-1">
                     <span className="font-medium text-slate-400">Tiêu chuẩn:</span>
                     <span className="ml-1 text-slate-300">{stage.standards}</span>
                  </div>
               )}
            </div>
         </div>

         {/* Show todos preview always */}
         {todos.length > 0 && (
            <div className="border-t border-neutral-800 px-3 py-2 bg-neutral-900/50">
               <div className="space-y-1 max-h-24 overflow-y-auto">
                  {todos.slice(0, 3).map((todo) => (
                     <div key={todo.id} className="flex items-center gap-2 text-xs">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-600 flex-shrink-0" />
                        <span className="text-slate-300 truncate">
                           {todo.title}
                        </span>
                     </div>
                  ))}
                  {todos.length > 3 && (
                     <div className="text-xs text-slate-500 italic px-1">
                        +{todos.length - 3} công việc khác...
                     </div>
                  )}
               </div>
            </div>
         )}

         {isExpanded && (
            <div className="border-t border-neutral-800 p-4 bg-neutral-900/50 space-y-3">
               {/* Add Todo Form */}
               <div className="space-y-2">
                  <div className="flex gap-2">
                     <input
                        type="text"
                        value={newTodoTitle}
                        onChange={(e) => setNewTodoTitle(e.target.value)}
                        onKeyPress={(e) => {
                           if (e.key === 'Enter' && !e.shiftKey) {
                              handleAddTodo();
                           }
                        }}
                        placeholder="Thêm task..."
                        className="flex-1 px-3 py-1.5 border border-neutral-700 rounded text-xs bg-neutral-800 text-slate-200 outline-none focus:border-gold-500"
                     />
                     <input
                        type="text"
                        value={newTodoNote}
                        onChange={(e) => setNewTodoNote(e.target.value)}
                        placeholder="Ghi chú..."
                        className="flex-1 px-3 py-1.5 border border-neutral-700 rounded text-xs bg-neutral-800 text-slate-200 outline-none focus:border-gold-500"
                     />
                     <button
                        onClick={handleAddTodo}
                        disabled={!newTodoTitle.trim()}
                        className="px-3 py-1.5 bg-gold-600 hover:bg-gold-700 disabled:bg-neutral-700 text-black rounded text-xs font-medium transition-colors"
                     >
                        +
                     </button>
                  </div>
               </div>

               {/* Todo List */}
               <div className="space-y-2">
                  {todos.length === 0 ? (
                     <div className="text-center py-3 text-slate-600 text-xs border border-dashed border-neutral-700 rounded">
                        Chưa có bước nhỏ nào. Thêm các chi tiết công việc ở đây.
                     </div>
                  ) : (
                     todos.map((todo) => (
                        <div key={todo.id} className="bg-neutral-800/50 rounded border border-neutral-700/50 hover:border-neutral-700 transition-colors">
                           <div className="flex items-center gap-2 p-2 relative">
                              {/* BulletPoint */}
                              <div className="flex-shrink-0 self-start mt-2">
                                 <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                              </div>

                              {/* Content or Edit Form */}
                              {editingTodo && editingTodo.id === todo.id ? (
                                 <div className="flex-1 space-y-2 animate-in fade-in zoom-in-95 duration-200">
                                    {/* Edit Title */}
                                    <div>
                                       <input
                                          value={editingTodo.title}
                                          onChange={e => setEditingTodo({ ...editingTodo, title: e.target.value })}
                                          className="w-full px-2 py-1.5 text-sm font-medium border border-neutral-600 rounded bg-neutral-900 text-slate-200 focus:border-gold-500 focus:ring-1 focus:ring-gold-500 outline-none placeholder-slate-500"
                                          autoFocus
                                          placeholder="Tên công việc..."
                                          onKeyDown={e => {
                                             if (e.key === 'Enter') {
                                                // Focus next input or save
                                                const descInput = document.getElementById(`edit-desc-${todo.id}`);
                                                if (descInput) descInput.focus();
                                             }
                                          }}
                                       />
                                    </div>
                                    {/* Edit Description & Buttons */}
                                    <div className="flex gap-2">
                                       <input
                                          id={`edit-desc-${todo.id}`}
                                          value={editingTodo.description}
                                          onChange={e => setEditingTodo({ ...editingTodo, description: e.target.value })}
                                          className="flex-1 px-2 py-1.5 text-xs border border-neutral-700 rounded bg-neutral-900 text-slate-300 focus:border-gold-500 outline-none placeholder-slate-600"
                                          placeholder="Ghi chú (tùy chọn)..."
                                          onKeyDown={e => {
                                             if (e.key === 'Enter') saveEditing();
                                          }}
                                       />
                                       <div className="flex gap-1">
                                          <button
                                             onClick={saveEditing}
                                             className="px-3 py-1.5 bg-gold-600 text-black text-xs font-bold rounded hover:bg-gold-700 transition-colors flex items-center gap-1"
                                             title="Lưu thay đổi"
                                          >
                                             Lưu
                                          </button>
                                          <button
                                             onClick={() => setEditingTodo(null)}
                                             className="px-3 py-1.5 bg-neutral-700 text-slate-300 text-xs font-medium rounded hover:bg-neutral-600 transition-colors"
                                             title="Hủy bỏ"
                                          >
                                             Hủy
                                          </button>
                                       </div>
                                    </div>
                                 </div>
                              ) : (
                                 <div className="flex-1 group" onClick={() => startEditing(todo)} title="Nhấn để sửa">
                                    <div className="flex justify-between items-start">
                                       <span className={`text-sm font-medium transition-colors ${todo.completed ? 'text-slate-500 line-through' : 'text-slate-300 group-hover:text-gold-400 cursor-pointer'}`}>
                                          {todo.title}
                                       </span>
                                       <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                          <button
                                             onClick={(e) => { e.stopPropagation(); startEditing(todo); }}
                                             className="text-slate-600 hover:text-blue-400 p-1 transition-colors"
                                             title="Sửa công việc"
                                          >
                                             <Edit size={14} />
                                          </button>
                                          <button
                                             onClick={(e) => { e.stopPropagation(); handleRemoveTodo(todo.id); }}
                                             className="text-slate-600 hover:text-red-500 p-1 transition-colors"
                                             title="Xóa công việc"
                                          >
                                             <X size={14} />
                                          </button>
                                       </div>
                                    </div>
                                    {todo.description && (
                                       <span className="text-xs text-slate-500 block mt-0.5 group-hover:text-slate-400">{todo.description}</span>
                                    )}
                                 </div>
                              )}
                           </div>
                        </div>
                     ))
                  )}
               </div>
            </div>
         )}
      </div>
   );
};

// --- Sub-component: View Workflow Modal (Read-only with task management) ---
const WorkflowViewModal: React.FC<{ workflow: WorkflowDefinition, onClose: () => void }> = ({ workflow, onClose }) => {
   const { inventory, members } = useAppStore();
   const [stages, setStages] = useState<WorkflowStage[]>(workflow.stages || []);

   const handleUpdateStage = async (updatedStage: WorkflowStage) => {
      const updatedStages = stages.map(s => s.id === updatedStage.id ? updatedStage : s);
      setStages(updatedStages);

      // Save to bảng riêng cac_task_quy_trinh (Sync logic)
      try {
         // 1. Update basic info of stage
         await supabase
            .from(DB_TABLES.WORKFLOW_STAGES)
            .update({
               ten_buoc: updatedStage.name,
               thu_tu: updatedStage.order,
               mau_sac: updatedStage.color || null,
               chi_tiet: updatedStage.details || null,
               tieu_chuan: updatedStage.standards || null,
               cong_viec: [] // Clear JSONB to avoid confusion
            })
            .eq('id', updatedStage.id);

         // 2. Sync Tasks (Delete all and re-insert for this stage)
         // This is a simple strategy to ensure order and consistency
         await supabase
            .from('cac_task_quy_trinh')
            .delete()
            .eq('id_buoc_quy_trinh', updatedStage.id);

         if (updatedStage.todos && updatedStage.todos.length > 0) {
            const tasksToInsert = updatedStage.todos.map((todo, idx) => ({
               id_buoc_quy_trinh: updatedStage.id,
               ten_task: todo.title,
               mo_ta: todo.description,
               thu_tu: idx,
               da_hoan_thanh: todo.completed
            }));

            const { error: insertError } = await supabase
               .from('cac_task_quy_trinh')
               .insert(tasksToInsert);

            if (insertError) throw insertError;
         }
      } catch (error) {
         console.error('Error saving stage:', error);
      }
   };

   return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
         <div className="bg-neutral-900 rounded-xl shadow-2xl border border-neutral-800 w-full max-w-5xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-neutral-800">
               <div>
                  <h2 className="text-xl font-serif font-bold text-slate-100">{workflow.label}</h2>
                  <p className="text-sm text-slate-400 mt-1">{workflow.description || 'Xem chi tiết quy trình'}</p>
               </div>
               <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-full transition-colors text-slate-400">
                  <X size={20} />
               </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
               {/* General Info */}
               <div className="bg-blue-900/10 p-4 rounded-lg border border-blue-900/30">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                     <div>
                        <span className="text-slate-500">Phòng ban:</span>
                        <span className="ml-2 text-slate-300">{workflow.department}</span>
                     </div>
                     <div className="col-span-2">
                        <span className="text-slate-500">Áp dụng cho:</span>
                        <span className="ml-2 text-slate-300">{workflow.types.length > 0 ? workflow.types.join(', ') : 'Tất cả dịch vụ'}</span>
                     </div>
                  </div>
               </div>

               {/* Materials */}
               {workflow.materials && workflow.materials.length > 0 && (
                  <div>
                     <h4 className="font-bold text-slate-200 mb-3 flex items-center gap-2">
                        <Package size={18} className="text-gold-500" />
                        Nguyên Vật Liệu ({workflow.materials.length})
                     </h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {workflow.materials.map((mat, idx) => {
                           const item = (inventory || []).find(inv => inv.id === mat.itemId || inv.id === mat.inventoryItemId);
                           return (
                              <div key={idx} className="bg-neutral-800/30 p-3 rounded-lg border border-neutral-800">
                                 <div className="flex justify-between items-start">
                                    <span className="text-sm text-slate-300 font-medium">{item?.name || mat.itemId}</span>
                                    <span className="text-xs text-slate-500">{mat.quantity.toLocaleString('vi-VN')} {item?.unit || ''}</span>
                                 </div>
                              </div>
                           );
                        })}
                     </div>
                  </div>
               )}

               {/* Stages with Tasks */}
               <div>
                  <h4 className="font-bold text-slate-200 mb-4 flex items-center gap-2">
                     <Columns size={18} className="text-gold-500" />
                     Các Bước Xử Lý ({stages.length})
                  </h4>

                  {stages.length === 0 ? (
                     <div className="text-center py-8 text-slate-600 text-sm border border-dashed border-neutral-800 rounded-lg">
                        Chưa có bước nào được cấu hình
                     </div>
                  ) : (
                     <div className="space-y-3">
                        {stages.sort((a, b) => a.order - b.order).map((stage, idx) => (
                           <StageItemWithTodos
                              key={stage.id}
                              stage={stage}
                              idx={idx}
                              totalStages={stages.length}
                              onMoveUp={() => { }}
                              onMoveDown={() => { }}
                              onDelete={() => { }}
                              onUpdate={handleUpdateStage}
                           />
                        ))}
                     </div>
                  )}
               </div>

               {/* Assigned Members */}
               {workflow.assignedMembers && workflow.assignedMembers.length > 0 && (
                  <div>
                     <h4 className="font-bold text-slate-200 mb-3 flex items-center gap-2">
                        <Users size={18} className="text-gold-500" />
                        Nhân Sự Phụ Trách ({workflow.assignedMembers.length})
                     </h4>
                     <div className="flex flex-wrap gap-2">
                        {workflow.assignedMembers.map(memberId => {
                           const member = (members || []).find(m => m.id === memberId);
                           if (!member) return null;
                           return (
                              <div
                                 key={memberId}
                                 className="px-3 py-2 bg-neutral-800/50 border border-neutral-700 rounded-lg"
                              >
                                 <div className="text-sm font-medium text-slate-200">{member.name}</div>
                                 <div className="text-xs text-slate-500">{member.role}</div>
                              </div>
                           );
                        })}
                     </div>
                  </div>
               )}
            </div>

            <div className="border-t border-neutral-800 p-4">
               <button
                  onClick={onClose}
                  className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-slate-300 rounded-lg font-medium transition-colors"
               >
                  Đóng
               </button>
            </div>
         </div>
      </div>
   );
};

// --- Sub-component: Config Modal ---
// WorkflowConfigModal đã được chuyển sang component riêng WorkflowConfig.tsx