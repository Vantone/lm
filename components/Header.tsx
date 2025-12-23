
import React from 'react';
import { ViewType } from '../types';
import { MENU_ITEMS } from '../constants';
import { Bell, User, Search } from 'lucide-react';

interface HeaderProps {
  activeView: ViewType;
}

const Header: React.FC<HeaderProps> = ({ activeView }) => {
  const currentLabel = MENU_ITEMS.find(i => i.id === activeView)?.label || '系统';

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
      <h1 className="text-lg font-semibold text-slate-800">{currentLabel}</h1>
      
      <div className="flex items-center gap-6">
        <div className="relative hidden lg:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="搜索功能或物料..." 
            className="pl-10 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-64"
          />
        </div>

        <div className="flex items-center gap-4">
          <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full relative">
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 border-2 border-white rounded-full"></span>
          </button>
          <div className="h-8 w-[1px] bg-slate-200 mx-1"></div>
          <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-1.5 rounded-lg transition-colors">
            <div className="w-8 h-8 bg-indigo-100 text-indigo-700 flex items-center justify-center rounded-full font-bold">
              管
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-semibold text-slate-700">管理员</p>
              <p className="text-[10px] text-slate-500">Super Admin</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
