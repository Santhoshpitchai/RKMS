import { useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Calendar, Users, CreditCard, Settings, LogOut, Menu, X, ShieldCheck, Activity, Bell, Sun, Moon } from 'lucide-react';
import { toast } from 'sonner';
import logo from '../../assets/RKMS-Logo.png';
import { useTheme } from '../../context/ThemeContext';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminUser, setAdminUser] = useState<string>('Admin');
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const isAuthenticated = localStorage.getItem('adminAuth');
    const adminToken = localStorage.getItem('adminToken');
    if (!isAuthenticated || !adminToken) {
      localStorage.removeItem('adminAuth');
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUsername');
      navigate('/admin/login');
    }
    const storedUser = localStorage.getItem('adminUsername');
    if (storedUser) {
      setAdminUser(storedUser);
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('adminAuth');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUsername');
    toast.success('Logged out successfully');
    navigate('/admin/login');
  };

  const navItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/events', label: 'Events & Past Events', icon: Calendar },
    { path: '/admin/members', label: 'Members', icon: Users },
    { path: '/admin/payments', label: 'Payments', icon: CreditCard },
    { path: '/admin/settings', label: 'Settings', icon: Settings },
    { path: '/admin/audit-logs', label: 'Audit Logs', icon: ShieldCheck },
  ];

  const currentRouteName = navItems.find((n) => n.path === location.pathname)?.label || 'Overview';

  return (
    <div className={`min-h-screen flex font-sans antialiased selection:bg-cyan-500 selection:text-white transition-colors duration-200 ${
      theme === 'light' ? 'bg-slate-100 text-slate-800' : 'bg-slate-900 text-slate-100'
    }`}>
      
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-950/95 border-r border-slate-800/80 flex flex-col justify-between transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-5 space-y-6">
          {/* Logo & Branding */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-cyan-400 p-0.5 shadow-lg shadow-cyan-500/20">
                <img src={logo} alt="RKS Logo" className="w-full h-full object-cover rounded-[10px] bg-slate-900" />
              </div>
              <div>
                <h1 className="font-extrabold text-base tracking-wide text-white leading-snug">RKS Admin</h1>
                <p className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider">Mahila Sangha</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-slate-800 to-transparent" />

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            <div className="px-3 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Navigation
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-3 rounded-xl font-medium text-xs transition-all duration-200 group ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-950/50'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400 animate-pulse" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Profile & System Status */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/50 space-y-3">
          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-xs border border-cyan-500/20">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-slate-200 truncate capitalize">{adminUser}</p>
                <p className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Admin
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Logout"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 transition-colors ${
        theme === 'light' ? 'bg-slate-50 text-slate-800' : 'bg-slate-900/90 text-slate-100'
      }`}>
        {/* Top Header */}
        <header className={`sticky top-0 z-30 backdrop-blur-md border-b px-4 sm:px-6 py-4 flex items-center justify-between transition-colors ${
          theme === 'light' ? 'bg-white/90 border-slate-200 text-slate-800' : 'bg-slate-950/80 border-slate-800/80 text-white'
        }`}>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-slate-400 hover:text-cyan-600 p-1"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>RKS Admin</span>
                <span>/</span>
                <span className="text-cyan-500 font-semibold">{currentRouteName}</span>
              </div>
              <h2 className={`text-lg font-bold tracking-tight ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                {currentRouteName}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Light / Dark Mode Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-sm ${
                theme === 'dark' 
                  ? 'bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700' 
                  : 'bg-slate-100 border-slate-300 text-indigo-700 hover:bg-slate-200'
              }`}
              title="Toggle Light / Dark Theme"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline text-amber-300">Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-600" />
                  <span className="hidden sm:inline text-indigo-700">Dark Mode</span>
                </>
              )}
            </button>

            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold">
              <Activity className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
              <span>Real-Time Sync</span>
            </div>
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>

    </div>
  );
}