import { useTranslation } from 'react-i18next';
import type { Project } from '@pingarden/shared';
import type { ProjectWithCanvases } from './ProjectPicker';

interface Props {
  project: ProjectWithCanvases;
  onOpen: (project: ProjectWithCanvases) => void;
  onRequestDelete?: (project: ProjectWithCanvases) => void;
}

/**
 * Project card used in the LibraryPage's "my projects" grid. Mirrors
 * the visual weight of `CaseCard` so the two grids feel like siblings.
 *
 * Library-origin projects get a read-only badge and a disabled delete
 * button; user projects keep the regular delete affordance. This is
 * the only Web surface that distinguishes the two — anywhere else a
 * library project appears it just acts like a normal project (the
 * server's BundleStorage rejects writes with 403).
 */
export function ProjectCard({ project, onOpen, onRequestDelete }: Props) {
  const { t } = useTranslation();
  const dateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'short' });
  const isLibrary = project.source === 'library';

  return (
    <div className="group relative flex flex-col rounded-xl border border-gray-200 bg-white p-3 transition hover:border-gray-300 hover:shadow-sm">
      <button
        type="button"
        onClick={() => onOpen(project)}
        className="min-w-0 flex-1 text-left"
      >
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-gray-900">
              {project.name}
            </div>
            {project.description && (
              <div className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-gray-500">
                {project.description}
              </div>
            )}
          </div>
          {isLibrary && (
            <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
              {t('library.readOnlyBadge')}
            </span>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2 text-[10px] text-gray-400">
          <span>{t('home.canvasCount', { count: project.canvases.length })}</span>
          <span>·</span>
          <span>{dateFmt.format(new Date(project.updatedAt))}</span>
        </div>
      </button>

      {/* Delete affordance — hidden for library originals (would 403 anyway) */}
      {!isLibrary && onRequestDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRequestDelete(project);
          }}
          className="absolute right-2 top-2 rounded p-1 text-gray-300 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
          title={t('confirm.delete')}
          aria-label={t('confirm.delete')}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
        </button>
      )}
    </div>
  );
}

// Re-export the type so callers don't have to chase down ProjectPicker.
export type { Project };
