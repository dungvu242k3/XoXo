import React, { useState } from 'react';
import {
  Building2, Users, Wallet, Upload, Check, Save,
  Palette, Smartphone, Mail, Globe, MapPin, Shield,
  Database, RefreshCw
} from 'lucide-react';
import { supabase, DB_PATHS } from '../supabase';
import {
  DEFAULT_COMPANY_CONFIG, MOCK_ROLES, MOCK_SALARIES,
  MOCK_ORDERS, MOCK_INVENTORY, MOCK_CUSTOMERS,
  SERVICE_CATALOG, MOCK_PRODUCTS, MOCK_MEMBERS, MOCK_WORKFLOWS
} from '../constants';
import { ServiceType, SalaryConfig } from '../types';

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'ROLES' | 'SALARY' | 'DATABASE'>('GENERAL');
  const [isSeeding, setIsSeeding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Local state to simulate form handling
  const [companyInfo, setCompanyInfo] = useState(DEFAULT_COMPANY_CONFIG);
  const [themeColor, setThemeColor] = useState(DEFAULT_COMPANY_CONFIG.themeColor);
  const [roles, setRoles] = useState(MOCK_ROLES);
  const [salaries, setSalaries] = useState(MOCK_SALARIES);
  const [editingSalary, setEditingSalary] = useState<SalaryConfig | null>(null);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // Update company config
      const updatedCompany = { ...companyInfo, themeColor };

      // Save to Supabase (or local storage for now)
      // await supabase.from(DB_PATHS.SETTINGS).upsert({ company: updatedCompany, roles, salaries });

      // Simulate save
      await new Promise(resolve => setTimeout(resolve, 1000));

      alert('Đã lưu cài đặt thành công!');
    } catch (error) {
      console.error(error);
      alert('Lỗi khi lưu cài đặt: ' + error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateRolePermission = (roleId: string, permission: string, value: boolean) => {
    setRoles(roles.map(role =>
      role.id === roleId
        ? { ...role, permissions: { ...role.permissions, [permission]: value } }
        : role
    ));
  };

  const handleEditSalary = (salary: SalaryConfig) => {
    setEditingSalary({ ...salary });
  };

  const handleSaveSalary = () => {
    if (!editingSalary) return;
    setSalaries(salaries.map(s =>
      s.roleId === editingSalary.roleId ? editingSalary : s
    ));
    setEditingSalary(null);
    alert('Đã cập nhật cấu hình lương!');
  };

  const handleSeedDatabase = async () => {
    if (!window.confirm("Hành động này sẽ ghi đè toàn bộ dữ liệu mẫu lên Database của bạn. Bạn có chắc chắn không?")) return;

    setIsSeeding(true);
    try {
      // 1. Seed Orders
      const { error: ordersError } = await supabase
        .from(DB_PATHS.ORDERS)
        .upsert(MOCK_ORDERS, { onConflict: 'id' });
      if (ordersError) throw ordersError;

      // 2. Seed Inventory
      const { error: invError } = await supabase
        .from(DB_PATHS.INVENTORY)
        .upsert(MOCK_INVENTORY, { onConflict: 'id' });
      if (invError) throw invError;

      // 3. Seed Customers
      const { error: custError } = await supabase
        .from(DB_PATHS.CUSTOMERS)
        .upsert(MOCK_CUSTOMERS, { onConflict: 'id' });
      if (custError) throw custError;

      // 4. Seed Services
      const { error: svcError } = await supabase
        .from(DB_PATHS.SERVICES)
        .upsert(SERVICE_CATALOG, { onConflict: 'id' });
      if (svcError) throw svcError;

      // 5. Seed Products
      const { error: prodError } = await supabase
        .from(DB_PATHS.PRODUCTS)
        .upsert(MOCK_PRODUCTS, { onConflict: 'id' });
      if (prodError) throw prodError;

      // 6. Seed Workflows & Members
      const { error: wfError } = await supabase
        .from(DB_PATHS.WORKFLOWS)
        .upsert(MOCK_WORKFLOWS, { onConflict: 'id' });
      if (wfError) throw wfError;

      const { error: memError } = await supabase
        .from(DB_PATHS.MEMBERS)
        .upsert(MOCK_MEMBERS, { onConflict: 'id' });
      if (memError) throw memError;

      alert("Đã khởi tạo Database thành công với tên bảng Tiếng Việt!");
    } catch (error) {
      console.error(error);
      alert("Lỗi khi khởi tạo: " + error);
    } finally {
      setIsSeeding(false);
    }
  };

  const TABS = [
    { id: 'GENERAL', label: 'Thông Tin Chung', icon: Building2 },
    { id: 'ROLES', label: 'Phân Quyền', icon: Shield },
    { id: 'SALARY', label: 'Lương & Chi Phí', icon: Wallet },
    { id: 'DATABASE', label: 'Cơ Sở Dữ Liệu', icon: Database },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-100">Cài Đặt Hệ Thống</h1>
          <p className="text-slate-500 mt-1">Quản lý thông tin công ty, phân quyền và cấu hình tài chính.</p>
        </div>
        <button
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="flex items-center gap-2 bg-gold-600 hover:bg-gold-700 text-black font-medium px-6 py-2.5 rounded-lg shadow-lg shadow-gold-900/20 transition-all disabled:opacity-50"
        >
          {isSaving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
          <span>{isSaving ? 'Đang lưu...' : 'Lưu Thay Đổi'}</span>
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Settings Navigation */}
        <div className="w-full lg:w-64 flex-shrink-0">
          <div className="bg-neutral-900 rounded-xl shadow-lg shadow-black/20 border border-neutral-800 overflow-hidden sticky top-24">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-4 font-medium transition-colors text-left ${activeTab === tab.id
                  ? 'bg-neutral-800 text-gold-500 border-r-4 border-gold-500'
                  : 'text-slate-500 hover:bg-neutral-800 hover:text-slate-300'
                  }`}
              >
                <tab.icon size={20} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 space-y-6">

          {/* --- TAB 1: GENERAL SETTINGS --- */}
          {activeTab === 'GENERAL' && (
            <div className="bg-neutral-900 rounded-xl shadow-lg shadow-black/20 border border-neutral-800 p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Branding Section */}
              <div>
                <h3 className="text-lg font-bold text-slate-200 mb-6 flex items-center gap-2 pb-2 border-b border-neutral-800">
                  <Palette size={20} className="text-gold-500" />
                  Thương Hiệu & Giao Diện
                </h3>

                <div className="flex flex-col md:flex-row gap-8 items-start">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-32 h-32 rounded-xl bg-neutral-800 border-2 border-dashed border-neutral-700 flex items-center justify-center text-slate-500 relative overflow-hidden group cursor-pointer hover:border-gold-500 hover:text-gold-500 transition-colors">
                      <img src={companyInfo.logoUrl} alt="Logo" className="w-full h-full object-cover opacity-50 group-hover:opacity-30 transition-opacity" />
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <Upload size={24} />
                        <span className="text-xs mt-1">Tải logo</span>
                      </div>
                    </div>
                    <span className="text-xs text-slate-500">Định dạng: PNG, JPG (Max 2MB)</span>
                  </div>

                  <div className="flex-1 space-y-4 w-full">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">Tên Công Ty / Thương Hiệu</label>
                      <input
                        type="text"
                        value={companyInfo.name}
                        onChange={(e) => setCompanyInfo({ ...companyInfo, name: e.target.value })}
                        className="w-full p-2.5 border border-neutral-700 rounded-lg focus:ring-1 focus:ring-gold-500 outline-none bg-neutral-950 text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">Slogan</label>
                      <input
                        type="text"
                        value={companyInfo.slogan}
                        onChange={(e) => setCompanyInfo({ ...companyInfo, slogan: e.target.value })}
                        className="w-full p-2.5 border border-neutral-700 rounded-lg focus:ring-1 focus:ring-gold-500 outline-none bg-neutral-950 text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">Màu Chủ Đề</label>
                      <div className="flex gap-3">
                        {['#c68a35', '#2563eb', '#dc2626', '#16a34a', '#4f46e5'].map(color => (
                          <button
                            key={color}
                            onClick={() => setThemeColor(color)}
                            className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-transform hover:scale-110 ${themeColor === color ? 'border-white' : 'border-transparent'}`}
                            style={{ backgroundColor: color }}
                          >
                            {themeColor === color && <Check size={14} className="text-white" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div>
                <h3 className="text-lg font-bold text-slate-200 mb-6 flex items-center gap-2 pb-2 border-b border-neutral-800">
                  <Building2 size={20} className="text-gold-500" />
                  Thông Tin Liên Hệ (Hiển thị trên hóa đơn)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1 flex items-center gap-2"><MapPin size={14} /> Địa chỉ trụ sở</label>
                    <input
                      type="text"
                      value={companyInfo.address}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, address: e.target.value })}
                      className="w-full p-2.5 border border-neutral-700 rounded-lg focus:ring-1 focus:ring-gold-500 outline-none bg-neutral-950 text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1 flex items-center gap-2"><Smartphone size={14} /> Hotline</label>
                    <input
                      type="text"
                      value={companyInfo.phone}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, phone: e.target.value })}
                      className="w-full p-2.5 border border-neutral-700 rounded-lg focus:ring-1 focus:ring-gold-500 outline-none bg-neutral-950 text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1 flex items-center gap-2"><Mail size={14} /> Email</label>
                    <input
                      type="email"
                      value={companyInfo.email}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, email: e.target.value })}
                      className="w-full p-2.5 border border-neutral-700 rounded-lg focus:ring-1 focus:ring-gold-500 outline-none bg-neutral-950 text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1 flex items-center gap-2"><Globe size={14} /> Website</label>
                    <input
                      type="text"
                      value={companyInfo.website}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, website: e.target.value })}
                      className="w-full p-2.5 border border-neutral-700 rounded-lg focus:ring-1 focus:ring-gold-500 outline-none bg-neutral-950 text-slate-200"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --- TAB 2: ROLES & PERMISSIONS --- */}
          {activeTab === 'ROLES' && (
            <div className="bg-neutral-900 rounded-xl shadow-lg shadow-black/20 border border-neutral-800 p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-200">Phân Quyền Hệ Thống</h3>
                <button className="text-sm bg-slate-100 text-black px-3 py-1.5 rounded-lg hover:bg-white font-medium">Thêm Vai Trò</button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-800/50 border-b border-neutral-800">
                      <th className="p-4 font-semibold text-slate-400 min-w-[150px]">Vị Trí / Chức Năng</th>
                      <th className="p-4 font-semibold text-slate-400 text-center">Dashboard</th>
                      <th className="p-4 font-semibold text-slate-400 text-center">Khách Hàng</th>
                      <th className="p-4 font-semibold text-slate-400 text-center">Đơn Hàng</th>
                      <th className="p-4 font-semibold text-slate-400 text-center">Kho Vận</th>
                      <th className="p-4 font-semibold text-slate-400 text-center">Cài Đặt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {roles.map((role) => (
                      <tr key={role.id} className="hover:bg-neutral-800 transition-colors">
                        <td className="p-4 font-bold text-slate-200">{role.name}</td>
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={role.permissions.dashboard}
                            onChange={(e) => handleUpdateRolePermission(role.id, 'dashboard', e.target.checked)}
                            className="w-5 h-5 text-gold-600 rounded focus:ring-gold-500 border-neutral-600 bg-neutral-900 accent-gold-600 cursor-pointer"
                          />
                        </td>
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={role.permissions.customers}
                            onChange={(e) => handleUpdateRolePermission(role.id, 'customers', e.target.checked)}
                            className="w-5 h-5 text-gold-600 rounded focus:ring-gold-500 border-neutral-600 bg-neutral-900 accent-gold-600 cursor-pointer"
                          />
                        </td>
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={role.permissions.orders}
                            onChange={(e) => handleUpdateRolePermission(role.id, 'orders', e.target.checked)}
                            className="w-5 h-5 text-gold-600 rounded focus:ring-gold-500 border-neutral-600 bg-neutral-900 accent-gold-600 cursor-pointer"
                          />
                        </td>
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={role.permissions.inventory}
                            onChange={(e) => handleUpdateRolePermission(role.id, 'inventory', e.target.checked)}
                            className="w-5 h-5 text-gold-600 rounded focus:ring-gold-500 border-neutral-600 bg-neutral-900 accent-gold-600 cursor-pointer"
                          />
                        </td>
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={role.permissions.settings}
                            onChange={(e) => handleUpdateRolePermission(role.id, 'settings', e.target.checked)}
                            className="w-5 h-5 text-gold-600 rounded focus:ring-gold-500 border-neutral-600 bg-neutral-900 accent-gold-600 cursor-pointer"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* --- TAB 3: SALARY & COSTS --- */}
          {activeTab === 'SALARY' && (
            <div className="bg-neutral-900 rounded-xl shadow-lg shadow-black/20 border border-neutral-800 p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-lg font-bold text-slate-200 mb-4">Cấu Hình Lương & Hoa Hồng</h3>
              <p className="text-slate-500 text-sm mb-6">Thiết lập lương cơ bản và tỷ lệ hoa hồng (Commission) cho từng vị trí dựa trên loại dịch vụ.</p>

              <div className="space-y-8">
                {salaries.map((salary) => {
                  const roleName = roles.find(r => r.id === salary.roleId)?.name || salary.roleId;

                  return (
                    <div key={salary.roleId} className="border border-neutral-800 rounded-xl p-6 bg-neutral-800/30">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-slate-200 text-lg">{roleName}</h4>
                        <button
                          onClick={() => handleEditSalary(salary)}
                          className="text-gold-500 text-sm font-medium hover:underline"
                        >
                          Chỉnh sửa
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                          <label className="text-xs font-semibold text-slate-500 uppercase">Lương Cơ Bản</label>
                          <div className="text-lg font-mono font-medium text-slate-200">{salary.baseSalary.toLocaleString('vi-VN')} ₫</div>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-500 uppercase">Phụ Cấp</label>
                          <div className="text-lg font-mono font-medium text-slate-200">{salary.allowance.toLocaleString('vi-VN')} ₫</div>
                        </div>
                      </div>

                      <div className="bg-neutral-900 rounded-lg border border-neutral-800 overflow-hidden">
                        <div className="px-4 py-2 bg-neutral-800 border-b border-neutral-700 text-xs font-bold text-slate-400 uppercase">
                          Tỷ lệ hoa hồng theo dịch vụ
                        </div>
                        <div className="divide-y divide-neutral-800">
                          {Object.entries(salary.commissionRate).map(([type, rate]) => (
                            <div key={type} className="flex justify-between px-4 py-3">
                              <span className="text-sm font-medium text-slate-400">Dịch vụ {type}</span>
                              <span className="text-sm font-bold text-emerald-500">{rate}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Modal Chỉnh Sửa Lương */}
              {editingSalary && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                  <div className="bg-neutral-900 rounded-xl shadow-2xl border border-neutral-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                    <div className="sticky top-0 bg-neutral-900 border-b border-neutral-800 p-6 flex justify-between items-center">
                      <h2 className="text-xl font-serif font-bold text-slate-100">
                        Chỉnh Sửa Lương - {roles.find(r => r.id === editingSalary.roleId)?.name || editingSalary.roleId}
                      </h2>
                      <button
                        onClick={() => setEditingSalary(null)}
                        className="text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="p-6 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-400 mb-2">
                            Lương Cơ Bản (₫) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            value={editingSalary.baseSalary}
                            onChange={(e) => setEditingSalary({ ...editingSalary, baseSalary: parseInt(e.target.value) || 0 })}
                            className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-400 mb-2">
                            Phụ Cấp (₫) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            value={editingSalary.allowance}
                            onChange={(e) => setEditingSalary({ ...editingSalary, allowance: parseInt(e.target.value) || 0 })}
                            className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-4">
                          Tỷ Lệ Hoa Hồng Theo Dịch Vụ (%)
                        </label>
                        <div className="space-y-3">
                          {Object.entries(editingSalary.commissionRate).map(([type, rate]) => (
                            <div key={type} className="flex items-center justify-between p-3 bg-neutral-800 rounded-lg border border-neutral-700">
                              <span className="text-sm font-medium text-slate-300">Dịch vụ {type}</span>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.1"
                                  value={rate}
                                  onChange={(e) => setEditingSalary({
                                    ...editingSalary,
                                    commissionRate: {
                                      ...editingSalary.commissionRate,
                                      [type]: parseFloat(e.target.value) || 0
                                    }
                                  })}
                                  className="w-24 px-3 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none text-sm"
                                />
                                <span className="text-sm text-slate-400">%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="sticky bottom-0 bg-neutral-900 border-t border-neutral-800 p-6 flex gap-3 justify-end">
                      <button
                        onClick={() => setEditingSalary(null)}
                        className="px-6 py-2.5 border border-neutral-700 bg-neutral-800 text-slate-300 rounded-lg hover:bg-neutral-700 transition-colors"
                      >
                        Hủy
                      </button>
                      <button
                        onClick={handleSaveSalary}
                        className="px-6 py-2.5 bg-gold-600 hover:bg-gold-700 text-black font-medium rounded-lg shadow-lg shadow-gold-900/20 transition-all"
                      >
                        Lưu Thay Đổi
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* --- TAB 4: DATABASE --- */}
          {activeTab === 'DATABASE' && (
            <div className="bg-neutral-900 rounded-xl shadow-lg shadow-black/20 border border-neutral-800 p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-neutral-800">
                <Database size={24} className="text-gold-500" />
                <div>
                  <h3 className="text-lg font-bold text-slate-200">Quản Lý Database (Supabase)</h3>
                  <p className="text-sm text-slate-500">Cấu hình kết nối và dữ liệu mẫu.</p>
                </div>
              </div>

              <div className="bg-blue-900/10 border border-blue-900/30 rounded-lg p-4 mb-6">
                <h4 className="font-bold text-blue-400 mb-2">Trạng thái kết nối</h4>
                <div className="text-sm text-slate-300">
                  <p>Database: <span className="font-mono text-slate-400">Supabase PostgreSQL</span></p>
                  <p className="mt-1 flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                    Đang kết nối Realtime
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-200 mb-2">Khởi tạo dữ liệu</h4>
                <p className="text-sm text-slate-500 mb-4">
                  Nếu database của bạn đang trống, hãy nhấn nút dưới đây để tạo cấu trúc bảng (Tiếng Việt) và nạp dữ liệu mẫu ban đầu.
                </p>
                <button
                  onClick={handleSeedDatabase}
                  disabled={isSeeding}
                  className="flex items-center gap-2 px-5 py-3 bg-neutral-800 hover:bg-gold-600 hover:text-black text-slate-300 rounded-lg font-medium transition-all disabled:opacity-50"
                >
                  {isSeeding ? <RefreshCw size={18} className="animate-spin" /> : <Database size={18} />}
                  {isSeeding ? 'Đang xử lý...' : 'Nạp lại cấu trúc bảng (Empty)'}
                </button>
                <p className="text-xs text-red-500 mt-2 italic">* Lưu ý: Các dữ liệu mẫu hệ thống hiện tại đã được làm trống.</p>
              </div>


            </div>
          )}
        </div>
      </div>
    </div>
  );
};