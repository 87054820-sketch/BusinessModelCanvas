import { useTranslation } from 'react-i18next';
import type { Lang, LearningIndex, LearningReference, LocalizedLabel } from '@pingarden/shared';

interface Props {
  learning?: LearningIndex;
  lang: Lang;
  compact?: boolean;
  className?: string;
  maxConcepts?: number;
  showReferences?: boolean;
}

export function LearningGuide({
  learning,
  lang,
  compact = false,
  className = '',
  maxConcepts,
  showReferences = true,
}: Props) {
  const { t } = useTranslation();
  if (!learning || !hasLearningContent(learning)) return null;

  const headline = localize(learning.headline, lang);
  const whyOpen = localize(learning.whyOpen, lang);
  const audience = localize(learning.audience, lang);
  const concepts = (learning.keyConcepts ?? [])
    .map((item) => localize(item, lang))
    .filter(Boolean)
    .slice(0, maxConcepts);

  const sections = compact
    ? []
    : [
        { key: 'firstSteps', title: t('library.learning.firstSteps'), items: learning.firstSteps },
        { key: 'outcomes', title: t('library.learning.outcomes'), items: learning.outcomes },
        { key: 'commonMisreads', title: t('library.learning.commonMisreads'), items: learning.commonMisreads },
        { key: 'practicePrompts', title: t('library.learning.practicePrompts'), items: learning.practicePrompts },
      ];

  return (
    <section
      className={`rounded-2xl border border-emerald-100 bg-emerald-50/50 px-4 py-3 text-left ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
            {t('library.learning.guide')}
          </div>
          {headline && (
            <h3 className="mt-1 text-sm font-semibold leading-snug text-stone-950">
              {headline}
            </h3>
          )}
        </div>
        {learning.level && (
          <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-200">
            {t(`library.learning.levels.${learning.level}`)}
          </span>
        )}
      </div>

      {(whyOpen || audience) && (
        <div className="mt-2 space-y-1.5 text-[12px] leading-relaxed text-stone-700">
          {whyOpen && <p>{whyOpen}</p>}
          {audience && (
            <p>
              <span className="font-semibold text-stone-800">{t('library.learning.audience')} </span>
              {audience}
            </p>
          )}
        </div>
      )}

      {concepts.length > 0 && (
        <div className="mt-3">
          {!compact && (
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
              {t('library.learning.keyConcepts')}
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            {concepts.map((concept) => (
              <span
                key={concept}
                className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-stone-700 ring-1 ring-emerald-100"
              >
                {concept}
              </span>
            ))}
          </div>
        </div>
      )}

      {sections.map(({ key, title, items }) => (
        <LearningList key={key} title={title} items={items} lang={lang} />
      ))}

      {showReferences && !compact && (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <ReferenceGroup title={t('library.learning.sourceRefs')} refs={learning.sourceRefs} lang={lang} />
          <ReferenceGroup title={t('library.learning.relatedRefs')} refs={learning.relatedRefs} lang={lang} />
          <ReferenceGroup title={t('library.learning.nextRefs')} refs={learning.nextRefs} lang={lang} />
        </div>
      )}
    </section>
  );
}

function LearningList({
  title,
  items,
  lang,
}: {
  title: string;
  items?: LocalizedLabel[];
  lang: Lang;
}) {
  const rows = (items ?? []).map((item) => localize(item, lang)).filter(Boolean);
  if (rows.length === 0) return null;
  return (
    <div className="mt-3">
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
        {title}
      </div>
      <ul className="space-y-1 text-[12px] leading-relaxed text-stone-700">
        {rows.map((row) => (
          <li key={row} className="flex gap-2">
            <span className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-emerald-500" />
            <span>{row}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReferenceGroup({
  title,
  refs,
  lang,
}: {
  title: string;
  refs?: LearningReference[];
  lang: Lang;
}) {
  const { t } = useTranslation();
  if (!refs || refs.length === 0) return null;
  return (
    <div>
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
        {title}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {refs.map((ref) => (
          <span
            key={referenceKey(ref)}
            title={localize(ref.note, lang) || undefined}
            className="rounded-lg border border-emerald-100 bg-white px-2 py-1 text-[10px] leading-tight text-stone-700"
          >
            <span className="font-semibold text-emerald-700">
              {t(`library.learning.refTypes.${ref.type}`)}
            </span>
            <span className="ml-1">{referenceLabel(ref, lang)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function hasLearningContent(learning: LearningIndex): boolean {
  return Boolean(
    learning.level ||
      learning.headline ||
      learning.whyOpen ||
      learning.audience ||
      learning.keyConcepts?.length ||
      learning.commonMisreads?.length ||
      learning.firstSteps?.length ||
      learning.outcomes?.length ||
      learning.practicePrompts?.length ||
      learning.sourceRefs?.length ||
      learning.relatedRefs?.length ||
      learning.nextRefs?.length,
  );
}

export function localize(label: LocalizedLabel | undefined, lang: Lang): string {
  if (!label) return '';
  return label[lang] || label[lang === 'zh' ? 'en' : 'zh'] || '';
}

function referenceLabel(ref: LearningReference, lang: Lang): string {
  const explicit = localize(ref.label, lang);
  if (explicit) return explicit;
  if (ref.type === 'resourceChapter') return [ref.slug, ref.chapterSlug].filter(Boolean).join(' · ');
  if (ref.type === 'canvasBlock') return [ref.canvasDefId || ref.slug, ref.blockId].filter(Boolean).join(' · ');
  if (ref.type === 'caseStory') return [ref.slug, ref.storyId].filter(Boolean).join(' · ');
  return ref.slug;
}

function referenceKey(ref: LearningReference): string {
  return [
    ref.type,
    ref.slug,
    ref.chapterSlug,
    ref.canvasDefId,
    ref.blockId,
    ref.storyId,
  ]
    .filter(Boolean)
    .join(':');
}
