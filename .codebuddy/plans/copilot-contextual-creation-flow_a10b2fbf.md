---
name: copilot-contextual-creation-flow
overview: 重构 PinGarden Copilot 的创建/补充入口：移除独立大创建板块，改为随当前上下文变化的轻量提示与动作流，并区分无项目、已有项目、画布、Story 等场景。
design:
  architecture:
    framework: react
  styleKeywords:
    - 紧凑
    - 上下文感知
    - 轻提示
    - 低干扰
    - 工作流联动
  fontSystem:
    fontFamily: Inter, PingFang SC
    heading:
      size: 14px
      weight: 600
    subheading:
      size: 12px
      weight: 500
    body:
      size: 11px
      weight: 400
  colorSystem:
    primary:
      - "#111827"
      - "#4F46E5"
    background:
      - "#FFFFFF"
      - "#F9FAFB"
      - "#EEF2FF"
    text:
      - "#111827"
      - "#4B5563"
      - "#9CA3AF"
    functional:
      - "#10B981"
      - "#F59E0B"
      - "#EF4444"
todos:
  - id: audit-copilot-contexts
    content: 使用 [subagent:code-explorer] 复核 Copilot 上下文入口
    status: completed
  - id: define-context-modes
    content: 使用 [skill:pingarden] 定义创建、补充、只读场景模式
    status: completed
    dependencies:
      - audit-copilot-contexts
  - id: replace-large-guide
    content: 移除大创建卡，改为轻量上下文提示
    status: completed
    dependencies:
      - define-context-modes
  - id: wire-composer-intents
    content: 联动 composer 图片和文字触发合适 intent
    status: completed
    dependencies:
      - replace-large-guide
  - id: update-i18n-copy
    content: 更新中英文提示与确认卡文案
    status: completed
    dependencies:
      - replace-large-guide
  - id: verify-copilot-flow
    content: 验证类型、构建和主要 Copilot 场景
    status: completed
    dependencies:
      - wire-composer-intents
      - update-i18n-copy
---

## User Requirements

- 调整 Copilot 中“创建项目”的交互方式，去掉当前独立、较大的创建项目板块，避免占用过多垂直空间。
- 将“创建项目”能力与底部输入框和图片上传入口联动：用户可以直接输入项目描述、粘贴信息、上传一张画布图，然后由 Copilot 判断是否生成项目草稿。
- 不同上下文要有不同提示：
- 不在具体项目内时：提示可以通过描述或上传图来创建新项目。
- 已在用户项目内时：不再强调“创建项目”，而是提示可以增加画布、生成 Story 或补充当前项目内容。
- 在画布内时：提示可以基于当前画布生成后续画布、优化便签或整理为 Story。
- 在 Story 内时：提示可以扩写、优化 Story 或建议嵌入画布。
- 在只读案例/策略库内时：提示可以学习、参考、fork，而不是直接写入原案例。
- 图片中的画布内容应尽量由 AI 自动分析和填充，不要要求用户逐个填写画布字段。
- 用户只需要补充或确认项目名称、项目描述等真正需要人工判断的信息。

## Product Overview

Copilot 将从“独立创建入口”改为“上下文感知的轻量引导”。用户主要通过底部输入框与图片上传完成操作，顶部只提供简洁提示，减少重复入口和空间占用。

## Core Features

- 紧凑型上下文提示，替代大块创建项目卡片。
- 底部输入框自动承接文字、图片和创建意图。
- 根据当前上下文切换提示语和默认动作。
- 无项目上下文支持生成项目草稿。
- 项目上下文支持引导增加画布或 Story。
- 继续保留项目草稿确认卡，仅要求确认项目名称和描述。

## Tech Stack Selection

- 前端：沿用现有 React + TypeScript + Tailwind CSS 结构。
- 服务端：沿用现有 Fastify + TypeScript Copilot SSE 代理。
- 共享类型：沿用 `packages/shared/src/index.ts` 中的 Copilot DTO。
- 数据写入：继续复用现有 `projectsApi.create`、`api.createCanvas`、`api.bulkStickies`、`storiesApi.create`，不绕过 `CanvasStorage` 与既有 HTTP API。

## Implementation Approach

本次改造以“上下文模式驱动 Copilot UI”为核心：在 `CopilotDrawer.tsx` 中根据 `attachedRef` 派生当前工作模式，并用轻量提示替代独立创建项目大卡。底部 composer 成为唯一主要输入入口，发送时根据模式、是否有图片、用户是否触发创建项目，自动决定是否携带隐藏 `intent`。

关键决策：

- 去掉 `ProjectCreationGuide` 的大卡布局，不再与 starter cards 上下叠放。
- 新增轻量 `ContextActionHint` 或类似组件，放在 context chip 下方或 composer 上方，只显示一行说明和少量小按钮。
- `attachedRef === null` 时，用户上传图片并发送可自动走 `project-draft` intent；用户不上传图片时，通过简洁提示引导输入项目描述。
- `attachedRef.type === 'project' | 'canvas' | 'story'` 且 `projectSource !== 'library'` 时，默认不触发项目创建，而是让 Copilot 围绕当前项目补充画布或 Story。
- 只读库内容仍使用学习/参考/fork 语义，避免暗示可直接写入案例库。
- 短 visible prompt 保留在前端，长 JSON 协议继续在服务端后台注入，避免污染聊天记录。

## Implementation Notes

- 保持现有 `CopilotDrawer` 的 props 结构，优先内部派生模式；如需更强写入联动，再从 `ProjectWorkspacePage.tsx` 传入可选 callbacks。
- 不新增大范围状态管理，避免影响现有 `useConversation` 本地会话存储。
- 图片上传仍使用当前压缩逻辑，避免再次触发 Kimi 上下文过长问题。
- 对 `project-draft` intent 要确保 `handleProjectGuideStart` 和图片发送路径都正确传入 intent。
- 不直接让 Copilot 自动写入；继续通过确认卡或明确按钮完成创建，控制误写风险。
- i18n 必须同步更新 `zh.json` 和 `en.json`。

## Architecture Design

现有架构保持不变，只在 Copilot 交互层增加上下文模式判断：

```mermaid
flowchart TD
  A[CopilotDrawer] --> B[deriveCopilotMode(attachedRef)]
  B --> C[ContextActionHint]
  B --> D[StarterActionList]
  E[Composer text/image] --> F[handleSend]
  F --> G{mode + images + explicit intent}
  G -->|new project| H[intent: project-draft]
  G -->|existing project/canvas/story| I[normal chat with attachedContext]
  H --> J[Server hidden project draft protocol]
  J --> K[ProjectDraftCard confirm]
  I --> L[AI suggestions for canvas/story additions]
```

## Directory Structure

本次改造集中在 Copilot UI、提示协议和文案：

```
BusinessModelCanvas/
├── apps/
│   ├── web/
│   │   ├── src/components/CopilotDrawer.tsx
│   │   │   # [MODIFY] Copilot 主抽屉。移除独立大号 ProjectCreationGuide 展示，新增上下文模式派生、轻量提示组件、composer 联动发送逻辑；根据 null/project/canvas/story/library 场景切换提示与默认 intent。
│   │   ├── src/components/CopilotProjectDraftCard.tsx
│   │   │   # [MODIFY] 保持项目草稿确认卡；必要时微调文案和视觉，使其只承接项目名/描述确认，不展示技术字段。
│   │   ├── src/copilot/projectDraft.ts
│   │   │   # [MODIFY] 保持短前台 prompt；必要时增加创建项目显式触发文案生成函数，避免长协议进入用户消息。
│   │   ├── src/api/copilot.ts
│   │   │   # [MODIFY] 如新增 existing-project intent，扩展 CopilotIntent；否则仅确保 project-draft 传递正确。
│   │   └── src/i18n/
│   │       ├── zh.json
│   │       │   # [MODIFY] 增加轻量上下文提示、composer 创建提示、项目/画布/Story 场景文案。
│   │       └── en.json
│   │           # [MODIFY] 同步英文文案。
│   └── server/
│       └── src/http/copilot.ts
│           # [MODIFY] 保持 project-draft 后台协议；如规划加入 canvas/story draft intent，则在 ChatRequestSchema 和 buildLatestUserMessage 中扩展隐藏协议。
└── packages/
    └── shared/src/index.ts
        # [AFFECTED] 若后续实现“增加画布/Story 确认卡”，需新增 CopilotProjectAdditionDraft 类型；本轮轻量提示可不改。
```

## Key Code Structures

本轮优先用文本说明即可。若实现“项目内增加画布/Story”的可确认写入卡，后续再新增共享 DTO。

## Design Approach

改为轻量、上下文感知的 Copilot 引导设计。顶部不再显示独立大创建卡，而是在当前页面 chip 下方显示一条紧凑提示；底部输入框成为主要操作区。

### 页面/区域规划

1. **状态栏**

- 保留 Kimi Code 状态、清空、设置入口。
- 视觉保持小字号、低占用。

2. **上下文区域**

- 保留“基于当前页面”chip。
- 增加一行 context-aware hint：不同场景显示创建项目、补充项目、增加画布、整理 Story、参考案例等提示。
- 提示使用浅色背景或细边框，不使用大卡片。

3. **快捷建议区**

- 保留现有横向 starter cards。
- 不再插入独立创建项目大卡。
- 无项目上下文时可显示一个小型“创建项目草稿”chip，而不是完整卡片。

4. **Composer 区**

- 强化底部输入框作为主入口。
- 上传图片后提示“可发送生成项目草稿/补充当前项目”。
- 发送按钮根据上下文触发合适 intent。

5. **确认卡**

- 项目草稿卡继续用于最终确认。
- 只展示用户需要确认的项目名、描述、画布数量、便签数量。

## Agent Extensions

### SubAgent

- **code-explorer**
- Purpose: 复核 Copilot 挂载点、attachedRef 场景、项目/画布/Story API 调用链。
- Expected outcome: 确认改造只影响 Copilot 交互层，不破坏项目工作区、策略库和现有创建链路。

### Skill

- **pingarden**
- Purpose: 校验“创建项目、增加画布、生成 Story、案例库只读/fork”这些 PinGarden 业务语义。
- Expected outcome: 新提示与 PinGarden 工作流一致，避免在已有项目或只读案例中给出错误创建引导。