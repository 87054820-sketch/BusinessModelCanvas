import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { CaseLibraryEntry, Lang } from '@pingarden/shared';
import { libraryApi } from '../api/library';
import { useIdentity } from '../identity/useIdentity';
import { CaseCard } from '../components/CaseCard';
import { CasePreviewModal } from '../components/CasePreviewModal';

/**
 * Case-library browse page. Lives at `/library`. Hosts ONLY curated
 * read-only cases (`source: 'library'`); the user's own projects live
 * on `/projects` after the 2026-06 split.
 *
 * Layout:
 *   - Header: back link, title/subtitle, [+ Create blank project] CTA
 *   - Section: case-card grid (kind chips: company / industry / pattern / comparison)
 *
 * Click a case → preview modal with summary, sources, canvases list.
 * From the modal the user picks "Open as read-only" (enters the
 * read-only workspace) or "Fork to my projects" (deep copy to
 * `/projects`, story canvasId directives rewritten).
 */
export function LibraryPage() {
  const { t, i18n } = useTranslation();
  const { identity } = useIdentity();
  const navigate = useNavigate();

  const [cases, setCases] = useState<CaseLibraryEntry[] | null>(null);
  const [previewEntry, setPreviewEntry] = useState<CaseLibraryEntry | null>(null);

  useEffect(() => {
    if (!identity) return;
    void libraryApi.list(identity.displayName).then(setCases);
  }, [identity]);

  if (!identity) return null;
  const lang = (i18n.language as Lang) ?? 'en';

  async function handleOpenReadOnly(
    _entry: CaseLibraryEntry,
    detail: import('@pingarden/shared').CaseLibraryDetail,
  ) {
    setPreviewEntry(null);
    navigate(`/p/${detail.project.id}`);
  }

  async function handleFork(entry: CaseLibraryEntry) {
    if (!identity) return;
    // Honour the user's current UI language — fork only the canvases
    // / story matching it, so the user lands in a clean
    // single-language project. The server falls back to forking the
    // whole case when the requested lang isn't shipped.
    const result = await libraryApi.fork(entry.slug, identity.displayName, lang);
    setPreviewEntry(null);
    navigate(`/p/${result.project.id}`);
  }

  return (
    <main className="mx-auto max-w-6xl px-8 py-8">
      {/* Page header — back link + title + create CTA on the right */}
      <header className="mb-8 flex items-end justify-between gap-6">
        <div>
          <Link
            to="/"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900"
          >
            ← {t('nav.back')}
          </Link>
          <h1 className="mt-3 text-2xl font-semibold text-gray-900">
            {t('library.casesSection')}
          </h1>
          <p className="mt-1 text-sm text-gray-500">{t('library.pageSubtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/p/new')}
          className="shrink-0 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition hover:border-gray-300 hover:bg-gray-50"
        >
          + {t('home.createBlankInstead')}
        </button>
      </header>

      {/* Case grid */}
      <section>
        {cases === null ? (
          <p className="text-sm text-gray-400">{t('home.loading')}…</p>
        ) : cases.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-200 bg-white py-12 text-center text-sm text-gray-400">
            {t('library.noCases')}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cases.map((c) => (
              <CaseCard
                key={c.slug}
                entry={c}
                lang={lang}
                onClick={(entry) => setPreviewEntry(entry)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Preview modal */}
      <CasePreviewModal
        entry={previewEntry}
        lang={lang}
        onClose={() => setPreviewEntry(null)}
        onOpenReadOnly={handleOpenReadOnly}
        onFork={handleFork}
      />
    </main>
  );
}
