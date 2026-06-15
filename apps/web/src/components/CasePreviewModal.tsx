import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  BusinessModelPattern,
  CaseLibraryDetail,
  CaseLibraryEntry,
  Lang,
} from '@pingarden/shared';
import { libraryApi } from '../api/library';
import { useIdentity } from '../identity/useIdentity';

interface Props {
  entry: CaseLibraryEntry | null;
  lang: Lang;
  onClose: () => void;
  /** Open the library project in a read-only workspace tab. */
  onOpenReadOnly: (entry: CaseLibraryEntry, detail: CaseLibraryDetail) => void;
  /** Fork to a new editable user project, then navigate to it. */
  onFork: (entry: CaseLibraryEntry) => Promise<void>;
  /**
   * All patterns shipped — used to render the violet "applies patterns"
   * chips with localized names. When absent or the case has no
   * `appliesPatterns`, the section is hidden entirely.
   */
  patterns?: BusinessModelPattern[];
  /**
   * Click handler for an applies-patterns chip. Host page is expected
   * to close the modal and switch to the Patterns tab + scroll to the
   * pattern's card.
   */
  onPatternClick?: (slug: string) => void;
}

/**
 * Modal surfaced when a user clicks a `CaseCard` on the LibraryPage.
 * Shows the case's full summary, citations, and the canvases it
 * contains. Two actions:
 *   - "Open as read-only" → navigate into the library project
 *   - "Fork to my projects" → POST /library/cases/:slug/fork → navigate
 *      to the new editable user project
 *
 * Mirrors the layout idiom of `TemplatePreviewModal` but is content-
 * driven (no SVG plugin preview) — a case is a project + canvases +
 * stories, not a single canvas template.
 */
export function CasePreviewModal({
  entry,
  lang,
  onClose,
  onOpenReadOnly,
  onFork,
  patterns,
  onPatternClick,
}: Props) {
  const { t } = useTranslation();
  const { identity } = useIdentity();
  const [detail, setDetail] = useState<CaseLibraryDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [forking, setForking] = useState(false);

  useEffect(() => {
    if (!entry || !identity) {
      setDetail(null);
      return;
    }
    setLoading(true);
    libraryApi
      .get(entry.slug, identity.displayName)
      .then((d) => setDetail(d))
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [entry, identity]);

  // Body scroll lock + Esc-to-close
  useEffect(() => {
    if (!entry) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    }
    window.addEventListener('keydown', onKey, { capture: true });
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey, { capture: true });
    };
  }, [entry, onClose]);

  if (!entry) return null;

  const name = entry.companyName[lang] ?? entry.companyName.en;
  const summary = entry.summary[lang] ?? entry.summary.en;

  // ── Per-language list filtering ─────────────────────────────────────
  // The case ships canvases / stories tagged by `language`. Show only
  // the entries matching the user's UI language; if zero match (e.g.
  // wechat, currently ZH-only) fall back to showing everything so the
  // user can still browse it. The `langFallbackActive` flag drives a
  // small notice in the header explaining what they're seeing.
  const langMatchedCanvases = detail?.canvases.filter((c) => c.language === lang) ?? [];
  const visibleCanvases = detail
    ? (langMatchedCanvases.length > 0 ? langMatchedCanvases : detail.canvases)
    : [];
  const langMatchedStories = detail?.stories.filter((s) => s.language === lang) ?? [];
  const visibleStories = detail
    ? (langMatchedStories.length > 0 ? langMatchedStories : detail.stories)
    : [];
  const langFallbackActive =
    !!detail &&
    detail.canvases.length > 0 &&
    !detail.canvases.some((c) => c.language === lang);
  const fallbackAvailableLang: Lang | null = langFallbackActive
    ? (detail!.canvases.find((c) => c.language === 'en' || c.language === 'zh')?.language ?? null)
    : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${kindChipColor(
                  entry.kind,
                )}`}
              >
                {t(`library.kind.${entry.kind}`)}
              </span>
              <span className="text-[11px] uppercase tracking-wide text-gray-400">
                {entry.slug}
              </span>
            </div>
            <h2 className="mt-1.5 text-xl font-semibold text-gray-900">{name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-4 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xl text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            ×
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Summary */}
          <p className="text-sm leading-relaxed text-gray-700">{summary}</p>

          {langFallbackActive && fallbackAvailableLang && (
            // Same notice copy used in the workspace banner so the
            // user sees consistent language across browse → open.
            <div className="mt-4 rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2 text-xs text-amber-800">
              {t('library.langFallbackNotice', {
                availableLang: t(`language.${fallbackAvailableLang}`),
              })}
            </div>
          )}

          {/* Tags */}
          {entry.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {entry.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Applies-patterns — only when the case backlinks to ≥1 pattern.
              Chip label includes a sub-type suffix when
              entry.appliesPatternSubtypes refines the pattern (e.g.
              `Free · Ad-supported` instead of `Free`). */}
          {(() => {
            const applied: BusinessModelPattern[] =
              (entry.appliesPatterns ?? [])
                .map((slug) => patterns?.find((p) => p.slug === slug))
                .filter((p): p is BusinessModelPattern => !!p);
            if (applied.length === 0) return null;
            const subtypeMap = entry.appliesPatternSubtypes ?? {};
            const chipLabel = (p: BusinessModelPattern): string => {
              const baseName = p.name[lang] ?? p.name.en;
              const subtypeId = subtypeMap[p.slug];
              if (!subtypeId) return baseName;
              const sub = p.subtypes?.find((s) => s.id === subtypeId);
              if (!sub) return baseName;
              const subName = sub.name[lang] ?? sub.name.en;
              return `${baseName} · ${subName}`;
            };
            return (
              <section className="mt-5">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {t('library.appliesPatterns')}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {applied.map((p) => (
                    <button
                      type="button"
                      key={p.slug}
                      onClick={() => onPatternClick?.(p.slug)}
                      className="rounded-full border border-dashed border-violet-300 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 transition hover:bg-violet-100"
                    >
                      {chipLabel(p)}
                    </button>
                  ))}
                </div>
              </section>
            );
          })()}

          {/* Canvases */}
          <section className="mt-6">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
              {t('library.canvasesInCase', { count: visibleCanvases.length })}
            </h3>
            {loading ? (
              <p className="text-sm text-gray-400">{t('home.loading')}…</p>
            ) : visibleCanvases.length > 0 ? (
              <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
                {visibleCanvases.map((c) => (
                  <li key={c.id} className="flex items-center justify-between px-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-gray-800">
                        {c.title}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {c.defId}
                        {c.variant ? ` · ${c.variant.label[lang] ?? c.variant.label.en}` : ''}
                      </div>
                    </div>
                    <span className="ml-4 shrink-0 text-[11px] uppercase text-gray-400">
                      {c.language}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">{t('library.noCanvases')}</p>
            )}
          </section>

          {/* Stories */}
          {visibleStories.length > 0 && (
            <section className="mt-6">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                {t('library.storiesInCase', { count: visibleStories.length })}
              </h3>
              <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
                {visibleStories.map((s) => (
                  <li key={s.id} className="px-3 py-2 text-sm text-gray-800">
                    {s.title}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Sources */}
          {entry.sources.length > 0 && (
            <section className="mt-6">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                {t('library.sources')}
              </h3>
              <ul className="space-y-1">
                {entry.sources.map((src, i) => (
                  <li key={i} className="text-[12px] text-gray-600">
                    {src.url ? (
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="underline hover:text-gray-900"
                      >
                        {src.label}
                      </a>
                    ) : (
                      src.label
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Footer CTAs */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <button
            type="button"
            onClick={() => detail && onOpenReadOnly(entry, detail)}
            disabled={!detail}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t('library.openReadOnly')}
          </button>
          <button
            type="button"
            disabled={forking}
            onClick={async () => {
              setForking(true);
              try {
                await onFork(entry);
              } finally {
                setForking(false);
              }
            }}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {forking ? `${t('library.forking')}…` : t('library.fork')}
          </button>
        </div>
      </div>
    </div>
  );
}

function kindChipColor(kind: CaseLibraryEntry['kind']): string {
  switch (kind) {
    case 'company':
      return 'bg-emerald-50 text-emerald-700';
    case 'industry':
      return 'bg-amber-50 text-amber-700';
    case 'comparison':
      return 'bg-sky-50 text-sky-700';
  }
}
