import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type {
  CanvasMeta,
  CopilotDraftSticky,
  CopilotProjectUpdateDraft,
  CopilotProjectUpdateOperation,
  Lang,
  QualityIssue,
} from '@pingarden/shared';
import { api } from '../api/client';
import { storiesApi } from '../api/stories';
import { getSourceCoverageIssues } from '../copilot/projectDraft';
import { rewriteStoryCanvasDirectivesToCanvasIds, type CopilotCanvasReference } from '../copilot/storyCanvasReferences';
import type { CopilotUpdateBaseline } from '../copilot/useConversation';
import { useAuthSession } from '../identity/useIdentity';

type ApplyState = 'idle' | 'applying' | 'applied' | 'error';
type ApplyReportItem = { index: number; label: string; status: 'success' | 'error'; message?: string };

export function CopilotProjectUpdateDraftCard({
  draft,
  projectId,
  lang,
  expectedSourceImageCount,
  updateBaseline,
}: {
  draft: CopilotProjectUpdateDraft;
  projectId?: string;
  lang: Lang;
  expectedSourceImageCount?: number;
  updateBaseline?: CopilotUpdateBaseline;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { identity, user, authenticated } = useAuthSession();
  const displayName = identity?.displayName ?? user?.displayName ?? '';
  const [state, setState] = useState<ApplyState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [applyReport, setApplyReport] = useState<ApplyReportItem[]>([]);
  const targetProjectId = draft.projectId || projectId || '';
  const sourceCoverage = draft.sourceCoverage;
  const sourceFindings = sourceCoverage?.findings ?? [];
  const sourceIssues = useMemo(
    () => getSourceCoverageIssues(sourceCoverage, {
      expectedImageCount: expectedSourceImageCount,
      requireCompleteCoverage: true,
    }),
    [sourceCoverage, expectedSourceImageCount],
  );
  const hasProjectMismatch = Boolean(projectId && draft.projectId && draft.projectId !== projectId);
  const operationIssues = getOperationIssues(draft.operations);
  const quality = draft.quality;
  const hardIssues = quality?.issues.filter((issue) => issue.severity === 'hard') ?? [];
  const softIssues = quality?.issues.filter((issue) => issue.severity === 'soft') ?? [];
  const ready = Boolean(targetProjectId) && !hasProjectMismatch && sourceIssues.length === 0 && operationIssues.length === 0 && hardIssues.length === 0;
  const canvasOps = draft.operations.filter((op) => op.type === 'createCanvas' || op.type === 'replaceCanvasStickies');
  const storyOps = draft.operations.filter((op) => op.type === 'createStory' || op.type === 'replaceStory');
  const stickyCount = canvasOps.reduce((sum, op) => sum + ('stickies' in op ? op.stickies.length : 0), 0);

  async function applyDraft() {
    if (!authenticated || !ready || state === 'applying') return;
    setState('applying');
    setError(null);
    setApplyReport([]);
    // Final hard-rule gate. Same rationale as Create card: `ready`
    // already blocks the button when hardIssues is non-empty, but
    // re-validate here in case the draft was mutated after parse.
    if (hardIssues.length > 0) {
      const first = hardIssues[0]!;
      setError(t('library.copilot.projectUpdate.qualityHardBlocked', {
        message: first.message[lang] ?? first.message.en,
      }));
      setState('error');
      return;
    }
    const report: ApplyReportItem[] = [];
    try {
      const canvasRefs = await getProjectCanvasReferences(targetProjectId, displayName);
      for (const [index, operation] of draft.operations.entries()) {
        try {
          const label = await applyOperation(
            operation,
            targetProjectId,
            lang,
            displayName,
            canvasRefs,
            updateBaseline,
          );
          report.push({ index, label, status: 'success' });
          setApplyReport([...report]);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          report.push({ index, label: operationLabel(operation), status: 'error', message });
          setApplyReport([...report]);
          throw err;
        }
      }
      setState('applied');
      navigate(`/p/${targetProjectId}`, { replace: true });
    } catch (err) {
      console.error('Apply Copilot project update draft failed:', err);
      setError(err instanceof Error ? err.message : String(err));
      setState('error');
    }
  }

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 px-3 py-2">
        <div className="text-[12px] font-semibold text-gray-950">
          {t('library.copilot.projectUpdate.title')}
        </div>
        <div className="mt-0.5 text-[11px] text-gray-600">
          {draft.summary || t('library.copilot.projectUpdate.subtitle')}
        </div>
      </div>
      <div className="space-y-3 px-3 py-3">
        {(hasProjectMismatch || sourceIssues.length > 0 || operationIssues.length > 0 || hardIssues.length > 0 || softIssues.length > 0) && (
          <div className="space-y-2">
            {(hasProjectMismatch || sourceIssues.length > 0 || operationIssues.length > 0 || hardIssues.length > 0) && (
              <div className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
                {hasProjectMismatch && <div>{t('library.copilot.projectUpdate.projectMismatch')}</div>}
                {sourceIssues.length > 0 && <div>{t('library.copilot.projectUpdate.sourceCoverageWarning')}</div>}
                {operationIssues.length > 0 && <div>{t('library.copilot.projectUpdate.operationWarning')}</div>}
                {hardIssues.length > 0 && (
                  <UpdateQualityIssueList
                    label={t('library.copilot.projectUpdate.qualityHardTitle', { count: hardIssues.length })}
                    issues={hardIssues}
                    lang={lang}
                    tone="hard"
                  />
                )}
              </div>
            )}
            {softIssues.length > 0 && (
              <div className="space-y-1 rounded-xl border border-yellow-200 bg-yellow-50/80 px-3 py-2 text-[11px] text-yellow-900">
                <div className="font-medium">{t('library.copilot.projectUpdate.qualitySoftTitle', { count: softIssues.length })}</div>
                <UpdateQualityIssueList issues={softIssues} lang={lang} tone="soft" />
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <Metric label={t('library.copilot.projectUpdate.operationCount')} value={draft.operations.length} />
          <Metric label={t('library.copilot.projectUpdate.stickyCount')} value={stickyCount} />
          <Metric label={t('library.copilot.projectUpdate.storyOperationCount')} value={storyOps.length} />
          <Metric label={t('library.copilot.projectUpdate.sourceCount')} value={sourceFindings.length} />
        </div>

        {sourceCoverage && (
          <div className="rounded-xl border border-sky-100 bg-sky-50/60 px-3 py-2 text-[11px] leading-relaxed text-sky-900">
            {t('library.copilot.projectUpdate.sourceCoverageSummary', {
              images: sourceCoverage.sourceImageCount ?? 0,
              findings: sourceFindings.length,
              mapped: sourceCoverage.mappedFindingIds?.length ?? 0,
              unmapped: sourceCoverage.unmappedSourceItems?.length ?? 0,
            })}
          </div>
        )}

        <div className="space-y-1.5">
          {draft.operations.map((operation, index) => (
            <OperationRow key={index} operation={operation} />
          ))}
        </div>

        {applyReport.length > 0 && (
          <div className="space-y-1 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-[11px] text-gray-700">
            <div className="font-medium text-gray-900">{t('library.copilot.projectUpdate.applyReportTitle')}</div>
            {applyReport.map((item) => (
              <div key={item.index} className={item.status === 'error' ? 'text-red-700' : 'text-emerald-700'}>
                {item.status === 'error'
                  ? t('library.copilot.projectUpdate.applyReportFailed', { label: item.label, message: item.message })
                  : t('library.copilot.projectUpdate.applyReportSuccess', { label: item.label })}
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-100 bg-red-50 px-2 py-1.5 text-[11px] text-red-700">
            {error}
          </div>
        )}

        <button
          type="button"
          disabled={!ready || !authenticated || state === 'applying' || state === 'applied'}
          onClick={applyDraft}
          className="w-full rounded-xl bg-gray-950 px-3 py-2 text-[12px] font-medium text-white shadow-sm transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {state === 'applying'
            ? t('library.copilot.projectUpdate.applying')
            : state === 'applied'
              ? t('library.copilot.projectUpdate.applied')
              : t('library.copilot.projectUpdate.apply')}
        </button>
      </div>
    </div>
  );
}

function OperationRow({ operation }: { operation: CopilotProjectUpdateOperation }) {
  const { t } = useTranslation();
  if (operation.type === 'createCanvas') {
    return (
      <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] font-medium text-gray-900">{operation.title}</span>
          <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] text-gray-500">
            {t('library.copilot.projectUpdate.createCanvas')}
          </span>
        </div>
        <div className="mt-1 text-[10px] text-gray-400">{operation.defId} · {operation.stickies.length} notes</div>
      </div>
    );
  }
  if (operation.type === 'replaceCanvasStickies') {
    return (
      <div className="rounded-xl border border-amber-100 bg-amber-50/70 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] font-medium text-amber-950">{operation.title || operation.canvasId}</span>
          <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] text-amber-700">
            {t('library.copilot.projectUpdate.replaceCanvas')}
          </span>
        </div>
        <div className="mt-1 text-[10px] text-amber-700">{operation.canvasId} · {operation.stickies.length} notes</div>
      </div>
    );
  }
  if (operation.type === 'createStory') {
    return (
      <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2">
        <div className="text-[12px] font-medium text-emerald-950">{operation.title}</div>
        <div className="mt-1 text-[10px] text-emerald-700">{t('library.copilot.projectUpdate.createStory')}</div>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-amber-100 bg-amber-50/70 px-3 py-2">
      <div className="text-[12px] font-medium text-amber-950">{operation.title || operation.storyId}</div>
      <div className="mt-1 text-[10px] text-amber-700">{t('library.copilot.projectUpdate.replaceStory')}</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
      <div className="text-[10px] text-gray-500">{label}</div>
      <div className="mt-0.5 text-[15px] font-semibold text-gray-950">{value}</div>
    </div>
  );
}

function UpdateQualityIssueList({
  issues,
  lang,
  tone,
  label,
}: {
  issues: QualityIssue[];
  lang: Lang;
  tone: 'hard' | 'soft';
  label?: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-0.5">
      {label && <div className="font-medium">{label}</div>}
      {issues.map((issue, index) => (
        <div key={`${issue.code}:${index}`} className="leading-relaxed">
          <span className="mr-1 inline-block rounded px-1 py-px text-[9px] font-semibold uppercase tracking-wide">
            {tone === 'hard'
              ? t('library.copilot.quality.severityHard')
              : t('library.copilot.quality.severitySoft')}
          </span>
          {issue.message[lang] ?? issue.message.en}
        </div>
      ))}
    </div>
  );
}

async function applyOperation(
  operation: CopilotProjectUpdateOperation,
  projectId: string,
  lang: Lang,
  displayName: string,
  canvasRefs: CopilotCanvasReference[],
  updateBaseline: CopilotUpdateBaseline | undefined,
): Promise<string> {
  if (operation.type === 'createCanvas') {
    const detail = await api.getDef(operation.defId);
    const stickies = validateStickies(operation.stickies, detail.def.zones.map((zone) => zone.id));
    if (stickies.length === 0) throw new Error(`Canvas ${operation.title} has no valid stickies`);
    const canvas = await api.createCanvas(
      {
        projectId,
        defId: operation.defId,
        title: operation.title.trim() || detail.def.name[lang] || detail.def.name.en,
        language: lang,
      },
      displayName,
    );
    await api.bulkStickies(canvas.id, stickies, displayName);
    canvasRefs.push(toCanvasReference(canvas));
    return operationLabel(operation);
  }

  if (operation.type === 'replaceCanvasStickies') {
    const canvas = await api.getCanvas(operation.canvasId, displayName);
    if (canvas.projectId !== projectId) throw new Error(`Canvas ${operation.canvasId} is outside this project`);
    assertBaselineUnchanged('canvas', operation.canvasId, canvas.updatedAt, updateBaseline?.canvases[operation.canvasId]);
    const detail = await api.getDef(canvas.defId);
    const stickies = validateStickies(operation.stickies, detail.def.zones.map((zone) => zone.id));
    if (stickies.length === 0) throw new Error(`Canvas ${operation.canvasId} has no valid stickies`);
    if (operation.title?.trim() && operation.title.trim() !== canvas.title) {
      await api.updateCanvas(operation.canvasId, { title: operation.title.trim() }, displayName);
    }
    await api.bulkStickies(operation.canvasId, stickies, displayName);
    return operationLabel(operation);
  }

  if (operation.type === 'createStory') {
    await storiesApi.create(
      {
        projectId,
        title: operation.title.trim(),
        content: rewriteStoryCanvasDirectivesToCanvasIds(operation.content.trim(), canvasRefs),
        status: 'draft',
      },
      displayName,
    );
    return operationLabel(operation);
  }

  const story = await storiesApi.get(operation.storyId, displayName);
  if (story.projectId !== projectId) throw new Error(`Story ${operation.storyId} is outside this project`);
  assertBaselineUnchanged('story', operation.storyId, story.updatedAt, updateBaseline?.stories[operation.storyId]);
  await storiesApi.update(
    operation.storyId,
    {
      ...(operation.title?.trim() ? { title: operation.title.trim() } : {}),
      content: rewriteStoryCanvasDirectivesToCanvasIds(operation.content.trim(), canvasRefs),
    },
    displayName,
  );
  return operationLabel(operation);
}

function validateStickies(stickies: CopilotDraftSticky[], validZoneIds: string[]) {
  const zones = new Set(validZoneIds);
  return stickies
    .filter((sticky) => zones.has(sticky.zoneId.trim()) && sticky.text.trim())
    .map((sticky) => ({
      zoneId: sticky.zoneId.trim(),
      text: sticky.text.trim(),
      ...(sticky.color ? { color: sticky.color } : {}),
    }));
}

async function getProjectCanvasReferences(projectId: string, displayName: string): Promise<CopilotCanvasReference[]> {
  const canvases = await api.listCanvases(displayName, { projectId });
  return canvases.map(toCanvasReference);
}

function toCanvasReference(canvas: CanvasMeta): CopilotCanvasReference {
  return {
    canvasId: canvas.id,
    defId: canvas.defId,
    title: canvas.title,
    ...(canvas.variant?.id ? { variantId: canvas.variant.id } : {}),
  };
}

function assertBaselineUnchanged(
  kind: 'canvas' | 'story',
  id: string,
  currentUpdatedAt: string,
  baselineUpdatedAt: string | undefined,
) {
  if (!baselineUpdatedAt) return;
  if (baselineUpdatedAt !== currentUpdatedAt) {
    throw new Error(`${kind} ${id} changed after this Copilot draft was generated. Regenerate the draft before applying.`);
  }
}

function operationLabel(operation: CopilotProjectUpdateOperation): string {
  if (operation.type === 'createCanvas') return operation.title || operation.defId;
  if (operation.type === 'replaceCanvasStickies') return operation.title || operation.canvasId;
  if (operation.type === 'createStory') return operation.title;
  return operation.title || operation.storyId;
}

function getOperationIssues(operations: CopilotProjectUpdateOperation[]): string[] {
  const issues: string[] = [];
  if (operations.length === 0) issues.push('operations:empty');
  for (const [index, operation] of operations.entries()) {
    if ((operation.type === 'createCanvas' || operation.type === 'replaceCanvasStickies') && operation.stickies.length === 0) {
      issues.push(`operation:${index}:empty-stickies`);
    }
    if (operation.type === 'createStory' && (!operation.title.trim() || !operation.content.trim())) {
      issues.push(`operation:${index}:empty-story`);
    }
    if (operation.type === 'replaceStory' && !operation.content.trim()) {
      issues.push(`operation:${index}:empty-story`);
    }
  }
  return issues;
}
