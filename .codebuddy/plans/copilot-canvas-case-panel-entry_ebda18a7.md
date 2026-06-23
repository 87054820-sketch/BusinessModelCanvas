---
name: copilot-canvas-case-panel-entry
overview: 扩展 Copilot 推荐结果的可点击入口：既支持画布/业务组合地图，也支持案例 slug 和案例画布入口。
todos:
  - id: explore-recommendation-reference-flow
    content: 使用 [subagent:code-explorer] 核对 Copilot 案例和画布引用链路
    status: completed
  - id: resolve-case-and-canvas-references
    content: 扩展 CopilotCanvasReferenceBoard 解析案例 slug、defId 和中英文画布名
    status: completed
    dependencies:
      - explore-recommendation-reference-flow
  - id: render-recommended-case-entry
    content: 新增推荐案例卡片，支持查看案例和查看案例画布
    status: completed
    dependencies:
      - resolve-case-and-canvas-references
  - id: wire-context-and-panel-opening
    content: 在 CopilotDrawer 和工作区联动画布详情与右侧面板
    status: completed
    dependencies:
      - render-recommended-case-entry
  - id: add-reference-i18n-feedback
    content: 补充中英文入口文案和未找到提示
    status: completed
    dependencies:
      - wire-context-and-panel-opening
  - id: verify-recommendation-entries
    content: 验证 Portfolio Map、bosch-accelerator、预览跳转和构建检查
    status: completed
    dependencies:
      - add-reference-i18n-feedback
---

## User Requirements

- Copilot 在推荐“业务组合地图 / Portfolio Map”这类画布时，不能只给用户画布类型 ID 或文字说明，需要在回答附近提供可点击入口。
- Copilot 在推荐案例时，例如截图中的 `slug: bosch-accelerator`，也不能只展示 slug，需要提供“查看案例”和“查看案例画布”的入口。
- 用户希望能直接打开案例对应的画布看板或进入案例项目页面，尤其是推荐 Portfolio Map 最值得参考案例时，可以顺手查看该案例里的 Portfolio Map 画布。
- 入口应出现在 Copilot 面板内，不要求用户手动复制 ID、slug 或去案例库里重新搜索。
- 若推荐内容无法解析到真实案例或画布，应给出轻量提示，避免只留下不可操作的文本标识。

## Product Overview

Copilot 的推荐回答会自动转成可操作的引用卡片。用户看到推荐画布或推荐案例后，可以直接点击打开案例、预览案例画布，或进入对应画布详情页。

## Core Features

- 自动识别 Copilot 回复中的画布引用：`portfolio-map`、Portfolio Map、业务组合地图、Three Horizons 等。
- 自动识别 Copilot 回复中的案例引用：`slug: bosch-accelerator` 等案例 slug。
- 将画布推荐解析成真实画布入口，复用现有“相关画布看板”的预览和详情跳转能力。
- 将案例推荐解析成“推荐案例”卡片，提供查看案例和查看案例画布入口。
- 在案例内优先展示与当前推荐画布类型匹配的画布，例如 Portfolio Map 推荐优先展示案例中的 `portfolio-map`。
- 未找到匹配案例或画布时展示清晰提示。

## Tech Stack Selection

- 复用现有前端技术栈：React、TypeScript、Vite、Tailwind CSS。
- 复用现有 API：
- `apps/web/src/api/library.ts`
    - `libraryApi.list(displayName)`
    - `libraryApi.get(slug, displayName)`
- `apps/web/src/api/client.ts`
    - `api.listCanvases(displayName, opts)`
    - `api.getCanvas(id, displayName)`
    - `api.getDef(id)`
- `apps/web/src/api/projects.ts`
    - `projectsApi.listCanvases(projectId, displayName)`
- 复用现有路由：
- `/p/:projectId`
- `/p/:projectId/c/:canvasId`
- 复用现有 Copilot 渲染链路：
- `CopilotDrawer.tsx`
- `CopilotCanvasReferenceBoard.tsx`

## Implementation Approach

当前问题分两类：画布推荐无法打开、案例推荐无法打开。已有 `CopilotCanvasReferenceBoard` 只解析 UUID，因此当 AI 回复里只有 `portfolio-map`、Portfolio Map、业务组合地图或 `slug: bosch-accelerator` 时，无法生成入口。

方案是在 Copilot 消息渲染层增加“推荐引用解析”能力：

1. 保留现有 UUID 解析能力。
2. 新增画布类型和中英文画布名解析，将文本中的画布推荐映射到真实 `CanvasMeta`。
3. 新增案例 slug 解析，将文本中的 `slug: xxx` 映射到 `CaseLibraryEntry` 和 `CaseLibraryDetail`。
4. 当同一回答同时包含画布类型和案例 slug 时，优先在该案例的 canvases 中查找匹配画布，例如 `bosch-accelerator` 加 Portfolio Map 时直接展示该案例的 Portfolio Map 画布入口。
5. 解析出的真实画布继续交给现有“相关画布看板”展示；解析出的案例用新增轻量“推荐案例”卡片展示。
6. 跳转详情时关闭 Copilot；在工作区内可联动右侧 Inspector 展开到画布信息 tab。

关键决策：

- 不依赖 AI 输出 URL 或裸 ID，而是在 UI 层解析并生成稳定入口。
- 优先解析当前回答内的“案例 slug + 画布类型”组合，减少误匹配。
- 复用 `libraryApi.get(slug)`，因为该接口已返回 `CaseLibraryDetail`，包含 `case`、`project`、`canvases`、`stories`。
- 复用现有画布预览 popover，避免重复实现画布渲染。
- 不在本次加入自动创建画布或 fork 写入，保持只读推荐入口，控制变更范围。

## Implementation Notes

- 解析逻辑应基于 `useMemo` 提取候选 key，避免每次渲染重复请求。
- 对 `libraryApi.get(slug)` 和 `api.getDef(defId)` 的调用应复用已有缓存或在 hook 内按 key 去重。
- UUID 解析必须保持兼容，不影响已有“回答中出现 canvasId 自动变看板”的能力。
- 案例 slug 正则应覆盖常见格式：
- `slug: bosch-accelerator`
- `slug：bosch-accelerator`
- `case slug: bosch-accelerator`
- 代码样式中的 `bosch-accelerator`
- 画布名解析应使用已加载的 canvas definitions，而不是硬编码过多名称；可保留少量别名表用于中文名和常见英文名。
- 多个案例或多个画布匹配时，限制展示数量，避免 Copilot 面板过长。
- i18n 文案同时更新中英文，避免硬编码中文。
- 验证时运行：
- `pnpm typecheck`
- `pnpm --filter @pingarden/web build`

## Architecture Design

本次保持现有架构，只扩展 Copilot 消息引用解析链路：

- `CopilotDrawer`
- 将 `attachedRef` 继续传递到 `MessageBubble`。
- `MessageBubble` 根据助手回复内容解析画布引用和案例引用。
- 点击入口后关闭 Copilot 抽屉。

- `CopilotCanvasReferenceBoard`
- 保留现有 UUID 解析。
- 扩展 hook 或新增内部 hook，用于解析：
    - UUID
    - canvas defId
    - 中英文画布名
    - case slug
- 继续负责画布卡片、预览 popover 和详情跳转。

- 新增或内聚在同文件中的案例推荐卡片
- 展示案例名称、slug、画布数量。
- 提供“查看案例”和“查看案例画布”入口。
- 如果解析到匹配画布，将匹配画布交给 `CopilotCanvasReferenceBoard` 渲染。

- `ProjectWorkspacePage`
- 如用户从 Copilot 进入画布详情，保持右侧画布信息面板可见。
- 不改变现有项目、画布、案例库数据结构。

## Directory Structure

```
BusinessModelCanvas/
├── apps/web/src/components/
│   ├── CopilotDrawer.tsx
│   │   # [MODIFY] 将 attachedRef 传入 MessageBubble；点击推荐案例或画布入口后关闭 Copilot。
│   │   # 保持现有建议操作、项目草稿卡、消息渲染和 Kimi 流式对话逻辑不变。
│   └── CopilotCanvasReferenceBoard.tsx
│       # [MODIFY] 扩展引用解析能力：支持 UUID、defId、中英文画布名、案例 slug。
│       # 新增推荐案例卡片或内部子组件，支持查看案例、查看案例画布和匹配画布预览。
├── apps/web/src/pages/
│   └── ProjectWorkspacePage.tsx
│       # [MODIFY] 如从 Copilot 打开画布详情，确保右侧 Inspector 展开并停留在画布信息 tab。
├── apps/web/src/i18n/
│   ├── zh.json
│   │   # [MODIFY] 新增推荐案例、查看案例、查看案例画布、未找到案例或画布等中文文案。
│   └── en.json
│       # [MODIFY] 新增对应英文文案。
└── apps/web/src/api/
    ├── library.ts
    │   # [AFFECTED] 复用 list/get/fork；本次优先不修改。
    ├── client.ts
    │   # [AFFECTED] 复用 listCanvases/getCanvas/getDef；本次优先不修改。
    └── projects.ts
        # [AFFECTED] 复用 listCanvases；本次优先不修改。
```

## Key Code Structures

无需新增公共 API。内部可新增局部类型：

- 解析出的案例引用候选：slug、matchedText。
- 解析出的画布引用候选：defId、matchedName、source。
- 展示用引用结果：case detail、matched canvases、unresolved candidates。

这些类型应限制在 `CopilotCanvasReferenceBoard.tsx` 内部，避免扩大模块 API。

## Agent Extensions

### SubAgent

- **code-explorer**
- Purpose: 继续核对 Copilot 消息渲染、案例库 API、画布预览组件和工作区 Inspector 联动路径。
- Expected outcome: 确认最小修改点，确保案例 slug 解析、Portfolio Map 画布入口和现有 UUID 画布看板能力都能稳定工作。