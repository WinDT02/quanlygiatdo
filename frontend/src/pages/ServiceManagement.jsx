import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Pencil, Plus, Search, Shirt, Trash2 } from 'lucide-react';
import { deleteService, fetchAllServices, updateService } from '../api/adminApi';
import { getErrorMessage } from '../api/axiosClient';
import { formatVND } from '../utils/format';
import { Alert, useToast } from '../components/common/Toast';
import ConfirmDialog from '../components/common/ConfirmDialog';
import ServiceFormModal from '../components/admin/ServiceFormModal';

const FILTERS = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'ACTIVE', label: 'Đang bán' },
  { key: 'INACTIVE', label: 'Tạm ngưng' },
];

function Switch({ checked, busy, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={busy}
      onClick={onChange}
      className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-60 ${checked ? 'bg-green-500' : 'bg-gray-300'}`}
    >
      <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  );
}

export default function ServiceManagement() {
  const toast = useToast();
  const [services, setServices] = useState([]);
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
      setServices(await fetchAllServices());
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
    return services.filter((s) => (filter === 'ALL' || s.status === filter) && (!q || s.name.toLowerCase().includes(q)));
  }, [services, filter, search]);

  const replace = (saved) => setServices((list) => list.map((s) => (s.id === saved.id ? saved : s)));

  // the PUT endpoint takes the whole service, so the toggle sends the current values with the other status
  const toggle = async (service) => {
    const status = service.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setBusyId(service.id);
    try {
      const saved = await updateService(service.id, {
        name: service.name,
        price: service.price,
        unit: service.unit,
        description: service.description,
        imageUrl: service.imageUrl,
        status,
      });
      replace(saved);
      toast.success(status === 'ACTIVE' ? `Đã bật “${service.name}”` : `Đã tắt “${service.name}”`);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    setBusyId(deleteTarget.id);
    try {
      await deleteService(deleteTarget.id);
      toast.success(`Đã xóa “${deleteTarget.name}” khỏi danh mục`);
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
          <h1 className="text-2xl font-bold text-gray-900">Quản lý dịch vụ</h1>
          <p className="mt-1 text-sm text-gray-500">Khách chỉ thấy và đặt được các dịch vụ đang bán.</p>
        </div>
        <button type="button" onClick={() => setFormTarget(null)} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Thêm dịch vụ
        </button>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2" role="tablist">
          {FILTERS.map(({ key, label }) => (
            <button key={key} type="button" role="tab" aria-selected={filter === key} onClick={() => setFilter(key)} className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${filter === key ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo tên dịch vụ" aria-label="Tìm dịch vụ" className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
        </div>
      </div>

      {error && <Alert variant="error" className="mt-4">{error} <button type="button" onClick={load} className="font-semibold underline">Thử lại</button></Alert>}

      <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
        {loading && services.length === 0 ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
        ) : visible.length === 0 ? (
          <p className="py-16 text-center text-gray-500">{services.length === 0 ? 'Chưa có dịch vụ nào.' : 'Không có dịch vụ phù hợp.'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Dịch vụ</th>
                  <th className="px-4 py-3 text-right">Đơn giá</th>
                  <th className="px-4 py-3">Đơn vị</th>
                  <th className="px-4 py-3">Đang bán</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visible.map((s) => (
                  <tr key={s.id} className={s.status === 'INACTIVE' ? 'bg-gray-50/70 text-gray-400' : ''}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {s.imageUrl ? <img src={s.imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover" /> : <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-400"><Shirt className="h-5 w-5" /></span>}
                        <div className="min-w-0">
                          <p className={`font-medium ${s.status === 'INACTIVE' ? '' : 'text-gray-900'}`}>{s.name}</p>
                          {s.description && <p className="line-clamp-1 max-w-xs text-xs text-gray-500">{s.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{formatVND(s.price)}</td>
                    <td className="px-4 py-3">{s.unit}</td>
                    <td className="px-4 py-3"><Switch checked={s.status === 'ACTIVE'} busy={busyId === s.id} onChange={() => toggle(s)} label={`Bật tắt ${s.name}`} /></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button type="button" onClick={() => setFormTarget(s)} className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50" aria-label={`Sửa ${s.name}`} title="Sửa"><Pencil className="h-4 w-4" /></button>
                        <button type="button" onClick={() => setDeleteTarget(s)} disabled={s.status === 'INACTIVE'} className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50 disabled:opacity-40" aria-label={`Xóa ${s.name}`} title="Xóa"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formTarget !== undefined && (
        <ServiceFormModal
          service={formTarget}
          onClose={() => setFormTarget(undefined)}
          onSaved={() => {
            setFormTarget(undefined);
            load();
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog title="Xóa dịch vụ?" confirmLabel="Xóa dịch vụ" danger busy={busyId === deleteTarget.id} onConfirm={confirmDelete} onClose={() => setDeleteTarget(null)}>
          <p><span className="font-semibold">{deleteTarget.name}</span> sẽ bị gỡ khỏi danh mục và khách không đặt được nữa.</p>
          <p className="mt-2 text-xs text-gray-500">Dữ liệu không bị xóa hẳn: các đơn cũ vẫn giữ nguyên, và bạn có thể bật lại bằng công tắc bất cứ lúc nào.</p>
        </ConfirmDialog>
      )}
    </div>
  );
}
