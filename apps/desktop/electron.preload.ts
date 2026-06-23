import { contextBridge, ipcRenderer } from 'electron';

// Minimal preload — exposes a marker so the renderer can apply desktop-only layout,
// plus the safeStorage IPC bridge used by the Copilot to encrypt user BYO-key
// LLM API keys before persisting them to localStorage. No raw Node APIs are
// exposed; everything goes through ipcRenderer.invoke against handlers in
// electron.main.ts.
contextBridge.exposeInMainWorld('electronAPI', {
  /** Marker the renderer reads to switch on desktop-only UI affordances. */
  isDesktop: true,
  /**
   * safeStorage bridge — see `electron.main.ts` ipcMain.handle('pingarden:safeStorage:*').
   * `available()` resolves to false on platforms without a usable keychain,
   * so the renderer can fall back to plaintext storage with a warning.
   */
  safeStorage: {
    available: (): Promise<boolean> =>
      ipcRenderer.invoke('pingarden:safeStorage:available'),
    encrypt: (plaintext: string): Promise<string> =>
      ipcRenderer.invoke('pingarden:safeStorage:encrypt', plaintext),
    decrypt: (base64: string): Promise<string> =>
      ipcRenderer.invoke('pingarden:safeStorage:decrypt', base64),
  },
});
