import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CopilotSessionInsightItem, Lang, Project } from '@pingarden/shared';
import { projectsApi } from '../api/projects';

export type ApplyLearningTarget =
  | { kind: 'new-project' }
  | { kind: 'existing-project'; projectId: string; projectName: string };

export function CopilotApplyLearningDialog({
  item,
  lang,
  displayName,
  currentProjectId,
  onClose,
  onGenerate,
}: {
  item: CopilotSessionInsightItem;
  lang: Lang;
  displayName: string;
  currentProjectId?: string;
  onClose(): void;
  onGenerate(prompt: string, target: ApplyLearningTarget): void;
}) {
  const { t } = useTranslation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState(currentProjectId ?? 'new');
  const [action, setAction] = useState('updateProject');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!displayName) return;
    let cancelled = false;
    setLoading(true);
    projectsApi
      .list(displayName)
      .then((next) => {
        if (!cancelled) setProjects(next);
      })
      .catch((err) => console.error('Load projects for apply learning failed:', err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [displayName]);

  const target = useMemo<ApplyLearningTarget>(() => {
    if (selected === 'new') return { kind: 'new-project' };
    const project = projects.find((p) => p.id === selected);
    return { kind: 'existing-project', projectId: selected, projectName: project?.name ?? selected };
  }, [projects, selected]);

  function generate() {
    const prompt = buildApplyPrompt(item, target, action, lang);
    onGenerate(prompt, target);
  }

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-gray-950/40 px-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl">
        <div className="bg-gradient-to-br from-indigo-600 via-gray-950 to-teal-700 px-5 py-4 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-[15px] font-semibold">{t('library.copilot.applyLearning.title')}</h3>
              <p className="mt-1 text-[12px] leading-relaxed text-white/75">{t('library.copilot.applyLearning.subtitle')}</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-full px-2 py-0.5 text-xl leading-none text-white/70 hover:bg-white/10 hover:text-white">×</button>
          </div>
        </div>

        <div className="space-y-4 px-5 py-4">
          <section className="rounded-2xl border border-indigo-100 bg-indigo-50/70 px-3 py-3">
            <div className="text-[12px] font-semibold text-indigo-950">{item.insight.title}</div>
            <p className="mt-1 text-[11px] leading-relaxed text-indigo-800">{item.insight.summary}</p>
          </section>

          <section>
            <label className="text-[11px] font-semibold text-gray-700">{t('library.copilot.applyLearning.target')}</label>
            <select
              value={selected}
              onChange={(e) => setSelected(e.currentTarget.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[12px] text-gray-900 outline-none focus:border-gray-400"
            >
              <option value="new">{t('library.copilot.applyLearning.newProject')}</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
            {loading && <div className="mt-1 text-[10px] text-gray-400">{t('home.loading')}…</div>}
          </section>

          <section>
            <label className="text-[11px] font-semibold text-gray-700">{t('library.copilot.applyLearning.action')}</label>
            <select
              value={action}
              onChange={(e) => setAction(e.currentTarget.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[12px] text-gray-900 outline-none focus:border-gray-400"
            >
              <option value="updateProject">{t('library.copilot.applyLearning.actions.updateProject')}</option>
              <option value="createCanvas">{t('library.copilot.applyLearning.actions.createCanvas')}</option>
              <option value="createStory">{t('library.copilot.applyLearning.actions.createStory')}</option>
              <option value="saveProjectInsight">{t('library.copilot.applyLearning.actions.saveProjectInsight')}</option>
            </select>
          </section>

          <div className="rounded-2xl border border-gray-100 bg-gray-50 px-3 py-2 text-[11px] leading-relaxed text-gray-500">
            {t('library.copilot.applyLearning.reviewHint')}
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-[12px] font-medium text-gray-700 hover:bg-gray-50">
              {t('library.copilot.applyLearning.cancel')}
            </button>
            <button type="button" onClick={generate} disabled={!displayName} className="rounded-xl bg-gray-950 px-3 py-2 text-[12px] font-medium text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-50">
              {t('library.copilot.applyLearning.generate')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildApplyPrompt(item: CopilotSessionInsightItem, target: ApplyLearningTarget, action: string, lang: Lang): string {
  const insight = item.insight;
  const targetLine = target.kind === 'new-project'
    ? 'Target: create a new PinGarden project.'
    : `Target: update existing project ${target.projectName} (projectId: ${target.projectId}).`;
  return [
    lang === 'zh'
      ? '请把下面这段学习讨论洞察转成可确认的 PinGarden 项目草稿或项目更新草稿。'
      : 'Convert the following learning discussion insight into a confirmable PinGarden project draft or project update draft.',
    targetLine,
    `Requested action: ${action}`,
    `Insight title: ${insight.title}`,
    `Insight summary: ${insight.summary}`,
    'Insights:',
    ...insight.insights.map((entry) => `- ${entry.title}: ${entry.summary}${entry.evidence ? ` Evidence: ${entry.evidence}` : ''}`),
    'Sources:',
    ...(insight.sourceRefs ?? []).map((source) => `- ${source.type}: ${source.label}${source.summary ? ` — ${source.summary}` : ''}`),
    'Preserve source references where possible. Do not write anything until the user confirms the generated card.',
  ].join('\n');
}
