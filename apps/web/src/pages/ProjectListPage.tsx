import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { CanvasMeta, Lang, Project } from '@canvas-collab/shared';
import { api, type CanvasDefSummary } from '../api/client';
import { projectsApi } from '../api/projects';
import { useIdentity } from '../identity/useIdentity';
import { MenuButton } from '../ui/MenuButton';
import { TypeToConfirmDialog } from '../ui/TypeToConfirmDialog';
import { CanvasThumb } from '../canvas/CanvasThumb';

interface ProjectWithCanvases extends Project {
  canvases: CanvasMeta[];
}

/**
 * Home page. Two sections:
 *   1. Canvas templates gallery — shows every canvas type the server
 *      ships with, click to start a new project pre-loaded with that
 *      canvas (NewProjectPage reads ?withCanvas=<defId>).
 *   2. Projects list — richer cards that preview the canvases inside
 *      each project so a glance differentiates them once the list
 *      grows past a handful.
 */
export function ProjectListPage() {
  const { t, i18n } = useTranslation();
  const { identity } = useIdentity();
  const navigate = useNavigate();
  const [items, setItems] = useState<ProjectWithCanvases[] | null>(null);
  const [defs, setDefs] = useState<CanvasDefSummary[] | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ProjectWithCanvases | null>(null);

  async function load() {
    if (!identity) return;
    const [projects, all, allDefs] = await Promise.all([
      projectsApi.list(identity.displayName),
      api.listCanvases(identity.displayName),
      api.listDefs(),
    ]);
    // Group canvases by project so each card can render its own
    // thumbnail strip.
    const byProject = new Map<string, CanvasMeta[]>();
    for (const c of all) {
      const arr = byProject.get(c.projectId) ?? [];
      arr.push(c);
      byProject.set(c.projectId, arr);
    }
    // Newest-updated canvas first inside each project so the most
    // active one shows up at the front of the strip.
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
  const dateFmt = new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  async function handleDelete(p: ProjectWithCanvases) {
    if (!identity) return;
    await projectsApi.delete(p.id, identity.displayName);
    setPendingDelete(null);
    void load();
  }

  return (
    <main className="mx-auto max-w-5xl px-8 py-10">
      {/* ─── Canvas templates gallery ─── */}
      <section>
        <h2 className="text-xl font-semibold tracking-tight text-gray-900">
          {t('home.templates')}
        </h2>
        <p className="mt-1 text-sm text-gray-500">{t('home.templatesHint')}</p>

        {defs === null ? (
          <p className="mt-6 text-sm text-gray-400">…</p>
        ) : (
          <ul className="mt-5 flex flex-wrap gap-4">
            {defs.map((d) => (
              <li key={d.id} className="w-[200px]">
                <button
                  type="button"
                  onClick={() => navigate(`/p/new?withCanvas=${encodeURIComponent(d.id)}`)}
                  className="group block w-full rounded-xl border border-gray-200 bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-gray-300 hover:ring-2 hover:ring-gray-100"
                >
                  <div className="flex h-[112px] items-center justify-center rounded-lg bg-gray-50 group-hover:bg-white">
                    <CanvasThumb id={d.id} width={160} height={96} />
                  </div>
                  <div className="mt-3 truncate text-sm font-semibold text-gray-900">
                    {t(`templates.${d.id}.name`, d.name[lang])}
                  </div>
                  <div className="mt-0.5 line-clamp-2 text-xs text-gray-500">
                    {t(`templates.${d.id}.tagline`, '')}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ─── Projects list ─── */}
      <section className="mt-12">
        <header className="flex items-end justify-between">
          <h2 className="text-xl font-semibold tracking-tight text-gray-900">
            {t('home.title')}
          </h2>
          <Link
            to="/p/new"
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
          >
            {t('home.newProject')}
          </Link>
        </header>

        {items === null ? (
          <p className="mt-8 text-sm text-gray-400">…</p>
        ) : items.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-gray-300 px-6 py-10 text-center text-sm text-gray-500">
            {t('home.empty')}
          </div>
        ) : (
          <ul className="mt-6 grid gap-4 md:grid-cols-2">
            {items.map((p) => (
              <li
                key={p.id}
                className="group cursor-pointer rounded-xl border border-gray-200 bg-white p-4 transition hover:border-gray-400"
                onClick={() => navigate(`/p/${p.id}`)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-base font-semibold text-gray-900">{p.name}</div>
                    {p.description && (
                      <div className="mt-1 line-clamp-2 text-sm text-gray-600">
                        {p.description}
                      </div>
                    )}
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <MenuButton
                      align="right"
                      items={[
                        {
                          label: t('confirm.delete'),
                          danger: true,
                          onClick: () => setPendingDelete(p),
                        },
                      ]}
                    />
                  </div>
                </div>

                {/* Mini canvas strip — surfaces the project's contents
                    so a project list of 10+ stays scannable. */}
                <ProjectCanvasStrip canvases={p.canvases} />

                <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
                  <span>{t('home.canvasCount', { count: p.canvases.length })}</span>
                  <span>·</span>
                  <span>
                    {t('home.updated', { time: dateFmt.format(new Date(p.updatedAt)) })}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <TypeToConfirmDialog
        open={!!pendingDelete}
        title={t('confirm.deleteProject')}
        message={t('confirm.deleteProjectMsg', {
          count: pendingDelete?.canvases.length ?? 0,
        })}
        expected={pendingDelete?.name ?? ''}
        confirmLabel={t('confirm.delete')}
        cancelLabel={t('confirm.cancel')}
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (pendingDelete) await handleDelete(pendingDelete);
        }}
      />
    </main>
  );
}

const STRIP_LIMIT = 6;

/** Horizontal stack of mini canvas thumbnails for one project card. */
function ProjectCanvasStrip({ canvases }: { canvases: CanvasMeta[] }) {
  const { t } = useTranslation();
  if (canvases.length === 0) {
    return (
      <div className="mt-3 inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-[11px] text-gray-400">
        {t('home.noCanvasesYet')}
      </div>
    );
  }
  const shown = canvases.slice(0, STRIP_LIMIT);
  const overflow = canvases.length - shown.length;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      {shown.map((c) => (
        <span
          key={c.id}
          title={c.title}
          className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white p-1"
        >
          <CanvasThumb id={c.defId} width={32} height={22} />
        </span>
      ))}
      {overflow > 0 && (
        <span className="text-[11px] text-gray-500">+{overflow}</span>
      )}
    </div>
  );
}
