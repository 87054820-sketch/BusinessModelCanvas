import { useEffect, useMemo, useRef, useState } from 'react';
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
  const [query, setQuery] = useState('');
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
  const filteredDefs = useMemo(() => {
    if (!defs) return null;
    const needle = query.trim().toLowerCase();
    if (!needle) return defs;
    return defs.filter((d) => {
      const name = d.name[lang] ?? d.name.en;
      const tagline = String(t(`templates.${d.id}.tagline`, ''));
      return [d.id, name, tagline].some((value) => value.toLowerCase().includes(needle));
    });
  }, [defs, lang, query, t]);

  return (
    <div ref={ref} className="relative">
      {compact ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={t('workspace.addCanvas')}
          title={t('workspace.addCanvas')}
          className="brand-primary-button flex h-10 w-10 items-center justify-center rounded-xl text-lg font-semibold outline-none transition-all active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2"
        >
          +
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="brand-primary-button flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold outline-none transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2"
        >
          {t('workspace.addCanvas')}
        </button>
      )}
      {open && (
        <div
          className={
            compact
              ? 'absolute bottom-0 left-full z-20 ml-2 flex max-h-[min(70vh,32rem)] w-[280px] flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg'
              : 'absolute bottom-full left-0 right-0 z-20 mb-2 flex max-h-[min(70vh,32rem)] flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg'
          }
        >
          <div className="shrink-0 border-b border-gray-100 px-3 py-2">
            <div className="text-xs font-medium uppercase tracking-wider text-gray-500">
              {t('addCanvas.title')}
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('addCanvas.searchPlaceholder')}
              className="mt-2 w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-[12px] text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-gray-300 focus:ring-2 focus:ring-gray-100"
            />
          </div>
          {filteredDefs === null ? (
            <div className="px-3 py-3 text-sm text-gray-400">…</div>
          ) : filteredDefs.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-gray-400">
              {t('addCanvas.noMatches')}
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto py-1">
              {filteredDefs.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setQuery('');
                    onPick(d.id);
                  }}
                  className="flex w-full items-center gap-3 border-b border-gray-100 px-3 py-2 text-left last:border-b-0 hover:bg-emerald-50/60"
                >
                  <CanvasThumb id={d.id} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-gray-900">
                      {d.name[lang]}
                    </div>
                    <div className="truncate text-[11px] text-gray-500">
                      {t(`templates.${d.id}.tagline`, '')}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
