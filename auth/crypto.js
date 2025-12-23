import crypto from 'crypto';

// 加密配置
const ALGORITHM = 'aes-256-cbc';
const SECRET_KEY = crypto.scryptSync('material-management-system', 'salt', 32);

// 加密函数
export function encrypt(text) {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(ALGORITHM, SECRET_KEY);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  } catch (error) {
    console.error('加密失败:', error);
    return null;
  }
}

// 解密函数
export function decrypt(encryptedText) {
  try {
    const decipher = crypto.createDecipher(ALGORITHM, SECRET_KEY);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('解密失败:', error);
    return null;
  }
}

// SHA-256哈希函数（与前端保持一致）
export function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// 验证密码（明文密码验证）
export function verifyPassword(password, hashedPassword) {
  return hashPassword(password) === hashedPassword;
}

// 验证哈希密码（哈希值直接比较）
export function verifyHashPassword(hashedPassword, storedHashedPassword) {
  return hashedPassword === storedHashedPassword;
}