import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import type { CopilotDraftSticky, CopilotProjectDraft, Lang, QualityIssue, QualityReport } from '@pingarden/shared';
import { api } from '../api/client';
import { projectsApi } from '../api/projects';
import { storiesApi } from '../api/stories';
import { getSourceCoverageIssues } from '../copilot/projectDraft';
import { rewriteStoryCanvasDirectivesToCanvasIds, type CopilotCanvasReference } from '../copilot/storyCanvasReferences';
import { useIdentity } from '../identity/useIdentity';
import { preserveNavigationState } from '../navigation/useSmartBack';

type CreateState = 'idle' | 'creating' | 'created' | 'error';

export function CopilotProjectDraftCard({
  draft,
  lang,
  expectedSourceImageCount,
}: {
  draft: CopilotProjectDraft;
  lang: Lang;
  expectedSourceImageCount?: number;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { identity } = useIdentity();
  const [state, setState] = useState<CreateState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState(() => normalizeProjectName(draft.project.name));
  const [projectDescription, setProjectDescription] = useState(() =>
    normalizeProjectDescription(draft.project.description ?? ''),
  );
  const stories = draft.stories ?? [];
  const stickyCount = draft.canvases.reduce((sum, canvas) => sum + canvas.stickies.length, 0);
  const sourceCoverage = draft.sourceCoverage;
  const sourceFindings = sourceCoverage?.findings ?? [];
  const sourceMappedCount = sourceCoverage?.mappedFindingIds?.length ?? 0;
  const unmappedCount = sourceCoverage?.unmappedSourceItems?.length ?? 0;
  const sourceIssues = useMemo(
    () => getSourceCoverageIssues(sourceCoverage, {
      expectedImageCount: expectedSourceImageCount,
      requireCompleteCoverage: true,
      requireStoryForTextFindings: true,
      stories,
    }),
    [sourceCoverage, expectedSourceImageCount, stories],
  );
  const emptyCanvasCount = draft.canvases.filter((canvas) => canvas.stickies.length === 0).length;
  const missingName = projectName.trim().length === 0;
  const missingDescription = projectDescription.trim().length === 0;
  const quality = draft.quality;
  const hardIssues = quality?.issues.filter((issue) => issue.severity === 'hard') ?? [];
  const softIssues = quality?.issues.filter((issue) => issue.severity === 'soft') ?? [];
  const ready = !missingName && !missingDescription && emptyCanvasCount === 0 && sourceIssues.length === 0 && hardIssues.length === 0;

  async function createProject() {
    if (!identity || !ready || state === 'creating') return;
    setState('creating');
    setError(null);
    // Final hard-rule gate. `ready` already blocks when hardIssues is
    // non-empty, but re-check here so a stale `draft` that hasn't been
    // re-validated (e.g. after a state edit) can never reach the server.
    if (hardIssues.length > 0) {
      const first = hardIssues[0]!;
      setError(t('library.copilot.projectDraft.qualityHardBlocked', {
        message: first.message[lang] ?? first.message.en,
      }));
      setState('error');
      return;
    }
    try {
      const preparedCanvases = await Promise.all(
        draft.canvases.map(async (canvasDraft) => {
          const detail = await api.getDef(canvasDraft.defId);
          const validZones = new Set(detail.def.zones.map((zone) => zone.id));
          const stickies = normalizeStickies(canvasDraft.stickies).filter((sticky) => validZones.has(sticky.zoneId));
          if (stickies.length === 0) {
            throw new Error(t('library.copilot.projectDraft.emptyCanvasBlocked', { title: canvasDraft.title }));
          }
          return {
            defId: canvasDraft.defId,
            title: canvasDraft.title.trim() || detail.def.name[lang] || detail.def.name.en,
            stickies,
          };
        }),
      );

      const project = await projectsApi.create(
        {
          name: projectName.trim(),
          description: projectDescription.trim(),
        },
        identity.displayName,
      );

      const createdCanvasRefs: CopilotCanvasReference[] = [];
      for (const canvasDraft of preparedCanvases) {
        const created = await api.createCanvas(
          {
            projectId: project.id,
            defId: canvasDraft.defId,
            title: canvasDraft.title,
            language: lang,
          },
          identity.displayName,
        );
        await api.bulkStickies(created.id, canvasDraft.stickies, identity.displayName);
        createdCanvasRefs.push({
          canvasId: created.id,
          defId: created.defId,
          title: created.title,
          ...(created.variant?.id ? { variantId: created.variant.id } : {}),
        });
      }

      for (const storyDraft of stories) {
        const title = storyDraft.title.trim();
        const content = rewriteStoryCanvasDirectivesToCanvasIds(storyDraft.content.trim(), createdCanvasRefs);
        if (!title || !content) continue;
        await storiesApi.create(
          {
            projectId: project.id,
            title,
            content,
            status: 'draft',
          },
          identity.displayName,
        );
      }

      setState('created');
      navigate(`/p/${project.id}`, { state: preserveNavigationState(location) });
    } catch (err) {
      console.error('Create Copilot project draft failed:', err);
      setError(err instanceof Error ? err.message : String(err));
      setState('error');
    }
  }

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-indigo-200 bg-white shadow-sm">
      <div className="bg-gradient-to-r from-indigo-50 via-violet-50 to-sky-50 px-3 py-2">
        <div className="text-[12px] font-semibold text-gray-950">
          {t('library.copilot.projectDraft.title')}
        </div>
        <div className="mt-0.5 text-[11px] text-gray-600">
          {t('library.copilot.projectDraft.subtitle')}
        </div>
      </div>
      <div className="space-y-3 px-3 py-3">
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 px-3 py-2 text-[11px] leading-relaxed text-indigo-900">
          {t('library.copilot.projectDraft.autoFilledHint')}
        </div>

        <div className="space-y-2">
          <label className="block text-[11px] font-medium text-gray-600">
            {t('library.copilot.projectDraft.projectName')}
            <input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder={t('library.copilot.projectDraft.projectNamePlaceholder')}
              className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] font-medium text-gray-950 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
          <label className="block text-[11px] font-medium text-gray-600">
            {t('library.copilot.projectDraft.projectDescription')}
            <textarea
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              placeholder={t('library.copilot.projectDraft.projectDescriptionPlaceholder')}
              rows={3}
              className="mt-1 block w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-[12px] leading-relaxed text-gray-900 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
        </div>

        {(missingName || missingDescription || emptyCanvasCount > 0 || sourceIssues.length > 0 || hardIssues.length > 0 || softIssues.length > 0) && (
          <div className="space-y-2">
            {(missingName || missingDescription || emptyCanvasCount > 0 || sourceIssues.length > 0 || hardIssues.length > 0) && (
              <div className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
                {(missingName || missingDescription) && (
                  <div>
                    {missingName && missingDescription
                      ? t('library.copilot.projectDraft.needNameAndDescription')
                      : missingName
                        ? t('library.copilot.projectDraft.needName')
                        : t('library.copilot.projectDraft.needDescription')}
                  </div>
                )}
                {emptyCanvasCount > 0 && <div>{t('library.copilot.projectDraft.emptyCanvasWarning')}</div>}
                {sourceIssues.length > 0 && <div>{t('library.copilot.projectDraft.sourceCoverageWarning')}</div>}
                {hardIssues.length > 0 && (
                  <QualityIssueList
                    label={t('library.copilot.projectDraft.qualityHardTitle', { count: hardIssues.length })}
                    issues={hardIssues}
                    lang={lang}
                    tone="hard"
                  />
                )}
              </div>
            )}
            {softIssues.length > 0 && (
              <div className="space-y-1 rounded-xl border border-yellow-200 bg-yellow-50/80 px-3 py-2 text-[11px] text-yellow-900">
                <div className="font-medium">{t('library.copilot.projectDraft.qualitySoftTitle', { count: softIssues.length })}</div>
                <QualityIssueList issues={softIssues} lang={lang} tone="soft" />
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <Metric label={t('library.copilot.projectDraft.canvasCount')} value={draft.canvases.length} />
          <Metric label={t('library.copilot.projectDraft.stickyCount')} value={stickyCount} />
          <Metric label={t('library.copilot.projectDraft.storyCount')} value={stories.length} />
          <Metric label={t('library.copilot.projectDraft.sourceCount')} value={sourceFindings.length} />
        </div>

        {sourceCoverage && (
          <div className="rounded-xl border border-sky-100 bg-sky-50/60 px-3 py-2 text-[11px] leading-relaxed text-sky-900">
            {t('library.copilot.projectDraft.sourceCoverageSummary', {
              images: sourceCoverage.sourceImageCount ?? 0,
              findings: sourceFindings.length,
              mapped: sourceMappedCount,
              unmapped: unmappedCount,
            })}
          </div>
        )}

        {draft.canvases.length > 0 && (
          <div className="space-y-1.5">
            {draft.canvases.map((canvas) => (
              <div key={`${canvas.defId}:${canvas.title}`} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-medium text-gray-900">{canvas.title}</span>
                  <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] text-gray-500">
                    {t('library.copilot.projectDraft.notesBadge', { count: canvas.stickies.length })}
                  </span>
                </div>
                <div className="mt-1 text-[10px] text-gray-400">{canvas.defId}</div>
              </div>
            ))}
          </div>
        )}

        {stories.length > 0 && (
          <div className="space-y-1.5">
            {stories.map((story, index) => (
              <div key={`${story.title}:${index}`} className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2">
                <div className="text-[12px] font-medium text-emerald-950">{story.title}</div>
                <div className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-emerald-700">
                  {story.content.replace(/[#*_`>\-]/g, '').trim()}
                </div>
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
          disabled={!ready || !identity || state === 'creating' || state === 'created'}
          onClick={createProject}
          className="w-full rounded-xl bg-gray-950 px-3 py-2 text-[12px] font-medium text-white shadow-sm transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {state === 'creating'
            ? t('library.copilot.projectDraft.creating')
            : state === 'created'
              ? t('library.copilot.projectDraft.created')
              : t('library.copilot.projectDraft.create')}
        </button>
      </div>
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

function QualityIssueList({
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

function summariseQuality(report: QualityReport | undefined): string {
  if (!report) return '';
  if (report.hardCount === 0 && report.softCount === 0) return '';
  const parts: string[] = [];
  if (report.hardCount > 0) parts.push(`${report.hardCount} hard`);
  if (report.softCount > 0) parts.push(`${report.softCount} soft`);
  return parts.join(' · ');
}

function normalizeStickies(stickies: CopilotDraftSticky[]) {
  return stickies
    .filter((sticky) => sticky.zoneId.trim() && sticky.text.trim())
    .map((sticky) => ({
      zoneId: sticky.zoneId.trim(),
      text: sticky.text.trim(),
      ...(sticky.color ? { color: sticky.color } : {}),
    }));
}

function normalizeProjectName(value: string): string {
  const text = value.trim();
  if (!text) return '';
  if (/请填写|项目名称|project name/i.test(text)) return '';
  return text;
}

function normalizeProjectDescription(value: string): string {
  const text = value.trim();
  if (!text) return '';
  if (/一句话说明|目标客户|业务目标|one-sentence description|audience, value, and goal/i.test(text)) {
    return '';
  }
  return text;
}
