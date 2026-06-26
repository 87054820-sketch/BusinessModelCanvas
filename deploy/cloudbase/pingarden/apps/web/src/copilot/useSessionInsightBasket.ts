import { useCallback, useSyncExternalStore } from 'react';
import type { CopilotDiscussionInsight, CopilotSessionInsightItem } from '@pingarden/shared';

type BasketListener = () => void;

const listeners = new Set<BasketListener>();
let basket: CopilotSessionInsightItem[] = [];

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: BasketListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function snapshot(): CopilotSessionInsightItem[] {
  return basket;
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function useSessionInsightBasket() {
  const items = useSyncExternalStore(subscribe, snapshot, snapshot);

  const add = useCallback((insight: CopilotDiscussionInsight, sourceMessageId?: string) => {
    const key = `${insight.title}:${insight.summary}`.toLowerCase();
    const existing = basket.find((item) => `${item.insight.title}:${item.insight.summary}`.toLowerCase() === key);
    if (existing) return existing;
    const item: CopilotSessionInsightItem = {
      id: uuid(),
      insight,
      ...(sourceMessageId ? { sourceMessageId } : {}),
      addedAt: new Date().toISOString(),
    };
    basket = [item, ...basket].slice(0, 20);
    emit();
    return item;
  }, []);

  const remove = useCallback((id: string) => {
    basket = basket.filter((item) => item.id !== id);
    emit();
  }, []);

  const clear = useCallback(() => {
    basket = [];
    emit();
  }, []);

  const markUseful = useCallback((id: string, useful: boolean) => {
    basket = basket.map((item) => item.id === id ? { ...item, useful } : item);
    emit();
  }, []);

  const markApplied = useCallback((id: string) => {
    basket = basket.map((item) => item.id === id ? { ...item, appliedAt: new Date().toISOString() } : item);
    emit();
  }, []);

  return { items, add, remove, clear, markUseful, markApplied };
}
