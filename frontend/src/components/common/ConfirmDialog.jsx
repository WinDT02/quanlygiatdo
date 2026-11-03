import { Loader2 } from 'lucide-react';
import Modal from './Modal';

/** "Are you sure?" dialog. `danger` makes the confirm button red. */
export default function ConfirmDialog({ title, children, confirmLabel = 'Xác nhận', danger = false, busy = false, onConfirm, onClose }) {
  return (
    <Modal title={title} onClose={onClose} size="sm" closeDisabled={busy}>
      <div className="space-y-5">
        <div className="text-sm text-gray-600">{children}</div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50">
            Không
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
