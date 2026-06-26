import { useEffect, useRef, useState } from 'react';

interface MenuItem {
  label: string;
  onClick: () => void;
  /** Optional — applies a danger style (red) when true. */
  danger?: boolean;
}

interface Props {
  items: MenuItem[];
  /** Visible label inside the trigger; defaults to "···". */
  label?: React.ReactNode;
  /** Optional class extension for the trigger button. */
  className?: string;
  /** Anchor side; default "right" places the menu under the right edge. */
  align?: 'left' | 'right';
}

/**
 * Tiny accessible "···" dropdown menu. Closes on outside click + Escape.
 * Used in ProjectSidebar (canvas row), ProjectListPage (project card),
 * HistoryPage (milestone row).
 */
export function MenuButton({ items, label = '···', className = '', align = 'right' }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen((v) => !v);
        }}
        className={`rounded px-1.5 py-0.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 ${className}`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {label}
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute z-20 mt-1 min-w-[140px] overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {items.map((it, i) => (
            <button
              key={i}
              type="button"
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setOpen(false);
                it.onClick();
              }}
              className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50 ${
                it.danger ? 'text-red-600' : 'text-gray-800'
              }`}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
