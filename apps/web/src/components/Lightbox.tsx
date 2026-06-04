import { useEffect } from 'react';
import { useLightbox } from '../state/lightbox';

/**
 * Render once at the page level (e.g. inside the workspace shell).
 * When `useLightbox.src` is set, paints a fixed-position dark backdrop
 * with the image centered (max 95vw / 95vh). Click backdrop or press
 * Esc to close.
 *
 * Body scroll is locked while the lightbox is open so wheel events on
 * the backdrop don't scroll the page underneath.
 */
export function LightboxRoot() {
  const src = useLightbox((s) => s.src);
  const alt = useLightbox((s) => s.alt);
  const close = useLightbox((s) => s.close);

  // Esc to close — listener is attached only while open so it doesn't
  // interfere with the workspace's own Esc handler when no lightbox is up.
  useEffect(() => {
    if (!src) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
      }
    }
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [src, close]);

  // Lock body scroll while open. Restored on close.
  useEffect(() => {
    if (!src) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [src]);

  if (!src) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt || 'Image preview'}
      onClick={close}
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 p-6"
    >
      <img
        src={src}
        alt={alt}
        // Stop the click on the image itself from closing — lets users
        // pan / right-click the image. Background click still closes.
        onClick={(e) => e.stopPropagation()}
        className="max-h-[95vh] max-w-[95vw] cursor-zoom-out rounded-md shadow-2xl"
      />
      <button
        type="button"
        onClick={close}
        aria-label="Close"
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-lg text-white hover:bg-white/30"
      >
        ×
      </button>
    </div>
  );
}
