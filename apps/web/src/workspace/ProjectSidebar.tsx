import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { CanvasMeta, Project } from '@canvas-collab/shared';
import { STICKY_PALETTE } from '@canvas-collab/shared';
import { MenuButton } from '../ui/MenuButton';
import { CanvasThumb } from '../canvas/CanvasThumb';
import { AddCanvasMenu } from './AddCanvasMenu';
import { useSelection } from '../state/selection';
import { useUiPrefs } from '../state/uiPrefs';

interface Props {
  project: Project;
  canvases: CanvasMeta[];
  activeCanvasId: string | undefined;
  onSelect: (canvasId: string) => void;
  /** Click on the project header — switches the right inspector to project info. */
  onSelectProject: () => void;
  onAddCanvas: (defId: string) => void;
  onDeleteCanvas: (c: CanvasMeta) => void;
}

/**
 * Left column of the workspace. Has two render modes, gated by
 * `useUiPrefs.leftSidebarCollapsed` (persisted to localStorage):
 *
 * **Expanded** (260 px):
 *   1. Back button
 *   2. Project header (selectable — routes the right inspector to project info)
 *   3. Canvases list with thumbs + delete menu
 *   4. Color legend (passive display, hidden when no entries are defined)
 *   5. "+ Add canvas" button
 *
 * **Collapsed** (56 px):
 *   - `»` chevron at the top (acts as the expand toggle)
 *   - Vertical rail of `<CanvasThumb>` icons, one per canvas in the project
 *     (each with a `title=` tooltip carrying the canvas title)
 *   - `+` button at the bottom (popover anchored to the right)
 *   - Back button, project header, and color legend are hidden — to
 *     reach them, expand first.
 */
export function ProjectSidebar({
  project,
  canvases,
  activeCanvasId,
  onSelect,
  onSelectProject,
  onAddCanvas,
  onDeleteCanvas,
}: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const selection = useSelection((s) => s.selection);
  const projectActive = selection.kind === 'project';
  const collapsed = useUiPrefs((s) => s.leftSidebarCollapsed);
  const toggleCollapsed = useUiPrefs((s) => s.toggleLeftSidebar);

  /** Legend entries to render, in palette order, only those with a label. */
  const legendEntries = STICKY_PALETTE.flatMap((hex) => {
    const entry = project.colorLegend?.[hex];
    if (!entry || !entry.label.trim()) return [];
    return [{ hex, label: entry.label, description: entry.description }];
  });

  if (collapsed) {
    return (
      <aside className="flex h-full w-[56px] flex-shrink-0 flex-col border-r border-gray-200 bg-white transition-[width] duration-150">
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={t('workspace.expandSidebar')}
          title={t('workspace.expandSidebar')}
          className="flex h-12 w-full items-center justify-center border-b border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900"
        >
          »
        </button>

        <div className="flex-1 overflow-y-auto py-2">
          {canvases.length === 0 ? (
            <div className="px-2 text-center text-[10px] text-gray-400">
              {t('workspace.noCanvases')}
            </div>
          ) : (
            <ul className="space-y-1 px-1">
              {canvases.map((c) => {
                const active = c.id === activeCanvasId;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(c.id)}
                      title={c.title}
                      aria-label={c.title}
                      className={`flex h-10 w-full items-center justify-center rounded-md ${
                        active
                          ? 'bg-gray-900'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      <span
                        className={`flex h-7 w-9 items-center justify-center overflow-hidden rounded border ${
                          active ? 'border-white/30 bg-white' : 'border-gray-200 bg-white'
                        }`}
                      >
                        <CanvasThumb id={c.defId} width={32} height={22} />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-gray-200 p-2">
          <div className="flex justify-center">
            <AddCanvasMenu onPick={onAddCanvas} compact />
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex h-full w-[260px] flex-shrink-0 flex-col border-r border-gray-200 bg-white transition-[width] duration-150">
      <div className="flex items-center justify-between border-b border-gray-200 pr-2">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex-1 px-4 py-3 text-left text-xs text-gray-500 hover:text-gray-900"
        >
          ← {t('nav.back')}
        </button>
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={t('workspace.collapseSidebar')}
          title={t('workspace.collapseSidebar')}
          className="flex h-7 w-7 items-center justify-center rounded text-gray-500 hover:bg-gray-100 hover:text-gray-900"
        >
          «
        </button>
      </div>

      <button
        type="button"
        onClick={onSelectProject}
        className={`border-b border-gray-100 px-4 py-3 text-left transition-colors ${
          projectActive
            ? 'bg-gray-900 text-white'
            : 'bg-white text-gray-900 hover:bg-gray-50'
        }`}
      >
        <div
          className={`text-[11px] uppercase tracking-wider ${
            projectActive ? 'text-white/70' : 'text-gray-500'
          }`}
        >
          {t('inspector.project.name')}
        </div>
        <div className="mt-0.5 text-base font-semibold">{project.name}</div>
        {project.description && (
          <div
            className={`mt-1 text-xs ${
              projectActive ? 'text-white/80' : 'text-gray-500'
            }`}
          >
            {project.description}
          </div>
        )}
      </button>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="mb-2 px-1 text-[11px] uppercase tracking-wider text-gray-500">
          Canvases
        </div>
        {canvases.length === 0 ? (
          <p className="px-1 text-xs text-gray-400">{t('workspace.noCanvases')}</p>
        ) : (
          <ul className="space-y-1">
            {canvases.map((c) => {
              const active = c.id === activeCanvasId;
              return (
                <li
                  key={c.id}
                  className={`group flex items-center justify-between rounded-md px-2 py-1.5 text-sm ${
                    active
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(c.id)}
                    className="flex flex-1 items-center gap-2 truncate text-left"
                  >
                    <span
                      className={`flex h-6 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded border ${
                        active ? 'border-white/30 bg-white' : 'border-gray-200 bg-white'
                      }`}
                    >
                      <CanvasThumb id={c.defId} width={28} height={20} />
                    </span>
                    <span className="flex-1 truncate">{c.title}</span>
                  </button>
                  <div className={active ? 'text-white' : 'text-gray-500'}>
                    <MenuButton
                      label="···"
                      align="right"
                      items={[
                        {
                          label: t('confirm.delete'),
                          danger: true,
                          onClick: () => onDeleteCanvas(c),
                        },
                      ]}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {legendEntries.length > 0 && (
          <div className="mt-5 border-t border-gray-100 pt-3">
            <div className="mb-2 px-1 text-[11px] uppercase tracking-wider text-gray-500">
              {t('inspector.legend.title')}
            </div>
            <ul className="space-y-1.5">
              {legendEntries.map(({ hex, label, description }) => (
                <li
                  key={hex}
                  className="flex items-start gap-2 px-1"
                  title={description ?? undefined}
                >
                  <span
                    aria-hidden
                    className="mt-0.5 h-3 w-3 flex-shrink-0 rounded-sm border border-black/10"
                    style={{ backgroundColor: hex }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs text-gray-800">
                      {label}
                    </span>
                    {description && (
                      <span className="block truncate text-[11px] text-gray-500">
                        {description}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 p-3">
        <AddCanvasMenu onPick={onAddCanvas} />
      </div>
    </aside>
  );
}
