---
name: copilot-canvas-panel-entry
overview: 为 Copilot 建议中的画布推荐/业务组合地图补充可直接打开的画布面板入口，避免只给用户 ID。
todos:
  - id: explore-copilot-canvas-flow
    content: 使用 [subagent:code-explorer] 核对 Copilot 画布引用和面板打开链路
    status: pending
  - id: extend-canvas-reference-resolution
    content: 扩展 CopilotCanvasReferenceBoard 解析 defId 和中英文画布名
    status: pending
    dependencies:
      - explore-copilot-canvas-flow
  - id: wire-context-aware-lookup
    content: 在 CopilotDrawer 传入上下文并按项目解析真实画布
    status: pending
    dependencies:
      - extend-canvas-reference-resolution
  - id: add-open-panel-feedback
    content: 补充打开画布面板和未找到画布的中英文提示
    status: pending
    dependencies:
      - wire-context-aware-lookup
  - id: verify-copilot-canvas-entry
    content: 验证 Portfolio Map 入口、预览、详情跳转和构建检查
    status: pending
    dependencies:
      - add-open-panel-feedback
---

## User Requirements

- Copilot 在回答中建议打开“业务组合地图 / Portfolio Map”等画布时，不能只展示 `portfolio-map` 这类画布类型 ID。
- 用户需要在 Copilot 面板内直接看到可点击入口，用来打开对应画布看板或画布面板。
- 入口应出现在当前回答附近，便于从“下一步建议”直接进入画布，而不是让用户自己查找或复制 ID。
- 已有“相关画布看板”的预览和查看详情能力应继续复用，并扩展到“画布类型/画布名称推荐”场景。

## Product Overview

Copilot 回答中的画布推荐会自动转成可操作的画布入口。用户看到“打开业务组合地图”时，可以直接点击预览或进入该画布所在项目，不再依赖不可用的画布 ID。

## Core Features

- 自动识别 Copilot 回复中的画布类型引用，例如 `portfolio-map`、业务组合地图、Portfolio Map、`three-horizons-map`。
- 在当前项目或当前案例上下文中查找匹配的真实画布。
- 将匹配结果展示为“相关画布看板”卡片，支持预览和查看详情。
- 点击查看详情进入画布所在项目和画布页面；必要时同步展示画布面板。
- 若找不到对应画布，显示清晰提示，避免只留下无意义 ID。

## Tech Stack Selection

- 复用现有前端栈：React、TypeScript、Vite、Tailwind CSS。
- 复用现有 API 客户端：
- `apps/web/src/api/client.ts`
- `apps/web/src/api/projects.ts`
- 复用现有 Copilot 消息渲染和画布引用组件：
- `apps/web/src/components/CopilotDrawer.tsx`
- `apps/web/src/components/CopilotCanvasReferenceBoard.tsx`
- 复用现有路由：`/p/:projectId/c/:canvasId`。

## Implementation Approach

当前问题的根因是 `CopilotCanvasReferenceBoard` 只解析 UUID，而截图里的回答只包含画布类型 ID `portfolio-map`，所以无法生成可打开入口。方案是扩展画布引用解析能力：除了 UUID，还从助手回答中识别画布定义 ID 和中英文画布名称，并结合当前 `attachedRef` 上下文解析到真实 `CanvasMeta`，再交给已有的“相关画布看板”组件渲染。

关键决策：

- 不让 AI 文本承担导航职责，而是在 UI 层把“画布类型推荐”解析成真实画布入口。
- 优先在当前上下文查找：

1. 当前项目或当前案例项目内的画布；
2. 当前画布所属项目内的其他画布；
3. 无明确项目时再降级到当前用户可见画布列表。

- 多个匹配时按当前项目优先、标题/类型匹配优先展示，避免误导。
- 继续复用 `CopilotCanvasReferenceBoard` 的预览、详情跳转和 popover，减少重复 UI。
- 对找不到真实画布的推荐显示轻量提示，不展示裸 ID 作为主要操作入口。

## Implementation Notes

- 避免每条消息反复全量请求：在 hook 内用 `useMemo` 提取引用 key，并只在内容、身份、语言、上下文变化时加载。
- UUID 解析逻辑保留，新增 defId/name 解析不应影响已有 UUID 看板。
- `attachedRef` 需要传入消息组件，使解析器知道当前项目或案例上下文。
- 对库案例 `projectSource === 'library'` 的只读项目，只提供打开/预览，不提供创建入口。
- 对用户自有项目中找不到对应画布的情况，可显示“未找到这张画布”，后续再接入“创建画布”流程，避免本次扩大写入范围。
- i18n 文案必须同时更新 `zh.json` 和 `en.json`，避免硬编码中文。
- 变更完成后运行 `pnpm typecheck` 和 `pnpm --filter @pingarden/web build`。

## Architecture Design

本次不引入新架构，只扩展 Copilot 消息渲染链路：

- `CopilotDrawer`
- 将 `attachedRef` 继续向下传给 `ChatPane` 和 `MessageBubble`。
- 助手消息渲染时调用增强后的画布引用解析 hook。
- `CopilotCanvasReferenceBoard`
- 保持展示组件职责。
- 新增或扩展 hook：从文本中解析 UUID、画布 defId、画布中英文名称。
- 通过 `api.listCanvases` / `projectsApi.listCanvases` / `api.getDef` 将引用解析成 `CanvasMeta + defName`。
- `ProjectWorkspacePage`
- 如需“查看详情后自动打开画布面板”，在传入 Copilot 的导航回调中设置右侧 Inspector 为展开和画布信息 tab。
- 保持现有 `/p/:projectId/c/:canvasId` 路由为唯一详情入口。

## Directory Structure

```
BusinessModelCanvas/
├── apps/web/src/components/
│   ├── CopilotDrawer.tsx
│   │   # [MODIFY] 传递 attachedRef 到消息渲染层；在点击画布详情时关闭 Copilot，并可联动右侧画布面板展开。
│   │   # 需要保持现有建议操作、项目草稿卡、UUID 画布引用逻辑不回退。
│   └── CopilotCanvasReferenceBoard.tsx
│       # [MODIFY] 扩展画布引用解析：支持 UUID、defId、中文名、英文名；按当前上下文解析真实画布。
│       # 复用现有卡片、预览 popover、查看详情跳转 UI；增加未匹配提示的轻量展示。
├── apps/web/src/pages/
│   └── ProjectWorkspacePage.tsx
│       # [MODIFY] 如需要从 Copilot 跳转后展示“画布面板”，在 onNavigateToCanvas 回调中展开右侧 Inspector 并选中画布信息 tab。
├── apps/web/src/i18n/
│   ├── zh.json
│   │   # [MODIFY] 新增画布类型解析、未找到画布、打开画布面板等中文文案。
│   └── en.json
│       # [MODIFY] 新增对应英文文案，保持中英文体验一致。
└── apps/web/src/api/
    ├── client.ts
    │   # [AFFECTED] 复用 listCanvases/getDef/getCanvas，不优先修改。
    └── projects.ts
        # [AFFECTED] 复用 listCanvases，不优先修改。
```

## Key Code Structures

建议以文本描述为主，避免新增复杂接口。核心数据仍沿用现有：

- `CanvasMeta`
- `CopilotCanvasReference`
- `AttachedRef`

如实现时需要新增内部类型，可限制在 `CopilotCanvasReferenceBoard.tsx` 内部，例如“解析出的候选引用”，不导出公共 API。

## Agent Extensions

### SubAgent

- **code-explorer**
- Purpose: 进一步核对 Copilot 消息渲染、画布解析、项目路由和右侧 Inspector 联动的实际代码路径。
- Expected outcome: 确认最小修改点，避免改动无关页面或破坏已有 UUID 画布看板能力。