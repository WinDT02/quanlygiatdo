import axios from 'axios';

export const TOKEN_KEY = 'accessToken';
export const USER_KEY = 'user';
export const EXPIRES_KEY = 'tokenExpiresAt';

/**
 * Fired on `window` when the server rejects our token (expired / user locked / deleted).
 * AuthProvider listens: it clears its state and sends the user to /login.
 * event.detail = { silent: boolean } - silent means "do not redirect or show a message" (used by the startup check).
 */
export const SESSION_EXPIRED_EVENT = 'auth:session-expired';

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ---- request: attach "Authorization: Bearer <token>" -------------------------------------------
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---- response -----------------------------------------------------------------------------------
// These endpoints answer 401 for "wrong e-mail / password / code": that is a form error, not an expired session.
const AUTH_FORM_ENDPOINTS = [
  '/auth/login',
  '/auth/register',
  '/auth/verify-register',
  '/auth/resend-register-otp',
  '/auth/google',
  '/auth/forgot-password',
  '/auth/reset-password',
];

export function clearStoredSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(EXPIRES_KEY);
}

axiosClient.interceptors.response.use(
  // Success: hand back the JSON body directly, so callers write `const orders = await axiosClient.get('/orders')`
  (response) => response.data,
  (error) => {
    const config = error.config || {};
    const url = config.url || '';
    const hadToken = Boolean(config.headers?.Authorization);
    const isAuthForm = AUTH_FORM_ENDPOINTS.some((path) => url.startsWith(path));

    // The backend has no refresh token, so a 401 on a request that carried a token means the session is over:
    // wipe the stored token and let AuthProvider redirect to the login page.
    if (error.response?.status === 401 && hadToken && !isAuthForm) {
      clearStoredSession();
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT, { detail: { silent: Boolean(config.silent401) } }));
    }
    return Promise.reject(error);
  },
);

/** Human-readable message from an Axios error (backend ApiError.message, or a network problem). */
export function getErrorMessage(error, fallback = 'Đã có lỗi xảy ra, vui lòng thử lại') {
  if (error?.response) {
    const data = error.response.data;
    // validation errors: the first field message is more specific than the generic "Dữ liệu không hợp lệ"
    const firstFieldError = data?.errors && Object.values(data.errors)[0];
    return firstFieldError || data?.message || fallback;
  }
  if (error?.code === 'ECONNABORTED') return 'Máy chủ phản hồi quá lâu, vui lòng thử lại';
  if (error?.request) return 'Không kết nối được máy chủ. Hãy kiểm tra backend (cổng 8080) đã chạy chưa.';
  return fallback;
}

export default axiosClient;
