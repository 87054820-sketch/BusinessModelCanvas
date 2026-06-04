import type { FastifyInstance } from 'fastify';
import type { CanvasStorage } from '../storage/CanvasStorage.js';
import { getIdentity } from './identity.js';

/**
 * Routes:
 *   GET  /canvases/:id/state    → binary Yjs state, or 204 if empty
 *   PUT  /canvases/:id/state    → save raw binary Yjs state, bump meta
 *
 * Accepts `application/octet-stream`. The server.ts adds the parser.
 */
export function registerYjsStateRoutes(app: FastifyInstance, storage: CanvasStorage) {
  app.get<{ Params: { id: string } }>(
    '/canvases/:id/state',
    async (req, reply) => {
      const meta = await storage.getCanvas(req.params.id);
      if (!meta) return reply.code(404).send({ error: 'Canvas not found' });
      const state = await storage.loadYDocState(req.params.id);
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
      const meta = await storage.getCanvas(req.params.id);
      if (!meta) return reply.code(404).send({ error: 'Canvas not found' });
      const body = req.body;
      if (!Buffer.isBuffer(body) || body.byteLength === 0) {
        return reply.code(400).send({ error: 'Empty body' });
      }
      const identity = getIdentity(req);
      await storage.saveYDocState(req.params.id, new Uint8Array(body));
      await storage.updateCanvasMeta(req.params.id, {
        updatedBy: identity.displayName,
      });
      return reply.code(204).send();
    },
  );
}
