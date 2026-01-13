import { ArrowLeft, ChevronDown, Edit, Eye, MoreHorizontal, Search, Trash2 } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../context';
import { Customer } from '../types';

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

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

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

  const selectedCustomer = useMemo(() =>
    customers.find(c => c.id === selectedCustomerId) || filteredCustomers[0] || null
    , [selectedCustomerId, customers, filteredCustomers]);

  // CRUD Handlers
  const handleAddCustomer = async () => {
    if (!newCustomer.name || !newCustomer.phone) return alert('Thiếu thông tin!');
    try {
      await addCustomer({
        id: '',
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

  // CSS for Luxury UI
  const luxuryStyles = `
    .luxury-container {
      --bg-deep: #050505;
      --bg-panel: #0b0b0b;
      --bg-elev: #101010;
      --bg-elev-2: #141414;
      --gold: #d4af37;
      --gold-2: #f5d76e;
      --gold-soft: #b8922e;
      --text: #f3f4f6;
      --text-dim: rgba(243, 244, 246, .65);
      --text-mute: rgba(243, 244, 246, .45);
      --border: rgba(255, 255, 255, .07);
      --border-2: rgba(212, 175, 55, .22);
      --shadow-lg: 0 28px 70px rgba(0, 0, 0, .75);
      --shadow-md: 0 18px 40px rgba(0, 0, 0, .55);
      --shadow-sm: 0 10px 24px rgba(0, 0, 0, .45);
      --radius-lg: 16px;
      --radius-md: 12px;
      --radius-sm: 10px;
    }

    .luxury-container {
      background: linear-gradient(180deg, rgba(255, 255, 255, .02), rgba(255, 255, 255, .00)), var(--bg-panel);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      overflow: hidden;
      box-shadow: var(--shadow-lg);
      position: relative;
      color: var(--text);
      font-family: 'Inter', sans-serif;
    }

    .header-top-luxury {
      display: grid;
      grid-template-columns: 140px 1fr 1fr 1fr 360px;
      background: linear-gradient(180deg, #060606, #040404);
      border-bottom: 1px solid var(--border);
    }

    .nav-link-luxury {
      padding: 18px;
      text-align: center;
      font-family: 'Montserrat', sans-serif;
      font-weight: 700;
      color: var(--gold);
      text-transform: uppercase;
      letter-spacing: 2.2px;
      border-right: 1px solid var(--border);
      font-size: 11px;
      cursor: pointer;
      transition: .22s ease;
    }

    .nav-link-luxury:hover {
      color: var(--text);
      background: rgba(255, 255, 255, .03);
    }

    .workflow-grid-luxury {
      display: grid;
      grid-template-columns: 140px repeat(6, 1fr);
      background: linear-gradient(180deg, rgba(255, 255, 255, .01), rgba(255, 255, 255, .00));
    }

    .col-header-luxury {
      background: rgba(255, 255, 255, .015);
      padding: 14px 10px;
      text-align: center;
      color: var(--text-dim);
      font-weight: 600;
      font-size: 10px;
      border-right: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
      text-transform: uppercase;
      letter-spacing: 1.2px;
    }

    .sidebar-luxury {
      background: rgba(255, 255, 255, .01);
      border-right: 1px solid var(--border);
    }

    .sidebar-item-luxury {
      padding: 14px 16px;
      border-bottom: 1px solid var(--border);
      color: var(--text-mute);
      transition: .18s ease;
      cursor: pointer;
      font-size: 12px;
    }

    .sidebar-item-luxury:hover {
      color: var(--text);
      background: rgba(255, 255, 255, .02);
    }

    .cell-luxury {
      padding: 18px 14px;
      border-right: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
      min-height: 220px;
      background: radial-gradient(800px 260px at 50% 0%, rgba(212, 175, 55, .05), transparent 60%);
    }

    .customer-card-luxury {
      background: linear-gradient(180deg, #f3f8ff, #e6f2ff);
      color: #101010;
      padding: 16px;
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-sm);
      border: 1px solid rgba(0,0,0,.06);
      border-left: 6px solid var(--gold);
      font-size: 12px;
      line-height: 1.6;
      transition: transform .18s ease, box-shadow .18s ease;
      cursor: pointer;
      margin-bottom: 12px;
    }

    .customer-card-luxury:hover {
      transform: translateY(-4px);
      box-shadow: 0 18px 45px rgba(0, 0, 0, .55);
    }

    .customer-card-luxury.is-selected {
      border: 2px solid var(--gold);
      border-left: 6px solid var(--gold);
    }

    .bottom-panels-luxury {
      display: grid;
      grid-template-columns: 1.2fr 2fr 1.2fr;
      border-top: 1px solid var(--border);
    }

    .panel-luxury {
      border-right: 1px solid var(--border);
      background: rgba(255, 255, 255, .008);
    }

    .panel-title-luxury {
      background: linear-gradient(90deg, #a8832c, #f5d76e, #a8832c);
      color: #090909;
      padding: 12px;
      font-weight: 800;
      text-align: center;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      border-bottom: 1px solid rgba(0, 0, 0, .25);
    }

    .panel-content-luxury {
      padding: 20px;
    }

    .data-row-luxury {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 10px;
      border-bottom: 1px solid rgba(255, 255, 255, .06);
      padding-bottom: 8px;
      font-size: 12px;
    }

    .data-row-luxury .label {
      color: var(--text-dim);
    }

    .data-row-luxury .val {
      color: var(--gold);
      font-weight: 700;
      text-align: right;
    }

    .table-modern-luxury {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }

    .table-modern-luxury th {
      color: var(--gold);
      text-align: left;
      padding: 10px;
      border-bottom: 1px solid var(--border);
      background: rgba(255, 255, 255, .01);
    }

    .table-modern-luxury td {
      padding: 10px;
      color: rgba(243, 244, 246, .72);
      border-bottom: 1px solid rgba(255, 255, 255, .05);
    }
  `;

  return (
    <div className="luxury-container h-full flex flex-col">
      <style>{luxuryStyles}</style>

      {/* --- Header --- */}
      <div className="header-top-luxury">
        <div className="nav-link-luxury" style={{ border: 'none' }}>
          <button onClick={() => window.history.back()} className="p-2 hover:bg-neutral-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors" title="Quay lại">
            <ArrowLeft size={18} />
          </button>
        </div>
        <div className="nav-link-luxury">Quy trình sale</div>
        <div className="nav-link-luxury" onClick={() => setShowAddModal(true)}>+ Thêm khách</div>
        <div className="nav-link-luxury">Báo cáo ({stats.count})</div>
        <div className="flex items-center gap-3 px-4 bg-white/5">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-8 pr-2 py-1.5 bg-neutral-800 border border-neutral-700 rounded-lg text-xs text-slate-200 outline-none"
            />
          </div>
        </div>
      </div>

      {/* --- Workflow Grid --- */}
      <div className="flex-1 overflow-auto">
        <div className="workflow-grid-luxury min-w-[1200px]">
          <div className="col-header-luxury">Phân loại</div>
          <div className="col-header-luxury">Xác định KH ({filteredCustomers.length})</div>
          <div className="col-header-luxury">Hẹn gửi ảnh (0)</div>
          <div className="col-header-luxury">Báo giá (0)</div>
          <div className="col-header-luxury">Hẹn qua / Ship (0)</div>
          <div className="col-header-luxury">Chốt đơn (0)</div>
          <div className="col-header-luxury">Thanh toán (0)</div>

          <div className="sidebar-luxury">
            {['QT Bán', 'QT Sau bán', 'QT Khen', 'QT Chê', 'QT Bảo hành', 'QT Hỏng đồ'].map(item => (
              <div key={item} className={`sidebar-item-luxury ${item === 'QT Bán' ? 'is-active' : ''}`}>{item}</div>
            ))}
          </div>

          <div className="cell-luxury">
            {filteredCustomers.map(customer => (
              <div
                key={customer.id}
                className={`customer-card-luxury ${selectedCustomerId === customer.id ? 'is-selected' : ''}`}
                onClick={() => setSelectedCustomerId(customer.id)}
              >
                <strong>{customer.name}</strong>
                <div className="text-[10px] mt-1 text-neutral-600">
                  SĐT: {customer.phone}<br />
                  Hạng: {customer.tier} | Sale: {customer.assigneeId || 'System'}
                </div>
              </div>
            ))}
          </div>
          <div className="cell-luxury"></div>
          <div className="cell-luxury"></div>
          <div className="cell-luxury"></div>
          <div className="cell-luxury"></div>
          <div className="cell-luxury"></div>
        </div>
      </div>

      {/* --- Bottom Panels --- */}
      {selectedCustomer && (
        <div className="bottom-panels-luxury h-[320px]">
          <div className="panel-luxury">
            <div className="panel-title-luxury">TỔNG QUAN</div>
            <div className="panel-content-luxury">
              <div className="data-row-luxury"><span className="label">Khách hàng:</span> <span className="val">{selectedCustomer.name}</span></div>
              <div className="data-row-luxury"><span className="label">Doanh số:</span> <span className="val">{formatCurrency(selectedCustomer.totalSpent)}</span></div>
              <div className="data-row-luxury"><span className="label">Nguồn:</span> <span className="val">{selectedCustomer.source || '-'}</span></div>
              <div className="data-row-luxury"><span className="label">SĐT:</span> <span className="val">{selectedCustomer.phone}</span></div>
              <div className="data-row-luxury"><span className="label">Địa chỉ:</span> <span className="val">{selectedCustomer.address || '-'}</span></div>
              <div className="data-row-luxury"><span className="label">Ghi chú:</span> <span className="val">{selectedCustomer.notes || '-'}</span></div>
            </div>
          </div>

          <div className="panel-luxury">
            <div className="panel-title-luxury">LỊCH SỬ TƯƠNG TÁC & HẸN</div>
            <div className="panel-content-luxury p-0 overflow-auto h-[calc(320px-40px)]">
              <table className="table-modern-luxury">
                <thead>
                  <tr><th>Thời gian</th><th>Hoạt động</th><th>Nhân viên</th><th>Kết quả</th></tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{selectedCustomer.lastVisit}</td>
                    <td>Truy cập hệ thống</td>
                    <td>{selectedCustomer.assigneeId || 'System'}</td>
                    <td>Bình thường</td>
                  </tr>
                  {/* Mock history for demonstration */}
                  <tr>
                    <td>-</td>
                    <td>Cập nhật hạng {selectedCustomer.tier}</td>
                    <td>System</td>
                    <td>Hoàn tất</td>
                  </tr>
                </tbody>
              </table>
              <div className="p-4">
                <div className="bg-white/5 border border-gold/20 border-l-4 border-l-gold p-3 rounded text-[11px]">
                  <strong className="text-gold block mb-1">GHI CHÚ HỆ THỐNG:</strong>
                  Khách hàng tiềm năng ({selectedCustomer.tier}). Cần theo dõi thêm về nhu cầu dịch vụ.
                </div>
              </div>
            </div>
          </div>

          <div className="panel-luxury">
            <div className="panel-title-luxury">NHÂN SỰ PHỤ TRÁCH</div>
            <div className="panel-content-luxury">
              <div className="data-row-luxury"><span className="label">Sale chính:</span> <span className="val">{selectedCustomer.assigneeId || 'Chưa gán'}</span></div>
              <div className="data-row-luxury"><span className="label">Cộng tác:</span> <span className="val">-</span></div>

              <div className="mt-8 flex flex-wrap gap-2">
                <button onClick={() => setShowEditModal(true)} className="px-3 py-1.5 bg-gold/10 border border-gold/30 text-gold rounded text-[10px] hover:bg-gold/20 transition-colors">Sửa thông tin</button>
                <button onClick={() => { if (confirm('Xóa khách hàng này?')) deleteCustomer(selectedCustomer.id) }} className="px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-500 rounded text-[10px] hover:bg-red-500/20 transition-colors">Xóa</button>
              </div>

              <div className="mt-6 p-3 bg-neutral-900/50 rounded border border-white/5 text-[10px] text-slate-400">
                <strong className="text-gold block mb-1">Thao tác nhanh:</strong>
                Tạo đơn hàng | Gửi tin nhắn | Đặt lịch hẹn
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- Existing Modals --- */}
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
                    value={showAddModal ? newCustomer.name : (editingCustomer?.name || '')}
                    onChange={e => showAddModal ? setNewCustomer({ ...newCustomer, name: e.target.value }) : editingCustomer && setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">SĐT <span className="text-red-500">*</span></label>
                  <input type="text" className="w-full bg-neutral-800 border border-neutral-700 rounded p-2 text-slate-200 focus:border-gold-500 outline-none"
                    value={showAddModal ? newCustomer.phone : (editingCustomer?.phone || '')}
                    onChange={e => showAddModal ? setNewCustomer({ ...newCustomer, phone: e.target.value }) : editingCustomer && setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Email</label>
                <input type="email" className="w-full bg-neutral-800 border border-neutral-700 rounded p-2 text-slate-200 focus:border-gold-500 outline-none"
                  value={showAddModal ? newCustomer.email : (editingCustomer?.email || '')}
                  onChange={e => showAddModal ? setNewCustomer({ ...newCustomer, email: e.target.value }) : editingCustomer && setEditingCustomer({ ...editingCustomer, email: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Địa chỉ</label>
                <input type="text" className="w-full bg-neutral-800 border border-neutral-700 rounded p-2 text-slate-200 focus:border-gold-500 outline-none"
                  value={showAddModal ? newCustomer.address : (editingCustomer?.address || '')}
                  onChange={e => showAddModal ? setNewCustomer({ ...newCustomer, address: e.target.value }) : editingCustomer && setEditingCustomer({ ...editingCustomer, address: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Hạng</label>
                  <select className="w-full bg-neutral-800 border border-neutral-700 rounded p-2 text-slate-200 focus:border-gold-500 outline-none"
                    value={showAddModal ? newCustomer.tier : (editingCustomer?.tier || 'Standard')}
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
                  value={showAddModal ? newCustomer.notes : (editingCustomer?.notes || '')}
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