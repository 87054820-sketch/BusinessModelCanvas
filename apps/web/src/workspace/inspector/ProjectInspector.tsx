import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  CanvasMeta,
  ColorLegendEntry,
  Lang,
  Project,
} from '@canvas-collab/shared';
import { STICKY_PALETTE } from '@canvas-collab/shared';
import { TypeToConfirmDialog } from '../../ui/TypeToConfirmDialog';
import { RelatedCanvasesStrip } from './RelatedCanvasesStrip';

interface Props {
  project: Project;
  /** Number of canvases in the project — used in the delete confirm message. */
  canvasCount: number;
  onPatch: (patch: {
    name?: string;
    description?: string;
    colorLegend?: Record<string, ColorLegendEntry>;
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
 *   2. Color legend editor — per-palette label + description; saving rewrites
 *      the project's `colorLegend` map. Empty-label rows are stripped before
 *      save so the sidebar legend stays clean.
 *   3. Related-canvases chip strip for the active canvas.
 *   4. Danger zone (type-to-confirm delete).
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

        <ColorLegendEditor
          legend={project.colorLegend ?? {}}
          onSave={(legend) => onPatch({ colorLegend: legend })}
        />

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

interface LegendEditorProps {
  legend: Record<string, ColorLegendEntry>;
  onSave: (legend: Record<string, ColorLegendEntry>) => void;
}

/**
 * Editor for the project-scoped sticky-color legend. Each palette colour
 * gets a row with a label + optional description. We hold the draft state
 * locally and only push to the server on Save — that keeps the sidebar
 * (which reads `project.colorLegend`) from flickering on every keystroke.
 *
 * Empty labels are stripped on save so the sidebar legend never displays
 * a swatch with no caption.
 */
function ColorLegendEditor({ legend, onSave }: LegendEditorProps) {
  const { t } = useTranslation();

  const initial = useMemo<Record<string, ColorLegendEntry>>(() => {
    const out: Record<string, ColorLegendEntry> = {};
    for (const hex of STICKY_PALETTE) {
      out[hex] = { label: legend[hex]?.label ?? '', description: legend[hex]?.description ?? '' };
    }
    return out;
  }, [legend]);

  const [draft, setDraft] = useState(initial);
  const [saved, setSaved] = useState(false);

  // Re-sync draft when the persisted legend changes from outside (e.g. a
  // parallel save). Without this the editor would silently shadow updates.
  useEffect(() => {
    setDraft(initial);
  }, [initial]);

  const dirty = STICKY_PALETTE.some((hex) => {
    const a = draft[hex];
    const b = legend[hex];
    return (a?.label ?? '') !== (b?.label ?? '') ||
      (a?.description ?? '') !== (b?.description ?? '');
  });

  return (
    <div className="mt-6 border-t border-gray-100 pt-4">
      <div className="text-[11px] font-medium uppercase tracking-wider text-gray-500">
        {t('inspector.legend.editorHeader')}
      </div>
      <p className="mt-1 text-[11px] text-gray-500">
        {t('inspector.legend.editorHint')}
      </p>

      <ul className="mt-3 space-y-2">
        {STICKY_PALETTE.map((hex) => (
          <li key={hex} className="flex items-start gap-2">
            <span
              aria-hidden
              className="mt-1 h-5 w-5 flex-shrink-0 rounded-sm border border-black/10"
              style={{ backgroundColor: hex }}
            />
            <div className="min-w-0 flex-1 space-y-1">
              <input
                value={draft[hex]?.label ?? ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setSaved(false);
                  setDraft((d) => ({
                    ...d,
                    [hex]: {
                      label: value,
                      description: d[hex]?.description ?? '',
                    },
                  }));
                }}
                placeholder={t('inspector.legend.labelPlaceholder')}
                className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-gray-900 focus:outline-none"
              />
              <input
                value={draft[hex]?.description ?? ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setSaved(false);
                  setDraft((d) => ({
                    ...d,
                    [hex]: {
                      label: d[hex]?.label ?? '',
                      description: value,
                    },
                  }));
                }}
                placeholder={t('inspector.legend.descriptionPlaceholder')}
                className="w-full rounded-md border border-gray-200 px-2 py-1 text-[11px] text-gray-700 focus:border-gray-900 focus:outline-none"
              />
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center justify-end gap-2">
        {saved && !dirty && (
          <span className="text-[11px] text-emerald-600">
            {t('inspector.legend.saved')}
          </span>
        )}
        <button
          type="button"
          disabled={!dirty}
          onClick={() => {
            const trimmed: Record<string, ColorLegendEntry> = {};
            for (const hex of STICKY_PALETTE) {
              const label = (draft[hex]?.label ?? '').trim();
              if (!label) continue;
              const description = (draft[hex]?.description ?? '').trim();
              trimmed[hex] = description ? { label, description } : { label };
            }
            onSave(trimmed);
            setSaved(true);
          }}
          className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t('inspector.legend.save')}
        </button>
      </div>
    </div>
  );
}
