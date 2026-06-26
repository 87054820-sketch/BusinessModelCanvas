import { useEffect, useRef } from 'react';
import { Editor, EditorContent, useEditor } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';

/**
 * Tiptap-based sticky text editor. Used in two surfaces:
 *
 *   1. The on-canvas sticky body (`Sticky.tsx`) — `compact` mode, lives
 *      inside an SVG `<foreignObject>` and is constrained to ~140×120px,
 *      so the toolbar uses an icon-only thin row.
 *   2. The right-panel sticky inspector (`StickyInspector.tsx`) — full
 *      mode, more breathing room.
 *
 * The toolbar is **persistent** (always rendered above the writing
 * area while editing) rather than a floating BubbleMenu — letting the
 * user click B / I / U / size / colour BEFORE typing, instead of
 * having to type-then-select-then-format. Mirrors the affordance most
 * users expect from "a normal text editor with a toolbar row".
 *
 * Storage shape: `value` and `onCommit(html)` are plain HTML strings
 * stored verbatim in the existing Yjs `text` field. Plain-text legacy
 * stickies are accepted as-is — Tiptap's HTML parser auto-wraps them
 * into a paragraph node, and `getHTML()` round-trips them as
 * `<p>...</p>`. No Yjs schema migration is required.
 *
 * Commit semantics mirror the previous textarea behaviour: blur, Esc,
 * and Cmd/Ctrl+Enter all flush via `onCommit`. Esc additionally signals
 * an explicit cancel by triggering blur without further keystrokes.
 */

/**
 * Add a `fontSize` attribute to TextStyle's `<span>` wrapper, plus
 * `setFontSize` / `unsetFontSize` chain commands. Implemented as an
 * Extension (not a Mark) because we are *augmenting* TextStyle rather
 * than introducing a new mark type — this keeps font-size and colour
 * on the same span without nesting.
 */
const FontSize = Extension.create({
  name: 'fontSize',

  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          fontSize: {
            default: null as string | null,
            parseHTML: (element: HTMLElement) => element.style.fontSize || null,
            renderHTML: (attributes: { fontSize?: string | null }) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (size: string) =>
        ({ chain }) =>
          chain().setMark('textStyle', { fontSize: size }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

/** Restrict StarterKit to the bits we actually want — no headings,
 *  no blockquote, no code blocks, no horizontal rule. Keeps the editor
 *  feeling like a sticky note, not a full document. */
const STARTER_KIT_OPTIONS = {
  heading: false,
  blockquote: false,
  codeBlock: false,
  horizontalRule: false,
  bulletList: false,
  orderedList: false,
  listItem: false,
  strike: false,
  // bold + italic + paragraph + history come for free.
} as const;

/** Detect HTML in a value coming from Yjs. Plain-text legacy stickies
 *  get wrapped so Tiptap doesn't render them as a single empty
 *  paragraph. */
export function ensureHTML(value: string): string {
  if (!value) return '';
  // Cheap heuristic: any tag that we'd produce, plus <br>.
  return /<(p|span|strong|em|u|br)\b/i.test(value)
    ? value
    : `<p>${escapeHtml(value)}</p>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Inline text colour palette for the bubble menu. Intentionally NOT
 *  the sticky background palette — these are reading-order emphasis
 *  colours, used to highlight a phrase, not to encode block semantics. */
const TEXT_COLORS = [
  { hex: '#111827', label: 'Default' },
  { hex: '#DC2626', label: 'Red' },
  { hex: '#D97706', label: 'Amber' },
  { hex: '#059669', label: 'Green' },
  { hex: '#2563EB', label: 'Blue' },
  { hex: '#7C3AED', label: 'Purple' },
];

/** Discrete font sizes — small / medium / large / extra-large. Stored
 *  as raw px values so the editor's HTML output is portable. Default
 *  body size is 13–14px, matching Sticky.tsx's leading. */
const FONT_SIZES: Array<{ value: string; label: string }> = [
  { value: '12px', label: 'S' },
  { value: '14px', label: 'M' },
  { value: '18px', label: 'L' },
  { value: '24px', label: 'XL' },
];

interface Props {
  value: string;
  onCommit: (html: string) => void;
  /** Auto-focus the editor + place cursor at end on mount. */
  autoFocus?: boolean;
  /** Compact toolbar layout — used inside the on-canvas sticky body. */
  compact?: boolean;
  /** Static read-only render mode — used by the inspector preview and
   *  by the on-canvas sticky when not in editing mode. The toolbar is
   *  hidden, the editor is non-editable, and there's no commit. */
  readOnly?: boolean;
  /** Optional class hooks for the outer wrapper. */
  className?: string;
}

export function StickyRichEditor({
  value,
  onCommit,
  autoFocus = false,
  compact = false,
  readOnly = false,
  className,
}: Props) {
  const lastCommittedRef = useRef<string>(value);

  const editor = useEditor({
    extensions: [
      StarterKit.configure(STARTER_KIT_OPTIONS),
      Underline,
      TextStyle,
      Color,
      FontSize,
    ],
    content: ensureHTML(value),
    editable: !readOnly,
    onBlur: ({ editor }) => {
      if (readOnly) return;
      const html = editor.getHTML();
      if (html !== lastCommittedRef.current) {
        lastCommittedRef.current = html;
        onCommit(html);
      }
    },
    editorProps: {
      attributes: {
        class: compact
          ? 'tiptap-sticky-compact h-full w-full text-[14px] leading-[1.15] text-gray-900 outline-none'
          : 'tiptap-sticky h-full w-full text-sm leading-snug text-gray-800 outline-none',
      },
      handleKeyDown(_view, event) {
        // Match the canvas-side textarea: Esc and Cmd/Ctrl+Enter both
        // commit + exit edit mode (parent flips `editing` back to false
        // when its own onCommit handler fires).
        if (event.key === 'Escape') {
          event.stopPropagation();
          (event.target as HTMLElement | null)?.blur?.();
          return true;
        }
        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
          (event.target as HTMLElement | null)?.blur?.();
          return true;
        }
        return false;
      },
    },
  });

  // External value changes (e.g. another tab edited the sticky, the
  // inspector resyncs from prop) replace editor content. Skip when the
  // change came from this editor itself.
  useEffect(() => {
    if (!editor) return;
    const incoming = ensureHTML(value);
    if (editor.getHTML() === incoming) return;
    if (lastCommittedRef.current === incoming) return;
    editor.commands.setContent(incoming, false);
    lastCommittedRef.current = incoming;
  }, [editor, value]);

  // Auto-focus once on mount (only when entering edit mode).
  useEffect(() => {
    if (!editor || !autoFocus || readOnly) return;
    // Defer to next tick so foreignObject / inspector layout settles
    // before focus, otherwise selection collapses to the wrong spot.
    const id = setTimeout(() => {
      editor.commands.focus('end');
    }, 0);
    return () => clearTimeout(id);
  }, [editor, autoFocus, readOnly]);

  if (!editor) return null;

  // Outer wrapper is a vertical flex column so the toolbar can sit
  // pinned at the top while the editor area takes the remaining height.
  // `min-h-0` on the editor wrapper is the trick that lets the inner
  // EditorContent scroll instead of overflowing the sticky body when
  // the user types more than fits.
  return (
    <div className={`flex h-full w-full flex-col ${className ?? ''}`}>
      {!readOnly && (
        <Toolbar editor={editor} compact={compact} />
      )}
      <div
        className={`min-h-0 flex-1 overflow-auto ${compact ? 'pt-1' : 'pt-1.5'}`}
        // Clicking the empty area below the editor content should
        // refocus the editor — feels like clicking inside a textarea.
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) {
            e.preventDefault();
            editor.commands.focus('end');
          }
        }}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

interface ToolbarProps {
  editor: Editor;
  compact: boolean;
}

/**
 * Persistent toolbar pinned above the editor. Compact mode (on-canvas
 * sticky body) drops to icon-only, narrower padding, and trims the
 * inline colour set to the four most useful swatches because the
 * sticky body is only ~140px wide.
 */
function Toolbar({ editor, compact }: ToolbarProps) {
  const btnBase = compact
    ? 'flex h-5 min-w-[20px] items-center justify-center rounded px-1 text-[11px] font-medium transition'
    : 'flex h-7 min-w-[28px] items-center justify-center rounded px-1.5 text-[12px] font-medium transition';
  const inactive = 'text-gray-700 hover:bg-gray-100';
  const active = 'bg-gray-900 text-white';
  const colors = compact ? TEXT_COLORS.slice(0, 4) : TEXT_COLORS;
  const sizes = compact ? FONT_SIZES.filter((s) => s.label !== 'XL') : FONT_SIZES;

  return (
    <div
      // mousedown.preventDefault() at the wrapper level so clicking any
      // toolbar button doesn't blur the editor (which would commit and
      // exit edit mode prematurely).
      onMouseDown={(e) => e.preventDefault()}
      className={`flex w-full flex-shrink-0 flex-wrap items-center gap-0.5 border-b border-gray-200 bg-white/95 ${
        compact ? 'h-6 px-1 py-0.5' : 'rounded-t-md px-1.5 py-1'
      }`}
    >
      <button
        type="button"
        title="Bold (⌘B)"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`${btnBase} ${editor.isActive('bold') ? active : inactive}`}
      >
        <span className="font-bold">B</span>
      </button>
      <button
        type="button"
        title="Italic (⌘I)"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`${btnBase} ${editor.isActive('italic') ? active : inactive}`}
      >
        <span className="italic">I</span>
      </button>
      <button
        type="button"
        title="Underline (⌘U)"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`${btnBase} ${editor.isActive('underline') ? active : inactive}`}
      >
        <span className="underline">U</span>
      </button>

      <div className={`mx-1 ${compact ? 'h-3' : 'h-4'} w-px bg-gray-200`} />

      {sizes.map((size) => {
        const isActive = editor.isActive('textStyle', { fontSize: size.value });
        return (
          <button
            key={size.value}
            type="button"
            title={`Font size ${size.value}`}
            onClick={() => {
              if (isActive) {
                editor.chain().focus().unsetFontSize().run();
              } else {
                editor.chain().focus().setFontSize(size.value).run();
              }
            }}
            className={`${btnBase} ${isActive ? active : inactive}`}
          >
            {size.label}
          </button>
        );
      })}

      <div className={`mx-1 ${compact ? 'h-3' : 'h-4'} w-px bg-gray-200`} />

      {/* Inline text colour swatches. Intentionally a small fixed set —
          large palettes here would distract from the canvas-level
          colorLegend, which is the semantic source of truth for sticky
          background colours. The first swatch (Default) clears the
          colour mark. */}
      {colors.map((c) => (
        <button
          key={c.hex}
          type="button"
          title={c.label}
          onClick={() => {
            if (c.label === 'Default') {
              editor.chain().focus().unsetColor().run();
            } else {
              editor.chain().focus().setColor(c.hex).run();
            }
          }}
          className={`ml-0.5 flex items-center justify-center rounded-full border border-gray-300 ${
            compact ? 'h-3.5 w-3.5' : 'h-5 w-5'
          }`}
          style={{ backgroundColor: c.hex }}
          aria-label={c.label}
        />
      ))}
    </div>
  );
}
