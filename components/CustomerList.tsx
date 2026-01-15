import { ArrowLeft, CheckCircle2, Circle, Clock, Edit, Eye, Filter, Mail, MapPin, Phone, Plus, Search, Trash2, User, X } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useAppStore } from '../context';
import { Customer } from '../types';

export const CustomerList: React.FC = () => {
    const { customers, deleteCustomer, addCustomer, updateCustomer, orders, workflows } = useAppStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterTier, setFilterTier] = useState<string>('All');

    // State management for view modes
    const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
    const [editingCustomer, setEditingCustomer] = useState<Partial<Customer> | null>(null);

    const selectedCustomer = useMemo(() => customers.find(c => c.id === selectedCustomerId), [customers, selectedCustomerId]);

    const filteredCustomers = useMemo(() => {
        return customers.filter(c => {
            const matchesSearch =
                c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.phone.includes(searchTerm) ||
                (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesTier = filterTier === 'All' || c.tier === filterTier;

            return matchesSearch && matchesTier;
        });
    }, [customers, searchTerm, filterTier]);

    const customerOrders = useMemo(() => {
        if (!selectedCustomerId) return [];
        return orders.filter(o => o.customerId === selectedCustomerId);
    }, [orders, selectedCustomerId]);

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    // Format date DD/MM/YYYY
    const formatDate = (dateString: string | undefined): string => {
        if (!dateString) return 'Chưa có thông tin';
        const datePart = dateString.split(/[T ]/)[0];
        const parts = datePart.split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return datePart;
    };

    const handleAddCustomer = async () => {
        if (!editingCustomer?.name || !editingCustomer?.phone) {
            alert('Vui lòng nhập tên và số điện thoại!');
            return;
        }
        try {
            const newCustomer: any = {
                ...editingCustomer,
                tier: editingCustomer.tier || 'Standard',
                totalSpent: 0,
                lastVisit: new Date().toISOString()
            };
            await addCustomer(newCustomer);
            setShowAddModal(false);
            setEditingCustomer(null);
        } catch (error) {
            console.error('Error adding customer:', error);
        }
    };

    const handleUpdateCustomer = async () => {
        if (!editingCustomer?.id || !editingCustomer?.name || !editingCustomer?.phone) {
            alert('Vui lòng nhập đầy đủ thông tin bắt buộc!');
            return;
        }
        try {
            await updateCustomer(editingCustomer.id, editingCustomer as Customer);
            setShowEditModal(false);
            setEditingCustomer(null);
        } catch (error) {
            console.error('Error updating customer:', error);
        }
    };

    const renderListView = () => (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-serif font-bold text-slate-100 italic">Danh Sách Khách Hàng</h2>
                    <p className="text-slate-500 text-sm">Quản lý thông tin và lịch sử chi tiêu khách hàng</p>
                </div>
                <button
                    onClick={() => {
                        setEditingCustomer({ tier: 'Standard' });
                        setShowAddModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gold-600 hover:bg-gold-700 text-black font-bold rounded-lg transition-all shadow-lg shadow-gold-900/20"
                >
                    <Plus size={18} />
                    Thêm Khách Hàng
                </button>
            </div>

            <div className="bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-neutral-800 flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo tên, số điện thoại hoặc email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600"
                        />
                    </div>
                    <div className="flex gap-2">
                        <div className="relative">
                            <select
                                value={filterTier}
                                onChange={(e) => setFilterTier(e.target.value)}
                                className="appearance-none bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 pr-10 text-slate-300 text-sm focus:ring-2 focus:ring-gold-500 outline-none cursor-pointer"
                            >
                                <option value="All">Hạng: Tất cả</option>
                                <option value="Standard">Standard</option>
                                <option value="VIP">VIP</option>
                                <option value="VVIP">VVIP</option>
                            </select>
                            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={14} />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-neutral-950/50 text-slate-500 text-xs uppercase tracking-widest font-bold">
                                <th className="px-6 py-4 border-b border-neutral-800">Khách hàng</th>
                                <th className="px-6 py-4 border-b border-neutral-800 text-center">Hạng</th>
                                <th className="px-6 py-4 border-b border-neutral-800">Liên hệ</th>
                                <th className="px-6 py-4 border-b border-neutral-800">Tổng chi tiêu</th>
                                <th className="px-6 py-4 border-b border-neutral-800 text-center">Lần cuối</th>
                                <th className="px-6 py-4 border-b border-neutral-800 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-800">
                            {filteredCustomers.length > 0 ? (
                                filteredCustomers.map((customer) => (
                                    <tr key={customer.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-neutral-800 border border-gold-900/30 flex items-center justify-center text-gold-500 font-bold overflow-hidden shadow-inner">
                                                    {customer.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-200 group-hover:text-gold-400 transition-colors uppercase tracking-tight">{customer.name}</div>
                                                    <div className="text-xs text-slate-500 flex items-center gap-1">
                                                        <MapPin size={10} /> {customer.address || 'Chưa cập nhật địa chỉ'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border shadow-sm ${customer.tier === 'VVIP' ? 'bg-purple-900/20 text-purple-400 border-purple-800/50' :
                                                customer.tier === 'VIP' ? 'bg-gold-900/20 text-gold-500 border-gold-800/50' :
                                                    'bg-slate-800 text-slate-400 border-slate-700'
                                                }`}>
                                                {customer.tier}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2 text-slate-300">
                                                    <Phone size={12} className="text-gold-500" /> {customer.phone}
                                                </div>
                                                {customer.email && (
                                                    <div className="flex items-center gap-2 text-slate-500 text-xs">
                                                        <Mail size={12} /> {customer.email}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-serif font-bold text-slate-200">{formatCurrency(customer.totalSpent)}</div>
                                            <div className="text-[10px] text-slate-500 uppercase tracking-tighter">Doanh thu tích lũy</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500 text-center">
                                            {formatDate(customer.lastVisit)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => {
                                                        setSelectedCustomerId(customer.id);
                                                        setViewMode('detail');
                                                    }}
                                                    className="p-2 hover:bg-neutral-800 rounded-lg text-slate-400 hover:text-blue-400 transition-colors"
                                                    title="Xem chi tiết đơn hàng"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setEditingCustomer({ ...customer });
                                                        setShowEditModal(true);
                                                    }}
                                                    className="p-2 hover:bg-neutral-800 rounded-lg text-slate-400 hover:text-gold-500 transition-colors"
                                                    title="Sửa thông tin"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => { if (confirm('Bạn có chắc chắn muốn xóa khách hàng này?')) deleteCustomer(customer.id) }}
                                                    className="p-2 hover:bg-red-900/20 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                                                    title="Xóa khách hàng"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-2 text-slate-600">
                                            <User size={48} className="opacity-20" />
                                            <p>Không tìm thấy khách hàng phù hợp</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 bg-neutral-950/30 border-t border-neutral-800 flex justify-between items-center text-xs text-slate-500 uppercase tracking-widest font-bold">
                    <span>Tổng số: {filteredCustomers.length} khách hàng</span>
                </div>
            </div>
        </div>
    );

    const renderDetailView = () => {
        if (!selectedCustomer) return null;

        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center justify-between mb-8">
                    <button
                        onClick={() => setViewMode('list')}
                        className="flex items-center gap-2 text-slate-400 hover:text-gold-500 transition-colors"
                    >
                        <ArrowLeft size={20} />
                        <span className="font-bold">Quay lại danh sách</span>
                    </button>
                    <div className="flex gap-3">
                        <button
                            onClick={() => {
                                setEditingCustomer({ ...selectedCustomer });
                                setShowEditModal(true);
                            }}
                            className="px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-300 hover:bg-neutral-700 transition-colors flex items-center gap-2"
                        >
                            <Edit size={16} />
                            Sửa hồ sơ
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Customer Profile Card */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden">
                            <div className="h-24 bg-gradient-to-r from-gold-900/20 to-neutral-800 p-6 flex items-end">
                                <div className="w-16 h-16 rounded-full bg-neutral-900 border-2 border-gold-600 flex items-center justify-center text-2xl font-bold text-gold-500 shadow-xl -mb-12">
                                    {selectedCustomer.name.charAt(0)}
                                </div>
                            </div>
                            <div className="p-6 pt-14">
                                <h3 className="text-xl font-serif font-bold text-slate-100 uppercase tracking-tight">{selectedCustomer.name}</h3>
                                <span className={`inline-block mt-2 text-[10px] font-bold px-2.5 py-1 rounded-full border ${selectedCustomer.tier === 'VVIP' ? 'bg-purple-900/20 text-purple-400 border-purple-800/50' :
                                    selectedCustomer.tier === 'VIP' ? 'bg-gold-900/20 text-gold-500 border-gold-800/50' :
                                        'bg-slate-800 text-slate-400 border-slate-700'
                                    }`}>
                                    Hạng: {selectedCustomer.tier}
                                </span>

                                <div className="mt-8 space-y-4">
                                    <div className="flex items-center gap-3 text-slate-400 text-sm">
                                        <Phone size={14} className="text-gold-500" />
                                        <span>{selectedCustomer.phone}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-slate-400 text-sm">
                                        <Mail size={14} className="text-gold-500" />
                                        <span>{selectedCustomer.email || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-slate-400 text-sm">
                                        <MapPin size={14} className="text-gold-500" />
                                        <span className="line-clamp-2">{selectedCustomer.address || 'N/A'}</span>
                                    </div>
                                </div>

                                <div className="mt-8 p-4 bg-neutral-950/50 rounded-xl border border-neutral-800">
                                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Doanh thu tích lũy</p>
                                    <p className="text-xl font-serif font-bold text-gold-500">{formatCurrency(selectedCustomer.totalSpent)}</p>
                                </div>
                            </div>
                        </div>

                        {selectedCustomer.notes && (
                            <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Ghi chú & Yêu cầu</h4>
                                <p className="text-sm text-slate-400 italic">"{selectedCustomer.notes}"</p>
                            </div>
                        )}
                    </div>

                    {/* Orders & Workflows Section */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-serif font-bold text-slate-100 italic flex items-center gap-2">
                                <Clock size={20} className="text-gold-500" />
                                Lịch sử đơn hàng & Quy trình
                            </h3>
                            <span className="text-xs text-slate-500">Tổng số: {customerOrders.length} đơn</span>
                        </div>

                        {customerOrders.length > 0 ? (
                            <div className="space-y-4">
                                {customerOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(order => (
                                    <div key={order.id} className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden shadow-lg border-l-4 border-l-gold-600">
                                        <div className="p-4 bg-neutral-800/50 border-b border-neutral-800 flex justify-between items-center font-bold text-xs">
                                            <span className="text-gold-500 tracking-wider">ĐƠN HÀNG: #{order.id}</span>
                                            <div className="flex gap-4 items-center">
                                                <span className="text-slate-500">{formatDate(order.createdAt)}</span>
                                                <span className="px-2 py-0.5 bg-neutral-950 rounded text-slate-300">{order.status}</span>
                                            </div>
                                        </div>
                                        <div className="p-6 space-y-8">
                                            {order.items.map((item, itemIdx) => {
                                                const workflow = workflows.find(w => w.id === item.workflowId);
                                                const stages = workflow?.stages || [];
                                                const currentStageIdx = stages.findIndex(s => s.name === item.status);

                                                return (
                                                    <div key={item.id || itemIdx} className="space-y-4">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <h5 className="font-bold text-slate-100 text-base">{item.name}</h5>
                                                                <div className="flex gap-3 mt-1 text-[10px] uppercase font-bold tracking-widest">
                                                                    <span className="text-slate-500">Dịch vụ: {item.type}</span>
                                                                    <span className="text-gold-500/50">|</span>
                                                                    <span className="text-slate-500">Số lượng: {item.quantity}</span>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="px-3 py-1 bg-gold-600/10 text-gold-500 border border-gold-600/30 rounded-full text-[10px] font-bold">
                                                                    {item.status.toUpperCase()}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Workflow Progress UI */}
                                                        {stages.length > 0 ? (
                                                            <div className="mt-6">
                                                                <div className="flex items-center justify-between relative px-2">
                                                                    {/* Background line */}
                                                                    <div className="absolute left-8 right-8 top-3 h-0.5 bg-neutral-800 z-0"></div>

                                                                    {stages.map((stage, sIdx) => {
                                                                        const isDone = sIdx < currentStageIdx || item.status === 'Ready' || item.status === 'Done';
                                                                        const isCurrent = sIdx === currentStageIdx && item.status !== 'Ready' && item.status !== 'Done';

                                                                        return (
                                                                            <div key={stage.id} className="flex flex-col items-center gap-2 relative z-10 basis-0 flex-grow">
                                                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500 ${isDone ? 'bg-gold-600 text-black' :
                                                                                    isCurrent ? 'bg-gold-500 text-black animate-pulse shadow-lg shadow-gold-500/20' :
                                                                                        'bg-neutral-800 text-slate-600'
                                                                                    }`}>
                                                                                    {isDone ? <CheckCircle2 size={14} /> : <Circle size={10} />}
                                                                                </div>
                                                                                <span className={`text-[8px] font-bold uppercase tracking-tighter text-center leading-tight transition-colors ${isDone || isCurrent ? 'text-slate-200' : 'text-slate-600'
                                                                                    }`}>
                                                                                    {stage.name}
                                                                                </span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="text-xs text-slate-600 italic">Không có dữ liệu quy trình</div>
                                                        )}
                                                        {itemIdx < order.items.length - 1 && <div className="h-px bg-neutral-800/50 my-6"></div>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div className="p-4 bg-neutral-950/30 border-t border-neutral-800 flex justify-between items-center text-xs">
                                            <div className="flex gap-4">
                                                <span className="text-slate-500 flex items-center gap-1"><Clock size={12} /> Hẹn trả: {formatDate(order.expectedDelivery)}</span>
                                            </div>
                                            <span className="font-bold text-slate-100 text-sm">Thanh toán: {formatCurrency(order.totalAmount)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-neutral-900 shadow-inner rounded-2xl p-16 text-center border border-neutral-800">
                                <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Search size={32} className="text-slate-600 opacity-20" />
                                </div>
                                <h4 className="text-slate-400 font-bold">Chưa có dữ liệu đơn hàng</h4>
                                <p className="text-slate-600 text-sm mt-1">Lịch sử giao dịch của khách hàng sẽ hiển thị tại đây.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-[80vh]">
            {viewMode === 'list' ? renderListView() : renderDetailView()}

            {/* Modals for editing/adding (shared across views) */}
            {(showAddModal || showEditModal) && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-800/50">
                            <h3 className="font-bold text-lg text-slate-200">{showAddModal ? 'Thêm Khách Hàng Mới' : 'Sửa Thông Tin Khách Hàng'}</h3>
                            <button
                                onClick={() => { setShowAddModal(false); setShowEditModal(false); setEditingCustomer(null); }}
                                className="text-slate-500 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block uppercase tracking-wider">Tên Khách Hàng <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2.5 text-slate-200 focus:border-gold-500 outline-none transition-all"
                                        value={editingCustomer?.name || ''}
                                        onChange={e => setEditingCustomer(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="VD: Nguyễn Văn A"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block uppercase tracking-wider">Số Điện Thoại <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2.5 text-slate-200 focus:border-gold-500 outline-none transition-all"
                                        value={editingCustomer?.phone || ''}
                                        onChange={e => setEditingCustomer(prev => ({ ...prev, phone: e.target.value }))}
                                        placeholder="0xxxxxxxxx"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1 block uppercase tracking-wider">Email</label>
                                <input
                                    type="email"
                                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2.5 text-slate-200 focus:border-gold-500 outline-none transition-all"
                                    value={editingCustomer?.email || ''}
                                    onChange={e => setEditingCustomer(prev => ({ ...prev, email: e.target.value }))}
                                    placeholder="example@gmail.com"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1 block uppercase tracking-wider">Địa Chỉ</label>
                                <input
                                    type="text"
                                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2.5 text-slate-200 focus:border-gold-500 outline-none transition-all"
                                    value={editingCustomer?.address || ''}
                                    onChange={e => setEditingCustomer(prev => ({ ...prev, address: e.target.value }))}
                                    placeholder="Số nhà, đường, quận/huyện..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block uppercase tracking-wider">Hạng Khách Hàng</label>
                                    <select
                                        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2.5 text-slate-200 focus:border-gold-500 outline-none transition-all"
                                        value={editingCustomer?.tier || 'Standard'}
                                        onChange={e => setEditingCustomer(prev => ({ ...prev, tier: e.target.value as any }))}
                                    >
                                        <option value="Standard">Standard</option>
                                        <option value="VIP">VIP</option>
                                        <option value="VVIP">VVIP</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1 block uppercase tracking-wider">Ghi Chú</label>
                                <textarea
                                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2.5 text-slate-200 focus:border-gold-500 outline-none transition-all h-24 resize-none"
                                    value={editingCustomer?.notes || ''}
                                    onChange={e => setEditingCustomer(prev => ({ ...prev, notes: e.target.value }))}
                                    placeholder="Sở thích, yêu cầu đặc biệt..."
                                />
                            </div>
                        </div>

                        <div className="p-4 border-t border-neutral-800 bg-neutral-800/50 flex justify-end gap-3">
                            <button
                                onClick={() => { setShowAddModal(false); setShowEditModal(false); setEditingCustomer(null); }}
                                className="px-4 py-2 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-slate-300 transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={showAddModal ? handleAddCustomer : handleUpdateCustomer}
                                className="px-6 py-2 rounded-lg bg-gold-600 hover:bg-gold-700 text-black font-bold transition-all shadow-lg shadow-gold-900/20"
                            >
                                {showAddModal ? 'Tạo Mới' : 'Lưu Thay Đổi'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
