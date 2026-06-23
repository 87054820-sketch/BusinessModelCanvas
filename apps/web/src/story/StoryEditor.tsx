import type { CanvasMeta } from '@pingarden/shared';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { canvasDirective } from './storyDirectives';

interface Props {
  content: string;
  canvases: CanvasMeta[];
  onChange: (content: string) => void;
}

export function StoryEditor({ content, canvases, onChange }: Props) {
  const { t } = useTranslation();
  const [selectedCanvasId, setSelectedCanvasId] = useState(canvases[0]?.id ?? '');
  const selectedCanvas = useMemo(
    () => canvases.find((c) => c.id === selectedCanvasId) ?? canvases[0],
    [canvases, selectedCanvasId],
  );

  function insertCanvas() {
    if (!selectedCanvas) return;
    const directive = canvasDirective(selectedCanvas.defId, selectedCanvas.variant?.id, selectedCanvas.title);
    const prefix = content.trimEnd();
    onChange(`${prefix}${prefix ? '\n\n' : ''}${directive}\n\n`);
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[24px] border border-stone-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 bg-stone-50/70 px-5 py-3">
        <div>
          <div className="text-sm font-semibold text-gray-900">{t('story.editor')}</div>
          <div className="text-xs text-gray-500">{t('story.directiveHint')}</div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedCanvas?.id ?? ''}
            onChange={(e) => setSelectedCanvasId(e.target.value)}
            className="h-9 max-w-[240px] rounded-lg border border-stone-300 bg-white px-3 text-sm text-gray-800 outline-none focus:border-teal-700"
          >
            {canvases.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
          <button
            type="button"
            disabled={!selectedCanvas}
            onClick={insertCanvas}
            className="h-9 rounded-lg bg-[#2A6B6B] px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#245d5d] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t('story.insertCanvas')}
          </button>
        </div>
      </div>
      <textarea
        value={content}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        className="min-h-0 flex-1 resize-none border-0 bg-white px-6 py-5 font-mono text-[14px] leading-7 text-gray-800 outline-none"
        placeholder={t('story.contentPlaceholder')}
      />
    </div>
  );
}
