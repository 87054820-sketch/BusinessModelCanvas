import type * as Y from 'yjs';
import type { CanvasDef, CanvasI18n, CanvasMeta, ColorLegendEntry, Lang, Project, StickyNote } from '@canvas-collab/shared';
import { ProjectInspector } from './inspector/ProjectInspector';
import { BlockInspector } from './inspector/BlockInspector';
import { StickyInspector } from './inspector/StickyInspector';
import { CanvasKnowledgeInspector } from './inspector/CanvasKnowledgeInspector';
import { useSelection } from '../state/selection';
import { addSticky, deleteSticky, updateSticky, useStickies } from '../collab/stickies';
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

  // 'project' is the user explicitly clicking the sidebar header.
  if (selection.kind === 'project') {
    return renderProject();
  }

  // 'none' (empty-area click, Esc, fresh selection) and 'canvas' (canvas
  // just opened) both default to the canvas-knowledge view when a
  // canvas is loaded. 'none' only falls back to the project inspector
  // when there is no canvas open at all (e.g. a brand-new project).
  if (selection.kind === 'none' || selection.kind === 'canvas') {
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
