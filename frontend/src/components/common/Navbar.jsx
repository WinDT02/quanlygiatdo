import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, LogIn, LogOut, Menu, User, UserPlus, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { BRAND_ICON, NAV_LINKS, ROLE_LABELS } from '../../config/navigation';

const ROLE_BADGE = {
  ADMIN: 'bg-purple-100 text-purple-700',
  EMPLOYEE: 'bg-amber-100 text-amber-700',
  CUSTOMER: 'bg-blue-100 text-blue-700',
};

const linkClass = ({ isActive }) =>
  `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
  }`;

export default function Navbar() {
  const { user, role, isAuthenticated, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const location = useLocation();
  const Brand = BRAND_ICON;

  const links = NAV_LINKS[isAuthenticated ? role : 'GUEST'] ?? NAV_LINKS.GUEST;

  // close menus after navigating
  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  // close the user menu when clicking outside
  useEffect(() => {
    const onClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2 text-blue-600">
          <Brand className="h-7 w-7" />
          <span className="text-lg font-bold">Tiệm giặt sấy</span>
        </Link>

        {/* desktop menu */}
        <nav className="hidden items-center gap-1 md:flex">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={linkClass}>
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {isAuthenticated ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                  {user.fullName?.trim().charAt(0).toUpperCase() || '?'}
                </span>
                <span className="max-w-[10rem] truncate text-sm font-medium text-gray-800">{user.fullName}</span>
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </button>
              {menuOpen && (
                <div role="menu" className="absolute right-0 mt-2 w-60 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
                  <div className="border-b border-gray-100 px-3 pb-2 pt-1">
                    <p className="truncate text-sm font-semibold text-gray-900">{user.fullName}</p>
                    <p className="truncate text-xs text-gray-500">{user.email}</p>
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_BADGE[role]}`}>
                      {ROLE_LABELS[role] ?? role}
                    </span>
                  </div>
                  <Link to="/profile" role="menuitem" className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <User className="h-4 w-4" />
                    Hồ sơ cá nhân
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={logout}
                    className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
                <LogIn className="h-4 w-4" />
                Đăng nhập
              </Link>
              <Link to="/register" className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
                <UserPlus className="h-4 w-4" />
                Đăng ký
              </Link>
            </>
          )}
        </div>

        {/* mobile toggle */}
        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden"
          aria-label={mobileOpen ? 'Đóng menu' : 'Mở menu'}
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* mobile menu */}
      {mobileOpen && (
        <div className="border-t border-gray-100 bg-white px-4 pb-4 pt-2 md:hidden">
          <nav className="flex flex-col gap-1">
            {links.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={linkClass}>
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-3 border-t border-gray-100 pt-3">
            {isAuthenticated ? (
              <>
                <p className="px-3 text-sm font-semibold text-gray-900">{user.fullName}</p>
                <p className="px-3 text-xs text-gray-500">
                  {user.email} · {ROLE_LABELS[role] ?? role}
                </p>
                <Link to="/profile" className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  <User className="h-4 w-4" />
                  Hồ sơ cá nhân
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Đăng xuất
                </button>
              </>
            ) : (
              <div className="flex gap-2">
                <Link to="/login" className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-center text-sm font-medium text-gray-700">
                  Đăng nhập
                </Link>
                <Link to="/register" className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-center text-sm font-medium text-white">
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
