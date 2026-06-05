import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Lang } from '@pingarden/shared';
import { api, type CanvasDefSummary } from '../api/client';
import { CanvasThumb } from '../canvas/CanvasThumb';

interface Props {
  /** Called when the user picks a template. The page handles creation + nav. */
  onPick: (defId: string) => void;
  /**
   * When `true`, render as a square `+` button (for the collapsed
   * sidebar rail). The popover is anchored to a fixed-width box so the
   * template list stays readable even though the rail is narrow.
   */
  compact?: boolean;
}

/**
 * Inline popover spawned from the "+ Add canvas" button in the sidebar.
 * Lists available templates with mini-thumbnails. Click a template → emit.
 */
export function AddCanvasMenu({ onPick, compact = false }: Props) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [defs, setDefs] = useState<CanvasDefSummary[] | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open && defs === null) api.listDefs().then(setDefs);
  }, [open, defs]);

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

  const lang = (i18n.language as Lang) ?? 'en';

  return (
    <div ref={ref} className="relative">
      {compact ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={t('workspace.addCanvas')}
          title={t('workspace.addCanvas')}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-dashed border-gray-300 text-base text-gray-500 hover:border-gray-400 hover:text-gray-900"
        >
          +
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full rounded-lg border border-dashed border-gray-300 px-3 py-2 text-left text-xs text-gray-600 hover:border-gray-400 hover:text-gray-900"
        >
          {t('workspace.addCanvas')}
        </button>
      )}
      {open && (
        <div
          className={
            compact
              ? 'absolute bottom-0 left-full z-20 ml-2 w-[240px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg'
              : 'absolute bottom-full left-0 right-0 z-20 mb-2 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg'
          }
        >
          <div className="border-b border-gray-100 px-3 py-2 text-xs font-medium uppercase tracking-wider text-gray-500">
            {t('addCanvas.title')}
          </div>
          {defs === null ? (
            <div className="px-3 py-3 text-sm text-gray-400">…</div>
          ) : (
            defs.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  setOpen(false);
                  onPick(d.id);
                }}
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-gray-50"
              >
                <CanvasThumb id={d.id} />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    {t(`templates.${d.id}.name`, d.name[lang])}
                  </div>
                  <div className="text-[11px] text-gray-500">
                    {t(`templates.${d.id}.tagline`, '')}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
