
import React, { useState, useMemo } from 'react';
import { Material, InventoryRecord } from '../types';
import { Search, Plus, FileUp, RotateCcw, Trash2, Calendar, ArrowDownLeft, ArrowUpRight, Warehouse, X, Tag } from 'lucide-react';
import { dataService } from '../services/dataService';
import * as XLSX from 'xlsx';
import { getShanghaiDateString } from '../utils/dateUtils';

interface InventoryManagerProps {
  materials: Material[];
  records: InventoryRecord[];
  onDataChange: () => void;
}

const InventoryManager: React.FC<InventoryManagerProps> = ({ materials, records, onDataChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(getShanghaiDateString());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Form states
  const [newMatName, setNewMatName] = useState('');
  const [newMatUnit, setNewMatUnit] = useState('');
  const [newMatSpec, setNewMatSpec] = useState('');
  const [newMatTags, setNewMatTags] = useState('');
  const [newMatYesterdayStock, setNewMatYesterdayStock] = useState<number>(0);

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    console.log(`切换到日期: ${newDate}`);
  };

  const displayRecords = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return materials
      .filter(m => 
        m.name.toLowerCase().includes(term) || 
        (m.tags && m.tags.toLowerCase().includes(term))
      )
      .map(m => {
        const record = dataService.getOrCreateRecord(m.id, selectedDate);
        console.log(`物料 ${m.name} 在 ${selectedDate} 的记录:`, record);
        return record;
      });
  }, [materials, searchTerm, selectedDate, records]);

  const handleInputChange = async (id: string, field: keyof InventoryRecord, value: string) => {
    const numValue = parseInt(value) || 0;
    dataService.updateRecordValues(id, { [field]: numValue });
    onDataChange();
    // 尝试同步到服务器
    const success = await dataService.pushToServer();
    setSaveStatus(success ? '数据已保存到服务器' : '数据已保存到本地');
    setTimeout(() => setSaveStatus(null), 2000);
  };

  const handleSingleDelete = async (materialId: string) => {
    if (confirm('确定要删除该物料吗？这将同时清空该物料的所有历史库存记录。')) {
      dataService.deleteMaterials([materialId]);
      const success = await dataService.pushToServer();
      setSaveStatus(success ? '数据已保存到服务器' : '数据已保存到本地');
      setTimeout(() => setSaveStatus(null), 2000);
      onDataChange();
    }
  };

  const handleBatchDelete = async () => {
    if (confirm(`确定要批量删除选中的 ${selectedIds.length} 个物料吗？操作不可撤销。`)) {
      dataService.deleteMaterials(selectedIds);
      const success = await dataService.pushToServer();
      setSaveStatus(success ? '数据已保存到服务器' : '数据已保存到本地');
      setTimeout(() => setSaveStatus(null), 2000);
      setSelectedIds([]);
      onDataChange();
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === displayRecords.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(displayRecords.map(r => r.materialId));
    }
  };

  const handleAddMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = Math.random().toString(36).substr(2, 9);
    const newMat: Material = { 
      id: newId, 
      name: newMatName, 
      unit: newMatUnit, 
      spec: newMatSpec, 
      tags: newMatTags,
      category: '其他' 
    };
    
    dataService.setMaterials([...materials, newMat]);
    dataService.getOrCreateRecord(newId, selectedDate);
    
    const allRecs = dataService.getRecords();
    const targetIdx = allRecs.findIndex(r => r.materialId === newId && r.date === selectedDate);
    if (targetIdx !== -1) {
      allRecs[targetIdx].yesterdayStock = newMatYesterdayStock;
      allRecs[targetIdx].currentStock = newMatYesterdayStock;
      dataService.setRecords(allRecs);
    }

    dataService.addAuditLog('添加物料', `添加了新物料: ${newMatName}`);
    // 强制同步到服务器
    dataService.pushToServer().then(success => {
      setSaveStatus(success ? '数据已保存到服务器' : '数据已保存到本地');
      setTimeout(() => setSaveStatus(null), 2000);
    });
    setIsAddModalOpen(false);
    setNewMatName(''); setNewMatUnit(''); setNewMatSpec(''); setNewMatTags(''); setNewMatYesterdayStock(0);
    onDataChange();
  };

  const handleBatchImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        let content: string;
        let lines: string[][];
        
        // 处理Excel文件（智能解析，支持表格式和列式）
        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // 检测是否为列式数据（第一行为非空，第二行也可能为非空，但第三行可能很空）
          const firstRow = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: 1 })[0] || [];
          const isColumnarData = firstRow.length <= 2; // 如果第一行数据很少，可能是列式
          
          if (isColumnarData) {
            // 列式数据：将列转换为行
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            // 找到最长的列
            const maxColumnLength = Math.max(...jsonData.map((col: any) => Array.isArray(col) ? col.length : 0));
            
            // 转置数据：列转行
            const transposedData: string[][] = [];
            for (let row = 0; row < maxColumnLength; row++) {
              const rowData: string[] = [];
              for (let col = 0; col < jsonData.length; col++) {
                const column = jsonData[col];
                const value = Array.isArray(column) && column[row] ? String(column[row] || '').trim() : '';
                rowData.push(value);
              }
              // 只有当这行有有效数据时才加入
              if (rowData.some(cell => cell.trim())) {
                transposedData.push(rowData);
              }
            }
            
            lines = transposedData;
          } else {
            // 表格式数据
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            lines = jsonData.map((row: any) => 
              Array.isArray(row) ? row.map((cell: any) => String(cell || '').trim()) : []
            );
          }
        } else {
          // 处理CSV和JSON文件
          content = event.target?.result as string;
          lines = content.split('\n').filter(line => line.trim()).map(line => line.trim());
        }
        
        if (file.name.endsWith('.json')) {
          // 处理 JSON 格式导入
          const data = JSON.parse(content);
          
          if (data.materials && Array.isArray(data.materials)) {
            // 导入物料
            const newMaterials = [...materials, ...data.materials];
            dataService.setMaterials(newMaterials);
            
            // 导入库存记录（如果存在）
            if (data.records && Array.isArray(data.records)) {
              const currentRecords = dataService.getRecords();
              const newRecords: any[] = [];
              
              data.records.forEach((record: any) => {
                // 根据物料名称查找对应的物料ID
                const material = newMaterials.find(m => m.name === record.materialName);
                if (material) {
                  const inventoryRecord = {
                    id: `rec-${material.id}-${record.date || selectedDate}`,
                    materialId: material.id,
                    date: record.date || selectedDate,
                    yesterdayStock: record.yesterdayStock || 0,
                    todayIn: record.todayIn || 0,
                    workshopOut: record.workshopOut || 0,
                    storeOut: record.storeOut || 0,
                    currentStock: record.currentStock || 0
                  };
                  newRecords.push(inventoryRecord);
                }
              });
              
              const updatedRecords = [...currentRecords, ...newRecords];
              dataService.setRecords(updatedRecords);
              dataService.addAuditLog('批量导入', `从JSON文件导入了 ${data.materials.length} 个物料和 ${newRecords.length} 条库存记录`);
              // 强制同步到服务器
              dataService.pushToServer().then(success => {
                const message = `成功导入 ${data.materials.length} 个物料和 ${newRecords.length} 条库存记录！${success ? '数据已保存到服务器。' : '数据已保存到本地存储。'}`;
                alert(message);
                setSaveStatus(success ? '数据已保存到服务器' : '数据已保存到本地');
                setTimeout(() => setSaveStatus(null), 3000);
              });
            } else {
              // 只有物料数据，自动创建空库存记录
              data.materials.forEach((mat: Material) => {
                if (!materials.find(m => m.id === mat.id)) {
                  dataService.getOrCreateRecord(mat.id, selectedDate);
                }
              });
              dataService.addAuditLog('批量导入', `从JSON文件导入了 ${data.materials.length} 个物料`);
              // 强制同步到服务器
              dataService.pushToServer().then(success => {
                const message = `成功导入 ${data.materials.length} 个物料！${success ? '数据已保存到服务器。' : '数据已保存到本地存储。'}`;
                alert(message);
                setSaveStatus(success ? '数据已保存到服务器' : '数据已保存到本地');
                setTimeout(() => setSaveStatus(null), 3000);
              });
            }
            onDataChange();
          } else if (Array.isArray(data)) {
            // 直接是物料数组
            const newMaterials = [...materials, ...data];
            dataService.setMaterials(newMaterials);
            
            data.forEach((mat: Material) => {
              if (!materials.find(m => m.id === mat.id)) {
                dataService.getOrCreateRecord(mat.id, selectedDate);
              }
            });
            
            dataService.addAuditLog('批量导入', `从文件导入了 ${data.length} 个物料`);
            // 强制同步到服务器
            dataService.pushToServer().then(success => {
              const message = `成功导入 ${data.length} 个物料！${success ? '数据已保存到服务器。' : '数据已保存到本地存储。'}`;
              alert(message);
              setSaveStatus(success ? '数据已保存到服务器' : '数据已保存到本地');
              setTimeout(() => setSaveStatus(null), 3000);
            });
            onDataChange();
          } else {
            alert('JSON 格式不正确，请确保文件包含 materials 数组或直接是物料数组。');
          }
        } else if (file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          // 处理 CSV 和 Excel 格式导入
          if (lines.length < 10) { // 至少需要10列数据
            alert(`${file.name.endsWith('.csv') ? 'CSV' : 'Excel'} 文件格式不正确，需要包含完整的列数据`);
            return;
          }

          let headers: string[];
          let dataRows: string[][];
          
          if (file.name.endsWith('.csv')) {
            // CSV 格式：按行解析
            headers = lines[0].split(',').map(h => h.trim());
            dataRows = lines.slice(1).map(line => line.split(',').map(v => v.trim()));
          } else {
            // Excel 格式：智能处理
            headers = lines[0] || [];
            dataRows = lines.slice(1);
          }
          // 支持中英文标题和库存数据格式
          const headerMapping: { [key: string]: number } = {};
          headers.forEach((header, index) => {
            const lowerHeader = header.toLowerCase();
            if (lowerHeader.includes('name') || lowerHeader.includes('物料名称') || lowerHeader.includes('序号')) headerMapping['name'] = index;
            else if (lowerHeader.includes('unit') || lowerHeader.includes('基本计量单位')) headerMapping['unit'] = index;
            else if (lowerHeader.includes('spec') || lowerHeader.includes('物料单位')) headerMapping['spec'] = index;
            else if (lowerHeader.includes('category') || lowerHeader.includes('分类')) headerMapping['category'] = index;
            else if (lowerHeader.includes('tag') || lowerHeader.includes('标签')) headerMapping['tags'] = index;
            else if (lowerHeader.includes('yesterday') || lowerHeader.includes('昨日库存')) headerMapping['yesterdayStock'] = index;
            else if (lowerHeader.includes('todayin') || lowerHeader.includes('今日入库')) headerMapping['todayIn'] = index;
            else if (lowerHeader.includes('workshop') || lowerHeader.includes('车间出库')) headerMapping['workshopOut'] = index;
            else if (lowerHeader.includes('store') || lowerHeader.includes('店面出库')) headerMapping['storeOut'] = index;
            else if (lowerHeader.includes('current') || lowerHeader.includes('今日库存') || lowerHeader.includes('实时库存')) headerMapping['currentStock'] = index;
            else if (lowerHeader.includes('date') || lowerHeader.includes('日期')) headerMapping['date'] = index;
          });

          if (headerMapping.name === undefined || headerMapping.unit === undefined) {
            alert(`${file.name.endsWith('.csv') ? 'CSV' : 'Excel'} 文件必须包含以下列：物料信息/名称(name), 计量单位(unit)`);
            return;
          }

          const newMaterials: Material[] = [];
          const newRecords: any[] = [];
          let hasInventoryData = false;

          dataRows.forEach((line, index) => {
            if (line.length > 0 && line.some(cell => cell && cell.toString().trim())) {
              const values = line.map(v => String(v || '').trim());
              if (values.length >= 2) {
                const material: Material = {
                  id: `import-${Date.now()}-${index}`,
                  name: values[headerMapping.name],
                  unit: values[headerMapping.unit],
                  spec: values[headerMapping.spec] || values[headerMapping.name], // 如果没有规格，用名称代替
                  category: values[headerMapping.category] || '其他',
                  tags: values[headerMapping.tags] || ''
                };
                newMaterials.push(material);

                // 检查是否有库存数据
                if (headerMapping.yesterdayStock !== undefined || 
                    headerMapping.todayIn !== undefined ||
                    headerMapping.workshopOut !== undefined ||
                    headerMapping.storeOut !== undefined) {
                  hasInventoryData = true;
                  
                  const yesterdayStock = parseInt(values[headerMapping.yesterdayStock] || '0') || 0;
                  const todayIn = parseInt(values[headerMapping.todayIn] || '0') || 0;
                  const workshopOut = parseInt(values[headerMapping.workshopOut] || '0') || 0;
                  const storeOut = parseInt(values[headerMapping.storeOut] || '0') || 0;
                  const currentStockFromCsv = parseInt(values[headerMapping.currentStock] || '0') || 0;
                  const recordDate = values[headerMapping.date] || selectedDate;
                  
                  const calculatedCurrentStock = yesterdayStock + todayIn - workshopOut - storeOut;
                  const currentStock = currentStockFromCsv > 0 ? currentStockFromCsv : calculatedCurrentStock;

                  newRecords.push({
                    id: `rec-${material.id}-${recordDate}`,
                    materialId: material.id,
                    date: recordDate,
                    yesterdayStock,
                    todayIn,
                    workshopOut,
                    storeOut,
                    currentStock
                  });
                }
              }
            }
          });

          if (newMaterials.length > 0) {
            // 导入物料
            const updatedMaterials = [...materials, ...newMaterials];
            dataService.setMaterials(updatedMaterials);
            
            // 导入库存记录（如果有）
            if (hasInventoryData && newRecords.length > 0) {
              const currentRecords = dataService.getRecords();
              const updatedRecords = [...currentRecords, ...newRecords];
              dataService.setRecords(updatedRecords);
              dataService.addAuditLog('批量导入', `从${file.name.endsWith('.csv') ? 'CSV' : 'Excel'}文件导入了 ${newMaterials.length} 个物料及其库存数据`);
              // 强制同步到服务器
              dataService.pushToServer().then(success => {
                const message = `成功导入 ${newMaterials.length} 个物料和 ${newRecords.length} 条库存记录！${success ? '数据已保存到服务器。' : '数据已保存到本地存储。'}`;
                alert(message);
                setSaveStatus(success ? '数据已保存到服务器' : '数据已保存到本地');
                setTimeout(() => setSaveStatus(null), 3000);
              });
            } else {
              // 只导入物料，自动创建空库存记录
              newMaterials.forEach(mat => {
                dataService.getOrCreateRecord(mat.id, selectedDate);
              });
              dataService.addAuditLog('批量导入', `从${file.name.endsWith('.csv') ? 'CSV' : 'Excel'}文件导入了 ${newMaterials.length} 个物料`);
              // 强制同步到服务器
              dataService.pushToServer().then(success => {
                const message = `成功导入 ${newMaterials.length} 个物料！${success ? '数据已保存到服务器。' : '数据已保存到本地存储。'}`;
                alert(message);
                setSaveStatus(success ? '数据已保存到服务器' : '数据已保存到本地');
                setTimeout(() => setSaveStatus(null), 3000);
              });
            }
            onDataChange();
          } else {
            alert(`${file.name.endsWith('.csv') ? 'CSV' : 'Excel'} 文件中没有找到有效的物料数据`);
          }
        } else {
          alert('不支持的文件格式，请选择 .json、.csv、.xlsx 或 .xls 文件');
        }
      } catch (error) {
        console.error('导入错误:', error);
        alert('文件解析失败，请检查文件格式是否正确');
      }
    };
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
    
    // 重置文件输入
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* 状态提示 */}
      {saveStatus && (
        <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-right-full duration-300">
          <div className="bg-white px-6 py-3 rounded-full shadow-lg border border-slate-100 flex items-center gap-3">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-bold text-slate-700">{saveStatus}</span>
          </div>
        </div>
      )}
      <div className="hidden md:flex items-center justify-between mb-2">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">实时库存管理</h2>
        <div className="flex items-center gap-2 bg-indigo-50/50 px-4 py-1.5 rounded-full border border-indigo-100">
          <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
          <span className="text-xs font-bold text-indigo-600">系统日期: {selectedDate}</span>
        </div>
      </div>

      {/* 桌面端布局 - 保持原样 */}
      <div className="hidden md:flex bg-white p-2 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex items-center gap-3">
        <div className="relative flex-1 ml-4">
          <Search className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="搜索物料名称或标签..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-4 py-4 text-base bg-transparent border-none focus:ring-0 placeholder:text-slate-300 font-medium"
          />
        </div>
        
        <div className="flex items-center gap-3 mr-2">
          {selectedIds.length > 0 && (
            <button 
              onClick={handleBatchDelete}
              className="hidden md:flex items-center gap-2 px-4 py-3 bg-rose-50 text-rose-600 rounded-2xl text-sm font-bold hover:bg-rose-100 transition-colors"
            >
              <Trash2 size={18} />
              删除选中 ({selectedIds.length})
            </button>
          )}

          <div className="flex items-center gap-2 bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100">
            <Calendar size={18} className="text-indigo-500" />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="bg-transparent border-none p-0 text-sm font-bold text-indigo-600 focus:ring-0"
            />
          </div>

          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="p-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
          >
            <Plus size={24} />
          </button>

          <label className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-100 transition-all cursor-pointer">
            <FileUp size={24} />
            <input
              type="file"
              accept=".json,.csv,.xlsx,.xls"
              onChange={handleBatchImport}
              className="hidden"
            />
          </label>

          <button 
            onClick={async () => {
              setSearchTerm('');
              setSelectedDate(getShanghaiDateString());
              // 显示刷新中状态
              setSaveStatus('正在刷新数据...');
              
              try {
                // 强制从服务器同步最新数据
                const syncSuccess = await dataService.forceSync();
                
                // 触发组件数据刷新
                onDataChange();
                
                // 显示结果提示
                setSaveStatus(syncSuccess ? '数据已从服务器刷新' : '数据已刷新（使用本地缓存）');
                setTimeout(() => setSaveStatus(null), 2000);
              } catch (error) {
                console.error('刷新数据失败:', error);
                setSaveStatus('刷新失败，请重试');
                setTimeout(() => setSaveStatus(null), 2000);
              }
            }}
            className="p-4 text-slate-400 hover:text-slate-600 transition-all"
            title="从服务器刷新数据"
          >
            <RotateCcw size={24} />
          </button>
        </div>
      </div>

      {/* 移动端布局 - 两行布局 */}
      <div className="md:hidden space-y-3">
        {/* 第一行：搜索框 */}
        <div className="bg-white p-4 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100">
          <div className="relative">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="搜索物料名称或标签..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 text-base bg-transparent border-none focus:ring-0 placeholder:text-slate-300 font-medium"
            />
          </div>
        </div>
        
        {/* 第二行：日期+按钮组 */}
        <div className="bg-white p-4 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100">
          <div className="flex items-center gap-3">
            {selectedIds.length > 0 && (
              <button 
                onClick={handleBatchDelete}
                className="flex items-center gap-1 px-3 py-2 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold hover:bg-rose-100 transition-colors"
              >
                <Trash2 size={14} />
                删除 ({selectedIds.length})
              </button>
            )}

            <div className="flex-1 flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
              <Calendar size={14} className="text-indigo-500" />
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="flex-1 bg-transparent border-none p-0 text-sm font-bold text-indigo-600 focus:ring-0"
              />
            </div>

            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
            >
              <Plus size={18} />
            </button>

            <label className="p-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all cursor-pointer">
              <FileUp size={18} />
              <input
                type="file"
                accept=".json,.csv,.xlsx,.xls"
                onChange={handleBatchImport}
                className="hidden"
              />
            </label>

            <button 
              onClick={async () => {
                setSearchTerm('');
                setSelectedDate(getShanghaiDateString());
                // 显示刷新中状态
                setSaveStatus('正在刷新...');
                
                try {
                  // 强制从服务器同步最新数据
                  const syncSuccess = await dataService.forceSync();
                  
                  // 触发组件数据刷新
                  onDataChange();
                  
                  // 显示结果提示
                  setSaveStatus(syncSuccess ? '已从服务器刷新' : '已刷新（本地）');
                  setTimeout(() => setSaveStatus(null), 2000);
                } catch (error) {
                  console.error('刷新数据失败:', error);
                  setSaveStatus('刷新失败');
                  setTimeout(() => setSaveStatus(null), 2000);
                }
              }}
              className="p-3 text-slate-400 hover:text-slate-600 transition-all"
              title="从服务器刷新数据"
            >
              <RotateCcw size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="hidden md:block bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-50 overflow-hidden">
        <table className="w-full text-left table-fixed">
          <thead>
            <tr className="text-[11px] font-black text-slate-300 uppercase tracking-[0.1em] border-b border-slate-50">
              <th className="px-8 py-6 w-16 text-center">
                <input 
                  type="checkbox" 
                  checked={selectedIds.length === displayRecords.length && displayRecords.length > 0}
                  onChange={toggleSelectAll}
                  className="w-5 h-5 rounded border-slate-200 text-indigo-600"
                />
              </th>
              <th className="px-4 py-6 w-16 text-center">序号</th>
              <th className="px-4 py-6 w-48">物料名称</th>
              <th className="px-4 py-6 w-40 text-center">标签</th>
              <th className="px-4 py-6 w-24 text-center">基本计量单位</th>
              <th className="px-4 py-6 w-32 text-center">物料单位</th>
              <th className="px-4 py-6 w-24 text-center">昨日库存</th>
              <th className="px-4 py-6 w-28 text-center text-indigo-600 font-black">今日入库</th>
              <th className="px-4 py-6 w-28 text-center text-orange-600 font-black">车间出库</th>
              <th className="px-4 py-6 w-28 text-center text-purple-600 font-black">店面出库</th>
              <th className="px-4 py-6 w-24 text-center text-slate-800 font-black">实时库存</th>
              <th className="px-8 py-6 w-16 text-center">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50/50">
            {displayRecords.map((record, index) => {
              const mat = materials.find(m => m.id === record.materialId);
              const isSelected = selectedIds.includes(record.materialId);
              return (
                <tr key={record.id} className={`group hover:bg-indigo-50/20 transition-all ${isSelected ? 'bg-indigo-50/40' : ''}`}>
                  <td className="px-8 py-6 text-center">
                    <input 
                      type="checkbox" 
                      checked={isSelected}
                      onChange={() => toggleSelect(record.materialId)}
                      className="w-5 h-5 rounded border-slate-200 text-indigo-600"
                    />
                  </td>
                  <td className="px-4 py-6 text-center font-black text-slate-600">
                    {index + 1}
                  </td>
                  <td className="px-4 py-6">
                    <div>
                      <span className="text-lg font-black text-slate-800 block">{mat?.name}</span>
                      <span className="text-xs font-bold text-slate-400">{mat?.spec}</span>
                    </div>
                  </td>
                  <td className="px-4 py-6 text-center">
                    <div className="flex flex-wrap gap-1 justify-center">
                      {mat?.tags?.split(/[,，\s]+/).map((tag, idx) => (
                        <span key={idx} className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-[9px] font-black uppercase">
                          {tag}
                        </span>
                      )) || <span className="text-slate-300">-</span>}
                    </div>
                  </td>
                  <td className="px-4 py-6 text-center">
                    <span className="inline-block bg-indigo-100 text-indigo-500 px-2 py-0.5 rounded text-[10px] font-black uppercase">
                      {mat?.unit}
                    </span>
                  </td>
                  <td className="px-4 py-6 text-center">
                    <span className="inline-block bg-emerald-100 text-emerald-500 px-2 py-0.5 rounded text-[10px] font-black">
                      {mat?.spec}
                    </span>
                  </td>
                  <td className="px-4 py-6 text-center">
                    <span className="text-base font-black text-slate-300 font-mono">{record.yesterdayStock}</span>
                  </td>
                  <td className="px-2 py-4">
                    <input 
                      type="number"
                      value={record.todayIn}
                      onChange={(e) => handleInputChange(record.id, 'todayIn', e.target.value)}
                      className="w-full h-14 bg-indigo-50/30 border-none rounded-2xl text-center text-xl font-black text-indigo-600 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                    />
                  </td>
                  <td className="px-2 py-4">
                    <input 
                      type="number"
                      value={record.workshopOut}
                      onChange={(e) => handleInputChange(record.id, 'workshopOut', e.target.value)}
                      className="w-full h-14 bg-orange-50/30 border-none rounded-2xl text-center text-xl font-black text-orange-600 focus:ring-2 focus:ring-orange-500/10 transition-all"
                    />
                  </td>
                  <td className="px-2 py-4">
                    <input 
                      type="number"
                      value={record.storeOut}
                      onChange={(e) => handleInputChange(record.id, 'storeOut', e.target.value)}
                      className="w-full h-14 bg-purple-50/30 border-none rounded-2xl text-center text-xl font-black text-purple-600 focus:ring-2 focus:ring-purple-500/10 transition-all"
                    />
                  </td>
                  <td className="px-4 py-6 text-center">
                    <span className={`text-2xl font-black ${record.currentStock < 0 ? 'text-rose-500' : 'text-indigo-900'}`}>
                      {record.currentStock}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <button 
                      onClick={() => handleSingleDelete(record.materialId)}
                      className="p-2 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                    >
                      <Trash2 size={20} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-4">
        {displayRecords.map((record) => {
          const mat = materials.find(m => m.id === record.materialId);
          const isSelected = selectedIds.includes(record.materialId);
          return (
            <div key={record.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 transition-all active:scale-[0.99]">
              <div className="flex items-start gap-4 mb-6">
                <input 
                  type="checkbox" 
                  checked={isSelected}
                  onChange={() => toggleSelect(record.materialId)}
                  className="w-6 h-6 rounded-md border-slate-200 text-indigo-600 mt-1"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold text-slate-900 truncate">{mat?.name}</h3>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {mat?.tags?.split(/[,，\s]+/).map((tag, idx) => (
                      <span key={idx} className="bg-indigo-50 text-indigo-400 px-2 py-0.5 rounded-full text-[8px] font-black uppercase">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">计量单位:</span>
                      <span className="bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded text-[10px] font-black uppercase">{mat?.unit}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">物料单位:</span>
                      <span className="text-[10px] text-slate-600 font-bold">{mat?.spec}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">当前库存</p>
                  <p className="text-2xl font-black text-indigo-900 leading-none mt-1">{record.currentStock}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-1 px-1">
                    <ArrowDownLeft size={12} className="text-blue-600" />
                    <span className="text-[10px] font-black text-blue-600 uppercase">今日入库</span>
                  </div>
                  <input 
                    type="number"
                    value={record.todayIn}
                    onChange={(e) => handleInputChange(record.id, 'todayIn', e.target.value)}
                    className="w-full h-16 bg-blue-50/50 border-none rounded-2xl text-center text-xl font-black text-blue-700 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-1 px-1">
                    <Warehouse size={12} className="text-orange-600" />
                    <span className="text-[10px] font-black text-orange-600 uppercase">车间出库</span>
                  </div>
                  <input 
                    type="number"
                    value={record.workshopOut}
                    onChange={(e) => handleInputChange(record.id, 'workshopOut', e.target.value)}
                    className="w-full h-16 bg-orange-50/50 border-none rounded-2xl text-center text-xl font-black text-orange-700 focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-1 px-1">
                    <ArrowUpRight size={12} className="text-purple-600" />
                    <span className="text-[10px] font-black text-purple-600 uppercase">店面出库</span>
                  </div>
                  <input 
                    type="number"
                    value={record.storeOut}
                    onChange={(e) => handleInputChange(record.id, 'storeOut', e.target.value)}
                    className="w-full h-16 bg-purple-50/50 border-none rounded-2xl text-center text-xl font-black text-purple-700 focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">昨日结余: {record.yesterdayStock}</span>
              </div>
            </div>
          );
        })}
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-full md:slide-in-from-bottom-0 duration-300">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">新增物料</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="p-2 text-slate-300">
                <X size={28} />
              </button>
            </div>
            <form onSubmit={handleAddMaterial} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">物料名称</label>
                <input required type="text" value={newMatName} onChange={(e) => setNewMatName(e.target.value)} placeholder="如：特级大豆油" className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-base font-bold focus:ring-2 focus:ring-indigo-500/20" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-1">
                  <Tag size={12} />
                  物料标签 (用逗号或空格分隔)
                </label>
                <input type="text" value={newMatTags} onChange={(e) => setNewMatTags(e.target.value)} placeholder="如：日用品, 洗漱品" className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-base font-bold focus:ring-2 focus:ring-indigo-500/20" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">计量单位</label>
                  <input required type="text" value={newMatUnit} onChange={(e) => setNewMatUnit(e.target.value)} placeholder="kg" className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-base font-bold focus:ring-2 focus:ring-indigo-500/20" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">物料单位</label>
                  <input required type="text" value={newMatSpec} onChange={(e) => setNewMatSpec(e.target.value)} placeholder="5L/桶" className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-base font-bold focus:ring-2 focus:ring-indigo-500/20" />
                </div>
              </div>
              <div className="bg-indigo-50/50 p-6 rounded-[2rem]">
                <label className="text-[10px] font-black text-indigo-600 uppercase mb-2 block tracking-[0.2em]">昨日库存初始值</label>
                <input type="number" value={newMatYesterdayStock} onChange={(e) => setNewMatYesterdayStock(parseInt(e.target.value) || 0)} className="w-full px-6 py-4 bg-white border-none rounded-xl text-3xl font-black text-indigo-600 focus:ring-2 focus:ring-indigo-500/20" />
              </div>
              <div className="flex gap-4 pt-2">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-5 text-slate-400 font-bold text-base bg-slate-100 rounded-2xl active:scale-95 transition-transform">取消</button>
                <button type="submit" className="flex-1 py-5 bg-indigo-600 text-white font-bold text-base rounded-2xl shadow-xl shadow-indigo-100 active:scale-95 transition-transform">确认添加</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryManager;
