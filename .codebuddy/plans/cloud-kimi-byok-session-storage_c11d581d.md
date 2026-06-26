---
name: cloud-kimi-byok-session-storage
overview: 为 PinGarden 云端版 Copilot 制定从 Kimi CLI 切换为 Kimi HTTP BYOK 的改造计划：默认 sessionStorage，本机记住时才 localStorage，不在 CloudBase 保存 API Key。
todos:
  - id: audit-copilot-flow
    content: 使用 [subagent:code-explorer] 复核 Copilot 调用链和 Key 存储路径
    status: completed
  - id: create-ai-provider-layer
    content: 新增服务端 AI Provider 抽象并封装现有 Kimi CLI
    status: completed
    dependencies:
      - audit-copilot-flow
  - id: implement-kimi-http-byok
    content: 实现 Kimi HTTP BYOK provider，禁止服务端保存 Key
    status: completed
    dependencies:
      - create-ai-provider-layer
  - id: update-copilot-web-storage
    content: 改造前端为 sessionStorage 默认并加入记住浏览器选项
    status: completed
    dependencies:
      - create-ai-provider-layer
  - id: update-provider-aware-ui
    content: 更新 Copilot health、设置面板、错误提示和中英文文案
    status: completed
    dependencies:
      - update-copilot-web-storage
  - id: verify-local-and-cloud
    content: 使用 [skill:pingarden] 与 [integration:tcb] 验证本地和 CloudBase 模式
    status: completed
    dependencies:
      - implement-kimi-http-byok
      - update-provider-aware-ui
  - id: document-and-deploy
    content: 更新 README、Dockerfile，并重新部署 CloudRun
    status: completed
    dependencies:
      - verify-local-and-cloud
---

## User Requirements

用户希望把云端版 Copilot 从依赖本机 Kimi CLI 改成“用户自带 API Key”的模式，并且 API Key 不保存到云端。

## Product Overview

云端版 Copilot 应能在没有本机命令行工具的环境中正常对话。用户在浏览器中输入自己的 Kimi API Key，默认只在当前会话中保存；如果用户勾选“记住在这台浏览器”，才长期保存在当前浏览器。服务端只在单次请求过程中临时使用该 Key，不保存、不写入文件、不进入日志。

## Core Features

- 云端 Copilot 不再显示“本机未安装 Kimi CLI”的错误。
- 默认使用会话级保存，关闭浏览器会话后 Key 失效。
- 提供“记住在这台浏览器”选项，勾选后才持久保存到当前浏览器。
- 清晰提示 Key 只保存在当前浏览器，不会保存到 PinGarden 云端服务。
- 本地/桌面版本继续保留现有 Kimi CLI 体验。
- Copilot 对话、测试连接、项目草稿、项目优化等现有能力继续使用原有交互方式。

## Tech Stack Selection

- Frontend: React + TypeScript + Vite,沿用现有 `apps/web` 架构。
- Backend: Node.js + Fastify + TypeScript,沿用现有 `apps/server` 架构。
- Cloud deployment: Tencent CloudBase CloudRun container,沿用已新增的 `Dockerfile` 和单服务部署方式。
- AI provider strategy:
- Desktop/local: 保留现有 Kimi CLI provider。
- Cloud/Web: 新增 Kimi HTTP BYOK provider。
- Key storage:
- Electron: 继续优先使用 safeStorage。
- Web cloud: 默认 `sessionStorage`；用户勾选后使用 `localStorage`。

## Implementation Approach

先把 Copilot 的 AI 调用从 `copilot.ts` 中的 CLI 硬编码拆成 provider 层，再为云端增加 HTTP BYOK provider。后端通过 `PINGARDEN_AI_PROVIDER` 选择 provider；前端通过 `/copilot/health` 获取 provider 信息并调整设置 UI、错误提示和存储策略。

关键决策：

- 不使用 CloudBase AI custom model，因为它需要把 Key 保存到云端 Secret。
- 不把 Kimi CLI 打进 CloudRun，因为这会引入二进制兼容、并发 Key 覆盖和云端文件写入风险。
- 保留现有 SSE wire shape，避免大范围改动前端 streaming parser。
- Kimi API Key 只从请求体进入服务端内存，禁止写入配置文件、日志、环境变量或用户记忆。

## Implementation Notes

- 后端不要在 HTTP provider 路径调用 `writeKimiConfig`、`clearKimiConfig` 或 `resolveKimiBinary`。
- 所有错误信息必须脱敏，不能包含 API Key、请求 Authorization header 或完整上游 payload。
- `test-key` 在 HTTP provider 下应直接发起一次轻量模型调用；在 CLI provider 下保留现有探测逻辑。
- `chat` 路由仍负责拼接 `systemPromptText`、历史消息和 latest user message，provider 只负责模型调用。
- 如果 Kimi HTTP streaming 协议与现有 SSE 不同，应在 provider 内做适配，对外只产出 `{ delta }` 或 `{ error }`。
- `sessionStorage` 与 `localStorage` 迁移要谨慎：已有 plaintext localStorage Key 应可被读取，并可在用户保存时转成新结构。
- CloudRun 部署时设置 `PINGARDEN_AI_PROVIDER=kimi-http`；桌面/本地默认保持 `kimi-cli`。
- 当前 CloudRun 数据仍是 `/tmp/pingarden-data` 预览部署限制，本次不解决持久化存储。

## Architecture Design

### Provider abstraction

```text
/copilot/health
/copilot/test-key
/copilot/chat
        |
        v
Copilot route builds prompt and request context
        |
        v
AI Provider selected by config
  - kimi-cli: existing CLI subprocess
  - kimi-http: BYOK HTTP request, no key persistence
        |
        v
Unified stream chunks
  - delta
  - error
  - done handled by route
```

### Data Flow

```text
Browser key input
  -> sessionStorage by default
  -> localStorage only if "remember this browser" is checked
  -> request body for test/chat
  -> CloudRun in-memory provider call
  -> Kimi HTTP response
  -> PinGarden SSE response
```

## Directory Structure

```text
BusinessModelCanvas/
├── apps/server/src/config.ts
│   [MODIFY] Add AI provider configuration. Read `PINGARDEN_AI_PROVIDER`, default to CLI mode locally, support HTTP mode in CloudRun, and expose provider settings to server routes.
│
├── apps/server/src/http/copilot.ts
│   [MODIFY] Replace direct Kimi CLI coupling with provider selection. Update `/copilot/health`, `/copilot/test-key`, `/copilot/chat`, and `/copilot/clear-key` behavior per provider while preserving prompt construction and SSE shape.
│
├── apps/server/src/llm/aiProvider.ts
│   [NEW] Define shared provider interfaces and stream chunk types. Centralize provider health, test-key, and stream-chat contracts so routes are provider-agnostic.
│
├── apps/server/src/llm/kimiCliProvider.ts
│   [NEW] Wrap existing CLI adapter/config behavior behind the provider interface. Keeps desktop/local behavior unchanged.
│
├── apps/server/src/llm/kimiHttpProvider.ts
│   [NEW] Implement Kimi HTTP BYOK provider. Uses request-scoped API Key only, adapts upstream stream/non-stream output to existing Copilot chunks, and redacts errors.
│
├── apps/server/src/llm/kimiCliAdapter.ts
│   [MODIFY] Export or reuse prompt-building/chunk helpers if needed; otherwise keep behavior stable and only adjust imports through CLI provider.
│
├── apps/server/src/llm/kimiConfig.ts
│   [AFFECTED] CLI provider only. Ensure HTTP provider never imports or calls config-writing functions.
│
├── apps/web/src/api/copilot.ts
│   [MODIFY] Extend `CopilotHealth` to include provider metadata. Keep `streamChat` SSE parsing unchanged; update comments and test/clear semantics for provider-aware behavior.
│
├── apps/web/src/copilot/useKeyConfig.ts
│   [MODIFY] Add storage scope support: session default, persistent browser option, safeStorage for Electron. Expose `rememberInBrowser`, `setRememberInBrowser`, storage mode, and migration-safe loading.
│
├── apps/web/src/components/CopilotChatSettings.tsx
│   [MODIFY] Add "remember this browser" checkbox. Update privacy copy for cloud BYOK mode and keep desktop safeStorage copy when available.
│
├── apps/web/src/components/CopilotDrawer.tsx
│   [MODIFY] Replace `cliAvailable` assumptions with provider-aware health. Do not block cloud HTTP mode when CLI is missing. Set assistant provider/model metadata based on health response.
│
├── apps/web/src/i18n/zh.json
│   [MODIFY] Add/update Chinese copy for Kimi API BYOK, session-only storage, remember-browser option, cloud mode health, and provider-specific errors.
│
├── apps/web/src/i18n/en.json
│   [MODIFY] Add/update English copy matching the Chinese UI behavior.
│
├── Dockerfile
│   [MODIFY] Add `PINGARDEN_AI_PROVIDER=kimi-http` for CloudRun image/runtime defaults, unless deployment env overrides it.
│
├── README.md
│   [MODIFY] Document CloudBase BYOK AI behavior, no-cloud-key-storage guarantee, and deployment env variables.
│
└── cloudbaserc.json
    [AFFECTED] Keep service targeting CloudBase env `pingarden-d5gyvjbtdc321cc10`; no secret should be added.
```

## Key Code Structures

```ts
export type CopilotAiProviderKind = 'kimi-cli' | 'kimi-http';

export interface CopilotAiProviderHealth {
  provider: CopilotAiProviderKind;
  available: boolean;
  version?: string;
  model?: string;
  requiresApiKey: boolean;
  storesKeyServerSide: false;
  message?: string;
}
```

```ts
export interface CopilotAiProvider {
  health(): Promise<CopilotAiProviderHealth>;
  testKey(apiKey: string): Promise<{ ok: boolean; message?: string }>;
  streamChat(input: {
    apiKey: string;
    systemPromptText: string;
    conversation: Array<{ role: 'user' | 'assistant'; content: string }>;
    latestUserMsg: string;
    signal?: AbortSignal;
  }): AsyncGenerator<{ delta: string } | { error: string }, void, void>;
}
```

## Agent Extensions

### SubAgent

- **code-explorer**
- Purpose: 复核 Copilot 前后端调用链、Key 存储逻辑、CloudRun 部署配置和现有 Kimi CLI 耦合点。
- Expected outcome: 输出准确的修改文件清单、依赖关系和风险点，避免遗漏测试连接、health、chat、UI 文案等路径。

### Integration

- **tcb**
- Purpose: 在实现后查询和更新 CloudBase CloudRun 服务配置，并验证云端部署。
- Expected outcome: CloudRun 服务使用 `kimi-http` provider 运行，`/copilot/health`、首页和 Copilot 基础调用可验证。

### Skill

- **pingarden**
- Purpose: 验证 PinGarden 本地 CLI、案例库和项目运行路径，确保桌面/本地能力不被云端改造破坏。
- Expected outcome: 本地 Kimi CLI 模式保持可用，PinGarden 业务能力和部署前置检查通过。