import ReactMarkdown from 'react-markdown';
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
            <ReactMarkdown>{block.content}</ReactMarkdown>
          </div>
        );
      })}
    </article>
  );
}
