import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Lang } from '@pingarden/shared';
import { api, type CanvasDefSummary } from '../api/client';
import { projectsApi } from '../api/projects';
import { useIdentity } from '../identity/useIdentity';

export function NewProjectPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { identity } = useIdentity();
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

  if (!identity) return null;

  // Localised name for the pre-selected canvas. Canvas names are owned by
  // each bundle's manifest so template cards, modals and creation flows stay consistent.
  const withCanvasName = withCanvas ? withCanvas.name[lang] : null;

  // Use an explicit click handler instead of <form onSubmit> — bypasses any
  // browser/IME edge cases where form submission doesn't fire after Chinese
  // input composition. Also catches errors and surfaces them inline so the
  // user sees what went wrong.
  async function handleCreate() {
    if (!name.trim() || !identity || busy) return;
    setError(null);
    setBusy(true);
    try {
      const p = await projectsApi.create(
        { name: name.trim(), description: description.trim() || undefined },
        identity.displayName,
      );
      // Best-effort: if the user landed here from the canvas gallery,
      // also create that canvas inside the new project so they drop
      // straight into the workspace one step ahead. A failure here
      // doesn't roll the project back — they'd just need to add a
      // canvas via the sidebar.
      if (withCanvas && withCanvasName) {
        try {
          await api.createCanvas(
            {
              projectId: p.id,
              defId: withCanvas.id,
              title: withCanvasName,
              language: lang,
            },
            identity.displayName,
          );
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('Pre-selected canvas create failed:', err);
        }
      }
      navigate(`/p/${p.id}`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Create project failed:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    // Cmd/Ctrl + Enter submits — but only when not in an active IME composition.
    // (e.nativeEvent.isComposing is true while the IME hasn't committed yet.)
    if (
      (e.metaKey || e.ctrlKey) &&
      e.key === 'Enter' &&
      !(e.nativeEvent as KeyboardEvent).isComposing
    ) {
      e.preventDefault();
      void handleCreate();
    }
  }

  return (
    <main className="mx-auto max-w-xl px-8 py-12">
      <Link to="/" className="text-sm text-gray-600 hover:text-gray-900">
        ← {t('nav.back')}
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">{t('newProject.title')}</h1>

      {withCanvasName && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t('newProject.withCanvas', { canvas: withCanvasName })}
        </div>
      )}

      <div className="mt-8 space-y-5">
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

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Link
            to="/"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
          >
            {t('newProject.cancel')}
          </Link>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!name.trim() || busy}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-40"
          >
            {busy ? '…' : t('newProject.submit')}
          </button>
        </div>
      </div>
    </main>
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
