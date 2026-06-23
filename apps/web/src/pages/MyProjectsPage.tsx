import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { CanvasMeta } from '@pingarden/shared';
import { api } from '../api/client';
import { projectsApi } from '../api/projects';
import { useIdentity } from '../identity/useIdentity';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { ProjectCard } from '../components/ProjectCard';
import type { ProjectWithCanvases } from '../components/ProjectPicker';
import { BackLink } from '../components/BackLink';
import { stateWithFrom } from '../navigation/useSmartBack';

/**
 * Browse page for the user's projects. Lives at `/projects`. Was once
 * the bottom half of `/library`, but split out in 2026-06 so the
 * library page stays purely about curated cases.
 *
 * Only the user's own projects appear here — blank-canvas creations
 * plus forks of library cases (a fork becomes a regular user project).
 * The federated /projects endpoint also returns the read-only library
 * originals (BundleStorage synthesizes them so workspace rendering
 * shares one code path), but those would be a confusing duplicate of
 * /library here, so we filter them out by `source`.
 *
 * Header has a [+ Create blank project] CTA mirroring the one on
 * `/library`. The home page's [My projects] button routes here.
 */
export function MyProjectsPage() {
  const { t } = useTranslation();
  const { identity } = useIdentity();
  const navigate = useNavigate();
  const location = useLocation();

  const [projects, setProjects] = useState<ProjectWithCanvases[] | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ProjectWithCanvases | null>(null);

  async function load() {
    if (!identity) return;
    const [userProjects, allCanvases] = await Promise.all([
      projectsApi.list(identity.displayName),
      api.listCanvases(identity.displayName),
    ]);
    const byProject = new Map<string, CanvasMeta[]>();
    for (const c of allCanvases) {
      const arr = byProject.get(c.projectId) ?? [];
      arr.push(c);
      byProject.set(c.projectId, arr);
    }
    for (const arr of byProject.values()) {
      arr.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }
    setProjects(
      userProjects
        // The federated /projects endpoint returns BOTH user projects
        // AND the read-only library cases (BundleStorage synthesizes
        // them as projects so the workspace can render them through
        // the same code path). On *this* page we only want what the
        // user actually owns — their blank-canvas creations and any
        // forks they made from the library. Library originals belong
        // on /library, not here, so filter them out by source.
        .filter((p) => p.source !== 'library')
        .map((p) => ({ ...p, canvases: byProject.get(p.id) ?? [] })),
    );
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity]);

  if (!identity) return null;

  async function handleDelete(p: ProjectWithCanvases) {
    if (!identity) return;
    await projectsApi.delete(p.id, identity.displayName);
    setPendingDelete(null);
    void load();
  }

  // ProjectCard differentiates user vs forked-from-library via the
  // `source` chip; we render them all in one grid so the user sees
  // their entire workspace at a glance.
  const allProjects = projects ?? [];

  return (
    <main className="mx-auto max-w-6xl px-8 py-8">
      {/* Page header — back link + title + create CTA on the right */}
      <header className="mb-8 flex items-end justify-between gap-6">
        <div>
          <BackLink
            fallback="/"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900"
          >
            ← {t('nav.back')}
          </BackLink>
          <h1 className="mt-3 text-2xl font-semibold text-gray-900">
            {t('home.myProjects')}
          </h1>
          <p className="mt-1 text-sm text-gray-500">{t('myProjects.pageSubtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/p/new', { state: stateWithFrom(location) })}
          className="shrink-0 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition hover:border-gray-300 hover:bg-gray-50"
        >
          + {t('home.createBlankInstead')}
        </button>
      </header>

      {/* Project grid */}
      {projects === null ? (
        <p className="text-sm text-gray-400">{t('home.loading')}…</p>
      ) : allProjects.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-200 bg-white py-12 text-center text-sm text-gray-400">
          {t('myProjects.empty')}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {allProjects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              onOpen={(proj) => navigate(`/p/${proj.id}`, { state: stateWithFrom(location) })}
              onRequestDelete={(proj) => setPendingDelete(proj)}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation */}
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
    </main>
  );
}
