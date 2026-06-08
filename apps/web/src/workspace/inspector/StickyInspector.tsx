import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Lang, StickyNote } from '@pingarden/shared';
import { STICKY_PALETTE } from '../../canvas/stickyColors';
import { visibleLegendEntries, type ColorLegendMap } from '../../collab/colorLegend';
import { StickyRichEditor, ensureHTML } from '../../canvas/StickyRichEditor';

interface Props {
  sticky: StickyNote;
  /** Translated block info — used to show which block the sticky is in. */
  blockTitle: string | undefined;
  /** Live canvas color legend — only colours with a non-empty `label`
   *  are offered in the swatch picker, mirroring the StickyLegendPalette
   *  on the canvas. Falls back to full STICKY_PALETTE when empty. */
  colorLegend: ColorLegendMap;
  /** Active language — passed through to `visibleLegendEntries` for
   *  symmetry with future bilingual legend entries. */
  lang: Lang;
  onText: (text: string) => void;
  onColor: (color: string) => void;
  onDelete: () => void;
}

/**
 * Right-panel content when a sticky is selected. Shape mirrors
 * `PinInspector`: a small uppercase header at the top, then a series
 * of `Field`s with optional sub-hints, then a delete button pinned to
 * the bottom. The two inspectors should read as siblings — the only
 * difference is which fields they expose.
 *
 * Field hints use the same "shown on canvas" / "not shown on canvas"
 * vocabulary that the pin inspector uses, so the user can predict
 * which inputs surface on the canvas without having to test.
 *
 * Text editing is **opt-in**: by default the body shows a read-only
 * preview of the sticky text. Clicking the preview swaps in a focused
 * textarea (the same way the canvas-side inline editor works on
 * double-click). This guarantees that selecting a sticky on the canvas
 * does NOT immediately drop the user into a text-editing mode —
 * keyboard focus stays at the page level so workspace shortcuts
 * (Cmd+C/V/X, Delete / Backspace) operate on the sticky as an OBJECT.
 */
export function StickyInspector({ sticky, blockTitle, colorLegend, lang, onText, onColor, onDelete }: Props) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);

  // Resolve which colours should be offered for the current canvas. Mirrors
  // the StickyLegendPalette logic so the inspector and the on-canvas legend
  // strip stay in lockstep — a hidden legend chip and a hidden swatch are
  // the same concept. Empty legend → fall back to the full palette so the
  // user is never trapped without options on a brand-new project.
  const visible = visibleLegendEntries(colorLegend, lang);
  const swatches: Array<{ hex: string; label: string; description?: string }> =
    visible.length === 0
      ? STICKY_PALETTE.map((hex) => ({ hex, label: '', description: undefined }))
      : visible;
  const visibleSet = new Set(swatches.map((s) => s.hex));
  const currentInLegend = visibleSet.has(sticky.color);
  const showOffLegendChip = !currentInLegend && visible.length > 0;

  // When the selected sticky changes (e.g. user clicked a different
  // sticky), drop out of edit mode so the new selection starts read-only.
  useEffect(() => {
    setEditing(false);
  }, [sticky.id]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-5">
        <div className="text-[11px] font-medium uppercase tracking-wider text-gray-500">
          {t('inspector.sticky.header')}
        </div>

        <Field
          label={t('inspector.sticky.text')}
          hint={t('inspector.sticky.textHint')}
        >
          {editing ? (
            <div className="rounded-lg border border-gray-300 px-3 py-2 focus-within:border-gray-900">
              <StickyRichEditor
                value={sticky.text}
                onCommit={(html) => {
                  if (html !== sticky.text) onText(html);
                  setEditing(false);
                }}
                autoFocus
                className="min-h-[64px]"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              title={t('inspector.sticky.clickToEdit')}
              className="block min-h-[64px] w-full cursor-text rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-sm text-gray-800 hover:border-gray-400"
            >
              {sticky.text ? (
                <span
                  className="sticky-readonly block whitespace-pre-wrap break-words"
                  dangerouslySetInnerHTML={{ __html: ensureHTML(sticky.text) }}
                />
              ) : (
                <span className="italic text-gray-400">
                  {t('inspector.sticky.clickToEdit')}
                </span>
              )}
            </button>
          )}
        </Field>

        <Field label={t('inspector.sticky.color')}>
          <div className="flex flex-wrap items-center gap-2">
            {showOffLegendChip && (
              <button
                type="button"
                disabled
                aria-disabled="true"
                title={t('inspector.sticky.colorNotInLegend')}
                className="h-8 w-8 cursor-not-allowed rounded-full border-2 border-dashed border-gray-400 opacity-60"
                style={{ backgroundColor: sticky.color }}
                aria-label={t('inspector.sticky.colorNotInLegend')}
              />
            )}
            {swatches.map((entry) => {
              const active = entry.hex === sticky.color;
              const tooltip = entry.label
                ? entry.description
                  ? `${entry.label} — ${entry.description}`
                  : entry.label
                : entry.hex;
              return (
                <button
                  key={entry.hex}
                  type="button"
                  onClick={() => onColor(entry.hex)}
                  className={`h-8 w-8 rounded-full border-2 transition ${
                    active
                      ? 'border-gray-900 ring-2 ring-gray-900/20'
                      : 'border-white hover:border-gray-300'
                  }`}
                  style={{ backgroundColor: entry.hex }}
                  title={tooltip}
                  aria-label={tooltip}
                />
              );
            })}
          </div>
          {showOffLegendChip && (
            <div className="mt-1.5 text-[11px] leading-snug text-gray-500">
              {t('inspector.sticky.colorNotInLegend')}
            </div>
          )}
        </Field>

        <Field label={t('inspector.sticky.block')}>
          <div className="text-sm text-gray-700">{blockTitle ?? sticky.zoneId}</div>
        </Field>

        {/* Author + createdAt collapsed onto one compact line — same
            visual weight as the pin inspector's missing-meta line, so
            the two inspectors don't diverge on the bottom half. */}
        <Field label={t('inspector.sticky.meta')}>
          <div className="text-[12px] text-gray-600">
            {t('inspector.sticky.metaHint', {
              author: sticky.authorName || '—',
              date: new Date(sticky.createdAt).toLocaleString(),
            })}
          </div>
        </Field>
      </div>

      <div className="border-t border-gray-200 p-4">
        {/* Compact one-line shortcuts caption — replaces the prior
            multi-line info box. The full-text version still ships in
            the delete button's tooltip for power users. */}
        <p className="mb-2 text-[11px] italic leading-snug text-gray-400">
          {t('inspector.sticky.shortcutsCompact')}
        </p>
        <button
          type="button"
          onClick={onDelete}
          title={t('inspector.sticky.shortcuts')}
          className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
        >
          {t('inspector.sticky.delete')}
        </button>
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  /** Optional sub-hint rendered between the label and the input. */
  hint?: string;
  children: React.ReactNode;
}

/**
 * Field wrapper — mirror of the one in PinInspector. Same DOM, same
 * `hint` semantics, so both inspectors render identically when read
 * side-by-side.
 */
function Field({ label, hint, children }: FieldProps) {
  return (
    <div className="mt-4">
      <div className="text-[11px] font-medium uppercase tracking-wider text-gray-500">
        {label}
      </div>
      {hint && (
        <div className="mt-0.5 text-[11px] leading-snug text-gray-500">
          {hint}
        </div>
      )}
      <div className="mt-1">{children}</div>
    </div>
  );
}
