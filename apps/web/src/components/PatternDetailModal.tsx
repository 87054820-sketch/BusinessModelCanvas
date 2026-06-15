import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import type {
  BusinessModelPattern,
  BusinessModelPatternDetail,
  CaseExampleRef,
  CaseLibraryEntry,
  Lang,
  PatternReference,
  PatternReferenceType,
  PatternSubtype,
} from '@pingarden/shared';
import { libraryApi } from '../api/library';

interface Props {
  pattern: BusinessModelPattern | null;
  lang: Lang;
  onClose: () => void;
  /**
   * Click on an example case in the "Related cases" tab. Host page is
   * expected to close the modal, switch to the Cases tab, and open
   * that case's preview modal.
   */
  onExampleClick: (slug: string) => void;
}

type ModalTab = 'description' | 'examples' | 'references';

/**
 * Large detail modal for a single business-model pattern. Hosts a
 * tabbed body:
 *   - **说明 / Description** — long-form bilingual markdown body
 *     (`description.{lang}.md`), rendered with `prose` typography.
 *   - **相关案例 / Related cases** — clickable mini-cards for every
 *     curated example case; click → close + jump back into Cases tab.
 *     When the pattern declares `subtypes`, the cards are grouped per
 *     sub-type with section headers.
 *   - **参考文献 / References** — annotated bibliography, formerly a
 *     fixed-height footer; promoted to its own tab in the 2026-06-15
 *     round-4 redesign so the modal could adopt a fixed height.
 *
 * The modal panel itself is **fixed height** (`h-[700px]` capped at
 * `85vh`, floored at `480px`). The header + tab strip don't move; the
 * body region is the only thing that scrolls. This means even very
 * long descriptions or large reference lists can't stretch the modal
 * past the viewport — they get an internal scrollbar instead.
 *
 * Detail (description markdown + hydrated example cases) is fetched
 * lazily on first open per pattern and cached for the modal lifetime.
 *
 * The list page (PatternList) intentionally hides everything that
 * lives in this modal — that lets the list scale to dozens of
 * patterns without becoming a wall of nested collapsibles.
 */
export function PatternDetailModal({
  pattern,
  lang,
  onClose,
  onExampleClick,
}: Props) {
  const { t } = useTranslation();
  const [detail, setDetail] = useState<BusinessModelPatternDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<ModalTab>('description');

  // Reset state + fetch when the selected pattern changes. The
  // `pattern.slug` dependency (rather than the whole object) keeps us
  // from re-fetching when only language changes — the detail payload
  // already carries both languages.
  useEffect(() => {
    if (!pattern) {
      setDetail(null);
      setLoading(false);
      setTab('description');
      return;
    }
    setLoading(true);
    setDetail(null);
    setTab('description');
    let cancelled = false;
    void libraryApi.getPattern(pattern.slug).then((d) => {
      if (cancelled) return;
      setDetail(d);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [pattern?.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  // Esc closes (consistent with ConfirmDialog / TemplatePreviewModal).
  useEffect(() => {
    if (!pattern) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pattern, onClose]);

  if (!pattern) return null;

  const name = pattern.name[lang] ?? pattern.name.en;
  const summary = pattern.summary[lang] ?? pattern.summary.en;
  const referenceCount = pattern.references?.length ?? pattern.sources.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-10"
      onMouseDown={(e) => {
        // Click on the backdrop closes; click inside the panel does not.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={name}
        className="flex h-[700px] max-h-[85vh] min-h-[480px] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl"
      >
        {/* Header — fixed height, never scrolls. */}
        <header className="flex shrink-0 items-start gap-4 border-b border-gray-100 px-6 py-5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700">
                {t('library.kind.pattern')}
              </span>
              <span className="text-[10px] text-gray-400">{pattern.slug}</span>
            </div>
            <h2 className="mt-1.5 text-xl font-semibold text-gray-900">{name}</h2>
            <p className="mt-1 text-sm leading-relaxed text-gray-600">{summary}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('confirm.cancel')}
            className="shrink-0 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5.293 5.293a1 1 0 011.414 0L10 8.586l3.293-3.293a1 1 0 111.414 1.414L11.414 10l3.293 3.293a1 1 0 01-1.414 1.414L10 11.414l-3.293 3.293a1 1 0 01-1.414-1.414L8.586 10 5.293 6.707a1 1 0 010-1.414z" />
            </svg>
          </button>
        </header>

        {/* Tab strip — fixed, never scrolls. References was a footer
            before round-4; now it's a real tab so the body can claim
            all remaining vertical space. */}
        <div
          className="flex shrink-0 items-end gap-1 border-b border-gray-200 px-6"
          role="tablist"
        >
          <ModalTabButton
            active={tab === 'description'}
            onClick={() => setTab('description')}
            label={t('library.tabs.description')}
          />
          <ModalTabButton
            active={tab === 'examples'}
            onClick={() => setTab('examples')}
            label={t('library.tabs.relatedCases')}
            count={pattern.examples.length}
          />
          <ModalTabButton
            active={tab === 'references'}
            onClick={() => setTab('references')}
            label={t('library.references')}
            count={referenceCount}
          />
        </div>

        {/* Body — the ONLY scrollable region. flex-1 fills whatever
            space the fixed header + tab strip leave behind. */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {tab === 'description' && (
            <DescriptionTab detail={detail} loading={loading} lang={lang} />
          )}
          {tab === 'examples' && (
            <ExamplesTab
              detail={detail}
              loading={loading}
              lang={lang}
              pattern={pattern}
              onExampleClick={onExampleClick}
            />
          )}
          {tab === 'references' && (
            <ReferencesTab pattern={pattern} lang={lang} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── tabs ─────────────────────────────────────────────────────────────

function ModalTabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${
        active
          ? 'border-violet-600 text-violet-700'
          : 'border-transparent text-gray-500 hover:text-gray-800'
      }`}
    >
      {label}
      {typeof count === 'number' && (
        <span
          className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${
            active ? 'bg-violet-50 text-violet-700' : 'bg-gray-50 text-gray-500'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function DescriptionTab({
  detail,
  loading,
  lang,
}: {
  detail: BusinessModelPatternDetail | null;
  loading: boolean;
  lang: Lang;
}) {
  const { t } = useTranslation();
  if (loading) return <p className="text-sm text-gray-400">{t('home.loading')}…</p>;
  if (!detail) return null;
  const md = detail.description[lang] || detail.description.en;
  if (!md || md.trim().length === 0) {
    return <p className="text-sm text-gray-400">{t('library.descriptionEmpty')}</p>;
  }
  return (
    <article
      className="prose prose-sm max-w-none
                 prose-headings:font-semibold prose-headings:text-gray-900
                 prose-h1:text-xl prose-h1:mt-0 prose-h1:mb-4
                 prose-h2:text-base prose-h2:mt-6 prose-h2:mb-2
                 prose-h3:text-sm prose-h3:mt-4 prose-h3:mb-2
                 prose-p:my-3 prose-p:leading-relaxed prose-p:text-gray-700
                 prose-li:my-1 prose-li:text-gray-700
                 prose-strong:text-gray-900 prose-strong:font-semibold
                 prose-blockquote:border-l-2 prose-blockquote:border-violet-300
                 prose-blockquote:bg-violet-50/40 prose-blockquote:rounded-r
                 prose-blockquote:py-1 prose-blockquote:px-3
                 prose-blockquote:not-italic prose-blockquote:text-gray-700
                 prose-a:text-violet-700 prose-a:no-underline hover:prose-a:underline
                 prose-code:bg-gray-100 prose-code:rounded prose-code:px-1
                 prose-code:py-0.5 prose-code:text-[12px]
                 prose-code:before:content-none prose-code:after:content-none"
    >
      <ReactMarkdown>{md}</ReactMarkdown>
    </article>
  );
}

/**
 * Related-cases tab body. Two layouts:
 *
 *   - **Subtype-grouped** — when `pattern.subtypes` is non-empty.
 *     Renders one section per subtype with a small header carrying the
 *     subtype's localized name + summary, then the example mini-cards
 *     for that subtype only. This is the 2026-06-15 round-4 layout for
 *     patterns like Free that ship with structurally distinct flavors.
 *   - **Flat** — when `pattern.subtypes` is absent. Renders the
 *     hydrated `exampleCases[]` as a flat list, same as before round 4.
 */
function ExamplesTab({
  detail,
  loading,
  lang,
  pattern,
  onExampleClick,
}: {
  detail: BusinessModelPatternDetail | null;
  loading: boolean;
  lang: Lang;
  pattern: BusinessModelPattern;
  onExampleClick: (slug: string) => void;
}) {
  const { t } = useTranslation();
  if (loading) return <p className="text-sm text-gray-400">{t('home.loading')}…</p>;
  if (!detail) return null;
  if (detail.exampleCases.length === 0) {
    return <p className="text-sm text-gray-400">{t('library.examplesEmpty')}</p>;
  }

  // Build a slug → CaseLibraryEntry lookup so we can hydrate per-subtype
  // examples without an extra round trip. exampleCases already contains
  // every case the pattern references (union across subtypes).
  const bySlug = new Map(detail.exampleCases.map((c) => [c.slug, c]));

  if (pattern.subtypes && pattern.subtypes.length > 0) {
    return (
      <div className="space-y-6">
        {pattern.subtypes.map((sub) => {
          const cases = sub.examples
            .map((ex) => bySlug.get(ex.slug))
            .filter((c): c is CaseLibraryEntry => !!c);
          if (cases.length === 0) return null;
          return (
            <SubtypeGroup
              key={sub.id}
              subtype={sub}
              cases={cases}
              examples={sub.examples}
              lang={lang}
              onExampleClick={onExampleClick}
            />
          );
        })}
      </div>
    );
  }

  return (
    <CaseList
      cases={detail.exampleCases}
      examples={pattern.examples}
      lang={lang}
      onExampleClick={onExampleClick}
    />
  );
}

function SubtypeGroup({
  subtype,
  cases,
  examples,
  lang,
  onExampleClick,
}: {
  subtype: PatternSubtype;
  cases: CaseLibraryEntry[];
  examples: CaseExampleRef[];
  lang: Lang;
  onExampleClick: (slug: string) => void;
}) {
  const name = subtype.name[lang] ?? subtype.name.en;
  const summary = subtype.summary[lang] ?? subtype.summary.en;
  return (
    <section>
      <div className="mb-3 border-l-2 border-violet-300 pl-3">
        <h3 className="text-sm font-semibold text-gray-900">{name}</h3>
        {summary && (
          <p className="mt-1 text-[12px] leading-relaxed text-gray-500">{summary}</p>
        )}
      </div>
      <CaseList
        cases={cases}
        examples={examples}
        lang={lang}
        onExampleClick={onExampleClick}
      />
    </section>
  );
}

function CaseList({
  cases,
  examples,
  lang,
  onExampleClick,
}: {
  cases: CaseLibraryEntry[];
  examples: CaseExampleRef[];
  lang: Lang;
  onExampleClick: (slug: string) => void;
}) {
  const { t } = useTranslation();
  // Build slug → role lookup so we can render the secondary badge.
  const roleBySlug = new Map(examples.map((e) => [e.slug, e.role]));
  return (
    <ul className="space-y-3">
      {cases.map((c) => (
        <li key={c.slug}>
          <button
            type="button"
            onClick={() => onExampleClick(c.slug)}
            className="flex w-full flex-col items-start rounded-xl border border-gray-200 bg-white p-4 text-left transition hover:border-gray-300 hover:shadow-sm"
          >
            <div className="flex w-full items-start justify-between gap-3">
              <h3 className="min-w-0 flex-1 text-sm font-semibold text-gray-900">
                {c.companyName[lang] ?? c.companyName.en}
                {roleBySlug.get(c.slug) === 'secondary' && (
                  <span className="ml-2 text-[10px] font-normal text-gray-400">
                    (secondary)
                  </span>
                )}
              </h3>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${kindChipColor(
                  c.kind,
                )}`}
              >
                {t(`library.kind.${c.kind}`)}
              </span>
            </div>
            <p className="mt-2 line-clamp-3 text-[12px] leading-relaxed text-gray-500">
              {c.summary[lang] ?? c.summary.en}
            </p>
            {c.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {c.tags.slice(0, 5).map((tag) => (
                  <span
                    key={tag}
                    className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}

function kindChipColor(kind: CaseLibraryEntry['kind']): string {
  switch (kind) {
    case 'company':
      return 'bg-emerald-50 text-emerald-700';
    case 'industry':
      return 'bg-amber-50 text-amber-700';
    case 'comparison':
      return 'bg-sky-50 text-sky-700';
  }
}

// ─── references tab ──────────────────────────────────────────────────

/** Group order in the rendered references — books first since they
 *  tend to be the canonical / heaviest reference. */
const REFERENCE_TYPE_ORDER: PatternReferenceType[] = ['book', 'paper', 'article', 'web'];

const REFERENCE_TYPE_ICON: Record<PatternReferenceType, string> = {
  book: '📕',
  paper: '📄',
  article: '📰',
  web: '🌐',
};

/**
 * References tab body. Was a fixed footer before the 2026-06-15 round-4
 * redesign; promoted to its own tab so the modal could adopt a fixed
 * height without being stretched by long bibliographies.
 *
 * Two layouts:
 *
 *   - **Annotated mode** — `pattern.references` is non-empty. Group by
 *     type with icon headers; show cite handle, label · year · pages,
 *     permalink chevron, and the bilingual ~30-word note.
 *   - **Legacy flat mode** — only `pattern.sources` is present. Renders
 *     the same plain bullet list as before. Lets us add `references`
 *     to patterns one at a time without flag days.
 */
function ReferencesTab({
  pattern,
  lang,
}: {
  pattern: BusinessModelPattern;
  lang: Lang;
}) {
  const { t } = useTranslation();
  const refs = pattern.references ?? [];

  if (refs.length > 0) {
    // Group by type, preserve insertion order within each group, sort
    // groups by `REFERENCE_TYPE_ORDER`.
    const grouped = new Map<PatternReferenceType, PatternReference[]>();
    for (const r of refs) {
      const arr = grouped.get(r.type) ?? [];
      arr.push(r);
      grouped.set(r.type, arr);
    }
    return (
      <div className="space-y-5">
        {REFERENCE_TYPE_ORDER.filter((type) => grouped.has(type)).map((type) => (
          <ReferenceGroup
            key={type}
            type={type}
            entries={grouped.get(type)!}
            lang={lang}
          />
        ))}
      </div>
    );
  }

  if (pattern.sources.length === 0) {
    return <p className="text-sm text-gray-400">{t('library.descriptionEmpty')}</p>;
  }
  return (
    <ul className="space-y-1.5 text-xs text-gray-600">
      {pattern.sources.map((s, i) => (
        <li key={i}>
          {s.url ? (
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-700 hover:underline"
            >
              {s.label}
            </a>
          ) : (
            s.label
          )}
        </li>
      ))}
    </ul>
  );
}

function ReferenceGroup({
  type,
  entries,
  lang,
}: {
  type: PatternReferenceType;
  entries: PatternReference[];
  lang: Lang;
}) {
  const { t } = useTranslation();
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
        <span aria-hidden>{REFERENCE_TYPE_ICON[type]}</span>
        <span>{t(`library.referenceTypes.${type}`)}</span>
      </div>
      <ul className="space-y-2.5">
        {entries.map((r, i) => (
          <ReferenceItem key={`${r.cite}-${i}`} entry={r} lang={lang} />
        ))}
      </ul>
    </div>
  );
}

function ReferenceItem({ entry, lang }: { entry: PatternReference; lang: Lang }) {
  const note = entry.note?.[lang] || entry.note?.en;
  // Build the meta line: label · year · pages, with a permalink at the end.
  const meta: string[] = [];
  if (typeof entry.year === 'number') meta.push(String(entry.year));
  if (entry.pages) meta.push(entry.pages);
  return (
    <li className="text-xs text-gray-700">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="rounded bg-violet-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-violet-700">
          {entry.cite}
        </span>
        <span className="font-medium text-gray-800">{entry.label}</span>
        {meta.length > 0 && (
          <span className="text-gray-500">· {meta.join(' · ')}</span>
        )}
        {entry.url && (
          <a
            href={entry.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-700 hover:underline"
            aria-label={entry.label}
          >
            ↗
          </a>
        )}
      </div>
      {note && (
        <p className="mt-1 pl-3 text-[11px] italic leading-relaxed text-gray-500">
          ↳ {note}
        </p>
      )}
    </li>
  );
}
