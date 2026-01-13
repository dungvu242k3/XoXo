import { Columns, Package, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '../context';
import { DB_TABLES, supabase } from '../supabase';
import { Member, WorkflowDefinition, WorkflowMaterial, WorkflowStage } from '../types';
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
               .select('id, ten_quy_trinh, mo_ta, phong_ban_phu_trach, loai_ap_dung, vat_tu_can_thiet')
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
               .select('id, id_quy_trinh, ten_buoc, thu_tu, chi_tiet, tieu_chuan, nhan_vien_duoc_giao')
               .eq('id_quy_trinh', id)
               .order('thu_tu', { ascending: true });

            if (stagesError) throw stagesError;

            // Load tasks cho tất cả các stages
            const stageIds = (stagesData || []).map((s: any) => s.id);
            let tasksData: any[] = [];

            if (stageIds.length > 0) {
               const { data: tasks, error: tasksError } = await supabase
                  .from(DB_TABLES.WORKFLOW_TASKS)
                  .select('*')
                  .in('id_buoc_quy_trinh', stageIds)
                  .order('thu_tu', { ascending: true });

               if (!tasksError && tasks) {
                  tasksData = tasks;
               }
            }

            // Group tasks by stage id
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

            // Map to WorkflowDefinition
            const workflowDef: WorkflowDefinition = {
               id: workflowData.id,
               label: workflowData.ten_quy_trinh || '',
               description: workflowData.mo_ta || '',
               department: workflowData.phong_ban_phu_trach || 'ky_thuat',
               types: workflowData.loai_ap_dung || [],
               materials: workflowData.vat_tu_can_thiet || undefined,
               color: 'bg-slate-500', // Default color for UI compat
               stages: (stagesData || []).map((stage: any) => ({
                  id: stage.id,
                  name: stage.ten_buoc,
                  order: stage.thu_tu,
                  details: stage.chi_tiet || undefined,
                  standards: stage.tieu_chuan || undefined,
                  todos: tasksByStage[stage.id] || undefined,
                  assignedMembers: stage.nhan_vien_duoc_giao || undefined
               }))
            };

            setWorkflow(workflowDef);
            setMaterials(workflowDef.materials || []);
            setStages(workflowDef.stages || []);
            setWorkflowDepartment(workflowDef.department);
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
         setIsLoading(true); // Show loading while saving

         // Map department name to enum value
         const departmentMap: Record<string, string> = {
            'Kỹ Thuật': 'ky_thuat',
            'Spa': 'spa',
            'QA/QC': 'qc',
            'Hậu Cần': 'hau_can',
            'Kinh Doanh': 'kinh_doanh',
            'Quản Lý': 'quan_ly'
         };

         // 1. Cập nhật thông tin chung của quy trình
         const updatedWorkflow: any = {
            ten_quy_trinh: workflow.label,
            phong_ban_phu_trach: departmentMap[workflowDepartment] || 'ky_thuat',
            loai_ap_dung: workflow.types || []
         };

         if (workflow.description) updatedWorkflow.mo_ta = workflow.description;
         if (materials.length > 0) updatedWorkflow.vat_tu_can_thiet = materials;

         const { error: wfError } = await supabase
            .from(DB_TABLES.WORKFLOWS)
            .update(updatedWorkflow)
            .eq('id', workflow.id);

         if (wfError) throw wfError;

         // 2. Cập nhật các bước (Stages) và Công việc (Tasks)
         // Cách an toàn nhất: Xóa và tạo lại (vì order có thể thay đổi phức tạp)

         // Xóa tất cả các bước cũ (Tasks sẽ bị xóa tự động do ON DELETE CASCADE)
         const { error: deleteError } = await supabase
            .from(DB_TABLES.WORKFLOW_STAGES)
            .delete()
            .eq('id_quy_trinh', workflow.id);

         if (deleteError) throw deleteError;

         // Insert các bước mới
         if (stages.length > 0) {
            const stagesToInsert = stages.map((stage, index) => ({
               id_quy_trinh: workflow.id,
               ten_buoc: stage.name,
               thu_tu: index, // Sử dụng index hiện tại để đảm bảo thứ tự
               chi_tiet: stage.details || null,
               tieu_chuan: stage.standards || null,
               nhan_vien_duoc_giao: (stage.assignedMembers && Array.isArray(stage.assignedMembers)) ? stage.assignedMembers : []
            }));

            const { data: insertedStages, error: stagesError } = await supabase
               .from(DB_TABLES.WORKFLOW_STAGES)
               .insert(stagesToInsert)
               .select();

            if (stagesError) throw stagesError;

            // 3. Lưu các tasks cho từng bước
            if (insertedStages && insertedStages.length > 0) {
               const allTasksToInsert: any[] = [];

               // Duyệt qua các bước đã insert để lấy ID thực tế từ database
               insertedStages.forEach((insertedStage: any) => {
                  // Tìm stage tương ứng trong state để lấy danh sách todos
                  // Chúng ta khớp bằng tên và thứ tự (an toàn nhất trong trường hợp này)
                  const originalStage = stages.find(s =>
                     s.name === insertedStage.ten_buoc &&
                     (stages.indexOf(s) === insertedStage.thu_tu)
                  );

                  if (originalStage && originalStage.todos && originalStage.todos.length > 0) {
                     originalStage.todos.forEach((todo, tIdx) => {
                        allTasksToInsert.push({
                           id_buoc_quy_trinh: insertedStage.id,
                           ten_task: todo.title,
                           mo_ta: todo.description || null,
                           thu_tu: tIdx,
                           da_hoan_thanh: todo.completed || false
                        });
                     });
                  }
               });

               if (allTasksToInsert.length > 0) {
                  const { error: tasksError } = await supabase
                     .from(DB_TABLES.WORKFLOW_TASKS)
                     .insert(allTasksToInsert);

                  if (tasksError) throw tasksError;
               }
            }
         }

         alert(`Đã lưu cấu hình quy trình thành công!\n\n- Vật tư: ${materials.length}\n- Các bước: ${stages.length}\n- Đã cập nhật vào Supabase.`);
         navigate('/workflows');
      } catch (error: any) {
         console.error('Lỗi khi lưu cấu hình:', error);
         alert('Lỗi khi lưu cấu hình: ' + (error.message || String(error)));
      } finally {
         setIsLoading(false);
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

