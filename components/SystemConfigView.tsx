
import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import { SystemConfig } from '../types';
import { Save, RefreshCw, Database, Server, Download, Upload, Trash2, AlertTriangle, Cloud, CloudOff } from 'lucide-react';

interface SystemConfigViewProps {
  isServerConnected?: boolean;
}

const SystemConfigView: React.FC<SystemConfigViewProps> = ({ isServerConnected }) => {
  const [config, setConfig] = useState<SystemConfig>({
    warehouseName: '',
    adminName: '',
    lastBackup: ''
  });
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    setConfig(dataService.getConfig());
  }, []);

  const handleSave = () => {
    dataService.setConfig(config);
    dataService.addAuditLog('更新配置', '更新了系统基础配置信息');
    alert('系统配置已更新并保存到服务器！');
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    await dataService.pushToServer();
    setTimeout(() => {
      setIsSyncing(false);
      alert('手动同步完成，数据已写入服务器 database.json');
    }, 800);
  };

  const handleExportDB = () => {
    dataService.exportDatabase();
    dataService.addAuditLog('数据备份', '导出了系统全量数据库备份文件');
  };

  const handleImportDB = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (dataService.importDatabase(content)) {
        alert('数据导入成功！系统将同步到服务器并自动刷新。');
        dataService.pushToServer().then(() => window.location.reload());
      } else {
        alert('导入失败，请检查文件格式是否正确。');
      }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    if (confirm('警告：此操作将清空服务器及本地的所有数据且不可撤销！确定要重置吗？')) {
      dataService.resetAll();
    }
  };

  return (
    <div className="max-w-4xl space-y-8 pb-20">
      {/* 状态看板 */}
      <div className={`p-8 rounded-[2.5rem] border flex items-center justify-between transition-all ${isServerConnected ? 'bg-emerald-50 border-emerald-100 text-emerald-900' : 'bg-rose-50 border-rose-100 text-rose-900'}`}>
        <div className="flex items-center gap-6">
          <div className={`p-4 rounded-[1.5rem] ${isServerConnected ? 'bg-white text-emerald-500 shadow-sm' : 'bg-white text-rose-500 shadow-sm'}`}>
            {isServerConnected ? <Cloud size={32} /> : <CloudOff size={32} />}
          </div>
          <div>
            <h4 className="text-xl font-black tracking-tight">
              {isServerConnected ? '已连接至 JSON 数据库' : '服务器连接中断'}
            </h4>
            <p className="text-sm font-bold opacity-60">
              {isServerConnected ? '数据将实时保存至服务器 database.json' : '数据目前仅保存在本地浏览器中'}
            </p>
          </div>
        </div>
        <button 
          onClick={handleManualSync}
          disabled={!isServerConnected || isSyncing}
          className="flex items-center gap-2 px-6 py-3 bg-white/50 hover:bg-white rounded-2xl text-sm font-black transition-all disabled:opacity-30"
        >
          <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
          立即强制同步
        </button>
      </div>

      {/* 基础配置 */}
      <div className="bg-white p-10 rounded-[3rem] shadow-xl shadow-slate-200/40 border border-slate-50">
        <h3 className="text-2xl font-black text-slate-800 mb-10 flex items-center gap-3">
          <Server className="text-indigo-600" />
          系统基础配置
        </h3>

        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">默认仓库名称</label>
              <input 
                type="text" 
                value={config.warehouseName}
                onChange={(e) => setConfig({ ...config, warehouseName: e.target.value })}
                className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-base font-bold focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">系统管理员名称</label>
              <input 
                type="text" 
                value={config.adminName}
                onChange={(e) => setConfig({ ...config, adminName: e.target.value })}
                className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-base font-bold focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-50 flex justify-end">
            <button 
              onClick={handleSave}
              className="flex items-center gap-2 px-10 py-4 bg-indigo-600 text-white rounded-[1.5rem] font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all"
            >
              <Save size={20} />
              保存配置到服务器
            </button>
          </div>
        </div>
      </div>

      {/* 数据库持久化 */}
      <div className="bg-white p-10 rounded-[3rem] shadow-xl shadow-slate-200/40 border border-slate-50">
        <h3 className="text-2xl font-black text-slate-800 mb-10 flex items-center gap-3">
          <Database className="text-emerald-600" />
          JSON 数据备份
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button 
            onClick={handleExportDB}
            className="flex flex-col items-start gap-4 p-8 rounded-[2rem] bg-slate-50 border border-slate-100 hover:bg-emerald-50 hover:border-emerald-100 group transition-all"
          >
            <div className="p-3 bg-white rounded-xl text-slate-400 group-hover:text-emerald-500 shadow-sm transition-colors">
              <Download size={24} />
            </div>
            <div className="text-left">
              <h4 className="font-black text-slate-800 text-lg">全库数据导出</h4>
              <p className="text-sm font-bold text-slate-400 mt-1">手动下载 JSON 备份文件到本地</p>
            </div>
          </button>

          <label className="flex flex-col items-start gap-4 p-8 rounded-[2rem] bg-slate-50 border border-slate-100 hover:bg-indigo-50 hover:border-indigo-100 group transition-all cursor-pointer">
            <div className="p-3 bg-white rounded-xl text-slate-400 group-hover:text-indigo-500 shadow-sm transition-colors">
              <Upload size={24} />
            </div>
            <div className="text-left">
              <h4 className="font-black text-slate-800 text-lg">全库数据还原</h4>
              <p className="text-sm font-bold text-slate-400 mt-1">从备份文件覆盖服务器 JSON</p>
              <input type="file" accept=".json" onChange={handleImportDB} className="hidden" />
            </div>
          </label>
        </div>

        <div className="mt-10 pt-10 border-t border-slate-50">
          <div className="p-8 bg-rose-50 rounded-[2rem] border border-rose-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white text-rose-500 rounded-xl shadow-sm">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h4 className="text-lg font-black text-rose-900">危险操作：初始化系统</h4>
                <p className="text-sm font-bold text-rose-600 opacity-80">这将物理删除服务器上的 database.json 所有内容</p>
              </div>
            </div>
            <button 
              onClick={handleReset}
              className="px-8 py-4 bg-rose-600 text-white rounded-2xl font-black shadow-lg shadow-rose-200 hover:bg-rose-700 active:scale-95 transition-all"
            >
              彻底重置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemConfigView;
