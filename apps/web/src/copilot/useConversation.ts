import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';

export interface ConversationImageAttachment {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  previewDataUrl: string;
}

export interface CopilotUpdateBaseline {
  projectId: string;
  capturedAt: string;
  canvases: Record<string, string>;
  stories: Record<string, string>;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  ts: string;
  /** Identifier of the AI that produced this message. After R2.6 there
   *  is only one (`'kimi'`), but we keep the field so future modes
   *  (Claude Code fallback, etc.) can mark provenance per turn. */
  providerId?: 'kimi';
  model?: string;
  /**
   * The attached case/pattern (if any) the message was sent with. Each
   * turn captures it so the user can see the chip even after switching
   * the live attached ref in the composer.
   */
  attachedRef?: AttachedRef;
  imageAttachments?: ConversationImageAttachment[];
  expectedSourceImageCount?: number;
  updateBaseline?: CopilotUpdateBaseline;
}

export type AttachedRef =
  | { type: 'case'; slug: string; companyName: string }
  | { type: 'pattern'; slug: string; name: string }
  | {
      type: 'project';
      projectId: string;
      projectName: string;
      projectSource?: 'user' | 'library';
      activeCanvasId?: string;
      activeStoryId?: string;
    }
  | {
      type: 'canvas';
      canvasId: string;
      canvasTitle: string;
      projectId: string;
      projectName: string;
      projectSource?: 'user' | 'library';
    }
  | {
      type: 'story';
      storyId: string;
      storyTitle: string;
      projectId: string;
      projectName: string;
      projectSource?: 'user' | 'library';
    };

const LEGACY_STORAGE_KEY_PREFIX = 'pingarden.copilot.conversation.';

type ConversationListener = () => void;

const EMPTY_MESSAGES: ConversationMessage[] = [];
const sessionConversations = new Map<string, ConversationMessage[]>();
const conversationListeners = new Map<string, Set<ConversationListener>>();
let legacyStorageCleared = false;

function clearPersistedConversations() {
  if (legacyStorageCleared) return;
  legacyStorageCleared = true;
  if (typeof localStorage === 'undefined') return;
  for (let i = localStorage.length - 1; i >= 0; i -= 1) {
    const key = localStorage.key(i);
    if (key?.startsWith(LEGACY_STORAGE_KEY_PREFIX)) localStorage.removeItem(key);
  }
}

function conversationKey(displayName: string | undefined): string {
  return displayName?.trim() || 'anonymous';
}

function getMessages(key: string): ConversationMessage[] {
  return sessionConversations.get(key) ?? EMPTY_MESSAGES;
}

function emit(key: string) {
  conversationListeners.get(key)?.forEach((listener) => listener());
}

function subscribeToConversation(key: string, listener: ConversationListener): () => void {
  const listeners = conversationListeners.get(key) ?? new Set<ConversationListener>();
  listeners.add(listener);
  conversationListeners.set(key, listeners);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) conversationListeners.delete(key);
  };
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * App-session in-memory chat history.
 *
 * Conversation content is intentionally not written to localStorage or
 * server files, so packaged builds never carry one user's Copilot chats
 * to another device. The module-level store survives route changes while
 * the app is open; closing/reloading the app releases it.
 */
export function useConversation(displayName: string | undefined) {
  const key = useMemo(() => conversationKey(displayName), [displayName]);

  useEffect(() => {
    clearPersistedConversations();
  }, []);

  const messages = useSyncExternalStore(
    useCallback((listener) => subscribeToConversation(key, listener), [key]),
    useCallback(() => getMessages(key), [key]),
    () => EMPTY_MESSAGES,
  );

  const append = useCallback(
    (msg: Omit<ConversationMessage, 'id' | 'ts'>): ConversationMessage => {
      const full: ConversationMessage = {
        id: uuid(),
        ts: new Date().toISOString(),
        ...msg,
      };
      sessionConversations.set(key, [...getMessages(key), full]);
      emit(key);
      return full;
    },
    [key],
  );

  /** Append-into-last: streaming helper that grows the trailing assistant message. */
  const updateLast = useCallback(
    (mutator: (msg: ConversationMessage) => ConversationMessage) => {
      const prev = getMessages(key);
      if (prev.length === 0) return;
      const last = prev[prev.length - 1]!;
      const updated = mutator(last);
      sessionConversations.set(key, [...prev.slice(0, -1), updated]);
      emit(key);
    },
    [key],
  );

  const popLast = useCallback((count = 1) => {
    if (count <= 0) return;
    const prev = getMessages(key);
    if (prev.length === 0) return;
    sessionConversations.set(key, prev.slice(0, Math.max(0, prev.length - count)));
    emit(key);
  }, [key]);

  const clear = useCallback(() => {
    clearPersistedConversations();
    sessionConversations.set(key, []);
    emit(key);
  }, [key]);

  return { messages, append, updateLast, popLast, clear };
}
