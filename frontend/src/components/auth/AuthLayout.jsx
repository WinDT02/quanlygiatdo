import { Link } from 'react-router-dom';
import { Shirt } from 'lucide-react';

/** Centered card shared by Login, Register and ForgotPassword. */
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-50 to-blue-100 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-6 shadow-xl sm:p-8">
          <Link to="/" className="mb-5 flex items-center justify-center gap-2 text-blue-600">
            <Shirt className="h-7 w-7" />
            <span className="text-lg font-bold">Tiệm giặt sấy</span>
          </Link>
          <h1 className="text-center text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="mt-1 text-center text-sm text-gray-500">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <p className="mt-4 text-center text-sm text-gray-600">{footer}</p>}
      </div>
    </div>
  );
}
