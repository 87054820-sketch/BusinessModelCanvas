import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { Command, Option } from 'clipanion';
import * as Y from 'yjs';
import * as pc from 'picocolors';
import type {
  CanvasDef,
  CanvasMeta,
  ObjectsBulkInput,
  Pin,
  PinClass,
  StickyNote,
  XAxisItem,
} from '@pingarden/shared';
import {
  encodeObjectsBulk,
  getPinClassesRoot,
  getPinsRoot,
  getXAxisItemsRoot,
  readColorLegend,
  readPin,
  readPinClass,
  readXAxisItem,
} from '@pingarden/shared/yjs';
import { CliError } from '../lib/errors.js';

/**
 * `pingarden case relayout <slug>` — re-runs the auto-stack layout
 * over every canvas in a case.
 *
 * The original placement (golden-spiral jitter, then a half-broken
 * stack) means the shipped Swiss + wechat ydoc binaries have stickies
 * either piled on top of each other or escaping the zone bbox. This
 * command lets us fix them in-place WITHOUT needing the original
 * authoring spec — we read each `live.ydoc`, extract every object
 * (stickies, pin classes, pins, factors, chart-config, color-legend),
 * drop sticky x/y so `encodeObjectsBulk`'s `resolvePosition` re-applies
 * the current auto-layout, then write the new bytes back.
 *
 * Other object types (pins / factors / chart) keep their explicit
 * positions because their semantics depend on them. Only stickies are
 * re-laid out — the convention is "stickies auto, pins manual".
 *
 * The case authoring tool already generates layout-correct output for
 * NEW cases; this is a one-shot retroactive fix for the in-tree
 * library. Useful again whenever the layout algorithm itself is
 * tweaked.
 */
export class CaseRelayoutCommand extends Command {
  static override paths = [['case', 'relayout']];
  static override usage = Command.Usage({
    category: 'Case library',
    description: 'Re-run the sticky auto-stack layout over every canvas in a case (in-place)',
    details: `
      Reads each canvas's live.ydoc, drops the explicit sticky x/y, and
      re-encodes via the shared encodeObjectsBulk so the current
      auto-layout (vertical stack with column wrap, top-inset to
      clear the zone label) applies. Pin / factor / chart positions
      are preserved.

      Run after editing the layout algorithm in
      packages/shared/src/yjs.ts to re-baseline shipped library
      ydocs. By default writes in-place; pass --dry-run to preview.
    `,
    examples: [
      ['Re-layout the Swiss case', 'pingarden case relayout swiss-private-banking'],
      ['Preview without writing', 'pingarden case relayout wechat-private-domain --dry-run'],
    ],
  });

  slug = Option.String();
  caseLibraryDir = Option.String('--case-library', {
    description:
      "Path to the case-library 'cases' dir (auto-discovered from cwd by default)",
  });
  bundlesDir = Option.String('--bundles', {
    description:
      "Path to the canvas bundles dir 'packages/canvases' (auto-discovered)",
  });
  dryRun = Option.Boolean('--dry-run', false, {
    description: 'Print what would change without writing live.ydoc files',
  });

  override async execute(): Promise<number> {
    const caseLibraryDir = discoverCaseLibraryDir(this.caseLibraryDir);
    const bundlesDir = discoverBundlesDir(this.bundlesDir);
    const caseDir = join(caseLibraryDir, this.slug);
    if (!existsSync(caseDir)) {
      throw new CliError('BAD_INPUT', `Case '${this.slug}' not found at ${caseDir}`);
    }

    const canvasesRoot = join(caseDir, 'canvases');
    if (!existsSync(canvasesRoot)) {
      this.context.stdout.write(`No canvases dir at ${canvasesRoot} — nothing to relayout.\n`);
      return 0;
    }

    const summaries: CanvasRelayoutSummary[] = [];
    const canvasIds = readdirSync(canvasesRoot).filter((entry) => {
      const stat = safeStat(join(canvasesRoot, entry));
      return stat?.isDirectory();
    });

    for (const id of canvasIds) {
      const summary = await relayoutOneCanvas({
        canvasDir: join(canvasesRoot, id),
        bundlesDir,
      });
      if (summary) summaries.push(summary);
    }

    // Pretty report — one line per canvas, total at the end. Keeps
    // the output diffable in CI logs.
    for (const s of summaries) {
      const verb = this.dryRun ? pc.yellow('would re-layout') : pc.green('re-laid out');
      this.context.stdout.write(
        `  ${verb} ${s.canvasId.slice(0, 8)} (${s.defId}): ${s.stickyCount} stickies, ${s.bytesAfter} bytes ${
          s.bytesBefore === s.bytesAfter ? pc.gray('(unchanged size)') : pc.gray(`(was ${s.bytesBefore})`)
        }\n`,
      );
      if (!this.dryRun) {
        writeFileSync(join(s.canvasDir, 'live.ydoc'), Buffer.from(s.bytes));
      }
    }

    const total = summaries.reduce((n, s) => n + s.stickyCount, 0);
    const banner = this.dryRun ? pc.yellow('dry-run: ') : '';
    this.context.stdout.write(
      `${banner}${pc.bold(this.slug)}: ${summaries.length} canvas(es), ${total} sticky(ies) repositioned\n`,
    );
    return 0;
  }
}

interface CanvasRelayoutSummary {
  canvasId: string;
  canvasDir: string;
  defId: string;
  stickyCount: number;
  bytesBefore: number;
  bytesAfter: number;
  bytes: Uint8Array;
}

async function relayoutOneCanvas(opts: {
  canvasDir: string;
  bundlesDir: string;
}): Promise<CanvasRelayoutSummary | null> {
  const metaPath = join(opts.canvasDir, 'meta.json');
  const ydocPath = join(opts.canvasDir, 'live.ydoc');
  if (!existsSync(metaPath) || !existsSync(ydocPath)) return null;

  const meta = JSON.parse(readFileSync(metaPath, 'utf8')) as CanvasMeta;
  const defManifestPath = join(opts.bundlesDir, meta.defId, 'manifest.json');
  if (!existsSync(defManifestPath)) {
    throw new CliError(
      'BAD_INPUT',
      `Canvas def '${meta.defId}' (used by canvas ${meta.id}) not found at ${defManifestPath}`,
    );
  }
  const def = JSON.parse(readFileSync(defManifestPath, 'utf8')) as CanvasDef;

  const before = readFileSync(ydocPath);
  const doc = new Y.Doc();
  Y.applyUpdate(doc, before);

  // Pull every object kind out of the doc into the bulk-input shape.
  // We strip x/y on stickies (the whole point) but keep them on pins
  // / factors — those are user-positioned and shouldn't move when
  // the sticky auto-layout changes. Note: ObjectsBulkInput only
  // covers stickies / pinClasses / pins / xAxisItems / colorLegend.
  // chartConfig lives outside the bulk schema; for the cases we
  // ship today (BMC-only) it isn't used, so we don't try to
  // round-trip it here.
  //
  // Each bucket is included only when it's non-empty. The encoder
  // validates against the canvas def's allowed object-type list
  // (e.g. BMC rejects xAxisItem entirely), so an empty-but-present
  // bucket would crash the relayout for no reason — the input
  // didn't actually contain any forbidden items, the bucket was
  // just always-present.
  const stickies = extractStickiesAsBulk(doc);
  const pinClasses = extractPinClassesAsBulk(doc);
  const pins = extractPinsAsBulk(doc);
  const xAxisItems = extractXAxisItemsAsBulk(doc);
  const colorLegend = readColorLegend(doc);
  const bulk: ObjectsBulkInput = {
    ...(stickies.length > 0 ? { stickies } : {}),
    ...(pinClasses.length > 0 ? { pinClasses } : {}),
    ...(pins.length > 0 ? { pins } : {}),
    ...(xAxisItems.length > 0 ? { xAxisItems } : {}),
    ...(Object.keys(colorLegend).length > 0 ? { colorLegend } : {}),
  };

  doc.destroy();

  // Re-encode. Crucially: stickies have undefined x/y so
  // resolvePosition() inside encodeObjectsBulk applies the current
  // auto-layout — that's the whole point of this command.
  const result = encodeObjectsBulk(bulk, def, {
    defaultAuthor: meta.createdBy ?? 'PinGarden Library',
    now: meta.updatedAt ?? new Date().toISOString(),
  });

  return {
    canvasId: meta.id,
    canvasDir: opts.canvasDir,
    defId: meta.defId,
    stickyCount: stickies.length,
    bytesBefore: before.byteLength,
    bytesAfter: result.state.byteLength,
    bytes: result.state,
  };
}

// ─── Yjs → bulk-input extractors ────────────────────────────────────

function extractStickiesAsBulk(doc: Y.Doc): NonNullable<ObjectsBulkInput['stickies']> {
  const root = doc.getMap<Y.Map<unknown>>('stickies');
  const out: NonNullable<ObjectsBulkInput['stickies']> = [];
  // Sort by createdAt so the new auto-layout's `idx` (which becomes
  // sticky position within zone) follows the original creation
  // order — same order the live workspace UI shows.
  const collected: Array<{ note: StickyNote; createdAt: string }> = [];
  root.forEach((y) => {
    const id = y.get('id') as string | undefined;
    const zoneId = y.get('zoneId') as string | undefined;
    if (!id || !zoneId) return;
    const text = (y.get('text') as string | undefined) ?? '';
    const color = (y.get('color') as string | undefined) ?? undefined;
    const widthRaw = y.get('width');
    const heightRaw = y.get('height');
    const width = typeof widthRaw === 'number' ? widthRaw : undefined;
    const height = typeof heightRaw === 'number' ? heightRaw : undefined;
    const authorName = (y.get('authorName') as string | undefined) ?? '';
    const createdAt = (y.get('createdAt') as string | undefined) ?? '';
    collected.push({
      note: {
        id,
        zoneId,
        x: 0, // stripped; encodeObjectsBulk re-positions
        y: 0,
        text,
        color: color ?? '#FFE066',
        authorName,
        createdAt,
        ...(width !== undefined ? { width } : {}),
        ...(height !== undefined ? { height } : {}),
      },
      createdAt,
    });
  });
  collected.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const { note } of collected) {
    out.push({
      zoneId: note.zoneId,
      text: note.text,
      ...(note.color ? { color: note.color } : {}),
      // x / y intentionally omitted — auto-layout will fill them
      ...(note.width !== undefined ? { width: note.width } : {}),
      ...(note.height !== undefined ? { height: note.height } : {}),
      ...(note.authorName ? { authorName: note.authorName } : {}),
    });
  }
  return out;
}

function extractPinClassesAsBulk(doc: Y.Doc): NonNullable<ObjectsBulkInput['pinClasses']> {
  const root = getPinClassesRoot(doc);
  const out: NonNullable<ObjectsBulkInput['pinClasses']> = [];
  const collected: PinClass[] = [];
  root.forEach((y) => {
    const c = readPinClass(y);
    if (c) collected.push(c);
  });
  // Pin classes are typically display-ordered by id; use that
  // (case author tools tend to write them deterministically).
  collected.sort((a, b) => a.id.localeCompare(b.id));
  for (const c of collected) {
    out.push({
      id: c.id,
      label: c.label,
      ...(c.color ? { color: c.color } : {}),
      ...(c.icon ? { icon: c.icon } : {}),
    });
  }
  return out;
}

function extractPinsAsBulk(doc: Y.Doc): NonNullable<ObjectsBulkInput['pins']> {
  const root = getPinsRoot(doc);
  const out: NonNullable<ObjectsBulkInput['pins']> = [];
  const collected: Pin[] = [];
  root.forEach((y) => {
    const p = readPin(y);
    if (p) collected.push(p);
  });
  collected.sort((a, b) => a.id.localeCompare(b.id));
  for (const p of collected) {
    out.push({
      id: p.id,
      classId: p.classId,
      x: p.x,
      y: p.y,
      ...(p.label ? { label: p.label } : {}),
      ...(p.body ? { body: p.body } : {}),
    });
  }
  return out;
}

function extractXAxisItemsAsBulk(doc: Y.Doc): NonNullable<ObjectsBulkInput['xAxisItems']> {
  const root = getXAxisItemsRoot(doc);
  const out: NonNullable<ObjectsBulkInput['xAxisItems']> = [];
  const collected: XAxisItem[] = [];
  root.forEach((y) => {
    const item = readXAxisItem(y);
    if (item) collected.push(item);
  });
  for (const f of collected) {
    out.push({ id: f.id, label: f.label });
  }
  return out;
}

// ─── path resolution helpers ────────────────────────────────────────

function discoverCaseLibraryDir(override?: string): string {
  if (override) {
    if (!existsSync(override)) {
      throw new CliError('BAD_INPUT', `Case library dir not found: ${override}`);
    }
    return resolve(override);
  }
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    const candidate = join(dir, 'packages', 'case-library', 'cases');
    if (existsSync(candidate)) return candidate;
    const parent = resolve(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }
  throw new CliError(
    'BAD_INPUT',
    "Couldn't find packages/case-library/cases relative to cwd; pass --case-library",
  );
}

function discoverBundlesDir(override?: string): string {
  if (override) {
    if (!existsSync(override)) {
      throw new CliError('BAD_INPUT', `Bundles dir not found: ${override}`);
    }
    return resolve(override);
  }
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    const candidate = join(dir, 'packages', 'canvases');
    if (existsSync(candidate)) return candidate;
    const parent = resolve(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }
  throw new CliError(
    'BAD_INPUT',
    "Couldn't find packages/canvases relative to cwd; pass --bundles",
  );
}

function safeStat(p: string) {
  try {
    return statSync(p);
  } catch {
    return null;
  }
}

// Avoid unused-import lint when these helpers grow internally.
void relative;
