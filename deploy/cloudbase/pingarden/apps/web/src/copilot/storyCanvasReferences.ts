export interface CopilotCanvasReference {
  canvasId: string;
  defId: string;
  title?: string;
  variantId?: string;
}

const CANVAS_DIRECTIVE_LINE_RE = /^(\s*)::canvas(?:\[([^\]\n]+)\])?\{([^}\n]*)\}(\s*)$/;

export function rewriteStoryCanvasDirectivesToCanvasIds(
  content: string,
  references: CopilotCanvasReference[],
): string {
  if (references.length === 0 || !content.includes('::canvas')) return content;

  return content
    .split('\n')
    .map((line) => rewriteDirectiveLine(line, references))
    .join('\n');
}

function rewriteDirectiveLine(line: string, references: CopilotCanvasReference[]): string {
  const match = CANVAS_DIRECTIVE_LINE_RE.exec(line);
  if (!match) return line;

  const indent = match[1] ?? '';
  const defId = match[2]?.trim();
  const rawAttrs = match[3] ?? '';
  const tail = match[4] ?? '';
  const attrs = parseDirectiveAttrs(rawAttrs);
  if (!defId || attrs.canvasId) return line;

  const ref = references.find((item) => item.defId === defId && (!attrs.variantId || item.variantId === attrs.variantId));
  if (!ref) return line;

  const nextAttrs = [
    `canvasId="${escapeAttr(ref.canvasId)}"`,
    attrs.variantId ? `variantId="${escapeAttr(attrs.variantId)}"` : '',
    attrs.title ? `title="${escapeAttr(attrs.title)}"` : ref.title ? `title="${escapeAttr(ref.title)}"` : '',
  ].filter(Boolean).join(' ');

  return `${indent}::canvas[${defId}]{${nextAttrs}}${tail}`;
}

function parseDirectiveAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attr = /(\w+)="([^"]*)"|(\w+)='([^']*)'|(\w+)=([^\s]+)/g;
  let match: RegExpExecArray | null;
  while ((match = attr.exec(raw)) !== null) {
    const key = match[1] ?? match[3] ?? match[5];
    const value = match[2] ?? match[4] ?? match[6] ?? '';
    if (!key) continue;
    attrs[key === 'variant' ? 'variantId' : key] = value;
  }
  return attrs;
}

function escapeAttr(value: string): string {
  return value.replace(/"/g, '&quot;');
}
