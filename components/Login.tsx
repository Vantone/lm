
import React, { useState } from 'react';
import { dataService } from '../services/dataService';
import { CryptoUtil } from '../utils/crypto';
import { Package2, Lock, User, AlertCircle, Loader2, Shield } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [encryptionEnabled, setEncryptionEnabled] = useState(true);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      let passwordToSend = password;
      let encrypted = false;
      
      // 检查是否支持加密功能
      if (encryptionEnabled && CryptoUtil.isCryptoSupported()) {
        try {
          // 先尝试哈希密码（更安全的传输方式）
          passwordToSend = await CryptoUtil.hashPassword(password);
          encrypted = true;
          console.log('[LOGIN] 密码已哈希处理');
        } catch (encryptError) {
          console.warn('[LOGIN] 密码加密失败，使用明文传输:', encryptError);
          setEncryptionEnabled(false);
        }
      } else {
        console.log('[LOGIN] 浏览器不支持加密或已禁用，使用明文传输');
      }
      
      const success = await dataService.login(username, passwordToSend, encrypted);
      if (success) {
        onLoginSuccess();
      } else {
        setError('用户名或密码错误');
      }
    } catch (err) {
      setError('服务器连接失败，请检查后端状态');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-500">
        <div className="bg-indigo-600 p-10 text-center text-white">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/30">
            <Package2 size={32} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">企业物料管理系统</h1>
        </div>

        <form onSubmit={handleLogin} className="p-10 space-y-6">
          {error && (
            <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex items-center gap-3 text-rose-600 text-sm animate-shake">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">用户名</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all text-sm disabled:opacity-50"
                  placeholder="请输入用户名"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">密码</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all text-sm disabled:opacity-50"
                  placeholder="请输入密码"
                  required
                />
              </div>
            </div>
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-xl shadow-indigo-200 hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:bg-indigo-400"
          >
            {isLoading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                正在验证...
              </>
            ) : (
              '立即登录系统'
            )}
          </button>

          <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
            {encryptionEnabled && CryptoUtil.isCryptoSupported() ? (
              <>
                <Shield size={12} className="text-green-500" />
                <span>安全传输已启用</span>
              </>
            ) : (
              <span>内部管理系统，账号信息由环境变量配置</span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
