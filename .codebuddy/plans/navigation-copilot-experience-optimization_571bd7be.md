---
name: navigation-copilot-experience-optimization
overview: 优化 PinGarden 的内页返回逻辑、Copilot 抽屉宽度/全屏能力，以及 Copilot 答案输出过程中的渐进反馈和等待动效。
todos:
  - id: verify-entrypoints
    content: 使用 [subagent:code-explorer] 复核返回入口和 Copilot 调用链
    status: completed
  - id: smart-back
    content: 新增统一返回逻辑并替换固定首页返回
    status: completed
    dependencies:
      - verify-entrypoints
  - id: copilot-layout
    content: 扩大 Copilot 抽屉并增加全屏还原切换
    status: completed
    dependencies:
      - verify-entrypoints
  - id: copilot-progressive-output
    content: 实现 Copilot 渐进输出和等待动画
    status: completed
    dependencies:
      - copilot-layout
  - id: i18n-and-polish
    content: 补充中英文文案并清理交互细节
    status: completed
    dependencies:
      - smart-back
      - copilot-progressive-output
  - id: validate-and-package
    content: 运行类型检查、前端构建并重新生成 DMG
    status: completed
    dependencies:
      - i18n-and-polish
---

## User Requirements

用户希望继续优化 PinGarden Copilot 与打包体验。本计划在上一轮“返回键 / Copilot 宽度与全屏 / 渐进输出与等待动画”的基础上，追加以下问题：

1. Copilot 会话内存：

- 在 App 打开的整个生命周期内，Copilot 对话要跨页面保留。
- 关闭 App 后释放内存，不把用户对话写入本地持久化文件、localStorage 或打包产物。
- 典型场景：Copilot 推荐 3 个案例后，用户在多个案例/页面之间切换查看，对话上下文仍留在 Copilot 中。

2. 策略库主视角 Copilot 看板扩展：

- 当前主视角有 3 个建议看板：战略选择、画布推荐、案例灵感。
- 需要补齐两个看板：商业模式、实验。
- 这两个看板应复用现有策略库中的 Business Model Patterns 与 Experiments 数据，不新增页面。

3. 快捷操作选项扩展：

- 每个看板当前只露出约 5 个选项。
- 需要支持选择更多选项，例如“更多/收起”、搜索选择器或弹出选项面板。
- 不应把所有选项一次性铺满导致 Copilot 顶部区域过高。

4. 打包与 chunk 优化：

- 之前多次 macOS DMG 打包流程有不稳定/不易确认结果的问题。
- Vite 构建中出现过 “some chunks are larger than …” 类似警告，需要纳入优化计划。
- 优先做真实拆包/懒加载优化，而不是简单提高 warning 阈值。

## Product Overview

目标是在不新增独立页面、不改变策略库主流程的前提下，把 Copilot 做成一个 App 生命周期内的“持续助手”。用户可以在策略库、案例、项目、画布、实验、商业模式之间切换探索，而 Copilot 对话、推荐结果和问题链条保持连续。

同时，策略库主视角的 Copilot 建议操作需要覆盖完整知识体系：

- 战略框架
- 画布方法
- 案例灵感
- 商业模式模式
- 实验方法

打包侧目标是让 `pnpm typecheck`、`pnpm --filter @pingarden/web build`、`bash scripts/package-mac.sh` 的结果更稳定、更可诊断，并降低前端单个 chunk 过大的风险。

## Core Features

### A. App 生命周期内 Copilot 会话记忆

- 把 `useConversation` 当前的组件本地 state 提升为 App 运行期内存 store。
- 路由切换、`LibraryPage` 卸载、`ProjectWorkspacePage` 卸载后，对话仍保留。
- 关闭 App / 刷新页面后释放，不持久化到 localStorage、IndexedDB、server 文件或打包产物。
- 保留“清空对话”按钮，用户可手动释放当前会话。
- displayName 改变时切换或清理对应会话，避免不同身份串话。

### B. Copilot 主视角 5 类看板

现有：

- 战略选择
- 画布推荐
- 案例灵感

新增：

- 商业模式：基于 `packages/case-library/patterns/*/pattern.json` 与 `libraryApi.listPatterns()`。
- 实验：基于 `packages/case-library/experiments/*/experiment.json` 与 `libraryApi.listExperiments()`。

### C. 更多选项机制

- 每个看板默认仍展示精选 5 个，保持当前紧凑体验。
- 增加“更多 N 个 / 收起”或“选择其他…”入口。
- 对数量较多的选项支持搜索/筛选，例如：
- 战略框架：来自 `strategy-frameworks`。
- 商业模式：来自 `patterns`。
- 实验：来自 `experiments`。
- 画布：来自 `canvasDefs`。
- 案例主题：可先用 curated topic list，后续再接案例标签/行业。
- 用户选中更多选项后，仍复用现有 prompt template，不新增新页面。

### D. 打包与 chunk 优化

- 梳理 `apps/web/vite.config.ts`，增加 Rollup `manualChunks` 或页面级懒加载。
- 优先拆分重模块：React vendor、Markdown 渲染、Yjs/collab、Library/Workspace 页面、Copilot 相关组件。
- 保持 `scripts/package-mac.sh` 为唯一标准 macOS 打包入口。
- 增加打包结果确认、日志可读性和失败定位能力。

## Tech Stack Selection

- 前端：React + TypeScript + React Router + Tailwind CSS。
- 状态管理：优先使用一个小型模块级 in-memory store + `useSyncExternalStore` 或等价 hook；不引入新依赖。
- 数据来源：复用现有 `libraryApi.listPatterns()`、`libraryApi.listExperiments()`、`libraryApi.listStrategyFrameworks()`、`api.listDefs()`。
- Copilot API：继续复用 `/copilot/chat` SSE 与 `copilotApi.streamChat`。
- 打包：继续使用 Vite + electron-builder + `scripts/package-mac.sh`。

## Implementation Approach

### 1. Copilot 会话内存改造

当前问题定位：

- `apps/web/src/copilot/useConversation.ts` 内部使用 `useState` 保存 `messages`。
- `CopilotDrawer` 分别挂在 `LibraryPage` 和 `ProjectWorkspacePage` 内部。
- 从 `/library` 切到 `/p/:projectId` 时，页面组件卸载，`CopilotDrawer` 和 `useConversation` 也卸载，导致对话丢失。
- 当前代码注释明确不持久化聊天内容，这是正确方向，但“in-memory”不应局限在单个页面组件生命周期。

实施方案：

- 新增或改造 `apps/web/src/copilot/conversationStore.ts`：
- module-level `Map<string, ConversationState>`。
- key 可先用 `displayName || 'anonymous'`，形成 App session 内单线程会话。
- 暴露 `subscribe()`、`getSnapshot()`、`append()`、`updateLast()`、`clear()`。
- 改造 `useConversation(displayName)`：
- 不再直接 `useState([])`。
- 通过全局内存 store 读取和更新。
- 保留 `clearPersistedConversations()`，继续删除旧版本 localStorage 历史。
- 不落盘：
- 不写 localStorage。
- 不写服务器文件。
- 不放入 `apps/desktop/dist` 或 `.package`。
- 边界处理：
- 清空按钮只清当前 identity 的内存会话。
- identity 变化时切换会话或清理旧会话，避免串话。
- 如果用户在生成中切页，第一阶段可允许网络请求中止但保留已生成内容；第二阶段再考虑把 in-flight stream 也提升到全局。

### 2. 主视角看板扩展

当前实现位置：

- `apps/web/src/components/CopilotDrawer.tsx`
- `buildStrategyLibraryStarterActions(isZh)` 返回当前 3 个卡片。
- 每个卡片的选项现在硬编码在 `controls.options` 中。

实施方案：

- 抽离 starter action 定义：
- 新建 `apps/web/src/copilot/starterActions.ts` 或保留在 `CopilotDrawer.tsx` 但拆函数。
- 建议抽离，避免 `CopilotDrawer.tsx` 继续膨胀。
- 在 `LibraryPage` 已经加载这些数据：
- `patterns`
- `experiments`
- `strategyFrameworks`
- `canvasDefs`
- 给 `CopilotDrawer` 增加可选 prop，例如 `libraryCatalog`：
- `patterns?: BusinessModelPattern[]`
- `experiments?: Experiment[]`
- `strategyFrameworks?: StrategyFramework[]`
- `canvasDefs?: CanvasDefSummary[]`
- `buildStrategyLibraryStarterActions` 改为接收 catalog：
- 战略选择：优先来自 `strategyFrameworks`，无数据时 fallback 到当前 5 个。
- 画布推荐：优先来自 `canvasDefs`，无数据时 fallback 到当前 5 个。
- 案例灵感：先保留 curated topic list，后续可接案例 tags/industry。
- 商业模式：来自 `patterns`，例如 Long Tail、Free、Multi-Sided Platforms、Unbundling 等。
- 实验：来自 `experiments`，例如 Customer Interview、Smoke Test、Wizard of Oz、Concierge、Pre-sale 等。

### 3. 更多选项与搜索选择

当前实现位置：

- `StarterActionCard` 在 `CopilotDrawer.tsx` 中直接 `control.options.map(...)` 渲染全部 chips。

实施方案：

- 扩展 `StarterControl`：
- `featuredCount?: number`
- `searchable?: boolean`
- `placeholder?: string`
- 在 `StarterActionCard` 中增加本地 UI 状态：
- 每个 `control.id` 是否 expanded。
- 每个 `control.id` 的 query。
- 默认显示：
- 前 5 个 featured options。
- 已选项如果不在前 5 个，也必须显示。
- 展开后：
- 展示全部 options 或搜索框 + 过滤结果。
- 选项很多时限制可视高度，内部滚动。
- 视觉约束：
- 仍使用当前卡片，不新增页面。
- 避免截图中顶部看板区域变得过高；展开内容优先在卡片内部滚动或用轻量 popover。

### 4. 打包与 chunk 优化

当前实现位置：

- `apps/web/vite.config.ts` 当前没有 `build.rollupOptions.output.manualChunks`。
- `scripts/package-mac.sh` 是标准 macOS DMG 打包入口。
- `apps/desktop/package.json` 中 `build:desktop` 会构建 shared/web/server/electron，并复制 assets。

实施方案：

1. Vite chunk：

- 在 `apps/web/vite.config.ts` 增加 `build.rollupOptions.output.manualChunks`。
- 候选拆分：
    - `react-vendor`: `react`, `react-dom`, `react-router-dom`
    - `markdown`: `react-markdown`, markdown 相关依赖
    - `collab`: `yjs`, `y-protocols` 等
    - 其他大依赖按构建输出再定
- 如果仍大，再做页面级 `React.lazy`：`LibraryPage`、`ProjectWorkspacePage`、`HistoryPage`、`CopilotDrawer`。

2. 打包脚本可诊断性：

- 保留 `bash scripts/package-mac.sh` 为唯一入口。
- 每步输出更明确的产物路径。
- 失败时打印最近日志与缺失文件。
- 最终显式检查：
    - `apps/desktop/build/mac-arm64/PinGarden.app`
    - `apps/desktop/build/PinGarden-<version>-arm64.dmg`

3. 包体内容检查：

- 保持不打包 runtime data。
- 继续排除 `dist/canvases/**/knowledge/book/**`。
- 检查是否重复打包大体积资源，例如 canvases 同时出现在 app dist 与 cli assets；如重复严重，再决定是否去重。

## Directory Structure Summary

```
/Users/siboli/Documents/商业/BusinessModelCanvas/
├── apps/web/src/copilot/
│   ├── useConversation.ts
│   │   # [MODIFY] 从组件本地 state 改为读取 App session in-memory store。
│   ├── conversationStore.ts
│   │   # [NEW] App 打开期间有效的 Copilot 会话内存 store，不落盘。
│   └── starterActions.ts
│       # [NEW/OPTIONAL] 抽离主视角建议看板定义，支持 5 类看板和动态选项。
├── apps/web/src/components/
│   └── CopilotDrawer.tsx
│       # [MODIFY] 接入全局会话 store；主视角看板增加商业模式/实验；StarterActionCard 支持更多选项和搜索。
├── apps/web/src/pages/
│   └── LibraryPage.tsx
│       # [MODIFY] 把 patterns/experiments/strategyFrameworks/canvasDefs 作为 catalog 传给 CopilotDrawer。
├── apps/web/src/i18n/
│   ├── zh.json
│   │   # [MODIFY] 增加商业模式、实验、更多、收起、搜索等文案。
│   └── en.json
│       # [MODIFY] 增加对应英文文案。
├── apps/web/vite.config.ts
│   # [MODIFY] 增加合理 manualChunks 或后续懒加载配套。
└── scripts/package-mac.sh
    # [MODIFY/VERIFY] 改善打包结果确认和失败日志；保持唯一标准打包入口。
```

## Key Code Structures

### Conversation store

```ts
type ConversationKey = string;

type ConversationSnapshot = {
  messages: ConversationMessage[];
};

function getConversationKey(displayName: string | undefined): ConversationKey;
function subscribe(key: ConversationKey, listener: () => void): () => void;
function getSnapshot(key: ConversationKey): ConversationSnapshot;
function append(key: ConversationKey, msg: Omit<ConversationMessage, 'id' | 'ts'>): ConversationMessage;
function updateLast(key: ConversationKey, mutator: (msg: ConversationMessage) => ConversationMessage): void;
function clear(key: ConversationKey): void;
```

### Starter action catalog

```ts
type StarterControl = {
  id: string;
  label: string;
  prefix?: string;
  suffix?: string;
  options: StarterOption[];
  featuredCount?: number;
  searchable?: boolean;
};

type LibraryStarterCatalog = {
  patterns?: BusinessModelPattern[];
  experiments?: Experiment[];
  strategyFrameworks?: StrategyFramework[];
  canvasDefs?: CanvasDefSummary[];
};
```

## Acceptance Criteria

1. Copilot 对话记忆：

- 在 `/library` 提问后进入案例/项目，再返回策略库，对话仍存在。
- 在多个案例之间切换，对话仍存在。
- 点击清空后当前 App 会话被清空。
- 关闭/刷新 App 后对话不恢复，确认没有落盘。

2. 主视角看板：

- 策略库主视角下可看到 5 个建议看板：战略选择、画布推荐、案例灵感、商业模式、实验。
- 商业模式和实验看板能生成正确 prompt，并可发送。
- 无数据或接口失败时仍有 fallback 选项。

3. 更多选项：

- 每个看板默认紧凑展示精选项。
- 用户能打开更多选项，并选择非默认 5 个内的条目。
- 选中后 preview 文案和最终 prompt 都正确更新。

4. 打包/chunk：

- `pnpm typecheck` 通过。
- `pnpm --filter @pingarden/web build` 通过，chunk warning 明显减少或有明确解释。
- `bash scripts/package-mac.sh` 能产出 `.app` 和 `.dmg`，失败时有明确缺失项。

## Agent Extensions

### SubAgent

- code-explorer
- Purpose: 在实施前复核 Copilot 状态生命周期、策略库数据源、starter action 结构和打包配置，防止重复造页面或遗漏既有数据。
- Expected outcome: 明确 `useConversation`、`CopilotDrawer`、`LibraryPage`、`vite.config.ts`、`package-mac.sh` 的改动边界。