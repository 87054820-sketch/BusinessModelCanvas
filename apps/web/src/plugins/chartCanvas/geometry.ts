import type { ChartConfig } from '@pingarden/shared';

/**
 * Layout math for the chart-canvas plugin. Pure functions — no DOM, no
 * Yjs — so they are easy to reason about and unit-test.
 *
 * The chart sits inside the canvas's viewBox. We carve out four padding
 * strips so the labels never crowd the curves:
 *
 *   ┌────────────────── viewBox ──────────────────┐
 *   │ padTop                                      │
 *   │   ┌── chart rect ──────────┐  padRight     │
 *   │   │ ◀──── chart.w ────▶    │  (line label  │
 *   │   │                        │   tails fit   │
 *   │   │   ◎───◎───◎───◎...     │   here)       │
 *   │   │   │                    │               │
 *   │   └────────────────────────┘               │
 *   │ padBottom (factor labels)                  │
 *   └─────────────────────────────────────────────┘
 *      padLeft (Y axis labels)
 */

export interface ChartRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ChartGeometry {
  rect: ChartRect;
  yMin: number;
  yMax: number;
}

export const CHART_PADDING = {
  /** Y-axis numeric labels live to the left of this. */
  left: 100,
  /** Right end of each polyline carries the line label inside this strip. */
  right: 200,
  /** Title / Y-axis high label sit above this. */
  top: 64,
  /** X-axis factor labels live below this. */
  bottom: 110,
} as const;

/** Compute the chart drawing rectangle from the canvas viewBox. */
export function chartRect(
  viewBox: [number, number, number, number],
): ChartRect {
  const [vx, vy, vw, vh] = viewBox;
  return {
    x: vx + CHART_PADDING.left,
    y: vy + CHART_PADDING.top,
    w: vw - CHART_PADDING.left - CHART_PADDING.right,
    h: vh - CHART_PADDING.top - CHART_PADDING.bottom,
  };
}

/**
 * Pixel x for the i-th factor (0-indexed). Factors are evenly spaced
 * across the chart rect's width; the +0.5 offset centers each factor
 * inside its column so the leftmost factor isn't pinned to the Y axis.
 */
export function xForFactor(rect: ChartRect, factorIdx: number, factorCount: number): number {
  if (factorCount <= 0) return rect.x + rect.w / 2;
  if (factorCount === 1) return rect.x + rect.w / 2;
  // Evenly distribute factors across the full chart width edge-to-edge,
  // so the first factor lands at the left edge and the last at the right.
  return rect.x + (rect.w * factorIdx) / (factorCount - 1);
}

/** Pixel y for a numeric score. Higher score → smaller y (top of chart). */
export function yForScore(
  rect: ChartRect,
  yAxis: ChartConfig['yAxis'],
  score: number,
): number {
  const span = yAxis.max - yAxis.min;
  if (span === 0) return rect.y + rect.h / 2;
  const t = (score - yAxis.min) / span;
  return rect.y + rect.h * (1 - clamp(t, 0, 1));
}

/** Inverse of yForScore — given a SVG y value, return the corresponding score. */
export function scoreForY(
  rect: ChartRect,
  yAxis: ChartConfig['yAxis'],
  svgY: number,
  step = 0.1,
): number {
  const t = clamp((rect.y + rect.h - svgY) / rect.h, 0, 1);
  const raw = yAxis.min + t * (yAxis.max - yAxis.min);
  // Snap to the nearest `step` so dragging produces tidy values.
  const snapped = Math.round(raw / step) * step;
  return clamp(round1(snapped), yAxis.min, yAxis.max);
}

/** Y axis tick values — one per integer step within [min, max]. */
export function yAxisTicks(yAxis: ChartConfig['yAxis']): number[] {
  const out: number[] = [];
  const stepSign = yAxis.max >= yAxis.min ? 1 : -1;
  // Always render at least min and max, plus integer-stepped intermediates
  // (works for both 0..5 and -2..2 style scales).
  for (let v = yAxis.min; (stepSign > 0 ? v <= yAxis.max : v >= yAxis.max); v += stepSign) {
    out.push(v);
    if (Math.abs(v - yAxis.max) < 1e-9) break;
  }
  if (out[out.length - 1] !== yAxis.max) out.push(yAxis.max);
  return out;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Round to 1 decimal — kills floating-point garbage from the math above. */
function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

/**
 * Snap a free-form X coordinate to the nearest factor column. Used by
 * the universal PinLayer at drag-end when the active canvas has the
 * chart-canvas plugin, so value-curve points land cleanly on factor
 * columns instead of drifting between them.
 *
 * `factorCount` is the live count from `xAxisItems`; pass 0 to disable
 * snapping (returns the input unchanged).
 */
export function snapXToFactor(
  x: number,
  rect: ChartRect,
  factorCount: number,
): number {
  if (factorCount <= 0) return x;
  if (factorCount === 1) return rect.x + rect.w / 2;
  // Each factor column has width = rect.w / (factorCount - 1) — find
  // which column the x is closest to.
  const step = rect.w / (factorCount - 1);
  const idx = Math.round((x - rect.x) / step);
  const clamped = clamp(idx, 0, factorCount - 1);
  return rect.x + clamped * step;
}
