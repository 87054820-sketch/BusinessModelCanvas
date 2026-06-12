import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@pingarden/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // /projects is BOTH an API endpoint (GET /projects returns JSON
      // list) AND a SPA route (`MyProjectsPage` mounted at "/projects"
      // in App.tsx). Direct URL hits / page reloads send
      // `Accept: text/html`; in-app fetch() calls send
      // `Accept: application/json` or `*/*`. The bypass below tells the
      // proxy to skip API forwarding when the browser asked for HTML
      // — those requests fall through to Vite's index.html SPA
      // fallback so React Router can take over. Real API requests
      // still flow to Fastify on :4000.
      '/projects': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        bypass: (req) => {
          if (req.headers.accept?.includes('text/html')) return req.url;
        },
      },
      '/canvases': { target: 'http://localhost:4000', changeOrigin: true },
      '/canvas-defs': { target: 'http://localhost:4000', changeOrigin: true },
      '/stories': { target: 'http://localhost:4000', changeOrigin: true },
      // API routes under /library/* live at /library/cases (list / get /
      // fork). Bare /library is the SPA's "browse case library" page —
      // proxying it would forward direct URL hits to Fastify which 404s
      // because there is no GET /library handler. Keep this prefix
      // SPECIFIC to /library/cases so the SPA route falls through to
      // Vite's index.html fallback for direct URL access / page reload.
      '/library/cases': { target: 'http://localhost:4000', changeOrigin: true },
      '/health': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
});
