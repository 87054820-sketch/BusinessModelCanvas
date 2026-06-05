import Fastify from 'fastify';
import cors from '@fastify/cors';
import staticPlugin from '@fastify/static';
import { resolve } from 'node:path';
import { config } from './config.js';
import { FileSystemStorage } from './storage/FileSystemStorage.js';
import { loadCanvasDefs } from './canvasDefs/loader.js';
import { registerCanvasDefRoutes } from './http/canvasDefs.js';
import { registerCanvasRoutes } from './http/canvases.js';
import { registerProjectRoutes } from './http/projects.js';
import { registerYjsStateRoutes } from './http/yjsState.js';
import { registerSnapshotRoutes } from './http/snapshots.js';
import { registerAiContextRoutes } from './http/aiContext.js';
import { registerStickyImportRoutes } from './http/stickyImport.js';
import { registerObjectsImportRoutes } from './http/objectsImport.js';

async function main() {
  const app = Fastify({ logger: true, bodyLimit: 8 * 1024 * 1024 });

  await app.register(cors, { origin: true });

  // Accept raw binary bodies for Yjs state uploads.
  app.addContentTypeParser(
    'application/octet-stream',
    { parseAs: 'buffer' },
    (_req, body, done) => done(null, body),
  );

  const defs = await loadCanvasDefs(config.canvasDefsDir);
  app.log.info(
    { ids: defs.map((d) => d.def.id) },
    `Loaded ${defs.length} canvas definitions`,
  );

  const storage = new FileSystemStorage(config.dataDir);
  app.log.info({ dataDir: config.dataDir }, 'Using FileSystemStorage');

  registerCanvasDefRoutes(app, defs);
  registerProjectRoutes(app, storage);
  registerCanvasRoutes(app, storage, defs);
  registerYjsStateRoutes(app, storage, defs);
  registerSnapshotRoutes(app, storage);
  registerAiContextRoutes(app, storage, defs);
  registerStickyImportRoutes(app, storage, defs);
  registerObjectsImportRoutes(app, storage, defs);

  app.get('/health', async () => ({
    ok: true,
    ...(config.desktopInstanceId ? { desktopInstanceId: config.desktopInstanceId } : {}),
  }));

  // In production (e.g. inside Electron) serve the built web SPA so
  // a single port hosts both the API and the frontend.
  const isProduction = process.env.NODE_ENV === 'production';
  const webDistDir = process.env.WEB_DIST_DIR;
  if (isProduction && webDistDir) {
    await app.register(staticPlugin, {
      root: resolve(webDistDir),
      prefix: '/',
      wildcard: false,
    });
    // SPA fallback: unknown non-API paths serve index.html
    app.setNotFoundHandler(async (req, reply) => {
      const apiPrefix =
        req.url.startsWith('/health') ||
        req.url.startsWith('/canvas-defs') ||
        req.url.startsWith('/canvases') ||
        req.url.startsWith('/projects') ||
        req.url.startsWith('/snapshots') ||
        req.url.startsWith('/ai-context') ||
        req.url.startsWith('/sticky-import') ||
        req.url.startsWith('/objects-import');
      if (apiPrefix) {
        reply.code(404);
        return { error: 'Not Found' };
      }
      return reply.sendFile('index.html', resolve(webDistDir));
    });
  }

  await app.listen({ port: config.port, host: config.host });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Server failed to start:', err);
  process.exit(1);
});
