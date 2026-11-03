import { Link } from 'react-router-dom';
import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import { BRAND_ICON } from '../../config/navigation';

export default function Footer() {
  const Brand = BRAND_ICON;
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-3 lg:px-8">
        <div>
          <div className="flex items-center gap-2 text-blue-600">
            <Brand className="h-6 w-6" />
            <span className="text-lg font-bold">Tiệm giặt sấy</span>
          </div>
          <p className="mt-3 text-sm text-gray-500">
            Giặt sấy, ủi và giao nhận tận nơi. Đặt lịch trực tuyến, theo dõi đơn hàng mọi lúc.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-900">Liên kết</h3>
          <ul className="mt-3 space-y-2 text-sm text-gray-500">
            <li>
              <Link to="/" className="hover:text-blue-600">Trang chủ</Link>
            </li>
            <li>
              <Link to="/booking" className="hover:text-blue-600">Đặt giặt</Link>
            </li>
            <li>
              <Link to="/my-orders" className="hover:text-blue-600">Đơn của tôi</Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-900">Liên hệ</h3>
          <ul className="mt-3 space-y-2 text-sm text-gray-500">
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              123 Đường Giặt Ủi, Phường 1, Quận 1, TP.HCM
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0" />
              0900 000 000
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0" />
              hotro@tiemgiatsay.vn
            </li>
            <li className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0" />
              7:00 – 21:00 mỗi ngày
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-gray-100 py-4 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} Tiệm giặt sấy. Đồ án thực tập chuyên ngành.
      </div>
    </footer>
  );
}
