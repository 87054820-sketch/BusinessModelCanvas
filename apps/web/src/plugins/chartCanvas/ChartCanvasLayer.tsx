import { useTranslation } from 'react-i18next';
import type { Lang } from '@canvas-collab/shared';
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
  const factorCount = factors.length;
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
      {factorCount === 0 ? (
        <text
          x={rect.x + rect.w / 2}
          y={rect.y + rect.h / 2}
          fontSize={14}
          fill="#9CA3AF"
          textAnchor="middle"
        >
          {lang === 'zh'
            ? '在右侧添加竞争因子以开始'
            : 'Add competitive factors in the inspector to begin'}
        </text>
      ) : (
        factors.map((f, i) => {
          const x = xForFactor(rect, i, factorCount);
          const label = resolveLabel(f, lang);
          return (
            <g key={f.id}>
              <line
                x1={x}
                x2={x}
                y1={rect.y}
                y2={rect.y + rect.h}
                stroke="#F3F4F6"
                strokeWidth={1}
              />
              <text
                x={x}
                y={rect.y + rect.h + 28}
                fontSize={12}
                fill="#1F2937"
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
        })
      )}
    </g>
  );
}

function useUiLang(): Lang {
  const { i18n } = useTranslation();
  return i18n.language === 'zh' ? 'zh' : 'en';
}
