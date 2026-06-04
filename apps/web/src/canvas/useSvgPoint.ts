import { useCallback } from 'react';

/**
 * Returns a function that converts a client-coords pointer event into
 * the SVG's user-space coordinates. Works whether or not the SVG is
 * currently being scaled by `preserveAspectRatio="xMidYMid meet"`.
 */
export function useSvgPoint(svgRef: React.RefObject<SVGSVGElement>) {
  return useCallback(
    (ev: PointerEvent | React.PointerEvent): { x: number; y: number } | null => {
      const svg = svgRef.current;
      if (!svg) return null;
      const ctm = svg.getScreenCTM();
      if (!ctm) return null;
      const inv = ctm.inverse();
      const pt = svg.createSVGPoint();
      pt.x = ev.clientX;
      pt.y = ev.clientY;
      const local = pt.matrixTransform(inv);
      return { x: local.x, y: local.y };
    },
    [svgRef],
  );
}
