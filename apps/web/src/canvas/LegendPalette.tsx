import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type * as Y from 'yjs';
import type { Lang, PinClass, PinIcon } from '@canvas-collab/shared';
import { addPinClass, usePinClasses } from '../collab/pinClasses';
import { useActiveClass } from '../state/activeClass';
import { useSelection } from '../state/selection';
import { useUiPrefs } from '../state/uiPrefs';

interface Props {
  doc: Y.Doc;
  /** Display name credited as the author of newly-created classes. */
  displayName: string;
  /** Single-language UI hint used inside the inline new-class form. */
  lang: Lang;
}

const ICON_GLYPH: Record<PinIcon, string> = {
  circle: '●',
  triangle: '▲',
  square: '■',
  star: '★',
  flag: '⚑',
};

/**
 * The legend palette overlay — a horizontal strip of class chips that
 * sits above the canvas SVG (top-left, padded). Lives at the workspace
 * page level so it shows on every canvas with `pinClass` in
 * `effectiveObjectTypes`.
 *
 * Behaviour:
 *   - One chip per PinClass: color block + icon glyph + truncated label.
 *   - Click a chip → activate that class (canvas enters draw mode for
 *     that class). Click the active chip again → toggle off (back to
 *     select / pan).
 *   - "+" button at the right opens an inline name input → addPinClass
 *     auto-rotates next color/icon (see `pickNextClassStyle`).
 *   - When no class exists, palette only shows the "+" affordance with
 *     a coaching prompt next to it.
 *
 * The palette intentionally does NOT show full label text — class
 * labels are rendered next to the curves (via PinLayer) and managed
 * via the inspector. The palette is the *picker*, not the list.
 */
export function LegendPalette({ doc, displayName, lang }: Props) {
  const { t } = useTranslation();
  const classes = usePinClasses(doc);
  const activeClassId = useActiveClass((s) => s.activeClassId);
  const toggleClass = useActiveClass((s) => s.toggleClass);
  const clearActive = useActiveClass((s) => s.clearActive);

  const [adding, setAdding] = useState(false);
  const [draftLabel, setDraftLabel] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  function commitAdd() {
    const next = draftLabel.trim();
    if (!next) {
      setAdding(false);
      setDraftLabel('');
      return;
    }
    const id = addPinClass(doc, { label: next, authorName: displayName });
    useActiveClass.getState().pickClass(id);
    setAdding(false);
    setDraftLabel('');
  }

  return (
    <div className="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-1.5">
      {/* Select / pan affordance — only visible when something IS active */}
      {activeClassId && (
        <button
          type="button"
          onClick={clearActive}
          className="pointer-events-auto rounded-md border border-gray-200 bg-white/95 px-2 py-1 text-[11px] text-gray-700 shadow-sm hover:bg-gray-50"
          title={t('legend.exitDraw')}
        >
          ✕ {t('legend.exitDraw')}
        </button>
      )}

      {classes.length === 0 && !adding && (
        <span className="pointer-events-auto rounded-md border border-dashed border-gray-300 bg-white/90 px-2.5 py-1 text-[11px] italic text-gray-500 shadow-sm">
          {t('legend.empty')}
        </span>
      )}

      {classes.map((c, i) => (
        <ClassChip
          key={c.id}
          cls={c}
          index={i}
          active={activeClassId === c.id}
          onToggle={() => toggleClass(c.id)}
          onEdit={() => {
            // Open the right inspector to the Config tab AND scroll to
            // the clicked class. Setting both at once keeps the tab
            // strip's active highlight in sync with the body.
            useUiPrefs.getState().setRightInspectorTab('config');
            useUiPrefs.getState().setRightInspectorCollapsed(false);
            useSelection.getState().selectPinClass(c.id);
          }}
        />
      ))}

      {adding ? (
        <div className="pointer-events-auto flex items-center gap-1 rounded-md border border-gray-300 bg-white p-1 shadow-sm">
          <input
            ref={inputRef}
            value={draftLabel}
            onChange={(e) => setDraftLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitAdd();
              if (e.key === 'Escape') {
                setAdding(false);
                setDraftLabel('');
              }
            }}
            placeholder={t('legend.namePlaceholder')}
            className="w-32 rounded border border-gray-200 px-1.5 py-0.5 text-xs focus:border-gray-900 focus:outline-none"
            maxLength={48}
          />
          <button
            type="button"
            onClick={commitAdd}
            className="rounded bg-gray-900 px-2 py-0.5 text-[11px] text-white hover:bg-black"
          >
            {t('legend.create')}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-md border border-dashed border-gray-300 bg-white/90 text-base text-gray-500 shadow-sm hover:border-gray-400 hover:text-gray-900"
          title={t('legend.addClass')}
        >
          +
        </button>
      )}

      {/* Hint when a class is active and the user has at least one
          factor — describe the paint workflow + paste shortcut. */}
      {activeClassId && (
        <span className="pointer-events-none ml-2 hidden items-center text-[11px] italic text-gray-500 md:flex">
          {lang === 'zh' ? '点画布落 Pin · ⌘+V 复制粘贴' : 'Click canvas to drop · ⌘+V to paint'}
        </span>
      )}
    </div>
  );
}

interface ClassChipProps {
  cls: PinClass;
  index: number;
  active: boolean;
  onToggle: () => void;
  /** Open the LegendInspector scrolled to this class — for rename / recolor / delete. */
  onEdit: () => void;
}

function ClassChip({ cls, index, active, onToggle, onEdit }: ClassChipProps) {
  const { t } = useTranslation();
  const titleText = `${cls.label} — ${t('legend.numberHint', { n: index + 1 })}`;
  return (
    <div
      role="group"
      aria-label={cls.label}
      className={`pointer-events-auto group flex max-w-[200px] items-center rounded-md border bg-white/95 shadow-sm transition ${
        active
          ? 'border-gray-900 ring-2 ring-gray-200'
          : 'border-gray-200 hover:border-gray-400'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        title={titleText}
        className="flex flex-1 items-center gap-1.5 px-2 py-1"
      >
        <span
          className="inline-block h-3.5 w-3.5 flex-shrink-0 rounded-full"
          style={{ backgroundColor: cls.color }}
        />
        <span
          className="text-[12px] leading-none"
          style={{ color: cls.color }}
        >
          {ICON_GLYPH[cls.icon]}
        </span>
        <span className="max-w-[110px] truncate text-[11px] text-gray-700">
          {cls.label || '(unnamed)'}
        </span>
        <span className="ml-1 text-[10px] tabular-nums text-gray-400">
          {index + 1 <= 9 ? index + 1 : ''}
        </span>
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        title={t('legend.editClass')}
        aria-label={t('legend.editClass')}
        className="flex h-full flex-shrink-0 items-center border-l border-gray-200 px-1.5 text-[11px] text-gray-400 hover:bg-gray-50 hover:text-gray-700"
      >
        ✎
      </button>
    </div>
  );
}
