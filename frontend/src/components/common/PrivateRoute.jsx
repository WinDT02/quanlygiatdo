import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { HOME_BY_ROLE } from '../../config/navigation';

function Forbidden({ role }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <ShieldAlert className="h-12 w-12 text-amber-500" />
      <h1 className="mt-4 text-xl font-bold text-gray-900">Bạn không có quyền truy cập trang này</h1>
      <p className="mt-2 text-sm text-gray-500">Tài khoản của bạn không được phép xem nội dung này.</p>
      <Link to={HOME_BY_ROLE[role] ?? '/'} className="mt-6 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
        Về trang chính
      </Link>
    </div>
  );
}

/**
 * Guards a group of routes:
 *   <Route element={<PrivateRoute />}>                           any logged-in user
 *   <Route element={<PrivateRoute roles={['ADMIN']} />}>         ADMIN only
 *   <Route element={<PrivateRoute roles={['ADMIN','EMPLOYEE']} />}>
 * Not logged in -> /login (remembering the page, so the login form can send the user back, e.g. /payment/result).
 */
export default function PrivateRoute({ roles }) {
  const { isAuthenticated, loading, role } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (roles && !roles.includes(role)) {
    return <Forbidden role={role} />;
  }
  return <Outlet />;
}
