import { z } from 'zod';

/**
 * Zod schemas mirroring `apps/server/src/http/objectsImport.ts`.
 * Validating client-side gives the user a fast, structured error
 * before the network round trip.
 *
 * Keep these in lockstep with the server. The server's check is
 * authoritative — these are an early warning, not the source of
 * truth.
 */

export const StickyInputSchema = z.object({
  zoneId: z.string().min(1),
  text: z.string(),
  color: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  authorName: z.string().optional(),
});

export const PinClassInputSchema = z.object({
  id: z.string().optional(),
  label: z.string(),
  color: z.string().optional(),
  icon: z.enum(['circle', 'triangle', 'square', 'star', 'flag']).optional(),
  authorName: z.string().optional(),
});

export const PinInputSchema = z.object({
  id: z.string().optional(),
  classId: z.string().min(1),
  x: z.number(),
  y: z.number(),
  label: z.string().optional(),
  body: z.string().optional(),
  authorName: z.string().optional(),
});

export const XAxisItemInputSchema = z.object({
  id: z.string().min(1),
  label: z.object({ en: z.string(), zh: z.string() }),
});

export const ColorLegendEntryInputSchema = z.object({
  label: z.string().min(1).max(60),
  description: z.string().max(240).optional(),
});

export const ObjectsBulkInputSchema = z
  .object({
    stickies: z.array(StickyInputSchema).max(500).optional(),
    pinClasses: z.array(PinClassInputSchema).max(50).optional(),
    pins: z.array(PinInputSchema).max(500).optional(),
    xAxisItems: z.array(XAxisItemInputSchema).max(50).optional(),
    colorLegend: z.record(z.string(), ColorLegendEntryInputSchema).optional(),
  })
  .strict()
  .refine(
    (v) =>
      v.stickies !== undefined ||
      v.pinClasses !== undefined ||
      v.pins !== undefined ||
      v.xAxisItems !== undefined ||
      v.colorLegend !== undefined,
    {
      message:
        'Payload must include at least one of: stickies, pinClasses, pins, xAxisItems, colorLegend',
    },
  );

export type ObjectsBulkInput = z.infer<typeof ObjectsBulkInputSchema>;
