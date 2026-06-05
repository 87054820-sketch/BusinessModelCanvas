import { useTranslation } from 'react-i18next';
import type { CanvasMeta, Lang } from '@pingarden/shared';
import { CanvasThumb } from '../../canvas/CanvasThumb';

interface Props {
  /** Other def ids the active canvas conceptually pairs with. */
  relatedDefIds: readonly string[];
  /** All canvases in the current project — used to decide solid vs dashed. */
  projectCanvases: readonly CanvasMeta[];
  /** Click → navigate to a sibling canvas of the related def. */
  onSwitchCanvas: (canvasId: string) => void;
  /** Click → create a new canvas of the related def in this project. */
  onAddCanvas: (defId: string) => void;
  /** Localised def names — `name[lang]` from the canvas-defs API. */
  defNames: Record<string, Record<Lang, string>>;
}

/**
 * Inspector strip showing "this canvas pairs with these other canvases".
 *
 * Each chip is one of the active canvas's related def ids:
 *   – Solid   → a canvas of that type already lives in this project.
 *               Click navigates to the most recently-updated one.
 *   – Dashed  → no such canvas yet. Click creates one in this project
 *               (uses the same `handleAddCanvas` the AddCanvasMenu uses).
 *
 * Hidden when the active canvas declares no peers.
 */
export function RelatedCanvasesStrip({
  relatedDefIds,
  projectCanvases,
  onSwitchCanvas,
  onAddCanvas,
  defNames,
}: Props) {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language as Lang) ?? 'en';
  if (relatedDefIds.length === 0) return null;

  // Group the project's canvases by defId; pick the most-recently-updated
  // one when there are duplicates so the click target is the freshest.
  const newestByDef = new Map<string, CanvasMeta>();
  for (const c of projectCanvases) {
    const cur = newestByDef.get(c.defId);
    if (!cur || c.updatedAt.localeCompare(cur.updatedAt) > 0) {
      newestByDef.set(c.defId, c);
    }
  }

  return (
    <div className="mt-6">
      <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-gray-500">
        {t('home.relatedCanvases')}
      </div>
      <ul className="flex flex-wrap gap-2">
        {relatedDefIds.map((defId) => {
          const peer = newestByDef.get(defId);
          const exists = !!peer;
          const localizedName = t(
            `templates.${defId}.name`,
            defNames[defId]?.[lang] ?? defId,
          );
          return (
            <li key={defId}>
              <button
                type="button"
                title={
                  exists
                    ? `→ ${localizedName}`
                    : `+ ${localizedName}`
                }
                onClick={() => {
                  if (exists && peer) onSwitchCanvas(peer.id);
                  else onAddCanvas(defId);
                }}
                className={
                  exists
                    ? 'inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-800 hover:border-gray-400 hover:bg-gray-50'
                    : 'inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-transparent px-2 py-1 text-xs font-medium text-gray-500 hover:border-gray-500 hover:text-gray-700'
                }
              >
                <CanvasThumb id={defId} width={28} height={20} />
                <span className="max-w-[140px] truncate">{localizedName}</span>
                {!exists && <span className="text-gray-400">+</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
