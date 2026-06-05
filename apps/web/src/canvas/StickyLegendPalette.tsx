import { useTranslation } from 'react-i18next';
import type * as Y from 'yjs';
import type { Lang } from '@pingarden/shared';
import { STICKY_PALETTE } from '@pingarden/shared';
import {
  updateColorLegendEntry,
  useColorLegend,
  visibleLegendEntries,
} from '../collab/colorLegend';
import { useSelection } from '../state/selection';
import { useUiPrefs } from '../state/uiPrefs';
import { useActiveStickyColor } from '../state/activeStickyColor';
import { useStickyLegendFocus } from '../state/stickyLegendFocus';

interface Props {
  doc: Y.Doc;
  lang: Lang;
}

/**
 * Sticky-color legend strip — top-right overlay on the canvas, mirror
 * of the pin-class `LegendPalette` at top-left. Each chip carries one
 * `[colour disc] [label] [✎]` triplet for one sticky-palette hex that
 * has a non-empty label.
 *
 * Click affordances on each chip (mirrors LegendPalette's pin chips):
 *   - Click chip body → toggle "sticky paint" mode for that colour.
 *     While active, clicking on the canvas drops a new sticky in that
 *     colour (handler in `ProjectWorkspacePage.onCanvasClick`).
 *   - Click ✎ → open the right inspector to the Config tab and scroll
 *     to that hex's row in `StickyLegendSection`.
 *
 * The trailing `+ Sticky legend` button always opens the Config tab —
 * bootstrap path when no labels have been assigned yet.
 *
 * Per-canvas data lives in the doc's `colorLegend` Y.Map (see
 * `apps/web/src/collab/colorLegend.ts`). We removed the previous
 * project-scoped legend because different canvases in the same
 * project use the same six colours for completely different things.
 */
export function StickyLegendPalette({ doc, lang }: Props) {
  const { t } = useTranslation();
  const legend = useColorLegend(doc);
  const entries = visibleLegendEntries(legend, lang);
  const activeStickyColor = useActiveStickyColor((s) => s.activeStickyColor);
  const toggleColor = useActiveStickyColor((s) => s.toggleColor);
  const clearActive = useActiveStickyColor((s) => s.clearActive);

  function openConfigForHex(hex?: string) {
    useUiPrefs.getState().setRightInspectorTab('config');
    useUiPrefs.getState().setRightInspectorCollapsed(false);
    if (hex) useSelection.getState().selectStickyColor(hex);
    else useSelection.getState().selectCanvas();
  }

  /**
   * Canvas-overlay `+ 便签图例` click — auto-add semantics. Find the
   * next palette colour the user hasn't yet assigned meaning to, seed
   * it with a placeholder label, request label-input focus on mount,
   * and slide the right inspector to the new row. When all six
   * colours are claimed, fall through to "just open the Config tab"
   * so the user sees the disabled-state hint.
   */
  function handleAddEntry() {
    const used = new Set(entries.map((e) => e.hex));
    const nextHex = STICKY_PALETTE.find((h) => !used.has(h));
    if (!nextHex) {
      openConfigForHex(undefined);
      return;
    }
    const idx = entries.length + 1;
    const defaultLabel = lang === 'zh' ? `标签 ${idx}` : `Label ${idx}`;
    updateColorLegendEntry(doc, nextHex, { label: defaultLabel });
    useStickyLegendFocus.getState().requestFocus(nextHex);
    openConfigForHex(nextHex);
  }

  return (
    <div className="pointer-events-none absolute right-3 top-3 z-10 flex items-center gap-1.5">
      {/* Inline hint when paint mode is active — same coaching pattern as
          LegendPalette uses for pin paint. */}
      {activeStickyColor && (
        <span className="pointer-events-none mr-1 hidden items-center text-[11px] italic text-gray-500 md:flex">
          {lang === 'zh' ? '点画布落便签 · Esc 退出' : 'Click canvas to drop · Esc to stop'}
        </span>
      )}

      {/* Exit-paint affordance — mirrors LegendPalette's "✕ exit draw". */}
      {activeStickyColor && (
        <button
          type="button"
          onClick={clearActive}
          className="pointer-events-auto rounded-md border border-gray-200 bg-white/95 px-2 py-1 text-[11px] text-gray-700 shadow-sm hover:bg-gray-50"
          title={t('legend.exitDraw')}
        >
          ✕ {t('legend.exitDraw')}
        </button>
      )}

      {entries.map(({ hex, label, description }) => {
        const active = activeStickyColor === hex;
        return (
          <div
            key={hex}
            role="group"
            aria-label={label}
            className={`pointer-events-auto group flex max-w-[220px] items-center rounded-md border bg-white/95 shadow-sm transition ${
              active
                ? 'border-gray-900 ring-2 ring-gray-200'
                : 'border-gray-200 hover:border-gray-400'
            }`}
          >
            <button
              type="button"
              onClick={() => toggleColor(hex)}
              title={description ? `${label} — ${description}` : label}
              className="flex flex-1 items-center gap-1.5 px-2 py-1"
            >
              <span
                aria-hidden
                className="inline-block h-3.5 w-3.5 flex-shrink-0 rounded-full border border-black/10"
                style={{ backgroundColor: hex }}
              />
              <span className="max-w-[150px] truncate text-[11px] text-gray-700">
                {label}
              </span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openConfigForHex(hex);
              }}
              title={t('legend.editClass')}
              aria-label={t('legend.editClass')}
              className="flex h-full flex-shrink-0 items-center border-l border-gray-200 px-1.5 text-[11px] text-gray-400 hover:bg-gray-50 hover:text-gray-700"
            >
              ✎
            </button>
          </div>
        );
      })}

      <button
        type="button"
        onClick={handleAddEntry}
        className="pointer-events-auto rounded-md border border-gray-300 bg-white px-2.5 py-1 text-[12px] font-medium text-gray-700 shadow-sm hover:border-gray-900 hover:bg-gray-50 hover:text-gray-900"
        title={t('stickyLegend.addLabel')}
        aria-label={t('stickyLegend.addLabel')}
      >
        {t('stickyLegend.addLabel')}
      </button>
    </div>
  );
}
