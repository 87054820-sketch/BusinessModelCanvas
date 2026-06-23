import {
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type MutableRefObject,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkCjkFriendly from 'remark-cjk-friendly';
import remarkGfm from 'remark-gfm';
import type { CopilotImageAttachment, Lang } from '@pingarden/shared';
import { copilotApi } from '../api/copilot';
import { useKeyConfig } from '../copilot/useKeyConfig';
import {
  useConversation,
  type AttachedRef,
  type ConversationImageAttachment,
  type ConversationMessage,
} from '../copilot/useConversation';
import { useIdentity } from '../identity/useIdentity';
import {
  extractProjectDrafts,
  stripProjectDraftBlocks,
} from '../copilot/projectDraft';
import { useLightbox } from '../state/lightbox';
import { CopilotChatSettings } from './CopilotChatSettings';
import {
  CopilotCanvasReferenceBoard,
  CopilotCaseReferenceBoard,
  CopilotReferenceResolutionHint,
  stripResolvedCanvasIds,
  stripResolvedCaseSlugs,
  useCopilotRecommendationReferences,
} from './CopilotCanvasReferenceBoard';
import { CopilotProjectDraftCard } from './CopilotProjectDraftCard';
import { SkillPackPane } from './SkillPackPane';

interface Props {
  open: boolean;
  onClose(): void;
  onNavigateToCanvas?: () => void;
  attachedRef: AttachedRef | null;
  lang: Lang;
}

type ActiveTab = 'chat' | 'skillPack';
type CopilotMode = 'createProject' | 'libraryReference' | 'projectWork';
type ComposerQuickAction = {
  labelKey: string;
  promptKey: string;
  intent?: 'project-draft';
  includePendingImages?: boolean;
};
type StarterTone = 'violet' | 'rose' | 'cyan' | 'amber' | 'emerald' | 'slate';
type StarterControl = {
  id: string;
  label: string;
  prefix?: string;
  suffix?: string;
  options: Array<{ label: string; value: string }>;
};
type StarterAction = {
  id: string;
  title: string;
  description: string;
  template: string;
  controls: StarterControl[];
  tone?: StarterTone;
};
type SendOptions = { forceContext?: boolean; includePendingImages?: boolean; intent?: 'project-draft' };
type PendingImageAttachment = CopilotImageAttachment & { previewDataUrl: string };
const TAB_STORAGE_KEY = 'pingarden.copilot.activeTab';
const COPILOT_REMARK_PLUGINS = [remarkCjkFriendly, remarkGfm];
const SELECTED_CHIP_CLASS = 'border-gray-300 bg-gray-900 text-white shadow-sm ring-1 ring-gray-300';
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const;
const MAX_IMAGE_ATTACHMENTS = 2;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const PROMPT_IMAGE_MAX_BYTES = 64 * 1024;

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
}: Props) {
  const { t } = useTranslation();
  const { identity } = useIdentity();
  const config = useKeyConfig();
  const conv = useConversation(identity?.displayName);

  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    if (typeof localStorage === 'undefined') return 'chat';
    const stored = localStorage.getItem(TAB_STORAGE_KEY);
    return stored === 'skillPack' ? 'skillPack' : 'chat';
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [pendingImages, setPendingImages] = useState<PendingImageAttachment[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cliAvailable, setCliAvailable] = useState<boolean | null>(null);
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);
  const [suggestionsCollapsed, setSuggestionsCollapsed] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);
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

  // Auto-scroll on new messages / streaming deltas.
  useEffect(() => {
    if (!open || activeTab !== 'chat') return;
    listEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [open, activeTab, conv.messages.length, streaming]);

  // Cleanup in-flight stream on unmount.
  useEffect(
    () => () => {
      stopRef.current?.();
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
    () => buildStarterActions(attachedRef, lang),
    [attachedRef, lang],
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

  async function handleAddImageFiles(files: FileList | File[]) {
    if (streaming) return;
    const candidates = Array.from(files).filter((file) => file.type.startsWith('image/'));
    if (candidates.length === 0) return;

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
    setPendingImages((prev) => [...prev, ...next]);
  }

  function handleRemoveImage(id: string) {
    setPendingImages((prev) => prev.filter((item) => item.id !== id));
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

  async function handleSend(overridePrompt?: string, options?: SendOptions) {
    const trimmed = (overridePrompt ?? input).trim();
    const imagesForTurn = overridePrompt && !options?.includePendingImages ? [] : pendingImages;
    const isImageOnlyProjectCreation =
      attachedRef === null && !overridePrompt && copilotMode === 'createProject' && !trimmed && imagesForTurn.length > 0;
    const inferredIntent = options?.intent ?? (isImageOnlyProjectCreation ? 'project-draft' : undefined);
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

    let contextMd: string | undefined;
    const shouldFetchContext =
      inferredIntent === 'project-draft' && attachedRef === null
        ? false
        : options?.forceContext === true || attachedRef === null || isFirstTurnWithThisAttached;
    if (shouldFetchContext) {
      try {
        const result = await fetchAttachedContext(attachedRef, lang);
        contextMd = result.markdown;
      } catch {
        contextMd = undefined;
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
    });

    setStreaming(true);
    const stop = copilotApi.streamChat(
      {
        apiKey,
        messages: outbound,
        ...(contextMd ? { attachedContext: contextMd } : {}),
        ...(inferredIntent ? { intent: inferredIntent } : {}),
      },
      {
        onDelta: (delta) => {
          conv.updateLast((msg) => ({ ...msg, content: msg.content + delta }));
        },
        onDone: () => {
          setStreaming(false);
          stopRef.current = null;
        },
        onError: (message) => {
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
    setStreaming(false);
  }

  function handleClear() {
    if (!window.confirm(t('library.copilot.clearChatConfirm'))) return;
    handleStop();
    conv.clear();
    setError(null);
  }

  function handleNavigateToCanvas() {
    onNavigateToCanvas?.();
    onClose();
  }

  if (!open) return null;

  return (
    <aside
      role="complementary"
      aria-label={t('library.copilot.drawerTitle')}
      className="fixed right-0 top-0 z-[90] flex h-full w-full max-w-[420px] flex-col border-l border-gray-200 bg-white shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">
          {t('library.copilot.drawerTitle')}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-7 w-7 items-center justify-center rounded-full text-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        >
          ×
        </button>
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

      {activeTab === 'chat' ? (
        <ChatPane
          settingsOpen={settingsOpen}
          onToggleSettings={() => setSettingsOpen((v) => !v)}
          attachedRef={attachedRef}
          messages={conv.messages}
          streaming={streaming}
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
        />
      ) : (
        <div className="flex-1 overflow-y-auto">
          <SkillPackPane />
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

function allowProjectDraftCards(ref: AttachedRef | null): boolean {
  return ref === null || ref.type === 'case' || ref.type === 'pattern' || isLibraryProjectRef(ref);
}

function deriveCopilotMode(ref: AttachedRef | null): CopilotMode {
  if (ref === null) return 'createProject';
  if (ref.type === 'case' || ref.type === 'pattern') return 'libraryReference';
  if (isLibraryProjectRef(ref)) return 'libraryReference';
  return 'projectWork';
}

function buildComposerQuickActions(ref: AttachedRef | null, mode: CopilotMode): ComposerQuickAction[] {
  if (mode === 'createProject') {
    return [
      { labelKey: 'createProject', promptKey: 'createProject', intent: 'project-draft', includePendingImages: true },
      { labelKey: 'askLibrary', promptKey: 'askLibrary' },
    ];
  }
  if (mode === 'libraryReference') {
    return [
      {
        labelKey: isLibraryProjectRef(ref) ? 'copyProject' : 'createFromReference',
        promptKey: isLibraryProjectRef(ref) ? 'copyProject' : 'createFromReference',
        intent: 'project-draft',
        includePendingImages: true,
      },
      { labelKey: 'askReference', promptKey: 'askReference' },
    ];
  }
  return [
    { labelKey: 'addCanvas', promptKey: 'addCanvas' },
    { labelKey: 'addStory', promptKey: 'addStory' },
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

function buildStarterActions(ref: AttachedRef | null, lang: Lang): StarterAction[] {
  const isZh = lang === 'zh';
  if (!ref) return buildStrategyLibraryStarterActions(isZh);

  if (isLibraryProjectRef(ref)) {
    return buildLibraryProjectStarterActions(isZh);
  }

  if (ref.type === 'project' || ref.type === 'canvas' || ref.type === 'story') {
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

function buildStrategyLibraryStarterActions(isZh: boolean): StarterAction[] {
  return [
    {
      id: 'strategy-choice',
      title: isZh ? '战略选择' : 'Strategy choice',
      description: isZh ? '像填空一样选择一个战略框架。' : 'Choose a strategy framework like filling a blank.',
      template: isZh ? '我想了解「{{strategy}}」。请推荐策略库中最适合学习它的案例、相关画布和阅读顺序。' : 'I want to understand {{strategy}}. Recommend the best cases, related canvases, and reading order from the Strategy Library.',
      tone: 'violet',
      controls: [
        {
          id: 'strategy',
          label: isZh ? '战略' : 'Strategy',
          prefix: isZh ? '我想了解' : 'I want to explore',
          suffix: isZh ? '这个战略' : 'as a strategy',
          options: [
            { label: isZh ? '蓝海战略' : 'Blue Ocean', value: isZh ? '蓝海战略' : 'Blue Ocean Strategy' },
            { label: isZh ? '五力模型' : 'Five Forces', value: isZh ? '波特五力模型' : "Porter's Five Forces" },
            { label: isZh ? '三层增长' : 'Three Horizons', value: isZh ? '麦肯锡三层增长' : 'McKinsey Three Horizons' },
            { label: isZh ? '情景规划' : 'Scenario', value: isZh ? '情景规划' : 'Scenario Planning' },
            { label: isZh ? '组合管理' : 'Portfolio', value: isZh ? '业务组合管理' : 'Business Model Portfolio Management' },
          ],
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
          options: [
            { label: 'BMC', value: 'Business Model Canvas' },
            { label: 'VPC', value: 'Value Proposition Canvas' },
            { label: isZh ? '组合地图' : 'Portfolio Map', value: 'Portfolio Map' },
            { label: isZh ? '战略画布' : 'Strategy Canvas', value: 'Strategy Canvas' },
            { label: isZh ? '实验画布' : 'Experiment Canvas', value: 'Experiment Canvas' },
          ],
        },
      ],
    },
    {
      id: 'case-inspiration',
      title: isZh ? '案例灵感' : 'Case inspiration',
      description: isZh ? '按主题找案例，再组合方法和画布。' : 'Find cases by theme, then combine methods and canvases.',
      template: isZh ? '请围绕「{{theme}}」帮我组合一条学习路径：先看哪个案例，再用哪个战略框架，最后画哪几张画布。' : 'Build a learning path for {{theme}}: which case to read first, which strategy framework to use, and which canvases to draw.',
      tone: 'amber',
      controls: [
        {
          id: 'theme',
          label: isZh ? '主题' : 'Theme',
          prefix: isZh ? '我想找' : 'Find me',
          suffix: isZh ? '相关案例' : 'cases',
          options: [
            { label: isZh ? '增长机会' : 'Growth', value: isZh ? '增长机会' : 'growth opportunities' },
            { label: isZh ? '客户价值' : 'Customer value', value: isZh ? '客户价值' : 'customer value' },
            { label: isZh ? '竞争差异化' : 'Differentiation', value: isZh ? '竞争差异化' : 'competitive differentiation' },
            { label: isZh ? '平台生态' : 'Platform', value: isZh ? '平台生态' : 'platform ecosystems' },
            { label: isZh ? '订阅/复购' : 'Recurring', value: isZh ? '订阅和复购' : 'recurring revenue' },
          ],
        },
      ],
    },
  ];
}

function buildLibraryProjectStarterActions(isZh: boolean): StarterAction[] {
  return [
    {
      id: 'case-background-research',
      title: isZh ? '补充案例背景' : 'Enrich case background',
      tone: 'emerald',
      description: isZh
        ? '列出还值得补充的市场、公司和行业背景。'
        : 'Identify market, company, and industry background worth adding.',
      template: isZh
        ? '请基于当前案例内容，围绕「{{focus}}」列出还值得补充的背景信息、可能的公开资料来源和检索关键词。注意：如果你不能联网，请明确区分“已有上下文可判断”和“需要外部检索确认”的部分。'
        : 'Based on this case, list additional background worth researching around {{focus}}, likely public sources, and search keywords. If you cannot browse the web, clearly separate what is grounded in the current context from what needs external verification.',
      controls: [
        {
          id: 'focus',
          label: isZh ? '补充方向' : 'Focus',
          options: [
            { label: isZh ? '公司背景' : 'Company context', value: isZh ? '公司背景' : 'company context' },
            { label: isZh ? '行业变化' : 'Industry shifts', value: isZh ? '行业变化' : 'industry shifts' },
            { label: isZh ? '竞争格局' : 'Competition', value: isZh ? '竞争格局' : 'competitive landscape' },
            { label: isZh ? '关键时间线' : 'Timeline', value: isZh ? '关键时间线' : 'key timeline' },
          ],
        },
      ],
    },
    {
      id: 'case-strategy-reading',
      title: isZh ? '细读战略逻辑' : 'Read strategy logic deeply',
      tone: 'violet',
      description: isZh
        ? '把案例里的战略框架、取舍和机制讲细。'
        : 'Explain the frameworks, trade-offs, and mechanisms in the case.',
      template: isZh
        ? '请用「{{lens}}」细读当前案例：它采用了什么战略逻辑、关键取舍是什么、画布里哪些区块最能支撑这个判断、还有哪些地方可以解读得更细。'
        : 'Read this case through {{lens}}: what strategic logic is being used, what trade-offs matter, which canvas blocks support that reading, and where the interpretation can go deeper.',
      controls: [
        {
          id: 'lens',
          label: isZh ? '解读视角' : 'Lens',
          options: [
            { label: isZh ? '商业模式机制' : 'Business model mechanics', value: isZh ? '商业模式机制' : 'business model mechanics' },
            { label: isZh ? '竞争战略' : 'Competitive strategy', value: isZh ? '竞争战略' : 'competitive strategy' },
            { label: isZh ? '平台/生态' : 'Platform/ecosystem', value: isZh ? '平台/生态' : 'platform/ecosystem strategy' },
            { label: isZh ? '增长组合' : 'Growth portfolio', value: isZh ? '增长组合' : 'growth portfolio' },
          ],
        },
      ],
    },
    {
      id: 'case-transfer-fields',
      title: isZh ? '迁移到其他领域' : 'Transfer to other domains',
      tone: 'amber',
      description: isZh
        ? '判断这个案例适合启发哪些行业和业务场景。'
        : 'Map where this case can inspire other industries or scenarios.',
      template: isZh
        ? '请判断当前案例最适合迁移到哪些其他领域或业务场景。按「{{criterion}}」排序，说明可迁移的机制、不能直接照搬的限制，以及建议先看哪张画布。'
        : 'Identify other domains or business scenarios where this case is transferable. Rank them by {{criterion}}, explain the transferable mechanism, limits that should not be copied blindly, and which canvas to inspect first.',
      controls: [
        {
          id: 'criterion',
          label: isZh ? '排序标准' : 'Ranking',
          options: [
            { label: isZh ? '相似商业模式' : 'Similar model', value: isZh ? '相似商业模式' : 'similar business model' },
            { label: isZh ? '相似客户问题' : 'Similar customer job', value: isZh ? '相似客户问题' : 'similar customer job' },
            { label: isZh ? '相似渠道/生态' : 'Similar channel/ecosystem', value: isZh ? '相似渠道/生态' : 'similar channel or ecosystem' },
            { label: isZh ? '高启发性' : 'Highest inspiration', value: isZh ? '高启发性' : 'highest inspiration value' },
          ],
        },
      ],
    },
    {
      id: 'case-open-questions',
      title: isZh ? '我还应该知道什么' : 'What else should I know?',
      tone: 'slate',
      description: isZh
        ? '帮你列出读这个案例前后最值得追问的问题。'
        : 'List the best follow-up questions for reading this case.',
      template: isZh
        ? '请基于当前案例，列出我还应该知道的 8-10 个问题，分成：背景事实、战略选择、画布证据、可迁移启发、需要外部资料确认。'
        : 'Based on this case, list 8-10 things I should still want to know, grouped into background facts, strategic choices, canvas evidence, transferable lessons, and items needing external verification.',
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
}: {
  settingsOpen: boolean;
  onToggleSettings(): void;
  attachedRef: AttachedRef | null;
  messages: ConversationMessage[];
  streaming: boolean;
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
}) {
  const { t } = useTranslation();
  const composerActions = buildComposerQuickActions(attachedRef, mode);

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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-6 text-center text-[12px] text-gray-500">
            {hasKey ? t('library.copilot.emptyState') : t('library.copilot.emptyStateNoKey')}
          </div>
        ) : (
          <ul className="space-y-3">
            {messages.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                streaming={streaming}
                allowProjectDrafts={allowProjectDrafts}
                lang={lang}
                displayName={displayName}
                attachedRef={attachedRef}
                onNavigateToCanvas={onNavigateToCanvas}
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
        <ComposerContextHint
          mode={mode}
          hasImages={pendingImages.length > 0}
        />
        {pendingImages.length > 0 && (
          <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
            {pendingImages.map((image) => (
              <ImageAttachmentChip
                key={image.id}
                image={image}
                disabled={streaming}
                onRemove={() => onRemoveImage(image.id)}
              />
            ))}
          </div>
        )}
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
          rows={2}
          disabled={streaming}
          placeholder={t(`library.copilot.modeHints.${mode}.placeholder`)}
          className="block w-full resize-none rounded-md border border-gray-200 px-2 py-1.5 text-sm text-gray-900 focus:border-gray-400 focus:outline-none disabled:opacity-50"
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
          <button
            type="button"
            disabled={streaming || pendingImages.length >= MAX_IMAGE_ATTACHMENTS}
            onClick={() => fileInputRef.current?.click()}
            className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            title={t('library.copilot.attachImageHint')}
          >
            {t('library.copilot.attachImage')}
          </button>
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

function ComposerContextHint({
  mode,
  hasImages,
}: {
  mode: CopilotMode;
  hasImages: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="mb-2 rounded-xl border border-emerald-100 bg-emerald-50 px-2.5 py-2 text-[11px] leading-relaxed text-emerald-950">
      <div className="flex items-center justify-between gap-2">
        <span>{t(`library.copilot.modeHints.${mode}.hint`)}</span>
        {hasImages && (
          <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
            {t('library.copilot.modeHints.imageReady')}
          </span>
        )}
      </div>
    </div>
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
  const prompt = renderStarterPrompt(action, values);
  const tone = starterTone(action.tone ?? 'slate');

  return (
    <div className={`min-w-[260px] snap-start rounded-xl border p-2.5 text-left shadow-sm ${tone.card}`}>
      <div className={`text-[12px] font-semibold ${tone.title}`}>{action.title}</div>
      <div className={`mt-0.5 truncate text-[11px] ${tone.desc}`}>{action.description}</div>
      {action.controls.length > 0 && (
        <div className="mt-2 space-y-2">
          {action.controls.map((control) => {
            const hasPreview = Boolean(control.prefix || control.suffix);
            return (
              <div key={control.id} className="rounded-lg border border-white/70 bg-white/45 p-2">
                <div className={`text-[10px] font-medium uppercase tracking-wide ${tone.meta}`}>
                  {control.label}
                </div>
                {hasPreview && (
                  <div className={`mt-1 rounded-md border border-gray-200/70 bg-white/80 px-2 py-1.5 text-[10px] ${tone.desc}`}>
                    {control.prefix}{' '}
                    <span className={tone.title}>{values[control.id] ?? ''}</span>{' '}
                    {control.suffix}
                  </div>
                )}
                <div className={`${hasPreview ? 'mt-1.5 border-t border-gray-200/70 pt-1.5' : 'mt-1.5'} flex flex-wrap gap-1`}>
                  {control.options.map((option) => {
                    const selected = values[control.id] === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          setValues((prev) => ({ ...prev, [control.id]: option.value }))
                        }
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
    </div>
  );
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

function ImageAttachmentChip({
  image,
  disabled,
  onRemove,
}: {
  image: PendingImageAttachment;
  disabled: boolean;
  onRemove(): void;
}) {
  const { t } = useTranslation();
  return (
    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 shadow-sm">
      <img src={image.previewDataUrl} alt={image.name} className="h-full w-full object-cover" />
      <button
        type="button"
        disabled={disabled}
        onClick={onRemove}
        aria-label={t('library.copilot.removeImageAttachment', { name: image.name })}
        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-[12px] leading-none text-white hover:bg-black disabled:opacity-50"
      >
        ×
      </button>
    </div>
  );
}

function MessageImageGrid({ images }: { images: ConversationImageAttachment[] }) {
  const openLightbox = useLightbox((s) => s.open);
  return (
    <div className="grid grid-cols-2 gap-2">
      {images.map((image) => (
        <button
          key={image.id}
          type="button"
          onClick={() => openLightbox(image.previewDataUrl, image.name)}
          className="overflow-hidden rounded-lg border border-white/25 bg-white/10"
          title={`${image.name} · ${formatBytes(image.sizeBytes)}`}
        >
          <img src={image.previewDataUrl} alt={image.name} className="h-24 w-full object-cover" />
        </button>
      ))}
    </div>
  );
}

function MessageBubble({
  message,
  streaming,
  allowProjectDrafts,
  lang,
  displayName,
  attachedRef,
  onNavigateToCanvas,
}: {
  message: ConversationMessage;
  streaming: boolean;
  allowProjectDrafts: boolean;
  lang: Lang;
  displayName: string;
  attachedRef: AttachedRef | null;
  onNavigateToCanvas(): void;
}) {
  const { t } = useTranslation();
  const isUser = message.role === 'user';
  const isEmptyAssistant = message.role === 'assistant' && message.content.length === 0;
  const projectDrafts = isUser ? [] : extractProjectDrafts(message.content);
  const visibleContent = projectDrafts.length > 0 ? stripProjectDraftBlocks(message.content) : message.content;
  const recommendationRefs = useCopilotRecommendationReferences(
    isUser ? '' : visibleContent,
    displayName,
    lang,
    message.attachedRef ?? attachedRef,
  );
  const { canvasRefs, caseRefs, unresolvedCaseSlugs, unresolvedCanvasLabels } = recommendationRefs;
  const contentWithoutCanvasIds = canvasRefs.length > 0
    ? stripResolvedCanvasIds(visibleContent, canvasRefs)
    : visibleContent;
  const contentForRender = caseRefs.length > 0
    ? stripResolvedCaseSlugs(contentWithoutCanvasIds, caseRefs)
    : contentWithoutCanvasIds;
  const visibleProjectDrafts = allowProjectDrafts ? projectDrafts : [];

  return (
    <li className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`${isUser ? 'max-w-[88%]' : 'max-w-[96%]'} rounded-2xl px-3 py-2 text-[13px] leading-relaxed ${
          isUser
            ? 'bg-gray-900 text-white'
            : 'border border-gray-100 bg-gray-50 text-gray-900'
        }`}
      >
        {isEmptyAssistant && streaming ? (
          <span className="italic text-gray-400">{t('library.copilot.thinking')}</span>
        ) : isUser ? (
          <div className="space-y-2">
            <span style={{ whiteSpace: 'pre-wrap' }}>{message.content}</span>
            {message.imageAttachments && message.imageAttachments.length > 0 && (
              <MessageImageGrid images={message.imageAttachments} />
            )}
          </div>
        ) : (
          <>
            {contentForRender && <CopilotMarkdown content={contentForRender} />}
            <CopilotCaseReferenceBoard refs={caseRefs} onNavigateToCanvas={onNavigateToCanvas} />
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
            {visibleProjectDrafts.map((draft, index) => (
              <CopilotProjectDraftCard
                key={`${draft.project.name}:${index}`}
                draft={draft}
                lang={lang}
              />
            ))}
          </>
        )}
      </div>
    </li>
  );
}

function CopilotMarkdown({ content }: { content: string }) {
  const openLightbox = useLightbox((s) => s.open);

  return (
    <div className="max-w-none text-[13px] leading-relaxed text-gray-900">
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
          p: ({ children }) => <p className="my-1.5 leading-relaxed">{children}</p>,
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
            <div className="my-3 max-w-full overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
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
            <td className="min-w-[120px] border-r border-gray-100 px-3 py-2 text-gray-700 last:border-r-0">
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
        {content}
      </ReactMarkdown>
    </div>
  );
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
          if (dataUrlByteLength(compressed) <= PROMPT_IMAGE_MAX_BYTES) {
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
  const promptDataUrl = image.previewDataUrl;
  return {
    id: image.id,
    name: image.name,
    mimeType: dataUrlMimeType(promptDataUrl) ?? image.mimeType,
    sizeBytes: dataUrlByteLength(promptDataUrl),
    dataUrl: promptDataUrl,
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

function dataUrlMimeType(dataUrl: string): CopilotImageAttachment['mimeType'] | undefined {
  const match = /^data:(image\/(?:png|jpeg|webp|gif));base64,/.exec(dataUrl);
  return match?.[1] as CopilotImageAttachment['mimeType'] | undefined;
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
