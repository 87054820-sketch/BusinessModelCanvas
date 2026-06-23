import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { CanvasMeta, Project, StoryMeta } from '@pingarden/shared';
import { MenuButton } from '../ui/MenuButton';
import { CanvasThumb } from '../canvas/CanvasThumb';
import { AddCanvasMenu } from './AddCanvasMenu';
import { useSelection } from '../state/selection';
import { useUiPrefs } from '../state/uiPrefs';

interface Props {
  project: Project;
  canvases: CanvasMeta[];
  stories: StoryMeta[];
  activeCanvasId: string | undefined;
  activeStoryId: string | undefined;
  onSelect: (canvasId: string) => void;
  onSelectStory: (storyId: string) => void;
  /** Click on the project header — switches the right inspector to project info. */
  onSelectProject: () => void;
  onAddCanvas: (defId: string) => void;
  onAddStory: () => void;
  onDeleteCanvas: (c: CanvasMeta) => void;
  onDeleteStory: (s: StoryMeta) => void;
  onOpenCopilot: () => void;
  /**
   * Library-case mode: hide every write affordance.
   *   - "+ Add canvas" / "+ New story" footer buttons disappear
   *   - per-row "···" delete menus disappear
   *   - canvas / story selection stays clickable (navigation is read-only)
   *   - project header stays clickable (it just switches the inspector tab)
   * The collapsed-rail variant follows the same rules.
   */
  readOnly?: boolean;
}

/**
 * Left column of the workspace. Has two render modes, gated by
 * `useUiPrefs.leftSidebarCollapsed` (persisted to localStorage):
 *
 * **Expanded** (260 px):
 *   1. Back button
 *   2. Project header (selectable — routes the right inspector to project info)
 *   3. Canvases list with thumbs + delete menu
 *   4. "+ Add canvas" button
 *
 * **Collapsed** (56 px):
 *   - `»` chevron at the top (acts as the expand toggle)
 *   - Vertical rail of `<CanvasThumb>` icons, one per canvas in the project
 *     (each with a `title=` tooltip carrying the canvas title)
 *   - `+` button at the bottom (popover anchored to the right)
 *   - Back button and project header are hidden — to reach them, expand
 *     first.
 *
 * The previous "color legend" strip lived here as a passive read-only
 * display. It moved to a per-canvas overlay (`StickyLegendPalette`) so
 * each canvas in the project can carry its own colour meanings —
 * project granularity was wrong for the way teams actually use the
 * canvases.
 */
export function ProjectSidebar({
  project,
  canvases,
  stories,
  activeCanvasId,
  activeStoryId,
  onSelect,
  onSelectStory,
  onSelectProject,
  onAddCanvas,
  onAddStory,
  onDeleteCanvas,
  onDeleteStory,
  onOpenCopilot,
  readOnly = false,
}: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const selection = useSelection((s) => s.selection);
  const projectActive = selection.kind === 'project';
  const collapsed = useUiPrefs((s) => s.leftSidebarCollapsed);
  const toggleCollapsed = useUiPrefs((s) => s.toggleLeftSidebar);

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
          {stories.length > 0 && (
            <ul className="mt-3 space-y-1 px-1">
              {stories.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => onSelectStory(s.id)}
                    title={s.title}
                    aria-label={s.title}
                    className={`flex h-10 w-full items-center justify-center rounded-md text-base ${
                      s.id === activeStoryId ? 'bg-[#2A6B6B] text-white' : 'text-[#2A6B6B] hover:bg-[#EAF3F1]'
                    }`}
                  >
                    <span aria-hidden>✦</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-2 border-t border-gray-200 p-2">
          <button
            type="button"
            onClick={onOpenCopilot}
            title={t('library.copilot.drawerTitle')}
            aria-label={t('library.copilot.drawerTitle')}
            className="flex h-9 w-full items-center justify-center rounded-md text-gray-700 hover:bg-gray-100"
          >
            AI
          </button>
          {!readOnly && (
            <>
              <div className="flex justify-center">
                <AddCanvasMenu onPick={onAddCanvas} compact />
            </div>
            <button
              type="button"
              onClick={onAddStory}
              title={t('story.newStory')}
              aria-label={t('story.newStory')}
              className="flex h-9 w-full items-center justify-center rounded-md text-[#2A6B6B] hover:bg-[#EAF3F1]"
            >
              ✦
            </button>
            </>
          )}
        </div>
      </aside>
    );
  }

  return (
    <aside className="relative z-40 flex h-full w-[260px] flex-shrink-0 flex-col border-r border-gray-200 bg-white transition-[width] duration-150">
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

      <div className="border-b border-gray-100 px-3 py-2">
        <button
          type="button"
          onClick={onOpenCopilot}
          className="flex w-full items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-900 transition hover:border-gray-300 hover:bg-gray-50"
        >
          {t('library.copilot.drawerTitle')}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="mb-2 px-1 text-[11px] uppercase tracking-wider text-gray-500">
          {t('workspace.canvases')}
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
                  {!readOnly && (
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
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div className="mb-2 mt-6 px-1 text-[11px] uppercase tracking-wider text-[#2A6B6B]">
          {t('story.stories')}
        </div>
        {stories.length === 0 ? (
          <p className="px-1 text-xs text-gray-400">{t('story.noStories')}</p>
        ) : (
          <ul className="space-y-1">
            {stories.map((s) => {
              const active = s.id === activeStoryId;
              return (
                <li
                  key={s.id}
                  className={`group flex items-center justify-between rounded-md px-2 py-1.5 text-sm ${
                    active ? 'bg-[#2A6B6B] text-white' : 'text-gray-800 hover:bg-[#EAF3F1]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectStory(s.id)}
                    className="flex flex-1 items-center gap-2 truncate text-left"
                  >
                    <span className={`flex h-6 w-8 flex-shrink-0 items-center justify-center rounded border ${
                      active ? 'border-white/30 bg-white/10' : 'border-[#B8D4D0] bg-[#EAF3F1] text-[#2A6B6B]'
                    }`}>
                      ✦
                    </span>
                    <span className="flex-1 truncate">{s.title}</span>
                  </button>
                  {!readOnly && (
                    <div className={active ? 'text-white' : 'text-gray-500'}>
                      <MenuButton
                        label="···"
                        align="right"
                        items={[
                          {
                            label: t('confirm.delete'),
                            danger: true,
                            onClick: () => onDeleteStory(s),
                          },
                        ]}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {!readOnly && (
        <div className="space-y-2 border-t border-gray-200 p-3">
          <AddCanvasMenu onPick={onAddCanvas} />
          <button
            type="button"
            onClick={onAddStory}
            className="flex w-full items-center justify-center rounded-lg border border-[#B8D4D0] bg-[#EAF3F1] px-3 py-2 text-sm font-semibold text-[#2A6B6B] transition hover:bg-[#DCEDEB]"
          >
            {t('story.newStory')}
          </button>
        </div>
      )}
    </aside>
  );
}
