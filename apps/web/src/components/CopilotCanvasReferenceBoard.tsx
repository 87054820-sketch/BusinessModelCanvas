import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type {
  CanvasDefaultColorLegendEntry,
  CanvasMeta,
  CaseLibraryDetail,
  CopilotResolvedReference,
  CopilotReferenceCatalog,
  CopilotTypedReference,
  Lang,
  LibraryResource,
} from '@pingarden/shared';
import { effectiveObjectTypes, resolveCopilotReferences } from '@pingarden/shared';
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
import { ResourceDetailModal } from './ResourceDetailModal';
import { CanvasThumb } from '../canvas/CanvasThumb';
import { TemplatePreviewModal } from './TemplatePreviewModal';

const UUID_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const MAX_CANVAS_REFERENCES = 4;
const MAX_TEMPLATE_REFERENCES = 8;
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

export interface CopilotCanvasTemplateReference {
  def: CanvasDefSummary;
  label: string;
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
  templateRefs: CopilotCanvasTemplateReference[];
  caseRefs: CopilotCaseReference[];
  resourceRefs: CopilotResourceReference[];
  unresolvedCaseSlugs: string[];
  unresolvedCanvasLabels: string[];
}

const EMPTY_RECOMMENDATION_REFS: CopilotRecommendationReferences = {
  canvasRefs: [],
  templateRefs: [],
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
  structuredReferences: CopilotTypedReference[] = [],
): CopilotRecommendationReferences {
  const ids = useMemo(() => extractCandidateIds(content), [content]);
  const idsKey = ids.join('|');
  const structuredRefsKey = useMemo(() => JSON.stringify(structuredReferences), [structuredReferences]);
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
      const [caseEntries, resources, patterns, strategyFrameworks, experiments] = await Promise.all([
        libraryApi.list(displayName).catch(() => []),
        libraryApi.listResources().catch(() => []),
        libraryApi.listPatterns().catch(() => []),
        libraryApi.listStrategyFrameworks().catch(() => []),
        libraryApi.listExperiments().catch(() => []),
      ]);
      const referenceResolution = resolveCopilotReferences({
        text: content,
        references: structuredReferences,
        lang,
        catalog: buildReferenceCatalog(defs, caseEntries, resources, patterns, strategyFrameworks, experiments),
      });
      const resolvedReferences = referenceResolution.resolved;
      const canvasCandidates = extractCanvasCandidates(content, defs, resolvedReferences);
      const caseSlugCandidates = extractCaseSlugsFromResolution(resolvedReferences);
      const resourceRefs = extractResourceRefsFromResolution(resolvedReferences, resources);

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
      const resolvedCanvasDefIds = new Set(canvasRefs.map((ref) => ref.canvas.defId));
      const templateRefs = canvasCandidates
        .filter((candidate) => !resolvedCanvasDefIds.has(candidate.defId))
        .map((candidate) => {
          const def = defs.find((item) => item.id === candidate.defId);
          return def ? { def, label: candidate.label } : null;
        })
        .filter((item): item is CopilotCanvasTemplateReference => item !== null)
        .slice(0, MAX_TEMPLATE_REFERENCES);

      const caseRefs: CopilotCaseReference[] = resolvedCases.map(({ detail }) => ({
        detail,
        matchedCanvases: matchCanvases(detail.canvases, canvasCandidates, defNameById, lang),
      }));
      const unresolvedCanvasLabels = unresolvedCanvasLabelsFromResolution(referenceResolution.missing);

      if (!cancelled) {
        setRefs({ canvasRefs, templateRefs, caseRefs, resourceRefs, unresolvedCaseSlugs, unresolvedCanvasLabels });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [attachedRef, content, contextKey, displayName, idsKey, lang, structuredRefsKey]);

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

export function CopilotCanvasTemplateReferenceBoard({
  refs,
  lang,
}: {
  refs: CopilotCanvasTemplateReference[];
  lang: Lang;
}) {
  const { t } = useTranslation();
  const [previewDefId, setPreviewDefId] = useState<string | null>(null);

  if (refs.length === 0) return null;

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-cyan-100 bg-white shadow-sm">
      <div className="border-b border-cyan-100 bg-gradient-to-r from-cyan-50 via-white to-sky-50 px-3 py-2">
        <div className="text-[12px] font-semibold text-cyan-950">
          {t('library.copilot.templateRefs.title')}
        </div>
        <div className="mt-0.5 text-[11px] leading-relaxed text-cyan-700">
          {t('library.copilot.templateRefs.subtitle')}
        </div>
      </div>
      <div className={REFERENCE_GRID_CLASS}>
        {refs.map(({ def, label }) => {
          const name = def.name[lang] ?? def.name.en ?? label;
          const tagline = t(`templates.${def.id}.tagline`, '');
          return (
            <div
              key={def.id}
              className="flex min-h-[118px] items-center gap-2 rounded-xl border border-cyan-100 bg-cyan-50/30 p-2.5 transition hover:border-cyan-200 hover:bg-cyan-50/60"
            >
              <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-lg bg-white ring-1 ring-cyan-100">
                <CanvasThumb id={def.id} width={82} height={50} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-semibold text-cyan-800">
                    {t('library.canvasMethod.kind')}
                  </span>
                  <span className="truncate font-mono text-[10px] text-gray-400">{def.id}</span>
                </div>
                <div className="mt-1.5 line-clamp-1 text-[12px] font-semibold text-gray-950">{name}</div>
                <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-gray-600">
                  {tagline || t('library.canvasMethod.defaultTagline')}
                </p>
                <button
                  type="button"
                  onClick={() => setPreviewDefId(def.id)}
                  className="mt-2 rounded-full bg-cyan-700 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-cyan-800"
                >
                  {t('library.copilot.templateRefs.preview')}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <TemplatePreviewModal defId={previewDefId} lang={lang} onClose={() => setPreviewDefId(null)} />
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
  displayName,
  onNavigateToCanvas,
}: {
  refs: CopilotResourceReference[];
  displayName: string;
  onNavigateToCanvas?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const lang = (i18n.language === 'zh' ? 'zh' : 'en') as Lang;
  const [preview, setPreview] = useState<LibraryResource | null>(null);

  async function handleResourceCaseClick(slug: string) {
    if (!displayName) return;
    const detail = await libraryApi.get(slug, displayName).catch(() => null);
    if (!detail) return;
    setPreview(null);
    navigate(`/p/${detail.project.id}`, { state: preserveNavigationState(location) });
    onNavigateToCanvas?.();
  }

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
      {preview && (
        <ResourceDetailModal
          resource={preview}
          lang={lang}
          onClose={() => setPreview(null)}
          onCaseClick={handleResourceCaseClick}
          overlayClassName="z-[130]"
        />
      )}
    </div>
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

function buildReferenceCatalog(
  defs: CanvasDefSummary[],
  cases: Array<{ slug: string; companyName: { en: string; zh: string }; summary?: { en: string; zh: string } }>,
  resources: LibraryResource[],
  patterns: Array<{ slug: string; name: { en: string; zh: string }; summary?: { en: string; zh: string } }>,
  strategyFrameworks: Array<{ slug: string; name: { en: string; zh: string }; summary?: { en: string; zh: string }; relatedCanvasDefIds?: string[] }>,
  experiments: Array<{ slug: string; name: { en: string; zh: string }; summary?: { en: string; zh: string }; appliesToCanvases?: string[] }>,
): CopilotReferenceCatalog {
  return {
    entries: [
      ...defs.map((def) => ({
        kind: 'canvasTemplate' as const,
        id: def.id,
        defId: def.id,
        label: def.name.zh || def.name.en || def.id,
        aliases: [def.name.en, def.name.zh, ...(CANVAS_ALIASES[def.id] ?? [])].filter(Boolean),
      })),
      ...cases.map((entry) => ({
        kind: 'case' as const,
        id: entry.slug,
        slug: entry.slug,
        label: entry.companyName.zh || entry.companyName.en || entry.slug,
        aliases: [entry.companyName.en, entry.companyName.zh, entry.slug].filter(Boolean),
        summary: entry.summary?.zh || entry.summary?.en,
      })),
      ...resources.map((resource) => ({
        kind: 'resource' as const,
        id: resource.slug,
        slug: resource.slug,
        resourceSlug: resource.slug,
        label: resource.title.zh || resource.title.en || resource.slug,
        aliases: [resource.title.en, resource.title.zh, resource.slug].filter(Boolean),
        summary: resource.summary.zh || resource.summary.en,
      })),
      ...patterns.map((pattern) => ({
        kind: 'pattern' as const,
        id: pattern.slug,
        slug: pattern.slug,
        label: pattern.name.zh || pattern.name.en || pattern.slug,
        aliases: [pattern.name.en, pattern.name.zh, pattern.slug].filter(Boolean),
        summary: pattern.summary?.zh || pattern.summary?.en,
      })),
      ...strategyFrameworks.map((framework) => ({
        kind: 'strategyFramework' as const,
        id: framework.slug,
        slug: framework.slug,
        label: framework.name.zh || framework.name.en || framework.slug,
        aliases: [framework.name.en, framework.name.zh, framework.slug, ...(framework.relatedCanvasDefIds ?? [])].filter(Boolean),
        summary: framework.summary?.zh || framework.summary?.en,
      })),
      ...experiments.map((experiment) => ({
        kind: 'experiment' as const,
        id: experiment.slug,
        slug: experiment.slug,
        label: experiment.name.zh || experiment.name.en || experiment.slug,
        aliases: [experiment.name.en, experiment.name.zh, experiment.slug, ...(experiment.appliesToCanvases ?? [])].filter(Boolean),
        summary: experiment.summary?.zh || experiment.summary?.en,
      })),
    ],
  };
}

function extractCaseSlugsFromResolution(resolved: CopilotResolvedReference[]): string[] {
  return Array.from(new Set(
    resolved
      .map((item) => item.reference.kind === 'case' ? item.reference.slug ?? item.target?.slug : null)
      .filter((slug): slug is string => Boolean(slug)),
  ));
}

function extractResourceRefsFromResolution(
  resolved: CopilotResolvedReference[],
  resources: LibraryResource[],
): CopilotResourceReference[] {
  const slugs = new Set(
    resolved
      .map((item) =>
        item.reference.kind === 'resource' || item.reference.kind === 'resourceChapter'
          ? item.reference.resourceSlug ?? item.reference.slug ?? item.target?.resourceSlug ?? item.target?.slug
          : null,
      )
      .filter((slug): slug is string => Boolean(slug)),
  );
  return resources
    .filter((resource) => slugs.has(resource.slug))
    .slice(0, MAX_RESOURCE_REFERENCES)
    .map((resource) => ({ resource }));
}

function unresolvedCanvasLabelsFromResolution(missing: CopilotResolvedReference[]): string[] {
  return missing
    .filter((item) => item.reference.kind === 'canvasInstance' && item.reference.intent === 'open')
    .map((item) => item.reference.label);
}

function extractCanvasCandidates(
  content: string,
  defs: CanvasDefSummary[],
  resolvedReferences: CopilotResolvedReference[] = [],
): CanvasCandidate[] {
  const lower = content.toLowerCase();
  const found = new Map<string, string>();
  for (const item of resolvedReferences) {
    const ref = item.reference;
    if (ref.kind !== 'canvasTemplate' && ref.kind !== 'canvasInstance') continue;
    const defId = ref.defId ?? item.target?.defId;
    if (defId) found.set(defId, ref.label);
  }
  for (const def of defs) {
    const names = [def.id, def.name.en, def.name.zh, ...(CANVAS_ALIASES[def.id] ?? [])].filter(Boolean);
    const match = names.find((name) => lower.includes(name.toLowerCase()));
    if (match) found.set(def.id, def.name.zh || def.name.en || match);
  }
  return Array.from(found, ([defId, label]) => ({ defId, label }));
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
    case 'resource':
      return `resource:${ref.slug}`;
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
