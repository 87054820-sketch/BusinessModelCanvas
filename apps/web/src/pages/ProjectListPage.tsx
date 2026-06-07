import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { CanvasMeta, Lang, Project } from '@pingarden/shared';
import { api, type CanvasDefSummary } from '../api/client';
import { projectsApi } from '../api/projects';
import { useIdentity } from '../identity/useIdentity';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { CanvasThumb } from '../canvas/CanvasThumb';
import { TemplatePreviewModal } from '../components/TemplatePreviewModal';
import { ProjectPicker, type ProjectWithCanvases } from '../components/ProjectPicker';

/**
 * Home page — landing-style layout:
 *   1. Center welcome (icon + poem + title + CTAs)
 *   2. Templates (full-bleed horizontal scroll strip)
 *   3. Footer
 */
export function ProjectListPage() {
  const { t, i18n } = useTranslation();
  const { identity } = useIdentity();
  const navigate = useNavigate();
  const [items, setItems] = useState<ProjectWithCanvases[] | null>(null);
  const [defs, setDefs] = useState<CanvasDefSummary[] | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ProjectWithCanvases | null>(null);
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

  async function handleDelete(p: ProjectWithCanvases) {
    if (!identity) return;
    await projectsApi.delete(p.id, identity.displayName);
    setPendingDelete(null);
    void load();
  }

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
              <CenterState
                items={items}
                onSelectProject={(p) => navigate(`/p/${p.id}`)}
                onRequestDelete={(p) => setPendingDelete(p)}
              />
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
        <ConfirmDialog
          open={!!pendingDelete}
          title={t('confirm.deleteProject')}
          message={t('confirm.deleteProjectMsg', {
            name: pendingDelete?.name ?? '',
            count: pendingDelete?.canvases.length ?? 0,
          })}
          confirmLabel={t('confirm.delete')}
          cancelLabel={t('confirm.cancel')}
          danger
          onCancel={() => setPendingDelete(null)}
          onConfirm={async () => {
            if (pendingDelete) await handleDelete(pendingDelete);
          }}
        />

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
  onSelectProject,
  onRequestDelete,
}: {
  items: ProjectWithCanvases[];
  onSelectProject: (p: ProjectWithCanvases) => void;
  onRequestDelete: (p: ProjectWithCanvases) => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const subtitle = t('home.welcomeSubtitle');
  const poemLines = splitByPunctuation(subtitle);
  const hasProjects = items.length > 0;

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
      <p className="mt-3 text-center text-base text-gray-400">
        {t('home.welcomeIntro')}
      </p>

      {/* CTA buttons */}
      <div className="mt-8 flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate('/p/new')}
          className="brand-primary-button rounded-xl px-9 py-3.5 text-base font-semibold transition-all active:scale-[0.98]"
        >
          {t('home.createBlankInstead')}
        </button>
        <ProjectPicker
          projects={items}
          onSelect={onSelectProject}
          onRequestDelete={onRequestDelete}
          disabled={!hasProjects}
        />
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
