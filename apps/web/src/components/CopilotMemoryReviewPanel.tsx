import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CopilotMemoryState } from '@pingarden/shared';
import { copilotApi } from '../api/copilot';
import { memoryConfidenceLabel, pendingMemorySuggestions } from '../copilot/localEvolution';

export function CopilotMemoryReviewPanel({ displayName }: { displayName: string }) {
  const { t } = useTranslation();
  const [state, setState] = useState<CopilotMemoryState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!displayName) return;
    let cancelled = false;
    copilotApi
      .getMemoryState(displayName)
      .then((next) => {
        if (!cancelled) {
          setState(next);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [displayName]);

  const pending = useMemo(() => pendingMemorySuggestions(state?.suggestions ?? []), [state]);

  async function accept(id: string) {
    const profile = await copilotApi.acceptMemorySuggestion(id, displayName);
    setState((prev) => prev ? {
      ...prev,
      profile,
      suggestions: prev.suggestions.map((item) => item.id === id ? { ...item, status: 'accepted' } : item),
    } : prev);
  }

  async function ignore(id: string) {
    const ignored = await copilotApi.ignoreMemorySuggestion(id, displayName);
    setState((prev) => prev ? {
      ...prev,
      suggestions: prev.suggestions.map((item) => item.id === id ? ignored : item),
    } : prev);
  }

  async function removePreference(id: string) {
    await copilotApi.deleteUserPreference(id, displayName);
    setState((prev) => prev ? {
      ...prev,
      profile: {
        ...prev.profile,
        preferences: prev.profile.preferences.filter((item) => item.id !== id),
      },
    } : prev);
  }

  if (error) {
    return <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">{error}</div>;
  }

  if (!state) {
    return <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-3 text-[11px] text-gray-400">{t('home.loading')}…</div>;
  }

  return (
    <div className="space-y-3">
      <section className="rounded-2xl border border-gray-200 bg-white p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h4 className="text-[12px] font-semibold text-gray-950">{t('library.copilot.memory.profileTitle')}</h4>
            <p className="mt-0.5 text-[10px] text-gray-500">{t('library.copilot.memory.localOnly')}</p>
          </div>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">
            {state.profile.preferences.length}
          </span>
        </div>
        <div className="mt-2 space-y-1.5">
          {state.profile.preferences.length === 0 ? (
            <div className="text-[11px] text-gray-400">{t('library.copilot.memory.noPreferences')}</div>
          ) : state.profile.preferences.map((pref) => (
            <div key={pref.id} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-gray-900">{pref.label}</div>
                  <div className="mt-0.5 text-[11px] leading-relaxed text-gray-600">{pref.value}</div>
                </div>
                <button type="button" onClick={() => removePreference(pref.id)} className="shrink-0 rounded px-1.5 text-[12px] text-gray-400 hover:bg-gray-100 hover:text-gray-800">×</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3">
        <h4 className="text-[12px] font-semibold text-indigo-950">{t('library.copilot.memory.suggestionsTitle')}</h4>
        <p className="mt-0.5 text-[10px] text-indigo-700">{t('library.copilot.memory.reviewHint')}</p>
        <div className="mt-2 space-y-2">
          {pending.length === 0 ? (
            <div className="rounded-xl bg-white/70 px-3 py-3 text-center text-[11px] text-indigo-400">{t('library.copilot.memory.noSuggestions')}</div>
          ) : pending.map((item) => (
            <div key={item.id} className="rounded-xl border border-white bg-white px-3 py-2 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-gray-950">{item.title}</div>
                  <div className="mt-0.5 text-[11px] leading-relaxed text-gray-600">{item.summary}</div>
                </div>
                <span className="shrink-0 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] text-indigo-700">
                  {t(`library.copilot.memory.confidence.${memoryConfidenceLabel(item.confidence)}`)}
                </span>
              </div>
              <div className="mt-1 text-[10px] leading-relaxed text-gray-400">{item.evidenceSummary}</div>
              <div className="mt-2 flex justify-end gap-1.5">
                <button type="button" onClick={() => ignore(item.id)} className="rounded-md border border-gray-200 px-2 py-1 text-[10px] text-gray-600 hover:bg-gray-50">
                  {t('library.copilot.memory.ignore')}
                </button>
                <button type="button" onClick={() => accept(item.id)} className="rounded-md bg-gray-950 px-2 py-1 text-[10px] font-medium text-white hover:bg-black">
                  {t('library.copilot.memory.accept')}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
