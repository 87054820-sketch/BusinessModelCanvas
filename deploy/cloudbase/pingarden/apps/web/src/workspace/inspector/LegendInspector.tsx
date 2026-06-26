import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type * as Y from 'yjs';
import type {
  Lang,
  PinClass,
  PinIcon,
  XAxisItem,
} from '@pingarden/shared';
import { CHART_PALETTE } from '@pingarden/shared';
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

export const PIN_ICON_GLYPH: Record<PinIcon, string> = {
  circle: '●',
  triangle: '▲',
  square: '■',
  star: '★',
  flag: '⚑',
};

interface PinClassChipProps {
  cls: { color: string; icon: PinIcon; label: string };
  /** Append a downward chevron (▾) so the chip reads as a dropdown trigger. */
  withChevron?: boolean;
  /** Stronger highlight when this chip is the currently-selected option. */
  active?: boolean;
}

/**
 * Compact visual chip for one pin class — colour-tinted icon glyph +
 * label, in one line. Used in the legend palette overlay, in the pin
 * inspector's class-picker trigger, and inside the pin inspector's
 * class-picker popover so the trigger and the option rows stay
 * pixel-identical (no surprise when you click).
 *
 * The icon glyph IS the visual identity. We deliberately do NOT render
 * a separate colour disc next to it — past iterations did that and the
 * result was two circular shapes ("●" + colour disc) carrying the same
 * information. One is enough.
 */
export function PinClassChip({
  cls,
  withChevron = false,
  active = false,
}: PinClassChipProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 ${
        active ? 'font-medium text-gray-900' : 'text-gray-900'
      }`}
    >
      <span
        className="text-base leading-none"
        style={{ color: cls.color }}
        aria-hidden="true"
      >
        {PIN_ICON_GLYPH[cls.icon]}
      </span>
      <span className="truncate">{cls.label || '(unnamed)'}</span>
      {withChevron && (
        <span aria-hidden="true" className="ml-1 text-[10px] text-gray-400">
          ▾
        </span>
      )}
    </span>
  );
}

/**
 * Two reusable inspector sub-sections: `LegendSection` (pin-class CRUD)
 * and `FactorsSection` (X-axis factor list — chart-canvas plugin only).
 *
 * Both sections are headless about scrolling — they render inline,
 * meant to be stacked in a parent that owns scroll. They each own their
 * own ConfirmDialog for delete operations because deletion is destructive
 * and benefits from a per-row prompt.
 *
 * Both accept `hideHeader` so a parent (e.g. `CanvasConfigInspector`'s
 * card-based layout) that already renders its own card header can
 * suppress the inline section header to avoid double-titles. Default
 * (`false`) keeps the standalone behaviour.
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
  /**
   * Suppress the inline `legend.header` + hint. Intended for parents that
   * already render their own section title (e.g. `CanvasConfigInspector`'s
   * card layout).
   */
  hideHeader?: boolean;
}

export function LegendSection({
  doc,
  classes,
  displayName,
  lang,
  scrollToClassId,
  hideHeader = false,
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
      {!hideHeader && (
        <>
          <div className="text-[11px] font-medium uppercase tracking-wider text-gray-500">
            {t('legend.header')}
          </div>
          <p className="mt-1 text-[11px] leading-snug text-gray-500">
            {t('legend.headerHint')}
          </p>
        </>
      )}

      <ul className={`${hideHeader ? '' : 'mt-3 '}space-y-1.5`}>
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
  /**
   * Suppress the inline `chart.factorsHeader`. Same rationale as
   * `LegendSection`'s `hideHeader`.
   */
  hideHeader?: boolean;
}

export function FactorsSection({
  doc,
  factors,
  lang,
  hideHeader = false,
}: FactorsSectionProps) {
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
      {!hideHeader && (
        <div className="text-[11px] font-medium uppercase tracking-wider text-gray-500">
          {t('chart.factorsHeader')}
        </div>
      )}
      <ul className={`${hideHeader ? '' : 'mt-2 '}space-y-1`}>
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
      <StylePicker
        color={cls.color}
        icon={cls.icon}
        onColor={onColor}
        onIcon={onIcon}
      />
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

/**
 * Combined color + icon picker. Renders a single button showing the
 * class's icon glyph in its color; on click, opens ONE popover with
 * both a color row and an icon row so the user can dial in both halves
 * of a class's visual identity without juggling two popovers.
 *
 * The popover stays open across multiple picks (the user often wants
 * to choose color AND icon in one go), and closes only on outside
 * click or Escape.
 */
function StylePicker({
  color,
  icon,
  onColor,
  onIcon,
}: {
  color: string;
  icon: PinIcon;
  onColor: (c: string) => void;
  onIcon: (icon: PinIcon) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement | null>(null);

  // Outside click + Escape close. Effect runs only while the popover
  // is open so we don't pay the listener cost otherwise.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span ref={wrapRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-7 w-7 items-center justify-center rounded border border-gray-300 hover:ring-2 hover:ring-gray-200"
        aria-label="Style"
        style={{ color }}
      >
        <span className="text-base leading-none">{PIN_ICON_GLYPH[icon]}</span>
      </button>
      {open && (
        <div className="absolute left-0 top-9 z-30 rounded-lg border border-gray-200 bg-white p-2 shadow-md">
          {/* Color row */}
          <div className="flex gap-1.5">
            {CHART_PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onColor(c)}
                className={`h-5 w-5 rounded-full border ${
                  c === color ? 'border-gray-900' : 'border-gray-200'
                }`}
                style={{ backgroundColor: c }}
                aria-label={c}
              />
            ))}
          </div>
          {/* Divider */}
          <div className="my-1.5 h-px w-full bg-gray-100" />
          {/* Icon row — always rendered in the currently-selected color
              so the user previews the combined look. */}
          <div className="flex gap-1">
            {ICONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onIcon(opt.id)}
                className={`flex h-6 w-6 items-center justify-center rounded border ${
                  opt.id === icon ? 'border-gray-900' : 'border-gray-200'
                }`}
                style={{ color }}
                aria-label={opt.id}
              >
                <span className="text-sm leading-none">{opt.glyph}</span>
              </button>
            ))}
          </div>
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
