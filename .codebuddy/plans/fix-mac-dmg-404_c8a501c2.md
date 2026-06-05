---
name: fix-mac-dmg-404
overview: 修复 PinGarden Mac DMG 打包后 404 问题，并把桌面打包流程固化为可复现的一键脚本与文档化 SOP。
todos:
  - id: inspect-packaging-flow
    content: 使用 [subagent:code-explorer] 复核 404 与打包链路
    status: completed
  - id: fix-electron-runtime
    content: 改造 Electron 动态端口与实例校验
    status: completed
    dependencies:
      - inspect-packaging-flow
  - id: create-package-script
    content: 新增 Mac DMG 权威打包脚本
    status: completed
    dependencies:
      - inspect-packaging-flow
  - id: wire-package-scripts
    content: 修正 pnpm 打包入口委托脚本
    status: completed
    dependencies:
      - create-package-script
  - id: update-packaging-docs
    content: 更新打包 SOP 与 404 排障说明
    status: completed
    dependencies:
      - fix-electron-runtime
      - wire-package-scripts
  - id: optional-skill-note
    content: 使用 [skill:skill-creator] 规划可选打包辅助 Skill
    status: completed
    dependencies:
      - update-packaging-docs
  - id: verify-stable-packaging
    content: 执行类型检查、脚本打包和端口冲突验证
    status: completed
    dependencies:
      - optional-skill-note
---

## User Requirements

- 继续修复 Mac DMG 打包后打开或复制安装时出现 404 的问题。
- 在原有修复基础上，新增一个“固化、可复现、稳定”的打包流程。
- 需要判断用脚本、skill 或其他方式更合适，并形成长期可执行的方案。
- 未来打包过程应尽量不依赖人工记忆或 Agent 自由发挥，避免遗漏构建步骤、打进旧产物、端口冲突或产物不完整。

## Product Overview

PinGarden 是一个包含 React Web、Fastify API 和 Electron 桌面壳的本地画布应用。Mac 版通过 DMG 分发，用户复制安装后应稳定打开桌面应用主界面，不应出现 404 或加载到错误服务。

## Core Features

- Mac 桌面应用启动时能避开本地开发端口冲突。
- Electron 只加载自己启动的内置服务，不误连其他本地服务。
- DMG 打包使用唯一权威入口，保证每次完整构建、清理旧产物、复制最新资源并验证产物。
- 打包流程失败时应尽早中止，并给出明确错误信息。
- 文档明确说明唯一推荐打包命令、日志位置和 404 排障方法。

## Tech Stack Selection

- 项目结构：pnpm workspace monorepo。
- 桌面端：Electron + electron-builder，产物为 macOS DMG。
- 前端：React + TypeScript + Vite，构建产物来自 `apps/web/dist`。
- 后端：Fastify + TypeScript，构建产物来自 `apps/server/dist`。
- 固化流程：使用仓库内 Shell 脚本作为唯一权威打包入口，pnpm scripts 只作为脚本代理。

## Implementation Approach

推荐采用 **“确定性脚本作为唯一权威入口 + pnpm 脚本代理 + 文档 SOP + 可选 Skill 提醒”** 的方案。

核心判断：

- **脚本适合作为稳定执行核心**：它是确定性的，能固定执行顺序、清理旧产物、检查依赖、执行 typecheck/build、校验文件存在、调用 electron-builder，并在任一步失败时退出。
- **Skill 不适合作为唯一打包核心**：Skill 更适合提醒 Agent 使用正确流程和排障清单，但自然语言执行存在波动，不应替代脚本。
- **pnpm scripts 适合作为统一入口**：根目录 `pnpm dist` / `pnpm build:desktop` 应委托给稳定脚本，避免用户记忆多个命令。
- **文档作为人工可读 SOP**：`docs/PACKAGING.md` 保留完整解释、常见问题和日志路径，但不作为执行权威。

执行链路设计：

1. `pnpm dist` 调用仓库脚本，例如 `scripts/package-mac.sh`。
2. 脚本执行清理和校验：

- 确认在项目根目录运行。
- 确认 `pnpm` 可用。
- 清理 `apps/desktop/dist/server`、`apps/desktop/dist/web`、`apps/desktop/dist/canvases` 和旧打包输出。
- 执行 `pnpm install --frozen-lockfile` 或在依赖缺失时提示安装。
- 执行 `pnpm typecheck`。
- 执行 desktop 完整构建链路。
- 校验 `apps/desktop/dist/server/server.js`、`apps/desktop/dist/web/index.html`、`apps/desktop/dist/canvases`、`apps/desktop/dist/electron.main.js` 是否存在。
- 执行 `electron-builder --mac dmg`。
- 校验 DMG 文件存在并输出路径。

3. Electron 运行时修复端口冲突：

- 为桌面内置服务动态选择 `127.0.0.1` 可用端口。
- 设置 `PORT`、`HOST` 和实例标识环境变量。
- `/health` 返回实例标识。
- Electron 等待匹配实例标识后再 `loadURL`。

4. 文档中明确：以后只使用 `pnpm dist` 或脚本打包，不手动拼接多条命令。

## Implementation Notes

- 保持当前 Electron 启动 Fastify、Fastify 托管 Web SPA 的架构不变。
- 不切换到 `loadFile()`，因为当前 Vite 构建使用 `/assets/...` 绝对路径，通过 HTTP 服务托管更合适。
- 动态端口只影响桌面应用运行时，不改变本地开发端口 `4000` / `5173`。
- 脚本应使用 `set -euo pipefail`，所有关键步骤失败即中止。
- 打包脚本应避免静默成功，最后输出 DMG 路径、app 路径和日志位置。
- 可选 Skill 的定位是“提醒和排障”，不是“执行打包流程”；若未来创建 Skill，应只引导调用脚本。

## Architecture Design

桌面启动链路：

```text
Electron Main
  -> 选择可用 127.0.0.1 动态端口
  -> 生成桌面实例标识
  -> spawn Fastify server
  -> 等待 /health 返回匹配实例标识
  -> BrowserWindow.loadURL(http://127.0.0.1:{port})
  -> Fastify production 模式托管 Web SPA 与 API
```

打包固化链路：

```text
pnpm dist
  -> scripts/package-mac.sh
  -> 清理旧桌面 bundle
  -> typecheck
  -> build shared/web/server/electron
  -> 校验 dist/server + dist/web + dist/canvases
  -> electron-builder --mac dmg
  -> 校验并输出 DMG
```

## Directory Structure

```text
/Users/siboli/Documents/商业/BusinessModelCanvas/
├── package.json
│   # [MODIFY] 将根目录 desktop 打包入口改为调用确定性脚本。
│   # Purpose: 让 `pnpm dist` 成为唯一推荐打包命令。
│   # Functionality: 委托 `scripts/package-mac.sh`，避免跳过 build:electron。
│   # Requirements: 不再允许根目录打包链路打进旧的 desktop dist。
│
├── scripts/
│   └── package-mac.sh
│       # [NEW] Mac DMG 权威打包脚本。
│       # Purpose: 固化可复现打包流程。
│       # Functionality: 清理旧产物、执行 typecheck/build、校验关键文件、调用 electron-builder、输出产物路径。
│       # Requirements: set -euo pipefail；失败即退出；关键路径使用项目内固定路径；输出清晰日志。
│
├── apps/
│   ├── desktop/
│   │   ├── package.json
│   │   │   # [MODIFY] 保留 workspace 内构建命令，必要时补充 verify/package 辅助命令。
│   │   │   # Purpose: 支持脚本调用 desktop 的完整构建链路。
│   │   │   # Requirements: build:electron 继续负责复制 server/web/canvases。
│   │   │
│   │   └── electron.main.ts
│   │       # [MODIFY] 修复桌面运行时端口冲突。
│   │       # Purpose: Electron 主进程启动、等待和加载内置服务。
│   │       # Functionality: 动态端口、HOST=127.0.0.1、实例标识校验、实际端口 loadURL。
│   │       # Requirements: 保留 dev/prod 路径逻辑和生产日志。
│   │
│   └── server/
│       └── src/
│           └── server.ts
│               # [MODIFY] 强化 health check。
│               # Purpose: 区分桌面内置服务与其他本地服务。
│               # Functionality: `/health` 兼容返回 ok，并在存在环境变量时返回实例标识。
│               # Requirements: 不破坏现有 health 调用、API 路由和 SPA fallback。
│
└── docs/
    └── PACKAGING.md
        # [MODIFY] 更新打包 SOP。
        # Purpose: 明确唯一推荐打包流程。
        # Functionality: 说明 `pnpm dist` / `scripts/package-mac.sh`、动态端口机制、日志路径、404 排障。
        # Requirements: 不再把多条手动命令作为首选入口。
```

## Key Code Structures

如需实现实例校验，可使用环境变量级别的轻量协议：

```ts
interface DesktopHealthResponse {
  ok: true;
  desktopInstanceId?: string;
}
```

Electron 仅在 `desktopInstanceId` 与自己生成的值一致时继续加载窗口；普通开发环境仍可只返回 `{ ok: true }`。

## Agent Extensions

### SubAgent

- **code-explorer**
- Purpose: 在执行前复核 Electron、Fastify、Vite、electron-builder、pnpm scripts 和新增脚本入口之间的链路。
- Expected outcome: 确认端口冲突、旧产物打包和脚本固化范围，避免误改无关业务逻辑。

### Skill

- **skill-creator**
- Purpose: 仅在需要进一步沉淀 CodeBuddy Skill 时使用，用于把“调用权威脚本 + 排障清单”封装成辅助技能。
- Expected outcome: 形成可选的 Agent 使用提示；核心打包稳定性仍由脚本保证，而不是由 Skill 直接执行多步骤打包。