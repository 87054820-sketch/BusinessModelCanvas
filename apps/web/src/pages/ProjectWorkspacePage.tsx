import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type {
  CanvasDef,
  CanvasI18n,
  CanvasMeta,
  CaseLibraryEntry,
  ColorLegendEntry,
  Lang,
  Project,
  StoryMeta,
} from '@pingarden/shared';
import { useTranslation } from 'react-i18next';
import { api, type CanvasDefSummary, type CanvasKnowledge } from '../api/client';
import { projectsApi } from '../api/projects';
import { storiesApi } from '../api/stories';
import { useIdentity } from '../identity/useIdentity';
import { CanvasRenderer } from '../canvas/CanvasRenderer';
import { StickyLayer } from '../canvas/StickyLayer';
import { PinLayer } from '../canvas/PinLayer';
import { LegendPalette } from '../canvas/LegendPalette';
import { StickyLegendPalette } from '../canvas/StickyLegendPalette';
import { clampPointToCanvas } from '../canvas/bounds';
import { useYDoc } from '../collab/useYDoc';
import { addSticky, deleteSticky, useStickies } from '../collab/stickies';
import { addPin, removePin, usePins } from '../collab/pins';
import { addPinClass, usePinClasses } from '../collab/pinClasses';
import { seedColorLegendDefaults } from '../collab/colorLegend';
import { useXAxisItems } from '../collab/xAxisItems';
import {
  chartRect,
  snapXToFactor,
} from '../plugins/chartCanvas/geometry';
import { zoneCentroid, hitTestZone } from '../canvas/hitTest';
import { useSelection, type Selection } from '../state/selection';
import { useStickyClipboard } from '../state/stickyClipboard';
import { usePinClipboard } from '../state/pinClipboard';
import { useActiveClass } from '../state/activeClass';
import { useActiveStickyColor } from '../state/activeStickyColor';
import { effectiveObjectTypes } from '@pingarden/shared';
import { ProjectSidebar } from '../workspace/ProjectSidebar';
import { CanvasToolbar } from '../workspace/CanvasToolbar';
import { Inspector } from '../workspace/Inspector';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { LightboxRoot } from '../components/Lightbox';
import { ReadOnlyBanner } from '../components/ReadOnlyBanner';
import { useUiPrefs } from '../state/uiPrefs';
import { StoryWorkspace } from '../story/StoryWorkspace';
import { libraryApi } from '../api/library';

/**
 * `true` when the keystroke should be left to the browser's native text
 * editing — used to gate workspace-level shortcuts (Cmd+C/V/X, Delete)
 * so they don't hijack typing inside any of the app's textareas / inputs
 * (sticky inline editor, sticky inspector, project name field, etc.).
 */
function isEditableTarget(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT') return true;
  if ((el as HTMLElement).isContentEditable) return true;
  return false;
}

/**
 * Pick the i18n key for the right-aside header title slot, given the
 * current selection and the canvas-level tab. Centralised here (instead
 * of inside Inspector.tsx) because the title renders in the aside
 * header, alongside the ⓘ ⚙ icons — outside the Inspector body.
 *
 * pinClass / stickyColor selections both correspond to "the user is
 * editing canvas-level config, focused on a specific row" — they share
 * the canvasConfig title because the body IS the config view scrolled
 * to that row.
 */
function inspectorTitleKey(
  selection: Selection,
  tab: 'intro' | 'config',
): string {
  switch (selection.kind) {
    case 'project':
      return 'inspector.title.project';
    case 'block':
      return 'inspector.title.block';
    case 'sticky':
      return 'inspector.title.sticky';
    case 'pin':
      return 'inspector.title.pin';
    case 'pinClass':
    case 'stickyColor':
      return 'inspector.title.canvasConfig';
    case 'canvas':
    case 'none':
    default:
      return tab === 'config'
        ? 'inspector.title.canvasConfig'
        : 'inspector.title.canvasIntro';
  }
}

/**
 * 3-column workspace shell:
 *   ┌── ProjectSidebar ──┬── CanvasToolbar + CanvasRenderer ──┬── Inspector ──┐
 *   └────────────────────┴────────────────────────────────────┴───────────────┘
 *
 * Routes that hit this page:
 *   /p/:projectId
 *   /p/:projectId/c/:canvasId
 *   /p/:projectId/s/:storyId
 */
export function ProjectWorkspacePage() {
  const { t, i18n } = useTranslation();
  const { projectId, canvasId, storyId } = useParams<{
    projectId: string;
    canvasId?: string;
    storyId?: string;
  }>();
  const navigate = useNavigate();
  const { identity } = useIdentity();

  const [project, setProject] = useState<Project | null>(null);
  const [canvases, setCanvases] = useState<CanvasMeta[]>([]);
  const [stories, setStories] = useState<StoryMeta[]>([]);
  const [activeCanvas, setActiveCanvas] = useState<CanvasMeta | null>(null);
  const [activeStory, setActiveStory] = useState<StoryMeta | null>(null);
  const [bundle, setBundle] = useState<{
    def: CanvasDef;
    i18n: CanvasI18n;
    knowledge: CanvasKnowledge;
  } | null>(null);
  /** All canvas-def summaries — used by the Inspector to label related-canvas chips. */
  const [defSummaries, setDefSummaries] = useState<CanvasDefSummary[]>([]);

  /**
   * Bilingual case-library metadata (name + summary) for the active
   * project, ONLY when the project is a library case. Lazily fetched
   * via `libraryApi.get(slug)` once per project load. Lets us swap
   * `Project.name` (single-string, English-only on the bundle) for
   * `case.companyName[lang]` in every surface that displays the
   * project header (sidebar, inspector). User projects keep
   * `caseEntry === null` and the surfaces fall back to `project.name`
   * unchanged.
   */
  const [caseEntry, setCaseEntry] = useState<CaseLibraryEntry | null>(null);

  // Confirm dialogs
  const [pendingDeleteCanvas, setPendingDeleteCanvas] = useState<CanvasMeta | null>(null);
  const [pendingDeleteStory, setPendingDeleteStory] = useState<StoryMeta | null>(null);

  const clearSelection = useSelection((s) => s.clear);
  const selectProject = useSelection((s) => s.selectProject);
  const selectCanvas = useSelection((s) => s.selectCanvas);
  const selection = useSelection((s) => s.selection);
  const rightCollapsed = useUiPrefs((s) => s.rightInspectorCollapsed);
  const toggleRight = useUiPrefs((s) => s.toggleRightInspector);
  const rightTab = useUiPrefs((s) => s.rightInspectorTab);
  const setRightTab = useUiPrefs((s) => s.setRightInspectorTab);
  const setRightCollapsed = useUiPrefs((s) => s.setRightInspectorCollapsed);

  /**
   * Click handler for the always-visible ⓘ / ⚙ tab icons. Always:
   *   1. Set the desired tab on uiPrefs.
   *   2. Drop selection back to canvas-level so the body actually shows
   *      the canvas knowledge / config view (not whatever sticky / pin
   *      / block was previously selected).
   *   3. If currently collapsed, expand.
   *
   * The pinClass selection is *also* a config-tab body, so a click on
   * ⚙ while pinClass is selected just clears the selection (canvas tab
   * shows the regular config layout without scrollToClassId).
   */
  function pickInspectorTab(tab: 'intro' | 'config') {
    setRightTab(tab);
    selectCanvas();
    if (rightCollapsed) setRightCollapsed(false);
  }

  // True when the active project is a library case (read-only). Server
  // already returns 403 on any write to a library canvas; this flag is
  // the *UI* mirror — disable every editing affordance so the user
  // doesn't waste effort dragging a sticky that won't save. Source of
  // truth lives on `project.source` (synthesized by BundleStorage).
  const readOnly = project?.source === 'library';

  // ── Library projects: per-language sidebar filter ─────────────────
  // The case library ships canvases with a per-canvas `language` field
  // (the bilingual workaround until sticky.text becomes a localised
  // string). When the user opens a library project we want the
  // workspace to feel single-language: only show the canvases / stories
  // matching the active UI language. Forks become regular user
  // projects (`source === 'user'`) so this filter never fires for
  // them — user projects can mix EN / ZH freely.
  //
  // Single-language cases (e.g. wechat-private-domain when EN content
  // doesn't exist yet) fall back to showing everything they ship —
  // see `langFallbackActive` for the small banner that explains.
  //
  // Declared up here (instead of further down with the rest of the
  // memos) because the route-effect below pins the URL's
  // `:canvasId` / `:storyId` against the *filtered* list so a deep
  // link to a hidden language redirects to the user's active-lang
  // first item.
  const liveLang: Lang = i18n.language === 'zh' ? 'zh' : 'en';
  const filteredCanvases = useMemo(() => {
    if (!readOnly) return canvases;
    const matched = canvases.filter((c) => c.language === liveLang);
    return matched.length > 0 ? matched : canvases;
  }, [canvases, readOnly, liveLang]);
  const filteredStories = useMemo(() => {
    if (!readOnly) return stories;
    // Older library stories (pre-language-tagging) have no `language`
    // field — when nothing matches the active UI lang, fall back to
    // showing every available story rather than an empty list.
    const matched = stories.filter((s) => s.language === liveLang);
    return matched.length > 0 ? matched : stories;
  }, [stories, readOnly, liveLang]);

  // ── Library-case bilingual metadata fetch ─────────────────────────
  // Library projects are synthesised by BundleStorage with
  // `project.name = caseJson.companyName.en` (single-string, see
  // apps/server/src/storage/BundleStorage.ts:318-327). The bilingual
  // version lives on `case.json.companyName: LocalizedLabel` and
  // `case.json.summary: LocalizedLabel`. Fetch the case detail once
  // per project load and stash on `caseEntry`; the `displayProject`
  // memo below swaps in the language-matching strings so every
  // sidebar / inspector surface naturally renders the right language.
  // Network failure leaves `caseEntry === null`, so surfaces fall
  // back to `project.name` (English) — graceful degradation.
  useEffect(() => {
    let cancelled = false;
    if (!readOnly || !project?.companySlug || !identity) {
      setCaseEntry(null);
      return;
    }
    libraryApi
      .get(project.companySlug, identity.displayName)
      .then((detail) => {
        if (!cancelled) setCaseEntry(detail.case);
      })
      .catch(() => {
        if (!cancelled) setCaseEntry(null);
      });
    return () => {
      cancelled = true;
    };
  }, [readOnly, project?.companySlug, identity]);

  /**
   * Project shape rendered everywhere: identical to `project` for
   * user projects; for library cases we splice in the bilingual
   * `companyName` / `summary` from the case-library entry so the
   * sidebar header + right "项目" inspector tab follow the language
   * switcher. The Project type itself stays single-language — only
   * the strings we display are swapped.
   *
   * Computed below the `if (!project)` early return so `project` is
   * already narrowed to non-null. Skipping `useMemo` here is fine —
   * the work is one object spread and two lookups, and React's
   * shallow prop equality means children only re-render on actual
   * `name`/`description` changes (caseEntry / lang flips).
   */
  // (defined further down, after the null guard at `if (!project)`).
  /**
   * `true` when the workspace is showing a library case in the wrong
   * language — i.e. the case ships content but none of it is tagged
   * with the user's active UI language. Drives the small fallback
   * notice under the read-only banner. We compare against the *raw*
   * canvases list so the notice survives the fallback substitution
   * inside `filteredCanvases` (which would otherwise hide the
   * mismatch).
   */
  const langFallbackActive = useMemo(() => {
    if (!readOnly) return false;
    if (canvases.length === 0) return false;
    return !canvases.some((c) => c.language === liveLang);
  }, [readOnly, canvases, liveLang]);
  /**
   * The single language a fallback case is actually available in
   * (used in the notice copy). Returns the most common foreign
   * language across the case's canvases — typically just one.
   */
  const fallbackAvailableLang = useMemo<Lang | null>(() => {
    if (!langFallbackActive) return null;
    const counts: Partial<Record<Lang, number>> = {};
    for (const c of canvases) {
      if (c.language === 'en' || c.language === 'zh') {
        counts[c.language] = (counts[c.language] ?? 0) + 1;
      }
    }
    let best: Lang | null = null;
    let bestN = 0;
    for (const k of ['en', 'zh'] as Lang[]) {
      const n = counts[k] ?? 0;
      if (n > bestN) {
        bestN = n;
        best = k;
      }
    }
    return best;
  }, [langFallbackActive, canvases]);

  // Load the canvas-defs summary list once. Used to localise the
  // "Pairs with" chip labels in the Inspector for canvas types that
  // aren't the active one (and therefore aren't in `bundle`).
  useEffect(() => {
    let cancelled = false;
    api.listDefs().then((list) => {
      if (!cancelled) setDefSummaries(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Load project + its canvases.
  useEffect(() => {
    if (!projectId || !identity) return;
    let cancelled = false;
    Promise.all([
      projectsApi.get(projectId, identity.displayName),
      projectsApi.listCanvases(projectId, identity.displayName),
      storiesApi.list(projectId, identity.displayName),
    ])
      .then(([p, list, storyList]) => {
        if (cancelled) return;
        setProject(p);
        setCanvases(list);
        setStories(storyList);
      })
      .catch(() => {
        if (cancelled) return;
        navigate('/');
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, identity, navigate]);

  // Choose the active canvas: explicit param > most recently updated > none.
  // For BARE project URLs (no canvasId, no storyId), prefer to land on
  // the first story when one exists — case-library cases ship with
  // curated narrative, and even user projects with a story usually
  // benefit from the "reading first" entry point. Only fall back to
  // first canvas when the project has no stories.
  useEffect(() => {
    if (storyId) {
      setActiveCanvas(null);
      return;
    }
    if (canvasId) {
      if (filteredCanvases.length === 0) {
        setActiveCanvas(null);
        return;
      }
      const m = filteredCanvases.find((c) => c.id === canvasId);
      setActiveCanvas(m ?? filteredCanvases[0] ?? null);
      // Auto-redirect if URL points to a missing canvas, or to one
      // hidden by the per-language filter (e.g. user toggles the lang
      // switcher while sitting on an EN canvas of a bilingual library
      // case — pin to the first ZH canvas instead).
      if (!m && filteredCanvases[0] && projectId) {
        navigate(`/p/${projectId}/c/${filteredCanvases[0].id}`, { replace: true });
      }
      return;
    }
    // Bare project URL — pick a default landing.
    // Prefer first story (story-first reading flow). Falls back to
    // first canvas if there are no stories. If the project has
    // neither, leave both null so the workspace shows its empty
    // state.
    if (filteredStories.length > 0 && projectId) {
      navigate(`/p/${projectId}/s/${filteredStories[0]!.id}`, { replace: true });
      setActiveCanvas(null);
      return;
    }
    if (filteredCanvases.length > 0) {
      const first = filteredCanvases[0]!;
      setActiveCanvas(first);
      if (projectId) navigate(`/p/${projectId}/c/${first.id}`, { replace: true });
      return;
    }
    setActiveCanvas(null);
  }, [filteredCanvases, filteredStories, canvasId, storyId, projectId, navigate]);

  useEffect(() => {
    if (!storyId) {
      setActiveStory(null);
      return;
    }
    const s = filteredStories.find((item) => item.id === storyId);
    setActiveStory(s ?? null);
    if (!s && filteredStories.length > 0 && projectId) {
      navigate(`/p/${projectId}/s/${filteredStories[0]!.id}`, { replace: true });
    }
  }, [filteredStories, storyId, projectId, navigate]);

  // When the active canvas changes, default the right inspector to "this
  // canvas type's knowledge" view. Clicking a sticky/block on the canvas
  // overrides this with sticky/block selection. Clicking the project node
  // in the sidebar (or pressing Esc) drops back to project info.
  useEffect(() => {
    if (activeCanvas) selectCanvas();
    else clearSelection();
  }, [activeCanvas?.id, activeStory?.id, selectCanvas, clearSelection]);

  const lang = useMemo<Lang>(() => (i18n.language as Lang) ?? 'en', [i18n.language]);

  // Load the canvas def + i18n for the active canvas. We resolve labels
  // against the LIVE UI language (i18n.language) — not activeCanvas.language,
  // which only reflects the locale at creation time and would otherwise
  // freeze the canvas in the wrong language after the user toggles the
  // language switcher.
  useEffect(() => {
    if (!activeCanvas) {
      setBundle(null);
      return;
    }
    let cancelled = false;
    api.getDef(activeCanvas.defId).then((b) => {
      if (cancelled) return;
      setBundle({
        def: b.def,
        i18n: b.i18n[lang],
        knowledge: b.knowledge[lang] ?? {},
      });
    });
    return () => {
      cancelled = true;
    };
  }, [activeCanvas, lang]);

  const { doc, ready } = useYDoc(activeCanvas?.id, identity?.displayName ?? '');
  const stickies = useStickies(doc ?? null);
  const pinClasses = usePinClasses(doc ?? null);
  const pins = usePins(doc ?? null);
  const factors = useXAxisItems(doc ?? null);
  const activeClassId = useActiveClass((s) => s.activeClassId);
  const clearActiveClass = useActiveClass((s) => s.clearActive);
  const activeStickyColor = useActiveStickyColor((s) => s.activeStickyColor);
  const clearActiveStickyColor = useActiveStickyColor((s) => s.clearActive);
  const selectPin = useSelection((s) => s.selectPin);
  const selectPinClass = useSelection((s) => s.selectPinClass);

  // Reset both paint modes on canvas switch — stale draw modes from a
  // different canvas would be confusing. Also drop the right inspector
  // back to the Intro tab so a stale "edit pin class" / "edit factor"
  // view doesn't carry over to the new canvas (the new canvas's
  // factors / classes / Y-axis are completely separate state).
  useEffect(() => {
    clearActiveClass();
    clearActiveStickyColor();
    useUiPrefs.getState().setRightInspectorTab('intro');
  }, [activeCanvas?.id, clearActiveClass, clearActiveStickyColor]);

  useEffect(() => {
    if (!doc || !bundle?.def.defaultColorLegend) return;
    seedColorLegendDefaults(doc, bundle.def.defaultColorLegend, lang);
  }, [doc, bundle?.def.id, bundle?.def.defaultColorLegend, lang]);

  // Workspace-level keyboard shortcuts.
  //
  // - Esc                            → clear selection (existing)
  // - Delete / Backspace             → delete the selected sticky
  // - Cmd/Ctrl + C                   → copy the selected sticky to the in-app buffer
  // - Cmd/Ctrl + V                   → paste from the buffer
  // - Cmd/Ctrl + X                   → cut (copy + delete)
  //
  // All four data-mutating shortcuts are gated behind `isEditableTarget`
  // so they NEVER intercept native browser cut/copy/paste while the user
  // is typing in any input/textarea/contentEditable. Selecting a sticky
  // does NOT auto-focus the inspector textarea (StickyInspector blurs
  // its own field when selection changes), so by default these shortcuts
  // operate on the sticky as an OBJECT. Editing text is opt-in: click
  // into the inspector textarea, or double-click the sticky on the
  // canvas to enter the inline editor.
  useEffect(() => {
    if (!doc) {
      // No active canvas → only Esc is meaningful.
      function onKeyEsc(e: KeyboardEvent) {
        if (e.key === 'Escape') clearSelection();
      }
      window.addEventListener('keydown', onKeyEsc);
      return () => window.removeEventListener('keydown', onKeyEsc);
    }

    function onKey(e: KeyboardEvent) {
      // Esc is intentionally NOT focus-gated — pressing it inside a
      // textarea blurs the editor (handled by Sticky.tsx for the inline
      // editor, native behavior for the inspector). At the workspace
      // level we additionally clear selection AND any active paint
      // tool so the canvas drops back to navigate mode in one tap.
      if (e.key === 'Escape') {
        clearSelection();
        useActiveClass.getState().clearActive();
        useActiveStickyColor.getState().clearActive();
        return;
      }

      // Everything below is for "the user is navigating the canvas",
      // not "the user is typing." Defer to native shortcuts otherwise.
      if (isEditableTarget(document.activeElement)) return;

      const cmd = e.metaKey || e.ctrlKey;
      const sel = useSelection.getState().selection;

      if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        sel.kind === 'sticky'
      ) {
        // Library cases are read-only — block destructive shortcuts so
        // the user gets no partial UI animation that the server is
        // about to reject anyway.
        if (readOnly) return;
        e.preventDefault();
        deleteSticky(doc!, sel.stickyId);
        useSelection.getState().clear();
        return;
      }

      if (cmd && (e.key === 'c' || e.key === 'C') && sel.kind === 'sticky') {
        // Cmd-C is a *read* — store the sticky in our in-memory
        // clipboard so the user can paste it into one of their own
        // editable projects. We deliberately do NOT gate this on
        // `readOnly`: copying out of the library is a useful flow.
        const sticky = stickies.find((s) => s.id === sel.stickyId);
        if (!sticky) return;
        e.preventDefault();
        useStickyClipboard.getState().set({
          text: sticky.text,
          color: sticky.color,
          sourceZoneId: sticky.zoneId,
          sourceX: sticky.x,
          sourceY: sticky.y,
        });
        return;
      }

      if (cmd && (e.key === 'x' || e.key === 'X') && sel.kind === 'sticky') {
        if (readOnly) return; // cut = copy + delete; the delete half is forbidden
        const sticky = stickies.find((s) => s.id === sel.stickyId);
        if (!sticky) return;
        e.preventDefault();
        useStickyClipboard.getState().set({
          text: sticky.text,
          color: sticky.color,
          sourceZoneId: sticky.zoneId,
          sourceX: sticky.x,
          sourceY: sticky.y,
        });
        deleteSticky(doc!, sticky.id);
        useSelection.getState().clear();
        return;
      }

      if (cmd && (e.key === 'v' || e.key === 'V')) {
        if (readOnly) return; // paste creates a new sticky / pin — forbidden
        // Sticky paste runs only when there's a sticky in the clipboard
        // AND the canvas has zones AND the user isn't actively focused
        // on a pin. If any of those don't hold we fall through to the
        // pin paste handler below — without that, a user who has only
        // ever copied a pin would see ⌘+V do nothing because this
        // branch used to `return` on a null sticky entry.
        const entry = useStickyClipboard.getState().entry;
        const def = bundle?.def;
        const stickyApplies =
          entry &&
          def &&
          def.zones.length > 0 &&
          // When a pin is the active selection, the user almost
          // certainly wants pin behaviour — let pin paste take it.
          sel.kind !== 'pin';
        if (stickyApplies) {
          let zoneId: string;
          let x: number;
          let y: number;

          if (sel.kind === 'block') {
            // Paste into the selected zone — match BlockInspector "+ Add
            // sticky" geometry so keyboard and mouse paths feel identical.
            const zone = def.zones.find((z) => z.id === sel.zoneId);
            if (!zone) return;
            const c = zoneCentroid(zone.shape);
            zoneId = zone.id;
            x = c.x + (Math.random() - 0.5) * 60;
            y = c.y + (Math.random() - 0.5) * 40;
          } else if (sel.kind === 'sticky') {
            // Paste near the currently-selected sticky in its zone — keeps
            // the new clone visually anchored to the user's last action.
            const anchor = stickies.find((s) => s.id === sel.stickyId);
            if (!anchor) return;
            zoneId = anchor.zoneId;
            x = anchor.x + 24;
            y = anchor.y + 24;
          } else {
            // Nothing relevant selected (canvas / project / none).
            // Try the source zone of the buffered sticky; fall back to the
            // active canvas's first zone so cross-canvas paste still works.
            const zone =
              def.zones.find((z) => z.id === entry.sourceZoneId) ?? def.zones[0]!;
            const sameZone = zone.id === entry.sourceZoneId;
            zoneId = zone.id;
            if (sameZone) {
              // Same zone we copied from → small offset from the source.
              x = entry.sourceX + 24;
              y = entry.sourceY + 24;
            } else {
              // Different canvas — drop at zone centroid + jitter.
              const c = zoneCentroid(zone.shape);
              x = c.x + (Math.random() - 0.5) * 60;
              y = c.y + (Math.random() - 0.5) * 40;
            }
          }

          e.preventDefault();
          const newId = addSticky(doc!, {
            zoneId,
            x,
            y,
            text: entry.text,
            color: entry.color,
            authorName: identity!.displayName,
          });
          useSelection.getState().selectSticky(newId);
          return;
        }
        // Sticky branch didn't apply — fall through to the pin paste
        // handler below. No `return` here.
      }

      // ── Pin paths — parallel to sticky shortcuts above ──────────────

      if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        sel.kind === 'pin'
      ) {
        if (readOnly) return;
        e.preventDefault();
        removePin(doc!, sel.pinId);
        useSelection.getState().clear();
        return;
      }

      if (cmd && (e.key === 'c' || e.key === 'C') && sel.kind === 'pin') {
        // Read-only — copying a pin out of the library is fine.
        const pin = pins.find((p) => p.id === sel.pinId);
        if (!pin) return;
        e.preventDefault();
        usePinClipboard.getState().set({
          classId: pin.classId,
          ...(pin.label ? { label: pin.label } : {}),
          ...(pin.body ? { body: pin.body } : {}),
          sourceX: pin.x,
          sourceY: pin.y,
        });
        return;
      }

      if (cmd && (e.key === 'x' || e.key === 'X') && sel.kind === 'pin') {
        if (readOnly) return; // cut on a library pin would delete; forbidden
        const pin = pins.find((p) => p.id === sel.pinId);
        if (!pin) return;
        e.preventDefault();
        usePinClipboard.getState().set({
          classId: pin.classId,
          ...(pin.label ? { label: pin.label } : {}),
          ...(pin.body ? { body: pin.body } : {}),
          sourceX: pin.x,
          sourceY: pin.y,
        });
        removePin(doc!, pin.id);
        useSelection.getState().clear();
        return;
      }

      if (cmd && (e.key === 'v' || e.key === 'V')) {
        if (readOnly) return; // pin paste would create a new pin — forbidden
        // Pin paste fires when sticky paste didn't apply (no sticky
        // entry / no pin selected combo above didn't hit `return`).
        const entry = usePinClipboard.getState().entry;
        if (!entry) return;
        // Class may have been deleted since copy — silently no-op.
        if (!pinClasses.some((c) => c.id === entry.classId)) return;
        const baseX =
          sel.kind === 'pin'
            ? pins.find((p) => p.id === sel.pinId)?.x ?? entry.sourceX
            : entry.sourceX;
        const baseY =
          sel.kind === 'pin'
            ? pins.find((p) => p.id === sel.pinId)?.y ?? entry.sourceY
            : entry.sourceY;
        e.preventDefault();
        const newId = addPin(doc!, {
          classId: entry.classId,
          x: baseX + 24,
          y: baseY + 24,
          ...(entry.label ? { label: entry.label } : {}),
          ...(entry.body ? { body: entry.body } : {}),
          authorName: identity!.displayName,
        });
        useSelection.getState().selectPin(newId);
        // Keep clipboard for repeat ⌘+V; advance source coords so the
        // next paste lands further along.
        usePinClipboard.getState().set({
          ...entry,
          sourceX: baseX + 24,
          sourceY: baseY + 24,
        });
        return;
      }

      // ── Number keys 1..9: switch active pin class ───────────────────
      if (!cmd && e.key >= '1' && e.key <= '9') {
        const idx = Number(e.key) - 1;
        const target = pinClasses[idx];
        if (target) {
          e.preventDefault();
          useActiveClass.getState().pickClass(target.id);
        }
        return;
      }
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [doc, stickies, pins, pinClasses, bundle, identity, clearSelection, readOnly]);

  if (!identity || !projectId) return null;
  if (!project) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-500">
        Loading…
      </div>
    );
  }

  // Bilingual project header: for library cases, replace the
  // single-string `Project.name` / `Project.description` (which
  // BundleStorage seeded from `case.companyName.en`) with the active
  // UI language's version pulled from the case-library detail. User
  // projects (`caseEntry === null`) pass through unchanged. See the
  // `caseEntry` fetch effect above.
  const displayProject: Project = caseEntry
    ? {
        ...project,
        name:
          caseEntry.companyName[liveLang] ||
          caseEntry.companyName.en ||
          project.name,
        description:
          caseEntry.summary[liveLang] ||
          caseEntry.summary.en ||
          project.description,
      }
    : project;

  async function handleAddCanvas(defId: string) {
    if (!project || !identity) return;
    const defaultTitle =
      lang === 'zh'
        ? `未命名 · ${new Date().toLocaleDateString('zh-CN')}`
        : `Untitled · ${new Date().toLocaleDateString('en-US')}`;
    const c = await api.createCanvas(
      { projectId: project.id, defId, title: defaultTitle, language: lang },
      identity.displayName,
    );
    setCanvases((prev) => [c, ...prev]);
    navigate(`/p/${project.id}/c/${c.id}`);
  }

  async function handleDeleteCanvas(c: CanvasMeta) {
    if (!identity || !project) return;
    await api.deleteCanvas(c.id, identity.displayName);
    setCanvases((prev) => prev.filter((x) => x.id !== c.id));
    if (activeCanvas?.id === c.id) {
      // Pick another canvas in the project, or land on project root.
      const fallback = canvases.find((x) => x.id !== c.id);
      if (fallback) navigate(`/p/${project.id}/c/${fallback.id}`, { replace: true });
      else navigate(`/p/${project.id}`, { replace: true });
    }
    setPendingDeleteCanvas(null);
  }

  async function handleAddStory() {
    if (!project || !identity) return;
    const created = await storiesApi.create(
      {
        projectId: project.id,
        title: t('story.untitled'),
        content: `# ${t('story.untitled')}\n\n`,
        status: 'draft',
        contentDatePrecision: 'month',
      },
      identity.displayName,
    );
    const { content: _content, ...meta } = created;
    setStories((prev) => [meta, ...prev]);
    navigate(`/p/${project.id}/s/${created.id}`);
  }

  async function handleDeleteStory(s: StoryMeta) {
    if (!identity || !project) return;
    await storiesApi.delete(s.id, identity.displayName);
    setStories((prev) => prev.filter((x) => x.id !== s.id));
    if (activeStory?.id === s.id) {
      const fallback = stories.find((x) => x.id !== s.id);
      if (fallback) navigate(`/p/${project.id}/s/${fallback.id}`, { replace: true });
      else if (canvases[0]) navigate(`/p/${project.id}/c/${canvases[0].id}`, { replace: true });
      else navigate(`/p/${project.id}`, { replace: true });
    }
    setPendingDeleteStory(null);
  }

  function handleStoryUpdated(s: StoryMeta) {
    setStories((prev) => prev.map((item) => (item.id === s.id ? s : item)));
    setActiveStory(s);
  }

  async function handleProjectPatch(patch: {
    name?: string;
    description?: string;
  }) {
    if (!identity || !project) return;
    const updated = await projectsApi.update(project.id, patch, identity.displayName);
    setProject(updated);
  }

  async function handleProjectDelete() {
    if (!identity || !project) return;
    await projectsApi.delete(project.id, identity.displayName);
    navigate('/');
  }

  /**
   * Banner Fork CTA — deep-copy the library case into the user's own
   * project list and navigate to the new project. We honour the user's
   * current UI language: an EN user gets an EN-only fork, a ZH user
   * gets a ZH-only fork. The slug + lang are produced by the banner
   * (which itself is derived from `project.companySlug` + the same
   * `lang` we pass in below).
   */
  async function handleForkLibraryCase(slug: string, forkLang: Lang) {
    if (!identity) return;
    const result = await libraryApi.fork(slug, identity.displayName, forkLang);
    navigate(`/p/${result.project.id}`);
  }

  return (
    <div className="flex h-full flex-col">
      {readOnly && (
        <ReadOnlyBanner
          companySlug={project.companySlug}
          lang={lang}
          onFork={handleForkLibraryCase}
        />
      )}
      {langFallbackActive && fallbackAvailableLang && (
        // Lighter strip beneath the read-only banner, fired only when
        // the case has zero canvases tagged with the active UI lang
        // (typically: single-language cases like wechat-private-domain
        // before its EN translation lands). The user still sees the
        // case content via the fallback inside `filteredCanvases`;
        // this strip just explains why nothing flipped over when they
        // toggled the language switcher.
        <div className="border-b border-amber-100 bg-amber-50/60 px-6 py-2 text-xs text-amber-800">
          {t('library.langFallbackNotice', {
            availableLang: t(`language.${fallbackAvailableLang}`),
          })}
        </div>
      )}
      <div className="flex min-h-0 flex-1">
        <ProjectSidebar
        project={displayProject}
        canvases={filteredCanvases}
        stories={filteredStories}
        activeCanvasId={activeCanvas?.id}
        activeStoryId={activeStory?.id}
        onSelect={(id) => navigate(`/p/${project.id}/c/${id}`)}
        onSelectStory={(id) => navigate(`/p/${project.id}/s/${id}`)}
        onSelectProject={selectProject}
        onAddCanvas={handleAddCanvas}
        onAddStory={handleAddStory}
        onDeleteCanvas={(c) => setPendingDeleteCanvas(c)}
        onDeleteStory={(s) => setPendingDeleteStory(s)}
        readOnly={readOnly}
      />

      <main className="flex flex-1 flex-col bg-stone-50">
        {activeStory ? (
          <StoryWorkspace
            storyId={activeStory.id}
            projectId={project.id}
            canvases={filteredCanvases}
            lang={lang}
            displayName={identity.displayName}
            onStoryUpdated={handleStoryUpdated}
            readOnly={readOnly}
          />
        ) : activeCanvas ? (
          <>
            <CanvasToolbar
              canvas={activeCanvas}
              projectId={project.id}
              displayName={identity.displayName}
              readOnly={readOnly}
              onRename={async (title) => {
                const updated = await api.updateCanvas(
                  activeCanvas.id,
                  { title },
                  identity.displayName,
                );
                setCanvases((prev) =>
                  prev.map((c) => (c.id === updated.id ? updated : c)),
                );
                setActiveCanvas(updated);
              }}
            />
            <div className="flex-1 overflow-hidden p-3">
              <div className="relative flex h-full w-full flex-col rounded-lg bg-white shadow-sm">
                {ready && doc ? (
                  <>
                    {/* Top legend strip — fixed 56px header that
                        permanently reserves room for the pin/sticky
                        legend chips. Previously these palettes floated
                        as `position: absolute` over the SVG, which
                        meant zooming the canvas pushed canvas content
                        UNDER them and the chips obscured stickies near
                        the top edge. The strip approach trades a bit
                        of vertical canvas space for legends that
                        can never be overlapped at any zoom level.
                        Empty pin-class section (BMC etc.) still
                        reserves the space — keeps layout stable across
                        canvases. */}
                    <div className="relative flex h-14 flex-shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-3">
                      <div className="flex min-w-0 items-center">
                        {bundle?.def &&
                          effectiveObjectTypes(bundle.def).includes('pinClass') && (
                            <LegendPalette
                              doc={doc}
                              displayName={identity.displayName}
                              lang={lang}
                              readOnly={readOnly}
                            />
                          )}
                      </div>
                      {/* Sticky color legend — every canvas allows
                          stickies, so this overlay is unconditional. */}
                      <div className="flex min-w-0 items-center">
                        <StickyLegendPalette
                          doc={doc}
                          lang={lang}
                          readOnly={readOnly}
                        />
                      </div>
                    </div>
                    <div className="relative flex-1 overflow-hidden">
                      <CanvasRenderer
                      defId={activeCanvas.defId}
                      lang={lang}
                      doc={doc}
                      displayName={identity.displayName}
                      onCanvasClick={
                        // Two paint modes share this slot. Pin paint
                        // wins if both somehow active (the active*
                        // stores enforce mutual exclusion, but be
                        // defensive). Both modes auto-exit when the
                        // click lands outside any zone — clicking on
                        // the canvas chrome (Y-axis labels, factor
                        // strip, gutters between blocks) is the user's
                        // way to say "I'm done painting" without
                        // having to hit Esc or the exit button.
                        // Library cases are read-only — the LegendPalette
                        // will refuse to enter paint mode (Step 7), but
                        // belt-and-suspenders: even if `activeClassId`
                        // somehow gets set, swallow the click here so
                        // no pin / sticky writes leak through.
                        readOnly
                          ? undefined
                          : activeClassId && doc
                          ? (p) => {
                              if (!bundle?.def) return;
                              // Auto-exit when out of zone — better
                              // than clamping a pin to the chart edge
                              // where the user clearly didn't intend
                              // it. clearActiveClass also drops the
                              // chip's visual highlight.
                              const zone = hitTestZone(
                                bundle.def.zones,
                                p.x,
                                p.y,
                              );
                              if (!zone) {
                                clearActiveClass();
                                return;
                              }
                              // 1. Clamp to drawable area first so a
                              //    chart-canvas click still respects
                              //    the inner rect (Y-axis is fine but
                              //    a click overshoot through the chart
                              //    rect's edge gets pulled in).
                              const c = clampPointToCanvas(p, bundle.def);
                              // 2. X-snap on chart-canvas only.
                              let { x } = c;
                              if (bundle.def.plugin === 'chart-canvas') {
                                const rect = chartRect(bundle.def.viewBox);
                                x = snapXToFactor(c.x, rect, factors.length);
                              }
                              const newId = addPin(doc, {
                                classId: activeClassId,
                                x,
                                y: c.y,
                                authorName: identity!.displayName,
                              });
                              selectPin(newId);
                              // stay in draw mode for streak placement
                            }
                          : activeStickyColor && doc
                          ? (p) => {
                              if (!bundle?.def) return;
                              // Sticky must land in a real zone — the
                              // BlockInspector / Inspector dispatches by
                              // zoneId. Out-of-zone click → exit paint
                              // (was a silent no-op; now a deliberate
                              // exit so the chip highlight clears in
                              // sympathy with what the user expects).
                              const zone = hitTestZone(
                                bundle.def.zones,
                                p.x,
                                p.y,
                              );
                              if (!zone) {
                                clearActiveStickyColor();
                                return;
                              }
                              const newId = addSticky(doc, {
                                zoneId: zone.id,
                                x: p.x,
                                y: p.y,
                                color: activeStickyColor,
                                authorName: identity!.displayName,
                              });
                              useSelection.getState().selectSticky(newId);
                              // stay in paint mode for streak placement —
                              // user can keep clicking to drop more.
                            }
                          : undefined
                      }
                    >
                      {({ def, toSvgPoint }) => (
                        <>
                          <StickyLayer
                            doc={doc}
                            zones={def.zones}
                            toSvgPoint={toSvgPoint}
                            displayName={identity.displayName}
                            readonly={readOnly}
                          />
                          {effectiveObjectTypes(def).includes('pin') && (
                            <PinLayer
                              doc={doc}
                              def={def}
                              toSvgPoint={toSvgPoint}
                              snapX={
                                def.plugin === 'chart-canvas'
                                  ? (x) =>
                                      snapXToFactor(
                                        x,
                                        chartRect(def.viewBox),
                                        factors.length,
                                      )
                                  : undefined
                              }
                              readonly={readOnly}
                            />
                          )}
                        </>
                      )}
                    </CanvasRenderer>
                    </div>
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-gray-500">
                    Loading…
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            {t('workspace.selectCanvas')}
          </div>
        )}
      </main>

      {!activeStory && (
      <aside
        className={`flex h-full flex-shrink-0 flex-col border-l border-gray-200 bg-white transition-[width] duration-150 ${
          rightCollapsed ? 'w-[56px]' : 'w-[500px]'
        }`}
      >
        {rightCollapsed ? (
          // Collapsed: vertical icon strip — expand caret on top, then
          // ⓘ + ⚙. Each tab icon expands AND switches to its tab in
          // one click (`pickInspectorTab`). Caret just expands without
          // changing the tab.
          <div className="flex flex-col items-center pt-1">
            <button
              type="button"
              onClick={toggleRight}
              aria-label={t('workspace.expandInspector')}
              title={t('workspace.expandInspector')}
              className="flex h-10 w-[56px] items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-gray-900"
            >
              «
            </button>
            <div className="my-1 h-px w-8 bg-gray-200" />
            <InspectorTabIconButton
              icon="ⓘ"
              label={t('inspector.config.introTabTitle')}
              active={false /* nothing is active when collapsed */}
              onClick={() => pickInspectorTab('intro')}
            />
            <InspectorTabIconButton
              icon="⚙"
              label={t('inspector.config.configTabTitle')}
              active={false}
              onClick={() => pickInspectorTab('config')}
            />
          </div>
        ) : (
          <>
            <div className="flex h-12 items-center justify-between border-b border-gray-200 px-2">
              {/* Tab strip: ⓘ Intro / ⚙ Config — always visible. The
                  active highlight only lights up when the body is
                  actually showing the matching tab; with sticky/block/
                  pin/pinClass selection both icons stay idle so the
                  user can still navigate back to canvas-level. */}
              <div className="flex items-center gap-1">
                <InspectorTabIconButton
                  icon="ⓘ"
                  label={t('inspector.config.introTab')}
                  active={
                    (selection.kind === 'canvas' || selection.kind === 'none') &&
                    rightTab === 'intro'
                  }
                  onClick={() => pickInspectorTab('intro')}
                />
                <InspectorTabIconButton
                  icon="⚙"
                  label={t('inspector.config.configTab')}
                  active={
                    selection.kind === 'pinClass' ||
                    ((selection.kind === 'canvas' || selection.kind === 'none') &&
                      rightTab === 'config')
                  }
                  onClick={() => pickInspectorTab('config')}
                />
              </div>
              {/* Title slot — centred between the icon strip and the
                  collapse caret, announces the current inspector mode
                  ("画布说明" / "图钉编辑" / etc.). Uses min-w-0 +
                  truncate so a long localised title doesn't push the
                  caret off-screen on narrow viewports. */}
              <div className="min-w-0 flex-1 truncate px-3 text-center text-sm font-semibold text-gray-900">
                {t(inspectorTitleKey(selection, rightTab))}
              </div>
              <button
                type="button"
                onClick={toggleRight}
                aria-label={t('workspace.collapseInspector')}
                title={t('workspace.collapseInspector')}
                className="flex h-9 w-9 items-center justify-center rounded text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              >
                »
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <Inspector
                project={displayProject}
                canvasCount={canvases.length}
                doc={doc}
                def={bundle?.def ?? null}
                i18n={bundle?.i18n ?? null}
                knowledge={bundle?.knowledge ?? null}
                displayName={identity.displayName}
                projectCanvases={filteredCanvases}
                defNames={Object.fromEntries(defSummaries.map((d) => [d.id, d.name]))}
                onSwitchCanvas={(id) => navigate(`/p/${project.id}/c/${id}`)}
                onAddCanvas={handleAddCanvas}
                onProjectPatch={handleProjectPatch}
                onProjectDelete={handleProjectDelete}
                readOnly={readOnly}
              />
            </div>
          </>
        )}
      </aside>
      )}
      </div>

      <ConfirmDialog
        open={!!pendingDeleteCanvas}
        title={t('confirm.deleteCanvas')}
        message={t('confirm.deleteCanvasMsg', {
          title: pendingDeleteCanvas?.title ?? '',
        })}
        confirmLabel={t('confirm.delete')}
        cancelLabel={t('confirm.cancel')}
        danger
        onCancel={() => setPendingDeleteCanvas(null)}
        onConfirm={async () => {
          if (pendingDeleteCanvas) await handleDeleteCanvas(pendingDeleteCanvas);
        }}
      />

      <ConfirmDialog
        open={!!pendingDeleteStory}
        title={t('confirm.deleteStory')}
        message={t('confirm.deleteStoryMsg', {
          title: pendingDeleteStory?.title ?? '',
        })}
        confirmLabel={t('confirm.delete')}
        cancelLabel={t('confirm.cancel')}
        danger
        onCancel={() => setPendingDeleteStory(null)}
        onConfirm={async () => {
          if (pendingDeleteStory) await handleDeleteStory(pendingDeleteStory);
        }}
      />

      <LightboxRoot />
    </div>
  );
}

/**
 * Square icon button used by the right-aside tab strip. Identical
 * appearance in the collapsed (vertical) and expanded (horizontal)
 * layouts — only the surrounding flex direction changes. The active
 * state is a filled gray pill so the user can see at a glance which
 * tab the body is currently rendering.
 */
function InspectorTabIconButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`flex h-9 w-9 items-center justify-center rounded text-base leading-none transition ${
        active
          ? 'bg-gray-900 text-white'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      {icon}
    </button>
  );
}
