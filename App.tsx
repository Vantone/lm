
import React, { useState, useEffect } from 'react';
import { MENU_ITEMS } from './constants';
import { ViewType, Material, InventoryRecord } from './types';
import { dataService } from './services/dataService';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import InventoryManager from './components/InventoryManager';
import HistoryLog from './components/HistoryLog';
import ReportExport from './components/ReportExport';
import AuditLogView from './components/AuditLogView';
import SystemConfigView from './components/SystemConfigView';
import Login from './components/Login';
import { Menu, Loader2, CloudIcon } from 'lucide-react';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [records, setRecords] = useState<InventoryRecord[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [isServerConnected, setIsServerConnected] = useState<boolean>(false);

  useEffect(() => {
    const bootApp = async () => {
      try {
        console.log('应用启动中...');
        const connected = await dataService.init();
        setIsServerConnected(connected);
        const session = dataService.getSession();
        if (session?.isLoggedIn) {
          setIsLoggedIn(true);
          // 只有当有数据时才刷新数据
          const materials = dataService.getMaterials();
          const records = dataService.getRecords();
          if (materials.length > 0 || records.length > 0) {
            refreshData();
          }
        }
        console.log('应用启动完成');
      } catch (error) {
        console.error('应用启动失败:', error);
        // 即使启动失败，也尝试加载本地数据
        try {
          const session = dataService.getSession();
          if (session?.isLoggedIn) {
            setIsLoggedIn(true);
            refreshData();
          }
        } catch (localError) {
          console.error('加载本地数据失败:', localError);
        }
      } finally {
        setIsInitializing(false);
      }
    };
    bootApp();
  }, []);

  const refreshData = () => {
    setMaterials(dataService.getMaterials());
    setRecords(dataService.getRecords());
  };

  const handleLogout = () => {
    dataService.logout();
    setIsLoggedIn(false);
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white gap-4">
        <Loader2 className="animate-spin text-indigo-500" size={48} />
        <p className="text-slate-400 font-medium tracking-widest animate-pulse">正在连接服务器 JSON 数据库...</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Login onLoginSuccess={() => { 
      setIsLoggedIn(true); 
      // 登录成功后总是刷新数据
      refreshData(); 
    }} />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard materials={materials} records={records} />;
      case 'inventory':
        return <InventoryManager materials={materials} records={records} onDataChange={refreshData} />;
      case 'history':
        return <HistoryLog materials={materials} records={records} />;
      case 'export':
        return <ReportExport materials={materials} records={records} />;
      case 'audit':
        return <AuditLogView />;
      case 'config':
        return <SystemConfigView isServerConnected={isServerConnected} />;
      default:
        return <Dashboard materials={materials} records={records} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 relative">
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className={`
        fixed md:relative inset-y-0 left-0 z-50 transform 
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 transition-transform duration-300 ease-in-out
      `}>
        <Sidebar 
          activeView={currentView} 
          onNavigate={(view) => {
            setCurrentView(view);
            setIsSidebarOpen(false);
          }} 
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-base md:text-lg font-black text-slate-800 tracking-tight">
              {MENU_ITEMS.find(i => i.id === currentView)?.label || '系统'}
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${isServerConnected ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
              <CloudIcon size={12} />
              {isServerConnected ? '服务器已连接 (JSON)' : '离线模式 (Local)'}
            </div>
            <button 
              onClick={handleLogout}
              className="text-[10px] font-black text-rose-600 px-3 py-1.5 hover:bg-rose-50 rounded-lg transition-colors uppercase tracking-widest"
            >
              登出系统
            </button>
            <div className="flex items-center gap-2 md:gap-3 p-1">
              <div className="w-8 h-8 bg-indigo-600 text-white flex items-center justify-center rounded-xl font-black text-xs shadow-lg shadow-indigo-100">
                管
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50/50">
          <div className="max-w-7xl mx-auto h-full">
            {renderView()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
