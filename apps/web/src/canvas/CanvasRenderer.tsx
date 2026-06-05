import { useEffect, useState } from 'react';
import type * as Y from 'yjs';
import type { CanvasDef, CanvasI18n, Lang } from '@pingarden/shared';
import { api } from '../api/client';
import { DropZoneLayer } from './DropZoneLayer';
import { ZoneLabel } from './ZoneLabel';
import { useSvgPoint } from './useSvgPoint';
import { useZoomPan } from './useZoomPan';
import { ZoomControls } from './ZoomControls';
import { hitTestZone } from './hitTest';
import { useSelection } from '../state/selection';
import { pluginRegistry } from '../plugins';

type ToSvgPoint = (
  ev: PointerEvent | React.PointerEvent,
) => { x: number; y: number } | null;

interface Props {
  defId: string;
  /** Render language for the overlay labels. */
  lang: Lang;
  /** When true, draws the drop-zone outlines. */
  showZones?: boolean;
  /**
   * Live Yjs document for the active canvas. Plugins that need to render
   * collaborative state (e.g. chart-canvas reading chartLines / xAxisItems)
   * read it from here. May be null while hydrating.
   */
  doc?: Y.Doc | null;
  /** Display name credited as the actor when a plugin makes writes. */
  displayName?: string;
  /**
   * When provided, takes over background-click handling: the renderer
   * calls this with the SVG-coords of every click that lands on empty
   * canvas (i.e. not on a sticky / pin / chart point). Used to drop pins
   * in pin mode. When omitted (default), the renderer falls back to its
   * legacy zone hit-test → block-selection behaviour.
   */
  onCanvasClick?: (p: { x: number; y: number }) => void;
  /** Render-prop: receives SVG-coords helper + the loaded def. */
  children?: (ctx: { def: CanvasDef; toSvgPoint: ToSvgPoint }) => React.ReactNode;
}

/**
 * The canvas surface: SVG bg + drop-zones + translated labels + plugin
 * layers + caller-supplied content (stickies). Owns zoom/pan + background
 * click handling that selects a block (when no sticky was clicked).
 */
export function CanvasRenderer({
  defId,
  lang,
  showZones = false,
  doc = null,
  displayName = '',
  onCanvasClick,
  children,
}: Props) {
  const [bundle, setBundle] = useState<{ def: CanvasDef; i18n: CanvasI18n } | null>(null);
  const selectBlock = useSelection((s) => s.selectBlock);
  const clearSelection = useSelection((s) => s.clear);

  useEffect(() => {
    let cancelled = false;
    api.getDef(defId).then((b) => {
      if (cancelled) return;
      setBundle({ def: b.def, i18n: b.i18n[lang] });
    });
    return () => {
      cancelled = true;
    };
  }, [defId, lang]);

  const initialVb = bundle?.def.viewBox ?? [0, 0, 1, 1];
  const {
    svgRef,
    vb,
    zoomLevel,
    zoomIn,
    zoomOut,
    fit,
    startPan,
    onPan,
    endPan,
    panning,
    wasClick,
  } = useZoomPan(initialVb);
  const toSvgPoint = useSvgPoint(svgRef);

  if (!bundle) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-500">
        Loading…
      </div>
    );
  }

  const { def, i18n } = bundle;

  function handlePointerUp(e: React.PointerEvent<SVGSVGElement>) {
    endPan(e);
    if (!wasClick()) return;
    // Stickies stopPropagation on click — by the time we get here, this is a
    // click on the canvas background. If a callback claimed canvas clicks
    // (pin mode, etc.) it gets first dibs; otherwise zone hit-test for
    // selection.
    const p = toSvgPoint(e);
    if (!p) return clearSelection();
    if (onCanvasClick) {
      onCanvasClick(p);
      return;
    }
    const z = hitTestZone(def.zones, p.x, p.y);
    if (z) selectBlock(z.id);
    else clearSelection();
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <svg
        ref={svgRef}
        viewBox={vb.join(' ')}
        className="h-full w-full"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={i18n.canvasTitle}
        onPointerDown={startPan}
        onPointerMove={onPan}
        onPointerUp={handlePointerUp}
        onPointerCancel={endPan}
        style={{
          touchAction: 'none',
          cursor: panning ? 'grabbing' : 'grab',
          background: '#FAFAF7',
        }}
      >
        <image
          href={api.bgUrl(def.id, lang)}
          x={def.viewBox[0]}
          y={def.viewBox[1]}
          width={def.viewBox[2]}
          height={def.viewBox[3]}
          preserveAspectRatio="xMidYMid meet"
        />
        <DropZoneLayer zones={def.zones} visible={showZones} />
        {def.plugin && pluginRegistry[def.plugin] && (() => {
          const Plugin = pluginRegistry[def.plugin]!;
          return (
            <Plugin
              def={def}
              zones={def.zones}
              lang={lang}
              doc={doc}
              displayName={displayName}
              toSvgPoint={toSvgPoint}
            />
          );
        })()}
        {def.zones.map((z) => (
          <ZoneLabel key={z.id} zone={z} i18n={i18n} lang={lang} />
        ))}
        {children?.({ def, toSvgPoint })}
      </svg>

      <ZoomControls
        zoomLevel={zoomLevel}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onFit={fit}
      />
    </div>
  );
}
