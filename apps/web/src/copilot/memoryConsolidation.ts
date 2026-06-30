import { copilotApi } from '../api/copilot';
import type { AttachedRef, ConversationMessage } from './useConversation';

const MIN_MESSAGES_FOR_CONSOLIDATION = 4;
const MESSAGE_WINDOW = 8;
const lastConsolidatedByUser = new Map<string, string>();

export async function maybeConsolidateCopilotMemory({
  displayName,
  messages,
  attachedRef,
}: {
  displayName: string;
  messages: ConversationMessage[];
  attachedRef: AttachedRef | null;
}): Promise<boolean> {
  if (!displayName || messages.length < MIN_MESSAGES_FOR_CONSOLIDATION) return false;
  const last = messages[messages.length - 1];
  if (!last || last.role !== 'assistant' || last.content.trim().length < 40) return false;
  const key = displayName.trim() || 'anonymous';
  if (lastConsolidatedByUser.get(key) === last.id) return false;

  const recent = messages
    .slice(-MESSAGE_WINDOW)
    .filter((message) => message.content.trim().length > 0)
    .map((message) => ({ role: message.role, content: trimForMemory(message.content) }));
  if (recent.length < MIN_MESSAGES_FOR_CONSOLIDATION) return false;

  await copilotApi.consolidateMemory(displayName, {
    messages: recent,
    ...memoryContextFromAttachedRef(attachedRef),
  });
  lastConsolidatedByUser.set(key, last.id);
  return true;
}

function trimForMemory(content: string): string {
  return content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/g, '[image]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 4000);
}

function memoryContextFromAttachedRef(ref: AttachedRef | null): { projectId?: string; contextLabel?: string } {
  if (!ref) return { contextLabel: 'Strategy library / new project' };
  if (ref.type === 'case') return { contextLabel: `Case: ${ref.companyName}` };
  if (ref.type === 'pattern') return { contextLabel: `Pattern: ${ref.name}` };
  if (ref.type === 'resource') return { contextLabel: `Resource: ${ref.title}` };
  if (ref.projectSource === 'library') return { contextLabel: `Read-only library project: ${ref.projectName}` };
  return { projectId: ref.projectId, contextLabel: ref.projectName };
}
