import { useMemo, useRef } from 'react';
import type * as Y from 'yjs';
import type { CanvasDef, Pin, PinClass, PinIcon } from '@pingarden/shared';
import { updatePin, usePins } from '../collab/pins';
import { usePinClasses } from '../collab/pinClasses';
import { useSelection } from '../state/selection';
import { clampPointToCanvas } from './bounds';

interface Props {
  doc: Y.Doc;
  def: CanvasDef;
  toSvgPoint: (
    ev: PointerEvent | React.PointerEvent,
  ) => { x: number; y: number } | null;
  /**
   * Optional X-snap helper. When provided (today only by chart-canvas
   * plugin), called at drag-end to nudge the pin's x to the nearest
   * factor column. Other canvases pass undefined → x stays free.
   */
  snapX?: (x: number) => number;
  readonly?: boolean;
}

/**
 * Universal pin layer — runs on every canvas. Renders:
 *   1. One polyline per PinClass through that class's pins, sorted by x
 *      (auto-connection — same on Strategy Canvas value curves and
 *      anywhere else).
 *   2. Each pin as its class's icon in its class's color, draggable.
 *   3. The active class's pins get a slightly heavier stroke when
 *      selected, so the user can spot which group they're editing.
 *
 * Pins are drawn AFTER stickies (StickyLayer is mounted before PinLayer
 * in the workspace) so pins float above sticky notes — they're meant
 * to be the "annotation focus".
 */
export function PinLayer({ doc, def, toSvgPoint, snapX, readonly = false }: Props) {
  const pins = usePins(doc);
  const classes = usePinClasses(doc);
  const selection = useSelection((s) => s.selection);
  const selectPin = useSelection((s) => s.selectPin);
  void def;

  // Group pins by classId once per render so the polyline pass and the
  // marker pass both see the same ordering.
  const grouped = useMemo(() => {
    const byClass = new Map<string, Pin[]>();
    for (const p of pins) {
      const arr = byClass.get(p.classId) ?? [];
      arr.push(p);
      byClass.set(p.classId, arr);
    }
    for (const arr of byClass.values()) arr.sort((a, b) => a.x - b.x);
    return byClass;
  }, [pins]);

  const classById = useMemo(
    () => new Map(classes.map((c) => [c.id, c])),
    [classes],
  );

  return (
    <g aria-label="pins">
      {/* polylines under markers — connect pins of each class. Skip
          single-pin classes (no line to draw). */}
      {[...grouped.entries()].map(([classId, group]) => {
        if (group.length < 2) return null;
        const cls = classById.get(classId);
        if (!cls) return null;
        const selected =
          selection.kind === 'pin' &&
          group.some((p) => p.id === selection.pinId);
        return (
          <polyline
            key={`poly-${classId}`}
            points={group.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke={cls.color}
            strokeOpacity={selected ? 1 : 0.85}
            strokeWidth={selected ? 2.4 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}
      {/* markers */}
      {pins.map((p) => {
        const cls = classById.get(p.classId);
        if (!cls) return null;
        return (
          <DraggablePin
            key={p.id}
            pin={p}
            cls={cls}
            def={def}
            selected={selection.kind === 'pin' && selection.pinId === p.id}
            toSvgPoint={toSvgPoint}
            snapX={snapX}
            readonly={readonly}
            onSelect={() => selectPin(p.id)}
            onMove={(x, y) => {
              if (!readonly) updatePin(doc, p.id, { x, y });
            }}
          />
        );
      })}
    </g>
  );
}

interface DraggablePinProps {
  pin: Pin;
  cls: PinClass;
  def: CanvasDef;
  selected: boolean;
  toSvgPoint: (
    ev: PointerEvent | React.PointerEvent,
  ) => { x: number; y: number } | null;
  snapX?: (x: number) => number;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  readonly?: boolean;
}

function DraggablePin({
  pin,
  cls,
  def,
  selected,
  toSvgPoint,
  snapX,
  onSelect,
  onMove,
  readonly = false,
}: DraggablePinProps) {
  const dragging = useRef(false);
  const moved = useRef(false);

  return (
    <g
      transform={`translate(${pin.x}, ${pin.y})`}
      style={{ cursor: readonly ? 'default' : 'grab', touchAction: 'none' }}
      onPointerDown={(ev) => {
        ev.stopPropagation();
        if (readonly) {
          onSelect();
          return;
        }
        dragging.current = true;
        moved.current = false;
        (ev.target as Element).setPointerCapture?.(ev.pointerId);
      }}
      onPointerMove={(ev) => {
        if (!dragging.current) return;
        const p = toSvgPoint(ev);
        if (!p) return;
        moved.current = true;
        // Clamp to drawable area on every frame so the pin sticks to the
        // edge if the pointer leaves the canvas — never disappears.
        const c = clampPointToCanvas(p, def);
        onMove(c.x, c.y);
      }}
      onPointerUp={(ev) => {
        if (dragging.current) {
          dragging.current = false;
          (ev.target as Element).releasePointerCapture?.(ev.pointerId);
          // Final commit: clamp again (defensive — the last pointermove
          // may have been outside the SVG and produced no event), then
          // X-snap on chart-canvas.
          if (moved.current) {
            const c = clampPointToCanvas({ x: pin.x, y: pin.y }, def);
            const finalX = snapX ? snapX(c.x) : c.x;
            if (finalX !== pin.x || c.y !== pin.y) onMove(finalX, c.y);
          }
        }
        if (!moved.current) onSelect();
      }}
      onPointerCancel={() => {
        dragging.current = false;
        moved.current = false;
      }}
    >
      {/* Selection halo — sits behind the glyph so the user has a clear
          ring around the pin they just clicked. Far more visible than
          the previous "slightly thicker stroke" approach. Hidden when
          unselected so the canvas doesn't gain visual noise. */}
      {selected && (
        <circle
          cx={0}
          cy={0}
          r={14}
          fill="none"
          stroke="#111827"
          strokeWidth={1.5}
          strokeDasharray="3 2"
          pointerEvents="none"
        />
      )}
      <PinGlyph icon={cls.icon} color={cls.color} selected={selected} />
      {pin.label && (
        <text
          x={20}
          y={5}
          fontSize={12}
          fontWeight={selected ? 700 : 600}
          fill="#1F2937"
          pointerEvents="none"
        >
          {pin.label}
        </text>
      )}
    </g>
  );
}

function PinGlyph({
  icon,
  color,
  selected,
}: {
  icon: PinIcon;
  color: string;
  selected: boolean;
}) {
  const stroke = selected ? '#111827' : '#FFFFFF';
  const strokeWidth = selected ? 2.2 : 1.5;
  switch (icon) {
    case 'triangle':
      return (
        <polygon
          points="0,-9 8,7 -8,7"
          fill={color}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
      );
    case 'square':
      return (
        <rect
          x={-7}
          y={-7}
          width={14}
          height={14}
          fill={color}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      );
    case 'star':
      return (
        <polygon
          points="0,-9 2.6,-2.8 9,-2.8 3.7,1.6 5.6,8 0,4.4 -5.6,8 -3.7,1.6 -9,-2.8 -2.6,-2.8"
          fill={color}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
      );
    case 'flag':
      return (
        <g>
          <line x1={0} y1={9} x2={0} y2={-10} stroke={color} strokeWidth={2} />
          <polygon
            points="0,-10 12,-7 0,-3"
            fill={color}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        </g>
      );
    case 'circle':
    default:
      return (
        <circle
          cx={0}
          cy={0}
          r={8}
          fill={color}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      );
  }
}
