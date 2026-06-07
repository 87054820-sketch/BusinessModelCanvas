import type { StoryCanvasDirective } from '@pingarden/shared';

export type StoryBlock =
  | { kind: 'markdown'; content: string }
  | { kind: 'canvas'; directive: StoryCanvasDirective; raw: string };

const CANVAS_DIRECTIVE_RE = /^::canvas(?:\[([^\]\n]+)\])?\{([^}\n]*)\}\s*$/;

export function parseStoryBlocks(content: string): StoryBlock[] {
  const blocks: StoryBlock[] = [];
  const lines = content.split('\n');
  let markdown: string[] = [];

  function flushMarkdown() {
    const text = markdown.join('\n').trimEnd();
    if (text.trim().length > 0) blocks.push({ kind: 'markdown', content: text });
    markdown = [];
  }

  for (const line of lines) {
    const parsed = parseCanvasDirective(line);
    if (parsed) {
      flushMarkdown();
      blocks.push({ kind: 'canvas', directive: parsed, raw: line });
    } else {
      markdown.push(line);
    }
  }
  flushMarkdown();
  return blocks;
}

export function parseCanvasDirective(line: string): StoryCanvasDirective | null {
  const match = CANVAS_DIRECTIVE_RE.exec(line.trim());
  if (!match) return null;
  const attrs = parseDirectiveAttrs(match[2] ?? '');
  const canvasId = attrs.canvasId?.trim();
  if (!canvasId) return null;
  const defId = match[1]?.trim();
  return {
    canvasId,
    ...(defId ? { defId } : {}),
    ...(attrs.title ? { title: attrs.title } : {}),
  };
}

export function canvasDirective(defId: string, canvasId: string, title?: string): string {
  const safeTitle = title?.replace(/"/g, '\\"');
  return `::canvas[${defId}]{canvasId="${canvasId}"${safeTitle ? ` title="${safeTitle}"` : ''}}`;
}

function parseDirectiveAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attr = /(\w+)="([^"]*)"|(\w+)='([^']*)'|(\w+)=([^\s]+)/g;
  let match: RegExpExecArray | null;
  while ((match = attr.exec(raw)) !== null) {
    const key = match[1] ?? match[3] ?? match[5];
    const value = match[2] ?? match[4] ?? match[6] ?? '';
    if (key) attrs[key] = value;
  }
  return attrs;
}
