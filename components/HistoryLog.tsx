
import React, { useState } from 'react';
import { Material, InventoryRecord } from '../types';
import { Search, Calendar, ChevronRight } from 'lucide-react';
import { getShanghaiDateString } from '../utils/dateUtils';

interface HistoryLogProps {
  materials: Material[];
  records: InventoryRecord[];
}

const HistoryLog: React.FC<HistoryLogProps> = ({ materials, records }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState(getShanghaiDateString(-7));
  const [endDate, setEndDate] = useState(getShanghaiDateString());

  const history = records.filter(r => {
    const mat = materials.find(m => m.id === r.materialId);
    const matchesSearch = mat?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRange = r.date >= startDate && r.date <= endDate;
    return matchesSearch && matchesRange;
  }).sort((a, b) => b.date.localeCompare(a.date));

  // Totals for the period
  const totalIn = history.reduce((acc, r) => acc + r.todayIn, 0);
  const totalWorkshopOut = history.reduce((acc, r) => acc + r.workshopOut, 0);
  const totalStoreOut = history.reduce((acc, r) => acc + r.storeOut, 0);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800 mb-6">历史变动查询</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="搜索物料名称..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <span className="text-slate-400">至</span>
            <div className="relative flex-1">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-xs"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
             <div className="flex-1 bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
                <p className="text-[10px] text-slate-500 uppercase font-bold">查询结果</p>
                <p className="text-sm font-bold text-slate-700">{history.length} 条记录</p>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl">
            <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">期间总入库</p>
            <p className="text-xl font-bold text-emerald-700">{totalIn}</p>
          </div>
          <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl">
            <p className="text-xs text-amber-600 font-bold uppercase tracking-wider">期间车间总出库</p>
            <p className="text-xl font-bold text-amber-700">{totalWorkshopOut}</p>
          </div>
          <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl">
            <p className="text-xs text-rose-600 font-bold uppercase tracking-wider">期间店面总出库</p>
            <p className="text-xl font-bold text-rose-700">{totalStoreOut}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-4">变动日期</th>
                <th className="px-6 py-4">物料详情</th>
                <th className="px-4 py-4 text-right">入库数量</th>
                <th className="px-4 py-4 text-right">车间出库</th>
                <th className="px-4 py-4 text-right">店面出库</th>
                <th className="px-4 py-4 text-right">变动后库存</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.map((record) => {
                const mat = materials.find(m => m.id === record.materialId);
                return (
                  <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-500 font-mono text-xs">{record.date}</td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-slate-900">{mat?.name}</p>
                        <p className="text-[10px] text-slate-400">{mat?.spec} | {mat?.unit}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right text-emerald-600 font-medium">+{record.todayIn}</td>
                    <td className="px-4 py-4 text-right text-amber-600 font-medium">-{record.workshopOut}</td>
                    <td className="px-4 py-4 text-right text-rose-600 font-medium">-{record.storeOut}</td>
                    <td className="px-4 py-4 text-right font-bold text-slate-800">
                      {record.currentStock}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HistoryLog;
