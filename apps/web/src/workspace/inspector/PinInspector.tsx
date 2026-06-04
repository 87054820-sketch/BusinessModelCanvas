import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type * as Y from 'yjs';
import type { Pin, PinClass } from '@canvas-collab/shared';
import { removePin, updatePin } from '../../collab/pins';
import { useSelection } from '../../state/selection';

const ICON_GLYPH: Record<string, string> = {
  circle: '●',
  triangle: '▲',
  square: '■',
  star: '★',
  flag: '⚑',
};

interface Props {
  doc: Y.Doc;
  pin: Pin;
  classes: PinClass[];
}

/**
 * Right-panel content when a pin is selected. Pin-level metadata is
 * minimal post-redesign:
 *   - which class it belongs to (visual signature read from the class)
 *   - optional label / body text rendered next to the icon
 *   - delete
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

        {/* Class chip — read-only visual badge + a select to reassign. */}
        <Field label={t('pin.class')}>
          <div className="flex items-center gap-2">
            {cls ? (
              <span
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs"
                style={{ color: cls.color }}
              >
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: cls.color }}
                />
                <span>{ICON_GLYPH[cls.icon] ?? '●'}</span>
                <span className="text-gray-900">{cls.label || '(unnamed)'}</span>
              </span>
            ) : (
              <span className="text-xs italic text-red-600">
                {t('pin.classMissing')}
              </span>
            )}
            <select
              value={pin.classId}
              onChange={(e) => updatePin(doc, pin.id, { classId: e.target.value })}
              className="rounded border border-gray-300 px-1.5 py-0.5 text-xs"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label || '(unnamed)'}
                </option>
              ))}
            </select>
          </div>
        </Field>

        <Field label={t('pin.label')}>
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

        <Field label={t('pin.body')}>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mt-4 block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-gray-500">
        {label}
      </span>
      {children}
    </label>
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
