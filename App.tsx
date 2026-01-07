import {
  Bell,
  Briefcase,
  Check,
  ChevronRight,
  Columns,
  GitMerge,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  ShoppingBag,
  Tag,
  Users,
  Wrench
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { HashRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { Customers } from './components/Customers';
import { Dashboard } from './components/Dashboard';
import { Inventory } from './components/Inventory';
import { KanbanBoard } from './components/KanbanBoard';
import { Members } from './components/Members';
import { Orders } from './components/Orders';
import { Products } from './components/Products';
import { Services } from './components/Services';
import { Settings as SettingsPage } from './components/Settings';
import { TechnicianView } from './components/TechnicianView';
import { WorkflowConfig } from './components/WorkflowConfig';
import { Workflows } from './components/Workflows';
import { DEFAULT_COMPANY_CONFIG } from './constants';
import { AppProvider, useAppStore } from './context';
import { Order, ServiceItem } from './types';
// Removed supabase import - notifications now use localStorage only


// --- Sidebar Component ---
const SidebarItem = ({ to, icon: Icon, label }: { to: string, icon?: any, label: string }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 border ${isActive
        ? 'bg-neutral-800 border-gold-900/50 text-gold-400 shadow-lg shadow-black/40'
        : 'border-transparent text-slate-500 hover:bg-neutral-900 hover:text-slate-300'
        }`}
    >
      {Icon && <Icon size={20} className={isActive ? 'text-gold-500' : 'text-slate-600'} />}
      <span className="font-medium">{label}</span>
      {isActive && <ChevronRight size={16} className="ml-auto opacity-80 text-gold-600" />}
    </Link>
  );
};

const Sidebar = () => (
  <div className="w-64 h-screen bg-neutral-950 border-r border-neutral-900 flex flex-col fixed left-0 top-0 z-20 shadow-2xl shadow-black">
    <div className="p-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gold-600 rounded-lg flex items-center justify-center text-black font-serif font-bold text-xl overflow-hidden shadow-lg shadow-gold-900/20">
          {DEFAULT_COMPANY_CONFIG.logoUrl.includes('placeholder') ? 'X' : <img src={DEFAULT_COMPANY_CONFIG.logoUrl} alt="Logo" />}
        </div>
        <div>
          <h1 className="font-serif font-bold text-lg text-slate-100 tracking-tight leading-tight">{DEFAULT_COMPANY_CONFIG.name}</h1>
          <p className="text-[10px] uppercase tracking-widest text-gold-500">Luxury ERP</p>
        </div>
      </div>
    </div>

    <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
      <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider px-4 mb-2 mt-4">Trung Tâm</div>
      <SidebarItem to="/" icon={LayoutDashboard} label="Tổng quan" />

      <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider px-4 mb-2 mt-6">Kinh Doanh</div>
      <SidebarItem to="/orders" icon={ShoppingBag} label="Đơn hàng" />
      <SidebarItem to="/customers" icon={Users} label="Khách hàng (CRM)" />

      <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider px-4 mb-2 mt-6">Quản Lý</div>
      <SidebarItem to="/services" label="Dịch vụ & Bảng giá" />
      <SidebarItem to="/products" icon={Tag} label="Sản phẩm bán" />
      <SidebarItem to="/inventory" icon={Package} label="Kho vật tư" />
      <SidebarItem to="/members" icon={Briefcase} label="Nhân sự" />

      <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider px-4 mb-2 mt-6">Kỹ Thuật</div>
      <SidebarItem to="/workflows" icon={GitMerge} label="Quy trình xử lý" />
      <SidebarItem to="/kanban" icon={Columns} label="Bảng Kanban" />
      <SidebarItem to="/technician" icon={Wrench} label="Khu vực kỹ thuật" />

      <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider px-4 mb-2 mt-6">Hệ Thống</div>
      <SidebarItem to="/settings" icon={Settings} label="Cài đặt" />
    </nav>

    <div className="p-4 border-t border-neutral-900">
      <button className="flex items-center gap-3 w-full px-4 py-2 text-slate-500 hover:text-red-500 transition-colors">
        <LogOut size={18} />
        <span className="font-medium">Đăng xuất</span>
      </button>
    </div>
  </div>
);

// --- Header Component ---
const Header = () => {
  const { orders } = useAppStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());
  const [isLoadingAcknowledged, setIsLoadingAcknowledged] = useState(true);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Simulate current user ID - in real app, get from auth context
  const CURRENT_USER_ID = 'admin'; // Có thể lấy từ auth context

  // Load acknowledged IDs from localStorage (đơn giản hơn, không cần Supabase cho tính năng này)
  useEffect(() => {
    const loadAcknowledgedIds = () => {
      try {
        const saved = localStorage.getItem('acknowledged_notifications');
        if (saved) {
          const ids = JSON.parse(saved) as string[];
          setAcknowledgedIds(new Set(ids));
        }
      } catch (e) {
        console.error('Error loading from localStorage:', e);
      } finally {
        setIsLoadingAcknowledged(false);
      }
    };

    loadAcknowledgedIds();
  }, []);

  // Save acknowledged IDs to localStorage (đơn giản hơn, không cần Supabase cho tính năng này)
  const saveAcknowledgedIds = async (ids: Set<string>) => {
    try {
      const idsArray = Array.from(ids);
      localStorage.setItem('acknowledged_notifications', JSON.stringify(idsArray));
    } catch (e) {
      console.error('Error saving to localStorage:', e);
      alert('Lỗi khi lưu thông báo. Vui lòng thử lại.');
    }
  };

  // Simulate current user role - in real app, get from auth context
  const CURRENT_USER_ROLE = 'Kỹ thuật viên'; // Có thể là 'Kỹ thuật viên', 'QC', 'Spa', etc.

  // Map role to stages they handle
  const ROLE_STAGES: Record<string, string[]> = {
    'Kỹ thuật viên': ['In Queue', 'Cleaning', 'Repairing'],
    'QC': ['QC'],
    'Spa': ['Cleaning'],
  };

  // Get stages for current user
  const myStages = ROLE_STAGES[CURRENT_USER_ROLE] || ['In Queue', 'Cleaning', 'Repairing', 'QC'];

  // Find orders with items returned to my stage
  const notifications = useMemo(() => {
    const notifs: Array<{ order: Order; item: ServiceItem }> = [];

    orders.forEach(order => {
      order.items.forEach(item => {
        // Chỉ lấy các item không phải sản phẩm và đang ở công đoạn của tôi
        if (!item.isProduct && myStages.includes(item.status)) {
          // Kiểm tra xem item có vừa được chuyển về công đoạn này không (dựa vào history)
          const hasRecentUpdate = item.lastUpdated && (Date.now() - item.lastUpdated < 24 * 60 * 60 * 1000); // Trong 24h
          if (hasRecentUpdate || !acknowledgedIds.has(`${order.id}-${item.id}`)) {
            notifs.push({ order, item });
          }
        }
      });
    });

    return notifs;
  }, [orders, myStages, acknowledgedIds]);

  // Close notification panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAcknowledge = async (orderId: string, itemId: string) => {
    const newIds = new Set<string>(acknowledgedIds);
    newIds.add(`${orderId}-${itemId}`);
    setAcknowledgedIds(newIds);
    await saveAcknowledgedIds(newIds);
  };

  const handleAcknowledgeAll = async () => {
    const newIds = new Set<string>(acknowledgedIds);
    notifications.forEach(notif => {
      newIds.add(`${notif.order.id}-${notif.item.id}`);
    });
    setAcknowledgedIds(newIds);
    await saveAcknowledgedIds(newIds);
  };

  const unreadCount = notifications.filter(n => !acknowledgedIds.has(`${n.order.id}-${n.item.id}`)).length;

  return (
    <header className="h-16 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-900 fixed top-0 right-0 left-64 z-10 px-8 flex items-center justify-end">
      <div className="flex items-center gap-6">
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative text-slate-400 hover:text-gold-400 transition-colors"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 rounded-full border-2 border-neutral-950 flex items-center justify-center text-xs font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-96 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl z-50 max-h-[600px] overflow-hidden flex flex-col">
              <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950">
                <h3 className="font-bold text-slate-200">Thông Báo</h3>
                {notifications.length > 0 && (
                  <button
                    onClick={handleAcknowledgeAll}
                    className="text-xs text-gold-500 hover:text-gold-400 transition-colors"
                  >
                    Xác nhận tất cả
                  </button>
                )}
              </div>

              <div className="overflow-y-auto flex-1">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    <Bell size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Không có thông báo mới</p>
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-800">
                    {notifications.map((notif, idx) => {
                      const isAcknowledged = acknowledgedIds.has(`${notif.order.id}-${notif.item.id}`);
                      const statusLabels: Record<string, string> = {
                        'In Queue': 'Chờ Xử Lý',
                        'Cleaning': 'Vệ Sinh',
                        'Repairing': 'Sửa Chữa',
                        'QC': 'Kiểm Tra (QC)',
                        'Ready': 'Hoàn Thành'
                      };

                      return (
                        <div
                          key={`${notif.order.id}-${notif.item.id}-${idx}`}
                          className={`p-4 hover:bg-neutral-800 transition-colors ${isAcknowledged ? 'opacity-60' : ''}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center flex-shrink-0">
                              <ShoppingBag size={18} className="text-gold-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <div className="flex-1">
                                  <p className="text-sm font-semibold text-slate-200 truncate">
                                    Đơn #{notif.order.id}
                                  </p>
                                  <p className="text-xs text-slate-400 mt-0.5">
                                    {notif.order.customerName}
                                  </p>
                                </div>
                                {!isAcknowledged && (
                                  <button
                                    onClick={() => handleAcknowledge(notif.order.id, notif.item.id)}
                                    className="p-1.5 hover:bg-neutral-800 rounded-lg transition-colors text-slate-500 hover:text-gold-500 flex-shrink-0"
                                    title="Xác nhận đã xem"
                                  >
                                    <Check size={16} />
                                  </button>
                                )}
                              </div>
                              <p className="text-sm text-slate-300 mb-2 line-clamp-1">
                                {notif.item.name}
                              </p>
                              <div className="flex items-center gap-2">
                                <span className="text-xs px-2 py-1 bg-blue-900/30 text-blue-400 border border-blue-800 rounded">
                                  {statusLabels[notif.item.status] || notif.item.status}
                                </span>
                                <span className="text-xs text-slate-500">
                                  Đã chuyển về công đoạn của bạn
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pl-6 border-l border-neutral-800">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-200">Quản trị viên</p>
            <p className="text-xs text-slate-500">Quản lý trung tâm</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-neutral-800 border border-neutral-700 shadow-sm overflow-hidden">
            <img src="https://i.pravatar.cc/150?u=admin" alt="User" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>
    </header>
  );
};

// --- Main App Component ---
const AppContent: React.FC = () => {
  return (
    <HashRouter>
      <div className="min-h-screen bg-neutral-950 font-sans text-slate-300">
        <Sidebar />
        <Header />

        <main className="ml-64 pt-24 px-8 pb-12">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/kanban" element={<KanbanBoard />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/technician" element={<TechnicianView />} />
            <Route path="/services" element={<Services />} />
            <Route path="/workflows" element={<Workflows />} />
            <Route path="/workflows/:id/config" element={<WorkflowConfig />} />
            <Route path="/products" element={<Products />} />
            <Route path="/members" element={<Members />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={
              <div className="flex flex-col items-center justify-center h-[60vh] text-slate-600">
                <Wrench size={48} className="mb-4 opacity-20" />
                <h2 className="text-xl font-semibold text-slate-400">Chức năng đang phát triển</h2>
                <p>Tính năng này thuộc phiên bản đầy đủ của XOXO.</p>
              </div>
            } />
          </Routes>
        </main>

        {/* Data Cleanup Tool - Only visible in development */}

      </div>
    </HashRouter>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;