import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type * as Y from 'yjs';
import type {
  CanvasDef,
  ChartConfig,
  Lang,
  PinClass,
  XAxisItem,
} from '@canvas-collab/shared';
import {
  resolveChartLabel,
  updateChartConfigLabel,
  type ChartConfigLabelKey,
  type ChartConfigOverrides,
} from '../../collab/chartConfig';
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
  displayName: string;
  lang: Lang;
  /** Pin class id to scroll into view (selection-driven). */
  scrollToClassId?: string | null;
}

/**
 * Right-panel content for `selection.kind in {none, canvas}` when the
 * `rightInspectorTab` is 'config'. Surfaces every editable knob that
 * lives on the canvas itself:
 *
 *   1. Y axis labels (chart-canvas only) — overrides the manifest.
 *   2. X axis factor list (chart-canvas only).
 *   3. Pin classes (legend) — applies to all canvases.
 *
 * Sections 2 and 3 are imported from `LegendInspector.tsx` so the
 * `selection.kind === 'pinClass'` path and this Config tab share the
 * same row components / dialogs.
 *
 * Editing one Y-axis label only writes the active language; the other
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
  displayName,
  lang,
  scrollToClassId,
}: Props) {
  void def;
  const { t } = useTranslation();
  const showYAxis = !!yAxis;

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-7 overflow-y-auto p-5">
        {showYAxis && yAxis && (
          <section>
            <div className="text-[11px] font-medium uppercase tracking-wider text-gray-500">
              {t('inspector.config.yAxisHeader')}
            </div>
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
          </section>
        )}

        {factors && (
          <FactorsSection doc={doc} factors={factors} lang={lang} />
        )}

        <LegendSection
          doc={doc}
          classes={classes}
          displayName={displayName}
          lang={lang}
          scrollToClassId={scrollToClassId}
        />
      </div>
    </div>
  );
}

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
