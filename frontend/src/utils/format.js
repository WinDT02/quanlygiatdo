const vnd = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });

export const formatVND = (amount) => vnd.format(Number(amount ?? 0));

export function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('vi-VN', { hour12: false, dateStyle: 'short', timeStyle: 'short' });
}

const pad = (n) => String(n).padStart(2, '0');

/** Date -> value for <input type="datetime-local"> and its `min` attribute (local time, minutes precision). */
export function toDateTimeLocalValue(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** "2026-11-05T09:30" (datetime-local) -> "2026-11-05T09:30:00", the LocalDateTime format the backend reads. */
export function toBackendDateTime(localValue) {
  return localValue ? `${localValue}:00` : null;
}
