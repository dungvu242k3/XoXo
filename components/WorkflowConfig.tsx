import { Columns, Package, Users, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '../context';
import { DB_TABLES, supabase } from '../supabase';
import { Member, TodoStep, WorkflowDefinition, WorkflowMaterial, WorkflowStage } from '../types';
import { StageItemWithTodos } from './Workflows';

// Helper functions
const getDepartmentFromRole = (role: string): string => {
   const roleMap: Record<string, string> = {
      'Quản lý': 'Quản Lý',
      'Tư vấn viên': 'Kinh Doanh',
      'Kỹ thuật viên': 'Kỹ Thuật',
      'QC': 'QA/QC'
   };
   return roleMap[role] || 'Kỹ Thuật';
};

const getDepartmentsFromMembers = (members: Member[]): string[] => {
   const depts = new Set<string>();
   members.forEach(m => {
      const dept = m.department || getDepartmentFromRole(m.role);
      depts.add(dept);
   });
   return Array.from(depts).sort();
};

export const WorkflowConfig: React.FC = () => {
   const { id } = useParams<{ id: string }>();
   const navigate = useNavigate();
   const { inventory, members } = useAppStore();
   const [workflow, setWorkflow] = useState<WorkflowDefinition | null>(null);
   const [isLoading, setIsLoading] = useState(true);
   const [materials, setMaterials] = useState<WorkflowMaterial[]>([]);
   const [selectedInventoryId, setSelectedInventoryId] = useState('');
   const [quantity, setQuantity] = useState('');
   const [stages, setStages] = useState<WorkflowStage[]>([]);
   const [newStageName, setNewStageName] = useState('');
   const [newStageColor, setNewStageColor] = useState('bg-slate-500');
   const [assignedMembers, setAssignedMembers] = useState<string[]>([]);
   const [memberSearchText, setMemberSearchText] = useState('');
   const [workflowDepartment, setWorkflowDepartment] = useState<WorkflowDefinition['department']>('Kỹ Thuật');

   // Load workflow from Supabase
   useEffect(() => {
      const loadWorkflow = async () => {
         if (!id) {
            navigate('/workflows');
            return;
         }

         try {
            setIsLoading(true);

            // Load workflow
            const { data: workflowData, error: workflowError } = await supabase
               .from(DB_TABLES.WORKFLOWS)
               .select('id, ten_quy_trinh, mo_ta, phong_ban_phu_trach, loai_ap_dung, mau_sac, vat_tu_can_thiet, nhan_vien_duoc_giao')
               .eq('id', id)
               .single();

            if (workflowError) throw workflowError;
            if (!workflowData) {
               alert('Không tìm thấy quy trình!');
               navigate('/workflows');
               return;
            }

            // Load stages
            const { data: stagesData, error: stagesError } = await supabase
               .from(DB_TABLES.WORKFLOW_STAGES)
               .select('id, id_quy_trinh, ten_buoc, thu_tu, mau_sac, chi_tiet, tieu_chuan, cong_viec')
               .eq('id_quy_trinh', id)
               .order('thu_tu', { ascending: true });

            if (stagesError) throw stagesError;

            // Load tasks (todos) from separate table
            // Get all stage IDs first
            const stageIds = (stagesData || []).map((s: any) => s.id);
            let tasksByStage: Record<string, TodoStep[]> = {};

            if (stageIds.length > 0) {
               const { data: tasksData, error: tasksError } = await supabase
                  .from('cac_task_quy_trinh')
                  .select('*')
                  .in('id_buoc_quy_trinh', stageIds)
                  .order('thu_tu', { ascending: true });

               if (tasksError) {
                  console.error('Error loading tasks:', tasksError);
               } else {
                  // Group tasks by stage
                  (tasksData || []).forEach((task: any) => {
                     if (!tasksByStage[task.id_buoc_quy_trinh]) {
                        tasksByStage[task.id_buoc_quy_trinh] = [];
                     }
                     tasksByStage[task.id_buoc_quy_trinh].push({
                        id: task.id,
                        title: task.ten_task,
                        description: task.mo_ta,
                        completed: task.da_hoan_thanh,
                        order: task.thu_tu
                     });
                  });
               }
            }

            // Map DB department (snake_case) to UI department (Capitalized)
            const REVERSE_DEPARTMENT_MAP: Record<string, string> = {
               'ky_thuat': 'Kỹ Thuật',
               'spa': 'Spa',
               'qc': 'QA/QC',
               'hau_can': 'Hậu Cần',
               'quan_ly': 'Quản Lý',
               'kinh_doanh': 'Kinh Doanh'
            };

            const dbDept = workflowData.phong_ban_phu_trach || 'ky_thuat';
            const uiDept = REVERSE_DEPARTMENT_MAP[dbDept] || 'Kỹ Thuật';

            // Map to WorkflowDefinition
            const workflowDef: WorkflowDefinition = {
               id: workflowData.id,
               label: workflowData.ten_quy_trinh || '',
               description: workflowData.mo_ta || '',
               department: uiDept as any,
               types: workflowData.loai_ap_dung || [],
               color: workflowData.mau_sac || 'bg-blue-900/30 text-blue-400 border-blue-800',
               materials: workflowData.vat_tu_can_thiet || undefined,
               stages: (stagesData || []).map((stage: any) => {
                  // Prioritize tasks from table, fallback to JSONB 'cong_viec'
                  const tasks = tasksByStage[stage.id] && tasksByStage[stage.id].length > 0
                     ? tasksByStage[stage.id]
                     : (stage.cong_viec || []);

                  return {
                     id: stage.id,
                     name: stage.ten_buoc,
                     order: stage.thu_tu ?? 0,
                     color: stage.mau_sac || undefined,
                     details: stage.chi_tiet || undefined,
                     standards: stage.tieu_chuan || undefined,
                     todos: tasks
                  };
               }),
               assignedMembers: workflowData.nhan_vien_duoc_giao || undefined
            };

            setWorkflow(workflowDef);
            setMaterials(workflowDef.materials || []);
            setStages(workflowDef.stages || []);
            const assignedMemberIds = workflowDef.assignedMembers || [];
            setAssignedMembers(assignedMemberIds);

            // Tự động set phòng ban từ nhân sự được gán
            if (assignedMemberIds.length > 0 && members && members.length > 0) {
               const firstAssignedMember = members.find(m => assignedMemberIds.includes(m.id));
               if (firstAssignedMember) {
                  const memberDept = firstAssignedMember.department || getDepartmentFromRole(firstAssignedMember.role);
                  if (memberDept) {
                     setWorkflowDepartment(memberDept as WorkflowDefinition['department']);
                  } else {
                     setWorkflowDepartment(workflowDef.department);
                  }
               } else {
                  setWorkflowDepartment(workflowDef.department);
               }
            } else {
               setWorkflowDepartment(workflowDef.department);
            }
         } catch (error) {
            console.error('Error loading workflow:', error);
            alert('Lỗi khi tải quy trình: ' + (error as Error).message);
            navigate('/workflows');
         } finally {
            setIsLoading(false);
         }
      };

      loadWorkflow();
   }, [id, navigate, members]);

   // Helper to find inventory details
   const getInventoryItem = (itemId: string) => (inventory || []).find(i => i.id === itemId);

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
      if (!workflow) return;

      try {
         // Tự động chọn màu dựa trên phòng ban
         const departmentColors: Record<string, string> = {
            'Kỹ Thuật': 'bg-blue-900/30 text-blue-400 border-blue-800',
            'Spa': 'bg-purple-900/30 text-purple-400 border-purple-800',
            'QA/QC': 'bg-emerald-900/30 text-emerald-400 border-emerald-800',
            'Hậu Cần': 'bg-orange-900/30 text-orange-400 border-orange-800',
            'Quản Lý': 'bg-gold-900/30 text-gold-400 border-gold-800',
            'Kinh Doanh': 'bg-cyan-900/30 text-cyan-400 border-cyan-800'
         };

         // Map department name to enum value
         const departmentMap: Record<string, string> = {
            'Kỹ Thuật': 'ky_thuat',
            'Spa': 'spa',
            'QA/QC': 'qc',
            'Hậu Cần': 'hau_can'
         };

         // Cập nhật quy trình
         const updatedWorkflow: any = {
            ten_quy_trinh: workflow.label,
            phong_ban_phu_trach: departmentMap[workflowDepartment] || 'ky_thuat',
            mau_sac: departmentColors[workflowDepartment] || workflow.color || 'bg-blue-900/30 text-blue-400 border-blue-800',
            loai_ap_dung: workflow.types || []
         };

         if (workflow.description) updatedWorkflow.mo_ta = workflow.description;
         if (materials.length > 0) updatedWorkflow.vat_tu_can_thiet = materials;
         if (assignedMembers.length > 0) updatedWorkflow.nhan_vien_duoc_giao = assignedMembers;

         // Lưu vào Supabase
         const { error } = await supabase
            .from(DB_TABLES.WORKFLOWS)
            .update(updatedWorkflow)
            .eq('id', workflow.id);

         if (error) throw error;

         // Cập nhật các bước vào bảng riêng
         if (stages.length > 0) {
            // 1. Xóa tất cả stages cũ (Cascade sẽ xóa tasks cũ)
            await supabase
               .from(DB_TABLES.WORKFLOW_STAGES)
               .delete()
               .eq('id_quy_trinh', workflow.id);

            // 2. Insert stages mới
            const stagesToInsert = stages.map((stage, index) => ({
               id_quy_trinh: workflow.id,
               // Giữ nguyên ID nếu có để tránh mất link (nếu cần), hoặc để DB tự tạo nếu là mới
               // Tuy nhiên ở đây ta đang xóa hết insert lại nên ID cũ sẽ mất tác dụng nếu không custom
               // Để đơn giản và map được task, ta sẽ tự generate ID hoặc dùng ID từ state nếu nó hợp lệ (uuid)
               // Ở giao diện ta đang dùng name-based ID hoặc random, tốt nhất để DB tự sinh hoặc dùng UUID
               // Nhưng ta cần ID để insert Tasks. Vậy ta sẽ tạo UUID ở client cho Stage
               ten_buoc: stage.name,
               thu_tu: stage.order !== undefined ? stage.order : index,
               mau_sac: stage.color || null,
               chi_tiet: stage.details || null,
               tieu_chuan: stage.standards || null,
               cong_viec: [] // Không lưu JSON nữa
            }));

            // Insert và lấy lại ID
            const { data: insertedStages, error: stagesError } = await supabase
               .from(DB_TABLES.WORKFLOW_STAGES)
               .insert(stagesToInsert)
               .select('id, ten_buoc');

            if (stagesError) throw stagesError;

            // 3. Insert Tasks vào bảng cac_task_quy_trinh
            // Cần map đúng task vào stage. Vì ta xóa đi tạo lại, thứ tự insert và trả về có thể khác nhau?
            // Cách an toàn: Insert từng stage một và insert task của nó ngay lập tức.
            // Hoặc: Insert all stages, rồi dựa vào 'ten_buoc' (nếu unique trong quy trình) để map.
            // 'ten_buoc' có thể trùng? UI cho phép trùng tên? Tốt nhất là insert tuần tự để chắc chắn.
         }

         // RE-IMPLEMENTATION: Insert Sequential to Keep Logic Simple and Safe
         // Xóa cũ trước
         await supabase.from(DB_TABLES.WORKFLOW_STAGES).delete().eq('id_quy_trinh', workflow.id);

         // Insert từng cái
         for (const [index, stage] of stages.entries()) {
            const stageData = {
               id_quy_trinh: workflow.id,
               ten_buoc: stage.name,
               thu_tu: stage.order ?? index,
               mau_sac: stage.color,
               chi_tiet: stage.details,
               tieu_chuan: stage.standards,
               cong_viec: [] // Clear JSON
            };

            const { data: newStage, error: stageErr } = await supabase
               .from(DB_TABLES.WORKFLOW_STAGES)
               .insert(stageData)
               .select('id')
               .single();

            if (stageErr) throw stageErr;

            // Insert Tasks for this stage
            if (stage.todos && stage.todos.length > 0) {
               const tasksToInsert = stage.todos.map((todo, tIndex) => ({
                  id_buoc_quy_trinh: newStage.id,
                  ten_task: todo.title,
                  mo_ta: todo.description,
                  thu_tu: tIndex,
                  da_hoan_thanh: todo.completed
               }));

               const { error: tasksErr } = await supabase
                  .from('cac_task_quy_trinh')
                  .insert(tasksToInsert);

               if (tasksErr) {
                  console.error('Lỗi khi lưu tasks cho stage:', newStage.id, tasksErr);
                  throw tasksErr;
               }
            }
         }

         alert(`Đã lưu cấu hình quy trình!\n\n- Vật tư: ${materials.length} loại\n- Các bước: ${stages.length} bước\n\nĐã lưu vào Supabase!`);
         navigate('/workflows');
      } catch (error: any) {
         console.error('Lỗi khi lưu cấu hình:', error);
         const errorMessage = error?.message || String(error);
         alert('Lỗi khi lưu cấu hình vào Supabase:\n' + errorMessage + '\n\nVui lòng kiểm tra kết nối Supabase và thử lại.');
      }
   };

   if (isLoading) {
      return (
         <div className="flex items-center justify-center h-screen">
            <div className="text-slate-400">Đang tải...</div>
         </div>
      );
   }

   if (!workflow) {
      return (
         <div className="flex items-center justify-center h-screen">
            <div className="text-slate-400">Không tìm thấy quy trình</div>
         </div>
      );
   }

   return (
      <div className="min-h-screen bg-neutral-950 text-slate-300 p-6">
         <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
               <div>
                  <h1 className="text-2xl font-bold text-slate-100 mb-1">Cấu Hình Quy Trình</h1>
                  <p className="text-sm text-slate-500">{workflow.label}</p>
               </div>
               <button
                  onClick={() => navigate('/workflows')}
                  className="px-4 py-2 border border-neutral-700 rounded-lg text-slate-400 hover:bg-neutral-800 text-sm font-medium flex items-center gap-2"
               >
                  <X size={18} />
                  Đóng
               </button>
            </div>

            {/* Main Content */}
            <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-6">
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Cột trái */}
                  <div className="space-y-6">
                     {/* 1. General Info */}
                     <div className="bg-blue-900/10 p-4 rounded-lg border border-blue-900/30 text-sm space-y-3">
                        <div>
                           <label className="text-xs font-medium text-slate-500 mb-1 block">
                              Phòng ban
                              <span className="text-[10px] text-slate-600 ml-1">(tự động từ nhân sự được gán)</span>
                           </label>
                           <select
                              value={workflowDepartment}
                              onChange={(e) => {
                                 const dept = e.target.value as WorkflowDefinition['department'];
                                 setWorkflowDepartment(dept);
                                 // Filter assigned members theo phòng ban mới
                                 const membersInDept = (members || []).filter(m => {
                                    const memberDept = m.department || getDepartmentFromRole(m.role);
                                    return memberDept === dept;
                                 });
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
                        <div className="flex justify-between">
                           <span className="text-slate-500">Áp dụng cho:</span>
                           <span className="font-medium text-slate-200">{workflow.types.join(', ') || 'Tất cả'}</span>
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
                                                   const newAssignedMembers = [...assignedMembers, member.id];
                                                   setAssignedMembers(newAssignedMembers);

                                                   // Tự động cập nhật phòng ban từ nhân sự được chọn
                                                   const memberDept = member.department || getDepartmentFromRole(member.role);
                                                   if (memberDept && memberDept !== workflowDepartment) {
                                                      setWorkflowDepartment(memberDept as WorkflowDefinition['department']);
                                                   }
                                                } else {
                                                   const newAssignedMembers = assignedMembers.filter(id => id !== member.id);
                                                   setAssignedMembers(newAssignedMembers);

                                                   // Nếu còn nhân sự được gán, lấy phòng ban từ nhân sự đầu tiên
                                                   if (newAssignedMembers.length > 0) {
                                                      const firstMember = (members || []).find(m => m.id === newAssignedMembers[0]);
                                                      if (firstMember) {
                                                         const firstMemberDept = firstMember.department || getDepartmentFromRole(firstMember.role);
                                                         if (firstMemberDept) {
                                                            setWorkflowDepartment(firstMemberDept as WorkflowDefinition['department']);
                                                         }
                                                      }
                                                   }
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
                                       const memberDept = member.department || getDepartmentFromRole(member.role);
                                       return (
                                          <div
                                             key={memberId}
                                             className="flex items-center gap-2 px-2 py-1 bg-gold-900/20 text-gold-400 border border-gold-800/30 rounded text-xs"
                                          >
                                             {member.name}
                                             <span className="text-[10px] text-slate-500">({memberDept})</span>
                                             <button
                                                onClick={() => {
                                                   const newAssignedMembers = assignedMembers.filter(id => id !== memberId);
                                                   setAssignedMembers(newAssignedMembers);

                                                   // Nếu còn nhân sự được gán, lấy phòng ban từ nhân sự đầu tiên
                                                   if (newAssignedMembers.length > 0) {
                                                      const firstMember = (members || []).find(m => m.id === newAssignedMembers[0]);
                                                      if (firstMember) {
                                                         const firstMemberDept = firstMember.department || getDepartmentFromRole(firstMember.role);
                                                         if (firstMemberDept) {
                                                            setWorkflowDepartment(firstMemberDept as WorkflowDefinition['department']);
                                                         }
                                                      }
                                                   }
                                                }}
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

                        {/* Add Form */}
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

                           {/* Show selected item details preview */}
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

                        {/* List */}
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
                        <h4 className="font-bold text-slate-200 mb-4 flex items-center gap-2">
                           <Columns size={18} className="text-gold-500" />
                           Các Bước Xử Lý (Hiển thị ở Kanban)
                        </h4>

                        {/* Add Stage Form */}
                        <div className="bg-neutral-800/30 p-4 rounded-lg border border-neutral-800 mb-4">
                           <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                              <div className="md:col-span-2">
                                 <label className="text-xs font-medium text-slate-500 mb-1 block">Tên bước</label>
                                 <input
                                    type="text"
                                    value={newStageName}
                                    onChange={(e) => setNewStageName(e.target.value)}
                                    placeholder="VD: Vệ sinh, Sửa chữa, Kiểm tra..."
                                    className="w-full p-2 border border-neutral-700 rounded text-sm outline-none focus:border-gold-500 bg-neutral-900 text-slate-200"
                                 />
                              </div>
                              <div>
                                 <label className="text-xs font-medium text-slate-500 mb-1 block">Màu sắc</label>
                                 <select
                                    value={newStageColor}
                                    onChange={(e) => setNewStageColor(e.target.value)}
                                    className="w-full p-2 border border-neutral-700 rounded text-sm outline-none focus:border-gold-500 bg-neutral-900 text-slate-200"
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

                           <button
                              onClick={() => {
                                 if (!newStageName.trim()) return;
                                 const newStage: WorkflowStage = {
                                    id: newStageName.toLowerCase().replace(/\s+/g, '-'),
                                    name: newStageName,
                                    order: stages.length,
                                    color: newStageColor
                                 };
                                 setStages([...stages, newStage]);
                                 setNewStageName('');
                                 setNewStageColor('bg-slate-500');
                              }}
                              disabled={!newStageName.trim()}
                              className="w-full py-2 bg-slate-100 hover:bg-white disabled:bg-neutral-800 text-black rounded text-sm font-medium transition-colors"
                           >
                              + Thêm Bước
                           </button>
                        </div>

                        {/* Stages List */}
                        <div className="space-y-3">
                           {stages.length === 0 && (
                              <div className="text-center py-4 text-slate-600 text-sm border border-dashed border-neutral-800 rounded-lg">
                                 Chưa có bước nào. Các bước này sẽ hiển thị ở Kanban Board.
                              </div>
                           )}
                           {stages.sort((a, b) => a.order - b.order).map((stage, idx) => (
                              <StageItemWithTodos
                                 key={stage.id}
                                 stage={stage}
                                 idx={idx}
                                 totalStages={stages.length}
                                 onMoveUp={() => {
                                    const newStages = [...stages];
                                    [newStages[idx], newStages[idx - 1]] = [newStages[idx - 1], newStages[idx]];
                                    newStages[idx].order = idx;
                                    newStages[idx - 1].order = idx - 1;
                                    setStages(newStages);
                                 }}
                                 onMoveDown={() => {
                                    const newStages = [...stages];
                                    [newStages[idx], newStages[idx + 1]] = [newStages[idx + 1], newStages[idx]];
                                    newStages[idx].order = idx;
                                    newStages[idx + 1].order = idx + 1;
                                    setStages(newStages);
                                 }}
                                 onDelete={() => {
                                    if (window.confirm(`Xóa bước "${stage.name}"?`)) {
                                       setStages(stages.filter(s => s.id !== stage.id).map((s, i) => ({ ...s, order: i })));
                                    }
                                 }}
                                 onUpdate={(updatedStage) => {
                                    const newStages = [...stages];
                                    newStages[idx] = updatedStage;
                                    setStages(newStages);
                                 }}
                              />
                           ))}
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            {/* Footer Actions */}
            <div className="mt-6 flex justify-end gap-3">
               <button
                  onClick={() => navigate('/workflows')}
                  className="px-6 py-3 border border-neutral-700 rounded-lg text-slate-400 hover:bg-neutral-800 text-sm font-medium"
               >
                  Hủy
               </button>
               <button
                  onClick={handleSave}
                  className="px-6 py-3 bg-gold-600 hover:bg-gold-700 text-black rounded-lg text-sm font-medium shadow-lg shadow-gold-900/20"
               >
                  Lưu Cấu Hình
               </button>
            </div>
         </div>
      </div>
   );
};

