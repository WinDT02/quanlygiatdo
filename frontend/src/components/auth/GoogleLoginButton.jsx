import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import axiosClient, { getErrorMessage } from '../../api/axiosClient';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

let scriptPromise;
/** Loads Google Identity Services once for the whole app. */
function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      script.onerror = () => {
        scriptPromise = undefined; // allow a retry
        reject(new Error('Không tải được Google'));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

/**
 * Official "Sign in with Google" button (Google Identity Services, no extra npm package).
 * Google gives us an ID token ("credential"); we send it to POST /auth/google, which verifies it and answers with
 * our own JWT + user (an AuthResponse), handed to `onSuccess`.
 *
 * Needs VITE_GOOGLE_CLIENT_ID in .env (the same Web client id as the backend's GOOGLE_CLIENT_ID) and
 * http://localhost:5173 in "Authorized JavaScript origins" of that client in Google Cloud Console.
 */
export default function GoogleLoginButton({ onSuccess, onError, text = 'signin_with' }) {
  const containerRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  // the Google callback is registered once; keep the latest handlers in a ref so it never calls stale ones
  const handlers = useRef({ onSuccess, onError });
  useEffect(() => {
    handlers.current = { onSuccess, onError };
  });

  useEffect(() => {
    if (!CLIENT_ID) return undefined;
    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: async ({ credential }) => {
            setBusy(true);
            try {
              const authResponse = await axiosClient.post('/auth/google', { idToken: credential });
              handlers.current.onSuccess(authResponse);
            } catch (e) {
              handlers.current.onError?.(getErrorMessage(e));
            } finally {
              setBusy(false);
            }
          },
        });
        containerRef.current.innerHTML = ''; // React StrictMode mounts twice in dev
        window.google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          shape: 'rectangular',
          text,
          locale: 'vi',
          width: Math.min(Math.max(containerRef.current.offsetWidth, 200), 400),
        });
      })
      .catch(() => {
        if (!cancelled) setUnavailable(true);
      });

    return () => {
      cancelled = true;
    };
  }, [text]);

  if (!CLIENT_ID) {
    return (
      <p className="rounded-lg border border-dashed border-gray-300 p-3 text-center text-xs text-gray-400">
        Đăng nhập Google chưa bật: thêm VITE_GOOGLE_CLIENT_ID vào file .env rồi chạy lại npm run dev.
      </p>
    );
  }
  if (unavailable) {
    return <p className="text-center text-xs text-red-500">Không tải được Google. Hãy kiểm tra kết nối mạng hoặc trình chặn quảng cáo.</p>;
  }

  return (
    <div className="relative">
      <div ref={containerRef} className="flex min-h-[44px] w-full justify-center" />
      {busy && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 rounded bg-white/80 text-sm text-gray-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Đang đăng nhập...
        </div>
      )}
    </div>
  );
}
