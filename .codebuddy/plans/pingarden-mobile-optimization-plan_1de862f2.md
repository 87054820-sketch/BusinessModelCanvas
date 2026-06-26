---
name: pingarden-mobile-optimization-plan
overview: 为 PinGarden 云端移动端体验制定完整优化计划，覆盖策略库页面响应式重排、Copilot 移动端抽屉/输入区适配、移动端 Load failed 错误治理，以及上线前移动端测试门禁。
design:
  architecture:
    framework: react
  styleKeywords:
    - Mobile First
    - Responsive Layout
    - Clean
    - Readable
    - Safe Area Aware
    - Touch Friendly
  fontSystem:
    fontFamily: PingFang SC
    heading:
      size: 24px
      weight: 700
    subheading:
      size: 15px
      weight: 500
    body:
      size: 14px
      weight: 400
  colorSystem:
    primary:
      - "#111827"
      - "#059669"
      - "#10B981"
    background:
      - "#FFFFFF"
      - "#FAFAF7"
      - "#F9FAFB"
    text:
      - "#111827"
      - "#374151"
      - "#6B7280"
    functional:
      - "#DC2626"
      - "#FEF2F2"
      - "#F59E0B"
      - "#ECFDF5"
todos:
  - id: audit-mobile-entrypoints
    content: 使用 [subagent:code-explorer] 复核移动端页面、Copilot 和错误链路
    status: completed
  - id: optimize-library-mobile
    content: 使用 [skill:css-architecture] 优化策略库移动端布局和分类导航
    status: completed
    dependencies:
      - audit-mobile-entrypoints
  - id: optimize-copilot-mobile
    content: 重构 Copilot 移动端全屏抽屉、输入区和快捷动作
    status: completed
    dependencies:
      - audit-mobile-entrypoints
  - id: normalize-mobile-errors
    content: 归一化移动端 Load failed 网络错误并增加重试入口
    status: completed
    dependencies:
      - audit-mobile-entrypoints
  - id: add-mobile-tests
    content: 使用 [skill:playwright-cli] 补充移动端 smoke/UI 测试
    status: completed
    dependencies:
      - optimize-library-mobile
      - optimize-copilot-mobile
      - normalize-mobile-errors
  - id: deploy-and-verify
    content: 使用 [integration:tcb] 部署 CloudRun 并运行 smoke 测试
    status: completed
    dependencies:
      - add-mobile-tests
---

## 用户需求

对 PinGarden 云端 Web 在移动端的体验做完整优化计划，重点解决两类问题：

1. **移动端显示不友好**

- 策略库页面在手机竖屏下被严重挤压。
- 页面标题、副标题、底部分类标签出现逐字竖排。
- “PinGarden Copilot”和“创建战略项目”等按钮与正文抢占宽度。
- 分类标签在底部换行混乱，阅读和点击体验差。
- 需要针对手机竖屏、微信/企业微信内置浏览器进行移动端适配设计。

2. **移动端 Copilot 报错**

- Copilot 抽屉在移动端打开后，出现“出错了: Load failed”。
- 当前错误提示过于技术化，用户无法判断是网络、WebView、请求中断还是服务端问题。
- Copilot 输入区、图片按钮、发送按钮和快捷动作按钮在底部堆叠拥挤。
- 需要优化移动端 Copilot 布局、错误提示、重试机制和上线前测试保障。

3. **云端动态 chunk 加载失败**

- 云端项目页出现 `Route crashed — see stack below`。
- 错误为 `Failed to fetch dynamically imported module: .../assets/ProjectWorkspacePage-*.js`。
- 初步判断是 CloudRun 滚动发布、浏览器/边缘缓存或静态资源 fallback 导致的前端主 bundle 与 lazy chunk 版本错配。
- 需要增加 chunk 加载失败友好提示、刷新入口、静态资源缓存策略和 smoke test 检查。

## 产品概览

移动端应成为 PinGarden 云端的可用浏览与轻量 Copilot 入口，而不是桌面页面的缩小版。策略库需要在手机上正常阅读、切换分类、打开 Copilot；Copilot 需要适配手机安全区、软键盘和 WebView 网络异常。

## 核心功能

- 策略库移动端响应式布局优化
- 分类标签移动端横向滚动或紧凑展示
- 顶部标题、描述和操作按钮移动端重排
- Copilot 移动端全屏抽屉优化
- Copilot 输入区和快捷动作移动端重排
- `Load failed` 等移动端网络错误友好化
- 增加移动端上线前验证用例

## Tech Stack Selection

基于当前项目现状继续使用现有技术栈：

- 前端：React、TypeScript、Vite、Tailwind CSS
- 后端：Fastify、TypeScript
- 云端部署：CloudBase Run 容器服务
- 测试：现有 Vitest，新增或扩展移动端 smoke/browser 验证
- 自动化验证：优先复用现有 `scripts/cloud-smoke-test.mjs`，必要时引入 Playwright 移动端视口验证

## Implementation Approach

本次优化分三层推进：

1. **移动端布局修复**

- 优先修复 `LibraryPage.tsx` 的响应式结构，避免标题、副标题和 tab 被横向按钮挤压。
- 使用 Tailwind 的移动优先写法：默认手机布局，`sm:` 以上恢复桌面布局。
- 分类 tab 改为移动端横向滚动、不可压缩、保持单行文字。

2. **Copilot 移动端交互优化**

- `CopilotDrawer.tsx` 在移动端使用真正全屏体验，适配 `100dvh` 和底部 safe-area。
- 移动端隐藏拖拽 resize handle，避免与手机滚动/滑动冲突。
- 输入区、图片按钮、发送按钮和快捷动作分层展示，降低底部拥挤。
- 对 `Load failed`、`Failed to fetch`、`NetworkError`、WebView 请求中断等错误统一转为可读提示，并保留重试入口。

3. **测试门禁补齐**

- 扩展 `cloud-smoke-test.mjs`，增加移动端 User-Agent 或移动端专用检查。
- 增加浏览器级移动端验证，用 iPhone 视口检查策略库标题不竖排、tab 不挤压、Copilot 能打开、上传按钮可见、错误提示不显示原始 `Load failed`。
- 将移动端检查纳入 CloudRun 发布后验证流程。

## Implementation Notes

- 避免新增大规模 UI 框架，继续沿用 Tailwind 组件内样式，减少改造面。
- 移动端布局应采用“内容纵向优先、操作按钮下沉或横向滚动”的原则，不再让 CTA 与标题在同一行抢宽。
- Copilot 网络错误处理应集中在 `apps/web/src/api/copilot.ts`，避免各组件重复判断错误字符串。
- 不把真实 Kimi Key 写入仓库、CloudRun 环境变量、README 或计划文件；真实 Kimi 测试仍通过本机临时环境变量或 CI Secret 注入。
- 保持现有 CloudRun smoke test 门禁：每次部署后必须验证 health、静态资源、Copilot provider、SSE、策略库上下文过滤。
- 对移动端 UI 自动化验证，不依赖真实 Kimi Key；真实模型测试作为可选增强。

## Architecture Design

### 当前问题链路

- 策略库页面：
- `apps/web/src/pages/LibraryPage.tsx`
- 当前 `header` 是横向布局，右侧按钮固定不收缩，左侧标题和副标题被压缩。
- tab strip 使用普通 flex，移动端没有横向滚动和 `whitespace-nowrap`。

- Copilot 抽屉：
- `apps/web/src/components/CopilotDrawer.tsx`
- 当前桌面右侧抽屉样式直接套用到移动端。
- composer 区把输入框、图片按钮、发送按钮、快捷动作压在同一区域。
- resize handle 在移动端无意义且可能干扰触控。

- Copilot 网络错误：
- `apps/web/src/api/copilot.ts`
- `streamChat` catch 当前会直接显示原始 `Load failed`。
- 需要加入 `normalizeCopilotFetchError` 一类函数。

### 目标结构

- `LibraryPage` 负责策略库页面响应式布局。
- `CopilotDrawer` 负责移动端抽屉、输入区、快捷动作和错误展示。
- `api/copilot.ts` 负责网络错误归一化。
- `index.css` 提供少量全局移动端安全区/viewport 工具类，避免在多个组件内重复写 `env(safe-area-inset-bottom)`。
- `cloud-smoke-test.mjs` 和移动端浏览器测试负责上线前验证。

## Directory Structure

```text
BusinessModelCanvas/
├── apps/
│   └── web/
│       └── src/
│           ├── App.tsx
│           │   [MODIFY] 优化全局顶部栏移动端布局。减少手机宽度下语言选择、用户标识和 Logo 的拥挤；必要时隐藏次要文字或降低 gap。
│           │
│           ├── pages/
│           │   └── LibraryPage.tsx
│           │       [MODIFY] 策略库页面移动端布局主改造。header 改为手机纵向布局，CTA 按钮在移动端独立成行；tab strip 改为横向滚动且 tab 不换行；页面 padding 改为移动优先。
│           │
│           ├── components/
│           │   └── CopilotDrawer.tsx
│           │       [MODIFY] Copilot 移动端全屏抽屉、safe-area、底部输入区和快捷动作优化。移动端隐藏 resize handle，输入区按钮分层或横向滚动，错误区增加友好提示和重试入口。
│           │
│           ├── api/
│           │   └── copilot.ts
│           │       [MODIFY] 增加移动端/WebView 网络错误归一化。把 `Load failed`、`Failed to fetch`、断网、请求中断等转换为用户可理解提示，避免直接展示底层错误。
│           │
│           └── index.css
│               [MODIFY] 增加移动端安全区、动态 viewport、滚动容器辅助样式。控制 `100dvh`、`env(safe-area-inset-bottom)` 等兼容性。
│
├── scripts/
│   ├── cloud-smoke-test.mjs
│   │   [MODIFY] 扩展云端 smoke test，增加移动端相关 API/HTML 检查，确保策略库上下文过滤和 Copilot SSE 仍正常。
│   │
│   └── mobile-ui-smoke.mjs
│       [NEW] 可选新增浏览器级移动端验证脚本。使用移动端 viewport 打开云端 `/library`，检查标题非竖排、tab 可横向滚动、Copilot 打开、`+ 图片` 可见、错误提示友好。
│
├── docs/
│   └── CLOUD_RELEASE_TEST_PLAN.md
│       [MODIFY] 补充移动端发布测试矩阵。加入企业微信/微信内置浏览器、iPhone 竖屏、Copilot 网络错误、软键盘和 safe-area 检查项。
│
└── package.json
    [MODIFY] 如引入移动端浏览器验证脚本，新增 `smoke:mobile` 或 `test:mobile` 命令。
```

## Key Code Structures

### 移动端错误归一化接口

```ts
function normalizeCopilotFetchError(err: unknown): string;
```

用途：

- 识别 `Load failed`、`Failed to fetch`、`NetworkError`、`AbortError` 等移动端常见错误。
- 输出中文友好错误。
- 不泄漏 API Key，不展示 HTML 错误页。

### 移动端判断辅助

```ts
function isMobileViewport(): boolean;
```

用途：

- 在 CopilotDrawer 中决定是否隐藏 resize handle。
- 仅用于交互行为分支；布局优先靠 CSS media query。

## 设计方案

### 应用类型

这是 Web 云端应用的移动端适配，重点面向手机竖屏和微信/企业微信内置浏览器。设计目标不是把桌面版缩小，而是为移动端重新组织信息层级。

### 策略库页面

- 页面 header 在移动端改为纵向：
- 第一行：返回入口
- 第二行：标题“策略库”
- 第三行：简短说明
- 第四行：Copilot 与创建项目按钮
- 标题和副标题必须占满可用宽度，禁止被右侧按钮挤成逐字竖排。
- CTA 按钮在手机端使用两列或横向滚动按钮组。
- 分类 tab 改为横向滚动条：
- 每个 tab 单行展示
- 数字徽标保持在文字右侧
- 当前 tab 底部高亮
- 不允许文字逐字折行

### Copilot 移动端

- 抽屉在手机端使用全屏模式，而不是桌面右侧窄抽屉。
- 顶部保持标题、全屏/关闭按钮，但隐藏 resize 拖拽条。
- 消息区占主要空间，底部 composer 固定。
- composer 分层：
- 输入框
- 图片/附件提示行
- 发送与快捷动作按钮行
- 快捷动作可横向滚动或两列网格，避免挤压输入框。
- 错误提示改为可读卡片：
- 显示“移动端网络连接中断，请检查网络后重试”
- 提供“重试上一条”
- 可选“复制错误信息”

### 视觉风格

保持现有 PinGarden 简洁、轻量、留白充足的风格。移动端减少横向信息密度，以卡片、横向滚动和底部固定操作区提升可用性。

## Agent Extensions

### SubAgent

- **code-explorer**
- Purpose: 复核移动端布局、Copilot 抽屉、错误处理和测试脚本的相关代码路径。
- Expected outcome: 输出准确的影响文件清单、调用链和风险点，避免遗漏移动端入口。

### Skill

- **css-architecture**
- Purpose: 指导移动端响应式样式组织，避免在组件中堆叠不可维护的 Tailwind 条件。
- Expected outcome: 形成移动优先、可复用、低冲突的响应式样式方案。

- **playwright-cli**
- Purpose: 执行移动端浏览器自动化验证，模拟 iPhone/微信 WebView 视口检查页面布局和 Copilot 交互。
- Expected outcome: 生成可复跑的移动端 UI 验证结果，覆盖标题不竖排、tab 可滚动、Copilot 可用、错误提示友好。

### Integration

- **tcb**
- Purpose: 在实现后部署 CloudRun 并查询服务状态。
- Expected outcome: CloudRun 新版本发布成功，线上 smoke test 通过。