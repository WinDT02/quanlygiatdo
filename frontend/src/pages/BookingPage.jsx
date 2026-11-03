import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, MapPin, Minus, Plus, Shirt, Tag, Truck, Store, X } from 'lucide-react';
import { checkPromotion, createOrder, fetchPromotions, fetchServices, redirectToVnpay } from '../api/laundryApi';
import { getErrorMessage } from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import { SHIPPING_FEE } from '../config/orders';
import { formatVND, toBackendDateTime, toDateTimeLocalValue } from '../utils/format';
import { Alert, useToast } from '../components/common/Toast';
import OrderConfirmModal from '../components/booking/OrderConfirmModal';

const MAX_QUANTITY = 1000;

/**
 * - / + buttons and a number box. Going below 1 removes the service from the order (parent shows "Chọn" again).
 * The box keeps its own text while typing, so the field can be emptied and retyped without the row disappearing.
 */
function QuantityControl({ value, onChange }) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const clamp = (n) => Math.min(Math.max(n, 0), MAX_QUANTITY);

  const handleInput = (event) => {
    const text = event.target.value.replace(/\D/g, '').slice(0, 4);
    setDraft(text);
    const parsed = parseInt(text, 10);
    if (parsed >= 1) onChange(clamp(parsed));
  };

  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={() => onChange(clamp(value - 1))} className="rounded-lg border border-gray-300 p-1.5 text-gray-600 hover:bg-gray-100" aria-label="Giảm">
        <Minus className="h-4 w-4" />
      </button>
      <input
        inputMode="numeric"
        value={draft}
        onChange={handleInput}
        onBlur={() => setDraft(String(value))}
        className="w-14 rounded-lg border border-gray-300 py-1.5 text-center text-sm outline-none focus:border-blue-500"
        aria-label="Số lượng"
      />
      <button type="button" onClick={() => onChange(clamp(value + 1))} className="rounded-lg border border-gray-300 p-1.5 text-gray-600 hover:bg-gray-100" aria-label="Tăng">
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function BookingPage() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // ---- catalogue ----
  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState('');
  const [promotions, setPromotions] = useState([]);

  // ---- form ----
  const [quantities, setQuantities] = useState({}); // { [serviceId]: quantity }
  const [deliveryMethod, setDeliveryMethod] = useState('PICKUP');
  const [address, setAddress] = useState(user?.address ?? '');
  const [returnAddress, setReturnAddress] = useState('');
  const [note, setNote] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [errors, setErrors] = useState({});

  // ---- promotion ----
  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState(null); // { code, title, percent } once the server said it is valid
  const [promoMessage, setPromoMessage] = useState(null); // { ok, text }
  const [promoChecking, setPromoChecking] = useState(false);

  // ---- confirm / submit ----
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const loadServices = () => {
    setServicesLoading(true);
    setServicesError('');
    fetchServices()
      .then((list) => {
        setServices(list);
        // /booking?service=3 (from the home page) starts with that service selected
        const preselected = Number(searchParams.get('service'));
        if (preselected && list.some((s) => s.id === preselected)) setQuantities({ [preselected]: 1 });
      })
      .catch((e) => setServicesError(getErrorMessage(e)))
      .finally(() => setServicesLoading(false));
  };

  useEffect(() => {
    loadServices();
    fetchPromotions().then(setPromotions).catch(() => setPromotions([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- derived numbers ----
  const summary = useMemo(() => {
    const lines = services
      .filter((s) => (quantities[s.id] ?? 0) > 0)
      .map((s) => ({ id: s.id, name: s.name, unit: s.unit, quantity: quantities[s.id], total: Number(s.price) * quantities[s.id] }));
    const subtotal = lines.reduce((sum, l) => sum + l.total, 0);
    const discount = promo ? Math.min(subtotal, Math.round((subtotal * promo.percent) / 100)) : 0;
    const shipping = deliveryMethod === 'PICKUP' ? SHIPPING_FEE : 0;
    return {
      lines,
      subtotal,
      discount,
      shipping,
      total: subtotal - discount + shipping,
      promoCode: promo?.code,
      deliveryMethod,
      address: address.trim(),
    };
  }, [services, quantities, promo, deliveryMethod, address]);

  const setQuantity = (id, value) => setQuantities((q) => ({ ...q, [id]: value }));

  // ---- promotion ----
  const applyPromo = async (rawCode = promoInput) => {
    const code = rawCode.trim().toUpperCase();
    if (!code) return;
    setPromoInput(code);
    setPromoChecking(true);
    setPromoMessage(null);
    try {
      const result = await checkPromotion(code, summary.subtotal);
      if (result.valid) {
        setPromo({ code: result.code, title: result.title, percent: Number(result.discountPercent) });
        setPromoMessage({ ok: true, text: `Áp dụng mã ${result.code}: giảm ${Number(result.discountPercent)}%` });
      } else {
        setPromo(null);
        setPromoMessage({ ok: false, text: result.message });
      }
    } catch (e) {
      setPromo(null);
      setPromoMessage({ ok: false, text: getErrorMessage(e) });
    } finally {
      setPromoChecking(false);
    }
  };

  const removePromo = () => {
    setPromo(null);
    setPromoMessage(null);
    setPromoInput('');
  };

  // ---- submit ----
  const composedNote = () => {
    const parts = [];
    if (returnAddress.trim()) parts.push(`Giao trả tại: ${returnAddress.trim()}`); // the backend has a single address field
    if (note.trim()) parts.push(note.trim());
    return parts.join('\n');
  };

  const openConfirm = () => {
    const next = {};
    if (summary.lines.length === 0) next.items = 'Vui lòng chọn ít nhất một dịch vụ';
    if (deliveryMethod === 'PICKUP' && !address.trim()) next.address = 'Vui lòng nhập địa chỉ lấy đồ';
    if (address.length > 500 || returnAddress.length > 500) next.address = 'Địa chỉ tối đa 500 ký tự';
    if (composedNote().length > 2000) next.note = 'Ghi chú quá dài (tối đa 2000 ký tự)';
    if (pickupTime && new Date(pickupTime) <= new Date()) next.pickupTime = 'Thời gian lấy đồ phải ở tương lai';
    setErrors(next);
    if (Object.keys(next).length > 0) {
      toast.warning(Object.values(next)[0]);
      return;
    }
    setSubmitError('');
    setConfirmOpen(true);
  };

  const placeOrder = async (method) => {
    setSubmitError('');
    setSubmitting(true);
    let order;
    try {
      order = await createOrder({
        items: summary.lines.map((l) => ({ serviceId: l.id, quantity: l.quantity })),
        deliveryMethod,
        shippingAddress: deliveryMethod === 'PICKUP' ? address.trim() : null,
        note: composedNote() || null,
        pickupTime: toBackendDateTime(pickupTime),
        promotionCode: promo?.code ?? null,
      });
    } catch (e) {
      setSubmitError(getErrorMessage(e));
      setSubmitting(false);
      return;
    }

    if (method === 'VNPAY') {
      try {
        await redirectToVnpay(order.id); // the browser leaves for VNPay
        return;
      } catch (e) {
        // the order exists; it can be paid later from "Đơn của tôi"
        toast.warning(`Đơn #${order.id} đã được tạo nhưng chưa mở được VNPay (${getErrorMessage(e)}). Bạn có thể thanh toán lại trong Đơn của tôi.`, 9000);
        navigate('/my-orders', { replace: true, state: { openOrderId: order.id } });
        return;
      }
    }
    toast.success(`Đặt giặt thành công! Mã đơn #${order.id}. Bạn thanh toán bằng tiền mặt khi nhận hàng.`, 7000);
    navigate('/my-orders', { replace: true, state: { openOrderId: order.id } });
  };

  // ---- render ----
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">Đặt giặt</h1>
      <p className="mt-1 text-sm text-gray-500">Chọn dịch vụ, nhập thông tin giao nhận và thanh toán trong vài bước.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* 1. services */}
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <h2 className="flex items-center gap-2 font-semibold text-gray-900"><Shirt className="h-5 w-5 text-blue-600" /> 1. Chọn dịch vụ</h2>
            {errors.items && <p className="mt-2 text-sm text-red-600">{errors.items}</p>}
            {servicesLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>
            ) : servicesError ? (
              <Alert variant="error" className="mt-3">
                {servicesError}{' '}
                <button type="button" onClick={loadServices} className="font-semibold underline">Thử lại</button>
              </Alert>
            ) : services.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">Hiện chưa có dịch vụ nào đang hoạt động.</p>
            ) : (
              <ul className="mt-3 divide-y divide-gray-100">
                {services.map((s) => {
                  const qty = quantities[s.id] ?? 0;
                  return (
                    <li key={s.id} className={`flex flex-wrap items-center gap-3 py-3 ${qty > 0 ? 'bg-blue-50/40' : ''}`}>
                      {s.imageUrl ? (
                        <img src={s.imageUrl} alt="" className="h-14 w-14 rounded-lg object-cover" />
                      ) : (
                        <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-blue-50 text-blue-500"><Shirt className="h-6 w-6" /></span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900">{s.name}</p>
                        <p className="text-sm text-blue-700">{formatVND(s.price)} / {s.unit}</p>
                        {s.description && <p className="line-clamp-1 text-xs text-gray-500">{s.description}</p>}
                      </div>
                      {qty > 0 ? (
                        <div className="text-right">
                          <QuantityControl value={qty} onChange={(v) => setQuantity(s.id, v)} />
                          <p className="mt-1 text-xs text-gray-500">{qty} {s.unit} = <span className="font-semibold text-gray-800">{formatVND(Number(s.price) * qty)}</span></p>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setQuantity(s.id, 1)} className="rounded-lg border border-blue-600 px-4 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50">Chọn</button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="mt-2 text-xs text-gray-400">Số lượng là số nguyên. Khối lượng sẽ được tiệm cân lại khi nhận đồ.</p>
          </section>

          {/* 2. delivery */}
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <h2 className="flex items-center gap-2 font-semibold text-gray-900"><Truck className="h-5 w-5 text-blue-600" /> 2. Giao nhận</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {[
                { value: 'PICKUP', icon: Truck, title: 'Nhân viên đến lấy đồ', desc: `Phí vận chuyển ${formatVND(SHIPPING_FEE)}` },
                { value: 'DROP_OFF', icon: Store, title: 'Tôi tự mang đến tiệm', desc: 'Miễn phí vận chuyển' },
              ].map(({ value, icon: Icon, title, desc }) => (
                <label key={value} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${deliveryMethod === value ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <input type="radio" name="delivery" value={value} checked={deliveryMethod === value} onChange={() => setDeliveryMethod(value)} className="mt-1" />
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                  <span><span className="block text-sm font-semibold text-gray-900">{title}</span><span className="block text-xs text-gray-500">{desc}</span></span>
                </label>
              ))}
            </div>

            <div className="mt-4 space-y-4">
              {deliveryMethod === 'PICKUP' ? (
                <div>
                  <label htmlFor="pickup-address" className="mb-1 block text-sm font-medium text-gray-700">Địa chỉ lấy đồ</label>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input id="pickup-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Số nhà, đường, phường, quận" className={`w-full rounded-lg border py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 ${errors.address ? 'border-red-400 focus:ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'}`} />
                  </div>
                  {errors.address && <p className="mt-1 text-xs text-red-600">{errors.address}</p>}
                </div>
              ) : (
                <Alert variant="info">Bạn mang đồ đến tiệm theo địa chỉ ở cuối trang. Đơn sẽ lưu địa chỉ tiệm.</Alert>
              )}

              <div>
                <label htmlFor="return-address" className="mb-1 block text-sm font-medium text-gray-700">Địa chỉ giao trả (nếu khác địa chỉ lấy đồ)</label>
                <input id="return-address" value={returnAddress} onChange={(e) => setReturnAddress(e.target.value)} placeholder="Để trống nếu giao trả cùng địa chỉ / tự đến lấy" className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
                <p className="mt-1 text-xs text-gray-400">Địa chỉ này được ghi vào ghi chú đơn hàng để nhân viên biết.</p>
              </div>

              <div>
                <label htmlFor="pickup-time" className="mb-1 block text-sm font-medium text-gray-700">Thời gian hẹn lấy đồ (không bắt buộc)</label>
                <input id="pickup-time" type="datetime-local" value={pickupTime} min={toDateTimeLocalValue(new Date(Date.now() + 30 * 60 * 1000))} onChange={(e) => setPickupTime(e.target.value)} className={`rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 ${errors.pickupTime ? 'border-red-400 focus:ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'}`} />
                {errors.pickupTime && <p className="mt-1 text-xs text-red-600">{errors.pickupTime}</p>}
              </div>

              <div>
                <label htmlFor="note" className="mb-1 block text-sm font-medium text-gray-700">Ghi chú</label>
                <textarea id="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ví dụ: đồ len giặt nhẹ, áo trắng tách riêng..." className="w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
                {errors.note && <p className="mt-1 text-xs text-red-600">{errors.note}</p>}
              </div>
            </div>
          </section>

          {/* 3. promotion */}
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <h2 className="flex items-center gap-2 font-semibold text-gray-900"><Tag className="h-5 w-5 text-blue-600" /> 3. Mã khuyến mãi</h2>
            {promo ? (
              <div className="mt-3 flex items-center justify-between rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> {promoMessage?.text}{promo.title ? ` — ${promo.title}` : ''}</span>
                <button type="button" onClick={removePromo} className="rounded p-1 hover:bg-green-100" aria-label="Bỏ mã"><X className="h-4 w-4" /></button>
              </div>
            ) : (
              <>
                <form onSubmit={(e) => { e.preventDefault(); applyPromo(); }} className="mt-3 flex gap-2">
                  <input value={promoInput} onChange={(e) => setPromoInput(e.target.value.toUpperCase())} placeholder="Nhập mã giảm giá" maxLength={50} className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm uppercase outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200" aria-label="Mã khuyến mãi" />
                  <button type="submit" disabled={promoChecking || !promoInput.trim()} className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50">
                    {promoChecking && <Loader2 className="h-4 w-4 animate-spin" />} Áp dụng
                  </button>
                </form>
                {promoMessage && !promoMessage.ok && <p className="mt-2 text-sm text-red-600">{promoMessage.text}</p>}
                {promotions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {promotions.map((p) => (
                      <button key={p.id} type="button" onClick={() => applyPromo(p.code)} className="rounded-full border border-dashed border-blue-400 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50" title={p.description || p.title}>
                        {p.code} · -{Number(p.discountPercent)}%
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        </div>

        {/* summary */}
        <aside className="lg:col-span-1">
          <div className="sticky top-20 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <h2 className="font-semibold text-gray-900">Tóm tắt đơn hàng</h2>
            {summary.lines.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">Chưa chọn dịch vụ nào</p>
            ) : (
              <ul className="mt-3 space-y-1 text-sm">
                {summary.lines.map((l) => (
                  <li key={l.id} className="flex justify-between gap-2">
                    <span className="text-gray-700">{l.name} × {l.quantity}</span>
                    <span className="shrink-0 font-medium">{formatVND(l.total)}</span>
                  </li>
                ))}
              </ul>
            )}
            <dl className="mt-4 space-y-1 border-t border-gray-100 pt-3 text-sm">
              <div className="flex justify-between"><dt className="text-gray-500">Tạm tính</dt><dd>{formatVND(summary.subtotal)}</dd></div>
              {summary.discount > 0 && <div className="flex justify-between text-green-700"><dt>Giảm giá ({summary.promoCode})</dt><dd>-{formatVND(summary.discount)}</dd></div>}
              <div className="flex justify-between"><dt className="text-gray-500">Phí vận chuyển</dt><dd>{formatVND(summary.shipping)}</dd></div>
              <div className="flex justify-between border-t border-gray-100 pt-2 text-lg font-bold"><dt>Tổng cộng</dt><dd className="text-blue-700">{formatVND(summary.total)}</dd></div>
            </dl>
            <button type="button" onClick={openConfirm} className="mt-4 w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700">
              Tiếp tục
            </button>
            <p className="mt-2 text-center text-xs text-gray-400">Số tiền cuối cùng do hệ thống tính khi tạo đơn.</p>
          </div>
        </aside>
      </div>

      {confirmOpen && (
        <OrderConfirmModal summary={summary} submitting={submitting} error={submitError} onConfirm={placeOrder} onClose={() => setConfirmOpen(false)} />
      )}
    </div>
  );
}
