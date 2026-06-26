import { useTranslation } from 'react-i18next';
import type { BusinessModelPattern, Lang } from '@pingarden/shared';

interface Props {
  patterns: BusinessModelPattern[];
  lang: Lang;
  /**
   * Click handler — host page is expected to open `PatternDetailModal`
   * for the selected pattern. The list itself stays lean (name + summary
   * + chips) so the page can scale to many patterns without becoming
   * a wall of text.
   */
  onSelect: (pattern: BusinessModelPattern) => void;
}

/**
 * Patterns tab body — compact grid of pattern cards. Each card shows
 * just the headline (name + summary) and two chip-counters (examples,
 * sources). Click → open the full detail modal where the long-form
 * markdown body, the example cases, and the sources are read in tabs.
 *
 * Designed to scale: 6 patterns shown at a glance fits a single
 * scroll, 20 patterns still fit without becoming a slog of nested
 * collapsibles. The earlier inline-expand layout was killed off
 * 2026-06-15 because per-card markdown bodies got noisy fast.
 */
export function PatternList({ patterns, lang, onSelect }: Props) {
  const { t } = useTranslation();

  if (patterns.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-gray-200 bg-white py-12 text-center text-sm text-gray-400">
        {t('library.patternsEmpty')}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {patterns.map((p) => (
        <PatternCard key={p.slug} pattern={p} lang={lang} onClick={() => onSelect(p)} />
      ))}
    </div>
  );
}

function PatternCard({
  pattern,
  lang,
  onClick,
}: {
  pattern: BusinessModelPattern;
  lang: Lang;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  const name = pattern.name[lang] ?? pattern.name.en;
  const summary = pattern.summary[lang] ?? pattern.summary.en;
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
        <span className="shrink-0 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700">
          {t('library.kind.pattern')}
        </span>
      </div>
      <p className="mt-2 line-clamp-4 text-[12px] leading-relaxed text-gray-500">{summary}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
          {t('library.exampleCount', { count: pattern.examples.length })}
        </span>
        {pattern.sources.length > 0 && (
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
            {t('library.sourceCount', { count: pattern.sources.length })}
          </span>
        )}
      </div>
    </div>
  );
}
