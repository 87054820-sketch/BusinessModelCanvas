import type { AxisDef, Lang, ZoneDef } from '@canvas-collab/shared';
import { zoneBounds } from '../../canvas/hitTest';

interface Props {
  zones: readonly ZoneDef[];
  lang: Lang;
}

const LOW: Record<Lang, string> = { en: 'low', zh: '低' };
const HIGH: Record<Lang, string> = { en: 'high', zh: '高' };

/**
 * Visual treatment per axis kind. Risk reads as a warning (amber); return
 * reads as a positive (emerald). The icon is a tiny 12-px SVG rendered
 * just before the axis name so the meaning lands without parsing the text.
 */
const KIND_COLOR: Record<NonNullable<AxisDef['kind']>, string> = {
  risk: '#B45309',   // amber-700
  return: '#047857', // emerald-700
};

const KIND_TINT: Record<NonNullable<AxisDef['kind']>, string> = {
  risk: '#D97706',   // amber-600 — slightly lighter for the icon stroke / line
  return: '#059669', // emerald-600
};

/**
 * Draws labelled X/Y axes for any zone that declares an `axes` field.
 * Used by Portfolio Map's `explore` and `exploit` halves.
 *
 * Layout (per zone):
 *   – Y axis: faint vertical arrow on the left (inside the rect). High
 *     marker at top + axis name (rotated, centered) along the left margin.
 *   – X axis: faint horizontal arrow at the bottom (inside the rect).
 *     Low / axis name (centered) / high in the bottom margin.
 *
 * The shared bottom-left corner is "(low, low)" — we render that low
 * marker only on the X-axis row to avoid duplicate labels at the corner.
 *
 * Each axis can declare `kind: 'risk' | 'return'`. The renderer uses that
 * to colour the name and prefix it with a small icon (warning triangle
 * for risk, upward bar chart for return).
 */
export function AxisGridLayer({ zones, lang }: Props) {
  return (
    <g pointerEvents="none">
      {zones.map((z) => {
        if (!z.axes) return null;
        const b = zoneBounds(z.shape);
        const inset = 32;                 // bumped from 24 so labels have breathing room
        const x0 = b.x + inset;
        const x1 = b.x + b.w - inset;
        const y0 = b.y + inset;
        const y1 = b.y + b.h - inset;
        const xMid = (x0 + x1) / 2;
        const yMid = (y0 + y1) / 2;
        const yTextX = b.x + 18;          // Y-axis label rail (was 10 — pushed right for breathing room)
        const xTextY = b.y + b.h - 12;    // X-axis label rail

        const xKind = z.axes.x.kind;
        const yKind = z.axes.y.kind;
        const xColor = xKind ? KIND_COLOR[xKind] : '#374151';
        const yColor = yKind ? KIND_COLOR[yKind] : '#374151';

        return (
          <g key={z.id}>
            {/* ── X axis ── */}
            <line
              x1={x0}
              x2={x1}
              y1={y1}
              y2={y1}
              stroke="#9CA3AF"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
              markerEnd="url(#axis-arrow)"
            />
            <text x={x0} y={xTextY} fontSize={10} fill="#9CA3AF">
              {LOW[lang]}
            </text>
            <AxisLabel
              x={xMid}
              y={xTextY}
              text={z.axes.x.label[lang]}
              kind={xKind}
              color={xColor}
            />
            <text x={x1} y={xTextY} fontSize={10} fill="#9CA3AF" textAnchor="end">
              {HIGH[lang]}
            </text>

            {/* ── Y axis ── */}
            <line
              x1={x0}
              x2={x0}
              y1={y1}
              y2={y0}
              stroke="#9CA3AF"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
              markerEnd="url(#axis-arrow)"
            />
            <text
              x={yTextX}
              y={y0 + 4}
              fontSize={10}
              fill="#9CA3AF"
              textAnchor="middle"
            >
              {HIGH[lang]}
            </text>
            <g transform={`rotate(-90 ${yTextX} ${yMid})`}>
              <AxisLabel
                x={yTextX}
                y={yMid}
                text={z.axes.y.label[lang]}
                kind={yKind}
                color={yColor}
              />
            </g>
          </g>
        );
      })}

      <defs>
        <marker
          id="axis-arrow"
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,6 L6,3 Z" fill="#9CA3AF" />
        </marker>
      </defs>
    </g>
  );
}

/**
 * Axis name rendered with a small icon to the left and a kind-dependent
 * colour. The icon glyph + text are positioned so the *combined* group
 * stays centered around (x, y) — that way the rotation pivot in the
 * caller still lines up correctly.
 */
function AxisLabel({
  x,
  y,
  text,
  kind,
  color,
}: {
  x: number;
  y: number;
  text: string;
  kind: AxisDef['kind'];
  color: string;
}) {
  if (!kind) {
    return (
      <text x={x} y={y} fontSize={11} fill={color} fontWeight={500} textAnchor="middle">
        {text}
      </text>
    );
  }
  const tint = KIND_TINT[kind];
  // Approximate text half-width so the icon hugs the left side of the
  // glyph block. CJK glyphs are ~fontSize wide; Latin glyphs are ~0.6 *
  // fontSize. Detecting the script gives us a reasonable estimate
  // without measuring layout (which would require getBBox + a re-render).
  const isCJK = /[\u3400-\u9fff\u3000-\u303f\uff00-\uffef]/.test(text);
  const charWidth = isCJK ? 11 : 6.5;
  const halfText = (text.length * charWidth) / 2;
  const ICON_W = 12;
  const GAP = 6;
  const iconX = x - halfText - GAP - ICON_W;
  // Vertically centre the icon on the glyph mid-line (text glyph centre is
  // ≈ baseline − fontSize/3; icon is 12-tall so subtract half of that).
  const iconY = y - 9;
  return (
    <g>
      {kind === 'risk' ? <RiskIcon x={iconX} y={iconY} color={tint} /> : null}
      {kind === 'return' ? <ReturnIcon x={iconX} y={iconY} color={tint} /> : null}
      <text x={x} y={y} fontSize={11} fill={color} fontWeight={600} textAnchor="middle">
        {text}
      </text>
    </g>
  );
}

/** Warning triangle with a centred dot (12×12). */
function RiskIcon({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <polygon points="6,1 11,11 1,11" fill="none" stroke={color} strokeWidth={1.2} strokeLinejoin="round" />
      <line x1="6" y1="4.5" x2="6" y2="8" stroke={color} strokeWidth={1.2} strokeLinecap="round" />
      <circle cx="6" cy="9.6" r="0.6" fill={color} />
    </g>
  );
}

/** Rising bar-chart icon (12×12). */
function ReturnIcon({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <line x1="1" y1="11" x2="11" y2="11" stroke={color} strokeWidth={1.1} strokeLinecap="round" />
      <rect x="2"   y="7" width="2" height="4" fill={color} />
      <rect x="5"   y="4" width="2" height="7" fill={color} />
      <rect x="8"   y="1" width="2" height="10" fill={color} />
    </g>
  );
}
