import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { CanvasMeta, Lang } from '@pingarden/shared';
import { api, type CanvasDefSummary } from '../api/client';
import { projectsApi } from '../api/projects';
import { useIdentity } from '../identity/useIdentity';
import { CanvasThumb } from '../canvas/CanvasThumb';
import { TemplatePreviewModal } from '../components/TemplatePreviewModal';
import type { ProjectWithCanvases } from '../components/ProjectPicker';
import { stateWithFrom } from '../navigation/useSmartBack';

/**
 * Home page — landing-style layout:
 *   1. Center welcome (icon + poem + title + CTAs)
 *   2. Templates (full-bleed horizontal scroll strip)
 *   3. Footer
 *
 * The primary CTAs route to strategy-project creation, the Strategy Library,
 * and the user's existing projects. Template browsing stays in the visible
 * strip below instead of duplicating a scroll button in the hero.
 */
export function ProjectListPage() {
  const { t, i18n } = useTranslation();
  const { identity } = useIdentity();
  const navigate = useNavigate();
  const location = useLocation();
  const [items, setItems] = useState<ProjectWithCanvases[] | null>(null);
  const [defs, setDefs] = useState<CanvasDefSummary[] | null>(null);
  const [previewDefId, setPreviewDefId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function load() {
    if (!identity) return;
    const [projects, all, allDefs] = await Promise.all([
      projectsApi.list(identity.displayName),
      api.listCanvases(identity.displayName),
      api.listDefs(),
    ]);
    const byProject = new Map<string, CanvasMeta[]>();
    for (const c of all) {
      const arr = byProject.get(c.projectId) ?? [];
      arr.push(c);
      byProject.set(c.projectId, arr);
    }
    for (const arr of byProject.values()) {
      arr.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }
    setItems(
      projects.map((p) => ({ ...p, canvases: byProject.get(p.id) ?? [] })),
    );
    setDefs(allDefs);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity]);

  if (!identity) return null;
  const lang = (i18n.language as Lang) ?? 'en';

  function scrollTemplates(dir: 'left' | 'right') {
    const el = scrollRef.current;
    if (!el) return;
    const amount = dir === 'left' ? -400 : 400;
    el.scrollBy({ left: amount, behavior: 'smooth' });
  }

  return (
    <main className="flex min-h-[calc(100vh-3rem)] flex-col">
      {/* ═══ Center welcome area ═══ */}
      <div className="flex flex-1 items-center justify-center">
        <div className="mx-auto w-full max-w-5xl px-8 py-6">
          <section>
            {items === null ? (
              <div className="py-20 text-center text-sm text-gray-400">
                <p className="animate-pulse">{t('home.loading')}</p>
              </div>
            ) : (
              <CenterState items={items} />
            )}
          </section>
        </div>
      </div>

      {/* ═══ Templates (full-bleed, sits just above footer) ═══ */}
      {defs !== null && defs.length > 0 && (
        <section className="border-t border-gray-100 bg-white py-5">
          <div className="mx-auto max-w-5xl px-8">
            <div className="mb-3 flex items-center justify-center gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-600">
                {t('home.templates')}
              </h2>
              <div className="flex gap-1.5">
                <ScrollArrow dir="left" onClick={() => scrollTemplates('left')} />
                <ScrollArrow dir="right" onClick={() => scrollTemplates('right')} />
              </div>
            </div>
          </div>

          <div className="relative">
            {/* Right-edge fade */}
            <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-20 bg-gradient-to-l from-white to-transparent" />

            <div
              ref={scrollRef}
              className="flex gap-2.5 overflow-x-auto px-8 pb-1 scrollbar-hide"
            >
              {defs.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setPreviewDefId(d.id)}
                  className="group w-[148px] flex-shrink-0 rounded-xl border border-gray-200 bg-white p-2.5 text-left transition hover:border-gray-300 hover:shadow-sm"
                >
                  <div className="flex h-[76px] items-center justify-center rounded-lg bg-gray-50 group-hover:bg-white">
                    <CanvasThumb id={d.id} width={108} height={64} />
                  </div>
                  <div className="mt-2 truncate text-sm font-medium text-gray-900">
                    {d.name[lang]}
                  </div>
                  <div className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-gray-500">
                    {t(`templates.${d.id}.tagline`, '')}
                  </div>
                </button>
              ))}
              <div className="w-8 flex-shrink-0" />
            </div>
          </div>
        </section>
      )}

      {/* ═══ Footer (tight against templates) ═══ */}
      <footer className="border-t border-gray-100 bg-white py-2 text-center text-[11px] text-gray-400">
        <span>{t('footer.madeBy')}</span>
        <span className="mx-2">·</span>
        <a
          href="mailto:sibo.li@foxmail.com"
          className="underline hover:text-gray-600"
        >
          {t('footer.email')}
        </a>
      </footer>

      <div className="mx-auto max-w-5xl px-8">
        <TemplatePreviewModal
          defId={previewDefId}
          lang={lang}
          onClose={() => setPreviewDefId(null)}
        />
      </div>
    </main>
  );
}

/** Split a poem text by punctuation marks so each phrase gets its own line. */
function splitByPunctuation(text: string): string[] {
  const lines = text.split('\n');
  const result: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Attribution line — keep as-is
    if (/^[—"'-]/.test(trimmed)) {
      result.push(trimmed);
      continue;
    }
    // Strip wrapping quotes / book-title marks
    const clean = trimmed
      .replace(/^[""''「『]/, '')
      .replace(/[""''」』]$/, '');
    // Split by common punctuation and trim whitespace
    const parts = clean
      .split(/[，、；：。！？,.;:.!?]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    result.push(...parts);
  }
  return result;
}

/** Center landing state: icon → poem → title → CTAs */
function CenterState({
  items,
}: {
  items: ProjectWithCanvases[];
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const subtitle = t('home.welcomeSubtitle');
  const poemLines = splitByPunctuation(subtitle);
  // `items` is no longer used here — both opening an existing project and
  // browsing the case library are handled on the /library second-level
  // page. We keep the prop for signature compatibility with the loading
  // state hand-off; if a future home-page widget needs the project list
  // again, it's already wired through.
  void items;

  return (
    <div className="flex flex-col items-center">
      {/* Poem card — subtle, sits at the top */}
      <div className="mx-auto max-w-[15rem] rounded-2xl bg-stone-100 px-6 py-4 shadow-sm">
        <div className="text-center font-serif text-xl leading-none text-gray-300">
          &#x201C;
        </div>
        <div className="mt-1.5 space-y-0.5 text-center font-serif text-xs font-semibold italic leading-loose text-gray-500">
          {poemLines.map((line, i) => {
            if (
              line.startsWith('—') ||
              line.startsWith('"—') ||
              line.startsWith('——') ||
              line.startsWith('-')
            ) {
              return (
                <p
                  key={i}
                  className="mt-2 text-[11px] font-normal not-italic tracking-wide text-gray-400"
                >
                  {line}
                </p>
              );
            }
            return <p key={i}>{line}</p>;
          })}
        </div>
      </div>

      {/* Sprout icon */}
      <div className="mx-auto mt-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-900 text-3xl text-white">
        🌱
      </div>

      {/* Title */}
      <h1 className="mt-6 text-4xl font-semibold tracking-tight text-gray-900">
        {t('home.welcomeTitle')}
      </h1>

      {/* One-line intro */}
      <p className="mt-3 max-w-2xl text-center text-base leading-relaxed text-gray-500">
        {t('home.welcomeIntro')}
      </p>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {['businessModel', 'strategy', 'experiments', 'caseLearning'].map((key) => (
          <span
            key={key}
            className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800"
          >
            {t(`home.positioningTags.${key}`)}
          </span>
        ))}
      </div>

      {/* CTA buttons — task-oriented routes from strategy work to learning. */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/p/new', { state: stateWithFrom(location) })}
          className="brand-primary-button rounded-xl px-7 py-3.5 text-base font-semibold transition-all active:scale-[0.98]"
        >
          {t('home.createBlankInstead')}
        </button>
        <button
          type="button"
          onClick={() => navigate('/library')}
          className="rounded-xl border border-gray-200 bg-white px-7 py-3.5 text-base font-semibold text-gray-900 transition-all hover:border-gray-300 hover:bg-gray-50 active:scale-[0.98]"
        >
          {t('home.browseLibrary')}
        </button>
        <button
          type="button"
          onClick={() => navigate('/projects', { state: stateWithFrom(location) })}
          className="rounded-xl border border-gray-200 bg-white px-7 py-3.5 text-base font-semibold text-gray-900 transition-all hover:border-gray-300 hover:bg-gray-50 active:scale-[0.98]"
        >
          {t('home.myProjects')}
        </button>
      </div>
    </div>
  );
}

function ScrollArrow({ dir, onClick }: { dir: 'left' | 'right'; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-white text-sm text-gray-600 hover:border-gray-400 hover:text-gray-900"
      aria-label={dir === 'left' ? 'Scroll left' : 'Scroll right'}
    >
      {dir === 'left' ? '‹' : '›'}
    </button>
  );
}
