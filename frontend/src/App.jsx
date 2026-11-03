import { Route, Routes } from 'react-router-dom';
import GuestRoute from './components/common/GuestRoute';
import MainLayout from './components/common/MainLayout';
import PrivateRoute from './components/common/PrivateRoute';
import AdminDashboard from './pages/AdminDashboard';
import BookingPage from './pages/BookingPage';
import CustomerOrders from './pages/CustomerOrders';
import EmployeeManagement from './pages/EmployeeManagement';
import ForgotPassword from './pages/ForgotPassword';
import HomePage from './pages/HomePage';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import OrderManagement from './pages/OrderManagement';
import PaymentResult from './pages/PaymentResult';
import ProfilePage from './pages/ProfilePage';
import PromotionManagement from './pages/PromotionManagement';
import Register from './pages/Register';
import ServiceManagement from './pages/ServiceManagement';

/**
 * Route map. Roles match the backend:
 *   CUSTOMER        -> booking, own orders
 *   ADMIN, EMPLOYEE -> order management
 *   ADMIN           -> dashboard, services, employees
 */
export default function App() {
  return (
    <Routes>
      {/* auth pages: full-screen, no Navbar/Footer. GuestRoute bounces logged-in users away (and handles the
          redirect right after login / OTP verification / Google sign-in) */}
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
      </Route>

      <Route element={<MainLayout />}>
        {/* public */}
        <Route index element={<HomePage />} />

        {/* any logged-in user (VNPay sends the browser back here) */}
        <Route element={<PrivateRoute />}>
          <Route path="payment/result" element={<PaymentResult />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* customer */}
        <Route element={<PrivateRoute roles={['CUSTOMER']} />}>
          <Route path="booking" element={<BookingPage />} />
          <Route path="my-orders" element={<CustomerOrders />} />
        </Route>

        {/* staff */}
        <Route element={<PrivateRoute roles={['ADMIN', 'EMPLOYEE']} />}>
          <Route path="admin/orders" element={<OrderManagement />} />
        </Route>
        <Route element={<PrivateRoute roles={['ADMIN']} />}>
          <Route path="admin/dashboard" element={<AdminDashboard />} />
          <Route path="admin/services" element={<ServiceManagement />} />
          <Route path="admin/promotions" element={<PromotionManagement />} />
          <Route path="admin/employees" element={<EmployeeManagement />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
