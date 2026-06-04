import type * as Y from 'yjs';
import { useTranslation } from 'react-i18next';
import type { CanvasDef, CanvasI18n, CanvasMeta, ColorLegendEntry, Lang, Project, StickyNote } from '@canvas-collab/shared';
import { effectiveObjectTypes } from '@canvas-collab/shared';
import { ProjectInspector } from './inspector/ProjectInspector';
import { BlockInspector } from './inspector/BlockInspector';
import { StickyInspector } from './inspector/StickyInspector';
import { CanvasKnowledgeInspector } from './inspector/CanvasKnowledgeInspector';
import { CanvasConfigInspector } from './inspector/CanvasConfigInspector';
import { LegendInspector } from './inspector/LegendInspector';
import { PinInspector } from './inspector/PinInspector';
import { useSelection } from '../state/selection';
import { useUiPrefs } from '../state/uiPrefs';
import { addSticky, deleteSticky, updateSticky, useStickies } from '../collab/stickies';
import { usePinClasses } from '../collab/pinClasses';
import { usePins } from '../collab/pins';
import { useXAxisItems } from '../collab/xAxisItems';
import { useChartConfig } from '../collab/chartConfig';
import { zoneCentroid } from '../canvas/hitTest';
import type { CanvasKnowledge } from '../api/client';

interface Props {
  project: Project;
  canvasCount: number;
  /** May be null if the project has no canvases yet. */
  doc: Y.Doc | null;
  def: CanvasDef | null;
  i18n: CanvasI18n | null;
  /** Bundled canvas-type knowledge for the active language. Null when no canvas is open. */
  knowledge: CanvasKnowledge | null;
  displayName: string;
  /** All canvases in this project — for the related-canvases chip strip. */
  projectCanvases: readonly CanvasMeta[];
  /** Localised def names keyed by defId — for the chip labels. */
  defNames: Record<string, Record<Lang, string>>;
  /** Switch the workspace's active canvas to a specific canvas id. */
  onSwitchCanvas: (canvasId: string) => void;
  /** Add a new canvas of the given def to the current project. */
  onAddCanvas: (defId: string) => void;
  onProjectPatch: (patch: {
    name?: string;
    description?: string;
    colorLegend?: Record<string, ColorLegendEntry>;
  }) => void;
  onProjectDelete: () => void;
}

/**
 * Right column. Switches between Project / Canvas-knowledge / Block /
 * Sticky panels based on the global selection state.
 *
 * Routing rules:
 *   - 'sticky' / 'block'  → their dedicated inspectors.
 *   - 'project'           → project inspector (explicit user intent —
 *                           the user clicked the project node in the
 *                           left sidebar).
 *   - 'canvas'            → canvas-knowledge inspector.
 *   - 'none'              → canvas-knowledge inspector when a canvas
 *                           is open (clicking empty area, pressing Esc,
 *                           or deleting the last selected sticky should
 *                           fall back to "this canvas's overview", NOT
 *                           jump out to project info). When no canvas
 *                           is open yet, falls through to project info.
 */
export function Inspector({
  project,
  canvasCount,
  doc,
  def,
  i18n,
  knowledge,
  displayName,
  projectCanvases,
  defNames,
  onSwitchCanvas,
  onAddCanvas,
  onProjectPatch,
  onProjectDelete,
}: Props) {
  const selection = useSelection((s) => s.selection);
  const clear = useSelection((s) => s.clear);
  const stickies = useStickies(doc ?? null);
  const pinClasses = usePinClasses(doc ?? null);
  const pins = usePins(doc ?? null);
  const factors = useXAxisItems(doc ?? null);
  const chartOverrides = useChartConfig(doc ?? null);
  const tab = useUiPrefs((s) => s.rightInspectorTab);
  const liveLang = useLiveLang();

  const renderProject = () => (
    <ProjectInspector
      project={project}
      canvasCount={canvasCount}
      onPatch={onProjectPatch}
      onDelete={onProjectDelete}
      relatedDefIds={def?.related ?? []}
      projectCanvases={projectCanvases}
      defNames={defNames}
      onSwitchCanvas={onSwitchCanvas}
      onAddCanvas={onAddCanvas}
    />
  );

  const renderCanvasKnowledge = () => {
    if (!def || !i18n || !knowledge) return null;
    return (
      <CanvasKnowledgeInspector
        def={def}
        i18n={i18n}
        knowledge={knowledge}
        projectCanvases={projectCanvases}
        defNames={defNames}
        onSwitchCanvas={onSwitchCanvas}
        onAddCanvas={onAddCanvas}
      />
    );
  };

  /**
   * The Config-tab body — Y-axis label editor + factor list (chart-canvas
   * only) + pin classes (every canvas). Returns null if the doc isn't
   * ready, so callers can chain `?? renderProject()` to keep a sensible
   * fallback while a fresh canvas is hydrating.
   */
  const renderCanvasConfig = (scrollToClassId?: string | null) => {
    if (!doc || !def) return null;
    return (
      <CanvasConfigInspector
        doc={doc}
        def={def}
        classes={pinClasses}
        factors={def.chart ? factors : undefined}
        yAxis={def.chart?.yAxis}
        overrides={chartOverrides}
        displayName={displayName}
        lang={liveLang}
        scrollToClassId={scrollToClassId ?? null}
      />
    );
  };

  // 'project' is the user explicitly clicking the sidebar header.
  if (selection.kind === 'project') {
    return renderProject();
  }

  // 'none' (empty-area click, Esc, fresh selection) and 'canvas' (canvas
  // just opened) both default to the canvas-level view when a canvas is
  // loaded. The active tab from `uiPrefs.rightInspectorTab` decides
  // between Knowledge (intro) and Config. 'none' only falls back to the
  // project inspector when there is no canvas open at all (e.g. a
  // brand-new project).
  if (selection.kind === 'none' || selection.kind === 'canvas') {
    if (tab === 'config') {
      return renderCanvasConfig() ?? renderCanvasKnowledge() ?? renderProject();
    }
    return renderCanvasKnowledge() ?? renderProject();
  }

  // From here on we need a live doc + canvas bundle to do anything useful.
  if (!doc || !def || !i18n) return renderProject();

  if (selection.kind === 'block') {
    const zone = def.zones.find((z) => z.id === selection.zoneId);
    const block = zone ? i18n.blocks[zone.id] : undefined;
    if (!zone || !block) return null;
    return (
      <BlockInspector
        zone={zone}
        block={block}
        guidanceMd={knowledge?.blocks[zone.id]}
        canvasDefId={def.id}
        onAddSticky={(text) => {
          const c = zoneCentroid(zone.shape);
          // Add a small random offset so multiple stickies don't stack exactly.
          const dx = (Math.random() - 0.5) * 60;
          const dy = (Math.random() - 0.5) * 40;
          addSticky(doc, {
            zoneId: zone.id,
            x: c.x + dx,
            y: c.y + dy,
            text: text ?? '',
            authorName: displayName,
          });
        }}
      />
    );
  }

  if (selection.kind === 'pinClass') {
    if (!def) return renderProject();
    const ot = effectiveObjectTypes(def);
    if (!ot.includes('pinClass')) return renderCanvasKnowledge() ?? renderProject();
    return (
      <LegendInspector
        doc={doc}
        classes={pinClasses}
        factors={def.chart ? factors : undefined}
        yAxis={def.chart?.yAxis}
        displayName={displayName}
        lang={liveLang}
        scrollToClassId={selection.classId}
      />
    );
  }

  if (selection.kind === 'pin') {
    const pin = pins.find((p) => p.id === selection.pinId);
    if (!pin) return renderCanvasKnowledge() ?? renderProject();
    return <PinInspector doc={doc} pin={pin} classes={pinClasses} />;
  }

  // sticky
  const sticky: StickyNote | undefined = stickies.find((s) => s.id === selection.stickyId);
  if (!sticky) {
    // The sticky was deleted (e.g. via the trash on the sticky itself in
    // the past, or future undo). Fall back to canvas knowledge (or
    // project if no canvas is open).
    return renderCanvasKnowledge() ?? renderProject();
  }
  const blockTitle = i18n.blocks[sticky.zoneId]?.title;
  return (
    <StickyInspector
      sticky={sticky}
      blockTitle={blockTitle}
      onText={(text) => updateSticky(doc, sticky.id, { text })}
      onColor={(color) => updateSticky(doc, sticky.id, { color })}
      onDelete={() => {
        deleteSticky(doc, sticky.id);
        clear();
      }}
    />
  );
}

/**
 * Helper — read the current i18n language as a `Lang` token. Defaults to
 * 'en' when react-i18next reports anything other than 'zh'.
 */
function useLiveLang(): Lang {
  const { i18n } = useTranslation();
  return i18n.language === 'zh' ? 'zh' : 'en';
}
