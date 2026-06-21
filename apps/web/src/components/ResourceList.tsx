import { useTranslation } from 'react-i18next';
import type { Lang, LibraryResource, LibraryResourceType } from '@pingarden/shared';

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
  const relatedCount = countRelated(resource);

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
      className="group flex w-full cursor-pointer flex-col rounded-xl border border-gray-200 bg-white p-4 text-left transition hover:border-amber-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className="min-w-0 flex-1 text-sm font-semibold text-gray-900">{title}</h2>
        <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
          {t(`library.resourceTypes.${resource.type}`)}
        </span>
      </div>
      <p className="mt-2 line-clamp-4 text-[12px] leading-relaxed text-gray-500">
        {recommendation}
      </p>
      <div className="mt-3 text-[11px] text-gray-400">
        {[resource.authors.join(', '), resource.year].filter(Boolean).join(' · ')}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {resource.tags?.slice(0, 3).map((tag) => (
          <span key={tag} className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
            {tag}
          </span>
        ))}
        {relatedCount > 0 && (
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
            {t('library.resource.relatedCount', { count: relatedCount })}
          </span>
        )}
      </div>
    </div>
  );
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
