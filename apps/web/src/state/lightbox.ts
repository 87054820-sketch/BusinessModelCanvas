import { create } from 'zustand';

/**
 * Global lightbox state. One image at a time — opening a new one
 * replaces the previous. Lives in Zustand so any component can open
 * the lightbox without prop-drilling, and a single `<LightboxRoot/>`
 * mounted at the app level renders the modal.
 */
interface LightboxStore {
  src: string | null;
  alt: string;
  open: (src: string, alt?: string) => void;
  close: () => void;
}

export const useLightbox = create<LightboxStore>((set) => ({
  src: null,
  alt: '',
  open: (src, alt) => set({ src, alt: alt ?? '' }),
  close: () => set({ src: null, alt: '' }),
}));
