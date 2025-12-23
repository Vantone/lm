
import React, { useEffect, useState } from 'react';
import { dataService } from '../services/dataService';
import { AuditLog } from '../types';
import { Shield, Clock, User, Info } from 'lucide-react';

const AuditLogView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    setLogs(dataService.getAuditLogs());
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-800">操作审计日志</h3>
          <p className="text-sm text-slate-500">记录系统中所有的关键操作和变动记录</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-lg text-slate-600 text-sm font-medium">
          <Shield size={16} className="text-indigo-600" />
          全系统审计模式开启
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-4">时间戳</th>
                <th className="px-6 py-4">操作用户</th>
                <th className="px-6 py-4">操作动作</th>
                <th className="px-6 py-4">详细说明</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-500 text-xs">
                        <Clock size={14} />
                        {log.timestamp}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[10px] text-slate-600 font-bold">管理员</div>
                        <span className="font-medium text-slate-700">{log.user}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        log.action.includes('删除') ? 'bg-rose-50 text-rose-600' : 
                        log.action.includes('导出') ? 'bg-amber-50 text-amber-600' : 
                        'bg-indigo-50 text-indigo-600'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 flex items-center gap-2">
                      <Info size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                      {log.details}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center text-slate-400 italic">
                    暂无审计日志记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditLogView;
