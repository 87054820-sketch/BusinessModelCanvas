import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  classifyCopilotProviderIssue,
  normalizeCopilotFetchError,
  normalizeCopilotRuntimeError,
  type CopilotModelHealth,
  type CopilotModelId,
  type CopilotProviderIssue,
  type CopilotProviderHealth,
} from '../api/copilot';
import type { CopilotKeyConfig } from '../copilot/useKeyConfig';
import {
  providerDocsUrl,
  providerLabel,
} from '../copilot/useCopilotModelRouter';

interface ProviderTestResult {
  ok: boolean;
  message?: string;
  issue?: CopilotProviderIssue;
}

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
  const providerName = providerLabel(provider ?? { provider: selectedProvider });
  const selectedModelHealth = models.find((item) => item.model === selectedModel) ?? null;
  const docsUrl = providerDocsUrl(provider ?? null, selectedModelHealth);
  const requiresApiKey = provider?.requiresApiKey !== false;
  const isLocalProvider = selectedProvider.endsWith('-cli');
  const availableModels = models;

  const [input, setInput] = useState('');
  const [rememberInBrowser, setRememberInBrowser] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ProviderTestResult | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    setTestResult(null);
  }, [input, selectedModel, selectedProvider]);

  useEffect(() => {
    setRememberInBrowser(
      config.rememberInBrowser ||
      (isLocalProvider && config.encryptionAvailable && !config.hasKey),
    );
  }, [config.encryptionAvailable, config.hasKey, config.rememberInBrowser, isLocalProvider]);

  useEffect(() => {
    setInput('');
    setSavedFlash(false);
  }, [selectedModel]);

  async function handleTest() {
    const savedKey = requiresApiKey ? await config.resolveKey() : null;
    const candidateKey = requiresApiKey ? input.trim() || savedKey || '' : '';
    if (requiresApiKey && !candidateKey) {
      setTestResult({ ok: false, message: t('library.copilot.savedKeyUnavailable') });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const result = await onTestKey(candidateKey);
      const issue = result.ok ? undefined : classifyCopilotProviderIssue(result.message ?? 'Failed', selectedProvider);
      setTestResult(result.ok ? result : {
        ok: false,
        message: normalizeCopilotRuntimeError(result.message ?? 'Failed'),
        issue,
      });
    } catch (err) {
      setTestResult({
        ok: false,
        message: normalizeCopilotFetchError(err),
        issue: classifyCopilotProviderIssue(err, selectedProvider),
      });
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    if (!requiresApiKey || !input.trim()) return;
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
            {t('library.copilot.providerTitle', { provider: providerName })}
          </h3>
          <p className="mt-1 text-[11px] leading-relaxed text-gray-600">
            {requiresApiKey
              ? t('library.copilot.providerIntro', { provider: providerName })
              : t('library.copilot.noApiKeyRequired', { provider: providerName })}
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
          disabled={availableModels.length === 0}
          className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus:border-gray-500 focus:outline-none"
        >
          {availableModels.map((item) => (
            <option key={item.model} value={item.model}>
              {item.label ?? item.provider.label ?? item.model}
            </option>
          ))}
        </select>
      </label>

      <div
        className={`mt-2 rounded-md border px-2 py-1.5 text-[11px] ${
          !requiresApiKey
            ? 'border-emerald-100 bg-emerald-50/60 text-emerald-800'
            : !isLocalProvider
            ? rememberInBrowser
              ? 'border-amber-100 bg-amber-50/60 text-amber-800'
              : 'border-emerald-100 bg-emerald-50/60 text-emerald-800'
            : config.encryptionAvailable
              ? 'border-emerald-100 bg-emerald-50/60 text-emerald-800'
              : 'border-amber-100 bg-amber-50/60 text-amber-800'
        }`}
      >
        {!requiresApiKey
          ? t('library.copilot.noApiKeyRequired', { provider: providerName })
          : !isLocalProvider
          ? rememberInBrowser
            ? t('library.copilot.browserRememberWarning')
            : t('library.copilot.sessionOnlyNotice')
          : config.encryptionAvailable
            ? t('library.copilot.encryptionEnabled')
            : t('library.copilot.encryptionWarning')}
      </div>

      {requiresApiKey && (
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
          {docsUrl && (
            <a
              href={docsUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-1 inline-block text-[11px] font-medium text-blue-600 hover:underline"
            >
              {t('library.copilot.getProviderKey', { provider: provider?.label ?? providerName })}
            </a>
          )}
        </div>
      )}

      {requiresApiKey && (
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
      )}

      {testResult && testResult.ok && (
        <div className="mt-2 text-[11px] text-emerald-700">
          ✓ {t('library.copilot.testOk')}
        </div>
      )}

      {testResult && !testResult.ok && testResult.issue && testResult.issue.kind !== 'unknown' && (
        <ProviderIssueGuide
          issue={testResult.issue}
          providerName={providerName}
          providerId={selectedProvider}
          docsUrl={docsUrl}
          hasSavedKey={config.hasKey}
          message={testResult.message ?? ''}
          onRemove={handleRemove}
        />
      )}

      {testResult && !testResult.ok && (!testResult.issue || testResult.issue.kind === 'unknown') && (
        <div className="mt-2 text-[11px] text-red-600">
          ✗ {testResult.message ?? 'Failed'}
        </div>
      )}

      <div className="mt-3 flex items-center justify-end gap-2">
        {requiresApiKey && config.hasKey && (
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
          disabled={(requiresApiKey && !input.trim() && !config.hasKey) || testing || !selectedProvider}
          className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {testing ? t('library.copilot.testing') : t('library.copilot.testConnection')}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!requiresApiKey || !input.trim() || savedFlash}
          className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {savedFlash ? `✓ ${t('library.copilot.saved')}` : t('library.copilot.save')}
        </button>
      </div>
    </div>
  );
}

function ProviderIssueGuide({
  issue,
  providerName,
  providerId,
  docsUrl,
  hasSavedKey,
  message,
  onRemove,
}: {
  issue: CopilotProviderIssue;
  providerName: string;
  providerId: string;
  docsUrl: string | null;
  hasSavedKey: boolean;
  message: string;
  onRemove(): Promise<void>;
}) {
  const { t } = useTranslation();
  const checkKeys = issueCheckKeys(issue, providerId);
  return (
    <div className="mt-3 rounded-md border border-red-100 bg-red-50/70 px-3 py-2 text-[11px] text-red-900">
      <div className="font-semibold">
        {t(`library.copilot.providerIssue.title.${issue.kind}`, { provider: providerName })}
      </div>
      <p className="mt-1 leading-relaxed text-red-800">
        {t(`library.copilot.providerIssue.body.${issue.kind}`, { provider: providerName })}
      </p>
      <div className="mt-2 font-medium text-red-900">
        {t('library.copilot.providerIssue.checksTitle')}
      </div>
      <ul className="mt-1 list-disc space-y-1 pl-4 leading-relaxed text-red-800">
        {checkKeys.map((key) => (
          <li key={key}>{t(`library.copilot.providerIssue.checks.${key}`, { provider: providerName })}</li>
        ))}
      </ul>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {docsUrl && (
          <a
            href={docsUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="rounded-md border border-red-200 bg-white px-2 py-1 font-medium text-red-700 hover:bg-red-50"
          >
            {t('library.copilot.providerIssue.openConsole', { provider: providerName })}
          </a>
        )}
        {hasSavedKey && (
          <button
            type="button"
            onClick={() => { void onRemove(); }}
            className="rounded-md border border-red-200 bg-white px-2 py-1 font-medium text-red-700 hover:bg-red-50"
          >
            {t('library.copilot.providerIssue.removeKey')}
          </button>
        )}
      </div>
      {message && (
        <details className="mt-2 text-red-700">
          <summary className="cursor-pointer font-medium">
            {t('library.copilot.providerIssue.rawDetails')}
          </summary>
          <div className="mt-1 max-h-20 overflow-auto whitespace-pre-wrap break-words rounded border border-red-100 bg-white/70 px-2 py-1 font-mono text-[10px]">
            {message}
          </div>
        </details>
      )}
    </div>
  );
}

function issueCheckKeys(issue: CopilotProviderIssue, providerId: string): string[] {
  const provider = `${issue.provider ?? providerId}`.toLowerCase();
  if (issue.kind === 'billing') return ['balance', 'quota', 'retryAfterBilling'];
  if (issue.kind === 'rate-limit') return ['wait', 'quota', 'switchProvider'];
  if (issue.kind === 'network') return ['network', 'retry'];
  if (issue.kind === 'empty-assistant') return ['retry', 'clearLastFailed'];
  if (issue.kind === 'plan') {
    if (provider.includes('minimax')) return ['minimaxKeyType', 'balance', 'modelAccess'];
    return ['providerMatch', 'modelAccess', 'balance'];
  }
  if (issue.kind === 'auth') return ['keyFormat', 'providerMatch', 'removeOldKey'];
  return ['providerMatch', 'retry'];
}
