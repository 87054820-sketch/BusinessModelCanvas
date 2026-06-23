import { useState } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useIdentity } from './identity/useIdentity';
import { IdentityModal } from './identity/IdentityModal';
import { LanguageSwitcher } from './i18n/LanguageSwitcher';
import { ProjectListPage } from './pages/ProjectListPage';
import { LibraryPage } from './pages/LibraryPage';
import { MyProjectsPage } from './pages/MyProjectsPage';
import { NewProjectPage } from './pages/NewProjectPage';
import { ProjectWorkspacePage } from './pages/ProjectWorkspacePage';
import { HistoryPage } from './pages/HistoryPage';
import { CopilotErrorBoundary } from './components/CopilotErrorBoundary';

export default function App() {
  const { t } = useTranslation();
  const { identity, save } = useIdentity();
  const [editingIdentity, setEditingIdentity] = useState(false);
  const isDesktop = typeof window !== 'undefined' && 'electronAPI' in window;

  const logo = (
    <Link to="/" className="flex items-center gap-2 font-semibold text-gray-900">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-900 text-sm text-white">
        🌱
      </span>
      <span>{t('app.title')}</span>
    </Link>
  );

  return (
    <div className="flex h-full flex-col bg-stone-50">
      <nav
        className={`relative flex h-12 flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 ${
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
        <div className="ml-auto flex items-center gap-6">
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
    </div>
  );
}
