import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CanvasMeta, Project } from '@pingarden/shared';

export interface ProjectWithCanvases extends Project {
  canvases: CanvasMeta[];
}

interface Props {
  projects: ProjectWithCanvases[];
  onSelect: (project: ProjectWithCanvases) => void;
  onRequestDelete: (project: ProjectWithCanvases) => void;
  disabled?: boolean;
}

export function ProjectPicker({ projects, onSelect, onRequestDelete, disabled }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  const dateFmt = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'short',
  });

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`rounded-xl border px-8 py-4 text-base font-semibold transition-all ${
          disabled
            ? 'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-300'
            : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300 hover:bg-gray-50 active:scale-[0.98]'
        }`}
      >
        {t('home.openExistingProject')}
      </button>

      {open && !disabled && (
        <div className="absolute left-1/2 top-full z-20 mt-2 w-80 -translate-x-1/2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
          {projects.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-400">
              {t('home.noProjects')}
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto py-1">
              {projects.map((p) => {
                const isLibrary = p.source === 'library';
                return (
                <div
                  key={p.id}
                  className="group flex items-start gap-1 px-3 py-2.5 hover:bg-gray-50"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onSelect(p);
                    }}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium text-gray-900">
                        {p.name}
                      </span>
                      {isLibrary && (
                        <span className="shrink-0 rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-medium text-amber-700">
                          {t('library.readOnlyBadge')}
                        </span>
                      )}
                    </div>
                    {p.description ? (
                      <div className="mt-0.5 line-clamp-1 text-xs text-gray-500">
                        {p.description}
                      </div>
                    ) : null}
                    <div className="mt-0.5 text-[11px] text-gray-400">
                      {t('home.canvasCount', { count: p.canvases.length })} ·{' '}
                      {dateFmt.format(new Date(p.updatedAt))}
                    </div>
                  </button>
                  {!isLibrary && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpen(false);
                        onRequestDelete(p);
                      }}
                      className="mt-0.5 shrink-0 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                      title={t('confirm.delete')}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      </svg>
                    </button>
                  )}
                </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
