import { useTranslation } from 'react-i18next';
import type { Lang, LibraryResource, LibraryResourceType } from '@pingarden/shared';
import { localize } from './LearningGuide';

interface Props {
  resources: LibraryResource[];
  lang: Lang;
  onSelect: (resource: LibraryResource) => void;
}

export function ResourceList({ resources, lang, onSelect }: Props) {
  const { t } = useTranslation();

  if (resources.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-gray-200 bg-white py-12 text-center text-sm text-gray-400">
        {t('library.resourcesEmpty')}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {resources.map((resource) => (
        <ResourceCard
          key={resource.slug}
          resource={resource}
          lang={lang}
          onClick={() => onSelect(resource)}
        />
      ))}
    </div>
  );
}

function ResourceCard({
  resource,
  lang,
  onClick,
}: {
  resource: LibraryResource;
  lang: Lang;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  const title = resource.title[lang] ?? resource.title.en;
  const recommendation = resource.recommendation[lang] ?? resource.recommendation.en;
  const learningSummary =
    localize(resource.learning?.whyOpen, lang) ||
    localize(resource.learning?.headline, lang) ||
    recommendation;
  const concepts = (resource.learning?.keyConcepts ?? [])
    .map((item) => localize(item, lang))
    .filter(Boolean)
    .slice(0, 3);
  const relatedCount = countRelated(resource);
  const initials = getResourceInitials(title);
  const accent = resourceAccentClass(resource.type);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex min-h-[256px] w-full cursor-pointer overflow-hidden rounded-2xl border border-stone-200/80 bg-gradient-to-br from-white via-stone-50 to-amber-50/40 p-0 text-left shadow-[0_12px_32px_rgba(120,72,18,0.06)] transition duration-200 hover:-translate-y-1 hover:border-amber-300 hover:shadow-[0_22px_46px_rgba(120,72,18,0.14)] focus:outline-none focus:ring-2 focus:ring-amber-300"
    >
      <div className={`w-3 shrink-0 ${accent.spine}`} />
      <div className="flex min-w-0 flex-1 flex-col p-4">
        <div className="flex items-start gap-3">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold shadow-inner ring-1 ring-white/70 ${accent.cover}`}>
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${resourceTypeClass(resource.type)}`}>
                {t(`library.resourceTypes.${resource.type}`)}
              </span>
              {resource.chapterCount ? (
                <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-200">
                  {t('library.resource.chapterCount', { count: resource.chapterCount })}
                </span>
              ) : null}
            </div>
            <h2 className="mt-2 line-clamp-2 text-[15px] font-semibold leading-snug text-stone-950">
              {title}
            </h2>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-amber-100 bg-white/70 px-3 py-2.5">
          <p className="line-clamp-5 text-[12px] leading-relaxed text-stone-600">
            {learningSummary}
          </p>
        </div>

        <div className="mt-auto pt-4 text-[11px] leading-relaxed text-stone-400">
          {[resource.authors.join(', '), resource.year].filter(Boolean).join(' · ')}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {concepts.map((concept) => (
            <span key={concept} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-100">
              {concept}
            </span>
          ))}
          {resource.tags?.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] text-stone-600 ring-1 ring-stone-200">
              {tag}
            </span>
          ))}
          {relatedCount > 0 && (
            <span className="rounded-full bg-stone-900 px-2 py-0.5 text-[10px] font-medium text-white/90">
              {t('library.resource.relatedCount', { count: relatedCount })}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function getResourceInitials(title: string): string {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function resourceAccentClass(type: LibraryResourceType): { spine: string; cover: string } {
  switch (type) {
    case 'book':
      return { spine: 'bg-gradient-to-b from-amber-700 via-amber-500 to-orange-300', cover: 'bg-amber-100 text-amber-800' };
    case 'article':
      return { spine: 'bg-gradient-to-b from-sky-700 via-sky-500 to-cyan-300', cover: 'bg-sky-100 text-sky-800' };
    case 'paper':
      return { spine: 'bg-gradient-to-b from-violet-700 via-violet-500 to-fuchsia-300', cover: 'bg-violet-100 text-violet-800' };
    case 'report':
      return { spine: 'bg-gradient-to-b from-emerald-700 via-emerald-500 to-lime-300', cover: 'bg-emerald-100 text-emerald-800' };
    case 'web':
      return { spine: 'bg-gradient-to-b from-stone-700 via-stone-500 to-stone-300', cover: 'bg-stone-100 text-stone-800' };
  }
}

function countRelated(resource: LibraryResource): number {
  return [
    resource.relatedCanvasDefIds,
    resource.relatedCaseSlugs,
    resource.relatedPatternSlugs,
    resource.relatedExperimentSlugs,
    resource.relatedStrategyFrameworkSlugs,
  ].reduce((sum, rows) => sum + (rows?.length ?? 0), 0);
}

export function resourceTypeClass(type: LibraryResourceType): string {
  switch (type) {
    case 'book':
      return 'bg-amber-50 text-amber-700';
    case 'article':
      return 'bg-sky-50 text-sky-700';
    case 'paper':
      return 'bg-violet-50 text-violet-700';
    case 'report':
      return 'bg-emerald-50 text-emerald-700';
    case 'web':
      return 'bg-gray-100 text-gray-700';
  }
}
