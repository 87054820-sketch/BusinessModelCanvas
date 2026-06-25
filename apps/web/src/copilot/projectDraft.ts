import {
  getCopilotSourceCoverageIssues,
  parseStoryCanvasDirectives,
  validateProjectDraft,
  validateProjectUpdateDraft,
  type CopilotBusinessInsight,
  type CopilotDiscussionInsight,
  type CopilotDraftStory,
  type CopilotProjectDraft,
  type CopilotProjectUpdateDraft,
  type CopilotProjectUpdateOperation,
  type CopilotSourceCoverage,
  type CopilotSourceFinding,
  type CopilotUnmappedSourceItem,
  type Lang,
  type QualityReport,
} from '@pingarden/shared';

const PROJECT_DRAFT_KIND = 'pingarden.projectDraft';
const PROJECT_UPDATE_DRAFT_KIND = 'pingarden.projectUpdateDraft';
const DISCUSSION_INSIGHT_KIND = 'pingarden.discussionInsight';

export function buildProjectCreationPrompt(lang: Lang): string {
  return lang === 'zh'
    ? '请根据我提供的图片、链接和说明创建一个 PinGarden 项目草稿；请尽量完整整合每张图片中的可见标签，并把描述性文字整理成 Story。'
    : 'Create a PinGarden project draft from my images, links, and notes. Preserve visible labels from every image and turn descriptive notes into a Story.';
}

export function buildProjectIdeaSeed(lang: Lang): string {
  return lang === 'zh'
    ? '我想创建一个项目。资料如下：\n- 链接：\n- 图片说明：\n- 目标用户：\n- 描述性文字 / Story 线索：\n- 我希望先生成的画布：商业模式画布'
    : 'I want to create a project. Materials:\n- Link:\n- Image notes:\n- Target users:\n- Descriptive notes / Story clues:\n- First canvas I want: Business Model Canvas';
}

export function stripProjectDraftBlocks(content: string): string {
  return content
    .replace(/```(?:json|pingarden-project-draft|pingarden-project-update-draft|pingarden-discussion-insight)?\s*[\s\S]*?"kind"\s*:\s*"pingarden\.(?:projectDraft|projectUpdateDraft|discussionInsight)"[\s\S]*?```/g, '')
    .trim();
}

export function extractProjectDrafts(content: string): CopilotProjectDraft[] {
  return extractJsonDrafts(content, isProjectDraft).map(decorateProjectDraft);
}

export function extractProjectUpdateDrafts(content: string): CopilotProjectUpdateDraft[] {
  return extractJsonDrafts(content, isProjectUpdateDraft).map(decorateProjectUpdateDraft);
}

export function extractDiscussionInsights(content: string): CopilotDiscussionInsight[] {
  return extractJsonDrafts(content, isDiscussionInsight);
}

export const getSourceCoverageIssues = getCopilotSourceCoverageIssues;

function decorateProjectDraft(draft: CopilotProjectDraft): CopilotProjectDraft {
  const report = validateProjectDraft({
    draft,
    parseDirectives: parseStoryCanvasDirectives,
  });
  return { ...draft, quality: report };
}

function decorateProjectUpdateDraft(draft: CopilotProjectUpdateDraft): CopilotProjectUpdateDraft {
  const report = validateProjectUpdateDraft({
    draft,
    projectCanvasDefIds: new Set(),
    projectCanvasIds: new Set(),
    parseDirectives: parseStoryCanvasDirectives,
  });
  return { ...draft, quality: report };
}

function extractJsonDrafts<T>(content: string, guard: (value: unknown) => value is T): T[] {
  const drafts: T[] = [];
  const fenced = /```(?:json|pingarden-project-draft|pingarden-project-update-draft|pingarden-discussion-insight)?\s*([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = fenced.exec(content)) !== null) {
    const parsed = parseDraft(match[1] ?? '', guard);
    if (parsed) drafts.push(parsed);
  }
  if (drafts.length > 0) return drafts;
  const parsed = parseDraft(content, guard);
  return parsed ? [parsed] : [];
}

function parseDraft<T>(raw: string, guard: (value: unknown) => value is T): T | null {
  const trimmed = raw.trim();
  if (!trimmed.includes('pingarden.')) return null;
  try {
    const value = JSON.parse(trimmed) as unknown;
    return guard(value) ? value : null;
  } catch {
    return null;
  }
}

function isProjectDraft(value: unknown): value is CopilotProjectDraft {
  if (!value || typeof value !== 'object') return false;
  const draft = value as Partial<CopilotProjectDraft>;
  return (
    draft.kind === PROJECT_DRAFT_KIND &&
    !!draft.project &&
    typeof draft.project.name === 'string' &&
    Array.isArray(draft.canvases) &&
    draft.canvases.every(isDraftCanvas) &&
    (draft.stories === undefined || draft.stories.every(isDraftStory)) &&
    (draft.sourceCoverage === undefined || isSourceCoverage(draft.sourceCoverage))
  );
}

function isProjectUpdateDraft(value: unknown): value is CopilotProjectUpdateDraft {
  if (!value || typeof value !== 'object') return false;
  const draft = value as Partial<CopilotProjectUpdateDraft>;
  return (
    draft.kind === PROJECT_UPDATE_DRAFT_KIND &&
    typeof draft.projectId === 'string' &&
    typeof draft.summary === 'string' &&
    Array.isArray(draft.operations) &&
    draft.operations.every(isProjectUpdateOperation) &&
    (draft.sourceCoverage === undefined || isSourceCoverage(draft.sourceCoverage))
  );
}

function isDiscussionInsight(value: unknown): value is CopilotDiscussionInsight {
  if (!value || typeof value !== 'object') return false;
  const insight = value as Partial<CopilotDiscussionInsight>;
  return (
    insight.kind === DISCUSSION_INSIGHT_KIND &&
    typeof insight.title === 'string' &&
    typeof insight.summary === 'string' &&
    Array.isArray(insight.insights) &&
    insight.insights.every(isBusinessInsight) &&
    (insight.sourceRefs === undefined || insight.sourceRefs.every(isSourceReference)) &&
    (insight.suggestedActions === undefined || insight.suggestedActions.every(isSuggestedAction))
  );
}

function isBusinessInsight(value: unknown): value is CopilotBusinessInsight {
  if (!value || typeof value !== 'object') return false;
  const insight = value as CopilotBusinessInsight;
  return (
    typeof insight.id === 'string' &&
    typeof insight.title === 'string' &&
    typeof insight.summary === 'string' &&
    (insight.evidence === undefined || typeof insight.evidence === 'string') &&
    (insight.sourceRefs === undefined || insight.sourceRefs.every((ref) => typeof ref === 'string'))
  );
}

function isSourceReference(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const ref = value as { id?: unknown; type?: unknown; label?: unknown; locator?: unknown; summary?: unknown };
  return (
    typeof ref.id === 'string' &&
    typeof ref.type === 'string' &&
    typeof ref.label === 'string' &&
    (ref.locator === undefined || typeof ref.locator === 'string') &&
    (ref.summary === undefined || typeof ref.summary === 'string')
  );
}

function isSuggestedAction(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const action = value as { id?: unknown; type?: unknown; label?: unknown; rationale?: unknown; targetHint?: unknown; sourceRefs?: unknown };
  return (
    typeof action.id === 'string' &&
    typeof action.type === 'string' &&
    typeof action.label === 'string' &&
    typeof action.rationale === 'string' &&
    (action.targetHint === undefined || typeof action.targetHint === 'string') &&
    (action.sourceRefs === undefined || (Array.isArray(action.sourceRefs) && action.sourceRefs.every((ref) => typeof ref === 'string')))
  );
}

function isDraftCanvas(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const canvas = value as CopilotProjectDraft['canvases'][number];
  return (
    typeof canvas.defId === 'string' &&
    typeof canvas.title === 'string' &&
    Array.isArray(canvas.stickies) &&
    canvas.stickies.every(isDraftSticky)
  );
}

function isDraftSticky(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const sticky = value as CopilotProjectDraft['canvases'][number]['stickies'][number];
  return (
    typeof sticky.zoneId === 'string' &&
    typeof sticky.text === 'string' &&
    (sticky.color === undefined || typeof sticky.color === 'string') &&
    (sticky.sourceRefs === undefined || sticky.sourceRefs.every((ref) => typeof ref === 'string'))
  );
}

function isDraftStory(value: unknown): value is CopilotDraftStory {
  if (!value || typeof value !== 'object') return false;
  const story = value as CopilotDraftStory;
  return (
    typeof story.title === 'string' &&
    typeof story.content === 'string' &&
    (story.sourceRefs === undefined || story.sourceRefs.every((ref) => typeof ref === 'string'))
  );
}

function isProjectUpdateOperation(value: unknown): value is CopilotProjectUpdateOperation {
  if (!value || typeof value !== 'object') return false;
  const operation = value as CopilotProjectUpdateOperation;
  if (operation.type === 'createCanvas') {
    return typeof operation.defId === 'string' && typeof operation.title === 'string' && Array.isArray(operation.stickies) && operation.stickies.every(isDraftSticky);
  }
  if (operation.type === 'replaceCanvasStickies') {
    return typeof operation.canvasId === 'string' && Array.isArray(operation.stickies) && operation.stickies.every(isDraftSticky);
  }
  if (operation.type === 'createStory') {
    return typeof operation.title === 'string' && typeof operation.content === 'string';
  }
  if (operation.type === 'replaceStory') {
    return typeof operation.storyId === 'string' && typeof operation.content === 'string';
  }
  return false;
}

function isSourceCoverage(value: unknown): value is CopilotSourceCoverage {
  if (!value || typeof value !== 'object') return false;
  const coverage = value as CopilotSourceCoverage;
  return (
    (coverage.sourceImageCount === undefined || typeof coverage.sourceImageCount === 'number') &&
    (coverage.findings === undefined || coverage.findings.every(isSourceFinding)) &&
    (coverage.mappedFindingIds === undefined || coverage.mappedFindingIds.every((id) => typeof id === 'string')) &&
    (coverage.unmappedSourceItems === undefined || coverage.unmappedSourceItems.every(isUnmappedSourceItem))
  );
}

function isSourceFinding(value: unknown): value is CopilotSourceFinding {
  if (!value || typeof value !== 'object') return false;
  const finding = value as CopilotSourceFinding;
  return (
    typeof finding.id === 'string' &&
    (finding.sourceType === 'image' || finding.sourceType === 'text') &&
    (finding.sourceIndex === undefined || typeof finding.sourceIndex === 'number') &&
    typeof finding.text === 'string'
  );
}

function isUnmappedSourceItem(value: unknown): value is CopilotUnmappedSourceItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as CopilotUnmappedSourceItem;
  return (
    typeof item.text === 'string' &&
    typeof item.reason === 'string' &&
    (item.findingId === undefined || typeof item.findingId === 'string') &&
    (item.sourceIndex === undefined || typeof item.sourceIndex === 'number') &&
    (item.sourceType === undefined || item.sourceType === 'image' || item.sourceType === 'text')
  );
}
