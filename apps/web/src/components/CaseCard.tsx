import { useTranslation } from 'react-i18next';
import type { CaseLibraryEntry, Lang } from '@pingarden/shared';

interface Props {
  entry: CaseLibraryEntry;
  lang: Lang;
  onClick: (entry: CaseLibraryEntry) => void;
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
export function CaseCard({ entry, lang, onClick }: Props) {
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

  return (
    <button
      type="button"
      onClick={() => onClick(entry)}
      className="group flex w-full flex-col rounded-xl border border-gray-200 bg-white p-4 text-left transition hover:border-gray-300 hover:shadow-sm"
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
    </button>
  );
}

function kindChipColor(kind: CaseLibraryEntry['kind']): string {
  switch (kind) {
    case 'company':
      return 'bg-emerald-50 text-emerald-700';
    case 'industry':
      return 'bg-amber-50 text-amber-700';
    case 'pattern':
      return 'bg-violet-50 text-violet-700';
    case 'comparison':
      return 'bg-sky-50 text-sky-700';
  }
}
