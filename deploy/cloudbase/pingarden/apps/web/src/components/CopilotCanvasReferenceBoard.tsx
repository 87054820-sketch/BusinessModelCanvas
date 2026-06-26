import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type {
  BusinessModelPattern,
  CanvasDefaultColorLegendEntry,
  CanvasMeta,
  CaseLibraryDetail,
  Experiment,
  Lang,
  LibraryResource,
  LibraryResourceDetail,
  StrategyFramework,
} from '@pingarden/shared';
import { effectiveObjectTypes } from '@pingarden/shared';
import { api, type CanvasDefSummary } from '../api/client';
import { libraryApi } from '../api/library';
import { projectsApi } from '../api/projects';
import type { AttachedRef } from '../copilot/useConversation';
import { CanvasRenderer } from '../canvas/CanvasRenderer';
import { StickyLayer } from '../canvas/StickyLayer';
import { PinLayer } from '../canvas/PinLayer';
import { LegendPalette } from '../canvas/LegendPalette';
import { StickyLegendPalette } from '../canvas/StickyLegendPalette';
import { useReadOnlyYDoc } from '../collab/useReadOnlyYDoc';
import { hasPinClasses } from '../collab/pinClasses';
import { hasColorLegend } from '../collab/colorLegend';
import { preserveNavigationState } from '../navigation/useSmartBack';

const UUID_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const KEBAB_RE = /`?\b[a-z][a-z0-9]+(?:-[a-z0-9]+)+\b`?/g;
const MAX_CANVAS_REFERENCES = 4;
const MAX_CASE_REFERENCES = 8;
const MAX_RESOURCE_REFERENCES = 8;
const REFERENCE_GRID_CLASS = 'grid grid-cols-[repeat(auto-fit,minmax(260px,360px))] justify-start gap-2 p-2.5';
const CANVAS_ALIASES: Record<string, string[]> = {
  'business-model-canvas': ['BMC', '商业模式画布'],
  'value-proposition-canvas': ['VPC', '价值主张画布'],
  'portfolio-map': ['Portfolio', '组合地图', '业务组合', '业务组合管理'],
  'three-horizons-map': ['三层增长', '三层增长地图', 'Three Horizons'],
  'bcg-growth-share-matrix': ['BCG', '增长份额矩阵', 'BCG 矩阵'],
  'ad-lib-value-proposition': ['Ad-Lib VP', '价值主张速写', '一句话价值主张', '价值主张模板', '价值主张填空'],
};

export interface CopilotCanvasReference {
  canvas: CanvasMeta;
  defName: string;
}

export interface CopilotCaseReference {
  detail: CaseLibraryDetail;
  matchedCanvases: CopilotCanvasReference[];
}

export interface CopilotResourceReference {
  resource: LibraryResource;
}

export interface CopilotRecommendationReferences {
  canvasRefs: CopilotCanvasReference[];
  caseRefs: CopilotCaseReference[];
  resourceRefs: CopilotResourceReference[];
  unresolvedCaseSlugs: string[];
  unresolvedCanvasLabels: string[];
}

const EMPTY_RECOMMENDATION_REFS: CopilotRecommendationReferences = {
  canvasRefs: [],
  caseRefs: [],
  resourceRefs: [],
  unresolvedCaseSlugs: [],
  unresolvedCanvasLabels: [],
};

export function useCopilotRecommendationReferences(
  content: string,
  displayName: string,
  lang: Lang,
  attachedRef?: AttachedRef | null,
): CopilotRecommendationReferences {
  const ids = useMemo(() => extractCandidateIds(content), [content]);
  const idsKey = ids.join('|');
  const contextKey = attachedRef ? attachedRefKey(attachedRef) : '';
  const [refs, setRefs] = useState<CopilotRecommendationReferences>(EMPTY_RECOMMENDATION_REFS);

  useEffect(() => {
    if ((!idsKey && !content.trim()) || !displayName) {
      setRefs(EMPTY_RECOMMENDATION_REFS);
      return;
    }

    let cancelled = false;
    void (async () => {
      const defs = await api.listDefs().catch(() => [] as CanvasDefSummary[]);
      const defNameById = new Map(
        defs.map((def) => [def.id, def.name[lang] ?? def.name.en ?? def.id]),
      );
      const canvasCandidates = extractCanvasCandidates(content, defs);
      const [caseSlugCandidates, resourceRefs] = await Promise.all([
        extractCaseSlugs(content, displayName),
        extractResourceRefs(content, lang),
      ]);

      const uuidRefs = (
        await Promise.all(
          ids.map((id) =>
            api
              .getCanvas(id, displayName)
              .then((canvas) => (canvas.language === lang ? toCanvasReference(canvas, defNameById, lang) : null))
              .catch(() => null),
          ),
        )
      ).filter((item): item is CopilotCanvasReference => item !== null);

      const caseDetails = await Promise.all(
        caseSlugCandidates.slice(0, MAX_CASE_REFERENCES).map((slug) =>
          libraryApi
            .get(slug, displayName)
            .then((detail) => ({ slug, detail }))
            .catch(() => ({ slug, detail: null })),
        ),
      );
      const resolvedCases = caseDetails.filter(
        (item): item is { slug: string; detail: CaseLibraryDetail } => item.detail !== null,
      );
      const unresolvedCaseSlugs = caseDetails
        .filter((item) => item.detail === null)
        .map((item) => item.slug);

      const matchedCaseCanvasRefs = resolvedCases.flatMap(({ detail }) =>
        matchCanvases(detail.canvases, canvasCandidates, defNameById, lang),
      );
      const contextCanvasRefs =
        matchedCaseCanvasRefs.length > 0
          ? []
          : await resolveContextCanvasRefs(attachedRef, displayName, canvasCandidates, defNameById, lang);
      const canvasRefs = dedupeCanvasRefs([
        ...uuidRefs,
        ...matchedCaseCanvasRefs,
        ...contextCanvasRefs,
      ]).slice(0, MAX_CANVAS_REFERENCES);

      const caseRefs: CopilotCaseReference[] = resolvedCases.map(({ detail }) => ({
        detail,
        matchedCanvases: matchCanvases(detail.canvases, canvasCandidates, defNameById, lang),
      }));
      const unresolvedCanvasLabels =
        canvasCandidates.length > 0 && canvasRefs.length === 0
          ? canvasCandidates.map((item) => item.label)
          : [];

      if (!cancelled) {
        setRefs({ canvasRefs, caseRefs, resourceRefs, unresolvedCaseSlugs, unresolvedCanvasLabels });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [attachedRef, content, contextKey, displayName, idsKey, lang]);

  return refs;
}

export function useCopilotCanvasReferences(
  content: string,
  displayName: string,
  lang: Lang,
): CopilotCanvasReference[] {
  return useCopilotRecommendationReferences(content, displayName, lang).canvasRefs;
}

export function stripResolvedCanvasIds(content: string, refs: CopilotCanvasReference[]): string {
  let next = content;
  for (const ref of refs) {
    const id = escapeRegExp(ref.canvas.id);
    next = next
      .replace(new RegExp(`^\\s*[-*]\\s*id\\s*:\\s*${id}\\s*$`, 'gim'), '')
      .replace(new RegExp(`\\s*[（(]\\s*${id}\\s*[）)]`, 'g'), '')
      .replace(new RegExp(`,?\\s*id\\s*:\\s*${id}`, 'gi'), '')
      .replace(new RegExp(id, 'g'), '');
  }
  return cleanReferenceText(next);
}

export function stripResolvedCaseSlugs(content: string, refs: CopilotCaseReference[]): string {
  let next = content;
  for (const ref of refs) {
    const slug = escapeRegExp(ref.detail.case.slug);
    next = next
      .replace(new RegExp(`^\\s*[-*]?\\s*(?:case\\s*)?slug\\s*[:：]\\s*(?:\\x60)?${slug}(?:\\x60)?\\s*$`, 'gim'), '')
      .replace(new RegExp(`\\s*[（(]\\s*slug\\s*[:：]\\s*${slug}\\s*[）)]`, 'gi'), '');
  }
  return cleanReferenceText(next);
}

function cleanReferenceText(content: string): string {
  return content
    .replace(/（\s*）|\(\s*\)/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function CopilotCanvasReferenceBoard({
  refs,
  lang,
  displayName,
  onNavigateToCanvas,
}: {
  refs: CopilotCanvasReference[];
  lang: Lang;
  displayName: string;
  onNavigateToCanvas?: () => void;
}) {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<CopilotCanvasReference | null>(null);

  if (refs.length === 0) return null;

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
      <div className="border-b border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-teal-50 px-3 py-2">
        <div className="text-[12px] font-semibold text-emerald-950">
          {t('library.copilot.canvasRefs.title')}
        </div>
        <div className="mt-0.5 text-[11px] leading-relaxed text-emerald-700">
          {t('library.copilot.canvasRefs.subtitle')}
        </div>
      </div>
      <div className={REFERENCE_GRID_CLASS}>
        {refs.map((ref) => (
          <div
            key={ref.canvas.id}
            className="flex items-center justify-between gap-2 rounded-xl border border-gray-100 bg-gray-50/70 p-2.5 transition hover:border-emerald-200 hover:bg-emerald-50/40"
          >
            <div className="min-w-0">
              <div className="truncate text-[12px] font-semibold text-gray-950">
                {ref.canvas.title}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-gray-500">
                <span className="rounded-full bg-white px-2 py-0.5 text-gray-700 ring-1 ring-gray-200">
                  {ref.defName}
                </span>
                <span>{t(`language.${ref.canvas.language}`)}</span>
                {ref.canvas.contentDateLabel || ref.canvas.contentDate ? (
                  <span>{ref.canvas.contentDateLabel || ref.canvas.contentDate}</span>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPreview(ref)}
              className="shrink-0 rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700"
            >
              {t('library.copilot.canvasRefs.preview')}
            </button>
          </div>
        ))}
      </div>
      {preview && (
        <CanvasReferencePopover
          refItem={preview}
          lang={lang}
          displayName={displayName}
          onClose={() => setPreview(null)}
          onNavigateToCanvas={onNavigateToCanvas}
        />
      )}
    </div>
  );
}

export function CopilotCaseReferenceBoard({
  refs,
  onNavigateToCanvas,
}: {
  refs: CopilotCaseReference[];
  onNavigateToCanvas?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const lang = (i18n.language === 'zh' ? 'zh' : 'en') as Lang;

  if (refs.length === 0) return null;

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-sm">
      <div className="border-b border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-violet-50 px-3 py-2">
        <div className="text-[12px] font-semibold text-indigo-950">
          {t('library.copilot.caseRefs.title')}
        </div>
        <div className="mt-0.5 text-[11px] leading-relaxed text-indigo-700">
          {t('library.copilot.caseRefs.subtitle')}
        </div>
      </div>
      <div className={REFERENCE_GRID_CLASS}>
        {refs.map((ref) => {
          const caseName = ref.detail.case.companyName[lang] ?? ref.detail.case.companyName.en;
          return (
            <div
              key={ref.detail.case.slug}
              className="flex items-center justify-between gap-2 rounded-xl border border-gray-100 bg-gray-50/70 p-2.5"
            >
              <div className="min-w-0">
                <div className="truncate text-[12px] font-semibold text-gray-950">{caseName}</div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-gray-500">
                  <span className="rounded-full bg-white px-2 py-0.5 font-mono text-gray-700 ring-1 ring-gray-200">
                    {ref.detail.case.slug}
                  </span>
                  <span>{t('library.copilot.caseRefs.canvasCount', { count: ref.detail.canvases.length })}</span>
                  <span>{t('library.copilot.caseRefs.storyCount', { count: ref.detail.stories.length })}</span>
                </div>
              </div>
              <Link
                to={`/p/${ref.detail.project.id}`}
                state={preserveNavigationState(location)}
                onClick={onNavigateToCanvas}
                className="shrink-0 rounded-full bg-indigo-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-indigo-700"
              >
                {t('library.copilot.caseRefs.detail')}
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CopilotResourceReferenceBoard({
  refs,
}: {
  refs: CopilotResourceReference[];
}) {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language === 'zh' ? 'zh' : 'en') as Lang;
  const [preview, setPreview] = useState<LibraryResource | null>(null);

  if (refs.length === 0) return null;

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-sm">
      <div className="border-b border-amber-100 bg-gradient-to-r from-amber-50 via-white to-orange-50 px-3 py-2">
        <div className="text-[12px] font-semibold text-amber-950">
          {t('library.copilot.readingRefs.title')}
        </div>
        <div className="mt-0.5 text-[11px] leading-relaxed text-amber-700">
          {t('library.copilot.readingRefs.subtitle')}
        </div>
      </div>
      <div className={REFERENCE_GRID_CLASS}>
        {refs.map(({ resource }) => {
          const title = localize(resource.title, lang);
          const summary = localize(resource.summary, lang);
          return (
            <div
              key={resource.slug}
              className="flex min-h-[118px] flex-col justify-between rounded-xl border border-amber-100 bg-amber-50/30 p-2.5 transition hover:border-amber-200 hover:bg-amber-50/60"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                    {t(`library.resourceTypes.${resource.type}`)}
                  </span>
                  <span className="truncate font-mono text-[10px] text-gray-400">{resource.slug}</span>
                </div>
                <div className="mt-1.5 line-clamp-1 text-[12px] font-semibold text-gray-950">{title}</div>
                <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-gray-600">{summary}</p>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="truncate text-[10px] text-gray-400">
                  {[resource.authors[0], resource.year].filter(Boolean).join(' · ')}
                </span>
                <button
                  type="button"
                  onClick={() => setPreview(resource)}
                  className="shrink-0 rounded-full bg-amber-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-amber-700"
                >
                  {t('library.copilot.readingRefs.preview')}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {preview && <ResourceReferencePopover resource={preview} lang={lang} onClose={() => setPreview(null)} />}
    </div>
  );
}

function ResourceReferencePopover({
  resource,
  lang,
  onClose,
}: {
  resource: LibraryResource;
  lang: Lang;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const location = useLocation();
  const [detail, setDetail] = useState<LibraryResourceDetail | null>(null);
  const [defs, setDefs] = useState<CanvasDefSummary[]>([]);
  const [patterns, setPatterns] = useState<BusinessModelPattern[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [frameworks, setFrameworks] = useState<StrategyFramework[]>([]);

  useEffect(() => {
    let cancelled = false;
    setDetail(null);
    void Promise.all([
      libraryApi.getResource(resource.slug).catch(() => null),
      api.listDefs().catch(() => [] as CanvasDefSummary[]),
      libraryApi.listPatterns().catch(() => [] as BusinessModelPattern[]),
      libraryApi.listExperiments().catch(() => [] as Experiment[]),
      libraryApi.listStrategyFrameworks().catch(() => [] as StrategyFramework[]),
    ]).then(([nextDetail, nextDefs, nextPatterns, nextExperiments, nextFrameworks]) => {
      if (cancelled) return;
      setDetail(nextDetail);
      setDefs(nextDefs);
      setPatterns(nextPatterns);
      setExperiments(nextExperiments);
      setFrameworks(nextFrameworks);
    });
    return () => {
      cancelled = true;
    };
  }, [resource.slug]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const title = localize(resource.title, lang);
  const summary = localize(resource.summary, lang);
  const recommendation = localize(resource.recommendation, lang);
  const description = detail?.description[lang] || detail?.description.en || '';
  const nextItems = buildResourceNextItems(resource, detail, defs, patterns, experiments, frameworks, lang, t);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 p-5 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[86vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <div className="border-b border-amber-100 bg-gradient-to-r from-amber-50 via-white to-orange-50 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                  {t(`library.resourceTypes.${resource.type}`)}
                </span>
                <span className="font-mono text-[10px] text-gray-400">{resource.slug}</span>
              </div>
              <h3 className="mt-2 truncate text-lg font-bold text-gray-950">{title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-gray-600">{summary}</p>
              <div className="mt-2 text-[11px] text-gray-400">
                {[resource.authors.join(', '), resource.publisher, resource.year].filter(Boolean).join(' · ')}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xl text-gray-400 hover:bg-white hover:text-gray-700"
              aria-label={t('library.copilot.readingRefs.close')}
            >
              ×
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <section className="rounded-2xl border border-amber-100 bg-amber-50/50 px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
              {t('library.copilot.readingRefs.recommendation')}
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-gray-700">{recommendation}</p>
          </section>

          {description && (
            <section className="mt-4">
              <h4 className="text-[13px] font-bold text-gray-950">{t('library.copilot.readingRefs.quickIntro')}</h4>
              <p className="mt-2 whitespace-pre-wrap text-[12px] leading-relaxed text-gray-700">
                {summarizeMarkdown(description)}
              </p>
            </section>
          )}

          {nextItems.length > 0 && (
            <section className="mt-4">
              <h4 className="text-[13px] font-bold text-gray-950">{t('library.copilot.readingRefs.nextOpen')}</h4>
              <div className="mt-2 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2">
                {nextItems.map((item) => (
                  item.to ? (
                    <Link
                      key={`${item.kind}:${item.id}`}
                      to={item.to}
                      state={preserveNavigationState(location)}
                      className="rounded-xl border border-gray-100 bg-white px-3 py-2 text-left transition hover:border-amber-200 hover:bg-amber-50/40"
                    >
                      <ReferenceItemBody item={item} />
                    </Link>
                  ) : (
                    <div key={`${item.kind}:${item.id}`} className="rounded-xl border border-gray-100 bg-white px-3 py-2">
                      <ReferenceItemBody item={item} />
                    </div>
                  )
                ))}
              </div>
            </section>
          )}

          {resource.sources.length > 0 && (
            <section className="mt-4">
              <h4 className="text-[13px] font-bold text-gray-950">{t('library.copilot.readingRefs.sources')}</h4>
              <ul className="mt-2 space-y-2">
                {resource.sources.map((source, index) => (
                  <li key={`${source.label}:${index}`} className="rounded-xl bg-gray-50 px-3 py-2 text-[12px] text-gray-700">
                    {source.url ? (
                      <a href={source.url} target="_blank" rel="noreferrer" className="text-amber-700 hover:underline">
                        {source.label}
                      </a>
                    ) : source.label}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

interface ResourceNextItem {
  id: string;
  label: string;
  kind: string;
  to?: string;
}

function ReferenceItemBody({ item }: { item: ResourceNextItem }) {
  return (
    <>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">{item.kind}</div>
      <div className="mt-1 line-clamp-2 text-[12px] font-semibold text-gray-900">{item.label}</div>
    </>
  );
}

export function CopilotReferenceResolutionHint({
  caseSlugs,
  canvasLabels,
}: {
  caseSlugs: string[];
  canvasLabels: string[];
}) {
  const { t } = useTranslation();
  if (caseSlugs.length === 0 && canvasLabels.length === 0) return null;

  return (
    <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-900">
      {caseSlugs.length > 0 && (
        <div>{t('library.copilot.referenceHint.caseNotFound', { items: caseSlugs.join(', ') })}</div>
      )}
      {canvasLabels.length > 0 && (
        <div>{t('library.copilot.referenceHint.canvasNotFound', { items: canvasLabels.join(', ') })}</div>
      )}
    </div>
  );
}

function CanvasReferencePopover({
  refItem,
  lang,
  displayName,
  onClose,
  onNavigateToCanvas,
}: {
  refItem: CopilotCanvasReference;
  lang: Lang;
  displayName: string;
  onClose: () => void;
  onNavigateToCanvas?: () => void;
}) {
  const { t } = useTranslation();
  const location = useLocation();
  const { canvas, defName } = refItem;
  const { doc, ready } = useReadOnlyYDoc(canvas.id);
  const [defaultColorLegend, setDefaultColorLegend] = useState<
    CanvasDefaultColorLegendEntry[] | undefined
  >(undefined);

  useEffect(() => {
    let cancelled = false;
    setDefaultColorLegend(undefined);
    api.getDef(canvas.defId).then((bundle) => {
      if (!cancelled) setDefaultColorLegend(bundle.def.defaultColorLegend);
    });
    return () => {
      cancelled = true;
    };
  }, [canvas.defId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 p-5 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 bg-gradient-to-r from-emerald-50 via-white to-teal-50 px-5 py-4">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
              {t('library.copilot.canvasRefs.popoverLabel')}
            </div>
            <h3 className="mt-1 truncate text-lg font-bold text-gray-950">{canvas.title}</h3>
            <div className="mt-1 text-xs text-gray-500">
              {defName} · {t(`language.${canvas.language}`)}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to={`/p/${canvas.projectId}/c/${canvas.id}`}
              state={preserveNavigationState(location)}
              onClick={() => {
                onClose();
                onNavigateToCanvas?.();
              }}
              className="rounded-full bg-gray-950 px-4 py-2 text-xs font-semibold text-white hover:bg-black"
            >
              {t('library.copilot.canvasRefs.detail')}
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-xl text-gray-400 hover:bg-white hover:text-gray-700"
              aria-label={t('library.copilot.canvasRefs.close')}
            >
              ×
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 bg-[#FAF8F3] p-4">
          <div className="relative flex h-full w-full flex-col overflow-hidden rounded-2xl bg-white shadow-inner">
            {ready && doc ? (
              <>
                {(hasPinClasses(doc) || hasColorLegend(doc, lang, defaultColorLegend)) && (
                  <div className="flex h-12 flex-shrink-0 items-center justify-between gap-3 border-b border-stone-200 bg-stone-50/60 px-3">
                    <div className="flex min-w-0 items-center">
                      {hasPinClasses(doc) && (
                        <LegendPalette doc={doc} displayName={displayName} lang={lang} readOnly />
                      )}
                    </div>
                    <div className="flex min-w-0 items-center">
                      {hasColorLegend(doc, lang, defaultColorLegend) && (
                        <StickyLegendPalette
                          doc={doc}
                          lang={lang}
                          readOnly
                          defaultColorLegend={defaultColorLegend}
                        />
                      )}
                    </div>
                  </div>
                )}
                <div className="relative flex-1 overflow-hidden">
                  <CanvasRenderer defId={canvas.defId} lang={lang} doc={doc} displayName={displayName}>
                    {({ def, toSvgPoint }) => (
                      <>
                        {effectiveObjectTypes(def).includes('sticky') && (
                          <StickyLayer
                            doc={doc}
                            zones={def.zones}
                            toSvgPoint={toSvgPoint}
                            displayName={displayName}
                            readonly
                          />
                        )}
                        {effectiveObjectTypes(def).includes('pin') && (
                          <PinLayer doc={doc} def={def} toSvgPoint={toSvgPoint} readonly />
                        )}
                      </>
                    )}
                  </CanvasRenderer>
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                {t('library.copilot.canvasRefs.loading')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface CanvasCandidate {
  defId: string;
  label: string;
}

function extractCandidateIds(content: string): string[] {
  const matches = content.match(UUID_RE) ?? [];
  return Array.from(new Set(matches.map((item) => item.toLowerCase())));
}

async function extractCaseSlugs(content: string, displayName: string): Promise<string[]> {
  const explicit = Array.from(
    content.matchAll(/(?:case\s*)?slug\s*[:：]\s*`?([a-z][a-z0-9]+(?:-[a-z0-9]+)+)`?/gi),
    (match) => match[1]!.toLowerCase(),
  );
  const kebabCandidates = extractKebabTokens(content);
  if (explicit.length === 0 && kebabCandidates.length === 0) return [];
  const entries = await libraryApi.list(displayName).catch(() => []);
  const caseSlugs = new Set(entries.map((entry) => entry.slug));
  return Array.from(new Set([...explicit, ...kebabCandidates.filter((slug) => caseSlugs.has(slug))]));
}

async function extractResourceRefs(content: string, lang: Lang): Promise<CopilotResourceReference[]> {
  const resources = await libraryApi.listResources().catch(() => []);
  if (resources.length === 0) return [];

  const lower = content.toLowerCase();
  const kebabCandidates = new Set(extractKebabTokens(content));
  const matched = resources.filter((resource) => {
    if (kebabCandidates.has(resource.slug)) return true;
    const title = resource.title[lang] ?? resource.title.en;
    const altTitle = lang === 'zh' ? resource.title.en : resource.title.zh;
    return [title, altTitle]
      .filter(Boolean)
      .some((item) => lower.includes(item.toLowerCase()));
  });

  return matched.slice(0, MAX_RESOURCE_REFERENCES).map((resource) => ({ resource }));
}

function extractCanvasCandidates(content: string, defs: CanvasDefSummary[]): CanvasCandidate[] {
  const lower = content.toLowerCase();
  const found = new Map<string, string>();
  for (const def of defs) {
    const names = [def.id, def.name.en, def.name.zh, ...(CANVAS_ALIASES[def.id] ?? [])].filter(Boolean);
    const match = names.find((name) => lower.includes(name.toLowerCase()));
    if (match) found.set(def.id, def.name.zh || def.name.en || match);
  }
  return Array.from(found, ([defId, label]) => ({ defId, label }));
}

function extractKebabTokens(content: string): string[] {
  const matches = Array.from(content.matchAll(KEBAB_RE), (match) => match[0]!.replace(/`/g, '').toLowerCase());
  return Array.from(new Set(matches));
}

async function resolveContextCanvasRefs(
  attachedRef: AttachedRef | null | undefined,
  displayName: string,
  candidates: CanvasCandidate[],
  defNameById: Map<string, string>,
  lang: Lang,
): Promise<CopilotCanvasReference[]> {
  if (candidates.length === 0) return [];
  const projectId = attachedProjectId(attachedRef);
  if (attachedRef?.type === 'case') {
    const detail = await libraryApi.get(attachedRef.slug, displayName).catch(() => null);
    return detail ? matchCanvases(detail.canvases, candidates, defNameById, lang) : [];
  }
  if (projectId) {
    const canvases = await projectsApi.listCanvases(projectId, displayName).catch(() => []);
    return matchCanvases(canvases, candidates, defNameById, lang);
  }
  const canvases = await api.listCanvases(displayName).catch(() => []);
  return matchCanvases(canvases, candidates, defNameById, lang);
}

function matchCanvases(
  canvases: CanvasMeta[],
  candidates: CanvasCandidate[],
  defNameById: Map<string, string>,
  lang: Lang,
): CopilotCanvasReference[] {
  if (candidates.length === 0) return [];
  const candidateIds = new Set(candidates.map((item) => item.defId));
  return canvases
    .filter((canvas) => candidateIds.has(canvas.defId) && canvas.language === lang)
    .map((canvas) => toCanvasReference(canvas, defNameById, lang));
}

function toCanvasReference(
  canvas: CanvasMeta,
  defNameById: Map<string, string>,
  _lang: Lang,
): CopilotCanvasReference {
  return {
    canvas,
    defName: defNameById.get(canvas.defId) ?? canvas.defId,
  };
}

function dedupeCanvasRefs(refs: CopilotCanvasReference[]): CopilotCanvasReference[] {
  const seen = new Set<string>();
  return refs.filter((ref) => {
    if (seen.has(ref.canvas.id)) return false;
    seen.add(ref.canvas.id);
    return true;
  });
}

function buildResourceNextItems(
  resource: LibraryResource,
  detail: LibraryResourceDetail | null,
  defs: CanvasDefSummary[],
  patterns: BusinessModelPattern[],
  experiments: Experiment[],
  frameworks: StrategyFramework[],
  lang: Lang,
  t: (key: string, opts?: Record<string, unknown>) => string,
): ResourceNextItem[] {
  const items: ResourceNextItem[] = [];
  for (const entry of detail?.relatedCases ?? []) {
    items.push({
      id: entry.slug,
      label: localize(entry.companyName, lang),
      kind: t('library.copilot.readingRefs.itemCase', { lang: t(`language.${lang}`) }),
      to: `/p/${entry.projectId}`,
    });
  }
  for (const defId of resource.relatedCanvasDefIds ?? []) {
    const def = defs.find((item) => item.id === defId);
    items.push({
      id: defId,
      label: def ? (def.name[lang] ?? def.name.en ?? defId) : defId,
      kind: t('library.copilot.readingRefs.itemCanvas', { lang: t(`language.${lang}`) }),
    });
  }
  for (const slug of resource.relatedStrategyFrameworkSlugs ?? []) {
    const framework = frameworks.find((item) => item.slug === slug);
    items.push({
      id: slug,
      label: framework ? localize(framework.name, lang) : slug,
      kind: t('library.copilot.readingRefs.itemFramework'),
    });
  }
  for (const slug of resource.relatedPatternSlugs ?? []) {
    const pattern = patterns.find((item) => item.slug === slug);
    items.push({
      id: slug,
      label: pattern ? localize(pattern.name, lang) : slug,
      kind: t('library.copilot.readingRefs.itemPattern'),
    });
  }
  for (const slug of resource.relatedExperimentSlugs ?? []) {
    const experiment = experiments.find((item) => item.slug === slug);
    items.push({
      id: slug,
      label: experiment ? localize(experiment.name, lang) : slug,
      kind: t('library.copilot.readingRefs.itemExperiment'),
    });
  }
  return items;
}

function summarizeMarkdown(markdown: string): string {
  return markdown
    .replace(/^# .+$/gm, '')
    .replace(/^## .+$/gm, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 4)
    .join('\n');
}

function localize(label: { en: string; zh: string }, lang: Lang): string {
  return label[lang] ?? label.en;
}

function attachedProjectId(ref: AttachedRef | null | undefined): string | undefined {
  if (!ref) return undefined;
  if (ref.type === 'project' || ref.type === 'canvas' || ref.type === 'story') return ref.projectId;
  return undefined;
}

function attachedRefKey(ref: AttachedRef): string {
  switch (ref.type) {
    case 'case':
      return `case:${ref.slug}`;
    case 'pattern':
      return `pattern:${ref.slug}`;
    case 'project':
      return `project:${ref.projectId}:${ref.activeCanvasId ?? ''}:${ref.activeStoryId ?? ''}`;
    case 'canvas':
      return `canvas:${ref.canvasId}`;
    case 'story':
      return `story:${ref.storyId}`;
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
