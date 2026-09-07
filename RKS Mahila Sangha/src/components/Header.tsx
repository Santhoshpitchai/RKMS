import { Link, useLocation } from 'react-router-dom';
import { Menu, X, User, LogOut, LayoutDashboard, Languages } from 'lucide-react';
import { useState, useEffect } from 'react';
import logo from '../assets/RKMS Logo.png';
import { UserAuthModal } from './UserAuthModal';
import { useLanguage } from '../context/LanguageContext';

export function Header() {
  const location = useLocation();
  const { lang, setLang, t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  const checkUser = () => {
    const storedUser = localStorage.getItem('userData');
    const storedToken = localStorage.getItem('userToken');

    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed && (parsed.name || parsed.email)) {
          setUser(parsed);
          return;
        }
      } catch (e) {
        // ignore
      }
    }

    if (storedToken) {
      setUser({ name: 'Active Member', email: '' });
      return;
    }

    setUser(null);
  };

  useEffect(() => {
    checkUser();
    const interval = setInterval(checkUser, 300);
    window.addEventListener('user_auth_change', checkUser);
    window.addEventListener('storage', checkUser);
    window.addEventListener('focus', checkUser);
    return () => {
      clearInterval(interval);
      window.removeEventListener('user_auth_change', checkUser);
      window.removeEventListener('storage', checkUser);
      window.removeEventListener('focus', checkUser);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    setUser(null);
    window.dispatchEvent(new Event('user_auth_change'));
  };

  const navLinks = [
    { path: '/', label: t('nav.home') },
    { path: '/about', label: t('nav.about') },
    { path: '/services', label: t('nav.services') },
    { path: '/events', label: t('nav.events') },
    { path: '/membership', label: t('nav.membership') },
    { path: '/donate', label: t('nav.donate') },
  ];

  const isActive = (path: string) => location.pathname === path;

  const triggerGoogleTranslate = (targetLang: 'kn' | 'en') => {
    setLang(targetLang);
    const cookieVal = targetLang === 'kn' ? '/en/kn' : '/en/en';
    document.cookie = `googtrans=${cookieVal}; path=/; domain=${window.location.hostname}`;
    document.cookie = `googtrans=${cookieVal}; path=/;`;

    const selectElem = document.querySelector('#google_translate_element select') as HTMLSelectElement;
    if (selectElem) {
      selectElem.value = targetLang;
      selectElem.dispatchEvent(new Event('change'));
    } else {
      window.location.reload();
    }
  };

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-3">
          {/* Logo and Title */}
          <Link to="/" className="flex items-center gap-2 sm:gap-3 min-w-0 max-w-[calc(100%-48px)] lg:max-w-none">
            <img src={logo} alt="RKS Logo" className="w-12 h-12 sm:w-20 sm:h-20 object-contain flex-shrink-0" />
            <div className="notranslate leading-tight min-w-0 flex-1 overflow-hidden">
              <h3 className="text-[10px] xs:text-xs sm:text-base md:text-2xl font-extrabold text-[#0A6C87] tracking-tight truncate">ರಾಜು ಕ್ಷತ್ರಿಯ ಮಹಿಳಾ ಸಂಘ</h3>
              <h3 className="text-[10px] xs:text-xs sm:text-base md:text-2xl font-extrabold text-[#0A6C87] tracking-tight truncate">Raju Kshatriya Mahila Sangha</h3>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-3 xl:gap-5 flex-wrap">
            {/* Show public links ONLY when user is logged out */}
            {!user && navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`transition-colors text-xs xl:text-sm font-semibold whitespace-nowrap ${
                  isActive(link.path)
                    ? 'text-cyan-600 font-bold'
                    : 'text-gray-700 hover:text-[#0A6C87]'
                }`}
              >
                {link.label}
              </Link>
            ))}

            {/* Language Switcher Toggle */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => triggerGoogleTranslate(lang === 'en' ? 'kn' : 'en')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#0A6C87]/30 bg-cyan-50 text-[#0A6C87] text-xs font-extrabold hover:bg-cyan-100 transition-colors shadow-sm whitespace-nowrap"
                title="Switch Language / ಭಾಷೆಯನ್ನು ಬದಲಾಯಿಸಿ"
              >
                <Languages className="w-4 h-4 text-[#0A6C87] flex-shrink-0" />
                <span>{lang === 'en' ? 'ಕನ್ನಡ' : 'English'}</span>
              </button>
              {lang === 'kn' && (
                <span className="notranslate flex items-center gap-1 text-[9px] font-semibold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-1 rounded-full whitespace-nowrap">
                  <img src="https://www.google.com/favicon.ico" alt="G" className="w-3 h-3" />
                  Translated by Google
                </span>
              )}
            </div>

            {/* User Account / Auth Button */}
            {user ? (
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 bg-cyan-50 text-[#0A6C87] px-3 py-1.5 rounded-full border border-cyan-200 whitespace-nowrap">
                  <LayoutDashboard className="w-4 h-4 text-cyan-600 flex-shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider">Member Portal</span>
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold text-gray-800 whitespace-nowrap">
                  <div className="w-8 h-8 rounded-full bg-[#0A6C87] text-white flex items-center justify-center text-xs font-bold shadow-sm flex-shrink-0">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="font-bold text-[#0A6C87]">{user.name}</span>
                </div>

                <button
                  onClick={handleLogout}
                  title="Sign Out / Logout"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200 whitespace-nowrap flex-shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="bg-[#E5C100] text-[#0A6C87] px-4 py-2 rounded-lg font-semibold text-sm hover:bg-[#CCA900] transition-colors flex items-center gap-2 shadow-sm"
              >
                <User className="w-4 h-4" />
                Login / Signup
              </button>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="lg:hidden py-4 border-t space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`block py-2 px-4 rounded-lg transition-colors ${
                  isActive(link.path)
                    ? 'bg-cyan-50 text-cyan-600 font-semibold'
                    : 'text-gray-700 hover:text-[#0A6C87] hover:bg-cyan-50'
                }`}
              >
                {link.label}
              </Link>
            ))}

            <div className="px-4 pt-4 border-t border-gray-100 mt-2">
              {user ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#0A6C87]">{user.name}</span>
                    <span className="text-xs bg-cyan-100 text-[#0A6C87] px-2 py-0.5 rounded font-bold">MEMBER</span>
                  </div>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full bg-red-50 text-red-600 py-2 rounded-lg font-bold text-xs hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out / Logout
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setAuthModalOpen(true);
                  }}
                  className="w-full bg-[#E5C100] text-[#0A6C87] py-2.5 rounded-lg font-semibold text-sm hover:bg-[#CCA900] transition-colors flex items-center justify-center gap-2"
                >
                  <User className="w-4 h-4" />
                  Login / Signup
                </button>
              )}
            </div>
          </nav>
        )}
      </div>

      <UserAuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(u) => setUser(u)}
        title="Sign In / Register"
      />
    </header>
  );
}