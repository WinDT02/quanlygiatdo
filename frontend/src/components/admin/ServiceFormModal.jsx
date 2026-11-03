import { useState } from 'react';
import { createService, updateService } from '../../api/adminApi';
import { getErrorMessage } from '../../api/axiosClient';
import Modal from '../common/Modal';
import { Alert, useToast } from '../common/Toast';
import SubmitButton from '../auth/SubmitButton';

const inputClass = (hasError) =>
  `mt-1 w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 ${hasError ? 'border-red-400 focus:ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'}`;

/** Create (service = null) or edit a laundry service. Field errors from the backend validation are shown under each box. */
export default function ServiceFormModal({ service, onClose, onSaved }) {
  const toast = useToast();
  const editing = Boolean(service);
  const [form, setForm] = useState({
    name: service?.name ?? '',
    price: service ? String(service.price) : '',
    unit: service?.unit ?? 'kg',
    description: service?.description ?? '',
    imageUrl: service?.imageUrl ?? '',
    status: service?.status ?? 'ACTIVE',
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
    if (!form.name.trim()) next.name = 'Tên dịch vụ không được để trống';
    const price = Number(form.price);
    if (!form.price || !(price > 0)) next.price = 'Đơn giá phải lớn hơn 0';
    else if (price > 9999999999) next.price = 'Đơn giá quá lớn';
    if (!form.unit.trim()) next.unit = 'Đơn vị tính không được để trống';
    return next;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const body = {
      name: form.name.trim(),
      price: Number(form.price),
      unit: form.unit.trim(),
      description: form.description.trim() || null,
      imageUrl: form.imageUrl.trim() || null,
      status: form.status,
    };
    setSaving(true);
    try {
      const saved = editing ? await updateService(service.id, body) : await createService(body);
      toast.success(editing ? 'Đã cập nhật dịch vụ' : 'Đã thêm dịch vụ mới');
      onSaved(saved);
    } catch (e) {
      const fieldErrors = e.response?.data?.errors;
      if (e.response?.status === 400 && fieldErrors) setErrors(fieldErrors);
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={editing ? `Sửa dịch vụ #${service.id}` : 'Thêm dịch vụ'} onClose={onClose} closeDisabled={saving}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && <Alert variant="error">{error}</Alert>}

        <label className="block text-sm font-medium text-gray-700">
          Tên dịch vụ
          <input value={form.name} onChange={set('name')} maxLength={255} placeholder="Ví dụ: Giặt sấy thường" className={inputClass(errors.name)} />
          {errors.name && <span className="mt-1 block text-xs font-normal text-red-600">{errors.name}</span>}
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium text-gray-700">
            Đơn giá (VNĐ)
            <input type="number" min="0" step="500" inputMode="numeric" value={form.price} onChange={set('price')} placeholder="15000" className={inputClass(errors.price)} />
            {errors.price && <span className="mt-1 block text-xs font-normal text-red-600">{errors.price}</span>}
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Đơn vị tính
            <input list="service-units" value={form.unit} onChange={set('unit')} maxLength={50} className={inputClass(errors.unit)} />
            <datalist id="service-units"><option value="kg" /><option value="cái" /><option value="bộ" /></datalist>
            {errors.unit && <span className="mt-1 block text-xs font-normal text-red-600">{errors.unit}</span>}
          </label>
        </div>

        <label className="block text-sm font-medium text-gray-700">
          Mô tả
          <textarea value={form.description} onChange={set('description')} rows={3} placeholder="Mô tả ngắn về dịch vụ" className={inputClass(false)} />
        </label>

        <label className="block text-sm font-medium text-gray-700">
          Đường dẫn ảnh (không bắt buộc)
          <input value={form.imageUrl} onChange={set('imageUrl')} maxLength={500} placeholder="https://..." className={inputClass(errors.imageUrl)} />
          {errors.imageUrl && <span className="mt-1 block text-xs font-normal text-red-600">{errors.imageUrl}</span>}
        </label>

        <label className="block text-sm font-medium text-gray-700">
          Trạng thái
          <select value={form.status} onChange={set('status')} className={inputClass(false)}>
            <option value="ACTIVE">Đang bán (ACTIVE)</option>
            <option value="INACTIVE">Tạm ngưng (INACTIVE)</option>
          </select>
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100">Hủy</button>
          <div className="w-36"><SubmitButton loading={saving}>{editing ? 'Lưu thay đổi' : 'Thêm dịch vụ'}</SubmitButton></div>
        </div>
      </form>
    </Modal>
  );
}
