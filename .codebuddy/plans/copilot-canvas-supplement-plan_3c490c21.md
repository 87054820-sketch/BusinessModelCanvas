---
name: copilot-canvas-supplement-plan
overview: 修复 Copilot 在创建项目后无法真正按用户反馈补充/扩展画布内容的问题，重点解决扩展画布缺少标签/贴纸、后续反馈只回复不落库、创建草稿协议能力不足，并纳入重新构建与 DMG 打包验证。
design:
  architecture:
    framework: react
  styleKeywords:
    - 轻量确认卡
    - 渐变提示
    - 状态分组
    - 低风险写入
    - 清晰可审计
  fontSystem:
    fontFamily: PingFang SC
    heading:
      size: 16px
      weight: 600
    subheading:
      size: 13px
      weight: 500
    body:
      size: 12px
      weight: 400
  colorSystem:
    primary:
      - "#111827"
      - "#4F46E5"
      - "#0F766E"
    background:
      - "#FFFFFF"
      - "#F8FAFC"
      - "#EEF2FF"
    text:
      - "#111827"
      - "#4B5563"
      - "#9CA3AF"
    functional:
      - "#16A34A"
      - "#F59E0B"
      - "#DC2626"
      - "#2563EB"
todos:
  - id: audit-copilot-write-flow
    content: 使用 [subagent:code-explorer] 复核 Copilot 创建、扩展、写入链路
    status: completed
  - id: define-update-draft-contract
    content: 扩展 shared DTO、Copilot intent 和项目更新协议
    status: completed
    dependencies:
      - audit-copilot-write-flow
  - id: refresh-project-context
    content: 让项目工作模式发送最新项目上下文和更新意图
    status: completed
    dependencies:
      - define-update-draft-contract
  - id: implement-update-apply-card
    content: 新增项目更新确认卡并应用画布便签变更
    status: completed
    dependencies:
      - define-update-draft-contract
      - refresh-project-context
  - id: harden-project-creation
    content: 拦截首次创建和扩展流程中的空画布
    status: completed
    dependencies:
      - define-update-draft-contract
  - id: align-methodology-and-style
    content: 使用 [skill:pingarden] 和 [skill:css-architecture] 校验方法论与 UI 结构
    status: completed
    dependencies:
      - implement-update-apply-card
      - harden-project-creation
  - id: verify-and-package-dmg
    content: 运行 typecheck、Web build，并重新打包 DMG
    status: completed
    dependencies:
      - align-methodology-and-style
---

## User Requirements

- 修复 Agent 创建项目后“画布标签/便签不全”的问题。
- 创建项目时，用户上传的多张图片（例如 4 张图）必须作为主要来源处理，尽量把图片中已有的可见标签/便签完整整合进画布，不允许只抽取少量内容。
- 创建项目时，用户同时提供的描述性文字必须被整合成项目 story，而不是只用于项目名称或一句 description。
- 覆盖完整链路：首次创建项目、用户反馈补充、扩展相关画布、补充已有画布内容、创建/调整 story、最终真正写入项目。
- 用户反馈后，Agent 不能只在对话里说明“会补充”或只创建空画布，必须生成可执行的补充方案，并让用户确认后落到画布或 story 中。
- 扩展出来的新画布必须带有有效便签内容，不应出现只有画布框架、没有标签/便签的空画布。
- 已有画布补充时要保留原有内容，在此基础上补齐缺失标签/便签，避免覆盖或误删。
- 在项目页面调用 Copilot 时，必须能针对当前创建任务继续优化：新增/调整便签、扩展画布、创建 story、修改已有 story。

## Product Overview

PinGarden Copilot 的项目创建和项目迭代流程需要从“聊天建议”升级为“可确认、可应用的项目构建变更”。首次创建时，Copilot 需要把用户上传图片中的可见标签/便签、用户输入的描述性文字同时纳入结构化草稿：图片内容落到画布便签，描述性文字沉淀为项目 story。用户在创建项目后继续提出补充要求时，界面应展示可预览的补充卡片，明确哪些画布会新增、哪些画布会补充便签、哪些 story 会创建或修改，以及每项会写入多少内容。

## Core Features

- 首次项目草稿质量校验：每张由 Agent 创建的画布必须包含有效便签。
- 图片来源覆盖校验：每张上传图片都要形成 `sourceFindings`，每个可见标签/便签要么映射到画布 sticky，要么进入 `unmappedSourceItems` 并说明不落地原因。
- 多图合并去重：支持从多张图中合并相同/相近标签，保留差异项，避免因为图片数量多而遗漏内容。
- Story 草稿生成：创建项目时可同步生成项目 story，把用户描述性文字、图片推断出的上下文、画布阅读顺序组织成 narrative。
- 项目更新草稿：支持对已有项目新增画布、补充已有画布便签、创建 story、更新已有 story。
- 变更预览卡片：展示新增/更新画布、便签数量、story 变化、来源覆盖率、风险提示和确认按钮。
- 安全应用：写入前校验画布类型、区域 ID、便签内容和 story 的 canvas directive，避免空画布、无效标签和无法渲染的 story。
- 反馈闭环：用户提出“补充标签/补充画布/扩展画布/调整 story”后，Agent 输出可执行更新，而不是仅给文字建议。

## Tech Stack Selection

- 前端：沿用现有 React + TypeScript + Vite + Tailwind CSS。
- 后端：沿用 Fastify + TypeScript + Zod 校验。
- 数据层：继续通过现有 CanvasStorage/FederatedStorage 与 Yjs 状态接口，不在 HTTP handler 中直接绕过存储层。
- 写入接口：优先复用现有 `POST /canvases/:id/stickies/bulk` 与 `POST /canvases/:id/objects/bulk`，避免新增不必要的数据通道。
- 构建与发布：沿用 `pnpm typecheck`、`pnpm --filter @pingarden/web build`、`pnpm dist`。

## Implementation Approach

当前代码只支持 `pingarden.projectDraft` 创建新项目，无法表达“更新已有项目/补充已有画布/扩展新画布并带便签”，也没有在创建阶段生成 story。方案分两层：

1. 强化首次创建协议：`pingarden.projectDraft` 增加来源审计、story 草稿和质量校验字段。模型必须先抽取多张图片与文字的 `sourceFindings`，再把 findings 映射到画布便签和 story 段落。
2. 新增项目更新协议：例如 `pingarden.projectUpdateDraft`，让 Copilot 在项目工作模式下输出结构化变更；前端解析后展示确认卡，用户确认后调用已有 API 创建画布、替换完整便签状态、创建或更新 story。

关键决策：

- 保留现有 `CopilotProjectDraft` 作为新项目创建协议，但扩展它的质量字段和 `stories` 字段，避免破坏已有创建流程。
- 创建阶段引入“来源覆盖”校验：每个 image attachment 必须有至少一个 `sourceFinding`；每个 finding 必须被 `sourceRefs` 引用到 sticky/story，或进入 `unmappedSourceItems`。
- 对来源覆盖不足的草稿不允许直接应用，UI 提供“让 Copilot 补齐遗漏”动作，要求模型基于未覆盖来源重新生成。
- 新增项目更新协议，而不是复用创建协议，区分“创建新项目”和“修改已有项目”。
- 对已有画布采用完整 desired state 写入：模型必须输出保留旧便签后的完整目标便签列表，避免 replace-mode 写入时误删。
- 对新扩展画布强制要求非空便签：如果草稿中某张画布没有有效便签，前端阻止应用并提示重新生成。
- Story 创建/更新走现有 `storiesApi.create()` / `storiesApi.update()`，并依赖服务端已有 story canvas directive 校验，确保 story 中嵌入的画布能解析到当前项目。
- 项目工作模式下刷新上下文：用户反馈通常发生在已有项目中，发送请求时应获取最新项目/画布/story 上下文，避免模型基于旧状态回答。
- 不直接让模型“声称已完成”：所有实际写入必须由 UI 确认卡触发。

## Implementation Notes

- `apps/server/src/http/copilot.ts` 已有 `buildLatestUserMessage()` 传入图片附件，`buildProjectDraftProtocol()` 需要明确多图来源抽取、来源覆盖、自检和 story 输出要求。
- `apps/server/src/http/copilot.ts` 已有 `buildProjectMarkdown()`、`buildCanvasMarkdown()` 和 `buildStoryMarkdown()`，可作为更新草稿的上下文来源。
- `apps/web/src/components/CopilotDrawer.tsx` 当前只解析 `extractProjectDrafts()` 并渲染 `CopilotProjectDraftCard`，需要扩展为同时识别创建草稿和更新草稿，并在项目/故事上下文下传递 active story。
- `apps/web/src/components/CopilotProjectDraftCard.tsx` 当前会创建所有 canvas，即使某些 canvas 没有 stickies；需要增加空画布防护、来源覆盖校验和 story 创建流程。
- `apps/web/src/api/stories.ts` 已有 `storiesApi.create()` / `storiesApi.update()`，可直接用于创建项目后的 story 落库和后续 story 调整。
- `apps/server/src/http/stories.ts` 已有 `validateEmbeddedCanvases()`，story 中的 `::canvas[...]` directive 必须能解析到当前项目，项目草稿卡应用 story 时要在创建画布后再写入 story。
- 更新已有画布时要校验 zoneId 来自实时 canvas definition，不能信任模型输出。
- replace-mode 写入风险较高，变更卡片中要展示“将替换为完整目标状态”的提示，并在执行前保留现有流程中的快照机制。
- 日志仅记录操作类型、项目 ID、画布 ID、story ID、便签数量和错误摘要，避免记录用户完整商业内容或图片内容。
- 性能上，项目上下文可能较大；仅在项目/画布/story 工作模式或用户触发补充/扩展类操作时刷新上下文，避免普通闲聊反复拉取大型上下文。

## Architecture Design

数据流：

首次创建数据流：

1. 用户上传多张图片并输入描述性文字。
2. 前端以 `project-draft` intent 发送图片附件和文字。
3. 后端拼接强化后的创建协议，要求模型输出 `sourceFindings`、画布便签、story 草稿和 `sourceCoverage`。
4. 前端解析草稿并展示创建确认卡，显示每张图片抽取了多少 findings、多少已映射为便签/story、哪些未覆盖。
5. 用户确认后，前端创建项目和画布，写入非空便签，再创建 story。
6. 成功后刷新项目页面，用户能看到画布便签和 story。

项目内迭代数据流：

1. 用户在项目、画布或 story 上下文中提出“补充标签/扩展画布/调整 story”。
2. 前端刷新项目上下文并发送 `project-update` intent。
3. 后端拼接项目更新协议，要求模型输出结构化 `projectUpdateDraft`。
4. 前端解析草稿并展示项目更新确认卡。
5. 用户确认后，前端校验画布定义、区域 ID、story directive 和来源覆盖。
6. 对新画布调用 `createCanvas` 后写入便签；对已有画布调用批量写入接口更新完整便签状态；对 story 调用 create/update。
7. 成功后刷新项目页面，用户看到真实落地的便签和 story 调整。

## Directory Structure Summary

本次实现集中在 Copilot 协议、来源覆盖校验、story 草稿、草稿解析、确认卡片和项目写入流程，不改动底层 Yjs 存储结构。

```
BusinessModelCanvas/
├── packages/shared/src/index.ts
│   # [MODIFY] 增加 Copilot 项目更新草稿、来源审计、story 草稿 DTO。定义新建画布、更新已有画布、便签列表、story 操作、备注和校验字段，保持前后端类型一致。
├── apps/server/src/http/copilot.ts
│   # [MODIFY] 扩展 Copilot intent 校验和隐藏协议。新增项目更新协议，强化首次创建草稿质量要求，要求多图来源覆盖、描述文字生成 story、扩展画布必须带有效便签。
├── apps/server/src/http/stories.ts
│   # [REFERENCE] 复用已有 story create/update 与 canvas directive 校验，不新增绕过通道。
├── apps/web/src/api/copilot.ts
│   # [MODIFY] 扩展 CopilotIntent 类型，支持 project-update 请求。
├── apps/web/src/api/stories.ts
│   # [REFERENCE] 复用 storiesApi.create/update 写入创建阶段 story 和后续 story 调整。
├── apps/web/src/api/client.ts
│   # [MODIFY] 如需使用 objects/bulk，补充 bulkObjects 客户端封装；否则复用 bulkStickies 并保持调用集中。
├── apps/web/src/copilot/projectDraft.ts
│   # [MODIFY] 拆分或扩展草稿解析逻辑，支持同时解析 projectDraft、projectUpdateDraft、sourceCoverage 和 story 草稿，并提供类型守卫。
├── apps/web/src/components/CopilotDrawer.tsx
│   # [MODIFY] 在项目/画布/story 工作模式下识别补充、扩展、story 调整意图，刷新上下文，渲染项目更新草稿卡片。
├── apps/web/src/components/CopilotProjectDraftCard.tsx
│   # [MODIFY] 增加空画布、无效便签、来源覆盖不足防护，并在项目和画布创建后写入 story。
├── apps/web/src/components/CopilotProjectUpdateDraftCard.tsx
│   # [NEW] 项目更新确认卡。展示新增/更新画布、便签数量、story 操作、来源覆盖、校验状态和确认应用按钮，负责调用写入 API。
├── apps/web/src/i18n/zh.json
│   # [MODIFY] 增加项目更新卡片、来源覆盖、story 创建/更新、空画布拦截、应用成功/失败等中文文案。
├── apps/web/src/i18n/en.json
│   # [MODIFY] 增加对应英文文案，保持中英文一致。
└── apps/web/src/copilot/projectDraft.test.ts
    # [NEW] 单元测试。覆盖创建草稿解析、更新草稿解析、来源覆盖不足拒绝、story 草稿解析、空画布拒绝、无效 zoneId 过滤等关键场景。
```

## Key Code Structures

建议新增的共享结构只做接口级定义，具体字段以实现时校验结果为准：

- `CopilotSourceFinding`
- `id`
- `sourceType: "image" | "text"`
- `sourceIndex`
- `text`
- `confidence`
- `CopilotSourceCoverage`
- `sourceImageCount`
- `findings`
- `mappedFindingIds`
- `unmappedSourceItems`
- `CopilotDraftSticky`
- 增加可选 `sourceRefs: string[]`，用于追踪该便签来自哪些图片/文字 finding。
- `CopilotDraftStory`
- `title`
- `content`
- `sourceRefs`
- `canvasRefs` 或可解析的 `::canvas[...]` directive。
- `CopilotProjectDraft`
- 保留 `kind: "pingarden.projectDraft"`
- 增加 `sourceCoverage`
- 增加 `stories`
- `CopilotProjectUpdateDraft`
- `kind: "pingarden.projectUpdateDraft"`
- `projectId`
- `summary`
- `sourceCoverage`
- `operations`
- `createCanvas`: 新建画布，必须包含非空 `stickies`
- `replaceCanvasStickies`: 更新已有画布，必须包含完整目标 `stickies`
- `createStory`: 创建新 story
- `replaceStory`: 更新已有 story 的完整目标内容

## Design Approach

新增的项目创建/更新确认卡延续 Copilot 抽屉中的轻量卡片风格，不大幅改造界面。卡片应让用户一眼看清：4 张图和描述文字是否被覆盖、将新增哪些画布、将补充哪些已有画布、每张画布会写入多少便签、哪些 story 会创建或修改，以及是否存在空画布、无效区域或未覆盖来源。

## Visual Structure

- 顶部：变更摘要，使用浅色渐变背景区分“可应用更新”。
- 来源覆盖区：按图片/文字列出已抽取 findings、已映射数量、未映射项；覆盖不足时显示红色校验提示，不允许应用。
- 中部：按操作分组展示“新增画布”“更新画布”“创建/更新 story”，每项显示画布标题、类型、便签数量、story 标题和状态。
- 风险提示：当操作会替换已有便签或 story 状态时，用琥珀色提示说明会保留已有内容后的完整写入。
- 底部操作：主按钮“应用到项目”，次按钮“让 Copilot 重新补齐遗漏”，失败时显示可读错误。
- 空画布状态：显示为红色校验提示，不允许应用。

## Agent Extensions

### SubAgent

- **code-explorer**
- Purpose: 深入复核 Copilot 创建、扩展、更新和写入链路，避免遗漏现有 API 和状态约束。
- Expected outcome: 输出精确调用链、受影响文件、现有模式和回归风险。

### Skill

- **pingarden**
- Purpose: 对齐 PinGarden 的 greenfield、iterate、cross-canvas 工作流，确保新协议符合画布方法论和 replace-mode 写入规则。
- Expected outcome: 首次创建、已有画布迭代、跨画布扩展都能生成完整且可落地的便签内容。
- **css-architecture**
- Purpose: 约束新增确认卡片的样式组织，避免散乱的一次性 UI 结构。
- Expected outcome: 新 UI 与现有 Copilot 抽屉风格一致，类名和组件边界清晰。

## Acceptance Criteria

- 使用 4 张图片创建项目时，确认卡必须展示 4 张图片各自的来源抽取结果；如果某张图没有任何 finding，不能直接应用。
- 每个图片/文字 finding 必须被映射到至少一个 sticky 或 story 段落；否则必须列入 `unmappedSourceItems` 并提示用户“仍有未覆盖来源”。
- 创建项目后，所有被创建的画布都至少有 1 个有效 sticky；任何空画布都会阻止应用。
- 创建项目时，如果用户提供了描述性文字，草稿必须至少生成 1 个 story，且 story 内容引用或解释创建出的画布。
- 在项目页面再次调用 Copilot 后，用户能通过确认卡完成以下操作：新增便签、补充已有画布、扩展新画布、创建 story、更新已有 story。
- 更新已有画布和 story 时必须保留原内容语义，采用完整目标状态预览后再写入。
- 构建验证通过：`pnpm typecheck`、`pnpm --filter @pingarden/web build`。
- 发布验证完成：重新生成 macOS `DMG`，并确认产物路径。