import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import type {
  BusinessModelPattern,
  CaseLibraryEntry,
  Experiment,
  Lang,
  LibraryResource,
  StrategyFramework,
} from '@pingarden/shared';
import { api, type CanvasDefSummary } from '../api/client';
import { libraryApi } from '../api/library';
import { useIdentity } from '../identity/useIdentity';
import { CaseCard } from '../components/CaseCard';
import { CasePreviewModal } from '../components/CasePreviewModal';
import { PatternList } from '../components/PatternList';
import { PatternDetailModal } from '../components/PatternDetailModal';
import { ExperimentList } from '../components/ExperimentList';
import { ExperimentDetailModal } from '../components/ExperimentDetailModal';
import { StrategyFrameworkList } from '../components/StrategyFrameworkList';
import { StrategyFrameworkDetailModal } from '../components/StrategyFrameworkDetailModal';
import { ResourceList } from '../components/ResourceList';
import { ResourceDetailModal } from '../components/ResourceDetailModal';
import { CanvasMethodList } from '../components/CanvasMethodList';
import { Pagination } from '../components/Pagination';
import { CopilotDrawer } from '../components/CopilotDrawer';
import { CopilotErrorBoundary } from '../components/CopilotErrorBoundary';
import type { AttachedRef } from '../copilot/useConversation';
import { BackLink } from '../components/BackLink';
import { stateWithFrom } from '../navigation/useSmartBack';

type LibraryTab = 'cases' | 'canvases' | 'patterns' | 'experiments' | 'strategyFrameworks' | 'resources';

/**
 * Default library page size: 3-column grid × 3 rows.
 */
const PAGE_SIZE = 9;

/**
 * Visual-method and resource cards are intentionally taller, so keep
 * those tabs to 3-column grid × 2 rows per page.
 */
const SHOWCASE_PAGE_SIZE = 6;

/**
 * Case-library browse page. Lives at `/library`. Hosts ONLY curated
 * read-only content (`source: 'library'`); the user's own projects
 * live on `/projects` after the 2026-06 split.
 *
 * The page is split into three tabs (default: Cases):
 *   - **Company cases** — concrete projects (companies + industries +
 *     comparisons) rendered as a 3-column grid of `CaseCard`.
 *   - **Business models** — abstract reusable business-model patterns (Long
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
  const location = useLocation();

  const [cases, setCases] = useState<CaseLibraryEntry[] | null>(null);
  const [patterns, setPatterns] = useState<BusinessModelPattern[] | null>(null);
  const [canvasDefs, setCanvasDefs] = useState<CanvasDefSummary[] | null>(null);
  const [experiments, setExperiments] = useState<Experiment[] | null>(null);
  const [strategyFrameworks, setStrategyFrameworks] = useState<StrategyFramework[] | null>(null);
  const [resources, setResources] = useState<LibraryResource[] | null>(null);
  const [previewEntry, setPreviewEntry] = useState<CaseLibraryEntry | null>(null);
  const [selectedPattern, setSelectedPattern] = useState<BusinessModelPattern | null>(null);
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null);
  const [selectedStrategyFramework, setSelectedStrategyFramework] = useState<StrategyFramework | null>(null);
  const [selectedResource, setSelectedResource] = useState<LibraryResource | null>(null);
  const [tab, setTab] = useState<LibraryTab>('cases');
  // Per-tab page state. Reset to 1 when the underlying list reloads or
  // the user switches tab — so coming back to a tab always lands you
  // at the top, not on a "Page 3" they don't remember leaving on.
  const [casesPage, setCasesPage] = useState(1);
  const [canvasDefsPage, setCanvasDefsPage] = useState(1);
  const [patternsPage, setPatternsPage] = useState(1);
  const [experimentsPage, setExperimentsPage] = useState(1);
  const [strategyFrameworksPage, setStrategyFrameworksPage] = useState(1);
  const [resourcesPage, setResourcesPage] = useState(1);
  // Copilot state — drawer open flag + the currently-attached case/pattern.
  // Selecting a card in a tab updates `attachedRef` so the drawer's
  // context chip swaps automatically; clicking the chip's × clears it.
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [attachedRef, setAttachedRef] = useState<AttachedRef | null>(null);
  // Anchor for "scroll the list region into view" on page change.
  // Sits above the tab strip so the user sees the new page's first row
  // without scrolling up after clicking Next.
  const listAnchorRef = useRef<HTMLDivElement | null>(null);
  const copilotLibraryCatalog = useMemo(
    () => ({ patterns, experiments, strategyFrameworks, canvasDefs }),
    [patterns, experiments, strategyFrameworks, canvasDefs],
  );

  useEffect(() => {
    if (!identity) return;
    void libraryApi.list(identity.displayName).then(setCases).catch(() => setCases([]));
    // Patterns are public — no displayName required. Fetched once on
    // mount alongside cases so the Cases tab can render pattern chips
    // immediately (lookup needs the patterns list).
    void libraryApi.listPatterns().then(setPatterns).catch(() => setPatterns([]));
    // Canvas methods — same templates used by the home page and workspace picker.
    void api.listDefs().then(setCanvasDefs).catch(() => setCanvasDefs([]));
    // Experiments — same shape as patterns: public, fetched once.
    void libraryApi.listExperiments().then(setExperiments).catch(() => setExperiments([]));
    // Strategy frameworks — public, fetched once for case chips and the tab.
    void libraryApi.listStrategyFrameworks().then(setStrategyFrameworks).catch(() => setStrategyFrameworks([]));
    // Resources — books, reports, articles, and public sources.
    void libraryApi.listResources().then(setResources).catch(() => setResources([]));
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
  useEffect(() => {
    setStrategyFrameworksPage(1);
  }, [strategyFrameworks]);
  useEffect(() => {
    setResourcesPage(1);
  }, [resources]);

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
  function handleCanvasDefsPageChange(p: number) {
    setCanvasDefsPage(p);
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
  function handleStrategyFrameworksPageChange(p: number) {
    setStrategyFrameworksPage(p);
    requestAnimationFrame(scrollToList);
  }
  function handleResourcesPageChange(p: number) {
    setResourcesPage(p);
    requestAnimationFrame(scrollToList);
  }
  // Tab switch: reset pagers + park at the list region. Avoids the
  // surprise of clicking from Cases (page 2) to Patterns (which had
  // its own page 2 from earlier in the session).
  function handleTabChange(next: LibraryTab) {
    if (next === tab) return;
    setTab(next);
    setCasesPage(1);
    setCanvasDefsPage(1);
    setPatternsPage(1);
    setExperimentsPage(1);
    setStrategyFrameworksPage(1);
    setResourcesPage(1);
  }

  if (!identity) return null;
  const lang = (i18n.language as Lang) ?? 'en';

  async function handleOpenReadOnly(
    _entry: CaseLibraryEntry,
    detail: import('@pingarden/shared').CaseLibraryDetail,
  ) {
    setPreviewEntry(null);
    navigate(`/p/${detail.project.id}`, {
      state: { ...stateWithFrom(location), caseDetail: detail },
    });
  }

  async function handleFork(entry: CaseLibraryEntry) {
    if (!identity) return;
    // Honour the user's current UI language — fork only the canvases
    // / story matching it, so the user lands in a clean
    // single-language project. The server falls back to forking the
    // whole case when the requested lang isn't shipped.
    const result = await libraryApi.fork(entry.slug, identity.displayName, lang);
    setPreviewEntry(null);
    navigate(`/p/${result.project.id}`, { state: stateWithFrom(location) });
  }

  /** Cases tab → Patterns tab: open the matching pattern's detail modal. */
  function handlePatternChipClick(slug: string) {
    const p = patterns?.find((x) => x.slug === slug);
    if (!p) return;
    setPreviewEntry(null);
    handleTabChange('patterns');
    setSelectedPattern(p);
  }

  // ── Copilot auto-attach helpers ────────────────────────────────────
  // When the drawer is open and the user clicks a card, auto-set the
  // attached ref so the chip swaps to the just-clicked entity. When the
  // drawer is closed, do nothing — preserves the "open the preview
  // modal" affordance for the common browse-without-AI case.
  function handleCaseCardClick(entry: CaseLibraryEntry) {
    if (copilotOpen) {
      setAttachedRef({
        type: 'case',
        slug: entry.slug,
        companyName: entry.companyName[lang] ?? entry.companyName.en,
      });
    }
    setPreviewEntry(entry);
  }
  function handlePatternSelect(p: BusinessModelPattern) {
    if (copilotOpen) {
      setAttachedRef({
        type: 'pattern',
        slug: p.slug,
        name: p.name[lang] ?? p.name.en,
      });
    }
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

  /** Cases tab → Strategy Analysis tab: open the matching framework. */
  function handleStrategyFrameworkChipClick(slug: string) {
    const f = strategyFrameworks?.find((x) => x.slug === slug);
    if (!f) return;
    setPreviewEntry(null);
    handleTabChange('strategyFrameworks');
    setSelectedStrategyFramework(f);
  }

  /** Strategy Analysis tab → Cases tab: open the case preview. */
  function handleStrategyFrameworkExampleClick(slug: string) {
    const entry = cases?.find((c) => c.slug === slug);
    if (!entry) return;
    setSelectedStrategyFramework(null);
    handleTabChange('cases');
    setPreviewEntry(entry);
  }

  function handleResourceSelect(resource: LibraryResource) {
    if (copilotOpen) {
      setAttachedRef({
        type: 'resource',
        slug: resource.slug,
        title: resource.title[lang] ?? resource.title.en,
      });
    }
    setSelectedResource(resource);
  }

  /** Resources tab → Cases tab: open the case preview. */
  function handleResourceCaseClick(slug: string) {
    const entry = cases?.find((c) => c.slug === slug);
    if (!entry) return;
    setSelectedResource(null);
    handleTabChange('cases');
    setPreviewEntry(entry);
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-4 sm:px-8 sm:py-6">
      {/* Page header — back link + title + create CTA on the right */}
      <header className="mb-4 flex flex-col items-stretch gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="min-w-0 flex-1">
          <BackLink
            fallback="/"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900"
          >
            ← {t('nav.back')}
          </BackLink>
          <h1 className="mt-2 text-2xl font-semibold leading-tight text-gray-900 sm:text-3xl">
            {t('library.pageTitle')}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">{t('library.pageSubtitle')}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:w-auto sm:shrink-0 sm:items-center">
          <button
            type="button"
            onClick={() => setCopilotOpen((v) => !v)}
            aria-pressed={copilotOpen}
            className={`min-w-0 rounded-xl border px-3 py-2 text-sm font-semibold leading-tight transition sm:px-4 ${
              copilotOpen
                ? 'border-gray-900 bg-gray-900 text-white hover:bg-black'
                : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <span className="whitespace-nowrap">💬 {t('library.copilot.openButton')}</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/p/new', { state: stateWithFrom(location) })}
            className="min-w-0 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold leading-tight text-gray-900 transition hover:border-gray-300 hover:bg-gray-50 sm:px-4"
          >
            <span className="whitespace-nowrap">+ {t('home.createBlankInstead')}</span>
          </button>
        </div>
      </header>

      {/* Tab strip — default Cases. State is in-memory (no URL sync yet). */}
      <div className="-mx-4 mb-4 overflow-x-auto border-b border-gray-200 px-4 scrollbar-hide sm:mx-0 sm:px-0">
        <div
          ref={listAnchorRef}
          className="flex min-w-max items-end gap-1"
          role="tablist"
        >
        <TabButton
          active={tab === 'cases'}
          onClick={() => handleTabChange('cases')}
          label={t('library.tabs.cases')}
          count={cases?.length}
        />
        <TabButton
          active={tab === 'canvases'}
          onClick={() => handleTabChange('canvases')}
          label={t('library.tabs.canvases')}
          count={canvasDefs?.length}
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
        <TabButton
          active={tab === 'strategyFrameworks'}
          onClick={() => handleTabChange('strategyFrameworks')}
          label={t('library.tabs.strategyFrameworks')}
          count={strategyFrameworks?.length}
        />
        <TabButton
          active={tab === 'resources'}
          onClick={() => handleTabChange('resources')}
          label={t('library.tabs.resources')}
          count={resources?.length}
        />
        </div>
      </div>

      {tab === 'cases' && (
        <section role="tabpanel">
          <CasesTabIntro />
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
                      onClick={handleCaseCardClick}
                      patterns={patterns ?? undefined}
                      onPatternClick={handlePatternChipClick}
                      strategyFrameworks={strategyFrameworks ?? undefined}
                      onStrategyFrameworkClick={handleStrategyFrameworkChipClick}
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

      {tab === 'canvases' && (
        <section role="tabpanel">
          <CanvasMethodsTabIntro />
          {canvasDefs === null ? (
            <p className="text-sm text-gray-400">{t('home.loading')}…</p>
          ) : (
            <>
              <CanvasMethodList
                defs={canvasDefs.slice(
                  (canvasDefsPage - 1) * SHOWCASE_PAGE_SIZE,
                  canvasDefsPage * SHOWCASE_PAGE_SIZE,
                )}
                lang={lang}
                onStart={(defId) => navigate(`/p/new?withCanvas=${encodeURIComponent(defId)}`, { state: stateWithFrom(location) })}
              />
              <Pagination
                total={canvasDefs.length}
                pageSize={SHOWCASE_PAGE_SIZE}
                currentPage={canvasDefsPage}
                onPageChange={handleCanvasDefsPageChange}
                className="mt-5"
              />
            </>
          )}
        </section>
      )}

      {tab === 'patterns' && (
        <section role="tabpanel">
          <PatternsTabIntro />
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
                onSelect={handlePatternSelect}
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

      {tab === 'strategyFrameworks' && (
        <section role="tabpanel">
          <StrategyFrameworksTabIntro />
          {strategyFrameworks === null ? (
            <p className="text-sm text-gray-400">{t('home.loading')}…</p>
          ) : (
            <>
              <StrategyFrameworkList
                frameworks={strategyFrameworks.slice(
                  (strategyFrameworksPage - 1) * PAGE_SIZE,
                  strategyFrameworksPage * PAGE_SIZE,
                )}
                lang={lang}
                onSelect={setSelectedStrategyFramework}
              />
              <Pagination
                total={strategyFrameworks.length}
                pageSize={PAGE_SIZE}
                currentPage={strategyFrameworksPage}
                onPageChange={handleStrategyFrameworksPageChange}
                className="mt-5"
              />
            </>
          )}
        </section>
      )}

      {tab === 'resources' && (
        <section role="tabpanel">
          <ResourcesTabIntro />
          {resources === null ? (
            <p className="text-sm text-gray-400">{t('home.loading')}…</p>
          ) : (
            <>
              <ResourceList
                resources={resources.slice(
                  (resourcesPage - 1) * SHOWCASE_PAGE_SIZE,
                  resourcesPage * SHOWCASE_PAGE_SIZE,
                )}
                lang={lang}
                onSelect={handleResourceSelect}
              />
              <Pagination
                total={resources.length}
                pageSize={SHOWCASE_PAGE_SIZE}
                currentPage={resourcesPage}
                onPageChange={handleResourcesPageChange}
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
        strategyFrameworks={strategyFrameworks ?? undefined}
        onStrategyFrameworkClick={handleStrategyFrameworkChipClick}
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

      {/* Strategy framework detail modal — large, tabbed */}
      <StrategyFrameworkDetailModal
        framework={selectedStrategyFramework}
        lang={lang}
        onClose={() => setSelectedStrategyFramework(null)}
        onExampleClick={handleStrategyFrameworkExampleClick}
      />

      {/* Resource detail modal — reading notes / related content / sources */}
      <ResourceDetailModal
        resource={selectedResource}
        lang={lang}
        onClose={() => setSelectedResource(null)}
        onCaseClick={handleResourceCaseClick}
      />

      {/* Library Copilot — right slide-over chat panel.
          Mounted once at the page root; visibility flag-driven.
          Wrapped in an error boundary so a Copilot bug never blanks
          out the entire Library page. */}
      <CopilotErrorBoundary label="Copilot crashed — details below">
        <CopilotDrawer
          open={copilotOpen}
          onClose={() => setCopilotOpen(false)}
          attachedRef={attachedRef}
          lang={lang}
          libraryCatalog={copilotLibraryCatalog}
        />
      </CopilotErrorBoundary>
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
      className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition sm:px-4 ${
        active
          ? 'border-gray-900 text-gray-900'
          : 'border-transparent text-gray-500 hover:text-gray-800'
      }`}
    >
      <span>{label}</span>
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

function TabIntro({
  titleKey,
  bodyKey,
  tone,
}: {
  titleKey: string;
  bodyKey: string;
  tone: 'emerald' | 'sky' | 'gray' | 'indigo' | 'amber';
}) {
  const { t } = useTranslation();
  const toneClass = {
    emerald: 'border-emerald-100 bg-emerald-50/60',
    sky: 'border-sky-100 bg-sky-50/60',
    gray: 'border-gray-200 bg-gray-50',
    indigo: 'border-indigo-100 bg-indigo-50/50',
    amber: 'border-amber-100 bg-amber-50/50',
  }[tone];
  return (
    <div className={`mb-5 rounded-xl border p-4 ${toneClass}`}>
      <h2 className="text-sm font-semibold text-gray-900">{t(titleKey)}</h2>
      <div
        className="mt-1.5 text-[12px] leading-relaxed text-gray-600
                   [&_strong]:font-semibold [&_strong]:text-gray-900"
      >
        <ReactMarkdown>{t(bodyKey)}</ReactMarkdown>
      </div>
    </div>
  );
}

function CasesTabIntro() {
  return <TabIntro titleKey="library.cases.intro.title" bodyKey="library.cases.intro.body" tone="emerald" />;
}

function CanvasMethodsTabIntro() {
  return <TabIntro titleKey="library.canvasMethods.intro.title" bodyKey="library.canvasMethods.intro.body" tone="sky" />;
}

function PatternsTabIntro() {
  return <TabIntro titleKey="library.patterns.intro.title" bodyKey="library.patterns.intro.body" tone="gray" />;
}

function ExperimentsTabIntro() {
  return <TabIntro titleKey="library.experiments.intro.title" bodyKey="library.experiments.intro.body" tone="gray" />;
}

function StrategyFrameworksTabIntro() {
  return <TabIntro titleKey="library.strategyFrameworks.intro.title" bodyKey="library.strategyFrameworks.intro.body" tone="indigo" />;
}

function ResourcesTabIntro() {
  return <TabIntro titleKey="library.resources.intro.title" bodyKey="library.resources.intro.body" tone="amber" />;
}
