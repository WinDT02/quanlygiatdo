import { BadgePercent, ClipboardList, LayoutDashboard, Shirt, Users, WashingMachine, Home, CalendarPlus } from 'lucide-react';

/** Role -> menu items. Add a page to the menu here, the Navbar renders it. `end` = exact match for NavLink. */
export const NAV_LINKS = {
  GUEST: [
    { to: '/', label: 'Trang chủ', icon: Home, end: true },
    { to: '/booking', label: 'Đặt giặt', icon: CalendarPlus },
  ],
  CUSTOMER: [
    { to: '/', label: 'Trang chủ', icon: Home, end: true },
    { to: '/booking', label: 'Đặt giặt', icon: CalendarPlus },
    { to: '/my-orders', label: 'Đơn của tôi', icon: ClipboardList },
  ],
  EMPLOYEE: [{ to: '/admin/orders', label: 'Đơn hàng', icon: ClipboardList }],
  ADMIN: [
    { to: '/admin/dashboard', label: 'Thống kê', icon: LayoutDashboard },
    { to: '/admin/orders', label: 'Đơn hàng', icon: ClipboardList },
    { to: '/admin/services', label: 'Dịch vụ', icon: WashingMachine },
    { to: '/admin/promotions', label: 'Mã giảm giá', icon: BadgePercent },
    { to: '/admin/employees', label: 'Nhân viên', icon: Users },
  ],
};

/** Where each role lands after logging in. */
export const HOME_BY_ROLE = {
  CUSTOMER: '/',
  EMPLOYEE: '/admin/orders',
  ADMIN: '/admin/dashboard',
};

export const ROLE_LABELS = {
  ADMIN: 'Quản trị viên',
  EMPLOYEE: 'Nhân viên',
  CUSTOMER: 'Khách hàng',
};

export const BRAND_ICON = Shirt;
