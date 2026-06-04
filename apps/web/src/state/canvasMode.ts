import { create } from 'zustand';

/**
 * Transient canvas-mode state. Reset every page load — these modes
 * describe what the user is currently doing, not a saved preference.
 *
 * Today: `pinMode` toggles whether clicking on canvas background drops a
 * pin (true) or runs zone-hit-test selection (false, default). When the
 * active canvas's `objectTypes` doesn't include 'pin' the toolbar hides
 * the toggle and the mode silently stays off.
 */
interface CanvasModeStore {
  pinMode: boolean;
  setPinMode: (on: boolean) => void;
  togglePinMode: () => void;
}

export const useCanvasMode = create<CanvasModeStore>((set, get) => ({
  pinMode: false,
  setPinMode: (on) => set({ pinMode: on }),
  togglePinMode: () => set({ pinMode: !get().pinMode }),
}));
