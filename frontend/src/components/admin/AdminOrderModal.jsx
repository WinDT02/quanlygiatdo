import { useEffect, useState } from 'react';
import { Banknote, CheckCircle2, Loader2, MapPin, MessageSquareText, Phone, Truck, User, UserCheck } from 'lucide-react';
import { assignOrderEmployee, fetchEmployees, markOrderPaid, updateOrderStatus } from '../../api/adminApi';
import { getErrorMessage } from '../../api/axiosClient';
import { useAuth } from '../../context/AuthContext';
import { DELIVERY_LABELS, ORDER_STATUS } from '../../config/orders';
import { formatDateTime, formatVND } from '../../utils/format';
import Modal from '../common/Modal';
import { Alert, useToast } from '../common/Toast';
import { OrderStatusBadge, PaymentStatusBadge } from '../orders/Badges';

/** Same state machine as the backend's OrderStatus.canTransitionTo. */
export const NEXT_STATUSES = {
  PENDING: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['WASHING', 'COMPLETED', 'CANCELLED'],
  WASHING: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

/**
 * Order details for staff, with the actions: change status (ADMIN + EMPLOYEE) and assign an employee (ADMIN only).
 * An EMPLOYEE has no assign control: the backend records the employee who first changes the status as the one in charge.
 * `onUpdated(order)` receives the order returned by the server so the list can refresh its row.
 */
export default function AdminOrderModal({ order, onClose, onUpdated }) {
  const { role } = useAuth();
  const toast = useToast();
  const isAdmin = role === 'ADMIN';
  const allowed = NEXT_STATUSES[order.status] ?? [];
  const canAssign = isAdmin && allowed.length > 0;

  const [nextStatus, setNextStatus] = useState(allowed[0] ?? '');
  const [employees, setEmployees] = useState([]);
  const [employeeId, setEmployeeId] = useState('');
  const [busy, setBusy] = useState(null); // 'status' | 'assign'
  const [error, setError] = useState('');
  const [cashCollected, setCashCollected] = useState(false);
  const canCollect = order.paymentStatus === 'UNPAID' && order.status !== 'CANCELLED';

  useEffect(() => {
    if (!canAssign) return undefined;
    let cancelled = false;
    fetchEmployees('ACTIVE')
      .then((list) => !cancelled && setEmployees(list))
      .catch((e) => !cancelled && setError(getErrorMessage(e)));
    return () => {
      cancelled = true;
    };
  }, [canAssign]);

  // keep the select valid when the order changes (e.g. after a status update)
  useEffect(() => {
    setNextStatus((NEXT_STATUSES[order.status] ?? [])[0] ?? '');
  }, [order.status]);

  const run = async (kind, action, successMessage) => {
    setError('');
    setBusy(kind);
    try {
      const updated = await action();
      toast.success(successMessage);
      onUpdated(updated);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal title={`Đơn hàng #${order.id}`} onClose={onClose} size="lg">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <OrderStatusBadge status={order.status} />
          <PaymentStatusBadge status={order.paymentStatus} orderStatus={order.status} />
          <span className="text-sm text-gray-500">Đặt lúc {formatDateTime(order.orderedAt)}</span>
        </div>

        {error && <Alert variant="error" onClose={() => setError('')}>{error}</Alert>}

        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <p className="flex items-center gap-2"><User className="h-4 w-4 text-gray-400" /><span className="font-medium text-gray-900">{order.customerName}</span></p>
          <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-gray-400" />{order.customerPhone || <span className="text-gray-400">Chưa có số điện thoại</span>}</p>
          <div className="flex gap-2">
            <Truck className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
            <div>
              <p className="font-medium text-gray-900">{DELIVERY_LABELS[order.deliveryMethod] ?? order.deliveryMethod}</p>
              {order.pickupAt && <p className="text-gray-500">Hẹn lấy: {formatDateTime(order.pickupAt)}</p>}
            </div>
          </div>
          <p className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />{order.address}</p>
          {order.note && <p className="flex gap-2 whitespace-pre-line sm:col-span-2"><MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />{order.note}</p>}
          <p className="flex items-center gap-2 sm:col-span-2">
            <UserCheck className="h-4 w-4 text-gray-400" />
            Nhân viên phụ trách: {order.employeeName ? <span className="font-medium text-gray-900">{order.employeeName}</span> : <span className="text-gray-400">Chưa có</span>}
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">Món đồ / dịch vụ</th>
                <th className="px-3 py-2 text-right">Khối lượng / SL</th>
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
          {Number(order.discountAmount) > 0 && <div className="flex justify-between text-green-700"><dt>Giảm giá{order.promotionCode ? ` (${order.promotionCode})` : ''}</dt><dd>-{formatVND(order.discountAmount)}</dd></div>}
          <div className="flex justify-between"><dt className="text-gray-500">Phí vận chuyển</dt><dd>{formatVND(order.shippingFee)}</dd></div>
          <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-bold"><dt>Tổng cộng</dt><dd className="text-blue-700">{formatVND(order.totalAmount)}</dd></div>
          <div className="flex items-center justify-between pt-1">
            <dt className="text-gray-500">Thanh toán</dt>
            <dd className="text-right"><PaymentStatusBadge status={order.paymentStatus} orderStatus={order.status} />{order.paidAt && <span className="block text-xs text-gray-400">{formatDateTime(order.paidAt)}</span>}</dd>
          </div>
          {canCollect && (
            <div className="flex justify-end pt-1">
              <button type="button" disabled={busy !== null} onClick={() => run('pay', () => markOrderPaid(order.id), `Đơn #${order.id}: đã thu ${formatVND(order.totalAmount)}`)} className="flex items-center gap-1.5 rounded-lg border border-green-300 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-60">
                {busy === 'pay' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Banknote className="h-3.5 w-3.5" />} Xác nhận đã thu tiền mặt
              </button>
            </div>
          )}
        </dl>

        {allowed.length > 0 && (
          <div className="space-y-3 rounded-xl bg-gray-50 p-4">
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-sm font-medium text-gray-700">
                Chuyển trạng thái
                <select value={nextStatus} onChange={(e) => setNextStatus(e.target.value)} className="mt-1 block rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
                  {allowed.map((s) => <option key={s} value={s}>{ORDER_STATUS[s].label}</option>)}
                </select>
              </label>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => run('status', () => updateOrderStatus(order.id, nextStatus, nextStatus === 'COMPLETED' && canCollect && cashCollected ? true : undefined), `Đơn #${order.id}: ${ORDER_STATUS[nextStatus].label}`)}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {busy === 'status' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Cập nhật
              </button>
            </div>
            {nextStatus === 'COMPLETED' && canCollect && (
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={cashCollected} onChange={(e) => setCashCollected(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                Khách đã trả tiền mặt ({formatVND(order.totalAmount)})
              </label>
            )}

            {canAssign && (
              <div className="flex flex-wrap items-end gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Giao cho nhân viên
                  <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="mt-1 block min-w-[12rem] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
                    <option value="">— Chọn nhân viên —</option>
                    {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.fullName}</option>)}
                  </select>
                </label>
                <button
                  type="button"
                  disabled={!employeeId || busy !== null}
                  onClick={() => run('assign', () => assignOrderEmployee(order.id, Number(employeeId)), 'Đã giao đơn cho nhân viên')}
                  className="flex items-center gap-2 rounded-lg border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                >
                  {busy === 'assign' && <Loader2 className="h-4 w-4 animate-spin" />} Giao đơn
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
