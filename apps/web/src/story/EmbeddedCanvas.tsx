import { useEffect, useRef, useState } from 'react';
import type { CanvasMeta, Lang } from '@pingarden/shared';
import { effectiveObjectTypes } from '@pingarden/shared';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CanvasRenderer } from '../canvas/CanvasRenderer';
import { StickyLayer } from '../canvas/StickyLayer';
import { PinLayer } from '../canvas/PinLayer';
import { LegendPalette } from '../canvas/LegendPalette';
import { StickyLegendPalette } from '../canvas/StickyLegendPalette';
import { useReadOnlyYDoc } from '../collab/useReadOnlyYDoc';
import { hasPinClasses } from '../collab/pinClasses';
import { hasColorLegend } from '../collab/colorLegend';

interface Props {
  projectId: string;
  canvas: CanvasMeta | undefined;
  title?: string;
  lang: Lang;
  displayName: string;
}

export function EmbeddedCanvas({ projectId, canvas, title, lang, displayName }: Props) {
  const { t } = useTranslation();
  const rootRef = useRef<HTMLElement | null>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const { doc, ready } = useReadOnlyYDoc(shouldLoad ? canvas?.id : undefined);

  useEffect(() => {
    setShouldLoad(false);
  }, [canvas?.id]);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || shouldLoad) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: '320px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [shouldLoad]);

  if (!canvas) {
    return (
      <div className="my-8 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
        {t('story.missingCanvas')}
      </div>
    );
  }

  return (
    <section ref={rootRef} className="my-10 overflow-hidden rounded-[28px] border border-stone-200 bg-white shadow-[0_24px_70px_rgba(42,107,107,0.10)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 bg-gradient-to-r from-[#F3F0EA] via-white to-[#EAF3F1] px-5 py-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#2A6B6B]">
            {t('story.embeddedCanvas')}
          </div>
          <h3 className="mt-1 text-lg font-bold text-gray-900">{title || canvas.title}</h3>
          <div className="mt-1 text-xs text-gray-500">
            {canvas.contentDateLabel || canvas.contentDate || t('story.noContentDate')}
          </div>
        </div>
        <Link
          to={`/p/${projectId}/c/${canvas.id}`}
          className="rounded-full border border-[#B8D4D0] bg-white px-4 py-2 text-sm font-semibold text-[#2A6B6B] transition hover:bg-[#EAF3F1]"
        >
          {t('story.openCanvas')}
        </Link>
      </div>
      <div className="h-[520px] bg-[#FAF8F3] p-4">
        <div className="relative flex h-full w-full flex-col overflow-hidden rounded-2xl bg-white shadow-inner">
          {!shouldLoad ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-sm text-gray-500">
              <div className="rounded-full border border-[#B8D4D0] bg-white px-4 py-2 font-semibold text-[#2A6B6B]">
                {t('story.embeddedCanvas')}
              </div>
              <p>{t('story.loadingCanvas')}</p>
            </div>
          ) : ready && doc ? (
            <>
              {/* Top legend strip — 48px (h-12) reserved row that
                  hosts the pin-class palette (left) and sticky-color
                  palette (right). Mirrors the workspace strip but a
                  notch shorter (workspace is h-14) because embeds
                  are only 520px tall — every pixel matters.

                  We previously placed both palettes as
                  `position: absolute top-3 left-3 / right-3` overlay
                  chips, but on a BMC the right-corner sticky-color
                  legend physically overlapped the "Customer
                  Relationships" zone. Strip approach trades 48px of
                  canvas height for legends that cannot ever obscure
                  content at any zoom level.

                  The whole strip is conditional: if neither pin
                  classes nor color legend has at least one entry,
                  it disappears entirely so unstyled embeds stay
                  pure SVG (preserves the "if no legend, no chrome"
                  contract). */}
              {(hasPinClasses(doc) || hasColorLegend(doc)) && (
                <div className="flex h-12 flex-shrink-0 items-center justify-between gap-3 border-b border-stone-200 bg-stone-50/40 px-3">
                  <div className="flex min-w-0 items-center">
                    {hasPinClasses(doc) && (
                      <LegendPalette doc={doc} displayName={displayName} lang={lang} readOnly />
                    )}
                  </div>
                  <div className="flex min-w-0 items-center">
                    {hasColorLegend(doc) && (
                      <StickyLegendPalette doc={doc} lang={lang} readOnly />
                    )}
                  </div>
                </div>
              )}
              <div className="relative flex-1 overflow-hidden">
                <CanvasRenderer defId={canvas.defId} lang={lang} doc={doc} displayName={displayName}>
                  {({ def, toSvgPoint }) => (
                    <>
                      {effectiveObjectTypes(def).includes('sticky') && (
                        <StickyLayer
                          doc={doc}
                          zones={def.zones}
                          toSvgPoint={toSvgPoint}
                          displayName={displayName}
                          readonly
                        />
                      )}
                      {effectiveObjectTypes(def).includes('pin') && (
                        <PinLayer doc={doc} def={def} toSvgPoint={toSvgPoint} readonly />
                      )}
                    </>
                  )}
                </CanvasRenderer>
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              {t('story.loadingCanvas')}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
