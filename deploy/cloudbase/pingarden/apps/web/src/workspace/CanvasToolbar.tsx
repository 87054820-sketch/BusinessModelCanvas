import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { CanvasMeta } from '@pingarden/shared';
import { snapshotsApi } from '../api/snapshots';
import { preserveNavigationState } from '../navigation/useSmartBack';

interface Props {
  canvas: CanvasMeta;
  projectId: string;
  displayName: string;
  /** Called when the title input commits — workspace persists via API. */
  onRename: (title: string) => void;
  onOpenCopilot: () => void;
  /**
   * Library-case mode: title becomes a read-only label (still selectable
   * for copy), the "Save milestone" button disappears (writes to data),
   * the "History" link stays — viewing old snapshots is read-only and
   * useful for inspecting how the case evolved.
   */
  readOnly?: boolean;
}

/**
 * Top of the centre column. Inline rename, "Save milestone" modal,
 * "History" link.
 *
 * Sticky / pin creation lives entirely on the canvas overlay (the
 * left-of-canvas LegendPalette for pins, the right-of-canvas
 * StickyLegendPalette for stickies). Toolbar buttons for "+ Sticky" /
 * "+ Pin" used to live here but were redundant with the chip paint-
 * mode entrypoints — keeping them in two places caused the user to
 * hunt across the chrome instead of staying near the chips.
 */
export function CanvasToolbar({
  canvas,
  projectId,
  displayName,
  onRename,
  onOpenCopilot,
  readOnly = false,
}: Props) {
  const { t } = useTranslation();
  const location = useLocation();
  const [title, setTitle] = useState(canvas.title);
  const [milestoneOpen, setMilestoneOpen] = useState(false);

  // The input is sized in `ch` units. A `ch` is the width of the "0"
  // glyph, so CJK characters (which are roughly 2× wider) overflow when
  // the count is naive. Counting each CJK code point as 2 ch keeps the
  // input wide enough to show titles like "未命名 · 2026/6/2" without
  // truncation.
  const cjkChars = (title.match(/[\u3400-\u9fff\u3000-\u303f\uff00-\uffef]/g) ?? []).length;
  const widthCh = Math.max(title.length + cjkChars, 12) + 3;

  return (
    <div className="flex items-center justify-between border-b border-gray-200 bg-white px-5 py-2.5">
      <div className="flex items-center gap-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            if (readOnly) return;
            const next = title.trim();
            if (next && next !== canvas.title) onRename(next);
            else setTitle(canvas.title);
          }}
          onKeyDown={(e) => {
            if (readOnly) return;
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') {
              setTitle(canvas.title);
              (e.target as HTMLInputElement).blur();
            }
          }}
          readOnly={readOnly}
          className={`rounded border border-transparent px-2 py-1 text-base font-semibold text-gray-900 focus:outline-none ${
            readOnly
              ? 'cursor-default'
              : 'hover:border-gray-300 focus:border-gray-900'
          }`}
          style={{ width: `${widthCh}ch` }}
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenCopilot}
          className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-medium hover:bg-gray-50"
        >
          {t('library.copilot.openButton')}
        </button>
        {!readOnly && (
          <button
            type="button"
            onClick={() => setMilestoneOpen(true)}
            className="rounded-lg border border-gray-300 px-3 py-1 text-xs hover:bg-gray-50"
          >
            {t('workspace.saveMilestone')}
          </button>
        )}
        <Link
          to={`/p/${projectId}/c/${canvas.id}/history`}
          state={preserveNavigationState(location)}
          className="rounded-lg border border-gray-300 px-3 py-1 text-xs hover:bg-gray-50"
        >
          {t('workspace.viewHistory')}
        </Link>
      </div>

      {milestoneOpen && !readOnly && (
        <MilestoneModal
          onClose={() => setMilestoneOpen(false)}
          onSave={async (name, description) => {
            await snapshotsApi.createMilestone(
              canvas.id,
              { name, description },
              displayName,
            );
            setMilestoneOpen(false);
          }}
        />
      )}
    </div>
  );
}

interface ModalProps {
  onClose: () => void;
  onSave: (name: string, description: string) => Promise<void>;
}

function MilestoneModal({ onClose, onSave }: ModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <form
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) return;
          setBusy(true);
          try {
            await onSave(name.trim(), description.trim());
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2 className="text-xl font-semibold">{t('milestone.title')}</h2>
        <p className="mt-2 text-sm text-gray-600">{t('milestone.prompt')}</p>
        <input
          autoFocus
          className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2"
          placeholder={t('milestone.namePlaceholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={120}
        />
        <textarea
          className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2"
          placeholder={t('milestone.descriptionPlaceholder')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
          rows={3}
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm"
            onClick={onClose}
          >
            {t('milestone.cancel')}
          </button>
          <button
            type="submit"
            disabled={!name.trim() || busy}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {t('milestone.save')}
          </button>
        </div>
      </form>
    </div>
  );
}
