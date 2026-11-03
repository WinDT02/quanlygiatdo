import { useCallback, useEffect, useRef, useState } from 'react';
import { Banknote, ClipboardList, Eye, Loader2, RefreshCw, Search, X } from 'lucide-react';
import { markOrderPaid, searchOrders, updateOrderStatus } from '../api/adminApi';
import { getErrorMessage } from '../api/axiosClient';
import { ORDER_STATUS } from '../config/orders';
import useDebounce from '../hooks/useDebounce';
import { formatDateTime, formatVND } from '../utils/format';
import { Alert, useToast } from '../components/common/Toast';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Modal from '../components/common/Modal';
import { OrderStatusBadge, PaymentStatusBadge } from '../components/orders/Badges';
import AdminOrderModal from '../components/admin/AdminOrderModal';
import Pagination from '../components/admin/Pagination';

const FILTERS = ['ALL', 'PENDING', 'PROCESSING', 'WASHING', 'COMPLETED', 'CANCELLED'];
const PAGE_SIZE = 10;

/** The usual next step of each status = the primary one-click button of a row. */
const QUICK_ACTION = {
  PENDING: { to: 'PROCESSING', label: 'Xác nhận' },
  PROCESSING: { to: 'WASHING', label: 'Bắt đầu giặt' },
  WASHING: { to: 'COMPLETED', label: 'Hoàn thành' },
};

export default function OrderManagement() {
  const toast = useToast();
  const [status, setStatus] = useState('ALL');
  const [keyword, setKeyword] = useState('');
  const debouncedKeyword = useDebounce(keyword, 400);
  const [page, setPage] = useState(0);
  const [data, setData] = useState({ content: [], totalPages: 0, totalElements: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0); // bump to reload the current page
  const [selectedId, setSelectedId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [completeTarget, setCompleteTarget] = useState(null); // COMPLETED on an UNPAID order: ask about the cash first
  const [payTarget, setPayTarget] = useState(null);
  const latestRequest = useRef(0);

  // new filter -> back to the first page
  useEffect(() => {
    setPage(0);
  }, [status, debouncedKeyword]);

  useEffect(() => {
    const requestId = ++latestRequest.current; // ignore answers that arrive after a newer request was sent
    setLoading(true);
    setError('');
    searchOrders({ status, keyword: debouncedKeyword, page, size: PAGE_SIZE })
      .then((result) => {
        if (requestId === latestRequest.current) setData(result);
      })
      .catch((e) => {
        if (requestId === latestRequest.current) setError(getErrorMessage(e));
      })
      .finally(() => {
        if (requestId === latestRequest.current) setLoading(false);
      });
  }, [status, debouncedKeyword, page, tick]);

  const replaceOrder = useCallback((updated) => {
    setData((d) => ({ ...d, content: d.content.map((o) => (o.id === updated.id ? updated : o)) }));
  }, []);

  const changeStatus = async (order, nextStatus, cashCollected) => {
    setBusyId(order.id);
    try {
      const updated = await updateOrderStatus(order.id, nextStatus, cashCollected);
      toast.success(`Đơn #${order.id}: ${ORDER_STATUS[nextStatus].label}${cashCollected ? ' · đã thu tiền' : ''}`);
      // with a status filter on, the row may no longer belong to this tab -> reload; otherwise just update it
      if (status === 'ALL') replaceOrder(updated);
      else setTick((n) => n + 1);
    } catch (e) {
      toast.error(getErrorMessage(e));
      setTick((n) => n + 1); // somebody else may have changed the order: show the real state
    } finally {
      setBusyId(null);
      setCancelTarget(null);
      setCompleteTarget(null);
    }
  };

  const confirmPaid = async () => {
    const order = payTarget;
    setBusyId(order.id);
    try {
      const updated = await markOrderPaid(order.id);
      toast.success(`Đơn #${order.id}: đã thu ${formatVND(order.totalAmount)}`);
      replaceOrder(updated);
      setPayTarget(null);
    } catch (e) {
      toast.error(getErrorMessage(e));
      setPayTarget(null);
      setTick((n) => n + 1);
    } finally {
      setBusyId(null);
    }
  };

  const selected = data.content.find((o) => o.id === selectedId) ?? null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý đơn hàng</h1>
          <p className="mt-1 text-sm text-gray-500">Tất cả đơn của tiệm, mới nhất ở trên cùng.</p>
        </div>
        <button type="button" onClick={() => setTick((n) => n + 1)} disabled={loading} className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Làm mới
        </button>
      </div>

      <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist">
          {FILTERS.map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={status === key}
              onClick={() => setStatus(key)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${status === key ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'}`}
            >
              {key === 'ALL' ? 'Tất cả' : ORDER_STATUS[key].label}
            </button>
          ))}
        </div>
        <div className="relative w-full lg:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Mã đơn, số điện thoại hoặc tên khách"
            aria-label="Tìm kiếm đơn hàng"
            className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-9 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
          {keyword && (
            <button type="button" onClick={() => setKeyword('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-700" aria-label="Xóa tìm kiếm">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="error" className="mt-4">
          {error} <button type="button" onClick={() => setTick((n) => n + 1)} className="font-semibold underline">Thử lại</button>
        </Alert>
      )}

      <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[56rem] text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Mã đơn</th>
                <th className="px-4 py-3">Khách hàng</th>
                <th className="px-4 py-3">Dịch vụ</th>
                <th className="px-4 py-3 text-right">Tổng tiền</th>
                <th className="px-4 py-3">Thanh toán</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.content.map((order) => {
                const quick = QUICK_ACTION[order.status];
                const busy = busyId === order.id;
                return (
                  <tr key={order.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-3 align-top">
                      <p className="font-semibold text-gray-900">#{order.id}</p>
                      <p className="text-xs text-gray-400">{formatDateTime(order.orderedAt)}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="font-medium text-gray-900">{order.customerName}</p>
                      <p className="text-xs text-gray-500">{order.customerPhone || '—'}</p>
                    </td>
                    <td className="max-w-[16rem] px-4 py-3 align-top text-gray-600">
                      <p className="truncate">{order.items.map((i) => `${i.serviceName} × ${i.quantity}`).join(', ')}</p>
                      {order.employeeName && <p className="text-xs text-gray-400">NV: {order.employeeName}</p>}
                    </td>
                    <td className="px-4 py-3 text-right align-top font-semibold text-blue-700">{formatVND(order.totalAmount)}</td>
                    <td className="px-4 py-3 align-top"><PaymentStatusBadge status={order.paymentStatus} orderStatus={order.status} /></td>
                    <td className="px-4 py-3 align-top"><OrderStatusBadge status={order.status} /></td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        {quick && (
                          <button type="button" disabled={busy} onClick={() => (quick.to === 'COMPLETED' && order.paymentStatus === 'UNPAID' ? setCompleteTarget(order) : changeStatus(order, quick.to))} className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                            {busy && <Loader2 className="h-3 w-3 animate-spin" />} {quick.label}
                          </button>
                        )}
                        {order.paymentStatus === 'UNPAID' && order.status !== 'CANCELLED' && (
                          <button type="button" disabled={busy} onClick={() => setPayTarget(order)} className="flex items-center gap-1 rounded-lg border border-green-300 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-60" title="Xác nhận đã thu tiền mặt">
                            <Banknote className="h-3.5 w-3.5" /> Thu tiền
                          </button>
                        )}
                        {quick && (
                          <button type="button" disabled={busy} onClick={() => setCancelTarget(order)} className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60">Hủy</button>
                        )}
                        <button type="button" onClick={() => setSelectedId(order.id)} className="rounded-lg border border-gray-300 p-1.5 text-gray-600 hover:bg-gray-50" aria-label={`Xem chi tiết đơn ${order.id}`} title="Chi tiết">
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {loading && data.content.length === 0 && <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>}
        {!loading && data.content.length === 0 && !error && (
          <div className="py-16 text-center">
            <ClipboardList className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-3 text-gray-600">Không có đơn hàng nào phù hợp.</p>
          </div>
        )}
        <div className={`border-t border-gray-100 px-4 py-3 ${loading && data.content.length > 0 ? 'opacity-60' : ''}`}>
          <Pagination page={page} totalPages={data.totalPages} totalElements={data.totalElements} onChange={setPage} />
        </div>
      </div>

      {selected && (
        <AdminOrderModal
          order={selected}
          onClose={() => setSelectedId(null)}
          onUpdated={(updated) => {
            replaceOrder(updated);
            if (status !== 'ALL' && updated.status !== status) setTick((n) => n + 1);
          }}
        />
      )}

      {completeTarget && (
        <Modal title={`Hoàn thành đơn #${completeTarget.id}`} onClose={() => setCompleteTarget(null)} size="sm" closeDisabled={busyId === completeTarget.id}>
          <p className="text-sm text-gray-600">Đơn này chưa thanh toán. Khách <span className="font-semibold">{completeTarget.customerName}</span> đã trả <span className="font-semibold text-blue-700">{formatVND(completeTarget.totalAmount)}</span> tiền mặt chưa?</p>
          <div className="mt-5 flex flex-col gap-2">
            <button type="button" disabled={busyId === completeTarget.id} onClick={() => changeStatus(completeTarget, 'COMPLETED', true)} className="rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60">Hoàn thành &amp; đã thu tiền</button>
            <button type="button" disabled={busyId === completeTarget.id} onClick={() => changeStatus(completeTarget, 'COMPLETED')} className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60">Hoàn thành, chưa thu tiền</button>
            <button type="button" disabled={busyId === completeTarget.id} onClick={() => setCompleteTarget(null)} className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-100">Quay lại</button>
          </div>
        </Modal>
      )}

      {payTarget && (
        <ConfirmDialog title={`Xác nhận thu tiền đơn #${payTarget.id}?`} confirmLabel="Đã thu tiền" busy={busyId === payTarget.id} onConfirm={confirmPaid} onClose={() => setPayTarget(null)}>
          Bạn đã nhận <span className="font-semibold">{formatVND(payTarget.totalAmount)}</span> tiền mặt từ <span className="font-semibold">{payTarget.customerName}</span>? Đơn sẽ chuyển sang “Đã thanh toán”.
        </ConfirmDialog>
      )}

      {cancelTarget && (
        <ConfirmDialog title={`Hủy đơn #${cancelTarget.id}?`} confirmLabel="Hủy đơn" danger busy={busyId === cancelTarget.id} onConfirm={() => changeStatus(cancelTarget, 'CANCELLED')} onClose={() => setCancelTarget(null)}>
          Đơn của <span className="font-semibold">{cancelTarget.customerName}</span> sẽ chuyển sang “Đã hủy” và không thể khôi phục.
          {cancelTarget.paymentStatus === 'PAID' && (
            <span className="mt-2 block rounded-lg bg-amber-50 p-2 text-xs text-amber-800">Đơn này khách đã thanh toán qua VNPay. Hệ thống chưa tự hoàn tiền: bạn cần hoàn tiền cho khách ({formatVND(cancelTarget.totalAmount)}) thủ công.</span>
          )}
        </ConfirmDialog>
      )}
    </div>
  );
}
