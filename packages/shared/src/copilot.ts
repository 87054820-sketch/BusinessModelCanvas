export const COPILOT_ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const;
export const COPILOT_MAX_IMAGE_ATTACHMENTS = 9;
export const COPILOT_MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type CopilotImageMimeType = (typeof COPILOT_ACCEPTED_IMAGE_TYPES)[number];

export interface CopilotImageAttachment {
  id: string;
  name: string;
  mimeType: CopilotImageMimeType;
  sizeBytes: number;
  dataUrl: string;
  width?: number;
  height?: number;
  thumbnailDataUrl?: string;
}

export type CopilotSourceType = 'image' | 'text';

export interface CopilotSourceFinding {
  id: string;
  sourceType: CopilotSourceType;
  sourceIndex?: number;
  text: string;
  confidence?: 'high' | 'medium' | 'low' | number;
}

export interface CopilotUnmappedSourceItem {
  findingId?: string;
  sourceType?: CopilotSourceType;
  sourceIndex?: number;
  text: string;
  reason: string;
}

export interface CopilotSourceCoverage {
  sourceImageCount?: number;
  findings?: CopilotSourceFinding[];
  mappedFindingIds?: string[];
  unmappedSourceItems?: CopilotUnmappedSourceItem[];
}

export interface CopilotDraftSticky {
  zoneId: string;
  text: string;
  color?: string;
  sourceRefs?: string[];
}

export interface CopilotDraftCanvas {
  defId: string;
  title: string;
  stickies: CopilotDraftSticky[];
  sourceRefs?: string[];
}

export interface CopilotDraftStory {
  title: string;
  content: string;
  sourceRefs?: string[];
}

/**
 * Optional quality report attached to a draft by the parser. The renderer
 * uses `hardCount` to disable the Apply button when any hard rule fails.
 * `issues` is grouped by `target` for display.
 */
export type CopilotQualityReport = import('./qualityRules.js').QualityReport;

export interface CopilotProjectDraft {
  kind: 'pingarden.projectDraft';
  project: {
    name: string;
    description?: string;
  };
  canvases: CopilotDraftCanvas[];
  stories?: CopilotDraftStory[];
  sourceCoverage?: CopilotSourceCoverage;
  missingFields?: string[];
  notes?: string[];
  quality?: CopilotQualityReport;
}

export type CopilotProjectUpdateOperation =
  | {
      type: 'createCanvas';
      defId: string;
      title: string;
      stickies: CopilotDraftSticky[];
      sourceRefs?: string[];
    }
  | {
      type: 'replaceCanvasStickies';
      canvasId: string;
      title?: string;
      stickies: CopilotDraftSticky[];
      sourceRefs?: string[];
    }
  | {
      type: 'createStory';
      title: string;
      content: string;
      sourceRefs?: string[];
    }
  | {
      type: 'replaceStory';
      storyId: string;
      title?: string;
      content: string;
      sourceRefs?: string[];
    };

export interface CopilotProjectUpdateDraft {
  kind: 'pingarden.projectUpdateDraft';
  projectId: string;
  summary: string;
  sourceCoverage?: CopilotSourceCoverage;
  operations: CopilotProjectUpdateOperation[];
  notes?: string[];
  quality?: CopilotQualityReport;
}

export type CopilotReferenceSourceType =
  | 'case'
  | 'pattern'
  | 'resource'
  | 'canvas'
  | 'story'
  | 'project'
  | 'conversation'
  | 'image'
  | 'text'
  | 'playbook';

export interface CopilotSourceReference {
  id: string;
  type: CopilotReferenceSourceType;
  label: string;
  locator?: string;
  summary?: string;
}

export interface CopilotBusinessInsight {
  id: string;
  title: string;
  summary: string;
  evidence?: string;
  sourceRefs?: string[];
}

export type CopilotSuggestedActionType =
  | 'createProject'
  | 'updateProject'
  | 'createCanvas'
  | 'updateCanvas'
  | 'createStory'
  | 'saveProjectInsight';

export interface CopilotSuggestedAction {
  id: string;
  type: CopilotSuggestedActionType;
  label: string;
  rationale: string;
  targetHint?: string;
  sourceRefs?: string[];
}

export interface CopilotDiscussionInsight {
  kind: 'pingarden.discussionInsight';
  title: string;
  summary: string;
  insights: CopilotBusinessInsight[];
  sourceRefs?: CopilotSourceReference[];
  suggestedActions?: CopilotSuggestedAction[];
  notes?: string[];
}

export interface CopilotSessionInsightItem {
  id: string;
  insight: CopilotDiscussionInsight;
  sourceMessageId?: string;
  addedAt: string;
  useful?: boolean;
  appliedAt?: string;
}

export type CopilotPreferenceScope = 'user' | 'project' | 'app';
export type CopilotMemorySuggestionType = 'preference' | 'workflow' | 'playbook';
export type CopilotMemorySuggestionStatus = 'pending' | 'accepted' | 'ignored';

export interface CopilotUserPreference {
  id: string;
  label: string;
  value: string;
  scope: CopilotPreferenceScope;
  confidence?: number;
  evidenceSummary?: string;
  confirmedAt: string;
  updatedAt: string;
}

export interface CopilotReasoningHabit {
  id: string;
  label: string;
  summary: string;
  confidence: number;
  evidenceSummary: string;
  confirmedAt?: string;
  updatedAt: string;
}

export interface CopilotUserProfile {
  displayName: string;
  preferences: CopilotUserPreference[];
  reasoningHabits: CopilotReasoningHabit[];
  preferredCanvasIds?: string[];
  updatedAt: string;
}

export interface CopilotMemorySuggestion {
  id: string;
  type: CopilotMemorySuggestionType;
  title: string;
  summary: string;
  suggestedValue: string;
  confidence: number;
  evidenceSummary: string;
  status: CopilotMemorySuggestionStatus;
  createdAt: string;
}

export const COPILOT_MEMORY_LAYERS = [
  'collaboration',
  'productThinking',
  'projectWorkflow',
  'contentAndEvidence',
  'visualAndUX',
  'domainContext',
] as const;

export type CopilotMemoryLayer = (typeof COPILOT_MEMORY_LAYERS)[number];
export type CopilotMemoryItemStatus = 'active' | 'soft' | 'archived';
export type CopilotMemorySource = 'conversation' | 'project-work' | 'manual' | 'migration';

export interface CopilotMemoryAppliesTo {
  projectIds?: string[];
  canvasDefIds?: string[];
  contexts?: string[];
}

export interface CopilotMemoryItem {
  id: string;
  layer: CopilotMemoryLayer;
  semanticKey: string;
  title: string;
  value: string;
  status: CopilotMemoryItemStatus;
  confidence: number;
  evidenceCount: number;
  evidenceSummary: string;
  source: CopilotMemorySource;
  appliesTo?: CopilotMemoryAppliesTo;
  firstSeenAt: string;
  lastSeenAt: string;
  updatedAt: string;
}

export interface CopilotMemorySignal {
  id: string;
  layer: CopilotMemoryLayer;
  semanticKey: string;
  summary: string;
  confidence: number;
  evidenceSummary: string;
  source: CopilotMemorySource;
  projectId?: string;
  createdAt: string;
}

export interface CopilotMemoryChange {
  id: string;
  summary: string;
  createdAt: string;
  upsertedIds: string[];
  mergedIds: string[];
  archivedIds: string[];
  deletedIds?: string[];
  previousLayeredMemory?: CopilotLayeredMemory;
}

export type CopilotMemoryLayers = Record<CopilotMemoryLayer, CopilotMemoryItem[]>;

export interface CopilotLayeredMemory {
  version: number;
  updatedAt: string;
  layers: CopilotMemoryLayers;
  recentSignals: CopilotMemorySignal[];
  changelog: CopilotMemoryChange[];
}

export interface CopilotMemoryPatchUpsert {
  layer: CopilotMemoryLayer;
  semanticKey: string;
  title: string;
  value: string;
  status?: CopilotMemoryItemStatus;
  confidence?: number;
  evidenceSummary: string;
  source?: CopilotMemorySource;
  appliesTo?: CopilotMemoryAppliesTo;
}

export interface CopilotMemoryPatch {
  upsert?: CopilotMemoryPatchUpsert[];
  merge?: Array<{
    targetId: string;
    sourceIds: string[];
    result?: CopilotMemoryPatchUpsert;
    reason: string;
  }>;
  archive?: Array<{
    id: string;
    reason: string;
  }>;
  signals?: Array<Omit<CopilotMemorySignal, 'id' | 'createdAt'>>;
  summary: string;
}

export interface CopilotPlaybookDescriptor {
  id: string;
  title: string;
  summary: string;
  version: string;
  scope: 'bundled' | 'user-local' | 'project-local';
  readonly: boolean;
  priority: number;
  triggers: string[];
  content: string;
}

export interface CopilotMemoryState {
  profile: CopilotUserProfile;
  suggestions: CopilotMemorySuggestion[];
  layeredMemory: CopilotLayeredMemory;
  bundledPlaybooks: CopilotPlaybookDescriptor[];
  userPlaybooks: CopilotPlaybookDescriptor[];
}

export interface CopilotSourceCoverageIssueOptions {
  expectedImageCount?: number;
  requireCompleteCoverage?: boolean;
  requireStoryForTextFindings?: boolean;
  stories?: CopilotDraftStory[];
}

export function getCopilotSourceCoverageIssues(
  sourceCoverage: CopilotSourceCoverage | undefined,
  opts: CopilotSourceCoverageIssueOptions = {},
): string[] {
  const expectedImageCount = normaliseCount(opts.expectedImageCount);
  if (!sourceCoverage) return expectedImageCount > 0 ? ['source:missing-coverage'] : [];

  const issues: string[] = [];
  const findings = sourceCoverage.findings ?? [];
  const mapped = new Set(sourceCoverage.mappedFindingIds ?? []);
  const unmapped = sourceCoverage.unmappedSourceItems ?? [];
  const unmappedIds = new Set(unmapped.map((item) => item.findingId).filter(Boolean));
  const declaredImageCount = normaliseCount(sourceCoverage.sourceImageCount);
  const sourceImageCount = Math.max(declaredImageCount, expectedImageCount);

  if (expectedImageCount > 0 && declaredImageCount < expectedImageCount) {
    issues.push(`source:image-count:${declaredImageCount}<${expectedImageCount}`);
  }

  for (let index = 1; index <= sourceImageCount; index += 1) {
    if (!findings.some((finding) => finding.sourceType === 'image' && finding.sourceIndex === index)) {
      issues.push(`image:${index}:no-findings`);
    }
  }

  for (const finding of findings) {
    if (!mapped.has(finding.id) && !unmappedIds.has(finding.id)) {
      issues.push(`finding:${finding.id}:not-accounted`);
    }
  }

  if (opts.requireCompleteCoverage && unmapped.length > 0) {
    issues.push('source:unmapped-items');
  }

  if (
    opts.requireStoryForTextFindings &&
    findings.some((finding) => finding.sourceType === 'text') &&
    (!opts.stories || opts.stories.length === 0)
  ) {
    issues.push('story:missing-for-text-source');
  }

  return issues;
}

function normaliseCount(value: number | undefined): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value ?? 0));
}
