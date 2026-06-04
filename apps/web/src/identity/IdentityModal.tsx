import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  onSubmit: (displayName: string) => void;
}

export function IdentityModal({ onSubmit }: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <form
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) onSubmit(name);
        }}
      >
        <h2 className="text-xl font-semibold">{t('identity.title')}</h2>
        <p className="mt-2 text-sm text-gray-600">{t('identity.prompt')}</p>
        <input
          autoFocus
          className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-gray-900"
          placeholder={t('identity.placeholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          type="submit"
          disabled={!name.trim()}
          className="mt-4 w-full rounded-lg bg-gray-900 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {t('identity.submit')}
        </button>
      </form>
    </div>
  );
}
