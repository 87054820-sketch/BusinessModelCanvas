import { create } from 'zustand';

/**
 * Right-inspector selection state. The Inspector dispatches on `kind`:
 *   none      → ProjectInspector (default — no explicit selection)
 *   project   → ProjectInspector (user clicked the project node in the sidebar)
 *   canvas    → CanvasKnowledgeInspector (user opened a canvas; the canvas
 *               type is the focus until something more specific is clicked)
 *   block     → BlockInspector (zoneId tells it which block)
 *   sticky    → StickyInspector (stickyId)
 *   pinClass  → LegendInspector scrolled to the picked class id (used
 *               when the user clicks a chip in the legend palette or
 *               wants to edit a class's color/icon/name)
 *   pin       → PinInspector (pinId)
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
  | { kind: 'pin'; pinId: string };

interface SelectionStore {
  selection: Selection;
  selectProject: () => void;
  selectCanvas: () => void;
  selectBlock: (zoneId: string) => void;
  selectSticky: (stickyId: string) => void;
  selectPinClass: (classId: string) => void;
  selectPin: (pinId: string) => void;
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
  clear: () => set({ selection: { kind: 'none' } }),
}));
