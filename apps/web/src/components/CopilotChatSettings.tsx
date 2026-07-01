import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  normalizeCopilotFetchError,
  type CopilotModelHealth,
  type CopilotModelId,
  type CopilotProviderHealth,
} from '../api/copilot';
import type { CopilotKeyConfig } from '../copilot/useKeyConfig';
import {
  getKeyLinkForModel,
  introKeyForModelProvider,
  providerLabel,
  titleKeyForModelProvider,
} from '../copilot/useCopilotModelRouter';

export function CopilotChatSettings({
  onClose,
  provider,
  models,
  selectedModel,
  selectedProvider,
  keyConfig,
  onModelChange,
  onTestKey,
  onClearKey,
}: {
  onClose?: () => void;
  provider?: CopilotProviderHealth | null;
  models: CopilotModelHealth[];
  selectedModel: CopilotModelId;
  selectedProvider: CopilotProviderHealth['provider'];
  keyConfig: CopilotKeyConfig;
  onModelChange(model: CopilotModelId): void;
  onTestKey(apiKey: string): Promise<{ ok: boolean; message?: string }>;
  onClearKey(): Promise<void>;
}) {
  const { t } = useTranslation();
  const config = keyConfig;
  const isHttpProvider = selectedProvider !== 'kimi-cli';
  const providerName = providerLabel(provider ?? { provider: selectedProvider });
  const titleKey = titleKeyForModelProvider(selectedModel, selectedProvider);
  const introKey = introKeyForModelProvider(selectedModel, selectedProvider);
  const getKey = getKeyLinkForModel(selectedModel);
  const availableModels = models.length > 0 ? models : fallbackModelOptions();

  const [input, setInput] = useState('');
  const [rememberInBrowser, setRememberInBrowser] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message?: string } | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    setTestResult(null);
  }, [input, selectedModel, selectedProvider]);

  useEffect(() => {
    setRememberInBrowser(config.rememberInBrowser || selectedProvider === 'kimi-cli');
  }, [config.rememberInBrowser, selectedProvider]);

  useEffect(() => {
    setInput('');
    setSavedFlash(false);
  }, [selectedModel]);

  async function handleTest() {
    if (!input.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const result = await onTestKey(input.trim());
      setTestResult(result);
    } catch (err) {
      setTestResult({ ok: false, message: normalizeCopilotFetchError(err) });
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    if (!input.trim()) return;
    await config.save(input.trim(), { rememberInBrowser });
    setInput('');
    setSavedFlash(true);
    if (onClose) {
      onClose();
      return;
    }
    window.setTimeout(() => setSavedFlash(false), 1500);
  }

  async function handleRemove() {
    if (!window.confirm(t('library.copilot.removeConfirm', { provider: providerName }))) return;
    await onClearKey();
    setInput('');
    setTestResult(null);
  }

  return (
    <div className="border-b border-gray-100 bg-gray-50/60 px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            {t(titleKey)}
          </h3>
          <p className="mt-1 text-[11px] leading-relaxed text-gray-600">
            {t(introKey)}
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

      <label className="mt-3 block text-[11px] text-gray-600">
        {t('library.copilot.modelProvider')}
        <select
          value={selectedModel}
          onChange={(e) => onModelChange(e.target.value as CopilotModelId)}
          className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus:border-gray-500 focus:outline-none"
        >
          {availableModels.map((item) => (
            <option key={item.model} value={item.model}>
              {t(`library.copilot.providerOptions.${item.model}`)}
            </option>
          ))}
        </select>
      </label>

      <div
        className={`mt-2 rounded-md border px-2 py-1.5 text-[11px] ${
          isHttpProvider
            ? rememberInBrowser
              ? 'border-amber-100 bg-amber-50/60 text-amber-800'
              : 'border-emerald-100 bg-emerald-50/60 text-emerald-800'
            : config.encryptionAvailable
              ? 'border-emerald-100 bg-emerald-50/60 text-emerald-800'
              : 'border-amber-100 bg-amber-50/60 text-amber-800'
        }`}
      >
        {isHttpProvider
          ? rememberInBrowser
            ? t('library.copilot.browserRememberWarning')
            : t('library.copilot.sessionOnlyNotice')
          : config.encryptionAvailable
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
          href={getKey.href}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-1 inline-block text-[11px] font-medium text-blue-600 hover:underline"
        >
          {t(getKey.labelKey)}
        </a>
      </div>

      <label className="mt-3 flex items-start gap-2 text-[11px] text-gray-600">
        <input
          type="checkbox"
          checked={rememberInBrowser}
          onChange={(e) => setRememberInBrowser(e.target.checked)}
          className="mt-0.5 h-3.5 w-3.5 rounded border-gray-300"
        />
        <span>
          <span className="font-medium text-gray-800">{t('library.copilot.rememberThisBrowser')}</span>
          <span className="block leading-relaxed text-gray-500">{t('library.copilot.rememberThisBrowserHint')}</span>
        </span>
      </label>

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

function fallbackModelOptions(): CopilotModelHealth[] {
  return [
    {
      model: 'kimi',
      provider: {
        provider: 'kimi-cli',
        modelId: 'kimi',
        available: true,
        requiresApiKey: true,
        storesKeyServerSide: false,
      },
      providers: [],
      defaultProvider: 'kimi-cli',
      available: true,
      requiresApiKey: true,
    },
    {
      model: 'deepseek',
      provider: {
        provider: 'deepseek-http',
        modelId: 'deepseek',
        available: true,
        requiresApiKey: true,
        storesKeyServerSide: false,
      },
      providers: [],
      defaultProvider: 'deepseek-http',
      available: true,
      requiresApiKey: true,
    },
  ];
}
