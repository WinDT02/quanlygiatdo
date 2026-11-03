import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Lock, Mail, MapPin, Phone, User } from 'lucide-react';
import axiosClient, { getErrorMessage } from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import { Alert } from '../components/common/Toast';
import AuthLayout from '../components/auth/AuthLayout';
import Field from '../components/auth/Field';
import GoogleLoginButton from '../components/auth/GoogleLoginButton';
import SubmitButton from '../components/auth/SubmitButton';
import VerifyOtpPanel from '../components/auth/VerifyOtpPanel';

const EMPTY_FORM = { fullName: '', email: '', phone: '', address: '', password: '', confirmPassword: '' };
const PENDING_VERIFY = 'chưa xác thực'; // the 409 message of POST /auth/register for an e-mail waiting for its OTP

/** Same rules as the backend's RegisterRequest, so most mistakes are caught before the request is sent. */
function validate(form) {
  const errors = {};
  if (!form.fullName.trim()) errors.fullName = 'Họ tên không được để trống';
  else if (form.fullName.trim().length > 255) errors.fullName = 'Họ tên tối đa 255 ký tự';

  if (!form.email.trim()) errors.email = 'Email không được để trống';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Email không hợp lệ';

  if (form.phone.trim() && !/^[0-9+\-\s]{8,20}$/.test(form.phone.trim())) errors.phone = 'Số điện thoại không hợp lệ';
  if (form.address.length > 500) errors.address = 'Địa chỉ tối đa 500 ký tự';

  if (!form.password) errors.password = 'Mật khẩu không được để trống';
  else if (form.password.length < 6 || form.password.length > 72) errors.password = 'Mật khẩu phải từ 6 đến 72 ký tự';

  if (!form.confirmPassword) errors.confirmPassword = 'Vui lòng nhập lại mật khẩu';
  else if (form.confirmPassword !== form.password) errors.confirmPassword = 'Mật khẩu nhập lại không khớp';
  return errors;
}

/**
 * Step 1: details -> POST /auth/register (creates a PENDING account and e-mails a code, no token).
 * Step 2: 6-digit code -> POST /auth/verify-register (activates the account and returns the token).
 */
export default function Register() {
  const { loginSuccess } = useAuth();
  const location = useLocation();
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [pendingEmail, setPendingEmail] = useState(false); // e-mail already registered but not verified
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState('form'); // 'form' | 'verify'
  const [justSent, setJustSent] = useState(false); // true when a code was sent a moment ago (-> resend cooldown)

  const update = (name) => (event) => {
    setForm((f) => ({ ...f, [name]: event.target.value }));
    setFieldErrors((errs) => ({ ...errs, [name]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setPendingEmail(false);

    const errors = validate(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      await axiosClient.post('/auth/register', {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword,
        phone: form.phone.trim(),
        address: form.address.trim(),
      });
      setJustSent(true);
      setStep('verify');
    } catch (e) {
      const data = e.response?.data;
      if (e.response?.status === 400 && data?.errors && Object.keys(data.errors).length > 0) {
        setFieldErrors(data.errors); // field-level messages from the backend validation
      }
      if (e.response?.status === 409 && data?.message?.includes(PENDING_VERIFY)) {
        setPendingEmail(true);
      }
      setError(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const goToVerify = () => {
    setJustSent(false); // no fresh code -> "Gửi lại mã" available immediately
    setError('');
    setStep('verify');
  };

  if (step === 'verify') {
    return (
      <AuthLayout title="Xác thực email" subtitle="Bước cuối để kích hoạt tài khoản">
        <VerifyOtpPanel
          email={form.email.trim().toLowerCase()}
          initialCooldown={justSent ? 60 : 0}
          onVerified={loginSuccess}
          onBack={() => setStep('form')}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Tạo tài khoản"
      subtitle="Đăng ký để đặt giặt và theo dõi đơn hàng"
      footer={
        <>
          Đã có tài khoản?{' '}
          <Link to="/login" state={location.state} className="font-medium text-blue-600 hover:underline">
            Đăng nhập
          </Link>
        </>
      }
    >
      <GoogleLoginButton text="signup_with" onSuccess={loginSuccess} onError={setError} />

      <div className="my-5 flex items-center gap-3 text-xs text-gray-400">
        <span className="h-px flex-1 bg-gray-200" />
        hoặc đăng ký bằng email
        <span className="h-px flex-1 bg-gray-200" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && (
          <Alert variant={pendingEmail ? 'warning' : 'error'}>
            {error}
            {pendingEmail && (
              <button type="button" onClick={goToVerify} className="mt-1 block font-semibold underline">
                Nhập mã xác thực
              </button>
            )}
          </Alert>
        )}

        <Field label="Họ và tên" icon={User} autoComplete="name" placeholder="Nguyễn Văn A" value={form.fullName} onChange={update('fullName')} error={fieldErrors.fullName} />
        <Field label="Email" icon={Mail} type="email" autoComplete="email" placeholder="ban@example.com" value={form.email} onChange={update('email')} error={fieldErrors.email} />
        <Field label="Số điện thoại (không bắt buộc)" icon={Phone} type="tel" autoComplete="tel" placeholder="0912345678" value={form.phone} onChange={update('phone')} error={fieldErrors.phone} />
        <Field label="Địa chỉ (không bắt buộc)" icon={MapPin} autoComplete="street-address" placeholder="Số nhà, đường, phường, quận" value={form.address} onChange={update('address')} error={fieldErrors.address} />
        <Field label="Mật khẩu" icon={Lock} type="password" autoComplete="new-password" placeholder="Từ 6 ký tự" value={form.password} onChange={update('password')} error={fieldErrors.password} />
        <Field label="Nhập lại mật khẩu" icon={Lock} type="password" autoComplete="new-password" placeholder="Nhập lại mật khẩu" value={form.confirmPassword} onChange={update('confirmPassword')} error={fieldErrors.confirmPassword} />

        <SubmitButton loading={submitting}>Đăng ký</SubmitButton>
      </form>
    </AuthLayout>
  );
}
