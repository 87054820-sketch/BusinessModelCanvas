import type { CanvasI18n, Lang, ZoneDef, ZoneShape } from '@pingarden/shared';
import { zoneBounds } from './hitTest';

interface Props {
  zone: ZoneDef;
  i18n: CanvasI18n;
  lang: Lang;
  showPrompt?: boolean;
}

/**
 * Translated block title overlaid on the canvas.
 *
 * Honours the manifest's `zone.label` position when provided. For zones
 * without an explicit label, falls back to a shape-appropriate default
 * (top-left for rects, bbox centroid for polygons / circle segments).
 *
 * Uses an SVG `<text>` element so `text-anchor` handles alignment cleanly
 * regardless of zoom level. (The previous foreignObject approach forced
 * every label to the bounding-box top-left, which made overlapping zones
 * stack their labels — visible in VPC where 3 polygons share a square.)
 */
export function ZoneLabel({ zone, i18n, showPrompt = false }: Props) {
  const block = i18n.blocks[zone.id];
  if (!block) return null;

  const pos = zone.label ?? defaultLabelPos(zone.shape);
  const align = pos.align ?? 'left';
  const anchor: 'start' | 'middle' | 'end' =
    align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start';
  // Allow the manifest to override the default 18-px label font when a
  // canvas's blocks are much bigger than usual (e.g. JTBD).
  const fontSize = pos.fontSize ?? 18;
  const promptLines = showPrompt && block.prompt
    ? wrapLabel(block.prompt, promptMaxChars(zone.shape))
    : [];

  return (
    <text
      x={pos.x}
      y={pos.y}
      textAnchor={anchor}
      fontFamily="Inter, 'PingFang SC', system-ui, sans-serif"
      pointerEvents="none"
    >
      <tspan
        x={pos.x}
        dy={0}
        fontSize={fontSize}
        fontWeight={700}
        fill="#111827"
      >
        {block.title}
      </tspan>
      {promptLines.map((line, index) => (
        <tspan
          key={`${zone.id}-prompt-${index}`}
          x={pos.x}
          dy={index === 0 ? fontSize * 1.15 : fontSize * 0.9}
          fontSize={Math.max(11, fontSize * 0.58)}
          fontWeight={500}
          fill="#4B5563"
        >
          {line}
        </tspan>
      ))}
    </text>
  );
}

function wrapLabel(text: string, maxChars: number): string[] {
  const normalized = text.trim();
  if (!normalized) return [];
  const parts = normalized.includes(' ')
    ? normalized.split(/\s+/)
    : Array.from(normalized);
  const lines: string[] = [];
  let current = '';
  for (const part of parts) {
    const next = current
      ? normalized.includes(' ') ? `${current} ${part}` : `${current}${part}`
      : part;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = part;
    } else {
      current = next;
    }
    if (lines.length >= 2) break;
  }
  if (current && lines.length < 2) lines.push(current);
  return lines;
}

function promptMaxChars(shape: ZoneShape): number {
  if (shape.type === 'rect') {
    if (shape.w >= 500) return 36;
    if (shape.w >= 300) return 22;
    return 14;
  }
  return 16;
}

function defaultLabelPos(
  shape: ZoneShape,
): { x: number; y: number; align?: 'left' | 'center' | 'right'; fontSize?: number } {
  if (shape.type === 'rect') {
    return { x: shape.x + 12, y: shape.y + 24, align: 'left' };
  }
  // polygon and circle-segment: place at the bounding box centroid so the
  // label sits roughly inside the shape even when the manifest forgot to
  // specify one. Manifests should still set explicit positions where the
  // shape's bbox is misleading (e.g. triangles with a vertex at one edge).
  const b = zoneBounds(shape);
  return { x: b.x + b.w / 2, y: b.y + b.h / 2, align: 'center' };
}
