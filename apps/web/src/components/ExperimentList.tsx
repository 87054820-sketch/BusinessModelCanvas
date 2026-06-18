import { useTranslation } from 'react-i18next';
import type { Experiment, Lang } from '@pingarden/shared';

interface Props {
  experiments: Experiment[];
  lang: Lang;
  /**
   * Click handler — host page is expected to open `ExperimentDetailModal`
   * for the selected experiment. The card itself stays minimal (name +
   * summary + 3 chips) so the page can scale to many experiments without
   * becoming a wall of text.
   */
  onSelect: (experiment: Experiment) => void;
}

/**
 * Experiments tab body — compact grid of experiment cards. Each card
 * shows name + summary + three metadata chips (theme / primary risk /
 * cost band). Click → open the full detail modal where the long-form
 * markdown body and sources are read in a single scrollable pane.
 *
 * Mirrors `PatternList` shape so the Library page stays visually
 * consistent across tabs. The chip palette differs by intent: theme
 * uses violet/amber (Discovery vs Validation), cost uses
 * emerald/yellow/red. Risk chips stay neutral grey since they're
 * categorical, not ordinal.
 */
export function ExperimentList({ experiments, lang, onSelect }: Props) {
  const { t } = useTranslation();

  if (experiments.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-gray-200 bg-white py-12 text-center text-sm text-gray-400">
        {t('library.experimentsEmpty')}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {experiments.map((e) => (
        <ExperimentCard
          key={e.slug}
          experiment={e}
          lang={lang}
          onClick={() => onSelect(e)}
        />
      ))}
    </div>
  );
}

function ExperimentCard({
  experiment,
  lang,
  onClick,
}: {
  experiment: Experiment;
  lang: Lang;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  const name = experiment.name[lang] ?? experiment.name.en;
  const summary = experiment.summary[lang] ?? experiment.summary.en;

  // Primary risk = first risk in the list. Multi-risk experiments
  // (e.g. D + F) get a `+1` suffix so the chip row stays at 3 chips.
  const primaryRisk = experiment.risks[0];
  const extraRisks = experiment.risks.length - 1;

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
      className="group flex w-full cursor-pointer flex-col rounded-xl border border-gray-200 bg-white p-4 text-left transition hover:border-violet-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className="min-w-0 flex-1 text-sm font-semibold text-gray-900">{name}</h2>
        <span className="shrink-0 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700">
          {t('library.kind.experiment')}
        </span>
      </div>
      <p className="mt-2 line-clamp-4 text-[12px] leading-relaxed text-gray-500">{summary}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className={`rounded px-1.5 py-0.5 text-[10px] ${themeChipClass(experiment.theme)}`}>
          {t(`library.experiment.theme.${experiment.theme}`)}
        </span>
        {primaryRisk && (
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
            {t(`library.experiment.risk.${primaryRisk}`)}
            {extraRisks > 0 ? ` +${extraRisks}` : ''}
          </span>
        )}
        <span className={`rounded px-1.5 py-0.5 text-[10px] ${costChipClass(experiment.cost)}`}>
          {t(`library.experiment.cost.${experiment.cost}`)}
        </span>
      </div>
    </div>
  );
}

function themeChipClass(theme: Experiment['theme']): string {
  return theme === 'discovery'
    ? 'bg-violet-50 text-violet-700'
    : 'bg-amber-50 text-amber-700';
}

function costChipClass(cost: Experiment['cost']): string {
  switch (cost) {
    case 'cheap':
      return 'bg-emerald-50 text-emerald-700';
    case 'medium':
      return 'bg-yellow-50 text-yellow-700';
    case 'expensive':
      return 'bg-red-50 text-red-700';
  }
}
