import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Lang } from '@pingarden/shared';
import { api, type CanvasDefDetail } from '../api/client';
import { Markdown } from './Markdown';

interface Props {
  defId: string | null;
  lang: Lang;
  onClose: () => void;
}

export function TemplatePreviewModal({ defId, lang, onClose }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<CanvasDefDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!defId) {
      setDetail(null);
      return;
    }
    setLoading(true);
    api
      .getDef(defId)
      .then((d) => setDetail(d))
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [defId]);

  // Lock body scroll while open
  useEffect(() => {
    if (!defId) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [defId]);

  // Esc to close
  useEffect(() => {
    if (!defId) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    }
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [defId, onClose]);

  if (!defId) return null;

  const name = detail?.def.name[lang] ?? detail?.def.id ?? defId;
  const tagline = t(`templates.${defId}.tagline`, '');
  const knowledge = detail?.knowledge[lang];
  const bgUrl = api.bgUrl(defId, lang);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        {/* Left — full canvas background image */}
        <div className="relative hidden flex-1 items-center justify-center bg-stone-100 md:flex">
          <img
            src={bgUrl}
            alt={name}
            className="h-full w-full object-contain p-6"
          />
        </div>

        {/* Right — info panel */}
        <div className="flex w-full flex-col md:w-[480px]">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-gray-900">{name}</h2>
              {tagline && <p className="mt-0.5 text-sm text-gray-500">{tagline}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="ml-4 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xl text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            >
              ×
            </button>
          </div>

          {/* Mobile canvas preview (shown only on small screens) */}
          <div className="border-b border-gray-100 bg-stone-50 p-4 md:hidden">
            <img src={bgUrl} alt={name} className="w-full rounded-lg" />
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {loading ? (
              <p className="text-sm text-gray-400">{t('home.loading')}…</p>
            ) : knowledge?.intro || knowledge?.body ? (
              <div className="space-y-5">
                {knowledge.intro && (
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                      {t('inspector.canvasKnowledge.usageIntro')}
                    </h3>
                    <Markdown content={knowledge.intro} canvasDefId={defId} />
                  </div>
                )}
                {knowledge.body && (
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                      {t('inspector.canvasKnowledge.knowledgeBody')}
                    </h3>
                    <Markdown content={knowledge.body} canvasDefId={defId} />
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">{t('inspector.canvasKnowledge.empty')}</p>
            )}
          </div>

          {/* Footer CTA */}
          <div className="border-t border-gray-100 px-6 py-4">
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate(`/p/new?withCanvas=${encodeURIComponent(defId)}`);
              }}
              className="w-full rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white hover:bg-black"
            >
              {t('home.startWithTemplate', { name })}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
