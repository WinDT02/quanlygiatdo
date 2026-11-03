import { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/** Labelled input with a left icon and an error line; type="password" gets a show/hide button. */
export default function Field({ label, icon: Icon, type = 'text', error, hint, ...inputProps }) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const isPassword = type === 'password';

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="relative">
        {Icon && <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />}
        <input
          id={id}
          {...inputProps}
          type={isPassword && visible ? 'text' : type}
          aria-invalid={Boolean(error)}
          className={`w-full rounded-lg border py-2.5 text-sm outline-none transition focus:ring-2 ${Icon ? 'pl-9' : 'pl-3'} ${
            isPassword ? 'pr-10' : 'pr-3'
          } ${error ? 'border-red-400 focus:ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}
