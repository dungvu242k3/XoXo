import React, { useState } from 'react';
import { Edit2, X, Info, CheckCircle2, Circle, Plus } from 'lucide-react';
import { WorkflowDefinition, TodoStep } from '../types';
import { supabase, DB_PATHS } from '../supabase';

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
    const [stageTasks, setStageTasks] = useState<TodoStep[]>(stage?.todos || []);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleAddTask = async () => {
        if (!newTaskTitle.trim() || !currentWorkflow || !stage) return;

        const newTask: TodoStep = {
            id: `todo-${Date.now()}`,
            title: newTaskTitle.trim(),
            completed: false,
            order: stageTasks.length
        };

        const updatedTasks = [...stageTasks, newTask];
        setStageTasks(updatedTasks);
        setNewTaskTitle('');
        setIsAdding(false);

        // Save to Firebase
        try {
            setIsSaving(true);
            const updatedStages = currentWorkflow.stages?.map(s =>
                s.id === stageId ? { ...s, todos: updatedTasks } : s
            );

            const { error } = await supabase
                .from(DB_PATHS.WORKFLOWS)
                .update({ stages: updatedStages })
                .eq('id', currentWorkflow.id);
            if (error) throw error;

            console.log('Task added successfully!');
        } catch (error) {
            console.error('Error saving task:', error);
            alert('Lỗi khi lưu task. Vui lòng thử lại.');
            // Rollback
            setStageTasks(stageTasks.filter(t => t.id !== newTask.id));
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!currentWorkflow || !stage) return;
        if (!window.confirm('Bạn có chắc muốn xóa task này?')) return;

        const updatedTasks = stageTasks.filter(t => t.id !== taskId).map((t, i) => ({ ...t, order: i }));
        setStageTasks(updatedTasks);

        // Save to Firebase
        try {
            setIsSaving(true);
            const updatedStages = currentWorkflow.stages?.map(s =>
                s.id === stageId ? { ...s, todos: updatedTasks } : s
            );

            const { error } = await supabase
                .from(DB_PATHS.WORKFLOWS)
                .update({ stages: updatedStages })
                .eq('id', currentWorkflow.id);
            if (error) throw error;

            console.log('Task deleted successfully!');
        } catch (error) {
            console.error('Error deleting task:', error);
            alert('Lỗi khi xóa task. Vui lòng thử lại.');
            // Rollback - restore the task
            setStageTasks(stage.todos || []);
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
                    {!currentWorkflow || !stage ? (
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
