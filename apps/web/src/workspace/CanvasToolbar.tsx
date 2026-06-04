import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { CanvasMeta, ObjectType } from '@canvas-collab/shared';
import { snapshotsApi } from '../api/snapshots';
import { useActiveClass } from '../state/activeClass';

interface Props {
  canvas: CanvasMeta;
  projectId: string;
  showZones: boolean;
  onShowZonesChange: (v: boolean) => void;
  onAddSticky: () => void;
  /**
   * Object types this canvas allows — drives which toolbar buttons are
   * shown. The host (workspace page) computes this via
   * `effectiveObjectTypes(def)` so canvases without an explicit
   * declaration still see pin / pinClass.
   */
  objectTypes?: ObjectType[];
  /**
   * Toggle pin draw mode. Host decides what happens (seed first class
   * if none, activate first class if none active, deactivate
   * otherwise). Undefined → button hidden.
   */
  onAddPin?: () => void;
  displayName: string;
  /** Called when the title input commits — workspace persists via API. */
  onRename: (title: string) => void;
}

/**
 * Top of the centre column. Inline rename, "+ Sticky" toolbar action,
 * "Save milestone" modal, "History" link, "show zones" toggle.
 */
export function CanvasToolbar({
  canvas,
  projectId,
  showZones,
  onShowZonesChange,
  onAddSticky,
  objectTypes,
  onAddPin,
  displayName,
  onRename,
}: Props) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(canvas.title);
  const [milestoneOpen, setMilestoneOpen] = useState(false);
  const activeClassId = useActiveClass((s) => s.activeClassId);

  const allowsPin = objectTypes?.includes('pin') ?? false;

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
            const next = title.trim();
            if (next && next !== canvas.title) onRename(next);
            else setTitle(canvas.title);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') {
              setTitle(canvas.title);
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="rounded border border-transparent px-2 py-1 text-base font-semibold text-gray-900 hover:border-gray-300 focus:border-gray-900 focus:outline-none"
          style={{ width: `${widthCh}ch` }}
        />
      </div>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={showZones}
            onChange={(e) => onShowZonesChange(e.target.checked)}
          />
          {t('workspace.showZones')}
        </label>
        {allowsPin && onAddPin && (
          <button
            type="button"
            onClick={onAddPin}
            className={`rounded-lg px-3 py-1 text-xs font-medium ${
              activeClassId
                ? 'bg-gray-900 text-white hover:bg-black'
                : 'border border-gray-300 text-gray-900 hover:bg-gray-50'
            }`}
            title={t('workspace.pinHint')}
          >
            {activeClassId ? t('workspace.pinModeOn') : t('workspace.addPin')}
          </button>
        )}
        <button
          type="button"
          onClick={onAddSticky}
          className="rounded-lg bg-stone-200 px-3 py-1 text-xs font-medium text-gray-900 hover:bg-stone-300"
        >
          {t('workspace.addSticky')}
        </button>
        <button
          type="button"
          onClick={() => setMilestoneOpen(true)}
          className="rounded-lg border border-gray-300 px-3 py-1 text-xs hover:bg-gray-50"
        >
          {t('workspace.saveMilestone')}
        </button>
        <Link
          to={`/p/${projectId}/c/${canvas.id}/history`}
          className="rounded-lg border border-gray-300 px-3 py-1 text-xs hover:bg-gray-50"
        >
          {t('workspace.viewHistory')}
        </Link>
      </div>

      {milestoneOpen && (
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
