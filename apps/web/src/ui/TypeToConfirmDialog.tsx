import { useEffect, useState } from 'react';

interface Props {
  open: boolean;
  title: string;
  /** Message shown above the input. */
  message: React.ReactNode;
  /** The exact string the user must type to enable the confirm button. */
  expected: string;
  confirmLabel: string;
  cancelLabel?: string;
  placeholder?: string;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}

/**
 * Type-to-confirm modal — for high-impact cascading deletions (a project
 * with all its canvases & milestones). The confirm button is disabled
 * until the user types the entity's exact name.
 *
 * Cancel triggers: Cancel button OR Escape key. (See ConfirmDialog header
 * for why the overlay click isn't wired here.)
 */
export function TypeToConfirmDialog({
  open,
  title,
  message,
  expected,
  confirmLabel,
  cancelLabel = 'Cancel',
  placeholder,
  onCancel,
  onConfirm,
}: Props) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setValue('');
      setBusy(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) onCancel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;
  const matches = value.trim() === expected.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <div className="mt-3 text-sm text-gray-700">{message}</div>
        <input
          autoFocus
          className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder ?? expected}
        />
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={!matches || busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
              } catch (err) {
                console.error('[TypeToConfirmDialog] confirm action failed:', err);
                setBusy(false);
                alert(
                  err instanceof Error ? err.message : String(err ?? 'Action failed'),
                );
              }
            }}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
