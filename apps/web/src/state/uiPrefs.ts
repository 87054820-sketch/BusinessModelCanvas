import { create } from 'zustand';

/**
 * UI preferences that survive page reloads.
 *
 * Lives in localStorage under the `canvas-collab.uiPrefs` namespace —
 * matches the precedent set by `useIdentity` and the i18n module.
 *
 * Today: left/right column collapse states. Future preferences (density
 * mode, pinned panel sizes, etc.) belong here so UI state stays in one
 * persistent place.
 */
const STORAGE_KEY = 'canvas-collab.uiPrefs';

interface PersistedShape {
  leftSidebarCollapsed?: boolean;
  rightInspectorCollapsed?: boolean;
}

interface UiPrefsStore {
  leftSidebarCollapsed: boolean;
  rightInspectorCollapsed: boolean;
  toggleLeftSidebar: () => void;
  setLeftSidebarCollapsed: (collapsed: boolean) => void;
  toggleRightInspector: () => void;
  setRightInspectorCollapsed: (collapsed: boolean) => void;
}

function readInitial(): PersistedShape {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    // Corrupt JSON — fall back to defaults rather than crash the app.
    return {};
  }
}

function persist(state: PersistedShape) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage may be disabled (private mode, quota) — tolerate it.
  }
}

const initial = readInitial();

export const useUiPrefs = create<UiPrefsStore>((set, get) => ({
  leftSidebarCollapsed: initial.leftSidebarCollapsed ?? false,
  rightInspectorCollapsed: initial.rightInspectorCollapsed ?? false,
  toggleLeftSidebar: () => {
    const next = !get().leftSidebarCollapsed;
    set({ leftSidebarCollapsed: next });
    persist({
      leftSidebarCollapsed: next,
      rightInspectorCollapsed: get().rightInspectorCollapsed,
    });
  },
  setLeftSidebarCollapsed: (collapsed) => {
    set({ leftSidebarCollapsed: collapsed });
    persist({
      leftSidebarCollapsed: collapsed,
      rightInspectorCollapsed: get().rightInspectorCollapsed,
    });
  },
  toggleRightInspector: () => {
    const next = !get().rightInspectorCollapsed;
    set({ rightInspectorCollapsed: next });
    persist({
      leftSidebarCollapsed: get().leftSidebarCollapsed,
      rightInspectorCollapsed: next,
    });
  },
  setRightInspectorCollapsed: (collapsed) => {
    set({ rightInspectorCollapsed: collapsed });
    persist({
      leftSidebarCollapsed: get().leftSidebarCollapsed,
      rightInspectorCollapsed: collapsed,
    });
  },
}));
