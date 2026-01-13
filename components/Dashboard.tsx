import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { DollarSign, ShoppingBag, Users, AlertCircle, Phone, Calendar } from 'lucide-react';
import { REVENUE_DATA, MOCK_CRM_TASKS } from '../constants';
import { CRMTask } from '../types';

const KPICard = ({ title, value, icon: Icon, trend }: { title: string, value: string, icon: any, trend: string }) => (
  <div className="bg-neutral-900 p-6 rounded-xl shadow-lg shadow-black/20 border border-neutral-800 flex items-start justify-between group hover:border-gold-900/50 transition-colors">
    <div>
      <p className="text-slate-500 text-sm font-medium uppercase tracking-wider group-hover:text-gold-500 transition-colors">{title}</p>
      <h3 className="text-2xl font-bold mt-2 text-slate-100 font-serif">{value}</h3>
      <p className="text-emerald-500 text-sm mt-1 font-medium">{trend}</p>
    </div>
    <div className="p-3 bg-neutral-800 rounded-lg text-gold-500 group-hover:bg-gold-500 group-hover:text-black transition-colors">
      <Icon size={24} />
    </div>
  </div>
);

const CRMTaskRow: React.FC<{ task: CRMTask }> = ({ task }) => {
  const getTaskLabel = (type: string) => {
    switch(type) {
      case 'Call Day 3': return 'Gọi chăm sóc ngày 3';
      case 'Call Day 5': return 'Gọi chăm sóc ngày 5';
      case 'Call Day 7': return 'Gọi chăm sóc ngày 7';
      default: return type;
    }
  };

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'Pending': return 'Chờ xử lý';
      case 'Overdue': return 'Quá hạn';
      case 'Done': return 'Hoàn thành';
      default: return status;
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border-b border-neutral-800 last:border-0 hover:bg-neutral-800 transition-colors">
      <div className="flex items-center gap-4">
        <div className={`p-2 rounded-full ${task.status === 'Overdue' ? 'bg-red-900/20 text-red-500' : 'bg-blue-900/20 text-blue-500'}`}>
          <Phone size={16} />
        </div>
        <div>
          <h4 className="font-semibold text-slate-200">{task.customerName}</h4>
          <p className="text-sm text-slate-500">{getTaskLabel(task.type)}</p>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-sm font-medium ${task.status === 'Overdue' ? 'text-red-500' : 'text-slate-500'}`}>
          {task.dueDate}
        </p>
        <span className={`text-xs px-2 py-1 rounded-full ${task.status === 'Overdue' ? 'bg-red-900/30 text-red-400 border border-red-900/50' : 'bg-neutral-800 text-slate-400 border border-neutral-700'}`}>
          {getStatusLabel(task.status)}
        </span>
      </div>
    </div>
  );
};

export const Dashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard title="Tổng Doanh Thu" value="158.2M ₫" icon={DollarSign} trend="+12.5% so với tháng trước" />
        <KPICard title="Đơn Đang Xử Lý" value="24" icon={ShoppingBag} trend="+4 đơn mới hôm nay" />
        <KPICard title="Khách Hàng" value="1,204" icon={Users} trend="+18 tuần này" />
        <KPICard title="Việc Cần Làm Gấp" value="3" icon={AlertCircle} trend="Cần chú ý ngay" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts Section */}
        <div className="lg:col-span-2 bg-neutral-900 p-6 rounded-xl shadow-lg shadow-black/20 border border-neutral-800">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-serif font-bold text-slate-100">Biểu Đồ Doanh Thu</h2>
            <select className="bg-neutral-800 border border-neutral-700 text-slate-300 text-sm rounded-md p-2 outline-none focus:border-gold-500">
              <option>7 Ngày Qua</option>
              <option>Tháng Này</option>
            </select>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={REVENUE_DATA}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#c68a35" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#c68a35" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#262626" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#737373'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#737373'}} tickFormatter={(value) => `${value/1000000}M`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#171717', borderRadius: '8px', border: '1px solid #333', color: '#fff' }}
                  itemStyle={{ color: '#c68a35' }}
                  formatter={(value: number) => [`${value.toLocaleString('vi-VN')} ₫`, 'Doanh thu']}
                />
                <Area type="monotone" dataKey="value" stroke="#c68a35" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CRM Tasks (3-5-7 Rule) */}
        <div className="bg-neutral-900 p-6 rounded-xl shadow-lg shadow-black/20 border border-neutral-800">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-serif font-bold text-slate-100">CSKH (Quy tắc 3-5-7)</h2>
            <div className="p-2 bg-neutral-800 rounded-lg text-slate-400 cursor-pointer hover:bg-neutral-700">
              <Calendar size={18} />
            </div>
          </div>
          <div className="flex flex-col">
            {MOCK_CRM_TASKS.map(task => (
              <CRMTaskRow key={task.id} task={task} />
            ))}
            <button className="mt-4 w-full py-2 text-sm text-gold-500 font-medium hover:bg-neutral-800 rounded-lg transition-colors border border-dashed border-neutral-700 hover:border-gold-500/50">
              Xem Tất Cả
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};