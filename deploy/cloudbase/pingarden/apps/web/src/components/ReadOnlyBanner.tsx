import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Lang } from '@pingarden/shared';

interface Props {
  /**
   * Library `companySlug` is required to fork — if it's missing we hide
   * the Fork CTA but still show the banner so the user understands why
   * their edits aren't sticking.
   */
  companySlug?: string;
  /**
   * Active UI language. Forks honour the user's current language: an
   * EN-UI user clicks Fork on a bilingual case → only the EN canvases
   * + EN story are deep-copied. Switching to ZH and forking again
   * produces a separate ZH project.
   */
  lang: Lang;
  /**
   * Called with the resolved fork target's slug + active language once
   * the user clicks Fork. The parent kicks off the API call and
   * navigates to the new `/p/<id>`. Only invoked when `companySlug`
   * is present.
   */
  onFork: (slug: string, lang: Lang) => Promise<void> | void;
}

/**
 * Yellow strip mounted at the top of `ProjectWorkspacePage` whenever
 * the open project belongs to the read-only case library. Two jobs:
 *
 *   1. Tell the user the workspace is read-only (otherwise they spend a
 *      minute trying to drag a sticky and wondering why nothing is
 *      saving — the inputs themselves go grey but the canvas surface
 *      doesn't, so the banner closes that gap).
 *
 *   2. Inline Fork CTA — one click deep-copies the case into the user's
 *      own project list and the parent navigates them there. After the
 *      copy they can edit freely without affecting the library bundle.
 *
 * The banner doesn't take the project itself — only the fork-relevant
 * fields — so it stays trivial to render in tests and storybook.
 */
export function ReadOnlyBanner({ companySlug, lang, onFork }: Props) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  async function handleFork() {
    if (!companySlug || busy) return;
    setBusy(true);
    try {
      await onFork(companySlug, lang);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 border-b border-amber-200 bg-amber-50 px-6 py-2.5 text-sm text-amber-900">
      <span className="flex items-center gap-2">
        <span aria-hidden>📚</span>
        <span>{t('library.workspaceBannerHint')}</span>
      </span>
      {companySlug && (
        <button
          type="button"
          onClick={handleFork}
          disabled={busy}
          className="shrink-0 font-semibold text-amber-900 underline-offset-2 transition hover:underline disabled:opacity-60"
        >
          {busy ? t('library.forking') + '…' : t('library.fork') + ' →'}
        </button>
      )}
    </div>
  );
}
