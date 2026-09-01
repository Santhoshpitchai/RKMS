import { AdminLayout } from './AdminLayout';
import { useEffect, useState } from 'react';
import {
  Users, Calendar, TrendingUp, IndianRupee,
  ArrowUpRight, Plus, RefreshCw, Sparkles, Activity
} from 'lucide-react';
import { adminApi } from '../../services/api';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

export function AdminDashboard() {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [stats, setStats] = useState({ totalMembers: 0, totalRevenue: 0, totalEvents: 0, totalPayments: 0 });
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('adminToken');
    if (!token) { setIsLoading(false); return; }
    try {
      const response = await adminApi.getDashboard(token);
      if (response.success) {
        setStats(response.stats || stats);
        setRecentTransactions(response.recentPayments || []);
      }
    } catch (e) {
      console.warn('Dashboard fetch warning:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    let sse: EventSource | null = null;
    try {
      const apiOrigin = window.location.hostname === 'localhost' ? 'http://localhost:5001/api' : '/api';
      sse = new EventSource(`${apiOrigin}/realtime/stream`);
      sse.onmessage = () => {
        fetchDashboardData();
      };
    } catch (err) {}

    return () => {
      if (sse) sse.close();
    };
  }, []);

  const kpiCards = [
    {
      title: 'Total Members',
      value: stats.totalMembers.toLocaleString() || '0',
      icon: Users,
      gradient: isLight ? 'from-sky-50 to-white' : 'from-sky-500/20 to-transparent',
      iconGradient: 'from-sky-500 to-cyan-500',
      border: isLight ? 'border-sky-200' : 'border-sky-500/30',
      glow: isLight ? '' : 'shadow-sky-950/50',
      trend: 'Active lifetime members',
      trendUp: true,
    },
    {
      title: 'Total Revenue',
      value: `₹${Number(stats.totalRevenue || 0).toLocaleString('en-IN')}`,
      icon: IndianRupee,
      gradient: isLight ? 'from-emerald-50 to-white' : 'from-emerald-500/20 to-transparent',
      iconGradient: 'from-emerald-500 to-teal-500',
      border: isLight ? 'border-emerald-200' : 'border-emerald-500/30',
      glow: isLight ? '' : 'shadow-emerald-950/50',
      trend: `${stats.totalPayments} confirmed transactions`,
      trendUp: true,
    },
    {
      title: 'Events',
      value: String(stats.totalEvents || 0),
      icon: Calendar,
      gradient: isLight ? 'from-violet-50 to-white' : 'from-violet-500/20 to-transparent',
      iconGradient: 'from-violet-500 to-purple-500',
      border: isLight ? 'border-violet-200' : 'border-violet-500/30',
      glow: isLight ? '' : 'shadow-violet-950/50',
      trend: 'Past & upcoming events',
      trendUp: false,
    },
    {
      title: 'Member Growth',
      value: `${stats.totalMembers || 0}`,
      icon: TrendingUp,
      gradient: isLight ? 'from-amber-50 to-white' : 'from-amber-500/20 to-transparent',
      iconGradient: 'from-amber-500 to-orange-500',
      border: isLight ? 'border-amber-200' : 'border-amber-500/30',
      glow: isLight ? '' : 'shadow-amber-950/50',
      trend: 'Verified member base',
      trendUp: true,
    },
  ];

  const card = isLight
    ? 'bg-white border shadow-sm hover:shadow-lg'
    : 'bg-slate-900/60 border hover:bg-slate-900/80 shadow-xl';

  return (
    <AdminLayout>
      <div className="space-y-7">

        {/* Welcome Banner */}
        <div className={`relative overflow-hidden rounded-2xl p-6 border ${
          isLight
            ? 'bg-gradient-to-br from-slate-900 to-cyan-950 border-slate-700'
            : 'bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/60 border-slate-800'
        }`}>
          {/* Decorative blobs */}
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center gap-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-2.5 py-1 text-[10px] font-bold text-cyan-400 uppercase tracking-widest">
                  <Sparkles className="w-3 h-3" />
                  Admin Hub
                </div>
                <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1 text-[10px] font-bold text-emerald-400">
                  <Activity className="w-3 h-3 animate-pulse" />
                  Live
                </div>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Organization Overview
              </h1>
              <p className="text-slate-400 text-sm mt-1 max-w-md">
                Real-time stats for members, donations, events and registrations.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={fetchDashboardData}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl transition-all hover:scale-105"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
              </button>
              <Link
                to="/admin/events"
                className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-cyan-900/50 transition-all hover:scale-105"
              >
                <Plus className="w-4 h-4" /> Add Event
              </Link>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {kpiCards.map((c, i) => {
            const Icon = c.icon;
            return (
              <div
                key={i}
                className={`relative overflow-hidden rounded-2xl p-5 border transition-all duration-300 group cursor-default ${card} ${c.border} ${c.glow ? `shadow-xl ${c.glow}` : ''} hover:-translate-y-1`}
              >
                {/* Gradient bg */}
                <div className={`absolute inset-0 bg-gradient-to-br ${c.gradient} opacity-60 pointer-events-none`} />

                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <p className={`text-xs font-semibold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{c.title}</p>
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${c.iconGradient} flex items-center justify-center shadow-lg flex-shrink-0 transition-transform group-hover:scale-110`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                  </div>

                  <div className={`text-3xl font-extrabold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {isLoading ? <div className={`h-8 w-20 rounded-lg animate-pulse ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`} /> : c.value}
                  </div>

                  <div className={`mt-3 pt-3 border-t flex items-center justify-between text-[11px] font-medium ${
                    isLight ? 'border-slate-200 text-slate-500' : 'border-slate-800 text-slate-500'
                  }`}>
                    <span>{c.trend}</span>
                    <ArrowUpRight className={`w-3.5 h-3.5 ${c.trendUp ? 'text-emerald-500' : 'text-slate-500'}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-5">

          {/* Transactions Table */}
          <div className={`lg:col-span-2 rounded-2xl border overflow-hidden ${card} ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <div className={`flex items-center justify-between p-5 border-b ${isLight ? 'border-slate-100' : 'border-slate-800'}`}>
              <div>
                <h3 className={`font-extrabold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>Recent Payments & Donations</h3>
                <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Latest confirmed transactions only</p>
              </div>
              <Link to="/admin/payments" className="flex items-center gap-1 text-xs font-bold text-cyan-500 hover:text-cyan-400 transition-colors">
                View All <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {isLoading ? (
              <div className="p-10 space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className={`h-12 rounded-xl animate-pulse ${isLight ? 'bg-slate-100' : 'bg-slate-800'}`} />
                ))}
              </div>
            ) : recentTransactions.length === 0 ? (
              <div className="p-12 text-center">
                <div className={`w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center ${isLight ? 'bg-slate-100' : 'bg-slate-800'}`}>
                  <IndianRupee className="w-5 h-5 text-slate-400" />
                </div>
                <p className="text-sm text-slate-400 font-medium">No transactions yet</p>
                <p className="text-xs text-slate-500 mt-1">Completed payments will appear here</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className={`${isLight ? 'bg-slate-50 text-slate-500 border-b border-slate-100' : 'bg-slate-800/50 text-slate-400 border-b border-slate-800'}`}>
                    <tr>
                      {['Member / Donor', 'Type', 'Amount', 'Date', 'Status'].map(h => (
                        <th key={h} className="py-3 px-5 font-bold uppercase text-[10px] tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isLight ? 'divide-slate-100' : 'divide-slate-800/60'}`}>
                    {recentTransactions.map((tx, idx) => (
                      <tr key={tx.id || idx} className={`transition-colors ${isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/30'}`}>
                        <td className={`py-3.5 px-5 font-semibold whitespace-nowrap ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                          {tx.name || tx.donor_name || 'Guest'}
                        </td>
                        <td className="py-3.5 px-5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                            tx.type === 'membership'
                              ? isLight ? 'bg-sky-100 text-sky-700' : 'bg-sky-500/10 text-sky-400'
                              : isLight ? 'bg-violet-100 text-violet-700' : 'bg-violet-500/10 text-violet-400'
                          }`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 font-extrabold text-emerald-500 whitespace-nowrap">
                          ₹{Number(tx.amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className={`py-3.5 px-5 whitespace-nowrap ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          {tx.created_at ? new Date(tx.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                        </td>
                        <td className="py-3.5 px-5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                            Confirmed
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Side Panel */}
          <div className="space-y-4">

            {/* Quick Links */}
            <div className={`rounded-2xl border p-5 ${card} ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <h4 className={`font-extrabold text-sm mb-4 ${isLight ? 'text-slate-900' : 'text-white'}`}>Quick Management</h4>
              <div className="space-y-2">
                {[
                  { to: '/admin/events',    label: 'Manage Events',   iconGrad: 'from-violet-500 to-purple-500', icon: Calendar   },
                  { to: '/admin/members',   label: 'Manage Members',  iconGrad: 'from-sky-500 to-cyan-500',     icon: Users      },
                  { to: '/admin/payments',  label: 'View Payments',   iconGrad: 'from-emerald-500 to-teal-500', icon: IndianRupee},
                  { to: '/admin/settings',  label: 'Site Settings',   iconGrad: 'from-amber-500 to-orange-500', icon: Calendar   },
                ].map((l) => {
                  const Icon = l.icon;
                  return (
                    <Link
                      key={l.to}
                      to={l.to}
                      className={`group flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition-all duration-200 hover:-translate-y-0.5 ${
                        isLight ? 'bg-slate-50 hover:bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:shadow-sm' : 'bg-slate-800/50 hover:bg-slate-800 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-lg bg-gradient-to-tr ${l.iconGrad} flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 shadow-md`}>
                          <Icon className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span>{l.label}</span>
                      </div>
                      <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-500 transition-colors" />
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* System Status */}
            <div className={`rounded-2xl border p-5 ${card} ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <h4 className={`font-extrabold text-sm mb-4 ${isLight ? 'text-slate-900' : 'text-white'}`}>System Status</h4>
              <div className="space-y-3">
                {[
                  { label: 'Members Registered', value: stats.totalMembers, max: 500, color: 'from-sky-500 to-cyan-500' },
                  { label: 'Payment Gateway',    value: 100, max: 100,                color: 'from-emerald-500 to-teal-500' },
                  { label: 'Event Sync',         value: 100, max: 100,                color: 'from-violet-500 to-purple-500' },
                ].map((p, i) => {
                  const pct = Math.min(100, Math.round((p.value / p.max) * 100));
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-[11px] font-semibold mb-1.5">
                        <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>{p.label}</span>
                        <span className="text-white">{pct}%</span>
                      </div>
                      <div className={`w-full rounded-full h-1.5 overflow-hidden ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`}>
                        <div
                          className={`bg-gradient-to-r ${p.color} h-full rounded-full transition-all duration-1000`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </div>
    </AdminLayout>
  );
}