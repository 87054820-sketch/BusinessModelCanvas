export interface CopilotMessageLike {
  role: 'user' | 'assistant';
  content: string;
}

export function hasCopilotMessageContent(content: string): boolean {
  return content.trim().length > 0;
}

export function isEmptyAssistantMessage(message: CopilotMessageLike | null | undefined): boolean {
  return Boolean(message && message.role === 'assistant' && !hasCopilotMessageContent(message.content));
}

export function stripEmptyAssistantMessages<T extends CopilotMessageLike>(messages: T[]): T[] {
  return messages.filter((message) => !isEmptyAssistantMessage(message));
}
