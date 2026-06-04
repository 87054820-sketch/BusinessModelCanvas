import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { BlockI18n, StickyNote } from '@canvas-collab/shared';
import { STICKY_PALETTE } from '../../canvas/stickyColors';

interface Props {
  sticky: StickyNote;
  /** Translated block info — used to show which block the sticky is in. */
  blockTitle: string | undefined;
  onText: (text: string) => void;
  onColor: (color: string) => void;
  onDelete: () => void;
}

/**
 * Right-panel content when a sticky is selected.
 *
 * Text editing is **opt-in**: by default the body shows a read-only
 * preview of the sticky text. Clicking the preview swaps in a focused
 * textarea (the same way the canvas-side inline editor works on
 * double-click). This guarantees that selecting a sticky on the canvas
 * does NOT immediately drop the user into a text-editing mode —
 * keyboard focus stays at the page level so workspace shortcuts
 * (Cmd+C/V/X, Delete / Backspace) operate on the sticky as an OBJECT.
 */
export function StickyInspector({ sticky, blockTitle, onText, onColor, onDelete }: Props) {
  const { t } = useTranslation();
  const [text, setText] = useState(sticky.text);
  const [editing, setEditing] = useState(false);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  // Resync from prop when a different sticky is selected, or text was edited
  // on-canvas (textarea inside foreignObject) and we should reflect it here.
  useEffect(() => {
    setText(sticky.text);
  }, [sticky.id, sticky.text]);

  // When the selected sticky changes (e.g. user clicked a different
  // sticky), drop out of edit mode so the new selection starts read-only.
  useEffect(() => {
    setEditing(false);
  }, [sticky.id]);

  // Focus + autosize the textarea once we enter edit mode.
  useEffect(() => {
    if (!editing) return;
    const ta = taRef.current;
    if (!ta) return;
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);
  }, [editing]);

  // Autosize the textarea on text change while editing.
  useEffect(() => {
    if (!editing) return;
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 240)}px`;
  }, [text, editing]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-5">
        <Field label={t('inspector.sticky.text')}>
          {editing ? (
            <textarea
              ref={taRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onBlur={() => {
                if (text !== sticky.text) onText(text);
                setEditing(false);
              }}
              onKeyDown={(e) => {
                // Esc or Cmd/Ctrl+Enter: commit + exit edit mode. Same
                // shortcuts as the canvas-side inline editor for muscle
                // memory.
                if (e.key === 'Escape') {
                  e.stopPropagation();
                  e.currentTarget.blur();
                }
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.currentTarget.blur();
                }
              }}
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
              rows={3}
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              title={t('inspector.sticky.clickToEdit')}
              className="block min-h-[64px] w-full cursor-text rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-sm text-gray-800 hover:border-gray-400"
            >
              {sticky.text ? (
                <span className="block whitespace-pre-wrap break-words">{sticky.text}</span>
              ) : (
                <span className="italic text-gray-400">
                  {t('inspector.sticky.clickToEdit')}
                </span>
              )}
            </button>
          )}
        </Field>

        <Field label={t('inspector.sticky.color')}>
          <div className="flex items-center gap-2">
            {STICKY_PALETTE.map((c) => {
              const active = c === sticky.color;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => onColor(c)}
                  className={`h-8 w-8 rounded-full border-2 transition ${
                    active
                      ? 'border-gray-900 ring-2 ring-gray-900/20'
                      : 'border-white hover:border-gray-300'
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              );
            })}
          </div>
        </Field>

        <Field label={t('inspector.sticky.block')}>
          <div className="text-sm text-gray-700">{blockTitle ?? sticky.zoneId}</div>
        </Field>

        <Field label={t('inspector.sticky.author')}>
          <div className="text-sm text-gray-700">{sticky.authorName || '—'}</div>
        </Field>

        <Field label={t('inspector.sticky.createdAt')}>
          <div className="text-xs text-gray-500">
            {new Date(sticky.createdAt).toLocaleString()}
          </div>
        </Field>

        <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-3 text-[11px] leading-relaxed text-gray-600">
          {t('inspector.sticky.shortcuts')}
        </div>
      </div>

      <div className="border-t border-gray-200 p-4">
        <button
          type="button"
          onClick={onDelete}
          className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
        >
          {t('inspector.sticky.delete')}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-gray-500">
        {label}
      </div>
      {children}
    </div>
  );
}
