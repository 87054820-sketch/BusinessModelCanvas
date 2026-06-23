import type { CopilotProjectDraft, Lang } from '@pingarden/shared';

const DRAFT_KIND = 'pingarden.projectDraft';

export function buildProjectCreationPrompt(lang: Lang): string {
  return lang === 'zh'
    ? '请根据我提供的图片、链接和说明创建一个 PinGarden 项目草稿；如果信息不够，请先问我最关键的问题。'
    : 'Create a PinGarden project draft from my images, links, and notes. If anything essential is missing, ask me the key question first.';
}

export function buildProjectIdeaSeed(lang: Lang): string {
  return lang === 'zh'
    ? '我想创建一个项目。资料如下：\n- 链接：\n- 图片说明：\n- 目标用户：\n- 我希望先生成的画布：商业模式画布'
    : 'I want to create a project. Materials:\n- Link:\n- Image notes:\n- Target users:\n- First canvas I want: Business Model Canvas';
}

export function stripProjectDraftBlocks(content: string): string {
  return content
    .replace(/```(?:json|pingarden-project-draft)?\s*[\s\S]*?"kind"\s*:\s*"pingarden\.projectDraft"[\s\S]*?```/g, '')
    .trim();
}

export function extractProjectDrafts(content: string): CopilotProjectDraft[] {
  const drafts: CopilotProjectDraft[] = [];
  const fenced = /```(?:json|pingarden-project-draft)?\s*([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = fenced.exec(content)) !== null) {
    const parsed = parseDraft(match[1] ?? '');
    if (parsed) drafts.push(parsed);
  }
  if (drafts.length > 0) return drafts;
  const parsed = parseDraft(content);
  return parsed ? [parsed] : [];
}

function parseDraft(raw: string): CopilotProjectDraft | null {
  const trimmed = raw.trim();
  if (!trimmed.includes(DRAFT_KIND)) return null;
  try {
    const value = JSON.parse(trimmed) as unknown;
    if (!isProjectDraft(value)) return null;
    return value;
  } catch {
    return null;
  }
}

function isProjectDraft(value: unknown): value is CopilotProjectDraft {
  if (!value || typeof value !== 'object') return false;
  const draft = value as Partial<CopilotProjectDraft>;
  return (
    draft.kind === DRAFT_KIND &&
    !!draft.project &&
    typeof draft.project.name === 'string' &&
    Array.isArray(draft.canvases) &&
    draft.canvases.every((canvas) =>
      !!canvas &&
      typeof canvas.defId === 'string' &&
      typeof canvas.title === 'string' &&
      Array.isArray(canvas.stickies) &&
      canvas.stickies.every((sticky) =>
        !!sticky && typeof sticky.zoneId === 'string' && typeof sticky.text === 'string',
      ),
    )
  );
}
