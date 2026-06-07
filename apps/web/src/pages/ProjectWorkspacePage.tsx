import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type {
  CanvasDef,
  CanvasI18n,
  CanvasMeta,
  ColorLegendEntry,
  Lang,
  Project,
} from '@pingarden/shared';
import { useTranslation } from 'react-i18next';
import { api, type CanvasDefSummary, type CanvasKnowledge } from '../api/client';
import { projectsApi } from '../api/projects';
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
import { useUiPrefs } from '../state/uiPrefs';

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
 */
export function ProjectWorkspacePage() {
  const { t, i18n } = useTranslation();
  const { projectId, canvasId } = useParams<{ projectId: string; canvasId?: string }>();
  const navigate = useNavigate();
  const { identity } = useIdentity();

  const [project, setProject] = useState<Project | null>(null);
  const [canvases, setCanvases] = useState<CanvasMeta[]>([]);
  const [activeCanvas, setActiveCanvas] = useState<CanvasMeta | null>(null);
  const [bundle, setBundle] = useState<{
    def: CanvasDef;
    i18n: CanvasI18n;
    knowledge: CanvasKnowledge;
  } | null>(null);
  /** All canvas-def summaries — used by the Inspector to label related-canvas chips. */
  const [defSummaries, setDefSummaries] = useState<CanvasDefSummary[]>([]);

  // Confirm dialogs
  const [pendingDeleteCanvas, setPendingDeleteCanvas] = useState<CanvasMeta | null>(null);

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
    ])
      .then(([p, list]) => {
        if (cancelled) return;
        setProject(p);
        setCanvases(list);
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
  useEffect(() => {
    if (canvases.length === 0) {
      setActiveCanvas(null);
      return;
    }
    if (canvasId) {
      const m = canvases.find((c) => c.id === canvasId);
      setActiveCanvas(m ?? canvases[0] ?? null);
      // Auto-redirect if URL points to a missing canvas.
      if (!m && canvases[0] && projectId) {
        navigate(`/p/${projectId}/c/${canvases[0].id}`, { replace: true });
      }
    } else {
      // No canvas specified — pick the first (most recently updated) and
      // update the URL so deep-links work.
      const first = canvases[0]!;
      setActiveCanvas(first);
      if (projectId) navigate(`/p/${projectId}/c/${first.id}`, { replace: true });
    }
  }, [canvases, canvasId, projectId, navigate]);

  // When the active canvas changes, default the right inspector to "this
  // canvas type's knowledge" view. Clicking a sticky/block on the canvas
  // overrides this with sticky/block selection. Clicking the project node
  // in the sidebar (or pressing Esc) drops back to project info.
  useEffect(() => {
    if (activeCanvas) selectCanvas();
    else clearSelection();
  }, [activeCanvas?.id, selectCanvas, clearSelection]);

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
        e.preventDefault();
        deleteSticky(doc!, sel.stickyId);
        useSelection.getState().clear();
        return;
      }

      if (cmd && (e.key === 'c' || e.key === 'C') && sel.kind === 'sticky') {
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
        e.preventDefault();
        removePin(doc!, sel.pinId);
        useSelection.getState().clear();
        return;
      }

      if (cmd && (e.key === 'c' || e.key === 'C') && sel.kind === 'pin') {
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
  }, [doc, stickies, pins, pinClasses, bundle, identity, clearSelection]);

  if (!identity || !projectId) return null;
  if (!project) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-500">
        Loading…
      </div>
    );
  }

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

  return (
    <div className="flex h-full">
      <ProjectSidebar
        project={project}
        canvases={canvases}
        activeCanvasId={activeCanvas?.id}
        onSelect={(id) => navigate(`/p/${project.id}/c/${id}`)}
        onSelectProject={selectProject}
        onAddCanvas={handleAddCanvas}
        onDeleteCanvas={(c) => setPendingDeleteCanvas(c)}
      />

      <main className="flex flex-1 flex-col bg-stone-50">
        {activeCanvas ? (
          <>
            <CanvasToolbar
              canvas={activeCanvas}
              projectId={project.id}
              displayName={identity.displayName}
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
              <div className="relative h-full w-full rounded-lg bg-white shadow-sm">
                {ready && doc ? (
                  <>
                    {bundle?.def &&
                      effectiveObjectTypes(bundle.def).includes('pinClass') && (
                        <LegendPalette
                          doc={doc}
                          displayName={identity.displayName}
                          lang={lang}
                        />
                      )}
                    {/* Sticky color legend — every canvas allows
                        stickies, so this overlay is unconditional. */}
                    <StickyLegendPalette doc={doc} lang={lang} />
                    {/* Sticky color legend — every canvas allows
                        stickies, so this overlay is unconditional. */}
                    <StickyLegendPalette doc={doc} lang={lang} />
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
                        activeClassId && doc
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
                            />
                          )}
                        </>
                      )}
                    </CanvasRenderer>
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
                project={project}
                canvasCount={canvases.length}
                doc={doc}
                def={bundle?.def ?? null}
                i18n={bundle?.i18n ?? null}
                knowledge={bundle?.knowledge ?? null}
                displayName={identity.displayName}
                projectCanvases={canvases}
                defNames={Object.fromEntries(defSummaries.map((d) => [d.id, d.name]))}
                onSwitchCanvas={(id) => navigate(`/p/${project.id}/c/${id}`)}
                onAddCanvas={handleAddCanvas}
                onProjectPatch={handleProjectPatch}
                onProjectDelete={handleProjectDelete}
              />
            </div>
          </>
        )}
      </aside>

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
