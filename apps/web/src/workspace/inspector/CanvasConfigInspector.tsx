import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type * as Y from 'yjs';
import type {
  CanvasDef,
  ChartConfig,
  Lang,
  PinClass,
  XAxisItem,
} from '@canvas-collab/shared';
import { STICKY_PALETTE } from '@canvas-collab/shared';
import {
  resolveChartLabel,
  updateChartConfigLabel,
  type ChartConfigLabelKey,
  type ChartConfigOverrides,
} from '../../collab/chartConfig';
import {
  removeColorLegendEntry,
  updateColorLegendEntry,
  type ColorLegendMap,
} from '../../collab/colorLegend';
import { useStickyLegendFocus } from '../../state/stickyLegendFocus';
import { FactorsSection, LegendSection } from './LegendInspector';

interface Props {
  doc: Y.Doc;
  def: CanvasDef;
  classes: PinClass[];
  /** Provided when the canvas's plugin is `chart-canvas`; otherwise undefined → factor section hidden. */
  factors?: XAxisItem[];
  /** Manifest-level Y axis config; undefined when the plugin is not chart-canvas. */
  yAxis?: ChartConfig['yAxis'];
  /** Live overrides from the doc's chartConfig Y.Map. */
  overrides: ChartConfigOverrides;
  /** Live per-canvas sticky-color legend (hex → entry). */
  colorLegend: ColorLegendMap;
  displayName: string;
  lang: Lang;
  /** Pin class id to scroll into view (selection-driven). */
  scrollToClassId?: string | null;
  /** Sticky-palette hex to scroll/highlight (selection-driven). */
  scrollToStickyColor?: string | null;
}

/**
 * Right-panel content for `selection.kind in {none, canvas, pinClass,
 * stickyColor}` when the `rightInspectorTab` is 'config'. Lays out the
 * canvas-level editable knobs as **three visually distinct cards**, in
 * this order:
 *
 *   1. **Strategy axis & factors** — chart-canvas only. Y-axis labels +
 *      X-axis competition factors share one card with a thin internal
 *      divider, because conceptually they're both "this canvas's
 *      strategic coordinate system" and the chart-canvas plugin is the
 *      only place either appears.
 *   2. **Pin legend** — applies to every canvas. List + Add affordance.
 *   3. **Sticky color legend** — applies to every canvas. Renders only
 *      entries the user has touched, with a `+ Add sticky legend`
 *      button that opens a popover of the still-unused palette colours.
 *
 * Each card carries its own header + one-line hint, so the imported
 * `LegendSection` / `FactorsSection` are mounted with `hideHeader` to
 * avoid double-titling.
 *
 * Editing a Y-axis label only writes the active language; the other
 * language is preserved (or kept falling back to manifest if it never
 * had an override). Per-language editing matches how factor labels
 * already work.
 */
export function CanvasConfigInspector({
  doc,
  def,
  classes,
  factors,
  yAxis,
  overrides,
  colorLegend,
  displayName,
  lang,
  scrollToClassId,
  scrollToStickyColor,
}: Props) {
  void def;
  const { t } = useTranslation();
  const showYAxis = !!yAxis;
  const showStrategyCard = showYAxis || !!factors;

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {showStrategyCard && (
          <Card
            title={t('inspector.config.sectionStrategy')}
            hint={t('inspector.config.sectionStrategyHint')}
          >
            {showYAxis && yAxis && (
              <div>
                <SubHeader text={t('inspector.config.yAxisHeader')} />
                <p className="mt-1 text-[11px] leading-snug text-gray-500">
                  {t('inspector.config.yAxisHint')}
                </p>
                <div className="mt-3 space-y-2">
                  <YAxisLabelRow
                    doc={doc}
                    lang={lang}
                    fieldKey="yAxisLabel"
                    label={t('inspector.config.yAxisLabel')}
                    manifestLabel={yAxis.label}
                    override={overrides.yAxisLabel}
                  />
                  <YAxisLabelRow
                    doc={doc}
                    lang={lang}
                    fieldKey="yAxisHighLabel"
                    label={t('inspector.config.yAxisHighLabel')}
                    manifestLabel={yAxis.highLabel}
                    override={overrides.yAxisHighLabel}
                  />
                  <YAxisLabelRow
                    doc={doc}
                    lang={lang}
                    fieldKey="yAxisLowLabel"
                    label={t('inspector.config.yAxisLowLabel')}
                    manifestLabel={yAxis.lowLabel}
                    override={overrides.yAxisLowLabel}
                  />
                </div>
              </div>
            )}

            {showYAxis && factors && (
              <hr className="my-4 border-gray-100" />
            )}

            {factors && (
              <div>
                <SubHeader text={t('chart.factorsHeader')} />
                <div className="mt-2">
                  <FactorsSection
                    doc={doc}
                    factors={factors}
                    lang={lang}
                    hideHeader
                  />
                </div>
              </div>
            )}
          </Card>
        )}

        <Card
          title={t('inspector.config.sectionPins')}
          hint={t('inspector.config.sectionPinsHint')}
        >
          <LegendSection
            doc={doc}
            classes={classes}
            displayName={displayName}
            lang={lang}
            scrollToClassId={scrollToClassId}
            hideHeader
          />
        </Card>

        <Card
          title={t('inspector.config.sectionStickies')}
          hint={t('inspector.config.sectionStickiesHint')}
        >
          <StickyLegendSection
            doc={doc}
            legend={colorLegend}
            lang={lang}
            scrollToHex={scrollToStickyColor ?? null}
          />
        </Card>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Card chrome
// ──────────────────────────────────────────────────────────────────────

interface CardProps {
  title: string;
  hint?: string;
  children: React.ReactNode;
}

/**
 * Rounded-border container that visually delineates one super-section
 * (Strategy / Pin / Sticky) from the next. Strong header + faint hint
 * line up top so even at a glance the user knows which area they're
 * editing.
 */
function Card({ title, hint, children }: CardProps) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="text-[12px] font-semibold uppercase tracking-wider text-gray-800">
        {title}
      </h3>
      {hint && (
        <p className="mt-1 text-[11px] leading-snug text-gray-500">{hint}</p>
      )}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function SubHeader({ text }: { text: string }) {
  return (
    <div className="text-[11px] font-medium uppercase tracking-wider text-gray-500">
      {text}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Y axis label row
// ──────────────────────────────────────────────────────────────────────

interface YAxisLabelRowProps {
  doc: Y.Doc;
  lang: Lang;
  fieldKey: ChartConfigLabelKey;
  label: string;
  manifestLabel: { en: string; zh: string } | undefined;
  override: { en?: string; zh?: string } | undefined;
}

/**
 * One editable Y-axis label slot for the active UI language.
 *
 * - Input value reflects the override for the active lang only (so blank
 *   means "no override yet" rather than "explicitly empty"). The
 *   manifest fallback is shown as the placeholder so the user always
 *   knows what label is currently rendering on the canvas.
 * - On blur or Enter, write to the doc; if the user typed only
 *   whitespace we delete the override (handled in
 *   `updateChartConfigLabel`).
 * - The "reset to default" affordance is implicit — empty the field +
 *   blur and the override goes away.
 */
function YAxisLabelRow({
  doc,
  lang,
  fieldKey,
  label,
  manifestLabel,
  override,
}: YAxisLabelRowProps) {
  const overrideForLang = override?.[lang] ?? '';
  const [draft, setDraft] = useState(overrideForLang);
  // Keep draft in sync if the override changes elsewhere (other tab,
  // other client). Same `useStableSync` pattern as ClassRow / FactorRow.
  const syncKey = `${fieldKey}|${lang}|${overrideForLang}`;
  useStableSync(syncKey, () => setDraft(overrideForLang));

  // Placeholder: the manifest value for the active lang, falling back
  // through `resolveChartLabel`'s order so we never show an empty hint.
  const placeholder = resolveChartLabel(manifestLabel, undefined, lang);

  function commit() {
    if (draft === overrideForLang) return;
    updateChartConfigLabel(doc, fieldKey, lang, draft);
  }

  return (
    <label className="block">
      <span className="block text-[11px] text-gray-500">{label}</span>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') {
            setDraft(overrideForLang);
            (e.target as HTMLInputElement).blur();
          }
        }}
        placeholder={placeholder}
        className="mt-1 w-full rounded border border-gray-200 px-2 py-1 text-sm text-gray-900 hover:border-gray-300 focus:border-gray-900 focus:outline-none"
      />
    </label>
  );
}

/**
 * Local copy of the same helper used in LegendInspector — re-running
 * `effect()` whenever `key` changes between renders. We don't want to
 * import the unexported version; this stays small enough.
 */
function useStableSync(key: string, effect: () => void): string {
  const [last, setLast] = useState(key);
  if (last !== key) {
    setLast(key);
    effect();
  }
  return last;
}

// ──────────────────────────────────────────────────────────────────────
// Sticky color legend section
// ──────────────────────────────────────────────────────────────────────

interface StickyLegendSectionProps {
  doc: Y.Doc;
  legend: ColorLegendMap;
  lang: Lang;
  /** Hex to highlight (e.g. row just clicked from the canvas overlay). */
  scrollToHex: string | null;
}

/**
 * Sticky-color legend editor.
 *
 * Behaviour was changed to match the pin-legend pattern:
 *   - Renders ONLY rows the user has created (label or description
 *     non-empty in the live `legend` map). Empty palette slots are not
 *     stamped out as placeholder rows.
 *   - `+ Add sticky legend` button at the bottom opens a popover that
 *     shows all six palette swatches; already-used hexes are dimmed
 *     and unclickable. Clicking an unused swatch creates a new entry
 *     with a default placeholder label and immediately highlights the
 *     row so the user can type the real label.
 *   - Disabled `+ Add` button when all six colours have been claimed,
 *     with a tooltip explaining why.
 *
 * `scrollToHex` highlights the matching row when the user lands here
 * via a chip click on the canvas overlay (or right after creating a
 * new entry through the popover, via local state).
 */
function StickyLegendSection({
  doc,
  legend,
  lang,
  scrollToHex,
}: StickyLegendSectionProps) {
  const { t } = useTranslation();
  // Tracks the row that was JUST created via the popover so we
  // highlight + focus it. Cleared after one render cycle of viewing.
  const [justAddedHex, setJustAddedHex] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  // External focus signal — set by the canvas-overlay `+ 便签图例`
  // button when it auto-creates an entry. We read it once, focus the
  // matching row, then clear the signal so re-renders don't re-focus.
  const pendingFocusHex = useStickyLegendFocus((s) => s.pendingFocusHex);

  // Visible rows: any palette hex that has either a label or a
  // description in the live map. Order follows STICKY_PALETTE so the
  // visual order in the inspector matches the chip strip in the
  // overlay.
  const visibleHexes: string[] = [];
  for (const hex of STICKY_PALETTE) {
    const e = legend[hex];
    if (e && (e.label.trim().length > 0 || (e.description ?? '').trim().length > 0)) {
      visibleHexes.push(hex);
    }
  }
  const usedSet = new Set(visibleHexes);
  const allUsed = usedSet.size >= STICKY_PALETTE.length;

  // Effective highlight: explicit selection-driven hex wins; otherwise
  // the just-added row.
  const highlightHex = scrollToHex ?? justAddedHex;

  function handlePick(hex: string) {
    const idx = visibleHexes.length + 1;
    const defaultLabel = lang === 'zh' ? `标签 ${idx}` : `Label ${idx}`;
    updateColorLegendEntry(doc, hex, { label: defaultLabel });
    setJustAddedHex(hex);
    setPickerOpen(false);
  }

  return (
    <section>
      {visibleHexes.length === 0 ? (
        <p className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-[11px] italic leading-snug text-gray-500">
          {t('stickyLegend.empty')}
        </p>
      ) : (
        <ul className="space-y-2">
          {visibleHexes.map((hex) => (
            <StickyLegendRow
              key={hex}
              doc={doc}
              hex={hex}
              entry={legend[hex] ?? { label: '' }}
              highlight={highlightHex === hex}
              autoFocusLabel={
                justAddedHex === hex || pendingFocusHex === hex
              }
              onCleared={() => {
                if (justAddedHex === hex) setJustAddedHex(null);
              }}
            />
          ))}
        </ul>
      )}

      <div className="relative mt-2">
        <button
          type="button"
          disabled={allUsed}
          onClick={() => setPickerOpen((v) => !v)}
          title={
            allUsed
              ? t('stickyLegend.addEntryAllUsed')
              : t('stickyLegend.addEntryPickHint')
          }
          className="w-full rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:border-gray-400 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-gray-300 disabled:hover:text-gray-600"
        >
          {t('stickyLegend.addEntry')}
        </button>
        {pickerOpen && !allUsed && (
          <ColorPickerPopover
            usedHexes={usedSet}
            onPick={handlePick}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </div>
    </section>
  );
}

interface ColorPickerPopoverProps {
  usedHexes: Set<string>;
  onPick: (hex: string) => void;
  onClose: () => void;
}

/**
 * Popover anchored to the `+ Add sticky legend` button. Renders all six
 * palette swatches; already-used hexes are visually dimmed and not
 * clickable. Outside-click + Escape close.
 */
function ColorPickerPopover({
  usedHexes,
  onPick,
  onClose,
}: ColorPickerPopoverProps) {
  const { t } = useTranslation();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div
      ref={wrapRef}
      className="absolute left-0 right-0 top-full z-30 mt-1 rounded-lg border border-gray-200 bg-white p-3 shadow-md"
    >
      <p className="mb-2 text-[11px] text-gray-600">
        {t('stickyLegend.addEntryPickHint')}
      </p>
      <div className="flex flex-wrap gap-2">
        {STICKY_PALETTE.map((hex) => {
          const used = usedHexes.has(hex);
          return (
            <button
              key={hex}
              type="button"
              disabled={used}
              onClick={() => onPick(hex)}
              title={used ? t('stickyLegend.addEntryColorUsed') : hex}
              aria-label={hex}
              className={`h-7 w-7 rounded-full border transition ${
                used
                  ? 'cursor-not-allowed border-gray-200 opacity-30'
                  : 'border-gray-300 hover:scale-110 hover:border-gray-900'
              }`}
              style={{ backgroundColor: hex }}
            />
          );
        })}
      </div>
    </div>
  );
}

interface StickyLegendRowProps {
  doc: Y.Doc;
  hex: string;
  entry: { label: string; description?: string };
  highlight: boolean;
  /** True for a row that was just freshly added — focus the label input. */
  autoFocusLabel: boolean;
  /** Notify parent when this row is fully cleared (so it can drop its highlight). */
  onCleared: () => void;
}

function StickyLegendRow({
  doc,
  hex,
  entry,
  highlight,
  autoFocusLabel,
  onCleared,
}: StickyLegendRowProps) {
  const { t } = useTranslation();
  const [labelDraft, setLabelDraft] = useState(entry.label);
  const [descDraft, setDescDraft] = useState(entry.description ?? '');
  const labelInputRef = useRef<HTMLInputElement | null>(null);

  // Focus + select the label input on first mount when this row was
  // just added — saves the user a click after picking a colour.
  // Also clears the global `useStickyLegendFocus` signal so the next
  // mount of this same row (e.g. after a re-render upstream) doesn't
  // re-focus.
  useEffect(() => {
    if (autoFocusLabel) {
      labelInputRef.current?.focus();
      labelInputRef.current?.select();
      useStickyLegendFocus.getState().clear();
    }
    // We only want this on first mount for an auto-focused row; deps
    // intentionally tight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-sync drafts when the underlying Y.Map mutates from elsewhere
  // (e.g. another tab, or a bulk import). Using two separate sync keys
  // keeps each input independent — typing in label doesn't reset the
  // description draft.
  useStableSync(`${hex}|label|${entry.label}`, () => setLabelDraft(entry.label));
  useStableSync(`${hex}|desc|${entry.description ?? ''}`, () =>
    setDescDraft(entry.description ?? ''),
  );

  function commitLabel() {
    if (labelDraft === entry.label) return;
    updateColorLegendEntry(doc, hex, { label: labelDraft });
  }
  function commitDesc() {
    if (descDraft === (entry.description ?? '')) return;
    updateColorLegendEntry(doc, hex, { description: descDraft });
  }

  const hasContent =
    entry.label.trim().length > 0 || (entry.description ?? '').trim().length > 0;

  return (
    <li
      className={`flex items-start gap-2 rounded-lg border p-2 ${
        highlight ? 'border-gray-900 bg-gray-50' : 'border-gray-200 bg-white'
      }`}
    >
      <span
        aria-hidden
        className="mt-1 h-5 w-5 flex-shrink-0 rounded-sm border border-black/10"
        style={{ backgroundColor: hex }}
      />
      <div className="min-w-0 flex-1 space-y-1">
        <input
          ref={labelInputRef}
          value={labelDraft}
          onChange={(e) => setLabelDraft(e.target.value)}
          onBlur={commitLabel}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') {
              setLabelDraft(entry.label);
              (e.target as HTMLInputElement).blur();
            }
          }}
          placeholder={t('stickyLegend.labelPlaceholder')}
          className="w-full rounded border border-gray-200 px-2 py-1 text-sm text-gray-900 hover:border-gray-300 focus:border-gray-900 focus:outline-none"
        />
        <input
          value={descDraft}
          onChange={(e) => setDescDraft(e.target.value)}
          onBlur={commitDesc}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') {
              setDescDraft(entry.description ?? '');
              (e.target as HTMLInputElement).blur();
            }
          }}
          placeholder={t('stickyLegend.descriptionPlaceholder')}
          className="w-full rounded border border-gray-200 px-2 py-1 text-[11px] text-gray-700 hover:border-gray-300 focus:border-gray-900 focus:outline-none"
        />
      </div>
      <button
        type="button"
        onClick={() => {
          // Clear both fields — the row visually disappears under the
          // new "render only touched rows" rule. Non-destructive (no
          // stickies are deleted) so we skip the ConfirmDialog.
          setLabelDraft('');
          setDescDraft('');
          removeColorLegendEntry(doc, hex);
          onCleared();
        }}
        disabled={!hasContent}
        aria-label="Clear"
        title={t('stickyLegend.deleteEntryTitle')}
        className="rounded px-1 text-[11px] text-gray-400 hover:bg-gray-100 hover:text-red-600 disabled:opacity-30"
      >
        ×
      </button>
    </li>
  );
}
