import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CopilotPlaybookDescriptor } from '@pingarden/shared';
import { copilotApi, type SkillPackInfo } from '../api/copilot';
import { CopilotMemoryReviewPanel } from './CopilotMemoryReviewPanel';
import en from '../i18n/en.json';
import zh from '../i18n/zh.json';

/**
 * The 📦 Skill pack tab of the Copilot drawer.
 *
 * UX model (2026-06-22): a single universal install prompt the user
 * pastes into whichever AI coding agent they're already using (Claude,
 * Code Cursor, Codex, CodeBuddy, WorkBuddy, or another tool). The AI detects itself, extracts the zip into its own
 * standard skill / rules / workflows directory, and runs
 * `pingarden doctor` to verify the PinGarden CLI is reachable.
 *
 * Why not per-tool unzip commands: it's friction the user shouldn't
 * have to think about. Modern coding agents already know their own
 * install paths; one prompt covers them all and leaves the
 * tool-specific minutiae inside the zip's INSTALL.md as a fallback.
 */
export function SkillPackPane({ displayName }: { displayName: string }) {
  const { t, i18n } = useTranslation();
  const [info, setInfo] = useState<SkillPackInfo | null>(null);
  const [playbooks, setPlaybooks] = useState<CopilotPlaybookDescriptor[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      copilotApi.getSkillPackInfo(),
      copilotApi.getBundledPlaybooks().catch(() => []),
    ])
      .then(([next, nextPlaybooks]) => {
        if (cancelled) return;
        setInfo(next);
        setPlaybooks(nextPlaybooks);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleDownload() {
    setDownloading(true);
    try {
      const a = document.createElement('a');
      a.href = copilotApi.skillPackDownloadUrl();
      a.setAttribute('download', info?.filename ?? 'pingarden-skill.zip');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      window.setTimeout(() => setDownloading(false), 1200);
    }
  }

  async function handleCopyPrompt(prompt: string) {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedPrompt(true);
      window.setTimeout(() => setCopiedPrompt(false), 1500);
    } catch {
      window.prompt('Copy:', prompt);
    }
  }

  if (error) {
    return (
      <div className="px-4 py-5">
        <div className="rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-3 text-[12px] text-amber-900">
          {t('library.copilot.skillPack.notReady')}
        </div>
        <p className="mt-2 text-[10px] text-gray-400 break-words">{error}</p>
      </div>
    );
  }

  if (!info) {
    return <div className="px-4 py-5 text-sm text-gray-400">{t('home.loading')}…</div>;
  }

  const sizeLabel = formatBytes(info.sizeBytes);
  const installPrompt = renderRawTemplate(
    getStaticTranslation(i18n.language, 'library.copilot.skillPack.installPrompt'),
    { filename: info.filename, version: info.version },
  ) || `Install PinGarden Skill Pack: ${info.filename} (version ${info.version})`;
  const downloadLabel = renderRawTemplate(
    getStaticTranslation(i18n.language, 'library.copilot.skillPack.download'),
    { size: sizeLabel },
  ) || `Download (${sizeLabel})`;
  const versionLabel = renderRawTemplate(
    getStaticTranslation(i18n.language, 'library.copilot.skillPack.version'),
    { version: info.version },
  ) || `Version ${info.version}`;

  return (
    <div className="px-4 py-4 space-y-4">
      <header>
        <h3 className="text-sm font-semibold text-gray-900">
          {t('library.copilot.skillPack.heading')}
        </h3>
        <p className="mt-1 text-[12px] leading-relaxed text-gray-600">
          {t('library.copilot.skillPack.intro')}
        </p>
      </header>

      {/* Step 1 — download */}
      <div className="rounded-xl border border-gray-200 bg-white p-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700">
            {t('library.copilot.skillPack.step1')}
          </span>
          <span className="text-[10px] text-gray-400">{info.filename}</span>
        </div>
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="mt-3 w-full rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          ⬇ {downloading ? t('library.copilot.skillPack.downloading') : downloadLabel}
        </button>
        <p className="mt-2 text-[10px] leading-relaxed text-gray-500">
          {versionLabel}
        </p>
      </div>

      {/* Step 2 — copy universal install prompt */}
      <div className="rounded-xl border border-gray-200 bg-white p-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700">
            {t('library.copilot.skillPack.step2')}
          </span>
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-gray-700">
          {t('library.copilot.skillPack.promptIntro')}
        </p>
        <pre className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap rounded bg-gray-50 px-2.5 py-2 text-[11px] leading-relaxed text-gray-800">
          {installPrompt}
        </pre>
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={() => handleCopyPrompt(installPrompt)}
            className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
          >
            {copiedPrompt
              ? `✓ ${t('library.copilot.skillPack.copied')}`
              : `📋 ${t('library.copilot.skillPack.copyPrompt')}`}
          </button>
        </div>
      </div>

      {/* Step 3 — supported agents chip strip */}
      <section>
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
          {t('library.copilot.skillPack.supportedAgentsLabel')}
        </h4>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {info.supportedAgents.map((agent) => (
            <span
              key={agent.id}
              className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-[11px] font-medium text-gray-700"
            >
              {agent.label}
            </span>
          ))}
        </div>
      </section>

      {playbooks.length > 0 && (
        <section className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-3">
          <h4 className="text-[12px] font-semibold text-indigo-950">
            {t('library.copilot.skillPack.bundledPlaybooksTitle')}
          </h4>
          <p className="mt-1 text-[11px] leading-relaxed text-indigo-700">
            {t('library.copilot.skillPack.bundledPlaybooksIntro')}
          </p>
          <div className="mt-2 space-y-1.5">
            {playbooks.map((playbook) => (
              <div key={playbook.id} className="rounded-lg border border-white bg-white/85 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-gray-950">{playbook.title}</span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[9px] text-gray-500">v{playbook.version}</span>
                </div>
                <div className="mt-0.5 text-[10px] leading-relaxed text-gray-500">{playbook.summary}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {displayName && <CopilotMemoryReviewPanel displayName={displayName} />}

      <p className="text-[10px] leading-relaxed text-gray-400">
        {t('library.copilot.skillPack.installMdHint')}
      </p>
    </div>
  );
}

const STATIC_TRANSLATIONS = { en, zh } as const;

function getStaticTranslation(lang: string | undefined, key: string): string {
  const dict = lang?.startsWith('en') ? STATIC_TRANSLATIONS.en : STATIC_TRANSLATIONS.zh;
  const fallback = STATIC_TRANSLATIONS.zh;
  return readStringAtPath(dict, key) || readStringAtPath(fallback, key) || '';
}

function readStringAtPath(source: unknown, key: string): string {
  let current = source;
  for (const part of key.split('.')) {
    if (typeof current !== 'object' || current === null || !(part in current)) return '';
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : '';
}

function renderRawTemplate(template: string, values: Record<string, string> | undefined): string {
  let out = template;
  for (const key in values ?? {}) {
    out = out.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), values?.[key] ?? '');
  }
  return out;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
