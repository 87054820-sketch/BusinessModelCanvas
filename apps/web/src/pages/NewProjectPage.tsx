import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Lang, Project } from '@pingarden/shared';
import { api, type CanvasDefSummary } from '../api/client';
import { libraryApi } from '../api/library';
import { projectsApi } from '../api/projects';
import { useAuthSession } from '../identity/useIdentity';
import { buildSeedPayload } from '../lib/seedExperimentStickies';
import { BackLink } from '../components/BackLink';
import { LoginDialog } from '../identity/IdentityModal';
import { preserveNavigationState } from '../navigation/useSmartBack';

type Mode = 'newProject' | 'existingProject';

export function NewProjectPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { identity, authenticated, signInWithWeChat } = useAuthSession();
  const displayName = identity?.displayName ?? '';
  const [params] = useSearchParams();

  const lang = useMemo<Lang>(() => (i18n.language as Lang) ?? 'en', [i18n.language]);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If the home gallery sent us here with a pre-selected canvas, look it
  // up so we can show the localised name in the hint banner and create
  // the canvas after the project. We trust the query string only after
  // verifying it matches a real canvas-def id loaded by the server.
  const withCanvasId = params.get('withCanvas');
  // Optional: when entering from `library/experiments` "Use this
  // experiment" CTA, the URL also carries `?seedExperiment=<slug>`. We
  // honour it only when `withCanvas === 'experiment-canvas'` (see the
  // seeding block below).
  const seedExperimentSlug = params.get('seedExperiment');
  const [withCanvas, setWithCanvas] = useState<CanvasDefSummary | null>(null);
  useEffect(() => {
    if (!withCanvasId) {
      setWithCanvas(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const defs = await api.listDefs();
        if (cancelled) return;
        const match = defs.find((d) => d.id === withCanvasId);
        setWithCanvas(match ?? null);
      } catch {
        if (!cancelled) setWithCanvas(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [withCanvasId]);

  // Mode toggle: only available when adding a SPECIFIC canvas
  // (`?withCanvas=...`). Without that, "add to existing project" has
  // nothing to add — the user just wants a blank project.
  const canPickExisting = !!withCanvasId;
  const [mode, setMode] = useState<Mode>('newProject');

  // User projects for the existing-project dropdown. Only fetched when
  // the user actually has a withCanvas reason to need it. Filtered to
  // exclude library cases (read-only, can't host a new canvas).
  const [userProjects, setUserProjects] = useState<Project[] | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  useEffect(() => {
    if (!canPickExisting || !authenticated) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await projectsApi.list(displayName);
        if (cancelled) return;
        setUserProjects(list.filter((p) => p.capabilities?.canEdit ?? (!p.source || p.source === 'user')));
      } catch (err) {
        if (cancelled) return;
        // eslint-disable-next-line no-console
        console.warn('Project list fetch failed:', err);
        setUserProjects([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canPickExisting, authenticated, displayName]);

  if (!authenticated) {
    return (
      <LoginDialog
        onSignIn={() => signInWithWeChat()}
        onCancel={() => navigate('/library', { state: preserveNavigationState(location) })}
      />
    );
  }

  // Localised name for the pre-selected canvas. Canvas names are owned by
  // each bundle's manifest so template cards, modals and creation flows stay consistent.
  const withCanvasName = withCanvas ? withCanvas.name[lang] : null;
  const hasUserProjects = (userProjects?.length ?? 0) > 0;

  // Determine whether the primary action button is enabled.
  const canSubmit =
    !busy &&
    (mode === 'newProject'
      ? !!name.trim()
      : selectedProjectId !== '');

  /**
   * Seed the new canvas with the experiment's template if applicable.
   * Wrapped in try/catch so failures leave the user on a usable canvas.
   */
  async function maybeSeedExperiment(canvasId: string) {
    if (!seedExperimentSlug || withCanvas?.id !== 'experiment-canvas') return;
    try {
      const detail = await libraryApi.getExperiment(seedExperimentSlug);
      const stickies = buildSeedPayload(detail, lang);
      await api.bulkStickies(canvasId, stickies, displayName);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Experiment seeding failed:', err);
    }
  }

  // New-project branch: create project → create canvas (if withCanvas) →
  // seed (if seedExperiment) → navigate.
  async function handleCreateNew() {
    if (!name.trim() || !authenticated || busy) return;
    setError(null);
    setBusy(true);
    try {
      const p = await projectsApi.create(
        { name: name.trim(), description: description.trim() || undefined },
        displayName,
      );
      if (withCanvas && withCanvasName) {
        try {
          const newCanvas = await api.createCanvas(
            {
              projectId: p.id,
              defId: withCanvas.id,
              title: withCanvasName,
              language: lang,
            },
            displayName,
          );
          await maybeSeedExperiment(newCanvas.id);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('Pre-selected canvas create failed:', err);
        }
      }
      navigate(`/p/${p.id}`, { state: preserveNavigationState(location) });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Create project failed:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  // Existing-project branch: just create the canvas in the chosen
  // project + seed + navigate. Skip project creation entirely.
  async function handleAddToExisting() {
    if (!selectedProjectId || !authenticated || busy || !withCanvas || !withCanvasName) return;
    setError(null);
    setBusy(true);
    try {
      const newCanvas = await api.createCanvas(
        {
          projectId: selectedProjectId,
          defId: withCanvas.id,
          title: withCanvasName,
          language: lang,
        },
        displayName,
      );
      await maybeSeedExperiment(newCanvas.id);
      navigate(`/p/${selectedProjectId}`, { state: preserveNavigationState(location) });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Add canvas to existing project failed:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit() {
    if (mode === 'newProject') void handleCreateNew();
    else void handleAddToExisting();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (
      (e.metaKey || e.ctrlKey) &&
      e.key === 'Enter' &&
      !(e.nativeEvent as KeyboardEvent).isComposing
    ) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <main className="mx-auto max-w-xl px-8 py-12">
      <BackLink fallback="/" className="text-sm text-gray-600 hover:text-gray-900">
        ← {t('nav.back')}
      </BackLink>
      <h1 className="mt-4 text-2xl font-semibold">{t('newProject.title')}</h1>

      {withCanvasName && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t('newProject.withCanvas', { canvas: withCanvasName })}
        </div>
      )}

      {/* Mode toggle — only when the URL carries a specific canvas to
          add. Without it, "add to existing project" is meaningless. */}
      {canPickExisting && (
        <div className="mt-6 grid grid-cols-2 gap-2">
          <ModeButton
            active={mode === 'newProject'}
            label={t('library.experiments.picker.modeNew')}
            hint={t('library.experiments.picker.modeNewHint')}
            onClick={() => setMode('newProject')}
          />
          <ModeButton
            active={mode === 'existingProject'}
            disabled={!hasUserProjects}
            label={t('library.experiments.picker.modeExisting')}
            hint={
              hasUserProjects
                ? t('library.experiments.picker.modeExistingHint')
                : t('library.experiments.picker.noProjects')
            }
            onClick={() => setMode('existingProject')}
          />
        </div>
      )}

      <div className="mt-6 space-y-5">
        {mode === 'newProject' ? (
          <>
            <Field label={t('newProject.name')}>
              <input
                autoFocus
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-gray-900 focus:outline-none"
                placeholder={t('newProject.namePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={200}
              />
            </Field>
            <Field label={t('newProject.description')}>
              <textarea
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-gray-900 focus:outline-none"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={2000}
                rows={4}
              />
            </Field>
          </>
        ) : (
          <Field label={t('library.experiments.picker.modeExisting')}>
            <select
              autoFocus
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-gray-900 focus:outline-none"
            >
              <option value="" disabled>
                {t('library.experiments.picker.selectPlaceholder')}
              </option>
              {(userProjects ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <BackLink
            fallback="/"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
          >
            {t('newProject.cancel')}
          </BackLink>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-40"
          >
            {busy
              ? '…'
              : mode === 'newProject'
                ? t('newProject.submit')
                : t('library.experiments.picker.confirm')}
          </button>
        </div>
      </div>
    </main>
  );
}

function ModeButton({
  active,
  disabled = false,
  label,
  hint,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-xl border px-4 py-3 text-left transition ${
        disabled
          ? 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-60'
          : active
            ? 'border-violet-300 bg-violet-50/50'
            : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div className="text-sm font-medium text-gray-900">{label}</div>
      <div className="mt-0.5 text-[12px] leading-relaxed text-gray-500">{hint}</div>
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}
