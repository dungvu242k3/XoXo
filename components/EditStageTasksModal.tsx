import React, { useState, useEffect } from 'react';
import { Edit2, X, Info, CheckCircle2, Circle, Plus } from 'lucide-react';
import { WorkflowDefinition, TodoStep } from '../types';
import { supabase, DB_TABLES } from '../supabase';

interface EditStageTasksModalProps {
    stageId: string;
    stageName: string;
    currentWorkflow: WorkflowDefinition | undefined;
    onClose: () => void;
}

export const EditStageTasksModal: React.FC<EditStageTasksModalProps> = ({
    stageId,
    stageName,
    currentWorkflow,
    onClose
}) => {
    const stage = currentWorkflow?.stages?.find(s => s.id === stageId);
    const [stageTasks, setStageTasks] = useState<TodoStep[]>([]);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Load tasks từ bảng cac_task_quy_trinh
    const loadTasks = React.useCallback(async () => {
        if (!stageId) {
            console.log('No stageId provided');
            return;
        }
        
        try {
            setIsLoading(true);
            console.log('🔄 Loading tasks for stageId:', stageId);
            console.log('Table name:', DB_TABLES.WORKFLOW_TASKS);
            
            // First, verify the stage exists in database
            const { data: stageData, error: stageError } = await supabase
                .from(DB_TABLES.WORKFLOW_STAGES)
                .select('id, ten_buoc')
                .eq('id', stageId)
                .single();
            
            if (stageError || !stageData) {
                console.error('Stage not found in database:', stageError);
                console.log('StageId:', stageId);
                const { data: allStages } = await supabase.from(DB_TABLES.WORKFLOW_STAGES).select('id, ten_buoc');
                console.log('Available stages:', allStages);
            } else {
                console.log('✅ Stage found in database:', stageData);
            }
            
            const { data, error } = await supabase
                .from(DB_TABLES.WORKFLOW_TASKS)
                .select('*')
                .eq('id_buoc_quy_trinh', stageId)
                .order('thu_tu', { ascending: true });

            if (error) {
                console.error('❌ Error loading tasks:', error);
                console.error('Error details:', {
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code
                });
                throw error;
            }

            console.log('✅ Tasks loaded from database:', data);
            console.log('📊 Total tasks:', data?.length || 0);

            // Map từ database format sang TodoStep format
            const tasks: TodoStep[] = (data || []).map((task: any) => ({
                id: task.id,
                title: task.ten_task,
                description: task.mo_ta || undefined,
                completed: task.da_hoan_thanh || false,
                order: task.thu_tu || 0
            }));

            setStageTasks(tasks);
            console.log('✅ Tasks state updated:', tasks.length, 'tasks');
        } catch (error) {
            console.error('❌ Error loading tasks:', error);
            // Fallback to stage.todos nếu có
            setStageTasks(stage?.todos || []);
        } finally {
            setIsLoading(false);
        }
    }, [stageId, stage]);

    useEffect(() => {
        loadTasks();

        // Subscribe to realtime changes
        const channel = supabase
            .channel(`tasks-${stageId}`)
            .on(
                'postgres_changes',
                {
                    event: '*', // INSERT, UPDATE, DELETE
                    schema: 'public',
                    table: DB_TABLES.WORKFLOW_TASKS,
                    filter: `id_buoc_quy_trinh=eq.${stageId}`
                },
                (payload) => {
                    console.log('🔔 Realtime change received:', payload);
                    console.log('Event type:', payload.eventType);
                    console.log('New record:', payload.new);
                    console.log('Old record:', payload.old);
                    
                    // Reload tasks when there's a change
                    console.log('🔄 Reloading tasks due to realtime change...');
                    loadTasks();
                }
            )
            .subscribe((status) => {
                console.log('📡 Realtime subscription status:', status);
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Subscribed to realtime changes for tasks');
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('❌ Realtime subscription error');
                } else if (status === 'TIMED_OUT') {
                    console.warn('⏱️ Realtime subscription timed out');
                } else if (status === 'CLOSED') {
                    console.warn('🔒 Realtime subscription closed');
                }
            });

        // Cleanup subscription on unmount
        return () => {
            console.log('🔌 Unsubscribing from realtime changes');
            supabase.removeChannel(channel);
        };
    }, [stageId, stage, loadTasks]);

    const handleAddTask = async () => {
        if (!newTaskTitle.trim() || !stageId) {
            alert('Vui lòng nhập tên task!');
            return;
        }

        try {
            setIsSaving(true);
            
            console.log('=== INSERTING TASK ===');
            console.log('Table:', DB_TABLES.WORKFLOW_TASKS);
            console.log('Stage ID:', stageId);
            console.log('Stage ID type:', typeof stageId);
            console.log('Stage ID length:', stageId?.length);
            console.log('Task title:', newTaskTitle.trim());
            console.log('Current tasks count:', stageTasks.length);
            
            // Kiểm tra xem stageId có tồn tại trong database không
            const { data: stageCheck, error: stageCheckError } = await supabase
                .from(DB_TABLES.WORKFLOW_STAGES)
                .select('id, ten_buoc')
                .eq('id', stageId)
                .single();
            
            if (stageCheckError || !stageCheck) {
                console.error('Stage not found!', stageCheckError);
                alert(`Lỗi: Không tìm thấy stage với ID: ${stageId}\n\nVui lòng kiểm tra lại stage ID.`);
                return;
            }
            
            console.log('Stage found:', stageCheck);
            
            // Insert vào bảng cac_task_quy_trinh
            const insertData = {
                id_buoc_quy_trinh: stageId,
                ten_task: newTaskTitle.trim(),
                mo_ta: null,
                thu_tu: stageTasks.length,
                da_hoan_thanh: false
            };
            
            console.log('Insert data:', insertData);
            
            let data, error;
            try {
                const result = await supabase
                    .from(DB_TABLES.WORKFLOW_TASKS)
                    .insert(insertData)
                    .select()
                    .single();
                data = result.data;
                error = result.error;
            } catch (fetchError: any) {
                // Bắt lỗi network/fetch
                console.error('=== NETWORK/FETCH ERROR ===');
                console.error('Fetch error:', fetchError);
                console.error('Error name:', fetchError?.name);
                console.error('Error message:', fetchError?.message);
                console.error('Error stack:', fetchError?.stack);
                
                const networkErrorMsg = `Lỗi kết nối đến Supabase:\n\n` +
                    `Message: ${fetchError?.message || 'Failed to fetch'}\n` +
                    `Type: ${fetchError?.name || 'NetworkError'}\n\n` +
                    `Có thể do:\n` +
                    `- Mất kết nối internet\n` +
                    `- Supabase service đang down\n` +
                    `- Firewall/Proxy chặn kết nối\n` +
                    `- URL Supabase không đúng\n\n` +
                    `Vui lòng:\n` +
                    `1. Kiểm tra kết nối internet\n` +
                    `2. Thử lại sau vài giây\n` +
                    `3. Kiểm tra Supabase Dashboard\n` +
                    `4. Kiểm tra console để xem chi tiết`;
                
                alert(networkErrorMsg);
                throw fetchError;
            }

            if (error) {
                console.error('=== SUPABASE INSERT ERROR ===');
                console.error('Error object:', error);
                console.error('Error message:', error.message);
                console.error('Error details:', error.details);
                console.error('Error hint:', error.hint);
                console.error('Error code:', error.code);
                
                const errorMsg = `Lỗi khi lưu task vào database:\n\n` +
                    `Message: ${error.message || 'Không có thông báo'}\n` +
                    `Code: ${error.code || 'N/A'}\n` +
                    `${error.details ? `Details: ${error.details}\n` : ''}` +
                    `${error.hint ? `Hint: ${error.hint}\n` : ''}` +
                    `\nStage ID: ${stageId}\n` +
                    `Task title: ${newTaskTitle.trim()}`;
                
                alert(errorMsg);
                throw error;
            }

            console.log('=== TASK INSERTED SUCCESSFULLY ===');
            console.log('Inserted data:', data);
            console.log('Task ID:', data.id);
            console.log('Stage ID:', data.id_buoc_quy_trinh);
            console.log('Task name:', data.ten_task);

            // Verify task was actually saved by querying it back
            const { data: verifyData, error: verifyError } = await supabase
                .from(DB_TABLES.WORKFLOW_TASKS)
                .select('*')
                .eq('id', data.id)
                .single();
            
            if (verifyError || !verifyData) {
                console.error('⚠️ WARNING: Task was inserted but cannot be verified!', verifyError);
                alert(`⚠️ Cảnh báo: Task đã được insert nhưng không thể verify lại.\n\nVui lòng kiểm tra database.`);
            } else {
                console.log('✅ Task verified in database:', verifyData);
            }

            // Reload tasks từ database để đảm bảo đồng bộ
            console.log('🔄 Reloading tasks from database...');
            await loadTasks();
            
            setNewTaskTitle('');
            setIsAdding(false);

            console.log('✅ Task added and reloaded successfully!');
            alert(`Đã thêm task thành công!\n\nTask ID: ${data.id}\nStage ID: ${data.id_buoc_quy_trinh}`);
        } catch (error: any) {
            console.error('=== GENERAL ERROR ===');
            console.error('Error:', error);
            const errorMessage = error?.message || String(error);
            alert(`Lỗi không xác định:\n${errorMessage}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!window.confirm('Bạn có chắc muốn xóa task này?')) return;

        const taskToDelete = stageTasks.find(t => t.id === taskId);
        if (!taskToDelete) return;

        // Optimistic update
        const updatedTasks = stageTasks.filter(t => t.id !== taskId);
        setStageTasks(updatedTasks);

        try {
            setIsSaving(true);
            
            // Delete từ bảng cac_task_quy_trinh
            const { error } = await supabase
                .from(DB_TABLES.WORKFLOW_TASKS)
                .delete()
                .eq('id', taskId);

            if (error) throw error;

            // Cập nhật lại thứ tự các task còn lại
            const updatePromises = updatedTasks.map((task, index) =>
                supabase
                    .from(DB_TABLES.WORKFLOW_TASKS)
                    .update({ thu_tu: index })
                    .eq('id', task.id)
            );

            await Promise.all(updatePromises);

            console.log('Task deleted successfully!');
        } catch (error) {
            console.error('Error deleting task:', error);
            alert('Lỗi khi xóa task. Vui lòng thử lại.');
            // Rollback
            setStageTasks(stageTasks);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-neutral-900 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border border-neutral-800">
                {/* Header */}
                <div className="p-5 border-b border-neutral-800 flex justify-between items-center bg-neutral-900">
                    <div>
                        <h3 className="font-bold text-lg text-slate-100 flex items-center gap-2">
                            <Edit2 size={20} className="text-gold-500" />
                            Chỉnh sửa Tasks - {stageName}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                            {currentWorkflow ? `Quy trình: ${currentWorkflow.label}` : 'Xem các task mặc định của bước này'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-neutral-800 rounded-full transition-colors text-slate-400"
                        disabled={isSaving}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {isLoading ? (
                        <div className="text-center py-8 text-slate-500">
                            <p>Đang tải tasks...</p>
                        </div>
                    ) : !currentWorkflow || !stage ? (
                        <div className="text-center py-8 text-slate-500">
                            <Info size={48} className="mx-auto mb-3 opacity-20" />
                            <p>Không tìm thấy thông tin quy trình hoặc bước này.</p>
                            <p className="text-xs mt-2">Vui lòng chọn một quy trình cụ thể để xem tasks.</p>
                        </div>
                    ) : (
                        <>
                            {/* Add Task Section */}
                            <div className="mb-4">
                                {isAdding ? (
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newTaskTitle}
                                            onChange={(e) => setNewTaskTitle(e.target.value)}
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter') handleAddTask();
                                                if (e.key === 'Escape') {
                                                    setIsAdding(false);
                                                    setNewTaskTitle('');
                                                }
                                            }}
                                            placeholder="Nhập tên task..."
                                            className="flex-1 px-3 py-2 border border-neutral-700 rounded-lg text-sm outline-none focus:border-gold-500 bg-neutral-800 text-slate-200"
                                            autoFocus
                                            disabled={isSaving}
                                        />
                                        <button
                                            onClick={handleAddTask}
                                            disabled={!newTaskTitle.trim() || isSaving}
                                            className="px-4 py-2 bg-gold-600 hover:bg-gold-700 disabled:bg-neutral-700 disabled:text-slate-500 text-black rounded-lg text-sm font-medium transition-colors"
                                        >
                                            {isSaving ? 'Đang lưu...' : 'Thêm'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsAdding(false);
                                                setNewTaskTitle('');
                                            }}
                                            disabled={isSaving}
                                            className="px-4 py-2 border border-neutral-700 rounded-lg text-slate-400 hover:bg-neutral-800 text-sm font-medium"
                                        >
                                            Hủy
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setIsAdding(true)}
                                        disabled={isSaving}
                                        className="w-full py-2 border-2 border-dashed border-neutral-700 hover:border-gold-500 rounded-lg text-slate-400 hover:text-gold-500 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Plus size={16} />
                                        Thêm Task Mới
                                    </button>
                                )}
                            </div>

                            {/* Tasks List */}
                            {stageTasks.length === 0 ? (
                                <div className="text-center py-8 text-slate-500">
                                    <CheckCircle2 size={48} className="mx-auto mb-3 opacity-20" />
                                    <p>Chưa có task nào được định nghĩa cho bước này.</p>
                                    <p className="text-xs mt-2">Nhấn "Thêm Task Mới" để bắt đầu.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-sm font-medium text-slate-400">Danh sách Tasks ({stageTasks.length})</h4>
                                    </div>
                                    {stageTasks.sort((a, b) => a.order - b.order).map((task, idx) => (
                                        <div
                                            key={task.id}
                                            className="flex items-center gap-3 p-3 bg-neutral-800/50 rounded-lg border border-neutral-800 group"
                                        >
                                            <div className="flex-shrink-0">
                                                {task.completed ? (
                                                    <CheckCircle2 size={16} className="text-emerald-500" />
                                                ) : (
                                                    <Circle size={16} className="text-slate-600" />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-mono text-slate-600">#{idx + 1}</span>
                                                    <span className={`text-sm ${task.completed ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                                                        {task.title}
                                                    </span>
                                                </div>
                                                {task.description && (
                                                    <p className="text-xs text-slate-500 mt-1">{task.description}</p>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => handleDeleteTask(task.id)}
                                                disabled={isSaving}
                                                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-900/20 rounded text-slate-600 hover:text-red-500 transition-all"
                                                title="Xóa task"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Stage Details */}
                            {stage && (stage.details || stage.standards) && (
                                <div className="mt-6 pt-6 border-t border-neutral-800">
                                    <h4 className="text-sm font-medium text-slate-400 mb-3">Thông tin bước</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {stage.details && (
                                            <div>
                                                <p className="text-xs font-medium text-slate-500 mb-1">Chi tiết:</p>
                                                <p className="text-xs text-slate-300 bg-neutral-800/30 p-2 rounded">{stage.details}</p>
                                            </div>
                                        )}
                                        {stage.standards && (
                                            <div>
                                                <p className="text-xs font-medium text-slate-500 mb-1">Tiêu chuẩn:</p>
                                                <p className="text-xs text-slate-300 bg-neutral-800/30 p-2 rounded">{stage.standards}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-neutral-800 bg-neutral-900 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isSaving}
                        className="px-4 py-2 border border-neutral-700 rounded-lg text-slate-400 hover:bg-neutral-800 text-sm font-medium disabled:opacity-50"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
};
