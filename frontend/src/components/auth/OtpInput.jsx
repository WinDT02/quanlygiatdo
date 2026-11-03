import { useEffect, useRef } from 'react';

/**
 * 6 boxes for a numeric code. Typing moves to the next box, Backspace to the previous one, pasting "123456"
 * fills them all. `value` is the whole code as a string. `autoFocus` focuses the first empty box on mount.
 */
export default function OtpInput({ value, onChange, length = 6, disabled = false, autoFocus = true }) {
  const refs = useRef([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  const focus = (index) => refs.current[Math.min(Math.max(index, 0), length - 1)]?.focus();

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  // when the parent clears the code (wrong OTP) put the cursor back on the first box
  useEffect(() => {
    if (value === '' && !disabled) refs.current[0]?.focus();
  }, [value, disabled]);

  const handleChange = (index, raw) => {
    const digit = raw.replace(/\D/g, '').slice(-1);
    const next = digits.slice();
    next[index] = digit;
    onChange(next.join(''));
    if (digit) focus(index + 1);
  };

  const handleKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !digits[index]) focus(index - 1);
    else if (event.key === 'ArrowLeft') focus(index - 1);
    else if (event.key === 'ArrowRight') focus(index + 1);
  };

  const handlePaste = (event) => {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;
    event.preventDefault();
    onChange(pasted);
    focus(pasted.length >= length ? length - 1 : pasted.length);
  };

  return (
    <div className="flex justify-center gap-2" onPaste={handlePaste}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onFocus={(e) => e.target.select()}
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          disabled={disabled}
          aria-label={`Chữ số ${index + 1}`}
          className="h-12 w-11 rounded-lg border border-gray-300 text-center text-xl font-semibold outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
        />
      ))}
    </div>
  );
}
