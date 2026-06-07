---
name: story-historical-canvas-redesign
overview: 为 PinGarden 引入项目级 Story 概念，支持 Markdown 叙事、嵌入项目内可交互 Canvas、历史内容时间与录入时间双时间字段，并重绘/纳入“微信私域项目 2023 年 12 月规划”完整案例。
design:
  architecture:
    framework: react
  styleKeywords:
    - Editorial Workspace
    - Morandi Palette
    - Interactive Canvas Cards
    - Calm Productivity
    - Premium Case Study
  fontSystem:
    fontFamily: PingFang SC
    heading:
      size: 30px
      weight: 700
    subheading:
      size: 18px
      weight: 600
    body:
      size: 15px
      weight: 400
  colorSystem:
    primary:
      - "#2A6B6B"
      - "#B8D4D0"
      - "#E8B84A"
    background:
      - "#FAF8F3"
      - "#FFFFFF"
      - "#F3F0EA"
    text:
      - "#1F2937"
      - "#4B5563"
      - "#9CA3AF"
    functional:
      - "#16A34A"
      - "#DC2626"
      - "#D97706"
      - "#2563EB"
todos:
  - id: explore-story-chain
    content: 使用 [subagent:code-explorer] 复核 Story 调用链
    status: completed
  - id: add-story-storage-api
    content: 扩展共享类型、存储接口、Story API
    status: completed
    dependencies:
      - explore-story-chain
  - id: add-story-workspace
    content: 实现 Story 路由、侧栏、编辑阅读器
    status: completed
    dependencies:
      - add-story-storage-api
  - id: polish-story-ui
    content: 使用 [skill:design-system-patterns] 与 [skill:premium-frontend-design] 打磨界面
    status: completed
    dependencies:
      - add-story-workspace
  - id: rebuild-historical-canvases
    content: 新增历史画布模板并重绘四张画布
    status: completed
    dependencies:
      - add-story-storage-api
  - id: seed-case-story
    content: 写入《2023年12月规划》案例并验证
    status: completed
    dependencies:
      - add-story-workspace
      - rebuild-historical-canvases
---

## User Requirements

- 在每个项目下新增 Story，用来把文字叙事与多个项目内 Canvas 串成完整案例分析。
- Story 需要支持编辑状态与阅读状态，能够在文章中插入项目内已有 Canvas。
- 历史补录内容需要区分两个时间：内容/业务发生时间与系统创建/录入时间。
- 用户已确认历史内容采用双时间字段；第一篇 Story 的内容时间为 2023 年 12 月，系统录入时间按实际创建时间记录。
- 用户已确认历史截图不只作为图片保存，而是要重绘成系统内可编辑 Canvas，再嵌入 Story。
- Story 中嵌入的 Canvas 默认需要可交互，支持放大、查看便签，而不是仅展示静态图片。
- 需要完成第一篇《2023 年 12 月规划》案例正文，并把提供的四张历史图纳入叙事。

## Product Overview

Story 是项目级的案例文章载体，用于解释 Canvas 背后的业务判断、时间线、关键假设、验证结果与复盘结论。它让一个项目不再只是画布集合，而是可以形成从背景、设计、验证到结论的完整故事。

## Core Features

- 项目侧栏新增 Story 分区，可创建、打开、删除故事。
- Story 支持文章编辑与阅读展示两种状态。
- Story 文章内可插入本项目 Canvas，并以可缩放、可查看细节的交互画布呈现。
- Canvas 与 Story 均支持内容时间和录入时间分离，适配历史补录。
- 将“微信私域项目 2023 年 12 月规划”重绘为可编辑画布组合，并生成完整案例文章。

## Tech Stack Selection

- 继续复用当前项目技术栈：React 18、TypeScript、Vite、Tailwind CSS、Fastify、Yjs、Zod、pnpm workspace。
- Story 正文采用 Markdown 文本存储，前端使用现有 `react-markdown` 渲染普通段落。
- Canvas 嵌入不引入 MDX 或大型富文本编辑器，先采用轻量自定义 directive 解析，降低实现风险和依赖复杂度。
- 交互式嵌入画布复用现有 `CanvasRenderer`、`StickyLayer`、`PinLayer`、Yjs 状态读取能力，但新增只读加载路径，避免 Story 阅读时误触发保存。

## Implementation Approach

本次改造分为三条主线：项目级 Story 数据模型与 API、前端 Story 编辑/阅读体验、历史案例画布重绘与种子化内容。Markdown 作为 Story 的源格式，Canvas 通过自定义块语法引用同项目画布，例如：

```markdown
::canvas[business-model-canvas]{canvasId="..." title="商业模式画布"}
```

关键决策：

- 使用 `contentDate` 表示内容发生时间，如 `2023-12`；继续保留 `createdAt`、`updatedAt` 表示系统录入和修改时间。
- `CanvasMeta` 增加可选历史时间字段，保证现有画布完全兼容。
- Story 内容存储为 `meta.json + content.md`，与当前 `canvas/meta.json + live.ydoc` 的文件组织方式一致。
- Story API 必须经过 `CanvasStorage`，HTTP handler 不直接读写文件，遵守现有架构缝合点。
- Story 阅读页中的嵌入 Canvas 为只读交互：允许缩放、平移、查看内容，不允许拖拽编辑或自动 PUT 回写。
- 先实现源码 Markdown 编辑器加阅读预览，不引入 TipTap；后续若需要 Notion 式编辑器，可在不改变存储格式的情况下替换编辑层。

## Implementation Notes

- 后端路由注册需同步更新 `apps/server/src/server.ts` 的 production SPA fallback API 前缀，新增 `/stories`。
- Story 内容更新使用防抖保存和显式保存，避免每个输入字符都触发 API 请求。
- Story renderer 解析复杂度为 O(n)，按正文长度线性扫描；渲染结果用 `useMemo` 缓存。
- 多个嵌入 Canvas 会加载多个 Yjs 文档；优先实现只读 hook，必要时使用懒加载或展开后加载，避免大 Story 首屏并发过多请求。
- Canvas directive 必须校验 `canvasId` 属于当前项目，防止跨项目引用造成信息泄露或坏链接。
- 新增 UI 字符串全部进入 `apps/web/src/i18n/{zh,en}.json`，避免硬编码。
- 保持现有 Canvas 路由、画布编辑、历史版本逻辑不变，避免无关重构。
- 执行完成后运行 `pnpm typecheck` 与 `pnpm --filter @pingarden/web build`。

## Architecture Design

当前结构为 `Project -> Canvas[]`。新增后扩展为：

- `Project -> Canvas[]`
- `Project -> Story[]`
- `Story.content` 通过 Markdown directive 引用同项目 Canvas
- `EmbeddedCanvas` 只读读取 Canvas Yjs 状态并复用画布渲染组件

数据流：

1. 用户打开项目。
2. 前端同时加载项目、Canvas 列表、Story 列表。
3. 点击 Story 后进入 `/p/:projectId/s/:storyId`。
4. 编辑态写入 Markdown 内容；阅读态解析 Markdown 与 Canvas directive。
5. Canvas directive 中的 `canvasId` 映射到项目内画布元数据，渲染为交互式只读画布。

## Directory Structure Summary

本实现会新增 Story 数据链路、Story 前端模块、历史画布模板，以及一次性案例种子脚本。

```text
/Users/siboli/Documents/商业/BusinessModelCanvas/
├── packages/shared/src/index.ts
│   # [MODIFY] 新增 StoryMeta、Story、CreateStoryInput、UpdateStoryInput、ContentDatePrecision、
│   # StoryCanvasDirective 类型；CanvasMeta/CreateCanvasInput/UpdateCanvasInput 增加可选 contentDate 字段；
│   # 增加无依赖的 canvas directive 解析辅助函数。
│
├── apps/server/src/storage/CanvasStorage.ts
│   # [MODIFY] 扩展 Story CRUD：listStories/getStory/createStory/updateStory/deleteStory；
│   # deleteProject 需要级联删除项目下 stories。
│
├── apps/server/src/storage/FileSystemStorage.ts
│   # [MODIFY] 新增 stories 目录读写；Story 使用 meta.json + content.md；
│   # 项目删除时同步删除 stories；CanvasMeta 新字段保持向后兼容。
│
├── apps/server/src/http/stories.ts
│   # [NEW] Story REST 路由；包含列表、详情、创建、更新、删除；
│   # 使用 Zod 校验时间字段、正文长度、canvas directive 的项目归属。
│
├── apps/server/src/http/canvases.ts
│   # [MODIFY] CreateInput/UpdateInput 支持 contentDate、contentDatePrecision、contentDateLabel；
│   # 更新 CanvasMeta 时保留 createdAt/createdBy，只更新 updatedAt/updatedBy。
│
├── apps/server/src/http/projects.ts
│   # [MODIFY] 新增 GET /projects/:id/stories；
│   # 项目删除提示逻辑可继续由前端补充 Story 数量。
│
├── apps/server/src/server.ts
│   # [MODIFY] 注册 registerStoryRoutes；
│   # production SPA fallback 增加 /stories API 前缀。
│
├── apps/web/src/api/stories.ts
│   # [NEW] Story API client，封装 list/get/create/update/delete。
│
├── apps/web/src/api/client.ts
│   # [MODIFY] Canvas create/update 类型自然接收共享类型新增字段；
│   # 如需要，补充通用 fetch helper 复用。
│
├── apps/web/src/App.tsx
│   # [MODIFY] 新增 /p/:projectId/s/:storyId 路由，仍复用 ProjectWorkspacePage 外壳。
│
├── apps/web/src/pages/ProjectWorkspacePage.tsx
│   # [MODIFY] 加载 stories；识别 canvasId/storyId 激活对象；
│   # Canvas 激活时渲染现有画布工作区，Story 激活时渲染 StoryWorkspace。
│
├── apps/web/src/workspace/ProjectSidebar.tsx
│   # [MODIFY] 新增 Stories 分区、创建 Story 入口、删除 Story 菜单；
│   # 折叠态增加 Story 图标入口；所有标签走 i18n。
│
├── apps/web/src/story/storyDirectives.ts
│   # [NEW] 前端 Story Markdown 分块解析与属性解析；
│   # 输出 markdown block 与 canvas block，处理非法 directive 的降级展示。
│
├── apps/web/src/story/StoryWorkspace.tsx
│   # [NEW] Story 页面容器；管理编辑/阅读切换、标题、内容时间、保存状态、插入 Canvas 行为。
│
├── apps/web/src/story/StoryEditor.tsx
│   # [NEW] Markdown 源码编辑器；提供插入 Canvas 的项目内画布选择器。
│
├── apps/web/src/story/StoryRenderer.tsx
│   # [NEW] 阅读态渲染器；普通 Markdown 使用 react-markdown；
│   # canvas directive 渲染 EmbeddedCanvas。
│
├── apps/web/src/story/EmbeddedCanvas.tsx
│   # [NEW] Story 内交互画布卡片；只读加载 Yjs 状态；
│   # 支持缩放、平移、标题、跳转到原画布。
│
├── apps/web/src/collab/useReadOnlyYDoc.ts
│   # [NEW] 只读 Yjs 加载 hook；只 GET state，不订阅保存，不在 unmount 时 PUT。
│
├── apps/web/src/canvas/Sticky.tsx
│   # [MODIFY] 增加 readonly/displayMode 支持；只读时禁用拖拽、缩放、双击编辑。
│
├── apps/web/src/canvas/StickyLayer.tsx
│   # [MODIFY] 增加 readonly 参数；Story 嵌入时只允许选择/查看，不写入 Yjs。
│
├── apps/web/src/canvas/PinLayer.tsx
│   # [MODIFY] 增加 readonly 参数；Story 嵌入时禁用拖拽更新。
│
├── apps/web/src/i18n/zh.json
│   # [MODIFY] 新增 Story、时间字段、保存状态、插入 Canvas、删除确认等中文文案。
│
├── apps/web/src/i18n/en.json
│   # [MODIFY] 新增对应英文文案，保持 EN/中文切换可用。
│
├── packages/canvases/learning-test-card/
│   ├── manifest.json
│   ├── bg.en.svg
│   ├── bg.zh.svg
│   └── i18n/{en,zh}.json
│   # [NEW] 用于重绘 Learning Test Card，贴合截图中的假设、方法、数据、标准、结果、结论、下一步结构。
│
├── packages/canvases/value-design-canvas/
│   ├── manifest.json
│   ├── bg.en.svg
│   ├── bg.zh.svg
│   └── i18n/{en,zh}.json
│   # [NEW] 用于重绘 Value Design Canvas，保留“提供给客户的价值”和“客户目标/任务/痛点/收益”结构。
│
└── tools/seed-wechat-private-domain-story.mjs
    # [NEW] 一次性种子脚本；创建或复用“微信私域项目”；
    # 创建四张历史画布，写入截图内容对应便签；
    # 创建《2023 年 12 月规划》Story 并插入 canvas directive。
```

## Key Code Structures

```ts
export type ContentDatePrecision = 'year' | 'month' | 'day';

export interface StoryMeta {
  id: string;
  projectId: string;
  title: string;
  status: 'draft' | 'published';
  contentDate?: string;
  contentDatePrecision?: ContentDatePrecision;
  contentDateLabel?: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface Story extends StoryMeta {
  content: string;
}

export interface StoryCanvasDirective {
  canvasId: string;
  defId?: string;
  title?: string;
}
```

## Historical Case Reconstruction

需要重绘并嵌入四张 Canvas：

1. Learning Test Card：表达“游戏业务愿意并能够通过社群扩大商业化额外收益”的假设、AB Test、多期实验、19% 增量收入和下一步。
2. Business Model Canvas：表达合作伙伴、关键活动、资源、价值主张、客户关系、渠道、客户细分、成本和收入。
3. Design Criteria Canvas：表达客户长期价值、竞争力与 ROI、真诚积极三类原则，以及 Must/Should/Could/Won’t。
4. Value Design Canvas：表达效果驱动、长期陪伴、成本优先，客户目标、任务、痛点、收益和产品服务承载。

第一篇 Story 结构建议：

- 时代背景：2019 企微开放、2021 看到机会、2022 腾讯内部启动。
- 问题识别：老板驱动、群运营导向、人力成本高、价值难度量。
- 战略转向：从平台销售转为效果驱动服务和前三到六个月信心陪伴。
- 商业模式：业务主体承担成本并获取最大收益，钱权利一致。
- 价值设计：iOS 渠道费、用户回流、商业化潜力、完整 ROI。
- 设计准则：客户长期价值、竞争力与 ROI、真诚积极。
- 学习验证：多期实验有效、活动 B 增量收入 19%。
- 2026 回看：2023 年底判断仍然 solid，新情况后续追加章节。

## Design Approach

这是一个桌面端项目工作台改造，Story 页面应像“案例写作台 + 画布展览页”的结合体。

### 页面规划

1. 项目工作区侧栏：保留项目、Canvas 列表，新增 Story 列表。
2. Story 编辑页：顶部为标题、内容时间、编辑/阅读切换；主体为 Markdown 编辑区和插入 Canvas 操作。
3. Story 阅读页：采用文章排版，Canvas 以大型交互卡片嵌入，支持缩放和平移。
4. 嵌入画布卡片：顶部显示画布标题、内容时间、打开原画布按钮；中间为可交互画布。

### Visual Effect

整体使用温和、克制的知识管理风格。侧栏保持当前工具感，Story 阅读区使用更强的文章感：宽松行距、白色纸张卡片、柔和阴影和莫兰迪色点缀。Canvas 嵌入卡片要像案例报告中的“证据板”，既能阅读上下文，也能进入画布细节。

## Agent Extensions

### SubAgent

- **code-explorer**
- Purpose: 在实施前复核 Story、Canvas、Storage、路由、i18n、Yjs 渲染链路，避免遗漏调用点。
- Expected outcome: 明确所有需要修改的文件、兼容点和回归验证范围。

### Skill

- **design-system-patterns**
- Purpose: 统一 Story 编辑/阅读页的布局、颜色、间距、状态样式，避免新增界面与现有工作区割裂。
- Expected outcome: Story UI 与现有 PinGarden 工作台保持一致，同时具备更好的案例阅读体验。

- **premium-frontend-design**
- Purpose: 打磨 Story 阅读态和交互式 Canvas 卡片，使案例文章具有高级、清晰、可信的呈现效果。
- Expected outcome: 完成具备文章感、证据感和交互感的 Story 页面，而不是普通表单页面。