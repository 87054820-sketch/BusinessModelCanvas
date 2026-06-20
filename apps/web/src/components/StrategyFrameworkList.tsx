import { useTranslation } from 'react-i18next';
import type { Lang, StrategyFramework } from '@pingarden/shared';

interface Props {
  frameworks: StrategyFramework[];
  lang: Lang;
  onSelect: (framework: StrategyFramework) => void;
}

export function StrategyFrameworkList({ frameworks, lang, onSelect }: Props) {
  const { t } = useTranslation();

  if (frameworks.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-gray-200 bg-white py-12 text-center text-sm text-gray-400">
        {t('library.strategyFrameworksEmpty')}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {frameworks.map((framework) => (
        <StrategyFrameworkCard
          key={framework.slug}
          framework={framework}
          lang={lang}
          onClick={() => onSelect(framework)}
        />
      ))}
    </div>
  );
}

function StrategyFrameworkCard({
  framework,
  lang,
  onClick,
}: {
  framework: StrategyFramework;
  lang: Lang;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  const name = framework.name[lang] ?? framework.name.en;
  const summary = framework.summary[lang] ?? framework.summary.en;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="group flex w-full cursor-pointer flex-col rounded-xl border border-gray-200 bg-white p-4 text-left transition hover:border-indigo-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className="min-w-0 flex-1 text-sm font-semibold text-gray-900">{name}</h2>
        <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
          {t('library.kind.strategyFramework')}
        </span>
      </div>
      <p className="mt-2 line-clamp-4 text-[12px] leading-relaxed text-gray-500">
        {summary}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
          {t('library.exampleCount', { count: framework.examples.length })}
        </span>
        {(framework.references?.length ?? framework.sources.length) > 0 && (
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
            {t('library.sourceCount', {
              count: framework.references?.length ?? framework.sources.length,
            })}
          </span>
        )}
      </div>
    </div>
  );
}
