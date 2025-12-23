
import { Material, InventoryRecord, AuditLog, SystemConfig, UserSession } from '../types';
import { MOCK_MATERIALS, INITIAL_RECORDS } from '../constants';
import { getShanghaiDateString } from '../utils/dateUtils';

const KEYS = {
  MATERIALS: 'mms_materials',
  RECORDS: 'mms_records',
  AUDIT: 'mms_audit',
  CONFIG: 'mms_config',
  SESSION: 'mms_session'
};

// 动态获取API基础URL，支持移动端访问
const getApiBase = () => {
  // 安全检查：确保window对象存在
  if (typeof window === 'undefined') {
    return 'http://localhost:3001/api';
  }
  
  try {
    const hostname = window.location.hostname;
    const port = window.location.port;
    
    // 检测是否在Cloudflare Pages等静态托管环境
    if (hostname.includes('pages.dev') || hostname.includes('cloudflare')) {
      console.log('检测到Cloudflare Pages环境，跳过服务器连接');
      return null;
    }
    
    // 如果是localhost访问，使用localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3001/api';
    }
    
    // 如果是IP访问或域名访问，使用相同的host但端口3001
    if (port) {
      // 当前有端口说明是开发服务器，需要替换为后端端口
      const protocol = window.location.protocol;
      return `${protocol}//${hostname}:3001/api`;
    } else {
      // 生产环境可能使用相对路径
      return '/api';
    }
  } catch (e) {
    console.warn('获取API地址失败，使用默认值:', e);
    return 'http://localhost:3001/api';
  }
};

export const dataService = {
  // --- 服务器同步逻辑 ---
  init: async () => {
    let hasRemoteData = false;
    let hasLocalData = false;
    
    // 先检查本地是否已有数据
    const localMaterials = localStorage.getItem(KEYS.MATERIALS);
    const localRecords = localStorage.getItem(KEYS.RECORDS);
    if (localMaterials || localRecords) {
      hasLocalData = true;
      console.log('检测到本地数据:', {
        materials: localMaterials ? JSON.parse(localMaterials).length : 0,
        records: localRecords ? JSON.parse(localRecords).length : 0
      });
    }
    
    // 检查是否在静态托管环境
    const apiBase = getApiBase();
    if (!apiBase) {
      console.log('静态托管环境检测：跳过服务器连接，使用本地数据');
      
      // 如果没有任何数据，初始化示例数据
      if (!hasLocalData) {
        console.log('初始化示例数据');
        localStorage.setItem(KEYS.MATERIALS, JSON.stringify([]));
        localStorage.setItem(KEYS.RECORDS, JSON.stringify([]));
        localStorage.setItem(KEYS.AUDIT, JSON.stringify([]));
        localStorage.setItem(KEYS.CONFIG, JSON.stringify({
          warehouseName: '中心仓库 A-01',
          adminName: '管理员',
          lastBackup: new Date().toISOString().split('T')[0]
        }));
      }
      return false;
    }
    
    // 尝试连接服务器，增加超时和重试机制
    try {
      console.log('尝试连接服务器:', apiBase);
      
      // 设置请求超时
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3秒超时
      
      const response = await fetch(`${apiBase}/data`, {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const remoteData = await response.json();
        console.log('检测到远程数据:', {
          materials: remoteData.materials?.length || 0,
          records: remoteData.records?.length || 0
        });
        
        // 同步远程数据（即使为空也同步，确保数据一致性）
        hasRemoteData = true;
        if (remoteData.materials) {
          dataService.setMaterials(remoteData.materials, false);
          console.log('同步物料数据:', remoteData.materials.length, '个');
        }
        if (remoteData.records) {
          dataService.setRecords(remoteData.records, false);
          console.log('同步记录数据:', remoteData.records.length, '条');
        }
        if (remoteData.audit) localStorage.setItem(KEYS.AUDIT, JSON.stringify(remoteData.audit));
        if (remoteData.config) dataService.setConfig(remoteData.config, false);
        console.log('数据已从服务器同步到本地');
      }
    } catch (e) {
      if (e.name === 'AbortError') {
        console.warn('连接服务器超时，使用本地数据');
      } else {
        console.warn('无法连接到后端服务器，使用本地数据:', e);
      }
      
      // 如果是移动端且无法连接，提供用户提示
      if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        console.warn('移动端检测：请确保后端服务器已启动并可通过网络访问');
      }
    }
    
    // 如果没有任何数据（本地和远程都没有），则初始化空数据
    if (!hasLocalData && !hasRemoteData) {
      console.log('未检测到任何现有数据，系统将保持空白状态');
      localStorage.setItem(KEYS.MATERIALS, JSON.stringify([]));
      localStorage.setItem(KEYS.RECORDS, JSON.stringify([]));
      localStorage.setItem(KEYS.AUDIT, JSON.stringify([]));
      localStorage.setItem(KEYS.CONFIG, JSON.stringify({
        warehouseName: '中心仓库 A-01',
        adminName: '管理员',
        lastBackup: new Date().toISOString().split('T')[0]
      }));
    }
    
    return hasRemoteData;
  },

  pushToServer: async () => {
    const apiBase = getApiBase();
    if (!apiBase) {
      console.log('静态托管环境：数据仅保存在本地存储中');
      return true;
    }
    
    const fullData = {
      materials: dataService.getMaterials(),
      records: dataService.getRecords(),
      audit: dataService.getAuditLogs(),
      config: dataService.getConfig()
    };
    try {
      const response = await fetch(`${apiBase}/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullData)
      });
      if (response.ok) {
        console.log('数据已同步到服务器 JSON 文件');
        return true;
      } else {
        throw new Error('服务器响应错误');
      }
    } catch (e) {
      console.error('服务器同步失败，数据仅保存在本地存储中:', e);
      return false;
    }
  },

  // --- 鉴权服务 (更新为对接后端接口) ---
  login: async (username: string, password: string, encrypted: boolean = false): Promise<boolean> => {
    const apiBase = getApiBase();
    
    // 检查是否在静态托管环境或无后端环境
    if (!apiBase) {
      console.log('静态托管环境：使用本地身份验证');
      // 简化的本地验证
      if (username === 'admin' && password === '123456') {
        const session: UserSession = {
          isLoggedIn: true,
          username: '管理员',
          loginTime: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
        };
        localStorage.setItem(KEYS.SESSION, JSON.stringify(session));
        console.log('[DATA_SERVICE] 本地登录成功');
        return true;
      }
      return false;
    }
    
    try {
      // 设置请求超时
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3秒超时
      
      const requestBody: any = { username, password };
      
      // 如果密码已加密，添加标记
      if (encrypted) {
        requestBody.encrypted = encrypted;
      }
      
      const response = await fetch(`${apiBase}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const result = await response.json();
        const session: UserSession = {
          isLoggedIn: true,
          username: result.username,
          loginTime: result.loginTime
        };
        localStorage.setItem(KEYS.SESSION, JSON.stringify(session));
        console.log('[DATA_SERVICE] 登录成功，加密状态:', encrypted ? '是' : '否');
        return true;
      }
    } catch (e) {
      if (e.name === 'AbortError') {
        console.warn('登录请求超时，尝试本地验证');
      } else {
        console.warn('登录失败，尝试本地验证:', e);
      }
      
      // 如果后端没开或网络问题，尝试本地回退
      if (username === 'admin' && password === '123456') {
        const session: UserSession = {
          isLoggedIn: true,
          username: '本地管理员(离线)',
          loginTime: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
        };
        localStorage.setItem(KEYS.SESSION, JSON.stringify(session));
        console.log('[DATA_SERVICE] 本地登录成功');
        return true;
      }
    }
    return false;
  },

  logout: () => {
    localStorage.removeItem(KEYS.SESSION);
  },

  getSession: (): UserSession | null => {
    const data = localStorage.getItem(KEYS.SESSION);
    return data ? JSON.parse(data) : null;
  },

  // --- 物料管理 ---
  getMaterials: (): Material[] => {
    const data = localStorage.getItem(KEYS.MATERIALS);
    if (data) {
      const parsed = JSON.parse(data);
      console.log('从本地存储读取物料:', parsed.length, '个');
      return parsed;
    }
    console.log('本地存储无物料数据，返回空数组');
    return [];
  },

  setMaterials: (materials: Material[], sync = true) => {
    localStorage.setItem(KEYS.MATERIALS, JSON.stringify(materials));
    console.log('保存物料到本地存储:', materials.length, '个');
    if (sync) dataService.pushToServer();
  },

  deleteMaterials: (ids: string[]) => {
    const materials = dataService.getMaterials();
    const records = dataService.getRecords();
    const filteredMaterials = materials.filter(m => !ids.includes(m.id));
    const filteredRecords = records.filter(r => !ids.includes(r.materialId));
    
    dataService.setMaterials(filteredMaterials, false);
    dataService.setRecords(filteredRecords, false);
    dataService.addAuditLog('删除物料', `删除了 ${ids.length} 个物料`);
    dataService.pushToServer();
  },

  // --- 库存记录 ---
  getRecords: (): InventoryRecord[] => {
    const data = localStorage.getItem(KEYS.RECORDS);
    return data ? JSON.parse(data) : INITIAL_RECORDS;
  },

  setRecords: (records: InventoryRecord[], sync = true) => {
    localStorage.setItem(KEYS.RECORDS, JSON.stringify(records));
    if (sync) dataService.pushToServer();
  },

  // 自动生成第二天数据
  generateNextDayRecords: (): InventoryRecord[] => {
    const materials = dataService.getMaterials();
    const allRecords = dataService.getRecords();
    const today = getShanghaiDateString();
    const tomorrow = getShanghaiDateString(1);
    
    const newRecords: InventoryRecord[] = [];
    
    materials.forEach(material => {
      // 检查是否已有明天的记录
      const existingTomorrow = allRecords.find(r => r.materialId === material.id && r.date === tomorrow);
      if (existingTomorrow) return;
      
      // 查找今天的记录
      const todayRecord = allRecords.find(r => r.materialId === material.id && r.date === today);
      // 如果没有今天记录，查找最新的历史记录
      const latestRecord = allRecords
        .filter(r => r.materialId === material.id)
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      
      // 使用今天的记录作为昨日库存，如果没有则使用最新记录的当前库存
      const yesterdayStock = todayRecord ? 
        todayRecord.currentStock : 
        (latestRecord ? latestRecord.currentStock : 0);
      
      const newRecord: InventoryRecord = {
        id: `rec-${material.id}-${tomorrow}`,
        materialId: material.id,
        date: tomorrow,
        yesterdayStock, // 昨日库存来自今天的当前库存
        todayIn: 0,
        workshopOut: 0,
        storeOut: 0,
        currentStock: yesterdayStock
      };
      
      newRecords.push(newRecord);
    });
    
    if (newRecords.length > 0) {
      const updatedRecords = [...allRecords, ...newRecords];
      dataService.setRecords(updatedRecords, false);
      
      const session = dataService.getSession();
      dataService.addAuditLog(
        '自动生成次日数据', 
        `为 ${newRecords.length} 个物料生成了 ${tomorrow} 的库存记录`
      );
      
      console.log(`自动生成了 ${newRecords.length} 条 ${tomorrow} 的库存记录`);
    }
    
    return newRecords;
  },

  getOrCreateRecord: (materialId: string, date: string): InventoryRecord => {
    const allRecords = dataService.getRecords();
    const existing = allRecords.find(r => r.materialId === materialId && r.date === date);
    if (existing) return existing;

    const prevRecords = allRecords
      .filter(r => r.materialId === materialId && r.date < date)
      .sort((a, b) => b.date.localeCompare(a.date));
    const lastStock = prevRecords.length > 0 ? prevRecords[0].currentStock : 0;

    const newRecord: InventoryRecord = {
      id: `rec-${materialId}-${date}`,
      materialId,
      date,
      yesterdayStock: lastStock,
      todayIn: 0,
      workshopOut: 0,
      storeOut: 0,
      currentStock: lastStock
    };

    dataService.setRecords([...allRecords, newRecord]);
    return newRecord;
  },

  updateRecordValues: (id: string, updates: Partial<Pick<InventoryRecord, 'todayIn' | 'workshopOut' | 'storeOut'>>) => {
    const allRecords = dataService.getRecords();
    const index = allRecords.findIndex(r => r.id === id);
    if (index === -1) return;

    const record = allRecords[index];
    const updatedRecord = { ...record, ...updates };
    updatedRecord.currentStock = updatedRecord.yesterdayStock + updatedRecord.todayIn - updatedRecord.workshopOut - updatedRecord.storeOut;

    allRecords[index] = updatedRecord;
    dataService.setRecords(allRecords);
  },

  // --- 其他 ---
  addAuditLog: (action: string, details: string) => {
    const logs = dataService.getAuditLogs();
    const session = dataService.getSession();
    const newLog: AuditLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
      user: session?.username || '未知',
      action,
      details
    };
    localStorage.setItem(KEYS.AUDIT, JSON.stringify([newLog, ...logs].slice(0, 1000)));
    dataService.pushToServer();
  },

  getAuditLogs: (): AuditLog[] => {
    const data = localStorage.getItem(KEYS.AUDIT);
    return data ? JSON.parse(data) : [];
  },

  getConfig: (): SystemConfig => {
    const data = localStorage.getItem(KEYS.CONFIG);
    return data ? JSON.parse(data) : {
      warehouseName: '中心仓库 A-01',
      adminName: '管理员',
      lastBackup: '2025-12-23'
    };
  },

  setConfig: (config: SystemConfig, sync = true) => {
    localStorage.setItem(KEYS.CONFIG, JSON.stringify(config));
    if (sync) dataService.pushToServer();
  },

  // --- 数据库导入导出 ---
  exportDatabase: () => {
    const data = {
      materials: dataService.getMaterials(),
      records: dataService.getRecords(),
      audit: dataService.getAuditLogs(),
      config: dataService.getConfig()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mms_backup_${getShanghaiDateString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  importDatabase: (content: string): boolean => {
    try {
      const data = JSON.parse(content);
      if (data.materials) dataService.setMaterials(data.materials, false);
      if (data.records) dataService.setRecords(data.records, false);
      if (data.audit) localStorage.setItem(KEYS.AUDIT, JSON.stringify(data.audit));
      if (data.config) dataService.setConfig(data.config, false);
      return true;
    } catch (e) {
      console.error('Failed to import database:', e);
      return false;
    }
  },

  // 强制从服务器重新同步数据
  forceSync: async (): Promise<boolean> => {
    try {
      console.log('强制同步: 从服务器拉取最新数据');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const apiBase = getApiBase();
      const response = await fetch(`${apiBase}/data`, {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const remoteData = await response.json();
        console.log('强制同步成功:', {
          materials: remoteData.materials?.length || 0,
          records: remoteData.records?.length || 0
        });
        
        // 强制覆盖本地数据
        if (remoteData.materials) {
          localStorage.setItem(KEYS.MATERIALS, JSON.stringify(remoteData.materials));
          console.log('强制同步物料数据:', remoteData.materials.length, '个');
        }
        if (remoteData.records) {
          localStorage.setItem(KEYS.RECORDS, JSON.stringify(remoteData.records));
          console.log('强制同步记录数据:', remoteData.records.length, '条');
        }
        if (remoteData.audit) localStorage.setItem(KEYS.AUDIT, JSON.stringify(remoteData.audit));
        if (remoteData.config) localStorage.setItem(KEYS.CONFIG, JSON.stringify(remoteData.config));
        
        console.log('数据已强制同步到本地');
        return true;
      }
    } catch (e) {
      if (e.name === 'AbortError') {
        console.warn('强制同步超时');
      } else {
        console.warn('强制同步失败:', e);
      }
      return false;
    }
    return false;
  },

  resetAll: () => {
    localStorage.clear();
    const apiBase = getApiBase();
    if (apiBase) {
      fetch(`${apiBase}/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materials: [], records: [], audit: [], config: {} })
      }).then(() => window.location.reload()).catch(() => window.location.reload());
    } else {
      window.location.reload();
    }
  }
};
