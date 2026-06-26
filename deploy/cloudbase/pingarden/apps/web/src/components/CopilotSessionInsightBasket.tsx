import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CopilotSessionInsightItem } from '@pingarden/shared';

export function CopilotSessionInsightBasket({
  items,
  onRemove,
  onClear,
  onMarkUseful,
  onApply,
}: {
  items: CopilotSessionInsightItem[];
  onRemove(id: string): void;
  onClear(): void;
  onMarkUseful(id: string, useful: boolean): void;
  onApply(item: CopilotSessionInsightItem): void;
}) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(items.length === 0);

  return (
    <section className="border-b border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-teal-50 px-4 py-2">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="flex min-w-0 items-center gap-2 text-left"
        >
          <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold text-white">
            {items.length}
          </span>
          <span className="truncate text-[12px] font-semibold text-gray-950">
            {t('library.copilot.sessionBasket.title')}
          </span>
          <span className="text-[10px] text-gray-500">
            {collapsed ? t('library.copilot.sessionBasket.expand') : t('library.copilot.sessionBasket.collapse')}
          </span>
        </button>
        {items.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-md px-2 py-1 text-[10px] text-gray-500 hover:bg-white hover:text-gray-900"
          >
            {t('library.copilot.sessionBasket.clear')}
          </button>
        )}
      </div>
      {!collapsed && (
        <div className="mt-2 space-y-2">
          <p className="text-[10px] leading-relaxed text-gray-500">{t('library.copilot.sessionBasket.privacyHint')}</p>
          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-indigo-200 bg-white/70 px-3 py-3 text-center text-[11px] text-gray-400">
              {t('library.copilot.sessionBasket.empty')}
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="rounded-xl border border-white bg-white/85 px-3 py-2 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-[12px] font-medium text-gray-950">{item.insight.title}</div>
                    <div className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-gray-600">{item.insight.summary}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(item.id)}
                    className="shrink-0 rounded-full px-1.5 text-[13px] text-gray-400 hover:bg-gray-100 hover:text-gray-800"
                    aria-label={t('library.copilot.sessionBasket.remove')}
                  >
                    ×
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onMarkUseful(item.id, !item.useful)}
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${item.useful ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                    {item.useful ? t('library.copilot.sessionBasket.usefulMarked') : t('library.copilot.sessionBasket.markUseful')}
                  </button>
                  <button
                    type="button"
                    onClick={() => onApply(item)}
                    className="rounded-md bg-gray-950 px-2.5 py-1 text-[10px] font-medium text-white hover:bg-black"
                  >
                    {item.appliedAt ? t('library.copilot.sessionBasket.applyAgain') : t('library.copilot.sessionBasket.apply')}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}
