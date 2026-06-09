import type { AiContext } from '@pingarden/shared';
import type { ObjectsBulkInput } from './schemas.js';

/**
 * Per-zone diff between an existing canvas (read via /ai-context)
 * and an incoming bulk-write payload. Only stickies are zone-grouped;
 * other roots (pins, pinClasses, xAxisItems, colorLegend) are
 * counted at the top level.
 *
 * Replace-mode semantics mean we can't track individual stickies
 * across the boundary — the server assigns fresh ids on every
 * write — so the diff is intentionally coarse: counts per zone, plus
 * unknown-zone warnings. That's enough for a human or AI to sanity-
 * check "yes, I'm adding 3 to Customer Segments and removing nothing
 * from Channels" before committing.
 */
export interface ZoneStickyDiff {
  zoneId: string;
  before: number;
  after: number;
  net: number;
}

export interface BulkDiff {
  stickies?: {
    byZone: ZoneStickyDiff[];
    totalBefore: number;
    totalAfter: number;
    unknownZones: string[];
  };
  pinClasses?: { before: number; after: number };
  pins?: { before: number; after: number };
  xAxisItems?: { before: number; after: number };
  colorLegend?: { before: number; after: number };
}

export function computeBulkDiff(
  existing: AiContext,
  incoming: ObjectsBulkInput,
): BulkDiff {
  const out: BulkDiff = {};

  if (incoming.stickies !== undefined) {
    const knownZones = new Set(existing.blocks.map((b) => b.id));
    const beforeByZone = new Map<string, number>();
    for (const block of existing.blocks) {
      beforeByZone.set(block.id, block.stickies.length);
    }
    const afterByZone = new Map<string, number>();
    const unknownZones = new Set<string>();
    for (const s of incoming.stickies) {
      if (!knownZones.has(s.zoneId)) unknownZones.add(s.zoneId);
      afterByZone.set(s.zoneId, (afterByZone.get(s.zoneId) ?? 0) + 1);
    }
    const allZones = new Set<string>([
      ...beforeByZone.keys(),
      ...afterByZone.keys(),
    ]);
    const byZone: ZoneStickyDiff[] = [];
    let totalBefore = 0;
    let totalAfter = 0;
    for (const zoneId of [...allZones].sort()) {
      const before = beforeByZone.get(zoneId) ?? 0;
      const after = afterByZone.get(zoneId) ?? 0;
      totalBefore += before;
      totalAfter += after;
      if (before === 0 && after === 0) continue;
      byZone.push({ zoneId, before, after, net: after - before });
    }
    out.stickies = {
      byZone,
      totalBefore,
      totalAfter,
      unknownZones: [...unknownZones],
    };
  }

  if (incoming.pinClasses !== undefined) {
    out.pinClasses = {
      before: existing.pinClasses?.length ?? 0,
      after: incoming.pinClasses.length,
    };
  }
  if (incoming.pins !== undefined) {
    out.pins = {
      before: existing.pins?.length ?? 0,
      after: incoming.pins.length,
    };
  }
  if (incoming.xAxisItems !== undefined) {
    out.xAxisItems = {
      before: existing.factors?.length ?? 0,
      after: incoming.xAxisItems.length,
    };
  }
  if (incoming.colorLegend !== undefined) {
    out.colorLegend = {
      before: Object.keys(existing.colorLegend ?? {}).length,
      after: Object.keys(incoming.colorLegend).length,
    };
  }

  return out;
}

export function renderDiffHuman(diff: BulkDiff): string {
  const lines: string[] = [];
  if (diff.stickies) {
    lines.push('Stickies');
    if (diff.stickies.unknownZones.length > 0) {
      lines.push(
        `  ⚠ unknown zoneId(s): ${diff.stickies.unknownZones.join(', ')}`,
      );
    }
    for (const z of diff.stickies.byZone) {
      const sign = z.net > 0 ? `+${z.net}` : z.net < 0 ? `${z.net}` : '±0';
      lines.push(
        `  ${z.zoneId.padEnd(28)} ${sign.padStart(4)}   (was ${z.before}, now ${z.after})`,
      );
    }
    const totalSign =
      diff.stickies.totalAfter > diff.stickies.totalBefore
        ? `+${diff.stickies.totalAfter - diff.stickies.totalBefore}`
        : diff.stickies.totalAfter < diff.stickies.totalBefore
          ? `${diff.stickies.totalAfter - diff.stickies.totalBefore}`
          : '±0';
    lines.push(
      `  ${'TOTAL'.padEnd(28)} ${totalSign.padStart(4)}   (was ${diff.stickies.totalBefore}, now ${diff.stickies.totalAfter})`,
    );
  }
  for (const [key, val] of Object.entries(diff)) {
    if (key === 'stickies') continue;
    if (!val) continue;
    const v = val as { before: number; after: number };
    lines.push(`${key}: was ${v.before}, now ${v.after}`);
  }
  return lines.join('\n');
}
