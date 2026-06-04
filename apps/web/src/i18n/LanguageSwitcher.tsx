import { useTranslation } from 'react-i18next';
import { setLanguage } from '../i18n';
import type { Lang } from '@canvas-collab/shared';

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const lang = (i18n.language as Lang) ?? 'en';

  return (
    <label className="flex items-center gap-2 text-xs text-gray-600">
      <span>{t('language.label')}:</span>
      <select
        className="rounded border border-gray-300 bg-white px-2 py-1"
        value={lang}
        onChange={(e) => setLanguage(e.target.value as Lang)}
      >
        <option value="en">{t('language.en')}</option>
        <option value="zh">{t('language.zh')}</option>
      </select>
    </label>
  );
}
