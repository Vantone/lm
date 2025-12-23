
import React from 'react';
import { Material, InventoryRecord } from '../types';
import { getShanghaiDateString } from '../utils/dateUtils';
import { TrendingUp, ArrowUpRight, ArrowDownRight, PackageCheck, Truck, Store } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

interface DashboardProps {
  materials: Material[];
  records: InventoryRecord[];
}

const Dashboard: React.FC<DashboardProps> = ({ materials, records }) => {
  const today = getShanghaiDateString();
  const todayRecords = records.filter(r => r.date === today);

  const stats = [
    { label: '物料品种', value: materials.length, unit: '种', icon: <PackageCheck className="text-blue-600" />, color: 'bg-blue-50' },
    { label: '今日入库', value: todayRecords.reduce((acc, r) => acc + r.todayIn, 0), unit: '个', icon: <ArrowUpRight className="text-emerald-600" />, color: 'bg-emerald-50' },
    { label: '车间出库', value: todayRecords.reduce((acc, r) => acc + r.workshopOut, 0), unit: '个', icon: <Truck className="text-amber-600" />, color: 'bg-amber-50' },
    { label: '店面出库', value: todayRecords.reduce((acc, r) => acc + r.storeOut, 0), unit: '个', icon: <Store className="text-rose-600" />, color: 'bg-rose-50' },
  ];

  const chartData = todayRecords.map(r => {
    const mat = materials.find(m => m.id === r.materialId);
    return {
      name: mat?.name || '未知',
      stock: r.currentStock,
    };
  }).slice(0, 8);

  const categoryData = [
    { name: '食材', value: 40 },
    { name: '辅料', value: 30 },
    { name: '包材', value: 20 },
    { name: '工具', value: 10 },
  ];

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${stat.color}`}>
                {stat.icon}
              </div>
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                +12% <TrendingUp size={12} />
              </span>
            </div>
            <p className="text-slate-500 text-sm font-medium">{stat.label}</p>
            <div className="flex items-baseline gap-1 mt-1">
              <h3 className="text-2xl font-bold text-slate-800">{stat.value}</h3>
              <span className="text-slate-400 text-sm">{stat.unit}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">实时库存 TOP 8</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} tick={{ fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} fontSize={12} tick={{ fill: '#64748b' }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="stock" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">物料分类占比</h3>
          <div className="h-80 w-full flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-4 mt-4 w-full px-4">
              {categoryData.map((cat, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }}></div>
                  <span className="text-xs text-slate-600">{cat.name}: {cat.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
