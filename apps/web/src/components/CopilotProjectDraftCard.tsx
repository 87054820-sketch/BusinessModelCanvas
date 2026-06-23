import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import type { CopilotProjectDraft, Lang } from '@pingarden/shared';
import { api } from '../api/client';
import { projectsApi } from '../api/projects';
import { useIdentity } from '../identity/useIdentity';
import { preserveNavigationState } from '../navigation/useSmartBack';

type CreateState = 'idle' | 'creating' | 'created' | 'error';

export function CopilotProjectDraftCard({
  draft,
  lang,
}: {
  draft: CopilotProjectDraft;
  lang: Lang;
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
  const stickyCount = draft.canvases.reduce((sum, canvas) => sum + canvas.stickies.length, 0);
  const missingName = projectName.trim().length === 0;
  const missingDescription = projectDescription.trim().length === 0;
  const ready = !missingName && !missingDescription;

  async function createProject() {
    if (!identity || !ready || state === 'creating') return;
    setState('creating');
    setError(null);
    try {
      const preparedCanvases = await Promise.all(
        draft.canvases.map(async (canvasDraft) => {
          const detail = await api.getDef(canvasDraft.defId);
          const validZones = new Set(detail.def.zones.map((zone) => zone.id));
          return {
            defId: canvasDraft.defId,
            title: canvasDraft.title.trim() || detail.def.name[lang] || detail.def.name.en,
            stickies: canvasDraft.stickies
              .filter((sticky) => validZones.has(sticky.zoneId.trim()) && sticky.text.trim())
              .map((sticky) => ({
                zoneId: sticky.zoneId.trim(),
                text: sticky.text.trim(),
                ...(sticky.color ? { color: sticky.color } : {}),
              })),
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
        if (canvasDraft.stickies.length > 0) {
          await api.bulkStickies(created.id, canvasDraft.stickies, identity.displayName);
        }
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

        {(missingName || missingDescription) && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
            {missingName && missingDescription
              ? t('library.copilot.projectDraft.needNameAndDescription')
              : missingName
                ? t('library.copilot.projectDraft.needName')
                : t('library.copilot.projectDraft.needDescription')}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <Metric label={t('library.copilot.projectDraft.canvasCount')} value={draft.canvases.length} />
          <Metric label={t('library.copilot.projectDraft.stickyCount')} value={stickyCount} />
        </div>

        {draft.canvases.length > 0 && (
          <div className="space-y-1.5">
            {draft.canvases.map((canvas) => (
              <div key={`${canvas.defId}:${canvas.title}`} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-medium text-gray-900">{canvas.title}</span>
                  <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] text-gray-500">
                    {canvas.stickies.length} notes
                  </span>
                </div>
                <div className="mt-1 text-[10px] text-gray-400">{canvas.defId}</div>
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
