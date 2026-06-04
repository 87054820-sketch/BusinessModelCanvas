import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/projects': { target: 'http://localhost:4000', changeOrigin: true },
      '/canvases': { target: 'http://localhost:4000', changeOrigin: true },
      '/canvas-defs': { target: 'http://localhost:4000', changeOrigin: true },
      '/health': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
});
