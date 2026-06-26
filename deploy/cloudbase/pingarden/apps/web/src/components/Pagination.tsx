import { useTranslation } from 'react-i18next';

interface Props {
  /** Total number of items in the unfiltered/unpaginated list. */
  total: number;
  /** Items per page. Caller's responsibility to slice the list. */
  pageSize: number;
  /** 1-indexed current page. Clamp upstream — this component trusts the input. */
  currentPage: number;
  /** Page-change callback. Receives the new 1-indexed page. */
  onPageChange: (page: number) => void;
  /** Optional className appended to the root nav (centering, margin). */
  className?: string;
}

/**
 * Compact, reusable page navigator. Renders nothing when
 * `total <= pageSize` so the host page can render `<Pagination>`
 * unconditionally — this is the "sized-list-friendly" no-op pattern.
 *
 * Layout: `← Prev | 1 2 … 8 | Next →`. With ≤ 7 pages, every page is
 * shown; beyond that we render the canonical [first ... current-1
 * current current+1 ... last] window so the pager stays one line wide
 * regardless of page count. Designed for the case-library lists at
 * `/library` (Cases tab + Patterns tab); also drops in cleanly for
 * future paginated user lists (`/projects`).
 *
 * State (which page we're on) is owned by the host. This component is
 * stateless — keeps it trivially testable and lets the host reset the
 * page on tab switch / data reload without the pager fighting back.
 */
export function Pagination({
  total,
  pageSize,
  currentPage,
  onPageChange,
  className,
}: Props) {
  const { t } = useTranslation();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const pages = computePageWindow(currentPage, totalPages);

  const goTo = (p: number) => {
    if (p < 1 || p > totalPages || p === currentPage) return;
    onPageChange(p);
  };

  return (
    <nav
      aria-label={t('library.pagination.page', { current: currentPage, total: totalPages })}
      className={`flex items-center justify-center gap-1.5 ${className ?? ''}`}
    >
      <button
        type="button"
        onClick={() => goTo(currentPage - 1)}
        disabled={currentPage <= 1}
        aria-label={t('library.pagination.previous')}
        className="rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-600 transition hover:border-gray-300 hover:text-gray-900 disabled:cursor-not-allowed disabled:border-gray-100 disabled:bg-gray-50 disabled:text-gray-300"
      >
        ←
      </button>

      {pages.map((p, i) =>
        p === '…' ? (
          <span
            key={`gap-${i}`}
            className="px-1.5 text-xs text-gray-400"
            aria-hidden
          >
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => goTo(p)}
            aria-current={p === currentPage ? 'page' : undefined}
            className={`min-w-[28px] rounded-md border px-2 py-1.5 text-xs transition ${
              p === currentPage
                ? 'border-gray-900 bg-gray-900 font-semibold text-white'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900'
            }`}
          >
            {p}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => goTo(currentPage + 1)}
        disabled={currentPage >= totalPages}
        aria-label={t('library.pagination.next')}
        className="rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-600 transition hover:border-gray-300 hover:text-gray-900 disabled:cursor-not-allowed disabled:border-gray-100 disabled:bg-gray-50 disabled:text-gray-300"
      >
        →
      </button>
    </nav>
  );
}

/**
 * Compute the visible page window with ellipsis. Returns a list of page
 * numbers and `'…'` separators. Examples:
 *   - 3 of 3   → [1, 2, 3]
 *   - 1 of 7   → [1, 2, 3, 4, 5, 6, 7]
 *   - 5 of 12  → [1, '…', 4, 5, 6, '…', 12]
 *   - 1 of 12  → [1, 2, 3, '…', 12]
 *   - 12 of 12 → [1, '…', 10, 11, 12]
 *
 * Always shows: first page, last page, current page, and current ± 1.
 * Replaces longer gaps with a single '…' so the pager stays one line.
 */
function computePageWindow(current: number, total: number): Array<number | '…'> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const out: Array<number | '…'> = [];
  const push = (v: number | '…') => {
    if (out.length === 0 || out[out.length - 1] !== v) out.push(v);
  };

  push(1);
  if (current - 1 > 2) push('…');
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    push(p);
  }
  if (current + 1 < total - 1) push('…');
  push(total);

  return out;
}
