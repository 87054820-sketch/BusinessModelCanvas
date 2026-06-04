import ReactMarkdown from 'react-markdown';
import { useLightbox } from '../state/lightbox';

interface Props {
  content: string;
  /**
   * Override the wrapper class — defaults to a small-comfortable type
   * scale matching the inspector's surrounding text. Pass a different
   * value (e.g. add `text-xs` instead) for tighter contexts like the
   * block inspector when needed.
   */
  className?: string;
  /**
   * The canvas-def id whose bundle hosts any relative-path images
   * referenced from the markdown. When set, a markdown image like
   *   ![diagram](images/customer-flow.png)
   * resolves to `/canvas-defs/<defId>/asset/images/customer-flow.png`,
   * served by the knowledge-asset route. Absolute URLs (http(s)://, /,
   * data:) are passed through unchanged.
   *
   * When `canvasDefId` is omitted, all relative paths are passed
   * through unchanged — useful for general-purpose markdown that
   * doesn't sit inside a canvas bundle.
   */
  canvasDefId?: string;
}

/**
 * Project-wide markdown renderer. We don't pull in @tailwindcss/typography
 * for these surfaces — instead each markdown element gets a manual
 * Tailwind class so the type scale lines up with the rest of the app's
 * inspector / panel chrome.
 *
 * Images are rendered with a `cursor-zoom-in` affordance and open in
 * the global lightbox (`useLightbox`) when clicked.
 *
 * Used by:
 *   - CanvasKnowledgeInspector (long-form intro + body for a canvas type)
 *   - BlockInspector            (per-block guidance markdown)
 *   - any future inspector surface that wants markdown-formatted text
 */
export function Markdown({
  content,
  className = 'text-sm leading-relaxed text-gray-800',
  canvasDefId,
}: Props) {
  const openLightbox = useLightbox((s) => s.open);

  function resolveImageSrc(src: string | undefined): string {
    if (!src) return '';
    // Pass through anything that's clearly absolute or already routed:
    //   - http(s)://...     (external)
    //   - data:image/...    (inline)
    //   - /something        (server-rooted path)
    if (
      src.startsWith('http://') ||
      src.startsWith('https://') ||
      src.startsWith('data:') ||
      src.startsWith('/')
    ) {
      return src;
    }
    // Relative path — only meaningful if we know which canvas bundle to
    // resolve against. Strip a leading "./" so authors can write either
    // `images/foo.png` or `./images/foo.png`.
    if (!canvasDefId) return src;
    const trimmed = src.replace(/^\.\//, '');
    return `/canvas-defs/${canvasDefId}/asset/${trimmed}`;
  }

  return (
    <div className={className}>
      <ReactMarkdown
        components={{
          // Heading scale tuned for the right-side inspector. Body sits
          // at text-sm (14px); every heading level must be VISIBLY
          // bigger AND visually distinct so a reader scanning a long
          // page (e.g. BME's "5 sub-categories") can land on each
          // heading at a glance.
          //
          // Cascade:
          //   H1 — text-xl bold              (page title; rare)
          //   H2 — text-lg bold              (major sections)
          //   H3 — text-base bold + colored  (sub-sections — the level
          //         left accent bar           that needs to be most
          //                                   scannable, e.g. BME's
          //                                   5 forces, JTBD's 3 layers)
          //   Body — text-sm                 (paragraphs)
          //
          // No `uppercase tracking-wider` — that styling was for short
          // English ALL-CAPS labels and stretches Chinese awkwardly.
          h1: ({ children }) => (
            <h3 className="mt-6 mb-3 text-xl font-bold text-gray-900 first:mt-0">
              {children}
            </h3>
          ),
          h2: ({ children }) => (
            <h4 className="mt-6 mb-2 text-lg font-bold text-gray-900 first:mt-0">
              {children}
            </h4>
          ),
          h3: ({ children }) => (
            <h5 className="mt-6 mb-2 border-l-[3px] border-blue-500 pl-2.5 text-base font-bold text-gray-900 first:mt-0">
              {children}
            </h5>
          ),
          p: ({ children }) => (
            <p className="mb-3 last:mb-0">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>
          ),
          li: ({ children }) => <li className="text-sm text-gray-800">{children}</li>,
          code: ({ children }) => (
            <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[12px] text-gray-800">
              {children}
            </code>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer noopener"
              className="text-gray-900 underline decoration-gray-300 underline-offset-2 hover:decoration-gray-700"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-2 border-gray-300 pl-3 text-sm italic text-gray-600">
              {children}
            </blockquote>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-gray-900">{children}</strong>
          ),
          img: ({ src, alt }) => {
            const resolved = resolveImageSrc(typeof src === 'string' ? src : '');
            if (!resolved) return null;
            return (
              <img
                src={resolved}
                alt={alt ?? ''}
                onClick={() => openLightbox(resolved, alt ?? '')}
                className="my-3 max-w-full cursor-zoom-in rounded-md border border-gray-200 hover:border-gray-400"
                loading="lazy"
              />
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
