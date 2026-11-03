import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';

const ToastContext = createContext(null);

const VARIANTS = {
  success: { icon: CheckCircle2, box: 'border-green-200 bg-green-50 text-green-800', iconColor: 'text-green-500' },
  error: { icon: XCircle, box: 'border-red-200 bg-red-50 text-red-800', iconColor: 'text-red-500' },
  warning: { icon: AlertTriangle, box: 'border-amber-200 bg-amber-50 text-amber-800', iconColor: 'text-amber-500' },
  info: { icon: Info, box: 'border-blue-200 bg-blue-50 text-blue-800', iconColor: 'text-blue-500' },
};

/** Inline message box for forms and pages: <Alert variant="error">Sai mật khẩu</Alert> */
export function Alert({ variant = 'info', title, children, onClose, className = '' }) {
  const { icon: Icon, box, iconColor } = VARIANTS[variant] ?? VARIANTS.info;
  return (
    <div role={variant === 'error' ? 'alert' : 'status'} className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${box} ${className}`}>
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconColor}`} />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? 'mt-0.5' : ''}>{children}</div>}
      </div>
      {onClose && (
        <button type="button" onClick={onClose} className="shrink-0 opacity-60 hover:opacity-100" aria-label="Đóng">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function ToastItem({ toast, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => onClose(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onClose]);

  return (
    <div className="w-80 max-w-[calc(100vw-2rem)] shadow-lg">
      <Alert variant={toast.variant} onClose={() => onClose(toast.id)} className="bg-white">
        {toast.message}
      </Alert>
    </div>
  );
}

let nextId = 1;

/** Put once near the root. Gives every component `useToast()`: toast.success('Đã lưu'), toast.error(...). */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const show = useCallback((variant, message, duration = 4500) => {
    setToasts((list) => [...list.slice(-3), { id: nextId++, variant, message, duration }]); // keep at most 4
  }, []);

  const api = useMemo(
    () => ({
      success: (message, duration) => show('success', message, duration),
      error: (message, duration) => show('error', message, duration),
      warning: (message, duration) => show('warning', message, duration),
      info: (message, duration) => show('info', message, duration),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex flex-col gap-2">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onClose={remove} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>');
  return context;
}
