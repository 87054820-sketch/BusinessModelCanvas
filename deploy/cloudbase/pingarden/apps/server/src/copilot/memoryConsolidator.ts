import { randomUUID } from 'node:crypto';
import type {
  CopilotLayeredMemory,
  CopilotMemoryAppliesTo,
  CopilotMemoryChange,
  CopilotMemoryItem,
  CopilotMemoryLayer,
  CopilotMemoryLayers,
  CopilotMemoryPatch,
  CopilotMemoryPatchUpsert,
  CopilotMemorySignal,
  CopilotMemorySource,
} from '@pingarden/shared';
import { COPILOT_MEMORY_LAYERS } from '@pingarden/shared';

const LAYER_ACTIVE_LIMIT = 10;
const SIGNAL_LIMIT = 50;
const CHANGELOG_LIMIT = 20;
const VALUE_LIMIT = 180;
const EVIDENCE_LIMIT = 220;

export interface MemoryConsolidationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface MemoryConsolidationInput {
  messages: MemoryConsolidationMessage[];
  projectId?: string;
  contextLabel?: string;
}

const layerRules: Array<{
  layer: CopilotMemoryLayer;
  semanticKey: string;
  title: string;
  value: string;
  keywords: RegExp;
}> = [
  {
    layer: 'collaboration',
    semanticKey: 'collaboration/direct-integrated-review',
    title: '直接、整体化的协作方式',
    value: '用户偏好先整体 review，再直接推进可执行改动；能通过项目上下文判断时，不要频繁要求确认。',
    keywords: /执行吧|不用确认|不要确认|少问|直接|整体\s*review|整体检查|先.*review|不要反问|简洁|冗余/i,
  },
  {
    layer: 'productThinking',
    semanticKey: 'product-thinking/application-value',
    title: '重视应用价值和长期沉淀',
    value: '用户判断功能价值时更关注是否直接服务真实工作流、是否能长期沉淀，而不是复杂但低价值的中间交互。',
    keywords: /鸡肋|应用价值|意义大|长期沉淀|信息链|价值|复杂|直接|长期|偏好/i,
  },
  {
    layer: 'projectWorkflow',
    semanticKey: 'project-workflow/direct-optimization',
    title: '项目优化优先走直接入口',
    value: '用户更希望通过“优化当前项目”等显性入口直接驱动项目审计和更新草稿，而不是通过洞察篮子中转。',
    keywords: /优化当前项目|项目优化|优化项目|画布|Story|故事|项目|洞察.*项目|按钮|入口|工作流/i,
  },
  {
    layer: 'contentAndEvidence',
    semanticKey: 'content-evidence/source-chain',
    title: '资料推荐要保持来源链路',
    value: '用户希望书籍、网页、报告等资料保留可跳转来源；书籍优先提供 Amazon 等购买或查看入口，且不要混入案例列表。',
    keywords: /书籍|文章|网页|链接|Amazon|案例列表|资料|来源|证据|报告|参考阅读/i,
  },
  {
    layer: 'visualAndUX',
    semanticKey: 'visual-ux/native-restrained-ui',
    title: '偏好产品原生、克制的界面风格',
    value: '用户不喜欢强 AI 感视觉，偏好白底卡片、stone\/gray、低饱和品牌色和产品原生的轻量交互。',
    keywords: /太\s*AI|AI 感|设计风格|视觉|UI|白底|stone|gray|低饱和|产品原生|克制|卡片/i,
  },
  {
    layer: 'domainContext',
    semanticKey: 'domain-context/business-model-canvas',
    title: '长期围绕商业模式与策略项目工作',
    value: '用户长期使用 PinGarden 处理商业模式画布、策略库、案例/书籍资料、实验设计和项目优化。',
    keywords: /PinGarden|商业模式|Business Model|策略库|案例|实验设计|画布|项目|商业书籍/i,
  },
];

export function createEmptyLayeredMemory(now = new Date().toISOString()): CopilotLayeredMemory {
  return {
    version: 2,
    updatedAt: now,
    layers: emptyLayers(),
    recentSignals: [],
    changelog: [],
  };
}

export function normaliseLayeredMemory(input: CopilotLayeredMemory | undefined, now = new Date().toISOString()): CopilotLayeredMemory {
  if (!input) return createEmptyLayeredMemory(now);
  const layers = emptyLayers();
  for (const layer of COPILOT_MEMORY_LAYERS) {
    layers[layer] = Array.isArray(input.layers?.[layer]) ? input.layers[layer].map((item) => normaliseItem(item, now)) : [];
  }
  return {
    version: input.version || 2,
    updatedAt: input.updatedAt || now,
    layers,
    recentSignals: Array.isArray(input.recentSignals) ? input.recentSignals.slice(0, SIGNAL_LIMIT) : [],
    changelog: Array.isArray(input.changelog) ? input.changelog.slice(0, CHANGELOG_LIMIT) : [],
  };
}

export function buildMemoryPatch(input: MemoryConsolidationInput): CopilotMemoryPatch {
  const text = input.messages
    .slice(-8)
    .map((message) => message.content)
    .join('\n')
    .replace(/```[\s\S]*?```/g, ' ')
    .trim();
  const upsert: CopilotMemoryPatchUpsert[] = [];
  const signals: Array<Omit<CopilotMemorySignal, 'id' | 'createdAt'>> = [];
  if (!text) return { summary: 'No memory-worthy signal detected.' };

  for (const rule of layerRules) {
    if (!rule.keywords.test(text)) continue;
    const evidenceSummary = truncate(extractEvidence(text, rule.keywords), EVIDENCE_LIMIT);
    const source: CopilotMemorySource = input.projectId ? 'project-work' : 'conversation';
    upsert.push({
      layer: rule.layer,
      semanticKey: rule.semanticKey,
      title: rule.title,
      value: rule.value,
      status: 'active',
      confidence: 0.74,
      evidenceSummary,
      source,
      ...(input.projectId || input.contextLabel
        ? { appliesTo: { ...(input.projectId ? { projectIds: [input.projectId] } : {}), ...(input.contextLabel ? { contexts: [input.contextLabel] } : {}) } }
        : {}),
    });
    signals.push({
      layer: rule.layer,
      semanticKey: rule.semanticKey,
      summary: rule.value,
      confidence: 0.72,
      evidenceSummary,
      source,
      ...(input.projectId ? { projectId: input.projectId } : {}),
    });
  }

  return {
    upsert,
    signals,
    summary: upsert.length > 0 ? `Consolidated ${upsert.length} layered memory signal(s).` : 'No stable layered memory signal detected.',
  };
}

export function applyMemoryPatch(current: CopilotLayeredMemory, patch: CopilotMemoryPatch, now = new Date().toISOString()): CopilotLayeredMemory {
  const before = cloneLayeredMemory(current);
  const next = normaliseLayeredMemory(current, now);
  const upsertedIds: string[] = [];
  const archivedIds: string[] = [];
  const mergedIds: string[] = [];

  for (const entry of patch.archive ?? []) {
    const found = findItem(next.layers, entry.id);
    if (!found) continue;
    found.item.status = 'archived';
    found.item.updatedAt = now;
    found.item.lastSeenAt = now;
    found.item.evidenceSummary = truncate(entry.reason || found.item.evidenceSummary, EVIDENCE_LIMIT);
    archivedIds.push(found.item.id);
  }

  for (const merge of patch.merge ?? []) {
    const target = findItem(next.layers, merge.targetId);
    if (!target) continue;
    const result = merge.result;
    if (result) {
      const merged = mergeItem(target.item, result, now);
      target.layerItems[target.index] = merged;
      upsertedIds.push(merged.id);
    }
    for (const sourceId of merge.sourceIds) {
      const source = findItem(next.layers, sourceId);
      if (!source || source.item.id === target.item.id) continue;
      source.item.status = 'archived';
      source.item.updatedAt = now;
      mergedIds.push(source.item.id);
    }
  }

  for (const entry of patch.upsert ?? []) {
    const layerItems = next.layers[entry.layer];
    const existingIndex = layerItems.findIndex((item) => item.semanticKey === entry.semanticKey || item.title === entry.title);
    if (existingIndex >= 0) {
      const merged = mergeItem(layerItems[existingIndex]!, entry, now);
      layerItems[existingIndex] = merged;
      upsertedIds.push(merged.id);
    } else {
      const item = createItem(entry, now);
      layerItems.unshift(item);
      upsertedIds.push(item.id);
    }
  }

  const newSignals = (patch.signals ?? []).map((signal): CopilotMemorySignal => ({
    id: `sig_${randomUUID()}`,
    createdAt: now,
    ...signal,
    confidence: clamp(signal.confidence, 0, 1),
    evidenceSummary: truncate(signal.evidenceSummary, EVIDENCE_LIMIT),
    summary: truncate(signal.summary, VALUE_LIMIT),
  }));
  next.recentSignals = [...newSignals, ...next.recentSignals].slice(0, SIGNAL_LIMIT);

  for (const layer of COPILOT_MEMORY_LAYERS) {
    next.layers[layer] = rankAndTrim(next.layers[layer]);
  }

  next.updatedAt = now;
  const change: CopilotMemoryChange = {
    id: `chg_${randomUUID()}`,
    summary: patch.summary,
    createdAt: now,
    upsertedIds: unique(upsertedIds),
    mergedIds: unique(mergedIds),
    archivedIds: unique(archivedIds),
    previousLayeredMemory: before,
  };
  next.changelog = [change, ...next.changelog].slice(0, CHANGELOG_LIMIT);
  return next;
}

export function archiveMemoryItem(current: CopilotLayeredMemory, id: string, now = new Date().toISOString()): CopilotLayeredMemory {
  return applyMemoryPatch(current, { archive: [{ id, reason: 'Archived by user.' }], summary: 'Archived one memory item.' }, now);
}

export function deleteMemoryItem(current: CopilotLayeredMemory, id: string, now = new Date().toISOString()): CopilotLayeredMemory {
  const before = cloneLayeredMemory(current);
  const next = normaliseLayeredMemory(current, now);
  for (const layer of COPILOT_MEMORY_LAYERS) {
    next.layers[layer] = next.layers[layer].filter((item) => item.id !== id);
  }
  next.updatedAt = now;
  next.changelog = [{
    id: `chg_${randomUUID()}`,
    summary: 'Deleted one memory item.',
    createdAt: now,
    upsertedIds: [],
    mergedIds: [],
    archivedIds: [],
    deletedIds: [id],
    previousLayeredMemory: before,
  }, ...next.changelog].slice(0, CHANGELOG_LIMIT);
  return next;
}

export function revertLatestMemoryChange(current: CopilotLayeredMemory): CopilotLayeredMemory {
  const latest = current.changelog[0];
  if (!latest?.previousLayeredMemory) return current;
  const restored = normaliseLayeredMemory(latest.previousLayeredMemory);
  return {
    ...restored,
    changelog: current.changelog.slice(1),
    updatedAt: new Date().toISOString(),
  };
}

function emptyLayers(): CopilotMemoryLayers {
  return {
    collaboration: [],
    productThinking: [],
    projectWorkflow: [],
    contentAndEvidence: [],
    visualAndUX: [],
    domainContext: [],
  };
}

function createItem(entry: CopilotMemoryPatchUpsert, now: string): CopilotMemoryItem {
  return {
    id: `mem_${randomUUID()}`,
    layer: entry.layer,
    semanticKey: entry.semanticKey,
    title: truncate(entry.title, 80),
    value: truncate(entry.value, VALUE_LIMIT),
    status: entry.status ?? 'soft',
    confidence: clamp(entry.confidence ?? 0.65, 0, 1),
    evidenceCount: 1,
    evidenceSummary: truncate(entry.evidenceSummary, EVIDENCE_LIMIT),
    source: entry.source ?? 'conversation',
    ...(entry.appliesTo ? { appliesTo: entry.appliesTo } : {}),
    firstSeenAt: now,
    lastSeenAt: now,
    updatedAt: now,
  };
}

function mergeItem(existing: CopilotMemoryItem, entry: CopilotMemoryPatchUpsert, now: string): CopilotMemoryItem {
  return {
    ...existing,
    title: truncate(entry.title || existing.title, 80),
    value: truncate(entry.value || existing.value, VALUE_LIMIT),
    status: entry.status ?? existing.status,
    confidence: clamp(Math.max(existing.confidence, entry.confidence ?? 0) + 0.02, 0, 0.95),
    evidenceCount: existing.evidenceCount + 1,
    evidenceSummary: truncate(entry.evidenceSummary || existing.evidenceSummary, EVIDENCE_LIMIT),
    source: entry.source ?? existing.source,
    appliesTo: mergeAppliesTo(existing.appliesTo, entry.appliesTo),
    lastSeenAt: now,
    updatedAt: now,
  };
}

function normaliseItem(item: CopilotMemoryItem, now: string): CopilotMemoryItem {
  return {
    ...item,
    status: item.status ?? 'soft',
    confidence: clamp(item.confidence ?? 0.5, 0, 1),
    evidenceCount: Math.max(1, item.evidenceCount ?? 1),
    firstSeenAt: item.firstSeenAt ?? now,
    lastSeenAt: item.lastSeenAt ?? item.updatedAt ?? now,
    updatedAt: item.updatedAt ?? now,
  };
}

function rankAndTrim(items: CopilotMemoryItem[]): CopilotMemoryItem[] {
  const seen = new Set<string>();
  const deduped: CopilotMemoryItem[] = [];
  for (const item of [...items].sort((a, b) => scoreItem(b) - scoreItem(a))) {
    const key = `${item.layer}:${item.semanticKey}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }
  const active: CopilotMemoryItem[] = [];
  const rest: CopilotMemoryItem[] = [];
  for (const item of deduped) {
    if (item.status === 'active' && active.length < LAYER_ACTIVE_LIMIT) active.push(item);
    else rest.push(item.status === 'active' ? { ...item, status: 'soft' } : item);
  }
  return [...active, ...rest].slice(0, 24);
}

function scoreItem(item: CopilotMemoryItem): number {
  const statusScore = item.status === 'active' ? 3 : item.status === 'soft' ? 1 : 0;
  return statusScore + item.confidence + Math.min(item.evidenceCount, 5) * 0.05 + Date.parse(item.lastSeenAt) / 1e15;
}

function findItem(layers: CopilotMemoryLayers, id: string): { item: CopilotMemoryItem; layerItems: CopilotMemoryItem[]; index: number } | null {
  for (const layer of COPILOT_MEMORY_LAYERS) {
    const index = layers[layer].findIndex((item) => item.id === id);
    if (index >= 0) return { item: layers[layer][index]!, layerItems: layers[layer], index };
  }
  return null;
}

function cloneLayeredMemory(memory: CopilotLayeredMemory): CopilotLayeredMemory {
  return JSON.parse(JSON.stringify(memory)) as CopilotLayeredMemory;
}

function mergeAppliesTo(a: CopilotMemoryAppliesTo = {}, b: CopilotMemoryAppliesTo = {}): CopilotMemoryAppliesTo {
  const projectIds = unique([...(a.projectIds ?? []), ...(b.projectIds ?? [])]);
  const canvasDefIds = unique([...(a.canvasDefIds ?? []), ...(b.canvasDefIds ?? [])]);
  const contexts = unique([...(a.contexts ?? []), ...(b.contexts ?? [])]);
  return {
    ...(projectIds.length > 0 ? { projectIds } : {}),
    ...(canvasDefIds.length > 0 ? { canvasDefIds } : {}),
    ...(contexts.length > 0 ? { contexts } : {}),
  };
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

function truncate(value: string, max: number): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function extractEvidence(text: string, keywords: RegExp): string {
  const sentences = text
    .split(/[。！？!?\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  return sentences.find((sentence) => keywords.test(sentence)) ?? sentences[0] ?? text.slice(0, EVIDENCE_LIMIT);
}
