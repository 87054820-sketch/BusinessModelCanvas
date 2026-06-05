import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CanvasMeta, Lang, Project } from '@pingarden/shared';
import { TypeToConfirmDialog } from '../../ui/TypeToConfirmDialog';
import { RelatedCanvasesStrip } from './RelatedCanvasesStrip';

interface Props {
  project: Project;
  /** Number of canvases in the project — used in the delete confirm message. */
  canvasCount: number;
  onPatch: (patch: {
    name?: string;
    description?: string;
  }) => void;
  onDelete: () => void;
  /** Active canvas's `related` peer-def ids. Empty → strip hidden. */
  relatedDefIds?: readonly string[];
  /** All canvases in this project — drives solid vs dashed chips. */
  projectCanvases?: readonly CanvasMeta[];
  /** Localised def names keyed by defId. */
  defNames?: Record<string, Record<Lang, string>>;
  onSwitchCanvas?: (canvasId: string) => void;
  onAddCanvas?: (defId: string) => void;
}

/**
 * Right-panel content when nothing (or the project node) is selected.
 *
 * Sections, top to bottom:
 *   1. Project name + description (editable, blur-to-save).
 *   2. Related-canvases chip strip for the active canvas.
 *   3. Danger zone (type-to-confirm delete).
 *
 * The previous "color legend editor" lived here too, but the legend has
 * moved to a per-canvas overlay (`StickyLegendPalette`) plus a section
 * inside `CanvasConfigInspector`. Per-project legends turned out to be
 * the wrong granularity — different canvases in the same project use
 * the same colours for different things.
 */
export function ProjectInspector({
  project,
  canvasCount,
  onPatch,
  onDelete,
  relatedDefIds,
  projectCanvases,
  defNames,
  onSwitchCanvas,
  onAddCanvas,
}: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? '');
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-5">
        <Field label={t('inspector.project.name')}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              if (name.trim() && name.trim() !== project.name) onPatch({ name: name.trim() });
              else setName(project.name);
            }}
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-900 focus:outline-none"
          />
        </Field>

        <Field label={t('inspector.project.description')}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => {
              if (description !== (project.description ?? '')) onPatch({ description });
            }}
            rows={4}
            className="w-full resize-none rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-900 focus:outline-none"
          />
        </Field>

        <div className="mt-2 text-[11px] text-gray-500">
          {t('inspector.project.createdBy', { name: project.createdBy })}
        </div>
        <div className="mt-1 text-[11px] text-gray-500">
          {new Date(project.updatedAt).toLocaleString()}
        </div>

        {relatedDefIds && relatedDefIds.length > 0 && projectCanvases && defNames && onSwitchCanvas && onAddCanvas && (
          <RelatedCanvasesStrip
            relatedDefIds={relatedDefIds}
            projectCanvases={projectCanvases}
            defNames={defNames}
            onSwitchCanvas={onSwitchCanvas}
            onAddCanvas={onAddCanvas}
          />
        )}

        <div className="mt-8 rounded-lg border border-gray-100 bg-gray-50 p-3 text-xs text-gray-600">
          💡 {t('inspector.tip')}
        </div>
      </div>

      <div className="border-t border-gray-200 bg-red-50/40 p-4">
        <div className="text-[11px] font-medium uppercase tracking-wider text-red-700">
          {t('inspector.project.deleteHeader')}
        </div>
        <p className="mt-2 text-xs text-gray-600">{t('inspector.project.deleteHint')}</p>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="mt-3 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
        >
          {t('inspector.project.delete')}
        </button>
      </div>

      <TypeToConfirmDialog
        open={confirmOpen}
        title={t('confirm.deleteProject')}
        message={t('confirm.deleteProjectMsg', { count: canvasCount })}
        expected={project.name}
        confirmLabel={t('confirm.delete')}
        cancelLabel={t('confirm.cancel')}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={async () => {
          await onDelete();
          setConfirmOpen(false);
        }}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-4 block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-gray-500">
        {label}
      </span>
      {children}
    </label>
  );
}
