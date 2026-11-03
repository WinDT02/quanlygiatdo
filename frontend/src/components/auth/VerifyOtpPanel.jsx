import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, MailCheck, RefreshCw } from 'lucide-react';
import axiosClient, { getErrorMessage } from '../../api/axiosClient';
import useCountdown from '../../hooks/useCountdown';
import { Alert, useToast } from '../common/Toast';
import OtpInput from './OtpInput';
import SubmitButton from './SubmitButton';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

/**
 * "Enter the 6-digit code we e-mailed you" step of the registration.
 * Used by Register (right after signing up) and by Login (account exists but is not activated yet).
 *
 *  - POST /auth/verify-register {email, otp}  -> AuthResponse, handed to `onVerified`
 *  - POST /auth/resend-register-otp {email}   -> new code; the server allows one per 60 s (else 429)
 *
 * @param initialCooldown seconds before "Gửi lại mã" is enabled: 60 right after sending a code, 0 when the user
 *                        arrives without having just received one (e.g. from the login page).
 */
export default function VerifyOtpPanel({ email, onVerified, onBack, initialCooldown = RESEND_SECONDS, notice }) {
  const toast = useToast();
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const { seconds, start } = useCountdown(initialCooldown);
  const submittedFor = useRef('');

  const verify = async (code) => {
    setError('');
    setVerifying(true);
    try {
      const authResponse = await axiosClient.post('/auth/verify-register', { email, otp: code });
      onVerified(authResponse);
    } catch (e) {
      setError(getErrorMessage(e));
      setOtp('');
      submittedFor.current = '';
    } finally {
      setVerifying(false);
    }
  };

  // submit by itself as soon as the 6th digit is in (the button below stays for people who prefer it)
  useEffect(() => {
    if (otp.length === OTP_LENGTH && submittedFor.current !== otp && !verifying) {
      submittedFor.current = otp;
      verify(otp);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (otp.length !== OTP_LENGTH) {
      setError('Vui lòng nhập đủ 6 chữ số');
      return;
    }
    if (submittedFor.current !== otp) {
      submittedFor.current = otp;
      verify(otp);
    }
  };

  const handleResend = async () => {
    setError('');
    setResending(true);
    try {
      await axiosClient.post('/auth/resend-register-otp', { email });
      toast.success('Đã gửi lại mã OTP, vui lòng kiểm tra email');
      setOtp('');
      submittedFor.current = '';
      start(RESEND_SECONDS);
    } catch (e) {
      setError(getErrorMessage(e));
      if (e.response?.status === 429) {
        // "Vui lòng đợi 42 giây trước khi ..." -> continue the countdown from the server's number
        const wait = Number(e.response.data?.message?.match(/\d+/)?.[0]);
        start(Number.isFinite(wait) && wait > 0 ? wait : RESEND_SECONDS);
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <MailCheck className="h-6 w-6" />
        </span>
        <p className="mt-3 text-sm text-gray-600">
          Mã xác thực gồm 6 chữ số đã được gửi tới
          <br />
          <span className="font-semibold text-gray-900">{email}</span>
        </p>
        <p className="mt-1 text-xs text-gray-400">Mã có hiệu lực trong 5 phút. Hãy kiểm tra cả hộp thư Spam.</p>
      </div>

      {notice && <Alert variant="warning">{notice}</Alert>}
      {error && <Alert variant="error">{error}</Alert>}

      <OtpInput value={otp} onChange={setOtp} disabled={verifying} />

      <SubmitButton loading={verifying}>Xác thực</SubmitButton>

      <div className="flex items-center justify-between text-sm">
        {onBack ? (
          <button type="button" onClick={onBack} className="flex items-center gap-1 text-gray-500 hover:text-gray-800">
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={handleResend}
          disabled={seconds > 0 || resending || verifying}
          className="flex items-center gap-1 font-medium text-blue-600 hover:underline disabled:cursor-not-allowed disabled:text-gray-400 disabled:no-underline"
        >
          <RefreshCw className={`h-4 w-4 ${resending ? 'animate-spin' : ''}`} />
          {seconds > 0 ? `Gửi lại mã (${seconds}s)` : 'Gửi lại mã'}
        </button>
      </div>
    </form>
  );
}
