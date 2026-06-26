import { promises as fs } from 'node:fs';
import { join, normalize, sep, extname } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { loadKnowledgeForBundle, type LoadedCanvasDef } from '../canvasDefs/loader.js';
import type { Lang } from '@pingarden/shared';

/**
 * Routes:
 *   GET /canvas-defs                         list (id, name)
 *   GET /canvas-defs/:id                     full def + i18n + knowledge MD
 *   GET /canvas-defs/:id/bg/:lang            raw SVG (lang ∈ {en, zh})
 *   GET /canvas-defs/:id/asset/<path...>     binary asset (images, etc.)
 *                                            served from <bundleDir>/knowledge/<path>
 *
 * Knowledge markdown is read from disk on every `GET /canvas-defs/:id`
 * call (not cached at boot) so authors can drop in or edit
 * `knowledge/*.md` without restarting the server. The cost is
 * negligible — small text files served from the OS page cache.
 */
export function registerCanvasDefRoutes(
  app: FastifyInstance,
  defs: LoadedCanvasDef[],
) {
  const byId = new Map(defs.map((d) => [d.def.id, d]));

  app.get('/canvas-defs', async () =>
    defs.map(({ def }) => ({
      id: def.id,
      name: def.name,
      plugin: def.plugin,
      related: def.related,
    })),
  );

  app.get<{ Params: { id: string } }>('/canvas-defs/:id', async (req, reply) => {
    const found = byId.get(req.params.id);
    if (!found) return reply.code(404).send({ error: 'Canvas def not found' });
    const knowledge = await loadKnowledgeForBundle(
      found.bundleDir,
      found.def.zones.map((z) => z.id),
    );
    return {
      def: found.def,
      i18n: found.i18n,
      knowledge,
    };
  });

  app.get<{ Params: { id: string; lang: string } }>(
    '/canvas-defs/:id/bg/:lang',
    async (req, reply) => {
      const found = byId.get(req.params.id);
      if (!found) return reply.code(404).send({ error: 'Canvas def not found' });
      const lang = req.params.lang.replace(/\.svg$/, '') as Lang;
      const path =
        found.backgroundPaths[lang] ??
        found.backgroundPaths.en; // fall back to en when zh asset is missing
      if (!path) return reply.code(404).send({ error: 'Background not found' });
      const svg = await fs.readFile(path, 'utf8');
      return reply.type('image/svg+xml; charset=utf-8').send(svg);
    },
  );

  // Knowledge-asset route. Authors can reference images (or any other
  // binary asset) from their markdown files using a relative path:
  //   ![A diagram](images/customer-flow.png)
  // and we resolve it against `<bundleDir>/knowledge/`. Lazy-read so
  // dropping in a new image works without a server restart, mirroring
  // the markdown reload story.
  //
  // Path-traversal guard: the resolved real path MUST sit inside
  // `<bundleDir>/knowledge/`. Any `..` segment that escapes the prefix
  // is rejected with 400.
  app.get<{ Params: { id: string; '*': string } }>(
    '/canvas-defs/:id/asset/*',
    async (req, reply) => {
      const found = byId.get(req.params.id);
      if (!found) return reply.code(404).send({ error: 'Canvas def not found' });

      const requested = req.params['*'] ?? '';
      const knowledgeRoot = join(found.bundleDir, 'knowledge') + sep;
      const resolved = normalize(join(knowledgeRoot, requested));
      if (!resolved.startsWith(knowledgeRoot)) {
        return reply.code(400).send({ error: 'Invalid asset path' });
      }

      let buf: Buffer;
      try {
        buf = await fs.readFile(resolved);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
          return reply.code(404).send({ error: 'Asset not found' });
        }
        throw err;
      }
      return reply.type(contentTypeFor(resolved)).send(buf);
    },
  );
}

/**
 * Map common extensions to MIME types. Limited to the assets we expect
 * to ship with canvas knowledge — images and a handful of vector
 * formats. Falls back to octet-stream for anything else, so unknown
 * binaries still download safely.
 */
function contentTypeFor(path: string): string {
  const ext = extname(path).toLowerCase();
  switch (ext) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    case '.svg':
      return 'image/svg+xml; charset=utf-8';
    case '.avif':
      return 'image/avif';
    case '.pdf':
      return 'application/pdf';
    default:
      return 'application/octet-stream';
  }
}
