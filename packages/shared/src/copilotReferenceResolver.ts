import type { CopilotSourceReference } from './copilot.js';
import type { CopilotTypedReference, CopilotTypedReferenceKind } from './copilotStructured.js';

type Lang = 'en' | 'zh';

export interface CopilotReferenceCatalogEntry {
  kind: CopilotTypedReferenceKind;
  label: string;
  id?: string;
  slug?: string;
  defId?: string;
  canvasId?: string;
  projectId?: string;
  storyId?: string;
  resourceSlug?: string;
  chapterSlug?: string;
  aliases?: string[];
  summary?: string;
  lang?: Lang;
}

export interface CopilotReferenceCatalog {
  entries: CopilotReferenceCatalogEntry[];
}

export interface CopilotResolvedReference {
  reference: CopilotTypedReference;
  status: 'resolved' | 'ambiguous' | 'missing';
  openable: boolean;
  previewable: boolean;
  target?: CopilotReferenceCatalogEntry;
  candidates?: CopilotReferenceCatalogEntry[];
  reason?: string;
}

export interface CopilotReferenceResolution {
  items: CopilotResolvedReference[];
  resolved: CopilotResolvedReference[];
  ambiguous: CopilotResolvedReference[];
  missing: CopilotResolvedReference[];
}

export interface ResolveCopilotReferencesInput {
  text?: string;
  references?: Array<CopilotTypedReference | CopilotSourceReference>;
  catalog: CopilotReferenceCatalog;
  lang?: Lang;
}

const KEBAB_RE = /`?\b[a-z][a-z0-9]+(?:-[a-z0-9]+)+\b`?/g;
const UUID_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

const CANVAS_ALIASES: Record<string, string[]> = {
  'business-model-canvas': ['BMC', '商业模式画布'],
  'value-proposition-canvas': ['VPC', '价值主张画布'],
  'portfolio-map': ['Portfolio', '组合地图', '业务组合', '业务组合管理'],
  'three-horizons-map': ['三层增长', '三层增长地图', 'Three Horizons'],
  'bcg-growth-share-matrix': ['BCG', 'BCG 矩阵', '增长份额矩阵'],
  'business-model-environment': ['商业模式环境', '商业模式环境扫描', '环境扫描', 'Business Model Environment'],
  'ad-lib-value-proposition': ['Ad-Lib VP', '价值主张速写', '一句话价值主张', '价值主张模板', '价值主张填空'],
};

export function resolveCopilotReferences(input: ResolveCopilotReferencesInput): CopilotReferenceResolution {
  const catalog = normaliseCatalog(input.catalog);
  const refs = [
    ...normaliseExplicitReferences(input.references ?? []),
    ...extractReferencesFromText(input.text ?? '', catalog, input.lang ?? 'en'),
  ];

  const seen = new Set<string>();
  const items: CopilotResolvedReference[] = [];
  for (const ref of refs) {
    const key = referenceKey(ref);
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(resolveReference(ref, catalog));
  }

  return {
    items,
    resolved: items.filter((item) => item.status === 'resolved'),
    ambiguous: items.filter((item) => item.status === 'ambiguous'),
    missing: items.filter((item) => item.status === 'missing'),
  };
}

export function referenceOpenable(kind: CopilotTypedReferenceKind): boolean {
  return kind === 'case' || kind === 'resource' || kind === 'resourceChapter' || kind === 'canvasInstance' || kind === 'project' || kind === 'story';
}

export function referencePreviewable(kind: CopilotTypedReferenceKind): boolean {
  return kind === 'canvasTemplate' || kind === 'resource' || kind === 'resourceChapter' || kind === 'case' || kind === 'experiment' || kind === 'strategyFramework' || kind === 'pattern';
}

export function sourceReferenceToTyped(ref: CopilotSourceReference): CopilotTypedReference {
  const kind = sourceTypeToTypedKind(ref.type);
  const locator = ref.locator ?? '';
  const locatorParts = locator.split(':');
  const slug = locatorParts.length > 1 ? locatorParts.slice(1).join(':') : locator || undefined;
  return {
    kind,
    label: ref.label,
    id: ref.id,
    locator: ref.locator,
    summary: ref.summary,
    ...(kind === 'canvasTemplate' ? { defId: slug } : {}),
    ...(kind === 'canvasInstance' ? { canvasId: slug } : {}),
    ...(kind === 'project' ? { projectId: slug } : {}),
    ...(kind === 'story' ? { storyId: slug } : {}),
    ...(kind === 'resource' ? { slug, resourceSlug: slug } : {}),
    ...(kind !== 'canvasTemplate' && kind !== 'canvasInstance' && kind !== 'project' && kind !== 'story' && kind !== 'resource'
      ? { slug }
      : {}),
  };
}

function normaliseExplicitReferences(refs: Array<CopilotTypedReference | CopilotSourceReference>): CopilotTypedReference[] {
  return refs
    .map((ref) => ('kind' in ref ? ref : sourceReferenceToTyped(ref)))
    .filter((ref) => ref.label.trim().length > 0);
}

function sourceTypeToTypedKind(type: CopilotSourceReference['type']): CopilotTypedReferenceKind {
  if (type === 'canvas') return 'canvasInstance';
  if (type === 'playbook' || type === 'conversation' || type === 'image' || type === 'text') return 'resource';
  return type;
}

function extractReferencesFromText(text: string, catalog: CopilotReferenceCatalogEntry[], lang: Lang): CopilotTypedReference[] {
  const lower = text.toLowerCase();
  const refs: CopilotTypedReference[] = [];
  const tokenSet = new Set(extractKebabTokens(text));
  const uuidSet = new Set((text.match(UUID_RE) ?? []).map((id) => id.toLowerCase()));

  for (const entry of catalog) {
    const names = entryNames(entry, lang);
    const tokenHit = Boolean(entry.slug && tokenSet.has(entry.slug)) || Boolean(entry.defId && tokenSet.has(entry.defId));
    const uuidHit = Boolean(entry.id && uuidSet.has(entry.id.toLowerCase())) || Boolean(entry.canvasId && uuidSet.has(entry.canvasId.toLowerCase()));
    const nameHit = names.some((name) => shouldMatchName(name) && lower.includes(name.toLowerCase()));
    if (!tokenHit && !uuidHit && !nameHit) continue;
    refs.push(catalogEntryToReference(entry, nameHit ? bestLabel(entry, lang) : entry.label));
  }

  return refs;
}

function resolveReference(ref: CopilotTypedReference, catalog: CopilotReferenceCatalogEntry[]): CopilotResolvedReference {
  const candidates = findCandidates(ref, catalog);
  if (candidates.length === 1) {
    const target = candidates[0]!;
    const reference = { ...ref, ...catalogEntryIdentity(target), label: ref.label || target.label };
    return {
      reference,
      status: 'resolved',
      openable: referenceOpenable(reference.kind),
      previewable: referencePreviewable(reference.kind),
      target,
    };
  }
  if (candidates.length > 1) {
    return {
      reference: ref,
      status: 'ambiguous',
      openable: false,
      previewable: false,
      candidates,
      reason: 'multiple-candidates',
    };
  }
  return {
    reference: ref,
    status: 'missing',
    openable: false,
    previewable: false,
    reason: 'no-catalog-match',
  };
}

function findCandidates(ref: CopilotTypedReference, catalog: CopilotReferenceCatalogEntry[]): CopilotReferenceCatalogEntry[] {
  const matchingKind = catalog.filter((entry) => entry.kind === ref.kind || kindCompatible(entry.kind, ref.kind));
  const exact = matchingKind.filter((entry) => identityMatches(ref, entry));
  if (exact.length > 0) return exact;

  const label = normaliseText(ref.label);
  if (!label) return [];
  return matchingKind.filter((entry) => entryNames(entry).some((name) => normaliseText(name) === label));
}

function kindCompatible(entryKind: CopilotTypedReferenceKind, refKind: CopilotTypedReferenceKind): boolean {
  return refKind === 'canvasInstance' && entryKind === 'canvasTemplate';
}

function identityMatches(ref: CopilotTypedReference, entry: CopilotReferenceCatalogEntry): boolean {
  return (
    Boolean(ref.canvasId && (entry.canvasId === ref.canvasId || entry.id === ref.canvasId)) ||
    Boolean(ref.projectId && (entry.projectId === ref.projectId || entry.id === ref.projectId)) ||
    Boolean(ref.storyId && (entry.storyId === ref.storyId || entry.id === ref.storyId)) ||
    Boolean(ref.defId && (entry.defId === ref.defId || entry.id === ref.defId)) ||
    Boolean(ref.resourceSlug && (entry.resourceSlug === ref.resourceSlug || entry.slug === ref.resourceSlug)) ||
    Boolean(ref.chapterSlug && entry.chapterSlug === ref.chapterSlug && (!ref.resourceSlug || entry.resourceSlug === ref.resourceSlug)) ||
    Boolean(ref.slug && (entry.slug === ref.slug || entry.resourceSlug === ref.slug || entry.defId === ref.slug)) ||
    Boolean(ref.id && (entry.id === ref.id || entry.slug === ref.id || entry.defId === ref.id || entry.canvasId === ref.id))
  );
}

function normaliseCatalog(catalog: CopilotReferenceCatalog): CopilotReferenceCatalogEntry[] {
  return catalog.entries.map((entry) => ({
    ...entry,
    aliases: [...(entry.aliases ?? []), ...(entry.defId ? CANVAS_ALIASES[entry.defId] ?? [] : [])],
  }));
}

function catalogEntryToReference(entry: CopilotReferenceCatalogEntry, label: string): CopilotTypedReference {
  return {
    kind: entry.kind,
    label,
    ...catalogEntryIdentity(entry),
    ...(entry.summary ? { summary: entry.summary } : {}),
  };
}

function catalogEntryIdentity(entry: CopilotReferenceCatalogEntry): Partial<CopilotTypedReference> {
  return {
    ...(entry.id ? { id: entry.id } : {}),
    ...(entry.slug ? { slug: entry.slug } : {}),
    ...(entry.defId ? { defId: entry.defId } : {}),
    ...(entry.canvasId ? { canvasId: entry.canvasId } : {}),
    ...(entry.projectId ? { projectId: entry.projectId } : {}),
    ...(entry.storyId ? { storyId: entry.storyId } : {}),
    ...(entry.resourceSlug ? { resourceSlug: entry.resourceSlug } : {}),
    ...(entry.chapterSlug ? { chapterSlug: entry.chapterSlug } : {}),
  };
}

function entryNames(entry: CopilotReferenceCatalogEntry, _lang?: Lang): string[] {
  return [
    entry.label,
    entry.id,
    entry.slug,
    entry.defId,
    entry.canvasId,
    entry.projectId,
    entry.storyId,
    entry.resourceSlug,
    entry.chapterSlug,
    ...(entry.aliases ?? []),
  ].filter((item): item is string => Boolean(item));
}

function bestLabel(entry: CopilotReferenceCatalogEntry, _lang: Lang): string {
  return entry.label || entry.slug || entry.defId || entry.id || '';
}

function shouldMatchName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length >= 2 && !/^[a-z0-9-]{1,3}$/i.test(trimmed);
}

function extractKebabTokens(content: string): string[] {
  const matches = Array.from(content.matchAll(KEBAB_RE), (match) => match[0]!.replace(/`/g, '').toLowerCase());
  return Array.from(new Set(matches));
}

function normaliseText(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, ' ');
}

function referenceKey(ref: CopilotTypedReference): string {
  return [
    ref.kind,
    ref.id,
    ref.slug,
    ref.defId,
    ref.canvasId,
    ref.projectId,
    ref.storyId,
    ref.resourceSlug,
    ref.chapterSlug,
    ref.label,
  ].filter(Boolean).join(':');
}
