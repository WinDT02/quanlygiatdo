import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Copy, Loader2, Lock, LockOpen, Plus, Search, Users } from 'lucide-react';
import { fetchEmployees, updateUserStatus } from '../api/adminApi';
import { getErrorMessage } from '../api/axiosClient';
import { formatDateTime } from '../utils/format';
import { Alert, useToast } from '../components/common/Toast';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Modal from '../components/common/Modal';
import EmployeeFormModal from '../components/admin/EmployeeFormModal';

const FILTERS = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'ACTIVE', label: 'Đang làm việc' },
  { key: 'BANNED', label: 'Đã khóa' },
];

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked: the text is selectable on screen anyway */
    }
  };
  return (
    <button type="button" onClick={copy} className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50" aria-label={label}>
      {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

export default function EmployeeManagement() {
  const toast = useToast();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [created, setCreated] = useState(null); // { employee, temporaryPassword }
  const [statusTarget, setStatusTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setEmployees(await fetchEmployees());
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
    return employees.filter((e) => (filter === 'ALL' || e.status === filter) && (!q || e.fullName.toLowerCase().includes(q) || e.email.toLowerCase().includes(q) || (e.phone ?? '').includes(q)));
  }, [employees, filter, search]);

  const confirmStatusChange = async () => {
    const next = statusTarget.status === 'ACTIVE' ? 'BANNED' : 'ACTIVE';
    setBusy(true);
    try {
      await updateUserStatus(statusTarget.userId, next); // userId, not the employee id
      toast.success(next === 'BANNED' ? `Đã khóa tài khoản ${statusTarget.fullName}` : `Đã mở khóa tài khoản ${statusTarget.fullName}`);
      setEmployees((list) => list.map((e) => (e.id === statusTarget.id ? { ...e, status: next } : e)));
      setStatusTarget(null);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const locking = statusTarget?.status === 'ACTIVE';

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý nhân viên</h1>
          <p className="mt-1 text-sm text-gray-500">Tài khoản nhân viên xử lý đơn hàng. Khóa tài khoản có hiệu lực ngay lập tức.</p>
        </div>
        <button type="button" onClick={() => setFormOpen(true)} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Thêm nhân viên
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
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tên, email hoặc số điện thoại" aria-label="Tìm nhân viên" className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
        </div>
      </div>

      {error && <Alert variant="error" className="mt-4">{error} <button type="button" onClick={load} className="font-semibold underline">Thử lại</button></Alert>}

      <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
        {loading && employees.length === 0 ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
        ) : visible.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-3 text-gray-600">{employees.length === 0 ? 'Chưa có nhân viên nào.' : 'Không có nhân viên phù hợp.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Nhân viên</th>
                  <th className="px-4 py-3">Liên hệ</th>
                  <th className="px-4 py-3">Ngày tạo</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visible.map((emp) => (
                  <tr key={emp.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">{emp.fullName.trim().charAt(0).toUpperCase()}</span>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900">{emp.fullName}</p>
                          <p className="truncate text-xs text-gray-500">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <p>{emp.phone || '—'}</p>
                      {emp.address && <p className="max-w-[14rem] truncate text-xs text-gray-400">{emp.address}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDateTime(emp.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${emp.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {emp.status === 'ACTIVE' ? 'Đang làm việc' : 'Đã khóa'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={() => setStatusTarget(emp)} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium ${emp.status === 'ACTIVE' ? 'border-red-300 text-red-600 hover:bg-red-50' : 'border-green-300 text-green-700 hover:bg-green-50'}`}>
                        {emp.status === 'ACTIVE' ? <><Lock className="h-3.5 w-3.5" /> Khóa</> : <><LockOpen className="h-3.5 w-3.5" /> Mở khóa</>}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formOpen && (
        <EmployeeFormModal
          onClose={() => setFormOpen(false)}
          onCreated={(result) => {
            setFormOpen(false);
            setCreated(result);
            load();
          }}
        />
      )}

      {created && (
        <Modal title="Đã tạo tài khoản nhân viên" onClose={() => setCreated(null)} size="sm">
          <div className="space-y-4 text-sm">
            <p className="text-gray-600">Tài khoản của <span className="font-semibold text-gray-900">{created.employee.fullName}</span> đã sẵn sàng.</p>
            <div className="space-y-2 rounded-xl bg-gray-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0"><p className="text-xs text-gray-500">Email đăng nhập</p><p className="truncate font-mono text-gray-900">{created.employee.email}</p></div>
                <CopyButton text={created.employee.email} label="Sao chép email" />
              </div>
              {created.temporaryPassword ? (
                <div className="flex items-center justify-between gap-2 border-t border-gray-200 pt-2">
                  <div className="min-w-0"><p className="text-xs text-gray-500">Mật khẩu tạm</p><p className="select-all font-mono text-base font-semibold text-gray-900">{created.temporaryPassword}</p></div>
                  <CopyButton text={created.temporaryPassword} label="Sao chép mật khẩu" />
                </div>
              ) : (
                <p className="border-t border-gray-200 pt-2 text-gray-500">Mật khẩu là mật khẩu bạn vừa nhập.</p>
              )}
            </div>
            {created.temporaryPassword && <Alert variant="warning">Mật khẩu chỉ hiển thị một lần này. Hãy gửi cho nhân viên ngay; sau khi đóng cửa sổ sẽ không xem lại được.</Alert>}
            <div className="flex justify-end"><button type="button" onClick={() => setCreated(null)} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700">Đã lưu lại</button></div>
          </div>
        </Modal>
      )}

      {statusTarget && (
        <ConfirmDialog title={locking ? 'Khóa tài khoản?' : 'Mở khóa tài khoản?'} confirmLabel={locking ? 'Khóa tài khoản' : 'Mở khóa'} danger={locking} busy={busy} onConfirm={confirmStatusChange} onClose={() => setStatusTarget(null)}>
          {locking
            ? <>Nhân viên <span className="font-semibold">{statusTarget.fullName}</span> sẽ không thể đăng nhập và không nhận thêm đơn. Phiên đang đăng nhập cũng bị chặn ngay.</>
            : <>Nhân viên <span className="font-semibold">{statusTarget.fullName}</span> sẽ đăng nhập và nhận đơn trở lại bình thường.</>}
        </ConfirmDialog>
      )}
    </div>
  );
}
