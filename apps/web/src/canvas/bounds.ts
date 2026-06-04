import type { CanvasDef } from '@canvas-collab/shared';
import { chartRect } from '../plugins/chartCanvas/geometry';

/**
 * Clamp a free-form (x, y) point to the active canvas's "drawable area"
 * so users can never drop or drag a pin off the visible canvas.
 *
 * Policy:
 *   - chart-canvas plugin → clamp to the inner chart rect (the gridded
 *     area between the Y-axis labels and the factor labels). Pins that
 *     leak outside this rect would visually float above the X-axis ladder
 *     or behind the Y-axis numbers — both are nonsensical for value
 *     curves.
 *   - everything else → clamp to the canvas viewBox. Strictly clamping to
 *     the first zone would be too aggressive for canvases like Empathy
 *     Map / JTBD where zones don't tile the whole image.
 *
 * Used at three points:
 *   1. ProjectWorkspacePage.onCanvasClick — the pin-drop entrypoint when
 *      the user paints with an active class.
 *   2. PinLayer.DraggablePin onPointerMove — clamp during drag so the
 *      pin "sticks" to the edge instead of disappearing.
 *   3. PinLayer.DraggablePin onPointerUp — final sanity clamp before
 *      committing, in case the pointer left the SVG entirely.
 */
export function clampPointToCanvas(
  p: { x: number; y: number },
  def: CanvasDef,
): { x: number; y: number } {
  let minX: number, minY: number, maxX: number, maxY: number;
  if (def.plugin === 'chart-canvas') {
    const r = chartRect(def.viewBox);
    minX = r.x;
    minY = r.y;
    maxX = r.x + r.w;
    maxY = r.y + r.h;
  } else {
    const [vx, vy, vw, vh] = def.viewBox;
    minX = vx;
    minY = vy;
    maxX = vx + vw;
    maxY = vy + vh;
  }
  return {
    x: Math.max(minX, Math.min(maxX, p.x)),
    y: Math.max(minY, Math.min(maxY, p.y)),
  };
}
