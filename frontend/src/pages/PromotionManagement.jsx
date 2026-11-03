import { useCallback, useEffect, useMemo, useState } from 'react';
import { BadgePercent, Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { deletePromotion, fetchAllPromotions, updatePromotion } from '../api/adminApi';
import { getErrorMessage } from '../api/axiosClient';
import { formatDateTime } from '../utils/format';
import { Alert, useToast } from '../components/common/Toast';
import ConfirmDialog from '../components/common/ConfirmDialog';
import PromotionFormModal from '../components/admin/PromotionFormModal';

/** Display status, derived from the admin switch + the date range. */
export function promotionState(p, now = new Date()) {
  if (!p.active) return 'OFF';
  if (new Date(p.endDate) < now) return 'EXPIRED';
  if (new Date(p.startDate) > now) return 'UPCOMING';
  return 'LIVE';
}

const STATE_BADGE = {
  LIVE: { label: 'Đang hoạt động', cls: 'bg-green-100 text-green-700' },
  UPCOMING: { label: 'Sắp diễn ra', cls: 'bg-blue-100 text-blue-700' },
  EXPIRED: { label: 'Hết hạn', cls: 'bg-amber-100 text-amber-700' },
  OFF: { label: 'Đã tắt', cls: 'bg-gray-200 text-gray-600' },
};

const FILTERS = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'LIVE', label: 'Đang hoạt động' },
  { key: 'EXPIRED', label: 'Hết hạn' },
  { key: 'OFF', label: 'Đã tắt' },
];

function Switch({ checked, busy, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={busy} onClick={onChange}
      className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-60 ${checked ? 'bg-green-500' : 'bg-gray-300'}`}>
      <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  );
}

export default function PromotionManagement() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [formTarget, setFormTarget] = useState(undefined); // undefined = closed, null = new, object = edit
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setItems(await fetchAllPromotions());
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((p) => {
      const state = promotionState(p);
      const okFilter = filter === 'ALL' || state === filter;
      return okFilter && (!q || p.code.toLowerCase().includes(q) || (p.title ?? '').toLowerCase().includes(q));
    });
  }, [items, filter, search]);

  // PUT takes the whole promotion, so the toggle re-sends the current values with the opposite `active`
  const toggle = async (p) => {
    setBusyId(p.id);
    try {
      const saved = await updatePromotion(p.id, {
        code: p.code, title: p.title, subtitle: p.subtitle, description: p.description, type: p.type,
        discountPercent: p.discountPercent, startDate: p.startDate, endDate: p.endDate, active: !p.active,
      });
      setItems((list) => list.map((x) => (x.id === saved.id ? saved : x)));
      toast.success(saved.active ? `Đã bật mã ${p.code}` : `Đã tắt mã ${p.code}`);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    setBusyId(deleteTarget.id);
    try {
      await deletePromotion(deleteTarget.id);
      toast.success(`Đã xóa mã ${deleteTarget.code}`);
      setDeleteTarget(null);
      await load();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý mã giảm giá</h1>
          <p className="mt-1 text-sm text-gray-500">Khách nhập mã khi đặt giặt; mã chỉ dùng được khi đang bật và nằm trong thời hạn.</p>
        </div>
        <button type="button" onClick={() => setFormTarget(null)} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Thêm mã
        </button>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 overflow-x-auto" role="tablist">
          {FILTERS.map(({ key, label }) => (
            <button key={key} type="button" role="tab" aria-selected={filter === key} onClick={() => setFilter(key)} className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${filter === key ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo mã hoặc tiêu đề" aria-label="Tìm mã giảm giá" className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
        </div>
      </div>

      {error && <Alert variant="error" className="mt-4">{error} <button type="button" onClick={load} className="font-semibold underline">Thử lại</button></Alert>}

      <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
        {loading && items.length === 0 ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
        ) : visible.length === 0 ? (
          <div className="py-16 text-center">
            <BadgePercent className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-3 text-gray-600">{items.length === 0 ? 'Chưa có mã giảm giá nào.' : 'Không có mã phù hợp.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Mã</th>
                  <th className="px-4 py-3">Loại giảm</th>
                  <th className="px-4 py-3 text-right">Giá trị</th>
                  <th className="px-4 py-3">Thời hạn</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Bật</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visible.map((p) => {
                  const badge = STATE_BADGE[promotionState(p)];
                  return (
                    <tr key={p.id}>
                      <td className="px-4 py-3">
                        <p className="font-mono font-semibold text-gray-900">{p.code}</p>
                        {p.title && <p className="max-w-[14rem] truncate text-xs text-gray-500">{p.title}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">Phần trăm (%)</td>
                      <td className="px-4 py-3 text-right font-semibold text-blue-700">{Number(p.discountPercent)}%</td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        <p>{formatDateTime(p.startDate)}</p>
                        <p>→ {formatDateTime(p.endDate)}</p>
                      </td>
                      <td className="px-4 py-3"><span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.cls}`}>{badge.label}</span></td>
                      <td className="px-4 py-3"><Switch checked={p.active} busy={busyId === p.id} onChange={() => toggle(p)} label={`Bật tắt mã ${p.code}`} /></td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          <button type="button" onClick={() => setFormTarget(p)} className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50" aria-label={`Sửa mã ${p.code}`} title="Sửa"><Pencil className="h-4 w-4" /></button>
                          <button type="button" onClick={() => setDeleteTarget(p)} disabled={!p.active} className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50 disabled:opacity-40" aria-label={`Xóa mã ${p.code}`} title="Xóa"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formTarget !== undefined && (
        <PromotionFormModal promotion={formTarget} onClose={() => setFormTarget(undefined)} onSaved={() => { setFormTarget(undefined); load(); }} />
      )}

      {deleteTarget && (
        <ConfirmDialog title="Xóa mã giảm giá?" confirmLabel="Xóa mã" danger busy={busyId === deleteTarget.id} onConfirm={confirmDelete} onClose={() => setDeleteTarget(null)}>
          <p>Mã <span className="font-mono font-semibold">{deleteTarget.code}</span> sẽ không còn dùng được.</p>
          <p className="mt-2 text-xs text-gray-500">Mã chỉ bị tắt, không xóa hẳn: các đơn đã dùng mã vẫn giữ nguyên và bạn có thể bật lại bằng công tắc.</p>
        </ConfirmDialog>
      )}
    </div>
  );
}
