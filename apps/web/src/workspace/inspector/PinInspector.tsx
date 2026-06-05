import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type * as Y from 'yjs';
import type { Pin, PinClass } from '@canvas-collab/shared';
import { removePin, updatePin } from '../../collab/pins';
import { useSelection } from '../../state/selection';
import { PinClassChip } from './LegendInspector';

interface Props {
  doc: Y.Doc;
  pin: Pin;
  classes: PinClass[];
}

/**
 * Right-panel content when a pin is selected. Pin-level metadata is
 * minimal post-redesign:
 *   - which class it belongs to (one combined visual + picker — see
 *     `ClassPicker` below; replaces the prior badge + select pair so
 *     there's exactly one circular signature on the row, not two)
 *   - optional label rendered next to the icon on the canvas (HINT
 *     tells the user this surfaces on the canvas)
 *   - optional body text shown only in the inspector (HINT explicitly
 *     calls out that this DOES NOT render on the canvas)
 *   - delete
 *
 * Class assignment is constrained to existing legend classes — the
 * picker has no inline "create new" affordance because adding a class
 * is a canvas-level change that should happen through the Config tab
 * or the canvas-overlay `+ 图钉图例` button.
 *
 * Color / icon / anchor used to live here pre-redesign — they're
 * gone: color and icon belong to the class (managed in the Legend
 * inspector), anchoring is no longer a concept.
 */
export function PinInspector({ doc, pin, classes }: Props) {
  const { t } = useTranslation();
  const clear = useSelection((s) => s.clear);

  const [labelDraft, setLabelDraft] = useState(pin.label ?? '');
  const [bodyDraft, setBodyDraft] = useState(pin.body ?? '');
  const reset = `${pin.id}|${pin.label ?? ''}|${pin.body ?? ''}`;
  const lastReset = useStableSync(reset, () => {
    setLabelDraft(pin.label ?? '');
    setBodyDraft(pin.body ?? '');
  });
  void lastReset;

  const cls = classes.find((c) => c.id === pin.classId);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-5">
        <div className="text-[11px] font-medium uppercase tracking-wider text-gray-500">
          {t('pin.header')}
        </div>

        {/* Class — single combined dropdown trigger; opens a popover
            of existing classes. No standalone read-only badge: the
            trigger IS the badge and the picker, so the user sees one
            chip instead of two redundant ones. */}
        <Field label={t('pin.class')}>
          {cls ? (
            <ClassPicker
              current={cls}
              classes={classes}
              onPick={(nextId) =>
                updatePin(doc, pin.id, { classId: nextId })
              }
            />
          ) : (
            // Class was deleted out from under the pin — surface the
            // problem and still offer the picker so the user can
            // re-anchor it.
            <div className="space-y-2">
              <div className="text-xs italic text-red-600">
                {t('pin.classMissing')}
              </div>
              {classes.length > 0 && (
                <ClassPicker
                  current={null}
                  classes={classes}
                  onPick={(nextId) =>
                    updatePin(doc, pin.id, { classId: nextId })
                  }
                />
              )}
            </div>
          )}
        </Field>

        <Field
          label={t('pin.label')}
          hint={t('pin.labelHint')}
        >
          <input
            value={labelDraft}
            onChange={(e) => setLabelDraft(e.target.value)}
            onBlur={() => {
              if (labelDraft !== (pin.label ?? '')) {
                updatePin(doc, pin.id, { label: labelDraft || null });
              }
            }}
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-gray-900 focus:outline-none"
            placeholder={t('pin.labelPlaceholder')}
            maxLength={120}
          />
        </Field>

        <Field
          label={t('pin.body')}
          hint={t('pin.bodyHint')}
        >
          <textarea
            value={bodyDraft}
            onChange={(e) => setBodyDraft(e.target.value)}
            onBlur={() => {
              if (bodyDraft !== (pin.body ?? '')) {
                updatePin(doc, pin.id, { body: bodyDraft || null });
              }
            }}
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-gray-900 focus:outline-none"
            placeholder={t('pin.bodyPlaceholder')}
            rows={2}
            maxLength={400}
          />
        </Field>
      </div>

      <div className="border-t border-gray-200 p-4">
        <button
          type="button"
          onClick={() => {
            removePin(doc, pin.id);
            clear();
          }}
          className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
        >
          {t('pin.delete')}
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
 * Field wrapper used across the inspector. The optional `hint` prop is
 * what carries the "shown on canvas" / "not shown on canvas" signal
 * the user asked for — one short line in muted text, just under the
 * uppercase label.
 */
function Field({ label, hint, children }: FieldProps) {
  return (
    <label className="mt-4 block">
      <span className="block text-[11px] font-medium uppercase tracking-wider text-gray-500">
        {label}
      </span>
      {hint && (
        <span className="mt-0.5 block text-[11px] leading-snug text-gray-500">
          {hint}
        </span>
      )}
      <span className="mt-1 block">{children}</span>
    </label>
  );
}

interface ClassPickerProps {
  current: PinClass | null;
  classes: PinClass[];
  onPick: (id: string) => void;
}

/**
 * Combined trigger + popover for the pin's class assignment. Replaces
 * the prior `[ badge ][ <select> ]` pair with one widget that does
 * both jobs: shows the current class's visual signature AND exposes
 * the list of existing classes for re-assignment. Outside-click and
 * Escape close the popover.
 *
 * The popover is constrained to existing classes — adding a new class
 * is a canvas-level change that lives in the Config tab.
 */
function ClassPicker({ current, classes, onPick }: ClassPickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

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
    <div ref={wrapRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center rounded-md border border-gray-300 bg-white px-2 py-1 text-xs hover:border-gray-900"
      >
        {current ? (
          <PinClassChip cls={current} withChevron />
        ) : (
          <span className="inline-flex items-center gap-1.5 text-gray-500">
            <span>{t('pin.pickClass')}</span>
            <span aria-hidden="true" className="text-[10px] text-gray-400">
              ▾
            </span>
          </span>
        )}
      </button>
      {open && (
        <div
          className="absolute left-0 top-full z-30 mt-1 min-w-[180px] rounded-lg border border-gray-200 bg-white p-1 shadow-md"
          role="listbox"
        >
          {classes.map((c) => {
            const active = current?.id === c.id;
            return (
              <button
                key={c.id}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onPick(c.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center rounded px-2 py-1 text-left text-xs ${
                  active
                    ? 'bg-gray-100'
                    : 'hover:bg-gray-50'
                }`}
              >
                <PinClassChip cls={c} active={active} />
              </button>
            );
          })}
        </div>
      )}
    </div>
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
