import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type * as Y from 'yjs';
import type {
  Lang,
  PinClass,
  PinIcon,
  XAxisItem,
} from '@canvas-collab/shared';
import { CHART_PALETTE } from '@canvas-collab/shared';
import {
  addPinClass,
  removePinClass,
  updatePinClass,
} from '../../collab/pinClasses';
import { clearPinsForClass } from '../../collab/pins';
import {
  addXAxisItem,
  moveXAxisItem,
  removeXAxisItem,
  resolveLabel,
  updateXAxisItem,
} from '../../collab/xAxisItems';
import { useActiveClass } from '../../state/activeClass';
import { ConfirmDialog } from '../../ui/ConfirmDialog';

const ICONS: Array<{ id: PinIcon; glyph: string }> = [
  { id: 'circle', glyph: '●' },
  { id: 'triangle', glyph: '▲' },
  { id: 'square', glyph: '■' },
  { id: 'star', glyph: '★' },
  { id: 'flag', glyph: '⚑' },
];

/**
 * Two reusable inspector sub-sections: `LegendSection` (pin-class CRUD)
 * and `FactorsSection` (X-axis factor list — chart-canvas plugin only).
 *
 * Both sections are headless about scrolling — they render inline,
 * meant to be stacked in a parent that owns scroll. They each own their
 * own ConfirmDialog for delete operations because deletion is destructive
 * and benefits from a per-row prompt.
 *
 * `LegendInspector` (default export) keeps the prior behaviour for the
 * `selection.kind === 'pinClass'` path — the legend palette's ✎ button
 * still selects a class, and this wrapper scrolls/highlights it.
 *
 * `CanvasConfigInspector` composes these sections with a Y-axis label
 * editor on top.
 */

// ──────────────────────────────────────────────────────────────────────
// LegendSection — pin classes
// ──────────────────────────────────────────────────────────────────────

interface LegendSectionProps {
  doc: Y.Doc;
  classes: PinClass[];
  displayName: string;
  lang: Lang;
  /** When set, scroll/highlight that class row. Used by the chip ✎ path. */
  scrollToClassId?: string | null;
}

export function LegendSection({
  doc,
  classes,
  displayName,
  lang,
  scrollToClassId,
}: LegendSectionProps) {
  const { t } = useTranslation();
  const [pendingDelete, setPendingDelete] = useState<PinClass | null>(null);

  function handleAdd() {
    const idx = classes.length + 1;
    const id = addPinClass(doc, {
      label: lang === 'zh' ? `类别 ${idx}` : `Class ${idx}`,
      authorName: displayName,
    });
    useActiveClass.getState().pickClass(id);
  }

  return (
    <section>
      <div className="text-[11px] font-medium uppercase tracking-wider text-gray-500">
        {t('legend.header')}
      </div>
      <p className="mt-1 text-[11px] leading-snug text-gray-500">
        {t('legend.headerHint')}
      </p>

      <ul className="mt-3 space-y-1.5">
        {classes.map((c) => (
          <ClassRow
            key={c.id}
            cls={c}
            lang={lang}
            highlight={scrollToClassId === c.id}
            onLabel={(label) => updatePinClass(doc, c.id, { label })}
            onColor={(color) => updatePinClass(doc, c.id, { color })}
            onIcon={(icon) => updatePinClass(doc, c.id, { icon })}
            onDelete={() => setPendingDelete(c)}
            onActivate={() => useActiveClass.getState().pickClass(c.id)}
          />
        ))}
      </ul>
      <button
        type="button"
        onClick={handleAdd}
        className="mt-2 w-full rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:border-gray-400 hover:text-gray-900"
      >
        {t('legend.addClass')}
      </button>

      <ConfirmDialog
        open={!!pendingDelete}
        title={t('legend.deleteClassTitle')}
        message={t('legend.deleteClassMsg', {
          name: pendingDelete?.label ?? '',
        })}
        confirmLabel={t('confirm.delete')}
        cancelLabel={t('confirm.cancel')}
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (!pendingDelete) return;
          // Cascade: drop all pins of this class first, then the class itself.
          clearPinsForClass(doc, pendingDelete.id);
          removePinClass(doc, pendingDelete.id);
          if (useActiveClass.getState().activeClassId === pendingDelete.id) {
            useActiveClass.getState().clearActive();
          }
          setPendingDelete(null);
        }}
      />
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────
// FactorsSection — X-axis factors (chart-canvas only)
// ──────────────────────────────────────────────────────────────────────

interface FactorsSectionProps {
  doc: Y.Doc;
  factors: XAxisItem[];
  lang: Lang;
}

export function FactorsSection({ doc, factors, lang }: FactorsSectionProps) {
  const { t } = useTranslation();
  const [pendingDelete, setPendingDelete] = useState<XAxisItem | null>(null);

  function handleAdd() {
    const idx = factors.length + 1;
    addXAxisItem(doc, {
      label: {
        en: `Factor ${idx}`,
        zh: `因子 ${idx}`,
      },
    });
  }

  return (
    <section>
      <div className="text-[11px] font-medium uppercase tracking-wider text-gray-500">
        {t('chart.factorsHeader')}
      </div>
      <ul className="mt-2 space-y-1">
        {factors.map((f, i) => (
          <FactorRow
            key={f.id}
            factor={f}
            index={i}
            total={factors.length}
            lang={lang}
            onRename={(label) => {
              if (lang === 'zh') updateXAxisItem(doc, f.id, { labelZh: label });
              else updateXAxisItem(doc, f.id, { labelEn: label });
            }}
            onMove={(dir) => {
              const to = dir === 'up' ? i - 1 : i + 1;
              if (to < 0 || to >= factors.length) return;
              moveXAxisItem(doc, i, to);
            }}
            onDelete={() => setPendingDelete(f)}
          />
        ))}
      </ul>
      <button
        type="button"
        onClick={handleAdd}
        className="mt-2 w-full rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:border-gray-400 hover:text-gray-900"
      >
        {t('chart.addFactor')}
      </button>

      <ConfirmDialog
        open={!!pendingDelete}
        title={t('chart.deleteFactorTitle')}
        message={t('chart.deleteFactorMsg', {
          name: pendingDelete ? resolveLabel(pendingDelete, lang) : '',
        })}
        confirmLabel={t('confirm.delete')}
        cancelLabel={t('confirm.cancel')}
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (!pendingDelete) return;
          // We don't cascade-remove pins by factor — pins live in viewBox
          // (x, y) and don't reference factorId. The user simply sees the
          // X axis lose a column; pins keep their absolute x.
          removeXAxisItem(doc, pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────
// LegendInspector — the wrapper used by selection.kind === 'pinClass'
// ──────────────────────────────────────────────────────────────────────

interface LegendInspectorProps {
  doc: Y.Doc;
  classes: PinClass[];
  /** Provided when the canvas's plugin is `chart-canvas`; otherwise undefined → factor section hidden. */
  factors?: XAxisItem[];
  /** Same — manifest yAxis config, undefined for non-chart canvases. */
  yAxis?: unknown;
  displayName: string;
  lang: Lang;
  scrollToClassId?: string | null;
}

/**
 * Right-panel content for `selection.kind === 'pinClass'`. Composes the
 * legend section (and, on chart-canvas, the factor section) into a
 * single scrollable column. The Y-axis labels live in
 * `CanvasConfigInspector` instead — `pinClass` is class-level focus.
 */
export function LegendInspector({
  doc,
  classes,
  factors,
  yAxis,
  displayName,
  lang,
  scrollToClassId,
}: LegendInspectorProps) {
  void yAxis;
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-7 overflow-y-auto p-5">
        <LegendSection
          doc={doc}
          classes={classes}
          displayName={displayName}
          lang={lang}
          scrollToClassId={scrollToClassId}
        />
        {factors && (
          <FactorsSection doc={doc} factors={factors} lang={lang} />
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Internal row components
// ──────────────────────────────────────────────────────────────────────

interface ClassRowProps {
  cls: PinClass;
  lang: Lang;
  highlight: boolean;
  onLabel: (label: string) => void;
  onColor: (color: string) => void;
  onIcon: (icon: PinIcon) => void;
  onDelete: () => void;
  onActivate: () => void;
}

function ClassRow({
  cls,
  highlight,
  onLabel,
  onColor,
  onIcon,
  onDelete,
  onActivate,
}: ClassRowProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(cls.label);
  const reset = `${cls.id}|${cls.label}`;
  const lastReset = useStableSync(reset, () => setDraft(cls.label));
  void lastReset;
  const activeClassId = useActiveClass((s) => s.activeClassId);
  const isActive = activeClassId === cls.id;

  return (
    <li
      className={`group flex flex-wrap items-center gap-1.5 rounded-lg border p-2 ${
        highlight ? 'border-gray-900 bg-gray-50' : 'border-gray-200 bg-white'
      }`}
    >
      <ColorSwatch color={cls.color} onPick={onColor} />
      <IconPicker icon={cls.icon} color={cls.color} onPick={onIcon} />
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const next = draft.trim();
          if (next !== cls.label) onLabel(next || cls.label);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') {
            setDraft(cls.label);
            (e.target as HTMLInputElement).blur();
          }
        }}
        className="min-w-[0] flex-1 rounded border border-transparent px-1.5 py-0.5 text-sm text-gray-900 hover:border-gray-300 focus:border-gray-900 focus:outline-none"
      />
      <button
        type="button"
        onClick={onActivate}
        className={`rounded px-2 py-0.5 text-[11px] ${
          isActive
            ? 'bg-gray-900 text-white'
            : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
        }`}
        title={t('legend.activateHint')}
      >
        {isActive ? t('legend.active') : t('legend.activate')}
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="rounded px-1 text-[11px] text-gray-400 opacity-0 hover:bg-gray-100 hover:text-red-600 group-hover:opacity-100"
        aria-label="Delete class"
      >
        ×
      </button>
    </li>
  );
}

function ColorSwatch({ color, onPick }: { color: string; onPick: (c: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-5 w-5 rounded-full border border-gray-300 hover:ring-2 hover:ring-gray-200"
        style={{ backgroundColor: color }}
        aria-label="Color"
      />
      {open && (
        <div className="absolute left-0 top-7 z-30 flex gap-1.5 rounded-lg border border-gray-200 bg-white p-2 shadow-md">
          {CHART_PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                onPick(c);
                setOpen(false);
              }}
              className={`h-5 w-5 rounded-full border ${
                c === color ? 'border-gray-900' : 'border-gray-200'
              }`}
              style={{ backgroundColor: c }}
              aria-label={c}
            />
          ))}
        </div>
      )}
    </span>
  );
}

function IconPicker({
  icon,
  color,
  onPick,
}: {
  icon: PinIcon;
  color: string;
  onPick: (icon: PinIcon) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-5 w-5 items-center justify-center rounded border border-gray-300 hover:ring-2 hover:ring-gray-200"
        aria-label="Icon"
        style={{ color }}
      >
        <span className="text-sm leading-none">
          {ICONS.find((i) => i.id === icon)?.glyph ?? '●'}
        </span>
      </button>
      {open && (
        <div className="absolute left-0 top-7 z-30 flex gap-1 rounded-lg border border-gray-200 bg-white p-2 shadow-md">
          {ICONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                onPick(opt.id);
                setOpen(false);
              }}
              className={`flex h-6 w-6 items-center justify-center rounded border ${
                opt.id === icon ? 'border-gray-900' : 'border-gray-200'
              }`}
              style={{ color }}
              aria-label={opt.id}
            >
              <span className="text-sm">{opt.glyph}</span>
            </button>
          ))}
        </div>
      )}
    </span>
  );
}

interface FactorRowProps {
  factor: XAxisItem;
  index: number;
  total: number;
  lang: Lang;
  onRename: (label: string) => void;
  onMove: (dir: 'up' | 'down') => void;
  onDelete: () => void;
}

function FactorRow({
  factor,
  index,
  total,
  lang,
  onRename,
  onMove,
  onDelete,
}: FactorRowProps) {
  const [draft, setDraft] = useState(resolveLabel(factor, lang));
  const reset = `${factor.id}|${factor.label.en}|${factor.label.zh}|${lang}`;
  const lastReset = useStableSync(reset, () => setDraft(resolveLabel(factor, lang)));
  void lastReset;

  return (
    <li className="group flex items-center gap-1.5">
      <span className="w-5 text-right text-[11px] tabular-nums text-gray-400">
        {index + 1}.
      </span>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const next = draft.trim();
          if (next !== resolveLabel(factor, lang)) onRename(next);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') {
            setDraft(resolveLabel(factor, lang));
            (e.target as HTMLInputElement).blur();
          }
        }}
        className="flex-1 rounded border border-transparent px-1.5 py-0.5 text-sm text-gray-900 hover:border-gray-300 focus:border-gray-900 focus:outline-none"
      />
      <button
        type="button"
        onClick={() => onMove('up')}
        disabled={index === 0}
        className="rounded px-1 text-[11px] text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30"
      >
        ↑
      </button>
      <button
        type="button"
        onClick={() => onMove('down')}
        disabled={index === total - 1}
        className="rounded px-1 text-[11px] text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30"
      >
        ↓
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="rounded px-1 text-[11px] text-gray-400 opacity-0 hover:bg-gray-100 hover:text-red-600 group-hover:opacity-100"
      >
        ×
      </button>
    </li>
  );
}

function useStableSync(key: string, effect: () => void): string {
  const [last, setLast] = useState(key);
  if (last !== key) {
    setLast(key);
    effect();
  }
  return last;
}

// Keep useMemo import "alive" for future memoisation use without a
// separate eslint suppression — same pattern as the previous file.
void useMemo;
