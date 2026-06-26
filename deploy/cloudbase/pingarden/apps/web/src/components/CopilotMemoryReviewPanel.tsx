import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { COPILOT_MEMORY_LAYERS, type CopilotMemoryItem, type CopilotMemoryLayer, type CopilotMemoryState } from '@pingarden/shared';
import { copilotApi } from '../api/copilot';

export function CopilotMemoryReviewPanel({ displayName }: { displayName: string }) {
  const { t } = useTranslation();
  const [state, setState] = useState<CopilotMemoryState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  const activeCount = useMemo(() => {
    if (!state) return 0;
    return COPILOT_MEMORY_LAYERS.reduce(
      (sum, layer) => sum + state.layeredMemory.layers[layer].filter((item) => item.status === 'active').length,
      0,
    );
  }, [state]);

  async function archive(id: string) {
    setBusy(true);
    try {
      setState(await copilotApi.archiveMemoryItem(id, displayName));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      setState(await copilotApi.deleteMemoryItem(id, displayName));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function revert() {
    setBusy(true);
    try {
      setState(await copilotApi.revertLatestMemoryChange(displayName));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">{error}</div>;
  }

  if (!state) {
    return <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-[11px] text-gray-400">{t('home.loading')}…</div>;
  }

  const latestChange = state.layeredMemory.changelog[0];

  return (
    <div className="space-y-3">
      <section className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="text-[12px] font-semibold text-gray-950">{t('library.copilot.memory.profileTitle')}</h4>
            <p className="mt-0.5 text-[10px] leading-relaxed text-gray-500">{t('library.copilot.memory.localOnly')}</p>
          </div>
          <span className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-[10px] text-gray-600">
            {activeCount}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-2 text-[10px] text-gray-400">
          <span>{t('library.copilot.memory.lastConsolidated')}: {formatDate(state.layeredMemory.updatedAt)}</span>
          <button
            type="button"
            onClick={revert}
            disabled={busy || !latestChange}
            className="rounded-md border border-stone-200 bg-white px-2 py-1 text-gray-500 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t('library.copilot.memory.revertLatest')}
          </button>
        </div>
      </section>

      {COPILOT_MEMORY_LAYERS.map((layer) => {
        const items = visibleLayerItems(state, layer);
        return (
          <section key={layer} className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-[12px] font-semibold text-gray-950">{t(`library.copilot.memory.layers.${layer}`)}</h4>
              <span className="text-[10px] text-gray-400">{items.length}</span>
            </div>
            <div className="mt-2 space-y-2">
              {items.length === 0 ? (
                <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50/70 px-3 py-3 text-center text-[11px] text-gray-400">
                  {t('library.copilot.memory.noLayerItems')}
                </div>
              ) : items.map((item) => (
                <MemoryItemCard
                  key={item.id}
                  item={item}
                  busy={busy}
                  onArchive={() => archive(item.id)}
                  onDelete={() => remove(item.id)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function MemoryItemCard({
  item,
  busy,
  onArchive,
  onDelete,
}: {
  item: CopilotMemoryItem;
  busy: boolean;
  onArchive(): void;
  onDelete(): void;
}) {
  const { t } = useTranslation();
  return (
    <div className="rounded-xl border border-stone-100 bg-stone-50/70 px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold text-gray-900">{item.title}</div>
          <div className="mt-0.5 text-[11px] leading-relaxed text-gray-600">{item.value}</div>
        </div>
        <span className="shrink-0 rounded-full border border-stone-200 bg-white px-2 py-0.5 text-[10px] text-gray-500">
          {Math.round(item.confidence * 100)}%
        </span>
      </div>
      <div className="mt-1 text-[10px] leading-relaxed text-gray-400">{item.evidenceSummary}</div>
      <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-gray-400">
        <span>{formatDate(item.lastSeenAt)}</span>
        <span className="flex items-center gap-1.5">
          <button type="button" disabled={busy} onClick={onArchive} className="rounded-md border border-stone-200 bg-white px-2 py-1 hover:bg-stone-50 disabled:opacity-40">
            {t('library.copilot.memory.archive')}
          </button>
          <button type="button" disabled={busy} onClick={onDelete} className="rounded-md px-2 py-1 text-gray-400 hover:bg-stone-100 hover:text-gray-700 disabled:opacity-40">
            {t('library.copilot.memory.delete')}
          </button>
        </span>
      </div>
    </div>
  );
}

function visibleLayerItems(state: CopilotMemoryState, layer: CopilotMemoryLayer): CopilotMemoryItem[] {
  return state.layeredMemory.layers[layer]
    .filter((item) => item.status !== 'archived')
    .slice(0, 5);
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
