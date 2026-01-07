import { ArrowLeft, CheckSquare, ChevronDown, Download, Edit, Eye, FileText, Image as ImageIcon, MoreHorizontal, Package, Plus, Printer, QrCode, Search, Square, Trash2, Upload, X } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../context';
import { DB_PATHS, supabase } from '../supabase';
import { Order, OrderStatus, ServiceCatalogItem, ServiceItem, ServiceType, WorkflowDefinition } from '../types';

// Utility for formatting currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

// Utility for formatting numbers with thousand separators
const formatNumber = (num: number | string | undefined | null): string => {
  if (num === undefined || num === null) return '0';
  const numValue = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(numValue)) return '0';
  return numValue.toLocaleString('vi-VN');
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

export const Orders: React.FC = () => {
  const { orders, addOrder, updateOrder, deleteOrder, customers, products, members } = useAppStore();
  const [services, setServices] = useState<ServiceCatalogItem[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [showQRModal, setShowQRModal] = useState(false);
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
    return orders.filter(order => {
      // Search Text
      if (searchText) {
        const lower = searchText.toLowerCase();
        const customer = customers.find(c => c.id === order.customerId);
        const match = order.id.toLowerCase().includes(lower) ||
          order.customerName.toLowerCase().includes(lower) ||
          (customer?.phone || '').includes(lower);
        if (!match) return false;
      }

      // Filter Product
      if (filters.products.length > 0) {
        const hasProduct = order.items?.some(i => filters.products.includes(i.name));
        if (!hasProduct) return false;
      }

      // Filter Status
      if (filters.statuses.length > 0) {
        if (!filters.statuses.includes(order.status)) return false;
      }

      return true;
    });
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
      const { data } = await supabase.from(DB_PATHS.SERVICES).select('*');
      if (data) {
        setServices(data as ServiceCatalogItem[]);
      } else {
        setServices([]);
      }
    };

    const loadWorkflows = async () => {
      const { data } = await supabase.from(DB_PATHS.WORKFLOWS).select('*');
      if (data) {
        setWorkflows(data as WorkflowDefinition[]);
      } else {
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
          if (data) setServices(data as ServiceCatalogItem[]);
        }
      )
      .subscribe();

    const workflowsChannel = supabase
      .channel('orders-workflows-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: DB_PATHS.WORKFLOWS,
        },
        async () => {
          const { data } = await supabase.from(DB_PATHS.WORKFLOWS).select('*');
          if (data) setWorkflows(data as WorkflowDefinition[]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(servicesChannel);
      supabase.removeChannel(workflowsChannel);
    };
  }, []);



  // New Order Form State
  const [newOrderItems, setNewOrderItems] = useState<ServiceItem[]>([]);
  const [selectedItemType, setSelectedItemType] = useState<'SERVICE' | 'PRODUCT'>('SERVICE');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [customPrice, setCustomPrice] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');

  // Edit Order Form State
  const [editOrderItems, setEditOrderItems] = useState<ServiceItem[]>([]);
  const [editSelectedItemType, setEditSelectedItemType] = useState<'SERVICE' | 'PRODUCT'>('SERVICE');
  const [editSelectedItemId, setEditSelectedItemId] = useState('');
  const [editCustomPrice, setEditCustomPrice] = useState<string>('');
  const [editSelectedCustomerId, setEditSelectedCustomerId] = useState('');
  const [editDeposit, setEditDeposit] = useState<string>('');
  const [editExpectedDelivery, setEditExpectedDelivery] = useState('');
  const [editNotes, setEditNotes] = useState('');

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
      name = svc.ten_dich_vu;
      image = svc.anh_dich_vu;

      console.log('🔧 Service info when adding item:', {
        serviceId: svc.id,
        serviceName: svc.ten_dich_vu,
        workflows: svc.cac_buoc_quy_trinh,
        workflowId: svc.id_quy_trinh
      });

      // Determine Workflow
      if (svc.cac_buoc_quy_trinh && svc.cac_buoc_quy_trinh.length > 0) {
        workflowId = svc.cac_buoc_quy_trinh[0].id;
        console.log('✅ Using workflows[0].id:', workflowId);
      } else if (Array.isArray(svc.id_quy_trinh) && svc.id_quy_trinh.length > 0) {
        workflowId = svc.id_quy_trinh[0];
        console.log('✅ Using workflowId[0]:', workflowId);
      } else if (typeof svc.id_quy_trinh === 'string' && svc.id_quy_trinh) {
        workflowId = svc.id_quy_trinh;
        console.log('✅ Using workflowId string:', workflowId);
      } else {
        console.log('⚠️ No workflow found for this service!');
      }

      // Determine Initial Stage if Workflow Found
      if (workflowId) {
        const wf = workflows.find(w => w.id === workflowId);
        if (wf && wf.cac_buoc && wf.cac_buoc.length > 0) {
          const sortedStages = [...wf.cac_buoc].sort((a, b) => a.thu_tu - b.thu_tu);
          initialStatus = sortedStages[0].id;
          initialStageName = sortedStages[0].ten_buoc; // WARN: verify WorkflowStage key
        }
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
      price: customPrice ? parseInt(customPrice) : itemData.gia_niem_yet, // Map price to gia_niem_yet
      status: initialStatus,
      quantity: 1,
      beforeImage: image,
      isProduct: selectedItemType === 'PRODUCT',
      serviceId: selectedItemType === 'SERVICE' ? selectedItemId : undefined,
      workflowId: workflowId,
      history: [{
        stageId: initialStatus,
        stageName: initialStageName,
        enteredAt: Date.now(),
        performedBy: 'Hệ thống'
      }]
    };

    setNewOrderItems([...newOrderItems, newItem]);
    setSelectedItemId('');
    setCustomPrice('');
  };

  const handleRemoveItem = (index: number) => {
    const updated = [...newOrderItems];
    updated.splice(index, 1);
    setNewOrderItems(updated);
  };

  const handleCreateOrder = () => {
    if (!selectedCustomerId || newOrderItems.length === 0) return;

    const customer = customers.find(c => c.id === selectedCustomerId);
    const totalAmount = newOrderItems.reduce((acc, item) => acc + item.price, 0);

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
      items: itemsWithAssignment, // Không cần tạo ID cho items - database tự tạo
      totalAmount: totalAmount,
      deposit: 0,
      status: OrderStatus.PENDING,
      createdAt: new Date().toISOString().split('T')[0],
      expectedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: ''
    };

    addOrder(newOrder);

    setIsModalOpen(false);
    setNewOrderItems([]);
    setSelectedCustomerId('');
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
      name = svc.ten_dich_vu;
      image = svc.anh_dich_vu;

      // Determine Workflow
      if (svc.cac_buoc_quy_trinh && svc.cac_buoc_quy_trinh.length > 0) {
        workflowId = svc.cac_buoc_quy_trinh[0].id;
      } else if (Array.isArray(svc.id_quy_trinh) && svc.id_quy_trinh.length > 0) {
        workflowId = svc.id_quy_trinh[0];
      } else if (typeof svc.id_quy_trinh === 'string' && svc.id_quy_trinh) {
        workflowId = svc.id_quy_trinh;
      }

      if (workflowId) {
        const wf = workflows.find(w => w.id === workflowId);
        if (wf && wf.cac_buoc && wf.cac_buoc.length > 0) {
          // Assuming WorkflowStage keys: ten_buoc, thu_tu
          const sortedStages = [...wf.cac_buoc].sort((a, b) => a.thu_tu - b.thu_tu);
          initialStatus = sortedStages[0].id;
          initialStageName = sortedStages[0].ten_buoc; // WARN
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
      price: editCustomPrice ? parseInt(editCustomPrice) : itemData.gia_niem_yet,
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

  const handleUpdateOrder = async () => {
    if (!editingOrder || !editSelectedCustomerId || editOrderItems.length === 0) return;

    const customer = customers.find(c => c.id === editSelectedCustomerId);
    const totalAmount = editOrderItems.reduce((acc, item) => acc + item.price, 0);

    // Clean items to remove undefined values and update IDs to format: {orderId}-{serviceId}
    const cleanedItems = editOrderItems.map(item => {
      // Generate ID as {orderId}-{serviceId} if serviceId exists
      const itemId = item.serviceId
        ? `${editingOrder.id}-${item.serviceId}`
        : item.id;

      const cleaned: any = {
        id: itemId,
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

      return cleaned;
    });

    const updatedOrder: any = {
      id: editingOrder.id,
      customerId: editSelectedCustomerId,
      customerName: customer?.name || 'Khách lẻ',
      items: cleanedItems,
      totalAmount: totalAmount,
      deposit: parseInt(editDeposit) || 0,
      status: editingOrder.status,
      createdAt: editingOrder.createdAt,
      expectedDelivery: editExpectedDelivery,
      notes: editNotes || ''
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
              <button onClick={() => setShowQRModal(true)} className="hover:text-gold-400 flex items-center gap-1"><QrCode size={14} /> Print QR</button>
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
                <th className="p-4 min-w-[120px]">Mã Đơn</th>
                <th className="p-4 min-w-[200px]">Khách Hàng</th>
                <th className="p-4">Sản Phẩm</th>
                <th className="p-4 text-right">Tổng Tiền</th>
                <th className="p-4">Trạng Thái</th>
                <th className="p-4 hidden md:table-cell">Ngày Hẹn</th>
                <th className="p-4 w-12 sticky right-0 bg-neutral-900 z-30"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {filteredOrders.length === 0 ? (
                <tr><td colSpan={8} className="p-12 text-center text-slate-500">Không tìm thấy đơn hàng</td></tr>
              ) : filteredOrders.map((order) => {
                const isSelected = selectedOrderIds.has(order.id);
                return (
                  <tr key={order.id} className={`transition-colors cursor-pointer group ${isSelected ? 'bg-gold-900/10' : 'hover:bg-neutral-800/50'}`} onClick={() => setSelectedOrder(order)}>
                    <td className="p-4" onClick={(e) => toggleSelectOrder(order.id, e)}>
                      {isSelected ? <CheckSquare size={18} className="text-gold-500" /> : <Square size={18} className="text-neutral-600" />}
                    </td>
                    <td className="p-4 font-mono text-slate-300 font-bold">{order.id}</td>
                    <td className="p-4">
                      <div className="font-bold text-slate-200">{order.customerName}</div>
                      <div className="text-[10px] text-gold-600/80 font-bold mt-0.5 uppercase tracking-wide">
                        {getCustomerInfo(order.customerId)?.tier || 'Member'}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex -space-x-2">
                        {(order.items || []).slice(0, 4).map((item, idx) => (
                          <div key={idx} className="w-8 h-8 rounded-full border-2 border-neutral-900 bg-neutral-800 flex items-center justify-center overflow-hidden" title={item.name}>
                            {item.beforeImage ? (
                              <img src={item.beforeImage} className="w-full h-full object-cover" />
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
                    <td className="p-4 text-right font-bold text-gold-400">{order.totalAmount.toLocaleString()} ₫</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${order.status === OrderStatus.DONE ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                        order.status === OrderStatus.PENDING ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                          'bg-slate-500/10 text-slate-400 border-slate-500/20'
                        }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-400 hidden md:table-cell">{order.expectedDelivery}</td>
                    <td className="p-4 sticky right-0 bg-neutral-900/95 backdrop-blur-sm group-hover:bg-neutral-800 transition-colors z-20">
                      <ActionMenu
                        itemName={order.id}
                        onView={() => setSelectedOrder(order)}
                        onEdit={() => {
                          setEditingOrder(order);
                          setEditOrderItems([...order.items]);
                          setEditSelectedCustomerId(order.customerId);
                          setEditDeposit(order.deposit?.toString() || '0');
                          setEditExpectedDelivery(order.expectedDelivery || '');
                          setEditNotes(order.notes || '');
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
      {selectedOrder && (
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
                    {(selectedOrder.items || []).map((item) => {
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
                            {item.beforeImage ? (
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
                              <>
                                <div className="mt-2 text-[10px] text-slate-600 italic">
                                  Đã trừ kho theo định mức quy trình
                                </div>
                                {(() => {
                                  const service = services.find(s => s.id === item.serviceId);
                                  if (service && service.cac_buoc_quy_trinh && Array.isArray(service.cac_buoc_quy_trinh) && service.cac_buoc_quy_trinh.length > 0) {
                                    const allWorkflows = service.cac_buoc_quy_trinh
                                      .map(wf => {
                                        const wfDef = workflows.find(w => w.id === wf.id);
                                        return wfDef ? { id: wfDef.id, label: wfDef.ten_quy_trinh, order: wf.thu_tu, isCurrent: wf.id === item.workflowId } : null;
                                      })
                                      .filter(w => w !== null)
                                      .sort((a, b) => (a?.order || 0) - (b?.order || 0));

                                    return (
                                      <div className="mt-2 space-y-1">
                                        <div className="text-[10px] text-slate-500 font-semibold uppercase">Tất cả quy trình:</div>
                                        {allWorkflows.map((wf, idx) => (
                                          <div key={wf?.id || idx} className={`text-[10px] ${wf?.isCurrent ? 'text-gold-500 font-bold' : 'text-blue-400'}`}>
                                            {wf?.isCurrent && '→ '}
                                            {wf?.order}. {wf?.label}
                                            {wf?.isCurrent && ' (Đang thực hiện)'}
                                          </div>
                                        ))}
                                      </div>
                                    );
                                  }
                                  // Fallback: show current workflow if no service workflows
                                  if (item.workflowId) {
                                    const currentWf = workflows.find(w => w.id === item.workflowId);
                                    return (
                                      <div className="mt-1 text-[10px] text-blue-500">
                                        Quy trình: {currentWf?.ten_quy_trinh || 'Unknown'}
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                              </>
                            )}
                            {item.workflowId && !item.serviceId && (
                              <div className="mt-1 text-[10px] text-blue-500">
                                Quy trình: {workflows.find(w => w.id === item.workflowId)?.ten_quy_trinh || 'Unknown'}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-slate-300">{(item.price || 0).toLocaleString()} ₫</div>
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
                      </div>
                    );
                  })()}
                </div>

                <div className="bg-neutral-800/30 p-4 rounded-lg border border-neutral-800">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">Thanh Toán</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Tạm tính</span>
                      <span className="text-slate-300">{(selectedOrder.totalAmount || 0).toLocaleString()} ₫</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-200 pt-2 border-t border-neutral-700">
                      <span>Tổng cộng</span>
                      <span>{(selectedOrder.totalAmount || 0).toLocaleString()} ₫</span>
                    </div>
                    <div className="flex justify-between text-gold-500">
                      <span>Đã cọc</span>
                      <span>-{(selectedOrder.deposit || 0).toLocaleString()} ₫</span>
                    </div>
                    <div className="flex justify-between font-bold text-red-500 pt-2">
                      <span>Còn lại</span>
                      <span>{((selectedOrder.totalAmount || 0) - (selectedOrder.deposit || 0)).toLocaleString()} ₫</span>
                    </div>
                  </div>
                </div>

                <button className="w-full py-3 bg-white text-black rounded-lg hover:bg-slate-200 flex items-center justify-center gap-2 font-medium">
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
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                  <Printer size={18} /> In Ngay
                </button>
                <button onClick={() => setShowQRModal(false)} className="p-2 hover:bg-neutral-800 rounded-full transition-colors text-slate-400">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-neutral-950">
              <div className="bg-white shadow-lg mx-auto max-w-[210mm] min-h-[297mm] p-8 grid grid-cols-2 gap-8 print:w-full print:shadow-none text-black">
                {orders.filter(o => selectedOrderIds.has(o.id)).map(order => (
                  <React.Fragment key={order.id}>
                    <div className="border-2 border-black p-4 rounded-xl flex items-center gap-6 break-inside-avoid">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${order.id}`}
                        alt="QR"
                        className="w-32 h-32"
                      />
                      <div className="flex-1">
                        <div className="text-2xl font-black text-black mb-1">{order.id}</div>
                        <div className="font-bold text-lg mb-2">{order.customerName}</div>
                        <div className="text-sm text-slate-600 space-y-1">
                          <p>Ngày nhận: {order.createdAt}</p>
                          <p>Hẹn trả: {order.expectedDelivery}</p>
                          <p className="font-semibold text-black">{order.items.length} Sản phẩm</p>
                        </div>
                      </div>
                    </div>
                    {order.items.map(item => (
                      <div key={item.id} className="border border-slate-300 p-4 rounded-xl flex items-center gap-4 break-inside-avoid bg-slate-50">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${item.id}`}
                          alt="QR"
                          className="w-20 h-20 mix-blend-multiply"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-mono text-slate-500 mb-0.5">{order.id}</div>
                          <div className="font-bold text-slate-900 truncate leading-tight">{item.name}</div>
                          <div className="text-xs text-slate-600 mt-1">{item.type}</div>
                          <div className="text-[10px] bg-white border border-slate-300 rounded px-1.5 py-0.5 inline-block mt-1 font-mono">{item.id}</div>
                        </div>
                      </div>
                    ))}
                  </React.Fragment>
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
                  {(customers || []).map(c => (
                    <option key={c.id} value={c.id}>{c.name} - {c.phone} ({c.tier})</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-200">Sản Phẩm & Dịch Vụ</h3>
                </div>

                {/* Add Item Form */}
                <div className="p-4 border border-gold-900/30 bg-gold-900/10 rounded-xl mb-4">
                  <div className="flex gap-4 mb-3 border-b border-gold-900/20 pb-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="type"
                        checked={selectedItemType === 'SERVICE'}
                        onChange={() => { setSelectedItemType('SERVICE'); setSelectedItemId(''); setCustomPrice(''); }}
                        className="text-gold-500 focus:ring-gold-500 bg-neutral-900 border-neutral-700"
                      />
                      <span className="text-sm font-medium text-slate-300">Dịch Vụ (Spa/Sửa chữa)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="type"
                        checked={selectedItemType === 'PRODUCT'}
                        onChange={() => { setSelectedItemType('PRODUCT'); setSelectedItemId(''); setCustomPrice(''); }}
                        className="text-gold-500 focus:ring-gold-500 bg-neutral-900 border-neutral-700"
                      />
                      <span className="text-sm font-medium text-slate-300">Sản Phẩm Bán Lẻ</span>
                    </label>
                  </div>

                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Chọn {selectedItemType === 'SERVICE' ? 'Dịch Vụ' : 'Sản Phẩm'}</label>
                      <select
                        className="w-full p-2 border border-neutral-700 rounded-lg text-sm bg-neutral-900 text-slate-200 focus:border-gold-500 outline-none"
                        value={selectedItemId}
                        onChange={(e) => {
                          setSelectedItemId(e.target.value);
                          const list = selectedItemType === 'SERVICE' ? services : products;
                          const item = list.find(i => i.id === e.target.value);
                          if (item) {
                            const price = selectedItemType === 'SERVICE'
                              ? (item as any).gia_niem_yet
                              : (item as any).price;
                            setCustomPrice((price || 0).toString());
                          }
                        }}
                      >
                        <option value="">-- Chọn --</option>
                        {selectedItemType === 'SERVICE'
                          ? (services || []).map(s => <option key={s.id} value={s.id}>{s.ten_dich_vu} (Giá gốc: {(s.gia_niem_yet || 0).toLocaleString()})</option>)
                          : (products || []).map(p => <option key={p.id} value={p.id}>{p.name} (Tồn: {formatNumber(p.stock || 0)})</option>)
                        }
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
                    <button
                      onClick={handleAddItem}
                      disabled={!selectedItemId}
                      className="px-4 py-2 bg-slate-100 text-black rounded-lg text-sm font-medium hover:bg-white disabled:bg-neutral-800 disabled:text-slate-600 transition-colors"
                    >
                      Thêm
                    </button>
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-2">
                  {newOrderItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-neutral-800/50 rounded-lg border border-neutral-700 text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-neutral-700 flex items-center justify-center text-slate-400">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="font-medium text-slate-200">{item.name}</div>
                          <div className="text-xs text-slate-500">{item.type}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-medium text-slate-300">{item.price.toLocaleString()} ₫</span>
                        <button onClick={() => handleRemoveItem(idx)} className="p-1 hover:text-red-500 text-slate-500">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {newOrderItems.length === 0 && (
                    <div className="text-center py-6 text-slate-500 border border-dashed border-neutral-800 rounded-lg cursor-pointer hover:bg-neutral-800/30 transition-colors" onClick={() => document.querySelector('select')?.focus()}>
                      Chưa có sản phẩm/dịch vụ nào
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-neutral-800 flex justify-end">
                  <div className="text-right">
                    <p className="text-slate-500 text-sm mb-1">Tổng cộng dự kiến</p>
                    <p className="text-2xl font-bold text-gold-500">
                      {newOrderItems.reduce((acc, i) => acc + i.price, 0).toLocaleString()} ₫
                    </p>
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
        </div>
      )}

      {/* Edit Order Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          {/* Re-implementing Edit Modal Content similar to above but with Edit state */}
          <div className="bg-neutral-900 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-neutral-800 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-neutral-800">
              <h2 className="text-xl font-serif font-bold text-slate-100">Chỉnh Sửa Đơn Hàng</h2>
              <p className="text-slate-500 text-sm">Cập nhật thông tin đơn hàng #{editingOrder?.id}</p>
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
                  {(customers || []).map(c => (
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
                          ? (services || []).map(s => <option key={s.id} value={s.id}>{s.ten_dich_vu} (Giá gốc: {(s.gia_niem_yet || 0).toLocaleString()})</option>)
                          : (products || []).map(p => <option key={p.id} value={p.id}>{p.name} (Tồn: {formatNumber(p.stock || 0)})</option>)
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
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-neutral-700 flex items-center justify-center text-slate-400">
                              {idx + 1}
                            </div>
                            <div>
                              <div className="font-medium text-slate-200">{item.name}</div>
                              <div className="text-xs text-slate-500">{item.type}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-medium text-slate-300">{item.price.toLocaleString()} ₫</span>
                            <button onClick={() => handleEditRemoveItem(idx)} className="p-1 hover:text-red-500 text-slate-500">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        {/* Hiển thị thông tin quy trình đã chọn */}
                        {!item.isProduct && (
                          <div className="mt-2 pt-2 border-t border-neutral-700 space-y-1">
                            {item.serviceId && service && (
                              <div className="text-xs text-slate-400">
                                <span className="text-slate-500">Dịch vụ:</span> {service.ten_dich_vu}
                              </div>
                            )}
                            {item.workflowId && workflow && (
                              <div className="text-xs text-blue-400">
                                <span className="text-slate-500">Quy trình:</span> {workflow.ten_quy_trinh}
                              </div>
                            )}
                            {item.status && (
                              <div className="text-xs text-slate-400">
                                <span className="text-slate-500">Trạng thái:</span> {item.status}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Extra Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">Tiền Cọc</label>
                  <input
                    type="number"
                    value={editDeposit}
                    onChange={(e) => setEditDeposit(e.target.value)}
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
                    onClick={(e) => e.currentTarget.showPicker && e.currentTarget.showPicker()}
                    className="w-full p-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-1 focus:ring-gold-500 outline-none relative z-10 cursor-pointer"
                    placeholder="yyyy-mm-dd"
                  />
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
        </div>
      )}

    </div>
  );
};