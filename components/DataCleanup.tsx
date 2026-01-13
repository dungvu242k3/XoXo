import React, { useState } from 'react';
import { supabase, DB_PATHS } from '../supabase';
import { Trash2, AlertTriangle, RefreshCw } from 'lucide-react';

export const DataCleanup: React.FC = () => {
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteType, setDeleteType] = useState<string | null>(null);

    const handleDeleteWorkflows = async () => {
        if (!window.confirm('⚠️ BẠN CÓ CHẮC CHẮN MUỐN XÓA TẤT CẢ QUY TRÌNH?\n\nHành động này KHÔNG THỂ HOÀN TÁC!')) {
            return;
        }

        if (!window.confirm('⚠️ XÁC NHẬN LẦN CUỐI!\n\nNhấn OK để XÓA VĨNH VIỄN tất cả workflows.')) {
            return;
        }

        try {
            setIsDeleting(true);
            setDeleteType('workflows');

            // Get current data first
            const { data, count } = await supabase
                .from(DB_PATHS.WORKFLOWS)
                .select('*', { count: 'exact', head: true });

            // Delete all workflows
            await supabase.from(DB_PATHS.WORKFLOWS).delete().neq('id', '');

            alert(`✅ Đã xóa thành công ${count || 0} quy trình!`);
            console.log(`Deleted ${count || 0} workflows from Supabase`);
        } catch (error) {
            console.error('Error deleting workflows:', error);
            alert('❌ Lỗi khi xóa dữ liệu: ' + error);
        } finally {
            setIsDeleting(false);
            setDeleteType(null);
        }
    };

    const handleDeleteOrders = async () => {
        if (!window.confirm('⚠️ BẠN CÓ CHẮC CHẮN MUỐN XÓA TẤT CẢ ĐơN HÀNG?\n\nHành động này KHÔNG THỂ HOÀN TÁC!')) {
            return;
        }

        if (!window.confirm('⚠️ XÁC NHẬN LẦN CUỐI!\n\nNhấn OK để XÓA VĨNH VIỄN tất cả orders.')) {
            return;
        }

        try {
            setIsDeleting(true);
            setDeleteType('orders');

            // Get current data first
            const { count } = await supabase
                .from(DB_PATHS.ORDERS)
                .select('*', { count: 'exact', head: true });

            // Delete all orders
            await supabase.from(DB_PATHS.ORDERS).delete().neq('id', '');

            alert(`✅ Đã xóa thành công ${count || 0} đơn hàng!`);
            console.log(`Deleted ${count || 0} orders from Supabase`);
        } catch (error) {
            console.error('Error deleting orders:', error);
            alert('❌ Lỗi khi xóa dữ liệu: ' + error);
        } finally {
            setIsDeleting(false);
            setDeleteType(null);
        }
    };

    const handleDeleteAll = async () => {
        if (!window.confirm('🚨 CẢNH BÁO NGHIÊM TRỌNG!\n\nBạn sắp XÓA TẤT CẢ DỮ LIỆU:\n- Tất cả quy trình\n- Tất cả đơn hàng\n- Tất cả dữ liệu liên quan\n\nHành động này KHÔNG THỂ HOÀN TÁC!')) {
            return;
        }

        const confirmText = prompt('Nhập "XOA TAT CA" để xác nhận xóa toàn bộ dữ liệu:');
        if (confirmText !== 'XOA TAT CA') {
            alert('Đã hủy thao tác xóa.');
            return;
        }

        try {
            setIsDeleting(true);
            setDeleteType('all');

            // Delete workflows
            const { count: workflowsCount } = await supabase
                .from(DB_PATHS.WORKFLOWS)
                .select('*', { count: 'exact', head: true });
            await supabase.from(DB_PATHS.WORKFLOWS).delete().neq('id', '');

            // Delete orders
            const { count: ordersCount } = await supabase
                .from(DB_PATHS.ORDERS)
                .select('*', { count: 'exact', head: true });
            await supabase.from(DB_PATHS.ORDERS).delete().neq('id', '');

            alert(`✅ Đã xóa thành công:\n- ${workflowsCount || 0} quy trình\n- ${ordersCount || 0} đơn hàng`);
            console.log(`Deleted all data: ${workflowsCount || 0} workflows, ${ordersCount || 0} orders`);
        } catch (error) {
            console.error('Error deleting all data:', error);
            alert('❌ Lỗi khi xóa dữ liệu: ' + error);
        } finally {
            setIsDeleting(false);
            setDeleteType(null);
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <div className="bg-neutral-900 border-2 border-red-500 rounded-xl shadow-2xl p-4 w-80">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-red-900">
                    <AlertTriangle className="text-red-500" size={20} />
                    <h3 className="font-bold text-red-500">Công cụ xóa dữ liệu</h3>
                </div>

                <div className="space-y-2">
                    <button
                        onClick={handleDeleteWorkflows}
                        disabled={isDeleting}
                        className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-orange-900/20 hover:bg-orange-900/40 border border-orange-700 rounded-lg text-orange-400 hover:text-orange-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <div className="flex items-center gap-2">
                            <Trash2 size={16} />
                            <span className="text-sm font-medium">Xóa tất cả Workflows</span>
                        </div>
                        {isDeleting && deleteType === 'workflows' && (
                            <RefreshCw size={16} className="animate-spin" />
                        )}
                    </button>

                    <button
                        onClick={handleDeleteOrders}
                        disabled={isDeleting}
                        className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-orange-900/20 hover:bg-orange-900/40 border border-orange-700 rounded-lg text-orange-400 hover:text-orange-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <div className="flex items-center gap-2">
                            <Trash2 size={16} />
                            <span className="text-sm font-medium">Xóa tất cả Orders</span>
                        </div>
                        {isDeleting && deleteType === 'orders' && (
                            <RefreshCw size={16} className="animate-spin" />
                        )}
                    </button>

                    <div className="pt-2 border-t border-red-900">
                        <button
                            onClick={handleDeleteAll}
                            disabled={isDeleting}
                            className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-red-900/20 hover:bg-red-900/40 border-2 border-red-700 rounded-lg text-red-400 hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <div className="flex items-center gap-2">
                                <AlertTriangle size={16} />
                                <span className="text-sm font-bold">XÓA TẤT CẢ DỮ LIỆU</span>
                            </div>
                            {isDeleting && deleteType === 'all' && (
                                <RefreshCw size={16} className="animate-spin" />
                            )}
                        </button>
                    </div>
                </div>

                <p className="text-xs text-slate-500 mt-3 text-center">
                    ⚠️ Hành động xóa không thể hoàn tác!
                </p>
            </div>
        </div>
    );
};
