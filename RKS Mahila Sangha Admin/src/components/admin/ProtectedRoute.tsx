import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const isAuthenticated = localStorage.getItem('adminAuth');
  const adminToken = localStorage.getItem('adminToken');

  if (!isAuthenticated || !adminToken) {
    // Redirect them to the /admin/login page, but save the current location they were trying to go to
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
