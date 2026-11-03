import { useMemo, useState } from 'react';
import { formatVND } from '../../utils/format';

// Colours follow the data-viz palette (series 1, validated against the light surface). One series -> one hue.
const BAR = '#2a78d6';
const BAR_MUTED = '#cfd8e6'; // context bars when one bar (today) is the point
const GRID = '#e7e6e1';
const BASELINE = '#b8b7b0';

const W = 640;
const H = 280;
const M = { top: 14, right: 12, bottom: 30, left: 52 };

export function parseDay(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d); // local date: new Date('2026-11-04') would be shifted by the time zone
}
const shortDay = (iso) => {
  const d = parseDay(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
};
const longDay = (iso) => parseDay(iso).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

export function compactVND(n) {
  const v = Number(n);
  if (v >= 1e9) return `${+(v / 1e9).toFixed(1)} tỷ`;
  if (v >= 1e6) return `${+(v / 1e6).toFixed(1)} tr`;
  if (v >= 1e3) return `${+(v / 1e3).toFixed(0)}k`;
  return String(v);
}

/** Top of the y axis: 1, 2, 4, 8 or 10 × 10^k, so the 4 grid steps are round numbers. */
export function niceMax(value) {
  if (value <= 0) return 4;
  const exp = 10 ** Math.floor(Math.log10(value));
  const f = value / exp;
  const nf = [1, 2, 4, 8, 10].find((x) => f <= x);
  return nf * exp;
}

/** Column with only its top corners rounded (4px), sitting on the baseline. */
function columnPath(x, y, w, h) {
  const r = Math.min(4, h, w / 2);
  return `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h} Z`;
}

/**
 * Daily revenue as thin columns. `emphasizeLast` greys every bar except the last one (the "today" view).
 * Hover or keyboard focus on a day shows a tooltip; the table switch gives the same numbers as text.
 */
export default function RevenueChart({ data, emphasizeLast = false }) {
  const [hover, setHover] = useState(null);
  const [asTable, setAsTable] = useState(false);

  const geometry = useMemo(() => {
    const plotW = W - M.left - M.right;
    const plotH = H - M.top - M.bottom;
    const max = niceMax(Math.max(0, ...data.map((d) => Number(d.revenue))));
    const band = plotW / Math.max(data.length, 1);
    const barW = Math.min(Math.max(band * 0.55, 4), 28);
    const labelEvery = Math.ceil(data.length / 8);
    return { plotW, plotH, max, band, barW, labelEvery };
  }, [data]);

  const { plotH, max, band, barW, labelEvery } = geometry;
  const total = data.reduce((sum, d) => sum + Number(d.revenue), 0);
  const y = (v) => M.top + plotH - (Number(v) / max) * plotH;
  const hovered = hover !== null ? data[hover] : null;

  return (
    <div>
      <div className="mb-2 flex items-center justify-end">
        <button type="button" onClick={() => setAsTable((v) => !v)} className="rounded-md px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800">
          {asTable ? 'Xem biểu đồ' : 'Xem dạng bảng'}
        </button>
      </div>

      {asTable ? (
        <div className="max-h-72 overflow-y-auto rounded-lg border border-gray-100">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr><th className="px-3 py-2">Ngày</th><th className="px-3 py-2 text-right">Đơn hoàn thành</th><th className="px-3 py-2 text-right">Doanh thu</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((d) => (
                <tr key={d.date}><td className="px-3 py-2">{longDay(d.date)}</td><td className="px-3 py-2 text-right">{d.orderCount}</td><td className="px-3 py-2 text-right font-medium">{formatVND(d.revenue)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Biểu đồ cột doanh thu ${data.length} ngày, tổng ${formatVND(total)}`}>
            {/* grid + y labels */}
            {[0, 1, 2, 3, 4].map((i) => {
              const v = (max / 4) * i;
              return (
                <g key={i}>
                  <line x1={M.left} x2={W - M.right} y1={y(v)} y2={y(v)} stroke={i === 0 ? BASELINE : GRID} strokeWidth="1" />
                  <text x={M.left - 8} y={y(v) + 4} textAnchor="end" className="fill-gray-500" fontSize="11">{compactVND(v)}</text>
                </g>
              );
            })}

            {data.map((d, i) => {
              const x = M.left + band * i + (band - barW) / 2;
              const h = (Number(d.revenue) / max) * plotH;
              const isLast = i === data.length - 1;
              const muted = emphasizeLast && !isLast;
              return (
                <g key={d.date}>
                  {h > 0 && <path d={columnPath(x, y(d.revenue), barW, h)} fill={muted ? BAR_MUTED : BAR} opacity={hover !== null && hover !== i ? 0.55 : 1} />}
                  {i % labelEvery === 0 || isLast ? (
                    <text x={x + barW / 2} y={H - 10} textAnchor="middle" className={isLast && emphasizeLast ? 'fill-gray-900' : 'fill-gray-500'} fontSize="11" fontWeight={isLast && emphasizeLast ? 600 : 400}>{shortDay(d.date)}</text>
                  ) : null}
                  {/* hit target: the whole column band, much wider than the bar */}
                  <rect
                    x={M.left + band * i}
                    y={M.top}
                    width={band}
                    height={plotH}
                    fill="transparent"
                    tabIndex={0}
                    aria-label={`${longDay(d.date)}: ${formatVND(d.revenue)}, ${d.orderCount} đơn`}
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(i)}
                    onBlur={() => setHover(null)}
                    className="outline-none"
                  />
                </g>
              );
            })}
          </svg>

          {hovered && (
            <div
              className="pointer-events-none absolute top-0 z-10 w-44 -translate-x-1/2 rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-lg"
              style={{ left: `${Math.min(Math.max(((M.left + band * hover + band / 2) / W) * 100, 14), 86)}%` }}
            >
              <p className="font-semibold">{longDay(hovered.date)}</p>
              <p className="mt-0.5 text-sm font-bold">{formatVND(hovered.revenue)}</p>
              <p className="text-gray-300">{hovered.orderCount} đơn hoàn thành</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
