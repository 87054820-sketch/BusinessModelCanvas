interface Props {
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
}

/** Floating zoom controls in the bottom-right corner of the canvas. */
export function ZoomControls({ zoomLevel, onZoomIn, onZoomOut, onFit }: Props) {
  return (
    <div className="pointer-events-auto absolute bottom-4 right-4 z-10 flex items-center overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <Btn onClick={onZoomOut} title="Zoom out (Ctrl/⌘+wheel)">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 7h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </Btn>
      <button
        onClick={onFit}
        title="Fit (reset zoom)"
        className="border-x border-gray-200 px-2 py-1.5 text-xs tabular-nums text-gray-700 hover:bg-gray-50"
        style={{ minWidth: 52 }}
      >
        {Math.round(zoomLevel * 100)}%
      </button>
      <Btn onClick={onZoomIn} title="Zoom in (Ctrl/⌘+wheel)">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 3v8M3 7h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </Btn>
    </div>
  );
}

function Btn({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="px-2.5 py-1.5 text-gray-700 hover:bg-gray-50"
    >
      {children}
    </button>
  );
}
