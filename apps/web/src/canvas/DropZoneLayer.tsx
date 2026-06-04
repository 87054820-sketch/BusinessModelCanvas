import type { ZoneDef } from '@canvas-collab/shared';
import { shapeToPath } from './hitTest';

interface Props {
  zones: readonly ZoneDef[];
  /** When true, draws the zone outlines (debug / edit mode). */
  visible?: boolean;
}

/**
 * Renders the drop-zone polygons over the SVG background.
 * Stroke uses `vector-effect="non-scaling-stroke"` so outlines stay crisp
 * (1.5 CSS px) regardless of canvas zoom level.
 */
export function DropZoneLayer({ zones, visible = false }: Props) {
  return (
    <g>
      {zones.map((z) => (
        <path
          key={z.id}
          d={shapeToPath(z.shape)}
          fill="transparent"
          stroke={visible ? 'rgba(59,130,246,0.6)' : 'transparent'}
          strokeDasharray={visible ? '6 4' : undefined}
          strokeWidth={visible ? 1.5 : 0}
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />
      ))}
    </g>
  );
}
