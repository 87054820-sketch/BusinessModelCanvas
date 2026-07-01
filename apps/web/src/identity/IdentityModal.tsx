import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { authApi } from '../api/auth';
import { useAuthSession } from './useIdentity';

interface LoginDialogProps {
  onSignIn?: () => void;
  onCancel?: () => void;
}

type WeChatStatus = 'loading' | 'ready' | 'missing' | 'error';

export function LoginDialog({ onSignIn, onCancel }: LoginDialogProps) {
  const { t } = useTranslation();
  const { signInLocal, signInWithWeChat } = useAuthSession();
  const [status, setStatus] = useState<WeChatStatus>('loading');
  const [localBusy, setLocalBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    authApi.wechatStatus()
      .then((next) => {
        if (!cancelled) setStatus(next.configured ? 'ready' : 'missing');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleSignIn() {
    if (onSignIn) {
      onSignIn();
      return;
    }
    signInWithWeChat();
  }

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            aria-label={t('identity.cancel')}
            className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            ×
          </button>
        )}
        <h2 className="text-xl font-semibold text-gray-900">{t('identity.title')}</h2>
        <p className="mt-2 text-sm leading-6 text-gray-600">{t('identity.prompt')}</p>

        <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
          <div className="text-sm font-semibold text-gray-900">{t('identity.localPanelTitle')}</div>
          <p className="mt-1 text-xs leading-5 text-gray-600">{t('identity.localPanelBody')}</p>
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
            className="mt-3 w-full rounded-lg bg-gray-900 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {localBusy ? t('home.loading') : t('identity.localSignIn')}
          </button>
          <p className="mt-2 text-xs leading-5 text-gray-500">
            {localError ?? t('identity.localReadyHint')}
          </p>
        </div>

        <div className="mt-4 rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-gray-900">{t('identity.wechatPanelTitle')}</div>
            {status === 'missing' && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                {t('identity.pendingBadge')}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs leading-5 text-gray-600">{t('identity.wechatPanelBody')}</p>
          <button
            type="button"
            disabled={wechatDisabled}
            onClick={handleSignIn}
            className="mt-3 w-full rounded-lg bg-[#07C160] py-2.5 text-sm font-semibold text-white transition hover:bg-[#06ad56] disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {t('identity.wechatSignIn')}
          </button>
          <p className="mt-2 text-xs leading-5 text-gray-500">{helper}</p>
        </div>

        {status === 'missing' && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
            <p className="font-semibold">{t('identity.wechatConfigMissingTitle')}</p>
            <p className="mt-1">{t('identity.wechatConfigMissingHelp')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
