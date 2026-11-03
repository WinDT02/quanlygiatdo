import { useEffect, useMemo, useState } from 'react';
import { BadgeDollarSign, CheckCircle2, ClipboardList, Loader2, RefreshCw, Timer, UserPlus } from 'lucide-react';
import { fetchDashboardStats } from '../api/adminApi';
import { getErrorMessage } from '../api/axiosClient';
import { ORDER_STATUS } from '../config/orders';
import { formatVND } from '../utils/format';
import { Alert } from '../components/common/Toast';
import RevenueChart from '../components/admin/RevenueChart';

const RANGES = [
  { key: 'today', label: 'Hôm nay' },
  { key: 'week', label: '7 ngày qua' },
  { key: 'month', label: 'Tháng này' },
];
const SERIES_DAYS = 31; // one request covers today, 7 days and any month

function KpiCard({ icon: Icon, label, value, hint, tone = 'bg-blue-50 text-blue-600' }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
      <p className="mt-3 text-2xl font-bold text-gray-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [range, setRange] = useState('week');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchDashboardStats(SERIES_DAYS)
      .then((data) => !cancelled && setStats(data))
      .catch((e) => !cancelled && setError(getErrorMessage(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const view = useMemo(() => {
    if (!stats) return null;
    const series = stats.revenueLast7Days; // oldest day first; 31 entries (or 7 if the backend was not updated)
    const dayOfMonth = new Date().getDate();
    const wanted = { today: 1, week: 7, month: dayOfMonth }[range];
    const inRange = series.slice(-Math.min(wanted, series.length));
    const chartData = range === 'today' ? series.slice(-7) : inRange; // "today" is shown against the last 7 days
    const customers = range === 'today'
      ? { value: stats.newCustomersToday, label: 'Khách hàng mới hôm nay' }
      : { value: stats.newCustomersLast7Days, label: 'Khách hàng mới 7 ngày qua' };
    return {
      chartData,
      revenue: inRange.reduce((sum, d) => sum + Number(d.revenue), 0),
      completed: inRange.reduce((sum, d) => sum + d.orderCount, 0),
      customers,
      monthIncomplete: range === 'month' && series.length < dayOfMonth,
    };
  }, [stats, range]);

  if (loading && !stats) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }
  if (error && !stats) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <Alert variant="error">{error} <button type="button" onClick={() => setTick((n) => n + 1)} className="font-semibold underline">Thử lại</button></Alert>
      </div>
    );
  }

  const byStatus = stats.ordersByStatus;
  const processing = (byStatus.PROCESSING ?? 0) + (byStatus.WASHING ?? 0);
  const statusRows = Object.entries(byStatus).sort((a, b) => b[1] - a[1]);
  const maxStatus = Math.max(1, ...statusRows.map(([, n]) => n));
  const pct = (n) => (stats.totalOrders > 0 ? Math.round((n / stats.totalOrders) * 100) : 0);
  const rangeLabel = RANGES.find((r) => r.key === range).label.toLowerCase();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Thống kê</h1>
          <p className="mt-1 text-sm text-gray-500">Doanh thu tính trên các đơn đã hoàn thành.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-white p-1 ring-1 ring-gray-200" role="tablist" aria-label="Khoảng thời gian">
            {RANGES.map(({ key, label }) => (
              <button key={key} type="button" role="tab" aria-selected={range === key} onClick={() => setRange(key)} className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${range === key ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                {label}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setTick((n) => n + 1)} disabled={loading} className="rounded-lg border border-gray-300 bg-white p-2.5 text-gray-600 hover:bg-gray-50 disabled:opacity-50" aria-label="Làm mới">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && <Alert variant="error" className="mt-4">{error}</Alert>}
      {view.monthIncomplete && (
        <Alert variant="warning" className="mt-4">
          Backend mới trả về {stats.revenueLast7Days.length} ngày dữ liệu. Hãy cập nhật <code>AdminDashboardController</code> / <code>DashboardService</code> (tham số <code>days</code>) để xem đủ cả tháng.
        </Alert>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard icon={BadgeDollarSign} label={`Doanh thu ${rangeLabel}`} value={formatVND(view.revenue)} hint={`${view.completed} đơn hoàn thành`} tone="bg-green-50 text-green-600" />
        <KpiCard icon={BadgeDollarSign} label="Tổng doanh thu" value={formatVND(stats.totalRevenue)} hint="Từ trước đến nay" />
        <KpiCard icon={ClipboardList} label="Tổng đơn hàng" value={stats.totalOrders} hint={`${byStatus.PENDING ?? 0} đơn chờ xác nhận`} tone="bg-indigo-50 text-indigo-600" />
        <KpiCard icon={Timer} label="Đang xử lý" value={processing} hint="Đang xử lý + đang giặt" tone="bg-amber-50 text-amber-600" />
        <KpiCard icon={UserPlus} label={view.customers.label} value={view.customers.value} hint={`Tổng ${stats.totalCustomers} khách hàng`} tone="bg-purple-50 text-purple-600" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 lg:col-span-2">
          <h2 className="font-semibold text-gray-900">Doanh thu theo ngày</h2>
          <p className="text-xs text-gray-500">{range === 'today' ? 'Hôm nay so với 6 ngày trước đó' : `${view.chartData.length} ngày gần nhất`} · đơn vị: VNĐ</p>
          <div className="mt-3"><RevenueChart data={view.chartData} emphasizeLast={range === 'today'} /></div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <h2 className="font-semibold text-gray-900">Đơn hàng theo trạng thái</h2>
          <ul className="mt-4 space-y-3">
            {statusRows.map(([key, count]) => (
              <li key={key}>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">{ORDER_STATUS[key]?.label ?? key}</span>
                  <span className="font-medium text-gray-900">{count} <span className="font-normal text-gray-400">· {pct(count)}%</span></span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-gray-100">
                  <div className="h-2 rounded-full" style={{ width: `${(count / maxStatus) * 100}%`, backgroundColor: '#2a78d6' }} />
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex items-center gap-3 rounded-xl bg-green-50 p-3 text-sm text-green-800">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <p>Tỷ lệ hoàn thành <span className="font-bold">{pct(byStatus.COMPLETED ?? 0)}%</span> · Tỷ lệ hủy <span className="font-bold">{pct(byStatus.CANCELLED ?? 0)}%</span></p>
          </div>
        </section>
      </div>
    </div>
  );
}
