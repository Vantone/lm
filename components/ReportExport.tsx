
import React, { useState } from 'react';
import { Material, InventoryRecord } from '../types';
import { Calendar, CheckSquare, Square, FileSpreadsheet, ArrowRight, Loader2 } from 'lucide-react';
import { dataService } from '../services/dataService';
import { getShanghaiDateString } from '../utils/dateUtils';

interface ReportExportProps {
  materials: Material[];
  records: InventoryRecord[];
}

const COLUMNS = [
  { id: 'serial', label: '序号' },
  { id: 'name', label: '物料名称' },
  { id: 'tags', label: '标签' },
  { id: 'unit', label: '基本计量单位' },
  { id: 'spec', label: '物料单位' },
  { id: 'yesterdayStock', label: '昨日库存' },
  { id: 'todayIn', label: '今日入库' },
  { id: 'workshopOut', label: '车间出库' },
  { id: 'storeOut', label: '店面出库' },
  { id: 'currentStock', label: '今日库存' },
  { id: 'date', label: '日期' },
];

const ReportExport: React.FC<ReportExportProps> = ({ materials, records }) => {
  const [selectedDate, setSelectedDate] = useState(getShanghaiDateString());
  const [selectedCols, setSelectedCols] = useState<string[]>(COLUMNS.map(c => c.id));
  const [isGenerating, setIsGenerating] = useState(false);

  const toggleCol = (id: string) => {
    setSelectedCols(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleExport = () => {
    setIsGenerating(true);
    
    // 获取选定日期的记录
    const filteredRecords = records.filter(r => r.date === selectedDate);
    
    // 准备导出数据
    const exportData = filteredRecords.map((record, index) => {
      const material = materials.find(m => m.id === record.materialId);
      const row: any = {};
      
      selectedCols.forEach(colId => {
        switch(colId) {
          case 'serial':
            row['序号'] = index + 1;
            break;
          case 'name':
            row['物料名称'] = material?.name || '';
            break;
          case 'tags':
            row['标签'] = material?.tags || '';
            break;
          case 'unit':
            row['基本计量单位'] = material?.unit || '';
            break;
          case 'spec':
            row['物料单位'] = material?.spec || '';
            break;
          case 'yesterdayStock':
            row['昨日库存'] = record.yesterdayStock;
            break;
          case 'todayIn':
            row['今日入库'] = record.todayIn;
            break;
          case 'workshopOut':
            row['车间出库'] = record.workshopOut;
            break;
          case 'storeOut':
            row['店面出库'] = record.storeOut;
            break;
          case 'currentStock':
            row['今日库存'] = record.currentStock;
            break;
          case 'date':
            row['日期'] = record.date;
            break;
        }
      });
      
      return row;
    });
    
    // 生成CSV内容
    if (exportData.length > 0) {
      const headers = selectedCols.map(colId => {
        const col = COLUMNS.find(c => c.id === colId);
        return col ? col.label : colId;
      });
      
      const csvContent = [
        headers.join(','),
        ...exportData.map(row => 
          selectedCols.map(colId => {
            const col = COLUMNS.find(c => c.id === colId);
            const value = row[col?.label || colId];
            return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
          }).join(',')
        )
      ].join('\n');
      
      // 创建下载
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `物料统计报表_${selectedDate}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      dataService.addAuditLog('报表导出', `导出了日期为 ${selectedDate} 的物料报表，包含 ${exportData.length} 条记录`);
    } else {
      alert(`日期 ${selectedDate} 没有找到相关数据！`);
    }
    
    setTimeout(() => {
      setIsGenerating(false);
    }, 1000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-xl font-bold text-slate-800 mb-8 flex items-center gap-2">
          <FileSpreadsheet className="text-indigo-600" />
          物料报表导出配置
        </h3>

        <div className="space-y-10">
          {/* Step 1 */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">1</div>
              <h4 className="text-lg font-semibold text-slate-800">第一步：选择导出日期 (截止今日)</h4>
            </div>
            <div className="ml-11 flex items-center gap-4">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="date" 
                  max={getShanghaiDateString()}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="pl-11 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-64"
                />
              </div>
              <p className="text-sm text-slate-400 italic">系统将生成此日期的库存快照报表</p>
            </div>
          </section>

          {/* Step 2 */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">2</div>
              <h4 className="text-lg font-semibold text-slate-800">第二步：勾选需要导出的列</h4>
            </div>
            <div className="ml-11 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {COLUMNS.map(col => (
                <button
                  key={col.id}
                  onClick={() => toggleCol(col.id)}
                  className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
                    selectedCols.includes(col.id)
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                      : 'bg-white border-slate-100 text-slate-500 grayscale hover:grayscale-0'
                  }`}
                >
                  {selectedCols.includes(col.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                  <span className="text-sm font-medium">{col.label}</span>
                </button>
              ))}
            </div>
          </section>

          <div className="pt-6 border-t border-slate-100 flex justify-end">
            <button
              onClick={handleExport}
              disabled={isGenerating || selectedCols.length === 0}
              className="flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:bg-slate-300 disabled:shadow-none transition-all"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  生成报表中...
                </>
              ) : (
                <>
                  生成并导出 Excel
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-slate-100 p-6 rounded-2xl border border-dashed border-slate-300">
        <h5 className="text-xs font-bold text-slate-500 uppercase mb-3">预览导出的数据结构</h5>
        <div className="flex flex-wrap gap-2">
          {selectedCols.map(id => (
            <span key={id} className="bg-white px-3 py-1 rounded-full text-[10px] text-slate-600 border border-slate-200">
              {COLUMNS.find(c => c.id === id)?.label}
            </span>
          ))}
          {selectedCols.length === 0 && <span className="text-xs text-rose-500 italic">请至少选择一列导出</span>}
        </div>
      </div>
    </div>
  );
};

export default ReportExport;
