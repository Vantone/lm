import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// 确保备份目录存在
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * 创建数据库备份
 * @param {string} customName - 自定义备份名称（可选）
 * @returns {Promise<string>} 备份文件路径
 */
export async function createBackup(customName = null) {
  try {
    if (!fs.existsSync(DB_FILE)) {
      throw new Error('数据库文件不存在');
    }

    // 生成备份文件名
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').split('T')[0]; // 只保留日期部分
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // 时间部分
    
    // 如果有自定义名称，则在名称后添加日期
    const backupName = customName 
      ? `${customName}_${timestamp}.json` 
      : `database_${timestamp}_${timeStr}.json`;
    const backupPath = path.join(BACKUP_DIR, backupName);

    // 读取当前数据库
    const dbContent = fs.readFileSync(DB_FILE, 'utf8');
    const dbData = JSON.parse(dbContent);

    // 添加备份元数据
    const backupData = {
      backupInfo: {
        timestamp: now.toISOString(),
        version: '1.0.0',
        description: customName ? `手动备份: ${customName}` : '自动备份',
        originalSize: Buffer.byteLength(dbContent, 'utf8')
      },
      data: dbData
    };

    // 写入备份文件
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf8');
    
    console.log(`[BACKUP] 数据库备份成功: ${backupPath}`);
    return backupPath;
  } catch (error) {
    console.error('[BACKUP] 备份失败:', error.message);
    throw error;
  }
}

/**
 * 清理旧备份文件，保留最近N个备份
 * @param {number} keepCount - 保留的备份数量
 */
export async function cleanupOldBackups(keepCount = 8) { // 默认保留8周备份
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      return;
    }

    const files = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.endsWith('.json'))
      .map(file => ({
        name: file,
        path: path.join(BACKUP_DIR, file),
        stat: fs.statSync(path.join(BACKUP_DIR, file))
      }))
      .sort((a, b) => b.stat.mtime - a.stat.mtime); // 按修改时间倒序

    if (files.length > keepCount) {
      const filesToDelete = files.slice(keepCount);
      
      for (const file of filesToDelete) {
        fs.unlinkSync(file.path);
        console.log(`[BACKUP] 删除旧备份: ${file.name}`);
      }
      
      console.log(`[BACKUP] 清理完成，删除了 ${filesToDelete.length} 个旧备份文件`);
    }
  } catch (error) {
    console.error('[BACKUP] 清理备份失败:', error.message);
  }
}

/**
 * 获取所有备份文件列表
 * @returns {Array} 备份文件信息列表
 */
export function getBackupList() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      return [];
    }

    const files = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const filePath = path.join(BACKUP_DIR, file);
        const stat = fs.statSync(filePath);
        
        // 尝试读取备份信息
        let backupInfo = null;
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const data = JSON.parse(content);
          backupInfo = data.backupInfo;
        } catch (e) {
          // 忽略读取错误
        }

        return {
          name: file,
          path: filePath,
          size: stat.size,
          createdAt: stat.birthtime.toISOString(),
          modifiedAt: stat.mtime.toISOString(),
          backupInfo
        };
      })
      .sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));

    return files;
  } catch (error) {
    console.error('[BACKUP] 获取备份列表失败:', error.message);
    return [];
  }
}

/**
 * 恢复数据库备份
 * @param {string} backupName - 备份文件名
 * @returns {Promise<boolean>} 恢复是否成功
 */
export async function restoreBackup(backupName) {
  try {
    const backupPath = path.join(BACKUP_DIR, backupName);
    
    if (!fs.existsSync(backupPath)) {
      throw new Error('备份文件不存在');
    }

    // 读取备份文件
    const backupContent = fs.readFileSync(backupPath, 'utf8');
    const backupData = JSON.parse(backupContent);

    // 提取原始数据
    const originalData = backupData.data || backupData;

    // 创建当前数据库的备份（恢复前备份）
    await createBackup(`before_restore_${backupName.replace('.json', '')}`);

    // 恢复数据
    fs.writeFileSync(DB_FILE, JSON.stringify(originalData, null, 2), 'utf8');
    
    console.log(`[BACKUP] 数据库恢复成功: ${backupName}`);
    return true;
  } catch (error) {
    console.error('[BACKUP] 恢复备份失败:', error.message);
    throw error;
  }
}