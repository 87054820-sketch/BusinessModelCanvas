import {
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkCjkFriendly from 'remark-cjk-friendly';
import remarkGfm from 'remark-gfm';
import {
  COPILOT_ACCEPTED_IMAGE_TYPES,
  COPILOT_MAX_IMAGE_ATTACHMENTS,
  COPILOT_MAX_IMAGE_BYTES,
  type BusinessModelPattern,
  type CopilotDiscussionInsight,
  type CopilotImageAttachment,
  type CopilotSessionInsightItem,
  type Experiment,
  type Lang,
  type StrategyFramework,
} from '@pingarden/shared';
import { copilotApi, type CopilotIntent } from '../api/copilot';
import { api, type CanvasDefSummary } from '../api/client';
import { storiesApi } from '../api/stories';
import { maybeConsolidateCopilotMemory } from '../copilot/memoryConsolidation';
import { REVEAL_INTERVAL_MS, splitStreamingBlocks, takeRevealChunk } from '../copilot/reveal';
import { useKeyConfig } from '../copilot/useKeyConfig';
import {
  useConversation,
  type AttachedRef,
  type ConversationImageAttachment,
  type ConversationMessage,
  type CopilotUpdateBaseline,
} from '../copilot/useConversation';
import { useIdentity } from '../identity/useIdentity';
import {
  extractDiscussionInsights,
  extractProjectDrafts,
  extractProjectUpdateDrafts,
  stripProjectDraftBlocks,
} from '../copilot/projectDraft';
import { useSessionInsightBasket } from '../copilot/useSessionInsightBasket';
import { useLightbox } from '../state/lightbox';
import { CopilotChatSettings } from './CopilotChatSettings';
import {
  CopilotCanvasReferenceBoard,
  CopilotCaseReferenceBoard,
  CopilotReferenceResolutionHint,
  CopilotResourceReferenceBoard,
  stripResolvedCanvasIds,
  stripResolvedCaseSlugs,
  useCopilotRecommendationReferences,
} from './CopilotCanvasReferenceBoard';
import { CopilotProjectDraftCard } from './CopilotProjectDraftCard';
import { CopilotProjectUpdateDraftCard } from './CopilotProjectUpdateDraftCard';
import { CopilotDiscussionInsightCard } from './CopilotDiscussionInsightCard';
import { CopilotImageAttachmentGrid } from './CopilotImageAttachmentGrid';
import { CopilotSessionInsightBasket } from './CopilotSessionInsightBasket';
import { CopilotApplyLearningDialog, type ApplyLearningTarget } from './CopilotApplyLearningDialog';
import { SkillPackPane } from './SkillPackPane';

interface Props {
  open: boolean;
  onClose(): void;
  onNavigateToCanvas?: () => void;
  attachedRef: AttachedRef | null;
  lang: Lang;
  libraryCatalog?: LibraryStarterCatalog;
}

interface LibraryStarterCatalog {
  patterns?: BusinessModelPattern[] | null;
  experiments?: Experiment[] | null;
  strategyFrameworks?: StrategyFramework[] | null;
  canvasDefs?: CanvasDefSummary[] | null;
}

type ActiveTab = 'chat' | 'skillPack';
type CopilotMode = 'createProject' | 'libraryReference' | 'projectWork';
type CopilotActionIntent = CopilotIntent;
type ComposerQuickAction = {
  labelKey: string;
  promptKey: string;
  intent?: CopilotActionIntent;
  includePendingImages?: boolean;
};
type StarterTone = 'violet' | 'rose' | 'cyan' | 'amber' | 'emerald' | 'slate';
type StarterOption = { label: string; value: string };
type StarterControl = {
  id: string;
  label: string;
  prefix?: string;
  suffix?: string;
  options: StarterOption[];
  featuredCount?: number;
  searchable?: boolean;
  searchPlaceholder?: string;
};
type StarterAction = {
  id: string;
  title: string;
  description: string;
  template: string;
  controls: StarterControl[];
  tone?: StarterTone;
};
type SendOptions = {
  forceContext?: boolean;
  includePendingImages?: boolean;
  intent?: CopilotActionIntent;
  contextOverride?: string;
  projectIdOverride?: string;
};
type PendingImageAttachment = CopilotImageAttachment & { previewDataUrl: string };
const TAB_STORAGE_KEY = 'pingarden.copilot.activeTab';
const COPILOT_REMARK_PLUGINS = [remarkCjkFriendly, remarkGfm];
const SELECTED_CHIP_CLASS = 'border-gray-300 bg-gray-900 text-white shadow-sm ring-1 ring-gray-300';
const ACCEPTED_IMAGE_TYPES = COPILOT_ACCEPTED_IMAGE_TYPES;
const MAX_IMAGE_ATTACHMENTS = COPILOT_MAX_IMAGE_ATTACHMENTS;
const MAX_IMAGE_BYTES = COPILOT_MAX_IMAGE_BYTES;
const PREVIEW_IMAGE_MAX_BYTES = 64 * 1024;
const COPILOT_PROGRESS_STEP_COUNT = 4;
const COPILOT_PROGRESS_INTERVAL_MS = 2200;

/**
 * Right-side slide-over Copilot panel. ~420px wide, full window height.
 *
 * Two tabs at the top:
 *   💬 Chat       — bundled Kimi CLI subprocess + the user's pasted key
 *   📦 Skill pack — download the PinGarden methodology zip + per-tool
 *                   install snippets
 *
 * Active tab persists in localStorage so opening the drawer feels
 * "where you left it" across reloads.
 *
 * Future tabs (MCP server endpoint, GitHub Action exports, …) plug in
 * the same way: add a tab key, a label, a pane component, and wire
 * them into the strip below.
 */
export function CopilotDrawer({
  open,
  onClose,
  onNavigateToCanvas,
  attachedRef,
  lang,
  libraryCatalog,
}: Props) {
  const { t } = useTranslation();
  const { identity } = useIdentity();
  const config = useKeyConfig();
  const conv = useConversation(identity?.displayName);
  const insightBasket = useSessionInsightBasket();

  const [activeInsightItem, setActiveInsightItem] = useState<CopilotSessionInsightItem | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    if (typeof localStorage === 'undefined') return 'chat';
    const stored = localStorage.getItem(TAB_STORAGE_KEY);
    return stored === 'skillPack' ? 'skillPack' : 'chat';
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [pendingImages, setPendingImages] = useState<PendingImageAttachment[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [streamProgressIndex, setStreamProgressIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [cliAvailable, setCliAvailable] = useState<boolean | null>(null);
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);
  const [suggestionsCollapsed, setSuggestionsCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);
  const revealQueueRef = useRef('');
  const revealTimerRef = useRef<number | null>(null);
  const progressTimerRef = useRef<number | null>(null);
  const streamDoneRef = useRef(false);
  const listEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Probe /copilot/health on drawer open so we can show "Kimi CLI not
  // installed" before the user even tries to chat.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    copilotApi
      .getHealth()
      .then((h) => {
        if (!cancelled) setCliAvailable(h.kimi.available);
      })
      .catch(() => {
        if (!cancelled) setCliAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Open settings automatically the very first time the drawer mounts
  // with no saved key — saves the user a click.
  useEffect(() => {
    if (!open) return;
    if (!config.hasKey && activeTab === 'chat') setSettingsOpen(true);
  }, [open, config.hasKey, activeTab]);

  const lastMessageLength = conv.messages[conv.messages.length - 1]?.content.length ?? 0;

  // Auto-scroll on new messages / streaming deltas.
  useEffect(() => {
    if (!open || activeTab !== 'chat') return;
    listEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [open, activeTab, conv.messages.length, lastMessageLength, streaming]);

  // Cleanup in-flight stream and reveal timer on unmount.
  useEffect(
    () => () => {
      stopRef.current?.();
      clearRevealTimer();
      clearProgressTimer();
      revealQueueRef.current = '';
    },
    [],
  );

  function switchTab(next: ActiveTab) {
    setActiveTab(next);
    try {
      localStorage.setItem(TAB_STORAGE_KEY, next);
    } catch {
      /* best-effort */
    }
  }

  const currentContextKey = attachedRef ? attachedRefKey(attachedRef) : 'library';
  const copilotMode = useMemo(() => deriveCopilotMode(attachedRef), [attachedRef]);
  const starterActions = useMemo(
    () => buildStarterActions(attachedRef, lang, libraryCatalog),
    [attachedRef, lang, libraryCatalog],
  );

  useEffect(() => {
    if (!open) return;
    setSuggestionsDismissed(false);
    setSuggestionsCollapsed(false);
  }, [open, currentContextKey]);

  function handleStarterSend(prompt: string) {
    setSuggestionsDismissed(true);
    void handleSend(prompt, { forceContext: true });
  }

  function handleAddInsight(insight: CopilotDiscussionInsight, sourceMessageId?: string) {
    const item = insightBasket.add(insight, sourceMessageId);
    return item;
  }

  function handleApplyInsight(insight: CopilotDiscussionInsight, sourceMessageId?: string) {
    const item = handleAddInsight(insight, sourceMessageId);
    setActiveInsightItem(item);
  }

  async function handleGenerateFromInsight(prompt: string, target: ApplyLearningTarget) {
    setActiveInsightItem(null);
    if (target.kind === 'new-project') {
      void handleSend(prompt, { forceContext: true, intent: 'project-draft' });
      return;
    }
    let contextMd: string | undefined;
    try {
      const result = await copilotApi.fetchProjectContext(target.projectId, lang);
      contextMd = result.markdown;
    } catch {
      contextMd = undefined;
    }
    void handleSend(prompt, {
      forceContext: true,
      intent: 'apply-learning-to-project',
      ...(contextMd ? { contextOverride: contextMd } : {}),
      projectIdOverride: target.projectId,
    });
    if (activeInsightItem) insightBasket.markApplied(activeInsightItem.id);
  }

  async function handleAddImageFiles(files: FileList | File[]) {
    if (streaming) return;
    const candidates = Array.from(files).filter((file) => file.type.startsWith('image/'));
    if (candidates.length === 0) return;
    setError(null);

    const slots = MAX_IMAGE_ATTACHMENTS - pendingImages.length;
    if (slots <= 0) {
      setError(t('library.copilot.imageLimit', { count: MAX_IMAGE_ATTACHMENTS }));
      return;
    }

    const accepted: File[] = [];
    for (const file of candidates.slice(0, slots)) {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
        setError(t('library.copilot.imageUnsupported', { name: file.name }));
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setError(t('library.copilot.imageTooLarge', { name: file.name, size: formatBytes(MAX_IMAGE_BYTES) }));
        continue;
      }
      accepted.push(file);
    }

    if (candidates.length > slots) {
      setError(t('library.copilot.imageLimit', { count: MAX_IMAGE_ATTACHMENTS }));
    }
    if (accepted.length === 0) return;

    const next = await Promise.all(accepted.map(readImageAttachment));
    setPendingImages((prev) => {
      const remainingSlots = MAX_IMAGE_ATTACHMENTS - prev.length;
      if (remainingSlots <= 0) return prev;
      return [...prev, ...next.slice(0, remainingSlots)];
    });
  }

  function handleRemoveImage(id: string) {
    setPendingImages((prev) => prev.filter((item) => item.id !== id));
    setError(null);
  }

  function handleFileInputChange(files: FileList | null) {
    if (!files) return;
    void handleAddImageFiles(files);
  }

  function handlePaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const files = Array.from(e.clipboardData.files).filter((file) => file.type.startsWith('image/'));
    if (files.length === 0) return;
    e.preventDefault();
    void handleAddImageFiles(files);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    const files = Array.from(e.dataTransfer.files).filter((file) => file.type.startsWith('image/'));
    if (files.length === 0) return;
    e.preventDefault();
    void handleAddImageFiles(files);
  }

  function clearRevealTimer() {
    if (revealTimerRef.current === null) return;
    window.clearTimeout(revealTimerRef.current);
    revealTimerRef.current = null;
  }

  function clearProgressTimer() {
    if (progressTimerRef.current === null) return;
    window.clearInterval(progressTimerRef.current);
    progressTimerRef.current = null;
  }

  function startProgressTimer() {
    clearProgressTimer();
    setStreamProgressIndex(0);
    progressTimerRef.current = window.setInterval(() => {
      setStreamProgressIndex((value) => Math.min(value + 1, COPILOT_PROGRESS_STEP_COUNT - 1));
    }, COPILOT_PROGRESS_INTERVAL_MS);
  }

  function revealNextChunk() {
    clearRevealTimer();
    const chunk = takeRevealChunk(revealQueueRef.current);
    if (!chunk) {
      if (streamDoneRef.current) {
        clearProgressTimer();
        setStreaming(false);
        stopRef.current = null;
      }
      return;
    }

    revealQueueRef.current = revealQueueRef.current.slice(chunk.length);
    conv.updateLast((msg) => ({ ...msg, content: msg.content + chunk }));
    revealTimerRef.current = window.setTimeout(revealNextChunk, REVEAL_INTERVAL_MS);
  }

  function enqueueAssistantDelta(delta: string) {
    revealQueueRef.current += delta;
    if (revealTimerRef.current === null) revealNextChunk();
  }

  function finishAssistantReveal() {
    streamDoneRef.current = true;
    if (revealTimerRef.current === null && !revealQueueRef.current) {
      setStreaming(false);
      stopRef.current = null;
    }
  }

  function flushAssistantReveal() {
    clearRevealTimer();
    const rest = revealQueueRef.current;
    revealQueueRef.current = '';
    if (rest) conv.updateLast((msg) => ({ ...msg, content: msg.content + rest }));
  }

  async function handleSend(overridePrompt?: string, options?: SendOptions) {
    const trimmed = (overridePrompt ?? input).trim();
    const imagesForTurn = overridePrompt && !options?.includePendingImages ? [] : pendingImages;
    const isImageOnlyProjectCreation =
      attachedRef === null && !overridePrompt && copilotMode === 'createProject' && !trimmed && imagesForTurn.length > 0;
    const inferredIntent = options?.intent ?? (isImageOnlyProjectCreation ? 'project-draft' : inferProjectWorkIntent(trimmed, copilotMode));
    if ((!trimmed && imagesForTurn.length === 0) || streaming) return;
    const messageText = trimmed || t(`library.copilot.modeHints.${copilotMode}.imageOnlyPrompt`);
    setError(null);

    if (cliAvailable === false) {
      setError(t('library.copilot.cliMissing'));
      return;
    }
    const apiKey = await config.resolveKey();
    if (!apiKey) {
      setError(t('library.copilot.noKeyConfigured'));
      setSettingsOpen(true);
      return;
    }

    // Fetch attached context on the first turn for this exact entry.
    // Free-form creation from the empty project entry skips library context;
    // starter prompts still attach the Strategy Library for grounded references.
    const attachedKey = attachedRef ? attachedRefKey(attachedRef) : null;
    const isFirstTurnWithThisAttached =
      attachedRef !== null &&
      !conv.messages.some((m) => m.attachedRef && attachedRefKey(m.attachedRef) === attachedKey);

    let contextMd: string | undefined = options?.contextOverride;
    const shouldFetchContext =
      !contextMd &&
      (inferredIntent === 'project-draft' && attachedRef === null
        ? false
        : options?.forceContext === true || attachedRef === null || isFirstTurnWithThisAttached);
    if (shouldFetchContext) {
      try {
        const result = await fetchAttachedContext(attachedRef, lang);
        contextMd = result.markdown;
      } catch {
        contextMd = undefined;
      }
    }

    const expectedSourceImageCount = inferredIntent && imagesForTurn.length > 0 ? imagesForTurn.length : undefined;
    const activeProjectId = options?.projectIdOverride ?? projectIdFromAttachedRef(attachedRef);
    let updateBaseline: CopilotUpdateBaseline | undefined;
    if ((inferredIntent === 'project-update' || inferredIntent === 'apply-learning-to-project') && activeProjectId && identity?.displayName) {
      try {
        updateBaseline = await captureUpdateBaseline(activeProjectId, identity.displayName);
      } catch {
        updateBaseline = undefined;
      }
    }

    // Outbound: full conversation history + the new user turn.
    const outbound = [
      ...conv.messages.map((m) => ({ role: m.role, content: m.content })),
      {
        role: 'user' as const,
        content: messageText,
        ...(imagesForTurn.length > 0
          ? { imageAttachments: imagesForTurn.map(toCopilotImageAttachment) }
          : {}),
      },
    ];

    conv.append({
      role: 'user',
      content: messageText,
      ...(attachedRef ? { attachedRef } : {}),
      ...(imagesForTurn.length > 0
        ? { imageAttachments: imagesForTurn.map(toConversationImageAttachment) }
        : {}),
    });
    setInput('');
    if (!overridePrompt || options?.includePendingImages) setPendingImages([]);

    conv.append({
      role: 'assistant',
      content: '',
      providerId: 'kimi',
      model: 'kimi-for-coding',
      ...(attachedRef ? { attachedRef } : {}),
      ...(expectedSourceImageCount ? { expectedSourceImageCount } : {}),
      ...(updateBaseline ? { updateBaseline } : {}),
    });

    clearRevealTimer();
    revealQueueRef.current = '';
    streamDoneRef.current = false;
    startProgressTimer();
    setStreaming(true);
    const stop = copilotApi.streamChat(
      {
        apiKey,
        messages: outbound,
        ...(identity?.displayName ? { displayName: identity.displayName } : {}),
        ...(contextMd ? { attachedContext: contextMd } : {}),
        ...(inferredIntent ? { intent: inferredIntent } : {}),
      },
      {
        onDelta: (delta) => {
          enqueueAssistantDelta(delta);
        },
        onDone: () => {
          finishAssistantReveal();
        },
        onError: (message) => {
          flushAssistantReveal();
          clearProgressTimer();
          setError(message);
          setStreaming(false);
          stopRef.current = null;
        },
      },
    );
    stopRef.current = stop;
  }

  function handleStop() {
    stopRef.current?.();
    stopRef.current = null;
    clearRevealTimer();
    revealQueueRef.current = '';
    streamDoneRef.current = false;
    setStreaming(false);
  }

  function handleClear() {
    if (!window.confirm(t('library.copilot.clearChatConfirm'))) return;
    handleStop();
    conv.clear();
    insightBasket.clear();
    setError(null);
  }

  function handleNavigateToCanvas() {
    onNavigateToCanvas?.();
    onClose();
  }

  function handleResizePointerDown(e: ReactPointerEvent<HTMLButtonElement>) {
    e.preventDefault();
    const startX = e.clientX;
    const wasExpanded = expanded;

    function handleMove(event: PointerEvent) {
      const delta = event.clientX - startX;
      if (!wasExpanded && delta < -80) setExpanded(true);
      if (wasExpanded && delta > 80) setExpanded(false);
    }

    function handleUp() {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    }

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp, { once: true });
  }

  if (!open) return null;

  return (
    <aside
      role="complementary"
      aria-label={t('library.copilot.drawerTitle')}
      className={`fixed right-0 top-0 z-[90] flex h-full w-full flex-col border-l border-gray-200 bg-white shadow-2xl transition-[max-width] duration-200 ${
        expanded ? 'max-w-none' : 'max-w-[480px]'
      }`}
    >
      <button
        type="button"
        onPointerDown={handleResizePointerDown}
        onDoubleClick={() => setExpanded((v) => !v)}
        title={t('library.copilot.resizeHint')}
        aria-label={t('library.copilot.resizeHint')}
        className="group absolute left-0 top-12 bottom-0 z-10 flex w-3 cursor-ew-resize items-center justify-center"
      >
        <span className="h-16 w-1 rounded-full bg-gray-300 opacity-60 transition group-hover:h-24 group-hover:bg-gray-500 group-hover:opacity-100" />
      </button>

      {/* Header */}
      <div className={`flex items-center justify-between border-b border-gray-100 py-3 pr-4 ${expanded ? 'pl-20' : 'pl-4'}`}>
        <h2 className="min-w-0 flex-1 truncate pr-3 text-sm font-semibold text-gray-900">
          {t('library.copilot.drawerTitle')}
        </h2>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? t('library.copilot.restore') : t('library.copilot.expand')}
            title={expanded ? t('library.copilot.restore') : t('library.copilot.expand')}
            className="rounded-full border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          >
            {expanded ? t('library.copilot.restore') : t('library.copilot.expand')}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-full text-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            ×
          </button>
        </div>
      </div>

      {/* Tab strip */}
      <div className="flex border-b border-gray-100" role="tablist">
        <TabButton
          active={activeTab === 'chat'}
          label={t('library.copilot.tabs.chat')}
          onClick={() => switchTab('chat')}
        />
        <TabButton
          active={activeTab === 'skillPack'}
          label={t('library.copilot.tabs.skillPack')}
          onClick={() => switchTab('skillPack')}
        />
      </div>

      {activeInsightItem && (
        <CopilotApplyLearningDialog
          item={activeInsightItem}
          lang={lang}
          displayName={identity?.displayName ?? ''}
          currentProjectId={projectIdFromAttachedRef(attachedRef)}
          onClose={() => setActiveInsightItem(null)}
          onGenerate={handleGenerateFromInsight}
        />
      )}

      {activeTab === 'chat' ? (
        <ChatPane
          settingsOpen={settingsOpen}
          onToggleSettings={() => setSettingsOpen((v) => !v)}
          attachedRef={attachedRef}
          messages={conv.messages}
          streaming={streaming}
          streamProgressIndex={streamProgressIndex}
          error={error}
          input={input}
          pendingImages={pendingImages}
          fileInputRef={fileInputRef}
          onInput={setInput}
          onSend={handleSend}
          onStarterSend={handleStarterSend}
          onRemoveImage={handleRemoveImage}
          onFileInputChange={handleFileInputChange}
          onPaste={handlePaste}
          onDrop={handleDrop}
          onStop={handleStop}
          onClear={handleClear}
          listEndRef={listEndRef}
          cliAvailable={cliAvailable}
          hasKey={config.hasKey}
          starterActions={starterActions}
          showStarterActions={!suggestionsDismissed}
          suggestionsCollapsed={suggestionsCollapsed}
          onToggleSuggestions={() => setSuggestionsCollapsed((v) => !v)}
          mode={copilotMode}
          allowProjectDrafts={allowProjectDraftCards(attachedRef)}
          lang={lang}
          displayName={identity?.displayName ?? ''}
          onNavigateToCanvas={handleNavigateToCanvas}
          basketItems={insightBasket.items}
          onRemoveBasketItem={insightBasket.remove}
          onClearBasket={insightBasket.clear}
          onMarkBasketUseful={insightBasket.markUseful}
          onApplyBasketItem={setActiveInsightItem}
          onAddInsight={handleAddInsight}
          onApplyInsight={handleApplyInsight}
        />
      ) : (
        <div className="flex-1 overflow-y-auto">
          <SkillPackPane displayName={identity?.displayName ?? ''} />
        </div>
      )}
    </aside>
  );
}

function attachedRefKey(ref: AttachedRef): string {
  switch (ref.type) {
    case 'case':
      return `case:${ref.slug}`;
    case 'pattern':
      return `pattern:${ref.slug}`;
    case 'project':
      return `project:${ref.projectId}:${ref.activeCanvasId ?? ''}:${ref.activeStoryId ?? ''}`;
    case 'canvas':
      return `canvas:${ref.canvasId}`;
    case 'story':
      return `story:${ref.storyId}`;
  }
}

function attachedRefLabel(ref: AttachedRef): string {
  switch (ref.type) {
    case 'case':
      return ref.companyName;
    case 'pattern':
      return ref.name;
    case 'project':
    case 'canvas':
    case 'story':
      return ref.projectName;
  }
}

function projectIdFromAttachedRef(ref: AttachedRef | null): string | undefined {
  if (!ref || ref.type === 'case' || ref.type === 'pattern') return undefined;
  if (ref.projectSource === 'library') return undefined;
  return ref.projectId;
}

function allowProjectDraftCards(ref: AttachedRef | null): boolean {
  return ref === null || ref.type === 'case' || ref.type === 'pattern' || isLibraryProjectRef(ref);
}

function deriveCopilotMode(ref: AttachedRef | null): CopilotMode {
  if (ref === null) return 'createProject';
  if (ref.type === 'case' || ref.type === 'pattern') return 'libraryReference';
  if (isLibraryProjectRef(ref)) return 'libraryReference';
  return 'projectWork';
}

function inferProjectWorkIntent(text: string, mode: CopilotMode): CopilotActionIntent | undefined {
  if (mode !== 'projectWork') return undefined;
  if (/补充|新增|增加|扩展|创建|修改|调整|优化|便签|标签|画布|story|故事|add|create|update|revise|improve|sticky|canvas/i.test(text)) {
    return 'project-update';
  }
  return undefined;
}

function buildComposerQuickActions(ref: AttachedRef | null, mode: CopilotMode): ComposerQuickAction[] {
  if (mode === 'createProject') {
    return [
      { labelKey: 'createProject', promptKey: 'createProject', intent: 'project-draft', includePendingImages: true },
      { labelKey: 'extractInsight', promptKey: 'extractInsight', intent: 'discussion-insight' },
      { labelKey: 'askLibrary', promptKey: 'askLibrary' },
    ];
  }
  if (mode === 'libraryReference') {
    return [
      { labelKey: 'askReference', promptKey: 'askReference' },
      { labelKey: 'extractInsight', promptKey: 'extractInsight', intent: 'discussion-insight' },
      {
        labelKey: isLibraryProjectRef(ref) ? 'copyProject' : 'createFromReference',
        promptKey: isLibraryProjectRef(ref) ? 'copyProject' : 'createFromReference',
        intent: 'project-draft',
        includePendingImages: true,
      },
    ];
  }
  return [
    { labelKey: 'optimizeProject', promptKey: 'optimizeProject', intent: 'project-update', includePendingImages: true },
    { labelKey: 'addCanvas', promptKey: 'addCanvas', intent: 'project-update', includePendingImages: true },
    { labelKey: 'addStory', promptKey: 'addStory', intent: 'project-update', includePendingImages: true },
  ];
}

function isLibraryProjectRef(ref: AttachedRef | null): boolean {
  return Boolean(ref && ref.type !== 'case' && ref.type !== 'pattern' && ref.projectSource === 'library');
}

function contextSourceKey(mode: CopilotMode): string {
  if (mode === 'createProject') return 'library.copilot.contextCreateSource';
  if (mode === 'libraryReference') return 'library.copilot.contextReferenceSource';
  return 'library.copilot.contextProjectSource';
}

function fetchAttachedContext(ref: AttachedRef | null, lang: Lang): Promise<{ markdown: string }> {
  if (ref === null) return copilotApi.fetchLibraryContext(lang);
  switch (ref.type) {
    case 'case':
      return copilotApi.fetchCaseContext(ref.slug, lang);
    case 'pattern':
      return copilotApi.fetchPatternContext(ref.slug, lang);
    case 'project':
      return copilotApi.fetchProjectContext(ref.projectId, lang, {
        activeCanvasId: ref.activeCanvasId,
        activeStoryId: ref.activeStoryId,
      });
    case 'canvas':
      return copilotApi.fetchProjectContext(ref.projectId, lang, { activeCanvasId: ref.canvasId });
    case 'story':
      return copilotApi.fetchProjectContext(ref.projectId, lang, { activeStoryId: ref.storyId });
  }
}

async function captureUpdateBaseline(projectId: string, displayName: string): Promise<CopilotUpdateBaseline> {
  const [canvases, stories] = await Promise.all([
    api.listCanvases(displayName, { projectId }),
    storiesApi.list(projectId, displayName),
  ]);
  return {
    projectId,
    capturedAt: new Date().toISOString(),
    canvases: Object.fromEntries(canvases.map((canvas) => [canvas.id, canvas.updatedAt])),
    stories: Object.fromEntries(stories.map((story) => [story.id, story.updatedAt])),
  };
}

function buildStarterActions(
  ref: AttachedRef | null,
  lang: Lang,
  catalog?: LibraryStarterCatalog,
): StarterAction[] {
  const isZh = lang === 'zh';
  if (!ref) return buildStrategyLibraryStarterActions(isZh, lang, catalog);

  if (isLibraryProjectRef(ref)) {
    return buildLibraryProjectStarterActions(isZh);
  }

  if (ref.type === 'canvas') {
    return [
      {
        id: 'canvas-read-current',
        title: isZh ? '理解当前画布' : 'Understand this canvas',
        description: isZh ? '解释这张画布的核心判断和空白点。' : 'Explain the core logic and gaps in this canvas.',
        template: isZh ? '请细读当前画布，说明它现在表达了什么核心判断、哪些区块证据最强、哪些区块还缺信息。' : 'Read the current canvas closely: what core judgment does it express, which blocks have the strongest evidence, and which blocks still lack information?',
        controls: [],
      },
      {
        id: 'canvas-block-gaps',
        title: isZh ? '检查区块缺口' : 'Check block gaps',
        description: isZh ? '按一个重点区块找缺口和补充问题。' : 'Find gaps and follow-up questions for one key block.',
        template: isZh ? '请围绕当前画布的「{{block}}」区块，列出已有信息、明显缺口、需要追问的问题，以及最应该补充的便签。' : 'For the {{block}} block in the current canvas, list existing information, obvious gaps, follow-up questions, and stickies that should be added first.',
        controls: [
          {
            id: 'block',
            label: isZh ? '重点区块' : 'Key block',
            options: [
              { label: isZh ? '客户/用户' : 'Customer/user', value: isZh ? '客户/用户' : 'customer/user' },
              { label: isZh ? '价值主张' : 'Value proposition', value: isZh ? '价值主张' : 'value proposition' },
              { label: isZh ? '渠道/关系' : 'Channels/relationship', value: isZh ? '渠道/关系' : 'channels/relationship' },
              { label: isZh ? '收入/成本' : 'Revenue/cost', value: isZh ? '收入/成本' : 'revenue/cost' },
              { label: isZh ? '关键活动/资源' : 'Activities/resources', value: isZh ? '关键活动/资源' : 'key activities/resources' },
            ],
          },
        ],
      },
      {
        id: 'canvas-next-action',
        title: isZh ? '转成下一步' : 'Turn into next steps',
        description: isZh ? '把画布缺口转成行动、实验或 Story。' : 'Convert canvas gaps into actions, experiments, or a Story.',
        template: isZh ? '请基于当前画布，按「{{output}}」整理下一步：先列出判断依据，再给出 3 个可执行动作。' : 'Based on the current canvas, organize next steps as {{output}}: state the reasoning first, then give 3 executable actions.',
        controls: [
          {
            id: 'output',
            label: isZh ? '输出形式' : 'Output',
            options: [
              { label: isZh ? '补充便签' : 'New stickies', value: isZh ? '补充便签' : 'new stickies' },
              { label: isZh ? '实验建议' : 'Experiment ideas', value: isZh ? '实验建议' : 'experiment ideas' },
              { label: isZh ? 'Story 大纲' : 'Story outline', value: isZh ? 'Story 大纲' : 'Story outline' },
            ],
          },
        ],
      },
    ];
  }

  if (ref.type === 'story') {
    return [
      {
        id: 'story-read-current',
        title: isZh ? '细读当前 Story' : 'Read this Story',
        description: isZh ? '提炼 Story 的主线、证据和结论。' : 'Extract the storyline, evidence, and conclusion.',
        template: isZh ? '请细读当前 Story，提炼它的核心主张、论证结构、最有价值的洞察，以及读完后还应该追问的问题。' : 'Read the current Story closely. Extract its core claim, argument structure, most valuable insights, and follow-up questions worth asking.',
        controls: [],
      },
      {
        id: 'story-evidence-chain',
        title: isZh ? '补强证据链' : 'Strengthen evidence',
        description: isZh ? '找出 Story 中需要更多画布或事实支撑的位置。' : 'Find where the Story needs stronger canvas or factual support.',
        template: isZh ? '请从「{{lens}}」角度检查当前 Story 的证据链：哪些结论已有画布支撑，哪些地方缺证据，建议补哪张画布或哪些便签。' : 'Check the evidence chain in this Story from the perspective of {{lens}}: which conclusions are supported by canvases, what lacks evidence, and which canvas or stickies should be added.',
        controls: [
          {
            id: 'lens',
            label: isZh ? '检查角度' : 'Lens',
            options: [
              { label: isZh ? '用户洞察' : 'Customer insight', value: isZh ? '用户洞察' : 'customer insight' },
              { label: isZh ? '商业可行性' : 'Business viability', value: isZh ? '商业可行性' : 'business viability' },
              { label: isZh ? '竞争差异化' : 'Differentiation', value: isZh ? '竞争差异化' : 'differentiation' },
              { label: isZh ? '行动闭环' : 'Action loop', value: isZh ? '行动闭环' : 'action loop' },
            ],
          },
        ],
      },
      {
        id: 'story-to-canvas-work',
        title: isZh ? '转成画布任务' : 'Turn into canvas work',
        description: isZh ? '把 Story 里的判断拆回可操作的画布补充。' : 'Convert Story claims into concrete canvas updates.',
        template: isZh ? '请把当前 Story 拆成画布待办：哪些判断要补到现有画布，哪些判断需要新增画布，哪些应该先验证。' : 'Turn the current Story into canvas work: which claims should update existing canvases, which need new canvases, and which should be validated first.',
        controls: [],
      },
    ];
  }

  if (ref.type === 'project') {
    return [
      {
        id: 'diagnose-project',
        title: isZh ? '诊断当前项目' : 'Diagnose this project',
        description: isZh ? '检查完整性、逻辑、风险和下一步。' : 'Check completeness, logic, risks, and next steps.',
        template: isZh ? '请从「{{focus}}」角度诊断当前项目，指出最重要的 3 个问题和下一步行动。' : 'Diagnose this project from the perspective of {{focus}}. Give the top 3 issues and next actions.',
        controls: [
          {
            id: 'focus',
            label: isZh ? '诊断角度' : 'Focus',
            options: [
              { label: isZh ? '完整性' : 'Completeness', value: isZh ? '完整性' : 'completeness' },
              { label: isZh ? '逻辑一致性' : 'Logic', value: isZh ? '逻辑一致性' : 'logical consistency' },
              { label: isZh ? '风险假设' : 'Risks', value: isZh ? '风险假设' : 'risky assumptions' },
              { label: isZh ? '故事表达' : 'Narrative', value: isZh ? '故事表达' : 'narrative clarity' },
            ],
          },
        ],
      },
      {
        id: 'next-canvas',
        title: isZh ? '推荐下一张画布' : 'Recommend the next canvas',
        description: isZh ? '按当前项目目标推荐后续画布。' : 'Choose the best next canvas for the project goal.',
        template: isZh ? '请基于当前项目，为「{{goal}}」推荐下一张最适合的画布，并说明为什么。' : 'Based on this project, recommend the best next canvas for {{goal}} and explain why.',
        controls: [
          {
            id: 'goal',
            label: isZh ? '项目目标' : 'Goal',
            options: [
              { label: isZh ? '用户理解' : 'Customer insight', value: isZh ? '用户理解' : 'customer understanding' },
              { label: isZh ? '价值主张' : 'Value proposition', value: isZh ? '价值主张' : 'value proposition' },
              { label: isZh ? '实验验证' : 'Testing', value: isZh ? '实验验证' : 'assumption testing' },
              { label: isZh ? '外部环境' : 'Environment', value: isZh ? '外部环境扫描' : 'business model environment scan' },
              { label: isZh ? '组合管理' : 'Portfolio', value: isZh ? '业务组合管理' : 'portfolio management' },
            ],
          },
        ],
      },
      {
        id: 'project-to-story',
        title: isZh ? '整理成项目故事' : 'Turn into a project story',
        description: isZh ? '把画布内容串成可阅读的战略叙事。' : 'Connect canvases into a readable strategy narrative.',
        template: isZh ? '请基于当前项目的画布和 story，帮我设计一篇「{{style}}」的项目故事大纲。' : 'Based on this project’s canvases and stories, draft an outline for a {{style}} project story.',
        controls: [
          {
            id: 'style',
            label: isZh ? '故事类型' : 'Story type',
            options: [
              { label: isZh ? '战略复盘' : 'Strategy review', value: isZh ? '战略复盘' : 'strategy review' },
              { label: isZh ? '案例教学' : 'Teaching case', value: isZh ? '案例教学' : 'teaching case' },
              { label: isZh ? '汇报提纲' : 'Presentation outline', value: isZh ? '汇报提纲' : 'presentation outline' },
            ],
          },
        ],
      },
      {
        id: 'project-experiments',
        title: isZh ? '找关键实验' : 'Find key experiments',
        description: isZh ? '把项目中的不确定性转成实验建议。' : 'Turn uncertainty into experiment recommendations.',
        template: isZh ? '请从当前项目里提炼「{{risk}}」相关的关键假设，并推荐 2-3 个适合的实验方法。' : 'Extract the key assumptions related to {{risk}} in this project and recommend 2-3 suitable experiments.',
        controls: [
          {
            id: 'risk',
            label: isZh ? '风险类型' : 'Risk type',
            options: [
              { label: isZh ? '用户想不想要' : 'Desirability', value: isZh ? '用户想不想要' : 'desirability' },
              { label: isZh ? '能否交付' : 'Feasibility', value: isZh ? '能否交付' : 'feasibility' },
              { label: isZh ? '能否赚钱' : 'Viability', value: isZh ? '能否赚钱' : 'viability' },
            ],
          },
        ],
      },
    ];
  }

  return [
    {
      id: 'study-attached',
      title: isZh ? '研究当前内容' : 'Study this item',
      description: isZh ? '用选定视角分析当前附带内容。' : 'Analyze the attached item through a selected lens.',
      template: isZh ? '请从「{{lens}}」角度分析当前内容，并推荐下一步应该看什么。' : 'Analyze the attached item through {{lens}} and recommend what to inspect next.',
      controls: [
        {
          id: 'lens',
          label: isZh ? '视角' : 'Lens',
          options: [
            { label: isZh ? '商业模式' : 'business model', value: isZh ? '商业模式' : 'business model' },
            { label: isZh ? '战略框架' : 'strategy framework', value: isZh ? '战略框架' : 'strategy framework' },
            { label: isZh ? '关键假设' : 'key assumptions', value: isZh ? '关键假设' : 'key assumptions' },
          ],
        },
      ],
    },
  ];
}

function buildStrategyLibraryStarterActions(
  isZh: boolean,
  lang: Lang,
  catalog?: LibraryStarterCatalog,
): StarterAction[] {
  const strategyOptions = uniqueStarterOptions(
    (catalog?.strategyFrameworks ?? []).map((item) => ({
      label: localizeLabel(item.name, lang),
      value: localizeLabel(item.name, lang),
    })),
    fallbackStrategyOptions(isZh),
  );
  const canvasOptions = uniqueStarterOptions(
    (catalog?.canvasDefs ?? []).map((item) => ({
      label: localizeLabel(item.name, lang),
      value: localizeLabel(item.name, lang),
    })),
    fallbackCanvasOptions(isZh),
  );
  const patternOptions = uniqueStarterOptions(
    (catalog?.patterns ?? []).map((item) => ({
      label: localizeLabel(item.name, lang),
      value: localizeLabel(item.name, lang),
    })),
    fallbackPatternOptions(isZh),
  );
  const experimentOptions = uniqueStarterOptions(
    (catalog?.experiments ?? []).map((item) => ({
      label: localizeLabel(item.name, lang),
      value: localizeLabel(item.name, lang),
    })),
    fallbackExperimentOptions(isZh),
  );

  return [
    {
      id: 'strategy-choice',
      title: isZh ? '战略选择' : 'Strategy choice',
      description: isZh ? '像填空一样选择一个战略框架。' : 'Choose a strategy framework like filling a blank.',
      template: isZh ? '我想了解「{{strategy}}」。请把策略库中的真实案例、参考阅读资料、相关画布分开展示，并给出学习顺序。注意：书籍/文章是参考阅读，不要放进案例列表。' : 'I want to understand {{strategy}}. Separate Strategy Library cases, reference readings, and related canvases, then give a learning order. Books/articles are reference readings, not cases.',
      tone: 'violet',
      controls: [
        {
          id: 'strategy',
          label: isZh ? '战略' : 'Strategy',
          prefix: isZh ? '我想了解' : 'I want to explore',
          suffix: isZh ? '这个战略' : 'as a strategy',
          options: strategyOptions,
          featuredCount: 5,
          searchable: true,
          searchPlaceholder: isZh ? '搜索战略框架…' : 'Search strategy frameworks…',
        },
      ],
    },
    {
      id: 'canvas-recommendation',
      title: isZh ? '画布推荐' : 'Canvas recommendation',
      description: isZh ? '选一张高价值画布，找最值得看的案例。' : 'Pick a valuable canvas and find strong examples.',
      template: isZh ? '我想重点学习「{{canvas}}」。请从策略库中推荐绘制最值得参考的案例，并说明每个案例最值得看的区块。' : 'I want to study {{canvas}}. Recommend the best Strategy Library examples and explain which blocks are most worth reading.',
      tone: 'cyan',
      controls: [
        {
          id: 'canvas',
          label: isZh ? '画布' : 'Canvas',
          prefix: isZh ? '我关注' : 'I care about',
          suffix: isZh ? '这张画布' : 'as a canvas',
          options: canvasOptions,
          featuredCount: 5,
          searchable: true,
          searchPlaceholder: isZh ? '搜索画布…' : 'Search canvases…',
        },
      ],
    },
    {
      id: 'case-inspiration',
      title: isZh ? '案例灵感' : 'Case inspiration',
      description: isZh ? '按主题找案例，再组合方法和画布。' : 'Find cases by theme, then combine methods and canvases.',
      template: isZh ? '请围绕「{{theme}}」帮我组合一条学习路径：先看哪些真实案例，再读哪些参考资料/书籍，再用哪个战略框架，最后画哪几张画布。注意不要把参考资料写成案例。' : 'Build a learning path for {{theme}}: which real cases to read first, which reference readings/books to read, which strategy framework to use, and which canvases to draw. Do not label resources as cases.',
      tone: 'amber',
      controls: [
        {
          id: 'theme',
          label: isZh ? '主题' : 'Theme',
          prefix: isZh ? '我想找' : 'Find me',
          suffix: isZh ? '相关案例' : 'cases',
          options: fallbackCaseThemeOptions(isZh),
          featuredCount: 5,
          searchable: true,
          searchPlaceholder: isZh ? '搜索主题…' : 'Search themes…',
        },
      ],
    },
    {
      id: 'business-model-pattern',
      title: isZh ? '商业模式' : 'Business model',
      description: isZh ? '选一个商业模式模式，学习机制和案例。' : 'Choose a business-model pattern and study mechanics plus cases.',
      template: isZh ? '我想学习「{{pattern}}」这个商业模式。请把策略库里最适合对照学习的真实案例、参考阅读资料、关键机制、相关画布分开展示，并给出阅读顺序。注意不要把书籍/文章写成案例。' : 'I want to study the {{pattern}} business model. Separate the best Strategy Library cases, reference readings, key mechanics, and related canvases, then give a reading order. Do not label books/articles as cases.',
      tone: 'emerald',
      controls: [
        {
          id: 'pattern',
          label: isZh ? '商业模式' : 'Business model',
          prefix: isZh ? '我想学习' : 'I want to study',
          suffix: isZh ? '这个商业模式' : 'as a business model',
          options: patternOptions,
          featuredCount: 5,
          searchable: true,
          searchPlaceholder: isZh ? '搜索商业模式…' : 'Search business models…',
        },
      ],
    },
    {
      id: 'experiment-method',
      title: isZh ? '实验方法' : 'Experiment method',
      description: isZh ? '选择一种实验，匹配假设和验证路径。' : 'Choose an experiment and match it to assumptions and evidence.',
      template: isZh ? '我想了解「{{experiment}}」这个实验方法。请说明它适合验证什么假设、需要什么准备、如何判断证据强度，并推荐可搭配的案例或画布。' : 'I want to understand the {{experiment}} experiment. Explain what assumptions it validates, what setup it needs, how to judge evidence strength, and which cases or canvases pair well with it.',
      tone: 'rose',
      controls: [
        {
          id: 'experiment',
          label: isZh ? '实验' : 'Experiment',
          prefix: isZh ? '我想了解' : 'I want to explore',
          suffix: isZh ? '这个实验' : 'as an experiment',
          options: experimentOptions,
          featuredCount: 5,
          searchable: true,
          searchPlaceholder: isZh ? '搜索实验…' : 'Search experiments…',
        },
      ],
    },
  ];
}

function localizeLabel(label: Record<Lang, string>, lang: Lang): string {
  return label[lang] || label.en || label.zh || '';
}

function uniqueStarterOptions(primary: StarterOption[], fallback: StarterOption[]): StarterOption[] {
  const seen = new Set<string>();
  const merged: StarterOption[] = [];
  for (const option of [...primary, ...fallback]) {
    const value = option.value.trim();
    const label = option.label.trim();
    if (!value || seen.has(value.toLowerCase())) continue;
    seen.add(value.toLowerCase());
    merged.push({ label, value });
  }
  return merged;
}

function fallbackStrategyOptions(isZh: boolean): StarterOption[] {
  return [
    { label: isZh ? '蓝海战略' : 'Blue Ocean', value: isZh ? '蓝海战略' : 'Blue Ocean Strategy' },
    { label: isZh ? '五力模型' : 'Five Forces', value: isZh ? '波特五力模型' : "Porter's Five Forces" },
    { label: isZh ? '三层增长' : 'Three Horizons', value: isZh ? '麦肯锡三层增长' : 'McKinsey Three Horizons' },
    { label: isZh ? '情景规划' : 'Scenario', value: isZh ? '情景规划' : 'Scenario Planning' },
    { label: isZh ? '组合管理' : 'Portfolio', value: isZh ? '业务组合管理' : 'Business Model Portfolio Management' },
  ];
}

function fallbackCanvasOptions(isZh: boolean): StarterOption[] {
  return [
    { label: 'BMC', value: 'Business Model Canvas' },
    { label: 'VPC', value: 'Value Proposition Canvas' },
    { label: isZh ? '组合地图' : 'Portfolio Map', value: 'Portfolio Map' },
    { label: isZh ? '战略画布' : 'Strategy Canvas', value: 'Strategy Canvas' },
    { label: isZh ? '实验画布' : 'Experiment Canvas', value: 'Experiment Canvas' },
  ];
}

function fallbackPatternOptions(isZh: boolean): StarterOption[] {
  return [
    { label: isZh ? '长尾模式' : 'Long Tail', value: isZh ? '长尾模式' : 'Long Tail' },
    { label: isZh ? '免费模式' : 'Free', value: isZh ? '免费模式' : 'Free' },
    { label: isZh ? '多边平台' : 'Multi-Sided Platforms', value: isZh ? '多边平台' : 'Multi-Sided Platforms' },
    { label: isZh ? '开放商业模式' : 'Open Business Models', value: isZh ? '开放商业模式' : 'Open Business Models' },
    { label: isZh ? '拆分模式' : 'Unbundling', value: isZh ? '拆分模式' : 'Unbundling Business Models' },
  ];
}

function fallbackExperimentOptions(isZh: boolean): StarterOption[] {
  return [
    { label: isZh ? '客户访谈' : 'Customer Interview', value: isZh ? '客户访谈' : 'Customer Interview' },
    { label: isZh ? '烟雾测试' : 'Smoke Test', value: isZh ? '烟雾测试' : 'Smoke Test' },
    { label: isZh ? '绿野仙踪' : 'Wizard of Oz', value: isZh ? '绿野仙踪实验' : 'Wizard of Oz' },
    { label: isZh ? '礼宾测试' : 'Concierge', value: isZh ? '礼宾测试' : 'Concierge' },
    { label: isZh ? '预售' : 'Pre-Sale', value: isZh ? '预售实验' : 'Pre-Sale' },
  ];
}

function fallbackCaseThemeOptions(isZh: boolean): StarterOption[] {
  return [
    { label: isZh ? '增长机会' : 'Growth', value: isZh ? '增长机会' : 'growth opportunities' },
    { label: isZh ? '客户价值' : 'Customer value', value: isZh ? '客户价值' : 'customer value' },
    { label: isZh ? '竞争差异化' : 'Differentiation', value: isZh ? '竞争差异化' : 'competitive differentiation' },
    { label: isZh ? '平台生态' : 'Platform', value: isZh ? '平台生态' : 'platform ecosystems' },
    { label: isZh ? '订阅/复购' : 'Recurring', value: isZh ? '订阅和复购' : 'recurring revenue' },
    { label: isZh ? '低成本创新' : 'Low-cost innovation', value: isZh ? '低成本创新' : 'low-cost innovation' },
    { label: isZh ? '服务体验' : 'Service experience', value: isZh ? '服务体验' : 'service experience' },
    { label: isZh ? '破坏式创新' : 'Disruption', value: isZh ? '破坏式创新' : 'disruptive innovation' },
  ];
}

function buildLibraryProjectStarterActions(isZh: boolean): StarterAction[] {
  return [
    {
      id: 'reference-industry-structure',
      title: isZh ? '理解行业结构' : 'Understand industry structure',
      tone: 'emerald',
      description: isZh
        ? '先看行业角色、价值链和压力来源。'
        : 'Start with industry roles, value chain, and pressure points.',
      template: isZh
        ? '请基于当前参考资料，围绕「{{focus}}」解释这个行业/案例的结构：主要角色、价值链位置、关键约束、正在变化的压力，以及这些变化为什么重要。'
        : 'Based on the current reference material, explain the industry/case structure around {{focus}}: key actors, value-chain positions, constraints, changing pressures, and why those changes matter.',
      controls: [
        {
          id: 'focus',
          label: isZh ? '分析重点' : 'Focus',
          options: [
            { label: isZh ? '行业角色' : 'Industry actors', value: isZh ? '行业角色' : 'industry actors' },
            { label: isZh ? '价值链变化' : 'Value-chain shifts', value: isZh ? '价值链变化' : 'value-chain shifts' },
            { label: isZh ? '竞争格局' : 'Competition', value: isZh ? '竞争格局' : 'competitive landscape' },
            { label: isZh ? '客户需求变化' : 'Customer shifts', value: isZh ? '客户需求变化' : 'customer shifts' },
          ],
        },
      ],
    },
    {
      id: 'reference-mechanism-reading',
      title: isZh ? '拆解案例机制' : 'Dissect the mechanism',
      tone: 'violet',
      description: isZh
        ? '把案例里的模式、取舍和因果链讲清。'
        : 'Clarify the pattern, trade-offs, and causal chain.',
      template: isZh
        ? '请用「{{lens}}」细读当前参考资料：它描述的核心机制是什么，关键取舍是什么，哪些画布区块或事实支撑这个判断，哪些地方还可能有另一种解释。'
        : 'Read the current reference through {{lens}}: what core mechanism does it describe, what trade-offs matter, which canvas blocks or facts support that reading, and where another interpretation may exist.',
      controls: [
        {
          id: 'lens',
          label: isZh ? '解读视角' : 'Lens',
          options: [
            { label: isZh ? '商业模式机制' : 'Business model mechanics', value: isZh ? '商业模式机制' : 'business model mechanics' },
            { label: isZh ? '战略取舍' : 'Strategic trade-offs', value: isZh ? '战略取舍' : 'strategic trade-offs' },
            { label: isZh ? '组织能力' : 'Capabilities', value: isZh ? '组织能力' : 'organizational capabilities' },
            { label: isZh ? '客户价值' : 'Customer value', value: isZh ? '客户价值' : 'customer value' },
          ],
        },
      ],
    },
    {
      id: 'reference-path-comparison',
      title: isZh ? '对比不同路径' : 'Compare paths',
      tone: 'amber',
      description: isZh
        ? '比较行业里不同公司或模式的选择。'
        : 'Compare choices across companies or models in the industry.',
      template: isZh
        ? '请围绕「{{dimension}}」对比当前参考资料里的不同路径：各自选择了什么、为什么这样选、代价是什么、适合什么条件、最终给读者留下什么判断。'
        : 'Compare the different paths in the current reference around {{dimension}}: what each path chooses, why, the cost, the conditions where it fits, and the judgment it leaves for the reader.',
      controls: [
        {
          id: 'dimension',
          label: isZh ? '对比维度' : 'Dimension',
          options: [
            { label: isZh ? '战略定位' : 'Strategic positioning', value: isZh ? '战略定位' : 'strategic positioning' },
            { label: isZh ? '能力边界' : 'Capability boundaries', value: isZh ? '能力边界' : 'capability boundaries' },
            { label: isZh ? '客户关系' : 'Customer relationship', value: isZh ? '客户关系' : 'customer relationship' },
            { label: isZh ? '风险与收益' : 'Risk and return', value: isZh ? '风险与收益' : 'risk and return' },
          ],
        },
      ],
    },
    {
      id: 'reference-source-checklist',
      title: isZh ? '补充资料清单' : 'Source checklist',
      tone: 'slate',
      description: isZh
        ? '列出理解它还需要核对的事实和资料。'
        : 'List facts and sources to verify for deeper understanding.',
      template: isZh
        ? '请基于当前参考资料，列出我还应该核对的 8-10 个问题，分成：行业事实、公司/案例事实、时间线、数据证据、需要外部资料确认。注意区分“资料中已经说明”和“需要另查”。'
        : 'Based on the current reference material, list 8-10 questions I should verify, grouped into industry facts, company/case facts, timeline, data evidence, and items needing external confirmation. Separate what the material already states from what needs more research.',
      controls: [],
    },
  ];
}

function renderStarterPrompt(action: StarterAction, values: Record<string, string>): string {
  return action.template.replace(/{{(\w+)}}/g, (_match, key: string) => values[key] ?? '');
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick(): void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex-1 border-b-2 py-2 text-[12px] font-medium transition ${
        active
          ? 'border-gray-900 text-gray-900'
          : 'border-transparent text-gray-500 hover:text-gray-800'
      }`}
    >
      {label}
    </button>
  );
}

function ChatPane({
  settingsOpen,
  onToggleSettings,
  attachedRef,
  messages,
  streaming,
  streamProgressIndex,
  error,
  input,
  pendingImages,
  fileInputRef,
  onInput,
  onSend,
  onStarterSend,
  onRemoveImage,
  onFileInputChange,
  onPaste,
  onDrop,
  onStop,
  onClear,
  listEndRef,
  cliAvailable,
  hasKey,
  starterActions,
  showStarterActions,
  suggestionsCollapsed,
  onToggleSuggestions,
  mode,
  allowProjectDrafts,
  lang,
  displayName,
  onNavigateToCanvas,
  basketItems,
  onRemoveBasketItem,
  onClearBasket,
  onMarkBasketUseful,
  onApplyBasketItem,
  onAddInsight,
  onApplyInsight,
}: {
  settingsOpen: boolean;
  onToggleSettings(): void;
  attachedRef: AttachedRef | null;
  messages: ConversationMessage[];
  streaming: boolean;
  streamProgressIndex: number;
  error: string | null;
  input: string;
  pendingImages: PendingImageAttachment[];
  fileInputRef: MutableRefObject<HTMLInputElement | null>;
  onInput(v: string): void;
  onSend(prompt?: string, options?: SendOptions): void;
  onStarterSend(prompt: string): void;
  onRemoveImage(id: string): void;
  onFileInputChange(files: FileList | null): void;
  onPaste(e: ClipboardEvent<HTMLTextAreaElement>): void;
  onDrop(e: DragEvent<HTMLDivElement>): void;
  onStop(): void;
  onClear(): void;
  listEndRef: MutableRefObject<HTMLDivElement | null>;
  cliAvailable: boolean | null;
  hasKey: boolean;
  starterActions: StarterAction[];
  showStarterActions: boolean;
  suggestionsCollapsed: boolean;
  onToggleSuggestions(): void;
  mode: CopilotMode;
  allowProjectDrafts: boolean;
  lang: Lang;
  displayName: string;
  onNavigateToCanvas(): void;
  basketItems: CopilotSessionInsightItem[];
  onRemoveBasketItem(id: string): void;
  onClearBasket(): void;
  onMarkBasketUseful(id: string, useful: boolean): void;
  onApplyBasketItem(item: CopilotSessionInsightItem): void;
  onAddInsight(insight: CopilotDiscussionInsight, sourceMessageId?: string): CopilotSessionInsightItem;
  onApplyInsight(insight: CopilotDiscussionInsight, sourceMessageId?: string): void;
}) {
  const { t } = useTranslation();
  const composerActions = buildComposerQuickActions(attachedRef, mode);
  const composerPlaceholder = `${t(`library.copilot.modeHints.${mode}.hint`)}\n${t(`library.copilot.modeHints.${mode}.placeholder`)}`;

  function handleComposerAction(action: ComposerQuickAction) {
    const actionPrompt = t(`library.copilot.composerPrompts.${action.promptKey}`);
    const prompt = input.trim() ? `${input.trim()}\n\n${actionPrompt}` : actionPrompt;
    onSend(prompt, {
      forceContext: true,
      ...(action.includePendingImages ? { includePendingImages: true } : {}),
      ...(action.intent ? { intent: action.intent } : {}),
    });
  }

  return (
    <>
      {/* Settings sheet (optional, pinned at top of chat pane) */}
      {settingsOpen && <CopilotChatSettings onClose={() => onToggleSettings()} />}

      {/* Status + actions row */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-1.5 text-[11px]">
        <span className="text-gray-500">
          {cliAvailable === false ? (
            <span className="text-amber-700">⚠ {t('library.copilot.cliMissing')}</span>
          ) : hasKey ? (
            <span className="text-emerald-700">✓ Kimi Code</span>
          ) : (
            <span className="text-gray-500">— {t('library.copilot.noKeyConfigured')}</span>
          )}
        </span>
        <span className="flex items-center gap-1">
          <button
            type="button"
            onClick={onClear}
            className="rounded-md px-2 py-1 text-gray-400 hover:bg-gray-100 hover:text-gray-800"
            title={t('library.copilot.clearChat')}
          >
            🗑
          </button>
          <button
            type="button"
            onClick={onToggleSettings}
            className="rounded-md px-2 py-1 text-gray-400 hover:bg-gray-100 hover:text-gray-800"
            title={t('library.copilot.settingsButton')}
            aria-pressed={settingsOpen}
          >
            ⚙
          </button>
        </span>
      </div>

      {/* Project/reference context + suggested questions */}
      <div className="border-b border-gray-200 bg-white px-4 py-2 text-[11px] shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 text-gray-500">{t(contextSourceKey(mode))}:</span>
            <span className="truncate rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 font-medium text-emerald-800">
              {attachedRef ? attachedRefLabel(attachedRef) : t('library.copilot.strategyLibraryContext')}
            </span>
          </div>
          {hasKey && showStarterActions && starterActions.length > 0 && (
            <button
              type="button"
              onClick={onToggleSuggestions}
              className="flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              aria-expanded={!suggestionsCollapsed}
            >
              <span>{t('library.copilot.suggestions.title')}</span>
              <span className="text-gray-400">·</span>
              <span>{suggestionsCollapsed ? t('library.copilot.suggestions.expand') : t('library.copilot.suggestions.collapse')}</span>
            </button>
          )}
        </div>
        {hasKey && showStarterActions && starterActions.length > 0 && !suggestionsCollapsed && (
          <div className="mt-2">
            <StarterActionList
              actions={starterActions}
              disabled={streaming || cliAvailable === false}
              onSend={onStarterSend}
            />
          </div>
        )}
      </div>

      {basketItems.length > 0 && (
        <CopilotSessionInsightBasket
          items={basketItems}
          onRemove={onRemoveBasketItem}
          onClear={onClearBasket}
          onMarkUseful={onMarkBasketUseful}
          onApply={onApplyBasketItem}
        />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-white px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex min-h-24 items-center justify-center px-3 py-6 text-center text-[12px] text-gray-400">
            {hasKey ? t('library.copilot.emptyStateCompact') : t('library.copilot.emptyStateNoKey')}
          </div>
        ) : (
          <ul className="space-y-3">
            {messages.map((m, index) => (
              <MessageBubble
                key={m.id}
                message={m}
                streaming={streaming && index === messages.length - 1}
                progressIndex={streamProgressIndex}
                allowProjectDrafts={allowProjectDrafts}
                lang={lang}
                displayName={displayName}
                attachedRef={attachedRef}
                onNavigateToCanvas={onNavigateToCanvas}
                basketItems={basketItems}
                onAddInsight={onAddInsight}
                onApplyInsight={onApplyInsight}
              />
            ))}
          </ul>
        )}
        <div ref={listEndRef} />
      </div>

      {error && (
        <div className="border-t border-red-100 bg-red-50/60 px-4 py-2 text-[11px] text-red-700">
          {t('library.copilot.errorPrefix')}: {error}
        </div>
      )}

      {/* Composer */}
      <div
        className="border-t border-gray-100 bg-white px-3 py-3"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        <CopilotImageAttachmentGrid
          images={pendingImages}
          variant="composer"
          maxImages={MAX_IMAGE_ATTACHMENTS}
          disabled={streaming}
          onRemove={onRemoveImage}
        />
        <textarea
          value={input}
          onChange={(e) => onInput(e.target.value)}
          onPaste={onPaste}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void onSend();
            }
          }}
          rows={4}
          disabled={streaming}
          placeholder={composerPlaceholder}
          className="block w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm leading-relaxed text-gray-900 focus:border-gray-400 focus:outline-none disabled:opacity-50"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(',')}
          multiple
          className="hidden"
          onChange={(e) => {
            onFileInputChange(e.target.files);
            e.currentTarget.value = '';
          }}
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[11px] text-gray-400">
              {pendingImages.length > 0
                ? pendingImages.length >= MAX_IMAGE_ATTACHMENTS
                  ? t('library.copilot.imageTrayFull')
                  : t('library.copilot.imageTrayRemaining', { remaining: MAX_IMAGE_ATTACHMENTS - pendingImages.length })
                : t('library.copilot.attachImageHint')}
            </span>
          </div>
          {streaming ? (
            <button
              type="button"
              onClick={onStop}
              className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
            >
              ◼ {t('library.copilot.stop')}
            </button>
          ) : (
            <div className="flex flex-wrap justify-end gap-1.5">
              <button
                type="button"
                onClick={() => onSend()}
                disabled={(!input.trim() && pendingImages.length === 0) || !hasKey || cliAvailable === false}
                className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ➤ {t('library.copilot.send')}
              </button>
              {composerActions.map((action) => (
                <button
                  key={action.labelKey}
                  type="button"
                  onClick={() => handleComposerAction(action)}
                  disabled={!hasKey || cliAvailable === false}
                  className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ➤ {t(`library.copilot.composerActions.${action.labelKey}`)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function StarterActionList({
  actions,
  disabled,
  onSend,
}: {
  actions: StarterAction[];
  disabled: boolean;
  onSend(prompt: string): void;
}) {
  return (
    <div className="-mx-1 overflow-x-auto pb-1">
      <div className="flex snap-x snap-mandatory gap-2 px-1">
        {actions.map((action) => (
          <StarterActionCard
            key={action.id}
            action={action}
            disabled={disabled}
            onSend={onSend}
          />
        ))}
      </div>
    </div>
  );
}

function StarterActionCard({
  action,
  disabled,
  onSend,
}: {
  action: StarterAction;
  disabled: boolean;
  onSend(prompt: string): void;
}) {
  const { t } = useTranslation();
  const initial = Object.fromEntries(
    action.controls.map((control) => [control.id, control.options[0]?.value ?? '']),
  );
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [pickerControlId, setPickerControlId] = useState<string | null>(null);
  const prompt = renderStarterPrompt(action, values);
  const tone = starterTone(action.tone ?? 'slate');
  const pickerControl = action.controls.find((control) => control.id === pickerControlId) ?? null;

  return (
    <div className={`min-w-[260px] snap-start rounded-xl border p-2.5 text-left shadow-sm ${tone.card}`}>
      <div className={`text-[12px] font-semibold ${tone.title}`}>{action.title}</div>
      <div className={`mt-0.5 truncate text-[11px] ${tone.desc}`}>{action.description}</div>
      {action.controls.length > 0 && (
        <div className="mt-2 space-y-2">
          {action.controls.map((control) => {
            const hasPreview = Boolean(control.prefix || control.suffix);
            const featuredCount = control.featuredCount ?? 5;
            const visibleOptions = withSelectedOption(
              control.options.slice(0, featuredCount),
              control.options,
              values[control.id],
            );
            const hiddenCount = Math.max(0, control.options.length - featuredCount);
            const canOpenPicker = control.options.length > featuredCount;

            return (
              <div key={control.id} className="rounded-lg border border-white/70 bg-white/45 p-2">
                <div className="flex items-center justify-between gap-2">
                  <div className={`text-[10px] font-medium uppercase tracking-wide ${tone.meta}`}>
                    {control.label}
                  </div>
                  {canOpenPicker && (
                    <button
                      type="button"
                      onClick={() => setPickerControlId(control.id)}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${tone.chip}`}
                    >
                      {t('library.copilot.chooseMoreOptions', { count: hiddenCount })}
                    </button>
                  )}
                </div>
                {hasPreview && (
                  <div className={`mt-1 rounded-md border border-gray-200/70 bg-white/80 px-2 py-1.5 text-[10px] ${tone.desc}`}>
                    {control.prefix}{' '}
                    <span className={tone.title}>{values[control.id] ?? ''}</span>{' '}
                    {control.suffix}
                  </div>
                )}
                <div className={`${hasPreview ? 'mt-1.5 border-t border-gray-200/70 pt-1.5' : 'mt-1.5'} flex flex-wrap gap-1`}>
                  {visibleOptions.map((option) => {
                    const selected = values[control.id] === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setValues((prev) => ({ ...prev, [control.id]: option.value }))}
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-medium transition ${
                          selected ? tone.selectedChip : tone.chip
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSend(prompt)}
        className={`mt-2 w-full rounded-lg px-3 py-1 text-[12px] font-medium text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${tone.button}`}
      >
        {t('library.copilot.startAction')}
      </button>
      {pickerControl && (
        <StarterOptionPicker
          control={pickerControl}
          selectedValue={values[pickerControl.id]}
          tone={tone}
          onSelect={(value) => {
            setValues((prev) => ({ ...prev, [pickerControl.id]: value }));
            setPickerControlId(null);
          }}
          onClose={() => setPickerControlId(null)}
        />
      )}
    </div>
  );
}

function StarterOptionPicker({
  control,
  selectedValue,
  tone,
  onSelect,
  onClose,
}: {
  control: StarterControl;
  selectedValue: string | undefined;
  tone: ReturnType<typeof starterTone>;
  onSelect(value: string): void;
  onClose(): void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const filteredOptions = q
    ? control.options.filter((option) => `${option.label} ${option.value}`.toLowerCase().includes(q))
    : control.options;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-gray-950/35 px-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{t('library.copilot.optionPickerTitle', { label: control.label })}</h3>
            <p className="mt-0.5 text-[11px] text-gray-500">{t('library.copilot.optionPickerSubtitle')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('library.copilot.optionPickerClose')}
            className="rounded-full px-2 py-1 text-lg leading-none text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            ×
          </button>
        </div>
        <input
          type="search"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          placeholder={control.searchPlaceholder ?? t('library.copilot.searchOptions')}
          className="mt-3 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400"
        />
        <div className="mt-3 max-h-72 overflow-y-auto rounded-xl border border-gray-100 bg-gray-50/70 p-2">
          {filteredOptions.length === 0 ? (
            <div className="px-2 py-8 text-center text-xs text-gray-400">{t('library.copilot.noOptions')}</div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {filteredOptions.map((option) => {
                const selected = selectedValue === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onSelect(option.value)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                      selected ? tone.selectedChip : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function withSelectedOption(
  visible: StarterOption[],
  all: StarterOption[],
  selectedValue: string | undefined,
): StarterOption[] {
  if (!selectedValue || visible.some((option) => option.value === selectedValue)) return visible;
  const selected = all.find((option) => option.value === selectedValue);
  return selected ? [selected, ...visible] : visible;
}

function starterTone(tone: StarterTone): {
  card: string;
  title: string;
  desc: string;
  meta: string;
  chip: string;
  selectedChip: string;
  button: string;
} {
  switch (tone) {
    case 'violet':
      return {
        card: 'border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50',
        title: 'text-violet-950',
        desc: 'text-violet-700',
        meta: 'text-violet-400',
        chip: 'border-violet-200 bg-white/70 text-violet-700 hover:bg-white',
        selectedChip: SELECTED_CHIP_CLASS,
        button: 'bg-violet-700 hover:bg-violet-800',
      };
    case 'rose':
      return {
        card: 'border-rose-200 bg-gradient-to-br from-rose-50 to-pink-50',
        title: 'text-rose-950',
        desc: 'text-rose-700',
        meta: 'text-rose-400',
        chip: 'border-rose-200 bg-white/70 text-rose-700 hover:bg-white',
        selectedChip: SELECTED_CHIP_CLASS,
        button: 'bg-rose-700 hover:bg-rose-800',
      };
    case 'cyan':
      return {
        card: 'border-cyan-200 bg-gradient-to-br from-cyan-50 to-sky-50',
        title: 'text-cyan-950',
        desc: 'text-cyan-700',
        meta: 'text-cyan-400',
        chip: 'border-cyan-200 bg-white/70 text-cyan-700 hover:bg-white',
        selectedChip: SELECTED_CHIP_CLASS,
        button: 'bg-cyan-700 hover:bg-cyan-800',
      };
    case 'amber':
      return {
        card: 'border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50',
        title: 'text-amber-950',
        desc: 'text-amber-700',
        meta: 'text-amber-500',
        chip: 'border-amber-200 bg-white/70 text-amber-800 hover:bg-white',
        selectedChip: SELECTED_CHIP_CLASS,
        button: 'bg-amber-700 hover:bg-amber-800',
      };
    case 'emerald':
      return {
        card: 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50',
        title: 'text-emerald-950',
        desc: 'text-emerald-700',
        meta: 'text-emerald-500',
        chip: 'border-emerald-200 bg-white/70 text-emerald-700 hover:bg-white',
        selectedChip: SELECTED_CHIP_CLASS,
        button: 'bg-emerald-700 hover:bg-emerald-800',
      };
    case 'slate':
    default:
      return {
        card: 'border-slate-200 bg-gradient-to-br from-slate-50 to-gray-50',
        title: 'text-slate-950',
        desc: 'text-slate-600',
        meta: 'text-slate-400',
        chip: 'border-slate-200 bg-white/70 text-slate-700 hover:bg-white',
        selectedChip: SELECTED_CHIP_CLASS,
        button: 'bg-slate-800 hover:bg-slate-900',
      };
  }
}

function MessageBubble({
  message,
  streaming,
  progressIndex,
  allowProjectDrafts,
  lang,
  displayName,
  attachedRef,
  onNavigateToCanvas,
  basketItems,
  onAddInsight,
  onApplyInsight,
}: {
  message: ConversationMessage;
  streaming: boolean;
  progressIndex: number;
  allowProjectDrafts: boolean;
  lang: Lang;
  displayName: string;
  attachedRef: AttachedRef | null;
  onNavigateToCanvas(): void;
  basketItems: CopilotSessionInsightItem[];
  onAddInsight(insight: CopilotDiscussionInsight, sourceMessageId?: string): CopilotSessionInsightItem;
  onApplyInsight(insight: CopilotDiscussionInsight, sourceMessageId?: string): void;
}) {
  const { t } = useTranslation();
  const isUser = message.role === 'user';
  const isEmptyAssistant = message.role === 'assistant' && message.content.length === 0;
  const projectDrafts = isUser ? [] : extractProjectDrafts(message.content);
  const projectUpdateDrafts = isUser ? [] : extractProjectUpdateDrafts(message.content);
  const discussionInsights = isUser ? [] : extractDiscussionInsights(message.content);
  const hasStructuredBlocks = projectDrafts.length > 0 || projectUpdateDrafts.length > 0 || discussionInsights.length > 0;
  const visibleContent = hasStructuredBlocks ? stripProjectDraftBlocks(message.content) : message.content;
  const recommendationRefs = useCopilotRecommendationReferences(
    isUser ? '' : visibleContent,
    displayName,
    lang,
    message.attachedRef ?? attachedRef,
  );
  const { canvasRefs, caseRefs, resourceRefs, unresolvedCaseSlugs, unresolvedCanvasLabels } = recommendationRefs;
  const contentWithoutCanvasIds = canvasRefs.length > 0
    ? stripResolvedCanvasIds(visibleContent, canvasRefs)
    : visibleContent;
  const contentForRender = caseRefs.length > 0
    ? stripResolvedCaseSlugs(contentWithoutCanvasIds, caseRefs)
    : contentWithoutCanvasIds;
  const visibleProjectDrafts = allowProjectDrafts ? projectDrafts : [];
  const activeRef = message.attachedRef ?? attachedRef;
  const activeProjectId = projectIdFromAttachedRef(activeRef);
  const visibleProjectUpdateDrafts = projectUpdateDrafts.filter((draft) => Boolean(draft.projectId || activeProjectId));

  return (
    <li className={`flex min-w-0 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`${isUser ? 'max-w-[88%]' : 'min-w-0 max-w-[96%] overflow-hidden'} rounded-2xl px-3 py-2 text-[13px] leading-relaxed ${
          isUser
            ? 'bg-gray-900 text-white'
            : 'border border-gray-100 bg-gray-50 text-gray-900'
        }`}
      >
        {isEmptyAssistant && streaming ? (
          <CopilotStreamingProgress progressIndex={progressIndex} />
        ) : isUser ? (
          <div className="space-y-2">
            <span style={{ whiteSpace: 'pre-wrap' }}>{message.content}</span>
            {message.imageAttachments && message.imageAttachments.length > 0 && (
              <CopilotImageAttachmentGrid
                images={message.imageAttachments}
                variant="message"
                maxImages={MAX_IMAGE_ATTACHMENTS}
              />
            )}
          </div>
        ) : (
          <>
            {contentForRender && (
              streaming ? <CopilotStreamingText content={contentForRender} /> : <CopilotMarkdown content={contentForRender} />
            )}
            <CopilotCaseReferenceBoard refs={caseRefs} onNavigateToCanvas={onNavigateToCanvas} />
            <CopilotResourceReferenceBoard refs={resourceRefs} />
            <CopilotCanvasReferenceBoard
              refs={canvasRefs}
              lang={lang}
              displayName={displayName}
              onNavigateToCanvas={onNavigateToCanvas}
            />
            <CopilotReferenceResolutionHint
              caseSlugs={unresolvedCaseSlugs}
              canvasLabels={unresolvedCanvasLabels}
            />
            {discussionInsights.map((insight, index) => {
              const added = basketItems.some((item) => item.insight.title === insight.title && item.insight.summary === insight.summary);
              return (
                <CopilotDiscussionInsightCard
                  key={`${insight.title}:${index}`}
                  insight={insight}
                  added={added}
                  onAdd={() => onAddInsight(insight, message.id)}
                  onApply={() => onApplyInsight(insight, message.id)}
                />
              );
            })}
            {visibleProjectDrafts.map((draft, index) => (
              <CopilotProjectDraftCard
                key={`${draft.project.name}:${index}`}
                draft={draft}
                lang={lang}
                expectedSourceImageCount={message.expectedSourceImageCount}
              />
            ))}
            {visibleProjectUpdateDrafts.map((draft, index) => (
              <CopilotProjectUpdateDraftCard
                key={`${draft.projectId}:${index}`}
                draft={draft}
                projectId={draft.projectId || activeProjectId}
                lang={lang}
                expectedSourceImageCount={message.expectedSourceImageCount}
                updateBaseline={message.updateBaseline}
              />
            ))}
          </>
        )}
      </div>
    </li>
  );
}

function CopilotStreamingProgress({ progressIndex }: { progressIndex: number }) {
  const { t } = useTranslation();
  const activeIndex = Math.max(0, Math.min(progressIndex, COPILOT_PROGRESS_STEP_COUNT - 1));
  return (
    <div className="min-w-0 space-y-2">
      {Array.from({ length: activeIndex + 1 }, (_, index) => (
        <div
          key={index}
          className={`rounded-xl border px-3 py-2 ${
            index === activeIndex
              ? 'border-emerald-100 bg-white text-gray-700 shadow-sm'
              : 'border-gray-100 bg-white/70 text-gray-500'
          }`}
        >
          <ThinkingIndicator label={t(`library.copilot.progress.${index}`)} />
        </div>
      ))}
    </div>
  );
}

function ThinkingIndicator({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-gray-500">
      <span className="relative flex h-2.5 w-8 items-center justify-between">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.2s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.1s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" />
      </span>
      <span className="text-[12px] italic">{label}</span>
    </span>
  );
}

function CopilotStreamingText({ content }: { content: string }) {
  const blocks = splitStreamingBlocks(content);
  return (
    <div className="min-w-0 space-y-2 break-words text-[13px] leading-relaxed text-gray-900">
      {blocks.map((block, index) => (
        <p key={`${index}:${block.slice(0, 16)}`} className="whitespace-pre-wrap rounded-xl bg-white/70 px-2.5 py-2">
          {block}
        </p>
      ))}
    </div>
  );
}

function CopilotMarkdown({ content }: { content: string }) {
  const openLightbox = useLightbox((s) => s.open);
  const normalizedContent = normalizeOrderedListMarkers(content);

  return (
    <div className="min-w-0 max-w-none overflow-hidden break-words text-[13px] leading-relaxed text-gray-900">
      <ReactMarkdown
        remarkPlugins={COPILOT_REMARK_PLUGINS}
        components={{
          h1: ({ children }) => (
            <h3 className="mt-3 mb-2 border-b border-gray-200 pb-1 text-base font-bold text-gray-950 first:mt-0">
              {children}
            </h3>
          ),
          h2: ({ children }) => (
            <h4 className="mt-4 mb-2 text-[14px] font-bold text-gray-950 first:mt-0">
              {children}
            </h4>
          ),
          h3: ({ children }) => (
            <h5 className="mt-3 mb-1.5 text-[13px] font-semibold text-gray-950 first:mt-0">
              {children}
            </h5>
          ),
          p: ({ children }) => <p className="my-1.5 break-words leading-relaxed">{children}</p>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-emerald-700 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-900"
            >
              {children}
            </a>
          ),
          ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
          li: ({ children }) => <li className="pl-0.5 leading-relaxed marker:text-gray-400">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="my-3 rounded-lg border-l-4 border-emerald-300 bg-emerald-50/70 px-3 py-2 text-[12px] text-emerald-950">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-4 border-gray-200" />,
          table: ({ children }) => (
            <div className="my-3 w-full max-w-full overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
              <table className="min-w-full border-collapse text-left text-[12px] leading-relaxed">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-gray-100 text-gray-900">{children}</thead>,
          tbody: ({ children }) => <tbody className="divide-y divide-gray-100">{children}</tbody>,
          tr: ({ children }) => <tr className="align-top even:bg-gray-50/50">{children}</tr>,
          th: ({ children }) => (
            <th className="whitespace-nowrap border-r border-gray-200 px-3 py-2 font-semibold last:border-r-0">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="min-w-[120px] break-words border-r border-gray-100 px-3 py-2 text-gray-700 last:border-r-0">
              {children}
            </td>
          ),
          pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
          code: ({ className, children }) => (
            <code className={`${className ?? ''} rounded bg-gray-100 px-1 py-0.5 font-mono text-[12px] text-gray-900`}>
              {children}
            </code>
          ),
          img: ({ src, alt }) => {
            const imageSrc = typeof src === 'string' ? src : '';
            return (
              <button
                type="button"
                onClick={() => imageSrc && openLightbox(imageSrc, alt ?? '')}
                className="my-3 block max-w-full overflow-hidden rounded-xl border border-gray-200 bg-white p-1 shadow-sm"
              >
                <img src={imageSrc} alt={alt ?? ''} className="max-h-64 max-w-full rounded-lg object-contain" />
              </button>
            );
          },
        }}
      >
        {normalizedContent}
      </ReactMarkdown>
    </div>
  );
}

function normalizeOrderedListMarkers(content: string): string {
  const lines = content.split('\n');
  let inFence = false;
  let activeCounter = 0;

  return lines.map((line) => {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      return line;
    }
    if (inFence) return line;

    const ordered = /^(\s{0,3})(\d+)([.)])(\s+)/.exec(line);
    if (ordered) {
      activeCounter = activeCounter > 0 ? activeCounter + 1 : 1;
      return `${ordered[1]}${activeCounter}${ordered[3]}${ordered[4]}${line.slice(ordered[0].length)}`;
    }

    const trimmed = line.trim();
    if (/^\s{0,3}#{1,6}\s+/.test(line)) activeCounter = 0;
    if (trimmed && !/^\s{0,3}[-*+]\s+/.test(line) && !/^\s{4,}/.test(line)) {
      activeCounter = 0;
    }
    return line;
  }).join('\n');
}

function CodeBlock({ children }: { children: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const text = extractText(children).trimEnd();

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      window.prompt('Copy:', text);
    }
  }

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-gray-200 bg-gray-950 shadow-sm">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5 text-[10px] text-gray-400">
        <span>code</span>
        <button type="button" onClick={copy} className="rounded px-2 py-0.5 hover:bg-white/10 hover:text-white">
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="max-w-full overflow-x-auto px-3 py-2 text-[12px] leading-relaxed text-gray-100">
        {children}
      </pre>
    </div>
  );
}

function extractText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (isValidElement<{ children?: ReactNode }>(node)) return extractText(node.props.children);
  return '';
}

async function readImageAttachment(file: File): Promise<PendingImageAttachment> {
  const mimeType = file.type as CopilotImageAttachment['mimeType'];
  const dataUrl = await readFileAsDataUrl(file);
  const previewDataUrl = await createImagePreview(dataUrl, mimeType);
  return {
    id: newAttachmentId(),
    name: file.name,
    mimeType,
    sizeBytes: file.size,
    dataUrl,
    previewDataUrl,
  };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('FileReader returned an empty result'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read image'));
    reader.readAsDataURL(file);
  });
}

function createImagePreview(dataUrl: string, _mimeType: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      const maxSides = [640, 520, 420, 320, 240];
      const qualities = [0.72, 0.62, 0.52];
      for (const maxSide of maxSides) {
        const ratio = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
        const width = Math.max(1, Math.round(img.naturalWidth * ratio));
        const height = Math.max(1, Math.round(img.naturalHeight * ratio));
        canvas.width = width;
        canvas.height = height;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        for (const quality of qualities) {
          const compressed = canvas.toDataURL('image/jpeg', quality);
          if (dataUrlByteLength(compressed) <= PREVIEW_IMAGE_MAX_BYTES) {
            resolve(compressed);
            return;
          }
        }
      }
      resolve(canvas.toDataURL('image/jpeg', 0.46));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function toCopilotImageAttachment(image: PendingImageAttachment): CopilotImageAttachment {
  return {
    id: image.id,
    name: image.name,
    mimeType: image.mimeType,
    sizeBytes: image.sizeBytes,
    dataUrl: image.dataUrl,
  };
}

function toConversationImageAttachment(image: PendingImageAttachment): ConversationImageAttachment {
  return {
    id: image.id,
    name: image.name,
    mimeType: image.mimeType,
    sizeBytes: image.sizeBytes,
    previewDataUrl: image.previewDataUrl,
  };
}

function dataUrlByteLength(dataUrl: string): number {
  const base64 = dataUrl.split(',', 2)[1] ?? '';
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

function newAttachmentId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
