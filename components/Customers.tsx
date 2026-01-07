import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Users, Search, Filter, MoreHorizontal, Star, Phone, Mail, MapPin, Plus, Eye, Edit, Trash2, Download, Upload, ArrowLeft, ChevronDown, Check } from 'lucide-react';
import { Customer } from '../types';
import { useAppStore } from '../context';

// Utility for formatting currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

// --- Components ---

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
        <MoreHorizontal size={18} />
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
              onClick={(e) => { e.stopPropagation(); if (window.confirm(`Xóa "${itemName}"?`)) onDelete(); setIsOpen(false); }}
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

export const Customers: React.FC = () => {
  const { customers, orders, addCustomer, updateCustomer, deleteCustomer } = useAppStore();

  // State for Filters
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState({
    nhomKH: [] as string[],
    nguon: [] as string[],
    sales: [] as string[],
    trangThai: [] as string[],
    lanGoi: [] as string[]
  });

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [newCustomer, setNewCustomer] = useState({
    name: '', phone: '', email: '', address: '', tier: 'Standard' as Customer['tier'], notes: ''
  });

  // Mock Data for Options (In real app, derive from DB)
  const OPTIONS = {
    nhomKH: ['Standard', 'VIP', 'VVIP'],
    nguon: ['Facebook', 'Google', 'Zalo', 'Walk-in'],
    sales: ['System', 'Sale 1', 'Sale 2'], // Mock sale staff
    trangThai: ['Active', 'Inactive', 'New'],
    lanGoi: ['0', '1-3', '>3']
  };

  // Filter Logic
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      // 1. Search Text (Global)
      if (searchText) {
        const search = searchText.toLowerCase();
        const matchesSearch =
          c.name.toLowerCase().includes(search) ||
          c.phone.includes(search) ||
          (c.email && c.email.toLowerCase().includes(search)) ||
          (c.address && c.address.toLowerCase().includes(search));
        if (!matchesSearch) return false;
      }

      // 2. Checkbox Filters
      if (filters.nhomKH.length > 0 && !filters.nhomKH.includes(c.tier)) return false;
      if (filters.nguon.length > 0 && c.source && !filters.nguon.includes(c.source)) return false;
      // Note: source, status, assigneeId might be undefined in old data, here we assume strict filtering if filter is active

      // Mock filtering for missing fields to show UI works
      // In real implementation, ensure data has these fields.

      return true;
    });
  }, [customers, searchText, filters]);

  // Derived Stats
  const stats = useMemo(() => {
    const customerIds = filteredCustomers.map(c => c.id);
    const customerOrders = orders.filter(o => customerIds.includes(o.customerId));
    const totalRevenue = filteredCustomers.reduce((sum, c) => sum + c.totalSpent, 0);

    return {
      count: filteredCustomers.length,
      orderCount: customerOrders.length,
      revenue: totalRevenue
    };
  }, [filteredCustomers, orders]);

  // CRUD Handlers
  const handleAddCustomer = async () => {
    if (!newCustomer.name || !newCustomer.phone) return alert('Thiếu thông tin!');
    try {
      // Không tạo ID - để database tự tạo
      await addCustomer({
        id: '', // Tạm thời để trống, sẽ được cập nhật sau khi tạo
        ...newCustomer,
        totalSpent: 0,
        lastVisit: new Date().toISOString().split('T')[0]
      });
      setNewCustomer({ name: '', phone: '', email: '', address: '', tier: 'Standard', notes: '' });
      setShowAddModal(false);
    } catch (e: any) { alert(e.message); }
  };

  const handleUpdateCustomer = async () => {
    if (editingCustomer) {
      await updateCustomer(editingCustomer.id, editingCustomer);
      setShowEditModal(false);
      setEditingCustomer(null);
    }
  };

  const updateFilter = (key: keyof typeof filters, value: string[]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'VVIP': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'VIP': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="space-y-4 h-full flex flex-col">

      {/* --- CONTROL PANEL (Row 1, 2, 3) --- */}
      <div className="bg-neutral-900 rounded-xl shadow-sm border border-neutral-800 p-4 space-y-4 flex-shrink-0">

        {/* ROW 1: Search & Actions */}
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <button onClick={() => window.history.back()} className="p-2 hover:bg-neutral-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors" title="Quay lại">
            <ArrowLeft size={20} />
          </button>

          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Tìm kiếm (Tên, SĐT, Email...)"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-1 focus:ring-gold-500 outline-none transition-all placeholder-slate-600"
            />
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-300 hover:bg-neutral-700 transition-colors" onClick={() => alert('Đang phát triển: Tải xuống Excel')}>
              <Download size={18} /> <span className="hidden sm:inline">Excel</span>
            </button>
            <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-300 hover:bg-neutral-700 transition-colors" onClick={() => alert('Đang phát triển: Tải lên Excel')}>
              <Upload size={18} /> <span className="hidden sm:inline">Upload</span>
            </button>
            <button onClick={() => setShowAddModal(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-gold-600 hover:bg-gold-700 text-black font-bold rounded-lg transition-colors shadow-lg shadow-gold-900/20">
              <Plus size={18} /> <span className="hidden sm:inline">Thêm mới</span>
            </button>
          </div>
        </div>

        {/* ROW 2: Filters */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-neutral-800">
          <MultiSelectFilter label="Nhóm KH" options={OPTIONS.nhomKH} selected={filters.nhomKH} onChange={(v) => updateFilter('nhomKH', v)} />
          <MultiSelectFilter label="Nguồn tới" options={OPTIONS.nguon} selected={filters.nguon} onChange={(v) => updateFilter('nguon', v)} />
          <MultiSelectFilter label="NV Sale" options={OPTIONS.sales} selected={filters.sales} onChange={(v) => updateFilter('sales', v)} />
          <MultiSelectFilter label="Lần gọi" options={OPTIONS.lanGoi} selected={filters.lanGoi} onChange={(v) => updateFilter('lanGoi', v)} />
          <MultiSelectFilter label="Trạng thái" options={OPTIONS.trangThai} selected={filters.trangThai} onChange={(v) => updateFilter('trangThai', v)} />
        </div>

        {/* ROW 3: Counters */}
        <div className="flex flex-wrap gap-6 sm:gap-12 pt-2 border-t border-neutral-800 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Số khách:</span>
            <span className="text-xl font-bold text-slate-200">{stats.count.toLocaleString('vi-VN')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Số đơn:</span>
            <span className="text-xl font-bold text-blue-400">{stats.orderCount.toLocaleString('vi-VN')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Doanh số:</span>
            <span className="text-xl font-bold text-gold-500">{formatCurrency(stats.revenue)}</span>
          </div>
        </div>
      </div>

      {/* --- TABLE CONTENT --- */}
      <div className="bg-neutral-900 rounded-xl shadow-sm border border-neutral-800 flex-1 flex flex-col overflow-hidden min-h-0">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse relative">
            <thead className="sticky top-0 z-20 bg-neutral-900 shadow-sm">
              <tr className="border-b border-neutral-800 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="p-4 min-w-[200px]">Khách hàng</th>
                <th className="p-4">Nhóm</th>
                <th className="p-4 hidden md:table-cell">Nguồn</th>
                <th className="p-4 hidden lg:table-cell">NV Sale</th>
                <th className="p-4 text-right">Doanh số</th>
                <th className="p-4 hidden sm:table-cell text-right">Ngày tạo</th>
                <th className="p-4 w-12 sticky right-0 bg-neutral-900 z-30"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {filteredCustomers.length === 0 ? (
                <tr><td colSpan={7} className="p-12 text-center text-slate-500">Không có dữ liệu</td></tr>
              ) : filteredCustomers.map(customer => (
                <tr key={customer.id} className="hover:bg-neutral-800/50 transition-colors group">
                  <td className="p-4">
                    <div>
                      <div className="font-bold text-slate-200">{customer.name}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">{customer.phone}</div>
                      {customer.email && <div className="text-xs text-slate-600 mt-0.5">{customer.email}</div>}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${getTierColor(customer.tier)}`}>
                      {customer.tier}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-slate-400 hidden md:table-cell">{customer.source || '-'}</td>
                  <td className="p-4 text-sm text-slate-400 hidden lg:table-cell">{customer.assigneeId || 'System'}</td>
                  <td className="p-4 text-right font-medium text-slate-200">{formatCurrency(customer.totalSpent)}</td>
                  <td className="p-4 text-right text-sm text-slate-500 hidden sm:table-cell">{customer.lastVisit}</td>
                  <td className="p-4 sticky right-0 bg-neutral-900/95 backdrop-blur-sm group-hover:bg-neutral-800 transition-colors z-20">
                    <ActionMenu
                      itemName={customer.name}
                      onView={() => alert(JSON.stringify(customer, null, 2))}
                      onEdit={() => { setEditingCustomer({ ...customer }); setShowEditModal(true); }}
                      onDelete={() => deleteCustomer(customer.id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODALS (Add/Edit) --- */}
      {(showAddModal || (showEditModal && editingCustomer)) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-800/50">
              <h3 className="font-bold text-lg text-slate-200">{showAddModal ? 'Thêm Khách Hàng' : 'Sửa Khách Hàng'}</h3>
              <button
                onClick={() => { setShowAddModal(false); setShowEditModal(false); setEditingCustomer(null); }}
                className="text-slate-500 hover:text-white"
              >✕</button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Tên KH <span className="text-red-500">*</span></label>
                  <input type="text" className="w-full bg-neutral-800 border border-neutral-700 rounded p-2 text-slate-200 focus:border-gold-500 outline-none"
                    value={showAddModal ? newCustomer.name : editingCustomer?.name}
                    onChange={e => showAddModal ? setNewCustomer({ ...newCustomer, name: e.target.value }) : editingCustomer && setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">SĐT <span className="text-red-500">*</span></label>
                  <input type="text" className="w-full bg-neutral-800 border border-neutral-700 rounded p-2 text-slate-200 focus:border-gold-500 outline-none"
                    value={showAddModal ? newCustomer.phone : editingCustomer?.phone}
                    onChange={e => showAddModal ? setNewCustomer({ ...newCustomer, phone: e.target.value }) : editingCustomer && setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Email</label>
                <input type="email" className="w-full bg-neutral-800 border border-neutral-700 rounded p-2 text-slate-200 focus:border-gold-500 outline-none"
                  value={showAddModal ? newCustomer.email : editingCustomer?.email}
                  onChange={e => showAddModal ? setNewCustomer({ ...newCustomer, email: e.target.value }) : editingCustomer && setEditingCustomer({ ...editingCustomer, email: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Địa chỉ</label>
                <input type="text" className="w-full bg-neutral-800 border border-neutral-700 rounded p-2 text-slate-200 focus:border-gold-500 outline-none"
                  value={showAddModal ? newCustomer.address : editingCustomer?.address}
                  onChange={e => showAddModal ? setNewCustomer({ ...newCustomer, address: e.target.value }) : editingCustomer && setEditingCustomer({ ...editingCustomer, address: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Hạng</label>
                  <select className="w-full bg-neutral-800 border border-neutral-700 rounded p-2 text-slate-200 focus:border-gold-500 outline-none"
                    value={showAddModal ? newCustomer.tier : editingCustomer?.tier}
                    onChange={e => showAddModal ? setNewCustomer({ ...newCustomer, tier: e.target.value as any }) : editingCustomer && setEditingCustomer({ ...editingCustomer, tier: e.target.value as any })}
                  >
                    <option value="Standard">Standard</option>
                    <option value="VIP">VIP</option>
                    <option value="VVIP">VVIP</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Ghi chú</label>
                <textarea className="w-full bg-neutral-800 border border-neutral-700 rounded p-2 text-slate-200 focus:border-gold-500 outline-none h-20 resize-none"
                  value={showAddModal ? newCustomer.notes : editingCustomer?.notes}
                  onChange={e => showAddModal ? setNewCustomer({ ...newCustomer, notes: e.target.value }) : editingCustomer && setEditingCustomer({ ...editingCustomer, notes: e.target.value })}
                />
              </div>
            </div>

            <div className="p-4 border-t border-neutral-800 bg-neutral-800/50 flex justify-end gap-3">
              <button onClick={() => { setShowAddModal(false); setShowEditModal(false); }} className="px-4 py-2 rounded bg-neutral-700 hover:bg-neutral-600 text-slate-300 transition-colors">Hủy</button>
              <button
                onClick={showAddModal ? handleAddCustomer : handleUpdateCustomer}
                className="px-4 py-2 rounded bg-gold-600 hover:bg-gold-700 text-black font-bold transition-colors"
              >
                {showAddModal ? 'Thêm mới' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};