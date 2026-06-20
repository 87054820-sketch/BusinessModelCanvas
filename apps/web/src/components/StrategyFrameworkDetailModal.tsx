import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import type {
  CaseLibraryEntry,
  Lang,
  StrategyFramework,
  StrategyFrameworkDetail,
  StrategyFrameworkReference,
  StrategyFrameworkReferenceType,
} from '@pingarden/shared';
import { libraryApi } from '../api/library';

interface Props {
  framework: StrategyFramework | null;
  lang: Lang;
  onClose: () => void;
  onExampleClick: (slug: string) => void;
}

type ModalTab = 'description' | 'examples' | 'references';

export function StrategyFrameworkDetailModal({
  framework,
  lang,
  onClose,
  onExampleClick,
}: Props) {
  const { t } = useTranslation();
  const [detail, setDetail] = useState<StrategyFrameworkDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<ModalTab>('description');

  useEffect(() => {
    if (!framework) {
      setDetail(null);
      setLoading(false);
      setTab('description');
      return;
    }
    setLoading(true);
    setDetail(null);
    setTab('description');
    let cancelled = false;
    void libraryApi.getStrategyFramework(framework.slug).then((d) => {
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
  }, [framework?.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!framework) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [framework, onClose]);

  if (!framework) return null;

  const name = framework.name[lang] ?? framework.name.en;
  const summary = framework.summary[lang] ?? framework.summary.en;
  const referenceCount = framework.references?.length ?? framework.sources.length;

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
        aria-label={name}
        className="flex h-[700px] max-h-[85vh] min-h-[480px] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl"
      >
        <header className="flex shrink-0 items-start gap-4 border-b border-gray-100 px-6 py-5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
                {t('library.kind.strategyFramework')}
              </span>
              <span className="text-[10px] text-gray-400">{framework.slug}</span>
            </div>
            <h2 className="mt-1.5 text-xl font-semibold text-gray-900">{name}</h2>
            <p className="mt-1 text-sm leading-relaxed text-gray-600">{summary}</p>
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

        <div className="flex shrink-0 items-end gap-1 border-b border-gray-200 px-6" role="tablist">
          <ModalTabButton active={tab === 'description'} onClick={() => setTab('description')} label={t('library.tabs.description')} />
          <ModalTabButton active={tab === 'examples'} onClick={() => setTab('examples')} label={t('library.tabs.relatedCases')} count={framework.examples.length} />
          <ModalTabButton active={tab === 'references'} onClick={() => setTab('references')} label={t('library.references')} count={referenceCount} />
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {tab === 'description' && <DescriptionTab detail={detail} loading={loading} lang={lang} />}
          {tab === 'examples' && <ExamplesTab detail={detail} loading={loading} lang={lang} onExampleClick={onExampleClick} />}
          {tab === 'references' && <ReferencesTab framework={framework} lang={lang} />}
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
          ? 'border-indigo-600 text-indigo-700'
          : 'border-transparent text-gray-500 hover:text-gray-800'
      }`}
    >
      {label}
      {typeof count === 'number' && (
        <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${active ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-50 text-gray-500'}`}>
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
  detail: StrategyFrameworkDetail | null;
  loading: boolean;
  lang: Lang;
}) {
  const { t } = useTranslation();
  if (loading) return <p className="text-sm text-gray-400">{t('home.loading')}…</p>;
  if (!detail) return null;
  const md = detail.description[lang] || detail.description.en;
  if (!md || md.trim().length === 0) {
    return <p className="text-sm text-gray-400">{t('library.strategyFramework.descriptionEmpty')}</p>;
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
                 prose-strong:text-gray-900 prose-strong:font-semibold"
    >
      <ReactMarkdown>{md}</ReactMarkdown>
    </article>
  );
}

function ExamplesTab({
  detail,
  loading,
  lang,
  onExampleClick,
}: {
  detail: StrategyFrameworkDetail | null;
  loading: boolean;
  lang: Lang;
  onExampleClick: (slug: string) => void;
}) {
  const { t } = useTranslation();
  if (loading) return <p className="text-sm text-gray-400">{t('home.loading')}…</p>;
  const cases = detail?.exampleCases ?? [];
  if (cases.length === 0) return <p className="text-sm text-gray-400">{t('library.examplesEmpty')}</p>;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {cases.map((entry) => (
        <ExampleCaseCard key={entry.slug} entry={entry} lang={lang} onClick={() => onExampleClick(entry.slug)} />
      ))}
    </div>
  );
}

function ExampleCaseCard({
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
      className="rounded-xl border border-gray-200 bg-white p-3 text-left transition hover:border-indigo-300 hover:bg-indigo-50/30"
    >
      <div className="text-sm font-semibold text-gray-900">{name}</div>
      <p className="mt-1 line-clamp-3 text-[12px] leading-relaxed text-gray-500">{summary}</p>
      <div className="mt-2 text-[10px] uppercase tracking-wide text-gray-400">{entry.slug}</div>
    </button>
  );
}

function ReferencesTab({ framework, lang }: { framework: StrategyFramework; lang: Lang }) {
  const refs = framework.references ?? [];
  if (refs.length > 0) return <AnnotatedReferences refs={refs} lang={lang} />;
  if (framework.sources.length === 0) return null;
  return (
    <ul className="space-y-2 text-sm text-gray-600">
      {framework.sources.map((s, idx) => (
        <li key={idx}>
          {s.url ? (
            <a href={s.url} target="_blank" rel="noreferrer" className="text-indigo-700 hover:underline">
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

const REFERENCE_TYPE_ORDER: StrategyFrameworkReferenceType[] = ['book', 'paper', 'article', 'web'];

function AnnotatedReferences({ refs, lang }: { refs: StrategyFrameworkReference[]; lang: Lang }) {
  const { t } = useTranslation();
  const grouped = new Map<StrategyFrameworkReferenceType, StrategyFrameworkReference[]>();
  refs.forEach((r) => grouped.set(r.type, [...(grouped.get(r.type) ?? []), r]));
  return (
    <div className="space-y-5">
      {REFERENCE_TYPE_ORDER.map((type) => {
        const rows = grouped.get(type) ?? [];
        if (rows.length === 0) return null;
        return (
          <section key={type}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              {t(`library.referenceTypes.${type}`)}
            </h3>
            <ul className="space-y-3">
              {rows.map((r) => {
                const note = r.note?.[lang] ?? r.note?.en;
                return (
                  <li key={r.cite} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                    <div className="font-medium text-gray-900">
                      {r.url ? (
                        <a href={r.url} target="_blank" rel="noreferrer" className="text-indigo-700 hover:underline">
                          {r.cite}
                        </a>
                      ) : (
                        r.cite
                      )}
                      <span className="ml-2 font-normal text-gray-500">{r.label}</span>
                    </div>
                    {(r.year || r.pages) && (
                      <div className="mt-0.5 text-[11px] text-gray-400">
                        {[r.year, r.pages].filter(Boolean).join(' · ')}
                      </div>
                    )}
                    {note && <p className="mt-1 text-[12px] leading-relaxed text-gray-600">{note}</p>}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
