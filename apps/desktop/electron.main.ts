import { app, BrowserWindow, Menu, shell } from 'electron';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import fs from 'fs';
import net from 'net';
import path from 'path';

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

function seedBundledSamples(dataDir: string, samplesDir: string) {
  if (!fs.existsSync(samplesDir)) return;

  fs.mkdirSync(dataDir, { recursive: true });
  const markerPath = path.join(dataDir, '.samples-imported');
  if (fs.existsSync(markerPath)) return;

  const projectsDir = path.join(dataDir, 'projects');
  const hasExistingProjects = fs.existsSync(projectsDir)
    && fs.readdirSync(projectsDir).some((name) => name.endsWith('.json'));
  if (hasExistingProjects) {
    fs.writeFileSync(markerPath, new Date().toISOString(), 'utf8');
    return;
  }

  const sampleIds = fs.readdirSync(samplesDir).filter((name) => {
    const full = path.join(samplesDir, name);
    return fs.statSync(full).isDirectory();
  });

  for (const sampleId of sampleIds) {
    copyDirContents(path.join(samplesDir, sampleId), dataDir);
  }

  fs.writeFileSync(markerPath, new Date().toISOString(), 'utf8');
}

function copyDirContents(srcDir: string, destDir: string) {
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir)) {
    const src = path.join(srcDir, entry);
    const dest = path.join(destDir, entry);
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
      copyDirContents(src, dest);
    } else if (!fs.existsSync(dest)) {
      fs.copyFileSync(src, dest);
    }
  }
}

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

  const samplesDir = isDev
    ? path.join(__dirname, '../../../packages/samples')
    : path.join(__dirname, 'samples');
  seedBundledSamples(dataDir, samplesDir);

  const spawnEnv: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: 'production',
    HOST: desktopHost,
    PORT: String(port),
    DATA_DIR: dataDir,
    WEB_DIST_DIR: webDistDir,
    CANVAS_DEFS_DIR: canvasDefsDir,
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

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
});
