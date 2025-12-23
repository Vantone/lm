import crypto from 'crypto';

// 生成SHA-256哈希值（与系统保持一致）
function generatePasswordHash(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// 从命令行参数获取密码
const password = process.argv[2];

if (!password) {
  console.log('使用方法: node generate-hash.js "你的密码"');
  console.log('示例: node generate-hash.js "mypassword123"');
  process.exit(1);
}

const hash = generatePasswordHash(password);
console.log(`密码: ${password}`);
console.log(`哈希值: ${hash}`);
console.log('');
console.log('将此哈希值复制到users.json的passwordHash字段中');