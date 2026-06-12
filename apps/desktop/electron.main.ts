import { app, BrowserWindow, Menu, shell } from 'electron';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import fs from 'fs';
import net from 'net';
import path from 'path';
import { setupCliOnboarding } from './cli-onboarding';

const isDev = !app.isPackaged;
const desktopHost = '127.0.0.1';

let serverProcess: ReturnType<typeof spawn> | null = null;
let mainWindow: BrowserWindow | null = null;

interface HealthResponse {
  ok?: boolean;
  desktopInstanceId?: string;
}

async function getAvailablePort(host: string): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, host, () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close(() => reject(new Error('Unable to allocate desktop server port')));
        return;
      }
      const port = address.port;
      server.close((err) => {
        if (err) reject(err);
        else resolvePort(port);
      });
    });
  });
}

async function waitForServer(
  url: string,
  desktopInstanceId: string,
  timeoutMs = 15000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const body = (await res.json().catch(() => null)) as HealthResponse | null;
        if (body?.ok && body.desktopInstanceId === desktopInstanceId) return;
      }
    } catch {
      // server not ready yet
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error('Desktop server did not start in time');
}

function createWindow(appUrl: string) {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'electron.preload.js'),
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(appUrl);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Note — `packages/samples/` and the old `seedBundledSamples()` /
// `copyDirContents()` first-launch import path have been removed in
// favour of the read-only case library at <bundleDir>/case-library/
// (mounted by the server's BundleStorage). If a future need arises for
// a copy-on-first-launch "welcome project" — distinct from the read-
// only library — re-introduce the function here and revisit how it
// composes with BundleStorage. See plan generic-strolling-tarjan.md
// (P2 / P5) for the full rationale.


app.whenReady().then(async () => {
  const userData = app.getPath('userData');
  const dataDir = path.join(userData, 'data');
  const port = await getAvailablePort(desktopHost);
  const appUrl = `http://${desktopHost}:${port}`;
  const desktopInstanceId = randomUUID();

  const serverPath = isDev
    ? path.join(__dirname, '../../server/src/server.ts')
    : path.join(__dirname, 'server/server.js');

  const webDistDir = isDev
    ? path.join(__dirname, '../../web/dist')
    : path.join(__dirname, 'web');

  const canvasDefsDir = isDev
    ? path.join(__dirname, '../../../../packages/canvases')
    : path.join(__dirname, 'canvases');

  const caseLibraryDir = isDev
    ? path.join(__dirname, '../../../packages/case-library')
    : path.join(__dirname, 'case-library');

  const spawnEnv: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: 'production',
    HOST: desktopHost,
    PORT: String(port),
    DATA_DIR: dataDir,
    WEB_DIST_DIR: webDistDir,
    CANVAS_DEFS_DIR: canvasDefsDir,
    CASE_LIBRARY_DIR: caseLibraryDir,
    PINGARDEN_DESKTOP_INSTANCE_ID: desktopInstanceId,
  };

  if (isDev) {
    serverProcess = spawn('npx', ['tsx', 'watch', serverPath], {
      env: spawnEnv,
      detached: false,
    });
  } else {
    // In packaged app process.execPath is the Electron binary.
    // ELECTRON_RUN_AS_NODE makes it behave like regular Node.js.
    serverProcess = spawn(process.execPath, [serverPath], {
      env: { ...spawnEnv, ELECTRON_RUN_AS_NODE: '1' },
      detached: false,
    });
  }

  // Pipe server logs to stdout in dev; in prod write to a log file for debugging.
  if (isDev && serverProcess.stdout && serverProcess.stderr) {
    serverProcess.stdout.on('data', (d) => process.stdout.write(d));
    serverProcess.stderr.on('data', (d) => process.stderr.write(d));
  } else if (serverProcess.stdout && serverProcess.stderr) {
    const logDir = path.join(userData, 'logs');
    fs.mkdirSync(logDir, { recursive: true });
    const logStream = fs.createWriteStream(path.join(logDir, 'server.log'), { flags: 'a' });
    serverProcess.stdout.on('data', (d) => logStream.write(d));
    serverProcess.stderr.on('data', (d) => logStream.write(d));
  }

  await waitForServer(`${appUrl}/health`, desktopInstanceId);
  createWindow(appUrl);

  // Wire up the bundled `pingarden` CLI: install/refresh the Claude
  // skill, generate a wrapper script in userData, and refresh the
  // onboarding readme. Skipped in dev — developers run the CLI from
  // the workspace directly (`node apps/cli/dist/index.js`). All
  // failures are logged but never block startup.
  if (!isDev) {
    setupCliOnboarding({
      userData,
      resourcesPath: process.resourcesPath,
      electronExec: process.execPath,
      appVersion: app.getVersion(),
    });
  }

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'PinGarden',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Contact Sibo Li',
          click: () => {
            shell.openExternal('mailto:sibo.li@foxmail.com');
          },
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
});

// PinGarden is a single-window utility app: closing the window means
// the user is done. Override Electron's macOS default (which keeps the
// app in the dock after the last window closes) so the red traffic
// light fully terminates the process. The matching `before-quit`
// handler below tears down the embedded Fastify server.
app.on('window-all-closed', () => {
  app.quit();
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
});
