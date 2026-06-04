import { Routes, Route, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useIdentity } from './identity/useIdentity';
import { IdentityModal } from './identity/IdentityModal';
import { LanguageSwitcher } from './i18n/LanguageSwitcher';
import { ProjectListPage } from './pages/ProjectListPage';
import { NewProjectPage } from './pages/NewProjectPage';
import { ProjectWorkspacePage } from './pages/ProjectWorkspacePage';
import { HistoryPage } from './pages/HistoryPage';

export default function App() {
  const { t } = useTranslation();
  const { identity, save } = useIdentity();

  return (
    <div className="flex h-full flex-col bg-stone-50">
      <nav className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <Link to="/" className="font-semibold">
          {t('app.title')}
        </Link>
        <div className="flex items-center gap-6">
          <LanguageSwitcher />
          {identity && (
            <span className="flex items-center gap-2 text-xs text-gray-600">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: identity.color }}
              />
              {identity.displayName}
            </span>
          )}
        </div>
      </nav>

      <div className="min-h-0 flex-1 overflow-hidden">
        <Routes>
          <Route path="/" element={<ProjectListPage />} />
          <Route path="/p/new" element={<NewProjectPage />} />
          <Route path="/p/:projectId" element={<ProjectWorkspacePage />} />
          <Route
            path="/p/:projectId/c/:canvasId"
            element={<ProjectWorkspacePage />}
          />
          <Route
            path="/p/:projectId/c/:canvasId/history"
            element={<HistoryPage />}
          />
        </Routes>
      </div>

      {!identity && <IdentityModal onSubmit={save} />}
    </div>
  );
}
