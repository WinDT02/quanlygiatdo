import { ORDER_STATUS, PAYMENT_STATUS } from '../../config/orders';

const base = 'inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium';

export function OrderStatusBadge({ status }) {
  const meta = ORDER_STATUS[status];
  return <span className={`${base} ${meta?.badge ?? 'bg-gray-100 text-gray-600'}`}>{meta?.label ?? status}</span>;
}

/**
 * Pass `orderStatus` so a cancelled order that was already paid shows "Chờ hoàn tiền" (amber)
 * instead of a green "Đã thanh toán" next to "Đã hủy".
 */
export function PaymentStatusBadge({ status, orderStatus }) {
  if (orderStatus === 'CANCELLED' && status === 'PAID') {
    return <span className={`${base} bg-amber-100 text-amber-800`}>Chờ hoàn tiền</span>;
  }
  const meta = PAYMENT_STATUS[status];
  return <span className={`${base} ${meta?.badge ?? 'bg-gray-100 text-gray-600'}`}>{meta?.label ?? status}</span>;
}
