# PinGarden Desktop Packaging Playbook

## When to use this playbook

Any time the user says:
- "打包成 Mac 应用" / "package as desktop app"
- ".dmg" / "electron"
- "封装成安装盘"

This playbook is the standard operating procedure for turning the PinGarden web + API stack into a native macOS app.

---

## Canonical packaging command

Use the deterministic repository script. This is the only supported packaging entry:

```bash
pnpm dist
```

Equivalent explicit command:

```bash
bash ./scripts/package-mac.sh
```

Do **not** run `pnpm --filter @pingarden/desktop run dist` directly for release builds. That command only invokes `electron-builder`; it does not rebuild and recopy `server`, `web`, and `canvases`, so it can package stale `apps/desktop/dist` contents.

---

## What the script guarantees

`scripts/package-mac.sh` is the source of truth. It fails fast and performs these steps in order:

1. Use existing workspace dependencies, or run `pnpm install --frozen-lockfile` if `node_modules/` is missing.
2. Remove stale desktop bundles and previous package outputs.
3. Run `pnpm typecheck`.
4. Run `pnpm --filter @pingarden/desktop run build:desktop`.
5. Verify required bundled files exist:
   - `apps/desktop/dist/electron.main.js`
   - `apps/desktop/dist/electron.preload.js`
   - `apps/desktop/dist/server/server.js`
   - `apps/desktop/dist/server/package.json`
   - `apps/desktop/dist/web/index.html`
   - `apps/desktop/dist/web/assets/`
   - `apps/desktop/dist/canvases/`
6. Verify no `data/` directory is present inside the desktop bundle.
7. Run `electron-builder --mac dmg` through the desktop workspace.
8. Verify and print the generated `.dmg` path.

---

## Architecture

```
PinGarden.app
├── Electron Main Process
│   ├── choose an available 127.0.0.1 port
│   ├── generate PINGARDEN_DESKTOP_INSTANCE_ID
│   └── child_process.spawn(
│         process.execPath, [server.js],
│         env: { ELECTRON_RUN_AS_NODE: '1', PORT, HOST, ... }
│       )
├── Renderer (BrowserWindow)
│   └── loadURL('http://127.0.0.1:{dynamicPort}')
├── Web frontend (apps/web/dist → served by Fastify @fastify/static)
├── API server (apps/server/dist → Node.js ESM)
├── Canvas definitions (packages/canvases)
└── CLI onboarding
    ├── wrapper: ~/Library/Application Support/PinGarden/bin/pingarden
    ├── auto PATH symlink: /usr/local/bin/pingarden when writable
    └── fallback PATH symlink: ~/.local/bin/pingarden + shell profiles
```

**Why dynamic localhost port:**
The desktop app must not rely on `:4000`, because the local development API can already be running there. Electron now waits for `/health` to return the matching `PINGARDEN_DESKTOP_INSTANCE_ID` before loading the window, so it cannot accidentally connect to another local service and show a 404.

**Why `ELECTRON_RUN_AS_NODE=1`:**
In a packaged app, `process.execPath` is the Electron binary, not Node.js. Setting `ELECTRON_RUN_AS_NODE=1` makes the Electron binary behave like regular Node.js so it can run the server ESM code.

**Why server serves the static files:**
In production mode, Fastify registers `@fastify/static` with `WEB_DIST_DIR` pointing to the built web SPA. This means one local desktop server hosts both the API and the frontend — no CORS, no proxy, no second port.

---

## Data isolation rules (critical)

| Environment | Data directory | Content |
|-------------|---------------|---------|
| Dev (web) | `apps/server/data/` | Your local test projects & canvases |
| Dev (desktop) | `~/Library/Application Support/PinGarden/data/` | Desktop dev runs |
| Production (end user) | `~/Library/Application Support/PinGarden/data/` | User's own projects |

**The `.dmg` installer must contain ZERO data files.**

- `apps/server/data/` must be in `.gitignore`
- `electron-builder.yml` `files` array must exclude `**/data/**`
- Electron main process sets `DATA_DIR` to `app.getPath('userData')/data`
- First launch = empty project list (clean slate)

---

## Configuration templates

### `apps/desktop/electron-builder.yml`

```yaml
appId: com.siboli.pingarden
productName: PinGarden
directories:
  output: build
files:
  - "dist/**/*"
  - "!**/data/**"
mac:
  category: public.app-category.productivity
  target:
    - dmg
```

### `apps/desktop/electron.main.ts` (key excerpts)

```ts
const desktopHost = '127.0.0.1';
const port = await getAvailablePort(desktopHost);
const appUrl = `http://${desktopHost}:${port}`;
const desktopInstanceId = randomUUID();

const spawnEnv = {
  ...process.env,
  NODE_ENV: 'production',
  HOST: desktopHost,
  PORT: String(port),
  DATA_DIR: dataDir,
  WEB_DIST_DIR: webDistDir,
  CANVAS_DEFS_DIR: canvasDefsDir,
  PINGARDEN_DESKTOP_INSTANCE_ID: desktopInstanceId,
};

await waitForServer(`${appUrl}/health`, desktopInstanceId);
createWindow(appUrl);
```

### `apps/desktop/package.json` (production deps)

Server runtime dependencies must be declared in desktop's `dependencies` so electron-builder includes them:

```json
{
  "dependencies": {
    "@pingarden/shared": "workspace:*",
    "@fastify/cors": "^9.0.1",
    "@fastify/static": "^7.0.4",
    "fastify": "^4.28.1",
    "pino": "^9.3.2",
    "ws": "^8.18.0",
    "y-protocols": "^1.0.6",
    "yjs": "^13.6.18",
    "zod": "^3.23.8"
  }
}
```

---

## Signing & distribution

### Unsigned `.dmg` (current default)
- Works for personal sharing
- **Gatekeeper will block on first open**
- Recipient must go to **System Settings → Privacy & Security → Allow anyway**

### Signed + Notarized (future)
- Requires Apple Developer account ($99/yr)
- Add `build.mac.identity` to `electron-builder.yml`
- Add notarization config (electron-notarize or electron-builder built-in)

---

## Agent / Skill guidance

The deterministic script is the source of truth. A CodeBuddy Skill, if added later, should only remind the agent to run `pnpm dist`, inspect the generated output, and consult this troubleshooting table. It must not reimplement the packaging sequence in natural language.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Root window shows 404 | App was built through a stale/manual path, or an old desktop build still hardcodes `:4000` | Rebuild with `pnpm dist`; do not run desktop `dist` directly |
| "Desktop server did not start in time" | Server crashed on startup, or `/health` did not return the matching desktop instance id | Check `~/Library/Application Support/PinGarden/logs/server.log` |
| `Cannot use import statement` | Server JS treated as CommonJS | Ensure `apps/desktop/dist/server/package.json` has `"type": "module"` |
| `Canvas defs dir not found` | `CANVAS_DEFS_DIR` env var missing or wrong | Verify `apps/desktop/dist/canvases/` exists before packaging |
| Blank screen after identity login | `useIdentity()` instances out of sync | See `apps/web/src/identity/useIdentity.ts` — broadcast custom event on save/clear |
| Missing `@pingarden/shared` types in build | Shared package not built | Use `pnpm dist`; the script runs the full desktop build chain |
| AI says `pingarden: command not found` after installing app + skill | App was not opened once, or `/usr/local/bin` registration needed administrator approval | Open PinGarden, choose `Help → Install CLI to PATH`, then verify `which pingarden && pingarden doctor` in a new terminal |
