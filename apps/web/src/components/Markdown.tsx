import { createContext, useContext } from 'react';
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
  /**
   * Optional rendering variant.
   *
   * - `'block-guidance'` — used by the right-side BlockInspector. Each
   *   H3 + its trailing siblings (until the next H1/H2/H3) get wrapped
   *   in a "sub-category card": rounded border + light shadow + inner
   *   padding. This is what gives BME's per-block guidance (where each
   *   block has 4–5 H3 sub-categories like "Competitors / New Entrants
   *   / ...") a clear visual hierarchy. Other canvases (BMC, JTBD,
   *   Empathy Map, ...) currently don't use H3 in their guidance MD,
   *   so they render unchanged today; if any future canvas adds H3
   *   sections it inherits the same card treatment for free.
   *
   * Omit (default) for plain rendering — used by CanvasKnowledgeInspector
   *   (intro/body) and any general-purpose markdown surface.
   */
  variant?: 'block-guidance';
}

/**
 * Context flag — true while rendering inside a sub-category card so
 * the H3 / blockquote / paragraph component overrides can switch to
 * the "inside card" type scale (the card itself supplies the visual
 * boundary, so we drop the blue left bar etc.).
 */
const SubcategoryContext = createContext(false);

/**
 * Tiny rehype plugin: walks the HAST root's children, finds every
 * `<h3>`, and groups it together with all following siblings up to
 * (but not including) the next `<h1>` / `<h2>` / `<h3>` into a single
 * `<section data-subcategory>` element.
 *
 * Why HAST-level grouping rather than:
 *   - regex over the markdown source: would mis-fire on `### foo`
 *     inside a fenced code block.
 *   - React-children post-processing: requires reaching into
 *     react-markdown's render output and re-implementing AST
 *     flattening in JSX — leaky.
 *
 * Edge cases handled implicitly:
 *   - H3 with no following content → card contains only the heading.
 *   - Two H3 back-to-back → first card auto-closes at the second.
 *   - Code-fenced `### foo` → never reaches HAST as a heading.
 */
function rehypeGroupH3Sections() {
  return (tree: { children?: unknown[] }) => {
    if (!tree || !Array.isArray(tree.children)) return;
    const out: unknown[] = [];
    let i = 0;
    while (i < tree.children.length) {
      const node = tree.children[i] as
        | { type?: string; tagName?: string }
        | null
        | undefined;
      const isH3 =
        node && (node as { type?: string }).type === 'element' && node.tagName === 'h3';
      if (!isH3) {
        out.push(node);
        i++;
        continue;
      }
      const group: unknown[] = [node];
      i++;
      while (i < tree.children.length) {
        const next = tree.children[i] as
          | { type?: string; tagName?: string }
          | null
          | undefined;
        const isHeadingBoundary =
          next &&
          (next as { type?: string }).type === 'element' &&
          (next.tagName === 'h1' ||
            next.tagName === 'h2' ||
            next.tagName === 'h3');
        if (isHeadingBoundary) break;
        group.push(next);
        i++;
      }
      out.push({
        type: 'element',
        tagName: 'section',
        properties: { 'data-subcategory': 'true' },
        children: group,
      });
    }
    tree.children = out;
  };
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
 *   - BlockInspector            (per-block guidance markdown — passes
 *                                `variant="block-guidance"` to enable
 *                                sub-category cards)
 *   - any future inspector surface that wants markdown-formatted text
 */
export function Markdown({
  content,
  className = 'text-sm leading-relaxed text-gray-800',
  canvasDefId,
  variant,
}: Props) {
  const openLightbox = useLightbox((s) => s.open);
  const isBlockGuidance = variant === 'block-guidance';

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
        rehypePlugins={isBlockGuidance ? [rehypeGroupH3Sections] : undefined}
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
          //
          // In `variant="block-guidance"`, H3 sits *inside* a card; the
          // card itself supplies the visual boundary, so we drop the
          // blue left bar and tighten margins. See SubcategoryContext.
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
          h3: ({ children }) => {
            const inCard = useContext(SubcategoryContext);
            if (inCard) {
              return (
                <h5 className="mt-0 mb-1 text-sm font-semibold text-gray-900">
                  {children}
                </h5>
              );
            }
            return (
              <h5 className="mt-6 mb-2 border-l-[3px] border-blue-500 pl-2.5 text-base font-bold text-gray-900 first:mt-0">
                {children}
              </h5>
            );
          },
          p: ({ children }) => {
            const inCard = useContext(SubcategoryContext);
            if (inCard) {
              return <p className="mb-2 text-sm leading-relaxed last:mb-0">{children}</p>;
            }
            return <p className="mb-3 last:mb-0">{children}</p>;
          },
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
          blockquote: ({ children }) => {
            const inCard = useContext(SubcategoryContext);
            if (inCard) {
              // Sub-category abstract — acts as a deck/subtitle of the
              // card heading. Drop the gray bar + italic to read as a
              // tagline rather than a quote.
              return (
                <blockquote className="mt-0 mb-2 border-0 pl-0 text-xs leading-snug text-gray-500">
                  {children}
                </blockquote>
              );
            }
            return (
              <blockquote className="my-3 border-l-2 border-gray-300 pl-3 text-sm italic text-gray-600">
                {children}
              </blockquote>
            );
          },
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
          // Sub-category card — only emitted by the rehypeGroupH3Sections
          // plugin (which only runs when variant="block-guidance"). For
          // any other call site, the HAST never contains a synthetic
          // <section> from us, so this override is inert.
          section: ({ children, ...rest }) => {
            const isCard =
              (rest as { 'data-subcategory'?: string })['data-subcategory'] === 'true';
            if (!isCard) return <section {...rest}>{children}</section>;
            return (
              <section className="mb-3 rounded-lg border border-gray-200 bg-white p-3.5 shadow-sm last:mb-0">
                <SubcategoryContext.Provider value={true}>
                  {children}
                </SubcategoryContext.Provider>
              </section>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
