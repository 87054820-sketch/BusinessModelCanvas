import ReactMarkdown from 'react-markdown';
import remarkCjkFriendly from 'remark-cjk-friendly';
import remarkGfm from 'remark-gfm';
import type { CanvasMeta, Lang, StoryCanvasDirective } from '@pingarden/shared';
import { parseStoryBlocks } from './storyDirectives';
import { EmbeddedCanvas } from './EmbeddedCanvas';

interface Props {
  content: string;
  projectId: string;
  canvases: CanvasMeta[];
  lang: Lang;
  displayName: string;
}

/**
 * `remark-cjk-friendly` patches the CommonMark "left/right-flanking
 * delimiter run" rules so `**bold**` works when sandwiched against CJK
 * punctuation (e.g. `是**「整合的商业模式...」**。`). Stock CommonMark
 * rejects that as emphasis because `「` and `。` are punctuation, which
 * makes Chinese-authored markdown render literal `**` characters. The
 * plugin treats CJK punctuation as whitespace for flanking purposes.
 *
 * Same plugin should be added to any other react-markdown call site —
 * see `apps/web/src/components/Markdown.tsx`.
 */
const REMARK_PLUGINS = [remarkCjkFriendly, remarkGfm];

export function StoryRenderer({ content, projectId, canvases, lang, displayName }: Props) {
  const blocks = parseStoryBlocks(content);
  return (
    <article className="mx-auto max-w-5xl px-8 py-8 text-gray-800">
      {blocks.map((block, idx) => {
        if (block.kind === 'canvas') {
          const canvas = resolveEmbeddedCanvas(canvases, block.directive);
          return (
            <EmbeddedCanvas
              key={`${block.raw}-${idx}`}
              projectId={projectId}
              canvas={canvas}
              title={block.directive.title}
              lang={lang}
              displayName={displayName}
            />
          );
        }
        return (
          <div key={idx} className="story-markdown">
            <ReactMarkdown remarkPlugins={REMARK_PLUGINS}>{block.content}</ReactMarkdown>
          </div>
        );
      })}
    </article>
  );
}

function resolveEmbeddedCanvas(
  canvases: CanvasMeta[],
  directive: StoryCanvasDirective,
): CanvasMeta | undefined {
  if (directive.canvasId) {
    const byId = canvases.find((c) => c.id === directive.canvasId);
    if (byId) return byId;
  }
  if (!directive.defId) return undefined;

  const sameDef = canvases.filter((c) => c.defId === directive.defId);
  if (directive.variantId) {
    const byVariant = sameDef.find((c) => c.variant?.id === directive.variantId);
    if (byVariant) return byVariant;
  }
  return sameDef[0];
}
