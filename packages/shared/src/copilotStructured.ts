import type {
  CopilotDiscussionInsight,
  CopilotProjectDraft,
  CopilotProjectUpdateDraft,
  CopilotSourceCoverage,
} from './copilot.js';

export const COPILOT_STRUCTURED_RESPONSE_KIND = 'pingarden.response.v1' as const;

export type CopilotTypedReferenceKind =
  | 'case'
  | 'resource'
  | 'resourceChapter'
  | 'canvasTemplate'
  | 'canvasInstance'
  | 'project'
  | 'story'
  | 'pattern'
  | 'strategyFramework'
  | 'experiment';

export interface CopilotTypedReference {
  kind: CopilotTypedReferenceKind;
  label: string;
  id?: string;
  slug?: string;
  defId?: string;
  canvasId?: string;
  projectId?: string;
  storyId?: string;
  resourceSlug?: string;
  chapterSlug?: string;
  locator?: string;
  summary?: string;
  confidence?: 'high' | 'medium' | 'low' | number;
  intent?: 'mention' | 'preview' | 'open';
}

export interface CopilotDiagnostic {
  code: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
  details?: Record<string, unknown>;
}

export type CopilotStructuredCard =
  | { type: 'projectDraft'; draft: CopilotProjectDraft }
  | { type: 'projectUpdateDraft'; draft: CopilotProjectUpdateDraft }
  | { type: 'discussionInsight'; insight: CopilotDiscussionInsight }
  | { type: 'referenceBoard'; references: CopilotTypedReference[]; title?: string }
  | { type: 'sourceCoverageReport'; sourceCoverage: CopilotSourceCoverage; title?: string };

export interface CopilotStructuredResponse {
  kind: typeof COPILOT_STRUCTURED_RESPONSE_KIND;
  answerMarkdown: string;
  cards?: CopilotStructuredCard[];
  references?: CopilotTypedReference[];
  diagnostics?: CopilotDiagnostic[];
}

const STRUCTURED_FENCE_RE = /```(?:json|pingarden-response)?\s*([\s\S]*?)```/g;

export function extractCopilotStructuredResponses(content: string): CopilotStructuredResponse[] {
  const out: CopilotStructuredResponse[] = [];
  let match: RegExpExecArray | null;
  while ((match = STRUCTURED_FENCE_RE.exec(content)) !== null) {
    const parsed = parseStructuredResponse(match[1] ?? '');
    if (parsed) out.push(parsed);
  }
  if (out.length > 0) return out;
  const parsed = parseStructuredResponse(content);
  return parsed ? [parsed] : [];
}

export function stripCopilotStructuredResponseBlocks(content: string): string {
  return content
    .replace(/```(?:json|pingarden-response)?\s*[\s\S]*?"kind"\s*:\s*"pingarden\.response\.v1"[\s\S]*?```/g, '')
    .trim();
}

export function parseStructuredResponse(raw: string): CopilotStructuredResponse | null {
  const trimmed = raw.trim();
  if (!trimmed.includes(COPILOT_STRUCTURED_RESPONSE_KIND)) return null;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return isCopilotStructuredResponse(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function isCopilotStructuredResponse(value: unknown): value is CopilotStructuredResponse {
  if (!value || typeof value !== 'object') return false;
  const response = value as Partial<CopilotStructuredResponse>;
  return (
    response.kind === COPILOT_STRUCTURED_RESPONSE_KIND &&
    typeof response.answerMarkdown === 'string' &&
    (response.cards === undefined || (Array.isArray(response.cards) && response.cards.every(isStructuredCard))) &&
    (response.references === undefined || (Array.isArray(response.references) && response.references.every(isTypedReference))) &&
    (response.diagnostics === undefined || (Array.isArray(response.diagnostics) && response.diagnostics.every(isDiagnostic)))
  );
}

function isStructuredCard(value: unknown): value is CopilotStructuredCard {
  if (!value || typeof value !== 'object') return false;
  const card = value as Record<string, unknown>;
  if (card.type === 'projectDraft') return isProjectDraft(card.draft);
  if (card.type === 'projectUpdateDraft') return isProjectUpdateDraft(card.draft);
  if (card.type === 'discussionInsight') return isDiscussionInsight(card.insight);
  if (card.type === 'referenceBoard') return Array.isArray(card.references) && card.references.every(isTypedReference);
  if (card.type === 'sourceCoverageReport') return isSourceCoverage(card.sourceCoverage);
  return false;
}

function isTypedReference(value: unknown): value is CopilotTypedReference {
  if (!value || typeof value !== 'object') return false;
  const ref = value as Partial<CopilotTypedReference>;
  return (
    isReferenceKind(ref.kind) &&
    typeof ref.label === 'string' &&
    ref.label.trim().length > 0 &&
    optionalString(ref.id) &&
    optionalString(ref.slug) &&
    optionalString(ref.defId) &&
    optionalString(ref.canvasId) &&
    optionalString(ref.projectId) &&
    optionalString(ref.storyId) &&
    optionalString(ref.resourceSlug) &&
    optionalString(ref.chapterSlug) &&
    optionalString(ref.locator) &&
    optionalString(ref.summary) &&
    (ref.intent === undefined || ref.intent === 'mention' || ref.intent === 'preview' || ref.intent === 'open')
  );
}

function isReferenceKind(kind: unknown): kind is CopilotTypedReferenceKind {
  return (
    kind === 'case' ||
    kind === 'resource' ||
    kind === 'resourceChapter' ||
    kind === 'canvasTemplate' ||
    kind === 'canvasInstance' ||
    kind === 'project' ||
    kind === 'story' ||
    kind === 'pattern' ||
    kind === 'strategyFramework' ||
    kind === 'experiment'
  );
}

function isDiagnostic(value: unknown): value is CopilotDiagnostic {
  if (!value || typeof value !== 'object') return false;
  const diagnostic = value as Partial<CopilotDiagnostic>;
  return (
    typeof diagnostic.code === 'string' &&
    (diagnostic.severity === 'info' || diagnostic.severity === 'warning' || diagnostic.severity === 'error') &&
    typeof diagnostic.message === 'string'
  );
}

function optionalString(value: unknown): boolean {
  return value === undefined || typeof value === 'string';
}

function isProjectDraft(value: unknown): value is CopilotProjectDraft {
  if (!value || typeof value !== 'object') return false;
  const draft = value as Partial<CopilotProjectDraft>;
  return draft.kind === 'pingarden.projectDraft' && Boolean(draft.project) && Array.isArray(draft.canvases);
}

function isProjectUpdateDraft(value: unknown): value is CopilotProjectUpdateDraft {
  if (!value || typeof value !== 'object') return false;
  const draft = value as Partial<CopilotProjectUpdateDraft>;
  return draft.kind === 'pingarden.projectUpdateDraft' && typeof draft.projectId === 'string' && Array.isArray(draft.operations);
}

function isDiscussionInsight(value: unknown): value is CopilotDiscussionInsight {
  if (!value || typeof value !== 'object') return false;
  const insight = value as Partial<CopilotDiscussionInsight>;
  return insight.kind === 'pingarden.discussionInsight' && typeof insight.title === 'string' && Array.isArray(insight.insights);
}

function isSourceCoverage(value: unknown): value is CopilotSourceCoverage {
  if (!value || typeof value !== 'object') return false;
  const coverage = value as Partial<CopilotSourceCoverage>;
  return (
    (coverage.sourceImageCount === undefined || typeof coverage.sourceImageCount === 'number') &&
    (coverage.findings === undefined || Array.isArray(coverage.findings)) &&
    (coverage.mappedFindingIds === undefined || Array.isArray(coverage.mappedFindingIds)) &&
    (coverage.unmappedSourceItems === undefined || Array.isArray(coverage.unmappedSourceItems))
  );
}
