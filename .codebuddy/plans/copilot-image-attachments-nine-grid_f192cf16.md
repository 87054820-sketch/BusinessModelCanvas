---
name: copilot-image-attachments-nine-grid
overview: 优化 Copilot 新建项目与对话中的图片附件能力：将单轮图片上限从 2 张提升到 9 张，并改进添加附件与历史消息缩略图的九宫格展示。
design:
  architecture:
    framework: react
  styleKeywords:
    - 紧凑九宫格
    - 资料托盘
    - 圆角缩略图
    - 轻量操作反馈
    - 对话气泡内网格
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
      - "#2563EB"
    background:
      - "#FFFFFF"
      - "#F9FAFB"
      - "#F3F4F6"
    text:
      - "#111827"
      - "#6B7280"
      - "#FFFFFF"
    functional:
      - "#DC2626"
      - "#16A34A"
      - "#D97706"
      - "#E5E7EB"
todos:
  - id: audit-image-flow
    content: 使用 [subagent:code-explorer] 复核图片附件链路
    status: completed
  - id: raise-image-limit
    content: 同步前后端图片上限为 9 张
    status: completed
    dependencies:
      - audit-image-flow
  - id: create-image-grid
    content: 新增 CopilotImageAttachmentGrid 九宫格组件
    status: completed
    dependencies:
      - raise-image-limit
  - id: wire-composer-history
    content: 接入待发送附件和历史消息缩略图
    status: completed
    dependencies:
      - create-image-grid
  - id: update-copy-lightbox
    content: 更新中英文文案并补齐 Lightbox 挂载
    status: completed
    dependencies:
      - wire-composer-history
  - id: verify-image-attachments
    content: 运行 typecheck 和 Web build 验证
    status: completed
    dependencies:
      - update-copy-lightbox
---

## 用户需求

- 优化 Copilot 创建新项目时的图片附件能力。
- 当前每轮最多只支持 2 张图片，用户希望提升到最多 9 张，覆盖一个项目有 4 张或更多资料图的场景。
- 上传图片后，附件预览需要更清晰、更紧凑，便于用户确认已添加的图片、数量和删除操作。
- 对话记录中用户发送过的图片缩略图需要更好展示；图片多时使用九宫格，避免横向堆叠或占用过多空间。
- 保持图片附件用于创建项目草稿的能力，发送后仍能作为模型分析项目、画布和便签内容的资料来源。

## 产品概览

Copilot 的图片附件体验应从“少量图片附带”升级为“多图资料输入”。用户可以一次添加多张项目截图、画布照片或业务资料图，并在发送前和发送后都能以清晰的缩略图网格查看这些图片。

## 核心功能

- 每轮最多支持 9 张图片附件。
- 添加附件区域展示当前图片数量和剩余可添加数量。
- 待发送附件使用紧凑缩略图网格，支持删除单张图片。
- 对话历史中的图片使用九宫格缩略图展示。
- 点击缩略图可继续复用现有图片预览能力。
- 保持格式校验、大小限制、错误提示和创建项目流程的一致性。

## Tech Stack Selection

- 前端沿用现有 React + TypeScript + Tailwind CSS。
- 后端沿用现有 Fastify + Zod 校验。
- 共享类型沿用 `packages/shared/src/index.ts` 中的 `CopilotImageAttachment`。
- 国际化沿用 `apps/web/src/i18n/zh.json`、`apps/web/src/i18n/en.json`。
- 验证门禁沿用：
- `pnpm typecheck`
- `pnpm --filter @pingarden/web build`

## Implementation Approach

本次采用“小范围组件化 + 前后端限制同步”的方案。先把图片数量限制从 2 提升到 9，并确保前端添加限制、后端 Zod 校验、错误文案使用同一个语义。再抽出一个复用的图片附件网格组件，同时服务于 composer 待发送附件和对话历史附件展示。

关键决策：

1. **限制同步到前后端**

- `apps/web/src/components/CopilotDrawer.tsx` 当前有 `MAX_IMAGE_ATTACHMENTS = 2`。
- `apps/server/src/http/copilot.ts` 当前也有 `MAX_IMAGE_ATTACHMENTS = 2`。
- 两处必须同步改为 9，否则前端能选但后端会拒绝请求。

2. **不改变图片传输架构**

- 现有链路是前端压缩图片为 data URL，通过 JSON 的 `messages[].imageAttachments` 发送到 `/copilot/chat`。
- 后端校验后用 Markdown 图片语法拼进最新 prompt。
- 本次不引入文件上传、对象存储或持久化，避免扩大改动面。

3. **抽取复用展示组件**

- 当前待发送附件和历史附件渲染都集中在 `CopilotDrawer.tsx`。
- 建议新增 `ImageAttachmentGrid` 或同文件内局部组件，统一处理 1-9 张图片的布局。
- 支持 `variant="composer"` 和 `variant="message"`，composer 展示删除按钮与文件名，message 展示更轻量的历史缩略图。

4. **九宫格规则**

- 1 张：大图比例预览，最大宽度受消息气泡约束。
- 2 张：两列并排。
- 3-4 张：两列网格。
- 5-9 张：三列九宫格。
- 缩略图使用 `object-cover`，保持卡片整齐；点击后打开现有 Lightbox。

5. **性能与可靠性**

- 保持 `PROMPT_IMAGE_MAX_BYTES = 64 * 1024` 的压缩目标，9 张约为 576KB 级别，JSON 请求体仍可控。
- 保持单张原图 `MAX_IMAGE_BYTES = 2MB` 校验不变。
- 历史消息只保留前端内存中的缩略图，不新增持久化，避免本地存储膨胀。
- 发送给后端时仍只附带本轮最新图片，旧轮次图片不重复发送，避免上下文和请求体膨胀。

## Implementation Notes

- `handleAddImageFiles(files)` 中的剩余槽位逻辑可继续复用，只需更新上限并优化错误提示。
- `readImageAttachment()`、`createImagePreview()` 现有压缩逻辑应保留，避免一次 9 图造成请求过大。
- 对话历史附件类型来自 `apps/web/src/copilot/useConversation.ts` 的 `ConversationImageAttachment`，可直接适配网格组件。
- `packages/shared/src/index.ts` 已有 `thumbnailDataUrl`、`width`、`height` 可选字段，本次无需强制修改类型。
- `apps/web/src/pages/LibraryPage.tsx` 需要确认是否挂载 `LightboxRoot`；如果历史图点击依赖 Lightbox，需补齐挂载，保持与 `ProjectWorkspacePage.tsx` 一致。
- 样式优先使用 Tailwind utility，不新增零散全局 CSS。
- 若执行 Web build，`apps/web/dist/index.html` 可能作为构建产物更新。

## Architecture Design

当前链路：

```mermaid
flowchart TD
  A[用户选择/拖拽/粘贴图片] --> B[CopilotDrawer pendingImages]
  B --> C[readImageAttachment 压缩预览]
  C --> D[Composer 待发送附件]
  D --> E[handleSend]
  E --> F[conversation history 缩略图]
  E --> G[/copilot/chat JSON]
  G --> H[后端 Zod 校验]
  H --> I[buildLatestUserMessage 拼入图片]
  I --> J[Kimi 生成项目草稿]
```

调整后：

- `MAX_IMAGE_ATTACHMENTS`：前端和后端统一为 9。
- `ImageAttachmentGrid`：统一渲染 composer 待发送附件和 message 历史附件。
- `LightboxRoot`：确保所有挂载 Copilot 的页面都能点击预览图片。
- 原有发送、压缩、校验、项目草稿协议保持不变。

## Directory Structure

```text
BusinessModelCanvas/
├── apps/
│   ├── web/
│   │   └── src/
│   │       ├── components/
│   │       │   ├── CopilotDrawer.tsx
│   │       │   │   # [MODIFY] 图片附件主流程。
│   │       │   │   # 将 MAX_IMAGE_ATTACHMENTS 从 2 调整为 9；
│   │       │   │   # 优化 handleAddImageFiles 的数量提示；
│   │       │   │   # 接入附件九宫格组件；
│   │       │   │   # 保持发送、压缩和项目草稿流程不变。
│   │       │   ├── CopilotImageAttachmentGrid.tsx
│   │       │   │   # [NEW] 图片附件网格组件。
│   │       │   │   # 统一展示 1-9 张图片；
│   │       │   │   # 支持 composer/message 两种展示模式；
│   │       │   │   # composer 模式支持删除；
│   │       │   │   # message 模式支持点击预览。
│   │       │   └── Lightbox.tsx
│   │       │       # [AFFECTED] 复用现有 Lightbox 能力。
│   │       │       # 如接口已满足需求则不改，仅确认点击缩略图可打开预览。
│   │       ├── pages/
│   │       │   └── LibraryPage.tsx
│   │       │       # [MODIFY IF NEEDED] 如果该页面未挂载 LightboxRoot，
│   │       │       # 补齐挂载，确保策略库 Copilot 历史图片也可预览。
│   │       └── i18n/
│   │           ├── zh.json
│   │           │   # [MODIFY] 更新图片数量、剩余数量、附件提示等中文文案。
│   │           └── en.json
│   │               # [MODIFY] 同步英文文案。
│   └── server/
│       └── src/
│           └── http/
│               └── copilot.ts
│                   # [MODIFY] 将后端 MAX_IMAGE_ATTACHMENTS 从 2 调整为 9；
│                   # 保持 MIME、单张大小、data URL 校验逻辑不变。
└── packages/
    └── shared/
        └── src/
            └── index.ts
                # [AFFECTED] 现有 CopilotImageAttachment 类型已足够；
                # 仅在实现中发现类型缺口时再做最小修改。
```

## Key Code Structures

```ts
type ImageAttachmentGridVariant = 'composer' | 'message';

interface ImageAttachmentGridItem {
  id: string;
  name: string;
  previewDataUrl: string;
  mimeType?: string;
  sizeBytes?: number;
}

interface ImageAttachmentGridProps {
  images: ImageAttachmentGridItem[];
  variant: ImageAttachmentGridVariant;
  maxImages?: number;
  onRemove?: (id: string) => void;
  onPreview?: (image: ImageAttachmentGridItem, index: number) => void;
}
```

## Design Approach

采用轻量、紧凑、资料板式的附件展示体验，不改变 Copilot 抽屉整体视觉风格。图片附件区域要像“资料托盘”，让用户在发送前快速确认图片数量、顺序和内容；发送后在对话气泡中以九宫格展示，减少多图造成的纵向空间占用。

## 页面与组件规划

### 1. Composer 待发送附件区

- 位于输入框上方或附近，作为发送前的资料预览条。
- 显示“已添加 x/9 张”，并提示支持拖拽、粘贴、点击上传。
- 多图使用网格展示，每张图右上角提供删除按钮。
- 图片下方可显示截断文件名，避免长文件名撑开布局。

### 2. 对话历史附件区

- 出现在用户消息气泡内部、正文下方或上方。
- 1 张图展示为较大的圆角缩略图。
- 2-4 张图使用两列网格。
- 5-9 张图使用三列九宫格。
- 点击缩略图进入现有 Lightbox 预览。

### 3. 添加附件按钮

- 保持现有“+ 图片”入口，但增强状态反馈。
- 未添加时显示轻量提示；已添加后显示剩余数量。
- 达到 9 张后按钮置灰或点击提示“最多 9 张”。

### 4. 错误与边界

- 超过 9 张时只加入可容纳的图片，并提示上限。
- 不支持格式和超过单张大小时沿用现有错误区域提示。
- 缩略图加载失败时显示文件名占位块。

## Agent Extensions

### SubAgent

- **code-explorer**
- Purpose: 继续复核 Copilot 图片附件的前端、后端、对话历史和 Lightbox 挂载链路。
- Expected outcome: 确认数量限制、缩略图渲染、发送 payload、页面挂载点没有遗漏。

### Skill

- **css-architecture**
- Purpose: 指导附件九宫格组件的样式组织，优先使用现有 Tailwind utility 和组件内聚结构。
- Expected outcome: 新增图片网格展示清晰、紧凑、可复用，不引入零散全局样式。