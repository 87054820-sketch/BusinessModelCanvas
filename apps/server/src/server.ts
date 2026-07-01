import Fastify from 'fastify';
import cors from '@fastify/cors';
import staticPlugin from '@fastify/static';
import { resolve } from 'node:path';
import { COPILOT_MAX_IMAGE_ATTACHMENTS, COPILOT_MAX_IMAGE_BYTES } from '@pingarden/shared';
import { config } from './config.js';
import { BundleStorage } from './storage/BundleStorage.js';
import { FederatedStorage } from './storage/FederatedStorage.js';
import { createWritableStorage } from './storage/createStorage.js';
import { BundleReadOnlyError } from './storage/errors.js';
import { FileSystemAccessStore } from './auth/AccessStore.js';
import { ProjectAccessService } from './auth/ProjectAccessService.js';
import { loadCanvasDefs } from './canvasDefs/loader.js';
import { registerAuthRoutes } from './http/auth.js';
import { registerCanvasDefRoutes } from './http/canvasDefs.js';
import { registerCanvasRoutes } from './http/canvases.js';
import { registerProjectRoutes } from './http/projects.js';
import { registerYjsStateRoutes } from './http/yjsState.js';
import { registerSnapshotRoutes } from './http/snapshots.js';
import { registerAiContextRoutes } from './http/aiContext.js';
import { registerStickyImportRoutes } from './http/stickyImport.js';
import { registerObjectsImportRoutes } from './http/objectsImport.js';
import { registerStoryRoutes } from './http/stories.js';
import { registerLibraryRoutes } from './http/library.js';
import { registerCopilotRoutes } from './http/copilot.js';
import { registerCopilotMemoryRoutes } from './http/copilotMemory.js';
import { registerSkillPackRoutes } from './http/skillPack.js';
import {
  getPortFilePath,
  registerPortFileCleanup,
  writePortFile,
} from './util/portFile.js';

const JSON_BASE64_OVERHEAD = 4 / 3;
const COPILOT_BODY_LIMIT = Math.ceil(
  COPILOT_MAX_IMAGE_ATTACHMENTS * COPILOT_MAX_IMAGE_BYTES * JSON_BASE64_OVERHEAD,
) + 1024 * 1024;

async function main() {
  const app = Fastify({ logger: true, bodyLimit: COPILOT_BODY_LIMIT });

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

  const userStorage = createWritableStorage(config.storageMode, config.dataDir);
  const bundleStorage = await BundleStorage.load(config.caseLibraryDir);
  const storage = new FederatedStorage(userStorage, bundleStorage);
  const accessStore = new FileSystemAccessStore(config.dataDir);
  const access = new ProjectAccessService(storage, accessStore);
  app.log.info(
    {
      dataDir: config.dataDir,
      authMode: config.authMode,
      storageMode: config.storageMode,
      caseLibraryDir: config.caseLibraryDir,
      libraryCases: bundleStorage.size,
      libraryResources: bundleStorage.listResources().length,
    },
    'Using FederatedStorage (writable user storage + read-only BundleStorage)',
  );

  registerAuthRoutes(app);
  registerCanvasDefRoutes(app, defs);
  registerProjectRoutes(app, storage, access);
  registerCanvasRoutes(app, storage, defs, access);
  registerYjsStateRoutes(app, storage, defs, access);
  registerSnapshotRoutes(app, storage, access);
  registerAiContextRoutes(app, storage, defs, access);
  registerStickyImportRoutes(app, storage, defs, access);
  registerObjectsImportRoutes(app, storage, defs, access);
  registerStoryRoutes(app, storage, access);
  registerLibraryRoutes(app, storage, access);
  registerCopilotRoutes(app, storage, defs, access);
  registerCopilotMemoryRoutes(app, config.dataDir);
  registerSkillPackRoutes(app);

  // Global error handler — maps storage-level read-only failures to a
  // structured 403 so every mutating route gets correct HTTP semantics
  // without each handler having to remember the check. Anything else
  // delegates to fastify's default behaviour.
  app.setErrorHandler((error, _req, reply) => {
    if (error instanceof BundleReadOnlyError) {
      return reply.code(403).send({
        error: 'Forbidden',
        message: error.message,
        code: 'CASE_LIBRARY_READ_ONLY',
        operation: error.operation,
        ...(error.targetId ? { targetId: error.targetId } : {}),
      });
    }
    return reply.send(error);
  });

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
      setHeaders(res, pathName) {
        if (pathName.endsWith('/index.html') || pathName.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
          return;
        }
        if (pathName.includes('/assets/')) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    });
    // SPA fallback: unknown non-API paths serve index.html
    app.setNotFoundHandler(async (req, reply) => {
      const wantsHtml = req.headers.accept?.includes('text/html');
      const pathname = req.url.split('?', 1)[0] ?? req.url;
      if (pathname.startsWith('/assets/')) {
        reply.code(404);
        return { error: 'Asset Not Found' };
      }
      const spaRoute =
        wantsHtml &&
        (pathname === '/library' ||
          pathname === '/projects' ||
          pathname.startsWith('/p/'));
      if (spaRoute) {
        return reply
          .header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
          .sendFile('index.html', resolve(webDistDir));
      }
      const apiPrefix =
        req.url.startsWith('/health') ||
        req.url.startsWith('/me') ||
        req.url.startsWith('/auth') ||
        req.url.startsWith('/canvas-defs') ||
        req.url.startsWith('/canvases') ||
        req.url.startsWith('/projects') ||
        req.url.startsWith('/teams') ||
        req.url.startsWith('/project-invites') ||
        req.url.startsWith('/stories') ||
        req.url.startsWith('/snapshots') ||
        req.url.startsWith('/library') ||
        req.url.startsWith('/ai-context') ||
        req.url.startsWith('/sticky-import') ||
        req.url.startsWith('/objects-import') ||
        req.url.startsWith('/copilot');
      if (apiPrefix) {
        reply.code(404);
        return { error: 'Not Found' };
      }
      return reply
        .header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
        .sendFile('index.html', resolve(webDistDir));
    });
  }

  await app.listen({ port: config.port, host: config.host });

  // Publish port discovery file so external tooling (CLI, tests) can find
  // this server without lsof guesswork. Cleaned up on graceful shutdown.
  const address = app.server.address();
  const actualPort =
    address && typeof address === 'object' ? address.port : config.port;
  const portFile = getPortFilePath(config.dataDir);
  writePortFile(portFile, {
    port: actualPort,
    pid: process.pid,
    desktopInstanceId: config.desktopInstanceId,
    startedAt: new Date().toISOString(),
  });
  registerPortFileCleanup(portFile);
  app.log.info({ portFile }, 'Wrote server port discovery file');
}

function getRequestPathname(url: string): string {
  const raw = url.split('?', 1)[0] ?? url;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Server failed to start:', err);
  process.exit(1);
});
