import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authApi } from '../api/auth';
import { useAuthSession } from '../identity/useIdentity';

type WeChatStatus = 'loading' | 'ready' | 'missing' | 'error';

export function LoginPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { authenticated, identity, signInLocal, signInWithWeChat } = useAuthSession();
  const [status, setStatus] = useState<WeChatStatus>('loading');
  const [localBusy, setLocalBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const returnTo = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return normalizeReturnTo(params.get('returnTo'));
  }, [location.search]);

  useEffect(() => {
    let cancelled = false;
    authApi.wechatStatus()
      .then((next) => {
        if (cancelled) return;
        setStatus(next.configured ? 'ready' : 'missing');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (authenticated) navigate(returnTo, { replace: true });
  }, [authenticated, navigate, returnTo]);

  const wechatDisabled = status !== 'ready';
  const helper =
    status === 'loading'
      ? t('home.loading')
      : status === 'missing'
        ? t('identity.wechatConfigMissingBody')
        : status === 'error'
          ? t('identity.wechatStatusError')
          : t('identity.wechatReadyHint');

  return (
    <main className="flex min-h-[calc(100vh-3rem)] items-center justify-center bg-stone-50 px-6 py-10">
      <div className="grid w-full max-w-4xl gap-8 md:grid-cols-[1fr_24rem] md:items-center">
        <section>
          <p className="text-sm font-semibold text-emerald-700">{t('identity.title')}</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-gray-950">
            {t('identity.pageTitle')}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-gray-600">
            {t('identity.pageIntro')}
          </p>
        </section>

        <div className="space-y-4">
          <section className="rounded-lg border border-emerald-200 bg-white p-6 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-900 text-lg font-semibold text-white">
              L
            </div>
            <h2 className="mt-5 text-xl font-semibold text-gray-950">
              {t('identity.localPanelTitle')}
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              {authenticated && identity
                ? t('identity.alreadySignedIn', { name: identity.displayName })
                : t('identity.localPanelBody')}
            </p>
            <button
              type="button"
              disabled={localBusy}
              onClick={() => {
                setLocalBusy(true);
                setLocalError(null);
                void signInLocal()
                  .catch(() => setLocalError(t('identity.localSignInError')))
                  .finally(() => setLocalBusy(false));
              }}
              className="mt-5 w-full rounded-lg bg-gray-900 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {localBusy ? t('home.loading') : t('identity.localSignIn')}
            </button>
            <p className="mt-3 text-xs leading-5 text-gray-500">
              {localError ?? t('identity.localReadyHint')}
            </p>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#07C160] text-lg font-semibold text-white">
                W
              </div>
              {status === 'missing' && (
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                  {t('identity.pendingBadge')}
                </span>
              )}
            </div>
            <h2 className="mt-5 text-xl font-semibold text-gray-950">
              {t('identity.wechatPanelTitle')}
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">{t('identity.wechatPanelBody')}</p>
            <button
              type="button"
              disabled={wechatDisabled}
              onClick={() => signInWithWeChat(returnTo)}
              className="mt-5 w-full rounded-lg bg-[#07C160] py-2.5 text-sm font-semibold text-white transition hover:bg-[#06ad56] disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {t('identity.wechatSignIn')}
            </button>
            <p className="mt-3 text-xs leading-5 text-gray-500">{helper}</p>
            {status === 'missing' && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
                <p className="font-semibold">{t('identity.wechatConfigMissingTitle')}</p>
                <p className="mt-1">{t('identity.wechatConfigMissingHelp')}</p>
              </div>
            )}
          </section>

          <Link
            to="/"
            className="block text-center text-xs font-medium text-gray-500 hover:text-gray-900"
          >
            {t('identity.returnHome')}
          </Link>
        </div>
      </div>
    </main>
  );
}

function normalizeReturnTo(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/';
  if (raw.startsWith('/auth/') || raw.startsWith('/login')) return '/';
  return raw;
}
