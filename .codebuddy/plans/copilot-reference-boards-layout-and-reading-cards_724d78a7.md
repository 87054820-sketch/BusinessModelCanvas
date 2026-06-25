---
name: copilot-reference-boards-layout-and-reading-cards
overview: 优化 Copilot 回复中的推荐案例入口、相关画布看板和新增参考阅读卡片：抽屉窄屏保持单列，全屏时自动分栏，并为书籍/资料推荐提供卡片与预览 popover。
design:
  architecture:
    framework: react
  styleKeywords:
    - 响应式看板
    - 紧凑卡片
    - 多列布局
    - 轻量预览
    - 统一推荐入口
  fontSystem:
    fontFamily: PingFang SC
    heading:
      size: 14px
      weight: 700
    subheading:
      size: 12px
      weight: 600
    body:
      size: 11px
      weight: 400
  colorSystem:
    primary:
      - "#4F46E5"
      - "#059669"
      - "#D97706"
    background:
      - "#FFFFFF"
      - "#F8FAFC"
      - "#FFF7ED"
    text:
      - "#111827"
      - "#4B5563"
      - "#6B7280"
    functional:
      - "#10B981"
      - "#EF4444"
      - "#F59E0B"
      - "#6366F1"
todos:
  - id: responsive-reference-grid
    content: 使用 [skill:css-architecture] 统一案例和画布推荐区响应式分栏布局
    status: completed
  - id: extract-resource-refs
    content: 扩展 Copilot 引用解析，识别资源 slug 和标题
    status: completed
    dependencies:
      - responsive-reference-grid
  - id: render-reading-board
    content: 新增参考阅读卡片区和资源预览 Popover
    status: completed
    dependencies:
      - extract-resource-refs
  - id: update-reading-i18n
    content: 补充中英文参考阅读文案
    status: completed
    dependencies:
      - render-reading-board
  - id: verify-reference-ui
    content: 运行类型检查和 Web 构建验证
    status: completed
    dependencies:
      - update-reading-i18n
---

## User Requirements

- Copilot 回复中的“推荐案例入口”“相关画布看板”等卡片，在右侧窄抽屉中保持当前自上而下的单列布局。
- 当 Copilot 切换到全屏或宽屏展示时，这些卡片区域需要改为分栏布局，避免单列卡片过长、视觉过散。
- 分栏数量可根据宽度自适应，两栏或三栏都可以；优先保证信息密度和阅读舒适度。
- 新增“参考阅读”卡片区，用来展示 Copilot 回复中推荐的书籍、文章、报告或资源。
- 每个参考阅读卡片需要展示资源名称、类型、简短说明，并支持点击预览。
- 参考阅读预览使用 popover 或弹层，展示快速介绍、推荐理由、相关案例/画布和来源信息。

## Product Overview

Copilot 回复区将从单纯的纵向列表升级为响应式信息看板：窄屏保持单列，宽屏自动分栏；同时新增参考阅读卡片，让案例、画布和阅读资源形成统一的推荐入口。

## Core Features

- 推荐案例入口宽屏分栏展示。
- 相关画布看板宽屏分栏展示。
- 新增参考阅读推荐卡片。
- 参考阅读支持快速预览弹层。
- 窄屏仍保持单列布局。

## Tech Stack Selection

- 复用现有技术栈：React、TypeScript、Tailwind CSS、Vite。
- 复用现有 Copilot 推荐引用解析结构：
- `apps/web/src/components/CopilotCanvasReferenceBoard.tsx`
- `apps/web/src/components/CopilotDrawer.tsx`
- 复用现有资源库 API：
- `apps/web/src/api/library.ts`
- `libraryApi.listResources()`
- `libraryApi.getResource(slug)`
- 复用现有共享类型：
- `LibraryResource`
- `LibraryResourceDetail`
- 复用服务端已有资源接口：
- `/library/resources`
- `/library/resources/:slug`

## Implementation Approach

先将案例、画布、参考阅读三类推荐区统一成响应式卡片看板：窄容器单列，宽容器两栏，超宽容器三栏。随后扩展 `useCopilotRecommendationReferences`，在已有 case slug 和 canvas 引用解析之外，增加 resource slug 与资源标题识别，产出 `resourceRefs` 并在 `MessageBubble` 中渲染新的 `CopilotResourceReferenceBoard`。

关键决策：

- 使用 CSS Grid 响应式布局，不额外依赖全屏状态，减少状态传递和耦合。
- 案例/画布卡片保留当前交互，只调整列表容器和卡片密度。
- 参考阅读基于现有 `packages/case-library/resources` 数据，不新建数据源。
- 资源识别优先匹配 slug，其次匹配当前语言标题，避免仅依赖 LLM 输出格式。
- 资源详情使用按需加载：卡片列表只用 `listResources` 的轻量数据，打开预览时再调用 `getResource`。
- 资源详情结果可使用组件内 Map 缓存，避免重复打开同一资源时多次请求。
- 不改 Copilot 发送流程、不改 Kimi 流程、不改项目/画布/故事核心数据结构。

## Implementation Notes

- `MAX_CANVAS_REFERENCES` 保持当前 4 个；`MAX_CASE_REFERENCES` 保持当前 8 个；新增 `MAX_RESOURCE_REFERENCES` 建议设为 6 或 8。
- `extractKebabTokens` 已可识别 kebab-case slug，可复用匹配 resource slug。
- 资源标题匹配需要按当前语言读取 `resource.title[lang]`，英文可同时兼容 `title.en`。
- 分栏只影响推荐卡片内部布局，不影响 Copilot 普通 Markdown 内容。
- Popover 复用 `CanvasReferencePopover` 的轻量弹层风格，但不渲染复杂画布，只渲染资源文本信息。
- 资源来源链接如存在 `sources[].url`，使用外链打开；无链接则仅展示来源 label。
- 修改后运行 `pnpm typecheck` 和 `pnpm --filter @pingarden/web build`。
- 如需要发版，再执行 `pnpm dist`。

## Architecture Design

当前数据流：

Copilot 回复文本 → `useCopilotRecommendationReferences` 解析引用 → `MessageBubble` 渲染 Markdown 与推荐看板 → 用户点击卡片进入案例/预览画布。

目标数据流：

Copilot 回复文本 → 解析案例、画布、资源三类引用 → 分别渲染案例看板、画布看板、参考阅读看板 → 资源卡片按需加载详情弹层。

## Directory Structure

```text
BusinessModelCanvas/
├── apps/web/src/components/
│   ├── CopilotDrawer.tsx
│   │   # [MODIFY] 在 MessageBubble 中接入 resourceRefs，渲染新的参考阅读看板。
│   │   # 保持现有 Markdown、案例、画布渲染顺序，可将参考阅读放在案例/画布之后。
│   │
│   └── CopilotCanvasReferenceBoard.tsx
│       # [MODIFY] 扩展 useCopilotRecommendationReferences 返回 resourceRefs。
│       # 为案例/画布列表增加响应式 grid 容器。
│       # 新增 CopilotResourceReferenceBoard 与 ResourceReferencePopover。
│       # 复用 libraryApi.listResources/getResource 识别和预览资源。
│
├── apps/web/src/api/
│   └── library.ts
│       # [AFFECTED] 已存在 listResources/getResource，优先复用。
│       # 如需要缓存或类型补充，只做最小改动。
│
├── apps/web/src/i18n/
│   ├── zh.json
│   │   # [MODIFY] 新增 library.copilot.readingRefs 文案，包括标题、副标题、预览、关闭、来源、相关案例等。
│   └── en.json
│       # [MODIFY] 同步英文文案。
│
└── packages/shared/src/
    └── index.ts
        # [AFFECTED] 已存在 LibraryResource/LibraryResourceDetail 类型，原则上无需修改。
```

## Key Code Structures

建议新增或扩展的关键类型：

```ts
interface CopilotResourceReference {
  resource: LibraryResource;
}

interface CopilotRecommendationReferences {
  canvasRefs: CopilotCanvasReference[];
  caseRefs: CopilotCaseReference[];
  resourceRefs: CopilotResourceReference[];
  unresolvedCaseSlugs: string[];
  unresolvedCanvasLabels: string[];
}
```

## Design Approach

采用“响应式信息看板”设计。右侧窄抽屉保持当前单列卡片，阅读流线稳定；全屏状态下卡片区域自动变成两栏或三栏，减少纵向空白和视觉松散。

## Layout

- 推荐区整体保持卡片容器：标题区、说明区、内容区。
- 内容区使用响应式 Grid：
- 窄屏：1 列。
- 中宽：2 列。
- 超宽：3 列。
- 单张卡片使用紧凑横向结构：左侧标题与元信息，右侧操作按钮。
- 参考阅读卡片与案例卡片同密度，但用暖色或琥珀色体系区分。

## Reference Reading Popover

- 弹层顶部展示资源标题、类型、年份。
- 主体展示摘要、推荐理由、长描述摘要。
- 底部展示来源链接、相关案例入口。
- 弹层尺寸轻量，不占满全屏，适合快速扫读。

## Agent Extensions

### Skill

- **css-architecture**
- Purpose: 设计响应式卡片看板布局，保证窄屏单列、宽屏多列时样式结构清晰可维护。
- Expected outcome: 推荐区布局使用统一 grid/card 规范，避免为案例、画布、资源分别写重复样式。