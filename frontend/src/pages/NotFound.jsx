import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <p className="text-6xl font-extrabold text-blue-600">404</p>
      <h1 className="mt-4 text-xl font-bold text-gray-900">Không tìm thấy trang</h1>
      <p className="mt-2 text-sm text-gray-500">Đường dẫn bạn truy cập không tồn tại.</p>
      <Link to="/" className="mt-6 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
        Về trang chủ
      </Link>
    </div>
  );
}
