import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { CanvasDef, CanvasI18n, Lang, XAxisItem } from '@pingarden/shared';
import { api, type CanvasDefDetail } from '../api/client';
import {
  getCanvasKnowledgeBlockRows,
  type CanvasKnowledgeBlockRow,
} from './CanvasKnowledgeBlocks';
import { LearningGuide } from './LearningGuide';
import { Markdown } from './Markdown';
import { preserveNavigationState } from '../navigation/useSmartBack';
import {
  chartRect,
  xForFactor,
  yAxisTicks,
  yForScore,
} from '../plugins/chartCanvas/geometry';

interface Props {
  defId: string | null;
  lang: Lang;
  onClose: () => void;
  onStart?: (defId: string) => void;
}

type CanvasPreviewSection =
  | { id: 'guide'; kind: 'guide'; label: string; eyebrow: string }
  | { id: 'intro'; kind: 'intro'; label: string; eyebrow: string; content: string }
  | { id: 'body'; kind: 'body'; label: string; eyebrow: string; content: string }
  | {
      id: `module:${string}`;
      kind: 'module';
      label: string;
      eyebrow: string;
      module: CanvasKnowledgeBlockRow;
      moduleIndex: number;
    };

const MOBILE_PREVIEW_SECTION_ID = 'preview';

export function TemplatePreviewModal({ defId, lang, onClose, onStart }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [detail, setDetail] = useState<CanvasDefDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  useEffect(() => {
    if (!defId) {
      setDetail(null);
      return;
    }
    setActiveSectionId(null);
    setLoading(true);
    api
      .getDef(defId)
      .then((d) => setDetail(d))
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [defId]);

  useEffect(() => {
    setActiveSectionId(null);
  }, [lang]);

  // Lock body scroll while open
  useEffect(() => {
    if (!defId) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [defId]);

  // Esc to close
  useEffect(() => {
    if (!defId) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    }
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [defId, onClose]);

  const knowledge = detail?.knowledge[lang];
  const moduleRows = useMemo(
    () => (detail && knowledge ? getCanvasKnowledgeBlockRows(detail.def, detail.i18n[lang], knowledge) : []),
    [detail, knowledge, lang],
  );
  const sections = useMemo<CanvasPreviewSection[]>(() => {
    if (!detail) return [];
    const rows: CanvasPreviewSection[] = [];
    if (detail.def.learning) {
      rows.push({
        id: 'guide',
        kind: 'guide',
        label: t('library.learning.guide'),
        eyebrow: t('library.canvasMethod.kind'),
      });
    }
    if (knowledge?.intro?.trim()) {
      rows.push({
        id: 'intro',
        kind: 'intro',
        label: t('inspector.canvasKnowledge.usageIntro'),
        eyebrow: t('inspector.canvasKnowledge.documentation'),
        content: knowledge.intro,
      });
    }
    if (knowledge?.body?.trim()) {
      rows.push({
        id: 'body',
        kind: 'body',
        label: t('inspector.canvasKnowledge.knowledgeBody'),
        eyebrow: t('inspector.canvasKnowledge.documentation'),
        content: knowledge.body,
      });
    }
    moduleRows.forEach((row, index) => {
      rows.push({
        id: `module:${row.id}`,
        kind: 'module',
        label: row.title,
        eyebrow: t('inspector.canvasKnowledge.canvasModules'),
        module: row,
        moduleIndex: index,
      });
    });
    return rows;
  }, [detail, knowledge, moduleRows, t]);
  const activeSection = sections.find((section) => section.id === activeSectionId) ?? sections[0] ?? null;
  const selectedSectionId =
    activeSectionId === MOBILE_PREVIEW_SECTION_ID
      ? MOBILE_PREVIEW_SECTION_ID
      : activeSection?.id ?? activeSectionId;

  useEffect(() => {
    if (sections.length === 0) return;
    if (activeSectionId === MOBILE_PREVIEW_SECTION_ID && detail) return;
    if (!activeSectionId || !sections.some((section) => section.id === activeSectionId)) {
      setActiveSectionId(sections[0]!.id);
    }
  }, [activeSectionId, detail, sections]);

  if (!defId) return null;

  const name = detail?.def.name[lang] ?? detail?.def.id ?? defId;
  const tagline = t(`templates.${defId}.tagline`, '');
  const bgUrl = api.bgUrl(defId, lang);
  const mobileSections = detail
    ? [
        ...sections.map((section) => ({
          id: section.id,
          label: mobileSectionLabel(section),
        })),
        {
          id: MOBILE_PREVIEW_SECTION_ID,
          label: t('inspector.canvasKnowledge.preview'),
        },
      ]
    : sections.map((section) => ({
        id: section.id,
        label: mobileSectionLabel(section),
      }));
  const showEmptyState = !loading && sections.length === 0;

  const startWithTemplate = () => {
    onClose();
    if (onStart) {
      onStart(defId);
    } else {
      navigate(`/p/new?withCanvas=${encodeURIComponent(defId)}`, {
        state: preserveNavigationState(location),
      });
    }
  };

  const previewPane = (
    <CanvasPreviewPane
      detail={detail}
      bgUrl={bgUrl}
      lang={lang}
      name={name}
    />
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex h-[90vh] w-full max-w-[1500px] overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full text-xl text-gray-400 hover:bg-white/80 hover:text-gray-700"
        >
          ×
        </button>

        {/* Desktop — directory / text / canvas preview */}
        <div className="hidden h-full min-h-0 w-full grid-cols-[224px_minmax(0,520px)_minmax(420px,1fr)] md:grid">
          <CanvasPreviewDirectory
            name={name}
            tagline={tagline}
            sections={sections}
            activeSectionId={activeSection?.id ?? activeSectionId}
            onSelect={setActiveSectionId}
          />

          <div className="flex min-h-0 min-w-0 flex-col border-r border-gray-100 bg-white">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">
              {loading ? (
                <p className="text-sm text-gray-400">{t('home.loading')}…</p>
              ) : showEmptyState ? (
                <p className="text-sm text-gray-400">{t('inspector.canvasKnowledge.empty')}</p>
              ) : (
                <CanvasPreviewSectionContent
                  section={activeSection}
                  detail={detail}
                  lang={lang}
                  canvasDefId={defId}
                />
              )}
            </div>
            <CanvasPreviewFooter name={name} onStart={startWithTemplate} />
          </div>

          <div className="min-h-0 min-w-0 bg-stone-100">
            {previewPane}
          </div>
        </div>

        {/* Mobile — segmented sections with preview as a peer tab. */}
        <div className="flex h-full w-full flex-col md:hidden">
          <div className="border-b border-gray-100 px-5 py-4 pr-12">
            <h2 className="text-lg font-semibold text-gray-900">{name}</h2>
            {tagline && <p className="mt-0.5 text-sm text-gray-500">{tagline}</p>}
          </div>
          <div className="shrink-0 overflow-x-auto border-b border-gray-100 bg-white px-4 py-3">
            <div className="flex w-max gap-2">
              {mobileSections.map((section) => (
                <MobileSectionButton
                  key={section.id}
                  active={selectedSectionId === section.id}
                  label={section.label}
                  onClick={() => setActiveSectionId(section.id)}
                />
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            {loading ? (
              <p className="text-sm text-gray-400">{t('home.loading')}…</p>
            ) : activeSectionId === MOBILE_PREVIEW_SECTION_ID ? (
              <div className="rounded-xl bg-stone-100 p-3">{previewPane}</div>
            ) : showEmptyState ? (
              <p className="text-sm text-gray-400">{t('inspector.canvasKnowledge.empty')}</p>
            ) : (
              <CanvasPreviewSectionContent
                section={activeSection}
                detail={detail}
                lang={lang}
                canvasDefId={defId}
              />
            )}
          </div>
          <CanvasPreviewFooter name={name} onStart={startWithTemplate} />
        </div>
      </div>
    </div>
  );
}

function CanvasPreviewDirectory({
  name,
  tagline,
  sections,
  activeSectionId,
  onSelect,
}: {
  name: string;
  tagline: string;
  sections: CanvasPreviewSection[];
  activeSectionId: string | null | undefined;
  onSelect: (id: string) => void;
}) {
  const { t } = useTranslation();
  const documentSections = sections.filter((section) => section.kind !== 'module');
  const moduleSections = sections.filter((section) => section.kind === 'module');

  return (
    <aside className="flex min-h-0 min-w-0 flex-col border-r border-gray-100 bg-stone-50">
      <div className="shrink-0 border-b border-gray-100 px-4 py-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          {t('inspector.canvasKnowledge.directory')}
        </div>
        <h2 className="mt-2 text-[16px] font-semibold leading-snug text-gray-900">{name}</h2>
        {tagline && <p className="mt-1 text-[13px] leading-relaxed text-gray-500">{tagline}</p>}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
        {documentSections.length > 0 && (
          <DirectoryGroup label={t('inspector.canvasKnowledge.readingGuide')}>
            {documentSections.map((section) => (
              <DirectoryButton
                key={section.id}
                section={section}
                active={activeSectionId === section.id}
                onClick={() => onSelect(section.id)}
              />
            ))}
          </DirectoryGroup>
        )}
        {moduleSections.length > 0 && (
          <DirectoryGroup label={t('inspector.canvasKnowledge.canvasModules')} className={documentSections.length > 0 ? 'mt-4' : ''}>
            {moduleSections.map((section) => (
              <DirectoryButton
                key={section.id}
                section={section}
                active={activeSectionId === section.id}
                onClick={() => onSelect(section.id)}
              />
            ))}
          </DirectoryGroup>
        )}
      </div>
    </aside>
  );
}

function DirectoryGroup({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function DirectoryButton({
  section,
  active,
  onClick,
}: {
  section: CanvasPreviewSection;
  active: boolean;
  onClick: () => void;
}) {
  const moduleIndex = section.kind === 'module' ? String(section.moduleIndex + 1).padStart(2, '0') : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition ${
        active
          ? 'bg-white text-gray-950 shadow-sm'
          : 'text-gray-600 hover:bg-white/70 hover:text-gray-950'
      }`}
    >
      <span className={`h-5 w-0.5 shrink-0 rounded-full ${active ? 'bg-emerald-500' : 'bg-transparent'}`} />
      {moduleIndex && (
        <span className={`w-5 shrink-0 text-[11px] font-semibold tabular-nums ${active ? 'text-emerald-700' : 'text-gray-400'}`}>
          {moduleIndex}
        </span>
      )}
      <span className="line-clamp-2 block min-w-0 flex-1 text-[13px] font-semibold leading-snug">
        {section.label}
      </span>
    </button>
  );
}

function mobileSectionLabel(section: CanvasPreviewSection) {
  if (section.kind !== 'module') return section.label;
  return `${String(section.moduleIndex + 1).padStart(2, '0')} ${section.label}`;
}

function CanvasPreviewSectionContent({
  section,
  detail,
  lang,
  canvasDefId,
}: {
  section: CanvasPreviewSection | null;
  detail: CanvasDefDetail | null;
  lang: Lang;
  canvasDefId: string;
}) {
  const { t } = useTranslation();
  if (!section || !detail) return null;

  if (section.kind === 'guide') {
    return <LearningGuide learning={detail.def.learning} lang={lang} />;
  }

  if (section.kind === 'module') {
    const moduleContent = splitLeadingMarkdownHeading(section.module.content);
    const fallbackGuidance = !moduleContent.content && section.module.guidance;
    return (
      <article>
        <SectionHeader
          eyebrow={section.eyebrow}
          title={section.label}
          index={section.moduleIndex + 1}
          subtitle={section.module.prompt}
        />
        {moduleContent.content ? (
          <Markdown
            content={moduleContent.content}
            canvasDefId={canvasDefId}
            variant="modal-reader"
            className="mt-4 text-[13px] leading-6 text-gray-700"
          />
        ) : fallbackGuidance ? (
          <p className="mt-4 text-[13px] leading-6 text-gray-700">
            {fallbackGuidance}
          </p>
        ) : null}
        {section.module.examples.length > 0 && (
          <CompactExampleList
            label={t('inspector.block.examples')}
            examples={section.module.examples}
          />
        )}
      </article>
    );
  }

  const documentContent = splitLeadingMarkdownHeading(section.content);
  const documentTitle = documentContent.heading || section.label;

  return (
    <article>
      <SectionHeader eyebrow={section.label} title={documentTitle} />
      {documentContent.content && (
        <Markdown
          content={documentContent.content}
          canvasDefId={canvasDefId}
          variant="modal-reader"
          className="mt-4 text-[13px] leading-6 text-gray-700"
        />
      )}
    </article>
  );
}

function splitLeadingMarkdownHeading(content: string): { heading: string | null; content: string } {
  const normalized = content.replace(/\r\n/g, '\n').trimStart();
  if (!normalized) return { heading: null, content: '' };

  const lines = normalized.split('\n');
  const firstLine = lines[0]?.trim() ?? '';
  const match = /^#\s+(.+?)\s*#*$/.exec(firstLine);
  if (!match) return { heading: null, content: normalized };

  return {
    heading: match[1]?.trim() || null,
    content: lines.slice(1).join('\n').trimStart(),
  };
}

function SectionHeader({
  eyebrow,
  title,
  index,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  index?: number;
  subtitle?: string;
}) {
  const indexLabel = typeof index === 'number' ? String(index).padStart(2, '0') : null;
  return (
    <header className="border-b border-gray-100 pb-4">
      <div className="flex items-center gap-2 text-[11px] font-semibold text-emerald-700">
        {indexLabel && (
          <span className="tabular-nums text-emerald-700">
            {indexLabel}
          </span>
        )}
        {eyebrow}
      </div>
      <h3 className="mt-2 text-[18px] font-semibold leading-snug text-gray-950">{title}</h3>
      {subtitle && (
        <p className="mt-1.5 text-[13px] leading-5 text-gray-500">
          {subtitle}
        </p>
      )}
    </header>
  );
}

function CompactExampleList({ label, examples }: { label: string; examples: string[] }) {
  return (
    <div className="mt-4 border-t border-gray-100 pt-3">
      <div className="mb-2 text-[11px] font-semibold text-gray-400">
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {examples.slice(0, 4).map((example) => (
          <span
            key={example}
            className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600"
          >
            {example}
          </span>
        ))}
      </div>
    </div>
  );
}

function MobileSectionButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? 'bg-gray-900 text-white'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
      }`}
    >
      {label}
    </button>
  );
}

function CanvasPreviewFooter({
  name,
  onStart,
}: {
  name: string;
  onStart: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="shrink-0 border-t border-gray-100 bg-white px-5 py-4">
      <button
        type="button"
        onClick={onStart}
        className="w-full rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white hover:bg-black"
      >
        {t('home.startWithTemplate', { name })}
      </button>
    </div>
  );
}

function CanvasPreviewPane({
  detail,
  bgUrl,
  lang,
  name,
}: {
  detail: CanvasDefDetail | null;
  bgUrl: string;
  lang: Lang;
  name: string;
}) {
  return (
    <div className="flex h-full min-h-[260px] items-center justify-center overflow-hidden px-8 py-12 md:px-10 md:py-14">
      {detail ? (
        <TemplateCanvasPreview
          def={detail.def}
          i18n={detail.i18n[lang]}
          bgUrl={bgUrl}
          lang={lang}
          name={name}
        />
      ) : (
        <img
          src={bgUrl}
          alt={name}
          className="h-full w-full object-contain object-center p-4"
        />
      )}
    </div>
  );
}

interface TemplateCanvasPreviewProps {
  def: CanvasDef;
  i18n: CanvasI18n;
  bgUrl: string;
  lang: Lang;
  name: string;
  compact?: boolean;
}

function TemplateCanvasPreview({
  def,
  i18n,
  bgUrl,
  lang,
  name,
  compact = false,
}: TemplateCanvasPreviewProps) {
  const viewBox = def.viewBox.join(' ');
  if (def.display?.preview?.mode === 'structured') {
    return <StructuredTemplatePreview def={def} i18n={i18n} bgUrl={bgUrl} lang={lang} name={name} compact={compact} />;
  }
  if (def.plugin !== 'chart-canvas' || !def.chart) {
    return <img src={bgUrl} alt={name} className={compact ? 'w-full rounded-lg' : 'h-full w-full object-contain object-center p-4'} />;
  }

  return (
    <svg
      viewBox={viewBox}
      className={compact ? 'w-full rounded-lg bg-[#FAFAF7]' : 'h-full w-full p-4'}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={name}
    >
      <image
        href={bgUrl}
        x={def.viewBox[0]}
        y={def.viewBox[1]}
        width={def.viewBox[2]}
        height={def.viewBox[3]}
        preserveAspectRatio="xMidYMid meet"
      />
      <ChartTemplatePreviewOverlay def={def} lang={lang} />
    </svg>
  );
}

function StructuredTemplatePreview({
  def,
  i18n,
  bgUrl,
  lang,
  name,
  compact,
}: TemplateCanvasPreviewProps) {
  const preview = def.display?.preview;
  const subtitle = preview?.subtitle?.[lang] ?? preview?.subtitle?.[lang === 'zh' ? 'en' : 'zh'] ?? '';
  const showTitle = preview?.showTitle !== false;
  const showSubtitle = preview?.showSubtitle !== false && subtitle;
  const showBlockPrompts = preview?.showBlockPrompts === true;

  return (
    <div className={compact ? 'w-full rounded-lg bg-[#FAFAF7] p-3' : 'flex h-full w-full flex-col justify-center p-4'}>
      {(showTitle || showSubtitle) && (
        <div className={compact ? 'mb-2' : 'mb-4'}>
          {showTitle && (
            <div className={compact ? 'text-sm font-bold text-gray-900' : 'text-2xl font-bold text-gray-900'}>
              {i18n.canvasTitle || name}
            </div>
          )}
          {showSubtitle && (
            <div className={compact ? 'mt-0.5 text-[10px] text-gray-500' : 'mt-1 text-sm text-gray-500'}>
              {subtitle}
            </div>
          )}
        </div>
      )}
      <svg
        viewBox={def.viewBox.join(' ')}
        className="w-full rounded-md bg-[#FAFAF7]"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={name}
      >
        <image
          href={bgUrl}
          x={def.viewBox[0]}
          y={def.viewBox[1]}
          width={def.viewBox[2]}
          height={def.viewBox[3]}
          preserveAspectRatio="xMidYMid meet"
        />
        {def.zones.map((zone) => {
          const block = i18n.blocks[zone.id];
          if (!block) return null;
          const pos = previewLabelPosition(zone);
          if (!pos) return null;
          const showBlockLabels = preview?.showBlockLabels !== false;
          const promptLines = showBlockPrompts && block.prompt ? wrapSvgText(block.prompt, pos.maxChars) : [];
          if (!showBlockLabels && promptLines.length === 0) return null;
          return (
            <text
              key={zone.id}
              x={pos.x}
              y={pos.y}
              fontFamily="Inter, 'PingFang SC', system-ui, sans-serif"
              textAnchor={pos.anchor}
              pointerEvents="none"
            >
              {showBlockLabels && (
                <tspan x={pos.x} fontSize={pos.fontSize} fontWeight={800} fill="#111827">
                  {block.title}
                </tspan>
              )}
              {promptLines.slice(0, 2).map((line, index) => (
                <tspan key={`${zone.id}-${index}`} x={pos.x} dy={showBlockLabels && index === 0 ? pos.fontSize * 1.25 : pos.fontSize} fontSize={Math.max(11, pos.fontSize * 0.68)} fontWeight={500} fill="#4B5563">
                  {line}
                </tspan>
              ))}
            </text>
          );
        })}
        <PreviewGroupLabels labels={preview?.groupLabels} lang={lang} />
      </svg>
    </div>
  );
}

function previewLabelPosition(zone: CanvasDef['zones'][number]): {
  x: number;
  y: number;
  anchor: 'start' | 'middle' | 'end';
  fontSize: number;
  maxChars: number;
} | null {
  const fontSize = zone.label?.fontSize ?? 18;
  const align = zone.label?.align ?? 'left';
  const anchor: 'start' | 'middle' | 'end' =
    align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start';
  if (zone.label) {
    return {
      x: zone.label.x,
      y: zone.label.y,
      anchor,
      fontSize,
      maxChars: zone.shape.type === 'rect' && zone.shape.w >= 500 ? 40 : 22,
    };
  }
  if (zone.shape.type === 'rect') {
    return {
      x: zone.shape.x + 18,
      y: zone.shape.y + 34,
      anchor: 'start',
      fontSize,
      maxChars: zone.shape.w >= 500 ? 40 : 22,
    };
  }
  return null;
}

function PreviewGroupLabels({
  labels,
  lang,
}: {
  labels: NonNullable<NonNullable<CanvasDef['display']>['preview']>['groupLabels'];
  lang: Lang;
}) {
  if (!labels?.length) return null;

  return (
    <g aria-label="preview-group-labels">
      {labels.map((group) => {
        const align = group.align ?? 'center';
        const anchor: 'start' | 'middle' | 'end' =
          align === 'left' ? 'start' : align === 'right' ? 'end' : 'middle';
        const label = group.label[lang] ?? group.label[lang === 'zh' ? 'en' : 'zh'];
        const description = group.description?.[lang] ?? group.description?.[lang === 'zh' ? 'en' : 'zh'];
        const fontSize = group.fontSize ?? 34;
        return (
          <text
            key={group.id}
            x={group.x}
            y={group.y}
            textAnchor={anchor}
            fontFamily="Inter, 'PingFang SC', system-ui, sans-serif"
            pointerEvents="none"
          >
            <tspan x={group.x} fontSize={fontSize} fontWeight={900} fill="#111827">
              {label}
            </tspan>
            {description && (
              <tspan x={group.x} dy={fontSize * 0.82} fontSize={Math.max(14, fontSize * 0.36)} fontWeight={600} fill="#6B7280">
                {description}
              </tspan>
            )}
          </text>
        );
      })}
    </g>
  );
}

function ChartTemplatePreviewOverlay({ def, lang }: { def: CanvasDef; lang: Lang }) {
  if (!def.chart) return null;

  const rect = chartRect(def.viewBox);
  const yAxis = def.chart.yAxis;
  const factors = def.chart.factorsDefault.slice(0, 7);
  const yTicks = yAxisTicks(yAxis);
  const industryScores = fitScoresToFactorCount([3.6, 2.8, 3.3, 2.4, 3.1, 2.7, 3.0], factors.length);
  const blueOceanScores = fitScoresToFactorCount([1.4, 1.8, 4.5, 4.2, 1.2, 4.7, 3.8], factors.length);
  const industryPoints = pointsForScores(rect, yAxis, industryScores);
  const blueOceanPoints = pointsForScores(rect, yAxis, blueOceanScores);

  return (
    <g aria-label="template-preview-data">
      <rect
        x={rect.x}
        y={rect.y}
        width={rect.w}
        height={rect.h}
        fill="#FFFFFF"
        fillOpacity={0.42}
        rx={10}
      />
      {yTicks.map((tick) => {
        const y = yForScore(rect, yAxis, tick);
        return (
          <g key={tick}>
            <line x1={rect.x} x2={rect.x + rect.w} y1={y} y2={y} stroke="#D1D5DB" strokeWidth={1.2} />
            <text x={rect.x - 16} y={y + 5} fontSize={16} fill="#6B7280" textAnchor="end">
              {tick}
            </text>
          </g>
        );
      })}
      {factors.map((factor, index) => {
        const x = xForFactor(rect, index, factors.length);
        return (
          <g key={factor.id}>
            <line x1={x} x2={x} y1={rect.y} y2={rect.y + rect.h} stroke="#E5E7EB" strokeWidth={1} />
            <text x={x} y={rect.y + rect.h + 34} fontSize={15} fill="#374151" textAnchor="middle">
              {labelFor(factor, lang)}
            </text>
          </g>
        );
      })}
      <line x1={rect.x} x2={rect.x + rect.w} y1={rect.y + rect.h} y2={rect.y + rect.h} stroke="#9CA3AF" strokeWidth={2} />
      <polyline points={industryPoints} fill="none" stroke="#D62728" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" opacity={0.86} />
      <polyline points={blueOceanPoints} fill="none" stroke="#1F77B4" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" opacity={0.92} />
      {blueOceanScores.map((score, index) => {
        const x = xForFactor(rect, index, factors.length);
        const y = yForScore(rect, yAxis, score);
        return <circle key={`${factors[index]?.id ?? index}-point`} cx={x} cy={y} r={8} fill="#1F77B4" stroke="#FFFFFF" strokeWidth={3} />;
      })}
      <PreviewLegend x={rect.x + rect.w - 150} y={rect.y + 28} lang={lang} />
      <text x={rect.x + rect.w / 2} y={rect.y + 32} fontSize={18} fill="#9CA3AF" textAnchor="middle" fontWeight={600}>
        {lang === 'zh' ? '示例价值曲线' : 'Sample value curves'}
      </text>
    </g>
  );
}

function PreviewLegend({ x, y, lang }: { x: number; y: number; lang: Lang }) {
  return (
    <g aria-label="preview-legend">
      <line x1={x} x2={x + 38} y1={y} y2={y} stroke="#D62728" strokeWidth={5} strokeLinecap="round" />
      <text x={x + 48} y={y + 5} fontSize={15} fill="#374151">
        {lang === 'zh' ? '行业平均' : 'Industry'}
      </text>
      <line x1={x} x2={x + 38} y1={y + 30} y2={y + 30} stroke="#1F77B4" strokeWidth={6} strokeLinecap="round" />
      <text x={x + 48} y={y + 35} fontSize={15} fill="#374151">
        {lang === 'zh' ? '蓝海方案' : 'Blue ocean'}
      </text>
    </g>
  );
}

function wrapSvgText(text: string, maxChars: number): string[] {
  const normalized = text.trim();
  if (!normalized) return [];
  const hasSpaces = normalized.includes(' ');
  const parts = hasSpaces ? normalized.split(/\s+/) : Array.from(normalized);
  const lines: string[] = [];
  let current = '';
  for (const part of parts) {
    const next = current ? (hasSpaces ? `${current} ${part}` : `${current}${part}`) : part;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = part;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function fitScoresToFactorCount(scores: number[], factorCount: number): number[] {
  if (factorCount <= 0) return [];
  const out: number[] = [];
  for (let i = 0; i < factorCount; i += 1) out.push(scores[i % scores.length] ?? 0);
  return out;
}

function pointsForScores(
  rect: ReturnType<typeof chartRect>,
  yAxis: NonNullable<CanvasDef['chart']>['yAxis'],
  scores: number[],
): string {
  return scores
    .map((score, index) => `${xForFactor(rect, index, scores.length)},${yForScore(rect, yAxis, score)}`)
    .join(' ');
}

function labelFor(factor: XAxisItem, lang: Lang): string {
  const primary = factor.label[lang];
  if (primary && primary.trim().length > 0) return primary;
  return lang === 'zh' ? factor.label.en : factor.label.zh;
}
