import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AdminLogin } from './components/admin/AdminLogin';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { EventManagement } from './components/admin/EventManagement';
import { MemberManagement } from './components/admin/MemberManagement';
import { PaymentManagement } from './components/admin/PaymentManagement';
import { SettingsManagement } from './components/admin/SettingsManagement';
import { AuditLogs } from './components/admin/AuditLogs';
import { PageImagesManager } from './components/admin/PageImagesManager';
import { ProtectedRoute } from './components/admin/ProtectedRoute';
import { ThemeProvider } from './context/ThemeContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <Router>
          <Toaster position="top-right" richColors />
          <Routes>
            {/* Redirect root to admin login */}
            <Route path="/" element={<Navigate to="/admin/login" replace />} />
            
            {/* Public Admin Route */}
            <Route path="/admin/login" element={<AdminLogin />} />

            {/* Protected Admin Routes */}
            <Route path="/admin/dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/events" element={<ProtectedRoute><EventManagement /></ProtectedRoute>} />
            <Route path="/admin/members" element={<ProtectedRoute><MemberManagement /></ProtectedRoute>} />
            <Route path="/admin/payments" element={<ProtectedRoute><PaymentManagement /></ProtectedRoute>} />
            <Route path="/admin/page-images" element={<ProtectedRoute><PageImagesManager /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute><SettingsManagement /></ProtectedRoute>} />
            <Route path="/admin/audit-logs" element={<ProtectedRoute><AuditLogs /></ProtectedRoute>} />

            {/* Catch all - redirect to admin login */}
            <Route path="*" element={<Navigate to="/admin/login" replace />} />
          </Routes>
        </Router>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
