import { useEffect, useState } from 'react';
import { KeyRound, Lock, MapPin, Phone, ShieldCheck, User } from 'lucide-react';
import { changePassword, fetchProfile, updateProfile } from '../api/profileApi';
import { getErrorMessage } from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS } from '../config/navigation';
import { Alert, useToast } from '../components/common/Toast';
import Field from '../components/auth/Field';
import SubmitButton from '../components/auth/SubmitButton';

const PHONE_RE = /^[0-9+\-\s]{8,20}$/;

function Card({ icon: Icon, title, children }) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900"><Icon className="h-5 w-5 text-blue-600" /> {title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ProfileForm({ profile, onSaved }) {
  const toast = useToast();
  const hasContact = profile.role !== 'ADMIN'; // an admin account has no phone / address on the server
  const [form, setForm] = useState({ fullName: profile.fullName ?? '', phone: profile.phone ?? '', address: profile.address ?? '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (name) => (event) => {
    setForm((f) => ({ ...f, [name]: event.target.value }));
    setErrors((e) => ({ ...e, [name]: undefined }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    const next = {};
    if (!form.fullName.trim()) next.fullName = 'Họ tên không được để trống';
    if (hasContact && form.phone.trim() && !PHONE_RE.test(form.phone.trim())) next.phone = 'Số điện thoại không hợp lệ';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    try {
      const saved = await updateProfile({
        fullName: form.fullName.trim(),
        phone: hasContact ? form.phone.trim() : '',
        address: hasContact ? form.address.trim() : '',
      });
      toast.success('Đã cập nhật hồ sơ');
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
    <form onSubmit={submit} className="space-y-4" noValidate>
      {error && <Alert variant="error">{error}</Alert>}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="profile-email">Email (không thể thay đổi)</label>
        <input id="profile-email" value={profile.email} disabled className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-500" />
      </div>
      <Field label="Họ và tên" icon={User} value={form.fullName} onChange={set('fullName')} error={errors.fullName} autoComplete="name" />
      {hasContact && (
        <>
          <Field label="Số điện thoại" icon={Phone} type="tel" value={form.phone} onChange={set('phone')} error={errors.phone} autoComplete="tel" />
          <Field label="Địa chỉ mặc định" icon={MapPin} value={form.address} onChange={set('address')} error={errors.address} autoComplete="street-address"
            hint={profile.role === 'CUSTOMER' ? 'Được điền sẵn khi bạn đặt giặt với hình thức giao nhận tận nơi.' : undefined} />
        </>
      )}
      <div className="sm:w-48"><SubmitButton loading={saving}>Lưu thay đổi</SubmitButton></div>
    </form>
  );
}

function PasswordForm() {
  const toast = useToast();
  const empty = { currentPassword: '', newPassword: '', confirmPassword: '' };
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (name) => (event) => {
    setForm((f) => ({ ...f, [name]: event.target.value }));
    setErrors((e) => ({ ...e, [name]: undefined }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    const next = {};
    if (!form.currentPassword) next.currentPassword = 'Vui lòng nhập mật khẩu hiện tại';
    if (form.newPassword.length < 6 || form.newPassword.length > 72) next.newPassword = 'Mật khẩu mới phải từ 6 đến 72 ký tự';
    else if (form.newPassword === form.currentPassword) next.newPassword = 'Mật khẩu mới phải khác mật khẩu hiện tại';
    if (form.confirmPassword !== form.newPassword) next.confirmPassword = 'Mật khẩu nhập lại không khớp';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    try {
      await changePassword(form);
      toast.success('Đã đổi mật khẩu');
      setForm(empty);
    } catch (e) {
      const fieldErrors = e.response?.data?.errors;
      if (e.response?.status === 400 && fieldErrors) setErrors(fieldErrors);
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {error && <Alert variant="error">{error}</Alert>}
      <Field label="Mật khẩu hiện tại" icon={Lock} type="password" autoComplete="current-password" value={form.currentPassword} onChange={set('currentPassword')} error={errors.currentPassword} />
      <Field label="Mật khẩu mới" icon={KeyRound} type="password" autoComplete="new-password" value={form.newPassword} onChange={set('newPassword')} error={errors.newPassword} hint="6 đến 72 ký tự." />
      <Field label="Nhập lại mật khẩu mới" icon={KeyRound} type="password" autoComplete="new-password" value={form.confirmPassword} onChange={set('confirmPassword')} error={errors.confirmPassword} />
      <div className="sm:w-48"><SubmitButton loading={saving}>Đổi mật khẩu</SubmitButton></div>
    </form>
  );
}

export default function ProfilePage() {
  const { updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchProfile()
      .then((p) => !cancelled && setProfile(p))
      .catch((e) => !cancelled && setError(getErrorMessage(e)));
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSaved = (saved) => {
    setProfile(saved);
    updateUser(saved); // Navbar and the booking form read the user from the auth context
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Hồ sơ cá nhân</h1>
        {profile && <p className="mt-1 text-sm text-gray-500">{ROLE_LABELS[profile.role] ?? profile.role} · {profile.email}</p>}
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {!profile && !error && <div className="h-64 animate-pulse rounded-2xl bg-gray-100" />}

      {profile && (
        <>
          <Card icon={User} title="Thông tin tài khoản"><ProfileForm profile={profile} onSaved={handleSaved} /></Card>
          <Card icon={ShieldCheck} title="Đổi mật khẩu">
            {profile.authProvider === 'GOOGLE'
              ? <Alert variant="info">Tài khoản của bạn đăng nhập bằng Google nên không có mật khẩu để đổi.</Alert>
              : <PasswordForm />}
          </Card>
        </>
      )}
    </div>
  );
}
