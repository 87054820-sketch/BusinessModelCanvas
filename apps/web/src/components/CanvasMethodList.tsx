import { useTranslation } from 'react-i18next';
import type { Lang } from '@pingarden/shared';
import type { CanvasDefSummary } from '../api/client';
import { CanvasThumb } from '../canvas/CanvasThumb';
import { localize } from './LearningGuide';

interface Props {
  defs: CanvasDefSummary[];
  lang: Lang;
  onPreview: (defId: string) => void;
  onStart: (defId: string) => void;
}

export function CanvasMethodList({ defs, lang, onPreview, onStart }: Props) {
  const { t } = useTranslation();

  if (defs.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-gray-200 bg-white py-12 text-center text-sm text-gray-400">
        {t('library.canvasMethodsEmpty')}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {defs.map((def) => {
        const tagline = t(`templates.${def.id}.tagline`, '');
        const learningSummary =
          localize(def.learning?.whyOpen, lang) ||
          localize(def.learning?.headline, lang) ||
          tagline ||
          t('library.canvasMethod.defaultTagline');
        const concepts = (def.learning?.keyConcepts ?? [])
          .map((item) => localize(item, lang))
          .filter(Boolean)
          .slice(0, 3);
        return (
          <article
            key={def.id}
            role="button"
            tabIndex={0}
            onClick={() => onPreview(def.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onPreview(def.id);
              }
            }}
            className="group flex min-h-[252px] cursor-pointer flex-col rounded-xl border border-gray-200 bg-white p-4 text-left transition hover:border-emerald-200 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
          >
            <div className="flex h-28 items-center justify-center rounded-lg bg-[#FAFAF7] ring-1 ring-gray-100 transition group-hover:bg-white">
              <CanvasThumb id={def.id} width={172} height={102} />
            </div>
            <div className="mt-4 flex flex-1 flex-col">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-sm font-semibold text-gray-900">{def.name[lang] ?? def.name.en}</h2>
                <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                  {t('library.canvasMethod.kind')}
                </span>
              </div>
              <p className="mt-2 line-clamp-3 text-[12px] leading-relaxed text-gray-500">
                {learningSummary}
              </p>
              {concepts.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {concepts.map((concept) => (
                    <span key={concept} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                      {concept}
                    </span>
                  ))}
                </div>
              )}
              {def.related && def.related.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {def.related.slice(0, 3).map((id) => (
                    <span key={id} className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
                      {id}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-auto flex flex-wrap gap-2 pt-4">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPreview(def.id);
                  }}
                  className="inline-flex w-fit items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 active:scale-[0.98]"
                >
                  {t('library.canvasMethod.details')}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStart(def.id);
                  }}
                  className="inline-flex w-fit items-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100 active:scale-[0.98]"
                >
                  {t('library.canvasMethod.start')}
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
