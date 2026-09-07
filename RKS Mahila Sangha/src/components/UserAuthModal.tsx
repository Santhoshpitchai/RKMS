import { useState, useEffect } from 'react';
import { X, Mail, Lock, User, Phone, ShieldCheck, UserPlus, LogIn, KeyRound, RefreshCw, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { userApi } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

interface UserAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: { name: string; email: string; phone?: string }) => void;
  title?: string;
}

export function UserAuthModal({ isOpen, onClose, onSuccess, title }: UserAuthModalProps) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('register');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [targetEmail, setTargetEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);

  // Forgot password state
  const [forgotStep, setForgotStep] = useState<'email' | 'reset'>('email');
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    let interval: any;
    if (isVerifyingOtp && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isVerifyingOtp, resendTimer]);

  const resetFields = () => {
    setFormData({ name: '', email: '', phone: '', password: '' });
    setOtpCode('');
    setTargetEmail('');
    setIsVerifyingOtp(false);
    setForgotStep('email');
    setForgotEmail('');
    setResetOtp('');
    setNewPassword('');
    setConfirmPassword('');
  };

  useEffect(() => {
    if (isOpen) {
      resetFields();
    }
  }, [isOpen]);

  const handleCloseModal = () => {
    resetFields();
    onClose();
  };

  const handleModeChange = (newMode: 'login' | 'register' | 'forgot') => {
    setMode(newMode);
    resetFields();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email || !emailRegex.test(formData.email.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (!formData.password || formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'register') {
        if (!formData.name || formData.name.trim().length < 2) {
          toast.error('Please enter your full name');
          setIsLoading(false);
          return;
        }

        if (formData.phone && !/^[6-9]\d{9}$/.test(formData.phone.trim())) {
          toast.error('Phone number must be a valid 10-digit Indian mobile number');
          setIsLoading(false);
          return;
        }

        const response = await userApi.register({
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          password: formData.password,
        });

        if (response.success && response.requiresVerification) {
          setTargetEmail(response.email || formData.email);
          setIsVerifyingOtp(true);
          setResendTimer(60);
          toast.success(response.message || 'Verification code sent to your email!');
        } else if (response.success && response.token && response.user) {
          localStorage.setItem('userToken', response.token);
          localStorage.setItem('userData', JSON.stringify(response.user));
          window.dispatchEvent(new Event('user_auth_change'));
          toast.success('Account created successfully!');
          onSuccess(response.user);
          resetFields();
          onClose();
        } else {
          const msg = response.message || 'Registration failed';
          toast.error(msg);
          if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already exists')) {
            setMode('login');
          }
        }
      } else {
        const response = await userApi.login({ 
          email: formData.email.trim(), 
          password: formData.password 
        });

        if (response.requiresVerification) {
          setTargetEmail(response.email || formData.email);
          setIsVerifyingOtp(true);
          setResendTimer(60);
          toast.info(response.message || 'Please enter the verification code sent to your email');
        } else if (response.success && response.token && response.user) {
          localStorage.setItem('userToken', response.token);
          localStorage.setItem('userData', JSON.stringify(response.user));
          window.dispatchEvent(new Event('user_auth_change'));
          toast.success('Signed in successfully!');
          onSuccess(response.user);
          resetFields();
          onClose();
        } else {
          toast.error(response.message || 'Invalid email or password');
        }
      }
    } catch (error) {
      console.error('User auth error:', error);
      toast.error('Authentication error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!forgotEmail || !emailRegex.test(forgotEmail.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      const response = await userApi.forgotPassword({ email: forgotEmail.trim() });
      if (response.success) {
        toast.success(response.message || 'Verification code sent to your email!');
        setForgotStep('reset');
      } else {
        toast.error(response.message || 'Failed to send OTP');
      }
    } catch (err) {
      toast.error('Error requesting password reset OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetOtp || resetOtp.trim().length !== 6) {
      toast.error('Please enter the 6-digit OTP code');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const response = await userApi.resetPassword({
        email: forgotEmail.trim(),
        otp: resetOtp.trim(),
        newPassword
      });

      if (response.success) {
        toast.success('Password reset successfully! Please sign in with your new password.');
        setMode('login');
        setFormData((prev) => ({ ...prev, email: forgotEmail.trim() }));
      } else {
        toast.error(response.message || 'Failed to reset password');
      }
    } catch (err) {
      toast.error('Error resetting password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length !== 6) {
      toast.error('Please enter the full 6-digit verification code');
      return;
    }

    setIsLoading(true);
    try {
      const response = await userApi.verifyOtp({ email: targetEmail, otp: otpCode.trim() });
      if (response.success && response.token && response.user) {
        localStorage.setItem('userToken', response.token);
        localStorage.setItem('userData', JSON.stringify(response.user));
        window.dispatchEvent(new Event('user_auth_change'));
        toast.success('Email verified successfully! You are now logged in.');
        onSuccess(response.user);
        resetFields();
        onClose();
      } else {
        toast.error(response.message || 'Invalid verification code');
      }
    } catch (error) {
      toast.error('OTP verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setIsLoading(true);
    try {
      const response = await userApi.resendOtp({ email: targetEmail });
      if (response.success) {
        toast.success(response.message || 'A new 6-digit code has been sent.');
        setResendTimer(60);
      } else {
        toast.error(response.message || 'Failed to resend code');
      }
    } catch (err) {
      toast.error('Error resending OTP');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleCloseModal();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 cursor-default max-h-[92vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0A6C87] to-cyan-600 p-6 text-white relative">
          <button
            type="button"
            onClick={handleCloseModal}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors z-10 cursor-pointer"
            title="Close / ಮುಚ್ಚಿ"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {isVerifyingOtp 
                  ? 'Verify Email Address' 
                  : mode === 'forgot'
                  ? 'Reset Your Password'
                  : title || 'Account Required'}
              </h2>
              <p className="text-cyan-100 text-xs">
                {isVerifyingOtp 
                  ? `Enter code sent to ${targetEmail}` 
                  : mode === 'forgot'
                  ? 'Follow the steps to recover your account'
                  : 'Please sign in or create an account to proceed'}
              </p>
            </div>
          </div>

          {/* Mode Tabs (Only when not in OTP mode or Forgot mode) */}
          {!isVerifyingOtp && mode !== 'forgot' && (
            <div className="flex bg-black/20 p-1 rounded-xl mt-4">
              <button
                type="button"
                onClick={() => handleModeChange('register')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  mode === 'register' ? 'bg-white text-[#0A6C87] shadow' : 'text-cyan-100 hover:text-white'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                {t('auth.signupTitle')}
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('login')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  mode === 'login' ? 'bg-white text-[#0A6C87] shadow' : 'text-cyan-100 hover:text-white'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                {t('auth.loginTitle')}
              </button>
            </div>
          )}
        </div>

        {/* FORGOT PASSWORD MODE */}
        {mode === 'forgot' ? (
          forgotStep === 'email' ? (
            <form onSubmit={handleRequestForgotOtp} className="p-6 space-y-4">
              <div className="text-center space-y-1 mb-2">
                <h3 className="text-base font-bold text-gray-900">Forgot Your Password?</h3>
                <p className="text-xs text-gray-600">Enter your registered email address to receive a 6-digit verification code.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email Address *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-gray-900"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#E5C100] text-[#0A6C87] py-3 rounded-lg font-bold text-sm hover:bg-[#CCA900] transition-colors shadow-md disabled:opacity-50 mt-2"
              >
                {isLoading ? 'Sending Code...' : 'Send Verification OTP'}
              </button>

              <button
                type="button"
                onClick={() => handleModeChange('login')}
                className="w-full text-center text-xs text-gray-500 hover:text-gray-800 transition-colors pt-2 block"
              >
                Back to Sign In
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPasswordSubmit} className="p-6 space-y-4">
              <div className="text-center space-y-1 mb-2">
                <h3 className="text-base font-bold text-gray-900">Reset Your Password</h3>
                <p className="text-xs text-gray-600">Enter the 6-digit code sent to <strong>{forgotEmail}</strong> and your new password.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 text-center">6-Digit Verification Code *</label>
                <input
                  type="text"
                  maxLength={6}
                  value={resetOtp}
                  onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full text-center text-xl font-mono tracking-[8px] font-bold py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-gray-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">New Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-gray-900"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Confirm New Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-gray-900"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#E5C100] text-[#0A6C87] py-3 rounded-lg font-bold text-sm hover:bg-[#CCA900] transition-colors shadow-md disabled:opacity-50 mt-2"
              >
                {isLoading ? 'Resetting Password...' : 'Reset Password & Sign In'}
              </button>

              <button
                type="button"
                onClick={() => setForgotStep('email')}
                className="w-full text-center text-xs text-gray-500 hover:text-gray-800 transition-colors pt-1 block"
              >
                Change Email
              </button>
            </form>
          )
        ) : isVerifyingOtp ? (
          <form onSubmit={handleVerifyOtp} className="p-6 space-y-5">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-cyan-50 text-[#0A6C87] rounded-full flex items-center justify-center mx-auto">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-gray-900">Check Your Email Inbox</h3>
              <p className="text-xs text-gray-600">
                We sent a 6-digit security OTP to <strong className="text-gray-900">{targetEmail}</strong>.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 text-center">Enter 6-Digit Code</label>
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full text-center text-2xl font-mono tracking-[12px] font-extrabold py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-gray-900"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || otpCode.length !== 6}
              className="w-full bg-[#E5C100] text-[#0A6C87] py-3.5 rounded-xl font-bold text-sm hover:bg-[#CCA900] transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isLoading ? 'Verifying Code...' : 'Verify Code & Activate Account'}
            </button>

            <div className="pt-2 flex justify-between items-center text-xs text-gray-500 border-t">
              <button
                type="button"
                onClick={() => setIsVerifyingOtp(false)}
                className="hover:underline text-gray-600 font-medium"
              >
                Change Email / Back
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendTimer > 0 || isLoading}
                className="text-[#0A6C87] font-semibold hover:underline flex items-center gap-1 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend Code'}
              </button>
            </div>
          </form>
        ) : (
          /* REGISTRATION / LOGIN MODE */
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter your full name"
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-gray-900"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email Address *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your.email@example.com"
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-gray-900"
                  required
                />
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number (Optional)</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-gray-900"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Password *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter password"
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-gray-900"
                  required
                />
              </div>
              {mode === 'login' && (
                <div className="flex justify-end mt-1.5">
                  <button
                    type="button"
                    onClick={() => handleModeChange('forgot')}
                    className="text-xs text-[#0A6C87] hover:underline font-semibold"
                  >
                    Forgot password?
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#E5C100] text-[#0A6C87] py-3 rounded-lg font-bold text-sm hover:bg-[#CCA900] transition-colors shadow-md disabled:opacity-50 mt-2"
            >
              {isLoading
                ? 'Processing...'
                : mode === 'register'
                ? 'Create Account & Send OTP'
                : 'Sign In to Proceed'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

