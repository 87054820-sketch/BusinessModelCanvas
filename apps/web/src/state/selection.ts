import { create } from 'zustand';

/**
 * Right-inspector selection state. The Inspector dispatches on `kind`:
 *   none    → ProjectInspector (default — no explicit selection)
 *   project → ProjectInspector (user clicked the project node in the sidebar)
 *   canvas  → CanvasKnowledgeInspector (user opened a canvas; the canvas
 *             type is the focus until something more specific is clicked)
 *   block   → BlockInspector (zoneId tells it which block)
 *   sticky  → StickyInspector (stickyId)
 *
 * `project` and `canvas` were added so the inspector can show meaningful
 * defaults for the entity the user is "navigating" to. `none` and `project`
 * render the same content today, but they're distinct so the sidebar can
 * highlight the project node only when it was explicitly clicked, not as
 * a side-effect of clearing.
 *
 * Selection is module-level state — not persisted. Switching projects
 * calls `clear()` so a fresh project always starts unselected.
 */
export type Selection =
  | { kind: 'none' }
  | { kind: 'project' }
  | { kind: 'canvas' }
  | { kind: 'block'; zoneId: string }
  | { kind: 'sticky'; stickyId: string };

interface SelectionStore {
  selection: Selection;
  selectProject: () => void;
  selectCanvas: () => void;
  selectBlock: (zoneId: string) => void;
  selectSticky: (stickyId: string) => void;
  clear: () => void;
}

export const useSelection = create<SelectionStore>((set) => ({
  selection: { kind: 'none' },
  selectProject: () => set({ selection: { kind: 'project' } }),
  selectCanvas: () => set({ selection: { kind: 'canvas' } }),
  selectBlock: (zoneId) => set({ selection: { kind: 'block', zoneId } }),
  selectSticky: (stickyId) => set({ selection: { kind: 'sticky', stickyId } }),
  clear: () => set({ selection: { kind: 'none' } }),
}));
