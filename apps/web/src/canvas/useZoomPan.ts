import { useCallback, useEffect, useRef, useState } from 'react';

export type ViewBox = [number, number, number, number];

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 8;

interface Result {
  svgRef: React.RefObject<SVGSVGElement>;
  vb: ViewBox;
  zoomLevel: number;
  zoomIn: () => void;
  zoomOut: () => void;
  fit: () => void;
  startPan: (e: React.PointerEvent<SVGSVGElement>) => void;
  onPan: (e: React.PointerEvent<SVGSVGElement>) => void;
  endPan: (e: React.PointerEvent<SVGSVGElement>) => void;
  panning: boolean;
  /** True iff pointerup was effectively a click (movement < threshold). */
  wasClick: () => boolean;
}

const CLICK_THRESHOLD_PX = 4;

/**
 * Zoom + pan controller for an SVG element.
 *
 *   - Wheel:           pan (deltaX/Y → translate viewBox)
 *   - Ctrl/Meta+Wheel: zoom toward cursor (browser pinch gesture)
 *   - Pointer drag:    pan (when target isn't a sticky — stickies stopPropagation)
 *   - Buttons:         zoom in / out / fit-to-default
 *
 * Stickies and the SVG point conversion (`getScreenCTM`) keep working
 * unchanged because the SVG's viewBox is the only thing that mutates —
 * coordinate systems remain consistent.
 */
export function useZoomPan(initialViewBox: ViewBox): Result {
  const initial = useRef<ViewBox>(initialViewBox);
  const [vb, setVb] = useState<ViewBox>(initialViewBox);
  const svgRef = useRef<SVGSVGElement>(null);
  const [panning, setPanning] = useState(false);

  // If the canvas type changes, reset to its viewBox.
  useEffect(() => {
    initial.current = initialViewBox;
    setVb(initialViewBox);
  }, [initialViewBox[0], initialViewBox[1], initialViewBox[2], initialViewBox[3]]);

  const zoomLevel = initial.current[2] / vb[2];

  const zoomAt = useCallback((clientX: number, clientY: number, factor: number) => {
    setVb((cur) => {
      const svg = svgRef.current;
      if (!svg) return cur;
      const ctm = svg.getScreenCTM();
      if (!ctm) return cur;
      const inv = ctm.inverse();
      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const local = pt.matrixTransform(inv);

      const initW = initial.current[2];
      const minW = initW / MAX_ZOOM;
      const maxW = initW / MIN_ZOOM;
      const tentativeW = cur[2] / factor;
      const newW = Math.min(maxW, Math.max(minW, tentativeW));
      const ratio = newW / cur[2];
      const newH = cur[3] * ratio;
      const newX = local.x - (local.x - cur[0]) * ratio;
      const newY = local.y - (local.y - cur[1]) * ratio;
      return [newX, newY, newW, newH];
    });
  }, []);

  const zoomBy = useCallback(
    (factor: number) => {
      const svg = svgRef.current;
      if (!svg) return;
      const r = svg.getBoundingClientRect();
      zoomAt(r.left + r.width / 2, r.top + r.height / 2, factor);
    },
    [zoomAt],
  );

  const zoomIn = useCallback(() => zoomBy(1.25), [zoomBy]);
  const zoomOut = useCallback(() => zoomBy(0.8), [zoomBy]);
  const fit = useCallback(() => setVb(initial.current), []);

  // ── pan via pointer drag ──────────────────────────────────────────────
  const panRef = useRef<{
    sx: number;
    sy: number;
    vbX: number;
    vbY: number;
    scale: number;
    moved: boolean;
  } | null>(null);

  const startPan = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      // If a sticky was clicked it has already called e.stopPropagation();
      // by the time this fires, the user is on empty canvas / background.
      const svg = svgRef.current;
      if (!svg) return;
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      panRef.current = {
        sx: e.clientX,
        sy: e.clientY,
        vbX: vb[0],
        vbY: vb[1],
        scale: ctm.a || 1,
        moved: false,
      };
      setPanning(true);
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
    },
    [vb],
  );

  const onPan = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const pan = panRef.current;
    if (!pan) return;
    const dxRaw = e.clientX - pan.sx;
    const dyRaw = e.clientY - pan.sy;
    if (!pan.moved && Math.hypot(dxRaw, dyRaw) >= CLICK_THRESHOLD_PX) {
      pan.moved = true;
    }
    if (!pan.moved) return;
    const dx = dxRaw / pan.scale;
    const dy = dyRaw / pan.scale;
    const nextX = pan.vbX - dx;
    const nextY = pan.vbY - dy;
    setVb((cur) => [nextX, nextY, cur[2], cur[3]]);
  }, []);

  // Tracks the *just-finished* gesture so callers can ask "was that a click?"
  // (It's a tiny window — we set this on endPan and let consumers query in
  // their own onPointerUp handler chained after ours.)
  const lastWasClick = useRef(false);

  const endPan = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const drag = panRef.current;
    panRef.current = null;
    setPanning(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
    lastWasClick.current = drag ? !drag.moved : false;
  }, []);

  const wasClick = useCallback(() => lastWasClick.current, []);

  // ── wheel: pan default, modifier = zoom (non-passive for preventDefault) ─
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const factor = Math.exp(-e.deltaY * 0.01);
        zoomAt(e.clientX, e.clientY, factor);
      } else {
        const ctm = svg.getScreenCTM();
        if (!ctm) return;
        const sx = ctm.a || 1;
        const sy = ctm.d || 1;
        setVb((cur) => [
          cur[0] + e.deltaX / sx,
          cur[1] + e.deltaY / sy,
          cur[2],
          cur[3],
        ]);
      }
    };
    svg.addEventListener('wheel', handler, { passive: false });
    return () => svg.removeEventListener('wheel', handler);
  }, [zoomAt]);

  return { svgRef, vb, zoomLevel, zoomIn, zoomOut, fit, startPan, onPan, endPan, panning, wasClick };
}
