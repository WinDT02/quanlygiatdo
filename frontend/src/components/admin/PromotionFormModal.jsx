import { useState } from 'react';
import { createPromotion, updatePromotion } from '../../api/adminApi';
import { getErrorMessage } from '../../api/axiosClient';
import { toBackendDateTime, toDateTimeLocalValue } from '../../utils/format';
import Modal from '../common/Modal';
import { Alert, useToast } from '../common/Toast';
import SubmitButton from '../auth/SubmitButton';

const inputClass = (hasError) =>
  `mt-1 w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 ${hasError ? 'border-red-400 focus:ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'}`;

const localValue = (iso) => (iso ? iso.slice(0, 16) : '');

/** Create (promotion = null) or edit a promotion. The backend discount model is a percentage (0-100]. */
export default function PromotionFormModal({ promotion, onClose, onSaved }) {
  const toast = useToast();
  const editing = Boolean(promotion);
  const now = new Date();
  const inThirtyDays = new Date(now.getTime() + 30 * 24 * 3600 * 1000);
  const [form, setForm] = useState({
    code: promotion?.code ?? '',
    title: promotion?.title ?? '',
    subtitle: promotion?.subtitle ?? '',
    description: promotion?.description ?? '',
    type: promotion?.type ?? 'PROMOTION',
    discountPercent: promotion ? String(promotion.discountPercent) : '',
    startDate: promotion ? localValue(promotion.startDate) : toDateTimeLocalValue(now),
    endDate: promotion ? localValue(promotion.endDate) : toDateTimeLocalValue(inThirtyDays),
    active: promotion?.active ?? true,
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (name) => (event) => {
    setForm((f) => ({ ...f, [name]: event.target.value }));
    setErrors((e) => ({ ...e, [name]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (!/^[A-Za-z0-9_-]{3,50}$/.test(form.code.trim())) next.code = 'Mã gồm chữ, số, gạch ngang/gạch dưới, dài 3-50 ký tự';
    const pct = Number(form.discountPercent);
    if (!form.discountPercent || !(pct > 0) || pct > 100) next.discountPercent = 'Phần trăm giảm phải lớn hơn 0 và tối đa 100';
    if (!form.startDate) next.startDate = 'Chọn ngày bắt đầu';
    if (!form.endDate) next.endDate = 'Chọn ngày kết thúc';
    else if (form.startDate && form.endDate < form.startDate) next.endDate = 'Ngày kết thúc phải sau ngày bắt đầu';
    return next;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const body = {
      code: form.code.trim().toUpperCase(),
      title: form.title.trim() || null,
      subtitle: form.subtitle.trim() || null,
      description: form.description.trim() || null,
      type: form.type,
      discountPercent: Number(form.discountPercent),
      startDate: toBackendDateTime(form.startDate),
      endDate: toBackendDateTime(form.endDate),
      active: form.active,
    };
    setSaving(true);
    try {
      const saved = editing ? await updatePromotion(promotion.id, body) : await createPromotion(body);
      toast.success(editing ? 'Đã cập nhật mã giảm giá' : 'Đã tạo mã giảm giá');
      onSaved(saved);
    } catch (e) {
      const fieldErrors = e.response?.data?.errors;
      if (e.response?.status === 400 && fieldErrors) setErrors(fieldErrors);
      if (e.response?.status === 409) setErrors({ code: getErrorMessage(e) });
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const fieldError = (name) => errors[name] && <span className="mt-1 block text-xs font-normal text-red-600">{errors[name]}</span>;

  return (
    <Modal title={editing ? `Sửa mã ${promotion.code}` : 'Thêm mã giảm giá'} onClose={onClose} closeDisabled={saving}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && <Alert variant="error">{error}</Alert>}

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium text-gray-700">
            Mã giảm giá
            <input value={form.code} onChange={set('code')} maxLength={50} placeholder="WELCOME20" className={`${inputClass(errors.code)} font-mono uppercase`} />
            {fieldError('code')}
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Giảm (%)
            <input type="number" min="0" max="100" step="1" inputMode="decimal" value={form.discountPercent} onChange={set('discountPercent')} placeholder="20" className={inputClass(errors.discountPercent)} />
            {fieldError('discountPercent')}
          </label>
        </div>

        <label className="block text-sm font-medium text-gray-700">
          Tiêu đề (không bắt buộc)
          <input value={form.title} onChange={set('title')} maxLength={200} placeholder="Giảm 20% cho khách mới" className={inputClass(errors.title)} />
          {fieldError('title')}
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Phụ đề (không bắt buộc)
          <input value={form.subtitle} onChange={set('subtitle')} maxLength={200} className={inputClass(errors.subtitle)} />
          {fieldError('subtitle')}
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Mô tả (không bắt buộc)
          <textarea value={form.description} onChange={set('description')} rows={2} className={inputClass(false)} />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium text-gray-700">
            Bắt đầu
            <input type="datetime-local" value={form.startDate} onChange={set('startDate')} className={inputClass(errors.startDate)} />
            {fieldError('startDate')}
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Hết hạn
            <input type="datetime-local" value={form.endDate} onChange={set('endDate')} className={inputClass(errors.endDate)} />
            {fieldError('endDate')}
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium text-gray-700">
            Loại
            <select value={form.type} onChange={set('type')} className={inputClass(false)}>
              <option value="PROMOTION">Khuyến mãi (PROMOTION)</option>
              <option value="EVENT">Sự kiện (EVENT)</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Trạng thái
            <select value={form.active ? 'on' : 'off'} onChange={(e) => setForm((f) => ({ ...f, active: e.target.value === 'on' }))} className={inputClass(false)}>
              <option value="on">Bật</option>
              <option value="off">Tắt</option>
            </select>
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100">Hủy</button>
          <div className="w-36"><SubmitButton loading={saving}>{editing ? 'Lưu thay đổi' : 'Tạo mã'}</SubmitButton></div>
        </div>
      </form>
    </Modal>
  );
}
