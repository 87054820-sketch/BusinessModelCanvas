import { contextBridge } from 'electron';

// Minimal preload — exposes a marker so the renderer can apply desktop-only layout.
// No Node APIs are exposed to the web app.
contextBridge.exposeInMainWorld('electronAPI', {});
