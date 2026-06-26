import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { CanvasDef, CanvasI18n, Lang, XAxisItem } from '@pingarden/shared';
import { api, type CanvasDefDetail } from '../api/client';
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
}

export function TemplatePreviewModal({ defId, lang, onClose }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [detail, setDetail] = useState<CanvasDefDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!defId) {
      setDetail(null);
      return;
    }
    setLoading(true);
    api
      .getDef(defId)
      .then((d) => setDetail(d))
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [defId]);

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

  if (!defId) return null;

  const name = detail?.def.name[lang] ?? detail?.def.id ?? defId;
  const tagline = t(`templates.${defId}.tagline`, '');
  const knowledge = detail?.knowledge[lang];
  const bgUrl = api.bgUrl(defId, lang);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        {/* Left — full canvas preview */}
        <div className="relative hidden flex-1 items-center justify-center bg-stone-100 md:flex">
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
              className="h-full w-full object-contain p-6"
            />
          )}
        </div>

        {/* Right — info panel */}
        <div className="flex w-full flex-col md:w-[480px]">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-gray-900">{name}</h2>
              {tagline && <p className="mt-0.5 text-sm text-gray-500">{tagline}</p>}
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

          {/* Mobile canvas preview (shown only on small screens) */}
          <div className="border-b border-gray-100 bg-stone-50 p-4 md:hidden">
            {detail ? (
              <TemplateCanvasPreview
                def={detail.def}
                i18n={detail.i18n[lang]}
                bgUrl={bgUrl}
                lang={lang}
                name={name}
                compact
              />
            ) : (
              <img src={bgUrl} alt={name} className="w-full rounded-lg" />
            )}
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {loading ? (
              <p className="text-sm text-gray-400">{t('home.loading')}…</p>
            ) : knowledge?.intro || knowledge?.body ? (
              <div className="space-y-5">
                {knowledge.intro && (
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                      {t('inspector.canvasKnowledge.usageIntro')}
                    </h3>
                    <Markdown content={knowledge.intro} canvasDefId={defId} />
                  </div>
                )}
                {knowledge.body && (
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                      {t('inspector.canvasKnowledge.knowledgeBody')}
                    </h3>
                    <Markdown content={knowledge.body} canvasDefId={defId} />
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">{t('inspector.canvasKnowledge.empty')}</p>
            )}
          </div>

          {/* Footer CTA */}
          <div className="border-t border-gray-100 px-6 py-4">
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate(`/p/new?withCanvas=${encodeURIComponent(defId)}`, {
                  state: preserveNavigationState(location),
                });
              }}
              className="w-full rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white hover:bg-black"
            >
              {t('home.startWithTemplate', { name })}
            </button>
          </div>
        </div>
      </div>
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
    return <img src={bgUrl} alt={name} className={compact ? 'w-full rounded-lg' : 'h-full w-full object-contain p-6'} />;
  }

  return (
    <svg
      viewBox={viewBox}
      className={compact ? 'w-full rounded-lg bg-[#FAFAF7]' : 'h-full w-full p-6'}
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
    <div className={compact ? 'w-full rounded-lg bg-[#FAFAF7] p-3' : 'flex h-full w-full flex-col justify-center p-8'}>
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
