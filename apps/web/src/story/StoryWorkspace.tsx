import { useEffect, useMemo, useState } from 'react';
import type { CanvasMeta, Lang, Story, StoryMeta } from '@pingarden/shared';
import { useTranslation } from 'react-i18next';
import { storiesApi } from '../api/stories';
import { StoryEditor } from './StoryEditor';
import { StoryRenderer } from './StoryRenderer';

interface Props {
  storyId: string;
  projectId: string;
  canvases: CanvasMeta[];
  lang: Lang;
  displayName: string;
  onStoryUpdated: (story: StoryMeta) => void;
  onOpenCopilot: () => void;
  /**
   * Library-case mode: title / contentDate / markdown content all
   * become non-editable, the read/edit segmented control disappears
   * (we force read mode), and the autosave effect is suppressed so we
   * never even attempt a write that would 403.
   */
  readOnly?: boolean;
}

type Mode = 'read' | 'edit';

export function StoryWorkspace({
  storyId,
  projectId,
  canvases,
  lang,
  displayName,
  onStoryUpdated,
  onOpenCopilot,
  readOnly = false,
}: Props) {
  const { t } = useTranslation();
  const [story, setStory] = useState<Story | null>(null);
  const [mode, setMode] = useState<Mode>('read');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [contentDate, setContentDate] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setStory(null);
    setLoadFailed(false);
    setSaveState('idle');
    storiesApi.get(storyId, displayName).then((s) => {
      if (cancelled) return;
      setStory(s);
      setTitle(s.title);
      setContent(s.content);
      setContentDate(s.contentDate ?? '');
      setSaveState('saved');
    }).catch((err) => {
      console.error('Failed to load story', err);
      if (!cancelled) {
        setLoadFailed(true);
        setSaveState('error');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [storyId, displayName]);

  useEffect(() => {
    if (!story) return;
    if (readOnly) return;
    if (title === story.title && content === story.content && contentDate === (story.contentDate ?? '')) return;
    setSaveState('saving');
    const timer = setTimeout(() => {
      storiesApi.update(
        story.id,
        {
          title: title.trim() || story.title,
          content,
          contentDate: contentDate.trim() || undefined,
          contentDatePrecision: contentDate.trim() ? 'month' : undefined,
          contentDateLabel: contentDate.trim() || undefined,
        },
        displayName,
      ).then((updated) => {
        setStory(updated);
        setTitle(updated.title);
        setContent(updated.content);
        setContentDate(updated.contentDate ?? '');
        onStoryUpdated(updated);
        setSaveState('saved');
      }).catch((err) => {
        console.error('Failed to save story', err);
        setSaveState('error');
      });
    }, 700);
    return () => clearTimeout(timer);
  }, [story, title, content, contentDate, displayName, onStoryUpdated, readOnly]);

  const savedLabel = useMemo(() => {
    if (readOnly) return '';
    if (saveState === 'saving') return t('story.saving');
    if (saveState === 'saved') return t('story.saved');
    if (saveState === 'error') return t('story.saveError');
    return '';
  }, [saveState, t, readOnly]);

  if (!story) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-gray-500">
        {loadFailed ? t('story.loadError') : t('story.loading')}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#FAF8F3]">
      <header className="border-b border-stone-200 bg-white/95 px-6 py-4 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#2A6B6B]">
              <span>{t('story.story')}</span>
              <span className="h-1 w-1 rounded-full bg-[#E8B84A]" />
              <span>{contentDate || t('story.noContentDate')}</span>
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              readOnly={readOnly}
              className="w-full border-0 bg-transparent text-[30px] font-bold leading-tight text-gray-900 outline-none"
              placeholder={t('story.titlePlaceholder')}
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-gray-600">
              <span>{t('story.contentDate')}</span>
              <input
                value={contentDate}
                onChange={(e) => setContentDate(e.target.value)}
                placeholder="2023-12"
                readOnly={readOnly}
                className="w-24 border-0 bg-transparent text-sm font-semibold text-gray-900 outline-none"
              />
            </label>
            <div className="text-xs text-gray-500">{savedLabel}</div>
            <button
              type="button"
              onClick={onOpenCopilot}
              className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-stone-300 hover:bg-stone-50"
            >
              {t('library.copilot.openButton')}
            </button>
            {!readOnly && (
              <div className="rounded-full bg-stone-100 p-1">
                <button
                  type="button"
                  onClick={() => setMode('read')}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    mode === 'read' ? 'bg-[#2A6B6B] text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {t('story.read')}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('edit')}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    mode === 'edit' ? 'bg-[#2A6B6B] text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {t('story.edit')}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto">
        {!readOnly && mode === 'edit' ? (
          <div className="h-full p-6">
            <StoryEditor content={content} canvases={canvases} onChange={setContent} />
          </div>
        ) : (
          <StoryRenderer
            content={content}
            projectId={projectId}
            canvases={canvases}
            lang={lang}
            displayName={displayName}
          />
        )}
      </div>
    </div>
  );
}
