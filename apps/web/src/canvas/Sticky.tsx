import { useRef, useState } from 'react';
import type { StickyNote } from '@pingarden/shared';
import {
  DEFAULT_STICKY_HEIGHT,
  DEFAULT_STICKY_WIDTH,
  STICKY_MAX_HEIGHT,
  STICKY_MAX_WIDTH,
  STICKY_MIN_HEIGHT,
  STICKY_MIN_WIDTH,
} from '@pingarden/shared';
import { StickyRichEditor, ensureHTML } from './StickyRichEditor';

const CLICK_THRESHOLD_PX = 4;
/** Side length of the bottom-right resize handle in SVG-coord units. */
const HANDLE_SIZE = 10;

interface Props {
  sticky: StickyNote;
  selected: boolean;
  onMove: (x: number, y: number) => void;
  onMoveEnd: (x: number, y: number) => void;
  onResize: (width: number, height: number) => void;
  onResizeEnd: (width: number, height: number) => void;
  onText: (text: string) => void;
  onSelect: () => void;
  readonly?: boolean;
  /** Convert a client pointer event to SVG-space coords. */
  toSvgPoint: (ev: PointerEvent | React.PointerEvent) => { x: number; y: number } | null;
}

/**
 * One sticky note in the canvas. Pointer interactions:
 *   - pointerdown on body → start drag-or-click tracking
 *   - movement < 4px between down/up = click → onSelect()
 *   - movement >= 4px = drag → onMove (live) + onMoveEnd (final)
 *   - dblclick → enter inline edit mode (HTML <textarea> via foreignObject)
 *   - pointerdown on the bottom-right resize handle (only visible when
 *     selected) → resize the sticky live, commit on pointerup
 *
 * Width / height come from `sticky.width` / `sticky.height` when
 * present, falling back to the shared `DEFAULT_STICKY_*` constants
 * otherwise. Bounds enforced via `STICKY_MIN_*` / `STICKY_MAX_*` while
 * the user drags so the value can never escape the legible range.
 *
 * Color picking + delete now live in the right-side inspector — those
 * affordances were removed from the sticky body to declutter the canvas.
 */
export function Sticky({
  sticky,
  selected,
  onMove,
  onMoveEnd,
  onResize,
  onResizeEnd,
  onText,
  onSelect,
  readonly = false,
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
  const resizeRef = useRef<{
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    width: number;
    height: number;
  } | null>(null);

  // Effective dimensions — fall back to the shared defaults so stickies
  // persisted before this feature existed render at the original size.
  const W = sticky.width ?? DEFAULT_STICKY_WIDTH;
  const H = sticky.height ?? DEFAULT_STICKY_HEIGHT;

  // Focus management for inline editing is now handled inside
  // StickyRichEditor via its `autoFocus` prop, so the previous
  // textarea-focus useEffect (and `taRef`) are no longer needed.

  function startDrag(e: React.PointerEvent) {
    if (editing) return;
    e.stopPropagation();
    if (readonly) {
      onSelect();
      return;
    }
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

  // Resize handle interaction. We track the pointer's SVG-space delta
  // from the down event and apply it to the starting (W, H), clamping
  // both axes independently so the user can drag horizontally to make
  // a long strip without affecting height (and vice versa).
  function startResize(e: React.PointerEvent) {
    if (editing) return;
    e.stopPropagation();
    const p = toSvgPoint(e);
    if (!p) return;
    resizeRef.current = {
      startX: p.x,
      startY: p.y,
      startW: W,
      startH: H,
      width: W,
      height: H,
    };
    (e.target as Element).setPointerCapture(e.pointerId);
  }

  function onResizeMove(e: React.PointerEvent) {
    if (!resizeRef.current) return;
    const p = toSvgPoint(e);
    if (!p) return;
    const dx = p.x - resizeRef.current.startX;
    const dy = p.y - resizeRef.current.startY;
    const nextW = clamp(
      resizeRef.current.startW + dx,
      STICKY_MIN_WIDTH,
      STICKY_MAX_WIDTH,
    );
    const nextH = clamp(
      resizeRef.current.startH + dy,
      STICKY_MIN_HEIGHT,
      STICKY_MAX_HEIGHT,
    );
    resizeRef.current.width = nextW;
    resizeRef.current.height = nextH;
    onResize(nextW, nextH);
  }

  function endResize(e: React.PointerEvent) {
    const r = resizeRef.current;
    resizeRef.current = null;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    if (!r) return;
    onResizeEnd(r.width, r.height);
  }

  return (
    <g
      transform={`translate(${sticky.x - W / 2} ${sticky.y - H / 2})`}
      style={{ cursor: readonly ? 'default' : editing ? 'text' : 'grab' }}
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
          if (!readonly) setEditing(true);
        }}
      />

      {/* text */}
      {editing ? (
        <foreignObject x={6} y={6} width={W - 12} height={H - 12}>
          <StickyRichEditor
            compact
            autoFocus
            value={sticky.text}
            onCommit={(html) => {
              onText(html);
              setEditing(false);
            }}
            className="h-full w-full"
          />
        </foreignObject>
      ) : (
        <foreignObject x={6} y={6} width={W - 12} height={H - 12} pointerEvents="none">
          {sticky.text ? (
            <div
              className="sticky-readonly h-full w-full overflow-hidden whitespace-pre-wrap break-words text-[13px] leading-tight text-gray-900"
              dangerouslySetInnerHTML={{ __html: ensureHTML(sticky.text) }}
            />
          ) : (
            <div className="h-full w-full overflow-hidden whitespace-pre-wrap break-words text-[13px] leading-tight text-gray-900">
              <span className="italic text-gray-500">
                {/* Hint shown for empty stickies. Localized via i18n later if needed. */}
                双击编辑
              </span>
            </div>
          )}
        </foreignObject>
      )}

      {/* author corner — read-only on canvas, full edits in inspector */}
      {sticky.authorName && (
        <text
          x={W - 6}
          y={H - 5}
          textAnchor="end"
          fontSize={8.5}
          fill="rgba(31,41,55,0.45)"
          pointerEvents="none"
        >
          {sticky.authorName}
        </text>
      )}

      {/* resize handle — bottom-right, only when selected and not in
          inline-edit mode. Filled square with `nwse-resize` cursor; its
          own pointer handlers stop propagation so the body's drag-to-
          move state machine never sees the resize gestures. */}
      {selected && !editing && !readonly && (
        <rect
          x={W - HANDLE_SIZE}
          y={H - HANDLE_SIZE}
          width={HANDLE_SIZE}
          height={HANDLE_SIZE}
          fill="#1F2937"
          stroke="#fff"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
          style={{ cursor: 'nwse-resize' }}
          onPointerDown={startResize}
          onPointerMove={onResizeMove}
          onPointerUp={endResize}
        />
      )}
    </g>
  );
}

function clamp(n: number, min: number, max: number): number {
  if (n < min) return min;
  if (n > max) return max;
  return n;
}
