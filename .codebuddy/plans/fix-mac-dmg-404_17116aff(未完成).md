---
name: fix-mac-dmg-404
overview: 调查 PinGarden Mac DMG 打包后打开/复制安装出现 404 的原因，并准备修复 Electron 打包启动链路中的端口冲突与构建产物过期问题。
todos:
  - id: inspect-packaging
    content: 使用 [subagent:code-explorer] 复核 404 链路
    status: pending
  - id: fix-electron-port
    content: 改造 Electron 动态端口与实例校验
    status: pending
    dependencies:
      - inspect-packaging
  - id: fix-build-script
    content: 修正根目录 DMG 构建脚本
    status: pending
    dependencies:
      - inspect-packaging
  - id: update-packaging-docs
    content: 更新打包文档和 404 排障说明
    status: pending
    dependencies:
      - fix-electron-port
      - fix-build-script
  - id: verify-desktop-build
    content: 执行类型检查、桌面构建和 DMG 验证
    status: pending
    dependencies:
      - update-packaging-docs
---

## User Requirements

- 检查当前项目中 Mac DMG / Electron 打包相关内容。
- 定位打包后复制安装或打开 Mac 版本软件时出现 404 的原因。
- 基于项目现有实现给出可靠修复方案，避免后续 DMG 打包产物继续出现同类问题。

## Product Overview

PinGarden 是一个包含 Web 前端、Fastify API 服务和 Electron 桌面壳的本地画布应用。Mac 版通过 DMG 分发，安装后应打开桌面应用主界面，而不是显示 404 页面。

## Core Features

- 打包后的 Mac 应用能稳定启动内置 API 服务。
- Electron 窗口能加载正确的本地 Web 页面。
- 打包命令能确保 Web、Server、Canvas 资源和 Electron 主进程都是最新产物。
- 文档中保留清晰的 DMG 打包与 404 排障说明。

## Tech Stack Selection

- 项目结构：pnpm workspace monorepo。
- 桌面端：Electron + electron-builder，目标产物为 macOS DMG。
- 前端：React + TypeScript + Vite，构建产物位于 `apps/web/dist`。
- 后端：Fastify + TypeScript，构建产物位于 `apps/server/dist`。
- 桌面打包资源：`apps/desktop/dist/server`、`apps/desktop/dist/web`、`apps/desktop/dist/canvases`。

## Implementation Approach

当前初步排查显示，404 的高概率原因有两个：

1. **端口冲突导致 Electron 加载了错误服务**

- `apps/desktop/electron.main.ts` 目前硬编码 `PORT=4000` 和 `mainWindow.loadURL('http://localhost:4000')`。
- 项目本地开发脚本 `start.sh` 也使用 API 端口 4000。
- 如果开发 API 仍在运行，打包后的桌面内置服务可能因端口占用启动失败，但 `waitForServer('http://localhost:4000/health')` 会被已有开发 API 误判为成功。
- Electron 随后加载 `http://localhost:4000`，而开发 API 在非 production 模式不托管 SPA 根路径，因此返回 404。

2. **根目录打包脚本可能打进旧产物**

- 根目录 `package.json` 的 `build:desktop` 当前执行 `pnpm build && pnpm --filter @pingarden/desktop run dist`。
- 该链路没有显式执行 `apps/desktop/package.json` 中负责复制 `server/web/canvases` 到 `apps/desktop/dist` 的 `build:electron`。
- 因此从根目录执行 `pnpm dist` 时，可能把旧的或不完整的 `apps/desktop/dist` 打进 DMG。

修复策略：

- 在 Electron 主进程中为桌面内置服务动态选择可用本地端口，避免与开发 API 或其他本机服务冲突。
- Electron 通过实际分配的端口执行 health check 与 `loadURL`，不再固定访问 4000。
- 为桌面实例增加轻量级健康校验标识，避免误连到其他同端口服务。
- 修正根目录 DMG 构建脚本，确保每次打包前都会重新构建并复制 Web、Server、Canvas 和 Electron 产物。
- 更新打包文档，说明新的打包命令、端口隔离机制和 404 排障方法。

## Implementation Notes

- 保持当前架构不变：Electron 继续启动内置 Fastify 服务，Fastify 在 production 模式继续托管 Web SPA。
- 不改动 `CanvasStorage`、画布数据读写、Yjs 状态接口和业务 API 路由，降低影响范围。
- 动态端口仅用于 Electron 桌面运行时，不影响 `start.sh` 的 Web 5173 / API 4000 本地开发约定。
- 建议桌面内置服务绑定 `127.0.0.1`，避免暴露到局域网。
- 健康检查轮询保持有界超时，避免应用启动无限等待。
- 生产日志仍写入 Electron `userData/logs/server.log`，错误信息不记录用户画布内容或隐私数据。
- Vite 当前输出使用 `/assets/...` 绝对路径；由于桌面端仍通过 HTTP 服务托管 SPA，不需要切换到 `loadFile()` 或修改 Vite base。

## Architecture Design

桌面应用启动链路保持为：

Electron Main Process

- 选择可用本地端口
- 生成桌面实例标识
- spawn 内置 Fastify server
- 等待指定端口 `/health` 返回匹配实例标识
- BrowserWindow 加载 `http://127.0.0.1:{port}`

Fastify Server

- 读取 `PORT`、`HOST`、`WEB_DIST_DIR`、`CANVAS_DEFS_DIR`、`DATA_DIR`
- production 模式注册静态资源服务
- 非 API 路径 fallback 到 `index.html`

## Directory Structure

```text
/Users/siboli/Documents/商业/BusinessModelCanvas/
├── package.json
│   # [MODIFY] 修正根目录 desktop 打包脚本。
│   # Purpose: 提供可靠的一键 DMG 打包入口。
│   # Functionality: 调用 desktop workspace 的完整构建链路后再执行 electron-builder。
│   # Requirements: 避免跳过 build:electron，防止旧 dist 被打包。
│
├── apps/
│   ├── desktop/
│   │   └── electron.main.ts
│   │       # [MODIFY] 修复桌面运行时端口冲突。
│   │       # Purpose: Electron 主进程启动、等待和加载内置服务。
│   │       # Functionality: 动态选择可用端口，设置 PORT/HOST/实例标识，按实际端口 loadURL。
│   │       # Requirements: 保持 dev/prod 路径逻辑，保留 server 日志，启动失败给出可诊断错误。
│   │
│   └── server/
│       └── src/
│           └── server.ts
│               # [MODIFY] 强化 health check。
│               # Purpose: Fastify 服务入口与静态 SPA fallback。
│               # Functionality: `/health` 返回 ok，并在存在环境变量时返回桌面实例标识。
│               # Requirements: 兼容现有健康检查调用，不破坏 API 路由和 SPA fallback。
│
└── docs/
    └── PACKAGING.md
        # [MODIFY] 更新 DMG 打包和 404 排障说明。
        # Purpose: 维护 Mac 桌面端打包 SOP。
        # Functionality: 说明推荐命令、动态端口机制、日志位置和常见 404 原因。
        # Requirements: 与实际脚本保持一致，避免继续引导使用容易产生旧产物的命令。
```

## Verification Plan

- 执行 `pnpm typecheck`。
- 执行 `pnpm --filter @pingarden/desktop run build:desktop`。
- 执行 `pnpm --filter @pingarden/desktop run dist:dir` 或 `pnpm --filter @pingarden/desktop run dist`。
- 在本地开发 API 占用 4000 的情况下启动打包 app，确认不再打开 404。
- 检查 Electron 加载地址为动态端口，且 Web 页面、API、Canvas 背景资源均正常。

## Agent Extensions

### SubAgent

- **code-explorer**
- Purpose: 复核 Electron、Fastify、Vite、electron-builder 和脚本之间的打包链路。
- Expected outcome: 确认 404 触发路径、受影响文件和最小修复范围，避免误改无关业务逻辑。