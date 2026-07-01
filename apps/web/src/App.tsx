import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthSession } from './identity/useIdentity';
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
const LoginPage = lazy(() =>
  import('./pages/LoginPage').then((module) => ({ default: module.LoginPage })),
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
  const location = useLocation();
  const { identity, user, authenticated, signOut } = useAuthSession();
  const isDesktop = typeof window !== 'undefined' && 'electronAPI' in window;
  const loginPath = `/login?returnTo=${encodeURIComponent(currentReturnTo(location.pathname, location.search))}`;

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
          <div className="hidden items-center gap-1 text-xs font-medium text-gray-600 sm:flex">
            <Link className="rounded-full px-2 py-1 hover:bg-gray-100 hover:text-gray-900" to="/library">
              {t('nav.library')}
            </Link>
            <Link className="rounded-full px-2 py-1 hover:bg-gray-100 hover:text-gray-900" to="/projects?scope=personal">
              {t('nav.personalProjects')}
            </Link>
            <Link className="rounded-full px-2 py-1 hover:bg-gray-100 hover:text-gray-900" to="/projects?scope=team">
              {t('nav.teamProjects')}
            </Link>
          </div>
          <LanguageSwitcher />
          {authenticated && identity ? (
            <div className="flex items-center gap-2">
              <span
                title={t('identity.signedInAs', { name: identity.displayName })}
                className="flex items-center gap-2 rounded-full px-2 py-1 text-xs text-gray-600"
              >
                {identity.avatarUrl ? (
                  <img
                    src={identity.avatarUrl}
                    alt=""
                    className="h-5 w-5 rounded-full object-cover"
                  />
                ) : (
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: identity.color }}
                  />
                )}
                <span className="hidden max-w-24 truncate sm:inline">
                  {user?.provider === 'local' ? t('identity.localModeBadge') : identity.displayName}
                </span>
                {user?.provider === 'local' && (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                    {t('identity.localOnlyBadge')}
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => void signOut()}
                className="rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
              >
                {t('identity.signOut')}
              </button>
            </div>
          ) : (
            <Link
              to={loginPath}
              className="rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
            >
              {t('identity.signIn')}
            </Link>
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
              <Route path="/login" element={<LoginPage />} />
              <Route path="/auth/wechat/start" element={<LoginPage />} />
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

      <LightboxRoot />
    </div>
  );
}

function currentReturnTo(pathname: string, search: string): string {
  if (pathname.startsWith('/auth/') || pathname.startsWith('/login')) return '/';
  return `${pathname}${search}`;
}
