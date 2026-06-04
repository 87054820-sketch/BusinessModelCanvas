import type { ZoneDef } from '@canvas-collab/shared';
import type * as Y from 'yjs';
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
}

/**
 * Renders all stickies. On drop, re-runs the zone hit-test so each sticky's
 * `zoneId` always reflects which block it visually sits in. Selecting a
 * sticky updates the global selection store → right inspector switches to
 * StickyInspector.
 */
export function StickyLayer({ doc, zones, toSvgPoint, displayName }: Props) {
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
          onMove={(x, y) => updateSticky(doc, s.id, { x, y })}
          onMoveEnd={(x, y) => {
            const zone = hitTestZone(zones, x, y);
            if (zone) {
              updateSticky(doc, s.id, { x, y, zoneId: zone.id }, { by: displayName });
            } else {
              const cur = zones.find((z) => z.id === s.zoneId);
              const centroid = cur ? zoneCentroid(cur.shape) : { x: s.x, y: s.y };
              updateSticky(doc, s.id, { x: centroid.x, y: centroid.y });
            }
          }}
          onText={(text) => updateSticky(doc, s.id, { text })}
          onSelect={() => selectSticky(s.id)}
        />
      ))}
    </g>
  );
}
