import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import type {
  BusinessModelExperimentDetail,
  Experiment,
  ExperimentExample,
  Lang,
} from '@pingarden/shared';
import { libraryApi } from '../api/library';
import { api, type CanvasDefSummary } from '../api/client';
import { preserveNavigationState } from '../navigation/useSmartBack';

interface Props {
  experiment: Experiment | null;
  lang: Lang;
  onClose: () => void;
  /**
   * Click handler for an example's "Open full case →" affordance —
   * fired when an example carries `caseSlug`. Host page is expected to
   * close this modal, switch to the Cases tab, and open the
   * CasePreviewModal for that slug. Mirrors PatternDetailModal's
   * `onExampleClick` flow.
   */
  onOpenCase?: (slug: string) => void;
}

/**
 * Module-level cache of the canvas-defs lookup. The list is small (~11
 * canvases) and never changes during a session; sharing the map across
 * modal mounts means switching cards / re-opening the modal doesn't
 * re-fetch.
 */
let canvasDefsCache = new Map<string, CanvasDefSummary>();

/**
 * Detail modal for a single curated experiment from the Testing
 * Business Ideas library. Single-pane layout with long-form method
 * notes, canvas affinities, real-world examples, and sources. Header +
 * metadata banner stay fixed; only the body scrolls.
 *
 * Detail (description markdown) is fetched lazily on first open per
 * experiment and cached for the modal lifetime via React state.
 */
export function ExperimentDetailModal({ experiment, lang, onClose, onOpenCase }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [detail, setDetail] = useState<BusinessModelExperimentDetail | null>(null);
  const [loading, setLoading] = useState(false);
  // Lookup of canvas defs so we can render localised names for
  // `experiment.appliesToCanvases[]` chips. Cached at module scope below
  // so re-opens of the modal don't re-fetch the list every time.
  const [defs, setDefs] = useState<Map<string, CanvasDefSummary>>(canvasDefsCache);

  useEffect(() => {
    // First-open hydration of canvas-defs lookup. After the first
    // resolve the module-level cache is populated and subsequent modal
    // opens get the map synchronously via the initial useState.
    if (defs.size > 0) return;
    let cancelled = false;
    void api.listDefs().then((list) => {
      if (cancelled) return;
      const map = new Map(list.map((d) => [d.id, d]));
      canvasDefsCache = map;
      setDefs(map);
    });
    return () => {
      cancelled = true;
    };
  }, [defs.size]);

  useEffect(() => {
    if (!experiment) {
      setDetail(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setDetail(null);
    let cancelled = false;
    void libraryApi.getExperiment(experiment.slug).then((d) => {
      if (cancelled) return;
      setDetail(d);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [experiment?.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  // Esc closes — same UX contract as PatternDetailModal / ConfirmDialog.
  useEffect(() => {
    if (!experiment) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [experiment, onClose]);

  if (!experiment) return null;

  const name = experiment.name[lang] ?? experiment.name.en;
  const summary = experiment.summary[lang] ?? experiment.summary.en;

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
        className="flex h-[700px] max-h-[85vh] min-h-[480px] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl"
      >
        {/* Header — name + summary + close. */}
        <header className="flex shrink-0 items-start gap-4 border-b border-gray-100 px-6 py-5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700">
                {t('library.kind.experiment')}
              </span>
              <span className="text-[10px] text-gray-400">{experiment.slug}</span>
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

        {/* Metadata strip — full chip set (more chips than card; modal
            has the room). theme · risks · cost · evidence · setup/run. */}
        <MetadataStrip experiment={experiment} />

        {/* Primary CTA — navigate to /p/new with seed param. The
            destination page (NewProjectPage) renders a mode toggle to
            let the user pick a new vs existing project. */}
        <div className="flex shrink-0 items-center justify-end border-b border-gray-100 px-6 py-3">
          <button
            type="button"
            onClick={() => {
              navigate(
                `/p/new?withCanvas=experiment-canvas&seedExperiment=${encodeURIComponent(
                  experiment.slug,
                )}`,
                { state: preserveNavigationState(location) },
              );
            }}
            className="rounded-lg bg-violet-600 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-violet-700"
          >
            {t('library.experiments.useThisExperiment')} →
          </button>
        </div>

        {/* Body — scrollable single pane. */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <DescriptionBody detail={detail} loading={loading} lang={lang} />
          <AppliesToCanvases experiment={experiment} lang={lang} defs={defs} />
          <RealWorldExamples
            examples={experiment.examples}
            lang={lang}
            onOpenCase={onOpenCase}
          />
          {experiment.sources.length > 0 && <SourcesFooter experiment={experiment} />}
        </div>
      </div>
    </div>
  );
}

function MetadataStrip({ experiment }: { experiment: Experiment }) {
  const { t } = useTranslation();
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-gray-100 bg-gray-50/60 px-6 py-3">
      <span className={`rounded px-2 py-0.5 text-[11px] ${themeChipClass(experiment.theme)}`}>
        {t(`library.experiment.theme.${experiment.theme}`)}
      </span>
      {experiment.risks.map((risk) => (
        <span
          key={risk}
          className="rounded bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700"
        >
          {t(`library.experiment.risk.${risk}`)}
        </span>
      ))}
      <span className={`rounded px-2 py-0.5 text-[11px] ${costChipClass(experiment.cost)}`}>
        {t(`library.experiment.cost.${experiment.cost}`)}
      </span>
      <span className="rounded bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700">
        {t(`library.experiment.evidence.${experiment.evidenceStrength}`)}
      </span>
      <span className="rounded bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700">
        {t('library.experiment.setupRunTime', {
          setup: t(`library.experiment.duration.${experiment.setupTime}`),
          run: t(`library.experiment.duration.${experiment.runTime}`),
        })}
      </span>
    </div>
  );
}

function DescriptionBody({
  detail,
  loading,
  lang,
}: {
  detail: BusinessModelExperimentDetail | null;
  loading: boolean;
  lang: Lang;
}) {
  const { t } = useTranslation();
  if (loading) return <p className="text-sm text-gray-400">{t('home.loading')}…</p>;
  if (!detail) return null;
  const md = detail.description[lang] || detail.description.en;
  if (!md || md.trim().length === 0) {
    return (
      <p className="text-sm text-gray-400">
        {t('library.experiment.descriptionEmpty')}
      </p>
    );
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
                 prose-blockquote:border-l-2 prose-blockquote:border-sky-300
                 prose-blockquote:bg-sky-50/40 prose-blockquote:rounded-r
                 prose-blockquote:py-1 prose-blockquote:px-3
                 prose-blockquote:not-italic prose-blockquote:text-gray-700
                 prose-a:text-sky-700 prose-a:no-underline hover:prose-a:underline
                 prose-code:bg-gray-100 prose-code:rounded prose-code:px-1
                 prose-code:py-0.5 prose-code:text-[12px]
                 prose-code:before:content-none prose-code:after:content-none"
    >
      <ReactMarkdown>{md}</ReactMarkdown>
    </article>
  );
}

/**
 * "Often used to validate" section — chips for each canvas this
 * experiment most commonly tests. Click → `/p/new?withCanvas=<defId>`,
 * mirroring the home gallery's pre-select pattern. Renders nothing when
 * the experiment lists no canvases (defensive — all 12 V1 experiments
 * declare at least one).
 */
function AppliesToCanvases({
  experiment,
  lang,
  defs,
}: {
  experiment: Experiment;
  lang: Lang;
  defs: Map<string, CanvasDefSummary>;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  if (experiment.appliesToCanvases.length === 0) return null;
  return (
    <section className="mt-8 border-t border-gray-100 pt-4">
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
        {t('library.experiment.appliesToSection')}
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {experiment.appliesToCanvases.map((defId) => {
          const def = defs.get(defId);
          // Fall back to the raw defId when the canvas isn't shipped or
          // defs haven't loaded yet — avoids an empty chip.
          const label = def?.name[lang] ?? def?.name.en ?? defId;
          return (
            <button
              key={defId}
              type="button"
              onClick={() =>
                navigate(`/p/new?withCanvas=${encodeURIComponent(defId)}`, {
                  state: preserveNavigationState(location),
                })
              }
              className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-700 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
            >
              {label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

/**
 * Real-world examples section. Each example is one card showing how
 * the experiment was actually run on a real business — Buffer's mock
 * sale, Dropbox's MVP video, etc. Two render densities driven by
 * whether `hypothesis` is populated:
 *
 * - **Compact** (no hypothesis): company + year + headline + 1 story
 *   paragraph + source. Used for ~10 lighter vignettes.
 * - **Featured** (hypothesis present): same header + story + 5 stacked
 *   sub-blocks following TBI's case-study layout (Hypothesis /
 *   Experiment / Evidence / Insights / Actions).
 *
 * When an example carries `caseSlug` AND a host-page handler is wired
 * via `onOpenCase`, the card shows an "Open full case →" button that
 * pivots to the case-library Cases tab + opens that case's preview.
 */
function RealWorldExamples({
  examples,
  lang,
  onOpenCase,
}: {
  examples: ExperimentExample[];
  lang: Lang;
  onOpenCase?: (slug: string) => void;
}) {
  const { t } = useTranslation();
  if (examples.length === 0) return null;
  return (
    <section className="mt-8 border-t border-gray-100 pt-4">
      <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
        {t('library.experiment.examplesSection')}
      </h3>
      <div className="space-y-4">
        {examples.map((ex, i) => (
          <ExampleCard
            key={`${ex.company.en ?? i}-${i}`}
            example={ex}
            lang={lang}
            onOpenCase={onOpenCase}
          />
        ))}
      </div>
    </section>
  );
}

function ExampleCard({
  example,
  lang,
  onOpenCase,
}: {
  example: ExperimentExample;
  lang: Lang;
  onOpenCase?: (slug: string) => void;
}) {
  const { t } = useTranslation();
  const company = example.company[lang] ?? example.company.en;
  const headline = example.headline?.[lang] ?? example.headline?.en;
  const story = example.story?.[lang] ?? example.story?.en;
  const isFeatured = !!example.hypothesis;
  const canOpenCase = !!example.caseSlug && !!onOpenCase;

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-gray-900">
            {company}
            {example.year && (
              <span className="ml-2 text-[11px] font-normal text-gray-400">
                · {example.year}
              </span>
            )}
          </div>
          {headline && (
            <p className="mt-0.5 text-[12px] italic text-gray-500">
              "{headline}"
            </p>
          )}
        </div>
        {canOpenCase && (
          <button
            type="button"
            onClick={() => onOpenCase!(example.caseSlug!)}
            className="shrink-0 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-700 transition hover:border-violet-300 hover:bg-violet-100"
          >
            {t('library.experiment.openFullCase')} →
          </button>
        )}
      </header>

      {story && (
        <p className="mt-3 text-[12px] leading-relaxed text-gray-700 whitespace-pre-line">
          {story}
        </p>
      )}

      {isFeatured && <FeaturedFields example={example} lang={lang} />}

      {example.source && (
        <p className="mt-3 text-[10px] text-gray-400">
          {t('library.sources')}: {example.source}
        </p>
      )}
    </article>
  );
}

const FEATURED_FIELDS: Array<{
  key: 'hypothesis' | 'experiment' | 'evidence' | 'insights' | 'actions';
  icon: string;
}> = [
  { key: 'hypothesis', icon: '❓' },
  { key: 'experiment', icon: '🧪' },
  { key: 'evidence', icon: '📊' },
  { key: 'insights', icon: '💡' },
  { key: 'actions', icon: '⚡' },
];

function FeaturedFields({
  example,
  lang,
}: {
  example: ExperimentExample;
  lang: Lang;
}) {
  const { t } = useTranslation();
  return (
    <div className="mt-4 space-y-2.5">
      {FEATURED_FIELDS.map((f) => {
        const value = example[f.key]?.[lang] ?? example[f.key]?.en;
        if (!value) return null;
        return (
          <div
            key={f.key}
            className="rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2"
          >
            <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              <span aria-hidden>{f.icon}</span>
              <span>{t(`library.experiment.fields.${f.key}`)}</span>
            </div>
            <p className="text-[12px] leading-relaxed text-gray-700">
              {value}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function SourcesFooter({ experiment }: { experiment: Experiment }) {
  const { t } = useTranslation();
  return (
    <section className="mt-8 border-t border-gray-100 pt-4">
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
        {t('library.sources')}
      </h3>
      <ul className="space-y-1.5 text-xs text-gray-600">
        {experiment.sources.map((s, i) => (
          <li key={i}>
            {s.url ? (
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-700 hover:underline"
              >
                {s.label}
              </a>
            ) : (
              s.label
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function themeChipClass(theme: Experiment['theme']): string {
  return theme === 'discovery'
    ? 'bg-violet-50 text-violet-700'
    : 'bg-amber-50 text-amber-700';
}

function costChipClass(cost: Experiment['cost']): string {
  switch (cost) {
    case 'cheap':
      return 'bg-emerald-50 text-emerald-700';
    case 'medium':
      return 'bg-yellow-50 text-yellow-700';
    case 'expensive':
      return 'bg-red-50 text-red-700';
  }
}
