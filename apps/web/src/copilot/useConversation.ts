import { useCallback, useEffect, useState } from 'react';

export interface ConversationImageAttachment {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  previewDataUrl: string;
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

function clearPersistedConversations() {
  if (typeof localStorage === 'undefined') return;
  for (let i = localStorage.length - 1; i >= 0; i -= 1) {
    const key = localStorage.key(i);
    if (key?.startsWith(LEGACY_STORAGE_KEY_PREFIX)) localStorage.removeItem(key);
  }
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Single-thread in-memory chat history for the current app session.
 * Conversation content is intentionally not written to localStorage or
 * server files, so packaged builds never carry one user's Copilot chats
 * to another device. The clear button wipes the current in-memory thread;
 * first load also removes legacy persisted conversation keys from older
 * builds.
 */
export function useConversation(displayName: string | undefined) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);

  useEffect(() => {
    clearPersistedConversations();
    setMessages([]);
  }, [displayName]);

  const append = useCallback(
    (msg: Omit<ConversationMessage, 'id' | 'ts'>): ConversationMessage => {
      const full: ConversationMessage = {
        id: uuid(),
        ts: new Date().toISOString(),
        ...msg,
      };
      setMessages((prev) => [...prev, full]);
      return full;
    },
    [],
  );

  /** Append-into-last: streaming helper that grows the trailing assistant message. */
  const updateLast = useCallback(
    (mutator: (msg: ConversationMessage) => ConversationMessage) => {
      setMessages((prev) => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1]!;
        const updated = mutator(last);
        return [...prev.slice(0, -1), updated];
      });
    },
    [],
  );

  const clear = useCallback(() => {
    clearPersistedConversations();
    setMessages([]);
  }, []);

  return { messages, append, updateLast, clear };
}
