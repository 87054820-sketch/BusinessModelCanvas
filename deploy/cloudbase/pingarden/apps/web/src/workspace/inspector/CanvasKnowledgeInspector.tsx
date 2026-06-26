import { useTranslation } from 'react-i18next';
import type { CanvasDef, CanvasI18n, CanvasMeta, Lang } from '@pingarden/shared';
import type { CanvasKnowledge } from '../../api/client';
import { Markdown } from '../../components/Markdown';
import { RelatedCanvasesStrip } from './RelatedCanvasesStrip';

interface Props {
  def: CanvasDef;
  i18n: CanvasI18n;
  /**
   * Knowledge content for the active language. Both `intro` and `body` are
   * optional — render only what exists. When both are missing we show an
   * empty-state hint pointing at the bundle directory so source-code
   * editors know where to add the markdown.
   */
  knowledge: CanvasKnowledge;
  /** All canvases in this project — drives Pairs-with chip state. */
  projectCanvases: readonly CanvasMeta[];
  defNames: Record<string, Record<Lang, string>>;
  onSwitchCanvas: (canvasId: string) => void;
  onAddCanvas: (defId: string) => void;
}

/**
 * Right-panel content for `selection.kind === 'canvas'`. Surfaces the
 * canvas-type's bundled knowledge (a short usage intro + a longer
 * methodology body) plus the existing Pairs-with chip strip. Read-only —
 * editing happens by changing the markdown files in the canvas bundle.
 */
export function CanvasKnowledgeInspector({
  def,
  i18n,
  knowledge,
  projectCanvases,
  defNames,
  onSwitchCanvas,
  onAddCanvas,
}: Props) {
  const { t, i18n: i18nClient } = useTranslation();
  const lang = (i18nClient.language as Lang) ?? 'en';
  const tagline = t(`templates.${def.id}.tagline`, '');
  const hasIntro = !!knowledge.intro?.trim();
  const hasBody = !!knowledge.body?.trim();

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-5">
        <div className="text-[11px] uppercase tracking-wider text-gray-500">
          {t('inspector.project.name') /* re-use existing label-style key spacing */}
        </div>
        <h2 className="mt-0.5 text-base font-semibold text-gray-900">
          {i18n.canvasTitle}
        </h2>
        {tagline && (
          <p className="mt-1 text-xs text-gray-500">{tagline}</p>
        )}

        {hasIntro && (
          <Section title={t('inspector.canvasKnowledge.usageIntro')}>
            <Markdown content={knowledge.intro!} canvasDefId={def.id} />
          </Section>
        )}

        {hasBody && (
          <Section title={t('inspector.canvasKnowledge.knowledgeBody')}>
            <Markdown content={knowledge.body!} canvasDefId={def.id} />
          </Section>
        )}

        {!hasIntro && !hasBody && (
          <div className="mt-6 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-xs text-gray-600">
            <div className="font-medium text-gray-800">
              {t('inspector.canvasKnowledge.empty')}
            </div>
            <div className="mt-1 font-mono text-[11px] text-gray-500">
              {t('inspector.canvasKnowledge.emptyHint', { id: def.id, lang })}
            </div>
          </div>
        )}

        {def.related && def.related.length > 0 && (
          <RelatedCanvasesStrip
            relatedDefIds={def.related}
            projectCanvases={projectCanvases}
            defNames={defNames}
            onSwitchCanvas={onSwitchCanvas}
            onAddCanvas={onAddCanvas}
          />
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6">
      <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-gray-500">
        {title}
      </div>
      {children}
    </section>
  );
}

