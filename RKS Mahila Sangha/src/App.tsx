import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { ScrollToTop } from './components/ScrollToTop';
import { LandingPage } from './components/LandingPage';
import { AboutUs } from './components/AboutUs';
import { Services } from './components/Services';
import { Events } from './components/Events';
import { Membership } from './components/Membership';
import { Donate } from './components/Donate';
import { MemberDashboard } from './components/MemberDashboard';
import { VerifyMember } from './components/VerifyMember';
import { ErrorBoundary } from './components/common/ErrorBoundary';

export default function App() {
  const [user, setUser] = useState<{ name: string; email: string; phone?: string } | null>(null);

  const checkUserSession = () => {
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
        // ignore parse error
      }
    }

    if (storedToken) {
      const storedEmail = localStorage.getItem('userEmail') || '';
      setUser({ name: 'Active Member', email: storedEmail });
      return;
    }

    setUser(null);
  };

  useEffect(() => {
    checkUserSession();
    const interval = setInterval(checkUserSession, 300);
    window.addEventListener('user_auth_change', checkUserSession);
    window.addEventListener('storage', checkUserSession);
    window.addEventListener('focus', checkUserSession);
    return () => {
      clearInterval(interval);
      window.removeEventListener('user_auth_change', checkUserSession);
      window.removeEventListener('storage', checkUserSession);
      window.removeEventListener('focus', checkUserSession);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    setUser(null);
    window.dispatchEvent(new Event('user_auth_change'));
  };

  return (
    <ErrorBoundary>
      <Router>
        <Toaster position="top-right" richColors />
        <ScrollToTop />
        <div className="min-h-screen flex flex-col bg-gray-50">
          <Header />
          <main className="flex-1">
            {user ? (
              /* Logged-In Member Portal with explicit Route URL Sync */
              <Routes>
                <Route path="/dashboard" element={<MemberDashboard user={user} onLogout={handleLogout} />} />
                <Route path="/membership" element={<MemberDashboard user={user} onLogout={handleLogout} />} />
                <Route path="/donate" element={<MemberDashboard user={user} onLogout={handleLogout} />} />
                <Route path="/events" element={<MemberDashboard user={user} onLogout={handleLogout} />} />
                <Route path="/settings" element={<MemberDashboard user={user} onLogout={handleLogout} />} />
                <Route path="*" element={<MemberDashboard user={user} onLogout={handleLogout} />} />
              </Routes>
            ) : (
              /* Public Marketing Site */
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/about" element={<AboutUs />} />
                <Route path="/services" element={<Services />} />
                <Route path="/events" element={<Events />} />
                <Route path="/verify-member" element={<VerifyMember />} />
                <Route path="/membership" element={<Membership />} />
                <Route path="/donate" element={<Donate />} />
                <Route path="*" element={<LandingPage />} />
              </Routes>
            )}
          </main>
          {!user && <Footer />}
        </div>
      </Router>
    </ErrorBoundary>
  );
}