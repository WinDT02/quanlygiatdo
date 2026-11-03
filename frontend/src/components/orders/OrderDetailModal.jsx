import { useState } from 'react';
import { CheckCircle2, CreditCard, Loader2, MapPin, MessageSquareText, Truck, XCircle } from 'lucide-react';
import { cancelOrder, redirectToVnpay } from '../../api/laundryApi';
import { getErrorMessage } from '../../api/axiosClient';
import { DELIVERY_LABELS, ORDER_STEPS } from '../../config/orders';
import { formatDateTime, formatVND } from '../../utils/format';
import Modal from '../common/Modal';
import { Alert, useToast } from '../common/Toast';
import { OrderStatusBadge, PaymentStatusBadge } from './Badges';
import ReviewForm from './ReviewForm';

function ProgressTracker({ status, paymentStatus }) {
  if (status === 'CANCELLED') {
    return (
      <Alert variant="error" title="Đơn hàng đã bị hủy">
        Đơn này không còn được xử lý.
        {paymentStatus === 'PAID' && (
          <span className="mt-1 block font-medium">Đơn này đã thanh toán. Cửa hàng sẽ liên hệ với bạn để hoàn lại số tiền đã thanh toán.</span>
        )}
      </Alert>
    );
  }
  const current = ORDER_STEPS.indexOf(status);
  const labels = { PENDING: 'Chờ xác nhận', PROCESSING: 'Đang xử lý', WASHING: 'Đang giặt', COMPLETED: 'Hoàn thành' };
  return (
    <ol className="flex items-start">
      {ORDER_STEPS.map((step, index) => {
        const done = index <= current;
        return (
          <li key={step} className="relative flex flex-1 flex-col items-center text-center">
            {index > 0 && <span className={`absolute right-1/2 top-3 h-0.5 w-full ${index <= current ? 'bg-blue-600' : 'bg-gray-200'}`} />}
            <span className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${done ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
              {done ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
            </span>
            <span className={`mt-1 text-xs ${done ? 'font-semibold text-blue-700' : 'text-gray-400'}`}>{labels[step]}</span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Details of one order (data already loaded by the list) + the actions a customer may take:
 * cancel (PENDING only), pay by VNPay (UNPAID, not cancelled), review (COMPLETED and not reviewed yet).
 * `onChanged(order?)` tells the page to refresh: with the updated order after a cancel, without one after a review.
 */
export default function OrderDetailModal({ order, onClose, onChanged }) {
  const toast = useToast();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [busy, setBusy] = useState(null); // 'cancel' | 'pay' | null
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState('');

  const canCancel = order.status === 'PENDING';
  const canPay = order.paymentStatus === 'UNPAID' && order.status !== 'CANCELLED';
  const canReview = order.status === 'COMPLETED' && !order.reviewed;

  const handleCancel = async () => {
    setError('');
    setBusy('cancel');
    try {
      const updated = await cancelOrder(order.id);
      toast.success(`Đã hủy đơn #${order.id}`);
      setConfirmCancel(false);
      onChanged(updated);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const handlePay = async () => {
    setError('');
    setBusy('pay');
    try {
      await redirectToVnpay(order.id); // leaves the page
    } catch (e) {
      setError(getErrorMessage(e));
      setBusy(null);
    }
  };

  return (
    <Modal title={`Đơn hàng #${order.id}`} onClose={onClose} size="lg" closeDisabled={busy === 'pay'}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <OrderStatusBadge status={order.status} />
          <PaymentStatusBadge status={order.paymentStatus} orderStatus={order.status} />
          <span className="text-sm text-gray-500">Đặt lúc {formatDateTime(order.orderedAt)}</span>
        </div>

        <ProgressTracker status={order.status} paymentStatus={order.paymentStatus} />

        {error && <Alert variant="error" onClose={() => setError('')}>{error}</Alert>}

        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="flex gap-2">
            <Truck className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
            <div>
              <p className="font-medium text-gray-900">{DELIVERY_LABELS[order.deliveryMethod] ?? order.deliveryMethod}</p>
              {order.pickupAt && <p className="text-gray-500">Hẹn lấy: {formatDateTime(order.pickupAt)}</p>}
            </div>
          </div>
          <div className="flex gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
            <p className="text-gray-700">{order.address}</p>
          </div>
          {order.note && (
            <div className="flex gap-2 sm:col-span-2">
              <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
              <p className="whitespace-pre-line text-gray-700">{order.note}</p>
            </div>
          )}
          {order.employeeName && <p className="text-gray-500 sm:col-span-2">Nhân viên phụ trách: <span className="font-medium text-gray-800">{order.employeeName}</span></p>}
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">Dịch vụ</th>
                <th className="px-3 py-2 text-right">SL</th>
                <th className="hidden px-3 py-2 text-right sm:table-cell">Đơn giá</th>
                <th className="px-3 py-2 text-right">Thành tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-2 text-gray-900">{item.serviceName}</td>
                  <td className="px-3 py-2 text-right">{item.quantity} {item.unit}</td>
                  <td className="hidden px-3 py-2 text-right text-gray-500 sm:table-cell">{formatVND(item.unitPrice)}</td>
                  <td className="px-3 py-2 text-right font-medium">{formatVND(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <dl className="ml-auto max-w-xs space-y-1 text-sm">
          <div className="flex justify-between"><dt className="text-gray-500">Tạm tính</dt><dd>{formatVND(order.subtotalAmount)}</dd></div>
          {Number(order.discountAmount) > 0 && (
            <div className="flex justify-between text-green-700"><dt>Giảm giá{order.promotionCode ? ` (${order.promotionCode})` : ''}</dt><dd>-{formatVND(order.discountAmount)}</dd></div>
          )}
          <div className="flex justify-between"><dt className="text-gray-500">Phí vận chuyển</dt><dd>{formatVND(order.shippingFee)}</dd></div>
          <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-bold"><dt>Tổng cộng</dt><dd className="text-blue-700">{formatVND(order.totalAmount)}</dd></div>
          {order.paidAt && <p className="text-right text-xs text-gray-400">Đã thanh toán lúc {formatDateTime(order.paidAt)}</p>}
        </dl>

        {reviewing && canReview && (
          <ReviewForm orderId={order.id} onCancel={() => setReviewing(false)} onSubmitted={() => { setReviewing(false); onChanged(); }} />
        )}
        {order.reviewed && (
          <p className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4" /> Bạn đã đánh giá đơn hàng này. Cảm ơn bạn!
          </p>
        )}

        {(canPay || canCancel || (canReview && !reviewing)) && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-4">
            {canReview && !reviewing && (
              <button type="button" onClick={() => setReviewing(true)} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600">
                Viết đánh giá
              </button>
            )}
            {canPay && (
              <button type="button" onClick={handlePay} disabled={busy !== null} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                {busy === 'pay' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                Thanh toán VNPay
              </button>
            )}
            {canCancel &&
              (confirmCancel ? (
                <span className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">Hủy đơn này?{order.paymentStatus === 'PAID' && <span className="block text-xs text-amber-700">Đơn đã thanh toán VNPay, tiệm sẽ liên hệ hoàn tiền cho bạn.</span>}</span>
                  <button type="button" onClick={handleCancel} disabled={busy !== null} className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                    {busy === 'cancel' && <Loader2 className="h-4 w-4 animate-spin" />} Xác nhận hủy
                  </button>
                  <button type="button" onClick={() => setConfirmCancel(false)} disabled={busy !== null} className="px-2 py-2 text-gray-500 hover:text-gray-800">Không</button>
                </span>
              ) : (
                <button type="button" onClick={() => setConfirmCancel(true)} className="flex items-center gap-1 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
                  <XCircle className="h-4 w-4" /> Hủy đơn
                </button>
              ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
