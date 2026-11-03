import { useState } from 'react';
import { Lock, Mail, MapPin, Phone, User } from 'lucide-react';
import { createEmployee } from '../../api/adminApi';
import { getErrorMessage } from '../../api/axiosClient';
import Modal from '../common/Modal';
import { Alert } from '../common/Toast';
import Field from '../auth/Field';
import SubmitButton from '../auth/SubmitButton';

/** Creates a login account with role EMPLOYEE. Leave the password empty and the server generates one. */
export default function EmployeeFormModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', address: '', password: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (name) => (event) => {
    setForm((f) => ({ ...f, [name]: event.target.value }));
    setErrors((e) => ({ ...e, [name]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    const next = {};
    if (!form.fullName.trim()) next.fullName = 'Họ tên không được để trống';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Email không hợp lệ';
    if (form.phone.trim() && !/^[0-9+\-\s]{8,20}$/.test(form.phone.trim())) next.phone = 'Số điện thoại không hợp lệ';
    if (form.password && (form.password.length < 6 || form.password.length > 72)) next.password = 'Mật khẩu phải từ 6 đến 72 ký tự';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    try {
      const result = await createEmployee({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
      });
      onCreated(result);
    } catch (e) {
      const fieldErrors = e.response?.data?.errors;
      if (e.response?.status === 400 && fieldErrors) setErrors(fieldErrors);
      if (e.response?.status === 409) setErrors({ email: getErrorMessage(e) });
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Thêm nhân viên" onClose={onClose} closeDisabled={saving}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && <Alert variant="error">{error}</Alert>}
        <Field label="Họ và tên" icon={User} value={form.fullName} onChange={set('fullName')} error={errors.fullName} placeholder="Nguyễn Văn A" />
        <Field label="Email đăng nhập" icon={Mail} type="email" value={form.email} onChange={set('email')} error={errors.email} placeholder="nhanvien@example.com" />
        <Field label="Số điện thoại (không bắt buộc)" icon={Phone} type="tel" value={form.phone} onChange={set('phone')} error={errors.phone} />
        <Field label="Địa chỉ (không bắt buộc)" icon={MapPin} value={form.address} onChange={set('address')} error={errors.address} />
        <Field label="Mật khẩu (không bắt buộc)" icon={Lock} type="password" autoComplete="new-password" value={form.password} onChange={set('password')} error={errors.password} hint="Để trống để hệ thống tự tạo mật khẩu ngẫu nhiên và hiển thị một lần." />
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100">Hủy</button>
          <div className="w-40"><SubmitButton loading={saving}>Tạo tài khoản</SubmitButton></div>
        </div>
      </form>
    </Modal>
  );
}
