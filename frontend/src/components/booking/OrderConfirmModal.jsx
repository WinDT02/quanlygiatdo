import { useState } from 'react';
import { Banknote, CreditCard, Loader2 } from 'lucide-react';
import { DELIVERY_LABELS } from '../../config/orders';
import { formatVND } from '../../utils/format';
import Modal from '../common/Modal';
import { Alert } from '../common/Toast';

const METHODS = [
  { value: 'COD', icon: Banknote, title: 'Tiền mặt (COD)', desc: 'Thanh toán tiền mặt khi nhận hàng / khi đến tiệm.' },
  { value: 'VNPAY', icon: CreditCard, title: 'Thanh toán online (VNPay)', desc: 'Chuyển sang cổng VNPay để thanh toán ngay bằng thẻ / QR / Internet Banking.' },
];

/** Last step of booking: shows the summary, lets the customer pick COD or VNPay, then calls onConfirm(method). */
export default function OrderConfirmModal({ summary, submitting, error, onConfirm, onClose }) {
  const [method, setMethod] = useState('COD');

  return (
    <Modal title="Xác nhận đặt giặt" onClose={onClose} closeDisabled={submitting}>
      <div className="space-y-5">
        {error && <Alert variant="error">{error}</Alert>}

        <div className="rounded-xl bg-gray-50 p-4 text-sm">
          <ul className="space-y-1">
            {summary.lines.map((line) => (
              <li key={line.id} className="flex justify-between gap-3">
                <span className="text-gray-700">{line.name} × {line.quantity} {line.unit}</span>
                <span className="shrink-0 font-medium">{formatVND(line.total)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 space-y-1 border-t border-gray-200 pt-3">
            <div className="flex justify-between"><span className="text-gray-500">Tạm tính</span><span>{formatVND(summary.subtotal)}</span></div>
            {summary.discount > 0 && <div className="flex justify-between text-green-700"><span>Giảm giá ({summary.promoCode})</span><span>-{formatVND(summary.discount)}</span></div>}
            <div className="flex justify-between"><span className="text-gray-500">Phí vận chuyển</span><span>{formatVND(summary.shipping)}</span></div>
            <div className="flex justify-between pt-1 text-base font-bold"><span>Tổng cộng</span><span className="text-blue-700">{formatVND(summary.total)}</span></div>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            {DELIVERY_LABELS[summary.deliveryMethod]}
            {summary.deliveryMethod === 'PICKUP' && ` — ${summary.address}`}
          </p>
        </div>

        <fieldset className="space-y-2" disabled={submitting}>
          <legend className="mb-1 text-sm font-semibold text-gray-900">Phương thức thanh toán</legend>
          {METHODS.map(({ value, icon: Icon, title, desc }) => (
            <label key={value} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${method === value ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 hover:bg-gray-50'}`}>
              <input type="radio" name="payment-method" value={value} checked={method === value} onChange={() => setMethod(value)} className="mt-1" />
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
              <span>
                <span className="block text-sm font-semibold text-gray-900">{title}</span>
                <span className="block text-xs text-gray-500">{desc}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={submitting} className="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50">
            Quay lại
          </button>
          <button type="button" onClick={() => onConfirm(method)} disabled={submitting} className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {method === 'VNPAY' ? 'Đặt giặt & thanh toán' : 'Xác nhận đặt giặt'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
