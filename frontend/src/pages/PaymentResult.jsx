import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ClipboardList, CreditCard, Home, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { fetchOrder, redirectToVnpay } from '../api/laundryApi';
import { getErrorMessage } from '../api/axiosClient';
import { VNPAY_MESSAGES } from '../config/orders';
import { formatDateTime, formatVND } from '../utils/format';
import { Alert } from '../components/common/Toast';
import { OrderStatusBadge, PaymentStatusBadge } from '../components/orders/Badges';

const MAX_CONFIRM_ATTEMPTS = 3;

/**
 * VNPay -> backend (/api/payment/vnpay-callback) -> redirect here: /payment/result?status=success|failed|error&orderId=..&code=..
 * The query string only says what the browser was told. The truth is the order's paymentStatus from the server,
 * so a user cannot "fake" a success by editing the URL.
 */
export default function PaymentResult() {
  const [params] = useSearchParams();
  const status = params.get('status'); // success | failed | error
  const orderId = params.get('orderId');
  const code = params.get('code');

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(Boolean(orderId));
  const [loadError, setLoadError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState('');

  const load = useCallback(() => {
    if (!orderId) return () => {};
    let cancelled = false;
    setLoadError('');
    fetchOrder(orderId)
      .then((o) => !cancelled && setOrder(o))
      .catch((e) => !cancelled && setLoadError(e.response?.status === 404 ? 'Không tìm thấy đơn hàng này trong tài khoản của bạn.' : getErrorMessage(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  useEffect(() => load(), [load, attempt]);

  // The redirect says "success" but the order is not PAID yet (the write may still be settling): look again, a few times.
  const waitingForConfirmation = status === 'success' && order && order.paymentStatus !== 'PAID';
  useEffect(() => {
    if (!waitingForConfirmation || attempt >= MAX_CONFIRM_ATTEMPTS) return undefined;
    const timer = setTimeout(() => setAttempt((n) => n + 1), 2000);
    return () => clearTimeout(timer);
  }, [waitingForConfirmation, attempt]);

  const retryPayment = async () => {
    setRetryError('');
    setRetrying(true);
    try {
      await redirectToVnpay(order.id);
    } catch (e) {
      setRetryError(getErrorMessage(e));
      setRetrying(false);
    }
  };

  // ---- which screen? ----
  let view; // 'success' | 'pending' | 'failed' | 'error'
  if (order?.paymentStatus === 'PAID') view = 'success';
  else if (!order) view = status === 'success' ? 'pending' : status === 'failed' ? 'failed' : 'error'; // order could not be loaded
  else if (waitingForConfirmation) view = attempt >= MAX_CONFIRM_ATTEMPTS ? 'pending' : 'checking';
  else if (status === 'error' || !status) view = 'error';
  else view = 'failed';

  const CONFIG = {
    success: { icon: CheckCircle2, color: 'text-green-500', title: 'Thanh toán thành công', text: 'Cảm ơn bạn! Đơn hàng của bạn đã được thanh toán.' },
    checking: { icon: Loader2, color: 'text-blue-500 animate-spin', title: 'Đang xác nhận thanh toán...', text: 'Vui lòng đợi trong giây lát.' },
    pending: { icon: AlertTriangle, color: 'text-amber-500', title: 'Chưa xác nhận được thanh toán', text: 'Hệ thống chưa ghi nhận khoản thanh toán này. Nếu tài khoản ngân hàng đã bị trừ tiền, hãy liên hệ tiệm kèm mã đơn hàng.' },
    failed: { icon: XCircle, color: 'text-red-500', title: 'Thanh toán không thành công', text: VNPAY_MESSAGES[code] ?? 'Giao dịch chưa hoàn tất. Bạn có thể thử thanh toán lại.' },
    error: { icon: AlertTriangle, color: 'text-amber-500', title: 'Không xác minh được giao dịch', text: 'Dữ liệu trả về từ cổng thanh toán không hợp lệ. Nếu tài khoản ngân hàng đã bị trừ tiền, hãy liên hệ tiệm kèm mã đơn hàng.' },
  }[view];
  const Icon = CONFIG.icon;
  const canRetry = order && order.paymentStatus === 'UNPAID' && order.status !== 'CANCELLED' && view !== 'checking';

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
        <Icon className={`mx-auto h-16 w-16 ${CONFIG.color}`} />
        <h1 className="mt-4 text-2xl font-bold text-gray-900">{CONFIG.title}</h1>
        <p className="mt-2 text-sm text-gray-600">{CONFIG.text}</p>
        {view === 'failed' && code && <p className="mt-1 text-xs text-gray-400">Mã phản hồi VNPay: {code}</p>}

        {orderId && !order && loadError && <Alert variant="error" className="mt-4 text-left">{loadError}</Alert>}

        {order && (
          <div className="mt-6 rounded-xl bg-gray-50 p-4 text-left text-sm">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-900">Đơn hàng #{order.id}</span>
              <span className="flex gap-1"><OrderStatusBadge status={order.status} /><PaymentStatusBadge status={order.paymentStatus} orderStatus={order.status} /></span>
            </div>
            <ul className="mt-3 space-y-1">
              {order.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-3 text-gray-600">
                  <span>{item.serviceName} × {item.quantity} {item.unit}</span>
                  <span className="shrink-0">{formatVND(item.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1 border-t border-gray-200 pt-3">
              {Number(order.discountAmount) > 0 && <div className="flex justify-between text-green-700"><dt>Giảm giá</dt><dd>-{formatVND(order.discountAmount)}</dd></div>}
              <div className="flex justify-between text-gray-600"><dt>Phí vận chuyển</dt><dd>{formatVND(order.shippingFee)}</dd></div>
              <div className="flex justify-between text-base font-bold"><dt>Tổng cộng</dt><dd className="text-blue-700">{formatVND(order.totalAmount)}</dd></div>
              {order.paidAt && <div className="flex justify-between text-xs text-gray-400"><dt>Thanh toán lúc</dt><dd>{formatDateTime(order.paidAt)}</dd></div>}
            </dl>
          </div>
        )}

        {retryError && <Alert variant="error" className="mt-4 text-left">{retryError}</Alert>}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          {canRetry && (
            <button type="button" onClick={retryPayment} disabled={retrying} className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
              {retrying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />} Thanh toán lại
            </button>
          )}
          {view === 'pending' && (
            <button type="button" onClick={() => setAttempt(0)} className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <RefreshCw className="h-4 w-4" /> Kiểm tra lại
            </button>
          )}
          <Link to="/my-orders" className={`flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold ${canRetry ? 'border border-gray-300 text-gray-700 hover:bg-gray-50' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
            <ClipboardList className="h-4 w-4" /> Đơn hàng của tôi
          </Link>
          <Link to="/" className="flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-800">
            <Home className="h-4 w-4" /> Trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
