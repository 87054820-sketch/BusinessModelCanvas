import { useTranslation } from 'react-i18next';
import type { CanvasDef, CanvasI18n } from '@pingarden/shared';
import type { CanvasKnowledge } from '../api/client';
import { Markdown } from './Markdown';

interface Props {
  def: CanvasDef;
  i18n: CanvasI18n;
  knowledge: CanvasKnowledge;
  className?: string;
}

export interface CanvasKnowledgeBlockRow {
  id: string;
  title: string;
  prompt: string;
  guidance: string;
  examples: string[];
  content: string;
}

export function getCanvasKnowledgeBlockRows(
  def: CanvasDef,
  i18n: CanvasI18n,
  knowledge: CanvasKnowledge,
): CanvasKnowledgeBlockRow[] {
  return def.zones
    .map((zone) => {
      const block = i18n.blocks[zone.id];
      const content = knowledge.blocks[zone.id]?.trim() ?? '';
      return {
        id: zone.id,
        title: block?.title || zone.id,
        prompt: block?.prompt || '',
        guidance: block?.guidance || '',
        examples: block?.examples ?? [],
        content,
      };
    })
    .filter((row) => row.title || row.prompt || row.guidance || row.content || row.examples.length > 0);
}

export function CanvasKnowledgeBlocks({
  def,
  i18n,
  knowledge,
  className = '',
}: Props) {
  const { t } = useTranslation();
  const rows = getCanvasKnowledgeBlockRows(def, i18n, knowledge);

  if (rows.length === 0) return null;

  return (
    <section className={className}>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
        {t('inspector.canvasKnowledge.modules')}
      </h3>
      <div className="space-y-3">
        {rows.map((row, index) => (
          <CanvasKnowledgeBlockDetail
            key={row.id}
            row={row}
            canvasDefId={def.id}
            index={index}
          />
        ))}
      </div>
    </section>
  );
}

export function CanvasKnowledgeBlockDetail({
  row,
  canvasDefId,
  index,
  className = '',
  dense = false,
}: {
  row: CanvasKnowledgeBlockRow;
  canvasDefId: string;
  index?: number;
  className?: string;
  dense?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <article className={`rounded-xl border border-gray-100 bg-white ${dense ? 'px-3.5 py-3' : 'px-3 py-3'} ${className}`}>
      <div className="flex items-start gap-2">
        {typeof index === 'number' && (
          <span className="mt-0.5 shrink-0 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
            {String(index + 1).padStart(2, '0')}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h4 className={`${dense ? 'text-[15px]' : 'text-sm'} font-semibold leading-snug text-gray-900`}>{row.title}</h4>
          {row.prompt && (
            <p className={`${dense ? 'text-[13px]' : 'text-[12px]'} mt-1 leading-relaxed text-gray-500`}>{row.prompt}</p>
          )}
          {row.guidance && (
            <p className={`${dense ? 'text-[13px]' : 'text-[12px]'} mt-2 leading-relaxed text-gray-700`}>{row.guidance}</p>
          )}
        </div>
      </div>

      {row.content && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <Markdown
            content={row.content}
            canvasDefId={canvasDefId}
            variant={dense ? 'modal-reader' : undefined}
            className={dense ? 'text-[13px] leading-6 text-gray-700' : undefined}
          />
        </div>
      )}

      {row.examples.length > 0 && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            {t('inspector.block.examples')}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {row.examples.slice(0, 4).map((example) => (
              <span
                key={example}
                className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600"
              >
                {example}
              </span>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
