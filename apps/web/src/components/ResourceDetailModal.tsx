import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import type {
  CaseLibraryEntry,
  Lang,
  LibraryResource,
  LibraryResourceDetail,
} from '@pingarden/shared';
import { libraryApi } from '../api/library';
import { resourceTypeClass } from './ResourceList';

interface Props {
  resource: LibraryResource | null;
  lang: Lang;
  onClose: () => void;
  onCaseClick: (slug: string) => void;
}

type ModalTab = 'description' | 'related' | 'references';

export function ResourceDetailModal({ resource, lang, onClose, onCaseClick }: Props) {
  const { t } = useTranslation();
  const [detail, setDetail] = useState<LibraryResourceDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<ModalTab>('description');

  useEffect(() => {
    if (!resource) {
      setDetail(null);
      setLoading(false);
      setTab('description');
      return;
    }
    setLoading(true);
    setDetail(null);
    setTab('description');
    let cancelled = false;
    void libraryApi.getResource(resource.slug).then((d) => {
      if (cancelled) return;
      setDetail(d);
      setLoading(false);
    }).catch(() => {
      if (cancelled) return;
      setDetail(null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [resource?.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!resource) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [resource, onClose]);

  if (!resource) return null;

  const title = resource.title[lang] ?? resource.title.en;
  const summary = resource.summary[lang] ?? resource.summary.en;
  const recommendation = resource.recommendation[lang] ?? resource.recommendation.en;
  const referenceCount = resource.sources.length;
  const relatedCount = countRelated(resource);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-10"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex h-[700px] max-h-[85vh] min-h-[480px] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl"
      >
        <header className="flex shrink-0 items-start gap-4 border-b border-gray-100 px-6 py-5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${resourceTypeClass(resource.type)}`}>
                {t(`library.resourceTypes.${resource.type}`)}
              </span>
              <span className="text-[10px] text-gray-400">{resource.slug}</span>
            </div>
            <h2 className="mt-1.5 text-xl font-semibold text-gray-900">{title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-gray-600">{summary}</p>
            <div className="mt-2 text-[11px] text-gray-400">
              {[resource.authors.join(', '), resource.publisher, resource.year]
                .filter(Boolean)
                .join(' · ')}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('confirm.cancel')}
            className="shrink-0 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5.293 5.293a1 1 0 011.414 0L10 8.586l3.293-3.293a1 1 0 111.414 1.414L11.414 10l3.293 3.293a1 1 0 01-1.414 1.414L10 11.414l-3.293 3.293a1 1 0 01-1.414-1.414L8.586 10 5.293 6.707a1 1 0 010-1.414z" />
            </svg>
          </button>
        </header>

        <div className="shrink-0 border-b border-amber-100 bg-amber-50/50 px-6 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-700">
            {t('library.resource.recommendation')}
          </div>
          <p className="mt-1 text-[12px] leading-relaxed text-gray-700">{recommendation}</p>
        </div>

        <div className="flex shrink-0 items-end gap-1 border-b border-gray-200 px-6" role="tablist">
          <ModalTabButton active={tab === 'description'} onClick={() => setTab('description')} label={t('library.tabs.description')} />
          <ModalTabButton active={tab === 'related'} onClick={() => setTab('related')} label={t('library.resource.related')} count={relatedCount} />
          <ModalTabButton active={tab === 'references'} onClick={() => setTab('references')} label={t('library.references')} count={referenceCount} />
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {tab === 'description' && <DescriptionTab detail={detail} loading={loading} lang={lang} />}
          {tab === 'related' && (
            <RelatedTab
              detail={detail}
              loading={loading}
              resource={resource}
              lang={lang}
              onCaseClick={onCaseClick}
            />
          )}
          {tab === 'references' && <ReferencesTab resource={resource} />}
        </div>
      </div>
    </div>
  );
}

function ModalTabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${
        active
          ? 'border-amber-600 text-amber-700'
          : 'border-transparent text-gray-500 hover:text-gray-800'
      }`}
    >
      {label}
      {typeof count === 'number' && (
        <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${active ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-500'}`}>
          {count}
        </span>
      )}
    </button>
  );
}

function DescriptionTab({
  detail,
  loading,
  lang,
}: {
  detail: LibraryResourceDetail | null;
  loading: boolean;
  lang: Lang;
}) {
  const { t } = useTranslation();
  if (loading) return <p className="text-sm text-gray-400">{t('home.loading')}…</p>;
  if (!detail) return null;
  const md = detail.description[lang] || detail.description.en;
  if (!md || md.trim().length === 0) {
    return <p className="text-sm text-gray-400">{t('library.resource.descriptionEmpty')}</p>;
  }
  return (
    <article
      className="prose prose-sm max-w-none
                 prose-headings:font-semibold prose-headings:text-gray-900
                 prose-h1:text-xl prose-h1:mt-0 prose-h1:mb-4
                 prose-h2:text-base prose-h2:mt-6 prose-h2:mb-2
                 prose-h3:text-sm prose-h3:mt-4 prose-h3:mb-2
                 prose-p:my-3 prose-p:leading-relaxed prose-p:text-gray-700
                 prose-li:my-1 prose-li:text-gray-700
                 prose-strong:text-gray-900 prose-strong:font-semibold
                 prose-blockquote:border-l-2 prose-blockquote:border-amber-300
                 prose-blockquote:bg-amber-50/40 prose-blockquote:rounded-r
                 prose-blockquote:py-1 prose-blockquote:px-3
                 prose-blockquote:not-italic prose-blockquote:text-gray-700
                 prose-a:text-amber-700 prose-a:no-underline hover:prose-a:underline"
    >
      <ReactMarkdown>{md}</ReactMarkdown>
    </article>
  );
}

function RelatedTab({
  detail,
  loading,
  resource,
  lang,
  onCaseClick,
}: {
  detail: LibraryResourceDetail | null;
  loading: boolean;
  resource: LibraryResource;
  lang: Lang;
  onCaseClick: (slug: string) => void;
}) {
  const { t } = useTranslation();
  if (loading) return <p className="text-sm text-gray-400">{t('home.loading')}…</p>;

  const hasRelated = countRelated(resource) > 0;
  if (!hasRelated) return <p className="text-sm text-gray-400">{t('library.resource.relatedEmpty')}</p>;

  return (
    <div className="space-y-6">
      {(detail?.relatedCases.length ?? 0) > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            {t('library.tabs.cases')}
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {detail!.relatedCases.map((entry) => (
              <CaseMiniCard key={entry.slug} entry={entry} lang={lang} onClick={() => onCaseClick(entry.slug)} />
            ))}
          </div>
        </section>
      )}
      <SlugSection title={t('library.resource.relatedCanvases')} rows={resource.relatedCanvasDefIds} />
      <SlugSection title={t('library.tabs.patterns')} rows={resource.relatedPatternSlugs} />
      <SlugSection title={t('library.tabs.experiments')} rows={resource.relatedExperimentSlugs} />
      <SlugSection title={t('library.tabs.strategyFrameworks')} rows={resource.relatedStrategyFrameworkSlugs} />
    </div>
  );
}

function CaseMiniCard({
  entry,
  lang,
  onClick,
}: {
  entry: CaseLibraryEntry;
  lang: Lang;
  onClick: () => void;
}) {
  const name = entry.companyName[lang] ?? entry.companyName.en;
  const summary = entry.summary[lang] ?? entry.summary.en;
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-gray-200 bg-white p-3 text-left transition hover:border-amber-300 hover:bg-amber-50/30"
    >
      <div className="text-sm font-semibold text-gray-900">{name}</div>
      <p className="mt-1 line-clamp-3 text-[12px] leading-relaxed text-gray-500">{summary}</p>
      <div className="mt-2 text-[10px] uppercase tracking-wide text-gray-400">{entry.slug}</div>
    </button>
  );
}

function SlugSection({ title, rows }: { title: string; rows?: string[] }) {
  if (!rows || rows.length === 0) return null;
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
        {title}
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {rows.map((row) => (
          <span key={row} className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] text-gray-700">
            {row}
          </span>
        ))}
      </div>
    </section>
  );
}

function ReferencesTab({ resource }: { resource: LibraryResource }) {
  const { t } = useTranslation();
  if (resource.sources.length === 0) {
    return <p className="text-sm text-gray-400">{t('library.resource.referencesEmpty')}</p>;
  }
  return (
    <ul className="space-y-3">
      {resource.sources.map((s, idx) => (
        <li key={idx} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700">
          {s.url ? (
            <a href={s.url} target="_blank" rel="noreferrer" className="text-amber-700 hover:underline">
              {s.label}
            </a>
          ) : (
            s.label
          )}
        </li>
      ))}
    </ul>
  );
}

function countRelated(resource: LibraryResource): number {
  return [
    resource.relatedCanvasDefIds,
    resource.relatedCaseSlugs,
    resource.relatedPatternSlugs,
    resource.relatedExperimentSlugs,
    resource.relatedStrategyFrameworkSlugs,
  ].reduce((sum, rows) => sum + (rows?.length ?? 0), 0);
}
