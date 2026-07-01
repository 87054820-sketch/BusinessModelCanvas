import type { FastifyInstance } from 'fastify';
import * as Y from 'yjs';
import type { CanvasStorage } from '../storage/CanvasStorage.js';
import type { LoadedCanvasDef } from '../canvasDefs/loader.js';
import type { ProjectAccessService } from '../auth/ProjectAccessService.js';
import {
  getXAxisItemsRoot,
  makeXAxisItemYMap,
} from '../collab/encoders.js';

/**
 * Routes:
 *   GET  /canvases/:id/state    → binary Yjs state, or 204 if empty
 *   PUT  /canvases/:id/state    → save raw binary Yjs state, bump meta
 *
 * Accepts `application/octet-stream`. The server.ts adds the parser.
 *
 * Side-effect on GET: if the canvas's manifest declares
 * `chart.factorsDefault` and the persisted state is empty / missing the
 * `xAxisItems` array, we seed the array from the defaults and persist
 * the result before responding. Subsequent GETs are a no-op once the
 * array exists. This keeps the first-render of a chart-canvas non-blank
 * without requiring the client to trigger a separate seed call.
 */
export function registerYjsStateRoutes(
  app: FastifyInstance,
  storage: CanvasStorage,
  defs: LoadedCanvasDef[],
  access: ProjectAccessService,
) {
  const defsById = new Map(defs.map((d) => [d.def.id, d]));

  app.get<{ Params: { id: string } }>(
    '/canvases/:id/state',
    async (req, reply) => {
      const result = await access.ensureCanvas(req, reply, req.params.id, 'view');
      if (!result) return;
      const meta = result.canvas;

      const bundle = defsById.get(meta.defId);
      const factorsDefault = bundle?.def.chart?.factorsDefault ?? [];

      let state = await storage.loadYDocState(req.params.id);

      // Seed xAxisItems from manifest defaults when:
      //   - the manifest declares factors, AND
      //   - the persisted state is empty OR doesn't have any xAxisItems.
      // Seeding is idempotent — once any item exists we leave the array
      // alone so user edits aren't overwritten.
      if (factorsDefault.length > 0 && result.capabilities.canEdit) {
        const seeded = await seedFactorsIfEmpty(state, factorsDefault);
        if (seeded) {
          await storage.saveYDocState(req.params.id, seeded);
          state = seeded;
        }
      }

      if (!state || state.byteLength === 0) {
        return reply.code(204).send();
      }
      return reply
        .type('application/octet-stream')
        .header('Cache-Control', 'no-store')
        .send(Buffer.from(state));
    },
  );

  app.put<{ Params: { id: string }; Body: Buffer }>(
    '/canvases/:id/state',
    async (req, reply) => {
      const result = await access.ensureCanvas(req, reply, req.params.id, 'edit');
      if (!result?.identity) return;
      const body = req.body;
      if (!Buffer.isBuffer(body) || body.byteLength === 0) {
        return reply.code(400).send({ error: 'Empty body' });
      }
      const identity = result.identity;
      await storage.saveYDocState(req.params.id, new Uint8Array(body));
      await storage.updateCanvasMeta(req.params.id, {
        updatedBy: identity.displayName,
        updatedByUserId: identity.userId,
      });
      return reply.code(204).send();
    },
  );
}

/**
 * If the doc state is empty or missing xAxisItems, push the manifest
 * defaults into a fresh Yjs doc and return the new encoded state.
 * Returns `null` when no seed is needed — the caller serves the
 * existing state untouched.
 */
async function seedFactorsIfEmpty(
  existing: Uint8Array | null,
  defaults: ReadonlyArray<{ id: string; label: { en: string; zh: string } }>,
): Promise<Uint8Array | null> {
  const doc = new Y.Doc();
  try {
    if (existing && existing.byteLength > 0) Y.applyUpdate(doc, existing);
    const root = getXAxisItemsRoot(doc);
    if (root.length > 0) return null; // already seeded — leave alone
    doc.transact(() => {
      defaults.forEach((d) => {
        root.push([makeXAxisItemYMap({ id: d.id, label: d.label })]);
      });
    });
    return Y.encodeStateAsUpdate(doc);
  } finally {
    doc.destroy();
  }
}
