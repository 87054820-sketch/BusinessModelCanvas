import { useTranslation } from 'react-i18next';
import type { BlockI18n, ZoneDef } from '@pingarden/shared';
import { Markdown } from '../../components/Markdown';

interface Props {
  zone: ZoneDef;
  block: BlockI18n;
  /**
   * Markdown guidance for this block, sourced from
   * `packages/canvases/<id>/knowledge/blocks/<zoneId>.<lang>.md`.
   * Optional — when missing we fall back to `block.prompt` rendered as
   * plain text. (The legacy JSON `block.guidance` field has been
   * migrated out and is no longer used.)
   */
  guidanceMd?: string;
  /** Canvas-def id — needed to resolve relative image paths in the markdown. */
  canvasDefId: string;
  /** Add a sticky to this zone with optional pre-filled text. */
  onAddSticky: (text?: string) => void;
  /** Library / read-only mode: hide the "+ Add as sticky" example
   *  buttons and the "+ New empty sticky" footer button. The block
   *  guidance + examples list itself stays visible (it's
   *  educational content). */
  readOnly?: boolean;
}

/** Right-panel content when a block is selected. */
export function BlockInspector({
  zone,
  block,
  guidanceMd,
  canvasDefId,
  onAddSticky,
  readOnly = false,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-5">
        <div className="text-[11px] font-medium uppercase tracking-wider text-gray-500">
          {t('inspector.block.guidance').toString()}
        </div>
        <h2 className="mt-1 text-xl font-semibold text-gray-900">{block.title}</h2>

        {guidanceMd ? (
          <div className="mt-3">
            <Markdown
              content={guidanceMd}
              canvasDefId={canvasDefId}
              variant="block-guidance"
            />
          </div>
        ) : (
          block.prompt && (
            <p className="mt-3 text-sm leading-relaxed text-gray-700">{block.prompt}</p>
          )
        )}

        {block.examples && block.examples.length > 0 && (
          <>
            <div className="mt-6 text-[11px] font-medium uppercase tracking-wider text-gray-500">
              {t('inspector.block.examples')}
            </div>
            <ul className="mt-2 space-y-2">
              {block.examples.map((ex, i) => (
                <li
                  key={i}
                  className="group flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2"
                >
                  <span className="flex-1 text-xs text-gray-700">{ex}</span>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => onAddSticky(ex)}
                      className="rounded border border-gray-200 px-2 py-0.5 text-[11px] text-gray-700 opacity-0 transition group-hover:opacity-100 hover:bg-gray-50"
                      title={t('inspector.block.addAsSticky')}
                    >
                      +
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {!readOnly && (
        <div className="border-t border-gray-200 p-4">
          <button
            type="button"
            onClick={() => onAddSticky()}
            className="w-full rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black"
          >
            {t('inspector.block.newSticky')}
          </button>
          {/* Reference: zone id — useful for debugging plugin canvases like Portfolio Map. */}
          <div className="mt-2 text-center text-[10px] text-gray-400">{zone.id}</div>
        </div>
      )}
      {readOnly && (
        // In read-only the zone id is still useful for debugging /
        // copy-paste reference, even without the buttons.
        <div className="border-t border-gray-200 p-3 text-center text-[10px] text-gray-400">
          {zone.id}
        </div>
      )}
    </div>
  );
}
