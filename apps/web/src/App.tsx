import { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useIdentity } from './identity/useIdentity';
import { IdentityModal } from './identity/IdentityModal';
import { LanguageSwitcher } from './i18n/LanguageSwitcher';
import { CopilotErrorBoundary } from './components/CopilotErrorBoundary';
import { LightboxRoot } from './components/Lightbox';

const ProjectListPage = lazy(() =>
  import('./pages/ProjectListPage').then((module) => ({ default: module.ProjectListPage })),
);
const LibraryPage = lazy(() =>
  import('./pages/LibraryPage').then((module) => ({ default: module.LibraryPage })),
);
const MyProjectsPage = lazy(() =>
  import('./pages/MyProjectsPage').then((module) => ({ default: module.MyProjectsPage })),
);
const NewProjectPage = lazy(() =>
  import('./pages/NewProjectPage').then((module) => ({ default: module.NewProjectPage })),
);
const ProjectWorkspacePage = lazy(() =>
  import('./pages/ProjectWorkspacePage').then((module) => ({ default: module.ProjectWorkspacePage })),
);
const HistoryPage = lazy(() =>
  import('./pages/HistoryPage').then((module) => ({ default: module.HistoryPage })),
);

export default function App() {
  const { t } = useTranslation();
  const { identity, save } = useIdentity();
  const [editingIdentity, setEditingIdentity] = useState(false);
  const isDesktop = typeof window !== 'undefined' && 'electronAPI' in window;

  useEffect(() => {
    const onPreloadError = (event: Event) => {
      event.preventDefault();
      window.location.reload();
    };
    window.addEventListener('vite:preloadError', onPreloadError);
    return () => window.removeEventListener('vite:preloadError', onPreloadError);
  }, []);

  const logo = (
    <Link to="/" className="flex min-w-0 items-center gap-2 font-semibold text-gray-900">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-900 text-sm text-white">
        🌱
      </span>
      <span className="truncate">{t('app.title')}</span>
    </Link>
  );

  return (
    <div className="flex h-full flex-col bg-stone-50">
      <nav
        className={`relative flex h-12 flex-shrink-0 items-center justify-between gap-2 border-b border-gray-200 bg-white px-3 sm:px-6 ${
          isDesktop ? 'app-drag-region pl-20' : ''
        }`}
      >
        {isDesktop ? (
          <div className="pointer-events-auto absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            {logo}
          </div>
        ) : (
          logo
        )}
        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-6">
          <LanguageSwitcher />
          {identity && (
            <button
              type="button"
              onClick={() => setEditingIdentity(true)}
              title={t('identity.editTitle')}
              className="flex items-center gap-2 rounded-full px-2 py-1 text-xs text-gray-600 transition hover:bg-gray-100"
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: identity.color }}
              />
              {identity.displayName}
            </button>
          )}
        </div>
      </nav>

      <div className="min-h-0 flex-1 overflow-auto">
        <CopilotErrorBoundary label="Route crashed — see stack below">
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                {t('home.loading')}
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<ProjectListPage />} />
              <Route path="/library" element={<LibraryPage />} />
              <Route path="/projects" element={<MyProjectsPage />} />
              <Route path="/p/new" element={<NewProjectPage />} />
              <Route path="/p/:projectId" element={<ProjectWorkspacePage />} />
              <Route
                path="/p/:projectId/c/:canvasId"
                element={<ProjectWorkspacePage />}
              />
              <Route
                path="/p/:projectId/s/:storyId"
                element={<ProjectWorkspacePage />}
              />
              <Route
                path="/p/:projectId/c/:canvasId/history"
                element={<HistoryPage />}
              />
            </Routes>
          </Suspense>
        </CopilotErrorBoundary>
      </div>

      {/*
       * IdentityModal renders in two modes:
       *  - First-launch (no identity): blocking, no cancel.
       *  - Edit (badge clicked): pre-filled, dismissible via ✕.
       */}
      {!identity && <IdentityModal onSubmit={save} />}
      {identity && editingIdentity && (
        <IdentityModal
          initialName={identity.displayName}
          onSubmit={(next) => {
            save(next);
            setEditingIdentity(false);
          }}
          onCancel={() => setEditingIdentity(false)}
        />
      )}
      <LightboxRoot />
    </div>
  );
}
