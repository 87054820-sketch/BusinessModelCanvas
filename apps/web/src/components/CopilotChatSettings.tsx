import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { copilotApi } from '../api/copilot';
import { useKeyConfig } from '../copilot/useKeyConfig';

/**
 * Single-card connect form for the Kimi Code API key. Replaces the
 * Round 1 4-provider catalog modal.
 *
 * Renders as a sheet pinned at the top of the Copilot drawer's Chat tab
 * — not a separate modal — because there's only one credential to
 * manage and the user needs to see the chat panel behind it while
 * setting up.
 */
export function CopilotChatSettings({ onClose }: { onClose?: () => void }) {
  const { t } = useTranslation();
  const config = useKeyConfig();

  const [input, setInput] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message?: string } | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    setTestResult(null);
  }, [input]);

  async function handleTest() {
    if (!input.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const result = await copilotApi.testKey(input.trim());
      setTestResult(result);
    } catch (err) {
      setTestResult({ ok: false, message: err instanceof Error ? err.message : String(err) });
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    if (!input.trim()) return;
    await config.save(input.trim());
    setInput('');
    setSavedFlash(true);
    if (onClose) {
      onClose();
      return;
    }
    window.setTimeout(() => setSavedFlash(false), 1500);
  }

  async function handleRemove() {
    if (!window.confirm(t('library.copilot.removeConfirm'))) return;
    config.remove();
    await copilotApi.clearKey().catch(() => { /* best-effort */ });
    setInput('');
    setTestResult(null);
  }

  return (
    <div className="border-b border-gray-100 bg-gray-50/60 px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{t('library.copilot.kimi.title')}</h3>
          <p className="mt-1 text-[11px] leading-relaxed text-gray-600">
            {t('library.copilot.kimi.intro')}
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-[12px] text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            ×
          </button>
        )}
      </div>

      <div
        className={`mt-2 rounded-md border px-2 py-1.5 text-[11px] ${
          config.encryptionAvailable
            ? 'border-emerald-100 bg-emerald-50/60 text-emerald-800'
            : 'border-amber-100 bg-amber-50/60 text-amber-800'
        }`}
      >
        {config.encryptionAvailable
          ? t('library.copilot.encryptionEnabled')
          : t('library.copilot.encryptionWarning')}
      </div>

      <div className="mt-3">
        <label className="block text-[11px] text-gray-600">
          {t('library.copilot.apiKey')}
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder={config.hasKey ? '••••••••••••••••' : t('library.copilot.apiKeyPlaceholder')}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-gray-500 focus:outline-none"
          />
        </label>
        <a
          href="https://www.kimi.com/code/console"
          target="_blank"
          rel="noreferrer noopener"
          className="mt-1 inline-block text-[11px] font-medium text-blue-600 hover:underline"
        >
          {t('library.copilot.getKey')}
        </a>
      </div>

      {testResult && (
        <div className={`mt-2 text-[11px] ${testResult.ok ? 'text-emerald-700' : 'text-red-600'}`}>
          {testResult.ok ? `✓ ${t('library.copilot.testOk')}` : `✗ ${testResult.message ?? 'Failed'}`}
        </div>
      )}

      <div className="mt-3 flex items-center justify-end gap-2">
        {config.hasKey && (
          <button
            type="button"
            onClick={handleRemove}
            className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          >
            {t('library.copilot.remove')}
          </button>
        )}
        <button
          type="button"
          onClick={handleTest}
          disabled={!input.trim() || testing}
          className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {testing ? t('library.copilot.testing') : t('library.copilot.testConnection')}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!input.trim() || savedFlash}
          className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {savedFlash ? `✓ ${t('library.copilot.saved')}` : t('library.copilot.save')}
        </button>
      </div>
    </div>
  );
}
