import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  /**
   * Pre-fills the input. Empty string (or omitted) → first-launch
   * mode: title/prompt/submit copy use the welcome keys, no cancel
   * affordance, modal blocks the app until a name is picked. Non-empty
   * → edit mode: edit copy + ✕ cancel button so the user can dismiss
   * without changing anything.
   */
  initialName?: string;
  onSubmit: (displayName: string) => void;
  /**
   * Cancel handler. Required for edit mode (renders the ✕ button);
   * absent for first-launch (modal stays blocking).
   */
  onCancel?: () => void;
}

export function IdentityModal({ initialName = '', onSubmit, onCancel }: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialName);
  const isEditing = initialName.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <form
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) onSubmit(name);
        }}
      >
        {isEditing && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            aria-label={t('identity.cancel')}
            className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            ✕
          </button>
        )}
        <h2 className="text-xl font-semibold">
          {isEditing ? t('identity.editTitle') : t('identity.title')}
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          {isEditing ? t('identity.editPrompt') : t('identity.prompt')}
        </p>
        <input
          autoFocus
          className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-gray-900"
          placeholder={t('identity.placeholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          type="submit"
          disabled={!name.trim() || name.trim() === initialName.trim()}
          className="mt-4 w-full rounded-lg bg-gray-900 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {isEditing ? t('identity.save') : t('identity.submit')}
        </button>
      </form>
    </div>
  );
}
