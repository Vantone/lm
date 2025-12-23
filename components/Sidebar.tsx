
import React from 'react';
import { MENU_ITEMS } from '../constants';
import { ViewType } from '../types';
import { Package2 } from 'lucide-react';

interface SidebarProps {
  activeView: ViewType;
  onNavigate: (view: ViewType) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onNavigate }) => {
  return (
    <aside className="w-64 h-full bg-slate-900 text-slate-300 flex flex-col shrink-0">
      <div className="p-6 flex items-center gap-3 text-white border-b border-slate-800">
        <div className="p-2 bg-indigo-600 rounded-lg">
          <Package2 size={24} />
        </div>
        <span className="text-xl font-bold tracking-tight">物料管理系统</span>
      </div>
      
      <nav className="flex-1 py-6 space-y-1 px-3">
        {MENU_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium ${
              activeView === item.id 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                : 'hover:bg-slate-800 hover:text-white'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-6 border-t border-slate-800 text-xs text-slate-500 text-center">
        v1.0.4 企业物料管理系统
      </div>
    </aside>
  );
};

export default Sidebar;
