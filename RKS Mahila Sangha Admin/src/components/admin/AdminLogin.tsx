import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, User, UserPlus, KeyRound, ArrowLeft, Eye, EyeOff, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { adminApi } from '../../services/api';
import logo from '../../assets/RKMS-Logo.png';

type Mode = 'login' | 'register' | 'forgot';

export function AdminLogin() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('login');
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [resetData, setResetData] = useState({
    username: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await adminApi.login(credentials);
      
      if (response.success && response.token) {
        localStorage.setItem('adminToken', response.token);
        localStorage.setItem('adminAuth', 'true');
        localStorage.setItem('adminUsername', credentials.username || 'Admin');
        toast.success('Welcome back, Admin!');
        navigate('/admin/dashboard');
      } else {
        toast.error(response.message || 'Invalid credentials');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credentials.username || !credentials.password) {
      toast.error('Please enter username and password');
      return;
    }

    setIsLoading(true);

    try {
      const response = await adminApi.register(credentials);
      
      if (response.success) {
        toast.success('Admin account created! Logging in...');
        const loginRes = await adminApi.login(credentials);
        if (loginRes.success && loginRes.token) {
          localStorage.setItem('adminToken', loginRes.token);
          localStorage.setItem('adminAuth', 'true');
          localStorage.setItem('adminUsername', credentials.username);
          navigate('/admin/dashboard');
        } else {
          setMode('login');
        }
      } else {
        toast.error(response.message || 'Failed to create admin account');
      }
    } catch (error) {
      console.error('Register error:', error);
      toast.error('Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetData.username || !resetData.newPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (resetData.newPassword !== resetData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const response = await adminApi.resetPassword({
        username: resetData.username,
        newPassword: resetData.newPassword
      });
      
      if (response.success) {
        toast.success('Password updated successfully! You can now sign in.');
        setCredentials({ username: resetData.username, password: resetData.newPassword });
        setMode('login');
      } else {
        toast.error(response.message || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Reset error:', error);
      toast.error('Password reset failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-cyan-500 selection:text-white">
      
      {/* Background Gradient Glow Spheres */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full relative z-10 space-y-6">
        
        {/* Card Container */}
        <div className="bg-slate-950/80 backdrop-blur-xl border border-slate-800 shadow-2xl rounded-3xl p-8 space-y-6">
          
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-tr from-cyan-600 to-cyan-400 p-0.5 shadow-xl shadow-cyan-500/20">
              <img src={logo} alt="RKS Logo" className="w-full h-full object-cover rounded-[14px] bg-slate-950" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">RKS Admin Portal</h1>
              <p className="text-xs text-slate-400 mt-1">Raju Kshatriya Mahila Sangha</p>
            </div>
          </div>

          {/* LOGIN MODE */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">Admin Username</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={credentials.username}
                    onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-cyan-500"
                    placeholder="Enter admin username"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block font-semibold text-slate-300">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetData({ ...resetData, username: credentials.username });
                      setMode('forgot');
                    }}
                    className="text-[11px] text-cyan-400 hover:underline font-semibold"
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={credentials.password}
                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl pl-10 pr-10 py-2.5 focus:outline-none focus:border-cyan-500"
                    placeholder="Enter password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white py-3 rounded-xl font-bold text-xs shadow-lg shadow-cyan-950 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                {isLoading ? 'Signing In...' : 'Sign In to Dashboard'}
              </button>

              <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-[11px] text-slate-400">
                <span className="text-slate-400 font-medium">Protected Admin Portal</span>
                <div className="inline-flex items-center gap-1 text-[10px] bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800 text-slate-400">
                  <Sparkles className="w-3 h-3 text-amber-400" /> Default: admin / admin123
                </div>
              </div>
            </form>
          )}

          {/* REGISTER MODE */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4 text-xs">
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="p-1 hover:bg-slate-900 rounded-lg text-slate-400"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h2 className="text-base font-bold text-white">Create New Admin</h2>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">New Admin Username</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={credentials.username}
                    onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-cyan-500"
                    placeholder="e.g. admin_raj"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    value={credentials.password}
                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-cyan-500"
                    placeholder="Create a strong password"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white py-3 rounded-xl font-bold text-xs shadow-lg shadow-cyan-950 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                {isLoading ? 'Creating Admin...' : 'Register & Save Admin'}
              </button>

              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full text-slate-400 hover:text-white py-1 text-center block text-[11px]"
              >
                Back to Sign In
              </button>
            </form>
          )}

          {/* FORGOT / RESET PASSWORD MODE */}
          {mode === 'forgot' && (
            <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="p-1 hover:bg-slate-900 rounded-lg text-slate-400"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h2 className="text-base font-bold text-white">Reset Password</h2>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">Admin Username</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={resetData.username}
                    onChange={(e) => setResetData({ ...resetData, username: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-cyan-500"
                    placeholder="Enter admin username"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">New Password</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    value={resetData.newPassword}
                    onChange={(e) => setResetData({ ...resetData, newPassword: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-cyan-500"
                    placeholder="Enter new password"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">Confirm Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    value={resetData.confirmPassword}
                    onChange={(e) => setResetData({ ...resetData, confirmPassword: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-cyan-500"
                    placeholder="Confirm new password"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white py-3 rounded-xl font-bold text-xs shadow-lg shadow-cyan-950 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <KeyRound className="w-4 h-4" />
                {isLoading ? 'Updating Password...' : 'Reset Password & Save'}
              </button>

              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full text-slate-400 hover:text-white py-1 text-center block text-[11px]"
              >
                Back to Sign In
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}