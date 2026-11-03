import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Lock, Mail } from 'lucide-react';
import axiosClient, { getErrorMessage } from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import { Alert } from '../components/common/Toast';
import AuthLayout from '../components/auth/AuthLayout';
import Field from '../components/auth/Field';
import GoogleLoginButton from '../components/auth/GoogleLoginButton';
import SubmitButton from '../components/auth/SubmitButton';
import VerifyOtpPanel from '../components/auth/VerifyOtpPanel';

const NOT_ACTIVATED = 'chưa được kích hoạt'; // the 403 message of POST /auth/login for an unverified account

/**
 * E-mail/password login + Google. A 403 "not activated" switches the card to the OTP form (no need to register again).
 * After success GuestRoute redirects, so this page only calls loginSuccess().
 */
export default function Login() {
  const { loginSuccess } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email ?? '');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [verifyEmail, setVerifyEmail] = useState(null); // set -> show the OTP form for this e-mail

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    const trimmed = email.trim();
    try {
      loginSuccess(await axiosClient.post('/auth/login', { email: trimmed, password }));
    } catch (e) {
      if (e.response?.status === 403 && e.response.data?.message?.includes(NOT_ACTIVATED)) {
        setVerifyEmail(trimmed.toLowerCase());
      } else {
        setError(getErrorMessage(e));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (verifyEmail) {
    return (
      <AuthLayout title="Xác thực tài khoản" subtitle="Tài khoản của bạn chưa được kích hoạt">
        <VerifyOtpPanel
          email={verifyEmail}
          initialCooldown={0}
          notice="Hãy nhập mã OTP đã gửi khi đăng ký, hoặc bấm “Gửi lại mã” để nhận mã mới."
          onVerified={loginSuccess}
          onBack={() => setVerifyEmail(null)}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Đăng nhập"
      subtitle="Chào mừng bạn quay lại"
      footer={
        <>
          Chưa có tài khoản?{' '}
          <Link to="/register" state={location.state} className="font-medium text-blue-600 hover:underline">
            Đăng ký ngay
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {location.state?.notice && <Alert variant="success">{location.state.notice}</Alert>}
        {error && <Alert variant="error">{error}</Alert>}

        <Field
          label="Email"
          icon={Mail}
          type="email"
          autoComplete="email"
          placeholder="ban@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <div>
          <Field
            label="Mật khẩu"
            icon={Lock}
            type="password"
            autoComplete="current-password"
            placeholder="Nhập mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div className="mt-1 text-right">
            <Link to="/forgot-password" className="text-xs font-medium text-blue-600 hover:underline">
              Quên mật khẩu?
            </Link>
          </div>
        </div>

        <SubmitButton loading={submitting} disabled={!email.trim() || !password}>
          Đăng nhập
        </SubmitButton>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-gray-400">
        <span className="h-px flex-1 bg-gray-200" />
        hoặc
        <span className="h-px flex-1 bg-gray-200" />
      </div>

      <GoogleLoginButton onSuccess={loginSuccess} onError={setError} />
    </AuthLayout>
  );
}
