import { useTranslation } from 'react-i18next';
import type { CopilotDiscussionInsight } from '@pingarden/shared';

export function CopilotDiscussionInsightCard({
  insight,
  added,
  onAdd,
  onApply,
}: {
  insight: CopilotDiscussionInsight;
  added: boolean;
  onAdd(): void;
  onApply(): void;
}) {
  const { t } = useTranslation();
  const actions = insight.suggestedActions ?? [];
  const sources = insight.sourceRefs ?? [];

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-indigo-200 bg-white shadow-sm">
      <div className="bg-gradient-to-br from-indigo-50 via-white to-teal-50 px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-indigo-500">
              {t('library.copilot.discussionInsight.badge')}
            </div>
            <h3 className="mt-1 text-[13px] font-semibold text-gray-950">{insight.title}</h3>
          </div>
          <span className="shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-medium text-teal-700">
            {t('library.copilot.discussionInsight.sessionOnly')}
          </span>
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-gray-700">{insight.summary}</p>
      </div>

      <div className="space-y-3 px-3 py-3">
        {insight.insights.length > 0 && (
          <div className="space-y-1.5">
            {insight.insights.map((item) => (
              <div key={item.id} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                <div className="text-[12px] font-medium text-gray-950">{item.title}</div>
                <div className="mt-0.5 text-[11px] leading-relaxed text-gray-600">{item.summary}</div>
                {item.evidence && <div className="mt-1 text-[10px] leading-relaxed text-gray-400">{item.evidence}</div>}
              </div>
            ))}
          </div>
        )}

        {sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {sources.slice(0, 6).map((source) => (
              <span key={source.id} className="rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[10px] text-indigo-700">
                {source.label}
              </span>
            ))}
          </div>
        )}

        {actions.length > 0 && (
          <div className="rounded-xl border border-teal-100 bg-teal-50/70 px-3 py-2">
            <div className="text-[11px] font-semibold text-teal-900">{t('library.copilot.discussionInsight.suggestedActions')}</div>
            <ul className="mt-1 space-y-1 text-[11px] leading-relaxed text-teal-800">
              {actions.slice(0, 3).map((action) => (
                <li key={action.id}>• {action.label} — {action.rationale}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onAdd}
            disabled={added}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {added ? t('library.copilot.discussionInsight.added') : t('library.copilot.discussionInsight.addToBasket')}
          </button>
          <button
            type="button"
            onClick={onApply}
            className="rounded-lg bg-gray-950 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-black"
          >
            {t('library.copilot.discussionInsight.applyToProject')}
          </button>
        </div>
      </div>
    </div>
  );
}
