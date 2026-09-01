import { useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, Users, CreditCard, Settings,
  LogOut, Menu, X, ShieldCheck, Activity, Sun, Moon, ChevronRight, ImageIcon
} from 'lucide-react';
import { toast } from 'sonner';
import logo from '../../assets/RKMS-Logo.png';
import { useTheme } from '../../context/ThemeContext';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: '/admin/dashboard',    label: 'Dashboard',       icon: LayoutDashboard, color: 'text-cyan-400',   bg: 'bg-cyan-500/10'   },
  { path: '/admin/events',       label: 'Events',           icon: Calendar,        color: 'text-violet-400', bg: 'bg-violet-500/10' },
  { path: '/admin/members',      label: 'Members',          icon: Users,           color: 'text-sky-400',    bg: 'bg-sky-500/10'    },
  { path: '/admin/payments',     label: 'Payments',         icon: CreditCard,      color: 'text-emerald-400',bg: 'bg-emerald-500/10'},
  { path: '/admin/page-images',  label: 'Page Images',      icon: ImageIcon,       color: 'text-pink-400',   bg: 'bg-pink-500/10'   },
  { path: '/admin/settings',     label: 'Settings',         icon: Settings,        color: 'text-amber-400',  bg: 'bg-amber-500/10'  },
  { path: '/admin/audit-logs',   label: 'Audit Logs',       icon: ShieldCheck,     color: 'text-rose-400',   bg: 'bg-rose-500/10'   },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminUser, setAdminUser] = useState<string>('Admin');
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';

  useEffect(() => {
    const storedUser = localStorage.getItem('adminUsername');
    if (storedUser) setAdminUser(storedUser);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('adminAuth');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUsername');
    toast.success('Logged out successfully');
    navigate('/admin/login');
  };

  const currentRouteName = navItems.find((n) => n.path === location.pathname)?.label || 'Overview';

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-cyan-400 p-0.5 shadow-lg shadow-cyan-500/30 animate-glow">
              <img src={logo} alt="RKS Logo" className="w-full h-full object-cover rounded-[10px] bg-slate-950" />
            </div>
          </div>
          <div>
            <h1 className="font-extrabold text-sm tracking-wide text-white leading-tight">RKS Admin</h1>
            <p className="text-[10px] font-semibold text-cyan-400 uppercase tracking-widest">Mahila Sangha</p>
          </div>
        </div>
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Gradient Divider */}
      <div className="mx-5 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent mb-4" />

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        <p className="px-3 pb-2 text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">Navigation</p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500/20 via-cyan-500/10 to-transparent text-cyan-300 border border-cyan-500/30 shadow-lg shadow-cyan-950/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/70 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 ${isActive ? item.bg : 'bg-slate-800/50 group-hover:bg-slate-800'}`}>
                  <Icon className={`w-3.5 h-3.5 ${isActive ? item.color : 'text-slate-500 group-hover:text-slate-300'}`} />
                </div>
                <span className="leading-none">{item.label}</span>
              </div>
              {isActive
                ? <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400 animate-pulse" />
                : <ChevronRight className="w-3.5 h-3.5 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              }
            </Link>
          );
        })}
      </nav>

      {/* Footer – User Info + Logout */}
      <div className="p-4 mt-2 border-t border-slate-800/70">
        <div className="flex items-center justify-between bg-slate-900/70 rounded-xl p-3 border border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-cyan-400 flex items-center justify-center font-bold text-white text-xs flex-shrink-0 shadow-md shadow-cyan-950">
              {adminUser.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-200 truncate capitalize">{adminUser}</p>
              <p className="text-[9px] text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                Live Session
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Logout"
            className="ml-2 p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all duration-200 flex-shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className={`min-h-screen flex font-sans antialiased selection:bg-cyan-500 selection:text-white transition-colors duration-300 ${
        isLight ? 'bg-slate-100 text-slate-800' : 'bg-[#080d18] text-slate-100'
      }`}
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-60 flex flex-col transition-transform duration-300 ease-in-out border-r ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${
          isLight
            ? 'bg-white/90 border-slate-200 shadow-xl'
            : 'bg-slate-950/95 border-slate-800/60 shadow-2xl shadow-black/50'
        }`}
        style={isLight ? { backdropFilter: 'blur(16px)' } : {}}
      >
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col min-w-0 overflow-hidden`}>

        {/* Sticky Top Header */}
        <header
          className={`sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 py-3.5 border-b transition-colors duration-300 ${
            isLight
              ? 'bg-white/90 border-slate-200/80 shadow-sm'
              : 'bg-slate-950/80 border-slate-800/60 shadow-lg shadow-black/20'
          }`}
          style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className={`lg:hidden p-2 rounded-xl border transition-colors ${
                isLight ? 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Menu className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 mb-0.5">
                <span>RKS Admin</span>
                <ChevronRight className="w-3 h-3" />
                <span className="text-cyan-500">{currentRouteName}</span>
              </div>
              <h2 className={`text-base font-extrabold tracking-tight leading-none ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {currentRouteName}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                isLight
                  ? 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                  : 'bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700'
              }`}
              title="Toggle Theme"
            >
              {isLight ? <Moon className="w-3.5 h-3.5 text-indigo-500" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
              <span className="hidden sm:inline">{isLight ? 'Dark' : 'Light'}</span>
            </button>

            {/* Live Sync Badge */}
            <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[10px] font-bold ${
              isLight
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            }`}>
              <Activity className="w-3 h-3 animate-pulse" />
              <span>Live</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}