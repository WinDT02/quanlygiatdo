import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axiosClient, {
  EXPIRES_KEY,
  SESSION_EXPIRED_EVENT,
  TOKEN_KEY,
  USER_KEY,
  clearStoredSession,
} from '../api/axiosClient';
import { useToast } from '../components/common/Toast';

const AuthContext = createContext(null);

const MAX_TIMEOUT_MS = 2 ** 31 - 1; // setTimeout overflows above ~24.8 days

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
}

/** True when a token is stored and its client-side expiry time has not passed. */
function hasUsableToken() {
  if (!localStorage.getItem(TOKEN_KEY)) return false;
  const expiresAt = Number(localStorage.getItem(EXPIRES_KEY));
  return !expiresAt || Date.now() < expiresAt;
}

/**
 * Must be rendered INSIDE <BrowserRouter> and <ToastProvider> (it redirects and shows messages).
 *
 * Exposes: user, accessToken, role, isAuthenticated, loading, loginSuccess(authResponse), logout(), refreshUser().
 */
export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  // Start from what is in localStorage (no flash of "logged out"), then confirm with the server below.
  const [user, setUser] = useState(() => (hasUsableToken() ? readStoredUser() : null));
  const [accessToken, setAccessToken] = useState(() => (hasUsableToken() ? localStorage.getItem(TOKEN_KEY) : null));
  const [loading, setLoading] = useState(() => hasUsableToken()); // true while the startup GET /auth/me runs

  // The event handlers below must see the *current* page without being re-subscribed on every navigation.
  const locationRef = useRef(location);
  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  const resetSession = useCallback(() => {
    clearStoredSession();
    setUser(null);
    setAccessToken(null);
  }, []);

  /** Call with the body of POST /auth/login, /auth/verify-register or /auth/google: { accessToken, expiresIn, user }. */
  const loginSuccess = useCallback((authResponse) => {
    const { accessToken: token, expiresIn, user: profile } = authResponse;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(profile));
    localStorage.setItem(EXPIRES_KEY, String(Date.now() + expiresIn * 1000));
    setAccessToken(token);
    setUser(profile);
    return profile;
  }, []);

  const logout = useCallback(() => {
    resetSession();
    navigate('/login', { replace: true });
  }, [resetSession, navigate]);

  /** Re-reads the profile from the server (e.g. after the user edits his phone number). */
  const refreshUser = useCallback(async () => {
    const profile = await axiosClient.get('/auth/me');
    localStorage.setItem(USER_KEY, JSON.stringify(profile));
    setUser(profile);
    return profile;
  }, []);

  /** The session is over (401, token timer, or logout in another tab): clean up and go to the login page. */
  /** Replace the stored profile with one the server just returned (e.g. after editing the profile page). */
  const updateUser = useCallback((profile) => {
    localStorage.setItem(USER_KEY, JSON.stringify(profile));
    setUser(profile);
  }, []);

  const handleSessionExpired = useCallback(
    (silent = false) => {
      resetSession();
      if (silent) return;
      toast.warning('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
      navigate('/login', { replace: true, state: { from: locationRef.current } });
    },
    [resetSession, navigate, toast],
  );

  // 1) Page (re)load: ask the server who we are. The token may have expired, or the account may have been locked.
  useEffect(() => {
    if (!hasUsableToken()) {
      clearStoredSession();
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    // silent401: a stale token on a public page must not throw the visitor to /login;
    // PrivateRoute redirects by itself if the page really is private.
    axiosClient
      .get('/auth/me', { silent401: true })
      .then((profile) => {
        if (cancelled) return;
        localStorage.setItem(USER_KEY, JSON.stringify(profile));
        setUser(profile);
      })
      .catch(() => {
        // 401 -> the interceptor already cleared storage and the event handler below resets state.
        // Network error -> keep the stored session and let the next request decide.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 2) Any later request that gets a 401 (interceptor event).
  useEffect(() => {
    const onExpired = (event) => handleSessionExpired(Boolean(event.detail?.silent));
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [handleSessionExpired]);

  // 3) The token reaches its expiry time while the tab stays open.
  useEffect(() => {
    if (!accessToken) return undefined;
    const expiresAt = Number(localStorage.getItem(EXPIRES_KEY));
    if (!expiresAt) return undefined;
    const delay = Math.min(Math.max(expiresAt - Date.now(), 0), MAX_TIMEOUT_MS);
    const timer = setTimeout(() => handleSessionExpired(false), delay);
    return () => clearTimeout(timer);
  }, [accessToken, handleSessionExpired]);

  // 4) Logged out (or in) in another browser tab.
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key !== TOKEN_KEY) return;
      if (!event.newValue) {
        resetSession();
      } else {
        setAccessToken(event.newValue);
        setUser(readStoredUser());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [resetSession]);

  const value = useMemo(
    () => ({
      user,
      accessToken,
      role: user?.role ?? null,
      isAuthenticated: Boolean(user && accessToken),
      loading,
      loginSuccess,
      logout,
      refreshUser,
      updateUser,
    }),
    [user, accessToken, loading, loginSuccess, logout, refreshUser, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
