import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, User, KeyRound, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { adminApi } from '../../services/api';
import logo from '../../assets/RKMS-Logo.png';

type Mode = 'login' | 'forgot';

export function AdminLogin() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('login');
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [resetData, setResetData] = useState({ username: '', newPassword: '', confirmPassword: '' });
  const [resetOtp, setResetOtp] = useState('');
  const [forgotStep, setForgotStep] = useState<'username' | 'reset'>('username');
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
    } catch {
      toast.error('Login failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetData.username || !resetData.username.trim()) {
      toast.error('Please enter your admin username or email');
      return;
    }
    setIsLoading(true);
    try {
      const response = await adminApi.forgotPassword(resetData.username.trim());
      if (response.success) {
        toast.success(response.message || 'A 6-digit OTP has been sent to your admin email.');
        setForgotStep('reset');
      } else {
        toast.error(response.message || 'Failed to send OTP code');
      }
    } catch {
      toast.error('Failed to request OTP code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPasswordWithOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetOtp || resetOtp.trim().length !== 6) {
      toast.error('Please enter the 6-digit OTP code');
      return;
    }
    if (!resetData.newPassword || resetData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    if (resetData.newPassword !== resetData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const response = await adminApi.resetPasswordOtp({
        username: resetData.username.trim(),
        otp: resetOtp.trim(),
        newPassword: resetData.newPassword
      });

      if (response.success) {
        toast.success('Admin password updated successfully! Please sign in.');
        setCredentials({ username: resetData.username, password: resetData.newPassword });
        setMode('login');
        setForgotStep('username');
        setResetOtp('');
      } else {
        toast.error(response.message || 'Failed to reset admin password');
      }
    } catch {
      toast.error('Password reset failed');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full bg-slate-900/80 border border-slate-700 text-white rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder:text-slate-600";

  return (
    <div
      className="min-h-screen bg-[#060b14] text-slate-100 flex items-center justify-center p-4 relative overflow-hidden"
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-cyan-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-blue-700/8 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-0 w-64 h-64 bg-violet-600/6 rounded-full blur-3xl" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      <div className="max-w-md w-full relative z-10">

        {/* Top brand label */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-700/80 rounded-full px-4 py-2 text-[11px] font-bold text-slate-400 backdrop-blur-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            Secure Admin Portal · RKS Mahila Sangha
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-slate-900/60 backdrop-blur-2xl border border-slate-700/60 shadow-2xl shadow-black/60 rounded-3xl p-8 space-y-7">

          {/* Header */}
          <div className="text-center space-y-4">
            <div className="relative inline-block">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-cyan-600 to-cyan-400 p-0.5 shadow-2xl shadow-cyan-500/30 mx-auto">
                <img src={logo} alt="RKS Logo" className="w-full h-full object-cover rounded-[14px] bg-slate-950" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">Admin Portal</h1>
              <p className="text-xs text-slate-500 mt-1 font-medium">Raju Kshatriya Mahila Sangha</p>
            </div>
          </div>

          {/* ── LOGIN MODE ── */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">Admin Username</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-600 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={credentials.username}
                    onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                    className={inputClass}
                    placeholder="Enter admin username"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-semibold text-slate-400">Password</label>
                  <button
                    type="button"
                    onClick={() => { setResetData({ ...resetData, username: credentials.username }); setForgotStep('username'); setMode('forgot'); }}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-600 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={credentials.password}
                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                    className={`${inputClass} pr-10`}
                    placeholder="Enter password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-600 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white py-3.5 rounded-xl font-bold text-sm shadow-xl shadow-cyan-900/40 transition-all hover:scale-[1.02] flex items-center justify-center gap-2 disabled:opacity-60 disabled:scale-100 mt-2"
              >
                <ShieldCheck className="w-4 h-4" />
                {isLoading ? 'Signing In...' : 'Sign In to Dashboard'}
              </button>

            </form>
          )}

          {/* ── FORGOT MODE ── */}
          {mode === 'forgot' && (
            forgotStep === 'username' ? (
              <form onSubmit={handleRequestForgotOtp} className="space-y-4">
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setMode('login')} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <h2 className="text-base font-extrabold text-white">Reset Password</h2>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2">Admin Username or Email</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-600 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      value={resetData.username}
                      onChange={(e) => setResetData({ ...resetData, username: e.target.value })}
                      className={inputClass}
                      placeholder="Enter admin username or email"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white py-3.5 rounded-xl font-bold text-sm shadow-xl shadow-cyan-900/40 transition-all hover:scale-[1.02] flex items-center justify-center gap-2 disabled:opacity-60 disabled:scale-100 mt-2"
                >
                  <KeyRound className="w-4 h-4" />
                  {isLoading ? 'Sending Code...' : 'Send Verification Code'}
                </button>
                <button type="button" onClick={() => setMode('login')} className="w-full text-slate-500 hover:text-slate-300 py-1 text-center text-xs transition-colors">
                  Back to Sign In
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPasswordWithOtp} className="space-y-4">
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setForgotStep('username')} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <h2 className="text-base font-extrabold text-white">Enter Verification OTP</h2>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2 text-center">6-Digit OTP Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-slate-900/80 border border-slate-700 text-cyan-400 text-center font-mono text-xl tracking-[8px] font-bold rounded-xl py-3 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50"
                    placeholder="123456"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2">New Admin Password</label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-600 absolute left-3.5 top-3.5" />
                    <input
                      type="password"
                      value={resetData.newPassword}
                      onChange={(e) => setResetData({ ...resetData, newPassword: e.target.value })}
                      className={inputClass}
                      placeholder="At least 6 characters"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2">Confirm New Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-600 absolute left-3.5 top-3.5" />
                    <input
                      type="password"
                      value={resetData.confirmPassword}
                      onChange={(e) => setResetData({ ...resetData, confirmPassword: e.target.value })}
                      className={inputClass}
                      placeholder="Re-enter new password"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white py-3.5 rounded-xl font-bold text-sm shadow-xl shadow-cyan-900/40 transition-all hover:scale-[1.02] flex items-center justify-center gap-2 disabled:opacity-60 disabled:scale-100 mt-2"
                >
                  <KeyRound className="w-4 h-4" />
                  {isLoading ? 'Updating...' : 'Reset Admin Password'}
                </button>
                <button type="button" onClick={() => setForgotStep('username')} className="w-full text-slate-500 hover:text-slate-300 py-1 text-center text-xs transition-colors">
                  Change Username / Email
                </button>
              </form>
            )
          )}


        </div>
      </div>
    </div>
  );
}