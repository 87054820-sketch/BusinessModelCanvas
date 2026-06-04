import { useEffect, useRef, useState } from 'react';
import type { StickyNote } from '@canvas-collab/shared';

const W = 140;
const H = 100;
const CLICK_THRESHOLD_PX = 4;

interface Props {
  sticky: StickyNote;
  selected: boolean;
  onMove: (x: number, y: number) => void;
  onMoveEnd: (x: number, y: number) => void;
  onText: (text: string) => void;
  onSelect: () => void;
  /** Convert a client pointer event to SVG-space coords. */
  toSvgPoint: (ev: PointerEvent | React.PointerEvent) => { x: number; y: number } | null;
}

/**
 * One sticky note in the canvas. Pointer interactions:
 *   - pointerdown → start drag-or-click tracking
 *   - movement < 4px between down/up = click → onSelect()
 *   - movement >= 4px = drag → onMove (live) + onMoveEnd (final)
 *   - dblclick → enter inline edit mode (HTML <textarea> via foreignObject)
 *
 * Color picking + delete now live in the right-side inspector — those
 * affordances were removed from the sticky body to declutter the canvas.
 */
export function Sticky({
  sticky,
  selected,
  onMove,
  onMoveEnd,
  onText,
  onSelect,
  toSvgPoint,
}: Props) {
  const [editing, setEditing] = useState(false);
  const dragRef = useRef<{
    offsetX: number;
    offsetY: number;
    startClientX: number;
    startClientY: number;
    moved: boolean;
  } | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (editing) {
      const ta = taRef.current;
      ta?.focus();
      ta?.select();
    }
  }, [editing]);

  function startDrag(e: React.PointerEvent) {
    if (editing) return;
    e.stopPropagation();
    const p = toSvgPoint(e);
    if (!p) return;
    dragRef.current = {
      offsetX: p.x - sticky.x,
      offsetY: p.y - sticky.y,
      startClientX: e.clientX,
      startClientY: e.clientY,
      moved: false,
    };
    (e.target as Element).setPointerCapture(e.pointerId);
  }

  function onDrag(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startClientX;
    const dy = e.clientY - dragRef.current.startClientY;
    if (!dragRef.current.moved && Math.hypot(dx, dy) >= CLICK_THRESHOLD_PX) {
      dragRef.current.moved = true;
    }
    if (!dragRef.current.moved) return;
    const p = toSvgPoint(e);
    if (!p) return;
    onMove(p.x - dragRef.current.offsetX, p.y - dragRef.current.offsetY);
  }

  function endDrag(e: React.PointerEvent) {
    const drag = dragRef.current;
    dragRef.current = null;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    if (!drag) return;
    if (drag.moved) {
      // It was a drag — commit final position.
      const p = toSvgPoint(e);
      if (p) onMoveEnd(p.x - drag.offsetX, p.y - drag.offsetY);
    } else {
      // It was a click — select. Drop focus from any text editor that
      // still had it (e.g. the inspector textarea, the inline editor on
      // a different sticky) so workspace-level shortcuts (Cmd+C/V/X,
      // Delete) operate on the sticky as an OBJECT rather than on text
      // characters inside an editor. Editing text remains opt-in: click
      // into the textarea, or double-click the sticky to enter the
      // inline editor.
      e.stopPropagation();
      const active = document.activeElement;
      if (active instanceof HTMLElement && active !== document.body) {
        active.blur();
      }
      onSelect();
    }
  }

  return (
    <g
      transform={`translate(${sticky.x - W / 2} ${sticky.y - H / 2})`}
      style={{ cursor: editing ? 'text' : 'grab' }}
    >
      {/* shadow */}
      <rect x={2} y={4} width={W} height={H} fill="rgba(0,0,0,0.12)" rx={2} />
      {/* body */}
      <rect
        x={0}
        y={0}
        width={W}
        height={H}
        fill={sticky.color}
        rx={2}
        stroke={selected ? '#1F2937' : 'transparent'}
        strokeWidth={selected ? 2 : 0}
        vectorEffect="non-scaling-stroke"
        onPointerDown={startDrag}
        onPointerMove={onDrag}
        onPointerUp={endDrag}
        onDoubleClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
      />

      {/* text */}
      {editing ? (
        <foreignObject x={6} y={6} width={W - 12} height={H - 12}>
          <textarea
            ref={taRef}
            defaultValue={sticky.text}
            onBlur={(e) => {
              onText(e.currentTarget.value);
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.currentTarget.blur();
              }
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.currentTarget.blur();
              }
            }}
            className="h-full w-full resize-none border-0 bg-transparent text-[13px] leading-tight text-gray-900 outline-none"
            style={{ fontFamily: 'inherit' }}
          />
        </foreignObject>
      ) : (
        <foreignObject x={6} y={6} width={W - 12} height={H - 12} pointerEvents="none">
          <div className="h-full w-full overflow-hidden whitespace-pre-wrap break-words text-[13px] leading-tight text-gray-900">
            {sticky.text || (
              <span className="italic text-gray-500">
                {/* Hint shown for empty stickies. Localized via i18n later if needed. */}
                双击编辑
              </span>
            )}
          </div>
        </foreignObject>
      )}

      {/* author corner — read-only on canvas, full edits in inspector */}
      {sticky.authorName && (
        <text
          x={W - 6}
          y={H - 6}
          textAnchor="end"
          fontSize={9}
          fill="rgba(31,41,55,0.45)"
          pointerEvents="none"
        >
          {sticky.authorName}
        </text>
      )}
    </g>
  );
}
