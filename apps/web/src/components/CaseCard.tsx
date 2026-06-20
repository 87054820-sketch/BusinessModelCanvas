import { useTranslation } from 'react-i18next';
import type {
  BusinessModelPattern,
  CaseLibraryEntry,
  Lang,
  StrategyFramework,
} from '@pingarden/shared';

interface Props {
  entry: CaseLibraryEntry;
  lang: Lang;
  onClick: (entry: CaseLibraryEntry) => void;
  /**
   * All patterns shipped in the library, used to look up localized names
   * for the violet "applies patterns" chips. Optional — when absent or
   * the case has no `appliesPatterns`, the chip row is omitted entirely.
   */
  patterns?: BusinessModelPattern[];
  /** Strategy frameworks shipped in the library, for localized chips. */
  strategyFrameworks?: StrategyFramework[];
  /**
   * Callback when the user clicks a pattern chip. The host page is
   * expected to switch to the Patterns tab and scroll to the matching
   * pattern card. The chip stops event propagation so the card's main
   * `onClick` (open modal) doesn't also fire.
   */
  onPatternClick?: (slug: string) => void;
  /** Callback when the user clicks a strategy-framework chip. */
  onStrategyFrameworkClick?: (slug: string) => void;
}

/**
 * Case-library card for the LibraryPage grid. Visual language is a
 * sibling of the home page's `CanvasThumb` template card (rounded
 * border, subtle hover) but wider — these are full company analyses,
 * not single-canvas templates.
 *
 * Note: an earlier version rendered a 120px-tall canvas-thumbnail at
 * the top, but every BMC-based case ended up with the same blank-BMC
 * placeholder. Removed in 2026-06 — no signal, lots of vertical space.
 * If we later author per-case real artwork, the right place is here.
 */
export function CaseCard({
  entry,
  lang,
  onClick,
  patterns,
  onPatternClick,
  strategyFrameworks,
  onStrategyFrameworkClick,
}: Props) {
  const { t } = useTranslation();
  const name = entry.companyName[lang] ?? entry.companyName.en;
  const summary = entry.summary[lang] ?? entry.summary.en;

  // Per-language counts let the card show what the user will actually
  // experience in their UI lang (e.g. Swiss case ships 3 EN + 3 ZH
  // canvases — an EN user should see "3 canvases", not "6"). When the
  // case is single-language (or untagged legacy data), fall back to
  // the absolute totals so the card still has accurate signal.
  const localizedCanvasCount =
    entry.canvasesByLanguage?.[lang] ?? entry.canvasCount;
  const localizedStoryCount =
    entry.storiesByLanguage?.[lang] ?? entry.storyCount;

  // Resolve appliesPatterns slugs → pattern objects so we can render
  // localized names. Drop unresolved slugs silently — `case validate`
  // catches dangling references at build time, runtime stays robust.
  const applied: BusinessModelPattern[] =
    (entry.appliesPatterns ?? [])
      .map((slug) => patterns?.find((p) => p.slug === slug))
      .filter((p): p is BusinessModelPattern => !!p);
  const appliedFrameworks: StrategyFramework[] =
    (entry.appliesStrategyFrameworks ?? [])
      .map((slug) => strategyFrameworks?.find((f) => f.slug === slug))
      .filter((f): f is StrategyFramework => !!f);

  // Optional sub-type refinement per pattern. Pattern-with-subtypes
  // (e.g. Free → ad-supported / freemium / bait-and-hook) lets the case
  // chip read `[Free · Freemium]` instead of just `[Free]`. Looked up
  // by id from the pattern's own subtypes[]; unresolved → no suffix.
  const subtypeMap = entry.appliesPatternSubtypes ?? {};
  function chipLabel(p: BusinessModelPattern): string {
    const baseName = p.name[lang] ?? p.name.en;
    const subtypeId = subtypeMap[p.slug];
    if (!subtypeId) return baseName;
    const sub = p.subtypes?.find((s) => s.id === subtypeId);
    if (!sub) return baseName;
    const subName = sub.name[lang] ?? sub.name.en;
    return `${baseName} · ${subName}`;
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(entry)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(entry);
        }
      }}
      className="group flex w-full cursor-pointer flex-col rounded-xl border border-gray-200 bg-white p-4 text-left transition hover:border-gray-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
    >
      {/* Title + kind chip */}
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-gray-900">{name}</div>
          <div className="mt-1 line-clamp-3 text-[12px] leading-relaxed text-gray-500">
            {summary}
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${kindChipColor(
            entry.kind,
          )}`}
        >
          {t(`library.kind.${entry.kind}`)}
        </span>
      </div>

      {/* Pattern + strategy-framework chips share one compact two-column area. */}
      {(applied.length > 0 || appliedFrameworks.length > 0) && (
        <div className="mt-3 grid grid-cols-2 gap-1">
          {applied.map((p) => (
            <button
              type="button"
              key={`pattern-${p.slug}`}
              onClick={(e) => {
                e.stopPropagation();
                onPatternClick?.(p.slug);
              }}
              className="w-full truncate rounded-full border border-dashed border-violet-300 bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700 transition hover:bg-violet-100"
              title={t('library.appliesPatterns')}
            >
              {chipLabel(p)}
            </button>
          ))}
          {appliedFrameworks.map((f) => (
            <button
              type="button"
              key={`framework-${f.slug}`}
              onClick={(e) => {
                e.stopPropagation();
                onStrategyFrameworkClick?.(f.slug);
              }}
              className="w-full truncate rounded-full border border-dashed border-indigo-300 bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700 transition hover:bg-indigo-100"
              title={t('library.appliesStrategyFrameworks')}
            >
              {f.name[lang] ?? f.name.en}
            </button>
          ))}
        </div>
      )}

      {/* Tags + counts */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1 overflow-hidden">
          {entry.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600"
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="shrink-0 text-[10px] text-gray-400">
          {t('home.canvasCount', { count: localizedCanvasCount })}
          {localizedStoryCount > 0
            ? ` · ${t('library.storyCount', { count: localizedStoryCount })}`
            : ''}
        </div>
      </div>
    </div>
  );
}

function kindChipColor(kind: CaseLibraryEntry['kind']): string {
  switch (kind) {
    case 'company':
      return 'bg-emerald-50 text-emerald-700';
    case 'industry':
      return 'bg-amber-50 text-amber-700';
    case 'comparison':
      return 'bg-sky-50 text-sky-700';
  }
}
