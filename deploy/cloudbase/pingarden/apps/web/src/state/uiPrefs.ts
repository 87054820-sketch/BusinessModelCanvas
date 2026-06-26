import { create } from 'zustand';

/**
 * UI preferences that survive page reloads.
 *
 * Lives in localStorage under the `pingarden.uiPrefs` namespace —
 * matches the precedent set by `useIdentity` and the i18n module.
 *
 * Today: left/right column collapse states. Future preferences (density
 * mode, pinned panel sizes, etc.) belong here so UI state stays in one
 * persistent place.
 */
const STORAGE_KEY = 'pingarden.uiPrefs';

interface PersistedShape {
  leftSidebarCollapsed?: boolean;
  rightInspectorCollapsed?: boolean;
  /**
   * Which sub-view is active when the right inspector renders the
   * canvas-level view (selection.kind in {none, canvas}). 'intro' shows
   * the bundled knowledge pages; 'config' shows
   * `CanvasConfigInspector` (Y-axis labels + factors + pin classes).
   * The two corresponding ⓘ / ⚙ icons are always visible — even in
   * collapsed mode — so users can land directly on either tab.
   */
  rightInspectorTab?: 'intro' | 'config';
}

interface UiPrefsStore {
  leftSidebarCollapsed: boolean;
  rightInspectorCollapsed: boolean;
  rightInspectorTab: 'intro' | 'config';
  toggleLeftSidebar: () => void;
  setLeftSidebarCollapsed: (collapsed: boolean) => void;
  toggleRightInspector: () => void;
  setRightInspectorCollapsed: (collapsed: boolean) => void;
  setRightInspectorTab: (tab: 'intro' | 'config') => void;
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
  rightInspectorTab:
    initial.rightInspectorTab === 'config' ? 'config' : 'intro',
  toggleLeftSidebar: () => {
    const next = !get().leftSidebarCollapsed;
    set({ leftSidebarCollapsed: next });
    persist({
      leftSidebarCollapsed: next,
      rightInspectorCollapsed: get().rightInspectorCollapsed,
      rightInspectorTab: get().rightInspectorTab,
    });
  },
  setLeftSidebarCollapsed: (collapsed) => {
    set({ leftSidebarCollapsed: collapsed });
    persist({
      leftSidebarCollapsed: collapsed,
      rightInspectorCollapsed: get().rightInspectorCollapsed,
      rightInspectorTab: get().rightInspectorTab,
    });
  },
  toggleRightInspector: () => {
    const next = !get().rightInspectorCollapsed;
    set({ rightInspectorCollapsed: next });
    persist({
      leftSidebarCollapsed: get().leftSidebarCollapsed,
      rightInspectorCollapsed: next,
      rightInspectorTab: get().rightInspectorTab,
    });
  },
  setRightInspectorCollapsed: (collapsed) => {
    set({ rightInspectorCollapsed: collapsed });
    persist({
      leftSidebarCollapsed: get().leftSidebarCollapsed,
      rightInspectorCollapsed: collapsed,
      rightInspectorTab: get().rightInspectorTab,
    });
  },
  setRightInspectorTab: (tab) => {
    set({ rightInspectorTab: tab });
    persist({
      leftSidebarCollapsed: get().leftSidebarCollapsed,
      rightInspectorCollapsed: get().rightInspectorCollapsed,
      rightInspectorTab: tab,
    });
  },
}));
