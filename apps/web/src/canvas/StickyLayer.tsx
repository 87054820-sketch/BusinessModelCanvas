import type { ZoneDef, ZoneShape } from '@pingarden/shared';
import type * as Y from 'yjs';
import { DEFAULT_STICKY_HEIGHT, DEFAULT_STICKY_WIDTH } from '@pingarden/shared';
import { updateSticky, useStickies } from '../collab/stickies';
import { hitTestZone, zoneCentroid } from './hitTest';
import { Sticky } from './Sticky';
import { useSelection } from '../state/selection';

interface Props {
  doc: Y.Doc;
  zones: readonly ZoneDef[];
  toSvgPoint: (ev: PointerEvent | React.PointerEvent) => { x: number; y: number } | null;
  /** Current user's display name — credited as the actor on cross-zone moves. */
  displayName: string;
  readonly?: boolean;
}

/**
 * Renders all stickies. On drop, re-runs the zone hit-test so each sticky's
 * `zoneId` always reflects which block it visually sits in. Selecting a
 * sticky updates the global selection store → right inspector switches to
 * StickyInspector.
 */
export function StickyLayer({ doc, zones, toSvgPoint, displayName, readonly = false }: Props) {
  const items = useStickies(doc);
  const selection = useSelection((s) => s.selection);
  const selectSticky = useSelection((s) => s.selectSticky);

  return (
    <g>
      {items.map((s) => (
        <Sticky
          key={s.id}
          sticky={s}
          selected={selection.kind === 'sticky' && selection.stickyId === s.id}
          toSvgPoint={toSvgPoint}
          onMove={(x, y) => {
            if (!readonly) updateSticky(doc, s.id, { x, y });
          }}
          onMoveEnd={(x, y) => {
            if (readonly) return;
            const zone = hitTestZone(zones, x, y);
            if (zone) {
              const p = clampStickyCenterToZone(
                x,
                y,
                zone.shape,
                s.width ?? DEFAULT_STICKY_WIDTH,
                s.height ?? DEFAULT_STICKY_HEIGHT,
              );
              updateSticky(doc, s.id, { x: p.x, y: p.y, zoneId: zone.id }, { by: displayName });
            } else {
              const cur = zones.find((z) => z.id === s.zoneId);
              const centroid = cur ? zoneCentroid(cur.shape) : { x: s.x, y: s.y };
              const p = cur
                ? clampStickyCenterToZone(
                    centroid.x,
                    centroid.y,
                    cur.shape,
                    s.width ?? DEFAULT_STICKY_WIDTH,
                    s.height ?? DEFAULT_STICKY_HEIGHT,
                  )
                : centroid;
              updateSticky(doc, s.id, { x: p.x, y: p.y });
            }
          }}
          onResize={(width, height) => {
            if (!readonly) updateSticky(doc, s.id, { width, height });
          }}
          onResizeEnd={(width, height) => {
            if (readonly) return;
            const zone = zones.find((z) => z.id === s.zoneId);
            const p = zone ? clampStickyCenterToZone(s.x, s.y, zone.shape, width, height) : { x: s.x, y: s.y };
            updateSticky(doc, s.id, { width, height, x: p.x, y: p.y });
          }}
          onText={(text) => {
            if (!readonly) updateSticky(doc, s.id, { text });
          }}
          onSelect={() => selectSticky(s.id)}
          readonly={readonly}
        />
      ))}
    </g>
  );
}

function clampStickyCenterToZone(
  x: number,
  y: number,
  shape: ZoneShape,
  width: number,
  height: number,
): { x: number; y: number } {
  const b = zoneBounds(shape);
  return {
    x: clampCenter(x, b.x, b.x + b.w, width),
    y: clampCenter(y, b.y, b.y + b.h, height),
  };
}

function zoneBounds(shape: ZoneShape): { x: number; y: number; w: number; h: number } {
  if (shape.type === 'rect') return { x: shape.x, y: shape.y, w: shape.w, h: shape.h };
  if (shape.type === 'polygon') {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const [x, y] of shape.points) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }
  return { x: shape.cx - shape.r, y: shape.cy - shape.r, w: shape.r * 2, h: shape.r * 2 };
}

function clampCenter(value: number, minEdge: number, maxEdge: number, size: number): number {
  const min = minEdge + size / 2;
  const max = maxEdge - size / 2;
  if (min > max) return (minEdge + maxEdge) / 2;
  return Math.min(Math.max(value, min), max);
}
