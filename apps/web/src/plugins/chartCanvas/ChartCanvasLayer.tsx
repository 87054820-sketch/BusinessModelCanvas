import { useTranslation } from 'react-i18next';
import type { Lang } from '@pingarden/shared';
import { resolveLabel, useXAxisItems } from '../../collab/xAxisItems';
import { resolveChartLabel, useChartConfig } from '../../collab/chartConfig';
import type { PluginProps } from '../index';
import { chartRect, xForFactor, yAxisTicks, yForScore } from './geometry';
export { chartRect, xForFactor, yForScore, yAxisTicks } from './geometry';
export { snapXToFactor } from './geometry';

/**
 * Renders the chart-canvas visual scaffolding only:
 *   - Y axis grid + numeric ticks + (optional) Low/High descriptive labels
 *   - X baseline + factor labels (rotated when crowded)
 *   - Y-axis title rotated -90° on the left
 *
 * Y-axis text labels (main / Low / High) are pulled through
 * `resolveChartLabel(manifest, override, lang)` — manifest values are the
 * defaults, the doc's `chartConfig` Y.Map can override them per canvas
 * instance. Edits flow in via `CanvasConfigInspector`.
 *
 * Data points and the auto-connection polylines belong to the universal
 * `PinLayer`, which mounts on every canvas — chart-canvas just provides
 * the coordinate frame for value curves to be drawn against, plus the
 * X-snap helper (`snapXToFactor`) consumed by PinLayer when this plugin
 * is the active one.
 */
export function ChartCanvasLayer({ def, doc }: PluginProps) {
  const factors = useXAxisItems(doc);
  const overrides = useChartConfig(doc);
  const lang = useUiLang();

  if (!def.chart) return null;
  const yAxis = def.chart.yAxis;
  const rect = chartRect(def.viewBox);
  const yTicks = yAxisTicks(yAxis);
  const hasFactors = factors.length > 0;
  const displayFactors = hasFactors ? factors : def.chart.factorsDefault;
  const factorCount = displayFactors.length;
  const rotateFactorLabels = factorCount > 7;

  const yAxisLabel = resolveChartLabel(yAxis.label, overrides.yAxisLabel, lang);
  const lowLabel = resolveChartLabel(yAxis.lowLabel, overrides.yAxisLowLabel, lang);
  const highLabel = resolveChartLabel(yAxis.highLabel, overrides.yAxisHighLabel, lang);

  return (
    <g aria-label="chart-scaffolding">
      {yAxisLabel && (
        <text
          x={rect.x - 70}
          y={rect.y + rect.h / 2}
          transform={`rotate(-90 ${rect.x - 70} ${rect.y + rect.h / 2})`}
          fontSize={16}
          fontWeight={600}
          fill="#374151"
          textAnchor="middle"
        >
          {yAxisLabel}
        </text>
      )}

      {/* Y gridlines + numeric labels */}
      {yTicks.map((tick) => {
        const yPx = yForScore(rect, yAxis, tick);
        return (
          <g key={`tick-${tick}`}>
            <line
              x1={rect.x}
              x2={rect.x + rect.w}
              y1={yPx}
              y2={yPx}
              stroke="#E5E7EB"
              strokeWidth={1}
            />
            <text
              x={rect.x - 14}
              y={yPx + 5}
              fontSize={13}
              fill="#6B7280"
              textAnchor="end"
            >
              {tick}
            </text>
          </g>
        );
      })}

      {/* Optional ladder labels at the top / bottom of the Y axis */}
      {highLabel && (
        <text
          x={rect.x - 14}
          y={rect.y - 12}
          fontSize={12}
          fill="#6B7280"
          textAnchor="end"
        >
          {highLabel}
        </text>
      )}
      {lowLabel && (
        <text
          x={rect.x - 14}
          y={rect.y + rect.h + 18}
          fontSize={12}
          fill="#6B7280"
          textAnchor="end"
        >
          {lowLabel}
        </text>
      )}

      {/* X baseline */}
      <line
        x1={rect.x}
        x2={rect.x + rect.w}
        y1={rect.y + rect.h}
        y2={rect.y + rect.h}
        stroke="#9CA3AF"
        strokeWidth={1.4}
      />

      {/* Factors */}
      {displayFactors.map((f, i) => {
        const x = xForFactor(rect, i, factorCount);
        const label = resolveLabel(f, lang);
        return (
          <g key={f.id} opacity={hasFactors ? 1 : 0.48}>
            <line
              x1={x}
              x2={x}
              y1={rect.y}
              y2={rect.y + rect.h}
              stroke={hasFactors ? '#F3F4F6' : '#E5E7EB'}
              strokeWidth={1}
              strokeDasharray={hasFactors ? undefined : '6 8'}
            />
            <text
              x={x}
              y={rect.y + rect.h + 28}
              fontSize={12}
              fill={hasFactors ? '#1F2937' : '#6B7280'}
              textAnchor={rotateFactorLabels ? 'end' : 'middle'}
              transform={
                rotateFactorLabels
                  ? `rotate(-25 ${x} ${rect.y + rect.h + 28})`
                  : undefined
              }
            >
              {label}
            </text>
          </g>
        );
      })}
      {!hasFactors && <ChartEmptyState rect={rect} lang={lang} />}
    </g>
  );
}

function ChartEmptyState({
  rect,
  lang,
}: {
  rect: ReturnType<typeof chartRect>;
  lang: Lang;
}) {
  const title = lang === 'zh' ? '先定义竞争因子' : 'Define competitive factors first';
  const steps = lang === 'zh'
    ? ['在右侧添加 5–15 个竞争因子', '添加行业平均或竞品曲线', '为每个因子放置评分点']
    : ['Add 5–15 competitive factors on the right', 'Create industry or competitor curves', 'Place score points for each factor'];

  return (
    <g aria-label="chart-empty-state">
      <rect
        x={rect.x + rect.w * 0.22}
        y={rect.y + rect.h * 0.28}
        width={rect.w * 0.56}
        height={rect.h * 0.32}
        rx={18}
        fill="#FFFFFF"
        fillOpacity={0.92}
        stroke="#E5E7EB"
      />
      <text
        x={rect.x + rect.w / 2}
        y={rect.y + rect.h * 0.36}
        fontSize={20}
        fontWeight={700}
        fill="#1F2937"
        textAnchor="middle"
      >
        {title}
      </text>
      {steps.map((step, index) => (
        <text
          key={step}
          x={rect.x + rect.w * 0.32}
          y={rect.y + rect.h * (0.43 + index * 0.06)}
          fontSize={15}
          fill="#4B5563"
        >
          {index + 1}. {step}
        </text>
      ))}
    </g>
  );
}

function useUiLang(): Lang {
  const { i18n } = useTranslation();
  return i18n.language === 'zh' ? 'zh' : 'en';
}
