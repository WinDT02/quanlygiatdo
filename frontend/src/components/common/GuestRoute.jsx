import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { HOME_BY_ROLE } from '../../config/navigation';

/**
 * For pages only logged-out visitors should see (login, register, forgot password).
 * Once the user is authenticated - already, or just now after login / OTP verification / Google sign-in - it sends
 * him to the page he originally wanted (state.from, set by PrivateRoute), else to the home page of his role.
 * That is why the auth pages only call loginSuccess() and never navigate by themselves.
 */
export default function GuestRoute() {
  const { isAuthenticated, loading, role } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }
  if (isAuthenticated) {
    const from = location.state?.from;
    const target = from ? `${from.pathname}${from.search ?? ''}${from.hash ?? ''}` : (HOME_BY_ROLE[role] ?? '/');
    return <Navigate to={target} replace />;
  }
  return <Outlet />;
}
