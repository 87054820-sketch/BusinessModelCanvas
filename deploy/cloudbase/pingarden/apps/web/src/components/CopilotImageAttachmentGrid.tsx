import { useTranslation } from 'react-i18next';
import { useLightbox } from '../state/lightbox';

export type CopilotImageAttachmentGridVariant = 'composer' | 'message';

export interface CopilotImageAttachmentGridItem {
  id: string;
  name: string;
  previewDataUrl: string;
  dataUrl?: string;
  thumbnailDataUrl?: string;
  sizeBytes?: number;
}

interface CopilotImageAttachmentGridProps {
  images: CopilotImageAttachmentGridItem[];
  variant: CopilotImageAttachmentGridVariant;
  maxImages?: number;
  disabled?: boolean;
  onRemove?: (id: string) => void;
}

export function CopilotImageAttachmentGrid({
  images,
  variant,
  maxImages = 9,
  disabled = false,
  onRemove,
}: CopilotImageAttachmentGridProps) {
  const { t } = useTranslation();
  const openLightbox = useLightbox((s) => s.open);
  const visibleImages = images.slice(0, maxImages);
  const isComposer = variant === 'composer';
  const count = visibleImages.length;
  const remaining = Math.max(0, maxImages - images.length);

  if (count === 0) return null;

  const gridClass = count === 1 ? 'grid-cols-1 max-w-[240px]' : count <= 4 ? 'grid-cols-2 max-w-[260px]' : 'grid-cols-3 max-w-[270px]';
  const cellHeight = isComposer
    ? count === 1 ? 'h-28' : 'h-20'
    : count === 1 ? 'h-40' : 'h-24';

  const grid = (
    <div className={`grid ${gridClass} gap-1.5`}>
      {visibleImages.map((image, index) => {
        const previewSrc = image.thumbnailDataUrl ?? image.previewDataUrl;
        const lightboxSrc = image.dataUrl ?? image.previewDataUrl;
        return (
          <div key={image.id} className={`group relative overflow-hidden rounded-xl ${cellHeight}`}>
            <button
              type="button"
              onClick={() => openLightbox(lightboxSrc, image.name)}
              className="block h-full w-full overflow-hidden rounded-xl border border-white/50 bg-gray-100 shadow-sm transition hover:scale-[1.015] hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400/60"
              title={image.sizeBytes ? `${image.name} · ${formatBytes(image.sizeBytes)}` : image.name}
            >
              <img
                src={previewSrc}
                alt={image.name}
                className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                loading="lazy"
              />
            </button>
            {isComposer && (
              <>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent px-2 pb-1.5 pt-5">
                  <div className="truncate text-[10px] font-medium text-white/95">{image.name}</div>
                </div>
                <div className="pointer-events-none absolute left-1.5 top-1.5 rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                  {index + 1}
                </div>
                {onRemove && (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(image.id);
                    }}
                    aria-label={t('library.copilot.removeImageAttachment', { name: image.name })}
                    className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-[12px] leading-none text-white shadow-sm transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    ×
                  </button>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );

  if (!isComposer) return grid;

  return (
    <div className="mb-2 rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 via-white to-blue-50/30 p-2 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2 px-0.5 text-[11px]">
        <span className="font-semibold text-gray-800">
          {t('library.copilot.imageTrayStatus', { count: images.length, max: maxImages })}
        </span>
        <span className={remaining > 0 ? 'text-gray-500' : 'font-medium text-amber-700'}>
          {remaining > 0
            ? t('library.copilot.imageTrayRemaining', { remaining })
            : t('library.copilot.imageTrayFull')}
        </span>
      </div>
      {grid}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
