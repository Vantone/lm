
export interface Material {
  id: string;
  name: string;
  unit: string;        // 计量单位 (e.g., 千克, 个)
  spec: string;        // 物料单位/规格 (e.g., 50kg/袋)
  category: string;
  tags?: string;       // 物料标签 (e.g., 日用品, 洗漱品)
}

export interface InventoryRecord {
  id: string;
  materialId: string;
  date: string;        // YYYY-MM-DD
  yesterdayStock: number;
  todayIn: number;
  workshopOut: number;
  storeOut: number;
  currentStock: number; // yesterday + todayIn - workshopOut - storeOut
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
}

export interface SystemConfig {
  warehouseName: string;
  adminName: string;
  lastBackup: string;
}

export interface UserSession {
  isLoggedIn: boolean;
  username: string;
  loginTime: string;
}

export type ViewType = 'dashboard' | 'inventory' | 'history' | 'export' | 'audit' | 'config';
