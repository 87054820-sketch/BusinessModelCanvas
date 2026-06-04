import type { ZoneDef, ZoneShape } from '@canvas-collab/shared';

/** Bounding rect of any zone shape, in SVG coords. */
export function zoneBounds(shape: ZoneShape): {
  x: number;
  y: number;
  w: number;
  h: number;
} {
  if (shape.type === 'rect') return { x: shape.x, y: shape.y, w: shape.w, h: shape.h };
  if (shape.type === 'polygon') {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [x, y] of shape.points) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }
  // circle-segment: bound by the full circle
  return {
    x: shape.cx - shape.r,
    y: shape.cy - shape.r,
    w: shape.r * 2,
    h: shape.r * 2,
  };
}

/** Centroid of a zone — useful for placing the translated label. */
export function zoneCentroid(shape: ZoneShape): { x: number; y: number } {
  const b = zoneBounds(shape);
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
}

// ─────────── point-in-shape (used when drag-dropping a sticky) ───────────
export function pointInZone(shape: ZoneShape, px: number, py: number): boolean {
  if (shape.type === 'rect') {
    return px >= shape.x && px <= shape.x + shape.w && py >= shape.y && py <= shape.y + shape.h;
  }
  if (shape.type === 'polygon') return pointInPolygon(shape.points, px, py);
  // circle-segment
  const dx = px - shape.cx;
  const dy = py - shape.cy;
  const distSq = dx * dx + dy * dy;
  if (distSq > shape.r * shape.r) return false;
  const angle = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
  const from = (shape.fromDeg + 360) % 360;
  const to = (shape.toDeg + 360) % 360;
  return from <= to ? angle >= from && angle <= to : angle >= from || angle <= to;
}

function pointInPolygon(points: Array<[number, number]>, px: number, py: number): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i]!;
    const [xj, yj] = points[j]!;
    const intersect =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi + 0.000001) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Find the topmost zone (last in array) containing a point. */
export function hitTestZone(
  zones: readonly ZoneDef[],
  px: number,
  py: number,
): ZoneDef | undefined {
  for (let i = zones.length - 1; i >= 0; i--) {
    if (pointInZone(zones[i]!.shape, px, py)) return zones[i];
  }
  return undefined;
}

/** Build an SVG `d` attribute for any shape (used for debug outlines). */
export function shapeToPath(shape: ZoneShape): string {
  if (shape.type === 'rect') {
    return `M ${shape.x} ${shape.y} h ${shape.w} v ${shape.h} h ${-shape.w} Z`;
  }
  if (shape.type === 'polygon') {
    return (
      'M ' +
      shape.points.map(([x, y]) => `${x} ${y}`).join(' L ') +
      ' Z'
    );
  }
  // circle-segment as a pie wedge
  const fromRad = (shape.fromDeg * Math.PI) / 180;
  const toRad = (shape.toDeg * Math.PI) / 180;
  const x1 = shape.cx + shape.r * Math.cos(fromRad);
  const y1 = shape.cy + shape.r * Math.sin(fromRad);
  const x2 = shape.cx + shape.r * Math.cos(toRad);
  const y2 = shape.cy + shape.r * Math.sin(toRad);
  const sweep = ((shape.toDeg - shape.fromDeg) % 360 + 360) % 360;
  const largeArc = sweep > 180 ? 1 : 0;
  return `M ${shape.cx} ${shape.cy} L ${x1} ${y1} A ${shape.r} ${shape.r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}
