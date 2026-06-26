import { create } from 'zustand';

/**
 * One-shot focus signal for the sticky-color legend section in
 * `CanvasConfigInspector`. Set by callers that create a new legend
 * entry from outside the inspector (today: the canvas-overlay
 * `+ 便签图例` button in `StickyLegendPalette`) so the freshly-created
 * row's label input auto-focuses on first render.
 *
 * Kept separate from `useSelection` because selection is "what the
 * inspector should show"; this is "imperative side-effect on mount".
 * Mirrors the small-store pattern already used by `useActiveStickyColor`
 * and `useActiveClass`.
 *
 * Lifecycle: caller calls `requestFocus(hex)` right before navigating
 * the inspector; the StickyLegendRow whose hex matches calls `clear()`
 * inside its mount-focus effect so the signal fires once and only once.
 */
interface StickyLegendFocus {
  pendingFocusHex: string | null;
  requestFocus: (hex: string) => void;
  clear: () => void;
}

export const useStickyLegendFocus = create<StickyLegendFocus>((set) => ({
  pendingFocusHex: null,
  requestFocus: (hex) => set({ pendingFocusHex: hex }),
  clear: () => set({ pendingFocusHex: null }),
}));
