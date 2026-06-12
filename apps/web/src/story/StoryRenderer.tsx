import ReactMarkdown from 'react-markdown';
import remarkCjkFriendly from 'remark-cjk-friendly';
import type { CanvasMeta, Lang } from '@pingarden/shared';
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
const REMARK_PLUGINS = [remarkCjkFriendly];

export function StoryRenderer({ content, projectId, canvases, lang, displayName }: Props) {
  const blocks = parseStoryBlocks(content);
  return (
    <article className="mx-auto max-w-5xl px-8 py-8 text-gray-800">
      {blocks.map((block, idx) => {
        if (block.kind === 'canvas') {
          const canvas = canvases.find((c) => c.id === block.directive.canvasId);
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
