import { AdminLayout } from './AdminLayout';
import { useState, useEffect } from 'react';
import { ShieldCheck, Search, Clock, RefreshCw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '../../context/ThemeContext';

import { API_BASE_URL } from '../../services/api';

interface AuditLog {
  id?: number | string;
  admin_email: string;
  action_type: string;
  target_entity: string;
  details: string;
  ip_address: string;
  created_at: string;
}

export function AuditLogs() {
  const { theme } = useTheme();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const isLight = theme === 'light';

  const fetchLogs = async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;

    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE_URL}/admin/audit-logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.logs) {
        setLogs(data.logs);
      }
    } catch (error) {
      toast.error('Failed to fetch audit logs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const q = searchQuery.toLowerCase();
    return (
      (log.admin_email || '').toLowerCase().includes(q) ||
      (log.action_type || '').toLowerCase().includes(q) ||
      (log.target_entity || '').toLowerCase().includes(q) ||
      (log.details || '').toLowerCase().includes(q)
    );
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 rounded-2xl border shadow-xl transition-colors ${
          isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-white'
        }`}>
          <div>
            <div className="flex items-center gap-2 text-cyan-500 text-xs font-semibold mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Administrative Oversight</span>
            </div>
            <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              System Audit Logs
            </h1>
            <p className={`text-xs sm:text-sm mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Real-time log of administrative updates, event changes, and security events.
            </p>
          </div>

          <button
            onClick={fetchLogs}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all border ${
              isLight 
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700' 
                : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
            }`}
          >
            <RefreshCw className={`w-4 h-4 text-cyan-500 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Logs
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Filter logs by admin, action, or entity..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full text-xs pl-9 pr-3 py-2.5 rounded-xl focus:outline-none focus:border-cyan-500 border ${
              isLight 
                ? 'bg-white border-slate-300 text-slate-800 placeholder-slate-400' 
                : 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-500'
            }`}
          />
        </div>

        {/* Audit Logs Table */}
        <div className={`rounded-2xl border shadow-xl overflow-hidden transition-colors ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800'
        }`}>
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 text-xs">Loading activity audit logs...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">No audit logs matching query.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className={`w-full text-left text-xs ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                <thead className={`font-bold uppercase tracking-wider text-[10px] border-b ${
                  isLight ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}>
                  <tr>
                    <th className="p-4">Timestamp</th>
                    <th className="p-4">Admin</th>
                    <th className="p-4">Action Type</th>
                    <th className="p-4">Target Entity</th>
                    <th className="p-4">IP Address</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/60'}`}>
                  {filteredLogs.map((log, idx) => (
                    <tr key={log.id || idx} className={`transition-colors ${isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-900/50'}`}>
                      <td className={`p-4 whitespace-nowrap flex items-center gap-1.5 font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                        <Clock className="w-3.5 h-3.5 text-cyan-500" />
                        {String(log.created_at || '').replace('T', ' ').slice(0, 19)}
                      </td>
                      <td className={`p-4 font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{log.admin_email}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-cyan-500/10 text-cyan-600 border border-cyan-500/20">
                          {log.action_type || 'SYSTEM'}
                        </span>
                      </td>
                      <td className={`p-4 font-mono ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{log.target_entity}</td>
                      <td className={`p-4 font-mono ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>{log.ip_address || '127.0.0.1'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
