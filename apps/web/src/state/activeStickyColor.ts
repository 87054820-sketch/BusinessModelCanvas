import { create } from 'zustand';
import { useActiveClass } from './activeClass';

/**
 * Active sticky-color "paint" mode — when non-null, clicking the canvas
 * drops a new sticky in that color, in the zone the click landed on
 * (mirror of pin paint mode in `activeClass.ts`). Click again on the
 * same chip to deactivate.
 *
 * Mutual exclusion: picking a sticky-color clears any active pin class
 * (and vice-versa in `activeClass.ts`'s pickClass — wired via
 * cross-import below). Two paint modes at once would be ambiguous when
 * the canvas-click handler fires.
 *
 * Reset to null on canvas switch (handled in ProjectWorkspacePage's
 * effect on `activeCanvas?.id`).
 */
interface ActiveStickyColorStore {
  activeStickyColor: string | null;
  pickColor: (hex: string) => void;
  toggleColor: (hex: string) => void;
  clearActive: () => void;
}

export const useActiveStickyColor = create<ActiveStickyColorStore>((set, get) => ({
  activeStickyColor: null,
  pickColor: (hex) => {
    // Drop pin paint mode if it was active — only one paint tool at a time.
    useActiveClass.getState().clearActive();
    set({ activeStickyColor: hex });
  },
  toggleColor: (hex) => {
    const next = get().activeStickyColor === hex ? null : hex;
    if (next !== null) useActiveClass.getState().clearActive();
    set({ activeStickyColor: next });
  },
  clearActive: () => set({ activeStickyColor: null }),
}));
