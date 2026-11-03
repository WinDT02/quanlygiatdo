import { ChevronLeft, ChevronRight } from 'lucide-react';

/** Works with the backend PageResponse (0-based `page`). */
export default function Pagination({ page, totalPages, totalElements, onChange }) {
  if (totalPages <= 1) {
    return <p className="text-sm text-gray-500">{totalElements} kết quả</p>;
  }
  return (
    <div className="flex items-center justify-between text-sm text-gray-600">
      <span>{totalElements} kết quả · Trang {page + 1}/{totalPages}</span>
      <div className="flex gap-1">
        <button type="button" onClick={() => onChange(page - 1)} disabled={page === 0} className="rounded-lg border border-gray-300 p-2 hover:bg-gray-50 disabled:opacity-40" aria-label="Trang trước">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => onChange(page + 1)} disabled={page >= totalPages - 1} className="rounded-lg border border-gray-300 p-2 hover:bg-gray-50 disabled:opacity-40" aria-label="Trang sau">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
