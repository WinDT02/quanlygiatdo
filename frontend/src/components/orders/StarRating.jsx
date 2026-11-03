import { Star } from 'lucide-react';

/** Read-only stars when `onChange` is missing, clickable stars when it is given. `value` can be fractional (4.3). */
export default function StarRating({ value = 0, onChange, size = 'h-5 w-5' }) {
  return (
    <span className="inline-flex items-center gap-0.5" role={onChange ? 'radiogroup' : 'img'} aria-label={`${value} trên 5 sao`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = value >= n - 0.25;
        const star = <Star className={`${size} ${filled ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />;
        return onChange ? (
          <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} sao`} onClick={() => onChange(n)} className="rounded p-0.5 hover:scale-110">
            {star}
          </button>
        ) : (
          <span key={n}>{star}</span>
        );
      })}
    </span>
  );
}
