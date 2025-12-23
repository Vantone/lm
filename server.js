
import express from 'express';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { verifyPassword } from './auth/crypto.js';
import { createBackup, cleanupOldBackups, getBackupList, restoreBackup } from './utils/backup.js';

// 获取当前文件目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// 创建data目录
const DATA_DIR = path.join(__dirname, 'data');
const LOGS_DIR = path.join(__dirname, 'logs');
const DB_FILE = path.join(DATA_DIR, 'database.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// 审计日志记录函数
function writeAuditLog(action, details, user = 'unknown', ip = 'unknown') {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    user,
    ip,
    action,
    details
  };
  
  const logFileName = `audit_${new Date().toISOString().split('T')[0]}.log`;
  const logFilePath = path.join(LOGS_DIR, logFileName);
  
  const logLine = JSON.stringify(logEntry) + '\n';
  fs.appendFileSync(logFilePath, logLine, 'utf8');
  
  console.log(`[AUDIT] ${timestamp} - ${user} - ${action}: ${details}`);
}

// 用户认证配置
let usersConfig = [];
let authSettings = {};

// 从auth文件夹加载用户配置
function loadAuthConfig() {
  try {
    const authConfigPath = path.join(__dirname, 'auth', 'users.json');
    if (fs.existsSync(authConfigPath)) {
      const configData = JSON.parse(fs.readFileSync(authConfigPath, 'utf8'));
      usersConfig = configData.users || [];
      authSettings = configData.settings || {};
      console.log('[AUTH] 成功加载用户配置，用户数量:', usersConfig.length);
    } else {
      // 如果auth配置文件不存在，创建默认配置
      const defaultConfig = {
        users: [
          {
            username: 'admin',
            passwordHash: '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
            role: 'administrator',
            enabled: true
          }
        ],
        settings: {
          encryptionEnabled: true,
          sessionTimeout: 7200
        }
      };
      
      if (!fs.existsSync(path.join(__dirname, 'auth'))) {
        fs.mkdirSync(path.join(__dirname, 'auth'), { recursive: true });
      }
      
      fs.writeFileSync(authConfigPath, JSON.stringify(defaultConfig, null, 2));
      usersConfig = defaultConfig.users;
      authSettings = defaultConfig.settings;
      console.log('[AUTH] 创建默认用户配置');
    }
  } catch (error) {
    console.error('[AUTH] 加载用户配置失败:', error.message);
    // 回退到环境变量配置
    usersConfig = [
      {
        username: process.env.ADMIN_USER || 'admin',
        passwordHash: require('crypto').createHash('sha256').update(process.env.ADMIN_PASS || '123456').digest('hex'),
        role: 'administrator',
        enabled: true
      }
    ];
    authSettings = { encryptionEnabled: true, sessionTimeout: 7200 };
  }
}

// 初始化时加载用户配置
loadAuthConfig();

// 定期备份调度器
function scheduleBackup() {
  // 每周日执行备份 (周几: 0=周日, 1=周一, ..., 6=周六)
  const now = new Date();
  const daysUntilSunday = (7 - now.getDay()) % 7 || 7; // 如果今天是周日，则7天后再次执行
  
  const nextBackup = new Date(now);
  nextBackup.setDate(now.getDate() + daysUntilSunday);
  nextBackup.setHours(2, 0, 0, 0); // 凌晨2点执行备份
  
  const timeUntilBackup = nextBackup - now;
  console.log(`[BACKUP] 下次自动备份时间: ${nextBackup.toISOString()} (剩余 ${Math.round(timeUntilBackup / 1000 / 60 / 60)} 小时)`);
  
  setTimeout(() => {
    // 执行备份
    createBackup().then(backupPath => {
      writeAuditLog('自动备份', `系统自动创建数据库备份: ${backupPath}`, '系统', 'localhost');
      console.log('[BACKUP] 每周自动备份完成');
      
      // 清理旧备份（保留8周）
      cleanupOldBackups(8);
      
      // 调度下一次备份
      scheduleBackup();
    }).catch(error => {
      console.error('[BACKUP] 自动备份失败:', error.message);
      writeAuditLog('自动备份失败', error.message, '系统', 'localhost');
      
      // 即使失败也要调度下一次备份
      scheduleBackup();
    });
  }, timeUntilBackup);
}

// 启动备份调度器
scheduleBackup();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// 请求日志中间件
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl;
  const ip = req.ip || req.connection.remoteAddress;
  
  console.log(`[${timestamp}] ${method} ${url} - IP: ${ip}`);
  
  // 如果有请求体且不是GET请求，打印请求体（排除敏感信息）
  if (req.method !== 'GET' && req.body && Object.keys(req.body).length > 0) {
    const logBody = { ...req.body };
    // 移除密码等敏感字段
    if (logBody.password) logBody.password = '***';
    console.log('请求体:', JSON.stringify(logBody, null, 2));
  }
  
  // 记录响应时间
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    console.log(`[${timestamp}] 响应: ${status} - 耗时: ${duration}ms`);
    console.log('---');
  });
  
  next();
});

// 静态文件服务 - 提供前端文件
app.use(express.static(__dirname));

// 初始化数据库文件
if (!fs.existsSync(DB_FILE)) {
  const initData = {
    materials: [],
    records: [],
    audit: [],
    config: {
      warehouseName: '远程 JSON 仓库',
      adminName: '管理员',
      lastBackup: new Date().toISOString().split('T')[0]
    }
  };
  fs.writeFileSync(DB_FILE, JSON.stringify(initData, null, 2));
  writeAuditLog('系统初始化', '创建初始数据库文件', '系统', 'localhost');
}

// 登录验证接口
app.post('/api/login', (req, res) => {
  const ip = req.ip || req.connection.remoteAddress;
  console.log('[API] 登录请求 - 用户名:', req.body.username, '加密:', req.body.encrypted ? '是' : '否');
  const { username, password, encrypted } = req.body;
  
  // 重新加载配置以获取最新用户数据
  loadAuthConfig();
  
  // 查找用户
  const user = usersConfig.find(u => u.username === username && u.enabled !== false);
  
  if (!user) {
    console.log('[API] 登录失败 - 用户名:', username, '原因: 用户不存在或已禁用');
    writeAuditLog('登录失败', `用户 ${username} 登录失败，用户不存在或已禁用`, username, ip);
    return res.status(401).json({ success: false, message: '账号或密码不正确' });
  }
  
  // 验证密码
  let passwordToVerify = password;
  let isPasswordValid = false;
  
  if (encrypted) {
    // 如果前端传来了哈希密码，直接与存储的哈希值比较
    // 注意：这里假设前端发送的是SHA-256哈希值
    isPasswordValid = password === user.passwordHash;
    console.log('[API] 使用哈希密码验证');
  } else {
    // 明文密码，需要哈希后比较
    isPasswordValid = verifyPassword(passwordToVerify, user.passwordHash);
    console.log('[API] 使用明文密码验证');
  }
  
  if (isPasswordValid) {
    const loginTime = new Date().toLocaleString();
    console.log('[API] 登录成功 - 用户:', username, '时间:', loginTime, '验证方式:', encrypted ? '哈希验证' : '明文验证');
    
    // 记录成功登录日志
    writeAuditLog('用户登录', `用户 ${username} 成功登录系统 (验证方式: ${encrypted ? '哈希验证' : '明文验证'})`, username, ip);
    
    res.json({ 
      success: true, 
      username: user.username === 'admin' ? '系统管理员' : user.username,
      role: user.role,
      loginTime: loginTime,
      encryptionEnabled: authSettings.encryptionEnabled || false
    });
  } else {
    console.log('[API] 登录失败 - 用户名:', username, '原因: 密码不正确');
    writeAuditLog('登录失败', `用户 ${username} 登录失败，密码错误 (验证方式: ${encrypted ? '哈希验证' : '明文验证'})`, username, ip);
    res.status(401).json({ success: false, message: '账号或密码不正确' });
  }
});

// 获取全量数据
app.get('/api/data', (req, res) => {
  console.log('[API] 获取数据库数据请求');
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    const parsedData = JSON.parse(data);
    console.log('[API] 数据读取成功 - 数据大小:', JSON.stringify(data).length, '字节');
    console.log('[API] 数据概览 - 物料数:', parsedData.materials?.length || 0, 
                '记录数:', parsedData.records?.length || 0,
                '审核数:', parsedData.audit?.length || 0);
    res.json(parsedData);
  } catch (err) {
    console.error('[API] 数据读取失败:', err.message);
    res.status(500).json({ error: '读取数据库失败' });
  }
});

// 写入全量数据
app.post('/api/data', (req, res) => {
  console.log('[API] 数据写入请求');
  try {
    const data = req.body;
    const dataSize = JSON.stringify(data).length;
    const ip = req.ip || req.connection.remoteAddress;
    
    // 读取旧数据进行比较
    let oldData = {};
    try {
      const oldDataStr = fs.readFileSync(DB_FILE, 'utf8');
      oldData = JSON.parse(oldDataStr);
    } catch (e) {
      console.log('[API] 无法读取旧数据进行对比');
    }
    
    console.log('[API] 写入数据大小:', dataSize, '字节');
    console.log('[API] 数据概览 - 物料数:', data.materials?.length || 0, 
                '记录数:', data.records?.length || 0,
                '审核数:', data.audit?.length || 0);
    
    // 直接写入数据，不创建备份
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    const timestamp = new Date().toISOString();
    console.log('[API] 数据写入成功 - 时间戳:', timestamp);
    
    // 记录审计日志
    const changes = analyzeDataChanges(oldData, data);
    changes.forEach(change => {
      writeAuditLog(change.action, change.details, change.user || '未知用户', ip);
    });
    
    res.json({ success: true, timestamp: timestamp });
  } catch (err) {
    console.error('[API] 数据写入失败:', err.message);
    writeAuditLog('数据写入失败', err.message, '系统', req.ip || req.connection.remoteAddress);
    res.status(500).json({ error: '写入数据库失败' });
  }
});

// 分析数据变化的函数
function analyzeDataChanges(oldData, newData) {
  const changes = [];
  
  // 检查物料变化
  if (JSON.stringify(oldData.materials) !== JSON.stringify(newData.materials)) {
    const oldCount = oldData.materials?.length || 0;
    const newCount = newData.materials?.length || 0;
    
    if (newCount > oldCount) {
      changes.push({
        action: '物料添加',
        details: `添加了 ${newCount - oldCount} 个物料，当前总数：${newCount}`
      });
    } else if (newCount < oldCount) {
      changes.push({
        action: '物料删除', 
        details: `删除了 ${oldCount - newCount} 个物料，当前总数：${newCount}`
      });
    } else {
      changes.push({
        action: '物料修改',
        details: `修改了物料信息，总数：${newCount} 个`
      });
    }
  }
  
  // 检查记录变化
  if (JSON.stringify(oldData.records) !== JSON.stringify(newData.records)) {
    const oldCount = oldData.records?.length || 0;
    const newCount = newData.records?.length || 0;
    
    if (newCount !== oldCount) {
      changes.push({
        action: '库存记录更新',
        details: `库存记录从 ${oldCount} 条变更为 ${newCount} 条`
      });
    } else {
      changes.push({
        action: '库存数据修改',
        details: '修改了库存数量或出入库数据'
      });
    }
  }
  
  // 如果没有变化
  if (changes.length === 0) {
    changes.push({
      action: '数据同步',
      details: '执行了数据同步操作'
    });
  }
  
  return changes;
}

// 备份相关API接口

// 获取备份列表
app.get('/api/backups', (req, res) => {
  try {
    const backups = getBackupList();
    res.json({ success: true, backups });
  } catch (error) {
    console.error('[API] 获取备份列表失败:', error.message);
    res.status(500).json({ success: false, error: '获取备份列表失败' });
  }
});

// 手动创建备份
app.post('/api/backup', (req, res) => {
  try {
    const { customName } = req.body;
    const backupPath = createBackup(customName);
    const ip = req.ip || req.connection.remoteAddress;
    writeAuditLog('手动备份', `创建数据库备份: ${customName || '自动命名'}`, req.body.username || '未知用户', ip);
    res.json({ success: true, backupPath });
  } catch (error) {
    console.error('[API] 手动备份失败:', error.message);
    res.status(500).json({ success: false, error: '备份失败' });
  }
});

// 恢复备份
app.post('/api/restore', (req, res) => {
  try {
    const { backupName } = req.body;
    if (!backupName) {
      return res.status(400).json({ success: false, error: '备份文件名不能为空' });
    }
    
    const success = restoreBackup(backupName);
    const ip = req.ip || req.connection.remoteAddress;
    writeAuditLog('恢复备份', `恢复数据库备份: ${backupName}`, req.body.username || '未知用户', ip);
    res.json({ success: true });
  } catch (error) {
    console.error('[API] 恢复备份失败:', error.message);
    res.status(500).json({ success: false, error: '恢复备份失败' });
  }
});

// 清理旧备份
app.post('/api/cleanup-backups', (req, res) => {
  try {
    const { keepCount } = req.body;
    cleanupOldBackups(keepCount);
    const ip = req.ip || req.connection.remoteAddress;
    writeAuditLog('清理备份', `清理旧备份文件，保留最近 ${keepCount || 8} 个备份`, req.body.username || '未知用户', ip);
    res.json({ success: true });
  } catch (error) {
    console.error('[API] 清理备份失败:', error.message);
    res.status(500).json({ success: false, error: '清理备份失败' });
  }
});

// 默认路由 - 所有其他请求都返回 index.html
app.get('*', (req, res) => {
  console.log('[API] 静态文件请求:', req.originalUrl);
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('[ERROR] 服务器错误:', err.message);
  console.error('[ERROR] 请求路径:', req.originalUrl);
  console.error('[ERROR] 请求方法:', req.method);
  if (req.body) {
    console.error('[ERROR] 请求体:', JSON.stringify(req.body));
  }
  console.error('[ERROR] 错误堆栈:', err.stack);
  res.status(500).json({ error: '服务器内部错误' });
});

app.listen(PORT, '0.0.0.0', () => {
  const startTime = new Date().toISOString();
  console.log('='.repeat(50));
  console.log('🚀 物料管理系统后端服务启动');
  console.log('='.repeat(50));
  console.log('📍 服务地址: http://localhost:' + PORT);
  console.log('🔑 管理员账号: ' + (usersConfig.length > 0 ? usersConfig[0].username : 'admin'));
  console.log('📁 数据库文件: ' + DB_FILE);
  console.log('🌐 前端访问: http://localhost:' + PORT);
  console.log('⏰ 启动时间: ' + startTime);
  console.log('='.repeat(50));
  console.log('✅ 服务器已就绪，等待客户端连接...');
  console.log('');
});
