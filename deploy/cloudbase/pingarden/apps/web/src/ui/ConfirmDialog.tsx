import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '../api/errors';

interface Props {
  open: boolean;
  title: string;
  /** May contain JSX (highlight an entity name in the message). */
  message: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** When true, applies a destructive style to the confirm button. */
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}

/**
 * Single-step confirmation modal. For destructive-but-recoverable actions
 * (delete a single canvas, delete a single milestone). Use
 * `TypeToConfirmDialog` for cascading project deletion.
 *
 * Cancel triggers: Cancel button OR Escape key. The overlay click is NOT
 * wired to cancel — we found that the `onMouseDown` overlay-cancel pattern
 * combined with `stopPropagation` on the inner panel was brittle, sometimes
 * eating the confirm-button click.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  danger = false,
  onCancel,
  onConfirm,
}: Props) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset busy whenever the dialog opens or closes — guards against a stale
  // "loading" state if the parent unmounts/remounts the dialog.
  useEffect(() => {
    if (!open) {
      setBusy(false);
      setErrorMessage(null);
    }
  }, [open]);

  // Esc cancels (unless an action is in flight).
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) onCancel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <div className="mt-3 text-sm text-gray-700">{message}</div>
        {errorMessage && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          >
            {errorMessage}
          </div>
        )}
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
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setErrorMessage(null);
              try {
                await onConfirm();
                // Don't reset busy on success — the parent typically closes
                // the dialog, which unmounts us. If the parent leaves the
                // dialog open after a successful action, the open→false
                // useEffect will reset it on the next close.
              } catch (err) {
                // Surface failures inline so a broken handler stops looking
                // like "the click did nothing", but never dump a raw HTTP
                // body into a native alert() — go through the friendly
                // ApiError → i18n mapper instead.
                console.error('[ConfirmDialog] confirm action failed:', err);
                setBusy(false);
                setErrorMessage(getApiErrorMessage(err, t));
              }
            }}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-40 ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-900 hover:bg-black'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
