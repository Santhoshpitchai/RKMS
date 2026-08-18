import { AdminLayout } from './AdminLayout';
import { useEffect, useState } from 'react';
import { Users, Calendar, TrendingUp, IndianRupee, ArrowUpRight, Plus, Eye, Sparkles, RefreshCw } from 'lucide-react';
import { adminApi } from '../../services/api';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

export function AdminDashboard() {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [stats, setStats] = useState({
    totalMembers: 0,
    totalRevenue: 0,
    totalEvents: 0,
    totalPayments: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('adminToken');
    if (!token) {
      setIsLoading(false);
      return;
    }
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
  }, []);

  const kpiCards = [
    {
      title: 'Total Active Members',
      value: stats.totalMembers ? stats.totalMembers.toLocaleString() : '0',
      icon: Users,
      gradient: isLight ? 'from-cyan-50 via-white to-white border-cyan-200' : 'from-cyan-500/20 via-cyan-500/10 to-transparent border-cyan-500/30',
      iconBg: isLight ? 'bg-cyan-100 text-cyan-700 border border-cyan-200' : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
      trend: '+12% this month',
    },
    {
      title: 'Total Revenue & Fees',
      value: `₹${(Number(stats.totalRevenue || 0) / 100000).toFixed(2)}L`,
      icon: IndianRupee,
      gradient: isLight ? 'from-emerald-50 via-white to-white border-emerald-200' : 'from-emerald-500/20 via-emerald-500/10 to-transparent border-emerald-500/30',
      iconBg: isLight ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
      trend: `${stats.totalPayments} transactions`,
    },
    {
      title: 'Past & Upcoming Events',
      value: stats.totalEvents || 0,
      icon: Calendar,
      gradient: isLight ? 'from-purple-50 via-white to-white border-purple-200' : 'from-purple-500/20 via-purple-500/10 to-transparent border-purple-500/30',
      iconBg: isLight ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
      trend: 'Live synchronized',
    },
    {
      title: 'Monthly Growth',
      value: `${stats.totalMembers || 0}`,
      icon: TrendingUp,
      gradient: isLight ? 'from-amber-50 via-white to-white border-amber-200' : 'from-amber-500/20 via-amber-500/10 to-transparent border-amber-500/30',
      iconBg: isLight ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
      trend: 'Verified member base',
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        
        {/* Welcome Header */}
        <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 rounded-2xl border shadow-xl transition-colors ${
          isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/40 border-slate-800 text-white'
        }`}>
          <div>
            <div className="flex items-center gap-2 text-cyan-500 text-xs font-semibold mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Admin Management Hub</span>
            </div>
            <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Organization Overview
            </h1>
            <p className={`text-xs sm:text-sm mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Real-time statistics for members, donations, events, and registrations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchDashboardData}
              className={`p-2.5 rounded-xl border transition-colors ${
                isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-500' : ''}`} />
            </button>
            <Link
              to="/admin/events"
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all transform hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              Add Event
            </Link>
          </div>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {kpiCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <div
                key={index}
                className={`bg-gradient-to-br ${card.gradient} rounded-2xl p-5 border shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 ${
                  isLight ? 'bg-white text-slate-800' : 'bg-slate-950/80 text-white'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-semibold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{card.title}</span>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.iconBg}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <div className={`text-3xl font-extrabold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>{card.value}</div>
                <div className={`mt-3 pt-3 border-t flex items-center justify-between text-[11px] ${
                  isLight ? 'border-slate-200 text-slate-500' : 'border-slate-800/80 text-slate-400'
                }`}>
                  <span>{card.trend}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent Transactions & Actions */}
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Main Table (2 cols) */}
          <div className={`lg:col-span-2 rounded-2xl border shadow-xl overflow-hidden transition-colors ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950/80 border-slate-800 text-white'
          }`}>
            <div className={`p-5 border-b flex items-center justify-between ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <div>
                <h3 className={`font-bold text-base ${isLight ? 'text-slate-900' : 'text-white'}`}>Recent Payments & Donations</h3>
                <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Latest activity across member subscriptions and event registrations.</p>
              </div>
              <Link to="/admin/payments" className="text-xs font-semibold text-cyan-600 hover:underline flex items-center gap-1">
                View All <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {isLoading ? (
              <div className="p-12 text-center text-slate-400 text-sm">Loading transactions...</div>
            ) : recentTransactions.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">No transaction records found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className={`uppercase text-[10px] font-bold tracking-wider ${
                    isLight ? 'bg-slate-100 text-slate-600 border-b border-slate-200' : 'bg-slate-900/80 text-slate-400 border-b border-slate-800'
                  }`}>
                    <tr>
                      <th className="py-3 px-5">Member / Donor</th>
                      <th className="py-3 px-5">Type</th>
                      <th className="py-3 px-5">Amount</th>
                      <th className="py-3 px-5">Date</th>
                      <th className="py-3 px-5">Status</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/60'}`}>
                    {recentTransactions.map((tx, idx) => (
                      <tr key={tx.id || idx} className={`transition-colors ${isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-900/50'}`}>
                        <td className={`py-3.5 px-5 font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          {tx.name || tx.donor_name || 'Guest User'}
                        </td>
                        <td className="py-3.5 px-5 capitalize text-cyan-600 font-medium">{tx.type}</td>
                        <td className="py-3.5 px-5 font-bold text-emerald-600">₹{Number(tx.amount || 0).toLocaleString()}</td>
                        <td className={`py-3.5 px-5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          {tx.created_at ? new Date(tx.created_at).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="py-3.5 px-5">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-600">
                            Completed
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Side Shortcuts & Breakdown */}
          <div className="space-y-5">
            {/* Quick Navigation Cards */}
            <div className={`p-5 rounded-2xl border shadow-xl space-y-4 transition-colors ${
              isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950/80 border-slate-800 text-white'
            }`}>
              <h4 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>Quick Management</h4>
              <div className="space-y-2.5">
                <Link
                  to="/admin/events"
                  className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition-colors group ${
                    isLight ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700' : 'bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <span>Manage Events</span>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-600 transition-colors" />
                </Link>

                <Link
                  to="/admin/members"
                  className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition-colors group ${
                    isLight ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700' : 'bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-600 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                    <span>Manage Members</span>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-600 transition-colors" />
                </Link>

                <Link
                  to="/admin/settings"
                  className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition-colors group ${
                    isLight ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700' : 'bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                      <Eye className="w-4 h-4" />
                    </div>
                    <span>Public Site Settings</span>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-600 transition-colors" />
                </Link>
              </div>
            </div>

            {/* Growth Progress Widget */}
            <div className={`p-5 rounded-2xl border shadow-xl space-y-4 transition-colors ${
              isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950/80 border-slate-800 text-white'
            }`}>
              <h4 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>Membership Progress</h4>
              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between mb-1 font-medium text-slate-600 dark:text-slate-300">
                    <span>Verified Lifetime Members</span>
                    <span className="text-cyan-600 font-bold">{stats.totalMembers}</span>
                  </div>
                  <div className={`w-full rounded-full h-2 overflow-hidden border ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                    <div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full" style={{ width: '85%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1 font-medium text-slate-600 dark:text-slate-300">
                    <span>System Status</span>
                    <span className="text-emerald-600 font-bold">100% Operational</span>
                  </div>
                  <div className={`w-full rounded-full h-2 overflow-hidden border ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: '100%' }} />
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </AdminLayout>
  );
}