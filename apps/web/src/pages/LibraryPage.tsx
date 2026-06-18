import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import type {
  BusinessModelPattern,
  CaseLibraryEntry,
  Experiment,
  Lang,
} from '@pingarden/shared';
import { libraryApi } from '../api/library';
import { useIdentity } from '../identity/useIdentity';
import { CaseCard } from '../components/CaseCard';
import { CasePreviewModal } from '../components/CasePreviewModal';
import { PatternList } from '../components/PatternList';
import { PatternDetailModal } from '../components/PatternDetailModal';
import { ExperimentList } from '../components/ExperimentList';
import { ExperimentDetailModal } from '../components/ExperimentDetailModal';
import { Pagination } from '../components/Pagination';

type LibraryTab = 'cases' | 'patterns' | 'experiments';

/**
 * Items per page on both the Cases and Patterns tabs. Picked to match
 * the 3-col grid (3 rows × 3 cols = 9 cards) so a full page lands as
 * a clean rectangle without orphan rows. Cases tab passes the threshold
 * today (10 cases → 2 pages); Patterns tab is below it (3 patterns →
 * pager renders nothing) but the wiring is symmetric so the pager
 * activates automatically when patterns grow > 9.
 */
const PAGE_SIZE = 9;

/**
 * Case-library browse page. Lives at `/library`. Hosts ONLY curated
 * read-only content (`source: 'library'`); the user's own projects
 * live on `/projects` after the 2026-06 split.
 *
 * The page is split into two tabs (default: Cases) per 2026-06-15
 * decision:
 *   - **Cases** — concrete projects (companies + industries +
 *     comparisons) rendered as a 3-column grid of `CaseCard`.
 *   - **Patterns** — abstract reusable business-model patterns (Long
 *     Tail, Unbundling, …) as a 3-column grid of compact pattern cards.
 *     Patterns are NOT projects: no fork, no canvas. Click a card to
 *     open `PatternDetailModal` — a large tabbed modal with the
 *     long-form description (markdown) and the curated example cases.
 *     Per 2026-06-15 feedback the list itself is intentionally lean
 *     so the page scales to many patterns without becoming a wall of
 *     nested collapsibles.
 *
 * Cross-tab navigation:
 *   - Cases tab: a CaseCard's violet "applies patterns" chip → switch
 *     to Patterns tab + open that pattern's detail modal.
 *   - Patterns tab: an example case in the modal → close pattern modal,
 *     switch to Cases tab, open that case's preview modal.
 */
export function LibraryPage() {
  const { t, i18n } = useTranslation();
  const { identity } = useIdentity();
  const navigate = useNavigate();

  const [cases, setCases] = useState<CaseLibraryEntry[] | null>(null);
  const [patterns, setPatterns] = useState<BusinessModelPattern[] | null>(null);
  const [experiments, setExperiments] = useState<Experiment[] | null>(null);
  const [previewEntry, setPreviewEntry] = useState<CaseLibraryEntry | null>(null);
  const [selectedPattern, setSelectedPattern] = useState<BusinessModelPattern | null>(null);
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null);
  const [tab, setTab] = useState<LibraryTab>('cases');
  // Per-tab page state. Reset to 1 when the underlying list reloads or
  // the user switches tab — so coming back to a tab always lands you
  // at the top, not on a "Page 3" they don't remember leaving on.
  const [casesPage, setCasesPage] = useState(1);
  const [patternsPage, setPatternsPage] = useState(1);
  const [experimentsPage, setExperimentsPage] = useState(1);
  // Anchor for "scroll the list region into view" on page change.
  // Sits above the tab strip so the user sees the new page's first row
  // without scrolling up after clicking Next.
  const listAnchorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!identity) return;
    void libraryApi.list(identity.displayName).then(setCases);
    // Patterns are public — no displayName required. Fetched once on
    // mount alongside cases so the Cases tab can render pattern chips
    // immediately (lookup needs the patterns list).
    void libraryApi.listPatterns().then(setPatterns);
    // Experiments — same shape as patterns: public, fetched once.
    void libraryApi.listExperiments().then(setExperiments);
  }, [identity]);

  // Reset pagers whenever the underlying list reloads (defensive: if
  // the count shrinks, a stale page index could land on an empty
  // page). Cheap; runs at most twice per mount.
  useEffect(() => {
    setCasesPage(1);
  }, [cases]);
  useEffect(() => {
    setPatternsPage(1);
  }, [patterns]);
  useEffect(() => {
    setExperimentsPage(1);
  }, [experiments]);

  // Smooth-scroll to the list anchor on page change so the user
  // doesn't have to scroll up by hand.
  function scrollToList() {
    listAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function handleCasesPageChange(p: number) {
    setCasesPage(p);
    // requestAnimationFrame so the new content has rendered before we scroll
    requestAnimationFrame(scrollToList);
  }
  function handlePatternsPageChange(p: number) {
    setPatternsPage(p);
    requestAnimationFrame(scrollToList);
  }
  function handleExperimentsPageChange(p: number) {
    setExperimentsPage(p);
    requestAnimationFrame(scrollToList);
  }
  // Tab switch: reset pagers + park at the list region. Avoids the
  // surprise of clicking from Cases (page 2) to Patterns (which had
  // its own page 2 from earlier in the session).
  function handleTabChange(next: LibraryTab) {
    if (next === tab) return;
    setTab(next);
    setCasesPage(1);
    setPatternsPage(1);
    setExperimentsPage(1);
  }

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

  /** Cases tab → Patterns tab: open the matching pattern's detail modal. */
  function handlePatternChipClick(slug: string) {
    const p = patterns?.find((x) => x.slug === slug);
    if (!p) return;
    setPreviewEntry(null);
    handleTabChange('patterns');
    setSelectedPattern(p);
  }

  /** Patterns tab → Cases tab: open the case's preview modal. */
  function handleExampleClick(slug: string) {
    const entry = cases?.find((c) => c.slug === slug);
    if (!entry) return;
    setSelectedPattern(null);
    handleTabChange('cases');
    setPreviewEntry(entry);
  }

  /** Experiments tab → Cases tab: an `experiment.examples[].caseSlug`
   *  was clicked. Mirrors handleExampleClick (Patterns → Cases). */
  function handleExperimentExampleCaseClick(slug: string) {
    const entry = cases?.find((c) => c.slug === slug);
    if (!entry) return;
    setSelectedExperiment(null);
    handleTabChange('cases');
    setPreviewEntry(entry);
  }

  return (
    <main className="mx-auto max-w-6xl px-8 py-6">
      {/* Page header — back link + title + create CTA on the right */}
      <header className="mb-4 flex items-end justify-between gap-6">
        <div>
          <Link
            to="/"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900"
          >
            ← {t('nav.back')}
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-gray-900">
            {t('library.pageTitle')}
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

      {/* Tab strip — default Cases. State is in-memory (no URL sync yet). */}
      <div
        ref={listAnchorRef}
        className="mb-4 flex items-end gap-1 border-b border-gray-200"
        role="tablist"
      >
        <TabButton
          active={tab === 'cases'}
          onClick={() => handleTabChange('cases')}
          label={t('library.tabs.cases')}
          count={cases?.length}
        />
        <TabButton
          active={tab === 'patterns'}
          onClick={() => handleTabChange('patterns')}
          label={t('library.tabs.patterns')}
          count={patterns?.length}
        />
        <TabButton
          active={tab === 'experiments'}
          onClick={() => handleTabChange('experiments')}
          label={t('library.tabs.experiments')}
          count={experiments?.length}
        />
      </div>

      {tab === 'cases' && (
        <section role="tabpanel">
          {cases === null ? (
            <p className="text-sm text-gray-400">{t('home.loading')}…</p>
          ) : cases.length === 0 ? (
            <p className="rounded-lg border border-dashed border-gray-200 bg-white py-12 text-center text-sm text-gray-400">
              {t('library.noCases')}
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {cases
                  .slice((casesPage - 1) * PAGE_SIZE, casesPage * PAGE_SIZE)
                  .map((c) => (
                    <CaseCard
                      key={c.slug}
                      entry={c}
                      lang={lang}
                      onClick={(entry) => setPreviewEntry(entry)}
                      patterns={patterns ?? undefined}
                      onPatternClick={handlePatternChipClick}
                    />
                  ))}
              </div>
              <Pagination
                total={cases.length}
                pageSize={PAGE_SIZE}
                currentPage={casesPage}
                onPageChange={handleCasesPageChange}
                className="mt-5"
              />
            </>
          )}
        </section>
      )}

      {tab === 'patterns' && (
        <section role="tabpanel">
          {patterns === null ? (
            <p className="text-sm text-gray-400">{t('home.loading')}…</p>
          ) : (
            <>
              <PatternList
                patterns={patterns.slice(
                  (patternsPage - 1) * PAGE_SIZE,
                  patternsPage * PAGE_SIZE,
                )}
                lang={lang}
                onSelect={setSelectedPattern}
              />
              <Pagination
                total={patterns.length}
                pageSize={PAGE_SIZE}
                currentPage={patternsPage}
                onPageChange={handlePatternsPageChange}
                className="mt-5"
              />
            </>
          )}
        </section>
      )}

      {tab === 'experiments' && (
        <section role="tabpanel">
          <ExperimentsTabIntro />
          {experiments === null ? (
            <p className="text-sm text-gray-400">{t('home.loading')}…</p>
          ) : (
            <>
              <ExperimentList
                experiments={experiments.slice(
                  (experimentsPage - 1) * PAGE_SIZE,
                  experimentsPage * PAGE_SIZE,
                )}
                lang={lang}
                onSelect={setSelectedExperiment}
              />
              <Pagination
                total={experiments.length}
                pageSize={PAGE_SIZE}
                currentPage={experimentsPage}
                onPageChange={handleExperimentsPageChange}
                className="mt-5"
              />
            </>
          )}
        </section>
      )}

      {/* Case preview modal */}
      <CasePreviewModal
        entry={previewEntry}
        lang={lang}
        onClose={() => setPreviewEntry(null)}
        onOpenReadOnly={handleOpenReadOnly}
        onFork={handleFork}
        patterns={patterns ?? undefined}
        onPatternClick={handlePatternChipClick}
      />

      {/* Pattern detail modal — large, tabbed (description / examples) */}
      <PatternDetailModal
        pattern={selectedPattern}
        lang={lang}
        onClose={() => setSelectedPattern(null)}
        onExampleClick={handleExampleClick}
      />

      {/* Experiment detail modal — single-pane (description + sources) */}
      <ExperimentDetailModal
        experiment={selectedExperiment}
        lang={lang}
        onClose={() => setSelectedExperiment(null)}
        onOpenCase={handleExperimentExampleCaseClick}
      />
    </main>
  );
}

function TabButton({
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
      className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
        active
          ? 'border-gray-900 text-gray-900'
          : 'border-transparent text-gray-500 hover:text-gray-800'
      }`}
    >
      {label}
      {typeof count === 'number' && (
        <span
          className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] ${
            active ? 'bg-gray-100 text-gray-700' : 'bg-gray-50 text-gray-500'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/**
 * Intro block above the Experiments grid. Always-visible, ~3 sentences,
 * bilingual. Frames experiments for users who arrive cold: what they're
 * for, how they connect to canvases, how to actually run one. Uses
 * react-markdown so the body can carry **bold** emphasis on the three
 * picking signals (theme / risk / cost band).
 */
function ExperimentsTabIntro() {
  const { t } = useTranslation();
  return (
    <div className="mb-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <h2 className="text-sm font-semibold text-gray-900">
        {t('library.experiments.intro.title')}
      </h2>
      <div
        className="mt-1.5 text-[12px] leading-relaxed text-gray-600
                   [&_strong]:font-semibold [&_strong]:text-gray-900"
      >
        <ReactMarkdown>{t('library.experiments.intro.body')}</ReactMarkdown>
      </div>
    </div>
  );
}
