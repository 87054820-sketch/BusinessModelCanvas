import { create } from 'zustand';

/**
 * Right-inspector selection state. The Inspector dispatches on `kind`:
 *   none        → ProjectInspector (default — no explicit selection)
 *   project     → ProjectInspector (user clicked the project node in the sidebar)
 *   canvas      → CanvasKnowledgeInspector / CanvasConfigInspector based on tab
 *   block       → BlockInspector (zoneId tells it which block)
 *   sticky      → StickyInspector (stickyId)
 *   pinClass    → CanvasConfigInspector scrolled to the picked class id
 *   pin         → PinInspector (pinId)
 *   stickyColor → CanvasConfigInspector scrolled to the picked sticky-
 *                 palette hex row (used when a chip in the right-aside
 *                 StickyLegendPalette is clicked)
 *
 * Selection is module-level state — not persisted. Switching projects
 * calls `clear()` so a fresh project always starts unselected.
 */
export type Selection =
  | { kind: 'none' }
  | { kind: 'project' }
  | { kind: 'canvas' }
  | { kind: 'block'; zoneId: string }
  | { kind: 'sticky'; stickyId: string }
  | { kind: 'pinClass'; classId: string }
  | { kind: 'pin'; pinId: string }
  | { kind: 'stickyColor'; hex: string };

interface SelectionStore {
  selection: Selection;
  selectProject: () => void;
  selectCanvas: () => void;
  selectBlock: (zoneId: string) => void;
  selectSticky: (stickyId: string) => void;
  selectPinClass: (classId: string) => void;
  selectPin: (pinId: string) => void;
  selectStickyColor: (hex: string) => void;
  clear: () => void;
}

export const useSelection = create<SelectionStore>((set) => ({
  selection: { kind: 'none' },
  selectProject: () => set({ selection: { kind: 'project' } }),
  selectCanvas: () => set({ selection: { kind: 'canvas' } }),
  selectBlock: (zoneId) => set({ selection: { kind: 'block', zoneId } }),
  selectSticky: (stickyId) => set({ selection: { kind: 'sticky', stickyId } }),
  selectPinClass: (classId) => set({ selection: { kind: 'pinClass', classId } }),
  selectPin: (pinId) => set({ selection: { kind: 'pin', pinId } }),
  selectStickyColor: (hex) => set({ selection: { kind: 'stickyColor', hex } }),
  clear: () => set({ selection: { kind: 'none' } }),
}));
