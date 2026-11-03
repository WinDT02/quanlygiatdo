import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, KeyRound, Lock, Mail, RefreshCw } from 'lucide-react';
import axiosClient, { getErrorMessage } from '../api/axiosClient';
import useCountdown from '../hooks/useCountdown';
import { Alert, useToast } from '../components/common/Toast';
import AuthLayout from '../components/auth/AuthLayout';
import Field from '../components/auth/Field';
import OtpInput from '../components/auth/OtpInput';
import SubmitButton from '../components/auth/SubmitButton';

const RESEND_SECONDS = 60;

/**
 * Step 1: e-mail -> POST /auth/forgot-password (always answers 200, even for unknown e-mails).
 * Step 2: code + new password -> POST /auth/reset-password, then back to /login with the e-mail filled in.
 */
export default function ForgotPassword() {
  const navigate = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState('email'); // 'email' | 'reset'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const { seconds, start } = useCountdown(0);

  const requestCode = async (event) => {
    event.preventDefault();
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFieldErrors({ email: 'Email không hợp lệ' });
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      await axiosClient.post('/auth/forgot-password', { email: email.trim() });
      start(RESEND_SECONDS);
      setStep('reset');
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const resendCode = async () => {
    setError('');
    setResending(true);
    try {
      await axiosClient.post('/auth/forgot-password', { email: email.trim() });
      toast.success('Nếu email tồn tại, mã OTP mới đã được gửi');
      setOtp('');
      start(RESEND_SECONDS);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setResending(false);
    }
  };

  const resetPassword = async (event) => {
    event.preventDefault();
    setError('');

    const errors = {};
    if (otp.length !== 6) errors.otp = 'Vui lòng nhập đủ 6 chữ số';
    if (newPassword.length < 6 || newPassword.length > 72) errors.newPassword = 'Mật khẩu phải từ 6 đến 72 ký tự';
    if (confirmPassword !== newPassword) errors.confirmPassword = 'Mật khẩu nhập lại không khớp';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      await axiosClient.post('/auth/reset-password', {
        email: email.trim(),
        otp,
        newPassword,
        confirmPassword,
      });
      navigate('/login', {
        replace: true,
        state: { email: email.trim(), notice: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.' },
      });
    } catch (e) {
      setError(getErrorMessage(e));
      if (e.response?.status === 400 && /OTP/.test(e.response.data?.message ?? '')) setOtp(''); // wrong / expired code
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'email') {
    return (
      <AuthLayout
        title="Quên mật khẩu"
        subtitle="Nhập email đã đăng ký, chúng tôi sẽ gửi mã OTP để đặt lại mật khẩu"
        footer={
          <Link to="/login" className="inline-flex items-center gap-1 font-medium text-blue-600 hover:underline">
            <ArrowLeft className="h-4 w-4" />
            Quay lại đăng nhập
          </Link>
        }
      >
        <form onSubmit={requestCode} className="space-y-4" noValidate>
          {error && <Alert variant="error">{error}</Alert>}
          <Field
            label="Email"
            icon={Mail}
            type="email"
            autoComplete="email"
            placeholder="ban@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email}
          />
          <SubmitButton loading={submitting}>Gửi mã OTP</SubmitButton>
        </form>
        <p className="mt-4 text-center text-xs text-gray-400">Tài khoản đăng ký bằng Google không có mật khẩu để đặt lại.</p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Đặt lại mật khẩu" subtitle="Nhập mã OTP và mật khẩu mới">
      <form onSubmit={resetPassword} className="space-y-4" noValidate>
        <Alert variant="info">
          Nếu <span className="font-semibold">{email.trim()}</span> đã đăng ký, một mã OTP 6 chữ số đã được gửi tới (hiệu lực 5 phút).
        </Alert>
        {error && <Alert variant="error">{error}</Alert>}

        <div>
          <p className="mb-2 flex items-center justify-center gap-1 text-sm font-medium text-gray-700">
            <KeyRound className="h-4 w-4" />
            Mã OTP
          </p>
          <OtpInput value={otp} onChange={setOtp} disabled={submitting} />
          {fieldErrors.otp && <p className="mt-1 text-center text-xs text-red-600">{fieldErrors.otp}</p>}
        </div>

        <Field label="Mật khẩu mới" icon={Lock} type="password" autoComplete="new-password" placeholder="Từ 6 ký tự" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} error={fieldErrors.newPassword} />
        <Field label="Nhập lại mật khẩu mới" icon={Lock} type="password" autoComplete="new-password" placeholder="Nhập lại mật khẩu mới" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} error={fieldErrors.confirmPassword} />

        <SubmitButton loading={submitting}>Đặt lại mật khẩu</SubmitButton>

        <div className="flex items-center justify-between text-sm">
          <button type="button" onClick={() => { setStep('email'); setError(''); setOtp(''); }} className="flex items-center gap-1 text-gray-500 hover:text-gray-800">
            <ArrowLeft className="h-4 w-4" />
            Đổi email
          </button>
          <button
            type="button"
            onClick={resendCode}
            disabled={seconds > 0 || resending || submitting}
            className="flex items-center gap-1 font-medium text-blue-600 hover:underline disabled:cursor-not-allowed disabled:text-gray-400 disabled:no-underline"
          >
            <RefreshCw className={`h-4 w-4 ${resending ? 'animate-spin' : ''}`} />
            {seconds > 0 ? `Gửi lại mã (${seconds}s)` : 'Gửi lại mã'}
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}
