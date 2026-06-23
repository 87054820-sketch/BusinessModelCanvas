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

const STORAGE_KEY_PREFIX = 'pingarden.copilot.conversation.';

function storageKey(displayName: string): string {
  return STORAGE_KEY_PREFIX + displayName;
}

function load(displayName: string): ConversationMessage[] {
  if (typeof localStorage === 'undefined') return [];
  const raw = localStorage.getItem(storageKey(displayName));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isMessage);
  } catch {
    return [];
  }
}

function isMessage(v: unknown): v is ConversationMessage {
  if (!v || typeof v !== 'object') return false;
  const m = v as Partial<ConversationMessage>;
  return (
    typeof m.id === 'string' &&
    (m.role === 'user' || m.role === 'assistant') &&
    typeof m.content === 'string' &&
    typeof m.ts === 'string'
  );
}

function persist(displayName: string, msgs: ConversationMessage[]) {
  localStorage.setItem(storageKey(displayName), JSON.stringify(msgs));
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Single-thread chat history keyed by `displayName`. The current model
 * is one ongoing thread per user — closing the drawer doesn't reset it,
 * and the user can resume the conversation after a page reload. A
 * future "🗑 Clear" button calls `clear()` to wipe the thread.
 *
 * Why no server-side history in v1: per the user's plan choice
 * (2026-06-22), conversations live in localStorage only — no
 * server-side conversation file. This keeps the secrets boundary
 * clean and matches the user's expressed preference.
 */
export function useConversation(displayName: string | undefined) {
  const [messages, setMessages] = useState<ConversationMessage[]>(() =>
    displayName ? load(displayName) : [],
  );

  // Reload whenever the displayName changes — covers the rare case
  // where the user edits their identity mid-session.
  useEffect(() => {
    if (!displayName) {
      setMessages([]);
      return;
    }
    setMessages(load(displayName));
  }, [displayName]);

  const append = useCallback(
    (msg: Omit<ConversationMessage, 'id' | 'ts'>): ConversationMessage => {
      if (!displayName) {
        // No identity yet — we can't even key the storage. Return a
        // synthetic record so the caller can still render it in-memory.
        return { id: uuid(), ts: new Date().toISOString(), ...msg };
      }
      const full: ConversationMessage = {
        id: uuid(),
        ts: new Date().toISOString(),
        ...msg,
      };
      setMessages((prev) => {
        const next = [...prev, full];
        persist(displayName, next);
        return next;
      });
      return full;
    },
    [displayName],
  );

  /** Append-into-last: streaming helper that grows the trailing assistant message. */
  const updateLast = useCallback(
    (mutator: (msg: ConversationMessage) => ConversationMessage) => {
      if (!displayName) return;
      setMessages((prev) => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1]!;
        const updated = mutator(last);
        const next = [...prev.slice(0, -1), updated];
        persist(displayName, next);
        return next;
      });
    },
    [displayName],
  );

  const clear = useCallback(() => {
    if (!displayName) return;
    persist(displayName, []);
    setMessages([]);
  }, [displayName]);

  return { messages, append, updateLast, clear };
}
