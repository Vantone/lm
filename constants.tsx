
import React from 'react';
import { LayoutDashboard, Package, History, FileDown, ShieldCheck, Settings } from 'lucide-react';
import { Material, InventoryRecord, ViewType } from './types';
import { getShanghaiDateString } from './utils/dateUtils';

export const MENU_ITEMS = [
  { id: 'dashboard' as ViewType, label: '仓库信息看板', icon: <LayoutDashboard size={20} /> },
  { id: 'inventory' as ViewType, label: '实时仓库管理', icon: <Package size={20} /> },
  { id: 'history' as ViewType, label: '历史仓库变动', icon: <History size={20} /> },
  { id: 'export' as ViewType, label: '物料报表导出', icon: <FileDown size={20} /> },
  { id: 'audit' as ViewType, label: '操作审计日志', icon: <ShieldCheck size={20} /> },
  { id: 'config' as ViewType, label: '系统配置信息', icon: <Settings size={20} /> },
];

export const MOCK_MATERIALS: Material[] = [
//   { id: '1', name: '特级面粉', unit: 'kg', spec: '25kg/袋', category: '食材', tags: '重要原料,食材' },
//   { id: '2', name: '花生油', unit: 'L', spec: '5L/桶', category: '辅料', tags: '液态,调味品' },
//   { id: '3', name: '白砂糖', unit: 'kg', spec: '500g/包', category: '食材', tags: '甜味,基础' },
//   { id: '4', name: '洗发水', unit: '瓶', spec: '500ml', category: '日用品', tags: '洗漱品,生活用品' },
//   { id: '5', name: '牙膏', unit: '支', spec: '120g', category: '日用品', tags: '洗漱品,卫生' },
];

export const INITIAL_RECORDS: InventoryRecord[] = MOCK_MATERIALS.length > 0 ? MOCK_MATERIALS.map((m, idx) => {
  const yesterday = 100 + idx * 20;
  const todayIn = 50;
  const workshopOut = 20;
  const storeOut = 10;
  return {
    id: `rec-${m.id}-today`,
    materialId: m.id,
    date: getShanghaiDateString(),
    yesterdayStock: yesterday,
    todayIn: todayIn,
    workshopOut: workshopOut,
    storeOut: storeOut,
    currentStock: yesterday + todayIn - workshopOut - storeOut
  };
}) : [];
