// 前端加密工具
export class CryptoUtil {
  private static readonly ALGORITHM = 'AES-256-CBC';
  
  // 生成密钥（与后端保持一致）
  private static generateKey(): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = encoder.encode('material-management-system');
    
    return crypto.subtle.importKey(
      'raw',
      keyMaterial,
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    ).then(key => 
      crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: encoder.encode('salt'),
          iterations: 1000,
          hash: 'SHA-256'
        },
        key,
        { name: 'AES-CBC', length: 256 },
        false,
        ['encrypt', 'decrypt']
      )
    );
  }
  
  // 加密密码
  static async encryptPassword(password: string): Promise<string | null> {
    try {
      const key = await this.generateKey();
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      
      // 生成随机IV
      const iv = crypto.getRandomValues(new Uint8Array(16));
      
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-CBC', iv },
        key,
        data
      );
      
      // 组合IV和加密数据
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);
      
      // 转换为十六进制字符串
      return Array.from(combined)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    } catch (error) {
      console.error('密码加密失败:', error);
      return null;
    }
  }
  
  // 简单的哈希函数（用于传输时的额外安全）
  static async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  // 检查浏览器是否支持加密功能
  static isCryptoSupported(): boolean {
    return typeof window !== 'undefined' && 
           window.crypto && 
           window.crypto.subtle &&
           typeof TextEncoder !== 'undefined';
  }
}