import type { CanvasMeta, Lang } from '@pingarden/shared';
import { effectiveObjectTypes } from '@pingarden/shared';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CanvasRenderer } from '../canvas/CanvasRenderer';
import { StickyLayer } from '../canvas/StickyLayer';
import { PinLayer } from '../canvas/PinLayer';
import { useReadOnlyYDoc } from '../collab/useReadOnlyYDoc';

interface Props {
  projectId: string;
  canvas: CanvasMeta | undefined;
  title?: string;
  lang: Lang;
  displayName: string;
}

export function EmbeddedCanvas({ projectId, canvas, title, lang, displayName }: Props) {
  const { t } = useTranslation();
  const { doc, ready } = useReadOnlyYDoc(canvas?.id);

  if (!canvas) {
    return (
      <div className="my-8 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
        {t('story.missingCanvas')}
      </div>
    );
  }

  return (
    <section className="my-10 overflow-hidden rounded-[28px] border border-stone-200 bg-white shadow-[0_24px_70px_rgba(42,107,107,0.10)]">
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
        <div className="relative h-full w-full overflow-hidden rounded-2xl bg-white shadow-inner">
          {ready && doc ? (
            <CanvasRenderer defId={canvas.defId} lang={lang} doc={doc} displayName={displayName}>
              {({ def, toSvgPoint }) => (
                <>
                  <StickyLayer
                    doc={doc}
                    zones={def.zones}
                    toSvgPoint={toSvgPoint}
                    displayName={displayName}
                    readonly
                  />
                  {effectiveObjectTypes(def).includes('pin') && (
                    <PinLayer doc={doc} def={def} toSvgPoint={toSvgPoint} readonly />
                  )}
                </>
              )}
            </CanvasRenderer>
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
