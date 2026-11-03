import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, ClipboardList, Loader2, RefreshCw } from 'lucide-react';
import { fetchMyOrders } from '../api/laundryApi';
import { getErrorMessage } from '../api/axiosClient';
import { ORDER_STATUS } from '../config/orders';
import { formatDateTime, formatVND } from '../utils/format';
import { Alert } from '../components/common/Toast';
import { OrderStatusBadge, PaymentStatusBadge } from '../components/orders/Badges';
import OrderDetailModal from '../components/orders/OrderDetailModal';

const FILTERS = ['ALL', 'PENDING', 'PROCESSING', 'WASHING', 'COMPLETED', 'CANCELLED'];

export default function CustomerOrders() {
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [selectedId, setSelectedId] = useState(location.state?.openOrderId ?? null); // set right after booking

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setOrders(await fetchMyOrders());
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const result = { ALL: orders.length };
    orders.forEach((o) => {
      result[o.status] = (result[o.status] ?? 0) + 1;
    });
    return result;
  }, [orders]);

  const visible = filter === 'ALL' ? orders : orders.filter((o) => o.status === filter);
  const selected = orders.find((o) => o.id === selectedId) ?? null;

  // after cancel the modal passes the updated order; after a review it passes nothing -> reload from the server
  const handleChanged = (updated) => {
    if (updated) setOrders((list) => list.map((o) => (o.id === updated.id ? updated : o)));
    else load();
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Đơn của tôi</h1>
          <p className="mt-1 text-sm text-gray-500">Theo dõi tiến độ giặt và lịch sử đơn hàng.</p>
        </div>
        <button type="button" onClick={load} disabled={loading} className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Làm mới
        </button>
      </div>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1" role="tablist">
        {FILTERS.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={filter === key}
            onClick={() => setFilter(key)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition ${filter === key ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'}`}
          >
            {key === 'ALL' ? 'Tất cả' : ORDER_STATUS[key].label}
            <span className={`rounded-full px-1.5 text-xs ${filter === key ? 'bg-white/25' : 'bg-gray-100 text-gray-500'}`}>{counts[key] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="mt-5">
        {error && (
          <Alert variant="error">
            {error} <button type="button" onClick={load} className="font-semibold underline">Thử lại</button>
          </Alert>
        )}

        {loading && orders.length === 0 ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
        ) : visible.length === 0 && !error ? (
          <div className="rounded-2xl bg-white py-16 text-center ring-1 ring-gray-100">
            <ClipboardList className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-3 text-gray-600">{filter === 'ALL' ? 'Bạn chưa có đơn hàng nào.' : 'Không có đơn hàng ở trạng thái này.'}</p>
            {filter === 'ALL' && <Link to="/booking" className="mt-4 inline-block rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Đặt giặt ngay</Link>}
          </div>
        ) : (
          <ul className="space-y-3">
            {visible.map((order) => (
              <li key={order.id}>
                <button type="button" onClick={() => setSelectedId(order.id)} className="flex w-full items-center gap-4 rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-gray-100 transition hover:ring-blue-300">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-gray-900">Đơn #{order.id}</span>
                      <OrderStatusBadge status={order.status} />
                      <PaymentStatusBadge status={order.paymentStatus} orderStatus={order.status} />
                      {order.status === 'COMPLETED' && !order.reviewed && <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">Chưa đánh giá</span>}
                    </div>
                    <p className="mt-1 truncate text-sm text-gray-500">
                      {order.items.map((i) => `${i.serviceName} × ${i.quantity}`).join(', ')}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">{formatDateTime(order.orderedAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-blue-700">{formatVND(order.totalAmount)}</p>
                    <ChevronRight className="ml-auto mt-1 h-4 w-4 text-gray-300" />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected && <OrderDetailModal order={selected} onClose={() => setSelectedId(null)} onChanged={handleChanged} />}
    </div>
  );
}
