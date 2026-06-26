import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { CanvasMeta, SnapshotMeta } from '@pingarden/shared';
import { api } from '../api/client';
import { snapshotsApi } from '../api/snapshots';
import { useIdentity } from '../identity/useIdentity';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { preserveNavigationState } from '../navigation/useSmartBack';

export function HistoryPage() {
  const { t, i18n } = useTranslation();
  const { projectId, canvasId } = useParams<{ projectId: string; canvasId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { identity } = useIdentity();
  const [meta, setMeta] = useState<CanvasMeta | null>(null);
  const [items, setItems] = useState<SnapshotMeta[] | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SnapshotMeta | null>(null);

  async function load() {
    if (!canvasId || !identity) return;
    const [m, list] = await Promise.all([
      api.getCanvas(canvasId, identity.displayName),
      snapshotsApi.list(canvasId, identity.displayName),
    ]);
    setMeta(m);
    setItems(list);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasId, identity]);

  if (!identity || !canvasId || !projectId) return null;

  const lang = (i18n.language as 'en' | 'zh') ?? 'en';
  const fmt = new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  async function onReplace(sid: string) {
    if (!canvasId || !projectId) return;
    if (!confirm(lang === 'zh' ? '确认恢复到此版本?当前进度将被覆盖。' : 'Restore this version? Current state will be replaced.'))
      return;
    await snapshotsApi.restore(canvasId, sid, 'replace', identity!.displayName);
    navigate(`/p/${projectId}/c/${canvasId}`, { state: preserveNavigationState(location) });
  }

  async function onFork(sid: string) {
    if (!canvasId || !projectId) return;
    const res = await snapshotsApi.restore(canvasId, sid, 'fork', identity!.displayName);
    navigate(`/p/${projectId}/c/${res.canvas.id}`, { state: preserveNavigationState(location) });
  }

  async function onDelete(s: SnapshotMeta) {
    if (!canvasId) return;
    await snapshotsApi.delete(canvasId, s.id, identity!.displayName);
    setPendingDelete(null);
    void load();
  }

  return (
    <main className="mx-auto max-w-3xl px-8 py-10">
      <Link
        to={`/p/${projectId}/c/${canvasId}`}
        state={preserveNavigationState(location)}
        className="text-sm text-gray-600 hover:text-gray-900"
      >
        ← {t('nav.back')}
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">
        {t('history.title')} — {meta?.title ?? '…'}
      </h1>

      {items === null ? (
        <p className="mt-8 text-sm text-gray-500">…</p>
      ) : items.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-gray-300 p-12 text-center text-gray-500">
          {t('history.empty')}
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {items.map((s) => (
            <li
              key={s.id}
              className="group flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="text-base font-semibold">{s.name ?? s.id.slice(0, 8)}</div>
                {s.description && (
                  <div className="mt-1 text-sm text-gray-600">{s.description}</div>
                )}
                <div className="mt-1 text-xs text-gray-500">
                  {s.createdBy} · {fmt.format(new Date(s.createdAt))} ·{' '}
                  {t('history.stickyCount', { count: s.stickyCount })}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-gray-300 px-3 py-1 text-xs hover:bg-gray-50"
                  onClick={() => onFork(s.id)}
                >
                  {t('history.restoreAsNew')}
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-gray-900 px-3 py-1 text-xs text-white hover:bg-black"
                  onClick={() => onReplace(s.id)}
                >
                  {t('history.restoreHere')}
                </button>
                <button
                  type="button"
                  title={t('history.deleteMilestone')}
                  onClick={() => setPendingDelete(s)}
                  className="rounded p-1 text-gray-400 opacity-0 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-600"
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title={t('confirm.deleteMilestone')}
        message={t('confirm.deleteMilestoneMsg', {
          name: pendingDelete?.name ?? '',
        })}
        confirmLabel={t('confirm.delete')}
        cancelLabel={t('confirm.cancel')}
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (pendingDelete) await onDelete(pendingDelete);
        }}
      />
    </main>
  );
}
